// gap-registry.js - SIMPLIFIED: Delegates blocking detection to GapBlockingDetector
// PURPOSE: Pattern lifecycle management ONLY
// ARCHITECTURE: Clean separation - registry manages, detector checks

class GapRegistry {
    constructor(gameCore, aiPlayer = 'X') {
        this.gameCore = gameCore;
        this.aiPlayer = aiPlayer;
        this.humanPlayer = aiPlayer === 'X' ? 'O' : 'X';
        
        // Module dependencies
        this.patternDetector = null;
        this.gapAnalyzer = null;
        this.universalGapCalculator = null;
        this.gapBlockingDetector = null;  // CRITICAL: Used for all blocking checks
        
        // Pattern storage
        this.patterns = new Map();
        this.patternsByType = {
            'X-X': new Map(),
            'O-O': new Map(),
            'X-O': new Map()
        };
        
        // Gap storage
        this.gapsByPosition = new Map();
        this.gapAnalysis = new Map();
        
        // State tracking
        this.lastUpdateMove = -1;
        this.cacheValid = false;
        this.patternCounter = 0;
        
        this.debugMode = false;
        
        console.log(`Gap Registry initialized (AI: ${aiPlayer}) - Simplified`);
    }

    // ===== MODULE CONNECTIONS =====
    
    setPatternDetector(patternDetector) {
        this.patternDetector = patternDetector;
        console.log('Pattern Detector → Gap Registry');
        return this;
    }

    setGapAnalyzer(gapAnalyzer) {
        this.gapAnalyzer = gapAnalyzer;
        console.log('Gap Analyzer → Gap Registry');
        return this;
    }

    setUniversalGapCalculator(calculator) {
        this.universalGapCalculator = calculator;
        console.log('Universal Gap Calculator → Gap Registry');
        return this;
    }

    setGapBlockingDetector(detector) {
        this.gapBlockingDetector = detector;
        console.log('Gap Blocking Detector → Gap Registry');
        return this;
    }

    // ===== MAIN REGISTRY UPDATE =====
    
    updateRegistry() {
        const currentMove = this.gameCore.moveCount || 0;
        
        if (this.lastUpdateMove === currentMove && this.cacheValid) {
            return;
        }
        
        if (!this.patternDetector) {
            throw new Error('Pattern Detector not connected');
        }
        
        this.log(`Updating registry (move ${currentMove})`);
        
        try {
            this.clearPatterns();
            
            // Get filtered patterns from pattern detector
            const xPatterns = this.patternDetector.findAllPatterns(this.gameCore, 'X');
            const oPatterns = this.patternDetector.findAllPatterns(this.gameCore, 'O');
            
            // Store patterns
            if (xPatterns && xPatterns.length > 0) {
                xPatterns.forEach(pattern => this.storePattern(pattern, 'X-X'));
            }
            
            if (oPatterns && oPatterns.length > 0) {
                oPatterns.forEach(pattern => this.storePattern(pattern, 'O-O'));
            }
            
            this.log(`Stored ${xPatterns?.length || 0} X patterns, ${oPatterns?.length || 0} O patterns`);
            
            // Run gap analysis
            this.runGapAnalysis();
            
            this.lastUpdateMove = currentMove;
            this.cacheValid = true;
            
        } catch (error) {
            console.error('[GAP-REGISTRY] Update failed:', error);
            this.cacheValid = false;
        }
    }

    /**
     * Store pattern with ID
     */
    storePattern(pattern, ownershipType) {
        const patternId = `pattern-${this.patternCounter++}`;
        pattern.id = patternId;
        
        this.patterns.set(patternId, pattern);
        this.patternsByType[ownershipType].set(patternId, pattern);
        
        // Index gaps
        if (pattern.gaps && pattern.gaps.length > 0) {
            pattern.gaps.forEach(gap => {
                const key = `${gap.row},${gap.col}`;
                if (!this.gapsByPosition.has(key)) {
                    this.gapsByPosition.set(key, []);
                }
                this.gapsByPosition.get(key).push(patternId);
            });
        }
    }

    /**
     * Run gap analysis for both players
     */
    runGapAnalysis() {
        if (!this.gapAnalyzer) {
            this.log('Gap Analyzer not available');
            return;
        }
        
        ['X', 'O'].forEach(player => {
            try {
                const analysis = this.gapAnalyzer.analyzeGaps(player);
                this.gapAnalysis.set(player, analysis);
                
                this.log(`Analysis for ${player}: ${analysis.totalGaps} gaps, ${analysis.threatenedGaps?.length || 0} threatened`);
            } catch (error) {
                console.error(`[GAP-REGISTRY] Analysis failed for ${player}:`, error);
                this.gapAnalysis.set(player, this.getEmptyAnalysis(player));
            }
        });
    }

    /**
     * Get empty analysis structure
     */
    getEmptyAnalysis(player) {
        return {
            player: player,
            gaps: [],
            threatenedGaps: [],
            safeGaps: [],
            attackOpportunities: [],
            totalGaps: 0,
            totalPatterns: 0,
            timestamp: this.gameCore.moveCount || 0,
            early_game: false
        };
    }

    // ===== UPDATE METHODS =====
    
    /**
     * Update registry after a move is made
     * SIMPLIFIED: Delegates blocking detection to GapBlockingDetector
     */
    updateAfterMove(row, col, player) {
        this.log(`🔄 Processing move at (${row},${col}) by ${player}`);
        
        const currentMove = this.gameCore.moveCount || 0;
        
        // STEP 1: Check if this move fills any gaps
        const gapKey = `${row},${col}`;
        const affectedPatterns = this.gapsByPosition.get(gapKey) || [];
        
        if (affectedPatterns.length > 0) {
            this.log(`  ⚡ Move affects ${affectedPatterns.length} pattern(s)`);
            
            affectedPatterns.forEach(patternId => {
                const pattern = this.patterns.get(patternId);
                if (!pattern) return;
                
                const patternOwner = pattern.player1;
                const isOwnerMove = (player === patternOwner);
                
                if (isOwnerMove) {
                    // Owner filled the gap → pattern complete
                    this.log(`  ✅ Pattern ${patternId} completed by ${player} - removing`);
                    this.removePattern(patternId);
                } else {
                    // Opponent filled the gap → check if fully blocked
                    const allGapsFilled = this.areAllPatternGapsFilled(pattern);
                    
                    if (allGapsFilled) {
                        this.log(`  🚫 Pattern ${patternId} fully blocked by ${player} - removing`);
                        this.removePattern(patternId);
                    } else {
                        this.log(`  ⚠️ Pattern ${patternId} threatened by ${player} - keeping`);
                    }
                }
            });
            
            this.gapsByPosition.delete(gapKey);
        }
        
        // STEP 2: Delegate diagonal blocking detection to GapBlockingDetector
        if (currentMove > 1 && this.gapBlockingDetector) {
            const allPatterns = Array.from(this.patterns.values());
            const blockingResult = this.gapBlockingDetector.checkPatternBlockingAfterMove(
                row, col, player, allPatterns
            );
            
            // Remove blocked patterns
            if (blockingResult.blockedCount > 0) {
                blockingResult.blockedPatterns.forEach(patternId => {
                    this.log(`  ✂️ Pattern ${patternId} blocked by new diagonal`);
                    this.removePattern(patternId);
                });
            }
        }
        
        // STEP 3: Invalidate cache and update registry
        this.invalidateCache();
        this.updateRegistry();
        
        this.log(`  📊 Registry updated: ${this.patterns.size} active patterns`);
    }

    /**
     * Check if all gaps in a pattern are filled
     */
    areAllPatternGapsFilled(pattern) {
        if (!pattern.gaps || pattern.gaps.length === 0) {
            return true;
        }
        
        for (const gap of pattern.gaps) {
            const cellValue = this.gameCore.board[gap.row]?.[gap.col];
            if (cellValue === null || cellValue === '') {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Remove pattern from registry
     */
    removePattern(patternId) {
        const pattern = this.patterns.get(patternId);
        if (!pattern) return;
        
        this.log(`  🗑️ Removing pattern ${patternId}`);
        
        // Remove from main registry
        this.patterns.delete(patternId);
        
        // Remove from ownership types
        Object.values(this.patternsByType).forEach(typeMap => {
            typeMap.delete(patternId);
        });
        
        // Remove from gap position index
        if (pattern.gaps) {
            pattern.gaps.forEach(gap => {
                const gapKey = `${gap.row},${gap.col}`;
                const patterns = this.gapsByPosition.get(gapKey);
                if (patterns) {
                    const index = patterns.indexOf(patternId);
                    if (index > -1) {
                        patterns.splice(index, 1);
                    }
                    if (patterns.length === 0) {
                        this.gapsByPosition.delete(gapKey);
                    }
                }
            });
        }
    }

/**
 * Remove patterns blocked by opponent diagonals
 * Call after each opponent move
 */
cleanupBlockedPatterns() {
    if (!this.patternDetector) {
        this.log('⚠️ Pattern Detector not available for cleanup');
        return 0;
    }
    
    // Convert Map to array
    const allPatterns = Array.from(this.patterns.values());
    
    // Filter player patterns (X-X or O-O, not mixed)
    const playerPatterns = allPatterns.filter(p => {
        // Get pattern owner
        const owner = p.player1 || p.player;
        return owner === this.player;
    });
    
    if (playerPatterns.length === 0) {
        return 0;
    }
    
    const blockedIds = [];
    const opponent = this.player === 'X' ? 'O' : 'X';
    
    // Check each pattern for BOTH types of blocking
    playerPatterns.forEach(pattern => {
        let isBlocked = false;
        let blockReason = '';
        
        // ===== CHECK 1: DIAGONAL BLOCKING =====
        // Opponent diagonal cuts across the pattern connection
        // This is PRIMARY check - diagonal blocking affects ALL pattern types
        if (this.patternDetector.isPatternDiagonallyBlocked(pattern, this.gameCore)) {
            isBlocked = true;
            blockReason = 'Opponent diagonal blocks connection';
        }
        
        // ===== CHECK 2: GAP OCCUPATION BLOCKING =====
        // Only check if not already blocked by diagonal
        // Different rules for L vs I patterns
        if (!isBlocked && pattern.gaps && pattern.gaps.length > 0) {
            
            // Count how many gap cells are occupied by opponent
            let opponentGapCount = 0;
            
            for (const gap of pattern.gaps) {
                const cellValue = this.gameCore.board[gap.row]?.[gap.col];
                if (cellValue === opponent) {
                    opponentGapCount++;
                }
            }
            
            // L-patterns: BOTH gap cells must be occupied to block
            // (One occupied = THREAT, not blocked - pattern stays active for defense!)
            if (pattern.type === 'L' || pattern.patternType === 'L') {
                if (opponentGapCount === pattern.gaps.length) {
                    // All (both) gaps occupied by opponent
                    isBlocked = true;
                    blockReason = `Both gap cells occupied by opponent (L-pattern)`;
                }
                // If only one gap occupied, pattern is THREATENED but NOT blocked
                // Keep it in registry so threat detection can work!
            }
            
            // I-patterns: ALL THREE gap cells must be occupied to block
            // (One or two occupied = may still connect through remaining gap)
            else if (pattern.type === 'I' || pattern.patternType === 'I') {
                if (opponentGapCount === pattern.gaps.length) {
                    // All three gaps occupied by opponent
                    isBlocked = true;
                    blockReason = `All ${pattern.gaps.length} gap cells occupied by opponent (I-pattern)`;
                }
                // If any gap cell is free, pattern might still connect
                // Unless diagonal blocks it (already checked above)
            }
        }
        
        // ===== MARK FOR REMOVAL =====
        if (isBlocked) {
            blockedIds.push(pattern.id);
            
            if (this.debugMode) {
                const p1 = pattern.piece1 || pattern.pieces?.[0];
                const p2 = pattern.piece2 || pattern.pieces?.[1];
                this.log(`🚫 Pattern ${pattern.id} blocked: ${blockReason}`);
                this.log(`   From (${p1?.row},${p1?.col}) to (${p2?.row},${p2?.col})`);
            }
        }
    });
    
    // Remove all blocked patterns
    blockedIds.forEach(id => {
        this.removePattern(id);
    });
    
    if (blockedIds.length > 0) {
        this.log(`🧹 Removed ${blockedIds.length} blocked pattern(s)`);
    }
    
    return blockedIds.length;
}


// =====================================================
// CORRECTED LOGIC EXPLANATION:
// =====================================================
// 
// BLOCKING vs THREAT:
// - THREAT: Pattern is in danger but can still be saved
// - BLOCKED: Pattern cannot connect anymore, remove from registry
//
// L-PATTERNS (2 gaps):
// - 0 gaps occupied = Active pattern
// - 1 gap occupied = THREAT (keep in registry for defense!)
// - 2 gaps occupied = BLOCKED (remove from registry)
// - Diagonal cuts across = BLOCKED (remove from registry)
//
// I-PATTERNS (3 gaps):
// - 0-2 gaps occupied = May still connect through free gap(s)
// - 3 gaps occupied = BLOCKED (remove from registry)
// - Diagonal cuts across = BLOCKED (remove from registry)
//
// CRITICAL: Diagonal blocking is checked FIRST and applies to
// ALL pattern types, regardless of gap occupation status!
// =====================================================

    /**
     * Invalidate cache
     */
    invalidateCache() {
        this.cacheValid = false;
        this.log('  🔄 Cache invalidated');
    }
    
    // ===== QUERY METHODS =====
    
    getPlayerPatterns(player) {
        this.ensureUpToDate();
        const patterns = Array.from(this.patternsByType[`${player}-${player}`].values());
        
        return patterns.map(pattern => ({
            ...pattern,
            pieces: [pattern.piece1, pattern.piece2]
        }));
    }

    getGapAnalysis(player) {
        this.ensureUpToDate();
        return this.gapAnalysis.get(player) || this.getEmptyAnalysis(player);
    }

    getThreatenedGaps(player, filterBlocked = true) {
        const analysis = this.getGapAnalysis(player);
        let gaps = analysis.threatenedGaps || [];
        
        if (filterBlocked && this.gapBlockingDetector && gaps.length > 0) {
            const filtered = this.gapBlockingDetector.filterBlockedGaps(gaps, player);
            return filtered.validGaps;
        }
        
        return gaps;
    }

    getSafeGaps(player, filterBlocked = true) {
        const analysis = this.getGapAnalysis(player);
        let gaps = analysis.safeGaps || [];
        
        if (filterBlocked && this.gapBlockingDetector && gaps.length > 0) {
            const filtered = this.gapBlockingDetector.filterBlockedGaps(gaps, player);
            return filtered.validGaps;
        }
        
        return gaps;
    }

    getAttackOpportunities(player, filterBlocked = true) {
        const analysis = this.getGapAnalysis(player);
        let opportunities = analysis.attackOpportunities || [];
        
        if (filterBlocked && this.gapBlockingDetector && opportunities.length > 0) {
            const filtered = this.gapBlockingDetector.filterBlockedGaps(opportunities, player);
            return filtered.validGaps;
        }
        
        return opportunities;
    }

    getPatternsAtPosition(row, col) {
        this.ensureUpToDate();
        const gapKey = `${row},${col}`;
        const patternIds = this.gapsByPosition.get(gapKey) || [];
        return patternIds.map(id => this.patterns.get(id)).filter(p => p);
    }

    // ===== UTILITY =====
    
    ensureUpToDate() {
        const currentMove = this.gameCore.moveCount || 0;
        if (this.lastUpdateMove !== currentMove || !this.cacheValid) {
            this.updateRegistry();
        }
    }

    clearPatterns() {
        this.patterns.clear();
        this.patternsByType['X-X'].clear();
        this.patternsByType['O-O'].clear();
        this.patternsByType['X-O'].clear();
        this.gapsByPosition.clear();
        this.patternCounter = 0;
    }

    reset() {
        this.clearPatterns();
        this.gapAnalysis.clear();
        this.lastUpdateMove = -1;
        this.cacheValid = false;
        this.log('Gap Registry reset');
    }

    getStats() {
        this.ensureUpToDate();
        
        const stats = {
            totalPatterns: this.patterns.size,
            patternsByOwnership: {
                'X-X': this.patternsByType['X-X'].size,
                'O-O': this.patternsByType['O-O'].size,
                'X-O': this.patternsByType['X-O'].size
            },
            totalGaps: this.gapsByPosition.size,
            threatCounts: {},
            attackCounts: {},
            lastUpdate: this.lastUpdateMove
        };
        
        this.gapAnalysis.forEach((analysis, player) => {
            stats.threatCounts[player] = analysis.threatenedGaps?.length || 0;
            stats.attackCounts[player] = analysis.attackOpportunities?.length || 0;
        });
        
        return stats;
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[GAP-REGISTRY] ${message}`);
        }
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

if (typeof window !== 'undefined') {
    window.GapRegistry = GapRegistry;
    console.log('✅ Gap Registry loaded - SIMPLIFIED (delegates to Gap Blocking Detector)');
}