// training-manager.js - In-browser training pipeline for neural network

class TrainingManager {
    constructor(options = {}) {
        this.boardSize = 15;
        this.totalCells = this.boardSize * this.boardSize;

        this.featureExtractor = new FeatureExtractor(this.boardSize);
        this.modelArchitecture = new ModelArchitecture();

        // Training configuration
        this.batchSize = options.batchSize || 32;
        this.epochs = options.epochs || 10;
        this.validationSplit = options.validationSplit || 0.2;
        this.teacherWeight = options.teacherWeight || 2.0; // Weight human moves higher

        // Progress tracking
        this.onProgress = options.onProgress || null;
        this.onEpochEnd = options.onEpochEnd || null;

        console.log('TrainingManager initialized');
    }

    /**
     * Train model from recorded game data
     * @param {tf.Sequential} model - Model to train
     * @param {Object[]} games - Array of recorded games from export
     * @returns {Promise<{history: Object, model: tf.Sequential}>}
     */
    async trainFromGames(model, games) {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }

        console.log(`Training from ${games.length} games...`);

        // Extract training examples from games
        const { inputs, labels, weights } = this.prepareTrainingData(games);

        console.log(`Prepared ${inputs.length} training examples`);

        // Create tensors
        const inputTensor = this.featureExtractor.createBatchTensor(inputs);
        const labelTensor = this.modelArchitecture.createLabelTensor(labels);

        // Create sample weights tensor if we have weighted samples
        let sampleWeights = null;
        if (weights && weights.length > 0) {
            sampleWeights = tf.tensor1d(weights);
        }

        // Training callbacks
        const callbacks = {
            onEpochEnd: (epoch, logs) => {
                console.log(`Epoch ${epoch + 1}/${this.epochs} - loss: ${logs.loss.toFixed(4)}, acc: ${logs.acc.toFixed(4)}`);
                if (this.onEpochEnd) {
                    this.onEpochEnd(epoch, logs);
                }
            },
            onBatchEnd: (batch, logs) => {
                if (this.onProgress) {
                    this.onProgress({ batch, logs });
                }
            }
        };

        // Train the model
        const history = await model.fit(inputTensor, labelTensor, {
            epochs: this.epochs,
            batchSize: this.batchSize,
            validationSplit: this.validationSplit,
            sampleWeight: sampleWeights,
            shuffle: true,
            callbacks: callbacks
        });

        // Cleanup tensors
        inputTensor.dispose();
        labelTensor.dispose();
        if (sampleWeights) {
            sampleWeights.dispose();
        }

        console.log('Training complete!');

        return { history, model };
    }

    /**
     * Prepare training data from recorded games
     * @param {Object[]} games
     * @returns {{inputs: Float32Array[], labels: number[], weights: number[]}}
     */
    prepareTrainingData(games) {
        const inputs = [];
        const labels = [];
        const weights = [];

        for (const game of games) {
            // Only use games with a winner (completed games)
            if (!game.winner) continue;

            for (const move of game.moves) {
                // Get board state before this move
                const boardState = move.boardState;
                if (!boardState || boardState.length !== this.totalCells) continue;

                // Extract features from perspective of player who made the move
                const features = this.featureExtractor.extractFeatures(boardState, move.player);

                // Label is the cell index of the move
                const label = move.cellIndex;

                // Weight: higher for teacher (human) moves, higher for winning player
                let weight = 1.0;

                if (move.source === 'teacher') {
                    weight *= this.teacherWeight;
                }

                // Bonus weight for moves from winning player
                if (move.player === game.winner) {
                    weight *= 1.5;
                }

                inputs.push(features);
                labels.push(label);
                weights.push(weight);
            }
        }

        return { inputs, labels, weights };
    }

    /**
     * Load and parse JSON training data
     * @param {string} jsonData - JSON string from export
     * @returns {Object[]} - Array of games
     */
    parseJSONData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            return data.games || [];
        } catch (error) {
            console.error('Failed to parse training data:', error);
            return [];
        }
    }

    /**
     * Load and parse CSV training data
     * @param {string} csvData
     * @returns {Object[]} - Array of games (reconstructed from CSV rows)
     */
    parseCSVData(csvData) {
        const lines = csvData.split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',');
        const games = new Map();

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseCSVLine(line);
            if (values.length !== headers.length) continue;

            const row = {};
            headers.forEach((h, idx) => {
                row[h.trim()] = values[idx];
            });

            // Group by game_id
            const gameId = row.game_id;
            if (!games.has(gameId)) {
                games.set(gameId, {
                    gameId: gameId,
                    winner: row.winner,
                    moves: []
                });
            }

            games.get(gameId).moves.push({
                moveNumber: parseInt(row.move_number),
                player: row.player,
                row: parseInt(row.row),
                col: parseInt(row.col),
                cellIndex: parseInt(row.cell_index),
                moveType: row.move_type?.replace(/"/g, ''),
                boardState: row.board_state,
                source: row.source || 'ai'
            });
        }

        return Array.from(games.values());
    }

    /**
     * Parse a single CSV line handling quoted values
     * @param {string} line
     * @returns {string[]}
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    }

    /**
     * Train from a file (File API)
     * @param {tf.Sequential} model
     * @param {File} file
     * @returns {Promise<Object>}
     */
    async trainFromFile(model, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    let games;

                    if (file.name.endsWith('.json')) {
                        games = this.parseJSONData(content);
                    } else if (file.name.endsWith('.csv')) {
                        games = this.parseCSVData(content);
                    } else {
                        throw new Error('Unsupported file format. Use .json or .csv');
                    }

                    if (games.length === 0) {
                        throw new Error('No valid games found in file');
                    }

                    const result = await this.trainFromGames(model, games);
                    resolve(result);

                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Quick evaluation of model on test games
     * @param {tf.Sequential} model
     * @param {Object[]} games
     * @returns {Object}
     */
    async evaluateModel(model, games) {
        const { inputs, labels } = this.prepareTrainingData(games);

        if (inputs.length === 0) {
            return { accuracy: 0, samples: 0 };
        }

        const inputTensor = this.featureExtractor.createBatchTensor(inputs);
        const labelTensor = this.modelArchitecture.createLabelTensor(labels);

        const evaluation = model.evaluate(inputTensor, labelTensor);
        const [loss, accuracy] = await Promise.all([
            evaluation[0].data(),
            evaluation[1].data()
        ]);

        inputTensor.dispose();
        labelTensor.dispose();
        evaluation[0].dispose();
        evaluation[1].dispose();

        return {
            loss: loss[0],
            accuracy: accuracy[0],
            samples: inputs.length
        };
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.TrainingManager = TrainingManager;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrainingManager;
}

console.log('TrainingManager loaded');
