// game-ai-enhanced.js - ENHANCED VERSION: Neural Network AI with Advanced Training Features
// Clean replacement for complex rule-based AI system with self-play and training capabilities

class EnhancedConnectionGameAI {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.difficulty = 'medium';
        this.aiPlayer = 'O';
        this.humanPlayer = 'X';
        
        // Neural Network components
        this.neuralNetwork = null;
        this.isNeuralNetworkLoaded = false;
        this.modelPath = null;
        
        // Enhanced training features
        this.trainingMode = false;
        this.selfPlayMode = false;
        this.moveEvaluationCache = new Map();
        this.positionAnalysisCache = new Map();
        
        // Performance tracking
        this.moveHistory = [];
        this.isThinking = false;
        this.moveGenerationStats = {
            neuralNetworkMoves: 0,
            heuristicMoves: 0,
            averageThinkingTime: 0,
            totalMoves: 0
        };
        
        // Enhanced AI features
        this.enablePositionAnalysis = true;
        this.enableMoveAlternatives = true;
        this.enableGamePhaseAwareness = true;
        this.collectTrainingData = false;
        
        console.log('🧠 Enhanced AI with Neural Network and Training Features initialized');
        console.log('🎯 Features: Neural Network + Advanced Heuristics + Self-Play + Training Data Collection');
        
        // Try to auto-load neural network if available
        this.autoLoadNeuralNetwork();
    }

    // ========================= NEURAL NETWORK MANAGEMENT =========================

    async autoLoadNeuralNetwork() {
        // Try common model paths
        const commonPaths = [
            './models/connection-game-model.json',
            './connection-game-model.json',
            '/models/connection-game-model.json',
            'models/connection-game-model.json'
        ];

        for (const path of commonPaths) {
            try {
                await this.loadNeuralNetwork(path);
                if (this.isNeuralNetworkLoaded) {
                    console.log(`✅ Auto-loaded neural network from: ${path}`);
                    break;
                }
            } catch (error) {
                // Silently continue to next path
                continue;
            }
        }

        if (!this.isNeuralNetworkLoaded) {
            console.log('⚠️ Neural network not found, using enhanced heuristics');
            console.log('💡 To enable neural network: train a model and place it at ./models/connection-game-model.json');
        }
    }

    async loadNeuralNetwork(modelPath) {
        try {
            if (typeof tf === 'undefined') {
                console.warn('❌ TensorFlow.js not loaded. Include: <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"></script>');
                return false;
            }

            console.log(`📥 Loading neural network from: ${modelPath}`);
            
            this.neuralNetwork = await tf.loadLayersModel(modelPath);
            this.isNeuralNetworkLoaded = true;
            this.modelPath = modelPath;
            
            const params = this.neuralNetwork.countParams();
            console.log(`✅ Neural network loaded: ${params.toLocaleString()} parameters`);
            
            // Verify model input/output shapes
            this.verifyModelArchitecture();
            
            return true;
            
        } catch (error) {
            console.warn(`⚠️ Failed to load neural network: ${error.message}`);
            this.isNeuralNetworkLoaded = false;
            return false;
        }
    }

    verifyModelArchitecture() {
        try {
            const inputShape = this.neuralNetwork.inputs[0].shape;
            const outputShapes = this.neuralNetwork.outputs.map(output => output.shape);
            
            console.log(`🔍 Model architecture verified:`);
            console.log(`   Input shape: [${inputShape.join(', ')}]`);
            console.log(`   Output shapes: [${outputShapes.map(shape => shape.join(', ')).join('], [')}]`);
            
            // Expected: input [batch, 227], outputs [batch, 225] and [batch, 1]
            const expectedInputSize = this.gameCore.size * this.gameCore.size + 2; // 225 + 2 = 227
            const expectedOutputSize = this.gameCore.size * this.gameCore.size; // 225
            
            if (inputShape[1] !== expectedInputSize) {
                console.warn(`⚠️ Input shape mismatch: expected ${expectedInputSize}, got ${inputShape[1]}`);
            }
            
            if (outputShapes[0][1] !== expectedOutputSize) {
                console.warn(`⚠️ Policy output shape mismatch: expected ${expectedOutputSize}, got ${outputShapes[0][1]}`);
            }
            
        } catch (error) {
            console.warn('Could not verify model architecture:', error);
        }
    }

    // ========================= ENHANCED AI DECISION MAKING =========================

    getBestMove(difficulty = this.difficulty) {
        this.isThinking = true;
        const startTime = Date.now();
        
        try {
            console.log(`\n=== ENHANCED AI MOVE (${this.isNeuralNetworkLoaded ? 'Neural Network' : 'Heuristic'}) ===`);
            
            // 1. Check for immediate win/loss (highest priority)
            const immediateMove = this.checkImmediateWinLoss();
            if (immediateMove) {
                console.log(`⚡ Immediate: ${immediateMove.reason}`);
                return this.finalizeMove(immediateMove, startTime);
            }

            // 2. Try neural network if available
            if (this.isNeuralNetworkLoaded) {
                const neuralMove = this.getNeuralNetworkMove(difficulty);
                if (neuralMove) {
                    console.log(`🧠 Neural Network: (${neuralMove.row},${neuralMove.col}) confidence: ${neuralMove.confidence.toFixed(3)}`);
                    this.moveGenerationStats.neuralNetworkMoves++;
                    return this.finalizeMove(neuralMove, startTime);
                }
            }

            // 3. Enhanced heuristic fallback
            const heuristicMove = this.getEnhancedHeuristicMove(difficulty);
            console.log(`🎯 Enhanced Heuristic: ${heuristicMove.reason}`);
            this.moveGenerationStats.heuristicMoves++;
            return this.finalizeMove(heuristicMove, startTime);

        } catch (error) {
            console.error('❌ AI error:', error);
            return this.finalizeMove(this.getRandomMove(), startTime);
        } finally {
            this.isThinking = false;
        }
    }

    // ========================= NEURAL NETWORK PREDICTION =========================

    getNeuralNetworkMove(difficulty) {
        try {
            // Prepare enhanced board input
            const boardInput = this.prepareEnhancedBoardInput();
            
            // Get neural network predictions
            const predictions = this.neuralNetwork.predict(boardInput);
            
            // Handle both single output (policy only) and dual output (policy + value)
            let policyOutput, valueOutput;
            if (Array.isArray(predictions)) {
                policyOutput = predictions[0]; // Move probabilities
                valueOutput = predictions[1];   // Position evaluation
            } else {
                policyOutput = predictions;     // Single policy output
                valueOutput = null;
            }
            
            // Select move based on policy and difficulty
            const selectedMove = this.selectMoveFromPolicy(policyOutput, difficulty);
            
            // Add enhanced analysis
            if (valueOutput) {
                const positionValue = valueOutput.dataSync()[0];
                selectedMove.positionValue = positionValue;
                selectedMove.reason = `Neural Network (pos eval: ${positionValue.toFixed(3)})`;
            } else {
                selectedMove.reason = 'Neural Network';
            }
            
            // Add move alternatives for training
            if (this.enableMoveAlternatives) {
                selectedMove.alternatives = this.generateMoveAlternatives(policyOutput);
            }
            
            // Cleanup tensors
            boardInput.dispose();
            policyOutput.dispose();
            if (valueOutput) valueOutput.dispose();
            
            return selectedMove;
            
        } catch (error) {
            console.error('Neural network prediction error:', error);
            return null;
        }
    }

    prepareEnhancedBoardInput() {
        // Convert current board state to neural network input with enhanced features
        const input = [];
        
        // 1. Basic board encoding (225 values: -1 for X, 1 for O, 0 for empty)
        for (let row = 0; row < this.gameCore.size; row++) {
            for (let col = 0; col < this.gameCore.size; col++) {
                const cell = this.gameCore.board[row][col];
                let value;
                switch (cell) {
                    case 'X': value = -1; break;
                    case 'O': value = 1; break;
                    default: value = 0; break;
                }
                input.push(value);
            }
        }

        // 2. Current player (1 value)
        input.push(this.gameCore.currentPlayer === 'O' ? 1 : -1);
        
        // 3. Game progress (1 value: normalized move count)
        input.push(this.gameCore.moveCount / 100.0);
        
        // Total: 225 + 1 + 1 = 227 features
        
        // Convert to tensor (batch size 1)
        return tf.tensor2d([input], [1, input.length]);
    }

    selectMoveFromPolicy(policyTensor, difficulty) {
        // Get policy probabilities
        const policyData = policyTensor.dataSync();
        
        // Filter valid moves and add enhanced scoring
        const validMoves = [];
        for (let i = 0; i < this.gameCore.size * this.gameCore.size; i++) {
            const row = Math.floor(i / this.gameCore.size);
            const col = i % this.gameCore.size;
            
            if (this.gameCore.isValidMove(row, col)) {
                const move = {
                    row: row,
                    col: col,
                    index: i,
                    probability: policyData[i],
                    strategicValue: this.enablePositionAnalysis ? 
                        this.calculateStrategicValue(row, col, this.aiPlayer) : 0
                };
                
                // Combine neural network probability with strategic analysis
                move.combinedScore = move.probability * 0.8 + (move.strategicValue / 100) * 0.2;
                
                validMoves.push(move);
            }
        }

        if (validMoves.length === 0) {
            return this.getRandomMove();
        }

        // Sort by combined score (highest first)
        validMoves.sort((a, b) => b.combinedScore - a.combinedScore);

        // Apply difficulty-based selection with enhanced randomization
        let selectedMove;
        
        switch (difficulty) {
            case 'easy':
                // 20% best move, 80% random from top 10
                if (Math.random() < 0.2) {
                    selectedMove = validMoves[0];
                } else {
                    const topMoves = validMoves.slice(0, Math.min(10, validMoves.length));
                    selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
                }
                break;
                
            case 'medium':
                // 60% best move, 40% random from top 5
                if (Math.random() < 0.6) {
                    selectedMove = validMoves[0];
                } else {
                    const topMoves = validMoves.slice(0, Math.min(5, validMoves.length));
                    selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
                }
                break;
                
            case 'hard':
                // 90% best move, 10% second best
                if (Math.random() < 0.9 || validMoves.length === 1) {
                    selectedMove = validMoves[0];
                } else {
                    selectedMove = validMoves[1];
                }
                break;
                
            default:
                selectedMove = validMoves[0];
        }

        return {
            row: selectedMove.row,
            col: selectedMove.col,
            confidence: selectedMove.probability,
            strategicValue: selectedMove.strategicValue,
            combinedScore: selectedMove.combinedScore,
            value: selectedMove.combinedScore * 100,
            alternatives: validMoves.slice(0, 3) // Top 3 alternatives for analysis
        };
    }

    generateMoveAlternatives(policyTensor) {
        const policyData = policyTensor.dataSync();
        const alternatives = [];
        
        // Get top 5 moves by neural network probability
        const moveScores = [];
        for (let i = 0; i < this.gameCore.size * this.gameCore.size; i++) {
            const row = Math.floor(i / this.gameCore.size);
            const col = i % this.gameCore.size;
            
            if (this.gameCore.isValidMove(row, col)) {
                moveScores.push({
                    row: row,
                    col: col,
                    probability: policyData[i],
                    index: i
                });
            }
        }
        
        moveScores.sort((a, b) => b.probability - a.probability);
        
        return moveScores.slice(0, 5).map(move => ({
            row: move.row,
            col: move.col,
            probability: move.probability,
            reason: 'Neural network alternative'
        }));
    }

    // ========================= ENHANCED HEURISTIC FALLBACK =========================

    getEnhancedHeuristicMove(difficulty) {
        console.log(`🎯 Using enhanced heuristics (difficulty: ${difficulty})`);
        
        // Progressive strategy based on difficulty
        if (difficulty === 'hard') {
            return this.getAdvancedStrategicMove() || this.getRandomMove();
        } else if (difficulty === 'medium') {
            return this.getBasicStrategicMove() || this.getRandomMove();
        } else {
            return this.getSimpleMove() || this.getRandomMove();
        }
    }

    getAdvancedStrategicMove() {
        // 1. Critical threat blocking
        const criticalBlock = this.findCriticalBlockingMove();
        if (criticalBlock) return criticalBlock;
        
        // 2. Winning move creation
        const winningMove = this.findWinningMove();
        if (winningMove) return winningMove;
        
        // 3. Advanced pattern recognition
        const patternMove = this.findPatternBasedMove();
        if (patternMove) return patternMove;
        
        // 4. Strategic positioning
        const strategicMove = this.findStrategicPositioningMove();
        if (strategicMove) return strategicMove;
        
        // 5. Enhanced progress move
        const progressMove = this.findEnhancedProgressMove();
        if (progressMove) return progressMove;
        
        return null;
    }

    getBasicStrategicMove() {
        // Basic strategic play
        const blockMove = this.findBasicBlockingMove();
        if (blockMove) return blockMove;
        
        const progressMove = this.findBasicProgressMove();
        if (progressMove) return progressMove;
        
        const centerMove = this.findCenterMove();
        if (centerMove) return centerMove;
        
        return null;
    }

    getSimpleMove() {
        // Very simple: basic progress or random
        const progressMove = this.findBasicProgressMove();
        if (progressMove && Math.random() < 0.7) {
            return progressMove;
        }
        
        return null;
    }

    // ========================= ENHANCED STRATEGIC ANALYSIS =========================

    findCriticalBlockingMove() {
        const opponentPositions = this.gameCore.getPlayerPositions(this.humanPlayer);
        
        for (const pos of opponentPositions) {
            // Check if opponent is close to winning
            const distanceToGoal = this.humanPlayer === 'X' 
                ? Math.min(pos.row, this.gameCore.size - 1 - pos.row)
                : Math.min(pos.col, this.gameCore.size - 1 - pos.col);
            
            if (distanceToGoal <= 2) {
                // Try to block adjacent to this threatening piece
                const blockingMoves = this.getAdjacentPositions(pos);
                for (const blockPos of blockingMoves) {
                    if (this.gameCore.isValidMove(blockPos.row, blockPos.col)) {
                        const blockValue = this.evaluateBlockingStrength(blockPos, pos);
                        return {
                            row: blockPos.row,
                            col: blockPos.col,
                            value: 85 + blockValue,
                            reason: `Critical block of ${this.humanPlayer} threat`
                        };
                    }
                }
            }
        }
        
        return null;
    }

    findWinningMove() {
        const myPositions = this.gameCore.getPlayerPositions(this.aiPlayer);
        
        // Look for immediate winning opportunities
        for (const pos of myPositions) {
            const adjacentMoves = this.getAdjacentPositions(pos);
            for (const adjPos of adjacentMoves) {
                if (this.gameCore.isValidMove(adjPos.row, adjPos.col)) {
                    // Simulate move to check for win
                    if (this.simulateWin(adjPos.row, adjPos.col, this.aiPlayer)) {
                        return {
                            row: adjPos.row,
                            col: adjPos.col,
                            value: 100,
                            reason: 'Winning move!'
                        };
                    }
                }
            }
        }
        
        return null;
    }

    findPatternBasedMove() {
        // Advanced pattern recognition for experienced play
        const patterns = this.analyzeGamePatterns();
        
        if (patterns.threatLevel > 70) {
            return this.findDefensivePatternMove(patterns);
        } else if (patterns.opportunityLevel > 60) {
            return this.findOffensivePatternMove(patterns);
        }
        
        return null;
    }

    analyzeGamePatterns() {
        const myPositions = this.gameCore.getPlayerPositions(this.aiPlayer);
        const opponentPositions = this.gameCore.getPlayerPositions(this.humanPlayer);
        
        return {
            threatLevel: this.calculateThreatLevel(opponentPositions, this.humanPlayer),
            opportunityLevel: this.calculateOpportunityLevel(myPositions, this.aiPlayer),
            connectivityScore: this.calculateConnectivityScore(myPositions),
            controlScore: this.calculateControlScore()
        };
    }

    findDefensivePatternMove(patterns) {
        // Find best defensive move based on pattern analysis
        const defensiveMoves = this.generateDefensiveMoves();
        
        if (defensiveMoves.length > 0) {
            const bestDefensive = defensiveMoves.reduce((best, move) => 
                move.defensiveValue > best.defensiveValue ? move : best
            );
            
            return {
                row: bestDefensive.row,
                col: bestDefensive.col,
                value: 75 + bestDefensive.defensiveValue,
                reason: 'Defensive pattern play'
            };
        }
        
        return null;
    }

    findOffensivePatternMove(patterns) {
        // Find best offensive move based on pattern analysis
        const offensiveMoves = this.generateOffensiveMoves();
        
        if (offensiveMoves.length > 0) {
            const bestOffensive = offensiveMoves.reduce((best, move) => 
                move.offensiveValue > best.offensiveValue ? move : best
            );
            
            return {
                row: bestOffensive.row,
                col: bestOffensive.col,
                value: 70 + bestOffensive.offensiveValue,
                reason: 'Offensive pattern play'
            };
        }
        
        return null;
    }

    findStrategicPositioningMove() {
        const emptyPositions = this.gameCore.getEmptyPositions();
        let bestMove = null;
        let bestValue = 0;
        
        for (const pos of emptyPositions.slice(0, 20)) { // Limit for performance
            const strategicValue = this.evaluateStrategicPosition(pos.row, pos.col);
            
            if (strategicValue > bestValue) {
                bestValue = strategicValue;
                bestMove = {
                    row: pos.row,
                    col: pos.col,
                    value: strategicValue,
                    reason: 'Strategic positioning'
                };
            }
        }
        
        return bestMove && bestValue > 50 ? bestMove : null;
    }

    findEnhancedProgressMove() {
        const myPositions = this.gameCore.getPlayerPositions(this.aiPlayer);
        
        if (myPositions.length === 0) {
            // Enhanced opening move selection
            return this.findEnhancedOpeningMove();
        }
        
        // Enhanced extension toward goal
        if (this.aiPlayer === 'O') {
            return this.findEnhancedHorizontalExtension(myPositions);
        } else {
            return this.findEnhancedVerticalExtension(myPositions);
        }
    }

    findEnhancedOpeningMove() {
        const center = Math.floor(this.gameCore.size / 2);
        const gamePhase = this.getGamePhase();
        
        if (this.aiPlayer === 'O') {
            // O: Enhanced horizontal opening
            const openingOptions = [
                { row: center, col: 1, priority: 90 },
                { row: center - 1, col: 1, priority: 85 },
                { row: center + 1, col: 1, priority: 85 },
                { row: center, col: 0, priority: 80 },
                { row: center - 1, col: 0, priority: 75 },
                { row: center + 1, col: 0, priority: 75 }
            ];
            
            for (const option of openingOptions) {
                if (this.gameCore.isValidMove(option.row, option.col)) {
                    return {
                        row: option.row,
                        col: option.col,
                        value: option.priority,
                        reason: 'Enhanced O opening'
                    };
                }
            }
        } else {
            // X: Enhanced vertical opening
            const openingOptions = [
                { row: 1, col: center, priority: 90 },
                { row: 1, col: center - 1, priority: 85 },
                { row: 1, col: center + 1, priority: 85 },
                { row: 0, col: center, priority: 80 },
                { row: 0, col: center - 1, priority: 75 },
                { row: 0, col: center + 1, priority: 75 }
            ];
            
            for (const option of openingOptions) {
                if (this.gameCore.isValidMove(option.row, option.col)) {
                    return {
                        row: option.row,
                        col: option.col,
                        value: option.priority,
                        reason: 'Enhanced X opening'
                    };
                }
            }
        }
        
        return null;
    }

    // ========================= SELF-PLAY TRAINING SYSTEM =========================

    async startSelfPlayTraining(numGames = 100) {
        console.log(`🤖 Starting enhanced self-play training: ${numGames} games`);
        
        this.selfPlayMode = true;
        this.collectTrainingData = true;
        const results = [];
        
        for (let gameNum = 1; gameNum <= numGames; gameNum++) {
            console.log(`🎮 Self-play game ${gameNum}/${numGames}`);
            
            // Reset game
            this.gameCore.resetGame();
            
            // Play full game with enhanced features
            const gameResult = await this.playEnhancedSelfPlayGame(gameNum);
            results.push(gameResult);
            
            // Export game data if export manager is available
            if (window.gameController && window.gameController.exportManager) {
                window.gameController.exportManager.onGameEnd(
                    gameResult.winner, 
                    gameResult.winType
                );
            }
            
            // Progress update
            if (gameNum % 10 === 0) {
                console.log(`✅ Completed ${gameNum} self-play games`);
                this.printSelfPlayProgress(results.slice(-10));
            }
        }
        
        this.selfPlayMode = false;
        this.collectTrainingData = false;
        
        console.log(`🏁 Enhanced self-play training complete!`);
        return this.analyzeSelfPlayResults(results);
    }

    async playEnhancedSelfPlayGame(gameNumber) {
        let moveCount = 0;
        const maxMoves = 200; // Prevent infinite games
        const gameStartTime = Date.now();
        
        // Vary AI strength for diversity
        const difficulties = ['easy', 'medium', 'hard'];
        let xDifficulty = difficulties[gameNumber % 3];
        let oDifficulty = difficulties[(gameNumber + 1) % 3];
        
        while (!this.gameCore.gameOver && moveCount < maxMoves) {
            const currentPlayer = this.gameCore.currentPlayer;
            const difficulty = currentPlayer === 'X' ? xDifficulty : oDifficulty;
            
            // Temporarily set AI player to current player
            const originalAiPlayer = this.aiPlayer;
            this.aiPlayer = currentPlayer;
            
            // Get AI move with specified difficulty
            const move = this.getBestMove(difficulty);
            
            // Restore original AI player
            this.aiPlayer = originalAiPlayer;
            
            if (!move) break;
            
            // Make the move
            const result = this.gameCore.makeMove(move.row, move.col);
            
            if (!result.success) break;
            
            moveCount++;
            
            // Small delay for smoother execution
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        
        const winResult = this.gameCore.checkWin();
        const gameDuration = Date.now() - gameStartTime;
        
        return {
            gameNumber: gameNumber,
            winner: winResult.isWin ? this.determineWinner() : 'draw',
            winType: winResult.type || 'timeout',
            moves: moveCount,
            duration: gameDuration,
            xDifficulty: xDifficulty,
            oDifficulty: oDifficulty,
            gameData: this.gameCore.getGameState()
        };
    }

    determineWinner() {
        // Determine winner based on current game state
        const xWin = this.gameCore.checkWin('X');
        const oWin = this.gameCore.checkWin('O');
        
        if (xWin.isWin) return 'X';
        if (oWin.isWin) return 'O';
        return 'draw';
    }

    printSelfPlayProgress(recentGames) {
        const xWins = recentGames.filter(g => g.winner === 'X').length;
        const oWins = recentGames.filter(g => g.winner === 'O').length;
        const draws = recentGames.filter(g => g.winner === 'draw').length;
        const avgMoves = recentGames.reduce((sum, g) => sum + g.moves, 0) / recentGames.length;
        
        console.log(`📊 Recent 10 games: X=${xWins}, O=${oWins}, Draws=${draws}, Avg moves=${avgMoves.toFixed(1)}`);
    }

    analyzeSelfPlayResults(results) {
        const analysis = {
            totalGames: results.length,
            xWins: results.filter(g => g.winner === 'X').length,
            oWins: results.filter(g => g.winner === 'O').length,
            draws: results.filter(g => g.winner === 'draw').length,
            averageMoves: results.reduce((sum, g) => sum + g.moves, 0) / results.length,
            averageDuration: results.reduce((sum, g) => sum + g.duration, 0) / results.length,
            gamesByDifficulty: this.analyzeGamesByDifficulty(results),
            qualityMetrics: this.calculateGameQualityMetrics(results)
        };
        
        analysis.balance = Math.min(analysis.xWins, analysis.oWins) / Math.max(analysis.xWins, analysis.oWins);
        
        console.log('🎯 Self-play analysis:', analysis);
        return analysis;
    }

    analyzeGamesByDifficulty(results) {
        const byDifficulty = {};
        
        for (const game of results) {
            const key = `${game.xDifficulty}_vs_${game.oDifficulty}`;
            if (!byDifficulty[key]) {
                byDifficulty[key] = { games: 0, xWins: 0, oWins: 0, draws: 0 };
            }
            
            byDifficulty[key].games++;
            if (game.winner === 'X') byDifficulty[key].xWins++;
            else if (game.winner === 'O') byDifficulty[key].oWins++;
            else byDifficulty[key].draws++;
        }
        
        return byDifficulty;
    }

    calculateGameQualityMetrics(results) {
        return {
            gameCompletionRate: results.filter(g => g.winner !== 'draw').length / results.length,
            averageGameLength: results.reduce((sum, g) => sum + g.moves, 0) / results.length,
            gameLengthVariance: this.calculateVariance(results.map(g => g.moves)),
            balanceScore: this.calculateBalanceScore(results)
        };
    }

    calculateVariance(numbers) {
        const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
        const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
        return variance;
    }

    calculateBalanceScore(results) {
        const xWins = results.filter(g => g.winner === 'X').length;
        const oWins = results.filter(g => g.winner === 'O').length;
        
        if (xWins === 0 && oWins === 0) return 1;
        return Math.min(xWins, oWins) / Math.max(xWins, oWins);
    }

    // ========================= ENHANCED POSITION EVALUATION =========================

    evaluateStrategicPosition(row, col) {
        let value = 0;
        
        // Basic position value
        value += this.calculateStrategicValue(row, col, this.aiPlayer);
        
        // Enhanced connectivity analysis
        value += this.evaluateConnectivityPotential(row, col);
        
        // Threat analysis
        value += this.evaluateThreatPotential(row, col);
        
        // Goal progress analysis
        value += this.evaluateGoalProgress(row, col);
        
        // Game phase considerations
        value += this.evaluateGamePhaseValue(row, col);
        
        return value;
    }

    calculateStrategicValue(row, col, player) {
        let value = 0;
        
        // Center preference with distance weighting
        const center = Math.floor(this.gameCore.size / 2);
        const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center);
        value += Math.max(25 - distanceFromCenter * 2, 0);
        
        // Goal alignment bonus
        if (player === 'X') {
            // X prefers central columns for vertical connection
            const distanceFromCenterCol = Math.abs(col - center);
            value += Math.max(20 - distanceFromCenterCol * 3, 0);
        } else {
            // O prefers central rows for horizontal connection
            const distanceFromCenterRow = Math.abs(row - center);
            value += Math.max(20 - distanceFromCenterRow * 3, 0);
        }
        
        // Edge connection bonus
        if (player === 'X' && (row === 0 || row === this.gameCore.size - 1)) {
            value += 15;
        } else if (player === 'O' && (col === 0 || col === this.gameCore.size - 1)) {
            value += 15;
        }
        
        return value;
    }

    evaluateConnectivityPotential(row, col) {
        const myPositions = this.gameCore.getPlayerPositions(this.aiPlayer);
        let connectivity = 0;
        
        for (const pos of myPositions) {
            const distance = Math.abs(row - pos.row) + Math.abs(col - pos.col);
            if (distance <= 3) {
                connectivity += (4 - distance) * 5;
            }
        }
        
        return connectivity;
    }

    evaluateThreatPotential(row, col) {
        let threatValue = 0;
        
        // Check if this position creates threats
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1], // Orthogonal
            [-1, -1], [-1, 1], [1, -1], [1, 1] // Diagonal
        ];
        
        for (const [dr, dc] of directions) {
            const lineStrength = this.evaluateLineStrength(row, col, dr, dc, this.aiPlayer);
            threatValue += lineStrength;
        }
        
        return threatValue;
    }

    evaluateLineStrength(row, col, dr, dc, player) {
        let strength = 0;
        let consecutive = 1; // The piece we're placing
        
        // Check forward direction
        let r = row + dr, c = col + dc;
        while (this.gameCore.isValidPosition(r, c) && this.gameCore.board[r][c] === player) {
            consecutive++;
            r += dr;
            c += dc;
        }
        
        // Check backward direction
        r = row - dr;
        c = col - dc;
        while (this.gameCore.isValidPosition(r, c) && this.gameCore.board[r][c] === player) {
            consecutive++;
            r -= dr;
            c -= dc;
        }
        
        // Strength increases exponentially with consecutive pieces
        if (consecutive >= 2) {
            strength = Math.pow(consecutive, 2) * 3;
        }
        
        return strength;
    }

    evaluateGoalProgress(row, col) {
        const myPositions = this.gameCore.getPlayerPositions(this.aiPlayer);
        
        if (myPositions.length === 0) return 20; // First move bonus
        
        if (this.aiPlayer === 'X') {
            // Evaluate vertical progress improvement
            const currentMinRow = Math.min(...myPositions.map(p => p.row));
            const currentMaxRow = Math.max(...myPositions.map(p => p.row));
            const currentSpan = currentMaxRow - currentMinRow + 1;
            
            const newMinRow = Math.min(row, currentMinRow);
            const newMaxRow = Math.max(row, currentMaxRow);
            const newSpan = newMaxRow - newMinRow + 1;
            
            return (newSpan - currentSpan) * 15;
        } else {
            // Evaluate horizontal progress improvement
            const currentMinCol = Math.min(...myPositions.map(p => p.col));
            const currentMaxCol = Math.max(...myPositions.map(p => p.col));
            const currentSpan = currentMaxCol - currentMinCol + 1;
            
            const newMinCol = Math.min(col, currentMinCol);
            const newMaxCol = Math.max(col, currentMaxCol);
            const newSpan = newMaxCol - newMinCol + 1;
            
            return (newSpan - currentSpan) * 15;
        }
    }

    evaluateGamePhaseValue(row, col) {
        if (!this.enableGamePhaseAwareness) return 0;
        
        const gamePhase = this.getGamePhase();
        
        switch (gamePhase) {
            case 'opening':
                return this.evaluateOpeningValue(row, col);
            case 'midgame':
                return this.evaluateMidgameValue(row, col);
            case 'endgame':
                return this.evaluateEndgameValue(row, col);
            default:
                return 0;
        }
    }

    evaluateOpeningValue(row, col) {
        // Opening: prefer central positions and edge connections
        const center = Math.floor(this.gameCore.size / 2);
        const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center);
        
        if (distanceFromCenter <= 3) return 10;
        return 0;
    }

    evaluateMidgameValue(row, col) {
        // Midgame: prefer connectivity and strategic positioning
        return this.evaluateConnectivityPotential(row, col) * 0.5;
    }

    evaluateEndgameValue(row, col) {
        // Endgame: prefer aggressive goal-oriented moves
        return this.evaluateGoalProgress(row, col) * 1.5;
    }

    getGamePhase() {
        const moveCount = this.gameCore.moveCount;
        const totalCells = this.gameCore.size * this.gameCore.size;
        const progress = moveCount / totalCells;
        
        if (progress < 0.2) return 'opening';
        if (progress < 0.6) return 'midgame';
        return 'endgame';
    }

    // ========================= ENHANCED UTILITY METHODS =========================

    calculateThreatLevel(positions, player) {
        let threatLevel = 0;
        
        for (const pos of positions) {
            const distanceToGoal = player === 'X' 
                ? Math.min(pos.row, this.gameCore.size - 1 - pos.row)
                : Math.min(pos.col, this.gameCore.size - 1 - pos.col);
            
            threatLevel += Math.max(20 - distanceToGoal * 4, 0);
        }
        
        return threatLevel;
    }

    calculateOpportunityLevel(positions, player) {
        let opportunityLevel = 0;
        
        // Calculate based on connectivity and goal progress
        const connectivity = this.calculateConnectivityScore(positions);
        const goalProgress = this.calculateGoalProgressScore(positions, player);
        
        opportunityLevel = connectivity * 0.6 + goalProgress * 0.4;
        
        return opportunityLevel;
    }

    calculateConnectivityScore(positions) {
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

    calculateGoalProgressScore(positions, player) {
        if (positions.length === 0) return 0;
        
        if (player === 'X') {
            const minRow = Math.min(...positions.map(p => p.row));
            const maxRow = Math.max(...positions.map(p => p.row));
            return ((maxRow - minRow + 1) / this.gameCore.size) * 100;
        } else {
            const minCol = Math.min(...positions.map(p => p.col));
            const maxCol = Math.max(...positions.map(p => p.col));
            return ((maxCol - minCol + 1) / this.gameCore.size) * 100;
        }
    }

    calculateControlScore() {
        const center = Math.floor(this.gameCore.size / 2);
        const myPositions = this.gameCore.getPlayerPositions(this.aiPlayer);
        const opponentPositions = this.gameCore.getPlayerPositions(this.humanPlayer);
        
        let myControl = 0;
        let opponentControl = 0;
        
        // Calculate center control
        for (const pos of myPositions) {
            const distanceFromCenter = Math.abs(pos.row - center) + Math.abs(pos.col - center);
            myControl += Math.max(10 - distanceFromCenter, 0);
        }
        
        for (const pos of opponentPositions) {
            const distanceFromCenter = Math.abs(pos.row - center) + Math.abs(pos.col - center);
            opponentControl += Math.max(10 - distanceFromCenter, 0);
        }
        
        return myControl - opponentControl;
    }

    // ========================= HELPER METHODS =========================

    generateDefensiveMoves() {
        const opponentPositions = this.gameCore.getPlayerPositions(this.humanPlayer);
        const defensiveMoves = [];
        
        for (const pos of opponentPositions) {
            const adjacentPositions = this.getAdjacentPositions(pos);
            for (const adjPos of adjacentPositions) {
                if (this.gameCore.isValidMove(adjPos.row, adjPos.col)) {
                    const defensiveValue = this.evaluateBlockingStrength(adjPos, pos);
                    defensiveMoves.push({
                        row: adjPos.row,
                        col: adjPos.col,
                        defensiveValue: defensiveValue
                    });
                }
            }
        }
        
        return defensiveMoves;
    }

    generateOffensiveMoves() {
        const myPositions = this.gameCore.getPlayerPositions(this.aiPlayer);
        const offensiveMoves = [];
        
        for (const pos of myPositions) {
            const adjacentPositions = this.getAdjacentPositions(pos);
            for (const adjPos of adjacentPositions) {
                if (this.gameCore.isValidMove(adjPos.row, adjPos.col)) {
                    const offensiveValue = this.evaluateOffensiveStrength(adjPos, pos);
                    offensiveMoves.push({
                        row: adjPos.row,
                        col: adjPos.col,
                        offensiveValue: offensiveValue
                    });
                }
            }
        }
        
        return offensiveMoves;
    }

    evaluateBlockingStrength(blockPos, threatPos) {
        let strength = 10; // Base blocking value
        
        // Higher value for blocking near edges (goal areas)
        if (this.humanPlayer === 'X') {
            const distanceToEdge = Math.min(threatPos.row, this.gameCore.size - 1 - threatPos.row);
            strength += Math.max(20 - distanceToEdge * 5, 0);
        } else {
            const distanceToEdge = Math.min(threatPos.col, this.gameCore.size - 1 - threatPos.col);
            strength += Math.max(20 - distanceToEdge * 5, 0);
        }
        
        return strength;
    }

    evaluateOffensiveStrength(movePos, fromPos) {
        let strength = 10; // Base offensive value
        
        // Higher value for moves toward goal
        if (this.aiPlayer === 'X') {
            // Vertical progress
            const verticalProgress = Math.abs(movePos.row - fromPos.row);
            strength += verticalProgress * 5;
        } else {
            // Horizontal progress
            const horizontalProgress = Math.abs(movePos.col - fromPos.col);
            strength += horizontalProgress * 5;
        }
        
        return strength;
    }

    simulateWin(row, col, player) {
        // Temporarily make the move and check for win
        this.gameCore.board[row][col] = player;
        const wins = this.gameCore.checkWin(player).isWin;
        this.gameCore.board[row][col] = ''; // Restore
        
        return wins;
    }

    getAdjacentPositions(centerPos) {
        const adjacent = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dr, dc] of directions) {
            const newRow = centerPos.row + dr;
            const newCol = centerPos.col + dc;
            
            if (this.gameCore.isValidPosition(newRow, newCol)) {
                adjacent.push({ row: newRow, col: newCol });
            }
        }
        
        return adjacent;
    }

    // ========================= EXISTING FALLBACK METHODS =========================

    findBasicBlockingMove() {
        const opponentPositions = this.gameCore.getPlayerPositions(this.humanPlayer);
        
        if (opponentPositions.length >= 2) {
            const avgPos = this.calculateAveragePosition(opponentPositions);
            const blockingCandidates = this.getAdjacentPositions(avgPos);
            
            for (const candidate of blockingCandidates) {
                if (this.gameCore.isValidMove(candidate.row, candidate.col)) {
                    return {
                        row: candidate.row,
                        col: candidate.col,
                        value: 50,
                        reason: 'Basic blocking move'
                    };
                }
            }
        }
        
        return null;
    }

    findBasicProgressMove() {
        const myPositions = this.gameCore.getPlayerPositions(this.aiPlayer);
        
        if (myPositions.length === 0) {
            // First move: center area
            const center = Math.floor(this.gameCore.size / 2);
            const options = [
                { row: center, col: center },
                { row: center - 1, col: center },
                { row: center + 1, col: center },
                { row: center, col: center - 1 },
                { row: center, col: center + 1 }
            ];
            
            for (const option of options) {
                if (this.gameCore.isValidMove(option.row, option.col)) {
                    return { ...option, value: 40, reason: 'Basic opening move' };
                }
            }
        }
        
        // Connect to existing pieces
        for (const pos of myPositions) {
            const adjacent = this.getAdjacentPositions(pos);
            for (const adjPos of adjacent) {
                if (this.gameCore.isValidMove(adjPos.row, adjPos.col)) {
                    return {
                        row: adjPos.row,
                        col: adjPos.col,
                        value: 35,
                        reason: 'Basic connection move'
                    };
                }
            }
        }
        
        return null;
    }

    findCenterMove() {
        const center = Math.floor(this.gameCore.size / 2);
        const centerPositions = [
            { row: center, col: center },
            { row: center - 1, col: center },
            { row: center + 1, col: center },
            { row: center, col: center - 1 },
            { row: center, col: center + 1 }
        ];
        
        for (const pos of centerPositions) {
            if (this.gameCore.isValidMove(pos.row, pos.col)) {
                return {
                    row: pos.row,
                    col: pos.col,
                    value: 30,
                    reason: 'Control center'
                };
            }
        }
        
        return null;
    }

    findEnhancedHorizontalExtension(positions) {
        const leftmost = Math.min(...positions.map(p => p.col));
        const rightmost = Math.max(...positions.map(p => p.col));
        
        // Enhanced left extension
        if (leftmost > 0) {
            for (const pos of positions) {
                if (pos.col === leftmost) {
                    const extensionOptions = [
                        { row: pos.row, col: pos.col - 1, priority: 80 },
                        { row: pos.row - 1, col: pos.col - 1, priority: 70 },
                        { row: pos.row + 1, col: pos.col - 1, priority: 70 }
                    ];
                    
                    for (const option of extensionOptions) {
                        if (this.gameCore.isValidMove(option.row, option.col)) {
                            return {
                                row: option.row,
                                col: option.col,
                                value: option.priority,
                                reason: 'Enhanced horizontal left extension'
                            };
                        }
                    }
                }
            }
        }
        
        // Enhanced right extension
        if (rightmost < this.gameCore.size - 1) {
            for (const pos of positions) {
                if (pos.col === rightmost) {
                    const extensionOptions = [
                        { row: pos.row, col: pos.col + 1, priority: 80 },
                        { row: pos.row - 1, col: pos.col + 1, priority: 70 },
                        { row: pos.row + 1, col: pos.col + 1, priority: 70 }
                    ];
                    
                    for (const option of extensionOptions) {
                        if (this.gameCore.isValidMove(option.row, option.col)) {
                            return {
                                row: option.row,
                                col: option.col,
                                value: option.priority,
                                reason: 'Enhanced horizontal right extension'
                            };
                        }
                    }
                }
            }
        }
        
        return null;
    }

    findEnhancedVerticalExtension(positions) {
        const topmost = Math.min(...positions.map(p => p.row));
        const bottommost = Math.max(...positions.map(p => p.row));
        
        // Enhanced upward extension
        if (topmost > 0) {
            for (const pos of positions) {
                if (pos.row === topmost) {
                    const extensionOptions = [
                        { row: pos.row - 1, col: pos.col, priority: 80 },
                        { row: pos.row - 1, col: pos.col - 1, priority: 70 },
                        { row: pos.row - 1, col: pos.col + 1, priority: 70 }
                    ];
                    
                    for (const option of extensionOptions) {
                        if (this.gameCore.isValidMove(option.row, option.col)) {
                            return {
                                row: option.row,
                                col: option.col,
                                value: option.priority,
                                reason: 'Enhanced vertical upward extension'
                            };
                        }
                    }
                }
            }
        }
        
        // Enhanced downward extension
        if (bottommost < this.gameCore.size - 1) {
            for (const pos of positions) {
                if (pos.row === bottommost) {
                    const extensionOptions = [
                        { row: pos.row + 1, col: pos.col, priority: 80 },
                        { row: pos.row + 1, col: pos.col - 1, priority: 70 },
                        { row: pos.row + 1, col: pos.col + 1, priority: 70 }
                    ];
                    
                    for (const option of extensionOptions) {
                        if (this.gameCore.isValidMove(option.row, option.col)) {
                            return {
                                row: option.row,
                                col: option.col,
                                value: option.priority,
                                reason: 'Enhanced vertical downward extension'
                            };
                        }
                    }
                }
            }
        }
        
        return null;
    }

    // ========================= IMMEDIATE WIN/LOSS DETECTION =========================

    checkImmediateWinLoss() {
        const emptyPositions = this.gameCore.getEmptyPositions();
        
        // Check for immediate wins
        for (const pos of emptyPositions) {
            if (this.moveWins(pos.row, pos.col, this.aiPlayer)) {
                return {
                    row: pos.row,
                    col: pos.col,
                    value: 1000,
                    reason: 'WINNING MOVE'
                };
            }
        }
        
        // Check for blocking opponent wins
        for (const pos of emptyPositions) {
            if (this.moveWins(pos.row, pos.col, this.humanPlayer)) {
                return {
                    row: pos.row,
                    col: pos.col,
                    value: 900,
                    reason: 'BLOCK OPPONENT WIN'
                };
            }
        }
        
        return null;
    }

    moveWins(row, col, player) {
        if (!this.gameCore.isValidMove(row, col)) return false;
        
        // Simulate move
        this.gameCore.board[row][col] = player;
        const wins = this.gameCore.checkWin && this.gameCore.checkWin(player).isWin;
        this.gameCore.board[row][col] = ''; // Restore
        
        return wins;
    }

    // ========================= RANDOM MOVE FALLBACK =========================

    getRandomMove() {
        const emptyPositions = this.gameCore.getEmptyPositions();
        
        if (emptyPositions.length === 0) {
            console.log('AI: No empty positions available!');
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * emptyPositions.length);
        const selectedMove = emptyPositions[randomIndex];
        
        console.log(`AI: Selected random move (${selectedMove.row}, ${selectedMove.col})`);
        return {
            row: selectedMove.row,
            col: selectedMove.col,
            value: 1,
            confidence: 0.1,
            reason: 'Random fallback move'
        };
    }

    calculateAveragePosition(positions) {
        const avgRow = positions.reduce((sum, p) => sum + p.row, 0) / positions.length;
        const avgCol = positions.reduce((sum, p) => sum + p.col, 0) / positions.length;
        
        return {
            row: Math.round(avgRow),
            col: Math.round(avgCol)
        };
    }

    // ========================= MOVE FINALIZATION =========================

    finalizeMove(move, startTime) {
        const thinkingTime = Date.now() - startTime;
        
        // Update performance statistics
        this.moveGenerationStats.totalMoves++;
        this.moveGenerationStats.averageThinkingTime = 
            (this.moveGenerationStats.averageThinkingTime * (this.moveGenerationStats.totalMoves - 1) + thinkingTime) / 
            this.moveGenerationStats.totalMoves;
        
        // Record move in history with enhanced data
        this.moveHistory.push({
            move: this.gameCore.moveCount + 1,
            position: { row: move.row, col: move.col },
            reason: move.reason || 'Unknown',
            value: move.value || 0,
            confidence: move.confidence || 0,
            source: this.isNeuralNetworkLoaded ? 'neural_network' : 'heuristic',
            thinkingTime: thinkingTime,
            strategicValue: move.strategicValue || 0,
            gamePhase: this.getGamePhase(),
            alternatives: move.alternatives || []
        });
        
        return move;
    }

    // ========================= PUBLIC API =========================

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        console.log(`🎛️ Enhanced AI difficulty set to: ${difficulty}`);
    }

    setAiPlayer(player) {
        this.aiPlayer = player;
        this.humanPlayer = player === 'X' ? 'O' : 'X';
        console.log(`🤖 Enhanced AI playing as: ${this.aiPlayer}`);
    }

    async reloadNeuralNetwork(modelPath = this.modelPath) {
        if (modelPath) {
            const success = await this.loadNeuralNetwork(modelPath);
            return success;
        }
        return false;
    }

    activateTrainingMode() {
        this.trainingMode = true;
        this.collectTrainingData = true;
        this.enablePositionAnalysis = true;
        this.enableMoveAlternatives = true;
        console.log('🎓 Enhanced AI training mode activated');
    }

    deactivateTrainingMode() {
        this.trainingMode = false;
        this.collectTrainingData = false;
        console.log('🎓 Enhanced AI training mode deactivated');
    }

    getStatus() {
        return {
            aiType: this.isNeuralNetworkLoaded ? 'Enhanced Neural Network' : 'Enhanced Heuristic',
            difficulty: this.difficulty,
            aiPlayer: this.aiPlayer,
            neuralNetworkLoaded: this.isNeuralNetworkLoaded,
            modelPath: this.modelPath,
            totalMoves: this.moveHistory.length,
            trainingMode: this.trainingMode,
            selfPlayMode: this.selfPlayMode,
            averageThinkingTime: this.moveGenerationStats.averageThinkingTime,
            performanceStats: this.moveGenerationStats
        };
    }

    getAnalysis() {
        const recentMoves = this.moveHistory.slice(-10);
        const neuralMoves = recentMoves.filter(m => m.source === 'neural_network').length;
        const heuristicMoves = recentMoves.filter(m => m.source === 'heuristic').length;
        
        return {
            aiType: this.isNeuralNetworkLoaded ? 'Enhanced Neural Network AI' : 'Enhanced Heuristic AI',
            description: this.isNeuralNetworkLoaded 
                ? 'Advanced neural network with enhanced heuristic fallback and self-play training'
                : 'Advanced strategic heuristics with position analysis and pattern recognition',
            
            features: this.isNeuralNetworkLoaded ? [
                'Neural network move prediction',
                'Enhanced position evaluation',
                'Self-play training capability',
                'Advanced pattern recognition',
                'Game phase awareness',
                'Move alternatives generation',
                'Strategic depth analysis'
            ] : [
                'Advanced strategic heuristics',
                'Enhanced pattern recognition',
                'Sophisticated blocking and progress',
                'Game phase adaptation',
                'Strategic position evaluation',
                'Multiple difficulty levels'
            ],
            
            recentPerformance: {
                totalMoves: this.moveHistory.length,
                neuralNetworkMoves: this.moveGenerationStats.neuralNetworkMoves,
                heuristicMoves: this.moveGenerationStats.heuristicMoves,
                averageThinkingTime: this.moveGenerationStats.averageThinkingTime,
                lastTenMoves: recentMoves.map(m => ({
                    move: m.move,
                    source: m.source,
                    confidence: m.confidence,
                    thinkingTime: m.thinkingTime
                }))
            },
            
            capabilities: {
                selfPlayTraining: true,
                positionAnalysis: this.enablePositionAnalysis,
                moveAlternatives: this.enableMoveAlternatives,
                gamePhaseAwareness: this.enableGamePhaseAwareness,
                trainingDataCollection: this.collectTrainingData
            },
            
            recommendations: this.isNeuralNetworkLoaded ? [
                'Neural network is active with enhanced features',
                'Use self-play training to generate high-quality data',
                'Monitor performance statistics for optimization',
                'Consider retraining with collected self-play data'
            ] : [
                'Enhanced heuristics provide strong strategic play',
                'Use self-play training to collect diverse game data',
                'Train neural network with collected data',
                'Enable training mode for data collection'
            ]
        };
    }

    getGameHistory() {
        return {
            moves: this.moveHistory,
            statistics: {
                totalMoves: this.moveHistory.length,
                neuralNetworkMoves: this.moveGenerationStats.neuralNetworkMoves,
                heuristicMoves: this.moveGenerationStats.heuristicMoves,
                averageConfidence: this.moveHistory.reduce((sum, m) => sum + (m.confidence || 0), 0) / this.moveHistory.length,
                averageThinkingTime: this.moveGenerationStats.averageThinkingTime,
                strategicDepth: this.calculateAverageStrategicDepth()
            }
        };
    }

    calculateAverageStrategicDepth() {
        const strategicValues = this.moveHistory
            .filter(m => m.strategicValue !== undefined)
            .map(m => m.strategicValue);
        
        return strategicValues.length > 0 ? 
            strategicValues.reduce((sum, v) => sum + v, 0) / strategicValues.length : 0;
    }

    clearHistory() {
        this.moveHistory = [];
        this.moveGenerationStats = {
            neuralNetworkMoves: 0,
            heuristicMoves: 0,
            averageThinkingTime: 0,
            totalMoves: 0
        };
        console.log('🧹 Enhanced AI history cleared');
    }

    // ========================= NEURAL NETWORK CREATION =========================

    static createEnhancedNeuralNetwork(boardSize = 15) {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }
        
        const inputSize = boardSize * boardSize + 2; // Board + current player + move count
        
        // Input layer
        const inputs = tf.input({ shape: [inputSize] });
        
        // Enhanced shared layers with residual connections
        let x = tf.layers.dense({ units: 512, activation: 'relu', name: 'dense_1' }).apply(inputs);
        x = tf.layers.batchNormalization().apply(x);
        x = tf.layers.dropout({ rate: 0.3 }).apply(x);
        
        const residual1 = x;
        x = tf.layers.dense({ units: 512, activation: 'relu', name: 'dense_2' }).apply(x);
        x = tf.layers.batchNormalization().apply(x);
        x = tf.layers.add().apply([x, residual1]); // Residual connection
        x = tf.layers.dropout({ rate: 0.3 }).apply(x);
        
        x = tf.layers.dense({ units: 256, activation: 'relu', name: 'dense_3' }).apply(x);
        x = tf.layers.batchNormalization().apply(x);
        x = tf.layers.dropout({ rate: 0.3 }).apply(x);
        
        x = tf.layers.dense({ units: 128, activation: 'relu', name: 'dense_4' }).apply(x);
        x = tf.layers.batchNormalization().apply(x);
        x = tf.layers.dropout({ rate: 0.2 }).apply(x);
        
        // Policy head (move probabilities)
        const policyHead = tf.layers.dense({ units: 64, activation: 'relu', name: 'policy_dense' }).apply(x);
        const policyOutput = tf.layers.dense({
            units: boardSize * boardSize,
            activation: 'softmax',
            name: 'policy'
        }).apply(policyHead);
        
        // Value head (position evaluation)
        const valueHead = tf.layers.dense({ units: 32, activation: 'relu', name: 'value_dense' }).apply(x);
        const valueOutput = tf.layers.dense({
            units: 1,
            activation: 'tanh',
            name: 'value'
        }).apply(valueHead);
        
        // Create enhanced model
        const model = tf.model({
            inputs: inputs,
            outputs: [policyOutput, valueOutput],
            name: 'enhanced_connection_game_ai'
        });
        
        // Compile with enhanced settings
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: {
                policy: 'categoricalCrossentropy',
                value: 'meanSquaredError'
            },
            lossWeights: {
                policy: 1.0,
                value: 0.5
            },
            metrics: {
                policy: ['accuracy', 'topKCategoricalAccuracy'],
                value: ['mae']
            }
        });
        
        console.log('🏗️ Created enhanced neural network model:');
        model.summary();
        
        return model;
    }
}

// ========================= GLOBAL INITIALIZATION =========================

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    window.EnhancedConnectionGameAI = EnhancedConnectionGameAI;
    console.log('✅ Enhanced Neural Network AI loaded and ready');
    console.log('🎯 Features: Advanced NN + Self-Play + Enhanced Heuristics + Training');
    
    // Provide helpful information
    if (typeof tf === 'undefined') {
        console.log('💡 To enable neural network: Add <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"></script> to your HTML');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedConnectionGameAI;
}