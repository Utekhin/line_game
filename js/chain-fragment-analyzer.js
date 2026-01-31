// chain-fragment-analyzer.js - NEW: Analyzes disconnected chain fragments

class ChainFragmentAnalyzer {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.debugMode = true;
        
        this.log('🔗 Chain Fragment Analyzer initialized');
    }

    /**
     * Find all disconnected chain fragments
     * Returns array of fragments, each containing connected pieces
     */
    findChainFragments() {
        const pieces = this.gameCore.getPlayerPositions(this.player);
        if (pieces.length === 0) return [];
        
        const visited = new Set();
        const fragments = [];
        
        for (const piece of pieces) {
            const key = `${piece.row}-${piece.col}`;
            if (!visited.has(key)) {
                const fragment = this.floodFillFragment(piece, visited);
                fragments.push(fragment);
            }
        }
        
        this.log(`📊 Found ${fragments.length} chain fragments`);
        return fragments;
    }

    /**
     * Flood fill to find all connected pieces in a fragment
     */
    floodFillFragment(startPiece, visited) {
        const fragment = {
            pieces: [],
            minRow: startPiece.row,
            maxRow: startPiece.row,
            minCol: startPiece.col,
            maxCol: startPiece.col,
            connectedToTopBorder: false,
            connectedToBottomBorder: false,
            connectedToLeftBorder: false,
            connectedToRightBorder: false
        };
        
        const queue = [startPiece];
        const fragmentVisited = new Set();
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row}-${current.col}`;
            
            if (fragmentVisited.has(key)) continue;
            fragmentVisited.add(key);
            visited.add(key);
            
            fragment.pieces.push(current);
            
            // Update fragment bounds
            fragment.minRow = Math.min(fragment.minRow, current.row);
            fragment.maxRow = Math.max(fragment.maxRow, current.row);
            fragment.minCol = Math.min(fragment.minCol, current.col);
            fragment.maxCol = Math.max(fragment.maxCol, current.col);
            
            // Check border connections
            if (current.row === 0) fragment.connectedToTopBorder = true;
            if (current.row === this.gameCore.size - 1) fragment.connectedToBottomBorder = true;
            if (current.col === 0) fragment.connectedToLeftBorder = true;
            if (current.col === this.gameCore.size - 1) fragment.connectedToRightBorder = true;
            
            // Check all 8 adjacent cells for connections
            const neighbors = this.getConnectedNeighbors(current);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row}-${neighbor.col}`;
                if (!fragmentVisited.has(neighborKey)) {
                    queue.push(neighbor);
                }
            }
        }
        
        return fragment;
    }

    /**
     * Get all connected neighbors (including diagonal if not blocked)
     */
    getConnectedNeighbors(piece) {
        const neighbors = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dr, dc] of directions) {
            const newRow = piece.row + dr;
            const newCol = piece.col + dc;
            
            if (this.gameCore.isValidPosition(newRow, newCol) &&
                this.gameCore.board[newRow][newCol] === this.player) {
                
                // Check if diagonal connection is blocked
                if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
                    if (!this.isDiagonalBlocked(piece, { row: newRow, col: newCol })) {
                        neighbors.push({ row: newRow, col: newCol });
                    }
                } else {
                    // Lateral connections are always valid
                    neighbors.push({ row: newRow, col: newCol });
                }
            }
        }
        
        return neighbors;
    }

    /**
     * Check if diagonal connection is blocked by opponent
     * Uses the diagonal lines manager to detect if an opponent's diagonal
     * was established first and blocks this connection
     */
    isDiagonalBlocked(from, to) {
        // Check if diagonal lines manager is available
        if (!this.gameCore.diagonalLinesManager) {
            this.log(`⚠️ isDiagonalBlocked: No diagonal lines manager available`);
            return false; // Can't check, assume not blocked
        }

        const opponent = this.player === 'X' ? 'O' : 'X';
        const opponentConnections = this.gameCore.diagonalLinesManager.getPlayerConnections(opponent);

        if (!opponentConnections || opponentConnections.length === 0) {
            return false; // No opponent diagonals to block
        }

        this.log(`🔍 isDiagonalBlocked: Checking (${from.row},${from.col})→(${to.row},${to.col}) against ${opponentConnections.length} ${opponent} diagonals`);

        // Check if our diagonal would cross any opponent diagonal
        // Our potential diagonal: from → to
        const x1 = from.col, y1 = from.row;
        const x2 = to.col, y2 = to.row;

        for (const oppConn of opponentConnections) {
            const x3 = oppConn.col1, y3 = oppConn.row1;
            const x4 = oppConn.col2, y4 = oppConn.row2;

            // Check if lines share an endpoint (allowed)
            if ((x1 === x3 && y1 === y3) || (x1 === x4 && y1 === y4) ||
                (x2 === x3 && y2 === y3) || (x2 === x4 && y2 === y4)) {
                continue; // Sharing endpoint is allowed
            }

            // Parametric line intersection test
            const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

            // Lines are parallel
            if (Math.abs(denom) < 0.0001) {
                continue;
            }

            // Calculate intersection parameters
            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

            // Check if intersection point is within both line segments
            if ((t > 0.01 && t < 0.99) && (u > 0.01 && u < 0.99)) {
                this.log(`🚫 Diagonal (${from.row},${from.col})→(${to.row},${to.col}) blocked by ${opponent} diagonal (${oppConn.row1},${oppConn.col1})→(${oppConn.row2},${oppConn.col2})`);
                return true; // Blocked!
            }
        }

        return false; // Not blocked
    }

    /**
     * Find the best move to connect two fragments
     */
    findBestConnectionMove(fragment1, fragment2) {
        let bestMove = null;
        let minDistance = Infinity;
        
        // Try all possible connections between fragments
        for (const piece1 of fragment1.pieces) {
            for (const piece2 of fragment2.pieces) {
                // Check L-pattern connection
                if (this.isLPatternDistance(piece1, piece2)) {
                    const gaps = this.getLPatternGaps(piece1, piece2);
                    for (const gap of gaps) {
                        if (this.isValidConnectionMove(gap)) {
                            const distance = 2; // L-pattern distance
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestMove = {
                                    row: gap.row,
                                    col: gap.col,
                                    value: 12000, // High priority for fragment connection
                                    reason: `Connect fragments via L-pattern`,
                                    pattern: 'fragment-connection-L'
                                };
                            }
                        }
                    }
                }
                
                // Check I-pattern connection
                if (this.isIPatternDistance(piece1, piece2)) {
                    const gaps = this.getIPatternGaps(piece1, piece2);
                    for (const gap of gaps) {
                        if (this.isValidConnectionMove(gap)) {
                            const distance = 2;
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestMove = {
                                    row: gap.row,
                                    col: gap.col,
                                    value: 12000,
                                    reason: `Connect fragments via I-pattern`,
                                    pattern: 'fragment-connection-I'
                                };
                            }
                        }
                    }
                }
                
                // Check Diagonal pattern connection
                if (this.isDiagonalPatternDistance(piece1, piece2)) {
                    const gap = this.getDiagonalPatternGap(piece1, piece2);
                    if (gap && this.isValidConnectionMove(gap)) {
                        const distance = 2;
                        if (distance < minDistance) {
                            minDistance = distance;
                            bestMove = {
                                row: gap.row,
                                col: gap.col,
                                value: 12000,
                                reason: `Connect fragments via diagonal pattern`,
                                pattern: 'fragment-connection-D'
                            };
                        }
                    }
                }
            }
        }
        
        if (bestMove) {
            this.log(`🎯 Found fragment connection: ${bestMove.reason}`);
        }
        
        return bestMove;
    }

    // Pattern distance checking methods
    isLPatternDistance(pos1, pos2) {
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    }

    isIPatternDistance(pos1, pos2) {
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        return (dr === 2 && dc === 0) || (dr === 0 && dc === 2);
    }

    isDiagonalPatternDistance(pos1, pos2) {
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        return dr === 2 && dc === 2;
    }

    // Gap calculation methods (simplified versions)
    getLPatternGaps(pos1, pos2) {
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        const gaps = [];
        
        if (Math.abs(dr) === 2 && Math.abs(dc) === 1) {
            const midRow = pos1.row + (dr > 0 ? 1 : -1);
            gaps.push({ row: midRow, col: pos1.col });
            gaps.push({ row: midRow, col: pos2.col });
        } else if (Math.abs(dr) === 1 && Math.abs(dc) === 2) {
            const midCol = pos1.col + (dc > 0 ? 1 : -1);
            gaps.push({ row: pos1.row, col: midCol });
            gaps.push({ row: pos2.row, col: midCol });
        }
        
        return gaps;
    }

    getIPatternGaps(pos1, pos2) {
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        const gaps = [];
        
        if (Math.abs(dr) === 2 && dc === 0) {
            const midRow = pos1.row + (dr > 0 ? 1 : -1);
            gaps.push({ row: midRow, col: pos1.col - 1 });
            gaps.push({ row: midRow, col: pos1.col });
            gaps.push({ row: midRow, col: pos1.col + 1 });
        } else if (dr === 0 && Math.abs(dc) === 2) {
            const midCol = pos1.col + (dc > 0 ? 1 : -1);
            gaps.push({ row: pos1.row - 1, col: midCol });
            gaps.push({ row: pos1.row, col: midCol });
            gaps.push({ row: pos1.row + 1, col: midCol });
        }
        
        return gaps.filter(gap => 
            this.gameCore.isValidPosition(gap.row, gap.col)
        );
    }

    getDiagonalPatternGap(pos1, pos2) {
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        
        const gapRow = pos1.row + (dr > 0 ? 1 : -1);
        const gapCol = pos1.col + (dc > 0 ? 1 : -1);
        
        return { row: gapRow, col: gapCol };
    }

    isValidConnectionMove(gap) {
        return this.gameCore.isValidPosition(gap.row, gap.col) &&
               this.gameCore.board[gap.row][gap.col] === '' &&
               this.gameCore.isValidMove(gap.row, gap.col);
    }

    /**
     * Analyze fragments and determine if connection is needed
     */
    analyzeFragments() {
        const fragments = this.findChainFragments();
        
        if (fragments.length <= 1) {
            this.log('✅ Chain is connected (single fragment)');
            return {
                isConnected: true,
                fragments: fragments,
                connectionNeeded: false
            };
        }
        
        // Analyze which fragments are most important
        const analysis = {
            isConnected: false,
            fragments: fragments,
            connectionNeeded: true,
            borderConnectedFragments: [],
            floatingFragments: []
        };
        
        for (const fragment of fragments) {
            const isBorderConnected = (
                (this.player === 'X' && (fragment.connectedToTopBorder || fragment.connectedToBottomBorder)) ||
                (this.player === 'O' && (fragment.connectedToLeftBorder || fragment.connectedToRightBorder))
            );
            
            if (isBorderConnected) {
                analysis.borderConnectedFragments.push(fragment);
            } else {
                analysis.floatingFragments.push(fragment);
            }
        }
        
        this.log(`📊 Fragment analysis:`);
        this.log(`  - Total fragments: ${fragments.length}`);
        this.log(`  - Border-connected: ${analysis.borderConnectedFragments.length}`);
        this.log(`  - Floating: ${analysis.floatingFragments.length}`);
        
        return analysis;
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[FRAGMENT-ANALYZER] ${message}`);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ChainFragmentAnalyzer = ChainFragmentAnalyzer;
}

console.log('✅ Chain Fragment Analyzer loaded');