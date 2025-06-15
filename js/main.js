// main.js - ENHANCED VERSION: Main Controller with Neural Network Training Features
class ConnectionGameManager {
    constructor() {
        // Game modules
        this.gameCore = null;
        this.diagonalLines = null;
        this.aiPlayer = null;
        this.multiplayerManager = null;
        this.exportManager = null;
        
        // UI elements
        this.boardElement = null;
        this.statusElement = null;
        this.currentPlayerElement = null;
        
        // Game settings
        this.boardSize = 15;
        this.gameMode = 'local';
        this.aiDifficulty = 'medium';
        this.isGameActive = false;
        this.aiThinking = false;
        
        // ENHANCED: Training features
        this.trainingMode = false;
        this.collectingData = false;
        this.autoRecordGames = false;
        this.bulkDataCollection = false;
        this.targetGames = 0;
        this.collectedGames = 0;
        
        // Export settings
        this.autoExportGames = false;
        this.recordOnlineGames = true;
        
        // Performance tracking
        this.gameStartTime = null;
        this.moveStartTime = null;
        
        this.initializeUI();
        this.initializeGame();
        this.initializeTrainingShortcuts();
    }

    // ========================= INITIALIZATION =========================

    initializeUI() {
        console.log('Initializing UI...');
        
        // Get UI elements
        this.boardElement = document.getElementById('board');
        this.statusElement = document.getElementById('status');
        this.currentPlayerElement = document.getElementById('currentPlayer');
        
        if (!this.boardElement) {
            console.error('Board element not found!');
            return;
        }
        
        console.log('UI elements initialized');
    }

    initializeGame() {
        console.log('Initializing enhanced game with training features...');
        
        // Check if required classes are available
        if (typeof ConnectionGameCore === 'undefined') {
            console.error('ConnectionGameCore not found! Make sure game-core.js is loaded');
            return;
        }
        
        // Initialize game core FIRST
        this.gameCore = new ConnectionGameCore(this.boardSize);
        console.log('✅ Game core initialized');
        
        // CRITICAL: Initialize the board immediately
        this.gameCore.initializeBoard();
        console.log('✅ Game board initialized');
        
        // Initialize diagonal lines module AFTER game core is ready
        console.log('Initializing diagonal lines...');
        const svgElement = document.getElementById('diagonal-lines-svg');
        if (svgElement && this.gameCore) {
            if (typeof ConnectionGameDiagonalLines !== 'undefined') {
                this.diagonalLines = new ConnectionGameDiagonalLines(this.gameCore, svgElement);
                console.log('✅ Diagonal lines initialized');
            } else {
                console.warn('❌ ConnectionGameDiagonalLines not available - make sure game-diagonal-lines.js is loaded');
            }
        } else {
            console.warn('❌ Could not initialize diagonal lines - missing SVG element or gameCore');
        }
        
        // Initialize ENHANCED export manager
        if (typeof GameExportManager !== 'undefined') {
            this.exportManager = new GameExportManager(this.gameCore);
            console.log('✅ Enhanced export manager initialized');
        } else {
            console.warn('❌ GameExportManager not available - export functionality disabled');
            this.exportManager = null;
        }
        
        this.printInitializationStatus();
        console.log('Enhanced game initialization complete');
    }

    initializeTrainingShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+T: Toggle training mode
            if (event.ctrlKey && event.key === 't') {
                event.preventDefault();
                this.toggleTrainingMode();
            }
            
            // Ctrl+G: Generate AI games
            if (event.ctrlKey && event.key === 'g') {
                event.preventDefault();
                this.collectTrainingData(20, 'ai_vs_ai');
            }
            
            // Ctrl+E: Export all data
            if (event.ctrlKey && event.key === 'e') {
                event.preventDefault();
                if (this.exportManager) {
                    this.exportManager.exportAllGames();
                }
            }
            
            // Ctrl+R: Start/stop recording
            if (event.ctrlKey && event.key === 'r') {
                event.preventDefault();
                this.toggleRecording();
            }
        });
        
        console.log('🎮 Training keyboard shortcuts initialized');
        console.log('   Ctrl+T: Toggle training mode');
        console.log('   Ctrl+G: Generate AI games');  
        console.log('   Ctrl+E: Export all games');
        console.log('   Ctrl+R: Toggle recording');
    }

    printInitializationStatus() {
        console.log('\n🎮 ================================');
        console.log('📋 ENHANCED CONNECTION GAME STATUS');
        console.log('🎮 ================================');
        console.log(`🎯 Game Core: ${this.gameCore ? 'Available' : 'Not available'}`);
        console.log(`📊 Enhanced Export Manager: ${this.exportManager ? 'Available' : 'Not available'}`);
        console.log(`🧠 AI Player: ${this.aiPlayer ? 'Available' : 'Not available'}`);
        console.log(`🔗 Diagonal Lines: ${this.diagonalLines ? 'Available' : 'Not available'}`);
        console.log(`🌐 Multiplayer: ${this.multiplayerManager ? 'Available' : 'Not available'}`);
        console.log(`🎓 Training Mode: ${this.trainingMode ? 'Active' : 'Inactive'}`);
        console.log('🎮 ================================\n');
    }

    // ========================= ENHANCED TRAINING FEATURES =========================

    activateTrainingMode() {
        console.log('🎓 Activating enhanced training mode...');
        
        this.trainingMode = true;
        this.autoRecordGames = true;
        
        // Activate enhanced export manager
        if (this.exportManager) {
            this.exportManager.activateTrainingMode();
        }
        
        // Enhanced move logging
        this.gameCore.originalMakeMove = this.gameCore.makeMove;
        this.gameCore.makeMove = (row, col, player) => {
            const moveStartTime = Date.now();
            
            // Capture board state before move
            const boardStateBefore = this.gameCore.getGameState().board;
            
            const result = this.gameCore.originalMakeMove(row, col, player);
            const moveEndTime = Date.now();
            
            if (result.success && this.exportManager) {
                this.exportManager.recordMove({
                    row, col, player,
                    moveNumber: this.gameCore.moveCount,
                    timeSpent: moveEndTime - moveStartTime,
                    boardStateBefore: boardStateBefore,
                    gamePhase: this.getGamePhase(),
                    moveType: 'normal'
                });
            }
            
            return result;
        };
        
        this.updateStatus('🎓 Training mode active - enhanced data collection enabled');
        this.updateTrainingUI();
        
        console.log('✅ Training mode activated');
        console.log('   - Auto-recording enabled');
        console.log('   - Enhanced move analysis enabled');
        console.log('   - Board feature collection enabled');
    }

    deactivateTrainingMode() {
        console.log('🎓 Deactivating training mode...');
        
        this.trainingMode = false;
        this.autoRecordGames = false;
        this.bulkDataCollection = false;
        
        // Deactivate enhanced export manager
        if (this.exportManager) {
            this.exportManager.deactivateTrainingMode();
        }
        
        // Restore original move function
        if (this.gameCore.originalMakeMove) {
            this.gameCore.makeMove = this.gameCore.originalMakeMove;
            delete this.gameCore.originalMakeMove;
        }
        
        this.updateStatus('Training mode deactivated');
        this.updateTrainingUI();
        
        console.log('✅ Training mode deactivated');
    }

    toggleTrainingMode() {
        if (this.trainingMode) {
            this.deactivateTrainingMode();
        } else {
            this.activateTrainingMode();
        }
    }

    // ENHANCED: Bulk data collection with multiple strategies
    async collectTrainingData(numGames = 50, mode = 'human_vs_ai') {
        console.log(`📊 Starting enhanced bulk data collection: ${numGames} games (${mode})`);
        
        this.bulkDataCollection = true;
        this.targetGames = numGames;
        this.collectedGames = 0;
        
        // Activate training mode if not already active
        if (!this.trainingMode) {
            this.activateTrainingMode();
        }
        
        this.updateCollectionStatus(`Starting collection: ${numGames} games (${mode})`);
        
        try {
            switch (mode) {
                case 'human_vs_ai':
                    await this.setupHumanVsAICollection(numGames);
                    break;
                    
                case 'ai_vs_ai':
                    await this.collectAIvAIGames(numGames);
                    break;
                    
                case 'random_games':
                    await this.collectRandomGames(numGames);
                    break;
                    
                case 'self_play':
                    await this.collectSelfPlayGames(numGames);
                    break;
                    
                default:
                    console.error(`Unknown collection mode: ${mode}`);
                    return;
            }
        } catch (error) {
            console.error('Error during data collection:', error);
            this.updateCollectionStatus(`Collection failed: ${error.message}`);
        } finally {
            this.bulkDataCollection = false;
            this.updateTrainingUI();
        }
    }

    async setupHumanVsAICollection(numGames) {
        this.updateCollectionStatus(`Please play ${numGames} games against the AI. Progress will be tracked automatically.`);
        
        // Set up game monitoring for human vs AI
        this.monitorHumanVsAIProgress(numGames);
    }

    monitorHumanVsAIProgress(targetGames) {
        const originalHandleGameEnd = this.handleGameEnd.bind(this);
        
        this.handleGameEnd = (winner, winType, winPath) => {
            originalHandleGameEnd(winner, winType, winPath);
            
            if (this.bulkDataCollection) {
                this.collectedGames++;
                this.updateCollectionStatus(`Human vs AI: ${this.collectedGames}/${targetGames} games collected`);
                
                if (this.collectedGames >= targetGames) {
                    this.completeDataCollection();
                    this.handleGameEnd = originalHandleGameEnd; // Restore original
                }
            }
        };
    }

    async collectAIvAIGames(numGames) {
        if (!this.aiPlayer) {
            // Initialize AI if not available
            this.initializeAI();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for AI initialization
        }
        
        if (!this.aiPlayer) {
            throw new Error('AI player not available for AI vs AI collection');
        }
        
        for (let i = 0; i < numGames; i++) {
            console.log(`🤖 AI vs AI game ${i + 1}/${numGames}`);
            this.updateCollectionStatus(`AI vs AI: ${i + 1}/${numGames} games`);
            
            this.newGame();
            await this.playAIvAIGame();
            
            this.collectedGames = i + 1;
            
            // Brief pause between games
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Allow UI updates
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        this.completeDataCollection();
    }

    async playAIvAIGame() {
        return new Promise((resolve) => {
            const playMove = () => {
                if (this.gameCore.gameOver) {
                    resolve();
                    return;
                }
                
                // Alternate AI difficulties for variety
                const difficulties = ['easy', 'medium', 'hard'];
                const difficultyIndex = this.gameCore.moveCount % 3;
                const difficulty = difficulties[difficultyIndex];
                
                try {
                    const move = this.aiPlayer.getBestMove(difficulty);
                    
                    if (move && this.makeMove(move.row, move.col)) {
                        // Continue with next move after short delay
                        setTimeout(playMove, 25);
                    } else {
                        console.warn('AI failed to make move, ending game');
                        resolve();
                    }
                } catch (error) {
                    console.error('Error in AI vs AI game:', error);
                    resolve();
                }
            };
            
            playMove();
        });
    }

    async collectRandomGames(numGames) {
        for (let i = 0; i < numGames; i++) {
            console.log(`🎲 Random game ${i + 1}/${numGames}`);
            this.updateCollectionStatus(`Random games: ${i + 1}/${numGames}`);
            
            this.newGame();
            await this.playRandomGame();
            
            this.collectedGames = i + 1;
            
            // Brief pause between games
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        this.completeDataCollection();
    }

    async playRandomGame() {
        return new Promise((resolve) => {
            const playMove = () => {
                if (this.gameCore.gameOver) {
                    resolve();
                    return;
                }
                
                // Make random move
                const emptyPositions = this.gameCore.getEmptyPositions();
                if (emptyPositions.length === 0) {
                    resolve();
                    return;
                }
                
                const randomIndex = Math.floor(Math.random() * emptyPositions.length);
                const randomPos = emptyPositions[randomIndex];
                
                if (this.makeMove(randomPos.row, randomPos.col)) {
                    // Continue with next move after short delay
                    setTimeout(playMove, 25);
                } else {
                    resolve();
                }
            };
            
            playMove();
        });
    }

    async collectSelfPlayGames(numGames) {
        if (!this.aiPlayer) {
            this.initializeAI();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!this.aiPlayer || !this.aiPlayer.startSelfPlayTraining) {
            throw new Error('Self-play training not available in current AI');
        }
        
        this.updateCollectionStatus(`Starting self-play training: ${numGames} games`);
        
        try {
            const results = await this.aiPlayer.startSelfPlayTraining(numGames);
            this.collectedGames = numGames;
            
            console.log('🎉 Self-play collection completed:', results);
            this.completeDataCollection();
        } catch (error) {
            throw new Error(`Self-play collection failed: ${error.message}`);
        }
    }

    completeDataCollection() {
        console.log(`🎉 Data collection completed: ${this.collectedGames} games`);
        
        this.updateCollectionStatus(`✅ Collection complete: ${this.collectedGames} games`);
        
        // Auto-export collected data
        if (this.exportManager && this.collectedGames > 0) {
            setTimeout(() => {
                this.exportManager.exportAllGames();
                this.updateCollectionStatus(`✅ Data exported: ${this.collectedGames} games`);
            }, 1000);
        }
        
        this.bulkDataCollection = false;
        this.updateTrainingUI();
    }

    // ENHANCED: Move recording with comprehensive analysis
    recordMoveWithEvaluation(moveData) {
        if (!this.exportManager || !this.trainingMode) return;

        const enhancedMoveData = {
            ...moveData,
            
            // Timing information
            timeSpent: this.moveStartTime ? Date.now() - this.moveStartTime : 0,
            gamePhase: this.getGamePhase(),
            
            // Board analysis
            boardFeatures: this.analyzeBoardPosition(),
            
            // Strategic analysis
            moveEvaluation: this.evaluateMove(moveData),
            
            // Alternative moves
            alternatives: this.findAlternativeMoves(moveData),
            
            // Game context
            gameContext: this.getGameContext()
        };
        
        this.exportManager.recordMove(enhancedMoveData);
    }

    analyzeBoardPosition() {
        if (!this.gameCore) return {};
        
        return {
            moveCount: this.gameCore.moveCount,
            boardDensity: this.calculateBoardDensity(),
            centerControl: this.calculateCenterControl(),
            edgeActivity: this.calculateEdgeActivity(),
            connectivityScore: this.calculateOverallConnectivity()
        };
    }

    calculateBoardDensity() {
        const totalCells = this.gameCore.size * this.gameCore.size;
        const occupiedCells = this.gameCore.getPlayerPositions('X').length + 
                             this.gameCore.getPlayerPositions('O').length;
        return (occupiedCells / totalCells) * 100;
    }

    calculateCenterControl() {
        const center = Math.floor(this.gameCore.size / 2);
        const centerRegion = 3; // 3x3 center area
        let xControl = 0, oControl = 0;
        
        for (let dr = -centerRegion; dr <= centerRegion; dr++) {
            for (let dc = -centerRegion; dc <= centerRegion; dc++) {
                const row = center + dr;
                const col = center + dc;
                
                if (this.gameCore.isValidPosition(row, col)) {
                    const cell = this.gameCore.board[row][col];
                    if (cell === 'X') xControl++;
                    else if (cell === 'O') oControl++;
                }
            }
        }
        
        return { X: xControl, O: oControl };
    }

    calculateEdgeActivity() {
        let edgeActivity = { X: 0, O: 0 };
        const size = this.gameCore.size;
        
        // Check all edge positions
        for (let i = 0; i < size; i++) {
            // Top and bottom edges
            const topCell = this.gameCore.board[0][i];
            const bottomCell = this.gameCore.board[size-1][i];
            
            if (topCell === 'X' || topCell === 'O') edgeActivity[topCell]++;
            if (bottomCell === 'X' || bottomCell === 'O') edgeActivity[bottomCell]++;
            
            // Left and right edges (excluding corners)
            if (i > 0 && i < size - 1) {
                const leftCell = this.gameCore.board[i][0];
                const rightCell = this.gameCore.board[i][size-1];
                
                if (leftCell === 'X' || leftCell === 'O') edgeActivity[leftCell]++;
                if (rightCell === 'X' || rightCell === 'O') edgeActivity[rightCell]++;
            }
        }
        
        return edgeActivity;
    }

    calculateOverallConnectivity() {
        const xConnectivity = this.calculatePlayerConnectivity('X');
        const oConnectivity = this.calculatePlayerConnectivity('O');
        
        return { X: xConnectivity, O: oConnectivity };
    }

    calculatePlayerConnectivity(player) {
        const positions = this.gameCore.getPlayerPositions(player);
        if (positions.length < 2) return 0;
        
        let totalConnectivity = 0;
        let connectionCount = 0;
        
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const distance = Math.abs(positions[i].row - positions[j].row) + 
                               Math.abs(positions[i].col - positions[j].col);
                
                if (distance <= 3) {
                    totalConnectivity += (4 - distance) / 3;
                    connectionCount++;
                }
            }
        }
        
        return connectionCount > 0 ? (totalConnectivity / connectionCount) * 100 : 0;
    }

    evaluateMove(moveData) {
        return {
            strategicValue: this.calculateStrategicValue(moveData.row, moveData.col, moveData.player),
            threatLevel: this.calculateThreatLevel(moveData.player),
            connectivityImprovement: this.calculateConnectivityImprovement(moveData),
            goalProgress: this.calculateGoalProgressImprovement(moveData)
        };
    }

    calculateStrategicValue(row, col, player) {
        let value = 0;
        const center = Math.floor(this.gameCore.size / 2);
        
        // Center preference
        const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center);
        value += Math.max(20 - distanceFromCenter * 2, 0);
        
        // Goal alignment
        if (player === 'X') {
            // X prefers positions that advance vertically
            const verticalProgress = Math.abs(row - center);
            value += Math.max(15 - verticalProgress, 0);
        } else {
            // O prefers positions that advance horizontally
            const horizontalProgress = Math.abs(col - center);
            value += Math.max(15 - horizontalProgress, 0);
        }
        
        return value;
    }

    calculateThreatLevel(player) {
        const positions = this.gameCore.getPlayerPositions(player);
        const opponent = player === 'X' ? 'O' : 'X';
        const opponentPositions = this.gameCore.getPlayerPositions(opponent);
        
        let threatLevel = 0;
        
        // Offensive potential
        threatLevel += this.calculateOffensivePotential(positions, player);
        
        // Defensive requirements
        threatLevel -= this.calculateDefensiveRequirements(opponentPositions, opponent);
        
        return threatLevel;
    }

    calculateOffensivePotential(positions, player) {
        if (positions.length === 0) return 0;
        
        // Calculate how close player is to winning
        if (player === 'X') {
            const minRow = Math.min(...positions.map(p => p.row));
            const maxRow = Math.max(...positions.map(p => p.row));
            const span = maxRow - minRow + 1;
            return (span / this.gameCore.size) * 50;
        } else {
            const minCol = Math.min(...positions.map(p => p.col));
            const maxCol = Math.max(...positions.map(p => p.col));
            const span = maxCol - minCol + 1;
            return (span / this.gameCore.size) * 50;
        }
    }

    calculateDefensiveRequirements(opponentPositions, opponent) {
        // Similar calculation for opponent threat
        return this.calculateOffensivePotential(opponentPositions, opponent);
    }

    calculateConnectivityImprovement(moveData) {
        const { row, col, player } = moveData;
        const currentPositions = this.gameCore.getPlayerPositions(player);
        
        let improvement = 0;
        
        // Check how many existing pieces this move would connect to
        for (const pos of currentPositions) {
            const distance = Math.abs(row - pos.row) + Math.abs(col - pos.col);
            if (distance <= 2) {
                improvement += (3 - distance) * 10;
            }
        }
        
        return improvement;
    }

    calculateGoalProgressImprovement(moveData) {
        const { row, col, player } = moveData;
        const currentPositions = this.gameCore.getPlayerPositions(player);
        
        if (currentPositions.length === 0) return 20; // First move bonus
        
        if (player === 'X') {
            // Check if this move improves vertical span
            const currentMinRow = Math.min(...currentPositions.map(p => p.row));
            const currentMaxRow = Math.max(...currentPositions.map(p => p.row));
            const currentSpan = currentMaxRow - currentMinRow + 1;
            
            const newMinRow = Math.min(row, currentMinRow);
            const newMaxRow = Math.max(row, currentMaxRow);
            const newSpan = newMaxRow - newMinRow + 1;
            
            return (newSpan - currentSpan) * 10;
        } else {
            // Check if this move improves horizontal span
            const currentMinCol = Math.min(...currentPositions.map(p => p.col));
            const currentMaxCol = Math.max(...currentPositions.map(p => p.col));
            const currentSpan = currentMaxCol - currentMinCol + 1;
            
            const newMinCol = Math.min(col, currentMinCol);
            const newMaxCol = Math.max(col, currentMaxCol);
            const newSpan = newMaxCol - newMinCol + 1;
            
            return (newSpan - currentSpan) * 10;
        }
    }

    findAlternativeMoves(moveData) {
        const alternatives = [];
        const emptyPositions = this.gameCore.getEmptyPositions().slice(0, 15); // Limit for performance
        
        for (const pos of emptyPositions) {
            if (pos.row === moveData.row && pos.col === moveData.col) continue;
            
            const value = this.calculateStrategicValue(pos.row, pos.col, moveData.player);
            
            if (value > 10) {
                alternatives.push({
                    row: pos.row,
                    col: pos.col,
                    estimatedValue: value
                });
            }
        }
        
        return alternatives
            .sort((a, b) => b.estimatedValue - a.estimatedValue)
            .slice(0, 5);
    }

    getGameContext() {
        return {
            gamePhase: this.getGamePhase(),
            gameMode: this.gameMode,
            aiDifficulty: this.aiDifficulty,
            gameStartTime: this.gameStartTime,
            trainingMode: this.trainingMode
        };
    }

    getGamePhase() {
        if (!this.gameCore) return 'unknown';
        
        const moveCount = this.gameCore.moveCount;
        const totalCells = this.gameCore.size * this.gameCore.size;
        const progress = moveCount / totalCells;
        
        if (progress < 0.15) return 'opening';
        if (progress < 0.4) return 'early_middle';
        if (progress < 0.7) return 'late_middle';
        return 'endgame';
    }

    // ========================= BOARD MANAGEMENT =========================

    createBoard() {
        if (!this.boardElement) {
            console.error('Board element not found');
            return;
        }

        console.log(`Creating ${this.boardSize}x${this.boardSize} board...`);
        
        // Clear existing board
        this.boardElement.innerHTML = '';
        
        // Set grid template
        this.boardElement.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        
        // Create cells
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = this.createCell(row, col);
                this.boardElement.appendChild(cell);
            }
        }
        
        // Update diagonal lines after a short delay
        if (this.diagonalLines && this.gameCore && this.gameCore.board) {
            setTimeout(() => {
                console.log('Forcing diagonal lines update after board creation...');
                this.diagonalLines.forceUpdate();
            }, 200);
        } else {
            console.log('Skipping diagonal lines update - not ready yet');
        }
        
        console.log('Board created with cell numbering and diagonal line support');
    }

    createCell(row, col) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        
        // Add cell number (1-225) - always visible in corner
        const cellNumber = document.createElement('div');
        cellNumber.className = 'cell-number';
        cellNumber.textContent = row * this.boardSize + col + 1;
        cell.appendChild(cellNumber);
        
        // Add click handler with training enhancements
        cell.addEventListener('click', () => this.handleCellClick(row, col));
        
        return cell;
    }

    updateBoardDisplay() {
        const cells = this.boardElement.querySelectorAll('.cell');
        
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellValue = this.gameCore.board[row][col];
            
            // Clear existing classes and move text
            cell.classList.remove('x', 'o', 'winning-path', 'connected-chain-x', 'connected-chain-o');
            
            // Remove any existing move text
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
                
            } else if (cellValue === 'O') {
                cell.classList.add('o');
                const moveNumber = this.getMoveNumber(row, col);
                
                const moveText = document.createElement('div');
                moveText.className = 'move-text';
                moveText.textContent = `O${moveNumber}`;
                cell.appendChild(moveText);
            }
            
            // Cell number (1-225) stays in corner always
            const cellNumber = cell.querySelector('.cell-number');
            if (!cellNumber) {
                const newCellNumber = document.createElement('div');
                newCellNumber.className = 'cell-number';
                newCellNumber.textContent = row * this.boardSize + col + 1;
                cell.appendChild(newCellNumber);
            }
        });
    }

    getMoveNumber(row, col) {
        for (let i = 0; i < this.gameCore.gameHistory.length; i++) {
            const move = this.gameCore.gameHistory[i];
            if (move.row === row && move.col === col) {
                // Count how many moves this player has made up to this point
                let playerMoveCount = 0;
                for (let j = 0; j <= i; j++) {
                    if (this.gameCore.gameHistory[j].player === move.player) {
                        playerMoveCount++;
                    }
                }
                return playerMoveCount;
            }
        }
        return '';
    }

    updateDiagonalLines() {
        if (this.diagonalLines && this.gameCore && this.gameCore.board) {
            try {
                this.diagonalLines.updateDiagonalLines();
                
                const stats = this.diagonalLines.getStatistics();
                console.log(`Diagonal lines updated - Total: ${stats.totalConnections}, X: ${stats.xConnections}, O: ${stats.oConnections}`);
            } catch (error) {
                console.warn('Error updating diagonal lines:', error);
            }
        } else {
            console.warn('Diagonal lines module not ready yet');
        }
    }

    // ========================= GAME CONTROL =========================

    handleCellClick(row, col) {
        if (!this.isGameActive || this.gameCore.gameOver) {
            console.log('Game not active or already over');
            return;
        }

        // Record move start time for training
        if (this.trainingMode) {
            this.moveStartTime = Date.now();
        }

        // Check if it's a valid move
        if (!this.gameCore.isValidMove(row, col)) {
            console.log(`Invalid move: (${row}, ${col})`);
            return;
        }

        // For online multiplayer, check if it's our turn
        if (this.gameMode === 'online' && this.multiplayerManager) {
            if (!this.multiplayerManager.isMyTurn) {
                console.log('Not your turn in online game');
                this.updateStatus('Wait for your turn!');
                return;
            }
        }

        // For AI mode, check if it's human's turn
        if (this.gameMode === 'ai' && this.gameCore.currentPlayer === 'O') {
            console.log('AI is thinking, please wait');
            return;
        }

        // Make the move
        this.makeMove(row, col);
    }

    // ENHANCED: Regular move with training features
    makeMove(row, col) {
        if (!this.isGameActive || this.gameCore.gameOver) {
            return false;
        }

        // Validate move
        if (!this.gameCore.isValidMove(row, col)) {
            console.log(`Invalid move: (${row}, ${col})`);
            return false;
        }

        console.log(`=== MAKING OUR MOVE: ${this.gameCore.currentPlayer} at (${row}, ${col}) ===`);

        // Store the player who is making the move BEFORE game state changes
        const movingPlayer = this.gameCore.currentPlayer;

        // ENHANCED: Record move timing and analysis for training
        const moveStartTime = Date.now();
        
        // Make the move
        const result = this.gameCore.makeMove(row, col);
        
        if (result.success) {
            const moveEndTime = Date.now();
            console.log(`Move successful! Move count: ${this.gameCore.moveCount}, Next player: ${this.gameCore.currentPlayer}`);
            
            // ENHANCED: Record move for export with training data
            if (this.exportManager) {
                const enhancedMoveData = {
                    row: row,
                    col: col,
                    player: movingPlayer,
                    moveNumber: this.gameCore.moveCount,
                    timeSpent: moveEndTime - moveStartTime,
                    gamePhase: this.getGamePhase()
                };
                
                // Add enhanced analysis if in training mode
                if (this.trainingMode) {
                    this.recordMoveWithEvaluation(enhancedMoveData);
                } else {
                    this.exportManager.recordMove(enhancedMoveData);
                }
            }
            
            // Update displays
            this.updateBoardDisplay();
            this.updateDiagonalLines();
            this.updateUI();
            
            // Check for game end
            if (this.gameCore.gameOver) {
                this.handleGameEnd(result.winner, result.winType, result.winPath);
                return true;
            }
            
            // Send move to multiplayer ONLY for our own moves
            if (this.gameMode === 'online' && this.multiplayerManager) {
                console.log(`Sending our move to opponent: ${movingPlayer} at (${row}, ${col})`);
                this.multiplayerManager.sendMove(row, col, movingPlayer, this.gameCore.moveCount);
                
                // Update turn status for multiplayer
                this.multiplayerManager.isMyTurn = false;
                this.updateStatus('Waiting for opponent...');
            }
            
            // Handle AI move if needed
            if (this.gameMode === 'ai' && this.gameCore.currentPlayer === 'O' && !this.gameCore.gameOver) {
                this.handleAIMove();
            }
            
            return true;
        }
        
        return false;
    }

    // FIXED: Handle opponent moves - NO double application
    handleOpponentMove(moveData) {
        console.log(`=== HANDLING OPPONENT MOVE ===`);
        console.log(`Opponent move data:`, moveData);
        
        // The move has ALREADY been applied by the multiplayer manager
        // We just need to update the UI and check for game end
        
        console.log(`✅ Opponent move already applied by multiplayer manager`);
        
        // Update displays to show the new move
        this.updateBoardDisplay();
        this.updateDiagonalLines();
        this.updateUI();
        
        // Check if the game ended with this move
        if (moveData.gameResult && moveData.gameResult.gameOver) {
            this.handleGameEnd(moveData.gameResult.winner, moveData.gameResult.winType, moveData.gameResult.winPath);
        } else {
            this.updateStatus('Your turn!');
        }
        
        console.log(`=== OPPONENT MOVE COMPLETE ===`);
    }

    newGame() {
        console.log('Starting new game...');
        this.isGameActive = true;
        this.aiThinking = false;
        this.gameStartTime = Date.now();
        
        // Reset game state
        if (this.gameCore) {
            this.gameCore.resetGame(this.boardSize);
        }
        
        // Clear diagonal lines
        if (this.diagonalLines) {
            this.diagonalLines.clear();
        }
        
        // Reset multiplayer turn status for new game
        if (this.gameMode === 'online' && this.multiplayerManager) {
            this.multiplayerManager.isMyTurn = (this.multiplayerManager.playerRole === 'X');
            console.log(`New multiplayer game - isMyTurn: ${this.multiplayerManager.isMyTurn}, role: ${this.multiplayerManager.playerRole}`);
        }
        
        // Start recording if enabled or in training mode
        if ((this.exportManager && this.exportManager.isRecording) || this.autoRecordGames) {
            this.exportManager.startNewGame();
        }
        
        // Create/update board display
        this.createBoard();
        this.updateUI();
        
        console.log(`✅ New ${this.boardSize}x${this.boardSize} game started`);
        if (this.trainingMode) {
            console.log(`🎓 Training mode active - enhanced data will be collected`);
        }
    }

    handleGameEnd(winner, winType, winPath) {
        console.log(`Game ended: ${winner} wins by ${winType}`);
        this.isGameActive = false;
        this.aiThinking = false;
        
        // Update status
        if (this.statusElement) {
            let statusText = `Game Over! ${winner} wins`;
            if (winType === 'surrender') {
                const surrenderingPlayer = winner === 'X' ? 'O' : 'X';
                statusText = `Game Over! ${winner} wins - ${surrenderingPlayer} surrendered`;
            } else {
                statusText = `Game Over! ${winner} wins by ${winType}!`;
            }
            
            this.statusElement.textContent = statusText;
            this.statusElement.className = 'status winner';
        }
        
        // Highlight winning path (only for actual connections, not surrenders)
        if (winPath && winPath.length > 0 && winType !== 'surrender') {
            this.highlightWinningPath(winPath);
        }
        
        // FIXED: Only record game end for non-surrender endings (surrender is recorded separately)
        if (this.exportManager && this.exportManager.isRecording && winType !== 'surrender') {
            this.exportManager.onGameEnd(winner, winType);
        }
        
        // Notify multiplayer
        if (this.gameMode === 'online' && this.multiplayerManager) {
            this.multiplayerManager.sendGameEnd(winner, winType);
        }
        
        // Update training progress if in bulk collection
        if (this.bulkDataCollection) {
            this.collectedGames++;
            this.updateCollectionStatus(`Progress: ${this.collectedGames}/${this.targetGames} games`);
        }
        
        // ENHANCED: Training mode post-game analysis
        if (this.trainingMode) {
            this.performPostGameAnalysis(winner, winType);
        }
    }

    // FIXED: Simplified surrender handling
    handleSurrender() {
    if (!this.isGameActive || this.gameCore.gameOver) {
        console.log('Cannot surrender: game not active or already over');
        return;
    }
    
    // GUARD: Prevent multiple surrender attempts
    if (this._surrenderInProgress) {
        console.log('Surrender already in progress');
        return;
    }
    this._surrenderInProgress = true;
    
    const currentPlayer = this.gameCore.currentPlayer;
    console.log(`Processing surrender for player ${currentPlayer}`);
    
    try {
        // FIXED: Handle multiplayer differently
        if (this.gameMode === 'online' && this.multiplayerManager?.isConnected) {
            console.log('Multiplayer surrender - sending to server');
            this.multiplayerManager.sendSurrender(currentPlayer);
            this.updateStatus(`${currentPlayer} surrendered...`);
            return; // Don't execute locally, let server handle it
        }
        
        // Local game surrender (existing logic)
        const result = this.gameCore.surrender(currentPlayer);
        
        if (result.success) {
            if (this.exportManager?.isRecording) {
                this.exportManager.recordMove({
                    row: -1, col: -1, player: currentPlayer,
                    moveType: 'surrender', moveNumber: result.moveNumber,
                    timeSpent: 0, gamePhase: this.getGamePhase()
                });
            }
            
            this.updateBoardDisplay();
            this.updateDiagonalLines();
            this.updateUI();
            this.handleGameEndSimple(result.winner, result.winType, null);
        }
    } finally {
        // Clear flag after delay
        setTimeout(() => { this._surrenderInProgress = false; }, 1000);
    }
}

    // SIMPLIFIED: Add this new method for surrender game end handling
    handleGameEndSimple(winner, winType, winPath) {
        console.log(`Game ended: ${winner} wins by ${winType}`);
        this.isGameActive = false;
        this.aiThinking = false;
        
        // Update status
        if (this.statusElement) {
            let statusText = `Game Over! ${winner} wins`;
            if (winType === 'surrender') {
                const surrenderingPlayer = winner === 'X' ? 'O' : 'X';
                statusText = `Game Over! ${winner} wins - ${surrenderingPlayer} surrendered`;
            } else {
                statusText = `Game Over! ${winner} wins by ${winType}!`;
            }
            
            this.statusElement.textContent = statusText;
            this.statusElement.className = 'status winner';
        }
        
        // Highlight winning path (only for actual connections, not surrenders)
        if (winPath && winPath.length > 0 && winType !== 'surrender') {
            this.highlightWinningPath(winPath);
        }
        
        // SIMPLIFIED: NO export recording here (already done in handleSurrender)
        
        // Notify multiplayer
        if (this.gameMode === 'online' && this.multiplayerManager) {
            this.multiplayerManager.sendGameEnd(winner, winType);
        }
        
        // Update training progress if in bulk collection
        if (this.bulkDataCollection) {
            this.collectedGames++;
            this.updateCollectionStatus(`Progress: ${this.collectedGames}/${this.targetGames} games`);
        }
        
        // Training mode post-game analysis
        if (this.trainingMode) {
            this.performPostGameAnalysis(winner, winType);
        }
    }

    performPostGameAnalysis(winner, winType) {
        console.log('🎓 Performing post-game training analysis...');
        
        const gameAnalysis = {
            gameLength: this.gameCore.moveCount,
            gamePhase: this.getGamePhase(),
            winner: winner,
            winType: winType,
            gameDuration: Date.now() - this.gameStartTime,
            finalBoardDensity: this.calculateBoardDensity(),
            finalConnectivity: this.calculateOverallConnectivity()
        };
        
        console.log('🎓 Game analysis:', gameAnalysis);
    }

    highlightWinningPath(winPath) {
        const cells = this.boardElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            const isInPath = winPath.some(pos => pos.row === row && pos.col === col);
            if (isInPath) {
                cell.classList.add('winning-path');
            }
        });
    }

    // ========================= AI HANDLING =========================

    handleAIMove() {
        if (!this.aiPlayer || this.aiThinking || this.gameCore.gameOver) {
            return;
        }

        this.aiThinking = true;
        this.updateStatus('AI is thinking...');

        setTimeout(() => {
            try {
                const aiMove = this.aiPlayer.getBestMove(this.aiDifficulty);
                
                if (aiMove) {
                    console.log(`AI move: (${aiMove.row}, ${aiMove.col})`);
                    this.makeMove(aiMove.row, aiMove.col);
                } else {
                    console.error('AI failed to find a move');
                    this.updateStatus('AI error - please restart game');
                }
            } catch (error) {
                console.error('AI error:', error);
                this.updateStatus('AI error - please restart game');
            } finally {
                this.aiThinking = false;
            }
        }, 500);
    }

    initializeAI() {
        if (this.gameMode === 'ai' && !this.aiPlayer && this.gameCore) {
            if (typeof EnhancedConnectionGameAI !== 'undefined') {
                this.aiPlayer = new EnhancedConnectionGameAI(this.gameCore);
                this.aiPlayer.setDifficulty(this.aiDifficulty);
                console.log('✅ Enhanced Neural Network AI initialized');
                
                // Show AI status
                setTimeout(() => {
                    const status = this.aiPlayer.getStatus();
                    console.log(`🤖 AI Status: ${status.aiType} (${status.difficulty})`);
                    if (!status.neuralNetworkLoaded) {
                        console.log('💡 To enable neural network: train a model and place it at ./models/connection-game-model.json');
                    }
                }, 100);
            } else {
                console.error('❌ EnhancedConnectionGameAI not available - make sure game-ai-enhanced.js is loaded');
                this.aiPlayer = null;
            }
        }
    }

    // ========================= UI UPDATES =========================

    updateUI() {
        this.updateCurrentPlayer();
        this.updateStatus();
        this.updateTrainingUI();
    }

    updateCurrentPlayer() {
        if (!this.currentPlayerElement) return;
        
        const player = this.gameCore.currentPlayer;
        this.currentPlayerElement.textContent = `Player ${player}'s Turn`;
        this.currentPlayerElement.className = `current-player player-${player.toLowerCase()}`;
    }

    updateStatus(customMessage = null) {
        if (!this.statusElement) return;
        
        if (customMessage) {
            this.statusElement.textContent = customMessage;
            this.statusElement.className = 'status';
            return;
        }
        
        if (this.gameCore.gameOver) {
            return;
        }
        
        let statusText = '';
        if (this.gameMode === 'ai' && this.gameCore.currentPlayer === 'O') {
            statusText = 'AI is thinking...';
        } else if (this.gameMode === 'online' && this.multiplayerManager) {
            if (this.multiplayerManager.isMyTurn) {
                statusText = `Your turn (${this.multiplayerManager.playerRole}). Move ${this.gameCore.moveCount + 1}`;
            } else {
                statusText = `Waiting for ${this.multiplayerManager.opponentNickname || 'opponent'}...`;
            }
        } else {
            statusText = `${this.gameCore.currentPlayer} to move. Move ${this.gameCore.moveCount + 1}`;
        }
        
        this.statusElement.textContent = statusText;
        this.statusElement.className = 'status';
    }

    updateTrainingUI() {
        // Update training progress element
        const trainingProgress = document.getElementById('trainingProgress');
        if (trainingProgress) {
            if (this.trainingMode) {
                if (this.bulkDataCollection) {
                    trainingProgress.textContent = `🎓 Collecting: ${this.collectedGames}/${this.targetGames} games`;
                } else {
                    trainingProgress.textContent = '🎓 Training mode: Active';
                }
                trainingProgress.style.color = '#0096ff';
            } else {
                trainingProgress.textContent = 'Training mode: Inactive';
                trainingProgress.style.color = '#666666';
            }
        }
    }

    updateCollectionStatus(message) {
        console.log(`📊 Collection: ${message}`);
        
        const trainingProgress = document.getElementById('trainingProgress');
        if (trainingProgress) {
            trainingProgress.textContent = message;
        }
        
        this.updateStatus(message);
    }

    // ========================= GAME MODE MANAGEMENT =========================

    setGameMode(mode) {
        const oldMode = this.gameMode;
        this.gameMode = mode;
        
        console.log(`Game mode changed: ${oldMode} → ${mode}`);
        this.updateGameModeSetup();
    }

    setBoardSize(size) {
        this.boardSize = size;
        if (this.gameCore) {
            this.gameCore.size = size;
        }
        console.log(`Board size changed to: ${size}x${size}`);
    }

    updateGameModeSetup() {
        // Show/hide multiplayer UI
        const multiplayerSection = document.getElementById('multiplayerSection');
        if (multiplayerSection) {
            multiplayerSection.style.display = this.gameMode === 'online' ? 'flex' : 'none';
        }
        
        // Initialize AI if needed
        if (this.gameMode === 'ai') {
            this.initializeAI();
        }
        
        // Initialize multiplayer if needed
        if (this.gameMode === 'online' && !this.multiplayerManager && this.gameCore) {
            if (typeof ConnectionGameMultiplayer !== 'undefined') {
                console.log('🌐 Initializing multiplayer manager...');
                this.multiplayerManager = new ConnectionGameMultiplayer(this.gameCore);
                this.setupMultiplayerHandlers();
                console.log('✅ Multiplayer module initialized');
                
                this.updateConnectionUI('disconnected', 'Ready to connect');
            } else {
                console.warn('❌ ConnectionGameMultiplayer not available');
                this.updateStatus('⚠️ Multiplayer not available - missing ConnectionGameMultiplayer module');
            }
        }
        
        // Clean up multiplayer if switching away from online mode
        if (this.gameMode !== 'online' && this.multiplayerManager) {
            console.log('🧹 Cleaning up multiplayer manager...');
            this.multiplayerManager.disconnect();
            this.multiplayerManager = null;
            this.updateConnectionUI('disconnected', 'Offline');
        }
        
        this.updateExportSettings();
    }

    updateExportSettings() {
        if (this.exportManager) {
            if (this.gameMode === 'online' && this.recordOnlineGames) {
                console.log('📹 Auto-recording enabled for online games');
            }
        }
    }

    // ========================= MULTIPLAYER HANDLING =========================

    setupMultiplayerHandlers() {
        if (!this.multiplayerManager) return;
        
        console.log('🔧 Setting up multiplayer event handlers...');
        
        this.multiplayerManager.on('connectionStatusChanged', (data) => {
            console.log(`🔗 Connection status: ${data.status} - ${data.message}`);
            this.updateConnectionUI(data.status, data.message);
        });
        
        // FIXED: Opponent move handling - just update UI, don't apply move again
        this.multiplayerManager.on('opponentMove', (data) => {
            console.log(`📨 Received opponent move: ${data.player} at (${data.row}, ${data.col})`);
            this.handleOpponentMove(data);
        });
        
        this.multiplayerManager.on('gameEnded', (data) => {
    if (!this.gameCore.gameOver) {
        // Only process if game isn't already over locally
        this.handleGameEnd(data.winner, data.reason);
    } else {
        console.log('Received game end confirmation from server');
    }
});
        
        this.multiplayerManager.on('gameCreated', (data) => {
            console.log(`🎮 Game created with ID: ${data.gameId}`);
            this.updateGameUI(data);
        });
        
        this.multiplayerManager.on('gameStarted', (data) => {
            console.log(`🚀 Game started! Playing against ${data.opponent}`);
            this.updateStatus(`Game started! Playing against ${data.opponent}`);
            
            // Initialize turn status
            this.multiplayerManager.isMyTurn = data.isMyTurn;
            console.log(`Game started - My role: ${data.role}, My turn: ${data.isMyTurn}`);
            
            // Auto-start recording for online games
            if (this.exportManager && this.recordOnlineGames) {
                this.exportManager.onGameStart();
            }
            
            // Start a new game with proper multiplayer setup
            this.newGame();
        });
        
        this.multiplayerManager.on('joinFailed', (data) => {
            console.error(`❌ Failed to join game: ${data.reason}`);
            this.updateStatus(`Failed to join: ${data.reason}`);
        });
        
        this.multiplayerManager.on('opponentDisconnected', () => {
            this.updateStatus('Opponent disconnected');
        });
        
        this.multiplayerManager.on('opponentSurrendered', (data) => {
    console.log(`📨 Opponent surrendered: ${data.surrenderingPlayer}`);
    
    // Execute surrender locally
    const result = this.gameCore.surrender(data.surrenderingPlayer);
    if (result.success) {
        this.updateBoardDisplay();
        this.updateDiagonalLines();
        this.updateUI();
        this.handleGameEndSimple(result.winner, result.winType, null);
    }
    
    this._surrenderInProgress = false;
});
        
        console.log('✅ Multiplayer event handlers set up successfully');
    }

    updateConnectionUI(status, message) {
        const connectionStatus = document.getElementById('connectionStatus');
        const connectionText = document.getElementById('connectionText');
        const connectButton = document.getElementById('connectButton');
        const onlineControlsSection = document.getElementById('onlineControlsSection');
        
        if (!connectionStatus || !connectionText || !connectButton) return;
        
        switch (status) {
            case 'connecting':
                connectionStatus.className = 'status-indicator connecting';
                connectionText.textContent = 'Connecting...';
                connectButton.textContent = 'Connecting...';
                connectButton.disabled = true;
                if (onlineControlsSection) onlineControlsSection.style.display = 'none';
                break;
                
            case 'connected':
                connectionStatus.className = 'status-indicator connected';
                connectionText.textContent = message || 'Connected';
                connectButton.textContent = 'Disconnect';
                connectButton.disabled = false;
                if (onlineControlsSection) onlineControlsSection.style.display = 'block';
                break;
                
            case 'disconnected':
                connectionStatus.className = 'status-indicator';
                connectionText.textContent = 'Offline';
                connectButton.textContent = 'Connect';
                connectButton.disabled = false;
                if (onlineControlsSection) onlineControlsSection.style.display = 'none';
                break;
        }
    }

    updateGameUI(data) {
        const gameIdElement = document.getElementById('gameId');
        const inviteLinkElement = document.getElementById('inviteLink');
        
        if (gameIdElement) gameIdElement.textContent = data.gameId || 'Unknown';
        if (inviteLinkElement) inviteLinkElement.value = data.inviteLink || '';
    }

    // ========================= ENHANCED PUBLIC API =========================

    // Training controls
    toggleRecording() {
        if (this.exportManager) {
            return this.exportManager.toggleRecording();
        }
        return false;
    }

    startBulkCollection(numGames, mode) {
        return this.collectTrainingData(numGames, mode);
    }

    getTrainingStatus() {
        return {
            trainingMode: this.trainingMode,
            collectingData: this.bulkDataCollection,
            targetGames: this.targetGames,
            collectedGames: this.collectedGames,
            exportManagerStatus: this.exportManager ? this.exportManager.getStatus() : null
        };
    }

    exportAllData() {
        if (this.exportManager) {
            this.exportManager.exportAllGames();
        }
    }

    // Game analysis for training
    analyzeCurrentGame() {
        if (!this.gameCore) return null;
        
        return {
            moveCount: this.gameCore.moveCount,
            gamePhase: this.getGamePhase(),
            boardDensity: this.calculateBoardDensity(),
            centerControl: this.calculateCenterControl(),
            connectivity: this.calculateOverallConnectivity(),
            edgeActivity: this.calculateEdgeActivity()
        };
    }
}

// ========================= ENHANCED GLOBAL FUNCTIONS FOR HTML =========================

function newGame() {
    if (window.gameController) {
        window.gameController.newGame();
    }
}

function createBoard() {
    if (window.gameController) {
        const newSize = parseInt(document.getElementById('boardSize').value);
        window.gameController.setBoardSize(newSize);
        window.gameController.createBoard();
    }
}

function handleGameModeChange() {
    const newMode = document.getElementById('gameMode').value;
    if (window.gameController) {
        window.gameController.setGameMode(newMode);
    }
}

function handleSurrender() {
    if (window.gameController) {
        window.gameController.handleSurrender();
    }
}

// ENHANCED: Training functions
function activateTrainingMode() {
    if (window.gameController) {
        window.gameController.activateTrainingMode();
    }
}

function toggleTrainingMode() {
    if (window.gameController) {
        window.gameController.toggleTrainingMode();
    }
}

function collectTrainingData(numGames = 50, mode = 'ai_vs_ai') {
    if (window.gameController) {
        const games = parseInt(document.getElementById('trainingGames')?.value) || numGames;
        const collectionMode = document.getElementById('collectionMode')?.value || mode;
        
        window.gameController.collectTrainingData(games, collectionMode);
    }
}

function toggleGameRecording() {
    if (window.gameController) {
        return window.gameController.toggleRecording();
    }
    return false;
}

function exportCurrentGame() {
    if (window.gameController && window.gameController.exportManager) {
        window.gameController.exportManager.exportCurrentGame();
    } else {
        alert('No export manager available or no game to export');
    }
}

function exportAllGames() {
    if (window.gameController) {
        window.gameController.exportAllData();
    }
}

function showBatchExport() {
    const modal = document.getElementById('batchModal');
    if (modal) {
        modal.style.display = 'flex';
        
        if (window.gameController && window.gameController.exportManager) {
            const status = window.gameController.exportManager.getStatus();
            document.getElementById('batchGameCount').textContent = status.storedGamesCount || 0;
            document.getElementById('batchPositionCount').textContent = status.totalPositions || 0;
        }
    }
}

function clearAllGames() {
    if (confirm('Are you sure you want to clear all stored games?')) {
        if (window.gameController && window.gameController.exportManager) {
            window.gameController.exportManager.clearAllGames();
            document.getElementById('batchGameCount').textContent = '0';
            document.getElementById('batchPositionCount').textContent = '0';
        }
    }
}

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

function closeBatchModal() {
    document.getElementById('batchModal').style.display = 'none';
}

function exportGameData() {
    if (window.gameController && window.gameController.exportManager) {
        window.gameController.exportManager.exportCurrentGame();
        closeExportModal();
    } else {
        alert('Export manager not available');
    }
}

function saveToCollection() {
    if (window.gameController && window.gameController.exportManager) {
        window.gameController.exportManager.saveCurrentGame();
        closeExportModal();
        alert('Game saved to collection!');
    } else {
        alert('Export manager not available');
    }
}

// Multiplayer functions
function toggleConnection() {
    const nickname = document.getElementById('playerNickname').value.trim();
    
    if (!window.gameController || !window.gameController.multiplayerManager) {
        alert('Multiplayer not available - make sure game is initialized');
        return;
    }
    
    if (!window.gameController.multiplayerManager.isConnected) {
        if (!nickname) {
            alert('Please enter a nickname first');
            document.getElementById('playerNickname').focus();
            return;
        }
        
        // Auto-switch to online mode when connecting
        console.log('🔧 Auto-switching to online mode for multiplayer');
        const gameModeSelect = document.getElementById('gameMode');
        if (gameModeSelect && gameModeSelect.value !== 'online') {
            gameModeSelect.value = 'online';
            window.gameController.setGameMode('online');
            console.log('✅ Game mode automatically set to online');
        }
        
        window.gameController.multiplayerManager.connect(nickname);
    } else {
        window.gameController.multiplayerManager.disconnect();
    }
}

function createOnlineGame() {
    if (window.gameController && window.gameController.multiplayerManager && window.gameController.multiplayerManager.isConnected) {
        window.gameController.multiplayerManager.createGame();
    }
}

function copyInviteLink() {
    const inviteLink = document.getElementById('inviteLink');
    if (inviteLink && inviteLink.value) {
        navigator.clipboard.writeText(inviteLink.value).then(() => {
            const originalPlaceholder = inviteLink.placeholder;
            inviteLink.placeholder = 'Copied!';
            setTimeout(() => {
                inviteLink.placeholder = originalPlaceholder;
            }, 2000);
        });
    }
}

function joinGameFromBanner() {
    const nicknameInput = document.getElementById('joinGameNickname');
    const nickname = nicknameInput?.value?.trim();
    
    if (!nickname) {
        alert('Please enter a nickname first!');
        nicknameInput?.focus();
        return;
    }
    
    console.log(`🚀 Joining game with nickname: ${nickname}`);
    window.gameController.multiplayerManager.connect(nickname);
}

function handleJoinKeyPress(event) {
    if (event.key === 'Enter') {
        joinGameFromBanner();
    }
}

// ========================= ENHANCED INITIALIZATION =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Initializing Enhanced Connection Game with Training Features...');
    
    // Check for game ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');
    
    if (gameIdFromUrl) {
        console.log(`🔗 Game invite detected: ${gameIdFromUrl}`);
        setupJoinGameExperience(gameIdFromUrl);
    } else {
        console.log('📱 Normal game mode - no invite detected');
        initializeNormalGame();
    }
});

// Setup join game experience
function setupJoinGameExperience(gameId) {
    console.log(`🎯 Setting up join experience for game: ${gameId}`);
    
    // Store game ID for later use
    window.autoJoinGameId = gameId;
    
    // Show join game banner
    const joinBanner = document.getElementById('joinGameBanner');
    const gameSetup = document.querySelector('.game-setup');
    
    if (joinBanner) {
        document.getElementById('joinGameId').textContent = gameId;
        joinBanner.classList.remove('hidden');
        console.log('✅ Join game banner shown');
    }
    
    // Hide normal game setup temporarily
    if (gameSetup) {
        gameSetup.style.display = 'none';
        console.log('✅ Normal setup hidden');
    }
    
    // Auto-switch to online multiplayer mode
    const gameModeSelect = document.getElementById('gameMode');
    if (gameModeSelect) {
        gameModeSelect.value = 'online';
        console.log('✅ Auto-switched to online mode');
    }
    
    // Update status
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = `Ready to join game ${gameId}. Enter your nickname above!`;
        statusElement.className = 'status';
    }
    
    // Focus on nickname input
    setTimeout(() => {
        const nicknameInput = document.getElementById('joinGameNickname');
        if (nicknameInput) {
            nicknameInput.focus();
        }
    }, 500);
    
    // Initialize game controller
    setTimeout(() => {
        try {
            window.gameController = new ConnectionGameManager();
            window.gameController.setGameMode('online');
            console.log('✅ Enhanced game controller initialized for join experience');
        } catch (error) {
            console.error('❌ Failed to initialize game controller:', error);
        }
    }, 100);
}

// Initialize normal game (no URL invite)
function initializeNormalGame() {
    // Hide join banner
    const joinBanner = document.getElementById('joinGameBanner');
    if (joinBanner) {
        joinBanner.classList.add('hidden');
    }
    
    // Show normal setup
    const gameSetup = document.querySelector('.game-setup');
    if (gameSetup) {
        gameSetup.style.display = 'grid';
    }
    
    // Initialize normally
    setTimeout(() => {
        try {
            window.gameController = new ConnectionGameManager();
            console.log('✅ Enhanced game with training features initialized');
            console.log('🎓 Training shortcuts: Ctrl+T (training), Ctrl+G (generate), Ctrl+E (export), Ctrl+R (record)');
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
        }
    }, 100);
}

// Close modals when clicking outside
window.onclick = function(event) {
    const exportModal = document.getElementById('exportModal');
    const batchModal = document.getElementById('batchModal');
    
    if (event.target === exportModal) {
        exportModal.style.display = 'none';
    }
    if (event.target === batchModal) {
        batchModal.style.display = 'none';
    }
}

// ENHANCED: Add game state monitoring for surrender button and training
setInterval(() => {
    if (typeof updateSurrenderButton === 'function') {
        updateSurrenderButton();
    }
    
    // Update training UI periodically
    if (window.gameController) {
        window.gameController.updateTrainingUI();
    }
}, 1000); // Check every second

window.ConnectionGameManager = ConnectionGameManager;