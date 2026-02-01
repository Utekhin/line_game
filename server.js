// server.js - Session-based multiplayer server with game recording
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ===== CONFIGURATION =====
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Change in production!
const DATA_DIR = process.env.DATA_DIR || './data';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ===== GAME STORAGE =====
const activeSessions = new Map(); // sessionId -> { odisconnected, gameCore state, etc. }
const humanVsHumanGames = new Map(); // gameCode -> { playerX, playerY, moves, etc. }
const fenceGames = new Map(); // gameCode -> { playerX, playerY, moves, pools, etc. }
const recordedGames = []; // All completed games for admin download

// Polling session tokens (for HTTP fallback)
const pollingTokens = new Map(); // token -> { gameCode, role, lastPoll }

// Generate random number for game codes
function generatePlayerCode() {
    return Math.floor(100 + Math.random() * 900).toString(); // 3-digit code
}

function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

function generatePollingToken() {
    return crypto.randomBytes(24).toString('hex');
}

// Helper to parse JSON body from request
function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

// Helper to send JSON response
function sendJson(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

// Clean up stale polling tokens (older than 5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of pollingTokens) {
        if (now - data.lastPoll > 5 * 60 * 1000) {
            pollingTokens.delete(token);
        }
    }
}, 60000);

// ===== HTTP SERVER =====
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Admin API endpoints
    if (pathname === '/api/admin/games' && req.method === 'GET') {
        return handleAdminGetGames(req, res, url);
    }
    if (pathname === '/api/admin/download' && req.method === 'GET') {
        return handleAdminDownload(req, res, url);
    }
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
        return handleAdminStats(req, res, url);
    }

    // Game recording endpoint (POST from clients)
    if (pathname === '/api/record-game' && req.method === 'POST') {
        return handleRecordGame(req, res);
    }

    // ===== POLLING API ENDPOINTS =====
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    // Span polling endpoints
    if (pathname === '/api/span/create' && req.method === 'POST') {
        return handleSpanCreatePolling(req, res);
    }
    if (pathname === '/api/span/join' && req.method === 'POST') {
        return handleSpanJoinPolling(req, res);
    }
    if (pathname === '/api/span/move' && req.method === 'POST') {
        return handleSpanMovePolling(req, res);
    }
    if (pathname === '/api/span/state' && req.method === 'GET') {
        return handleSpanStatePolling(req, res, url);
    }
    if (pathname === '/api/span/gameover' && req.method === 'POST') {
        return handleSpanGameOverPolling(req, res);
    }

    // Fence polling endpoints
    if (pathname === '/api/fence/create' && req.method === 'POST') {
        return handleFenceCreatePolling(req, res);
    }
    if (pathname === '/api/fence/join' && req.method === 'POST') {
        return handleFenceJoinPolling(req, res);
    }
    if (pathname === '/api/fence/move' && req.method === 'POST') {
        return handleFenceMovePolling(req, res);
    }
    if (pathname === '/api/fence/capture' && req.method === 'POST') {
        return handleFenceCapturePolling(req, res);
    }
    if (pathname === '/api/fence/state' && req.method === 'GET') {
        return handleFenceStatePolling(req, res, url);
    }
    if (pathname === '/api/fence/gameover' && req.method === 'POST') {
        return handleFenceGameOverPolling(req, res);
    }

    // Static file serving
    let filePath = pathname === '/' ? '/index.html' : pathname;

    // Handle game join URLs
    if (pathname.startsWith('/join/')) {
        filePath = '/human-vs-human.html';
    }
    // Handle Fence join URLs
    if (pathname.startsWith('/fence-join/')) {
        filePath = '/fence-human-vs-human.html';
    }

    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    try {
        const content = fs.readFileSync(path.join(__dirname, filePath));
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });
        res.end(content, 'utf-8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(500);
            res.end('Server error');
        }
    }
});

// ===== ADMIN API HANDLERS =====
function handleAdminGetGames(req, res, url) {
    const password = url.searchParams.get('password');
    if (password !== ADMIN_PASSWORD) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }

    // Load recorded games from file
    const games = loadRecordedGames();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        totalGames: games.length,
        games: games.slice(-100) // Last 100 games
    }));
}

function handleAdminDownload(req, res, url) {
    const password = url.searchParams.get('password');
    if (password !== ADMIN_PASSWORD) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }

    const format = url.searchParams.get('format') || 'json';
    const games = loadRecordedGames();

    if (format === 'csv') {
        const csv = gamesToCSV(games);
        res.writeHead(200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="games-${Date.now()}.csv"`
        });
        res.end(csv);
    } else {
        const data = {
            exportDate: new Date().toISOString(),
            totalGames: games.length,
            games: games
        };
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="games-${Date.now()}.json"`
        });
        res.end(JSON.stringify(data, null, 2));
    }
}

function handleAdminStats(req, res, url) {
    const password = url.searchParams.get('password');
    if (password !== ADMIN_PASSWORD) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }

    const games = loadRecordedGames();
    const stats = {
        totalGames: games.length,
        humanVsAI: games.filter(g => g.gameType === 'human-vs-ai').length,
        spanHumanVsHuman: games.filter(g => g.gameType === 'span-human-vs-human' || g.gameType === 'human-vs-human').length,
        fenceHumanVsHuman: games.filter(g => g.gameType === 'fence-human-vs-human').length,
        totalMoves: games.reduce((sum, g) => sum + (g.moves?.length || 0), 0),
        xWins: games.filter(g => g.winner === 'X').length,
        oWins: games.filter(g => g.winner === 'O').length,
        activeSessions: activeSessions.size,
        activeSpanGames: humanVsHumanGames.size,
        activeFenceGames: fenceGames.size
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
}

function handleRecordGame(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        try {
            const gameData = JSON.parse(body);
            saveRecordedGame(gameData);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid data' }));
        }
    });
}

// ===== GAME RECORDING FILE OPERATIONS =====
function loadRecordedGames() {
    const filePath = path.join(DATA_DIR, 'recorded-games.json');
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading recorded games:', error);
    }
    return [];
}

function saveRecordedGame(gameData) {
    const filePath = path.join(DATA_DIR, 'recorded-games.json');
    const games = loadRecordedGames();
    games.push({
        ...gameData,
        recordedAt: new Date().toISOString()
    });
    fs.writeFileSync(filePath, JSON.stringify(games, null, 2));
    console.log(`📹 Game recorded: ${gameData.gameType} - Winner: ${gameData.winner || 'none'}`);
}

function gamesToCSV(games) {
    const headers = [
        'game_id', 'game_type', 'move_number', 'player', 'row', 'col',
        'cell_index', 'move_type', 'source', 'board_state', 'winner',
        'end_reason', 'resigned_by'  // New ML-important columns
    ];

    let csv = headers.join(',') + '\n';

    for (const game of games) {
        for (const move of (game.moves || [])) {
            const row = [
                game.gameId || '',
                game.gameType || '',
                move.moveNumber || '',
                move.player || '',
                move.row || '',
                move.col || '',
                move.cellIndex || '',
                `"${move.moveType || ''}"`,
                move.source || '',
                move.boardState || '',
                game.winner || 'none',
                game.endReason || 'connection',
                game.resignedBy || ''
            ];
            csv += row.join(',') + '\n';
        }
    }

    return csv;
}

// ===== POLLING API HANDLERS (HTTP FALLBACK) =====

// --- SPAN POLLING ---
async function handleSpanCreatePolling(req, res) {
    try {
        const playerXCode = generatePlayerCode();
        const playerYCode = generatePlayerCode();
        const gameCode = `${playerXCode}-${playerYCode}`;
        const token = generatePollingToken();

        const game = {
            gameCode: gameCode,
            playerXCode: playerXCode,
            playerYCode: playerYCode,
            playerX: { token: token, sessionId: token },
            playerY: null,
            currentPlayer: 'X',
            moves: [],
            board: Array(15).fill(null).map(() => Array(15).fill('')),
            boardState: Array(225).fill('0').join(''),
            created: Date.now(),
            started: false,
            lastUpdate: Date.now(),
            pendingEvents: [], // Events for polling clients
            gameOver: false,
            winner: null
        };

        humanVsHumanGames.set(gameCode, game);
        pollingTokens.set(token, { gameCode, role: 'X', lastPoll: Date.now() });

        console.log(`🎮 [Polling] Span game created: ${gameCode}`);

        sendJson(res, 200, {
            success: true,
            gameCode: gameCode,
            token: token,
            role: 'X'
        });
    } catch (error) {
        console.error('Span create error:', error);
        sendJson(res, 500, { error: 'Server error' });
    }
}

async function handleSpanJoinPolling(req, res) {
    try {
        const data = await parseJsonBody(req);
        const gameCode = data.gameCode;
        const game = humanVsHumanGames.get(gameCode);

        if (!game) {
            return sendJson(res, 404, { error: 'Game not found' });
        }
        if (game.playerY && game.playerY.token) {
            return sendJson(res, 400, { error: 'Game is full' });
        }

        const token = generatePollingToken();
        game.playerY = { token: token, sessionId: token };
        game.started = true;
        game.lastUpdate = Date.now();
        game.pendingEvents.push({ type: 'GAME_STARTED', timestamp: Date.now() });

        pollingTokens.set(token, { gameCode, role: 'O', lastPoll: Date.now() });

        console.log(`🎮 [Polling] Player O joined Span: ${gameCode}`);

        sendJson(res, 200, {
            success: true,
            gameCode: gameCode,
            token: token,
            role: 'O'
        });
    } catch (error) {
        console.error('Span join error:', error);
        sendJson(res, 500, { error: 'Server error' });
    }
}

async function handleSpanMovePolling(req, res) {
    try {
        const data = await parseJsonBody(req);
        const tokenData = pollingTokens.get(data.token);

        if (!tokenData) {
            return sendJson(res, 401, { error: 'Invalid token' });
        }

        const game = humanVsHumanGames.get(tokenData.gameCode);
        if (!game || !game.started) {
            return sendJson(res, 400, { error: 'Game not active' });
        }

        // Update board
        game.board[data.row][data.col] = data.player;

        const move = {
            moveNumber: game.moves.length + 1,
            player: data.player,
            row: data.row,
            col: data.col,
            cellIndex: data.row * 15 + data.col,
            moveType: 'human',
            source: 'human',
            boardState: data.boardState || game.boardState,
            timestamp: Date.now()
        };
        game.moves.push(move);
        game.boardState = data.boardState || game.boardState;
        game.currentPlayer = data.player === 'X' ? 'O' : 'X';
        game.lastUpdate = Date.now();

        // Add event for opponent to poll
        game.pendingEvents.push({
            type: 'OPPONENT_MOVE',
            row: data.row,
            col: data.col,
            player: data.player,
            moveNumber: move.moveNumber,
            timestamp: Date.now()
        });

        // Also notify WebSocket opponent if connected
        const opponent = data.player === 'X' ? game.playerY : game.playerX;
        if (opponent && opponent.ws && opponent.ws.readyState === 1) {
            opponent.ws.send(JSON.stringify({
                type: 'HVH_OPPONENT_MOVE',
                row: data.row,
                col: data.col,
                player: data.player,
                moveNumber: move.moveNumber
            }));
        }

        sendJson(res, 200, { success: true, moveNumber: move.moveNumber });
    } catch (error) {
        console.error('Span move error:', error);
        sendJson(res, 500, { error: 'Server error' });
    }
}

function handleSpanStatePolling(req, res, url) {
    const token = url.searchParams.get('token');
    const since = parseInt(url.searchParams.get('since') || '0');
    const tokenData = pollingTokens.get(token);

    if (!tokenData) {
        return sendJson(res, 401, { error: 'Invalid token' });
    }

    tokenData.lastPoll = Date.now();
    const game = humanVsHumanGames.get(tokenData.gameCode);

    if (!game) {
        return sendJson(res, 404, { error: 'Game not found' });
    }

    // Get events since last poll
    const events = game.pendingEvents.filter(e => e.timestamp > since);

    // Clean old events (keep last 60 seconds)
    const cutoff = Date.now() - 60000;
    game.pendingEvents = game.pendingEvents.filter(e => e.timestamp > cutoff);

    sendJson(res, 200, {
        gameCode: game.gameCode,
        started: game.started,
        currentPlayer: game.currentPlayer,
        board: game.board,
        moves: game.moves,
        lastUpdate: game.lastUpdate,
        events: events,
        gameOver: game.gameOver,
        winner: game.winner
    });
}

async function handleSpanGameOverPolling(req, res) {
    try {
        const data = await parseJsonBody(req);
        const tokenData = pollingTokens.get(data.token);

        if (!tokenData) {
            return sendJson(res, 401, { error: 'Invalid token' });
        }

        const game = humanVsHumanGames.get(tokenData.gameCode);
        if (!game) {
            return sendJson(res, 404, { error: 'Game not found' });
        }

        game.gameOver = true;
        game.winner = data.winner;
        game.pendingEvents.push({
            type: 'GAME_OVER',
            winner: data.winner,
            reason: data.reason || 'connection',
            timestamp: Date.now()
        });

        // Save record
        const gameRecord = {
            gameId: game.gameCode,
            gameType: 'span-human-vs-human',
            winner: data.winner,
            endReason: data.reason || 'connection',
            resignedBy: data.reason === 'resignation' ? (data.winner === 'X' ? 'O' : 'X') : null,
            totalMoves: game.moves.length,
            moves: game.moves,
            startedAt: new Date(game.created).toISOString(),
            endedAt: new Date().toISOString()
        };
        saveRecordedGame(gameRecord);

        console.log(`📹 [Polling] Span game ended: ${game.gameCode} - Winner: ${data.winner}`);

        // Clean up after delay to allow opponent to poll final state
        setTimeout(() => {
            humanVsHumanGames.delete(tokenData.gameCode);
            pollingTokens.delete(data.token);
        }, 30000);

        sendJson(res, 200, { success: true });
    } catch (error) {
        console.error('Span gameover error:', error);
        sendJson(res, 500, { error: 'Server error' });
    }
}

// --- FENCE POLLING ---
async function handleFenceCreatePolling(req, res) {
    try {
        const playerXCode = generatePlayerCode();
        const playerYCode = generatePlayerCode();
        const gameCode = `F${playerXCode}-${playerYCode}`;
        const token = generatePollingToken();

        const game = {
            gameCode: gameCode,
            playerXCode: playerXCode,
            playerYCode: playerYCode,
            playerX: { token: token, sessionId: token },
            playerY: null,
            currentPlayer: 'X',
            moves: [],
            board: Array(15).fill(null).map(() => Array(15).fill('')),
            poolX: 50,
            poolO: 50,
            capturedByX: 0,
            capturedByO: 0,
            created: Date.now(),
            started: false,
            lastUpdate: Date.now(),
            pendingEvents: [],
            gameOver: false,
            winner: null
        };

        fenceGames.set(gameCode, game);
        pollingTokens.set(token, { gameCode, role: 'X', gameType: 'fence', lastPoll: Date.now() });

        console.log(`🏰 [Polling] Fence game created: ${gameCode}`);

        sendJson(res, 200, {
            success: true,
            gameCode: gameCode,
            token: token,
            role: 'X'
        });
    } catch (error) {
        console.error('Fence create error:', error);
        sendJson(res, 500, { error: 'Server error' });
    }
}

async function handleFenceJoinPolling(req, res) {
    try {
        const data = await parseJsonBody(req);
        const gameCode = data.gameCode;
        const game = fenceGames.get(gameCode);

        if (!game) {
            return sendJson(res, 404, { error: 'Game not found' });
        }
        if (game.playerY && game.playerY.token) {
            return sendJson(res, 400, { error: 'Game is full' });
        }

        const token = generatePollingToken();
        game.playerY = { token: token, sessionId: token };
        game.started = true;
        game.lastUpdate = Date.now();
        game.pendingEvents.push({ type: 'GAME_STARTED', timestamp: Date.now() });

        pollingTokens.set(token, { gameCode, role: 'O', gameType: 'fence', lastPoll: Date.now() });

        console.log(`🏰 [Polling] Player O joined Fence: ${gameCode}`);

        sendJson(res, 200, {
            success: true,
            gameCode: gameCode,
            token: token,
            role: 'O'
        });
    } catch (error) {
        console.error('Fence join error:', error);
        sendJson(res, 500, { error: 'Server error' });
    }
}

async function handleFenceMovePolling(req, res) {
    try {
        const data = await parseJsonBody(req);
        const tokenData = pollingTokens.get(data.token);

        if (!tokenData) {
            return sendJson(res, 401, { error: 'Invalid token' });
        }

        const game = fenceGames.get(tokenData.gameCode);
        if (!game || !game.started) {
            return sendJson(res, 400, { error: 'Game not active' });
        }

        // Update board
        game.board[data.row][data.col] = data.player;

        // Update pool
        if (data.player === 'X') {
            game.poolX--;
        } else {
            game.poolO--;
        }

        const move = {
            moveNumber: game.moves.length + 1,
            player: data.player,
            row: data.row,
            col: data.col,
            timestamp: Date.now()
        };
        game.moves.push(move);
        game.currentPlayer = data.player === 'X' ? 'O' : 'X';
        game.lastUpdate = Date.now();

        game.pendingEvents.push({
            type: 'OPPONENT_MOVE',
            row: data.row,
            col: data.col,
            player: data.player,
            moveNumber: move.moveNumber,
            timestamp: Date.now()
        });

        // Notify WebSocket opponent if connected
        const opponent = data.player === 'X' ? game.playerY : game.playerX;
        if (opponent && opponent.ws && opponent.ws.readyState === 1) {
            opponent.ws.send(JSON.stringify({
                type: 'FENCE_OPPONENT_MOVE',
                row: data.row,
                col: data.col,
                player: data.player,
                moveNumber: move.moveNumber
            }));
        }

        sendJson(res, 200, {
            success: true,
            moveNumber: move.moveNumber,
            poolX: game.poolX,
            poolO: game.poolO
        });
    } catch (error) {
        console.error('Fence move error:', error);
        sendJson(res, 500, { error: 'Server error' });
    }
}

async function handleFenceCapturePolling(req, res) {
    try {
        const data = await parseJsonBody(req);
        const tokenData = pollingTokens.get(data.token);

        if (!tokenData) {
            return sendJson(res, 401, { error: 'Invalid token' });
        }

        const game = fenceGames.get(tokenData.gameCode);
        if (!game || !game.started) {
            return sendJson(res, 400, { error: 'Game not active' });
        }

        // Update game state from capture
        game.poolX = data.poolX;
        game.poolO = data.poolO;
        game.capturedByX = data.capturedByX;
        game.capturedByO = data.capturedByO;

        // Update board - remove captured cells
        if (data.fenceCells) {
            for (const key of data.fenceCells) {
                const [row, col] = key.split('-').map(Number);
                game.board[row][col] = '';
            }
        }
        if (data.enclosedCells) {
            for (const key of data.enclosedCells) {
                const [row, col] = key.split('-').map(Number);
                game.board[row][col] = '';
            }
        }

        game.lastUpdate = Date.now();

        game.pendingEvents.push({
            type: 'CAPTURE',
            fenceCells: data.fenceCells,
            enclosedCells: data.enclosedCells,
            capturingPlayer: data.capturingPlayer,
            poolX: data.poolX,
            poolO: data.poolO,
            capturedByX: data.capturedByX,
            capturedByO: data.capturedByO,
            timestamp: Date.now()
        });

        // Notify WebSocket opponent if connected
        const opponent = data.capturingPlayer === 'X' ? game.playerY : game.playerX;
        if (opponent && opponent.ws && opponent.ws.readyState === 1) {
            opponent.ws.send(JSON.stringify({
                type: 'FENCE_CAPTURE',
                fenceCells: data.fenceCells,
                enclosedCells: data.enclosedCells,
                capturingPlayer: data.capturingPlayer,
                poolX: data.poolX,
                poolO: data.poolO,
                capturedByX: data.capturedByX,
                capturedByO: data.capturedByO
            }));
        }

        console.log(`🏰 [Polling] Fence capture by ${data.capturingPlayer}: pools X=${data.poolX}, O=${data.poolO}`);

        sendJson(res, 200, { success: true });
    } catch (error) {
        console.error('Fence capture error:', error);
        sendJson(res, 500, { error: 'Server error' });
    }
}

function handleFenceStatePolling(req, res, url) {
    const token = url.searchParams.get('token');
    const since = parseInt(url.searchParams.get('since') || '0');
    const tokenData = pollingTokens.get(token);

    if (!tokenData) {
        return sendJson(res, 401, { error: 'Invalid token' });
    }

    tokenData.lastPoll = Date.now();
    const game = fenceGames.get(tokenData.gameCode);

    if (!game) {
        return sendJson(res, 404, { error: 'Game not found' });
    }

    // Get events since last poll
    const events = game.pendingEvents.filter(e => e.timestamp > since);

    // Clean old events
    const cutoff = Date.now() - 60000;
    game.pendingEvents = game.pendingEvents.filter(e => e.timestamp > cutoff);

    sendJson(res, 200, {
        gameCode: game.gameCode,
        started: game.started,
        currentPlayer: game.currentPlayer,
        board: game.board,
        moves: game.moves,
        poolX: game.poolX,
        poolO: game.poolO,
        capturedByX: game.capturedByX,
        capturedByO: game.capturedByO,
        lastUpdate: game.lastUpdate,
        events: events,
        gameOver: game.gameOver,
        winner: game.winner
    });
}

async function handleFenceGameOverPolling(req, res) {
    try {
        const data = await parseJsonBody(req);
        const tokenData = pollingTokens.get(data.token);

        if (!tokenData) {
            return sendJson(res, 401, { error: 'Invalid token' });
        }

        const game = fenceGames.get(tokenData.gameCode);
        if (!game) {
            return sendJson(res, 404, { error: 'Game not found' });
        }

        game.gameOver = true;
        game.winner = data.winner;
        game.pendingEvents.push({
            type: 'GAME_OVER',
            winner: data.winner,
            reason: data.reason || 'pool_exhausted',
            timestamp: Date.now()
        });

        const gameRecord = {
            gameId: game.gameCode,
            gameType: 'fence-human-vs-human',
            winner: data.winner,
            endReason: data.reason || 'pool_exhausted',
            resignedBy: data.reason === 'resignation' ? (data.winner === 'X' ? 'O' : 'X') : null,
            totalMoves: game.moves.length,
            moves: game.moves,
            poolX: game.poolX,
            poolO: game.poolO,
            capturedByX: game.capturedByX,
            capturedByO: game.capturedByO,
            startedAt: new Date(game.created).toISOString(),
            endedAt: new Date().toISOString()
        };
        saveRecordedGame(gameRecord);

        console.log(`📹 [Polling] Fence game ended: ${game.gameCode} - Winner: ${data.winner}`);

        setTimeout(() => {
            fenceGames.delete(tokenData.gameCode);
            pollingTokens.delete(data.token);
        }, 30000);

        sendJson(res, 200, { success: true });
    } catch (error) {
        console.error('Fence gameover error:', error);
        sendJson(res, 500, { error: 'Server error' });
    }
}

// ===== WEBSOCKET SERVER =====
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    const sessionId = generateSessionId();
    ws.sessionId = sessionId;
    ws.isAlive = true;

    console.log(`🔗 New connection: ${sessionId}`);

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log(`👋 Disconnected: ${sessionId}`);
        handlePlayerDisconnect(ws);
    });

    // Send session ID to client
    ws.send(JSON.stringify({
        type: 'SESSION_CREATED',
        sessionId: sessionId
    }));
});

function handleWebSocketMessage(ws, data) {
    switch (data.type) {
        // Span (Human vs Human)
        case 'CREATE_HVH_GAME':
            handleCreateHvHGame(ws, data);
            break;
        case 'JOIN_HVH_GAME':
            handleJoinHvHGame(ws, data);
            break;
        case 'HVH_MOVE':
            handleHvHMove(ws, data);
            break;
        case 'HVH_GAME_OVER':
            handleHvHGameOver(ws, data);
            break;
        // Fence game
        case 'CREATE_FENCE_GAME':
            handleCreateFenceGame(ws, data);
            break;
        case 'JOIN_FENCE_GAME':
            handleJoinFenceGame(ws, data);
            break;
        case 'FENCE_MOVE':
            handleFenceMove(ws, data);
            break;
        case 'FENCE_CAPTURE':
            handleFenceCapture(ws, data);
            break;
        case 'FENCE_GAME_OVER':
            handleFenceGameOver(ws, data);
            break;
        case 'PING':
            ws.send(JSON.stringify({ type: 'PONG' }));
            break;
    }
}

// ===== HUMAN VS HUMAN GAME HANDLERS =====
function handleCreateHvHGame(ws, data) {
    const playerXCode = generatePlayerCode();
    const playerYCode = generatePlayerCode();
    const gameCode = `${playerXCode}-${playerYCode}`;

    const game = {
        gameCode: gameCode,
        playerXCode: playerXCode,
        playerYCode: playerYCode,
        playerX: { ws: ws, sessionId: ws.sessionId },
        playerY: null,
        currentPlayer: 'X',
        moves: [],
        board: Array(15).fill(null).map(() => Array(15).fill('')),
        boardState: Array(225).fill('0').join(''),
        created: Date.now(),
        started: false,
        lastUpdate: Date.now(),
        pendingEvents: [],
        gameOver: false,
        winner: null
    };

    humanVsHumanGames.set(gameCode, game);
    ws.gameCode = gameCode;
    ws.playerRole = 'X';

    console.log(`🎮 HvH game created: ${gameCode}`);

    ws.send(JSON.stringify({
        type: 'HVH_GAME_CREATED',
        gameCode: gameCode,
        playerCode: playerXCode,
        role: 'X'
    }));
}

function handleJoinHvHGame(ws, data) {
    const gameCode = data.gameCode;
    const game = humanVsHumanGames.get(gameCode);

    if (!game) {
        ws.send(JSON.stringify({
            type: 'HVH_JOIN_ERROR',
            error: 'Game not found'
        }));
        return;
    }

    if (game.playerY) {
        ws.send(JSON.stringify({
            type: 'HVH_JOIN_ERROR',
            error: 'Game is full'
        }));
        return;
    }

    game.playerY = { ws: ws, sessionId: ws.sessionId };
    game.started = true;
    game.lastUpdate = Date.now();
    game.pendingEvents.push({ type: 'GAME_STARTED', timestamp: Date.now() });
    ws.gameCode = gameCode;
    ws.playerRole = 'O';

    console.log(`🎮 Player Y joined: ${gameCode}`);

    // Notify player Y
    ws.send(JSON.stringify({
        type: 'HVH_GAME_JOINED',
        gameCode: gameCode,
        role: 'O'
    }));

    // Notify player X that game started
    if (game.playerX.ws.readyState === WebSocket.OPEN) {
        game.playerX.ws.send(JSON.stringify({
            type: 'HVH_GAME_STARTED',
            opponentJoined: true
        }));
    }

    // Notify player Y that game started
    ws.send(JSON.stringify({
        type: 'HVH_GAME_STARTED',
        opponentJoined: true
    }));
}

function handleHvHMove(ws, data) {
    const game = humanVsHumanGames.get(ws.gameCode);
    if (!game || !game.started) return;

    // Update board array
    if (game.board) {
        game.board[data.row][data.col] = data.player;
    }

    // Record the move
    const move = {
        moveNumber: game.moves.length + 1,
        player: data.player,
        row: data.row,
        col: data.col,
        cellIndex: data.row * 15 + data.col,
        moveType: 'human',
        source: 'human',
        boardState: data.boardState || game.boardState,
        timestamp: Date.now()
    };
    game.moves.push(move);
    game.boardState = data.boardState || game.boardState;
    game.currentPlayer = data.player === 'X' ? 'O' : 'X';
    game.lastUpdate = Date.now();

    // Add event for polling clients
    if (game.pendingEvents) {
        game.pendingEvents.push({
            type: 'OPPONENT_MOVE',
            row: data.row,
            col: data.col,
            player: data.player,
            moveNumber: move.moveNumber,
            timestamp: Date.now()
        });
    }

    // Forward move to opponent
    const opponent = data.player === 'X' ? game.playerY : game.playerX;
    if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
        opponent.ws.send(JSON.stringify({
            type: 'HVH_OPPONENT_MOVE',
            row: data.row,
            col: data.col,
            player: data.player,
            moveNumber: move.moveNumber
        }));
    }
}

function handleHvHGameOver(ws, data) {
    const game = humanVsHumanGames.get(ws.gameCode);
    if (!game) return;

    // Save the recorded game with end reason (important for ML training)
    const gameRecord = {
        gameId: game.gameCode,
        gameType: 'human-vs-human',
        winner: data.winner,
        endReason: data.reason || 'connection', // 'connection' or 'resignation' - key for ML
        resignedBy: data.reason === 'resignation' ? (data.winner === 'X' ? 'O' : 'X') : null,
        totalMoves: game.moves.length,
        moves: game.moves,
        startedAt: new Date(game.created).toISOString(),
        endedAt: new Date().toISOString()
    };

    saveRecordedGame(gameRecord);

    // Notify opponent with full details
    const opponent = ws.playerRole === 'X' ? game.playerY : game.playerX;
    if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
        opponent.ws.send(JSON.stringify({
            type: 'HVH_GAME_ENDED',
            winner: data.winner,
            reason: data.reason || 'connection'
        }));
    }

    console.log(`📹 HvH game ended: ${game.gameCode} - Winner: ${data.winner}, Reason: ${data.reason || 'connection'}`);

    // Clean up
    humanVsHumanGames.delete(ws.gameCode);
}

function handlePlayerDisconnect(ws) {
    if (ws.gameCode) {
        // Check Span games
        const spanGame = humanVsHumanGames.get(ws.gameCode);
        if (spanGame) {
            const opponent = ws.playerRole === 'X' ? spanGame.playerY : spanGame.playerX;
            if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                opponent.ws.send(JSON.stringify({
                    type: 'HVH_OPPONENT_DISCONNECTED'
                }));
            }

            if (spanGame.moves.length > 0) {
                const gameRecord = {
                    gameId: spanGame.gameCode,
                    gameType: 'span-human-vs-human',
                    winner: null,
                    reason: 'disconnect',
                    totalMoves: spanGame.moves.length,
                    moves: spanGame.moves,
                    startedAt: new Date(spanGame.created).toISOString(),
                    endedAt: new Date().toISOString()
                };
                saveRecordedGame(gameRecord);
            }

            humanVsHumanGames.delete(ws.gameCode);
        }

        // Check Fence games
        const fenceGame = fenceGames.get(ws.gameCode);
        if (fenceGame) {
            const opponent = ws.playerRole === 'X' ? fenceGame.playerY : fenceGame.playerX;
            if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                opponent.ws.send(JSON.stringify({
                    type: 'FENCE_OPPONENT_DISCONNECTED'
                }));
            }

            if (fenceGame.moves.length > 0) {
                const gameRecord = {
                    gameId: fenceGame.gameCode,
                    gameType: 'fence-human-vs-human',
                    winner: null,
                    reason: 'disconnect',
                    totalMoves: fenceGame.moves.length,
                    moves: fenceGame.moves,
                    poolX: fenceGame.poolX,
                    poolO: fenceGame.poolO,
                    capturedByX: fenceGame.capturedByX,
                    capturedByO: fenceGame.capturedByO,
                    startedAt: new Date(fenceGame.created).toISOString(),
                    endedAt: new Date().toISOString()
                };
                saveRecordedGame(gameRecord);
            }

            fenceGames.delete(ws.gameCode);
        }
    }
}

// ===== FENCE GAME HANDLERS =====
function handleCreateFenceGame(ws, data) {
    const playerXCode = generatePlayerCode();
    const playerYCode = generatePlayerCode();
    const gameCode = `F${playerXCode}-${playerYCode}`;

    const game = {
        gameCode: gameCode,
        playerXCode: playerXCode,
        playerYCode: playerYCode,
        playerX: { ws: ws, sessionId: ws.sessionId },
        playerY: null,
        currentPlayer: 'X',
        moves: [],
        board: Array(15).fill(null).map(() => Array(15).fill('')),
        poolX: 50,
        poolO: 50,
        capturedByX: 0,
        capturedByO: 0,
        created: Date.now(),
        started: false,
        lastUpdate: Date.now(),
        pendingEvents: [],
        gameOver: false,
        winner: null
    };

    fenceGames.set(gameCode, game);
    ws.gameCode = gameCode;
    ws.playerRole = 'X';

    console.log(`🏰 Fence game created: ${gameCode}`);

    ws.send(JSON.stringify({
        type: 'FENCE_GAME_CREATED',
        gameCode: gameCode,
        playerCode: playerXCode,
        role: 'X'
    }));
}

function handleJoinFenceGame(ws, data) {
    const gameCode = data.gameCode;
    const game = fenceGames.get(gameCode);

    if (!game) {
        ws.send(JSON.stringify({
            type: 'FENCE_JOIN_ERROR',
            error: 'Game not found'
        }));
        return;
    }

    if (game.playerY) {
        ws.send(JSON.stringify({
            type: 'FENCE_JOIN_ERROR',
            error: 'Game is full'
        }));
        return;
    }

    game.playerY = { ws: ws, sessionId: ws.sessionId };
    game.started = true;
    game.lastUpdate = Date.now();
    game.pendingEvents.push({ type: 'GAME_STARTED', timestamp: Date.now() });
    ws.gameCode = gameCode;
    ws.playerRole = 'O';

    console.log(`🏰 Player Y joined Fence: ${gameCode}`);

    // Notify player Y
    ws.send(JSON.stringify({
        type: 'FENCE_GAME_JOINED',
        gameCode: gameCode,
        role: 'O'
    }));

    // Notify both players game started
    if (game.playerX.ws.readyState === WebSocket.OPEN) {
        game.playerX.ws.send(JSON.stringify({
            type: 'FENCE_GAME_STARTED',
            opponentJoined: true
        }));
    }

    ws.send(JSON.stringify({
        type: 'FENCE_GAME_STARTED',
        opponentJoined: true
    }));
}

function handleFenceMove(ws, data) {
    const game = fenceGames.get(ws.gameCode);
    if (!game || !game.started) return;

    // Update board
    if (game.board) {
        game.board[data.row][data.col] = data.player;
    }

    // Update pool
    if (data.player === 'X') {
        game.poolX--;
    } else {
        game.poolO--;
    }

    const move = {
        moveNumber: game.moves.length + 1,
        player: data.player,
        row: data.row,
        col: data.col,
        timestamp: Date.now()
    };
    game.moves.push(move);
    game.currentPlayer = data.player === 'X' ? 'O' : 'X';
    game.lastUpdate = Date.now();

    // Add event for polling clients
    if (game.pendingEvents) {
        game.pendingEvents.push({
            type: 'OPPONENT_MOVE',
            row: data.row,
            col: data.col,
            player: data.player,
            moveNumber: move.moveNumber,
            timestamp: Date.now()
        });
    }

    // Forward move to opponent
    const opponent = data.player === 'X' ? game.playerY : game.playerX;
    if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
        opponent.ws.send(JSON.stringify({
            type: 'FENCE_OPPONENT_MOVE',
            row: data.row,
            col: data.col,
            player: data.player,
            moveNumber: move.moveNumber
        }));
    }
}

function handleFenceCapture(ws, data) {
    const game = fenceGames.get(ws.gameCode);
    if (!game || !game.started) return;

    // Update game state
    game.poolX = data.poolX;
    game.poolO = data.poolO;
    game.capturedByX = data.capturedByX;
    game.capturedByO = data.capturedByO;
    game.lastUpdate = Date.now();

    // Update board - remove captured cells
    if (game.board) {
        if (data.fenceCells) {
            for (const key of data.fenceCells) {
                const [row, col] = key.split('-').map(Number);
                game.board[row][col] = '';
            }
        }
        if (data.enclosedCells) {
            for (const key of data.enclosedCells) {
                const [row, col] = key.split('-').map(Number);
                game.board[row][col] = '';
            }
        }
    }

    // Add event for polling clients
    if (game.pendingEvents) {
        game.pendingEvents.push({
            type: 'CAPTURE',
            fenceCells: data.fenceCells,
            enclosedCells: data.enclosedCells,
            capturingPlayer: data.capturingPlayer,
            poolX: data.poolX,
            poolO: data.poolO,
            capturedByX: data.capturedByX,
            capturedByO: data.capturedByO,
            timestamp: Date.now()
        });
    }

    // Forward capture to opponent
    const opponent = data.capturingPlayer === 'X' ? game.playerY : game.playerX;
    if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
        opponent.ws.send(JSON.stringify({
            type: 'FENCE_CAPTURE',
            fenceCells: data.fenceCells,
            enclosedCells: data.enclosedCells,
            capturingPlayer: data.capturingPlayer,
            poolX: data.poolX,
            poolO: data.poolO,
            capturedByX: data.capturedByX,
            capturedByO: data.capturedByO
        }));
    }

    console.log(`🏰 Fence capture by ${data.capturingPlayer}: pools X=${data.poolX}, O=${data.poolO}`);
}

function handleFenceGameOver(ws, data) {
    const game = fenceGames.get(ws.gameCode);
    if (!game) return;

    const gameRecord = {
        gameId: game.gameCode,
        gameType: 'fence-human-vs-human',
        winner: data.winner,
        endReason: data.reason || 'pool_exhausted',
        resignedBy: data.reason === 'resignation' ? (data.winner === 'X' ? 'O' : 'X') : null,
        totalMoves: game.moves.length,
        moves: game.moves,
        poolX: game.poolX,
        poolO: game.poolO,
        capturedByX: game.capturedByX,
        capturedByO: game.capturedByO,
        startedAt: new Date(game.created).toISOString(),
        endedAt: new Date().toISOString()
    };

    saveRecordedGame(gameRecord);

    // Notify opponent
    const opponent = ws.playerRole === 'X' ? game.playerY : game.playerX;
    if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
        opponent.ws.send(JSON.stringify({
            type: 'FENCE_GAME_ENDED',
            winner: data.winner,
            reason: data.reason || 'pool_exhausted'
        }));
    }

    console.log(`🏰 Fence game ended: ${game.gameCode} - Winner: ${data.winner}, Reason: ${data.reason || 'pool_exhausted'}`);

    fenceGames.delete(ws.gameCode);
}

// Heartbeat interval
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// ===== START SERVER =====
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log('');
    console.log('🎮 ================================');
    console.log(`🚀 Game Server running on port ${PORT}`);
    console.log('🎮 ================================');
    console.log('');
    console.log('📋 Endpoints:');
    console.log(`   - Game: http://localhost:${PORT}`);
    console.log(`   - Admin: http://localhost:${PORT}/admin.html`);
    console.log('');
});
