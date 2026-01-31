// model-storage.js - IndexedDB persistence for neural network models

class ModelStorage {
    constructor(options = {}) {
        this.modelName = options.modelName || 'connection-game-ai';
        this.storageKey = `indexeddb://${this.modelName}`;
        this.metadataKey = `${this.modelName}-metadata`;

        console.log('ModelStorage initialized');
    }

    /**
     * Save model to IndexedDB
     * @param {tf.Sequential} model
     * @param {Object} metadata - Optional metadata (training history, etc.)
     * @returns {Promise<boolean>}
     */
    async saveModel(model, metadata = {}) {
        if (typeof tf === 'undefined') {
            console.error('TensorFlow.js not loaded');
            return false;
        }

        try {
            // Save model to IndexedDB
            await model.save(this.storageKey);

            // Save metadata to localStorage
            const fullMetadata = {
                savedAt: new Date().toISOString(),
                modelName: this.modelName,
                ...metadata
            };

            localStorage.setItem(this.metadataKey, JSON.stringify(fullMetadata));

            console.log('Model saved to IndexedDB');
            return true;

        } catch (error) {
            console.error('Failed to save model:', error);
            return false;
        }
    }

    /**
     * Load model from IndexedDB
     * @returns {Promise<tf.Sequential|null>}
     */
    async loadModel() {
        if (typeof tf === 'undefined') {
            console.error('TensorFlow.js not loaded');
            return null;
        }

        try {
            const model = await tf.loadLayersModel(this.storageKey);
            console.log('Model loaded from IndexedDB');

            // Re-compile model after loading
            model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            return model;

        } catch (error) {
            console.log('No saved model found or failed to load:', error.message);
            return null;
        }
    }

    /**
     * Get model metadata
     * @returns {Object|null}
     */
    getMetadata() {
        try {
            const data = localStorage.getItem(this.metadataKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Delete saved model
     * @returns {Promise<boolean>}
     */
    async deleteModel() {
        try {
            // Delete from IndexedDB
            if (typeof tf !== 'undefined') {
                await tf.io.removeModel(this.storageKey);
            }

            // Delete metadata
            localStorage.removeItem(this.metadataKey);

            console.log('Model deleted');
            return true;

        } catch (error) {
            console.error('Failed to delete model:', error);
            return false;
        }
    }

    /**
     * Check if a saved model exists
     * @returns {Promise<boolean>}
     */
    async modelExists() {
        if (typeof tf === 'undefined') {
            return false;
        }

        try {
            const models = await tf.io.listModels();
            return this.storageKey in models;
        } catch (error) {
            return false;
        }
    }

    /**
     * Export model as downloadable files
     * @param {tf.Sequential} model
     * @param {string} filename
     */
    async exportModel(model, filename = 'neural-ai-model') {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }

        try {
            // Save as downloadable files
            await model.save(`downloads://${filename}`);
            console.log('Model exported as download');

        } catch (error) {
            console.error('Failed to export model:', error);
            throw error;
        }
    }

    /**
     * Import model from uploaded files
     * @param {File[]} files - model.json and weight files
     * @returns {Promise<tf.Sequential>}
     */
    async importModel(files) {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }

        try {
            // Find the JSON file
            const jsonFile = files.find(f => f.name.endsWith('.json'));
            if (!jsonFile) {
                throw new Error('No model.json file found');
            }

            // Find weight files
            const weightFiles = files.filter(f => f.name.endsWith('.bin'));

            // Load model from files
            const model = await tf.loadLayersModel(
                tf.io.browserFiles([jsonFile, ...weightFiles])
            );

            // Re-compile model
            model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            console.log('Model imported successfully');
            return model;

        } catch (error) {
            console.error('Failed to import model:', error);
            throw error;
        }
    }

    /**
     * List all saved models
     * @returns {Promise<Object>}
     */
    async listModels() {
        if (typeof tf === 'undefined') {
            return {};
        }

        try {
            return await tf.io.listModels();
        } catch (error) {
            return {};
        }
    }

    /**
     * Get model info (size, architecture)
     * @param {tf.Sequential} model
     * @returns {Object}
     */
    getModelInfo(model) {
        if (!model) return null;

        let totalParams = 0;
        const layers = [];

        for (const layer of model.layers) {
            const config = layer.getConfig();
            const weights = layer.getWeights();
            let layerParams = 0;

            for (const w of weights) {
                layerParams += w.size;
            }

            totalParams += layerParams;
            layers.push({
                name: layer.name,
                type: layer.getClassName(),
                units: config.units,
                params: layerParams
            });
        }

        return {
            totalParams,
            sizeKB: Math.round((totalParams * 4) / 1024),
            layers
        };
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.ModelStorage = ModelStorage;
    window.modelStorage = new ModelStorage();
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelStorage;
}

console.log('ModelStorage loaded');
