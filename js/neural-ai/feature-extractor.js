// feature-extractor.js - Convert board state to tensor for neural network

class FeatureExtractor {
    constructor(boardSize = 15) {
        this.boardSize = boardSize;
        this.totalCells = boardSize * boardSize; // 225
    }

    /**
     * Extract features from board state for a specific player
     * @param {string} boardState - 225-char string (0=empty, 1=X, 2=O)
     * @param {string} currentPlayer - 'X' or 'O'
     * @returns {Float32Array} - Normalized feature array
     */
    extractFeatures(boardState, currentPlayer) {
        const features = new Float32Array(this.totalCells);

        // Normalize: 1 = my pieces, -1 = opponent pieces, 0 = empty
        const myValue = currentPlayer === 'X' ? '1' : '2';
        const oppValue = currentPlayer === 'X' ? '2' : '1';

        for (let i = 0; i < this.totalCells; i++) {
            const cell = boardState[i];
            if (cell === myValue) {
                features[i] = 1.0;
            } else if (cell === oppValue) {
                features[i] = -1.0;
            } else {
                features[i] = 0.0;
            }
        }

        return features;
    }

    /**
     * Extract features from game core directly
     * @param {ConnectionGameCore} gameCore
     * @param {string} currentPlayer - 'X' or 'O'
     * @returns {Float32Array}
     */
    extractFeaturesFromGameCore(gameCore, currentPlayer) {
        const features = new Float32Array(this.totalCells);

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const idx = row * this.boardSize + col;
                const cell = gameCore.board[row][col];

                if (cell === currentPlayer) {
                    features[idx] = 1.0;
                } else if (cell !== '' && cell !== null) {
                    features[idx] = -1.0;
                } else {
                    features[idx] = 0.0;
                }
            }
        }

        return features;
    }

    /**
     * Extract enhanced features with additional context
     * Includes: base board + distance to borders + connectivity hints
     * @param {ConnectionGameCore} gameCore
     * @param {string} currentPlayer
     * @returns {Float32Array} - 225 * 3 = 675 features
     */
    extractEnhancedFeatures(gameCore, currentPlayer) {
        const baseFeatures = this.extractFeaturesFromGameCore(gameCore, currentPlayer);

        // For now, return base features only (225)
        // Can expand to include distance features later
        return baseFeatures;
    }

    /**
     * Create tensor from features (requires TensorFlow.js)
     * @param {Float32Array} features
     * @returns {tf.Tensor2D} - Shape [1, 225]
     */
    createTensor(features) {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }
        return tf.tensor2d(features, [1, this.totalCells]);
    }

    /**
     * Batch create tensors from multiple feature arrays
     * @param {Float32Array[]} featureArrays
     * @returns {tf.Tensor2D} - Shape [batchSize, 225]
     */
    createBatchTensor(featureArrays) {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }

        const batchSize = featureArrays.length;
        const flatData = new Float32Array(batchSize * this.totalCells);

        for (let i = 0; i < batchSize; i++) {
            flatData.set(featureArrays[i], i * this.totalCells);
        }

        return tf.tensor2d(flatData, [batchSize, this.totalCells]);
    }

    /**
     * Convert cell index to row, col
     * @param {number} cellIndex
     * @returns {{row: number, col: number}}
     */
    indexToPosition(cellIndex) {
        return {
            row: Math.floor(cellIndex / this.boardSize),
            col: cellIndex % this.boardSize
        };
    }

    /**
     * Convert row, col to cell index
     * @param {number} row
     * @param {number} col
     * @returns {number}
     */
    positionToIndex(row, col) {
        return row * this.boardSize + col;
    }

    /**
     * Get valid move mask for current board state
     * @param {ConnectionGameCore} gameCore
     * @returns {Float32Array} - 1.0 for valid, 0.0 for invalid
     */
    getValidMoveMask(gameCore) {
        const mask = new Float32Array(this.totalCells);

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const idx = row * this.boardSize + col;
                mask[idx] = gameCore.isValidMove(row, col) ? 1.0 : 0.0;
            }
        }

        return mask;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.FeatureExtractor = FeatureExtractor;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeatureExtractor;
}

console.log('FeatureExtractor loaded');
