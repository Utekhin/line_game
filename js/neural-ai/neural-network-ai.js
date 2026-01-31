// neural-network-ai.js - Neural network AI player (drop-in replacement for SimpleChainAI)

class NeuralNetworkAI {
    constructor(gameCore, player, options = {}) {
        this.gameCore = gameCore;
        this.player = player; // 'X' or 'O'
        this.boardSize = 15;

        // Neural network components
        this.model = null;
        this.featureExtractor = new FeatureExtractor(this.boardSize);
        this.modelArchitecture = new ModelArchitecture();

        // Fallback AI for edge cases
        this.fallbackAI = null;
        this.useFallback = options.useFallback !== false; // default true

        // Confidence threshold - below this, use fallback
        this.confidenceThreshold = options.confidenceThreshold || 0.15;

        // Opening moves threshold - use fallback for first N moves
        this.openingMovesThreshold = options.openingMovesThreshold || 4;

        // Statistics
        this.stats = {
            neuralMoves: 0,
            fallbackMoves: 0,
            totalMoves: 0,
            avgConfidence: 0
        };

        this.initialized = false;
        this.personalityName = 'Neural Network';

        console.log(`NeuralNetworkAI created for player ${player}`);
    }

    /**
     * Initialize the AI - load or create model
     * @returns {Promise<boolean>}
     */
    async initialize() {
        try {
            // Check if TensorFlow.js is available
            if (typeof tf === 'undefined') {
                console.warn('TensorFlow.js not loaded - using fallback only mode');
                this.initializeFallback();
                this.initialized = true;
                return true;
            }

            // Try to load saved model
            const modelStorage = window.modelStorage;
            if (modelStorage) {
                const loaded = await modelStorage.loadModel();
                if (loaded) {
                    this.model = loaded;
                    console.log('Loaded saved neural network model');
                }
            }

            // Create new model if none loaded
            if (!this.model) {
                this.model = this.modelArchitecture.createModel();
                console.log('Created new neural network model');
            }

            // Initialize fallback AI
            if (this.useFallback) {
                this.initializeFallback();
            }

            this.initialized = true;
            return true;

        } catch (error) {
            console.error('Failed to initialize NeuralNetworkAI:', error);
            this.initializeFallback();
            this.initialized = true;
            return false;
        }
    }

    /**
     * Initialize fallback SimpleChainAI
     */
    initializeFallback() {
        if (typeof SimpleChainAI !== 'undefined') {
            this.fallbackAI = new SimpleChainAI(this.gameCore, this.player, null);
            console.log('Fallback AI (SimpleChainAI) initialized');
        } else {
            console.warn('SimpleChainAI not available for fallback');
        }
    }

    /**
     * Get the next move - main interface method
     * @returns {{row: number, col: number, confidence?: number, source: string, reason: string}}
     */
    getNextMove() {
        this.stats.totalMoves++;

        // Use fallback for opening moves
        const moveCount = this.gameCore.moveCount || 0;
        if (moveCount < this.openingMovesThreshold) {
            return this.getFallbackMove('Opening phase - using heuristics');
        }

        // No model available - use fallback
        if (!this.model) {
            return this.getFallbackMove('No neural model available');
        }

        try {
            // Get neural network prediction
            const prediction = this.predictMove();

            if (!prediction) {
                return this.getFallbackMove('Neural prediction failed');
            }

            // Check confidence threshold
            if (prediction.confidence < this.confidenceThreshold) {
                return this.getFallbackMove(`Low confidence (${(prediction.confidence * 100).toFixed(1)}%)`);
            }

            // Validate the move
            if (!this.gameCore.isValidMove(prediction.row, prediction.col)) {
                return this.getFallbackMove('Neural move invalid');
            }

            // Update stats
            this.stats.neuralMoves++;
            this.updateAvgConfidence(prediction.confidence);

            return {
                row: prediction.row,
                col: prediction.col,
                confidence: prediction.confidence,
                source: 'neural',
                reason: `Neural network (${(prediction.confidence * 100).toFixed(1)}% confidence)`,
                pattern: 'neural'
            };

        } catch (error) {
            console.error('Neural move error:', error);
            return this.getFallbackMove('Neural error: ' + error.message);
        }
    }

    /**
     * Get move from fallback AI
     * @param {string} reason
     * @returns {Object}
     */
    getFallbackMove(reason) {
        this.stats.fallbackMoves++;

        if (this.fallbackAI) {
            const move = this.fallbackAI.getNextMove();
            if (move) {
                move.source = 'fallback';
                move.reason = `Fallback: ${reason} - ${move.reason || 'heuristic'}`;
                return move;
            }
        }

        // Emergency: random valid move
        return this.getRandomValidMove(reason);
    }

    /**
     * Get random valid move as last resort
     * @param {string} reason
     * @returns {Object|null}
     */
    getRandomValidMove(reason) {
        const validMoves = [];

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.gameCore.isValidMove(row, col)) {
                    validMoves.push({ row, col });
                }
            }
        }

        if (validMoves.length === 0) return null;

        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        return {
            row: move.row,
            col: move.col,
            source: 'random',
            reason: `Random fallback: ${reason}`,
            pattern: 'random'
        };
    }

    /**
     * Run neural network inference
     * @returns {{row: number, col: number, confidence: number}|null}
     */
    predictMove() {
        if (!this.model || typeof tf === 'undefined') {
            return null;
        }

        return tf.tidy(() => {
            // Extract features
            const features = this.featureExtractor.extractFeaturesFromGameCore(
                this.gameCore,
                this.player
            );

            // Create input tensor
            const inputTensor = this.featureExtractor.createTensor(features);

            // Run prediction
            const outputTensor = this.model.predict(inputTensor);
            const probabilities = outputTensor.dataSync();

            // Get valid move mask
            const validMask = this.featureExtractor.getValidMoveMask(this.gameCore);

            // Apply mask and find best move
            let bestIdx = -1;
            let bestProb = -1;

            for (let i = 0; i < probabilities.length; i++) {
                if (validMask[i] > 0 && probabilities[i] > bestProb) {
                    bestProb = probabilities[i];
                    bestIdx = i;
                }
            }

            if (bestIdx < 0) {
                return null;
            }

            const position = this.featureExtractor.indexToPosition(bestIdx);

            return {
                row: position.row,
                col: position.col,
                confidence: bestProb
            };
        });
    }

    /**
     * Update running average confidence
     * @param {number} confidence
     */
    updateAvgConfidence(confidence) {
        const n = this.stats.neuralMoves;
        this.stats.avgConfidence = ((this.stats.avgConfidence * (n - 1)) + confidence) / n;
    }

    /**
     * Reset AI state for new game
     */
    reset() {
        this.stats = {
            neuralMoves: 0,
            fallbackMoves: 0,
            totalMoves: 0,
            avgConfidence: 0
        };

        if (this.fallbackAI && typeof this.fallbackAI.reset === 'function') {
            this.fallbackAI.reset();
        }
    }

    /**
     * Set the neural network model
     * @param {tf.Sequential} model
     */
    setModel(model) {
        this.model = model;
        console.log('Neural network model set');
    }

    /**
     * Get AI statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            neuralPercentage: this.stats.totalMoves > 0
                ? (this.stats.neuralMoves / this.stats.totalMoves * 100).toFixed(1) + '%'
                : '0%',
            modelLoaded: !!this.model,
            fallbackAvailable: !!this.fallbackAI
        };
    }

    /**
     * Set gap registry (for fallback AI compatibility)
     * @param {Object} gapRegistry
     */
    setGapRegistry(gapRegistry) {
        if (this.fallbackAI && typeof this.fallbackAI.setGapRegistry === 'function') {
            this.fallbackAI.setGapRegistry(gapRegistry);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.NeuralNetworkAI = NeuralNetworkAI;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeuralNetworkAI;
}

console.log('NeuralNetworkAI loaded');
