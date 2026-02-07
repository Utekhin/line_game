// chain-head-manager.js - UPDATED: Fragment-Aware Chain Head Management
// REPLACES: Old simple chain head tracking with multi-fragment capability
// KEEPS: Same filename and class name for compatibility

class ChainHeadManager {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.direction = player === 'X' ? 'vertical' : 'horizontal';
        
        // Initialize fragment analyzer (lazy loading)
        this.fragmentAnalyzer = null;
        
        // Current fragment analysis
        this.fragments = [];
        this.activeFragment = null;  // The fragment we're currently developing
        this.fragmentHeads = new Map(); // Fragment ID -> {nearBorder, farBorder}

        // Track which head direction was extended last for balanced development
        this.lastExtendedHeadType = null; // 'near' or 'far'

        this.debugMode = true;
        
        this.log(`🔗 Fragment-Aware Chain Manager initialized for ${player} (${this.direction})`);
    }

    // Initialize fragment analyzer when first needed
    initializeFragmentAnalyzer() {
        if (!this.fragmentAnalyzer && typeof window.ChainFragmentAnalyzer !== 'undefined') {
            this.fragmentAnalyzer = new ChainFragmentAnalyzer(this.gameCore, this.player);
            this.log('🔗 Fragment analyzer initialized');
        }
    }

    /**
     * MAIN: Update analysis of all fragments and their heads (REPLACES updateHeads)
     */
    updateHeads() {
        this.updateFragmentAnalysis();
    }

    updateFragmentAnalysis() {
        this.log(`🔍 Updating fragment analysis...`);
        
        // Initialize fragment analyzer if needed
        this.initializeFragmentAnalyzer();
        
        // Get all fragments
        if (this.fragmentAnalyzer) {
            this.fragments = this.fragmentAnalyzer.findChainFragments();
        } else {
            // Fallback: treat all pieces as one fragment
            this.fragments = this.createFallbackFragment();
        }
        
        if (this.fragments.length === 0) {
            this.log('❌ No fragments found');
            this.activeFragment = null;
            this.fragmentHeads.clear();
            return;
        }
        
        // Analyze each fragment and assign heads
        for (let i = 0; i < this.fragments.length; i++) {
            const fragment = this.fragments[i];
            const heads = this.calculateFragmentHeads(fragment, i);
            this.fragmentHeads.set(i, heads);
            
            this.log(`📊 Fragment ${i}: ${fragment.pieces.length} pieces, heads: near(${heads.nearBorder?.row},${heads.nearBorder?.col}) far(${heads.farBorder?.row},${heads.farBorder?.col})`);
        }
        
        // Select the best fragment to focus on
        this.selectActiveFragment();
        
        this.log(`✅ Fragment analysis complete: ${this.fragments.length} fragments, active: ${this.activeFragment?.id}`);
    }

    /**
     * Create fallback fragment when analyzer not available
     */
    createFallbackFragment() {
        const pieces = this.gameCore.getPlayerPositions(this.player);
        if (pieces.length === 0) return [];
        
        return [{
            pieces: pieces,
            minRow: Math.min(...pieces.map(p => p.row)),
            maxRow: Math.max(...pieces.map(p => p.row)),
            minCol: Math.min(...pieces.map(p => p.col)),
            maxCol: Math.max(...pieces.map(p => p.col)),
            connectedToTopBorder: pieces.some(p => p.row === 0),
            connectedToBottomBorder: pieces.some(p => p.row === this.gameCore.size - 1),
            connectedToLeftBorder: pieces.some(p => p.col === 0),
            connectedToRightBorder: pieces.some(p => p.col === this.gameCore.size - 1)
        }];
    }

    /**
     * Calculate heads for a specific fragment
     */
    calculateFragmentHeads(fragment, fragmentId) {
        if (!fragment.pieces || fragment.pieces.length === 0) {
            return { nearBorder: null, farBorder: null };
        }
        
        if (fragment.pieces.length === 1) {
            // Single piece - it's both heads
            const piece = fragment.pieces[0];
            this.log(`🎯 Fragment ${fragmentId}: Single piece at (${piece.row},${piece.col}) - both heads`);
            return { nearBorder: piece, farBorder: piece };
        }
        
        let nearBorderHead, farBorderHead;
        
        if (this.player === 'X') {
            // Vertical player - find closest to top (row 0) and bottom (row 14)
            nearBorderHead = fragment.pieces[0];
            farBorderHead = fragment.pieces[0];
            
            for (const piece of fragment.pieces) {
                if (piece.row < nearBorderHead.row) {
                    nearBorderHead = piece;
                }
                if (piece.row > farBorderHead.row) {
                    farBorderHead = piece;
                }
            }
            
            this.log(`🎯 Fragment ${fragmentId} heads: near(${nearBorderHead.row},${nearBorderHead.col}) far(${farBorderHead.row},${farBorderHead.col})`);
            
        } else {
            // Horizontal player - find closest to left (col 0) and right (col 14)
            nearBorderHead = fragment.pieces[0];
            farBorderHead = fragment.pieces[0];
            
            for (const piece of fragment.pieces) {
                if (piece.col < nearBorderHead.col) {
                    nearBorderHead = piece;
                }
                if (piece.col > farBorderHead.col) {
                    farBorderHead = piece;
                }
            }
            
            this.log(`🎯 Fragment ${fragmentId} heads: near(${nearBorderHead.row},${nearBorderHead.col}) far(${farBorderHead.row},${farBorderHead.col})`);
        }
        
        return { nearBorder: nearBorderHead, farBorder: farBorderHead };
    }

    /**
     * Select which fragment to actively develop
     */
    selectActiveFragment() {
        if (this.fragments.length === 0) {
            this.activeFragment = null;
            return;
        }
        
        if (this.fragments.length === 1) {
            this.activeFragment = { id: 0, fragment: this.fragments[0] };
            this.log(`🎯 Single fragment active: Fragment 0`);
            return;
        }
        
        // Score each fragment for development priority
        let bestFragment = null;
        let bestScore = -1;
        
        for (let i = 0; i < this.fragments.length; i++) {
            const fragment = this.fragments[i];
            const score = this.scoreFragmentForDevelopment(fragment, i);
            
            this.log(`📊 Fragment ${i} score: ${score} (${fragment.pieces.length} pieces)`);
            
            if (score > bestScore) {
                bestScore = score;
                bestFragment = { id: i, fragment: fragment };
            }
        }
        
        this.activeFragment = bestFragment;
        if (this.activeFragment) {
            this.log(`🎯 Selected active fragment: ${this.activeFragment.id} (score: ${bestScore})`);
        }
    }

    /**
     * Score a fragment for development priority
     */
    scoreFragmentForDevelopment(fragment, fragmentId) {
        let score = 0;
        
        // Base score from fragment size
        score += fragment.pieces.length * 10;
        
        // Bonus for border connections
        if (this.player === 'X') {
            if (fragment.connectedToTopBorder) score += 100;
            if (fragment.connectedToBottomBorder) score += 100;
            if (fragment.connectedToTopBorder && fragment.connectedToBottomBorder) {
                score += 1000; // This fragment already wins!
            }
        } else {
            if (fragment.connectedToLeftBorder) score += 100;
            if (fragment.connectedToRightBorder) score += 100;
            if (fragment.connectedToLeftBorder && fragment.connectedToRightBorder) {
                score += 1000; // This fragment already wins!
            }
        }
        
        // Bonus for being closer to borders
        const heads = this.fragmentHeads.get(fragmentId);
        if (heads) {
            if (this.player === 'X') {
                if (heads.nearBorder) {
                    score += (15 - heads.nearBorder.row) * 2; // Closer to top = higher score
                }
                if (heads.farBorder) {
                    score += heads.farBorder.row * 2; // Closer to bottom = higher score
                }
            } else {
                if (heads.nearBorder) {
                    score += (15 - heads.nearBorder.col) * 2; // Closer to left = higher score
                }
                if (heads.farBorder) {
                    score += heads.farBorder.col * 2; // Closer to right = higher score
                }
            }
        }
        
        return score;
    }

    /**
     * COMPATIBILITY: Get heads for the active fragment (SAME API as before)
     */
    getHeads() {
        if (!this.activeFragment || !this.fragmentHeads.has(this.activeFragment.id)) {
            return { nearBorder: null, farBorder: null };
        }
        
        return this.fragmentHeads.get(this.activeFragment.id);
    }

    /**
     * Select a head from the active fragment for extension (ENHANCED with head reassignment)
     * Uses getBestExtendingHead() to find frontier pieces when primary heads are blocked.
     * Alternates between near and far to develop the chain toward BOTH borders.
     */
    selectRandomHead() {
        const heads = this.getHeads();

        if (!heads.nearBorder && !heads.farBorder) {
            this.log('❌ No heads available in active fragment');
            return null;
        }

        // ENHANCED: Get best extending heads (with frontier piece fallback)
        const nearExtendingHead = this.getBestExtendingHead('near');
        const farExtendingHead = this.getBestExtendingHead('far');

        const nearCanExtend = nearExtendingHead !== null;
        const farCanExtend = farExtendingHead !== null;

        this.log(`🎯 Head selection: near=${nearCanExtend}, far=${farCanExtend}, lastExtended=${this.lastExtendedHeadType}`);

        // PRIORITY 1: Only one direction has extending pieces - use it
        if (farCanExtend && !nearCanExtend) {
            this.log(`🎯 Selecting far head (${farExtendingHead.row},${farExtendingHead.col}) - only direction with extensions`);
            this.lastExtendedHeadType = 'far';
            return farExtendingHead;
        }

        if (nearCanExtend && !farCanExtend) {
            this.log(`🎯 Selecting near head (${nearExtendingHead.row},${nearExtendingHead.col}) - only direction with extensions`);
            this.lastExtendedHeadType = 'near';
            return nearExtendingHead;
        }

        // PRIORITY 2: Both directions have extending pieces - use BALANCED selection
        if (nearCanExtend && farCanExtend) {
            let selectedHead;
            let selectedType;

            if (this.lastExtendedHeadType === 'far') {
                // Last extension was far direction, now extend near
                selectedHead = nearExtendingHead;
                selectedType = 'near';
                this.log(`🔄 Balanced selection: last was FAR, now selecting NEAR at (${selectedHead.row},${selectedHead.col})`);
            } else if (this.lastExtendedHeadType === 'near') {
                // Last extension was near direction, now extend far
                selectedHead = farExtendingHead;
                selectedType = 'far';
                this.log(`🔄 Balanced selection: last was NEAR, now selecting FAR at (${selectedHead.row},${selectedHead.col})`);
            } else {
                // First extension - random choice
                selectedHead = Math.random() < 0.5 ? nearExtendingHead : farExtendingHead;
                selectedType = selectedHead === nearExtendingHead ? 'near' : 'far';
                this.log(`🎲 First extension - randomly selected ${selectedType} at (${selectedHead.row},${selectedHead.col})`);
            }

            this.lastExtendedHeadType = selectedType;
            return selectedHead;
        }

        // PRIORITY 3: No extensions available - return primary head for border connections
        this.log('⚠️ No frontier pieces can extend in either direction');
        if (heads.farBorder) {
            this.log(`🎯 Returning primary far head (${heads.farBorder.row},${heads.farBorder.col}) for potential border connection`);
            return heads.farBorder;
        }

        this.log(`🎯 Returning primary near head (${heads.nearBorder.row},${heads.nearBorder.col}) for potential border connection`);
        return heads.nearBorder;
    }

    /**
     * Reset the head extension tracking (call when game resets)
     */
    resetExtensionTracking() {
        this.lastExtendedHeadType = null;
        this.log('🔄 Head extension tracking reset');
    }

    /**
     * Check if a head can extend in its direction (ENHANCED: checks actual move availability)
     */
    canHeadExtend(headType) {
        const heads = this.getHeads();
        const head = headType === 'near' ? heads.nearBorder : heads.farBorder;
        if (!head) return false;

        // First check positional limit
        if (this.player === 'X') {
            if (headType === 'near' && head.row <= 1) return false;
            if (headType === 'far' && head.row >= this.gameCore.size - 2) return false;
        } else {
            if (headType === 'near' && head.col <= 1) return false;
            if (headType === 'far' && head.col >= this.gameCore.size - 2) return false;
        }

        // ENHANCED: Check if there are actual valid moves from this head
        const hasValidMoves = this.headHasValidExtensionMoves(head, headType);
        this.log(`🔍 ${headType} head (${head.row},${head.col}): hasValidMoves = ${hasValidMoves}`);
        return hasValidMoves;
    }

    /**
     * NEW: Check if a head has at least one valid extension move
     */
    headHasValidExtensionMoves(head, headType) {
        const extensionPatterns = this.getExtensionPatterns(headType);

        for (const [dr, dc] of extensionPatterns) {
            const targetRow = head.row + dr;
            const targetCol = head.col + dc;

            if (this.isValidExtensionTarget(targetRow, targetCol)) {
                return true;
            }
        }

        return false;
    }

    /**
     * NEW: Get extension patterns for a head type (L-patterns and direct)
     */
    getExtensionPatterns(headType) {
        const patterns = [];

        if (this.player === 'X') {
            if (headType === 'near') {
                // Extend toward top (negative row)
                patterns.push([-2, 1], [-2, -1], [-1, 2], [-1, -2]); // L-patterns
                patterns.push([-1, 0], [-1, 1], [-1, -1]); // Direct
            } else {
                // Extend toward bottom (positive row)
                patterns.push([2, 1], [2, -1], [1, 2], [1, -2]); // L-patterns
                patterns.push([1, 0], [1, 1], [1, -1]); // Direct
            }
        } else {
            if (headType === 'near') {
                // Extend toward left (negative col)
                patterns.push([1, -2], [-1, -2], [2, -1], [-2, -1]); // L-patterns
                patterns.push([0, -1], [1, -1], [-1, -1]); // Direct
            } else {
                // Extend toward right (positive col)
                patterns.push([1, 2], [-1, 2], [2, 1], [-2, 1]); // L-patterns
                patterns.push([0, 1], [1, 1], [-1, 1]); // Direct
            }
        }

        return patterns;
    }

    /**
     * NEW: Check if a target position is valid for extension
     */
    isValidExtensionTarget(row, col) {
        if (!this.gameCore.isValidPosition(row, col)) return false;
        if (this.gameCore.board[row][col] !== '') return false;
        if (!this.gameCore.isValidMove(row, col)) return false;
        return true;
    }

    /**
     * NEW: Find all frontier pieces that can extend in a direction
     */
    findFrontierPieces(headType) {
        if (!this.activeFragment) return [];

        const frontierPieces = [];
        const fragment = this.activeFragment.fragment;

        for (const piece of fragment.pieces) {
            if (this.headHasValidExtensionMoves(piece, headType)) {
                frontierPieces.push(piece);
            }
        }

        // Sort frontier pieces by how far they are toward the target border
        if (this.player === 'X') {
            if (headType === 'near') {
                frontierPieces.sort((a, b) => a.row - b.row); // Closest to top first
            } else {
                frontierPieces.sort((a, b) => b.row - a.row); // Closest to bottom first
            }
        } else {
            if (headType === 'near') {
                frontierPieces.sort((a, b) => a.col - b.col); // Closest to left first
            } else {
                frontierPieces.sort((a, b) => b.col - a.col); // Closest to right first
            }
        }

        this.log(`🎯 Found ${frontierPieces.length} frontier pieces for ${headType} direction`);
        return frontierPieces;
    }

    /**
     * NEW: Get best extending head (with fallback to frontier pieces)
     */
    getBestExtendingHead(headType) {
        const heads = this.getHeads();
        const primaryHead = headType === 'near' ? heads.nearBorder : heads.farBorder;

        // First try the primary head
        if (primaryHead && this.headHasValidExtensionMoves(primaryHead, headType)) {
            this.log(`✅ Primary ${headType} head (${primaryHead.row},${primaryHead.col}) can extend`);
            return primaryHead;
        }

        // Primary head is blocked - find alternative from frontier pieces
        this.log(`⚠️ Primary ${headType} head is blocked, searching for alternatives...`);
        const frontierPieces = this.findFrontierPieces(headType);

        if (frontierPieces.length > 0) {
            const alternative = frontierPieces[0];
            this.log(`🔄 HEAD REASSIGNMENT: Using frontier piece (${alternative.row},${alternative.col}) instead of blocked head`);
            return alternative;
        }

        this.log(`❌ No frontier pieces available for ${headType} direction`);
        return null;
    }

    /**
     * Get direction for a head from the active fragment (SAME API as before)
     */
    getHeadDirection(head) {
        if (!head) return null;
        
        const heads = this.getHeads();
        
        if (this.player === 'X') {
            if (head === heads.nearBorder) {
                return 'up';    // Near border head goes toward top
            } else if (head === heads.farBorder) {
                return 'down';  // Far border head goes toward bottom
            }
        } else {
            if (head === heads.nearBorder) {
                return 'left';  // Near border head goes toward left
            } else if (head === heads.farBorder) {
                return 'right'; // Far border head goes toward right
            }
        }
        
        this.log(`⚠️ Could not determine direction for head at (${head.row},${head.col})`);
        return null;
    }

    /**
     * Check if any fragment has reached both borders (SAME API enhanced)
     */
    hasHeadReachedBorder(headType) {
        if (!this.activeFragment) return false;
        
        const fragment = this.activeFragment.fragment;
        
        if (this.player === 'X') {
            if (headType === 'near') {
                return fragment.connectedToTopBorder;
            } else {
                return fragment.connectedToBottomBorder;
            }
        } else {
            if (headType === 'near') {
                return fragment.connectedToLeftBorder;
            } else {
                return fragment.connectedToRightBorder;
            }
        }
    }

    /**
     * NEW: Find the best move to connect fragments (ENHANCED FUNCTIONALITY)
     */
    getBestFragmentConnectionMove() {
        if (this.fragments.length <= 1 || !this.fragmentAnalyzer) {
            return null; // No fragments to connect
        }
        
        // Try to connect the two largest fragments
        const sortedFragments = this.fragments
            .map((fragment, index) => ({ fragment, index, score: this.scoreFragmentForDevelopment(fragment, index) }))
            .sort((a, b) => b.score - a.score);
        
        if (sortedFragments.length < 2) return null;
        
        const bestMove = this.fragmentAnalyzer.findBestConnectionMove(
            sortedFragments[0].fragment,
            sortedFragments[1].fragment
        );
        
        if (bestMove) {
            this.log(`🔗 Fragment connection found between fragments ${sortedFragments[0].index} and ${sortedFragments[1].index}`);
        }
        
        return bestMove;
    }

    /**
     * COMPATIBILITY: Get statistics (ENHANCED with fragment info)
     */
    getStats() {
        const activeFragment = this.activeFragment?.fragment;
        const totalPieces = this.fragments.reduce((sum, f) => sum + f.pieces.length, 0);
        
        return {
            totalPieces: totalPieces,
            fragmentCount: this.fragments.length,
            activeFragmentId: this.activeFragment?.id,
            activeFragmentSize: activeFragment?.pieces.length || 0,
            nearBorderHead: this.getHeads().nearBorder,
            farBorderHead: this.getHeads().farBorder,
            direction: this.direction,
            isConnected: this.fragments.length <= 1,
            canWin: this.hasAnyFragmentReachedBothBorders(),
            
            // Legacy compatibility fields
            bothHeadsSame: false, // Not applicable with fragments
            nearBorderReached: this.hasHeadReachedBorder('near'),
            farBorderReached: this.hasHeadReachedBorder('far')
        };
    }

    /**
     * Check if any fragment has reached both borders (win condition)
     */
    hasAnyFragmentReachedBothBorders() {
        for (const fragment of this.fragments) {
            if (this.player === 'X') {
                if (fragment.connectedToTopBorder && fragment.connectedToBottomBorder) {
                    this.log(`🏆 Fragment with ${fragment.pieces.length} pieces has reached both borders!`);
                    return true;
                }
            } else {
                if (fragment.connectedToLeftBorder && fragment.connectedToRightBorder) {
                    this.log(`🏆 Fragment with ${fragment.pieces.length} pieces has reached both borders!`);
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Enhanced debug analysis (REPLACES analyzeChainStructure)
     */
    analyzeChainStructure() {
        const stats = this.getStats();
        
        this.log('📊 === FRAGMENT-AWARE CHAIN ANALYSIS ===');
        this.log(`Total pieces: ${stats.totalPieces} in ${stats.fragmentCount} fragments`);
        this.log(`Direction: ${stats.direction}`);
        this.log(`Connected: ${stats.isConnected ? 'YES' : 'NO'}`);
        this.log(`Can win: ${stats.canWin ? 'YES' : 'NO'}`);
        
        if (this.activeFragment) {
            const heads = this.getHeads();
            this.log(`Active fragment: #${this.activeFragment.id} (${stats.activeFragmentSize} pieces)`);
            
            if (heads.nearBorder) {
                const nearDir = this.getHeadDirection(heads.nearBorder);
                this.log(`Near border head: (${heads.nearBorder.row},${heads.nearBorder.col}) → ${nearDir}`);
            }
            
            if (heads.farBorder) {
                const farDir = this.getHeadDirection(heads.farBorder);
                this.log(`Far border head: (${heads.farBorder.row},${heads.farBorder.col}) → ${farDir}`);
            }
        }
        
        // Show all fragments
        this.log('\nFragment details:');
        for (let i = 0; i < this.fragments.length; i++) {
            const fragment = this.fragments[i];
            const score = this.scoreFragmentForDevelopment(fragment, i);
            this.log(`  Fragment ${i}: ${fragment.pieces.length} pieces, score: ${score}`);
            this.log(`    Pieces: ${fragment.pieces.map(p => `(${p.row},${p.col})`).join(', ')}`);
            
            if (this.player === 'X') {
                this.log(`    Border connections: Top=${fragment.connectedToTopBorder}, Bottom=${fragment.connectedToBottomBorder}`);
            } else {
                this.log(`    Border connections: Left=${fragment.connectedToLeftBorder}, Right=${fragment.connectedToRightBorder}`);
            }
        }
        
        this.log('📊 === END FRAGMENT ANALYSIS ===');
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[${this.player}-FRAGMENT-HEADS] ${message}`);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ChainHeadManager = ChainHeadManager;
}
