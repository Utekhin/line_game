// fragment-manager.js - COMPLETE VERSION with Direction-Aware Head Tracking
// FIXED: x1 can extend once in each direction (N and S), not twice in same direction
// ARCHITECTURE: Stores state, provides queries to HeadManager

class FragmentManager {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        
        this.fragments = [];
        this.activeFragment = null;
        this.initialMove = null;  // The first move (x1)
        
        // ✅ HEAD USAGE TRACKING - Direction-aware for x1
        this.usedHeads = new Map();           // Usage count per head
        this.x1DirectionUsage = new Set();    // Directions x1 has used (N/S or W/E)
        this.lastExtensionFromHead = null;
        
        // Dependencies (injected)
        this.fragmentAnalyzer = null;
        this.gapRegistry = null;
        
        this.debugMode = true;
        this.verboseLogging = true;
        
        this.log('📦 Fragment Manager initialized with direction-aware tracking');
    }

    // ===== DEPENDENCY INJECTION =====
    
    setFragmentAnalyzer(analyzer) {
        this.fragmentAnalyzer = analyzer;
        this.log('🔗 Fragment Analyzer connected');
    }
    
    setGapRegistry(registry) {
        this.gapRegistry = registry;
        this.log('🔗 Gap Registry connected');
    }

    // ===== FRAGMENT MANAGEMENT =====
    
    /**
     * Update fragments using FragmentAnalyzer
     * FIXED: Reliable x1 identification from game history
     */
    updateFragments() {
    // Force fresh fragment analysis
    if (this.fragmentAnalyzer && this.fragmentAnalyzer.clearCache) {
        this.fragmentAnalyzer.clearCache();
    }
    
    // Identify x1 (initial move) if not already identified
    if (!this.initialMove && this.gameCore.gameHistory && this.gameCore.gameHistory.length > 0) {
        const firstXMove = this.gameCore.gameHistory.find(move => move.player === 'X');
        if (firstXMove) {
            this.initialMove = { row: firstXMove.row, col: firstXMove.col };
            this.log(`✅ Initial move (x1): (${this.initialMove.row},${this.initialMove.col})`);
        }
    }
    
    try {
        // Get fresh fragments
        const fragments = this.fragmentAnalyzer.analyzeFragments();
        
        if (!fragments || fragments.length === 0) {
            this.log('No fragments detected');
            this.fragments = [];
            this.activeFragment = null;
            return;
        }
        
        // Store fragments
        this.fragments = fragments;
        
        // ✅ CRITICAL FIX: Update active fragment
        this.activeFragment = this.selectBestFragment(this.fragments);
        
        if (this.debugMode) {
            this.log(`${this.fragments.length} fragments updated`);
            this.log(`Active fragment: ${this.activeFragment?.id}, ${this.activeFragment?.pieces?.length || 0} pieces, heads: ${this.activeFragment?.heads?.map(h => `(${h.row},${h.col})`).join(', ')}`);
        }
        
    } catch (error) {
        this.log(`❌ Fragment update error: ${error.message}`);
        console.error('[FRAGMENT-MANAGER] Error:', error);
    }
}

    // ===== HEAD USAGE TRACKING - Direction-Aware =====
    
    /**
     * Mark head as used after successful extension
     * ENHANCED: For x1, tracks which direction was used
     */
    markHeadAsUsed(head, direction = null) {
        if (!head) {
            this.log('⚠️ markHeadAsUsed called with null head - skipping');
            return;
        }
        
        const key = `${head.row},${head.col}`;
        const currentUsage = this.usedHeads.get(key) || 0;
        const isX1 = this.isInitialMove(head);
        
        // ✅ CRITICAL: For x1, track direction usage
        if (isX1 && direction) {
            const normalizedDir = this.normalizeDirection(direction);
            
            if (normalizedDir) {
                if (this.x1DirectionUsage.has(normalizedDir)) {
                    this.log(`⚠️ WARNING: x1 already extended ${normalizedDir}!`);
                    this.log(`   Previously used: ${Array.from(this.x1DirectionUsage).join(', ')}`);
                }
                
                this.x1DirectionUsage.add(normalizedDir);
                this.log(`✅ x1 direction ${normalizedDir} marked as used`);
            }
        }
        
        const limit = isX1 ? 2 : 1;
        
        // Safety check
        if (currentUsage >= limit) {
            this.log(`⚠️ WARNING: Head (${head.row},${head.col}) already at limit ${currentUsage}/${limit}`);
        }
        
        this.usedHeads.set(key, currentUsage + 1);
        this.lastExtensionFromHead = head;
        
        const dirInfo = direction ? ` (direction: ${direction})` : '';
        this.log(`✅ Head (${head.row},${head.col}) marked as used - ${currentUsage + 1}/${limit}${dirInfo} ${isX1 ? '[x1]' : ''}`);
    }
    
    /**
     * Check if head was already used for extension
     */
    isHeadUsed(head) {
        const key = `${head.row},${head.col}`;
        const usageCount = this.usedHeads.get(key) || 0;
        
        if (this.isInitialMove(head)) {
            return usageCount >= 2;  // x1 can extend twice (once per direction)
        }
        
        return usageCount >= 1;  // Regular heads: once only
    }

    /**
     * Check if position is the initial move (x1)
     */
    isInitialMove(head) {
        if (!head || !this.initialMove) {
            return false;
        }
        
        return head.row === this.initialMove.row && head.col === this.initialMove.col;
    }

    /**
     * Get remaining extensions for a head
     * ENHANCED: For x1, checks direction availability
     */
    getRemainingExtensions(head, requestedDirection = null) {
        const key = `${head.row},${head.col}`;
        const usageCount = this.usedHeads.get(key) || 0;
        const isX1 = this.isInitialMove(head);
        
        if (isX1) {
            // For x1, check direction-specific availability
            if (requestedDirection) {
                const normalizedDir = this.normalizeDirection(requestedDirection);
                
                if (normalizedDir && this.x1DirectionUsage.has(normalizedDir)) {
                    // This specific direction already used
                    if (this.verboseLogging) {
                        this.log(`x1 direction ${normalizedDir} already used - 0 remaining`);
                    }
                    return 0;
                }
            }
            
            // Return remaining based on total count
            const remaining = Math.max(0, 2 - usageCount);
            return remaining;
        }
        
        // Regular heads: 1 extension only
        return usageCount === 0 ? 1 : 0;
    }
    
    /**
     * Check if specific direction is available for a head
     * NEW: Direction-aware check for x1
     */
    isDirectionAvailable(head, direction) {
        if (!this.isInitialMove(head)) {
            return true; // Non-x1 heads don't have direction restrictions
        }
        
        if (!direction) {
            return true; // No direction specified
        }
        
        const normalizedDir = this.normalizeDirection(direction);
        if (!normalizedDir) {
            return true; // Couldn't normalize, allow it
        }
        
        const available = !this.x1DirectionUsage.has(normalizedDir);
        
        if (!available && this.verboseLogging) {
            this.log(`Direction ${normalizedDir} NOT available for x1 - already used`);
        }
        
        return available;
    }

    /**
     * Normalize direction to primary axis (N/S for X, W/E for O)
     */
    normalizeDirection(direction) {
        if (!direction) return null;
        
        const dir = direction.toString().toLowerCase();
        
        if (this.player === 'X') {
            // X player: normalize to N or S
            if (dir.includes('n') || dir === 'north' || dir === 'up') return 'N';
            if (dir.includes('s') || dir === 'south' || dir === 'down') return 'S';
        } else {
            // O player: normalize to W or E
            if (dir.includes('w') || dir === 'west' || dir === 'left') return 'W';
            if (dir.includes('e') || dir === 'east' || dir === 'right') return 'E';
        }
        
        return null;
    }
    
    /**
     * Get available directions for x1
     */
    getAvailableDirections() {
        if (!this.initialMove) return [];
        
        const allDirections = this.player === 'X' ? ['N', 'S'] : ['W', 'E'];
        return allDirections.filter(dir => !this.x1DirectionUsage.has(dir));
    }

    /**
     * Get available (unused) heads from active fragment
     */
    getAvailableHeads(fragment) {
        if (!fragment || !fragment.heads) return [];
        
        return fragment.heads.filter(head => {
            const remaining = this.getRemainingExtensions(head);
            
            if (this.debugMode && remaining === 0) {
                const key = `${head.row},${head.col}`;
                const usage = this.usedHeads.get(key) || 0;
                this.log(`Head (${head.row},${head.col}) exhausted - used ${usage} times`);
            }
            
            return remaining > 0;
        });
    }

    // ===== FRAGMENT SELECTION =====
    
    selectInitialFragment(fragments) {
        if (fragments.length === 0) return null;
        
        // Use prioritization logic
        const prioritized = this.prioritizeFragments(fragments);
        this.activeFragment = prioritized[0];
        
        this.log(`Active fragment selected: ${this.activeFragment?.id || 'none'}`);
        return this.activeFragment;
    }
    
    prioritizeFragments(fragments) {
        // Sort by fragment value (coverage)
        return fragments.sort((a, b) => {
            const valueA = a.analysis?.value || 0;
            const valueB = b.analysis?.value || 0;
            return valueB - valueA;
        });
    }
    
    selectBestFragment(fragments) {
        if (!fragments || fragments.length === 0) {
            this.log('❌ No fragments provided for selection');
            return null;
        }
        
        if (fragments.length === 1) {
            this.log(`🎯 Single fragment selected: ${fragments[0].id}`);
            return fragments[0];
        }
        
        const prioritized = this.prioritizeFragments(fragments);
        const selected = prioritized[0];
        
        this.log(`🎯 Best fragment selected: ${selected.id} (${selected.pieces.length} pieces)`);
        return selected;
    }
    
    switchToFragment(newFragment, reason = 'strategic-switch') {
        const previousFragment = this.activeFragment;
        this.activeFragment = newFragment;
        
        this.log(`Fragment switched: ${reason}`);
        if (previousFragment) {
            this.log(`  From: ${previousFragment.id}`);
        }
        if (newFragment) {
            this.log(`  To: ${newFragment.id}`);
        }
        
        return this.activeFragment;
    }

    // ===== ACCESSORS =====
    
    getActiveFragment() {
        return this.activeFragment;
    }
    
    getFragments() {
        return this.fragments;
    }
    
    getFragmentCount() {
        return this.fragments.length;
    }

    // ===== FRAGMENT STRATEGY =====
    
    updateFragmentStrategy() {
        const moveCount = this.gameCore.moveCount || 0;
        
        // Fragment strategy needs at least 2 X pieces
        if (moveCount < 5) {
            return {
                activeFragment: null,
                recommendation: 'early-game',
                reason: `Early game (move ${moveCount}) - need at least x1+x2 for fragments`
            };
        }
        
        this.log(`Updating fragment strategy for move ${moveCount}`);
        
        const fragments = this.fragmentAnalyzer.analyzeFragments();
        
        if (fragments.length === 0) {
            this.log('❌ No fragments detected');
            return {
                activeFragment: null,
                recommendation: 'no-fragments',
                reason: 'No fragments detected'
            };
        }
        
        const bestFragment = this.selectBestFragment(fragments);
        this.activeFragment = bestFragment;
        
        return {
            activeFragment: bestFragment,
            recommendation: 'extend-from-head',
            reason: 'Selected best available fragment'
        };
    }

    // ===== DIAGNOSTICS =====
    
    /**
     * Debug helper to show head usage with direction info
     */
    logHeadUsage() {
        if (this.usedHeads.size === 0) {
            this.log('No heads have been used yet');
            return;
        }
        
        this.log('📊 Head usage summary:');
        
        if (this.initialMove) {
            this.log(`   x1 (initial move): (${this.initialMove.row},${this.initialMove.col})`);
            if (this.x1DirectionUsage.size > 0) {
                const used = Array.from(this.x1DirectionUsage).join(', ');
                this.log(`      Directions used: ${used}`);
                
                const allDirs = this.player === 'X' ? ['N', 'S'] : ['W', 'E'];
                const remaining = allDirs.filter(d => !this.x1DirectionUsage.has(d));
                
                if (remaining.length > 0) {
                    this.log(`      Directions available: ${remaining.join(', ')}`);
                } else {
                    this.log(`      🚫 All directions exhausted`);
                }
            }
        } else {
            this.log('   ⚠️ x1 not yet identified!');
        }
        
        this.usedHeads.forEach((count, key) => {
            const [row, col] = key.split(',').map(Number);
            const isX1 = this.isInitialMove({row, col});
            const limit = isX1 ? 2 : 1;
            const status = count >= limit ? '🚫 EXHAUSTED' : '✅ AVAILABLE';
            
            this.log(`   (${row},${col}): ${count}/${limit} ${isX1 ? '[x1] ' : ''}${status}`);
        });
    }
    
    forceFragmentRefresh() {
        if (this.fragmentAnalyzer && this.fragmentAnalyzer.clearCache) {
            this.fragmentAnalyzer.clearCache();
        }
        return this.updateFragments();
    }
    
    reset() {
        this.fragments = [];
        this.activeFragment = null;
        this.usedHeads.clear();
        this.x1DirectionUsage.clear();
        this.lastExtensionFromHead = null;
        this.log('Fragment Manager reset');
    }

    // ===== LOGGING =====
    
    log(message) {
        if (this.debugMode) {
            console.log(`[FRAGMENT-MANAGER] ${message}`);
        }
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.verboseLogging = enabled;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.FragmentManager = FragmentManager;
    console.log('✅ Fragment Manager loaded - Direction-aware head tracking enabled');
}