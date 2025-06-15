// game-ai-strategies.js - AI Strategy System
// Wraps AI components into complete strategies with different behaviors

// ========================= BASE STRATEGY CLASS =========================

class AIStrategyBase {
    constructor(gameCore, player, config = {}) {
        if (this.constructor === AIStrategyBase) {
            throw new Error('AIStrategyBase is abstract and cannot be instantiated directly');
        }
        
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        this.config = this.mergeConfig(this.getDefaultConfig(), config);
        
        // Strategy metadata
        this.strategyName = 'Base';
        this.strategyDescription = 'Abstract base strategy';
        this.version = '1.0';
        
        // Performance tracking
        this.moveHistory = [];
        this.performanceMetrics = {
            totalMoves: 0,
            successfulMoves: 0,
            blockedMoves: 0,
            defensiveMoves: 0,
            averageThinkTime: 0
        };
        
        this.log(`${this.strategyName} strategy initialized for ${this.player}`);
    }

    // ========================= ABSTRACT INTERFACE =========================

    /**
     * Get the next move for this strategy
     * @returns {Object|null} Move object or null
     */
    getNextMove() {
        throw new Error('getNextMove() must be implemented by strategy subclass');
    }

    /**
     * Reset strategy to initial state
     */
    reset() {
        throw new Error('reset() must be implemented by strategy subclass');
    }

    /**
     * Get strategy statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        throw new Error('getStats() must be implemented by strategy subclass');
    }

    /**
     * Get default configuration for this strategy
     * @returns {Object} Default configuration
     */
    getDefaultConfig() {
        return {
            debugMode: true,
            thinkTimeLimit: 5000, // ms
            aggressiveness: 0.5, // 0.0 = defensive, 1.0 = aggressive
            adaptability: 0.7, // how quickly to adapt to opponent
            riskTolerance: 0.5 // willingness to take risks
        };
    }

    // ========================= COMMON FUNCTIONALITY =========================

    /**
     * Merge default and provided configurations
     */
    mergeConfig(defaultConfig, providedConfig) {
        return { ...defaultConfig, ...providedConfig };
    }

    /**
     * Record a move in the strategy's history
     */
    recordMove(move, outcome) {
        const moveRecord = {
            moveNumber: this.performanceMetrics.totalMoves + 1,
            move: move,
            outcome: outcome,
            timestamp: Date.now(),
            boardState: JSON.parse(JSON.stringify(this.gameCore.board))
        };
        
        this.moveHistory.push(moveRecord);
        this.updatePerformanceMetrics(moveRecord);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(moveRecord) {
        this.performanceMetrics.totalMoves++;
        
        switch (moveRecord.outcome) {
            case 'success':
                this.performanceMetrics.successfulMoves++;
                break;
            case 'blocked':
                this.performanceMetrics.blockedMoves++;
                break;
            case 'defensive':
                this.performanceMetrics.defensiveMoves++;
                break;
        }
    }

    /**
     * Get basic strategy information
     */
    getStrategyInfo() {
        return {
            name: this.strategyName,
            description: this.strategyDescription,
            version: this.version,
            player: this.player,
            config: { ...this.config },
            performance: { ...this.performanceMetrics }
        };
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.config.debugMode) {
            console.log(`[${this.player} ${this.strategyName}] ${message}`);
        }
    }
}

// ========================= CHAIN BUILDING STRATEGY =========================

class ChainStrategy extends AIStrategyBase {
    constructor(gameCore, player, config = {}) {
        super(gameCore, player, config);
        
        this.strategyName = 'Chain';
        this.strategyDescription = 'Builds chains with L/I patterns, handles opponent interference';
        
        // Initialize core AI components
        this.chainAI = new ChainBuildingAI(gameCore, player);
        this.interferenceHandler = new OpponentInterferenceHandler(this.chainAI);
        
        // Strategy-specific configuration
        this.strategyConfig = this.mergeConfig(this.getChainDefaultConfig(), config);
        this.applyConfigToComponents();
        
        // Chain-specific state
        this.currentPhase = 'building'; // 'building', 'gap-filling', 'complete'
        this.adaptiveMode = false; // Enables more defensive play when heavily contested
        
        this.log('Chain strategy fully initialized');
    }

    getChainDefaultConfig() {
        return {
            ...this.getDefaultConfig(),
            prioritizeL: true, // Prefer L-patterns over I-patterns
            edgeConnectionThreshold: 2, // Switch to adjacent when this close to edge
            maxBlockedHeadRetries: 3,
            defensiveThreshold: 0.6, // When to prioritize defensive moves
            gapFillingAggression: 0.8 // How aggressively to fill gaps
        };
    }

    applyConfigToComponents() {
        // Configure chain AI
        this.chainAI.debugMode = this.config.debugMode;
        
        // Configure interference handler
        if (this.interferenceHandler) {
            this.interferenceHandler.maxFallbackAttempts = this.strategyConfig.maxBlockedHeadRetries;
        }
    }

    // ========================= MAIN STRATEGY INTERFACE =========================

    getNextMove() {
        const startTime = Date.now();
        
        try {
            // Update adaptive mode based on game state
            this.updateAdaptiveMode();
            
            // Get move from chain AI with interference handling
            let move = this.getChainMove();
            
            // Apply strategy-level modifications
            if (move) {
                move = this.applyStrategyModifications(move);
            }
            
            // Record performance
            const thinkTime = Date.now() - startTime;
            this.recordThinkTime(thinkTime);
            
            if (move) {
                this.recordMove(move, 'attempted');
                this.log(`Selected move: (${move.row},${move.col}) - ${move.reason}`);
            } else {
                this.log('No move available');
            }
            
            return move;
            
        } catch (error) {
            this.log(`Error in getNextMove: ${error.message}`);
            return null;
        }
    }

    getChainMove() {
        // Check current phase
        this.updateCurrentPhase();
        
        // Handle different phases with strategy modifications
        switch (this.currentPhase) {
            case 'building':
                return this.handleBuildingPhase();
            case 'gap-filling':
                return this.handleGapFillingPhase();
            case 'complete':
                return this.handleCompletePhase();
            default:
                return this.chainAI.getNextMove();
        }
    }

    handleBuildingPhase() {
        let move = this.chainAI.getNextMove();
        
        // Apply strategic modifications based on config
        if (move && this.adaptiveMode) {
            move = this.applyAdaptiveModifications(move);
        }
        
        return move;
    }

    handleGapFillingPhase() {
        let move = this.chainAI.getNextMove();
        
        // More aggressive gap filling if configured
        if (move && this.strategyConfig.gapFillingAggression > 0.7) {
            move.value *= 1.2; // Boost gap filling priority
            move.reason += ' (aggressive gap fill)';
        }
        
        return move;
    }

    handleCompletePhase() {
        // Chain is complete, look for defensive or consolidation moves
        return this.getDefensiveMove() || null;
    }

    // ========================= STRATEGY MODIFICATIONS =========================

    applyStrategyModifications(move) {
        // Apply aggressiveness factor
        if (this.config.aggressiveness > 0.7) {
            // More aggressive play
            move = this.makeMoreAggressive(move);
        } else if (this.config.aggressiveness < 0.3) {
            // More defensive play
            move = this.makeMoreDefensive(move);
        }
        
        // Apply risk tolerance
        if (this.config.riskTolerance < 0.3) {
            move = this.reduceRisk(move);
        }
        
        return move;
    }

    makeMoreAggressive(move) {
        // Boost value for extension moves
        if (move.pattern === 'L' || move.pattern === 'I') {
            move.value *= 1.1;
            move.reason += ' (aggressive boost)';
        }
        
        return move;
    }

    makeMoreDefensive(move) {
        // Check if we should consider defensive alternatives
        const threats = this.gameCore.analyzeOpponentThreats(this.player);
        const highThreats = threats.filter(t => t.threatLevel >= 5);
        
        if (highThreats.length > 0) {
            // Consider blocking instead of extending
            const defensiveMove = this.evaluateDefensiveAlternative(move, highThreats[0]);
            if (defensiveMove && defensiveMove.value > move.value * 0.8) {
                return defensiveMove;
            }
        }
        
        return move;
    }

    reduceRisk(move) {
        // Prefer safer patterns (adjacent over L/I when near edges)
        if ((move.pattern === 'L' || move.pattern === 'I') && this.isNearEdge(move)) {
            // Look for adjacent alternative
            const adjacentAlternative = this.findAdjacentAlternative(move);
            if (adjacentAlternative) {
                return adjacentAlternative;
            }
        }
        
        return move;
    }

    applyAdaptiveModifications(move) {
        const interferenceLevel = this.interferenceHandler.calculateInterferenceLevel();
        
        if (interferenceLevel > 6) {
            // Heavy interference, prioritize defensive moves
            move.value *= 0.9;
            
            const defensiveMove = this.getDefensiveMove();
            if (defensiveMove && defensiveMove.value > move.value) {
                this.log('Switching to defensive play due to heavy interference');
                return defensiveMove;
            }
        }
        
        return move;
    }

    // ========================= HELPER METHODS =========================

    updateCurrentPhase() {
        const stats = this.chainAI.getStats();
        
        if (stats.gapFillingPhase) {
            this.currentPhase = 'gap-filling';
        } else if (stats.isComplete) {
            this.currentPhase = 'complete';
        } else {
            this.currentPhase = 'building';
        }
    }

    updateAdaptiveMode() {
        const interferenceStats = this.interferenceHandler.getInterferenceStats();
        const shouldBeAdaptive = interferenceStats.interferenceLevel > 5 || 
                                interferenceStats.blockedHeads > 1;
        
        if (shouldBeAdaptive !== this.adaptiveMode) {
            this.adaptiveMode = shouldBeAdaptive;
            this.log(`Adaptive mode ${shouldBeAdaptive ? 'enabled' : 'disabled'}`);
        }
    }

    getDefensiveMove() {
        const threats = this.gameCore.analyzeOpponentThreats(this.player);
        const topThreat = threats[0];
        
        if (topThreat && topThreat.threatLevel >= this.strategyConfig.defensiveThreshold * 10) {
            return {
                row: topThreat.position.row,
                col: topThreat.position.col,
                value: topThreat.threatLevel * 10,
                reason: `Defensive block (threat level ${topThreat.threatLevel})`,
                pattern: 'Defensive'
            };
        }
        
        return null;
    }

    evaluateDefensiveAlternative(originalMove, threat) {
        const defensiveValue = threat.threatLevel * 8;
        
        return {
            row: threat.position.row,
            col: threat.position.col,
            value: defensiveValue,
            reason: `Defensive alternative to ${originalMove.reason}`,
            pattern: 'Defensive'
        };
    }

    isNearEdge(move) {
        const edgeDistance = Math.min(
            move.row, this.gameCore.size - 1 - move.row,
            move.col, this.gameCore.size - 1 - move.col
        );
        return edgeDistance <= 2;
    }

    findAdjacentAlternative(move) {
        // This is a simplified version - in practice, would need more logic
        // to find a good adjacent alternative to an L/I pattern move
        return null;
    }

    recordThinkTime(thinkTime) {
        const currentAvg = this.performanceMetrics.averageThinkTime;
        const totalMoves = this.performanceMetrics.totalMoves;
        
        this.performanceMetrics.averageThinkTime = 
            (currentAvg * totalMoves + thinkTime) / (totalMoves + 1);
    }

    // ========================= STRATEGY INTERFACE IMPLEMENTATION =========================

    reset() {
        this.chainAI.reset();
        this.interferenceHandler = new OpponentInterferenceHandler(this.chainAI);
        this.currentPhase = 'building';
        this.adaptiveMode = false;
        this.moveHistory = [];
        this.performanceMetrics = {
            totalMoves: 0,
            successfulMoves: 0,
            blockedMoves: 0,
            defensiveMoves: 0,
            averageThinkTime: 0
        };
        
        this.log('Chain strategy reset');
    }

    getStats() {
        const chainStats = this.chainAI.getStats();
        const interferenceStats = this.interferenceHandler.getInterferenceStats();
        
        return {
            ...this.getStrategyInfo(),
            ...chainStats,
            currentPhase: this.currentPhase,
            adaptiveMode: this.adaptiveMode,
            interference: interferenceStats,
            recentMoves: this.moveHistory.slice(-5) // Last 5 moves
        };
    }

    // ========================= STRATEGY CONFIGURATION =========================

    updateConfig(newConfig) {
        this.config = this.mergeConfig(this.config, newConfig);
        this.strategyConfig = this.mergeConfig(this.strategyConfig, newConfig);
        this.applyConfigToComponents();
        
        this.log(`Configuration updated: ${JSON.stringify(newConfig)}`);
    }

    getConfigurableParameters() {
        return {
            aggressiveness: {
                current: this.config.aggressiveness,
                range: [0.0, 1.0],
                description: 'How aggressive the strategy is (0=defensive, 1=aggressive)'
            },
            adaptability: {
                current: this.config.adaptability,
                range: [0.0, 1.0],
                description: 'How quickly to adapt to opponent interference'
            },
            riskTolerance: {
                current: this.config.riskTolerance,
                range: [0.0, 1.0],
                description: 'Willingness to take risky moves'
            },
            prioritizeL: {
                current: this.strategyConfig.prioritizeL,
                type: 'boolean',
                description: 'Prefer L-patterns over I-patterns'
            },
            defensiveThreshold: {
                current: this.strategyConfig.defensiveThreshold,
                range: [0.0, 1.0],
                description: 'Threshold for switching to defensive play'
            }
        };
    }
}

// ========================= STRATEGY FACTORY =========================

class StrategyFactory {
    constructor() {
        this.registeredStrategies = new Map();
        this.registerDefaultStrategies();
    }

    registerDefaultStrategies() {
        this.registerStrategy('chain', ChainStrategy, {
            name: 'Chain Builder',
            description: 'Builds chains with L/I patterns and handles opponent interference',
            difficulty: 'Medium',
            bestFor: 'Balanced play against human or AI opponents'
        });
        
        // Reserve space for future strategies
        this.registerStrategy('aggressive-chain', ChainStrategy, {
            name: 'Aggressive Chain',
            description: 'Chain building with high aggressiveness',
            difficulty: 'Hard',
            bestFor: 'Quick wins against passive opponents',
            defaultConfig: { aggressiveness: 0.9, riskTolerance: 0.8 }
        });
        
        this.registerStrategy('defensive-chain', ChainStrategy, {
            name: 'Defensive Chain',
            description: 'Chain building with defensive focus',
            difficulty: 'Medium',
            bestFor: 'Playing against aggressive opponents',
            defaultConfig: { aggressiveness: 0.2, defensiveThreshold: 0.4 }
        });
    }

    registerStrategy(id, strategyClass, metadata) {
        this.registeredStrategies.set(id, {
            class: strategyClass,
            metadata: metadata
        });
    }

    createStrategy(id, gameCore, player, config = {}) {
        const strategyInfo = this.registeredStrategies.get(id);
        
        if (!strategyInfo) {
            throw new Error(`Unknown strategy: ${id}`);
        }
        
        // Merge default config if provided
        const finalConfig = strategyInfo.metadata.defaultConfig 
            ? { ...strategyInfo.metadata.defaultConfig, ...config }
            : config;
        
        return new strategyInfo.class(gameCore, player, finalConfig);
    }

    getAvailableStrategies() {
        const strategies = [];
        
        for (const [id, info] of this.registeredStrategies.entries()) {
            strategies.push({
                id: id,
                ...info.metadata
            });
        }
        
        return strategies;
    }

    getStrategyMetadata(id) {
        const strategyInfo = this.registeredStrategies.get(id);
        return strategyInfo ? strategyInfo.metadata : null;
    }
}

// ========================= STRATEGY MANAGER =========================

class StrategyManager {
    constructor() {
        this.factory = new StrategyFactory();
        this.activeStrategies = new Map(); // player -> strategy
        this.strategyHistory = new Map(); // player -> [strategy history]
    }

    setPlayerStrategy(player, strategyId, config = {}) {
        // Clean up existing strategy
        if (this.activeStrategies.has(player)) {
            const oldStrategy = this.activeStrategies.get(player);
            this.recordStrategyChange(player, oldStrategy.strategyName, strategyId);
        }
        
        // Create new strategy
        const strategy = this.factory.createStrategy(strategyId, null, player, config);
        this.activeStrategies.set(player, strategy);
        
        return strategy;
    }

    getPlayerStrategy(player) {
        return this.activeStrategies.get(player);
    }

    updateGameCore(gameCore) {
        // Update game core reference for all active strategies
        for (const strategy of this.activeStrategies.values()) {
            strategy.gameCore = gameCore;
            if (strategy.chainAI) {
                strategy.chainAI.gameCore = gameCore;
            }
        }
    }

    recordStrategyChange(player, oldStrategy, newStrategy) {
        if (!this.strategyHistory.has(player)) {
            this.strategyHistory.set(player, []);
        }
        
        this.strategyHistory.get(player).push({
            from: oldStrategy,
            to: newStrategy,
            timestamp: Date.now()
        });
    }

    getAvailableStrategies() {
        return this.factory.getAvailableStrategies();
    }

    getAllStats() {
        const stats = {};
        
        for (const [player, strategy] of this.activeStrategies.entries()) {
            stats[player] = strategy.getStats();
        }
        
        return stats;
    }

    reset() {
        for (const strategy of this.activeStrategies.values()) {
            strategy.reset();
        }
    }
}

// Export for use in other modules
window.AIStrategyBase = AIStrategyBase;
window.ChainStrategy = ChainStrategy;
window.StrategyFactory = StrategyFactory;
window.StrategyManager = StrategyManager;