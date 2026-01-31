// model-architecture.js - TensorFlow.js neural network model definition

class ModelArchitecture {
    constructor(options = {}) {
        this.inputSize = options.inputSize || 225; // 15x15 board
        this.outputSize = options.outputSize || 225; // probability for each cell
        this.hiddenUnits = options.hiddenUnits || [128, 64];
        this.dropoutRate = options.dropoutRate || 0.3;
        this.learningRate = options.learningRate || 0.001;
    }

    /**
     * Create a new neural network model
     * @returns {tf.Sequential}
     */
    createModel() {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded. Include tf.min.js in your HTML.');
        }

        const model = tf.sequential();

        // Input layer + first hidden layer
        model.add(tf.layers.dense({
            units: this.hiddenUnits[0],
            inputShape: [this.inputSize],
            activation: 'relu',
            kernelInitializer: 'heNormal',
            name: 'hidden1'
        }));

        // Dropout for regularization
        model.add(tf.layers.dropout({
            rate: this.dropoutRate,
            name: 'dropout1'
        }));

        // Second hidden layer
        model.add(tf.layers.dense({
            units: this.hiddenUnits[1],
            activation: 'relu',
            kernelInitializer: 'heNormal',
            name: 'hidden2'
        }));

        // Dropout
        model.add(tf.layers.dropout({
            rate: this.dropoutRate,
            name: 'dropout2'
        }));

        // Output layer - softmax for move probability distribution
        model.add(tf.layers.dense({
            units: this.outputSize,
            activation: 'softmax',
            name: 'output'
        }));

        // Compile model
        model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        console.log('Neural network model created:');
        model.summary();

        return model;
    }

    /**
     * Create a smaller/faster model for quick inference
     * @returns {tf.Sequential}
     */
    createLightModel() {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }

        const model = tf.sequential();

        // Single hidden layer - faster inference
        model.add(tf.layers.dense({
            units: 64,
            inputShape: [this.inputSize],
            activation: 'relu',
            kernelInitializer: 'heNormal',
            name: 'hidden'
        }));

        // Output layer
        model.add(tf.layers.dense({
            units: this.outputSize,
            activation: 'softmax',
            name: 'output'
        }));

        model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        console.log('Light neural network model created:');
        model.summary();

        return model;
    }

    /**
     * Create one-hot encoded label for a move position
     * @param {number} cellIndex - 0-224
     * @returns {Float32Array}
     */
    createOneHotLabel(cellIndex) {
        const label = new Float32Array(this.outputSize);
        label[cellIndex] = 1.0;
        return label;
    }

    /**
     * Create batch of one-hot labels
     * @param {number[]} cellIndices
     * @returns {tf.Tensor2D}
     */
    createLabelTensor(cellIndices) {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }

        const batchSize = cellIndices.length;
        const flatData = new Float32Array(batchSize * this.outputSize);

        for (let i = 0; i < batchSize; i++) {
            flatData[i * this.outputSize + cellIndices[i]] = 1.0;
        }

        return tf.tensor2d(flatData, [batchSize, this.outputSize]);
    }

    /**
     * Get estimated model size in KB
     * @param {tf.Sequential} model
     * @returns {number}
     */
    getModelSizeKB(model) {
        let totalParams = 0;
        for (const layer of model.layers) {
            const weights = layer.getWeights();
            for (const w of weights) {
                totalParams += w.size;
            }
        }
        // Float32 = 4 bytes per parameter
        return Math.round((totalParams * 4) / 1024);
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ModelArchitecture = ModelArchitecture;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelArchitecture;
}

console.log('ModelArchitecture loaded');
