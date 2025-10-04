// gap-analyzer.js - COMPLETE: Binary threat logic with cutting threat detection
// Enhanced threat detection: Direct gap threats + Cutting cell threats for L-patterns

class GapAnalyzer {
    constructor(gameCore, patternDetector = null) {
        this.gameCore = gameCore;
        this.patternDetector = patternDetector;
        this.gapBlockingDetector = null;
        
        // Auto-create pattern detector if available
        if (!this.patternDetector && typeof window !== 'undefined' && window.PatternDetector) {
            this.patternDetector = new window.PatternDetector(gameCore);
            this.patternDetector.setDebugMode(true, false);
            this.log('Created new PatternDetector');
        }
        
        // Logging control
        this.debugMode = true;
        this.verboseLogging = false;
        
        // Cache system
        this.cache = new Map();
        this.gapExistenceCache = new Map();
        this.lastAnalyzedMove = -1;
        
        this.log('Gap Analyzer initialized with extended threat detection');
    }

    // ===== MODULE CONNECTIONS =====
    
    setPatternDetector(patternDetector) {
        this.patternDetector = patternDetector;
        this.log('Pattern Detector connected');
    }

    setGapBlockingDetector(detector) {
        this.gapBlockingDetector = detector;
        this.log('Gap Blocking Detector connected');
    }

    // ===== MAIN ANALYSIS =====
    
    analyzeGaps(player) {
        if (!player || typeof player !== 'string') {
            throw new Error(`Invalid player parameter: ${player}`);
        }
        
        if (!this.gameCore || !this.gameCore.board) {
            throw new Error('GameCore not available or missing board');
        }

        const moveCount = this.gameCore.moveCount || 0;
        
        // Early game optimization
        if (moveCount < 3) {
            return {
                player: player,
                gaps: [],
                threatenedGaps: [],
                safeGaps: [],
                attackOpportunities: [],
                totalGaps: 0,
                totalPatterns: 0,
                timestamp: moveCount,
                early_game: true
            };
        }

        // Check cache
        const cacheKey = `${player}-${moveCount}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            if (!this.patternDetector) {
                throw new Error('PatternDetector not connected - cannot analyze gaps');
            }

            // Get patterns for this player
            const patterns = this.patternDetector.findAllPatterns(this.gameCore, player);
            
            if (!patterns || patterns.length === 0) {
                const emptyAnalysis = {
                    player: player,
                    gaps: [],
                    threatenedGaps: [],
                    safeGaps: [],
                    attackOpportunities: [],
                    totalGaps: 0,
                    totalPatterns: 0,
                    timestamp: moveCount,
                    early_game: false
                };
                this.cache.set(cacheKey, emptyAnalysis);
                return emptyAnalysis;
            }

            // Filter valid patterns
            const validPatterns = this.patternDetector.filterValidPatterns ? 
                this.patternDetector.filterValidPatterns(patterns, this.gameCore) : 
                patterns;
            
            // Extract gaps from patterns
            const allGaps = this.extractGapsFromPatterns(validPatterns, player);
            
            // Filter blocked gaps
            const unblockedGaps = this.filterBlockedGaps(allGaps, player);
            
            // Categorize gaps (binary: threatened or safe)
            const categorizedGaps = this.categorizeGaps(unblockedGaps, player);
            
            // Find attack opportunities
            const attackOpportunities = this.findAttackOpportunities(player);
            
            // Build analysis result
            const analysis = {
                player: player,
                gaps: unblockedGaps,
                threatenedGaps: categorizedGaps.threatenedGaps,
                safeGaps: categorizedGaps.safeGaps,
                attackOpportunities: attackOpportunities,
                totalGaps: unblockedGaps.length,
                totalPatterns: validPatterns.length,
                timestamp: moveCount,
                early_game: false
            };
            
            this.cache.set(cacheKey, analysis);
            this.lastAnalyzedMove = moveCount;
            
            return analysis;
            
        } catch (error) {
            console.error('[GAP-ANALYZER] Analysis failed:', error);
            throw error;
        }
    }

    // ===== GAP EXTRACTION =====
    
    /**
     * Extract gaps from patterns
     */
    /**
 * Extract gaps from patterns - FIXED: One gap per pattern with paired fillCells
 */
/**
 * Extract gaps from patterns - ENHANCED WITH DEBUGGING
 * This method transforms pattern objects into gap objects for further analysis
 */
extractGapsFromPatterns(patterns, player) {
    const gaps = [];
    
    // DIAGNOSTIC: Log what we received
    console.log(`[GAP-ANALYZER] extractGapsFromPatterns called:`);
    console.log(`  - Patterns received: ${patterns?.length || 0}`);
    console.log(`  - Player: ${player}`);
    
    if (!patterns || patterns.length === 0) {
        console.log(`  ⚠️ No patterns provided to extract gaps from`);
        return gaps;
    }
    
    // Process each pattern
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        
        // DIAGNOSTIC: Check pattern structure
        console.log(`  Pattern ${i + 1}:`, {
            id: pattern.id,
            type: pattern.type || pattern.patternType,
            hasGaps: !!pattern.gaps,
            gapsLength: pattern.gaps?.length || 0,
            gaps: pattern.gaps
        });
        
        // CRITICAL FIX: Check if gaps exist and are properly structured
        if (!pattern.gaps) {
            console.warn(`  ⚠️ Pattern ${pattern.id} has no gaps property - trying to recalculate`);
            
            // Try to recalculate gaps if we have the pattern detector
            if (this.patternDetector && pattern.piece1 && pattern.piece2) {
                try {
                    pattern.gaps = this.patternDetector.calculatePatternGaps(
                        pattern.piece1, 
                        pattern.piece2,
                        { includeMetadata: false, filterValid: true }
                    );
                    console.log(`  ✅ Recalculated ${pattern.gaps?.length || 0} gaps for pattern ${pattern.id}`);
                } catch (error) {
                    console.error(`  ❌ Failed to recalculate gaps for pattern ${pattern.id}:`, error.message);
                    continue;
                }
            } else {
                console.warn(`  ❌ Cannot recalculate gaps - missing pattern detector or piece positions`);
                continue;
            }
        }
        
        if (pattern.gaps.length === 0) {
            console.log(`  ⚠️ Pattern ${pattern.id} has empty gaps array - skipping`);
            continue;
        }
        
        // Create ONE gap object per pattern with ALL fillCells
        const gap = {
            row: pattern.gaps[0].row,      // Primary position (for registry indexing)
            col: pattern.gaps[0].col,
            patternId: pattern.id,
            patternType: pattern.type || pattern.patternType,
            player: pattern.player1 || player,
            pattern: pattern,
            fillCells: [...pattern.gaps]   // ALL cells that can fill this gap (paired)
        };
        
        gaps.push(gap);
        console.log(`  ✅ Created gap object: (${gap.row},${gap.col}) with ${gap.fillCells.length} fillCells`);
    }
    
    console.log(`[GAP-ANALYZER] Extracted ${gaps.length} gaps from ${patterns.length} patterns`);
    
    if (gaps.length === 0 && patterns.length > 0) {
        console.error(`  ⚠️ WARNING: No gaps extracted from ${patterns.length} patterns!`);
        console.error(`  This indicates a structural problem with pattern objects`);
    }
    
    if (this.verboseLogging) {
        this.log(`Extracted ${gaps.length} gaps from ${patterns.length} patterns`);
    }
    
    return gaps;
}
    /**
     * Filter blocked gaps using GapBlockingDetector
     */
    filterBlockedGaps(gaps, player) {
        if (!this.gapBlockingDetector || !gaps || gaps.length === 0) {
            return gaps;
        }

        try {
            const filtered = this.gapBlockingDetector.filterBlockedGaps(gaps, player);
            
            if (filtered.blockedGaps.length > 0) {
                this.log(`Filtered ${filtered.blockedGaps.length} blocked gaps for ${player}`);
            }
            
            return filtered.validGaps;
        } catch (error) {
            console.error('[GAP-ANALYZER] Blocking filter failed:', error);
            return gaps;
        }
    }

    /**
     * Categorize gaps into threatened and safe (binary logic)
     */
    categorizeGaps(gaps, player) {
        const threatenedGaps = [];
        const safeGaps = [];
        
        for (const gap of gaps) {
            if (this.isGapThreatened(gap, player)) {
                const threatType = this.identifyThreatType(gap, player);
                
                threatenedGaps.push({
                    ...gap,
                    threatened: true,
                    threatType: threatType,
                    reason: `Opponent ${threatType} threat on ${gap.patternType} gap`
                });
            } else {
                safeGaps.push({
                    ...gap,
                    threatened: false,
                    reason: `Safe ${gap.patternType} gap`
                });
            }
        }
        
        return {
            threatenedGaps: threatenedGaps,
            safeGaps: safeGaps
        };
    }

    // ===== ENHANCED THREAT DETECTION =====
    
    /**
     * Check if gap is threatened (direct OR cutting threat)
     */
    /**
 * Check if gap is threatened - checks if ANY fillCell is marked by opponent
 */
isGapThreatened(gap, gapOwner) {
    if (!this.gameCore || !gap || !gap.fillCells) return false;
    
    const opponent = gapOwner === 'X' ? 'O' : 'X';
    
    // THREAT: If ANY fillCell is marked by opponent
    for (const fillCell of gap.fillCells) {
        if (this.gameCore.board[fillCell.row][fillCell.col] === opponent) {
            if (this.verboseLogging) {
                this.log(`Gap threatened: Opponent at (${fillCell.row},${fillCell.col})`);
            }
            return true;
        }
    }
    
    // Also check cutting cells for L-patterns
    if (gap.pattern && gap.pattern.type === 'L') {
        const cuttingCells = this.identifyCuttingCells(gap.pattern);
        
        for (const cuttingCell of cuttingCells) {
            if (this.gameCore.board[cuttingCell.row][cuttingCell.col] === opponent) {
                if (this.verboseLogging) {
                    this.log(`Gap threatened via cutting cell: (${cuttingCell.row},${cuttingCell.col})`);
                }
                return true;
            }
        }
    }
    
    return false;
}

    /**
     * Identify cutting threat cells for L-pattern
     * Returns cells that form perpendicular intersection with pattern
     */
    identifyCuttingCells(pattern) {
        if (pattern.type !== 'L') return [];
        
        // Get pattern cells (try different property names for compatibility)
        const p1 = pattern.cell1 || pattern.piece1 || pattern.pos1;
        const p2 = pattern.cell2 || pattern.piece2 || pattern.pos2;
        
        if (!p1 || !p2) {
            console.warn('[GAP-ANALYZER] Pattern missing cell positions:', pattern);
            return [];
        }
        
        // Calculate cutting cells: perpendicular intersections
        const cuttingCells = [
            { row: p1.row, col: p2.col },  // Same row as p1, same col as p2
            { row: p2.row, col: p1.col }   // Same row as p2, same col as p1
        ];
        
        // Filter: must be valid position and not a pattern cell itself
        const validCuttingCells = cuttingCells.filter(cell => {
            // Validate position
            if (!this.validatePosition(cell)) return false;
            
            // Exclude pattern cells themselves
            if (cell.row === p1.row && cell.col === p1.col) return false;
            if (cell.row === p2.row && cell.col === p2.col) return false;
            
            // Must be laterally adjacent to at least one gap cell
            if (!this.isAdjacentToGap(cell, pattern.gaps)) return false;
            
            return true;
        });
        
        if (this.verboseLogging && validCuttingCells.length > 0) {
            this.log(`Identified ${validCuttingCells.length} cutting cells for L-pattern`);
            validCuttingCells.forEach(c => 
                this.log(`  Cutting cell: (${c.row},${c.col})`)
            );
        }
        
        return validCuttingCells;
    }

    /**
     * Check if cell is laterally adjacent to any gap cell
     */
    isAdjacentToGap(cell, gapCells) {
        if (!gapCells) return false;
        
        for (const gap of gapCells) {
            const rowDiff = Math.abs(cell.row - gap.row);
            const colDiff = Math.abs(cell.col - gap.col);
            
            // Laterally adjacent = one step in one direction only
            if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Identify what type of threat this is
     */
    identifyThreatType(gap, gapOwner) {
        const opponent = gapOwner === 'X' ? 'O' : 'X';
        
        // Check direct threat first
        for (const gapCell of gap.pattern.gaps) {
            if (this.gameCore.board[gapCell.row][gapCell.col] === opponent) {
                return 'direct';
            }
        }
        
        // Check cutting threat
        if (gap.pattern.type === 'L') {
            const cuttingCells = this.identifyCuttingCells(gap.pattern);
            for (const cuttingCell of cuttingCells) {
                if (this.gameCore.board[cuttingCell.row][cuttingCell.col] === opponent) {
                    return 'cutting';
                }
            }
        }
        
        return 'unknown';
    }

    /**
     * Find attack opportunities against opponent
     */
    findAttackOpportunities(player) {
        const opponent = player === 'X' ? 'O' : 'X';
        
        if (!this.patternDetector) return [];
        
        try {
            const opponentPatterns = this.patternDetector.findAllPatterns(this.gameCore, opponent);
            
            if (!opponentPatterns || opponentPatterns.length === 0) return [];
            
            const opportunities = [];
            
            for (const pattern of opponentPatterns) {
                if (!pattern.gaps || pattern.gaps.length === 0) continue;
                
                // Attack by marking gap cells
                for (const gap of pattern.gaps) {
                    if (this.gameCore.board[gap.row][gap.col] === '') {
                        opportunities.push({
                            row: gap.row,
                            col: gap.col,
                            targetPlayer: opponent,
                            patternType: pattern.type,
                            attackType: 'direct',
                            reason: `Attack ${opponent}'s ${pattern.type} gap directly`,
                            pattern: pattern
                        });
                    }
                }
                
                // Attack by marking cutting cells (L-patterns)
                if (pattern.type === 'L') {
                    const cuttingCells = this.identifyCuttingCells(pattern);
                    for (const cuttingCell of cuttingCells) {
                        if (this.gameCore.board[cuttingCell.row][cuttingCell.col] === '') {
                            opportunities.push({
                                row: cuttingCell.row,
                                col: cuttingCell.col,
                                targetPlayer: opponent,
                                patternType: pattern.type,
                                attackType: 'cutting',
                                reason: `Attack ${opponent}'s ${pattern.type} gap with cutting cell`,
                                pattern: pattern
                            });
                        }
                    }
                }
            }
            
            return opportunities;
            
        } catch (error) {
            console.error('[GAP-ANALYZER] Attack analysis failed:', error);
            return [];
        }
    }

    // ===== UTILITY =====
    
    hasAnyGaps(player) {
        const moveCount = this.gameCore?.moveCount || 0;
        const cacheKey = `${player}-exists-${moveCount}`;
        
        if (this.gapExistenceCache.has(cacheKey)) {
            return this.gapExistenceCache.get(cacheKey);
        }
        
        if (moveCount < 3) {
            this.gapExistenceCache.set(cacheKey, false);
            return false;
        }
        
        if (!this.patternDetector) {
            throw new Error('PatternDetector not connected');
        }
        
        try {
            const patterns = this.patternDetector.findAllPatterns(this.gameCore, player);
            const hasGaps = patterns?.some(pattern => pattern.gaps && pattern.gaps.length > 0) || false;
            this.gapExistenceCache.set(cacheKey, hasGaps);
            return hasGaps;
        } catch (error) {
            console.error('[GAP-ANALYZER] Gap existence check failed:', error);
            this.gapExistenceCache.set(cacheKey, false);
            return false;
        }
    }

    calculateBorderDistance(position, player) {
        if (player === 'X') {
            return Math.min(position.row, this.gameCore.size - 1 - position.row);
        } else {
            return Math.min(position.col, this.gameCore.size - 1 - position.col);
        }
    }

    validatePosition(pos) {
        return pos && 
               typeof pos.row === 'number' && 
               typeof pos.col === 'number' &&
               pos.row >= 0 && pos.row < this.gameCore.size && 
               pos.col >= 0 && pos.col < this.gameCore.size;
    }

    setDebugMode(enabled, verbose = false) {
        this.debugMode = enabled;
        this.verboseLogging = verbose;
        this.log(`Debug mode: ${enabled ? 'ENABLED' : 'DISABLED'}${verbose ? ' (VERBOSE)' : ''}`);
    }

    clearCache() {
        this.cache.clear();
        this.gapExistenceCache.clear();
        this.lastAnalyzedMove = -1;
        this.log('Cache cleared');
    }

    getCacheStats() {
        return {
            analysisCache: this.cache.size,
            existenceCache: this.gapExistenceCache.size,
            lastAnalyzedMove: this.lastAnalyzedMove
        };
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[GAP-ANALYZER] ${message}`);
        }
    }
}

if (typeof window !== 'undefined') {
    window.GapAnalyzer = GapAnalyzer;
    console.log('✅ Gap Analyzer loaded - Enhanced threat detection');
    console.log('   • Binary threat logic (threatened/safe)');
    console.log('   • Direct gap threats');
    console.log('   • Cutting cell threats for L-patterns');
    console.log('   • Attack opportunity detection');
}