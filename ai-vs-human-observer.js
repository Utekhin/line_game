// ai-vs-human-observer.js - UPDATED: Gap Registry Only (Old Gap System Removed)

class AIvsHumanObserver {
    constructor() {
        this.gameCore = null;
        this.controller = null;
        this.diagonalLines = null;
        this.boardSize = 15;
        this.gameRunning = false;
        this.lastGamePhase = null;
        
        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        console.log('🎮 Initializing AI vs Human Observer (Gap Registry Only)...');
        
        this.gameCore = new ConnectionGameCore(this.boardSize);
        this.controller = new AIvsHumanController(this.gameCore);
        
        this.setupControllerEvents();
        this.createBoard();
        this.initializeDiagonalLines();
        this.updateDisplay();
    }

    initializeDiagonalLines() {
    const svgElement = document.getElementById('diagonal-lines-svg');
    if (svgElement && typeof ConnectionGameDiagonalLines !== 'undefined') {
        setTimeout(() => {
            this.diagonalLines = new ConnectionGameDiagonalLines(this.gameCore, svgElement);
            
            // CRITICAL FIX: Connect diagonal lines manager to game core
            this.gameCore.setDiagonalLinesManager(this.diagonalLines);
            
            console.log('✅ Diagonal lines manager connected to game core');
            
            // VERIFY CONNECTION - critical for win detection
            if (this.gameCore.diagonalLinesManager) {
                console.log('✅ Diagonal lines manager connection verified');
            } else {
                console.error('❌ Diagonal lines manager connection FAILED');
            }
            
        }, 100);
    } else {
        console.warn('⚠️ Diagonal lines system not available - win detection will be limited');
        if (!svgElement) {
            console.warn('   - SVG element "diagonal-lines-svg" not found');
        }
        if (typeof ConnectionGameDiagonalLines === 'undefined') {
            console.warn('   - ConnectionGameDiagonalLines class not available');
        }
    }
}


    setupControllerEvents() {
        this.controller.on('gameStart', (data) => this.onGameStart(data));
        this.controller.on('move', (data) => this.onPlayerMove(data));
        this.controller.on('gameEnd', (data) => this.onGameEnd(data));
        this.controller.on('error', (data) => this.onError(data));
        this.controller.on('turnChange', (data) => this.onTurnChange(data));
        this.controller.on('humanMoveNeeded', (data) => this.onHumanMoveNeeded(data));
    }

    setupEventListeners() {
        // Game control buttons
        const startButton = document.getElementById('startButton');
        const pauseButton = document.getElementById('pauseButton');
        const resumeButton = document.getElementById('resumeButton');
        const stopButton = document.getElementById('stopButton');
        
        if (startButton) {
            startButton.addEventListener('click', () => this.handleStartGame());
        }
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.handlePauseGame());
        }
        if (resumeButton) {
            resumeButton.addEventListener('click', () => this.handleResumeGame());
        }
        if (stopButton) {
            stopButton.addEventListener('click', () => this.handleStopGame());
        }

        // Debug button for manual AI moves
        const debugButton = document.getElementById('debugButton');
        if (debugButton) {
            debugButton.addEventListener('click', () => {
                if (this.controller.triggerNextMove()) {
                    this.logMessage('🔧 Manual AI move triggered');
                } else {
                    this.logMessage('⚠️ Cannot trigger move - waiting for human or game not running');
                }
            });
        }
    }

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
                
                // Add hover effect for human turns
                cell.addEventListener('mouseenter', () => this.onCellHover(cell, true));
                cell.addEventListener('mouseleave', () => this.onCellHover(cell, false));
                
                const cellNumber = document.createElement('div');
                cellNumber.className = 'cell-number';
                cellNumber.textContent = row * this.boardSize + col + 1;
                cell.appendChild(cellNumber);
                
                boardElement.appendChild(cell);
            }
        }
    }

    onCellHover(cellElement, isEntering) {
    
    if (!this.controller?.waitingForHuman || this.controller.gameState !== 'running') {
        return;
    }

    const row = parseInt(cellElement.dataset.row);
    const col = parseInt(cellElement.dataset.col);

    if (isEntering) {
        if (this.gameCore.isValidMove(row, col)) {
            cellElement.classList.add('hover-valid');
            cellElement.style.backgroundColor = 'rgba(112, 139, 117, 0.3)';
        } else {
            cellElement.classList.add('hover-invalid');  
            cellElement.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        }
    } else {
        cellElement.classList.remove('hover-valid', 'hover-invalid');
        cellElement.style.backgroundColor = '';
    }
}
    // ===== EVENT HANDLING =====
    
    onPlayerMove(data) {
        this.updateBoard();
        this.updateDisplay();
        
        const cellNumber = data.move.row * this.boardSize + data.move.col + 1;
        const playerType = data.isAI ? '🤖 AI' : '👤 Human';
        let message = `${playerType} ${data.player} plays (${data.move.row},${data.move.col}) [cell ${cellNumber}]`;
        message += `\n └─ ${data.move.reason}`;
        
        if (data.move.pattern && data.move.pattern !== 'human') {
            message += `\n └─ Pattern: ${data.move.pattern}`;
        }
        
        // Show move type for AI moves
        if (data.isAI && data.moveType) {
            message += `\n └─ Move Type: ${data.moveType}`;
        }
        
        // UPDATED: Show win check status for move 29+
        if (this.gameCore.moveCount >= 29) {
            message += `\n └─ Win Check: ENABLED (move ${this.gameCore.moveCount})`;
        } else {
            message += `\n └─ Win Check: DISABLED (move ${this.gameCore.moveCount}/29)`;
        }
        
        this.logMessage(message);
    }

    onGameStart(data) {
        this.logMessage(`🎮 AI vs Human game started (Gap Registry Mode)!`);
        this.logMessage(`🤖 AI: ${data.aiPlayer} (Vertical), 👤 Human: ${data.humanPlayer} (Horizontal)`);
        this.logMessage(`📋 Win check will be disabled until move 29`);
        this.gameRunning = true;
        this.lastGamePhase = null;
        
        this.updateDisplay();
    }

    onGameEnd(data) {
        this.gameRunning = false;
        this.updateDisplay();
        
        let message = `🎉 AI vs Human game finished!\n`;
        message += `Result: ${data.result.reason}\n`;
        if (data.result.winner) {
            const winnerType = data.result.winner === data.result.aiPlayer ? '🤖 AI' : '👤 Human';
            message += `Winner: ${winnerType} ${data.result.winner}\n`;
        }
        message += `Total moves: ${data.result.totalMoves}`;
        
        // Show final AI statistics with gap registry info
        if (data.result.chainLength) {
            message += `\n\n📊 Final AI Statistics:`;
            message += `\n └─ Chain length: ${data.result.chainLength}`;
            message += `\n └─ Final move type: ${data.result.finalMoveType || 'unknown'}`;
        }
        
        this.logMessage(message);
    }

    onError(data) {
        const errorType = data.isAI ? '🤖 AI' : data.isHuman ? '👤 Human' : '⚠️';
        this.logMessage(`❌ ${errorType} ERROR: ${data.message}`);
    }

    onTurnChange(data) {
        this.updateDisplay();
        const playerType = data.newPlayer === this.controller.aiPlayer ? '🤖 AI' : '👤 Human';
        console.log(`🔄 Turn changed to ${playerType} ${data.newPlayer}`);
    }

    onHumanMoveNeeded(data) {
        this.updateDisplay();
        console.log(`👤 Human move needed: ${data.message}`);
        
        // Show visual indicator
        const humanMessage = document.getElementById('humanMessage');
        if (humanMessage) {
            humanMessage.textContent = data.message;
            humanMessage.style.display = 'block';
            humanMessage.className = 'human-message visible';
        }
    }

    onPhaseChange(oldPhase, newPhase) {
        if (newPhase === 'gap-filling') {
            this.logMessage('🔧 === AI ENTERING GAP FILLING PHASE ===');
        } else if (newPhase === 'emergency-response') {
            this.logMessage('⚡ === AI EMERGENCY RESPONSE ===');
        } else if (newPhase === 'chain-extension') {
            this.logMessage('🔗 === AI CHAIN EXTENSION ===');
        }
    }

    // ===== BOARD AND DISPLAY UPDATES =====
    
    updateBoard() {
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellValue = this.gameCore.board[row][col];
            
            // Clear previous classes (but keep hover classes)
            cell.classList.remove('x', 'o', 'last-move', 'head-indicator');
            
            // Remove old indicators
            const existingMoveText = cell.querySelector('.move-text');
            if (existingMoveText) existingMoveText.remove();
            
            const existingPriority = cell.querySelector('.gap-priority');
            if (existingPriority) existingPriority.remove();
            
            // Add current player's mark
            if (cellValue === 'X' || cellValue === 'O') {
                cell.classList.add(cellValue.toLowerCase());
                
                const moveText = document.createElement('div');
                moveText.className = 'move-text';
                moveText.textContent = `${cellValue}${this.getPlayerMoveNumber(row, col, cellValue)}`;
                cell.appendChild(moveText);

                // Highlight last move
                if (this.gameCore.lastMove && 
                    this.gameCore.lastMove.row === row && 
                    this.gameCore.lastMove.col === col) {
                    cell.classList.add('last-move');
                }
            }

            // Update cursor style based on game state
            const gameState = this.controller.getGameState();
            if (gameState.waitingForHuman && gameState.state === 'running' && cellValue === '') {
                cell.style.cursor = 'pointer';
            } else {
                cell.style.cursor = 'default';
            }
        });
        
        // Update diagonal lines
        if (this.diagonalLines) {
            setTimeout(() => this.diagonalLines.updateDiagonalLines(), 50);
        }

        // Highlight chain heads
        this.highlightChainHeads();
    }

    // Highlight current chain heads
    highlightChainHeads() {
        const gameState = this.controller.getGameState();
        
        if (gameState.state === 'running' && this.controller.ai && this.controller.ai.chainHeadManager) {
            const heads = this.controller.ai.chainHeadManager.getHeads();
            
            // Highlight near border head
            if (heads.nearBorder) {
                const cell = document.querySelector(`[data-row="${heads.nearBorder.row}"][data-col="${heads.nearBorder.col}"]`);
                if (cell) {
                    cell.classList.add('head-near-border');
                }
            }
            
            // Highlight far border head
            if (heads.farBorder) {
                const cell = document.querySelector(`[data-row="${heads.farBorder.row}"][data-col="${heads.farBorder.col}"]`);
                if (cell) {
                    cell.classList.add('head-far-border');
                }
            }
        }
    }

    getPlayerMoveNumber(row, col, cellValue) {
        if (!this.gameCore.gameHistory) return '';
        
        let count = 0;
        for (const move of this.gameCore.gameHistory) {
            if (move.player === cellValue) {
                count++;
                if (move.row === row && move.col === col) {
                    return count;
                }
            }
        }
        return '';
    }

    // ===== DISPLAY UPDATES =====
    
    updateDisplay() {
        const gameState = this.controller.getGameState();
        this.updateCurrentPlayerDisplay(gameState);
        this.updateMoveCountDisplay(gameState);
        this.updateGameStatusDisplay(gameState);
        this.updateChainProgressDisplay(gameState);
        this.updateTurnIndicator(gameState);
        
        if (this.lastGamePhase !== gameState.currentPhase) {
            this.onPhaseChange(this.lastGamePhase, gameState.currentPhase);
            this.lastGamePhase = gameState.currentPhase;
        }
    }

    updateCurrentPlayerDisplay(gameState) {
        const currentPlayerEl = document.getElementById('currentPlayer');
        if (!currentPlayerEl) return;
        
        const playerType = gameState.currentPlayer === gameState.aiPlayer ? 'AI' : 'Human';
        currentPlayerEl.textContent = `${gameState.currentPlayer} (${playerType})`;
        currentPlayerEl.className = `value current-player-${gameState.currentPlayer.toLowerCase()}`;
    }

    updateMoveCountDisplay(gameState) {
        const moveCountEl = document.getElementById('moveCount');
        if (moveCountEl) {
            const aiMoves = this.controller.getPlayerMoveCount(gameState.aiPlayer);
            const humanMoves = this.controller.getPlayerMoveCount(gameState.humanPlayer);
            
            // UPDATED: Show win check status
            const winCheckStatus = gameState.moveCount >= 29 ? '✅' : '🚫';
            moveCountEl.textContent = `${gameState.moveCount} (AI:${aiMoves}, Human:${humanMoves}) ${winCheckStatus}`;
        }
    }

    updateGameStatusDisplay(gameState) {
        const gameStatusEl = document.getElementById('gameStatus');
        if (!gameStatusEl) return;
        
        let status = 'Ready';
        let statusClass = 'value';
        
        switch (gameState.state) {
            case 'running': 
                if (gameState.waitingForHuman) {
                    status = `Waiting for Human (${gameState.humanPlayer})`;
                    statusClass = 'value game-waiting-human';
                } else {
                    const phaseText = this.getPhaseDisplayText(gameState.currentPhase);
                    status = `AI Turn - ${phaseText}`;
                    statusClass = 'value game-ai-turn';
                }
                break;
            case 'paused': 
                status = 'Game Paused';
                statusClass = 'value game-paused';
                break;
            case 'complete': 
                status = 'Game Complete';
                statusClass = 'value game-over';
                break;
        }
        
        gameStatusEl.textContent = status;
        gameStatusEl.className = statusClass;
    }

    // UPDATED: Chain progress display with gap registry info
    updateChainProgressDisplay(gameState) {
        const progressEl = document.getElementById('gameProgress');
        if (!progressEl) return;
        
        if (gameState.state === 'running' && gameState.chainLength > 0) {
            const phaseText = this.getPhaseDisplayText(gameState.currentPhase);
            let progressText = `AI Chain: ${gameState.chainLength} pieces - ${phaseText}`;
            
            // Add head information if available
            if (gameState.chainHeads && gameState.chainHeads.totalPieces > 0) {
                const headInfo = `${gameState.chainHeads.totalPieces} heads`;
                progressText += ` (${headInfo})`;
            }
            
            // UPDATED: Add gap registry info
            if (gameState.gapStats) {
                const gapInfo = `${gameState.gapStats.activeGaps || 0} gaps`;
                progressText += ` [${gapInfo}]`;
            }
            
            // Add win check status
            const winCheckText = gameState.moveCount >= 29 ? 'Win Check ON' : `Win Check OFF (${29 - gameState.moveCount} moves left)`;
            progressText += ` - ${winCheckText}`;
            
            progressEl.textContent = progressText;
        } else {
            progressEl.textContent = 'AI vs Human (Gap Registry) - Click Start to Begin';
        }
    }

    getPhaseDisplayText(phase) {
        switch (phase) {
            case 'gap-filling': return 'Gap Filling';
            case 'emergency-response': return 'Emergency Response';
            case 'chain-extension': return 'Chain Extension';
            case 'initialization': return 'Starting';
            default: return 'Thinking';
        }
    }

    updateTurnIndicator(gameState) {
        const turnIndicatorEl = document.getElementById('turnIndicator');
        if (!turnIndicatorEl) return;

        if (gameState.state === 'running') {
            if (gameState.waitingForHuman) {
                turnIndicatorEl.textContent = `Your Turn! Click an empty cell to place ${gameState.humanPlayer}`;
                turnIndicatorEl.className = 'turn-indicator human-turn';
            } else {
                const phaseText = this.getPhaseDisplayText(gameState.currentPhase);
                const winStatus = gameState.moveCount >= 29 ? '(Win Check ON)' : '(Win Check OFF)';
                turnIndicatorEl.textContent = `AI (${gameState.aiPlayer}) - ${phaseText} ${winStatus}`;
                turnIndicatorEl.className = 'turn-indicator ai-turn';
            }
        } else {
            turnIndicatorEl.textContent = '';
            turnIndicatorEl.className = 'turn-indicator';
        }
    }

    // ===== CONTROL METHODS =====
    
    handleStartGame() {
        this.gameCore.resetGame(this.boardSize);
        if (this.diagonalLines) this.diagonalLines.clear();
        
        // Clear any human messages
        const humanMessage = document.getElementById('humanMessage');
        if (humanMessage) {
            humanMessage.style.display = 'none';
        }
        
        this.updateBoard();
        this.controller.startGame();
    }

    handlePauseGame() {
        this.controller.pauseGame();
        this.gameRunning = false;
        this.updateDisplay();
    }

    handleResumeGame() {
        this.controller.resumeGame();
        this.gameRunning = true;
        this.updateDisplay();
    }

    handleStopGame() {
        this.controller.stopGame();
        this.gameRunning = false;
        this.updateDisplay();
    }

    // ===== UTILITY METHODS =====

    logMessage(message) {
        const gameLog = document.getElementById('gameLog');
        if (!gameLog) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = message.replace(/\n/g, '<br>');
        
        gameLog.appendChild(logEntry);
        gameLog.scrollTop = gameLog.scrollHeight;
        
        // Keep only last 100 entries
        while (gameLog.children.length > 100) {
            gameLog.removeChild(gameLog.firstChild);
        }
    }

    // UPDATED: Debug methods with gap registry info
    debugLogState() {
        this.controller.logGameState();
        
        // Additional chain head debugging
        if (this.controller.ai && this.controller.ai.chainHeadManager) {
            this.controller.ai.chainHeadManager.analyzeChainStructure();
        }
        
        // UPDATED: Additional gap registry debugging
        if (this.controller.ai && this.controller.ai.gapRegistry) {
            this.controller.ai.gapRegistry.debugGapDetection();
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AIvsHumanObserver = AIvsHumanObserver;
}

console.log('✅ AI vs Human Observer with Gap Registry Only loaded');