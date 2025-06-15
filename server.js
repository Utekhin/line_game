// server.js - ENHANCED VERSION with detailed debugging for ngrok issues
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTTP server to serve static files
const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
    // Extract game ID from URL if present
    if (req.url.includes('?gameId=')) {
        filePath = '/index.html'; // Always serve the main page
        console.log(`📱 Direct game join requested: ${req.url}`);
    }
    
    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
    };
    
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    try {
        const content = fs.readFileSync(path.join(__dirname, filePath));
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-cache' // Prevent caching issues
        });
        res.end(content, 'utf-8');
        console.log(`📄 Served: ${filePath}`);
    } catch (error) {
        console.error(`❌ File not found: ${filePath}`);
        res.writeHead(404);
        res.end(`File not found: ${filePath}`);
    }
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
    server,
    verifyClient: (info) => {
        const pathname = info.req.url;
        console.log(`🔍 WebSocket connection attempt to: ${pathname}`);
        console.log(`🔍 Headers:`, info.req.headers);
        
        if (pathname === '/' || pathname === '' || pathname.startsWith('/')) {
            console.log(`✅ Accepting WebSocket connection to: ${pathname}`);
            return true;
        }
        
        console.log(`❌ Rejecting WebSocket connection to: ${pathname}`);
        return false;
    }
});

// Game state storage
const gameRooms = new Map();

// Generate simple room ID
function generateRoomId() {
    return 'GAME-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Enhanced logging with connection tracking
function log(message, data = null) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] ${message}`);
    if (data) {
        console.log(`[${timestamp}] Data:`, data);
    }
}

function error(message, data = null) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.error(`[${timestamp}] ERROR: ${message}`);
    if (data) {
        console.error(`[${timestamp}] Error Data:`, data);
    }
}

// ENHANCED: Find room by player with detailed logging
function findRoomByPlayer(ws) {
    log(`🔍 SEARCHING for room containing player ${ws.clientId}`);
    
    for (const [roomId, room] of gameRooms) {
        log(`🔍 Checking room ${roomId} with ${room.players.length} players`);
        
        const playerIndex = room.players.findIndex(p => p.ws === ws);
        if (playerIndex !== -1) {
            log(`✅ FOUND player ${ws.clientId} in room ${roomId} at index ${playerIndex}`);
            
            // Log opponent details
            const opponent = room.players[1 - playerIndex];
            if (opponent) {
                log(`👥 Opponent: ${opponent.clientId} (${opponent.nickname}) - WebSocket state: ${opponent.ws.readyState}`);
            } else {
                log(`❌ No opponent found in room ${roomId}`);
            }
            
            return { roomId, room, playerIndex };
        }
    }
    
    log(`❌ PLAYER ${ws.clientId} NOT FOUND in any room`);
    log(`📊 Current rooms: ${Array.from(gameRooms.keys())}`);
    return null;
}

// ENHANCED: WebSocket connection monitoring
wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substr(2, 8);
    const connectionPath = req.url;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    log(`🔗 NEW WebSocket connection: ${clientId}`);
    log(`📍 Connection details:`, {
        path: connectionPath,
        ip: clientIP,
        userAgent: userAgent,
        headers: req.headers
    });
    
    // Store enhanced client info
    ws.clientId = clientId;
    ws.isAlive = true;
    ws.connectionTime = Date.now();
    ws.lastPing = Date.now();
    
    // Send immediate welcome message
    ws.send(JSON.stringify({
        type: 'CONNECTION_CONFIRMED',
        message: 'WebSocket connected successfully',
        clientId: clientId,
        serverTime: new Date().toISOString()
    }));
    
    // Enhanced heartbeat
    ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastPing = Date.now();
        log(`💓 Heartbeat from ${clientId}`);
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Log all messages except PING
            if (data.type !== 'PING') {
                log(`📨 From ${clientId} (${ws.readyState === WebSocket.OPEN ? 'OPEN' : 'NOT_OPEN'}): ${data.type}`, data);
            }
            
            switch (data.type) {
                case 'CREATE_GAME':
                    handleCreateGame(ws, data, req);
                    break;
                    
                case 'JOIN_GAME':
                    handleJoinGame(ws, data);
                    break;
                    
                case 'MAKE_MOVE':
                    handleMakeMove(ws, data);
                    break;
                    
                case 'GAME_OVER':
                    handleGameOver(ws, data);
                    break;
                    
                case 'PLAYER_SURRENDERED':
                    handlePlayerSurrender(ws, data);
                    break;
                    
                case 'PING':
                    sendToClient(ws, { type: 'PONG' });
                    break;
                    
                default:
                    log(`⚠️ Unknown message type from ${clientId}: ${data.type}`);
            }
        } catch (error) {
            error(`Error processing message from ${clientId}`, error);
            sendToClient(ws, {
                type: 'ERROR',
                message: 'Invalid message format'
            });
        }
    });
    
    ws.on('close', (code, reason) => {
        log(`👋 Client disconnected: ${clientId} (code: ${code}, reason: ${reason})`);
        handleDisconnection(ws);
    });
    
    ws.on('error', (error) => {
        error(`WebSocket error for ${clientId}`, error);
    });
});

// ENHANCED: Move handling with detailed debugging
function handleMakeMove(ws, data) {
    log(`🎯 === HANDLING MOVE FROM ${ws.clientId} ===`);
    log(`🎯 Move data:`, data);
    log(`🎯 Sender WebSocket state: ${ws.readyState}`);
    
    try {
        const roomInfo = findRoomByPlayer(ws);
        if (!roomInfo) {
            error(`❌ Move error: Player ${ws.clientId} not in any room`);
            
            // Debug: List all rooms and their players
            log(`🔍 DEBUG: Current rooms and players:`);
            for (const [roomId, room] of gameRooms) {
                log(`   Room ${roomId}: ${room.players.map(p => `${p.clientId}(${p.nickname})`).join(', ')}`);
            }
            return;
        }
        
        const { roomId, room, playerIndex } = roomInfo;
        const currentPlayer = room.players[playerIndex];
        const opponent = room.players[1 - playerIndex];
        
        log(`🎯 Room: ${roomId}, Player: ${currentPlayer.nickname} (${currentPlayer.clientId})`);
        
        if (!opponent) {
            error(`❌ Move error: No opponent found in room ${roomId}`);
            return;
        }
        
        log(`🎯 Opponent: ${opponent.nickname} (${opponent.clientId})`);
        log(`🎯 Opponent WebSocket state: ${opponent.ws.readyState} (${opponent.ws.readyState === WebSocket.OPEN ? 'OPEN' : 'NOT_OPEN'})`);
        
        room.lastActivity = Date.now();
        
        log(`🎯 Move: ${data.player} at (${data.row},${data.col}) in room ${roomId}`);
        
        // Prepare message for opponent
        const moveMessage = {
            type: 'OPPONENT_MOVE',
            row: data.row,
            col: data.col,
            player: data.player,
            moveNumber: data.moveNumber,
            gameId: data.gameId || roomId
        };
        
        log(`🎯 Sending to opponent ${opponent.clientId}:`, moveMessage);
        
        // Forward move to opponent with enhanced error checking
        const sent = sendToClient(opponent.ws, moveMessage);
        
        if (sent) {
            log(`✅ Move successfully sent to ${opponent.clientId}`);
        } else {
            error(`❌ Failed to send move to ${opponent.clientId}`);
            
            // Additional debugging
            log(`🔍 Opponent connection details:`, {
                clientId: opponent.clientId,
                nickname: opponent.nickname,
                readyState: opponent.ws.readyState,
                connectionTime: opponent.ws.connectionTime,
                lastPing: opponent.ws.lastPing
            });
        }
        
    } catch (error) {
        error(`💥 Exception in handleMakeMove for ${ws.clientId}`, error);
        error(`💥 Stack trace:`, error.stack);
    }
    
    log(`🎯 === MOVE HANDLING COMPLETE ===`);
}

// ENHANCED: Send to client with detailed logging
function sendToClient(ws, data) {
    try {
        log(`📤 ATTEMPTING to send to ${ws.clientId}: ${data.type}`);
        log(`📤 WebSocket state: ${ws.readyState} (expected: ${WebSocket.OPEN})`);
        
        if (ws.readyState === WebSocket.OPEN) {
            const message = JSON.stringify(data);
            ws.send(message);
            log(`✅ Successfully sent to ${ws.clientId}: ${data.type}`);
            return true;
        } else {
            const stateNames = {
                [WebSocket.CONNECTING]: 'CONNECTING',
                [WebSocket.OPEN]: 'OPEN', 
                [WebSocket.CLOSING]: 'CLOSING',
                [WebSocket.CLOSED]: 'CLOSED'
            };
            
            const stateName = stateNames[ws.readyState] || 'UNKNOWN';
            log(`❌ Cannot send to ${ws.clientId}: WebSocket state is ${stateName} (${ws.readyState})`);
            return false;
        }
    } catch (error) {
        error(`💥 Exception sending to ${ws.clientId}`, error);
        return false;
    }
}

// Game event handlers (keeping existing logic but with enhanced logging)
function handleCreateGame(ws, data, req) {
    try {
        const roomId = generateRoomId();
        const room = {
            id: roomId,
            players: [{ 
                ws, 
                nickname: data.nickname, 
                role: 'X',
                clientId: ws.clientId 
            }],
            gameState: null,
            created: Date.now(),
            lastActivity: Date.now()
        };
        
        gameRooms.set(roomId, room);
        
        const host = req.headers.host || 'localhost:3000';
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const inviteLink = `${protocol}://${host}?gameId=${roomId}`;
        
        log(`🎮 Game created: ${roomId} by ${data.nickname} (${ws.clientId})`, {
            roomId,
            inviteLink,
            host,
            protocol
        });
        
        sendToClient(ws, {
            type: 'GAME_CREATED',
            roomId: roomId,
            inviteLink: inviteLink,
            role: 'X'
        });
        
    } catch (error) {
        error('Error creating game', error);
        sendToClient(ws, {
            type: 'ERROR',
            message: 'Failed to create game'
        });
    }
}

function handleJoinGame(ws, data) {
    try {
        const room = gameRooms.get(data.roomId);
        
        if (!room) {
            log(`❌ Join failed: Room ${data.roomId} not found`);
            sendToClient(ws, {
                type: 'JOIN_FAILED',
                reason: 'Game not found'
            });
            return;
        }
        
        if (room.players.length >= 2) {
            log(`❌ Join failed: Room ${data.roomId} is full`);
            sendToClient(ws, {
                type: 'JOIN_FAILED',
                reason: 'Game is full'
            });
            return;
        }
        
        // Add second player
        room.players.push({ 
            ws, 
            nickname: data.nickname, 
            role: 'O',
            clientId: ws.clientId 
        });
        room.lastActivity = Date.now();
        
        log(`✅ Player joined: ${data.nickname} (${ws.clientId}) joined room ${data.roomId}`);
        log(`👥 Room ${data.roomId} now has players:`, room.players.map(p => `${p.nickname}(${p.clientId})`));
        
        // Notify both players that game is starting
        room.players.forEach((player, index) => {
            const opponent = room.players[1 - index];
            const startMessage = {
                type: 'GAME_STARTED',
                opponent: opponent.nickname,
                role: player.role,
                roomId: data.roomId,
                isMyTurn: player.role === 'X' // X goes first
            };
            
            log(`📨 Sending GAME_STARTED to ${player.nickname} (${player.clientId}):`, startMessage);
            sendToClient(player.ws, startMessage);
        });
        
    } catch (error) {
        error('Error joining game', error);
        sendToClient(ws, {
            type: 'JOIN_FAILED',
            reason: 'Server error'
        });
    }
}

function handleGameOver(ws, data) {
    try {
        const roomInfo = findRoomByPlayer(ws);
        if (!roomInfo) return;
        
        const { roomId, room, playerIndex } = roomInfo;
        const opponent = room.players[1 - playerIndex];
        
        if (opponent) {
            log(`🏁 Game ended in room ${roomId}: ${data.winner} wins`);
            sendToClient(opponent.ws, {
                type: 'GAME_ENDED',
                winner: data.winner,
                reason: data.reason
            });
        }
        
        room.lastActivity = Date.now();
        
    } catch (error) {
        error('Error handling game over', error);
    }
}

function handlePlayerSurrender(ws, data) {
    try {
        const roomInfo = findRoomByPlayer(ws);
        if (!roomInfo) return;
        
        const { roomId, room, playerIndex } = roomInfo;
        const opponent = room.players[1 - playerIndex];
        
        if (opponent) {
            log(`🏳️ Player surrendered in room ${roomId}: ${data.surrenderingPlayer}`);
            sendToClient(opponent.ws, {
                type: 'OPPONENT_SURRENDERED',
                surrenderingPlayer: data.surrenderingPlayer,
                winner: data.winner
            });
        }
        
        room.lastActivity = Date.now();
        
    } catch (error) {
        error('Error handling surrender', error);
    }
}

function handleDisconnection(ws) {
    try {
        const roomInfo = findRoomByPlayer(ws);
        if (roomInfo) {
            const { roomId, room, playerIndex } = roomInfo;
            const remainingPlayer = room.players[1 - playerIndex];
            
            log(`💔 Player ${ws.clientId} disconnected from room ${roomId}`);
            
            if (remainingPlayer && remainingPlayer.ws.readyState === WebSocket.OPEN) {
                sendToClient(remainingPlayer.ws, {
                    type: 'OPPONENT_DISCONNECTED'
                });
            }
            
            // Clean up room after delay
            setTimeout(() => {
                if (gameRooms.has(roomId)) {
                    const currentRoom = gameRooms.get(roomId);
                    const hasActivePlayers = currentRoom.players.some(p => 
                        p.ws.readyState === WebSocket.OPEN
                    );
                    
                    if (!hasActivePlayers) {
                        gameRooms.delete(roomId);
                        log(`🗑️ Room ${roomId} deleted`);
                    }
                }
            }, 30000);
        }
    } catch (error) {
        error('Error handling disconnection', error);
    }
}

// Enhanced heartbeat with connection monitoring
const heartbeatInterval = setInterval(() => {
    log(`💓 Running heartbeat check for ${wss.clients.size} clients`);
    
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            log(`💀 Terminating dead connection: ${ws.clientId}`);
            return ws.terminate();
        }
        
        // Check connection age and last ping
        const connectionAge = Date.now() - ws.connectionTime;
        const timeSinceLastPing = Date.now() - ws.lastPing;
        
        if (timeSinceLastPing > 60000) { // 1 minute without ping
            log(`⚠️ Client ${ws.clientId} hasn't responded to ping in ${Math.round(timeSinceLastPing/1000)}s`);
        }
        
        ws.isAlive = false;
        ws.ping();
    });
    
    // Log room status
    log(`🎮 Active rooms: ${gameRooms.size}`);
    for (const [roomId, room] of gameRooms) {
        const playerStates = room.players.map(p => 
            `${p.nickname}(${p.clientId}):${p.ws.readyState === WebSocket.OPEN ? 'OPEN' : 'CLOSED'}`
        ).join(', ');
        log(`   ${roomId}: ${playerStates}`);
    }
}, 30000);

// Periodic cleanup
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [roomId, room] of gameRooms) {
        const hasActivePlayers = room.players.some(p => p.ws.readyState === WebSocket.OPEN);
        const isOld = now - room.created > 3600000; // 1 hour
        
        if (!hasActivePlayers || isOld) {
            gameRooms.delete(roomId);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        log(`🧹 Cleaned up ${cleanedCount} rooms. Active rooms: ${gameRooms.size}`);
    }
}, 300000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('');
    console.log('🎉 ================================');
    console.log(`🚀 ENHANCED DEBUG SERVER running on port ${PORT}`);
    console.log('🎉 ================================');
    console.log('');
    console.log('🔧 ENHANCED FEATURES:');
    console.log('   ✅ Detailed WebSocket connection logging');
    console.log('   ✅ Move routing debugging');
    console.log('   ✅ Connection state monitoring');
    console.log('   ✅ ngrok compatibility checks');
    console.log('');
    console.log('📋 DEBUGGING INSTRUCTIONS:');
    console.log(`1. Open: http://localhost:${PORT} (Paul)`);
    console.log(`2. Open: https://your-ngrok-url (Peter)`);
    console.log('3. Watch server logs for detailed connection info');
    console.log('');
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ ERROR: Port ${PORT} is already in use!`);
        console.log('💡 Kill existing process or use: PORT=3001 node server.js');
    } else {
        console.error('❌ Server error:', error);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('📴 Shutting down server...');
    clearInterval(heartbeatInterval);
    clearInterval(cleanupInterval);
    
    wss.clients.forEach((ws) => {
        ws.close();
    });
    
    server.close(() => {
        log('✅ Server shut down complete');
        process.exit(0);
    });
});