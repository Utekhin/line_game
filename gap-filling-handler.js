// gap-filling-handler.js - FIXED: Proper fillCells concept and connections
// CORRECTED: Method names, data formats, return values match move-generator

class GapFillingHandler {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        
        // Component references
        this.gapRegistry = null;
        
        // Gap filling tracking
        this.filledGaps = new Set();
        this.lastGapCheck = -1;
        
        this.debugMode = true;
        this.log('🔧 Gap Filling Handler initialized');
    }

    // ===== COMPONENT INJECTION =====
    
    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        this.log('📊 Gap registry connected');
    }

    // ===== MAIN GAP FILLING =====
    
    /**
     * Fill safe gaps - CORRECTED: Method name matches move-generator call
     */
    fillSafeGaps() {
        if (!this.gapRegistry) {
            this.log('⚠️ No gap registry available');
            return null;
        }

        this.log('🔧 Checking for safe gaps to fill...');
        
        try {
            // CORRECTED: Call actual registry method
            const safeGaps = this.gapRegistry.getSafeGaps(this.player, true);
            
            if (!safeGaps || safeGaps.length === 0) {
                this.log('✅ No safe gaps to fill');
                return null;
            }
            
            this.log(`🎯 Found ${safeGaps.length} safe gap(s) to fill`);
            
            // Select best gap and generate move
            const selectedGap = this.selectBestGap(safeGaps);
            if (selectedGap) {
                const fillMove = this.generateGapFillMove(selectedGap);
                if (fillMove) {
                    this.recordGapFilling(selectedGap, fillMove);
                    return fillMove;
                }
            }
            
            return null;
            
        } catch (error) {
            this.log(`💥 Error in gap filling: ${error.message}`);
            console.error('[GAP-FILLING] Error:', error);
            return null;
        }
    }

    // ===== GAP SELECTION =====
    
    /**
     * Select best gap to fill from available safe gaps
     */
    selectBestGap(safeGaps) {
        if (!safeGaps || safeGaps.length === 0) return null;
        
        this.log(`📊 Evaluating ${safeGaps.length} safe gap(s)`);
        
        // Score each gap
        const scoredGaps = safeGaps.map(gap => ({
            ...gap,
            score: this.calculateGapScore(gap)
        }));
        
        // Sort by score (highest first)
        scoredGaps.sort((a, b) => b.score - a.score);
        
        // Log top candidates
        scoredGaps.slice(0, 3).forEach((gap, i) => {
            this.log(`  ${i+1}. ${gap.patternType}-gap, score: ${gap.score.toFixed(1)}`);
        });
        
        return scoredGaps[0];
    }
    
    /**
     * Calculate gap filling priority score
     */
    calculateGapScore(gap) {
        let score = 30; // Base score
        
        // Pattern type priority
        if (gap.patternType === 'L') {
            score += 10; // L-patterns higher priority
        } else if (gap.patternType === 'I') {
            score += 5;
        }
        
        // Border proximity bonus
        if (gap.fillCells && gap.fillCells.length > 0) {
            const minBorderDistance = Math.min(...gap.fillCells.map(cell => {
                const topDist = cell.row;
                const bottomDist = this.gameCore.size - 1 - cell.row;
                return Math.min(topDist, bottomDist);
            }));
            
            if (minBorderDistance <= 2) {
                score += 15; // Near-border gaps get bonus
            }
        }
        
        // Multiple fillCells available bonus (more flexibility)
        const availableCells = this.getAvailableFillCells(gap);
        if (availableCells.length > 1) {
            score += availableCells.length * 2;
        }
        
        return score;
    }

    // ===== MOVE GENERATION =====
    
    /**
     * Generate move to fill a gap - CORRECTED: Proper fillCells handling
     */
    generateGapFillMove(gap) {
        // Validate gap structure
        if (!gap) {
            this.log('❌ Invalid gap (null)');
            return null;
        }
        
        if (!gap.fillCells || !Array.isArray(gap.fillCells)) {
            this.log('❌ Gap missing fillCells array');
            return null;
        }
        
        if (gap.fillCells.length === 0) {
            this.log('⚠️ Gap has empty fillCells array');
            return null;
        }
        
        this.log(`🔧 Generating fill move for ${gap.patternType}-gap`);
        this.log(`   FillCells available: ${gap.fillCells.length}`);
        
        // Get available (empty) fillCells
        const availableCells = this.getAvailableFillCells(gap);
        
        if (availableCells.length === 0) {
            this.log('⚠️ No available fillCells (all occupied)');
            return null;
        }
        
        // Select best cell from available options
        const targetCell = this.selectBestFillCell(availableCells, gap);
        
        this.log(`✅ Selected fillCell: (${targetCell.row},${targetCell.col})`);
        
        // CORRECTED: Return standardized move object format
        return {
            row: targetCell.row,
            col: targetCell.col,
            reason: `Fill ${gap.patternType} gap`,
            pattern: gap.patternType,
            moveType: 'gap-filling',      // Used by move-generator
            value: 30,                    // Priority score
            patternId: gap.patternId
        };
    }
    
    /**
     * Get available (empty) fillCells from a gap
     */
    getAvailableFillCells(gap) {
        if (!gap.fillCells) return [];
        
        return gap.fillCells.filter(cell => 
            this.isValidPosition(cell.row, cell.col) &&
            !this.gameCore.board[cell.row][cell.col]
        );
    }
    
    /**
     * Select best fillCell from available options
     */
    selectBestFillCell(availableCells, gap) {
        if (availableCells.length === 1) {
            return availableCells[0];
        }
        
        // For L-patterns: any cell is equivalent (both connect the pattern)
        if (gap.patternType === 'L') {
            return availableCells[0];
        }
        
        // For I-patterns: prefer center cell for better connectivity
        if (gap.patternType === 'I' && availableCells.length >= 2) {
            // Sort by connectivity to own pieces
            availableCells.sort((a, b) => 
                this.countAdjacentOwnPieces(b) - this.countAdjacentOwnPieces(a)
            );
        }
        
        return availableCells[0];
    }
    
    /**
     * Count adjacent own pieces for connectivity evaluation
     */
    countAdjacentOwnPieces(cell) {
        let count = 0;
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = cell.row + dr;
                const c = cell.col + dc;
                
                if (this.isValidPosition(r, c) && 
                    this.gameCore.board[r][c] === this.player) {
                    count++;
                }
            }
        }
        
        return count;
    }

    // ===== TRACKING =====
    
    /**
     * Record that a gap was filled
     */
    recordGapFilling(gap, move) {
        const gapKey = gap.patternId || `${gap.row},${gap.col}`;
        this.filledGaps.add(gapKey);
        
        this.log(`📝 Recorded gap filling: ${gap.patternType} at (${move.row},${move.col})`);
        this.log(`   Total gaps filled: ${this.filledGaps.size}`);
    }

    // ===== VALIDATION =====
    
    isValidPosition(row, col) {
        return row >= 0 && row < this.gameCore.size && 
               col >= 0 && col < this.gameCore.size;
    }

    // ===== DIAGNOSTICS =====
    
    /**
     * Debug gap filling state
     */
    debugGapFillingState() {
        console.log('=== GAP FILLING DEBUG ===');
        console.log('Player:', this.player);
        console.log('Move count:', this.gameCore.moveCount);
        console.log('Gap registry connected:', !!this.gapRegistry);
        console.log('Gaps filled so far:', this.filledGaps.size);
        
        if (this.gapRegistry) {
            // Check method availability
            console.log('getSafeGaps available:', 
                typeof this.gapRegistry.getSafeGaps === 'function');
            
            try {
                const safeGaps = this.gapRegistry.getSafeGaps(this.player, true);
                console.log('Safe gaps available:', safeGaps.length);
                
                safeGaps.slice(0, 3).forEach((gap, i) => {
                    const available = this.getAvailableFillCells(gap);
                    console.log(`  ${i+1}. ${gap.patternType}-gap: ${available.length} fillCells available`);
                });
            } catch (error) {
                console.error('Debug error:', error.message);
            }
        }
        
        console.log('=== END GAP FILLING DEBUG ===');
    }
    
    /**
     * Get gap filling statistics
     */
    getStatistics() {
        return {
            totalGapsFilled: this.filledGaps.size,
            filledGapIds: Array.from(this.filledGaps)
        };
    }

    // ===== UTILITY =====
    
    reset() {
        this.filledGaps.clear();
        this.lastGapCheck = -1;
        this.log('🔄 Gap filling handler reset');
    }
    
    log(message) {
        if (this.debugMode) {
            console.log(`[GAP-FILLING] ${message}`);
        }
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.GapFillingHandler = GapFillingHandler;
    console.log('✅ Gap Filling Handler loaded - CONNECTION FIXED');
}