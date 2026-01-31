// pattern-detector.js - Unified Pattern Detection Module
// Consolidates pattern detection logic from gap-registry.js and simple-chain.js

class PatternDetector {
    constructor() {
        this.debugMode = true;
        
        // Pattern type constants
        this.PATTERN_TYPES = {
            L_PATTERN: 'L',
            I_PATTERN: 'I',
            DIAGONAL_PATTERN: 'D' 
        };
        
        this.log('🎯 Pattern Detector initialized');
    }

    // ===== CORE PATTERN IDENTIFICATION =====
    
    /**
     * Check if two positions form an L-pattern
     * L-pattern: Knight's move - (2,1) or (1,2) distance
     * Unified from gap-registry.js and simple-chain.js isSimpleLPattern
     */
    isLPattern(pos1, pos2) {
        if (!this.validatePosition(pos1) || !this.validatePosition(pos2)) {
            return false;
        }
        
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        
        const isL = (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
        
        if (isL) {
            this.log(`✅ L-pattern detected: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col})`);
        }
        
        return isL;
    }

    /**
     * Check if two positions form an I-pattern
     * I-pattern: Straight line - (2,0) or (0,2) distance
     * Unified from gap-registry.js
     */
    isIPattern(pos1, pos2) {
        if (!this.validatePosition(pos1) || !this.validatePosition(pos2)) {
            return false;
        }
        
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        
        const isI = (dr === 2 && dc === 0) || (dr === 0 && dc === 2);
        
        if (isI) {
            this.log(`✅ I-pattern detected: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col})`);
        }
        
        return isI;
    }

    // ===== GAP CALCULATION =====
    
    /**
     * Calculate gap cells for L-pattern
     * L-pattern has 2 gap cells that connect the pieces diagonally
     * Unified from gap-registry.js and simple-chain.js getSimpleLGaps
     */
    getLPatternGaps(pos1, pos2, gameEngine) {
        if (!this.isLPattern(pos1, pos2)) {
            this.log(`⚠️ Attempted to get L-gaps for non-L pattern: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col})`);
            return [];
        }
        
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        const gaps = [];
        
        if (Math.abs(dr) === 2 && Math.abs(dc) === 1) {
            // Vertical L: 2 rows, 1 column
            const midRow = pos1.row + (dr > 0 ? 1 : -1);
            gaps.push({ row: midRow, col: pos1.col });
            gaps.push({ row: midRow, col: pos2.col });
            
            this.log(`📍 Vertical L-gaps: (${midRow},${pos1.col}) and (${midRow},${pos2.col})`);
            
        } else if (Math.abs(dr) === 1 && Math.abs(dc) === 2) {
            // Horizontal L: 1 row, 2 columns
            const midCol = pos1.col + (dc > 0 ? 1 : -1);
            gaps.push({ row: pos1.row, col: midCol });
            gaps.push({ row: pos2.row, col: midCol });
            
            this.log(`📍 Horizontal L-gaps: (${pos1.row},${midCol}) and (${pos2.row},${midCol})`);
        }
        
        // Filter out invalid positions
        const validGaps = gaps.filter(gap => {
            if (!gameEngine || !gameEngine.isValidPosition) {
                this.log(`⚠️ Game engine or isValidPosition method not available`);
                return gap.row >= 0 && gap.col >= 0; // Basic validation
            }
            return gameEngine.isValidPosition(gap.row, gap.col);
        });
        
        this.log(`✅ L-pattern gaps: ${validGaps.length}/${gaps.length} valid`);
        return validGaps;
    }

    /**
     * Calculate gap cells for I-pattern
     * I-pattern has 3 gap cells that connect the pieces in a line
     * Unified from gap-registry.js
     */
    getIPatternGaps(pos1, pos2, gameEngine) {
        if (!this.isIPattern(pos1, pos2)) {
            this.log(`⚠️ Attempted to get I-gaps for non-I pattern: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col})`);
            return [];
        }
        
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        const gaps = [];
        
        if (Math.abs(dr) === 2 && dc === 0) {
            // Vertical I: same column, 2 rows apart
            const midRow = pos1.row + (dr > 0 ? 1 : -1);
            gaps.push({ row: midRow, col: pos1.col - 1 });
            gaps.push({ row: midRow, col: pos1.col });     // Center gap
            gaps.push({ row: midRow, col: pos1.col + 1 });
            
            this.log(`📍 Vertical I-gaps: (${midRow},${pos1.col-1}), (${midRow},${pos1.col}), (${midRow},${pos1.col+1})`);
            
        } else if (dr === 0 && Math.abs(dc) === 2) {
            // Horizontal I: same row, 2 columns apart
            const midCol = pos1.col + (dc > 0 ? 1 : -1);
            gaps.push({ row: pos1.row - 1, col: midCol });
            gaps.push({ row: pos1.row, col: midCol });     // Center gap
            gaps.push({ row: pos1.row + 1, col: midCol });
            
            this.log(`📍 Horizontal I-gaps: (${pos1.row-1},${midCol}), (${pos1.row},${midCol}), (${pos1.row+1},${midCol})`);
        }
        
        // Filter out invalid positions
        const validGaps = gaps.filter(gap => {
            if (!gameEngine || !gameEngine.isValidPosition) {
                this.log(`⚠️ Game engine or isValidPosition method not available`);
                return gap.row >= 0 && gap.col >= 0; // Basic validation
            }
            return gameEngine.isValidPosition(gap.row, gap.col);
        });
        
        this.log(`✅ I-pattern gaps: ${validGaps.length}/${gaps.length} valid`);
        return validGaps;
    }
    
    
    /**
     * Check if two positions form a Diagonal pattern
     * Diagonal pattern: (2,2) distance diagonally in any direction
     */
    isDiagonalPattern(pos1, pos2) {
        if (!this.validatePosition(pos1) || !this.validatePosition(pos2)) {
            return false;
        }
        
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        
        const isDiagonal = (dr === 2 && dc === 2);
        
        if (isDiagonal) {
            this.log(`✅ Diagonal pattern detected: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col})`);
        }
        
        return isDiagonal;
    }

    /**
     * Calculate gap cell for Diagonal pattern
     * Diagonal pattern has 1 gap cell at the midpoint
     */
    getDiagonalPatternGap(pos1, pos2, gameEngine) {
        if (!this.isDiagonalPattern(pos1, pos2)) {
            this.log(`⚠️ Attempted to get diagonal gap for non-diagonal pattern`);
            return null;
        }
        
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        
        // The gap is at the midpoint
        const gapRow = pos1.row + (dr > 0 ? 1 : -1);
        const gapCol = pos1.col + (dc > 0 ? 1 : -1);
        const gap = { row: gapRow, col: gapCol };
        
        this.log(`🔍 Diagonal gap at: (${gapRow},${gapCol})`);
        
        // Validate the gap position
        if (!gameEngine || !gameEngine.isValidPosition) {
            return gap.row >= 0 && gap.col >= 0 ? gap : null;
        }
        
        if (gameEngine.isValidPosition(gap.row, gap.col)) {
            this.log(`✅ Diagonal gap valid: (${gap.row},${gap.col})`);
            return gap;
        }
        
        return null;
    }

    // ===== COMPREHENSIVE PATTERN FINDING =====
    
    /**
     * Find all patterns for a specific player
     * Scans all piece pairs and identifies L and I patterns
     */
        findAllPatterns(gameEngine, player) {
        if (!gameEngine || !gameEngine.getPlayerPositions) {
            this.log(`⚠️ Game engine or getPlayerPositions method not available`);
            return [];
        }
        
        const pieces = gameEngine.getPlayerPositions(player);
        const patterns = [];
        
        this.log(`🔍 Scanning ${pieces.length} ${player} pieces for patterns...`);
        
        if (pieces.length < 2) {
            this.log(`📊 Not enough pieces for patterns (need ≥2, have ${pieces.length})`);
            return patterns;
        }
        
        let lPatternsFound = 0;
        let iPatternsFound = 0;
        let diagonalPatternsFound = 0; // NEW
        
        // Check all pairs of pieces
        for (let i = 0; i < pieces.length; i++) {
            for (let j = i + 1; j < pieces.length; j++) {
                const piece1 = pieces[i];
                const piece2 = pieces[j];
                
                // Check for L-pattern
                if (this.isLPattern(piece1, piece2)) {
                    const gaps = this.getLPatternGaps(piece1, piece2, gameEngine);
                    
                    if (gaps.length > 0) {
                        patterns.push({
                            id: `L-${i}-${j}`,
                            type: this.PATTERN_TYPES.L_PATTERN,
                            piece1: piece1,
                            piece2: piece2,
                            gaps: gaps,
                            player: player,
                            createdAt: gameEngine.moveCount || 0
                        });
                        lPatternsFound++;
                    }
                }
                
                // Check for I-pattern
                if (this.isIPattern(piece1, piece2)) {
                    const gaps = this.getIPatternGaps(piece1, piece2, gameEngine);
                    
                    if (gaps.length > 0) {
                        patterns.push({
                            id: `I-${i}-${j}`,
                            type: this.PATTERN_TYPES.I_PATTERN,
                            piece1: piece1,
                            piece2: piece2,
                            gaps: gaps,
                            player: player,
                            createdAt: gameEngine.moveCount || 0
                        });
                        iPatternsFound++;
                    }
                }
                
                // NEW: Check for Diagonal pattern
                if (this.isDiagonalPattern(piece1, piece2)) {
                    const gap = this.getDiagonalPatternGap(piece1, piece2, gameEngine);
                    
                    if (gap) {
                        patterns.push({
                            id: `D-${i}-${j}`,
                            type: this.PATTERN_TYPES.DIAGONAL_PATTERN,
                            piece1: piece1,
                            piece2: piece2,
                            gaps: [gap], // Single gap in array for consistency
                            player: player,
                            createdAt: gameEngine.moveCount || 0
                        });
                        diagonalPatternsFound++;
                    }
                }
            }
        }
        
        this.log(`✅ Pattern detection complete for ${player}:`);
        this.log(`   🔍 L-patterns: ${lPatternsFound}`);
        this.log(`   🔍 I-patterns: ${iPatternsFound}`);
        this.log(`   🔍 Diagonal patterns: ${diagonalPatternsFound}`); // NEW
        this.log(`   📊 Total patterns: ${patterns.length}`);
        
        return patterns;
    }
       

    /**
     * Find patterns between players (mixed patterns)
     * Useful for strategic analysis and interference detection
     */
    findMixedPatterns(gameEngine, player1, player2) {
        if (!gameEngine || !gameEngine.getPlayerPositions) {
            this.log(`⚠️ Game engine not available for mixed pattern detection`);
            return [];
        }
        
        const pieces1 = gameEngine.getPlayerPositions(player1);
        const pieces2 = gameEngine.getPlayerPositions(player2);
        const mixedPatterns = [];
        
        this.log(`🔍 Scanning for mixed patterns: ${player1}(${pieces1.length}) vs ${player2}(${pieces2.length})`);
        
        for (const piece1 of pieces1) {
            for (const piece2 of pieces2) {
                // Check for L-pattern between different players
                if (this.isLPattern(piece1, piece2)) {
                    const gaps = this.getLPatternGaps(piece1, piece2, gameEngine);
                    
                    if (gaps.length > 0) {
                        mixedPatterns.push({
                            id: `Mixed-L-${piece1.row}${piece1.col}-${piece2.row}${piece2.col}`,
                            type: this.PATTERN_TYPES.L_PATTERN,
                            piece1: piece1,
                            piece2: piece2,
                            player1: player1,
                            player2: player2,
                            gaps: gaps,
                            createdAt: gameEngine.moveCount || 0
                        });
                    }
                }
                
                // I-patterns between different players are less common but possible
                if (this.isIPattern(piece1, piece2)) {
                    const gaps = this.getIPatternGaps(piece1, piece2, gameEngine);
                    
                    if (gaps.length > 0) {
                        mixedPatterns.push({
                            id: `Mixed-I-${piece1.row}${piece1.col}-${piece2.row}${piece2.col}`,
                            type: this.PATTERN_TYPES.I_PATTERN,
                            piece1: piece1,
                            piece2: piece2,
                            player1: player1,
                            player2: player2,
                            gaps: gaps,
                            createdAt: gameEngine.moveCount || 0
                        });
                    }
                }
            }
        }
        
        this.log(`✅ Mixed patterns found: ${mixedPatterns.length}`);
        return mixedPatterns;
    }

    // ===== PATTERN ANALYSIS HELPERS =====
    
    /**
     * Get pattern statistics for debugging and analysis
     */
    getPatternStats(patterns) {
        const stats = {
            total: patterns.length,
            lPatterns: patterns.filter(p => p.type === this.PATTERN_TYPES.L_PATTERN).length,
            iPatterns: patterns.filter(p => p.type === this.PATTERN_TYPES.I_PATTERN).length,
            totalGaps: patterns.reduce((sum, p) => sum + p.gaps.length, 0),
            avgGapsPerPattern: patterns.length > 0 ? 
                (patterns.reduce((sum, p) => sum + p.gaps.length, 0) / patterns.length).toFixed(1) : 0
        };
        
        return stats;
    }

    /**
     * Check if a pattern is still valid (pieces haven't been connected)
     */
    isPatternStillValid(pattern, gameEngine) {
        if (!pattern || !gameEngine) return false;
        
        // Check if any gap is still open
        const openGaps = pattern.gaps.filter(gap => 
            gameEngine.isValidPosition(gap.row, gap.col) &&
            gameEngine.board[gap.row][gap.col] === ''
        );
        
        // Pattern is valid if it has open gaps
        const isValid = openGaps.length > 0;
        
        if (!isValid) {
            this.log(`❌ Pattern ${pattern.id} no longer valid - all gaps filled`);
        }
        
        return isValid;
    }

    /**
     * Filter patterns to only include those with open gaps
     */
    filterValidPatterns(patterns, gameEngine) {
        if (!gameEngine) {
            this.log(`⚠️ Cannot filter patterns - game engine not available`);
            return patterns;
        }
        
        const validPatterns = patterns.filter(pattern => this.isPatternStillValid(pattern, gameEngine));
        
        this.log(`📊 Pattern filtering: ${validPatterns.length}/${patterns.length} patterns still valid`);
        
        return validPatterns;
    }

    // ===== UTILITY METHODS =====
    
    /**
     * Validate position object has required properties
     */
    validatePosition(pos) {
        if (!pos || typeof pos.row !== 'number' || typeof pos.col !== 'number') {
            this.log(`⚠️ Invalid position object: ${JSON.stringify(pos)}`);
            return false;
        }
        return true;
    }

    /**
     * Get human-readable pattern description
     */
    getPatternDescription(pattern) {
        if (!pattern) return 'Invalid pattern';
        
        const type = pattern.type === this.PATTERN_TYPES.L_PATTERN ? 'L-shape' : 'I-shape';
        const p1 = `(${pattern.piece1.row},${pattern.piece1.col})`;
        const p2 = `(${pattern.piece2.row},${pattern.piece2.col})`;
        const gapCount = pattern.gaps ? pattern.gaps.length : 0;
        
        return `${type} pattern: ${p1} ↔ ${p2} with ${gapCount} gaps`;
    }

    /**
     * Debug method to analyze all patterns on board
     */
    analyzeAllPatterns(gameEngine) {
        this.log('\n🎯 === COMPREHENSIVE PATTERN ANALYSIS ===');
        
        if (!gameEngine) {
            this.log('❌ Game engine not available');
            return;
        }
        
        const xPatterns = this.findAllPatterns(gameEngine, 'X');
        const oPatterns = this.findAllPatterns(gameEngine, 'O');
        const mixedPatterns = this.findMixedPatterns(gameEngine, 'X', 'O');
        
        const xStats = this.getPatternStats(xPatterns);
        const oStats = this.getPatternStats(oPatterns);
        
        this.log(`📊 X Player Patterns: ${xStats.total} total (${xStats.lPatterns} L, ${xStats.iPatterns} I)`);
        this.log(`📊 O Player Patterns: ${oStats.total} total (${oStats.lPatterns} L, ${oStats.iPatterns} I)`);
        this.log(`📊 Mixed Patterns: ${mixedPatterns.length}`);
        this.log(`📊 Total Gaps: X=${xStats.totalGaps}, O=${oStats.totalGaps}`);
        
        this.log('🎯 === END PATTERN ANALYSIS ===\n');
        
        return {
            xPatterns,
            oPatterns,
            mixedPatterns,
            xStats,
            oStats
        };
    }

    /**
     * Enable/disable debug logging
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Internal logging method
     */
    log(message) {
        if (this.debugMode) {
            console.log(`[PATTERN-DETECTOR] ${message}`);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.PatternDetector = PatternDetector;
}

console.log('✅ Unified Pattern Detector module loaded');
console.log('🎯 Features: L/I pattern detection, gap calculation, comprehensive analysis');
console.log('🔧 API: isLPattern(), isIPattern(), getLPatternGaps(), getIPatternGaps(), findAllPatterns()');