// ai-vs-human-activation.js - FIXED: Proper Script Loading Verification
// UPDATED: Robust loading checks that wait for all dependencies

// ===== ENHANCED LOADING VERIFICATION SYSTEM =====
class ScriptLoadingManager {
    constructor() {
        this.requiredClasses = [
            'ConnectionGameCore',
            'ChainHeadManager',
            'UniversalGapRegistry',
            'SimpleChainAI',               // This was failing to load
            'AIvsHumanController',         
            'AIvsHumanObserver',
            'ConnectionGameDiagonalLines',
            'PatternDetector'
        ];
        
        this.enhancedClasses = [
            'ChainFragmentAnalyzer',
            'GapAnalyzer'
        ];
        
        this.maxWaitTime = 10000; // 10 seconds max wait
        this.checkInterval = 100;  // Check every 100ms
        this.startTime = Date.now();
        
        console.log('🔄 Script Loading Manager initialized');
    }
    
    // Check if all required classes are loaded
    checkAllClassesLoaded() {
        const missingCore = this.requiredClasses.filter(className => {
            const isLoaded = typeof window[className] !== 'undefined';
            if (!isLoaded) {
                console.log(`⏳ Still waiting for: ${className}`);
            }
            return !isLoaded;
        });
        
        const missingEnhanced = this.enhancedClasses.filter(className => {
            return typeof window[className] === 'undefined';
        });
        
        const allCoreLoaded = missingCore.length === 0;
        const timeElapsed = Date.now() - this.startTime;
        
        if (allCoreLoaded) {
            console.log(`✅ All core classes loaded in ${timeElapsed}ms`);
            if (missingEnhanced.length > 0) {
                console.log(`⚠️ Missing enhanced features: ${missingEnhanced.join(', ')}`);
                console.log('   Game will work but some features may be limited');
            } else {
                console.log(`✅ All enhanced classes also loaded`);
            }
            return { success: true, missingCore: [], missingEnhanced };
        }
        
        if (timeElapsed > this.maxWaitTime) {
            console.error(`❌ Timeout waiting for classes: ${missingCore.join(', ')}`);
            return { success: false, missingCore, missingEnhanced, timeout: true };
        }
        
        return { success: false, missingCore, missingEnhanced, timeout: false };
    }
    
    // Wait for all classes to load with retry logic
    async waitForAllClasses() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const result = this.checkAllClassesLoaded();
                
                if (result.success || result.timeout) {
                    clearInterval(checkInterval);
                    resolve(result);
                }
            }, this.checkInterval);
        });
    }
}

// ===== CORE INITIALIZATION WITH ROBUST LOADING =====
window.activateAIvsHuman = async function() {
    console.log('🎮 Starting AI vs Human activation with robust loading...');
    
    // Use the loading manager to wait for all dependencies
    const loadingManager = new ScriptLoadingManager();
    const loadingResult = await loadingManager.waitForAllClasses();
    
    if (!loadingResult.success) {
        if (loadingResult.timeout) {
            console.error('❌ Failed to activate - script loading timeout');
            console.error('   Missing classes:', loadingResult.missingCore.join(', '));
            showLoadingError('Script loading timeout. Please refresh the page.');
        } else {
            console.error('❌ Failed to activate - missing requirements');
            console.error('   Missing classes:', loadingResult.missingCore.join(', '));
            showLoadingError('Missing required game components. Please check script loading.');
        }
        return false;
    }
    
    console.log('✅ All dependencies loaded - proceeding with activation');
    
    // Clean up any existing instance
    if (window.aivsHumanInstance) {
        try {
            window.aivsHumanInstance.handleStopGame();
            console.log('♻️ Previous instance cleaned up');
        } catch (error) {
            console.log('Note: Error stopping previous game:', error.message);
        }
    }
    
    try {
        // Create the observer (which creates everything else)
        window.aivsHumanInstance = new AIvsHumanObserver();
        console.log('✅ ENHANCED AI vs Human activated successfully');
        
        // Verify the enhanced system
        setTimeout(() => verifyEnhancedSystem(), 100);
        
        // Set up the main button
        setupMainButton();
        
        // Set up debug buttons  
        setupDebugButtons();
        
        return true;
        
    } catch (error) {
        console.error('❌ Error creating AI vs Human:', error);
        showLoadingError(`Initialization error: ${error.message}`);
        return false;
    }
};

// ===== ERROR DISPLAY SYSTEM =====
function showLoadingError(message) {
    const mainButton = document.getElementById('mainButton');
    if (mainButton) {
        mainButton.textContent = 'Loading Failed';
        mainButton.style.backgroundColor = '#e74c3c';
        mainButton.disabled = true;
        
        // Add retry button
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry Loading';
        retryButton.style.marginLeft = '10px';
        retryButton.onclick = () => {
            location.reload(); // Simple but effective
        };
        mainButton.parentNode.appendChild(retryButton);
    }
    
    // Show error in game log if available
    const gameLog = document.getElementById('gameLog');
    if (gameLog) {
        gameLog.innerHTML = `
            <div style="color: #e74c3c; font-weight: bold; padding: 10px;">
                ❌ Loading Error: ${message}
                <br><br>
                <strong>Troubleshooting:</strong>
                <br>• Refresh the page (F5)
                <br>• Check browser console for errors
                <br>• Ensure all script files are accessible
                <br>• Clear browser cache if needed
            </div>
        `;
    }
}

// ===== ENHANCED SYSTEM VERIFICATION =====
function verifyEnhancedSystem() {
    console.log('🔍 Verifying ENHANCED Gap Registry System...');
    
    if (!window.aivsHumanInstance || !window.aivsHumanInstance.controller) {
        console.warn('⚠️ Cannot verify system - instance not ready');
        return;
    }
    
    const ai = window.aivsHumanInstance.controller.ai;
    if (!ai) {
        console.warn('⚠️ AI not found in controller');
        return;
    }
    
    // Verify core AI components
    const verificationResults = {
        cleanAI: typeof ai.getNextMove === 'function',
        chainHeads: ai.chainHeadManager && typeof ai.chainHeadManager.updateHeads === 'function',
        gapRegistry: ai.gapRegistry && typeof ai.gapRegistry.getOwnThreatenedGaps === 'function',
        fragmentAnalyzer: typeof window.ChainFragmentAnalyzer !== 'undefined',
        diagonalSupport: checkDiagonalPatternSupport()
    };
    
    // Log verification results
    Object.entries(verificationResults).forEach(([component, isValid]) => {
        const status = isValid ? '✅' : '⚠️';
        const componentName = component.replace(/([A-Z])/g, ' $1').toLowerCase();
        console.log(`${status} ${componentName}: ${isValid ? 'verified' : 'incomplete'}`);
    });
    
    // Verify controller integration
    const controller = window.aivsHumanInstance.controller;
    const hasCleanController = typeof controller.makeAIMove === 'function' && controller.gapRegistry;
    
    if (hasCleanController) {
        console.log('✅ Controller clean integration verified');
    } else {
        console.warn('⚠️ Controller integration incomplete');
    }
    
    // Show feature summary
    showFeatureSummary(verificationResults);
    
    console.log('🔍 ENHANCED system verification complete');
}

// ===== FEATURE SUMMARY DISPLAY =====
function showFeatureSummary(verificationResults) {
    console.log('\n📋 === ACTIVE FEATURES ===');
    console.log('  ✅ L-patterns (2 gaps)');
    console.log('  ✅ I-patterns (3 gaps)');
    console.log(`  ${verificationResults.diagonalSupport ? '✅' : '❌'} Diagonal patterns (1 gap)`);
    console.log(`  ${verificationResults.fragmentAnalyzer ? '✅' : '❌'} Fragment connection (after move 20)`);
    console.log('  ✅ Threat detection');
    console.log('  ✅ Attack system');
    console.log('  ✅ Border connections');
    console.log('  ✅ Chain extension');
    console.log('📋 === END FEATURES ===\n');
}

// ===== MAIN BUTTON SETUP =====
function setupMainButton() {
    const mainButton = document.getElementById('mainButton');
    if (!mainButton) {
        console.warn('⚠️ Main button not found');
        return;
    }
    
    // Clear any existing listeners and enable button
    const newButton = mainButton.cloneNode(true);
    mainButton.parentNode.replaceChild(newButton, mainButton);
    
    // Reset button state
    newButton.disabled = false;
    newButton.style.backgroundColor = '';
    newButton.textContent = 'Start Game';
    
    // Add single, clear event listener
    newButton.addEventListener('click', handleMainButtonClick);
    
    console.log('✅ Main button configured for ENHANCED system');
}

function handleMainButtonClick() {
    const button = document.getElementById('mainButton');
    if (!button || !window.aivsHumanInstance) return;
    
    console.log(`🖱️ Main button: "${button.textContent}"`);
    
    try {
        if (button.textContent === 'Start Game') {
            // Reset board stability
            if (window.boardStabilityManager) {
                window.boardStabilityManager.checkBoardStability(true);
            }
            
            // Start game with ENHANCED gap registry system
            window.aivsHumanInstance.handleStartGame();
            button.textContent = 'New Game';
            button.classList.add('new-game');
            
            console.log('✅ Game started with ENHANCED Gap Registry system');
            console.log('📋 Active: Diagonal patterns, Fragment connection after move 20');
            
        } else {
            // Restart game
            window.aivsHumanInstance.handleStopGame();
            button.textContent = 'Start Game';
            button.classList.remove('new-game');
            
            setTimeout(() => {
                window.aivsHumanInstance.handleStartGame();
                button.textContent = 'New Game';
                button.classList.add('new-game');
            }, 100);
            
            console.log('✅ Game restarted with ENHANCED Gap Registry system');
        }
        
    } catch (error) {
        console.error('❌ Button click error:', error);
        button.textContent = 'Error - Retry';
        button.classList.remove('new-game');
        button.style.backgroundColor = '#e74c3c';
    }
}

// ===== DEBUG BUTTONS SETUP =====
function setupDebugButtons() {
    const debugButton = document.getElementById('debugButton');
    const resetLayoutButton = document.getElementById('resetLayoutButton');
    const checkStabilityButton = document.getElementById('checkStabilityButton');

    if (debugButton) {
        debugButton.addEventListener('click', () => {
            if (window.aivsHumanInstance) {
                window.aivsHumanInstance.debugLogState();
            }
            debugEnhancedGameState();
        });
    }

    if (resetLayoutButton) {
        resetLayoutButton.addEventListener('click', () => {
            if (window.boardStabilityManager) {
                window.boardStabilityManager.resetBoardLayout();
            }
        });
    }

    if (checkStabilityButton) {
        checkStabilityButton.addEventListener('click', () => {
            if (window.boardStabilityManager) {
                window.boardStabilityManager.checkBoardStability(true);
            }
        });
    }
    
    console.log('✅ Debug buttons configured for ENHANCED system');
}

// ===== HELPER FUNCTIONS (Keep existing ones) =====

function checkDiagonalPatternSupport() {
    if (window.PatternDetector) {
        try {
            const detector = new PatternDetector();
            return typeof detector.isDiagonalPattern === 'function' &&
                   typeof detector.getDiagonalPatternGap === 'function';
        } catch (error) {
            console.warn('⚠️ Error checking diagonal pattern support:', error.message);
            return false;
        }
    }
    return false;
}

function debugEnhancedGameState() {
    console.log('🔍 === ENHANCED GAME STATE DEBUG ===');
    
    if (window.aivsHumanInstance) {
        console.log('✅ Instance exists');
        
        if (window.aivsHumanInstance.controller) {
            const gameState = window.aivsHumanInstance.controller.getGameState();
            console.log('State:', gameState.state);
            console.log('Current player:', gameState.currentPlayer);
            console.log('Waiting for human:', gameState.waitingForHuman);
            console.log('Current phase:', gameState.currentPhase);
            console.log('Chain length:', gameState.chainLength);
            console.log('Move count:', gameState.moveCount, `(Win check ${gameState.moveCount >= 29 ? 'ENABLED' : 'DISABLED'})`);
            console.log('Last move type:', gameState.lastMoveType);
            
            // Show enhanced gap stats
            const ai = window.aivsHumanInstance.controller.ai;
            if (ai && ai.gapRegistry) {
                try {
                    const registryStats = ai.gapRegistry.getStats();
                    console.log('Enhanced Gap Registry Stats:', registryStats);
                    
                    if (registryStats.patternCounts) {
                        console.log('  Pattern types:', registryStats.patternCounts);
                    }
                } catch (error) {
                    console.warn('⚠️ Error getting gap registry stats:', error.message);
                }
            }
            
        } else {
            console.log('❌ Controller missing');
        }
    } else {
        console.log('❌ Instance missing');
    }
    
    console.log('🔍 === END ENHANCED DEBUG ===');
}

// ===== GLOBAL HELPER FUNCTIONS =====
window.startGame = function() {
    if (window.aivsHumanInstance) {
        window.aivsHumanInstance.handleStartGame();
        const button = document.getElementById('mainButton');
        if (button) {
            button.textContent = 'New Game';
            button.classList.add('new-game');
        }
        console.log('🎮 Game started with enhanced features');
    } else {
        console.warn('⚠️ Game instance not available');
    }
};

window.stopGame = function() {
    if (window.aivsHumanInstance) {
        window.aivsHumanInstance.handleStopGame();
        const button = document.getElementById('mainButton');
        if (button) {
            button.textContent = 'Start Game';
            button.classList.remove('new-game');
        }
    }
};

window.debugGame = function() {
    debugEnhancedGameState();
};

window.forceVerifySystem = function() {
    verifyEnhancedSystem();
};

// ===== IMPROVED INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded - starting enhanced initialization...');
    
    // Wait a bit longer for scripts to settle, then start robust loading
    setTimeout(async () => {
        // Check if this is an AI vs Human page
        // Detect by: title contains "vs ai", or page has the gameBoard element (unique to this page)
        const pageTitle = document.title.toLowerCase();
        const hasGameBoard = document.getElementById('gameBoard') !== null;
        const isAIvsHumanPage = pageTitle.includes('vs ai') ||
                              pageTitle.includes('ai vs human') ||
                              pageTitle.includes('human vs ai') ||
                              hasGameBoard;
        
        if (isAIvsHumanPage) {
            console.log('🎮 AI vs Human page detected - starting robust activation...');
            
            try {
                const success = await window.activateAIvsHuman();
                if (success) {
                    console.log('✅ ENHANCED Gap Registry system ready');
                    console.log('📋 Features: L/I/Diagonal patterns, Fragment connection (move 20+)');
                } else {
                    console.log('❌ Activation failed - see error details above');
                }
            } catch (error) {
                console.error('❌ Activation error:', error);
                showLoadingError(`Activation failed: ${error.message}`);
            }
            
        } else {
            console.log('ℹ️ Not an AI vs Human page - manual activation available');
        }
    }, 500); // Increased from 200ms to 500ms for more stability
});

// ===== ENHANCED ANALYSIS TOOLS =====
window.analyzeFragments = function() {
    if (!window.aivsHumanInstance?.controller?.ai) {
        console.log('❌ AI not available');
        return null;
    }
    
    const ai = window.aivsHumanInstance.controller.ai;
    
    // Initialize fragment analyzer if needed
    if (!ai.fragmentAnalyzer && typeof ai.initializeFragmentAnalyzer === 'function') {
        ai.initializeFragmentAnalyzer();
    }
    
    if (ai.fragmentAnalyzer) {
        try {
            const analysis = ai.fragmentAnalyzer.analyzeFragments();
            console.log('🔗 === FRAGMENT ANALYSIS ===');
            console.log(`Total fragments: ${analysis.fragments.length}`);
            console.log(`Chain connected: ${analysis.isConnected}`);
            console.log(`Connection needed: ${analysis.connectionNeeded}`);
            
            if (analysis.fragments.length > 0) {
                analysis.fragments.forEach((fragment, i) => {
                    console.log(`Fragment ${i + 1}:`);
                    console.log(`  - Pieces: ${fragment.pieces.length}`);
                    console.log(`  - Bounds: (${fragment.minRow},${fragment.minCol}) to (${fragment.maxRow},${fragment.maxCol})`);
                });
            }
            
            console.log('🔗 === END FRAGMENT ANALYSIS ===');
            return analysis;
        } catch (error) {
            console.error('❌ Fragment analysis error:', error);
            return null;
        }
    } else {
        console.log('⚠️ Fragment analyzer not available');
        return null;
    }
};

window.analyzePatterns = function() {
    if (!window.aivsHumanInstance?.controller?.ai?.gapRegistry) {
        console.log('❌ Gap registry not available');
        return null;
    }
    
    try {
        const registry = window.aivsHumanInstance.controller.ai.gapRegistry;
        registry.debugGapDetection();
        
        const stats = registry.getStats();
        if (stats.patternCounts) {
            console.log('\n📊 === PATTERN SUMMARY ===');
            console.log(`L-patterns (2 gaps): ${stats.patternCounts.L || 0}`);
            console.log(`I-patterns (3 gaps): ${stats.patternCounts.I || 0}`);
            console.log(`Diagonal patterns (1 gap): ${stats.patternCounts.D || 0}`);
            console.log(`Total patterns: ${stats.totalPatterns}`);
            console.log(`Total active gaps: ${stats.totalActiveGaps}`);
            console.log('📊 === END PATTERN SUMMARY ===\n');
        }
        
        return stats;
    } catch (error) {
        console.error('❌ Pattern analysis error:', error);
        return null;
    }
};

console.log('✅ ENHANCED AI vs Human activation loaded with robust loading verification');
console.log('🎮 Available commands:');
console.log('  - activateAIvsHuman() - Activate with robust loading (async)');
console.log('  - startGame() - Start/restart game');
console.log('  - stopGame() - Stop game');
console.log('  - debugGame() - Debug ENHANCED system state');
console.log('  - forceVerifySystem() - Force system verification');
console.log('  - analyzeFragments() - Analyze chain fragments (NEW)');
console.log('  - analyzePatterns() - Analyze patterns including diagonals (NEW)');