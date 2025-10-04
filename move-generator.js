// move-generator.js - CLEAN: Simple orchestrator with consistent patterns
// Delegates to specialized handlers in priority order

class MoveGenerator {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        
        // Handler references (injected by simple-chain-controller)
        this.initialMoveHandler = null;
        this.threatHandler = null;
        this.chainExtensionHandler = null;
        this.gapFillingHandler = null;
        this.borderConnectionHandler = null;
        this.attackHandler = null;
        this.diagonalExtensionHandler = null;
        this.moveValidator = null;
        
        // Feature flags
        this.enableDiagonalExtension = false;  // FUTURE: Enable after core system is stable
        
        // Debug
        this.debugMode = true;
        this.log('Move Generator initialized - Clean orchestration layer');
    }

    // ===== COMPONENT INJECTION =====
    
    setInitialMoveHandler(handler) {
        this.initialMoveHandler = handler;
        this.log('InitialMoveHandler connected');
    }
    
    setThreatHandler(handler) {
        this.threatHandler = handler;
        this.log('ThreatHandler connected');
    }
    
    setChainExtensionHandler(handler) {
        this.chainExtensionHandler = handler;
        this.log('ChainExtensionHandler connected');
    }
    
    setGapFillingHandler(handler) {
        this.gapFillingHandler = handler;
        this.log('GapFillingHandler connected');
    }
    
    setBorderConnectionHandler(handler) {
        this.borderConnectionHandler = handler;
        this.log('BorderConnectionHandler connected');
    }
    
    setAttackHandler(handler) {
        this.attackHandler = handler;
        this.log('AttackHandler connected');
    }
    
    setDiagonalExtensionHandler(handler) {
        this.diagonalExtensionHandler = handler;
        this.log('DiagonalExtensionHandler connected');
    }
    
    setMoveValidator(validator) {
        this.moveValidator = validator;
        this.log('MoveValidator connected');
    }

    // ===== MAIN MOVE GENERATION =====
    
    generateMove() {
        this.log('\n🎯 === MOVE GENERATION ORCHESTRATION ===');
        
        const moveCount = this.gameCore.moveCount || 0;
        this.log(`📊 Move count: ${moveCount}`);
        
        // Define priority chain with consistent pattern
        const priorities = [
            {
                name: 'initial',
                condition: () => moveCount === 0,
                generate: () => this.initialMoveHandler?.generateInitialMove(),
                log: '🎮 Generating initial move...'
            },
            {
                name: 'second-move',
                condition: () => moveCount === 2,
                generate: () => this.initialMoveHandler?.generateSecondMove(),
                log: '🎮 Generating second move...'
            },
            {
                name: 'threat-response',
                condition: () => true,
                generate: () => this.threatHandler?.handleThreats(),
                log: '⚡ Checking for immediate threats...'
            },
            {
                name: 'border-connection',
                condition: () => true,
                generate: () => this.borderConnectionHandler?.checkBorderConnection(),
                log: '🎯 Checking for border connection...'
            },
            {
                name: 'chain-extension',
                condition: () => true,
                generate: () => this.chainExtensionHandler?.generateChainExtension(),
                log: '🔗 Attempting chain extension...'
            },
            {
                name: 'gap-filling',
                condition: () => true,
                generate: () => this.gapFillingHandler?.fillSafeGaps(),
                log: '🔧 Checking for gap filling opportunities...'
            },
            {
                name: 'attack',
                condition: () => true,
                generate: () => this.attackHandler?.generateAttackMove(),
                log: '⚔️ Checking for attack opportunities...'
            },
            {
                name: 'diagonal-extension',
                condition: () => this.enableDiagonalExtension,  // Flag-controlled
                generate: () => this.diagonalExtensionHandler?.generateDiagonalExtension(),
                log: '↗️ Checking for diagonal extension...'
            }
        ];
        
        // Execute priority chain
        for (const priority of priorities) {
            if (!priority.condition()) continue;
            
            this.log(priority.log);
            
            try {
                const move = priority.generate();
                
                if (move && this.validateMove(move)) {
                    return this.finalizeMove(move, priority.name);
                }
            } catch (error) {
                this.log(`❌ ${priority.name} handler error: ${error.message}`);
                // Continue to next priority
            }
        }
        
        // Critical failure - no handler generated valid move
        this.log('❌ CRITICAL: No valid move could be generated');
        this.log('📊 System status:');
        const status = this.getSystemStatus();
        Object.entries(status.handlers).forEach(([name, connected]) => {
            this.log(`   ${name}: ${connected ? '✓' : '✗'}`);
        });
        
        return null;
    }

    // ===== MOVE VALIDATION =====
    
    validateMove(move) {
        if (!move) return false;
        
        // Format validation
        if (typeof move.row !== 'number' || typeof move.col !== 'number') {
            this.log(`❌ Invalid move format: ${JSON.stringify(move)}`);
            return false;
        }
        
        // Delegate to comprehensive validator if available
        if (this.moveValidator) {
            const result = this.moveValidator.validateMove(move);
            // Handle both boolean and object return types
            if (typeof result === 'object' && result !== null) {
                return result.isValid;
            }
            return result;
        }
        
        // Basic fallback validation
        const isValid = 
            move.row >= 0 && move.row < this.gameCore.size &&
            move.col >= 0 && move.col < this.gameCore.size &&
            this.gameCore.board[move.row][move.col] === '';
        
        if (!isValid) {
            this.log(`❌ Move validation failed: (${move.row},${move.col})`);
        }
        
        return isValid;
    }

    // ===== MOVE FINALIZATION =====
    
    finalizeMove(move, moveType) {
        if (!move) return null;
        
        // Create finalized move preserving handler metadata
        const finalizedMove = {
            ...move,  // Preserve all handler-specific metadata
            moveType: moveType,
            moveNumber: this.gameCore.moveCount + 1,
            player: this.player,
            timestamp: Date.now(),
            reason: move.reason || `${moveType} move`
        };
        
        // Log tactical metadata if present
        if (move.headTactics) {
            this.log(`📋 Move includes head tactics: ${move.headTactics.tacticalRecommendation}`);
        }
        
        if (move.midChainBranching) {
            this.log(`🌿 Move includes mid-chain branching: ${move.midChainBranching.branchingReason}`);
        }
        
        this.log(`✅ Finalized ${moveType} move at (${finalizedMove.row},${finalizedMove.col}) - ${finalizedMove.reason}`);
        
        return finalizedMove;
    }

    // ===== DIAGNOSTICS =====
    
    getSystemStatus() {
        return {
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
            features: {
                diagonalExtension: this.enableDiagonalExtension
            },
            currentMove: this.gameCore.moveCount || 0,
            ready: this.isSystemReady()
        };
    }
    
    isSystemReady() {
        // Core handler required for basic functionality
        return !!this.chainExtensionHandler;
    }

    // ===== FEATURE CONTROL =====
    
    enableFeature(featureName) {
        if (featureName === 'diagonalExtension') {
            this.enableDiagonalExtension = true;
            this.log('Diagonal extension ENABLED');
        }
    }
    
    disableFeature(featureName) {
        if (featureName === 'diagonalExtension') {
            this.enableDiagonalExtension = false;
            this.log('Diagonal extension DISABLED');
        }
    }

    // ===== LOGGING =====
    
    log(message) {
        if (this.debugMode) {
            console.log(`[MOVE-GENERATOR] ${message}`);
        }
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.MoveGenerator = MoveGenerator;
    console.log('✅ Clean Move Generator loaded - Consistent orchestration with error handling');
}