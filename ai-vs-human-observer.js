class AIvsHumanObserver {
    constructor() {
        this.gameCore = null;
        this.controller = null;
        this.diagonalLines = null;
        this.boardSize = 15;
        this.gameRunning = false;
        
        console.log('🎮 AI vs Human Observer starting...');
        
        // WAIT for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeGame()
                    .then(() => console.log('✅ Observer fully initialized'))
                    .catch((error) => {
                        console.error('❌ Observer initialization failed:', error);
                        throw error;
                    });
            });
        } else {
            // DOM already loaded
            this.initializeGame()
                .then(() => console.log('✅ Observer fully initialized'))
                .catch((error) => {
                    console.error('❌ Observer initialization failed:', error);
                    throw error;
                });
        }
        
        this.setupEventListeners();
    }

    async initializeGame() {
        console.log('🎮 Initializing AI vs Human Observer...\n');
        
        // 1. Create game core
        this.gameCore = new ConnectionGameCore(this.boardSize);
        console.log('✅ Game Core created');
        
        // 2. Initialize diagonal lines FIRST
        await this.initializeDiagonalLines();
        
        // 3. Create controller
        this.controller = new AIvsHumanController(this.gameCore);
        console.log('✅ Controller created');
        
        // 4. Initialize complete system using GameSystemInitializer
        this.controller.initializeCompleteSystem();
        
        // 5. Inject diagonal lines manager
        if (this.diagonalLines) {
            this.controller.injectDiagonalLinesManager(this.diagonalLines);
        }
        
        // 6. Setup event handlers
        this.setupControllerEventHandlers();
        this.setupLogHandler();
        
        // 7. Create board UI - FIXED with correct element IDs
        this.createBoard();
        
        console.log('\n✅ Game initialization complete');
    }

    async initializeDiagonalLines() {
        console.log('🔧 Initializing diagonal lines...');
        
        if (typeof ConnectionGameDiagonalLines === 'undefined') {
            console.warn('⚠️ Diagonal lines not available');
            return;
        }

        const svgElement = document.getElementById('diagonal-lines-svg');
        if (!svgElement) {
            console.warn('⚠️ SVG element not found');
            return;
        }

        this.diagonalLines = new ConnectionGameDiagonalLines(this.gameCore, svgElement);
        console.log('✅ Diagonal lines initialized');
    }

    setupControllerEventHandlers() {
        if (!this.controller) {
            throw new Error('Controller not available for event handlers');
        }
        
        this.controller.on('gameStart', (data) => this.onGameStart(data));
        this.controller.on('move', (data) => this.onPlayerMove(data));
        this.controller.on('gameEnd', (data) => this.onGameEnd(data));
        this.controller.on('error', (data) => this.onError(data));
        this.controller.on('turnChange', (data) => this.onTurnChange(data));
        
        console.log('✅ Controller event handlers connected');
    }

    setupLogHandler() {
    console.log('🔧 Setting up log handler...');
    
    // Check if logToGameLog exists
    console.log('window.logToGameLog exists:', typeof window.logToGameLog);
    console.log('window.gameLogHandler exists:', typeof window.gameLogHandler);
    
    if (typeof window.logToGameLog !== 'function') {
        console.error('❌ window.logToGameLog function not found!');
        console.error('Available window properties:', Object.keys(window).filter(k => k.includes('log') || k.includes('Log')));
        return;
    }
    
    // Test the log function
    try {
        window.logToGameLog('🎮 Game System Ready');
        console.log('✅ Game log test successful');
    } catch (error) {
        console.error('❌ Error testing game log:', error);
    }
    
    // Connect to AI
    if (this.controller && this.controller.ai) {
        if (typeof this.controller.ai.setGameLogHandler === 'function') {
            this.controller.ai.setGameLogHandler(window.logToGameLog);
            console.log('✅ Game log handler connected to AI');
        } else {
            console.error('❌ AI.setGameLogHandler method not found');
        }
    } else {
        console.warn('⚠️ Controller or AI not ready for log handler connection');
    }
}

    // ===== BOARD UI - FIXED =====
    
    createBoard() {
        console.log('🎨 Creating board UI...');
        
        // FIXED: Use correct ID from HTML (camelCase, not kebab-case)
        const boardGrid = document.getElementById('board-grid');
        
        if (!boardGrid) {
            console.error('❌ Board grid element not found! Expected id="board-grid"');
            console.error('Available elements:', {
                'boardContainer': !!document.getElementById('boardContainer'),
                'board-container': !!document.getElementById('board-container'),
                'board-grid': !!document.getElementById('board-grid')
            });
            return;
        }
        
        // Clear any existing cells
        boardGrid.innerHTML = '';
        
        // Create cells
        let cellCount = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Add click handler
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                
                boardGrid.appendChild(cell);
                cellCount++;
            }
        }
        
        console.log(`✅ Board UI created with ${cellCount} cells (${this.boardSize}x${this.boardSize})`);
        
        // Verify cells were created
        const createdCells = boardGrid.querySelectorAll('.cell');
        if (createdCells.length === 0) {
            console.error('❌ No cells were created!');
        } else {
            console.log(`✅ Verified: ${createdCells.length} cells in DOM`);
        }
    }

    handleCellClick(row, col) {
        if (!this.gameRunning) {
            console.log('⏸️ Game not running, click ignored');
            return;
        }
        
        const currentState = this.controller.getGameState();
        if (currentState.currentPlayer === this.controller.humanPlayer) {
            this.controller.handleHumanMove(row, col);
        } else {
            console.log('⏳ Not human player turn');
        }
    }

getPlayerMoveCount(player) {
    if (!this.controller || !this.controller.gameCore) return 0;
    
    const history = this.controller.gameCore.gameHistory || [];
    return history.filter(move => move.player === player).length;
}

    // ===== EVENT HANDLERS =====
    
    onGameStart(data) {
        console.log('🎮 Game started:', data);
        this.gameRunning = true;
        this.updateUI();
    }

    
onPlayerMove(data) {
    console.log(`📍 Move: ${data.player} at (${data.row}, ${data.col})`);
    
    // Update cell with proper formatting
    this.updateCell(data.row, data.col, data.player);
    
    // Update UI status
    this.updateUI();
    
    // Update diagonal lines
    if (this.diagonalLines) {
        this.diagonalLines.updateDiagonalLines();
    }
    
    // ✅ Update gap registry (the missing piece!)
    if (this.controller?.components?.gapRegistry) {
        this.controller.components.gapRegistry.updateRegistry();
    }
}

    onGameEnd(data) {
        console.log('🏆 Game ended:', data);
        this.gameRunning = false;
        this.showWinner(data.winner);
    }

    onTurnChange(data) {
        console.log('🔄 Turn change:', data.currentPlayer);
        this.updateUI();
    }

    onError(data) {
        console.error('❌ Error:', data.error);
        alert(`Game Error: ${data.error}`);
    }

    // ===== UI UPDATES =====
    
    updateCell(row, col, player) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!cell) {
        console.warn(`⚠️ Cell not found: (${row}, ${col})`);
        return;
    }
    
    // Get move number from game core
    const gameState = this.controller.getGameState();
    const moveNumber = gameState.moveCount || this.controller.gameCore.gameHistory.length;
    
    // CRITICAL: Calculate player-specific move number (X and O have separate counts)
    const playerMoves = this.controller.gameCore.gameHistory.filter(m => m.player === player);
    const playerMoveNumber = playerMoves.length;
    
    // Format display: X1, X2, O1, O2, etc.
    cell.textContent = `${player}${playerMoveNumber}`;
    cell.classList.add('occupied', `player-${player}`);
    
    // Add CSS class for coloring
    if (player === 'X') {
        cell.style.color = '#2196F3'; // Blue for X
        cell.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
    } else {
        cell.style.color = '#4CAF50'; // Green for O
        cell.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
    }
    
    cell.style.fontWeight = 'bold';
    cell.style.fontSize = '1.2em';
    
    console.log(`✅ Cell updated: (${row}, ${col}) → ${player}${playerMoveNumber}`);
}


    updateUI() {
    if (!this.controller) return;
    
    const state = this.controller.getGameState();
    
    // Update current player indicator
    const playerElement = document.getElementById('currentPlayer');
    if (playerElement) {
        playerElement.textContent = state.currentPlayer;
        playerElement.parentElement.className = 
            `status-item current-player-${state.currentPlayer.toLowerCase()}`;
    }
    
    // Update move number
    const moveElement = document.getElementById('moveNumber');
    if (moveElement) {
        moveElement.textContent = state.moveCount || 0;
    }
    
    // Update status
    const statusElement = document.getElementById('gameStatus');
    if (statusElement) {
        if (state.gameOver) {
            statusElement.textContent = 'Game Over';
        } else {
            statusElement.textContent = 'In Progress';
        }
    }
}

    showWinner(winner) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = `${winner} Wins!`;
        }
        
        alert(`Game Over! ${winner} wins!`);
    }

    // ===== EVENT LISTENERS FOR BUTTONS =====
    
    setupEventListeners() {
        // Wait for DOM to be ready
        const setupButtons = () => {
            const mainButton = document.getElementById('mainButton');
            if (mainButton) {
                mainButton.addEventListener('click', () => this.handleMainButtonClick());
            }
            
            const resetButton = document.getElementById('resetLayoutButton');
            if (resetButton) {
                resetButton.addEventListener('click', () => this.handleResetLayout());
            }
            
            const debugButton = document.getElementById('debugButton');
            if (debugButton) {
                debugButton.addEventListener('click', () => this.handleDebugClick());
            }
            
            const checkStabilityButton = document.getElementById('checkStabilityButton');
            if (checkStabilityButton) {
                checkStabilityButton.addEventListener('click', () => this.handleCheckStability());
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupButtons);
        } else {
            setupButtons();
        }
    }

    handleMainButtonClick() {
        if (!this.controller) {
            console.error('❌ Controller not initialized');
            return;
        }
        
        if (!this.gameRunning) {
            this.controller.startGame();
        } else {
            this.controller.pauseGame();
        }
    }

    handleResetLayout() {
        if (this.controller && this.controller.resetGame) {
            this.controller.resetGame();
            this.createBoard(); // Recreate board
        }
    }

    handleDebugClick() {
        if (this.controller) {
            console.log('🔍 Debug State:', this.controller.getGameState());
            if (this.controller.ai) {
                console.log('🤖 AI Status:', this.controller.ai.getSystemStatus());
            }
        }
    }

    handleCheckStability() {
        console.log('🔍 Checking system stability...');
        console.log('Controller:', !!this.controller);
        console.log('AI:', !!this.controller?.ai);
        console.log('Game Core:', !!this.gameCore);
        console.log('Diagonal Lines:', !!this.diagonalLines);
        
        const cells = document.querySelectorAll('.cell');
        console.log(`Board cells: ${cells.length} (expected: ${this.boardSize * this.boardSize})`);
    }
}

// ===== INITIALIZATION =====

// Create observer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, creating observer...');
        window.aivsHumanObserver = new AIvsHumanObserver();
    });
} else {
    console.log('📄 DOM already loaded, creating observer...');
    window.aivsHumanObserver = new AIvsHumanObserver();
}

console.log('✅ AI vs Human Observer script loaded');