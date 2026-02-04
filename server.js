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

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // ===== POLLING API ENDPOINTS FOR SPAN GAME =====
    if (pathname === '/api/span/create' && req.method === 'POST') {
        return handlePollingCreateGame(req, res);
    }
    if (pathname === '/api/span/join' && req.method === 'POST') {
        return handlePollingJoinGame(req, res);
    }
    if (pathname === '/api/span/move' && req.method === 'POST') {
        return handlePollingMove(req, res);
    }
    if (pathname === '/api/span/state' && req.method === 'GET') {
        return handlePollingState(req, res, url);
    }
    if (pathname === '/api/span/gameover' && req.method === 'POST') {
        return handlePollingGameOver(req, res);
    }

    // Static file serving
    let filePath = pathname === '/' ? '/index.html' : pathname;

    // Handle game join URLs
    if (pathname.startsWith('/join/')) {
        filePath = '/human-vs-human.html';
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
        humanVsHuman: games.filter(g => g.gameType === 'human-vs-human').length,
        totalMoves: games.reduce((sum, g) => sum + (g.moves?.length || 0), 0),
        xWins: games.filter(g => g.winner === 'X').length,
        oWins: games.filter(g => g.winner === 'O').length,
        activeSessions: activeSessions.size,
        activeHvHGames: humanVsHumanGames.size
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
        boardState: Array(225).fill('0').join(''),
        created: Date.now(),
        started: false
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
        const game = humanVsHumanGames.get(ws.gameCode);
        if (game) {
            const opponent = ws.playerRole === 'X' ? game.playerY : game.playerX;
            if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                opponent.ws.send(JSON.stringify({
                    type: 'HVH_OPPONENT_DISCONNECTED'
                }));
            }

            // Save partial game if it had moves
            if (game.moves.length > 0) {
                const gameRecord = {
                    gameId: game.gameCode,
                    gameType: 'human-vs-human',
                    winner: null,
                    reason: 'disconnect',
                    totalMoves: game.moves.length,
                    moves: game.moves,
                    startedAt: new Date(game.created).toISOString(),
                    endedAt: new Date().toISOString()
                };
                saveRecordedGame(gameRecord);
            }

            humanVsHumanGames.delete(ws.gameCode);
        }
    }
}

// Heartbeat interval
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// ===== POLLING API HANDLERS =====
async function handlePollingCreateGame(req, res) {
    try {
        const body = await parseJsonBody(req);
        const boardSize = body.boardSize || 15;

        const playerXCode = generatePlayerCode();
        const playerYCode = generatePlayerCode();
        const gameCode = `${playerXCode}-${playerYCode}`;
        const token = generatePollingToken();

        const game = {
            gameCode: gameCode,
            boardSize: boardSize,
            playerXCode: playerXCode,
            playerYCode: playerYCode,
            playerX: { token: token, isPolling: true },
            playerY: null,
            currentPlayer: 'X',
            moves: [],
            pendingEvents: { X: [], O: [] },
            boardState: Array(boardSize * boardSize).fill('0').join(''),
            created: Date.now(),
            started: false
        };

        humanVsHumanGames.set(gameCode, game);
        pollingTokens.set(token, { gameCode, role: 'X', lastPoll: Date.now() });

        console.log(`🎮 [POLLING] Game created: ${gameCode}`);

        sendJson(res, 200, {
            success: true,
            gameCode: gameCode,
            token: token,
            role: 'X'
        });
    } catch (error) {
        console.error('Polling create error:', error);
        sendJson(res, 500, { success: false, error: 'Server error' });
    }
}

async function handlePollingJoinGame(req, res) {
    try {
        const body = await parseJsonBody(req);
        const gameCode = body.gameCode;
        const game = humanVsHumanGames.get(gameCode);

        if (!game) {
            return sendJson(res, 404, { success: false, error: 'Game not found' });
        }

        if (game.playerY) {
            return sendJson(res, 400, { success: false, error: 'Game is full' });
        }

        const token = generatePollingToken();
        game.playerY = { token: token, isPolling: true };
        game.started = true;
        pollingTokens.set(token, { gameCode, role: 'O', lastPoll: Date.now() });

        // Add GAME_STARTED event for player X
        game.pendingEvents.X.push({ type: 'GAME_STARTED' });

        console.log(`🎮 [POLLING] Player O joined: ${gameCode}`);

        sendJson(res, 200, {
            success: true,
            gameCode: gameCode,
            token: token,
            role: 'O',
            boardSize: game.boardSize || 15
        });
    } catch (error) {
        console.error('Polling join error:', error);
        sendJson(res, 500, { success: false, error: 'Server error' });
    }
}

async function handlePollingMove(req, res) {
    try {
        const body = await parseJsonBody(req);
        const tokenData = pollingTokens.get(body.token);

        if (!tokenData) {
            return sendJson(res, 401, { success: false, error: 'Invalid token' });
        }

        const game = humanVsHumanGames.get(tokenData.gameCode);
        if (!game || !game.started) {
            return sendJson(res, 400, { success: false, error: 'Game not active' });
        }

        tokenData.lastPoll = Date.now();

        // Record the move
        const move = {
            moveNumber: game.moves.length + 1,
            player: body.player,
            row: body.row,
            col: body.col,
            cellIndex: body.row * (game.boardSize || 15) + body.col,
            moveType: 'human',
            source: 'human',
            boardState: body.boardState || game.boardState,
            timestamp: Date.now()
        };
        game.moves.push(move);
        game.boardState = body.boardState || game.boardState;
        game.currentPlayer = body.player === 'X' ? 'O' : 'X';

        // Add event for opponent
        const opponentRole = body.player === 'X' ? 'O' : 'X';
        game.pendingEvents[opponentRole].push({
            type: 'OPPONENT_MOVE',
            row: body.row,
            col: body.col,
            player: body.player,
            moveNumber: move.moveNumber
        });

        sendJson(res, 200, { success: true });
    } catch (error) {
        console.error('Polling move error:', error);
        sendJson(res, 500, { success: false, error: 'Server error' });
    }
}

function handlePollingState(req, res, url) {
    try {
        const token = url.searchParams.get('token');
        const tokenData = pollingTokens.get(token);

        if (!tokenData) {
            return sendJson(res, 401, { success: false, error: 'Invalid token' });
        }

        tokenData.lastPoll = Date.now();

        const game = humanVsHumanGames.get(tokenData.gameCode);
        if (!game) {
            return sendJson(res, 404, { success: false, error: 'Game not found' });
        }

        // Get and clear pending events for this player
        const events = game.pendingEvents[tokenData.role] || [];
        game.pendingEvents[tokenData.role] = [];

        sendJson(res, 200, {
            success: true,
            started: game.started,
            currentPlayer: game.currentPlayer,
            events: events
        });
    } catch (error) {
        console.error('Polling state error:', error);
        sendJson(res, 500, { success: false, error: 'Server error' });
    }
}

async function handlePollingGameOver(req, res) {
    try {
        const body = await parseJsonBody(req);
        const tokenData = pollingTokens.get(body.token);

        if (!tokenData) {
            return sendJson(res, 401, { success: false, error: 'Invalid token' });
        }

        const game = humanVsHumanGames.get(tokenData.gameCode);
        if (!game) {
            return sendJson(res, 404, { success: false, error: 'Game not found' });
        }

        // Save the recorded game
        const gameRecord = {
            gameId: game.gameCode,
            gameType: 'human-vs-human',
            winner: body.winner,
            endReason: body.reason || 'connection',
            resignedBy: body.reason === 'resignation' ? (body.winner === 'X' ? 'O' : 'X') : null,
            totalMoves: game.moves.length,
            moves: game.moves,
            startedAt: new Date(game.created).toISOString(),
            endedAt: new Date().toISOString()
        };
        saveRecordedGame(gameRecord);

        // Add GAME_OVER event for opponent
        const opponentRole = tokenData.role === 'X' ? 'O' : 'X';
        game.pendingEvents[opponentRole].push({
            type: 'GAME_OVER',
            winner: body.winner,
            reason: body.reason
        });

        console.log(`📹 [POLLING] Game ended: ${game.gameCode} - Winner: ${body.winner}`);

        // Clean up after a delay (allow opponent to poll for result)
        setTimeout(() => {
            humanVsHumanGames.delete(tokenData.gameCode);
            pollingTokens.delete(body.token);
        }, 60000);

        sendJson(res, 200, { success: true });
    } catch (error) {
        console.error('Polling gameover error:', error);
        sendJson(res, 500, { success: false, error: 'Server error' });
    }
}

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
