// gap-blocking-detector.js - System to detect and remove gaps blocked by diagonal lines
// Integrates with diagonal line detection to remove invalid opponent gaps

class GapBlockingDetector {
    constructor(gameCore, patternDetector) {
        this.gameCore = gameCore;
        this.patternDetector = patternDetector;
        this.debugMode = true;
        
        // Cache of known blocked gaps
        this.blockedGaps = new Map(); // key: "row-col-player", value: blocking reason
        this.lastCheckedMove = -1;
        
        this.log('🚧 Gap Blocking Detector initialized');
    }

    /**
     * MAIN: Check if a gap is blocked by opponent diagonal lines
     * Returns true if gap is blocked (should be removed from registry)
     */
    isGapBlocked(gap, gapOwner) {
        const currentMove = this.gameCore.moveCount || 0;
        const cacheKey = `${gap.row}-${gap.col}-${gapOwner}`;
        
        // Check cache first
        if (this.lastCheckedMove === currentMove && this.blockedGaps.has(cacheKey)) {
            return this.blockedGaps.get(cacheKey);
        }
        
        const opponent = gapOwner === 'X' ? 'O' : 'X';
        
        // Method 1: Check if gap cell is directly blocked by opponent piece
        if (this.gameCore.board[gap.row][gap.col] === opponent) {
            const blockInfo = { blocked: true, reason: `Gap filled by ${opponent}`, method: 'direct' };
            this.blockedGaps.set(cacheKey, blockInfo);
            this.log(`🚫 Gap (${gap.row},${gap.col}) blocked: ${blockInfo.reason}`);
            return blockInfo;
        }
        
        // Method 2: Check if gap is crossed by opponent diagonal connections
        const diagonalBlock = this.checkDiagonalBlocking(gap, gapOwner, opponent);
        if (diagonalBlock.blocked) {
            this.blockedGaps.set(cacheKey, diagonalBlock);
            this.log(`🚫 Gap (${gap.row},${gap.col}) blocked by diagonal: ${diagonalBlock.reason}`);
            return diagonalBlock;
        }
        
        // Method 3: Check if gap connection path is severed
        const pathBlock = this.checkConnectionPathBlocked(gap, gapOwner, opponent);
        if (pathBlock.blocked) {
            this.blockedGaps.set(cacheKey, pathBlock);
            this.log(`🚫 Gap (${gap.row},${gap.col}) blocked path: ${pathBlock.reason}`);
            return pathBlock;
        }
        
        // Gap is not blocked
        const notBlocked = { blocked: false, reason: 'Gap is clear' };
        this.blockedGaps.set(cacheKey, notBlocked);
        
        return notBlocked;
    }

    /**
     * Check if opponent diagonal connections block the gap
     */
    checkDiagonalBlocking(gap, gapOwner, opponent) {
        // Get the pattern this gap belongs to
        if (!gap.pattern || !gap.pattern.piece1 || !gap.pattern.piece2) {
            return { blocked: false, reason: 'No pattern information' };
        }
        
        const piece1 = gap.pattern.piece1;
        const piece2 = gap.pattern.piece2;
        
        this.log(`🔍 Checking diagonal blocking for ${gapOwner} gap (${gap.row},${gap.col}) between (${piece1.row},${piece1.col}) and (${piece2.row},${piece2.col})`);
        
        // For I-patterns: check if opponent diagonal crosses the connection line
        if (gap.patternType === 'I') {
            return this.checkIPatternDiagonalBlocking(gap, piece1, piece2, opponent);
        }
        
        // For L-patterns: check if opponent pieces block both gap cells
        if (gap.patternType === 'L') {
            return this.checkLPatternDiagonalBlocking(gap, piece1, piece2, opponent);
        }
        
        return { blocked: false, reason: 'Unknown pattern type' };
    }

    /**
     * Check I-pattern diagonal blocking
     * I-patterns are vulnerable to diagonal cuts across their connection line
     */
    checkIPatternDiagonalBlocking(gap, piece1, piece2, opponent) {
        // Determine I-pattern orientation
        const isVertical = piece1.col === piece2.col; // Same column = vertical I
        const isHorizontal = piece1.row === piece2.row; // Same row = horizontal I
        
        if (!isVertical && !isHorizontal) {
            return { blocked: false, reason: 'Invalid I-pattern' };
        }
        
        if (isVertical) {
            // Vertical I-pattern: check for horizontal diagonal cuts
            return this.checkVerticalIBlocking(gap, piece1, piece2, opponent);
        } else {
            // Horizontal I-pattern: check for vertical diagonal cuts  
            return this.checkHorizontalIBlocking(gap, piece1, piece2, opponent);
        }
    }

    /**
     * Check if vertical I-pattern is blocked by diagonal connections
     */
    checkVerticalIBlocking(gap, piece1, piece2, opponent) {
        // Vertical I: pieces at (row1, col) and (row2, col), gap line is vertical
        const col = piece1.col;
        const minRow = Math.min(piece1.row, piece2.row);
        const maxRow = Math.max(piece1.row, piece2.row);
        const gapRow = Math.floor((minRow + maxRow) / 2); // Middle row
        
        this.log(`🔍 Vertical I-pattern: col ${col}, rows ${minRow}-${maxRow}, gap row ${gapRow}`);
        
        // Check for opponent diagonal connections that cross the gap line
        // Look for opponent pieces that form diagonal connections across the gap
        
        // Check left diagonal crossing (opponent pieces at [gapRow-1, col-1] and [gapRow+1, col+1])
        const topLeftOpponent = this.gameCore.board[gapRow - 1] && this.gameCore.board[gapRow - 1][col - 1] === opponent;
        const bottomRightOpponent = this.gameCore.board[gapRow + 1] && this.gameCore.board[gapRow + 1][col + 1] === opponent;
        
        if (topLeftOpponent && bottomRightOpponent) {
            // Check if this diagonal connection was established first (using diagonal lines system)
            const diagonalExists = this.checkDiagonalConnectionExists(
                { row: gapRow - 1, col: col - 1 }, 
                { row: gapRow + 1, col: col + 1 }, 
                opponent
            );
            
            if (diagonalExists) {
                return { 
                    blocked: true, 
                    reason: `Diagonal ${opponent} connection crosses vertical I-pattern`,
                    method: 'diagonal-cross',
                    blockingPieces: [
                        { row: gapRow - 1, col: col - 1 },
                        { row: gapRow + 1, col: col + 1 }
                    ]
                };
            }
        }
        
        // Check right diagonal crossing (opponent pieces at [gapRow-1, col+1] and [gapRow+1, col-1])
        const topRightOpponent = this.gameCore.board[gapRow - 1] && this.gameCore.board[gapRow - 1][col + 1] === opponent;
        const bottomLeftOpponent = this.gameCore.board[gapRow + 1] && this.gameCore.board[gapRow + 1][col - 1] === opponent;
        
        if (topRightOpponent && bottomLeftOpponent) {
            const diagonalExists = this.checkDiagonalConnectionExists(
                { row: gapRow - 1, col: col + 1 }, 
                { row: gapRow + 1, col: col - 1 }, 
                opponent
            );
            
            if (diagonalExists) {
                return { 
                    blocked: true, 
                    reason: `Diagonal ${opponent} connection crosses vertical I-pattern`,
                    method: 'diagonal-cross',
                    blockingPieces: [
                        { row: gapRow - 1, col: col + 1 },
                        { row: gapRow + 1, col: col - 1 }
                    ]
                };
            }
        }
        
        return { blocked: false, reason: 'Vertical I-pattern clear' };
    }

    /**
     * Check if horizontal I-pattern is blocked by diagonal connections
     */
    checkHorizontalIBlocking(gap, piece1, piece2, opponent) {
        // Horizontal I: pieces at (row, col1) and (row, col2), gap line is horizontal
        const row = piece1.row;
        const minCol = Math.min(piece1.col, piece2.col);
        const maxCol = Math.max(piece1.col, piece2.col);
        const gapCol = Math.floor((minCol + maxCol) / 2); // Middle column
        
        this.log(`🔍 Horizontal I-pattern: row ${row}, cols ${minCol}-${maxCol}, gap col ${gapCol}`);
        
        // Check for opponent diagonal connections that cross the gap line
        
        // Check diagonal crossing (opponent pieces at [row-1, gapCol-1] and [row+1, gapCol+1])
        const topLeftOpponent = this.gameCore.board[row - 1] && this.gameCore.board[row - 1][gapCol - 1] === opponent;
        const bottomRightOpponent = this.gameCore.board[row + 1] && this.gameCore.board[row + 1][gapCol + 1] === opponent;
        
        if (topLeftOpponent && bottomRightOpponent) {
            const diagonalExists = this.checkDiagonalConnectionExists(
                { row: row - 1, col: gapCol - 1 }, 
                { row: row + 1, col: gapCol + 1 }, 
                opponent
            );
            
            if (diagonalExists) {
                return { 
                    blocked: true, 
                    reason: `Diagonal ${opponent} connection crosses horizontal I-pattern`,
                    method: 'diagonal-cross',
                    blockingPieces: [
                        { row: row - 1, col: gapCol - 1 },
                        { row: row + 1, col: gapCol + 1 }
                    ]
                };
            }
        }
        
        // Check other diagonal crossing
        const topRightOpponent = this.gameCore.board[row - 1] && this.gameCore.board[row - 1][gapCol + 1] === opponent;
        const bottomLeftOpponent = this.gameCore.board[row + 1] && this.gameCore.board[row + 1][gapCol - 1] === opponent;
        
        if (topRightOpponent && bottomLeftOpponent) {
            const diagonalExists = this.checkDiagonalConnectionExists(
                { row: row - 1, col: gapCol + 1 }, 
                { row: row + 1, col: gapCol - 1 }, 
                opponent
            );
            
            if (diagonalExists) {
                return { 
                    blocked: true, 
                    reason: `Diagonal ${opponent} connection crosses horizontal I-pattern`,
                    method: 'diagonal-cross',
                    blockingPieces: [
                        { row: row - 1, col: gapCol + 1 },
                        { row: row + 1, col: gapCol - 1 }
                    ]
                };
            }
        }
        
        return { blocked: false, reason: 'Horizontal I-pattern clear' };
    }

    /**
     * Check L-pattern diagonal blocking
     * L-patterns have 2 gap cells - if both are blocked, pattern is useless
     */
    checkLPatternDiagonalBlocking(gap, piece1, piece2, opponent) {
        // Get all gap cells for this L-pattern
        const allGaps = this.patternDetector.getLPatternGaps(piece1, piece2, this.gameCore);
        
        this.log(`🔍 L-pattern has ${allGaps.length} gap cells`);
        
        // Count how many gaps are blocked
        let blockedGapCount = 0;
        const blockingDetails = [];
        
        for (const gapCell of allGaps) {
            // Check if this gap cell is occupied by opponent
            if (this.gameCore.board[gapCell.row][gapCell.col] === opponent) {
                blockedGapCount++;
                blockingDetails.push(`(${gapCell.row},${gapCell.col}) filled by ${opponent}`);
            }
            
            // Check if this gap is surrounded by opponent pieces
            const surroundingOpponents = this.countSurroundingOpponents(gapCell, opponent);
            if (surroundingOpponents >= 3) {
                blockedGapCount++;
                blockingDetails.push(`(${gapCell.row},${gapCell.col}) surrounded by ${opponent}`);
            }
        }
        
        // L-pattern is blocked if ALL gaps are blocked
        if (blockedGapCount >= allGaps.length) {
            return { 
                blocked: true, 
                reason: `L-pattern completely blocked: ${blockingDetails.join(', ')}`,
                method: 'L-pattern-surrounded',
                blockedGaps: blockedGapCount,
                totalGaps: allGaps.length
            };
        }
        
        return { blocked: false, reason: `L-pattern has ${allGaps.length - blockedGapCount}/${allGaps.length} gaps clear` };
    }

    /**
     * Check if a diagonal connection exists between two opponent pieces
     * Integrates with the diagonal lines system
     */
    checkDiagonalConnectionExists(pos1, pos2, player) {
        // Check if positions form a diagonal (knight's move not allowed here)
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        
        // Must be true diagonal (equal row and column distance)
        if (dr !== dc || dr === 0) {
            return false;
        }
        
        // Check if both positions contain the player's pieces
        if (!this.gameCore.isValidPosition(pos1.row, pos1.col) || 
            !this.gameCore.isValidPosition(pos2.row, pos2.col)) {
            return false;
        }
        
        if (this.gameCore.board[pos1.row][pos1.col] !== player ||
            this.gameCore.board[pos2.row][pos2.col] !== player) {
            return false;
        }
        
        // If diagonal lines system is available, use it
        if (this.gameCore.diagonalLinesManager) {
            return this.gameCore.diagonalLinesManager.isPositionInDiagonalConnection(pos1.row, pos1.col, player) &&
                   this.gameCore.diagonalLinesManager.isPositionInDiagonalConnection(pos2.row, pos2.col, player);
        }
        
        // Fallback: assume diagonal connection exists if pieces are diagonally adjacent
        return dr === 1 && dc === 1;
    }

    /**
     * Check if connection path between pattern pieces is blocked
     */
    checkConnectionPathBlocked(gap, gapOwner, opponent) {
        // This is a more complex check that would require path-finding
        // For now, implement basic adjacency blocking
        
        if (!gap.pattern || !gap.pattern.piece1 || !gap.pattern.piece2) {
            return { blocked: false, reason: 'No pattern information for path check' };
        }
        
        // Check if gap is completely surrounded by opponent pieces
        const surroundingOpponents = this.countSurroundingOpponents(gap, opponent);
        
        if (surroundingOpponents >= 6) { // Most adjacent cells are opponent
            return { 
                blocked: true, 
                reason: `Gap surrounded by ${surroundingOpponents} ${opponent} pieces`,
                method: 'surrounded'
            };
        }
        
        return { blocked: false, reason: 'Connection path clear' };
    }

    /**
     * Count opponent pieces surrounding a position
     */
    countSurroundingOpponents(position, opponent) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        let count = 0;
        
        for (const [dr, dc] of directions) {
            const checkRow = position.row + dr;
            const checkCol = position.col + dc;
            
            if (this.gameCore.isValidPosition(checkRow, checkCol) &&
                this.gameCore.board[checkRow][checkCol] === opponent) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * Invalidate blocking cache when board changes
     */
    invalidateCache() {
        this.blockedGaps.clear();
        this.lastCheckedMove = -1;
        this.log('🗑️ Gap blocking cache invalidated');
    }

    /**
     * Filter out blocked gaps from a gap list
     */
    filterBlockedGaps(gaps, gapOwner) {
        const currentMove = this.gameCore.moveCount || 0;
        
        if (this.lastCheckedMove !== currentMove) {
            this.invalidateCache();
            this.lastCheckedMove = currentMove;
        }
        
        const validGaps = [];
        const blockedGaps = [];
        
        for (const gap of gaps) {
            const blockResult = this.isGapBlocked(gap, gapOwner);
            
            if (blockResult.blocked) {
                blockedGaps.push({ ...gap, blockReason: blockResult.reason });
                this.log(`🚫 Removed blocked gap: (${gap.row},${gap.col}) - ${blockResult.reason}`);
            } else {
                validGaps.push(gap);
            }
        }
        
        if (blockedGaps.length > 0) {
            this.log(`🧹 Filtered out ${blockedGaps.length}/${gaps.length} blocked gaps for ${gapOwner}`);
        }
        
        return {
            validGaps: validGaps,
            blockedGaps: blockedGaps,
            totalFiltered: blockedGaps.length
        };
    }

    /**
     * Debug method to analyze all gaps for blocking
     */
    analyzeAllGapBlocking(player) {
        this.log(`\n🚧 === GAP BLOCKING ANALYSIS FOR ${player} ===`);
        
        const opponent = player === 'X' ? 'O' : 'X';
        
        // This would need to integrate with gap registry to get current gaps
        // For now, just provide the interface
        
        this.log(`🔍 Checking for gaps blocked by ${opponent} diagonal connections...`);
        this.log(`🚧 === END BLOCKING ANALYSIS ===\n`);
        
        return {
            player: player,
            opponent: opponent,
            analysisComplete: true
        };
    }

    /**
     * Get blocking statistics
     */
    getBlockingStats() {
        return {
            cachedResults: this.blockedGaps.size,
            lastCheckedMove: this.lastCheckedMove,
            currentMove: this.gameCore.moveCount || 0,
            cacheValid: this.lastCheckedMove === (this.gameCore.moveCount || 0)
        };
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[GAP-BLOCKING] ${message}`);
        }
    }
}

// Integration helper for Gap Registry
class GapRegistryBlockingIntegration {
    constructor(gapRegistry, blockingDetector) {
        this.gapRegistry = gapRegistry;
        this.blockingDetector = blockingDetector;
        
        // Override gap registry methods to include blocking checks
        this.integrateWithGapRegistry();
        
        console.log('🔗 Gap Registry integrated with blocking detection');
    }
    
    integrateWithGapRegistry() {
        // Store original methods
        const originalGetThreatenedGaps = this.gapRegistry.getThreatenedGapsByType.bind(this.gapRegistry);
        const originalGetUnthreatenedGaps = this.gapRegistry.getUnthreatenedGapsByType.bind(this.gapRegistry);
        
        // Override with blocking-aware versions
        this.gapRegistry.getThreatenedGapsByType = (ownershipType) => {
            const gaps = originalGetThreatenedGaps(ownershipType);
            const player = ownershipType.split('-')[0]; // Extract player from 'X-X' or 'O-O'
            
            const filtered = this.blockingDetector.filterBlockedGaps(gaps, player);
            return filtered.validGaps;
        };
        
        this.gapRegistry.getUnthreatenedGapsByType = (ownershipType) => {
            const gaps = originalGetUnthreatenedGaps(ownershipType);
            const player = ownershipType.split('-')[0]; // Extract player from 'X-X' or 'O-O'
            
            const filtered = this.blockingDetector.filterBlockedGaps(gaps, player);
            return filtered.validGaps;
        };
        
        // Override opponent attack methods
        const originalGetOpponentVulnerableGaps = this.gapRegistry.getOpponentVulnerableGaps.bind(this.gapRegistry);
        
        this.gapRegistry.getOpponentVulnerableGaps = () => {
            const gaps = originalGetOpponentVulnerableGaps();
            const opponent = this.gapRegistry.aiPlayer === 'X' ? 'O' : 'X';
            
            const filtered = this.blockingDetector.filterBlockedGaps(gaps, opponent);
            return filtered.validGaps;
        };
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.GapBlockingDetector = GapBlockingDetector;
    window.GapRegistryBlockingIntegration = GapRegistryBlockingIntegration;
}

console.log('✅ Gap Blocking Detection System loaded');
console.log('🚧 Features: Diagonal blocking, I-pattern cross detection, L-pattern surrounding');
console.log('🔗 Integration: Filters blocked gaps from registry automatically');
console.log('🎯 Purpose: Prevent attacking impossible gaps blocked by opponent diagonal lines');