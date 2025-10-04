// gap-blocking-detector.js - COMPLETE: All blocking detection logic
// PURPOSE: Centralized blocking detection for gaps AND patterns
// ARCHITECTURE: Single source of truth for all blocking checks

class GapBlockingDetector {
    constructor(gameCore, patternDetector = null) {
        this.gameCore = gameCore;
        this.patternDetector = patternDetector;
        this.diagonalLinesManager = null; // Injected later by system initializer
        this.debugMode = false;
        
        // Cache system
        this.blockingCache = new Map();
        this.lastCheckedMove = -1;
        
        this.log('🚧 Gap Blocking Detector initialized - Complete blocking detection');
    }

    // ===== MODULE CONNECTIONS =====
    
    setPatternDetector(patternDetector) {
        this.patternDetector = patternDetector;
        this.log('🔗 Pattern Detector connected');
    }

    setDiagonalLinesManager(diagonalLinesManager) {
        this.diagonalLinesManager = diagonalLinesManager;
        this.log('🔗 Diagonal Lines Manager connected');
    }

    // ===== MAIN API: GAP BLOCKING =====
    
    /**
     * Check if a gap is blocked by opponent diagonal lines
     */
    isGapBlocked(gap, gapOwner) {
        if (!gap || !gapOwner) {
            return { blocked: false, reason: 'Invalid input' };
        }

        const currentMove = this.gameCore.moveCount || 0;
        const cacheKey = `gap-${gap.row}-${gap.col}-${gapOwner}-${currentMove}`;
        
        // Check cache
        if (this.blockingCache.has(cacheKey)) {
            return this.blockingCache.get(cacheKey);
        }
        
        const opponent = gapOwner === 'X' ? 'O' : 'X';
        let result = { blocked: false, reason: 'No blocking detected' };
        
        // Method 1: Check diagonal blocking (primary method)
        if (this.isDiagonallyBlocked(gap, gapOwner, opponent)) {
            result = { 
                blocked: true, 
                reason: 'Blocked by opponent diagonal lines',
                method: 'diagonal'
            };
        }
        
        // Method 2: Check surrounding control
        else if (this.isSurroundedByOpponent(gap, opponent)) {
            result = { 
                blocked: true, 
                reason: 'Surrounded by opponent pieces',
                method: 'surrounded'
            };
        }
        
        // Cache result
        this.blockingCache.set(cacheKey, result);
        
        if (result.blocked && this.debugMode) {
            this.log(`🚫 Gap (${gap.row},${gap.col}) blocked for ${gapOwner}: ${result.reason}`);
        }
        
        return result;
    }

    /**
     * Filter gaps to remove blocked ones
     * Used by Gap Analyzer and Gap Registry
     */
    filterBlockedGaps(gaps, gapOwner) {
        if (!gaps || gaps.length === 0) {
            return { validGaps: [], blockedGaps: [], totalFiltered: 0 };
        }
        
        const validGaps = [];
        const blockedGaps = [];
        
        for (const gap of gaps) {
            const blockResult = this.isGapBlocked(gap, gapOwner);
            
            if (blockResult.blocked) {
                blockedGaps.push({ 
                    ...gap, 
                    blockReason: blockResult.reason,
                    blockMethod: blockResult.method 
                });
            } else {
                validGaps.push(gap);
            }
        }
        
        if (blockedGaps.length > 0 && this.debugMode) {
            this.log(`🧹 Filtered ${blockedGaps.length}/${gaps.length} blocked gaps for ${gapOwner}`);
        }
        
        return {
            validGaps: validGaps,
            blockedGaps: blockedGaps,
            totalFiltered: blockedGaps.length
        };
    }

    // ===== MAIN API: PATTERN BLOCKING AFTER MOVES =====
    
    /**
     * Check if opponent's move creates diagonal blocking for existing patterns
     * CRITICAL: This detects when opponent diagonal cuts across our patterns
     * Called by gap-registry after each move
     */
    checkPatternBlockingAfterMove(row, col, player, allPatterns) {
        if (!allPatterns || allPatterns.length === 0) {
            return { blockedPatterns: [], blockedCount: 0 };
        }
        
        this.log(`🔍 Checking pattern blocking from move (${row},${col}) by ${player}`);
        
        const opponent = player === 'X' ? 'O' : 'X';
        const opponentPatterns = allPatterns.filter(p => p.player1 === opponent);
        
        const blockedPatterns = [];
        
        for (const pattern of opponentPatterns) {
            if (this.doesMoveBlockPattern(row, col, player, pattern)) {
                this.log(`✂️ Pattern ${pattern.id} blocked by diagonal from (${row},${col})`);
                blockedPatterns.push(pattern.id);
            }
        }
        
        if (blockedPatterns.length > 0) {
            this.log(`🚪 Found ${blockedPatterns.length} pattern(s) blocked by new diagonal`);
        }
        
        return {
            blockedPatterns: blockedPatterns,
            blockedCount: blockedPatterns.length
        };
    }

    /**
     * Check if a specific move blocks an existing pattern via diagonal
     */
    doesMoveBlockPattern(row, col, player, pattern) {
        if (!pattern.piece1 || !pattern.piece2) {
            return false;
        }
        
        const newPos = { row, col };
        const p1 = pattern.piece1;
        const p2 = pattern.piece2;
        
        // Check if new move is diagonally adjacent to pattern pieces
        const isDiagToP1 = Math.abs(row - p1.row) === 1 && Math.abs(col - p1.col) === 1;
        const isDiagToP2 = Math.abs(row - p2.row) === 1 && Math.abs(col - p2.col) === 1;
        
        if (!isDiagToP1 && !isDiagToP2) {
            return false; // Not diagonally adjacent to pattern
        }
        
        // Use gameCore's diagonal blocking check if available
        if (typeof this.gameCore.isDiagonalBlocked === 'function') {
            if (isDiagToP1 && this.gameCore.isDiagonalBlocked(newPos, p1, player)) {
                return true;
            }
            if (isDiagToP2 && this.gameCore.isDiagonalBlocked(newPos, p2, player)) {
                return true;
            }
        }
        
        // Fallback: check if new move completes a crossing diagonal
        return this.checkCrossingDiagonal(newPos, player, p1, p2);
    }

    /**
     * Check for crossing diagonal (fallback method)
     */
    checkCrossingDiagonal(newPos, player, p1, p2) {
        const board = this.gameCore.board;
        
        // Check all diagonally adjacent cells to newPos
        const diagonalNeighbors = [
            { row: newPos.row - 1, col: newPos.col - 1 },
            { row: newPos.row - 1, col: newPos.col + 1 },
            { row: newPos.row + 1, col: newPos.col - 1 },
            { row: newPos.row + 1, col: newPos.col + 1 }
        ];
        
        for (const neighbor of diagonalNeighbors) {
            if (this.gameCore.isValidPosition(neighbor.row, neighbor.col) &&
                board[neighbor.row][neighbor.col] === player) {
                
                // Found a diagonal connection, check if it crosses pattern line
                if (this.diagonalCrossesPattern(newPos, neighbor, p1, p2)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check if diagonal line crosses pattern connection line
     */
    diagonalCrossesPattern(d1, d2, p1, p2) {
        // Get crossing cells for diagonal d1-d2
        const dCross1 = { row: d1.row, col: d2.col };
        const dCross2 = { row: d2.row, col: d1.col };
        
        // Check if either pattern piece is in crossing position
        const p1Match = (p1.row === dCross1.row && p1.col === dCross1.col) ||
                        (p1.row === dCross2.row && p1.col === dCross2.col);
        const p2Match = (p2.row === dCross1.row && p2.col === dCross1.col) ||
                        (p2.row === dCross2.row && p2.col === dCross2.col);
        
        return p1Match || p2Match;
    }

    // ===== DIAGONAL BLOCKING DETECTION (For Gaps) =====
    
    /**
     * Check if gap is blocked by diagonal lines
     */
    isDiagonallyBlocked(gap, gapOwner, opponent) {
        if (!gap.pattern || !gap.patternType) {
            return false;
        }

        // Check different pattern types
        switch (gap.patternType) {
            case 'L':
                return this.isLPatternDiagonallyBlocked(gap, opponent);
            case 'I':
                return this.isIPatternDiagonallyBlocked(gap, opponent);
            case 'D':
                return this.isDiagonalPatternBlocked(gap, opponent);
            default:
                return false;
        }
    }

    /**
     * Check L-pattern diagonal blocking
     */
    isLPatternDiagonallyBlocked(gap, opponent) {
        if (!gap.pattern || !gap.pattern.piece1 || !gap.pattern.piece2) {
            return false;
        }

        const piece1 = gap.pattern.piece1;
        const piece2 = gap.pattern.piece2;
        
        const diagonalsToCheck = this.getLPatternDiagonals(gap, piece1, piece2);
        
        let blockedDiagonals = 0;
        for (const diagonal of diagonalsToCheck) {
            if (this.isDiagonalConnectionBlocked(diagonal.from, diagonal.to, opponent)) {
                blockedDiagonals++;
            }
        }
        
        return blockedDiagonals >= Math.ceil(diagonalsToCheck.length / 2);
    }

    /**
     * Check I-pattern diagonal blocking
     */
    isIPatternDiagonallyBlocked(gap, opponent) {
        if (!gap.pattern || !gap.pattern.piece1 || !gap.pattern.piece2) {
            return false;
        }

        const piece1 = gap.pattern.piece1;
        const piece2 = gap.pattern.piece2;
        
        return this.doesDiagonalCrossIPattern(piece1, piece2, gap, opponent);
    }

    /**
     * Check diagonal pattern blocking
     */
    isDiagonalPatternBlocked(gap, opponent) {
        return this.isPositionControlledByOpponentDiagonals(gap, opponent);
    }

    // ===== DIAGONAL CONNECTION ANALYSIS =====
    
    /**
     * Check if diagonal connection is blocked by opponent
     */
    isDiagonalConnectionBlocked(from, to, opponent) {
        const blockingPositions = this.getBlockingPositions(from, to);
        
        return blockingPositions.some(pos => 
            this.gameCore.isValidPosition(pos.row, pos.col) &&
            this.gameCore.board[pos.row][pos.col] === opponent
        );
    }

    /**
     * Check if opponent diagonal lines cross I-pattern connection
     */
    doesDiagonalCrossIPattern(piece1, piece2, gap, opponent) {
        const connectionLine = this.getConnectionLine(piece1, piece2);
        const crossingDiagonals = this.findCrossingDiagonals(connectionLine, opponent);
        
        return crossingDiagonals.length > 0;
    }

    /**
     * Check if position is controlled by opponent diagonals
     */
    isPositionControlledByOpponentDiagonals(position, opponent) {
        const diagonalNeighbors = [
            { row: position.row - 1, col: position.col - 1 },
            { row: position.row - 1, col: position.col + 1 },
            { row: position.row + 1, col: position.col - 1 },
            { row: position.row + 1, col: position.col + 1 }
        ];
        
        let opponentDiagonals = 0;
        for (const neighbor of diagonalNeighbors) {
            if (this.gameCore.isValidPosition(neighbor.row, neighbor.col) &&
                this.gameCore.board[neighbor.row][neighbor.col] === opponent) {
                opponentDiagonals++;
            }
        }
        
        return opponentDiagonals >= 2;
    }

    // ===== SURROUNDING DETECTION =====
    
    /**
     * Check if gap is surrounded by opponent pieces
     */
    isSurroundedByOpponent(gap, opponent) {
        if (!gap || !this.gameCore.isValidPosition(gap.row, gap.col)) {
            return false;
        }
        
        const neighbors = this.getNeighbors(gap.row, gap.col);
        let opponentCount = 0;
        let validNeighbors = 0;
        
        for (const neighbor of neighbors) {
            if (this.gameCore.isValidPosition(neighbor.row, neighbor.col)) {
                validNeighbors++;
                if (this.gameCore.board[neighbor.row][neighbor.col] === opponent) {
                    opponentCount++;
                }
            }
        }
        
        return validNeighbors > 0 && (opponentCount / validNeighbors) > 0.6;
    }

    // ===== GEOMETRIC HELPER METHODS =====
    
    getLPatternDiagonals(gap, piece1, piece2) {
        const diagonals = [];
        
        if (this.areDiagonallyAdjacent(gap, piece1)) {
            diagonals.push({ from: gap, to: piece1 });
        }
        if (this.areDiagonallyAdjacent(gap, piece2)) {
            diagonals.push({ from: gap, to: piece2 });
        }
        
        return diagonals;
    }

    areDiagonallyAdjacent(pos1, pos2) {
        const rowDiff = Math.abs(pos1.row - pos2.row);
        const colDiff = Math.abs(pos1.col - pos2.col);
        return rowDiff === 1 && colDiff === 1;
    }

    getBlockingPositions(from, to) {
        const blockingPos = [];
        const rowDiff = to.row - from.row;
        const colDiff = to.col - from.col;
        
        if (Math.abs(rowDiff) === Math.abs(colDiff)) {
            const stepRow = rowDiff > 0 ? 1 : -1;
            const stepCol = colDiff > 0 ? 1 : -1;
            
            for (let i = 1; i < Math.abs(rowDiff); i++) {
                blockingPos.push({
                    row: from.row + i * stepRow,
                    col: from.col + i * stepCol
                });
            }
        }
        
        return blockingPos;
    }

    getConnectionLine(piece1, piece2) {
        return {
            from: piece1,
            to: piece2,
            type: piece1.row === piece2.row ? 'horizontal' : 'vertical'
        };
    }

    findCrossingDiagonals(connectionLine, opponent) {
        const crossingDiagonals = [];
        const { from, to } = connectionLine;
        
        for (let row = 0; row < this.gameCore.size; row++) {
            for (let col = 0; col < this.gameCore.size; col++) {
                if (this.gameCore.board[row][col] === opponent) {
                    if (this.doesPieceCrossConnection(from, to, { row, col })) {
                        crossingDiagonals.push({ row, col });
                    }
                }
            }
        }
        
        return crossingDiagonals;
    }

    doesPieceCrossConnection(from, to, opponentPiece) {
        if (from.row === to.row) {
            // Horizontal connection
            return opponentPiece.row !== from.row &&
                   opponentPiece.col > Math.min(from.col, to.col) && 
                   opponentPiece.col < Math.max(from.col, to.col);
        } else if (from.col === to.col) {
            // Vertical connection
            return opponentPiece.col !== from.col &&
                   opponentPiece.row > Math.min(from.row, to.row) && 
                   opponentPiece.row < Math.max(from.row, to.row);
        }
        
        return false;
    }

    getNeighbors(row, col) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                neighbors.push({ row: row + dr, col: col + dc });
            }
        }
        return neighbors;
    }

    // ===== CACHE MANAGEMENT =====
    
    invalidateCache() {
        this.blockingCache.clear();
        this.lastCheckedMove = this.gameCore.moveCount || 0;
        this.log('🗑️ Gap blocking cache invalidated');
    }

    getBlockingStats() {
        return {
            cachedResults: this.blockingCache.size,
            lastCheckedMove: this.lastCheckedMove,
            currentMove: this.gameCore.moveCount || 0,
            hasDiagonalLines: !!this.diagonalLinesManager
        };
    }

    // ===== DEBUGGING =====
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`Debug mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[GAP-BLOCKING] ${message}`);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.GapBlockingDetector = GapBlockingDetector;
    console.log('✅ COMPLETE Gap Blocking Detector loaded');
    console.log('   🎯 API: Gap blocking + Pattern blocking');
    console.log('   🔗 Integration: Gap Registry, Gap Analyzer, Pattern Detector');
    console.log('   ⚡ Methods: filterBlockedGaps(), checkPatternBlockingAfterMove()');
}