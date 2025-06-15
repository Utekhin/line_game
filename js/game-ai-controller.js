// game-ai-controller.js - AI vs AI Game Controller
// Manages complete AI vs AI gameplay with strategy management and game flow control

class AIGameController {
    constructor(gameCore, config = {}) {
        this.gameCore = gameCore;
        this.strategyManager = new StrategyManager();
        
        // Game configuration
        this.config = this.mergeConfig(this.getDefaultConfig(), config);
        
        // Game state
        this.gameState = 'ready'; // 'ready', 'running', 'paused', 'complete', 'error'
        this.currentPlayer = 'X';
        this.gameResult = null;
        this.moveTimeouts = new Map(); // player -> timeout ID
        this.gameStartTime = null;
        this.gameDuration = 0;
        
        // Move management
        this.moveQueue = [];
        this.pendingMove = null;
        this.moveHistory = [];
        this.lastMoveTime = 0;
        
        // Performance tracking
        this.gameStats = {
            totalMoves: 0,
            xMoves: 0,
            oMoves: 0,
            averageMoveTime: 0,
            totalThinkTime: 0,
            timeouts: 0,
            errors: 0
        };
        
        // Event handlers
        this.eventHandlers = {
            'move': [],
            'gameStart': [],
            'gameEnd': [],
            'playerChange': [],
            'error': [],
            'timeout': [],
            'stateChange': []
        };
        
        this.log('AI Game Controller initialized');
    }

    // ========================= CONFIGURATION =========================

    getDefaultConfig() {
        return {
            // Timing configuration
            moveTimeLimit: 10000,        // Maximum time per move (ms)
            turnDelay: 500,              // Delay between moves (ms)
            gameTimeLimit: 300000,       // Maximum game duration (ms)
            
            // Strategy configuration  
            xStrategy: 'chain',
            oStrategy: 'chain',
            xConfig: { aggressiveness: 0.6 },
            oConfig: { aggressiveness: 0.6 },
            
            // Game flow configuration
            autoStart: false,
            pauseOnError: true,
            maxConsecutiveErrors: 3,
            enableTimeouts: true,
            
            // Debug and logging
            debugMode: true,
            logMoves: true,
            trackPerformance: true
        };
    }

    mergeConfig(defaultConfig, providedConfig) {
        return { ...defaultConfig, ...providedConfig };
    }

    updateConfig(newConfig) {
        this.config = this.mergeConfig(this.config, newConfig);
        this.log(`Configuration updated: ${JSON.stringify(newConfig)}`);
    }

    // ========================= GAME LIFECYCLE =========================

    /**
     * Initialize a new AI vs AI game
     */
    async initializeGame(boardSize = 15) {
        try {
            this.log('Initializing new AI vs AI game...');
            
            // Reset game core
            this.gameCore.resetGame(boardSize);
            this.strategyManager.updateGameCore(this.gameCore);
            
            // Setup strategies for both players
            await this.setupStrategies();
            
            // Reset game state
            this.resetGameState();
            
            // Emit game initialization event
            this.emit('gameStart', {
                boardSize: boardSize,
                players: {
                    X: this.getPlayerStrategyInfo('X'),
                    O: this.getPlayerStrategyInfo('O')
                }
            });
            
            this.setState('ready');
            this.log('Game initialized successfully');
            
            return true;
            
        } catch (error) {
            this.handleError('Game initialization failed', error);
            return false;
        }
    }

    /**
     * Setup AI strategies for both players
     */
    async setupStrategies() {
        // Setup X player strategy
        const xStrategy = this.strategyManager.setPlayerStrategy(
            'X', 
            this.config.xStrategy, 
            this.config.xConfig
        );
        xStrategy.gameCore = this.gameCore;
        
        // Setup O player strategy
        const oStrategy = this.strategyManager.setPlayerStrategy(
            'O', 
            this.config.oStrategy, 
            this.config.oConfig
        );
        oStrategy.gameCore = this.gameCore;
        
        this.log(`Strategies configured: X=${this.config.xStrategy}, O=${this.config.oStrategy}`);
    }

    /**
     * Start the AI vs AI game
     */
    async startGame() {
        if (this.gameState !== 'ready') {
            this.log(`Cannot start game in state: ${this.gameState}`);
            return false;
        }
        
        try {
            this.setState('running');
            this.gameStartTime = Date.now();
            this.currentPlayer = 'X';
            
            this.log('Game started - X goes first');
            
            // Start the game loop
            this.gameLoop();
            
            return true;
            
        } catch (error) {
            this.handleError('Failed to start game', error);
            return false;
        }
    }

    /**
     * Main game loop
     */
    async gameLoop() {
        while (this.gameState === 'running') {
            try {
                // Check for game time limit
                if (this.hasGameTimedOut()) {
                    this.endGame('timeout', 'Game time limit exceeded');
                    break;
                }
                
                // Get move from current player
                const move = await this.getCurrentPlayerMove();
                
                if (!move) {
                    // No valid move available
                    this.endGame('no-moves', `${this.currentPlayer} has no valid moves`);
                    break;
                }
                
                // Execute the move
                const moveResult = await this.executeMove(move);
                
                if (!moveResult.success) {
                    this.handleMoveError(move, moveResult.error);
                    continue;
                }
                
                // Check for win condition
                if (moveResult.gameOver) {
                    this.endGame('win', `${moveResult.winner} wins by ${moveResult.winType}`);
                    break;
                }
                
                // Switch to next player
                this.switchPlayer();
                
                // Apply turn delay
                if (this.config.turnDelay > 0) {
                    await this.delay(this.config.turnDelay);
                }
                
            } catch (error) {
                this.handleError('Error in game loop', error);
                break;
            }
        }
    }

    /**
     * Get move from current player's AI
     */
    async getCurrentPlayerMove() {
        const strategy = this.strategyManager.getPlayerStrategy(this.currentPlayer);
        
        if (!strategy) {
            throw new Error(`No strategy found for player ${this.currentPlayer}`);
        }
        
        const startTime = Date.now();
        let move = null;
        let timedOut = false;
        
        // Set up timeout if enabled
        if (this.config.enableTimeouts) {
            const timeoutId = setTimeout(() => {
                timedOut = true;
                this.handleMoveTimeout(this.currentPlayer);
            }, this.config.moveTimeLimit);
            
            this.moveTimeouts.set(this.currentPlayer, timeoutId);
        }
        
        try {
            // Get move from AI strategy
            move = strategy.getNextMove();
            
            // Clear timeout
            if (this.moveTimeouts.has(this.currentPlayer)) {
                clearTimeout(this.moveTimeouts.get(this.currentPlayer));
                this.moveTimeouts.delete(this.currentPlayer);
            }
            
            // Record think time
            const thinkTime = Date.now() - startTime;
            this.recordThinkTime(this.currentPlayer, thinkTime);
            
            if (timedOut) {
                this.log(`${this.currentPlayer} move timed out after ${thinkTime}ms`);
                return null;
            }
            
            if (move) {
                this.log(`${this.currentPlayer} selected move: (${move.row},${move.col}) in ${thinkTime}ms`);
            }
            
            return move;
            
        } catch (error) {
            // Clear timeout on error
            if (this.moveTimeouts.has(this.currentPlayer)) {
                clearTimeout(this.moveTimeouts.get(this.currentPlayer));
                this.moveTimeouts.delete(this.currentPlayer);
            }
            
            throw error;
        }
    }

    /**
     * Execute a move on the game board
     */
    async executeMove(move) {
        try {
            // Validate move
            if (!this.isValidMove(move)) {
                return {
                    success: false,
                    error: 'Invalid move'
                };
            }
            
            // Execute move in game core
            const result = this.gameCore.makeMove(move.row, move.col, this.currentPlayer);
            
            if (result.success) {
                // Record successful move
                this.recordMove(move, result);
                
                // Emit move event
                this.emit('move', {
                    player: this.currentPlayer,
                    move: move,
                    result: result,
                    gameState: this.getGameState()
                });
            }
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Switch to the next player
     */
    switchPlayer() {
        const previousPlayer = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        this.emit('playerChange', {
            previous: previousPlayer,
            current: this.currentPlayer
        });
        
        this.log(`Player switched: ${previousPlayer} -> ${this.currentPlayer}`);
    }

    /**
     * End the game with a result
     */
    endGame(type, reason) {
        this.setState('complete');
        this.gameDuration = Date.now() - this.gameStartTime;
        
        // Clear any pending timeouts
        for (const timeoutId of this.moveTimeouts.values()) {
            clearTimeout(timeoutId);
        }
        this.moveTimeouts.clear();
        
        // Determine final result
        this.gameResult = {
            type: type,
            reason: reason,
            winner: this.determineWinner(type),
            duration: this.gameDuration,
            totalMoves: this.gameStats.totalMoves,
            finalBoard: JSON.parse(JSON.stringify(this.gameCore.board))
        };
        
        this.log(`Game ended: ${type} - ${reason}`);
        
        // Emit game end event
        this.emit('gameEnd', {
            result: this.gameResult,
            stats: this.getGameStats()
        });
    }

    // ========================= GAME STATE MANAGEMENT =========================

    setState(newState) {
        const previousState = this.gameState;
        this.gameState = newState;
        
        this.emit('stateChange', {
            previous: previousState,
            current: newState
        });
        
        this.log(`Game state: ${previousState} -> ${newState}`);
    }

    resetGameState() {
        this.currentPlayer = 'X';
        this.gameResult = null;
        this.moveHistory = [];
        this.gameStats = {
            totalMoves: 0,
            xMoves: 0,
            oMoves: 0,
            averageMoveTime: 0,
            totalThinkTime: 0,
            timeouts: 0,
            errors: 0
        };
        
        // Reset strategy states
        this.strategyManager.reset();
    }

    getGameState() {
        return {
            state: this.gameState,
            currentPlayer: this.currentPlayer,
            moveCount: this.gameStats.totalMoves,
            board: this.gameCore.board,
            gameResult: this.gameResult,
            players: {
                X: this.getPlayerStatus('X'),
                O: this.getPlayerStatus('O')
            }
        };
    }

    getPlayerStatus(player) {
        const strategy = this.strategyManager.getPlayerStrategy(player);
        
        return {
            strategy: strategy ? strategy.strategyName : 'None',
            stats: strategy ? strategy.getStats() : null,
            isActive: this.currentPlayer === player
        };
    }

    // ========================= GAME CONTROL =========================

    pauseGame() {
        if (this.gameState === 'running') {
            this.setState('paused');
            
            // Clear any pending timeouts
            for (const timeoutId of this.moveTimeouts.values()) {
                clearTimeout(timeoutId);
            }
            this.moveTimeouts.clear();
            
            this.log('Game paused');
            return true;
        }
        return false;
    }

    resumeGame() {
        if (this.gameState === 'paused') {
            this.setState('running');
            this.log('Game resumed');
            
            // Continue game loop
            this.gameLoop();
            return true;
        }
        return false;
    }

    stopGame(reason = 'Manual stop') {
        if (this.gameState === 'running' || this.gameState === 'paused') {
            this.endGame('stopped', reason);
            return true;
        }
        return false;
    }

    // ========================= VALIDATION AND UTILITIES =========================

    isValidMove(move) {
        return move && 
               typeof move.row === 'number' && 
               typeof move.col === 'number' &&
               this.gameCore.isValidMove(move.row, move.col);
    }

    hasGameTimedOut() {
        return this.config.gameTimeLimit > 0 && 
               this.gameStartTime && 
               (Date.now() - this.gameStartTime) > this.config.gameTimeLimit;
    }

    determineWinner(endType) {
        switch (endType) {
            case 'win':
                // Winner determined by game core
                return this.gameResult ? this.gameResult.winner : null;
            case 'timeout':
                // Game timed out - could be a draw or current player loses
                return null;
            case 'no-moves':
                // Player with no moves loses
                return this.currentPlayer === 'X' ? 'O' : 'X';
            case 'stopped':
                return null;
            default:
                return null;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========================= PERFORMANCE TRACKING =========================

    recordMove(move, result) {
        const moveRecord = {
            player: this.currentPlayer,
            move: move,
            result: result,
            timestamp: Date.now(),
            moveNumber: this.gameStats.totalMoves + 1
        };
        
        this.moveHistory.push(moveRecord);
        
        // Update statistics
        this.gameStats.totalMoves++;
        if (this.currentPlayer === 'X') {
            this.gameStats.xMoves++;
        } else {
            this.gameStats.oMoves++;
        }
    }

    recordThinkTime(player, thinkTime) {
        const currentAvg = this.gameStats.averageThinkTime;
        const totalMoves = this.gameStats.totalMoves;
        
        this.gameStats.totalThinkTime += thinkTime;
        this.gameStats.averageMoveTime = this.gameStats.totalThinkTime / (totalMoves + 1);
    }

    getGameStats() {
        return {
            ...this.gameStats,
            duration: this.gameDuration || (Date.now() - (this.gameStartTime || Date.now())),
            strategiesUsed: {
                X: this.config.xStrategy,
                O: this.config.oStrategy
            },
            playerStats: this.strategyManager.getAllStats()
        };
    }

    getPlayerStrategyInfo(player) {
        const strategy = this.strategyManager.getPlayerStrategy(player);
        return strategy ? strategy.getStrategyInfo() : null;
    }

    // ========================= ERROR HANDLING =========================

    handleError(message, error) {
        this.gameStats.errors++;
        
        const errorInfo = {
            message: message,
            error: error ? error.message : 'Unknown error',
            player: this.currentPlayer,
            gameState: this.gameState,
            timestamp: Date.now()
        };
        
        this.log(`ERROR: ${message} - ${errorInfo.error}`);
        
        this.emit('error', errorInfo);
        
        if (this.config.pauseOnError) {
            this.pauseGame();
        }
        
        // Check for too many consecutive errors
        if (this.gameStats.errors >= this.config.maxConsecutiveErrors) {
            this.endGame('error', 'Too many consecutive errors');
        }
    }

    handleMoveError(move, error) {
        this.log(`Invalid move from ${this.currentPlayer}: (${move.row},${move.col}) - ${error}`);
        
        // Give the AI another chance or switch players based on configuration
        this.gameStats.errors++;
    }

    handleMoveTimeout(player) {
        this.gameStats.timeouts++;
        this.log(`${player} move timed out`);
        
        this.emit('timeout', {
            player: player,
            timeLimit: this.config.moveTimeLimit
        });
        
        // Could forfeit the game or give a random move
        // For now, we'll end the game
        this.endGame('timeout', `${player} exceeded move time limit`);
    }

    // ========================= EVENT SYSTEM =========================

    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            for (const handler of this.eventHandlers[event]) {
                try {
                    handler(data);
                } catch (error) {
                    this.log(`Error in event handler for ${event}: ${error.message}`);
                }
            }
        }
    }

    // ========================= PUBLIC API =========================

    /**
     * Quick start method for simple AI vs AI games
     */
    async quickStart(config = {}) {
        const success = await this.initializeGame(config.boardSize);
        if (success) {
            return await this.startGame();
        }
        return false;
    }

    /**
     * Get available strategies
     */
    getAvailableStrategies() {
        return this.strategyManager.getAvailableStrategies();
    }

    /**
     * Update player strategy during game (if allowed)
     */
    updatePlayerStrategy(player, strategyId, config = {}) {
        if (this.gameState === 'ready' || this.gameState === 'paused') {
            const strategy = this.strategyManager.setPlayerStrategy(player, strategyId, config);
            strategy.gameCore = this.gameCore;
            
            this.log(`${player} strategy updated to ${strategyId}`);
            return true;
        }
        return false;
    }

    /**
     * Get detailed game analysis
     */
    getGameAnalysis() {
        return {
            gameState: this.getGameState(),
            statistics: this.getGameStats(),
            moveHistory: [...this.moveHistory],
            strategies: {
                X: this.getPlayerStrategyInfo('X'),
                O: this.getPlayerStrategyInfo('O')
            },
            performance: this.analyzePerformance()
        };
    }

    analyzePerformance() {
        return {
            efficiency: this.gameStats.totalMoves > 0 ? 
                (this.gameStats.totalMoves - this.gameStats.errors) / this.gameStats.totalMoves : 0,
            averageThinkTime: this.gameStats.averageMoveTime,
            errorRate: this.gameStats.totalMoves > 0 ? 
                this.gameStats.errors / this.gameStats.totalMoves : 0,
            timeoutRate: this.gameStats.totalMoves > 0 ? 
                this.gameStats.timeouts / this.gameStats.totalMoves : 0
        };
    }

    // ========================= LOGGING =========================

    log(message) {
        if (this.config.debugMode) {
            console.log(`[AI CONTROLLER] ${message}`);
        }
    }
}

// Export for use in other modules
window.AIGameController = AIGameController;