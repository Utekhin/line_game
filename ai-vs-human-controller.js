// ai-vs-human-controller.js - CLEAN VERSION
// SIMPLIFIED: Uses GameSystemInitializer for all setup
// FOCUSED: Game flow, events, and UI interaction only

class AIvsHumanController {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.aiPlayer = 'X';
        this.humanPlayer = 'O';
        
        // System components (populated by initializer)
        this.components = null;
        this.ai = null;
        
        // Event system
        this.eventHandlers = {
            'gameStart': [],
            'move': [],
            'gameEnd': [],
            'error': [],
            'turnChange': [],
            'humanMoveNeeded': []
        };
        
        // State
        this.gameRunning = false;
        this.analyticalModulesInitialized = false;
        
        console.log('🎮 AI vs Human Controller created');
    }

    // ===== INITIALIZATION =====
    
    /**
     * Initialize game system using dedicated initializer
     * CLEAN: All complexity delegated to GameSystemInitializer
     */
    initializeCompleteSystem() {
        console.log('🚀 Initializing game system...\n');
        
        try {
            // Create initializer
            this.initializer = new GameSystemInitializer(this.gameCore, this.aiPlayer);
            
            // Get fully wired components
            this.components = this.initializer.initializeCompleteSystem();
            
            // Extract AI reference for convenience
            this.ai = this.components.ai;
            
            // Print system report
            this.initializer.printSystemReport();
            
            // Setup UI handlers
            this.setupBoardClickHandlers();
            
            this.analyticalModulesInitialized = true;
            console.log('✅ Controller ready\n');
            
            return true;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Initialize after diagonal lines are available
     * CRITICAL: Handles proper timing/sequencing
     */
    initializeAnalyticalModulesAfterInjection() {
        console.log('🔬 Initializing analytical modules after diagonal injection...');
        
        if (!this.analyticalModulesInitialized) {
            console.log('⚠️ Analytical modules not yet initialized - will initialize now');
            return this.initializeCompleteSystem();
        }
        
        // If already initialized, just verify diagonal connections
        if (this.initializer && this.components.diagonalLinesManager) {
            this.initializer.initializeAnalyticalModulesAfterDiagonalInjection();
        }
        
        console.log('✅ Analytical modules ready\n');
        return true;
    }

    /**
     * Inject diagonal lines manager
     * Uses initializer to handle proper injection
     */
    injectDiagonalLinesManager(diagonalLinesManager) {
        console.log('🔗 Injecting diagonal lines manager...');
        
        if (!this.components) {
            console.warn('⚠️ Components not initialized yet');
            return;
        }
        
        // Store in components
        this.components.diagonalLinesManager = diagonalLinesManager;
        
        // Use initializer to inject properly
        if (this.initializer) {
            this.initializer.injectDiagonalLinesManager(diagonalLinesManager);
        } else {
            // Fallback: inject manually
            if (this.components.gapBlockingDetector) {
                this.components.gapBlockingDetector.diagonalLinesManager = diagonalLinesManager;
            }
            if (this.components.diagonalExtensionHandler?.setDiagonalLinesManager) {
                this.components.diagonalExtensionHandler.setDiagonalLinesManager(diagonalLinesManager);
            }
        }
        
        console.log('✅ Diagonal lines manager injected');
    }

    // ===== GAME FLOW =====
    
    startGame() {
        console.log('🎮 Starting AI vs Human game...');
        
        if (!this.ai) {
            throw new Error('AI not initialized');
        }
        
        this.gameCore.resetGame();
        this.gameRunning = true;
        
        this.emit('gameStart', {
            aiPlayer: this.aiPlayer,
            humanPlayer: this.humanPlayer
        });
        
        // AI plays first as X
        if (this.aiPlayer === 'X') {
            this.executeAIMove();
        }
    }

// ===== executeAIMove() - FIXED VERSION =====

/**
 * Execute AI move with proper cache clearing
 * FIXED: Added afterMove() call to clear caches and update registries
 */
executeAIMove() {
    if (!this.gameRunning) return;
    
    console.log('\n🤖 AI thinking...');
    
    try {
        // Generate AI move
        const move = this.ai.getMove();
        
        if (!move) {
            throw new Error('AI failed to generate move');
        }
        
        // Execute move on board
        const moveResult = this.gameCore.makeMove(move.row, move.col, this.aiPlayer);
        
        if (!moveResult || !moveResult.success) {
            throw new Error(`Invalid AI move: (${move.row}, ${move.col})`);
        }
        
        console.log(`✅ AI plays: (${move.row}, ${move.col})`);
        
        // ✅ CRITICAL FIX: Clear caches and update registries after move
        this.afterMove();
        
        // Emit move event
        // NEW (delayed win check after UI renders):
this.emit('move', {
    player: this.aiPlayer,
    row: move.row,
    col: move.col,
    move: move
});

// Check win AFTER UI has rendered the move
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        const winResult = this.checkWinCondition(this.aiPlayer);
        if (winResult && winResult.isWin) {
            this.endGame(this.aiPlayer);
        } else {
            this.emit('turnChange', { currentPlayer: this.humanPlayer });
        }
    });
});
        
    } catch (error) {
        console.error('❌ AI move error:', error);
        this.emit('error', { error: error.message });
    }
}
// ===== handleHumanMove(row, col) - FIXED VERSION =====

/**
 * Handle human move with proper cache clearing
 * FIXED: Added afterMove() call to clear caches and update registries
 */
handleHumanMove(row, col) {
    if (!this.gameRunning) {
        console.log('⚠️ Game not running');
        return false;
    }
    
    console.log(`\n👤 Human plays: (${row}, ${col})`);
    
    try {
        // Execute move on board
        const moveResult = this.gameCore.makeMove(row, col, this.humanPlayer);
        
        if (!moveResult || !moveResult.success) {
            console.log('❌ Invalid move');
            return false;
        }
        
        // ✅ CRITICAL FIX: Clear caches and update registries after move
        this.afterMove();
        
        // Emit move event
        // NEW:
this.emit('move', {
    player: this.humanPlayer,
    row: row,
    col: col
});

// Check win AFTER UI has rendered the move
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        const winResult = this.checkWinCondition(this.humanPlayer);
        if (winResult && winResult.isWin) {
            this.endGame(this.humanPlayer);
            return;
        }
        
        // AI's turn
        this.emit('turnChange', { currentPlayer: this.aiPlayer });
        
        setTimeout(() => {
            this.executeAIMove();
        }, 300);
    });
});

return true;
        
    } catch (error) {
        console.error('❌ Human move error:', error);
        this.emit('error', { error: error.message });
        return false;
    }
}


/**
 * Clean up after each move - clear caches, update registries, cleanup blocked patterns
 * DOES NOT include win check - that's handled in executeAIMove/handleHumanMove above
 */
afterMove() {
    const lastMove = this.gameCore.gameHistory[this.gameCore.gameHistory.length - 1];
    
    if (!lastMove) {
        console.warn('[CONTROLLER] afterMove called but no last move in history');
        return;
    }
    
    // Track head usage if move was from a head
    if (lastMove.fromHead && this.components?.fragmentManager) {
        const fromHead = lastMove.fromHead;
        const direction = lastMove.direction || null;
        
        this.components.fragmentManager.markHeadAsUsed(fromHead, direction);
        
        const directionInfo = direction ? ` (${direction})` : '';
        console.log(`✅ Head (${fromHead.row},${fromHead.col}) marked as used${directionInfo}`);
    }
    
    // Update Gap Registry
    if (this.components?.gapRegistry) {
        this.components.gapRegistry.updateRegistry();
        console.log(`✅ Gap Registry updated`);
    }
    
    // Cleanup blocked patterns
    let totalPatternsRemoved = 0;
    
    if (this.components?.gapRegistry) {
        const removedCount = this.components.gapRegistry.cleanupBlockedPatterns();
        
        if (removedCount > 0) {
            totalPatternsRemoved += removedCount;
            console.log(`🧹 Removed ${removedCount} blocked pattern(s)`);
        }
    }
    
    // Force fragment re-analysis if patterns were removed
    if (totalPatternsRemoved > 0) {
        console.log(`🔄 Forcing fragment re-analysis (${totalPatternsRemoved} pattern(s) removed)`);
        
        if (this.components?.fragmentAnalyzer) {
            this.components.fragmentAnalyzer.clearCache();
        }
        
        if (this.components?.fragmentManager) {
            this.components.fragmentManager.forceFragmentRefresh();
        }
        
        if (this.components?.gapAnalyzer) {
            this.components.gapAnalyzer.cache.clear();
        }
    } else {
        // Normal cache clearing
        if (this.components?.fragmentAnalyzer) {
            this.components.fragmentAnalyzer.clearCache();
        }
        
        if (this.components?.gapAnalyzer) {
            this.components.gapAnalyzer.cache.clear();
        }
    }
}

 checkWinCondition(player) {
        return this.gameCore.checkWin(player);
    }

    endGame(winner) {
        this.gameRunning = false;
        console.log(`\nðŸ† Game Over! ${winner} wins!`);
        
        this.emit('gameEnd', {
            winner: winner,
            moveCount: this.gameCore.moveCount
        });
    }

    // ===== UI HANDLERS =====
    
    setupBoardClickHandlers() {
        // Board click handling will be set up by observer
        console.log('📋 Board click handlers ready');
    }

    // ===== EVENT SYSTEM =====
    
    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => handler(data));
        }
    }

    // ===== ACCESSORS =====
    
    getGameState() {
        return {
            running: this.gameRunning,
            currentPlayer: this.gameRunning ? 
                (this.gameCore.moveCount % 2 === 0 ? this.aiPlayer : this.humanPlayer) : null,
            moveCount: this.gameCore.moveCount,
            aiPlayer: this.aiPlayer,
            humanPlayer: this.humanPlayer
        };
    }

    getComponents() {
        return this.components;
    }

    // ===== DIAGNOSTICS =====
    
    verifyAllConnections() {
        if (!this.components) {
            console.warn('⚠️ Components not initialized');
            return false;
        }
        
        console.log('\n🔍 Verifying connections...');
        
        const critical = [
            'universalGapCalculator',
            'gapRegistry',
            'patternDetector',
            'fragmentAnalyzer',
            'moveGenerator',
            'ai'
        ];
        
        const allPresent = critical.every(key => !!this.components[key]);
        
        console.log(allPresent ? '✅ All critical components connected' : '❌ Some components missing');
        
        return allPresent;
    }

    exposeInstancesForDebugging() {
        if (typeof window !== 'undefined') {
            window.gameController = this;
            window.gameComponents = this.components;
            console.log('🔧 Debug: window.gameController and window.gameComponents available');
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.AIvsHumanController = AIvsHumanController;
    console.log('✅ Simplified AI vs Human Controller loaded');
}