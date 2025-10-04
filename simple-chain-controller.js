// simple-chain-controller.js - COMPLETE UPDATED VERSION
// ARCHITECTURE: Pure AI logic container with dependency injection
// UPDATED: Consolidated direction handling, comprehensive validation, proper error handling
// CLEAN: No duplications, clear responsibilities, maintainable code

class SimpleChainController {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        
        // Component references (all injected by GameSystemInitializer)
        this.moveGenerator = null;
        this.gapRegistry = null;
        this.fragmentManager = null;
        this.headManager = null;
        this.fragmentAnalyzer = null;
        this.patternDetector = null;
        this.gapCalculator = null;
        this.gapAnalyzer = null;
        
        // Handlers (all injected)
        this.initialMoveHandler = null;
        this.threatHandler = null;
        this.chainExtensionHandler = null;
        this.gapFillingHandler = null;
        this.borderConnectionHandler = null;
        this.attackHandler = null;
        this.diagonalExtensionHandler = null;
        this.moveValidator = null;
        
        // State tracking
        this.moveCount = 0;
        this.moveHistory = [];
        this.moveTypeHistory = [];
        this.gameLogHandler = null;
        this.debugMode = true;
        
        // Configuration
        this.MAX_HISTORY_SIZE = 100; // Prevent unbounded growth
        
        this.log('🤖 Simple Chain Controller created (awaiting component injection)');
    }

    // ═════════════════════════════════════════════════════════════
    // MAIN INTERFACE
    // ═════════════════════════════════════════════════════════════
    
    /**
     * Generate next AI move
     * MAIN ENTRY POINT: Validates system, delegates to MoveGenerator, finalizes result
     */
    getMove() {
        this.log('\n🎯 === AI MOVE REQUEST ===');
        
        // CRITICAL: Validate system before attempting move generation
        if (!this.validateSystemReady()) {
            this.log('❌ System not ready for move generation');
            this.logSystemStatus();
            return null;
        }
        
        try {
            // Generate move through move generator
            const rawMove = this.moveGenerator.generateMove();
            
            if (!rawMove) {
                this.log('❌ No valid move generated');
                return null;
            }
            
            // Finalize with metadata and validation
            const finalMove = this.finalizeMove(rawMove);
            
            if (!finalMove) {
                this.log('❌ Move finalization failed');
                return null;
            }
            
            // Update state
            this.updateMoveHistory(finalMove);
            
            this.log(`✅ AI move generated: (${finalMove.row}, ${finalMove.col}) - ${finalMove.moveType}`);
            return finalMove;
            
        } catch (error) {
            this.log(`💥 Move generation error: ${error.message}`);
            console.error('Move generation error:', error);
            return null;
        }
    }

    // ═════════════════════════════════════════════════════════════
    // SYSTEM VALIDATION
    // ═════════════════════════════════════════════════════════════
    
    /**
     * Validate that all critical components are ready
     * COMPREHENSIVE: Checks core components and critical handlers
     */
    validateSystemReady() {
        const criticalComponents = {
            core: {
                moveGenerator: this.moveGenerator,
                gapRegistry: this.gapRegistry,
                fragmentManager: this.fragmentManager,
                headManager: this.headManager
            },
            handlers: {
                threatHandler: this.threatHandler,
                chainExtensionHandler: this.chainExtensionHandler,
                gapFillingHandler: this.gapFillingHandler
            }
        };
        
        // Check core components
        const missingCore = Object.entries(criticalComponents.core)
            .filter(([name, component]) => !component)
            .map(([name]) => name);
        
        if (missingCore.length > 0) {
            this.log(`❌ Missing core components: ${missingCore.join(', ')}`);
            return false;
        }
        
        // Check critical handlers
        const missingHandlers = Object.entries(criticalComponents.handlers)
            .filter(([name, handler]) => !handler)
            .map(([name]) => name);
        
        if (missingHandlers.length > 0) {
            this.log(`⚠️ Missing critical handlers: ${missingHandlers.join(', ')}`);
            return false;
        }
        
        return true;
    }

    // ═════════════════════════════════════════════════════════════
    // MOVE FINALIZATION
    // ═════════════════════════════════════════════════════════════
    
    /**
     * Finalize move with comprehensive metadata and validation
     * CONSOLIDATED: All metadata enrichment in one place
     */
    finalizeMove(move, moveType = null) {
        // Validate move object
        if (!this.isValidMoveObject(move)) {
            this.log('❌ Invalid move object in finalizeMove');
            return null;
        }
        
        // Determine move type
        const finalMoveType = moveType || move.moveType || 'unknown';
        
        // Build enriched move object
        const finalMove = {
            // Core move data
            row: move.row,
            col: move.col,
            player: this.player,
            
            // Type and classification
            moveType: finalMoveType,
            moveNumber: this.moveCount + 1,
            
            // Context
            fromHead: move.fromHead || null,
            direction: this.getDirectionFromMove(move),
            pattern: move.pattern || null,
            
            // Additional metadata from original move
            ...this.extractMoveMetadata(move),
            
            // Details for logging
            details: this.getMoveDetails(move, finalMoveType),
            
            // Timing
            timestamp: Date.now(),
            gameState: this.gameCore.moveCount || 0
        };
        
        // Log to game UI if handler available
        if (this.gameLogHandler) {
            const logMessage = this.formatMoveLogMessage(finalMove, finalMoveType);
            this.gameLogHandler(logMessage);
        }
        
        return finalMove;
    }
    
    /**
     * Validate move object structure
     */
    isValidMoveObject(move) {
        return move && 
               typeof move === 'object' && 
               typeof move.row === 'number' && 
               typeof move.col === 'number' &&
               move.row >= 0 && 
               move.col >= 0 &&
               move.row < this.gameCore.size &&
               move.col < this.gameCore.size;
    }
    
    /**
     * Extract metadata from original move object
     */
    extractMoveMetadata(move) {
        const metadata = {};
        
        // Pattern information
        if (move.patternType) metadata.patternType = move.patternType;
        if (move.patternOrientation) metadata.patternOrientation = move.patternOrientation;
        
        // Threat/attack information
        if (move.threatType) metadata.threatType = move.threatType;
        if (move.attackType) metadata.attackType = move.attackType;
        
        // Gap information
        if (move.gapInfo) metadata.gapInfo = move.gapInfo;
        if (move.fillsGap) metadata.fillsGap = move.fillsGap;
        
        // Border information
        if (move.borderType) metadata.borderType = move.borderType;
        if (move.isBorderGapFill) metadata.isBorderGapFill = move.isBorderGapFill;
        
        // Strategic information
        if (move.reason) metadata.reason = move.reason;
        if (move.priority !== undefined) metadata.priority = move.priority;
        if (move.value !== undefined) metadata.value = move.value;
        
        // Mathematical metadata
        if (move.vector) metadata.vector = move.vector;
        if (move.vectorMagnitude) metadata.vectorMagnitude = move.vectorMagnitude;
        
        return metadata;
    }

    // ═════════════════════════════════════════════════════════════
    // DIRECTION HANDLING (CONSOLIDATED)
    // ═════════════════════════════════════════════════════════════
    
    /**
     * Get direction from move using system-provided sources
     * PRIORITY: 1) Move object, 2) HeadManager, 3) GameGeometry calculation
     * NO LOCAL CALCULATIONS: Uses what system already provides
     */
    getDirectionFromMove(move) {
        if (!move) return null;
        
        // Priority 1: Direction already in move object (from handlers)
        const moveDirection = move.direction || move.strategicDirection || move.vectorDirection;
        if (moveDirection) {
            return this.standardizeDirectionFormat(moveDirection);
        }
        
        // Priority 2: Get from HeadManager (current extension direction)
        if (this.headManager?.extensionDirection) {
            return this.standardizeDirectionFormat(this.headManager.extensionDirection);
        }
        
        // Priority 3: Calculate from geometry if fromHead available
        if (move.fromHead) {
            const geometry = this.headManager?.geometry || this.fragmentManager?.geometry;
            
            if (geometry && typeof geometry.getVectorDirection === 'function') {
                const dRow = move.row - move.fromHead.row;
                const dCol = move.col - move.fromHead.col;
                const geoDirection = geometry.getVectorDirection(dRow, dCol);
                
                if (geoDirection && geoDirection !== 'undefined') {
                    return this.standardizeDirectionFormat(geoDirection);
                }
            }
        }
        
        return null;
    }
    
    /**
     * Standardize direction to consistent format
     * OUTPUT: N, S, E, W, NE, NW, SE, SW (standard compass notation)
     */
    standardizeDirectionFormat(direction) {
        if (!direction) return null;
        
        // Already in standard format
        if (/^(N|S|E|W|NE|NW|SE|SW)$/.test(direction)) {
            return direction;
        }
        
        const standardMap = {
            // Cardinal directions
            'north': 'N', 'n': 'N', 'up': 'N',
            'south': 'S', 's': 'S', 'down': 'S',
            'east': 'E', 'e': 'E', 'right': 'E',
            'west': 'W', 'w': 'W', 'left': 'W',
            
            // Ordinal directions
            'northeast': 'NE', 'ne': 'NE', 'up-right': 'NE', 'upright': 'NE',
            'northwest': 'NW', 'nw': 'NW', 'up-left': 'NW', 'upleft': 'NW',
            'southeast': 'SE', 'se': 'SE', 'down-right': 'SE', 'downright': 'SE',
            'southwest': 'SW', 'sw': 'SW', 'down-left': 'SW', 'downleft': 'SW'
        };
        
        const normalized = String(direction).toLowerCase().replace(/[_\s]/g, '-');
        return standardMap[normalized] || direction.toUpperCase();
    }

    // ═════════════════════════════════════════════════════════════
    // MOVE HISTORY MANAGEMENT
    // ═════════════════════════════════════════════════════════════
    
    /**
     * Update move history with size management
     * PREVENTS: Unbounded array growth
     */
    updateMoveHistory(move) {
        this.moveCount++;
        this.moveHistory.push(move);
        this.moveTypeHistory.push(move.moveType);
        
        // Manage history size
        if (this.moveHistory.length > this.MAX_HISTORY_SIZE) {
            const removeCount = Math.floor(this.MAX_HISTORY_SIZE / 4); // Remove 25%
            this.moveHistory = this.moveHistory.slice(removeCount);
            this.moveTypeHistory = this.moveTypeHistory.slice(removeCount);
            this.log(`📊 History trimmed (removed ${removeCount} oldest entries)`);
        }
    }

    // ═════════════════════════════════════════════════════════════
    // UI LOGGING
    // ═════════════════════════════════════════════════════════════
    
    /**
     * Format move log message for UI
     * FORMAT: "x3 to (9,9) [cell 145], extension from head x2 (7,8), direction SE"
     */
    formatMoveLogMessage(move, moveType) {
        if (!move) return 'Invalid move';
        
        // Get player-specific move count
        const playerMoves = this.gameCore.gameHistory.filter(m => m.player === this.player);
        const playerMoveNumber = playerMoves.length + 1;
        
        // Calculate cell number
        const cellNumber = move.row * this.gameCore.size + move.col;
        
        // Build message parts
        const movePrefix = this.getMoveTypePrefix(moveType);
        const playerLabel = this.player.toLowerCase();
        
        // Basic move info
        let message = `${playerLabel}${playerMoveNumber} to (${move.row},${move.col}) [cell ${cellNumber}]`;
        
        // Add move-specific details
        const details = this.getMoveDetails(move, moveType);
        if (details) {
            message += `, ${details}`;
        }
        
        // Add direction if available
        const direction = move.direction;
        if (direction) {
            message += `, direction ${direction}`;
        }
        
        // Add move type prefix
        if (movePrefix) {
            message = `${movePrefix}: ${message}`;
        }
        
        return message;
    }
    
    /**
     * Get move type prefix/label for logging
     */
    getMoveTypePrefix(moveType) {
        const prefixes = {
            'initial': '🎯 INITIAL',
            'second-move': '🎯 SECOND',
            'threat-response': '🚨 THREAT',
            'chain-extension': '🔗 EXTEND',
            'gap-filling': '🔧 GAP FILL',
            'border-connection': '🎯 BORDER',
            'attack': '⚔️ ATTACK',
            'diagonal-extension': '↗️ DIAGONAL'
        };
        
        return prefixes[moveType] || '▶️ MOVE';
    }
    
    /**
     * Get move-specific details for logging
     */
    getMoveDetails(move, moveType) {
        const details = [];
        
        // Check for fallback first
        if (move.reason && (move.reason.toLowerCase().includes('fallback') || 
                            move.reason.toLowerCase().includes('alternative'))) {
            details.push('⚠️ FALLBACK');
        }
        
        // Extension from head
        if (move.fromHead) {
            const fromPlayerMoves = this.gameCore.gameHistory.filter(m => m.player === this.player);
            const fromMoveIndex = fromPlayerMoves.findIndex(
                m => m.row === move.fromHead.row && m.col === move.fromHead.col
            );
            
            if (fromMoveIndex >= 0) {
                const fromMoveNumber = fromMoveIndex + 1;
                details.push(
                    `extension from head ${this.player.toLowerCase()}${fromMoveNumber} (${move.fromHead.row},${move.fromHead.col})`
                );
            } else {
                details.push(`extension from (${move.fromHead.row},${move.fromHead.col})`);
            }
        }
        
        // Pattern info
        if (move.pattern) {
            if (move.pattern === 'L' || move.pattern.includes('L-')) {
                details.push('L-pattern');
            } else if (move.pattern === 'I' || move.pattern.includes('I-')) {
                details.push('I-pattern');
            } else if (move.pattern === 'diagonal') {
                details.push('diagonal-pattern');
            }
        }
        
        // Gap filling specifics
        if (moveType === 'gap-filling' && move.gapInfo) {
            details.push(`filling ${move.gapInfo.patternType || 'gap'}`);
        }
        
        // Threat response specifics
        if (moveType === 'threat-response' && move.threatType) {
            details.push(`defending ${move.threatType}`);
        }
        
        // Attack specifics
        if (moveType === 'attack' && move.attackType) {
            details.push(`${move.attackType} attack`);
        }
        
        // Border connection specifics
        if (moveType === 'border-connection') {
            if (move.borderType) {
                details.push(`${move.borderType} border`);
            }
            if (move.isBorderGapFill) {
                details.push('gap fill');
            }
        }
        
        // Blocked/stuck conditions
        if (move.reason) {
            if (move.reason.toLowerCase().includes('blocked')) {
                details.push('🚫 head blocked');
            }
            if (move.reason.toLowerCase().includes('stuck')) {
                details.push('🔒 stuck');
            }
        }
        
        // Priority/value
        if (move.value !== undefined) {
            details.push(`priority ${move.value}`);
        }
        
        return details.join(', ');
    }

    // ═════════════════════════════════════════════════════════════
    // STATISTICS AND ANALYSIS
    // ═════════════════════════════════════════════════════════════
    
    /**
     * Get move type statistics
     */
    getMoveTypeStatistics() {
        const stats = {};
        this.moveTypeHistory.forEach(moveType => {
            stats[moveType] = (stats[moveType] || 0) + 1;
        });
        return stats;
    }
    
    /**
     * Get last N moves
     */
    getLastMoves(count = 5) {
        return this.moveHistory.slice(-count);
    }
    
    /**
     * Get complete move history
     */
    getMoveHistory() {
        return [...this.moveHistory]; // Return copy to prevent mutation
    }

    /**
     * Get move type distribution
     */
    getMoveTypeDistribution() {
        const distribution = {};
        this.moveHistory.forEach(move => {
            const type = move.moveType || 'unknown';
            distribution[type] = (distribution[type] || 0) + 1;
        });
        return distribution;
    }

    // ═════════════════════════════════════════════════════════════
    // COMPONENT INJECTION METHODS
    // ═════════════════════════════════════════════════════════════
    
    // Core component injection
    setMoveGenerator(moveGenerator) {
        this.moveGenerator = moveGenerator;
        this.log('🔗 MoveGenerator injected');
    }
    
    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        this.log('🔗 GapRegistry injected');
    }
    
    setFragmentManager(fragmentManager) {
        this.fragmentManager = fragmentManager;
        this.log('🔗 FragmentManager injected');
    }
    
    setHeadManager(headManager) {
        this.headManager = headManager;
        this.log('🔗 HeadManager injected');
    }
    
    setFragmentAnalyzer(fragmentAnalyzer) {
        this.fragmentAnalyzer = fragmentAnalyzer;
        this.log('🔗 FragmentAnalyzer injected');
    }
    
    setPatternDetector(patternDetector) {
        this.patternDetector = patternDetector;
        this.log('🔗 PatternDetector injected');
    }
    
    setGapCalculator(gapCalculator) {
        this.gapCalculator = gapCalculator;
        this.log('🔗 GapCalculator injected');
    }
    
    setGapAnalyzer(gapAnalyzer) {
        this.gapAnalyzer = gapAnalyzer;
        this.log('🔗 GapAnalyzer injected');
    }
    
    // Handler injection methods
    setInitialMoveHandler(handler) {
        this.initialMoveHandler = handler;
        this.log('🔗 InitialMoveHandler injected');
    }
    
    setThreatHandler(handler) {
        this.threatHandler = handler;
        this.log('🔗 ThreatHandler injected');
    }
    
    setChainExtensionHandler(handler) {
        this.chainExtensionHandler = handler;
        this.log('🔗 ChainExtensionHandler injected');
    }
    
    setGapFillingHandler(handler) {
        this.gapFillingHandler = handler;
        this.log('🔗 GapFillingHandler injected');
    }
    
    setBorderConnectionHandler(handler) {
        this.borderConnectionHandler = handler;
        this.log('🔗 BorderConnectionHandler injected');
    }
    
    setAttackHandler(handler) {
        this.attackHandler = handler;
        this.log('🔗 AttackHandler injected');
    }
    
    setDiagonalExtensionHandler(handler) {
        this.diagonalExtensionHandler = handler;
        this.log('🔗 DiagonalExtensionHandler injected');
    }
    
    setMoveValidator(validator) {
        this.moveValidator = validator;
        this.log('🔗 MoveValidator injected');
    }
    
setGameLogHandler(handler) {
    this.gameLogHandler = handler;
    this.log('🔗 Game log handler connected');
}

    // ═════════════════════════════════════════════════════════════
    // SYSTEM STATE AND CONTROL
    // ═════════════════════════════════════════════════════════════
    
    /**
     * Get comprehensive system status
     */
    getSystemStatus() {
        return {
            ready: this.validateSystemReady(),
            coreComponents: {
                moveGenerator: !!this.moveGenerator,
                gapRegistry: !!this.gapRegistry,
                fragmentManager: !!this.fragmentManager,
                headManager: !!this.headManager,
                fragmentAnalyzer: !!this.fragmentAnalyzer,
                patternDetector: !!this.patternDetector
            },
            handlers: {
                initial: !!this.initialMoveHandler,
                threat: !!this.threatHandler,
                chainExtension: !!this.chainExtensionHandler,
                gapFilling: !!this.gapFillingHandler,
                borderConnection: !!this.borderConnectionHandler,
                attack: !!this.attackHandler,
                diagonal: !!this.diagonalExtensionHandler,
                validator: !!this.moveValidator
            },
            stats: {
                movesGenerated: this.moveCount,
                historySize: this.moveHistory.length,
                lastMoveType: this.moveHistory.length > 0 ? 
                    this.moveHistory[this.moveHistory.length - 1].moveType : null
            }
        };
    }

    /**
     * Log system status to console
     */
    logSystemStatus() {
        const status = this.getSystemStatus();
        
        this.log('📊 === SYSTEM STATUS ===');
        this.log(`System Ready: ${status.ready ? '✅' : '❌'}`);
        
        this.log('\nCore Components:');
        Object.entries(status.coreComponents).forEach(([key, value]) => {
            this.log(`  ${value ? '✅' : '❌'} ${key}`);
        });
        
        this.log('\nHandlers:');
        Object.entries(status.handlers).forEach(([key, value]) => {
            this.log(`  ${value ? '✅' : '❌'} ${key}`);
        });
        
        this.log(`\nMoves generated: ${status.stats.movesGenerated}`);
        this.log(`History size: ${status.stats.historySize}/${this.MAX_HISTORY_SIZE}`);
        this.log('===================\n');
    }

    /**
     * Reset controller state
     */
    reset() {
        this.moveCount = 0;
        this.moveHistory = [];
        this.moveTypeHistory = [];
        this.log('🔄 Simple Chain Controller reset');
    }

    // ═════════════════════════════════════════════════════════════
    // DEBUG AND DIAGNOSTICS
    // ═════════════════════════════════════════════════════════════
    
    /**
     * Set debug mode and propagate to components
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        
        // Propagate to components that support debug mode
        const componentsWithDebug = [
            this.moveGenerator,
            this.headManager,
            this.fragmentManager,
            this.chainExtensionHandler,
            this.gapRegistry
        ];
        
        componentsWithDebug.forEach(component => {
            if (component && typeof component.setDebugMode === 'function') {
                component.setDebugMode(enabled);
            }
        });
        
        this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Log message (respects debug mode)
     */
    log(message) {
        if (this.debugMode) {
            console.log(`[SIMPLE-CHAIN-CONTROLLER] ${message}`);
        }
    }
    
    /**
     * Trace direction sources for a move (debugging)
     */
    traceDirectionSources(move) {
        if (!this.debugMode || !move) return;
        
        console.log('\n🧭 === DIRECTION SOURCE TRACE ===');
        
        const sources = {
            'move.direction': move.direction || 'N/A',
            'move.strategicDirection': move.strategicDirection || 'N/A',
            'move.vectorDirection': move.vectorDirection || 'N/A',
            'headManager.extensionDirection': this.headManager?.extensionDirection || 'N/A',
            'calculated': 'N/A'
        };
        
        if (move.fromHead) {
            const geometry = this.headManager?.geometry;
            if (geometry && typeof geometry.getVectorDirection === 'function') {
                const dRow = move.row - move.fromHead.row;
                const dCol = move.col - move.fromHead.col;
                sources.calculated = geometry.getVectorDirection(dRow, dCol) || 'N/A';
            }
        }
        
        console.table(sources);
        console.log('Final direction:', this.getDirectionFromMove(move));
        console.log('================================\n');
    }
    
    /**
     * Get diagnostic report
     */
    getDiagnosticReport() {
        const status = this.getSystemStatus();
        const stats = this.getMoveTypeStatistics();
        
        return {
            status: status,
            moveTypeStats: stats,
            recentMoves: this.getLastMoves(5),
            historySize: this.moveHistory.length,
            maxHistorySize: this.MAX_HISTORY_SIZE
        };
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SimpleChainController = SimpleChainController;
    console.log('✅ Simple Chain Controller loaded (UPDATED - Clean & Consolidated)');
    console.log('   🔧 Fixed: Direction handling consolidated');
    console.log('   🔧 Fixed: Comprehensive validation added');
    console.log('   🔧 Fixed: Null safety improved');
    console.log('   🔧 Fixed: History management added');
    console.log('   ✨ Enhanced: System status reporting');
}