// game-multiplayer.js - ENHANCED VERSION with detailed debugging for ngrok issues
class ConnectionGameMultiplayer {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.playerNickname = '';
        this.playerRole = null;
        this.opponentNickname = '';
        this.gameId = null;
        this.isMyTurn = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.callbacks = {};
        
        // Enhanced debugging
        this.messageCount = 0;
        this.connectionStartTime = null;
        this.lastMessageTime = null;
        this.isNgrokConnection = false;
    }

    // Event handling system
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        this.debugLog('🌐 [MULTIPLAYER] Emitting event:', event);
        this.debugLog('🌐 [MULTIPLAYER] Data:', data);
        
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }

    // Enhanced debugging logger
    debugLog(message, data = null) {
        const timestamp = new Date().toISOString().substr(11, 12);
        console.log(`[${timestamp}] 🌐 [MULTIPLAYER] ${message}`);
        if (data !== null) {
            console.log(`[${timestamp}] 🌐 [MULTIPLAYER] Data:`, data);
        }
    }

    debugError(message, error = null) {
        const timestamp = new Date().toISOString().substr(11, 12);
        console.error(`[${timestamp}] 🌐 [MULTIPLAYER] ❌ ${message}`);
        if (error) {
            console.error(`[${timestamp}] 🌐 [MULTIPLAYER] Error:`, error);
        }
    }

    // Enhanced connection management
    connect(nickname) {
        if (this.isConnecting || this.isConnected) {
            this.debugLog('Already connecting or connected');
            return false;
        }

        this.playerNickname = nickname;
        this.isConnecting = true;
        this.connectionStartTime = Date.now();
        this.emit('connectionStatusChanged', { status: 'connecting', message: 'Connecting...' });

        try {
            // Enhanced URL detection for ngrok
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}`;
            
            this.debugLog('Connection details:', {
                currentURL: window.location.href,
                detectedHost: host,
                wsProtocol: protocol,
                finalWSUrl: wsUrl,
                userAgent: navigator.userAgent
            });
            
            // Detect if this is likely an ngrok connection
            this.isNgrokConnection = host.includes('ngrok.io') || host.includes('ngrok-free.app') || host.includes('ngrok.app');
            if (this.isNgrokConnection) {
                this.debugLog('🔗 NGROK CONNECTION DETECTED');
                this.debugLog('🔗 Using secure WebSocket protocol for ngrok');
            }
            
            this.debugLog(`📡 Attempting WebSocket connection to: ${wsUrl}`);
            this.ws = new WebSocket(wsUrl);
            
            // Enhanced event handlers
            this.ws.onopen = () => this.handleConnection();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onclose = (event) => this.handleDisconnection(event);
            this.ws.onerror = (error) => this.handleError(error);

            return true;
        } catch (error) {
            this.debugError('Failed to create WebSocket connection', error);
            this.handleConnectionFailed();
            return false;
        }
    }

    disconnect() {
        this.debugLog('Disconnecting...');
        if (this.ws) {
            this.ws.close();
        }
        this.cleanup();
    }

    handleConnection() {
        const connectionTime = Date.now() - this.connectionStartTime;
        this.debugLog(`✅ WebSocket connected successfully in ${connectionTime}ms`);
        this.debugLog('WebSocket ready state:', this.ws.readyState);
        
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        this.emit('connectionStatusChanged', { 
            status: 'connected', 
            message: 'Connected successfully' 
        });

        // Enhanced connection verification
        this.verifyConnection();

        // Check if we should auto-join a game from URL
        if (window.autoJoinGameId) {
            this.debugLog(`🔗 Auto-joining game: ${window.autoJoinGameId}`);
            setTimeout(() => this.joinGame(window.autoJoinGameId), 500);
        }
    }

    // NEW: Connection verification
    verifyConnection() {
        this.debugLog('🔍 Verifying connection...');
        
        // Send a test message
        this.send({
            type: 'CONNECTION_TEST',
            nickname: this.playerNickname,
            timestamp: Date.now(),
            isNgrok: this.isNgrokConnection
        });
        
        // Set up connection monitoring
        this.startConnectionMonitoring();
    }

    // NEW: Connection monitoring
    startConnectionMonitoring() {
        this.connectionMonitor = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.debugLog('💓 Connection heartbeat - sending PING');
                this.send({ type: 'PING', timestamp: Date.now() });
            } else {
                this.debugLog('⚠️ Connection monitor: WebSocket not in OPEN state');
                this.debugLog('WebSocket state:', this.ws ? this.ws.readyState : 'null');
            }
        }, 30000); // Every 30 seconds
    }

    stopConnectionMonitoring() {
        if (this.connectionMonitor) {
            clearInterval(this.connectionMonitor);
            this.connectionMonitor = null;
        }
    }

    handleMessage(event) {
        this.messageCount++;
        this.lastMessageTime = Date.now();
        
        try {
            const data = JSON.parse(event.data);
            
            // Log all messages with enhanced details
            this.debugLog('📨 Received message:');
            this.debugLog('Data:', data);
            this.debugLog(`Message #${this.messageCount}, WebSocket state: ${this.ws.readyState}`);

            switch (data.type) {
                case 'CONNECTION_CONFIRMED':
                    this.debugLog('✅ Connection confirmed by server');
                    break;
                    
                case 'GAME_CREATED':
                    this.handleGameCreated(data);
                    break;
                    
                case 'GAME_STARTED':
                    this.handleGameStarted(data);
                    break;
                    
                case 'JOIN_FAILED':
                    this.handleJoinFailed(data);
                    break;
                    
                case 'OPPONENT_MOVE':
                    this.debugLog('🎯 === OPPONENT MOVE MESSAGE RECEIVED ===');
                    this.handleOpponentMove(data);
                    break;
                    
                case 'GAME_ENDED':
                    this.handleGameEnded(data);
                    break;
                    
                case 'OPPONENT_DISCONNECTED':
                    this.handleOpponentDisconnected();
                    break;
                    
                case 'OPPONENT_SURRENDERED':
                    this.handleOpponentSurrendered(data);
                    break;
                    
                case 'PONG':
                    this.debugLog('💓 Received PONG from server');
                    break;
                    
                default:
                    this.debugLog('⚠️ Unknown message type:', data.type);
            }
        } catch (error) {
            this.debugError('Error parsing WebSocket message', error);
            this.debugLog('Raw message data:', event.data);
        }
    }

    handleDisconnection(event) {
        const connectionDuration = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
        
        this.debugLog(`👋 WebSocket disconnected after ${Math.round(connectionDuration/1000)}s`);
        this.debugLog('Disconnection details:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            messageCount: this.messageCount
        });
        
        this.isConnected = false;
        this.isConnecting = false;
        this.stopConnectionMonitoring();

        if (event.code !== 1000) { // Not a normal closure
            this.emit('connectionStatusChanged', { 
                status: 'disconnected', 
                message: 'Connection lost' 
            });
            this.attemptReconnect();
        } else {
            this.emit('connectionStatusChanged', { 
                status: 'disconnected', 
                message: 'Disconnected' 
            });
        }
    }

    handleError(error) {
        this.debugError('WebSocket error', error);
        this.debugLog('Error event details:', {
            type: error.type,
            target: error.target,
            readyState: this.ws ? this.ws.readyState : 'null'
        });
        
        this.handleConnectionFailed();
    }

    handleConnectionFailed() {
        this.isConnecting = false;
        this.isConnected = false;
        this.stopConnectionMonitoring();
        
        this.emit('connectionStatusChanged', { 
            status: 'failed', 
            message: 'Connection failed' 
        });
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.debugLog('❌ Max reconnection attempts reached');
            this.emit('connectionStatusChanged', { 
                status: 'failed', 
                message: 'Connection failed permanently' 
            });
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        
        this.debugLog(`🔄 Reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        this.emit('connectionStatusChanged', { 
            status: 'reconnecting', 
            message: `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})` 
        });

        setTimeout(() => {
            if (!this.isConnected) {
                this.connect(this.playerNickname);
            }
        }, delay);
    }

    cleanup() {
        this.isConnected = false;
        this.isConnecting = false;
        this.playerRole = null;
        this.opponentNickname = '';
        this.gameId = null;
        this.isMyTurn = false;
        this.ws = null;
        this.messageCount = 0;
        this.lastMessageTime = null;
        this.stopConnectionMonitoring();
    }

    // Game Management
    createGame() {
        if (!this.isConnected) {
            this.debugError('Not connected to server');
            return false;
        }

        if (!this.playerNickname.trim()) {
            this.debugError('Player nickname required');
            this.emit('error', { message: 'Please enter a nickname first' });
            return false;
        }

        this.debugLog('🎮 Creating new game...');
        this.send({
            type: 'CREATE_GAME',
            nickname: this.playerNickname
        });

        return true;
    }

    joinGame(gameId) {
        if (!this.isConnected) {
            this.debugError('Not connected to server');
            return false;
        }

        if (!this.playerNickname.trim()) {
            this.debugError('Player nickname required');
            this.emit('error', { message: 'Please enter a nickname first' });
            return false;
        }

        this.debugLog(`🎮 Joining game: ${gameId}`);
        this.send({
            type: 'JOIN_GAME',
            roomId: gameId,
            nickname: this.playerNickname
        });

        return true;
    }

    // Game Event Handlers
    handleGameCreated(data) {
        this.gameId = data.roomId;
        this.playerRole = data.role;
        this.isMyTurn = (this.playerRole === 'X');
        
        this.debugLog(`🎮 Game created with ID: ${this.gameId}`);
        this.debugLog(`👤 You are player: ${this.playerRole}`);
        
        this.emit('gameCreated', {
            gameId: this.gameId,
            inviteLink: data.inviteLink,
            role: this.playerRole
        });
    }

    handleGameStarted(data) {
    this.opponentNickname = data.opponent;
    this.playerRole = data.role;
    this.isMyTurn = (this.playerRole === 'X');
    this.debugLog(`🚀 Game started!`);
    this.debugLog('Data:', {
        opponent: data.opponent,
        myRole: data.role,
        isMyTurn: data.isMyTurn,
        roomId: data.roomId
    });

    // Add this to the gameStarted handler
    document.body.classList.add('game-active');

    // Hide the join game banner when game starts
    const joinBanner = document.getElementById('joinGameBanner');
    if (joinBanner) {
        joinBanner.classList.add('hidden');
    }

    this.emit('gameStarted', {
        opponent: this.opponentNickname,
        role: this.playerRole,
        isMyTurn: this.isMyTurn
    });
}



    handleJoinFailed(data) {
        this.debugError('Failed to join game:', data.reason);
        this.emit('joinFailed', { reason: data.reason });
    }

    // ENHANCED: Opponent move handling with detailed debugging
    handleOpponentMove(data) {
        this.debugLog('🎯 === OPPONENT MOVE RECEIVED ===');
        this.debugLog(`🎯 Opponent move: ${data.player} at (${data.row}, ${data.col})`);
        this.debugLog(`🎯 Current game state - Move count: ${this.gameCore.moveCount}, Current player: ${this.gameCore.currentPlayer}`);
        this.debugLog(`🎯 WebSocket state: ${this.ws.readyState}`);
        this.debugLog(`🎯 Connection info:`, {
            isConnected: this.isConnected,
            playerRole: this.playerRole,
            isMyTurn: this.isMyTurn,
            gameId: this.gameId,
            messageCount: this.messageCount
        });
        
        // Validate game core exists
        if (!this.gameCore) {
            this.debugError('❌ Game core not available!');
            return;
        }
        
        // Validate board exists
        if (!this.gameCore.board) {
            this.debugError('❌ Game board not initialized!');
            return;
        }
        
        // CRITICAL: Ensure the current player matches the incoming move
        if (this.gameCore.currentPlayer !== data.player) {
            this.debugLog(`🔄 Adjusting current player from ${this.gameCore.currentPlayer} to ${data.player}`);
            this.gameCore.currentPlayer = data.player;
        }
        
        // Validate the move before applying
        if (!this.gameCore.isValidMove(data.row, data.col)) {
            this.debugError(`❌ Invalid opponent move: (${data.row}, ${data.col}) - cell contains: "${this.gameCore.board[data.row][data.col]}"`);
            this.debugLog('🔍 Current board state:', this.gameCore.board.map(row => row.join(' ')).join('\n'));
            return;
        }
        
        // Apply the opponent's move to our game state
        this.debugLog(`⚡ Applying opponent move to game core...`);
        const result = this.gameCore.makeMove(data.row, data.col, data.player);
        
        if (result.success) {
            this.debugLog(`✅ Opponent move applied successfully - New move count: ${this.gameCore.moveCount}`);
            this.isMyTurn = true; // Now it's our turn
            
            this.emit('opponentMove', {
                row: data.row,
                col: data.col,
                player: data.player,
                moveNumber: data.moveNumber,
                gameResult: result
            });
        } else {
            this.debugError('❌ Failed to apply opponent move:', result.reason);
            this.debugLog('🔍 Current board state:', this.gameCore.board.map(row => row.join(' ')).join('\n'));
        }
        
        this.debugLog('🎯 === OPPONENT MOVE COMPLETE ===');
    }

    handleGameEnded(data) {
        this.debugLog(`🏁 Game ended: ${data.winner} wins (${data.reason})`);
        this.emit('gameEnded', {
            winner: data.winner,
            reason: data.reason
        });
    }

    handleOpponentDisconnected() {
        this.debugLog('💔 Opponent disconnected');
        this.emit('opponentDisconnected', {});
    }

    handleOpponentSurrendered(data) {
        this.debugLog(`🏳️ Opponent ${data.surrenderingPlayer} surrendered`);
        this.emit('opponentSurrendered', {
            surrenderingPlayer: data.surrenderingPlayer,
            winner: data.winner
        });
    }

    // ENHANCED: Move sending with detailed debugging
    sendMove(row, col, player, moveNumber) {
        this.debugLog('🎯 === SENDING MOVE ===');
        this.debugLog('Move details:');
        this.debugLog('Data:', {
            position: [row, col],
            player: player,
            moveNumber: moveNumber,
            gameId: this.gameId,
            playerRole: this.playerRole
        });
        
        if (!this.isConnected) {
            this.debugError('❌ Cannot send move: not connected');
            return false;
        }

        if (!this.isMyTurn) {
            this.debugError('❌ Cannot send move: not your turn');
            return false;
        }

        const moveData = {
            type: 'MAKE_MOVE',
            row: row,
            col: col,
            player: player,
            moveNumber: moveNumber,
            gameId: this.gameId
        };
        
        this.debugLog('Sending move data:');
        this.debugLog('Data:', moveData);
        
        const sent = this.send(moveData);

        if (sent) {
            this.isMyTurn = false;
            this.debugLog('✅ Move sent successfully, isMyTurn set to false');
        } else {
            this.debugError('❌ Failed to send move');
        }
        
        this.debugLog('🎯 === MOVE SEND COMPLETE ===');
        return sent;
    }

    sendGameEnd(winner, reason) {
        if (!this.isConnected) return false;

        this.send({
            type: 'GAME_OVER',
            winner: winner,
            reason: reason
        });

        return true;
    }

    sendSurrender(surrenderingPlayer) {
        if (!this.isConnected) return false;

        this.debugLog(`🏳️ Sending surrender message: ${surrenderingPlayer} surrenders`);
        
        const winner = surrenderingPlayer === 'X' ? 'O' : 'X';
        
        this.send({
            type: 'PLAYER_SURRENDERED',
            surrenderingPlayer: surrenderingPlayer,
            winner: winner
        });

        return true;
    }

    // ENHANCED: Send method with detailed logging
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = JSON.stringify(data);
            
            this.debugLog('📤 Sending WebSocket message:', data.type);
            this.debugLog('Message content:');
            this.debugLog('Data:', data);
            
            try {
                this.ws.send(message);
                this.debugLog('✅ Message sent successfully');
                return true;
            } catch (error) {
                this.debugError('❌ Error sending WebSocket message', error);
                return false;
            }
        } else {
            this.debugError('❌ Cannot send data: WebSocket not ready', {
                wsExists: !!this.ws,
                readyState: this.ws?.readyState,
                expectedState: WebSocket.OPEN,
                isConnected: this.isConnected
            });
            return false;
        }
    }

    // Status and Info
    isPlayerConnected() {
        return this.isConnected;
    }

    getConnectionStatus() {
        if (this.isConnecting) return 'connecting';
        if (this.isConnected) return 'connected';
        return 'disconnected';
    }

    getGameInfo() {
        return {
            gameId: this.gameId,
            playerNickname: this.playerNickname,
            opponentNickname: this.opponentNickname,
            playerRole: this.playerRole,
            isMyTurn: this.isMyTurn,
            connectionStatus: this.getConnectionStatus(),
            messageCount: this.messageCount,
            lastMessageTime: this.lastMessageTime,
            isNgrokConnection: this.isNgrokConnection
        };
    }

    // Debugging methods
    getDebugInfo() {
        return {
            connectionState: {
                isConnected: this.isConnected,
                isConnecting: this.isConnecting,
                wsReadyState: this.ws ? this.ws.readyState : null,
                isNgrokConnection: this.isNgrokConnection
            },
            gameState: {
                gameId: this.gameId,
                playerRole: this.playerRole,
                isMyTurn: this.isMyTurn,
                opponentNickname: this.opponentNickname
            },
            connectionStats: {
                messageCount: this.messageCount,
                lastMessageTime: this.lastMessageTime,
                connectionStartTime: this.connectionStartTime,
                reconnectAttempts: this.reconnectAttempts
            }
        };
    }

    // Nickname Management
    setNickname(nickname) {
        this.playerNickname = nickname.trim();
        return this.playerNickname.length > 0;
    }

    getNickname() {
        return this.playerNickname;
    }

    // URL Handling for Direct Game Joins
    static extractGameIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('gameId');
    }

    static createInviteUrl(gameId) {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?gameId=${gameId}`;
    }
}

// Export for use in other modules
window.ConnectionGameMultiplayer = ConnectionGameMultiplayer;