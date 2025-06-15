// game-observer-ai-vs-ai.js - AI vs AI UI Controller
// Manages the visual interface and user interactions for AI vs AI gameplay

class AIvsAIObserver {
    constructor() {
        this.gameCore = null;
        this.aiController = null;
        this.diagonalLines = null;
        this.boardSize = 15;
        this.lastMovePosition = null;
        this.gameRunning = false;
        this.autoPlayInterval = null;
        
        // UI state
        this.currentView = 'setup'; // 'setup', 'playing', 'finished'
        this.showAdvancedStats = false;
        this.animationSpeed = 500;
        
        // Game history for replay
        this.gameHistory = [];
        this.replayMode = false;
        this.replayPosition = 0;
        
        this.initializeGame();
        this.setupEventListeners();
    }

    // ========================= INITIALIZATION =========================

    initializeGame() {
        console.log('Initializing AI vs AI Observer...');
        
        // Initialize game core
        this.gameCore = new ConnectionGameCore(this.boardSize);
        
        // Initialize AI controller
        this.aiController = new AIGameController(this.gameCore, {
            debugMode: true,
            moveTimeLimit: 5000,
            turnDelay: 800,
            xStrategy: 'chain',
            oStrategy: 'chain'
        });
        
        // Setup AI controller event handlers
        this.setupAIControllerEvents();
        
        this.createBoard();
        
        // Initialize diagonal lines
        const svgElement = document.getElementById('diagonal-lines-svg');
        if (svgElement && typeof ConnectionGameDiagonalLines !== 'undefined') {
            setTimeout(() => {
                this.diagonalLines = new ConnectionGameDiagonalLines(this.gameCore, svgElement);
                console.log('✅ Diagonal lines initialized for AI vs AI');
            }, 100);
        }
        
        this.updateDisplay();
        this.initializeStrategySelectors();
    }

    setupAIControllerEvents() {
        // Game lifecycle events
        this.aiController.on('gameStart', (data) => {
            this.onGameStart(data);
        });
        
        this.aiController.on('move', (data) => {
            this.onPlayerMove(data);
        });
        
        this.aiController.on('playerChange', (data) => {
            this.onPlayerChange(data);
        });
        
        this.aiController.on('gameEnd', (data) => {
            this.onGameEnd(data);
        });
        
        this.aiController.on('error', (data) => {
            this.onError(data);
        });
        
        this.aiController.on('timeout', (data) => {
            this.onTimeout(data);
        });
        
        this.aiController.on('stateChange', (data) => {
            this.onStateChange(data);
        });
    }

    setupEventListeners() {
        // Strategy selection
        const xStrategySelect = document.getElementById('xStrategy');
        const oStrategySelect = document.getElementById('oStrategy');
        
        if (xStrategySelect) {
            xStrategySelect.addEventListener('change', (e) => {
                this.updatePlayerStrategy('X', e.target.value);
            });
        }
        
        if (oStrategySelect) {
            oStrategySelect.addEventListener('change', (e) => {
                this.updatePlayerStrategy('O', e.target.value);
            });
        }
        
        // Speed control
        const speedSlider = document.getElementById('gameSpeed');
        const speedValue = document.getElementById('speedValue');
        
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.animationSpeed = parseInt(e.target.value);
                this.aiController.updateConfig({ turnDelay: this.animationSpeed });
                if (speedValue) speedValue.textContent = this.animationSpeed + 'ms';
            });
        }
        
        // Advanced stats toggle
        const advancedToggle = document.getElementById('showAdvancedStats');
        if (advancedToggle) {
            advancedToggle.addEventListener('change', (e) => {
                this.showAdvancedStats = e.target.checked;
                this.updateStatsDisplay();
            });
        }
    }

    // ========================= BOARD MANAGEMENT =========================

    createBoard() {
        const boardElement = document.getElementById('gameBoard');
        if (!boardElement) return;
        
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Add cell number
                const cellNumber = document.createElement('div');
                cellNumber.className = 'cell-number';
                cellNumber.textContent = row * this.boardSize + col + 1;
                cell.appendChild(cellNumber);
                
                boardElement.appendChild(cell);
            }
        }
    }

    updateBoard(animate = true) {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellValue = this.gameCore.board[row][col];
            
            // Clear existing classes and move text
            cell.classList.remove('x', 'o', 'last-move', 'thinking');
            
            // Remove existing move text
            const existingMoveText = cell.querySelector('.move-text');
            if (existingMoveText) {
                existingMoveText.remove();
            }
            
            // Set player class and add move number
            if (cellValue === 'X') {
                cell.classList.add('x');
                const moveNumber = this.getMoveNumber(row, col);
                
                const moveText = document.createElement('div');
                moveText.className = 'move-text';
                moveText.textContent = `X${moveNumber}`;
                cell.appendChild(moveText);
                
                // Animation for new moves
                if (animate && this.lastMovePosition && 
                    this.lastMovePosition.row === row && 
                    this.lastMovePosition.col === col) {
                    cell.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        cell.style.transform = 'scale(1)';
                    }, 200);
                }
            } else if (cellValue === 'O') {
                cell.classList.add('o');
                const moveNumber = this.getMoveNumber(row, col);
                
                const moveText = document.createElement('div');
                moveText.className = 'move-text';
                moveText.textContent = `O${moveNumber}`;
                cell.appendChild(moveText);
                
                // Animation for new moves
                if (animate && this.lastMovePosition && 
                    this.lastMovePosition.row === row && 
                    this.lastMovePosition.col === col) {
                    cell.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        cell.style.transform = 'scale(1)';
                    }, 200);
                }
            }
            
            // Highlight last move
            if (this.lastMovePosition && 
                this.lastMovePosition.row === row && 
                this.lastMovePosition.col === col) {
                cell.classList.add('last-move');
            }
        });
        
        // Update diagonal lines
        if (this.diagonalLines) {
            setTimeout(() => {
                this.diagonalLines.updateDiagonalLines();
            }, 50);
        }
    }

    getMoveNumber(row, col) {
        for (let i = 0; i < this.gameCore.gameHistory.length; i++) {
            const move = this.gameCore.gameHistory[i];
            if (move.row === row && move.col === col) {
                return i + 1;
            }
        }
        return '';
    }

    showThinkingIndicator(player) {
        // Visual indicator that AI is thinking
        const indicator = document.getElementById('thinkingIndicator');
        if (indicator) {
            indicator.style.display = 'block';
            indicator.innerHTML = `🤔 ${player} is thinking...`;
            indicator.className = `thinking-indicator ${player.toLowerCase()}`;
        }
    }

    hideThinkingIndicator() {
        const indicator = document.getElementById('thinkingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // ========================= STRATEGY MANAGEMENT =========================

    initializeStrategySelectors() {
        const strategies = this.aiController.getAvailableStrategies();
        
        this.populateStrategySelect('xStrategy', strategies, 'chain');
        this.populateStrategySelect('oStrategy', strategies, 'chain');
    }

    populateStrategySelect(selectId, strategies, defaultValue) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '';
        
        strategies.forEach(strategy => {
            const option = document.createElement('option');
            option.value = strategy.id;
            option.textContent = strategy.name;
            option.title = strategy.description;
            
            if (strategy.id === defaultValue) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
    }

    updatePlayerStrategy(player, strategyId) {
        if (this.gameRunning) {
            this.showMessage(`Cannot change strategy while game is running`, 'warning');
            return;
        }
        
        const success = this.aiController.updatePlayerStrategy(player, strategyId);
        if (success) {
            this.logMessage(`${player} strategy changed to ${strategyId}`);
            this.updateStrategyDisplay(player, strategyId);
        } else {
            this.showMessage(`Failed to change ${player} strategy`, 'error');
        }
    }

    updateStrategyDisplay(player, strategyId) {
        const displayElement = document.getElementById(`${player.toLowerCase()}StrategyDisplay`);
        if (displayElement) {
            const strategies = this.aiController.getAvailableStrategies();
            const strategy = strategies.find(s => s.id === strategyId);
            displayElement.textContent = strategy ? strategy.name : strategyId;
        }
    }

    // ========================= DISPLAY UPDATES =========================

    updateDisplay() {
        this.updateGameInfo();
        this.updatePlayerStats();
        this.updateStatsDisplay();
    }

    updateGameInfo() {
        const gameState = this.aiController.getGameState();
        
        // Current player
        const currentPlayerEl = document.getElementById('currentPlayer');
        if (currentPlayerEl) {
            if (gameState.state === 'running') {
                currentPlayerEl.textContent = gameState.currentPlayer;
                currentPlayerEl.className = `value current-player-${gameState.currentPlayer.toLowerCase()}`;
            } else {
                currentPlayerEl.textContent = gameState.state.charAt(0).toUpperCase() + gameState.state.slice(1);
                currentPlayerEl.className = 'value';
            }
        }
        
        // Move count
        const moveCountEl = document.getElementById('moveCount');
        if (moveCountEl) {
            moveCountEl.textContent = gameState.moveCount;
        }
        
        // Game status
        const gameStatusEl = document.getElementById('gameStatus');
        if (gameStatusEl) {
            let status = 'Ready';
            let statusClass = 'value';
            
            switch (gameState.state) {
                case 'running':
                    status = 'AI vs AI Playing';
                    statusClass = 'value game-running';
                    break;
                case 'paused':
                    status = 'Paused';
                    statusClass = 'value game-paused';
                    break;
                case 'complete':
                    if (gameState.gameResult) {
                        status = `${gameState.gameResult.winner || 'Draw'} Wins!`;
                        statusClass = 'value game-over';
                    }
                    break;
                case 'error':
                    status = 'Error';
                    statusClass = 'value game-error';
                    break;
            }
            
            gameStatusEl.textContent = status;
            gameStatusEl.className = statusClass;
        }
    }

    updatePlayerStats() {
        const gameState = this.aiController.getGameState();
        
        // Update X player stats
        this.updateSinglePlayerStats('X', gameState.players.X);
        
        // Update O player stats
        this.updateSinglePlayerStats('O', gameState.players.O);
    }

    updateSinglePlayerStats(player, playerData) {
        const prefix = player.toLowerCase();
        
        // Strategy name
        const strategyEl = document.getElementById(`${prefix}Strategy`);
        if (strategyEl) {
            strategyEl.textContent = playerData.strategy;
        }
        
        if (playerData.stats) {
            // Chain length
            const chainLengthEl = document.getElementById(`${prefix}ChainLength`);
            if (chainLengthEl) {
                chainLengthEl.textContent = playerData.stats.chainLength || 0;
            }
            
            // Progress
            const progressEl = document.getElementById(`${prefix}Progress`);
            if (progressEl) {
                progressEl.textContent = (playerData.stats.goalProgress || 0).toFixed(1) + '%';
            }
            
            // Phase
            const phaseEl = document.getElementById(`${prefix}Phase`);
            if (phaseEl) {
                phaseEl.textContent = playerData.stats.phase || 'initial';
            }
            
            // Advanced stats (if enabled)
            if (this.showAdvancedStats && playerData.stats.interference) {
                const interferenceEl = document.getElementById(`${prefix}Interference`);
                if (interferenceEl) {
                    interferenceEl.textContent = playerData.stats.interference.interferenceLevel || 0;
                }
            }
        }
    }

    updateStatsDisplay() {
        // Toggle advanced stats visibility
        const advancedElements = document.querySelectorAll('.advanced-stat');
        advancedElements.forEach(el => {
            el.style.display = this.showAdvancedStats ? 'block' : 'none';
        });
        
        if (this.showAdvancedStats) {
            const gameStats = this.aiController.getGameStats();
            
            // Overall game performance
            const efficiencyEl = document.getElementById('gameEfficiency');
            if (efficiencyEl && gameStats.duration) {
                const movesPerSecond = (gameStats.totalMoves / (gameStats.duration / 1000)).toFixed(2);
                efficiencyEl.textContent = `${movesPerSecond} moves/sec`;
            }
            
            // Average think time
            const thinkTimeEl = document.getElementById('averageThinkTime');
            if (thinkTimeEl) {
                thinkTimeEl.textContent = `${gameStats.averageMoveTime.toFixed(0)}ms`;
            }
        }
    }

    // ========================= GAME CONTROL =========================

    async startNewGame() {
        console.log('Starting new AI vs AI game...');
        
        try {
            // Clear previous game state
            this.resetDisplay();
            this.gameHistory = [];
            
            // Initialize and start the game
            const success = await this.aiController.initializeGame(this.boardSize);
            if (success) {
                this.gameRunning = true;
                this.currentView = 'playing';
                this.updateControlButtons();
                
                // Start the game
                await this.aiController.startGame();
            } else {
                this.showMessage('Failed to initialize game', 'error');
            }
        } catch (error) {
            console.error('Error starting game:', error);
            this.showMessage(`Error starting game: ${error.message}`, 'error');
        }
    }

    pauseGame() {
        if (this.aiController.pauseGame()) {
            this.gameRunning = false;
            this.updateControlButtons();
            this.logMessage('Game paused');
        }
    }

    resumeGame() {
        if (this.aiController.resumeGame()) {
            this.gameRunning = true;
            this.updateControlButtons();
            this.logMessage('Game resumed');
        }
    }

    stopGame() {
        if (this.aiController.stopGame('User requested stop')) {
            this.gameRunning = false;
            this.currentView = 'finished';
            this.updateControlButtons();
            this.logMessage('Game stopped');
        }
    }

    resetDisplay() {
        this.lastMovePosition = null;
        this.hideThinkingIndicator();
        
        // Clear diagonal lines
        if (this.diagonalLines) {
            this.diagonalLines.clear();
        }
        
        // Reset board display
        this.updateBoard(false);
        this.updateDisplay();
    }

    updateControlButtons() {
        const startBtn = document.getElementById('startGameBtn');
        const pauseBtn = document.getElementById('pauseGameBtn');
        const resumeBtn = document.getElementById('resumeGameBtn');
        const stopBtn = document.getElementById('stopGameBtn');
        
        if (startBtn) startBtn.disabled = this.gameRunning;
        if (pauseBtn) pauseBtn.disabled = !this.gameRunning;
        if (resumeBtn) resumeBtn.disabled = this.gameRunning;
        if (stopBtn) stopBtn.disabled = !this.gameRunning && this.currentView === 'setup';
        
        // Update strategy selectors
        const xSelect = document.getElementById('xStrategy');
        const oSelect = document.getElementById('oStrategy');
        if (xSelect) xSelect.disabled = this.gameRunning;
        if (oSelect) oSelect.disabled = this.gameRunning;
    }

    // ========================= EVENT HANDLERS =========================

    onGameStart(data) {
        this.logMessage(`🎮 AI vs AI game started!`);
        this.logMessage(`X: ${data.players.X.name}, O: ${data.players.O.name}`);
        this.resetDisplay();
        this.updateDisplay();
    }

    onPlayerMove(data) {
        // Update last move position
        this.lastMovePosition = { 
            row: data.move.row, 
            col: data.move.col,
            player: data.player 
        };
        
        // Show thinking indicator briefly before showing move
        this.showThinkingIndicator(data.player);
        
        setTimeout(() => {
            this.hideThinkingIndicator();
            
            // Update board with animation
            this.updateBoard(true);
            this.updateDisplay();
            
            // Log the move
            const cellNumber = data.move.row * this.boardSize + data.move.col + 1;
            this.logMessage(`${data.player} plays (${data.move.row},${data.move.col}) [cell ${cellNumber}] - ${data.move.reason || 'no reason'}`);
            
            // Add to game history
            this.gameHistory.push({
                player: data.player,
                move: data.move,
                result: data.result,
                gameState: JSON.parse(JSON.stringify(data.gameState))
            });
            
        }, Math.min(this.animationSpeed / 2, 200));
    }

    onPlayerChange(data) {
        this.updateDisplay();
        
        // Show thinking indicator for new player
        setTimeout(() => {
            if (this.gameRunning) {
                this.showThinkingIndicator(data.current);
            }
        }, this.animationSpeed);
    }

    onGameEnd(data) {
        this.gameRunning = false;
        this.currentView = 'finished';
        this.hideThinkingIndicator();
        
        this.updateDisplay();
        this.updateControlButtons();
        
        // Log game result
        this.logMessage(`🎉 Game finished: ${data.result.type}`);
        this.logMessage(`   Result: ${data.result.reason}`);
        if (data.result.winner) {
            this.logMessage(`   Winner: ${data.result.winner}`);
        }
        this.logMessage(`   Duration: ${(data.result.duration / 1000).toFixed(1)}s`);
        this.logMessage(`   Total moves: ${data.result.totalMoves}`);
        
        // Show game analysis
        this.showGameAnalysis(data);
    }

    onError(data) {
        this.showMessage(`AI Error: ${data.message}`, 'error');
        this.logMessage(`❌ ERROR: ${data.message} (Player: ${data.player})`);
    }

    onTimeout(data) {
        this.showMessage(`${data.player} exceeded time limit (${data.timeLimit}ms)`, 'warning');
        this.logMessage(`⏰ TIMEOUT: ${data.player} took too long to move`);
    }

    onStateChange(data) {
        console.log(`Game state: ${data.previous} -> ${data.current}`);
        this.updateDisplay();
    }

    // ========================= GAME ANALYSIS =========================

    showGameAnalysis(data) {
        const analysisElement = document.getElementById('gameAnalysis');
        if (!analysisElement) return;
        
        const analysis = this.aiController.getGameAnalysis();
        
        let analysisHTML = `
            <h3>🏆 Game Analysis</h3>
            <div class="analysis-grid">
                <div class="analysis-item">
                    <strong>Winner:</strong> ${data.result.winner || 'Draw'}
                </div>
                <div class="analysis-item">
                    <strong>Duration:</strong> ${(data.result.duration / 1000).toFixed(1)}s
                </div>
                <div class="analysis-item">
                    <strong>Total Moves:</strong> ${data.result.totalMoves}
                </div>
                <div class="analysis-item">
                    <strong>Average Move Time:</strong> ${analysis.statistics.averageMoveTime.toFixed(0)}ms
                </div>
        `;
        
        if (analysis.performance) {
            analysisHTML += `
                <div class="analysis-item">
                    <strong>Efficiency:</strong> ${(analysis.performance.efficiency * 100).toFixed(1)}%
                </div>
                <div class="analysis-item">
                    <strong>Error Rate:</strong> ${(analysis.performance.errorRate * 100).toFixed(1)}%
                </div>
            `;
        }
        
        analysisHTML += `</div>`;
        
        // Strategy comparison
        if (analysis.strategies.X && analysis.strategies.O) {
            analysisHTML += `
                <h4>Strategy Performance</h4>
                <div class="strategy-comparison">
                    <div class="player-analysis">
                        <h5>X (${analysis.strategies.X.name})</h5>
                        <p>Chain Length: ${analysis.strategies.X.chainLength || 0}</p>
                        <p>Progress: ${(analysis.strategies.X.goalProgress || 0).toFixed(1)}%</p>
                    </div>
                    <div class="player-analysis">
                        <h5>O (${analysis.strategies.O.name})</h5>
                        <p>Chain Length: ${analysis.strategies.O.chainLength || 0}</p>
                        <p>Progress: ${(analysis.strategies.O.goalProgress || 0).toFixed(1)}%</p>
                    </div>
                </div>
            `;
        }
        
        analysisElement.innerHTML = analysisHTML;
        analysisElement.style.display = 'block';
    }

    // ========================= UTILITY METHODS =========================

    showMessage(message, type = 'info') {
        // Create or update message display
        let messageEl = document.getElementById('gameMessage');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'gameMessage';
            messageEl.className = 'game-message';
            document.querySelector('.container').prepend(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.className = `game-message ${type}`;
        messageEl.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }

    logMessage(message) {
        const gameLog = document.getElementById('gameLog');
        if (!gameLog) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        gameLog.appendChild(logEntry);
        
        // Auto-scroll to bottom
        gameLog.scrollTop = gameLog.scrollHeight;
        
        // Keep only last 100 entries
        while (gameLog.children.length > 100) {
            gameLog.removeChild(gameLog.firstChild);
        }
        
        console.log(`[AI vs AI] ${message}`);
    }

    // ========================= PUBLIC API FOR GLOBAL FUNCTIONS =========================

    // These methods will be called by global button handlers
    handleStartGame() {
        this.startNewGame();
    }

    handlePauseGame() {
        this.pauseGame();
    }

    handleResumeGame() {
        this.resumeGame();
    }

    handleStopGame() {
        this.stopGame();
    }

    handleSpeedChange(speed) {
        this.animationSpeed = speed;
        this.aiController.updateConfig({ turnDelay: speed });
    }
}

// Global functions for button handlers
let aivsaiObserver;

function startAIvsAIGame() {
    if (aivsaiObserver) {
        aivsaiObserver.handleStartGame();
    }
}

function pauseAIvsAIGame() {
    if (aivsaiObserver) {
        aivsaiObserver.handlePauseGame();
    }
}

function resumeAIvsAIGame() {
    if (aivsaiObserver) {
        aivsaiObserver.handleResumeGame();
    }
}

function stopAIvsAIGame() {
    if (aivsaiObserver) {
        aivsaiObserver.handleStopGame();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🤖 Initializing AI vs AI Observer...');
    
    // Check if we're in AI vs AI mode
    const gameMode = document.getElementById('gameMode');
    if (gameMode && gameMode.value === 'ai_vs_ai') {
        setTimeout(() => {
            try {
                aivsaiObserver = new AIvsAIObserver();
                console.log('✅ AI vs AI Observer ready!');
            } catch (error) {
                console.error('❌ Failed to initialize AI vs AI Observer:', error);
            }
        }, 1000);
    }
});

// Export for use in other modules
window.AIvsAIObserver = AIvsAIObserver;