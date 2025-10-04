// head-manager.js - COMPLETE VERSION with Direction-Aware Filtering
// ENHANCED: Determines direction BEFORE checking availability
// ARCHITECTURE: Uses FragmentManager for state queries

class HeadManager {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        
        // Current state
        this.activeHead = null;
        this.extensionDirection = null;
        this.currentFragment = null;
        
        // Dependencies (injected)
        this.fragmentManager = null;
        this.geometry = null;
        this.universalGapCalculator = null;
        this.strategicExtensionManager = null;
        
        // History tracking
        this.headSelectionHistory = [];
        this.tacticalDecisionHistory = [];
        
        // Feature flags
        this.enableHeadReassignment = false;  // Disabled for now
        
        // Debug
        this.debugMode = true;
        
        this.log('🎯 Head Manager initialized - Direction-aware filtering');
    }

    // ===== DEPENDENCY INJECTION =====
    
    setFragmentManager(manager) {
        this.fragmentManager = manager;
        this.log('🔗 Fragment Manager connected');
    }
    
    setGeometry(geometry) {
        this.geometry = geometry;
        this.log('🔗 GameGeometry connected');
    }
    
    setUniversalGapCalculator(calculator) {
        this.universalGapCalculator = calculator;
        this.log('🔗 Universal Gap Calculator connected');
    }


	setStrategicExtensionManager(manager) {
    this.strategicExtensionManager = manager;
    this.log('🔗 Strategic Extension Manager connected');
}
    // ===== MAIN INTERFACE =====
    
    /**
     * Get head tactics for move generation
     * Returns: { activeHead, extensionDirection, tacticalRecommendation, heads, fragment }
     */
    /**
 * Get head tactics for move generation
 * SIMPLIFIED: Uses strategic extension manager for all alternative strategies
 */
getHeadTactics() {
    this.log('🎯 === GET HEAD TACTICS ===');
    
    if (!this.fragmentManager) {
        this.log('❌ Fragment Manager not connected');
        return {
            activeHead: null,
            extensionDirection: null,
            tacticalRecommendation: 'no-fragment-manager',
            heads: []
        };
    }
    
    // Get active fragment
    const activeFragment = this.fragmentManager.getActiveFragment();
    
    if (!activeFragment) {
        this.log('❌ No active fragment');
        return {
            activeHead: null,
            extensionDirection: null,
            tacticalRecommendation: 'no-active-fragment',
            heads: []
        };
    }
    
    // Validate fragment
    if (!activeFragment.pieces || activeFragment.pieces.length === 0) {
        this.log('Active fragment has no pieces');
        return {
            activeHead: null,
            extensionDirection: null,
            tacticalRecommendation: 'invalid-fragment',
            heads: []
        };
    }
    
    // LEVEL 1: Try normal endpoint heads
    const heads = this.extractHeads(activeFragment);
    this.log(`Extracted ${heads.length} endpoint heads from fragment`);
    
    if (heads.length > 0) {
        const selectedHead = this.selectBestHeadWithDirection(heads, activeFragment);
        
        if (selectedHead) {
            const direction = selectedHead.selectedDirection || 
                             this.determineExtensionDirection(selectedHead, activeFragment);
            
            this.log(`✅ Selected endpoint head: (${selectedHead.row},${selectedHead.col}), direction: ${direction}`);
            
            this.activeHead = selectedHead;
            this.extensionDirection = direction;
            this.currentFragment = activeFragment;
            
            this.recordTacticalDecision(selectedHead, direction, 'head-selected');
            
            return {
                activeHead: selectedHead,
                extensionDirection: direction,
                tacticalRecommendation: 'head-selected',
                heads: heads,
                fragment: activeFragment
            };
        }
    }
    
    // LEVEL 2: All endpoint heads exhausted - Use strategic extension
    this.log('⚠️ All endpoint heads exhausted - attempting strategic extension');
    
    if (!this.strategicExtensionManager) {
        this.log('❌ Strategic Extension Manager not available');
        return {
            activeHead: null,
            extensionDirection: null,
            tacticalRecommendation: 'all-heads-exhausted',
            heads: heads
        };
    }
    
    const strategicResult = this.strategicExtensionManager.selectStrategicExtension(
        activeFragment,
        this.fragmentManager.fragments,
        this.getContext()
    );
    
    if (strategicResult) {
        this.log(`✅ Strategic extension selected: ${strategicResult.mode}`);
        
        // Update internal state
        this.activeHead = strategicResult.head;
        this.extensionDirection = strategicResult.direction;
        this.currentFragment = activeFragment;
        
        this.recordTacticalDecision(strategicResult.head, strategicResult.direction, strategicResult.mode);
        
        return {
            activeHead: strategicResult.head,
            extensionDirection: strategicResult.direction,
            tacticalRecommendation: strategicResult.mode,
            heads: [strategicResult.head],
            fragment: activeFragment,
            target: strategicResult.target,
            priority: strategicResult.priority
        };
    }
    
    // LEVEL 3: Everything failed
    this.log('❌ No head could be selected');
    return {
        activeHead: null,
        extensionDirection: null,
        tacticalRecommendation: 'all-heads-exhausted',
        heads: heads
    };
}

/**
 * Get context for strategic extension decisions
 */
getContext() {
    return {
        moveCount: this.gameCore.moveCount || 0,
        boardState: 'mid-game', // Could be calculated
        pressure: 'moderate'     // Could be calculated
    };
}

    // ===== HEAD EXTRACTION =====
    
    /**
     * Extract heads from fragment
     */
    extractHeads(fragment) {
        // 1. Use fragment's heads if available
        if (fragment.heads?.length > 0) {
            this.log(`Using fragment.heads: ${fragment.heads.length} heads`);
            return [...fragment.heads];
        }
        
        // 2. Try analysis.potentialHeads
        if (fragment.analysis?.potentialHeads?.length > 0) {
            this.log(`Using analysis.potentialHeads: ${fragment.analysis.potentialHeads.length} heads`);
            return [...fragment.analysis.potentialHeads];
        }
        
        // 3. Calculate from pieces
        if (fragment.pieces?.length > 0) {
            this.log('Calculating heads from pieces...');
            return this.calculateHeadsFromPieces(fragment.pieces);
        }
        
        this.log('No heads could be extracted');
        return [];
    }

    /**
     * Calculate heads from pieces with identity assignment
     * Excludes border rows for proper head identification
     */
    calculateHeadsFromPieces(pieces) {
        if (pieces.length === 0) return [];
        
        // Filter out border and near-border positions
        const eligiblePieces = pieces.filter(p => {
            if (this.player === 'X') {
                return p.row >= 2 && p.row <= 12;
            } else {
                return p.col >= 2 && p.col <= 12;
            }
        });
        
        if (eligiblePieces.length === 0) {
            this.log('All pieces in border rows - no heads available');
            return [];
        }
        
        // Single piece
        if (eligiblePieces.length === 1) {
            const singlePiece = { ...eligiblePieces[0] };
            if (this.player === 'X') {
                singlePiece.identity = singlePiece.row < 7 ? 'N' : 'S';
                singlePiece.direction = singlePiece.row < 7 ? 'north' : 'south';
            } else {
                singlePiece.identity = singlePiece.col < 7 ? 'W' : 'E';
                singlePiece.direction = singlePiece.col < 7 ? 'west' : 'east';
            }
            return [singlePiece];
        }
        
        // Multiple pieces: find extremes
        if (this.player === 'X') {
            const topHead = eligiblePieces.reduce((min, p) => p.row < min.row ? p : min);
            const bottomHead = eligiblePieces.reduce((max, p) => p.row > max.row ? p : max);
            
            if (topHead.row === bottomHead.row) {
                return [{ ...topHead, identity: 'N', direction: 'north' }];
            }
            
            return [
                { ...topHead, identity: 'N', direction: 'north' },
                { ...bottomHead, identity: 'S', direction: 'south' }
            ];
        } else {
            const leftHead = eligiblePieces.reduce((min, p) => p.col < min.col ? p : min);
            const rightHead = eligiblePieces.reduce((max, p) => p.col > max.col ? p : max);
            
            if (leftHead.col === rightHead.col) {
                return [{ ...leftHead, identity: 'W', direction: 'west' }];
            }
            
            return [
                { ...leftHead, identity: 'W', direction: 'west' },
                { ...rightHead, identity: 'E', direction: 'east' }
            ];
        }
    }

    // ===== HEAD SELECTION - DIRECTION AWARE =====
    
    /**
     * Select best head with direction awareness
     * CRITICAL: Determines direction BEFORE checking availability
     */
    /**
 * Select best head with direction awareness
 * CRITICAL: Determines direction BEFORE checking availability
 * FIXED: Skip heads with canExtend=false (border-connected, symbolic)
 */
selectBestHeadWithDirection(heads, fragment) {
    if (!heads || heads.length === 0) {
        this.log('No heads available for selection');
        return null;
    }
    
    // Score each head with direction consideration
    const scoredHeads = [];
    
    for (const head of heads) {
        // Skip heads that can't extend (border-connected, symbolic)
        if (head.canExtend === false) {
            this.log(`Skipping head (${head.row},${head.col}) - canExtend=false (${head.type})`);
            continue;
        }
        
        // Determine direction for this head
        const direction = head.direction || this.determineExtensionDirection(head, fragment);
        
        // Check if this head+direction combination is available
        const remaining = this.fragmentManager.getRemainingExtensions(head, direction);
        
        if (remaining === 0) {
            const isX1 = this.fragmentManager.isInitialMove(head);
            this.log(`Skipping head (${head.row},${head.col}) ${direction} - exhausted ${isX1 ? '[x1]' : ''}`);
            continue;
        }
        
        // Calculate priority
        const baseScore = this.calculateHeadPriority(head, fragment);
        const directionBonus = remaining > 1 ? 50 : 0;
        
        scoredHeads.push({
            head: head,
            direction: direction,
            score: baseScore + directionBonus,
            remaining: remaining
        });
    }
    
    if (scoredHeads.length === 0) {
        this.log('All heads exhausted');
        return null;
    }
    
    // Sort by score
    scoredHeads.sort((a, b) => b.score - a.score);
    
    const selected = scoredHeads[0];
    
    this.log(`Selected head: (${selected.head.row},${selected.head.col}) ${selected.direction}, remaining: ${selected.remaining}, score: ${selected.score}`);
    
    // Attach selected direction to head object
    const selectedHead = { ...selected.head };
    selectedHead.selectedDirection = selected.direction;
    
    return selectedHead;
}

    /**
     * Calculate strategic priority for head
     */
    calculateHeadPriority(head, fragment) {
        let priority = 0;
        
        // 1. Border distance
        const borderDistance = this.calculateBorderDistance(head);
        priority += Math.max(0, 100 - borderDistance * 10);
        
        // 2. Extension options
        const extensionOptions = this.countExtensionOptions(head);
        priority += extensionOptions * 20;
        
        // 3. Random factor
        priority += Math.random() * 10;
        
        return priority;
    }

    // ===== DIRECTION DETERMINATION =====
    
    /**
     * Determine extension direction for selected head
     */
    determineExtensionDirection(head, fragment) {
        // Priority 1: Pre-assigned direction
        if (head.direction) {
            this.log(`Head (${head.row},${head.col}) [${head.identity}-head] extending ${head.direction.toUpperCase()}`);
            return head.direction;
        }
        
        // Priority 2: Fragment-relative direction
        if (fragment && fragment.heads && fragment.heads.length > 1) {
            if (this.player === 'X') {
                const northernmostHead = fragment.heads.reduce((min, h) => 
                    h.row < min.row ? h : min
                );
                
                if (head.row === northernmostHead.row) {
                    this.log(`Head (${head.row},${head.col}) is northern - extending NORTH`);
                    return 'north';
                } else {
                    this.log(`Head (${head.row},${head.col}) is southern - extending SOUTH`);
                    return 'south';
                }
            } else {
                const westernmostHead = fragment.heads.reduce((min, h) => 
                    h.col < min.col ? h : min
                );
                
                if (head.col === westernmostHead.col) {
                    this.log(`Head (${head.row},${head.col}) is western - extending WEST`);
                    return 'west';
                } else {
                    this.log(`Head (${head.row},${head.col}) is eastern - extending EAST`);
                    return 'east';
                }
            }
        }
        
        // Priority 3: Board position fallback
        if (this.player === 'X') {
            const direction = head.row < 7 ? 'north' : 'south';
            this.log(`Head (${head.row},${head.col}) extending ${direction.toUpperCase()} (position fallback)`);
            return direction;
        } else {
            const direction = head.col < 7 ? 'west' : 'east';
            this.log(`Head (${head.row},${head.col}) extending ${direction.toUpperCase()} (position fallback)`);
            return direction;
        }
    }

    // ===== UTILITY METHODS =====
    
    calculateBorderDistance(head) {
        if (this.player === 'X') {
            return Math.min(head.row, 14 - head.row);
        } else {
            return Math.min(head.col, 14 - head.col);
        }
    }
    
    countExtensionOptions(head) {
    if (!this.geometry) return 1;
    
    // Extract clean position
    const position = { row: head.row, col: head.col };
    
    // Validate position
    if (typeof position.row !== 'number' || typeof position.col !== 'number') {
        console.error('[HEAD-MANAGER] Invalid position:', position, 'from head:', head);
        return 0;
    }
    
    try {
        const options = this.geometry.generatePatternMoves(position, {
            patterns: ['L', 'I'],
            filterValid: true,
            playerConfig: this.getPlayerConfig()
        });
        
        return options.length;
    } catch (error) {
        console.error('[HEAD-MANAGER] countExtensionOptions failed:');
        console.error('  Position:', position);
        console.error('  Head:', head);
        console.error('  PlayerConfig:', this.getPlayerConfig());
        console.error('  Error:', error.message);
        console.error('  Stack:', error.stack);
        return 0; // Return 0 instead of crashing
    }
}

    recordTacticalDecision(head, direction, reason) {
        const decision = {
            timestamp: Date.now(),
            moveNumber: this.gameCore.moveCount || 0,
            head: { row: head.row, col: head.col },
            direction: direction,
            reason: reason
        };
        
        this.tacticalDecisionHistory.push(decision);
        
        if (this.tacticalDecisionHistory.length > 50) {
            this.tacticalDecisionHistory = this.tacticalDecisionHistory.slice(-25);
        }
    }
    
    /**
 * Get complete player configuration for universal modules
 * FIXED: Includes all required properties including endEdge function
 */
/**
 * Get player configuration for geometry module
 * Simple and self-contained - no external dependencies
 */
getPlayerConfig() {
    // Get generic config from universal module
    const genericConfig = window.getDirectionConfig(this.player);
    
    // Augment with player-specific data
    return {
        ...genericConfig,              //  All generic directional logic (includes isValidPattern!)
        player: this.player,           // Add player
        opponent: this.opponent        // Add opponent
    };
}
// ===== DIAGNOSTICS =====
    
    /**
     * Log head usage information from FragmentManager
     */
    logHeadUsage() {
        if (this.fragmentManager) {
            this.fragmentManager.logHeadUsage();
        } else {
            this.log('⚠️ Fragment Manager not connected - cannot log head usage');
        }
    }
    
    getDiagnostics() {
        return {
            activeHead: this.activeHead,
            extensionDirection: this.extensionDirection,
            currentFragment: this.currentFragment,
            connected: {
                fragmentManager: !!this.fragmentManager,
                geometry: !!this.geometry,
                universalGapCalculator: !!this.universalGapCalculator
            },
            decisionHistory: this.tacticalDecisionHistory.length
        };
    }
    
    reset() {
        this.activeHead = null;
        this.extensionDirection = null;
        this.currentFragment = null;
        this.headSelectionHistory = [];
        this.tacticalDecisionHistory = [];
        this.log('Head Manager reset');
    }

    // ===== LOGGING =====
    
    log(message) {
        if (this.debugMode) {
            console.log(`[HEAD-MANAGER] ${message}`);
        }
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.HeadManager = HeadManager;
    console.log('✅ Head Manager loaded - Direction-aware filtering enabled');
}