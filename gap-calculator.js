// gap-calculator.js - Universal Gap Calculation Module
// FOCUSED: Only gap calculation using adjacency intersection approach
// REPLACES: All scattered gap calculation methods across the codebase

class UniversalGapCalculator {
    constructor(boardSize = 15) {
        this.boardSize = boardSize;
        this.debugMode = false;
        
        console.log(`🔗 UniversalGapCalculator initialized (${boardSize}x${boardSize})`);
    }

    // ===== CORE GAP CALCULATION =====
    
    /**
     * UNIVERSAL: Calculate gaps using adjacency intersection
     * PRINCIPLE: Gap cells are those adjacent to BOTH pattern pieces
     * REPLACES: All calculateLPatternGaps, calculateIPatternGaps, getLPatternGaps methods
     */
    calculatePatternGaps(pos1, pos2, options = {}) {
        const defaults = {
            includeMetadata: false,     // Add connection type info
            filterValid: true,          // Only return valid board positions
            requireGameCore: false,     // Whether to check board state
            gameCore: null              // GameCore instance for validation
        };
        const opts = { ...defaults, ...options };
        
        const p1 = this.normalizePosition(pos1);
        const p2 = this.normalizePosition(pos2);
        
        if (!this.isValidPositionObject(p1) || !this.isValidPositionObject(p2)) {
            this.debugLog(`❌ Invalid positions for gap calculation`);
            return [];
        }
        
        this.debugLog(`🔍 Calculating gaps using adjacency intersection for (${p1.row},${p1.col}) - (${p2.row},${p2.col})`);
        
        // Get all adjacent cells for both positions (8 neighbors each)
        const adjacent1 = this.getAdjacentCells(p1);
        const adjacent2 = this.getAdjacentCells(p2);
        
        const gaps = [];
        
        // Find intersection - cells adjacent to BOTH pieces
        for (const cell1 of adjacent1) {
            for (const cell2 of adjacent2) {
                if (cell1.row === cell2.row && cell1.col === cell2.col) {
                    let gap = { row: cell1.row, col: cell1.col };
                    
                    // Validate position if requested
                    if (opts.filterValid && !this.isValidPosition(gap.row, gap.col)) {
                        continue;
                    }
                    
                    // Board state validation if gameCore provided
                    if (opts.requireGameCore && opts.gameCore) {
                        if (!this.isValidGapPosition(gap, opts.gameCore)) {
                            continue;
                        }
                    }
                    
                    // Add metadata if requested
                    if (opts.includeMetadata) {
                        gap.connectsTo = [p1, p2];
                        gap.connectionTypes = this.getGapConnectionTypes(gap, p1, p2);
                    }
                    
                    gaps.push(gap);
                }
            }
        }
        
        this.debugLog(`✅ Found ${gaps.length} gap cells using adjacency intersection`);
        return gaps;
    }

    /**
     * Get all adjacent cells to a position (8 neighbors)
     * CORE LOGIC: Same as pattern-detector.js getAdjacentCells
     */
    getAdjacentCells(pos) {
        const position = this.normalizePosition(pos);
        const adjacent = [];
        
        // Get all 8 adjacent cells
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue; // Skip the cell itself
                adjacent.push({ 
                    row: position.row + dr, 
                    col: position.col + dc 
                });
            }
        }
        
        return adjacent;
    }

    // ===== COMPATIBILITY METHODS =====
    // These methods match existing interfaces for easy migration
    
    /**
     * COMPATIBILITY: Match pattern-detector.js interface exactly
     */
    calculateLPatternGaps(pos1, pos2, gameCore) {
        return this.calculatePatternGaps(pos1, pos2, {
            includeMetadata: false,
            filterValid: true,
            requireGameCore: !!gameCore,
            gameCore: gameCore
        });
    }

    /**
     * COMPATIBILITY: Match pattern-detector.js interface exactly
     */
    calculateIPatternGaps(pos1, pos2, gameCore) {
        return this.calculatePatternGaps(pos1, pos2, {
            includeMetadata: false,
            filterValid: true,
            requireGameCore: !!gameCore,
            gameCore: gameCore
        });
    }

    /**
     * COMPATIBILITY: Match pattern-detector.js interface exactly
     */
    calculateDiagonalPatternGaps(pos1, pos2, gameCore) {
        return this.calculatePatternGaps(pos1, pos2, {
            includeMetadata: false,
            filterValid: true,
            requireGameCore: !!gameCore,
            gameCore: gameCore
        });
    }

    /**
     * COMPATIBILITY: Match chain-fragment-analyzer.js interface
     */
    getLPatternGaps(pos1, pos2) {
        return this.calculatePatternGaps(pos1, pos2, {
            includeMetadata: false,
            filterValid: true
        });
    }

    /**
     * COMPATIBILITY: Match chain-fragment-analyzer.js interface
     */
    getIPatternGaps(pos1, pos2) {
        return this.calculatePatternGaps(pos1, pos2, {
            includeMetadata: false,
            filterValid: true
        });
    }

    /**
     * COMPATIBILITY: Match chain-fragment-analyzer.js interface
     */
    getDiagonalPatternGap(pos1, pos2) {
        const gaps = this.calculatePatternGaps(pos1, pos2, {
            includeMetadata: false,
            filterValid: true
        });
        // Return first gap for diagonal patterns (should be only 1)
        return gaps.length > 0 ? gaps[0] : null;
    }

    // ===== POSITION UTILITIES =====
    
    /**
     * Validate if position is within board bounds
     */
    isValidPosition(row, col) {
        return (
            row >= 0 && row < this.boardSize &&
            col >= 0 && col < this.boardSize
        );
    }

    /**
     * Validate position object format
     */
    isValidPositionObject(pos) {
        return (
            pos && 
            typeof pos.row === 'number' && 
            typeof pos.col === 'number' &&
            this.isValidPosition(pos.row, pos.col)
        );
    }

    /**
     * Normalize position to object format
     */
    normalizePosition(rowOrPos, col = null) {
        if (col !== null) {
            // Called as normalizePosition(row, col)
            return { row: rowOrPos, col: col };
        } else if (this.isValidPositionObject(rowOrPos)) {
            // Called as normalizePosition({row, col})
            return rowOrPos;
        } else {
            throw new Error('Invalid position format');
        }
    }

    /**
     * Enhanced gap position validation
     */
    isValidGapPosition(gap, gameCore) {
        const pos = this.normalizePosition(gap);
        
        // Basic position validation
        if (!this.isValidPosition(pos.row, pos.col)) {
            return false;
        }
        
        // Board state validation if gameCore provided
        if (gameCore && gameCore.board) {
            // Gap must be empty
            return gameCore.board[pos.row][pos.col] === '' || 
                   gameCore.board[pos.row][pos.col] === null;
        }
        
        return true;
    }

    // ===== GAP CONNECTION ANALYSIS =====
    
    /**
     * Determine how a gap cell connects to the pattern pieces
     */
    getGapConnectionTypes(gapPos, pos1, pos2) {
        const gap = this.normalizePosition(gapPos);
        const p1 = this.normalizePosition(pos1);
        const p2 = this.normalizePosition(pos2);
        
        return {
            toPos1: this.getAdjacencyType(gap, p1),
            toPos2: this.getAdjacencyType(gap, p2)
        };
    }

    /**
     * Get specific adjacency type between two positions
     */
    getAdjacencyType(pos1, pos2) {
        const p1 = this.normalizePosition(pos1);
        const p2 = this.normalizePosition(pos2);
        
        const dr = p2.row - p1.row;
        const dc = p2.col - p1.col;
        
        if (dr === 0 && Math.abs(dc) === 1) return 'lateral-horizontal';
        if (Math.abs(dr) === 1 && dc === 0) return 'lateral-vertical';
        if (Math.abs(dr) === 1 && Math.abs(dc) === 1) return 'diagonal';
        if (dr === 0 && dc === 0) return 'same-position';
        
        return 'not-adjacent';
    }

    // ===== DEBUGGING UTILITIES =====
    
    /**
     * Set debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🔍 UniversalGapCalculator debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Debug logging
     */
    debugLog(message) {
        if (this.debugMode) {
            console.log(`[GAP-CALC] ${message}`);
        }
    }

    /**
     * Test gap calculation with visual output
     */
    testGapCalculation(pos1, pos2) {
        if (!this.debugMode) {
            console.log('Enable debug mode to see detailed test output');
            return;
        }
        
        console.log(`🧪 Testing gap calculation: (${pos1.row},${pos1.col}) - (${pos2.row},${pos2.col})`);
        
        const gaps = this.calculatePatternGaps(pos1, pos2, {
            includeMetadata: true,
            filterValid: true
        });
        
        console.log(`📊 Results:`);
        console.log(`   Found ${gaps.length} gaps`);
        gaps.forEach((gap, i) => {
            console.log(`   Gap ${i+1}: (${gap.row},${gap.col})`);
            if (gap.connectionTypes) {
                console.log(`     Connects to pos1: ${gap.connectionTypes.toPos1}`);
                console.log(`     Connects to pos2: ${gap.connectionTypes.toPos2}`);
            }
        });
        
        return gaps;
    }
}

// ===== FACTORY FUNCTION =====

/**
 * Factory function to create UniversalGapCalculator instance
 */
function createUniversalGapCalculator(boardSize = 15) {
    return new UniversalGapCalculator(boardSize);
}

// ===== EXPORTS =====

// Export for different module systems
if (typeof window !== 'undefined') {
    // Browser global
    window.UniversalGapCalculator = UniversalGapCalculator;
    window.createUniversalGapCalculator = createUniversalGapCalculator;
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = { UniversalGapCalculator, createUniversalGapCalculator };
} else if (typeof define === 'function' && define.amd) {
    // AMD
    define(() => ({ UniversalGapCalculator, createUniversalGapCalculator }));
}

console.log('✅ Universal Gap Calculator module loaded');
console.log('🔗 Features: Pattern-independent gap calculation using adjacency intersection');
console.log('🎯 Usage: const gapCalc = createUniversalGapCalculator(15);');