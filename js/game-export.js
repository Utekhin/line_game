// game-export.js - ENHANCED VERSION for Neural Network Training
// Handles collection and export of game data with advanced features for ML training

class GameExportManager {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.currentGameData = null;
        this.isRecording = false;
        this.gameStartTime = null;
        this.gameId = null;
        this.storedGames = []; // Store games in memory since localStorage isn't available
        
        // Enhanced training features
        this.trainingMode = false;
        this.collectMoveAnalysis = true;
        this.collectBoardFeatures = true;
        this.collectAlternatives = true;
        this.moveStartTime = null;
        
        console.log('🎮 Enhanced Game Export Manager initialized for ML training');
    }

    // ========================= TRAINING MODE CONTROLS =========================

    activateTrainingMode() {
        this.trainingMode = true;
        this.collectMoveAnalysis = true;
        this.collectBoardFeatures = true;
        this.collectAlternatives = true;
        this.isRecording = true;
        
        console.log('🎓 Training mode activated - enhanced data collection enabled');
        this.updateRecordingUI(true);
        this.updateExportStatus();
    }

    deactivateTrainingMode() {
        this.trainingMode = false;
        this.collectMoveAnalysis = false;
        this.collectBoardFeatures = false;
        this.collectAlternatives = false;
        
        console.log('🎓 Training mode deactivated');
        this.updateExportStatus();
    }

    // ========================= ENHANCED GAME RECORDING =========================

    startGameRecording() {
        this.gameId = this.generateGameId();
        this.gameStartTime = new Date();
        this.isRecording = true;
        
        this.currentGameData = {
            gameId: this.gameId,
            boardSize: this.gameCore.size,
            players: {
                X: this.getPlayerName('X'),
                O: this.getPlayerName('O')
            },
            gameMode: this.getGameMode(),
            startTime: this.gameStartTime.toISOString(),
            moves: [],
            winner: null,
            winType: null,
            trainingFeatures: this.trainingMode ? {
                boardAnalysis: [],
                positionEvaluations: [],
                moveAlternatives: [],
                threatAnalysis: []
            } : null,
            gameMetadata: {
                userAgent: navigator.userAgent,
                screenResolution: `${screen.width}x${screen.height}`,
                gameVersion: "1.0",
                trainingMode: this.trainingMode,
                aiDifficulty: this.getAIDifficulty()
            }
        };
        
        console.log(`📹 Started recording enhanced game: ${this.gameId}`);
        this.updateRecordingUI(true);
        this.updateExportStatus();
    }

    // ENHANCED: Record move with comprehensive analysis
    recordMove(moveData) {
        if (!this.isRecording || !this.currentGameData) return;

        // Mark move timing start
        this.moveStartTime = Date.now();

        // Capture board state BEFORE the move
        const boardStateBefore = this.captureBoardState();
        
        // Basic move record
        const moveRecord = {
            moveNumber: moveData.moveNumber || this.currentGameData.moves.length + 1,
            player: moveData.player,
            position: {
                row: moveData.row,
                col: moveData.col
            },
            moveType: moveData.moveType || 'normal',
            boardStateBefore: boardStateBefore,
            timeStamp: new Date().toISOString(),
            timeSinceStart: Date.now() - this.gameStartTime.getTime()
        };

        // ENHANCED: Add training-specific data
        if (this.trainingMode) {
            try {
                moveRecord.enhancedFeatures = this.collectEnhancedMoveData(moveData, boardStateBefore);
            } catch (error) {
                console.warn('Error collecting enhanced move data:', error);
            }
        }

        this.currentGameData.moves.push(moveRecord);
        
        // Log move recording
        if (moveData.moveType === 'surrender') {
            console.log(`📝 Recorded SURRENDER by ${moveRecord.player} at move ${moveRecord.moveNumber}`);
        } else {
            console.log(`📝 Recorded move ${moveRecord.moveNumber}: ${moveRecord.player} at (${moveRecord.position.row},${moveRecord.position.col})`);
            if (this.trainingMode) {
                console.log(`🎓 Enhanced training data collected for move ${moveRecord.moveNumber}`);
            }
        }
        
        this.updateExportStatus();
    }

    // NEW: Comprehensive enhanced move data collection
    collectEnhancedMoveData(moveData, boardStateBefore) {
        const enhancedData = {};

        // Board analysis
        if (this.collectBoardFeatures) {
            enhancedData.boardFeatures = this.analyzeBoardFeatures();
        }

        // Position analysis
        enhancedData.positionAnalysis = {
            moveQuality: this.evaluateMoveQuality(moveData),
            threatLevel: this.calculateThreatLevel(moveData.player),
            strategicValue: this.calculateStrategicValue(moveData.row, moveData.col, moveData.player),
            gamePhase: this.getGamePhase(),
            timeSpent: this.moveStartTime ? Date.now() - this.moveStartTime : 0
        };

        // Move classification
        enhancedData.moveClassification = this.classifyMoveType(moveData);

        // Alternative moves
        if (this.collectAlternatives) {
            enhancedData.alternatives = this.findAlternativeMoves(moveData);
        }

        // Goal progress
        enhancedData.goalProgress = this.calculateGoalProgress(moveData.player);

        // Connectivity analysis
        enhancedData.connectivity = this.analyzeConnectivity(moveData.player);

        return enhancedData;
    }

    // NEW: Detailed board feature analysis
    analyzeBoardFeatures() {
        if (!this.gameCore || !this.gameCore.board) return {};
        
        return {
            centerControl: this.calculateCenterControl(),
            edgePositions: this.countEdgePositions(),
            cornerControl: this.calculateCornerControl(),
            diagonalConnections: this.gameCore.diagonalConnections ? this.gameCore.diagonalConnections.length : 0,
            connectivity: {
                X: this.calculateConnectivity('X'),
                O: this.calculateConnectivity('O')
            },
            threats: {
                X: this.countImmediateThreats('X'),
                O: this.countImmediateThreats('O')
            },
            territoryControl: this.calculateTerritoryControl()
        };
    }

    calculateCenterControl() {
        const center = Math.floor(this.gameCore.size / 2);
        const centerRegion = [];
        
        // Define center region (5x5 area around center)
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const row = center + dr;
                const col = center + dc;
                if (this.gameCore.isValidPosition(row, col)) {
                    centerRegion.push(this.gameCore.board[row][col]);
                }
            }
        }
        
        return {
            X: centerRegion.filter(cell => cell === 'X').length,
            O: centerRegion.filter(cell => cell === 'O').length,
            empty: centerRegion.filter(cell => cell === '').length,
            controlRatio: {
                X: centerRegion.filter(cell => cell === 'X').length / centerRegion.length,
                O: centerRegion.filter(cell => cell === 'O').length / centerRegion.length
            }
        };
    }

    calculateCornerControl() {
        const corners = [
            [0, 0], [0, this.gameCore.size - 1],
            [this.gameCore.size - 1, 0], [this.gameCore.size - 1, this.gameCore.size - 1]
        ];
        
        const cornerControl = { X: 0, O: 0, empty: 0 };
        
        corners.forEach(([row, col]) => {
            const cell = this.gameCore.board[row][col];
            if (cell === 'X') cornerControl.X++;
            else if (cell === 'O') cornerControl.O++;
            else cornerControl.empty++;
        });
        
        return cornerControl;
    }

    countEdgePositions() {
        const edges = { X: 0, O: 0, empty: 0 };
        const size = this.gameCore.size;
        
        // Count pieces on board edges
        for (let i = 0; i < size; i++) {
            // Top and bottom edges
            [this.gameCore.board[0][i], this.gameCore.board[size-1][i]].forEach(cell => {
                if (cell === 'X') edges.X++;
                else if (cell === 'O') edges.O++;
                else edges.empty++;
            });
            
            // Left and right edges (excluding corners to avoid double counting)
            if (i > 0 && i < size - 1) {
                [this.gameCore.board[i][0], this.gameCore.board[i][size-1]].forEach(cell => {
                    if (cell === 'X') edges.X++;
                    else if (cell === 'O') edges.O++;
                    else edges.empty++;
                });
            }
        }
        
        return edges;
    }

    calculateConnectivity(player) {
        const positions = this.gameCore.getPlayerPositions(player);
        if (positions.length < 2) return 0;
        
        let totalConnectivity = 0;
        let connectionCount = 0;
        
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const distance = Math.abs(positions[i].row - positions[j].row) + 
                               Math.abs(positions[i].col - positions[j].col);
                
                // Count close connections
                if (distance <= 3) {
                    totalConnectivity += (4 - distance) / 3;
                    connectionCount++;
                }
            }
        }
        
        return connectionCount > 0 ? totalConnectivity / connectionCount : 0;
    }

    countImmediateThreats(player) {
        const positions = this.gameCore.getPlayerPositions(player);
        let threats = 0;
        
        positions.forEach(pos => {
            // Check for immediate winning opportunities
            const adjacentEmpty = this.gameCore.getAdjacentPositions(pos.row, pos.col, true, null);
            
            adjacentEmpty.forEach(emptyPos => {
                if (this.wouldCreateThreat(emptyPos.row, emptyPos.col, player)) {
                    threats++;
                }
            });
        });
        
        return threats;
    }

    wouldCreateThreat(row, col, player) {
        // Simplified threat detection - would winning move be available next turn?
        const tempBoard = JSON.parse(JSON.stringify(this.gameCore.board));
        tempBoard[row][col] = player;
        
        // Check if this creates a winning threat
        // (This is a simplified check - could be enhanced)
        return this.checkImmediateWinPossibility(tempBoard, player);
    }

    checkImmediateWinPossibility(board, player) {
        // Simplified check for immediate win possibility
        // In a real implementation, this would be more sophisticated
        return false; // Placeholder
    }

    calculateTerritoryControl() {
        const size = this.gameCore.size;
        const territory = { X: 0, O: 0, contested: 0, empty: 0 };
        
        // Simplified territory calculation
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const cell = this.gameCore.board[row][col];
                
                if (cell === 'X' || cell === 'O') {
                    territory[cell]++;
                } else {
                    // Check influence of surrounding pieces
                    const influence = this.calculatePositionInfluence(row, col);
                    if (influence.X > influence.O) territory.X += 0.5;
                    else if (influence.O > influence.X) territory.O += 0.5;
                    else if (influence.X === influence.O && influence.X > 0) territory.contested += 0.5;
                    else territory.empty += 0.5;
                }
            }
        }
        
        return territory;
    }

    calculatePositionInfluence(row, col) {
        const influence = { X: 0, O: 0 };
        
        // Check 3x3 area around position
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const checkRow = row + dr;
                const checkCol = col + dc;
                
                if (this.gameCore.isValidPosition(checkRow, checkCol)) {
                    const cell = this.gameCore.board[checkRow][checkCol];
                    if (cell === 'X') influence.X++;
                    else if (cell === 'O') influence.O++;
                }
            }
        }
        
        return influence;
    }

    // NEW: Move quality evaluation
    evaluateMoveQuality(moveData) {
        let quality = 50; // Base quality
        
        // Basic strategic value
        quality += this.calculateStrategicValue(moveData.row, moveData.col, moveData.player) * 0.5;
        
        // Threat creation/blocking bonus
        const threatValue = this.calculateThreatLevel(moveData.player);
        quality += threatValue * 0.3;
        
        // Position relative to goal
        const goalProgress = this.calculateGoalProgress(moveData.player);
        quality += goalProgress * 20;
        
        // Connectivity bonus
        const connectivity = this.analyzeConnectivity(moveData.player);
        quality += connectivity * 10;
        
        return Math.max(0, Math.min(100, quality));
    }

    calculateThreatLevel(player) {
        const positions = this.gameCore.getPlayerPositions(player);
        const opponent = player === 'X' ? 'O' : 'X';
        const opponentPositions = this.gameCore.getPlayerPositions(opponent);
        
        let threatLevel = 0;
        
        // Offensive threats
        threatLevel += this.countImmediateThreats(player) * 10;
        
        // Defensive requirements
        threatLevel -= this.countImmediateThreats(opponent) * 15;
        
        // Goal proximity
        const goalProximity = this.calculateGoalProximity(positions, player);
        threatLevel += goalProximity * 5;
        
        return threatLevel;
    }

    calculateGoalProximity(positions, player) {
        if (positions.length === 0) return 0;
        
        if (player === 'X') {
            // X needs to connect top to bottom
            const minRow = Math.min(...positions.map(p => p.row));
            const maxRow = Math.max(...positions.map(p => p.row));
            const span = maxRow - minRow + 1;
            return (span / this.gameCore.size) * 100;
        } else {
            // O needs to connect left to right
            const minCol = Math.min(...positions.map(p => p.col));
            const maxCol = Math.max(...positions.map(p => p.col));
            const span = maxCol - minCol + 1;
            return (span / this.gameCore.size) * 100;
        }
    }

    calculateStrategicValue(row, col, player) {
        let value = 0;
        
        // Center preference
        const center = Math.floor(this.gameCore.size / 2);
        const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center);
        value += Math.max(20 - distanceFromCenter * 2, 0);
        
        // Goal alignment
        if (player === 'X') {
            // X prefers central columns
            const distanceFromCenterCol = Math.abs(col - center);
            value += Math.max(15 - distanceFromCenterCol * 3, 0);
        } else {
            // O prefers central rows
            const distanceFromCenterRow = Math.abs(row - center);
            value += Math.max(15 - distanceFromCenterRow * 3, 0);
        }
        
        // Edge bonus for goal direction
        if (player === 'X' && (row === 0 || row === this.gameCore.size - 1)) {
            value += 10;
        } else if (player === 'O' && (col === 0 || col === this.gameCore.size - 1)) {
            value += 10;
        }
        
        return value;
    }

    // NEW: Move type classification
    classifyMoveType(moveData) {
        const classification = {
            category: 'unknown',
            subtype: 'normal',
            confidence: 0.5,
            reasoning: []
        };
        
        if (moveData.moveType === 'surrender') {
            classification.category = 'surrender';
            classification.confidence = 1.0;
            return classification;
        }
        
        const { row, col, player } = moveData;
        const opponent = player === 'X' ? 'O' : 'X';
        
        // Check if it's a blocking move
        if (this.isBlockingMove(row, col, opponent)) {
            classification.category = 'defensive';
            classification.subtype = 'blocking';
            classification.confidence = 0.8;
            classification.reasoning.push('Blocks opponent threat');
        }
        // Check if it's an attacking move
        else if (this.isAttackingMove(row, col, player)) {
            classification.category = 'offensive';
            classification.subtype = 'attacking';
            classification.confidence = 0.7;
            classification.reasoning.push('Creates own threat');
        }
        // Check if it's a connecting move
        else if (this.isConnectingMove(row, col, player)) {
            classification.category = 'positional';
            classification.subtype = 'connecting';
            classification.confidence = 0.6;
            classification.reasoning.push('Improves connectivity');
        }
        // Opening moves
        else if (this.gameCore.moveCount <= 6) {
            classification.category = 'opening';
            classification.subtype = 'development';
            classification.confidence = 0.5;
            classification.reasoning.push('Opening development');
        }
        // Default to positional
        else {
            classification.category = 'positional';
            classification.subtype = 'general';
            classification.confidence = 0.4;
            classification.reasoning.push('General positional play');
        }
        
        return classification;
    }

    isBlockingMove(row, col, opponent) {
        const opponentPositions = this.gameCore.getPlayerPositions(opponent);
        
        // Check if this position is adjacent to opponent pieces
        for (const opponentPos of opponentPositions) {
            const distance = Math.abs(row - opponentPos.row) + Math.abs(col - opponentPos.col);
            if (distance === 1) return true;
        }
        
        return false;
    }

    isAttackingMove(row, col, player) {
        const myPositions = this.gameCore.getPlayerPositions(player);
        
        // Check if this move extends our position toward goal
        for (const myPos of myPositions) {
            const distance = Math.abs(row - myPos.row) + Math.abs(col - myPos.col);
            if (distance <= 2) {
                // Check if it advances toward goal
                if (player === 'X') {
                    // Advancing vertically
                    if (Math.abs(col - myPos.col) <= 1) return true;
                } else {
                    // Advancing horizontally  
                    if (Math.abs(row - myPos.row) <= 1) return true;
                }
            }
        }
        
        return false;
    }

    isConnectingMove(row, col, player) {
        const myPositions = this.gameCore.getPlayerPositions(player);
        let connections = 0;
        
        for (const myPos of myPositions) {
            const distance = Math.abs(row - myPos.row) + Math.abs(col - myPos.col);
            if (distance <= 2) connections++;
        }
        
        return connections >= 2;
    }

    // NEW: Find alternative moves for training
    findAlternativeMoves(moveData) {
        if (!this.collectAlternatives) return [];
        
        const alternatives = [];
        const { player } = moveData;
        const emptyPositions = this.gameCore.getEmptyPositions().slice(0, 20); // Limit for performance
        
        for (const pos of emptyPositions) {
            // Skip the actual move played
            if (pos.row === moveData.row && pos.col === moveData.col) continue;
            
            const value = this.calculateStrategicValue(pos.row, pos.col, player);
            
            if (value > 10) { // Only consider decent alternatives
                alternatives.push({
                    row: pos.row,
                    col: pos.col,
                    estimatedValue: value,
                    moveType: this.classifyMoveType({ ...moveData, row: pos.row, col: pos.col }).category
                });
            }
        }
        
        // Sort by value and return top alternatives
        return alternatives
            .sort((a, b) => b.estimatedValue - a.estimatedValue)
            .slice(0, 5);
    }

    calculateGoalProgress(player) {
        const positions = this.gameCore.getPlayerPositions(player);
        
        if (positions.length === 0) return 0;
        
        if (player === 'X') {
            // X: vertical progress (top to bottom)
            const minRow = Math.min(...positions.map(p => p.row));
            const maxRow = Math.max(...positions.map(p => p.row));
            const span = maxRow - minRow + 1;
            return (span / this.gameCore.size) * 100;
        } else {
            // O: horizontal progress (left to right)
            const minCol = Math.min(...positions.map(p => p.col));
            const maxCol = Math.max(...positions.map(p => p.col));
            const span = maxCol - minCol + 1;
            return (span / this.gameCore.size) * 100;
        }
    }

    analyzeConnectivity(player) {
        const positions = this.gameCore.getPlayerPositions(player);
        
        if (positions.length < 2) return 0;
        
        let connectivity = 0;
        let totalPairs = 0;
        
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const distance = Math.max(
                    Math.abs(positions[i].row - positions[j].row),
                    Math.abs(positions[i].col - positions[j].col)
                );
                
                if (distance <= 3) {
                    connectivity += (4 - distance) / 3;
                }
                totalPairs++;
            }
        }
        
        return totalPairs > 0 ? (connectivity / totalPairs) * 100 : 0;
    }

    getGamePhase() {
        const totalMoves = this.gameCore.moveCount;
        const boardSize = this.gameCore.size * this.gameCore.size;
        const progress = totalMoves / boardSize;
        
        if (progress < 0.15) return 'opening';
        if (progress < 0.4) return 'early_middle';
        if (progress < 0.7) return 'late_middle';
        return 'endgame';
    }

    // ========================= ENHANCED EXPORT FORMATS =========================

    createNeuralNetworkTrainingData() {
        if (!this.currentGameData) return null;
        
        const trainingData = {
            gameId: this.gameId,
            boardSize: this.gameCore.size,
            winner: this.currentGameData.winner === 'X' ? -1 : this.currentGameData.winner === 'O' ? 1 : 0,
            totalMoves: this.currentGameData.moves.length,
            winType: this.currentGameData.winType,
            gameMode: this.currentGameData.gameMode,
            exportType: "neural_network_training",
            
            // Enhanced metadata
            gameCharacteristics: {
                averageMoveTime: this.calculateAverageMoveTime(),
                gameComplexity: this.calculateGameComplexity(),
                playerStrengths: this.estimatePlayerStrengths(),
                gameBalance: this.calculateGameBalance()
            },
            
            // Training positions with enhanced features
            positions: this.currentGameData.moves.map((move, index) => {
                const input = move.boardStateBefore.slice(); // Copy board state
                
                // Add contextual features
                input.push(move.player === 'X' ? -1 : 1); // Current player
                input.push(move.moveNumber / 100.0); // Normalized move number
                
                // Enhanced output with training features
                const output = {
                    moveIndex: move.position.row * this.gameCore.size + move.position.col,
                    moveType: move.moveType || 'normal',
                    player: move.player === 'X' ? -1 : 1,
                    gameOutcome: this.currentGameData.winner === 'X' ? -1 : this.currentGameData.winner === 'O' ? 1 : 0,
                    moveNumber: move.moveNumber,
                    confidence: this.calculateMoveConfidence(move, index)
                };
                
                // Add enhanced features if available
                if (move.enhancedFeatures && this.trainingMode) {
                    output.enhancedFeatures = move.enhancedFeatures;
                }
                
                return { input, output };
            })
        };
        
        return trainingData;
    }

    calculateAverageMoveTime() {
        const moveTimes = this.currentGameData.moves
            .filter(move => move.enhancedFeatures?.positionAnalysis?.timeSpent)
            .map(move => move.enhancedFeatures.positionAnalysis.timeSpent);
        
        return moveTimes.length > 0 ? 
            moveTimes.reduce((sum, time) => sum + time, 0) / moveTimes.length : 0;
    }

    calculateGameComplexity() {
        // Simplified complexity measure based on move count and alternatives
        const totalMoves = this.currentGameData.moves.length;
        const averageAlternatives = this.currentGameData.moves
            .filter(move => move.enhancedFeatures?.alternatives)
            .reduce((sum, move) => sum + move.enhancedFeatures.alternatives.length, 0) / totalMoves;
        
        return Math.min(100, totalMoves * 2 + averageAlternatives * 5);
    }

    estimatePlayerStrengths() {
        // Estimate player strengths based on move quality
        const playerStrengths = { X: 50, O: 50 };
        
        for (const move of this.currentGameData.moves) {
            if (move.enhancedFeatures?.positionAnalysis?.moveQuality) {
                const quality = move.enhancedFeatures.positionAnalysis.moveQuality;
                playerStrengths[move.player] = (playerStrengths[move.player] + quality) / 2;
            }
        }
        
        return playerStrengths;
    }

    calculateGameBalance() {
        // Measure how balanced/competitive the game was
        const xMoves = this.currentGameData.moves.filter(m => m.player === 'X').length;
        const oMoves = this.currentGameData.moves.filter(m => m.player === 'O').length;
        const balance = Math.min(xMoves, oMoves) / Math.max(xMoves, oMoves);
        
        return balance;
    }

    calculateMoveConfidence(move, index) {
        let confidence = 0.5; // Base confidence
        
        // Higher confidence for later moves (more certain about outcome)
        confidence += (index / this.currentGameData.moves.length) * 0.3;
        
        // Adjust based on move quality if available
        if (move.enhancedFeatures?.positionAnalysis?.moveQuality) {
            const quality = move.enhancedFeatures.positionAnalysis.moveQuality / 100;
            confidence = (confidence + quality) / 2;
        }
        
        return Math.max(0.1, Math.min(0.95, confidence));
    }

    // ========================= EXISTING METHODS (Enhanced) =========================

    finishGameRecording(winner, winType, winPath = null) {
        if (!this.isRecording || !this.currentGameData) return;

        this.currentGameData.winner = winner;
        this.currentGameData.winType = winType;
        this.currentGameData.winPath = winPath;
        this.currentGameData.endTime = new Date().toISOString();
        this.currentGameData.gameMetadata.duration = Date.now() - this.gameStartTime.getTime();
        this.currentGameData.gameMetadata.totalMoves = this.currentGameData.moves.length;
        this.currentGameData.gameMetadata.finalBoardState = this.captureBoardState();
        
        // Enhanced final analysis for training mode
        if (this.trainingMode) {
            this.currentGameData.gameMetadata.finalAnalysis = {
                gameComplexity: this.calculateGameComplexity(),
                averageMoveQuality: this.calculateAverageMoveQuality(),
                strategicDepth: this.calculateStrategicDepth(),
                gameCharacteristics: this.analyzeGameCharacteristics()
            };
        }

        // Handle surrender information
        if (winType === 'surrender') {
            const surrenderMove = this.currentGameData.moves.find(m => m.moveType === 'surrender');
            if (surrenderMove) {
                this.currentGameData.gameMetadata.surrenderingPlayer = surrenderMove.player;
                this.currentGameData.gameMetadata.surrenderAtMove = surrenderMove.moveNumber;
            }
        }

        this.isRecording = false;
        
        console.log(`🏁 Finished recording enhanced game: ${this.gameId}`);
        console.log(`   Winner: ${winner} (${winType}), Duration: ${this.currentGameData.gameMetadata.duration}ms`);
        if (this.trainingMode) {
            console.log(`🎓 Training data: ${this.currentGameData.moves.length} moves with enhanced features`);
        }
        
        this.updateRecordingUI(false);
        this.showExportOptions();
        this.updateExportStatus();
    }

    calculateAverageMoveQuality() {
        const qualityScores = this.currentGameData.moves
            .filter(move => move.enhancedFeatures?.positionAnalysis?.moveQuality)
            .map(move => move.enhancedFeatures.positionAnalysis.moveQuality);
        
        return qualityScores.length > 0 ? 
            qualityScores.reduce((sum, quality) => sum + quality, 0) / qualityScores.length : 50;
    }

    calculateStrategicDepth() {
        // Measure based on move variety and strategic complexity
        const moveTypes = new Set(this.currentGameData.moves
            .filter(move => move.enhancedFeatures?.moveClassification)
            .map(move => move.enhancedFeatures.moveClassification.category)
        );
        
        return moveTypes.size * 20; // More variety = higher strategic depth
    }

    analyzeGameCharacteristics() {
        const moves = this.currentGameData.moves;
        
        return {
            tacticalMoves: moves.filter(m => 
                m.enhancedFeatures?.moveClassification?.category === 'offensive' ||
                m.enhancedFeatures?.moveClassification?.category === 'defensive'
            ).length,
            positionalMoves: moves.filter(m => 
                m.enhancedFeatures?.moveClassification?.category === 'positional'
            ).length,
            openingLength: moves.filter(m => 
                m.enhancedFeatures?.moveClassification?.category === 'opening'
            ).length,
            hasComplexPatterns: this.detectComplexPatterns(),
            gameStyle: this.determineGameStyle()
        };
    }

    detectComplexPatterns() {
        // Detect if game had complex strategic patterns
        const threatLevels = this.currentGameData.moves
            .filter(move => move.enhancedFeatures?.positionAnalysis?.threatLevel)
            .map(move => Math.abs(move.enhancedFeatures.positionAnalysis.threatLevel));
        
        const avgThreatLevel = threatLevels.length > 0 ? 
            threatLevels.reduce((sum, level) => sum + level, 0) / threatLevels.length : 0;
        
        return avgThreatLevel > 20; // Arbitrary threshold for "complex"
    }

    determineGameStyle() {
        const moveCategories = this.currentGameData.moves
            .filter(move => move.enhancedFeatures?.moveClassification?.category)
            .map(move => move.enhancedFeatures.moveClassification.category);
        
        const categoryCounts = {};
        moveCategories.forEach(category => {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        const dominantCategory = Object.keys(categoryCounts).reduce((a, b) => 
            categoryCounts[a] > categoryCounts[b] ? a : b, 'positional'
        );
        
        return dominantCategory + '_dominant';
    }

    // ========================= ENHANCED EXPORT METHODS =========================

    createFullExport() {
        const baseExport = {
            ...this.currentGameData,
            exportedAt: new Date().toISOString(),
            exportType: "full_enhanced",
            description: "Complete game data with enhanced training features"
        };
        
        // Add training-specific exports if in training mode
        if (this.trainingMode) {
            baseExport.neuralNetworkData = this.createNeuralNetworkTrainingData();
            baseExport.trainingMetrics = this.calculateTrainingMetrics();
        }
        
        return baseExport;
    }

    createTrainingDataExport() {
        const neuralNetworkData = this.createNeuralNetworkTrainingData();
        
        if (!neuralNetworkData) {
            console.warn('No neural network data available');
            return null;
        }
        
        return neuralNetworkData;
    }

    calculateTrainingMetrics() {
        if (!this.trainingMode || !this.currentGameData) return null;
        
        return {
            dataQuality: this.assessDataQuality(),
            featureCompleteness: this.assessFeatureCompleteness(),
            strategicComplexity: this.calculateStrategicDepth(),
            trainingValue: this.calculateTrainingValue()
        };
    }

    assessDataQuality() {
        const moves = this.currentGameData.moves;
        const validMoves = moves.filter(move => 
            move.position && 
            move.boardStateBefore && 
            move.player
        );
        
        return (validMoves.length / moves.length) * 100;
    }

    assessFeatureCompleteness() {
        const moves = this.currentGameData.moves;
        const enhancedMoves = moves.filter(move => move.enhancedFeatures);
        
        return (enhancedMoves.length / moves.length) * 100;
    }

    calculateTrainingValue() {
        // Composite score for training value
        let value = 50; // Base value
        
        // Game length bonus
        const gameLength = this.currentGameData.moves.length;
        if (gameLength >= 20 && gameLength <= 80) value += 20;
        
        // Balance bonus
        const balance = this.calculateGameBalance();
        value += balance * 20;
        
        // Quality bonus
        const avgQuality = this.calculateAverageMoveQuality();
        value += (avgQuality - 50) * 0.3;
        
        // Feature completeness bonus
        const completeness = this.assessFeatureCompleteness();
        value += (completeness - 50) * 0.2;
        
        return Math.max(0, Math.min(100, value));
    }

    // ========================= UTILITY METHODS =========================

    captureBoardState() {
        const boardState = [];
        
        // Flatten board to 1D array with numerical encoding
        for (let row = 0; row < this.gameCore.size; row++) {
            for (let col = 0; col < this.gameCore.size; col++) {
                const cellValue = this.gameCore.board[row][col];
                let numericValue;
                
                switch (cellValue) {
                    case 'X': numericValue = -1; break;
                    case 'O': numericValue = 1; break;
                    default: numericValue = 0; break;
                }
                
                boardState.push(numericValue);
            }
        }
        
        return boardState;
    }

    generateGameId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `game_${timestamp}_${random}`;
    }

    getPlayerName(player) {
        // Try to get actual player names from the UI
        const nicknameElement = document.getElementById('playerNickname');
        const nickname = nicknameElement ? nicknameElement.value : '';
        
        if (nickname && window.game?.multiplayerManager?.isConnected) {
            // Online game
            const gameInfo = window.game.multiplayerManager.getGameInfo();
            if (gameInfo.playerRole === player) {
                return nickname;
            } else {
                return gameInfo.opponentNickname || `Opponent_${player}`;
            }
        } else {
            // Local game - distinguish training mode
            if (this.trainingMode) {
                return player === 'X' ? 'TrainingPlayer_X' : 'TrainingPlayer_O';
            }
            return player === 'X' ? 'Player_X' : 'Player_O';
        }
    }

    getGameMode() {
        if (window.game) {
            return window.game.gameMode || 'local';
        }
        return 'local';
    }

    getAIDifficulty() {
        try {
            const aiDifficultyElement = document.getElementById('aiDifficulty');
            return aiDifficultyElement ? aiDifficultyElement.value : 'medium';
        } catch (error) {
            return 'medium';
        }
    }

    downloadAsJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    // ========================= UI METHODS (Enhanced) =========================

    updateRecordingUI(isRecording) {
        // Update recording indicator
        let indicator = document.getElementById('recording-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'recording-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }

        if (isRecording) {
            const modeText = this.trainingMode ? '🎓 TRAINING MODE' : '🔴 RECORDING';
            indicator.textContent = modeText;
            indicator.style.background = this.trainingMode ? 
                'rgba(0, 150, 255, 0.1)' : 'rgba(255, 0, 0, 0.1)';
            indicator.style.color = this.trainingMode ? '#0096ff' : '#ff0000';
            indicator.style.border = this.trainingMode ? 
                '2px solid #0096ff' : '2px solid #ff0000';
        } else {
            indicator.textContent = '⚫ NOT RECORDING';
            indicator.style.background = 'rgba(128, 128, 128, 0.1)';
            indicator.style.color = '#666666';
            indicator.style.border = '2px solid #666666';
        }
    }

    updateExportStatus() {
        const statusElement = document.getElementById('exportStatus');
        if (!statusElement) return;

        const currentMoves = this.currentGameData ? this.currentGameData.moves.length : 0;
        const storedCount = this.storedGames.length;
        const totalPositions = this.storedGames.reduce((sum, game) => sum + game.moves.length, 0);

        if (this.isRecording) {
            const modeIndicator = this.trainingMode ? '🎓' : '🔴';
            statusElement.innerHTML = `${modeIndicator} Recording: ${currentMoves} moves<br>📁 ${storedCount} games stored (${totalPositions} positions)`;
        } else {
            statusElement.innerHTML = `📁 ${storedCount} games stored (${totalPositions} positions)<br>💡 Ready to record${this.trainingMode ? ' (Training Mode)' : ''}`;
        }
    }

    showExportOptions() {
        // Show the export modal with current game data
        const modal = document.getElementById('exportModal');
        if (modal) {
            // Update modal content
            document.getElementById('modalGameId').textContent = this.gameId;
            document.getElementById('modalWinner').textContent = this.currentGameData.winner;
            document.getElementById('modalMoves').textContent = this.currentGameData.moves.length;
            document.getElementById('modalDuration').textContent = Math.round(this.currentGameData.gameMetadata.duration / 1000) + 's';
            
            // Add training mode indicator
            const modalTitle = modal.querySelector('h2');
            if (modalTitle && this.trainingMode) {
                modalTitle.textContent = '🎓 Training Game Recorded Successfully!';
            }
            
            // Show modal
            modal.style.display = 'flex';
        }
    }

    // ========================= PUBLIC API =========================

    // Enhanced public methods for training
    onGameStart() {
        if (this.isRecording) {
            this.startGameRecording();
        }
    }

    onMove(moveData) {
        this.recordMove(moveData);
    }

    onGameEnd(winner, winType, winPath) {
        this.finishGameRecording(winner, winType, winPath);
    }

    startNewGame() {
        if (this.isRecording) {
            this.startGameRecording();
        }
    }

    // Enhanced controls
    startRecording() {
        if (!this.isRecording) {
            this.startGameRecording();
        }
    }

    stopRecording() {
        if (this.isRecording) {
            this.finishGameRecording('manual_stop', 'incomplete');
        }
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
            return false;
        } else {
            this.startRecording();
            return true;
        }
    }

    // Enhanced export methods
    exportCurrentGame() {
        if (!this.currentGameData) {
            alert('No game data to export');
            return;
        }

        const exports = {
            fullData: this.createFullExport(),
            trainingData: this.createTrainingDataExport(),
            summary: this.createSummaryExport()
        };

        // Download files
        this.downloadAsJSON(exports.fullData, `game_full_${this.gameId}.json`);
        
        if (exports.trainingData) {
            this.downloadAsJSON(exports.trainingData, `game_training_${this.gameId}.json`);
        }
        
        this.downloadAsJSON(exports.summary, `game_summary_${this.gameId}.json`);

        console.log('📦 Exported enhanced game data');
        if (this.trainingMode) {
            console.log('🎓 Training data export includes enhanced features');
        }
    }

    exportAllGames() {
        if (this.storedGames.length === 0) {
            alert('No stored games to export');
            return;
        }

        // Create enhanced batch training dataset
        const batchTrainingData = {
            exportedAt: new Date().toISOString(),
            totalGames: this.storedGames.length,
            boardSize: this.gameCore.size,
            trainingMode: this.trainingMode,
            games: this.storedGames.map(game => this.convertToTrainingFormat(game)),
            statistics: this.calculateBatchStatistics(this.storedGames),
            exportType: "batch_training_enhanced"
        };

        this.downloadAsJSON(batchTrainingData, `batch_training_${this.storedGames.length}_games.json`);
        
        console.log(`📦 Exported enhanced batch of ${this.storedGames.length} games for training`);
    }

    convertToTrainingFormat(gameData) {
        // Enhanced conversion for neural network training
        const trainingGame = {
            gameId: gameData.gameId,
            winner: gameData.winner === 'X' ? -1 : gameData.winner === 'O' ? 1 : 0,
            totalMoves: gameData.moves.length,
            winType: gameData.winType,
            gameMode: gameData.gameMode,
            trainingValue: gameData.gameMetadata?.finalAnalysis?.trainingValue || 50,
            
            positions: gameData.moves.map((move, index) => {
                const input = move.boardStateBefore.slice();
                input.push(move.player === 'X' ? -1 : 1);
                input.push(move.moveNumber / 100.0);
                
                const output = {
                    moveIndex: move.position.row * this.gameCore.size + move.position.col,
                    moveType: move.moveType || 'normal',
                    player: move.player === 'X' ? -1 : 1,
                    gameOutcome: gameData.winner === 'X' ? -1 : gameData.winner === 'O' ? 1 : 0,
                    moveNumber: move.moveNumber,
                    confidence: this.calculateMoveConfidence(move, index)
                };
                
                // Include enhanced features if available
                if (move.enhancedFeatures && this.trainingMode) {
                    output.enhancedFeatures = move.enhancedFeatures;
                }
                
                return { input, output };
            })
        };
        
        return trainingGame;
    }

    calculateBatchStatistics(games) {
        const stats = {
            totalGames: games.length,
            xWins: games.filter(g => g.winner === 'X').length,
            oWins: games.filter(g => g.winner === 'O').length,
            draws: games.filter(g => g.winner !== 'X' && g.winner !== 'O').length,
            averageMoves: games.reduce((sum, g) => sum + g.moves.length, 0) / games.length,
            averageDuration: games.reduce((sum, g) => sum + (g.gameMetadata?.duration || 0), 0) / games.length,
            totalPositions: games.reduce((sum, g) => sum + g.moves.length, 0),
            enhancedGames: games.filter(g => g.gameMetadata?.trainingMode).length
        };

        stats.winRate = {
            X: (stats.xWins / stats.totalGames * 100).toFixed(1) + '%',
            O: (stats.oWins / stats.totalGames * 100).toFixed(1) + '%'
        };

        if (this.trainingMode) {
            stats.trainingQuality = {
                averageGameValue: games
                    .filter(g => g.gameMetadata?.finalAnalysis?.trainingValue)
                    .reduce((sum, g) => sum + g.gameMetadata.finalAnalysis.trainingValue, 0) / 
                    games.filter(g => g.gameMetadata?.finalAnalysis?.trainingValue).length || 50,
                
                enhancedDataCoverage: (stats.enhancedGames / stats.totalGames * 100).toFixed(1) + '%'
            };
        }

        return stats;
    }

    createSummaryExport() {
        const summary = {
            gameId: this.gameId,
            boardSize: this.gameCore.size,
            players: this.currentGameData.players,
            winner: this.currentGameData.winner,
            winType: this.currentGameData.winType,
            totalMoves: this.currentGameData.moves.length,
            duration: this.currentGameData.gameMetadata.duration,
            gameMode: this.currentGameData.gameMode,
            startTime: this.currentGameData.startTime,
            endTime: this.currentGameData.endTime,
            exportType: "summary_enhanced"
        };
        
        // Add training-specific summary data
        if (this.trainingMode && this.currentGameData.gameMetadata.finalAnalysis) {
            summary.trainingAnalysis = this.currentGameData.gameMetadata.finalAnalysis;
        }
        
        return summary;
    }

    saveCurrentGame() {
        if (!this.currentGameData) return;

        this.storedGames.push(this.currentGameData);
        
        console.log(`💾 Saved enhanced game ${this.gameId} to storage`);
        this.updateExportStatus();
    }

    clearAllGames() {
        if (confirm('Are you sure you want to clear all stored games?')) {
            this.storedGames = [];
            this.updateExportStatus();
            console.log('🗑️ Cleared all stored games');
        }
    }

    getStatus() {
        return {
            isRecording: this.isRecording,
            trainingMode: this.trainingMode,
            currentGameId: this.gameId,
            storedGamesCount: this.storedGames.length,
            currentMoves: this.currentGameData ? this.currentGameData.moves.length : 0,
            totalPositions: this.storedGames.reduce((sum, game) => sum + game.moves.length, 0),
            enhancedGames: this.storedGames.filter(g => g.gameMetadata?.trainingMode).length
        };
    }
}

// Export for use in other modules
window.GameExportManager = GameExportManager;