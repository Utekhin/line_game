// pattern-detector.js - FIXED: Correct pattern detection and filtering
// CRITICAL FIXES:
// 1. Early rejection of adjacent cells (distance 1) before processing
// 2. Correct filterValidPatterns logic (removes when owner fills ANY gap)
// 3. Proper diagonal blocking detection
// 4. Consistent mutual adjacency gap calculation

const ENABLE_D_PATTERNS = false;

class PatternDetector {
    constructor(gameCore) {
        this.gameCore = gameCore;
        
        // CRITICAL: Will use injected UniversalGapCalculator
        this.universalGapCalculator = null;
        this.geometry = null;
        
        // Cache for pattern detection
        this.patternCache = new Map();
        this.lastScannedMove = -1;
        
        // Debug
        this.debugMode = false;
        this.verboseLogging = false;
        
        console.log('[PATTERN-DETECTOR] Initialized - Fixed version');
    }

    // ===== UNIVERSAL GAP CALCULATOR INTEGRATION =====
    
    setGapCalculator(gapCalculator) {
        this.universalGapCalculator = gapCalculator;
        this.universalGapCalculator.setDebugMode(this.debugMode);
        console.log('[PATTERN-DETECTOR] 🔗 Universal gap calculator connected');
    }

    calculatePatternGaps(pos1, pos2, options = {}) {
        if (!this.universalGapCalculator) {
            throw new Error('PatternDetector requires UniversalGapCalculator injection');
        }
        return this.universalGapCalculator.calculatePatternGaps(pos1, pos2, options);
    }

    // ===== GAP REGISTRY INTERFACE =====
    
    /**
     * Detect all patterns for all players
     */
    detectAllPatterns() {
        const currentMove = this.gameCore.moveCount || 0;
        const cacheKey = `all-patterns-${currentMove}`;
        
        if (this.patternCache.has(cacheKey) && this.lastScannedMove === currentMove) {
            return this.patternCache.get(cacheKey);
        }
        
        const allPatterns = [];
        
        ['X', 'O'].forEach(player => {
            const playerPatterns = this.findAllPatterns(this.gameCore, player);
            allPatterns.push(...playerPatterns);
        });
        
        const mixedPatterns = this.findMixedPatterns();
        allPatterns.push(...mixedPatterns);
        
        this.patternCache.set(cacheKey, allPatterns);
        this.lastScannedMove = currentMove;
        
        this.debugLog(`✅ detectAllPatterns: ${allPatterns.length} total patterns`);
        return allPatterns;
    }

    /**
     * Find patterns for a specific player - NOW FILTERS IMMEDIATELY
     */
    findAllPatterns(gameCore, player) {
        const currentMove = gameCore.moveCount || 0;
        const cacheKey = `${player}-${currentMove}`;
        
        if (this.patternCache.has(cacheKey) && this.lastScannedMove === currentMove) {
            return this.patternCache.get(cacheKey);
        }
        
        const pieces = gameCore.getPlayerPositions(player);
        const rawPatterns = [];
        
        // Find all pattern combinations
        for (let i = 0; i < pieces.length; i++) {
            for (let j = i + 1; j < pieces.length; j++) {
                const p1 = pieces[i];
                const p2 = pieces[j];
                
                // 🔥 FIX 1: EARLY REJECTION - Skip if cells are too close (distance < 2)
                const rowDiff = Math.abs(p1.row - p2.row);
                const colDiff = Math.abs(p1.col - p2.col);
                
                // Skip adjacent cells (distance 1) and cells that are too close
                if (rowDiff <= 1 && colDiff <= 1) {
                    continue; // Skip connected cells - not a pattern
                }
                
                // Skip cells beyond pattern range (distance > 2 in any direction)
                if (rowDiff > 2 || colDiff > 2) {
                    continue; // Too far for L or I patterns
                }
                
                const pattern = this.detectPattern(p1, p2, player);
                if (pattern) {
                    rawPatterns.push(pattern);
                }
            }
        }
        
        // 🔥 FIX 2: Apply validation filter IMMEDIATELY
        const validPatterns = this.filterValidPatterns(rawPatterns, gameCore);
        
        this.patternCache.set(cacheKey, validPatterns);
        this.lastScannedMove = currentMove;
        
        this.debugLog(`Found ${validPatterns.length} valid patterns for ${player} (${rawPatterns.length} before filtering)`);
        return validPatterns;
    }

    /**
     * Find mixed patterns (X-O combinations)
     */
    findMixedPatterns() {
        const xPieces = this.gameCore.getPlayerPositions('X');
        const oPieces = this.gameCore.getPlayerPositions('O');
        const mixedPatterns = [];
        
        for (const xPiece of xPieces) {
            for (const oPiece of oPieces) {
                // Early rejection for mixed patterns too
                const rowDiff = Math.abs(xPiece.row - oPiece.row);
                const colDiff = Math.abs(xPiece.col - oPiece.col);
                
                if (rowDiff <= 1 && colDiff <= 1) continue;
                if (rowDiff > 2 || colDiff > 2) continue;
                
                const pattern = this.detectPattern(xPiece, oPiece, 'X-O');
                if (pattern) {
                    mixedPatterns.push(pattern);
                }
            }
        }
        
        this.debugLog(`Found ${mixedPatterns.length} mixed patterns`);
        return mixedPatterns;
    }

    /**
     * Detect pattern between two pieces
     */
    detectPattern(piece1, piece2, ownerInfo = null) {
        const patternType = this.getPatternType(piece1, piece2);
        if (!patternType || patternType === 'none' || patternType === 'adjacent') {
            return null; // Not a valid gap pattern
        }
        
        // Calculate gaps using universal calculator
        const gaps = this.calculatePatternGaps(piece1, piece2, {
            includeMetadata: true,
            filterValid: true
        });
        
        // If no valid gaps, not a usable pattern
        if (!gaps || gaps.length === 0) {
            return null;
        }
        
        // Determine ownership
        let player1, player2, ownership;
        if (typeof ownerInfo === 'string') {
            if (ownerInfo === 'X-O') {
                player1 = 'X';
                player2 = 'O';
                ownership = 'X-O';
            } else {
                player1 = player2 = ownerInfo;
                ownership = `${ownerInfo}-${ownerInfo}`;
            }
        } else {
            player1 = this.gameCore.board[piece1.row][piece1.col];
            player2 = this.gameCore.board[piece2.row][piece2.col];
            ownership = player1 === player2 ?
                `${player1}-${player1}` : `${player1}-${player2}`;
        }
        
        return {
            id: `${piece1.row},${piece1.col}-${piece2.row},${piece2.col}`,
            piece1: piece1,
            piece2: piece2,
            player1: player1,
            player2: player2,
            ownership: ownership,
            type: patternType,
            patternType: patternType,
            gaps: gaps,
            gapCount: gaps.length,
            createdAt: Date.now()
        };
    }

    /**
     * Get pattern type between two positions
     */
    getPatternType(pos1, pos2) {
        const rowDiff = Math.abs(pos1.row - pos2.row);
        const colDiff = Math.abs(pos1.col - pos2.col);
        
        // L-pattern: 2 in one direction, 1 in perpendicular
        if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
            return 'L';
        }
        
        // I-pattern: 2 in one direction, 0 in other
        if ((rowDiff === 2 && colDiff === 0) || (rowDiff === 0 && colDiff === 2)) {
            return 'I';
        }
        
        // D-pattern: 2 cells diagonally (distance 2,2) - DISABLED by default
        if (ENABLE_D_PATTERNS && rowDiff === 2 && colDiff === 2) {
            return 'D';
        }
        
        // Adjacent or too far - NOT a gap pattern
        return 'none';
    }

    /**
     * 🔥 FIX 3: CORRECTED filterValidPatterns Logic
     * CORRECT BEHAVIOR:
     * - Remove pattern if ANY gap filled by pattern OWNER (gap completed → pattern connected)
     * - Remove pattern if ALL gaps filled by OPPONENT (completely blocked)
     * - Remove pattern if diagonal blocking prevents connection
     * - Keep pattern if: some gaps empty OR exactly one gap has opponent (threat state)
     */
    filterValidPatterns(patterns, gameCore) {
        if (!patterns || patterns.length === 0) {
            return [];
        }
        
        const validPatterns = patterns.filter(pattern => {
            // Validate pattern structure
            if (!pattern.gaps || pattern.gaps.length === 0) {
                this.debugLog(`❌ Pattern ${pattern.id} has no gaps - removing`);
                return false;
            }
            
            if (!pattern.piece1 || !pattern.piece2) {
                this.debugLog(`❌ Pattern ${pattern.id} missing pieces - removing`);
                return false;
            }
            
            // Check if pattern pieces still exist on board
            const p1Value = gameCore.board[pattern.piece1.row]?.[pattern.piece1.col];
            const p2Value = gameCore.board[pattern.piece2.row]?.[pattern.piece2.col];
            
            if (!p1Value || !p2Value) {
                this.debugLog(`❌ Pattern ${pattern.id} pieces no longer on board - removing`);
                return false;
            }
            
            // 🔥 CRITICAL: Check diagonal blocking FIRST
            if (this.isPatternDiagonallyBlocked(pattern, gameCore)) {
                this.debugLog(`🚫 Pattern ${pattern.id} blocked by opponent diagonal - removing`);
                return false;
            }
            
            // Count gap states
            let emptyGaps = 0;
            let ownerFilledGaps = 0;
            let opponentFilledGaps = 0;
            
            for (const gap of pattern.gaps) {
                if (!gameCore.isValidPosition(gap.row, gap.col)) {
                    this.debugLog(`⚠️ Pattern ${pattern.id} has invalid gap position - removing`);
                    return false;
                }
                
                const cellValue = gameCore.board[gap.row][gap.col];
                
                if (cellValue === null || cellValue === '') {
                    emptyGaps++;
                } else if (cellValue === pattern.player1) {
                    ownerFilledGaps++;
                } else {
                    opponentFilledGaps++;
                }
            }
            
            // 🔥 CORRECT LOGIC:
            
            // Remove if owner filled ANY gap → pattern is completed/connected
            if (ownerFilledGaps > 0) {
                this.debugLog(`✓ Pattern ${pattern.id} gap filled by owner - removing (connected)`);
                return false;
            }
            
            // Remove if ALL gaps filled by opponent → completely blocked
            if (opponentFilledGaps === pattern.gaps.length) {
                this.debugLog(`🚫 Pattern ${pattern.id} all gaps blocked by opponent - removing`);
                return false;
            }
            
            // Keep pattern if:
            // - All gaps empty (safe pattern), OR
            // - Some gaps empty and some have opponent (threatened pattern)
            if (emptyGaps > 0) {
                const status = opponentFilledGaps > 0 ? 'THREATENED' : 'SAFE';
                this.debugLog(`✅ Pattern ${pattern.id} is ${status} - keeping`);
                return true;
            }
            
            // Fallback: shouldn't reach here, but remove just in case
            this.debugLog(`⚠️ Pattern ${pattern.id} unexpected state - removing`);
            return false;
        });
        
        if (this.verboseLogging) {
            this.debugLog(`Filtered ${patterns.length - validPatterns.length} invalid patterns`);
        }
        
        return validPatterns;
    }

   /**
 * Check if I-pattern is blocked by opponent diagonal crossing
 * FIXED: Checks if diagonal involves gap cell AND crosses the line
 */
isIPatternDiagonallyBlocked(pattern, gameCore, opponent) {
    const p1 = pattern.piece1;
    const p2 = pattern.piece2;
    
    if (!p1 || !p2 || !pattern.gaps) {
        return false;
    }
    
    // Check if I-pattern is vertical or horizontal
    const isVertical = (p1.col === p2.col);
    const isHorizontal = (p1.row === p2.row);
    
    if (!isVertical && !isHorizontal) {
        return false;
    }
    
    // Get opponent diagonals from diagonal manager
    // CRITICAL: Access via window.aivsHumanObserver
    const observer = window.aivsHumanObserver;
    if (!observer || !observer.diagonalLines) {
        return false;
    }
    
    const opponentDiagonals = observer.diagonalLines.getPlayerConnections(opponent);
    if (!opponentDiagonals || opponentDiagonals.length === 0) {
        return false;
    }
    
    // Check if any opponent diagonal blocks this pattern
    for (const diag of opponentDiagonals) {
        // Does diagonal involve any gap cell?
        const involvesGap = pattern.gaps.some(gap =>
            (gap.row === diag.row1 && gap.col === diag.col1) ||
            (gap.row === diag.row2 && gap.col === diag.col2)
        );
        
        if (involvesGap) {
            if (isVertical) {
                // For vertical I-pattern, check if diagonal crosses horizontally
                const crossesLine = (diag.col1 !== diag.col2) &&
                                   ((diag.col1 <= p1.col && diag.col2 >= p1.col) ||
                                    (diag.col1 >= p1.col && diag.col2 <= p1.col));
                
                if (crossesLine) {
                    this.debugLog(`I-pattern BLOCKED by diagonal (${diag.row1},${diag.col1})↔(${diag.row2},${diag.col2})`);
                    return true;
                }
            } else if (isHorizontal) {
                // For horizontal I-pattern, check if diagonal crosses vertically
                const crossesLine = (diag.row1 !== diag.row2) &&
                                   ((diag.row1 <= p1.row && diag.row2 >= p1.row) ||
                                    (diag.row1 >= p1.row && diag.row2 <= p1.row));
                
                if (crossesLine) {
                    this.debugLog(`I-pattern BLOCKED by diagonal (${diag.row1},${diag.col1})↔(${diag.row2},${diag.col2})`);
                    return true;
                }
            }
        }
    }
    
    return false;
}

/**
 * Check if L-pattern is blocked by opponent diagonal
 * KEEPS EXISTING LOGIC - uses gameCore.isDiagonalBlocked()
 */
isLPatternDiagonallyBlocked(pattern, gameCore, opponent) {
    const p1 = pattern.piece1;
    const p2 = pattern.piece2;
    
    if (!p1 || !p2 || !pattern.gaps) {
        return false;
    }
    
    for (const gap of pattern.gaps) {
        const isDiagToP1 = Math.abs(gap.row - p1.row) === 1 && Math.abs(gap.col - p1.col) === 1;
        const isDiagToP2 = Math.abs(gap.row - p2.row) === 1 && Math.abs(gap.col - p2.col) === 1;
        
        if (isDiagToP1 || isDiagToP2) {
            if (isDiagToP1 && gameCore.isDiagonalBlocked && gameCore.isDiagonalBlocked(gap, p1, opponent)) {
                this.debugLog(`L-pattern BLOCKED: diagonal to p1 blocked`);
                return true;
            }
            if (isDiagToP2 && gameCore.isDiagonalBlocked && gameCore.isDiagonalBlocked(gap, p2, opponent)) {
                this.debugLog(`L-pattern BLOCKED: diagonal to p2 blocked`);
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Check if pattern is blocked by opponent's diagonal
 * FIXED: Properly routes to type-specific methods
 */
isPatternDiagonallyBlocked(pattern, gameCore) {
    if (!pattern || !pattern.piece1 || !pattern.piece2) {
        return false;
    }
    
    const opponent = pattern.player1 === 'X' ? 'O' : 'X';
    const patternType = pattern.type || pattern.patternType;
    
    if (patternType === 'L') {
        return this.isLPatternDiagonallyBlocked(pattern, gameCore, opponent);
    } else if (patternType === 'I') {
        return this.isIPatternDiagonallyBlocked(pattern, gameCore, opponent);
    } else if (patternType === 'D') {
        return this.isDPatternBlocked(pattern, gameCore, opponent);
    }
    
    return false;
}

    /**
     * Check if D-pattern is blocked
     */
    isDPatternBlocked(pattern, gameCore, opponent) {
        const p1 = pattern.piece1;
        const p2 = pattern.piece2;
        
        // D-pattern blocked by lateral opponent pieces in crossing positions
        const cross1 = { row: p1.row, col: p2.col };
        const cross2 = { row: p2.row, col: p1.col };
        
        const hasCross1 = gameCore.board[cross1.row]?.[cross1.col] === opponent;
        const hasCross2 = gameCore.board[cross2.row]?.[cross2.col] === opponent;
        
        return hasCross1 && hasCross2;
    }

    /**
     * Calculate diagonal pattern gaps
     */
    calculateDiagonalPatternGaps(pos1, pos2) {
        const p1 = this.normalizePosition(pos1);
        const p2 = this.normalizePosition(pos2);
        
        const dr = p2.row - p1.row;
        const dc = p2.col - p1.col;
        
        if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
            const gapRow = p1.row + (dr > 0 ? 1 : -1);
            const gapCol = p1.col + (dc > 0 ? 1 : -1);
            
            const gap = { row: gapRow, col: gapCol };
            this.debugLog(`🔶 D-pattern (distance 2,2): Gap at (${gap.row},${gap.col})`);
            return [gap];
        }
        
        this.debugLog(`⚠️ Not a valid D-pattern: distance (${Math.abs(dr)},${Math.abs(dc)})`);
        return [];
    }

    /**
     * Helper: Normalize position format
     */
    normalizePosition(pos) {
        return { row: pos.row, col: pos.col };
    }

    /**
     * Helper: Get all cells adjacent to a position
     */
    getAdjacentCells(pos) {
        const adjacent = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                adjacent.push({ row: pos.row + dr, col: pos.col + dc });
            }
        }
        return adjacent;
    }

    /**
     * Clear pattern cache
     */
    clearCache() {
        this.patternCache.clear();
        this.lastScannedMove = -1;
        this.debugLog('🗑️ Pattern cache cleared');
    }

    /**
     * Set debug mode
     */
    setDebugMode(enabled, verbose = false) {
        this.debugMode = enabled;
        this.verboseLogging = verbose;
        
        if (this.universalGapCalculator) {
            this.universalGapCalculator.setDebugMode(enabled);
        }
        
        this.debugLog(`Debug mode: ${enabled ? 'ENABLED' : 'DISABLED'}${verbose ? ' (VERBOSE)' : ''}`);
    }

    /**
     * Internal logging
     */
    debugLog(message) {
        if (this.debugMode) {
            console.log(`[PATTERN-DETECTOR] ${message}`);
        }
    }

    /**
     * Validate that universal gap calculator is connected
     */
    validateGapCalculatorConnection() {
        if (!this.universalGapCalculator) {
            const error = 'PatternDetector requires UniversalGapCalculator injection';
            console.error('❌', error);
            throw new Error(error);
        }
        return true;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.PatternDetector = PatternDetector;
    console.log('✅ FIXED Pattern Detector loaded');
    console.log('   🔥 FIX 1: Early rejection of adjacent cells');
    console.log('   🔥 FIX 2: Correct filterValidPatterns logic');
    console.log('   🔥 FIX 3: Proper diagonal blocking detection');
    console.log('   🔗 Requires: setGapCalculator(universalGapCalculator)');
}