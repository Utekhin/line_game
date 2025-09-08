// ai-vs-h-game-core.js - FRAGMENT-AWARE: Connection Game Core with Row-by-Row Win Detection
// UPDATED: Enhanced with new traversal-based win detection that works seamlessly with fragments

class ConnectionGameCore {
    constructor(size = 15) {
        this.size = size;
        this.board = [];
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.gameHistory = [];
        this.moveCount = 0;
        this.lastMove = null;
        
        // System integrations
        this.gapRegistry = null;
        this.diagonalLinesManager = null;
        
        // Fragment-aware settings
        this.fragmentAnalysisEnabled = true;
        this.winDetectionMethod = 'row-traversal'; // 'row-traversal' or 'legacy'
        
        this.initializeBoard();
        console.log(`🎮 Fragment-Aware Connection Game Core initialized (${size}x${size})`);
    }

    // ===== BOARD INITIALIZATION =====
    
    initializeBoard() {
        this.board = [];
        for (let row = 0; row < this.size; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.size; col++) {
                this.board[row][col] = '';
            }
        }
    }

    resetGame(newSize = null) {
        if (newSize && newSize !== this.size) {
            this.size = newSize;
        }
        
        this.initializeBoard();
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.gameHistory = [];
        this.moveCount = 0;
        this.lastMove = null;
        
        // Reset connected systems
        if (this.gapRegistry && typeof this.gapRegistry.reset === 'function') {
            this.gapRegistry.reset();
        }
        
        if (this.diagonalLinesManager && typeof this.diagonalLinesManager.clear === 'function') {
            this.diagonalLinesManager.clear();
        }
        
        console.log(`🔄 Game reset (${this.size}x${this.size}) - Fragment analysis: ${this.fragmentAnalysisEnabled ? 'ON' : 'OFF'}`);
    }

    // ===== SYSTEM INTEGRATION =====
    
    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        console.log('🔗 Gap registry connected to fragment-aware game core');
    }
    
    setDiagonalLinesManager(diagonalLinesManager) {
        this.diagonalLinesManager = diagonalLinesManager;
        console.log('🔗 Diagonal lines manager connected to fragment-aware game core');
    }

    // ===== MOVE HANDLING =====
    
    makeMove(row, col, player) {
        // Validation
        if (!this.isValidMove(row, col)) {
            return {
                success: false,
                reason: 'Invalid move position',
                row: row,
                col: col,
                player: player
            };
        }

        if (this.gameOver) {
            return {
                success: false,
                reason: 'Game is already over',
                row: row,
                col: col,
                player: player
            };
        }

        if (player !== this.currentPlayer) {
            return {
                success: false,
                reason: `Not ${player}'s turn (current: ${this.currentPlayer})`,
                row: row,
                col: col,
                player: player
            };
        }

        // Make the move
        this.board[row][col] = player;
        this.moveCount++;
        this.lastMove = { row, col, player, moveNumber: this.moveCount };

        // Record in history
        this.gameHistory.push({
            row: row,
            col: col,
            player: player,
            moveNumber: this.moveCount,
            timestamp: Date.now()
        });

        // Update gap registry if connected
        if (this.gapRegistry && typeof this.gapRegistry.updateGapStatus === 'function') {
            this.gapRegistry.updateGapStatus(row, col, player);
        }

        // Update diagonal lines if connected
        if (this.diagonalLinesManager && typeof this.diagonalLinesManager.updateDiagonalLines === 'function') {
            setTimeout(() => this.diagonalLinesManager.updateDiagonalLines(), 10);
        }

        // Check for win condition using the enhanced method
        const winResult = this.checkWin(player);
        let gameOver = false;
        let winner = null;

        if (winResult.isWin) {
            this.gameOver = true;
            gameOver = true;
            winner = player;
            console.log(`🎉 ${player} wins! ${winResult.reason}`);
        }

        // Switch players
        this.currentPlayer = player === 'X' ? 'O' : 'X';

        return {
            success: true,
            gameOver: gameOver,
            winner: winner,
            winResult: winResult,
            row: row,
            col: col,
            player: player,
            moveNumber: this.moveCount
        };
    }

    // ===== VALIDATION =====
    
    isValidPosition(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    isValidMove(row, col) {
        if (!this.isValidPosition(row, col)) {
            return false;
        }
        
        if (this.board[row][col] !== '') {
            return false;
        }
        
        return true;
    }

    // ===== ENHANCED WIN DETECTION - ROW-BY-ROW TRAVERSAL =====
    
    /**
     * MAIN WIN DETECTION METHOD - Enhanced for Fragment Awareness
     * Uses row-by-row traversal for cleaner, more intuitive win validation
     */
    checkWin(player) {
        const moveNumber = this.gameHistory.length;
        this.log(`🏆 Checking win for ${player} (move ${moveNumber}) - Enhanced Fragment-Aware Method...`);
        
        // SAFETY: Win check disabled until move 29
        if (moveNumber < 29) {
            this.log(`🚫 Win check disabled (move ${moveNumber} < 29)`);
            return { isWin: false, reason: 'Win check disabled (early game)' };
        }
        
        this.log(`✅ Win check enabled (move ${moveNumber} >= 29)`);
        
        // Get player pieces
        const playerPositions = this.getPlayerPositions(player);
        if (playerPositions.length === 0) {
            this.log(`❌ ${player} - No pieces on board`);
            return { isWin: false, reason: 'No pieces on board' };
        }
        
        // Enhanced approach: Row-by-row traversal validation with fragment awareness
        const traversalResult = this.checkWinByRowTraversal(player, playerPositions);
        
        if (traversalResult.isWin) {
            this.log(`🎉 ${player} - ROW TRAVERSAL WIN CONFIRMED!`);
            return {
                isWin: true,
                reason: `${player} completed connection via row traversal!`,
                method: 'enhanced-row-traversal',
                traversalData: traversalResult
            };
        } else {
            this.log(`❌ ${player} - Row traversal failed: ${traversalResult.reason}`);
            return {
                isWin: false,
                reason: traversalResult.reason,
                method: 'enhanced-row-traversal',
                traversalData: traversalResult
            };
        }
    }

    /**
     * ENHANCED: Row-by-Row Traversal Win Detection with Fragment Support
     * Validates winning connection by traversing from border to border, row by row
     */
    checkWinByRowTraversal(player, playerPositions) {
        this.log(`🎯 Starting enhanced row-by-row traversal validation for ${player}...`);
        
        // Step 1: Organize pieces by rows/columns for efficient lookup
        const piecesByPosition = this.organizePiecesByPosition(player, playerPositions);
        
        // Step 2: Find starting border pieces
        const startingBorderPieces = this.findBorderStartingPoints(player, playerPositions);
        
        if (startingBorderPieces.length === 0) {
            return {
                isWin: false,
                reason: `No pieces found at starting border (${player === 'X' ? 'row 0' : 'col 0'})`,
                startingBorderPieces: 0
            };
        }
        
        this.log(`🎯 Found ${startingBorderPieces.length} starting border pieces for ${player}`);
        
        // Step 3: Try to trace a complete path from each starting piece
        for (const startingPiece of startingBorderPieces) {
            this.log(`🔍 Testing path from border piece (${startingPiece.row},${startingPiece.col})...`);
            
            const pathResult = this.traceRowByRowPath(player, startingPiece, piecesByPosition);
            
            if (pathResult.isComplete) {
                this.log(`✅ Complete path found from (${startingPiece.row},${startingPiece.col})!`);
                
                // Step 4: Verify coverage (all rows/columns touched)
                const coverageResult = this.verifyCoverageFromPath(player, pathResult.fullPath);
                
                if (coverageResult.isComplete) {
                    this.log(`✅ Full coverage verified - ${player} WINS!`);
                    return {
                        isWin: true,
                        reason: 'Complete row-by-row connection with full coverage',
                        startingPiece: startingPiece,
                        winningPath: pathResult.fullPath,
                        pathLength: pathResult.fullPath.length,
                        coverage: coverageResult,
                        method: 'enhanced-row-traversal'
                    };
                } else {
                    this.log(`❌ Path complete but coverage incomplete: ${coverageResult.reason}`);
                }
            } else {
                this.log(`❌ Path incomplete from (${startingPiece.row},${startingPiece.col}): ${pathResult.reason}`);
            }
        }
        
        return {
            isWin: false,
            reason: 'No complete row-by-row path found from any starting border piece',
            startingBorderPieces: startingBorderPieces.length,
            method: 'enhanced-row-traversal'
        };
    }

    /**
     * Organize pieces by position for efficient lookup during traversal
     */
    organizePiecesByPosition(player, playerPositions) {
        const byRow = {}; // byRow[row] = array of pieces in that row
        const byCol = {}; // byCol[col] = array of pieces in that column  
        const positionSet = new Set(); // Set of "row-col" strings for fast lookup
        
        playerPositions.forEach(piece => {
            // Organize by row
            if (!byRow[piece.row]) byRow[piece.row] = [];
            byRow[piece.row].push(piece);
            
            // Organize by column  
            if (!byCol[piece.col]) byCol[piece.col] = [];
            byCol[piece.col].push(piece);
            
            // Position set for fast lookup
            positionSet.add(`${piece.row}-${piece.col}`);
        });
        
        // Sort pieces in each row/column by position
        Object.values(byRow).forEach(pieces => {
            pieces.sort((a, b) => a.col - b.col);
        });
        Object.values(byCol).forEach(pieces => {
            pieces.sort((a, b) => a.row - b.row);
        });
        
        this.log(`📊 Organized ${playerPositions.length} pieces: ${Object.keys(byRow).length} rows, ${Object.keys(byCol).length} columns`);
        
        return {
            byRow: byRow,
            byCol: byCol,
            positionSet: positionSet,
            totalPieces: playerPositions.length
        };
    }

    /**
     * Find all pieces on the starting border for the player
     */
    findBorderStartingPoints(player, playerPositions) {
        if (player === 'X') {
            // X starts from top border (row 0)
            const topBorderPieces = playerPositions.filter(p => p.row === 0);
            this.log(`🎯 X starting points: ${topBorderPieces.length} pieces on row 0`);
            return topBorderPieces;
        } else {
            // O starts from left border (col 0)  
            const leftBorderPieces = playerPositions.filter(p => p.col === 0);
            this.log(`🎯 O starting points: ${leftBorderPieces.length} pieces on col 0`);
            return leftBorderPieces;
        }
    }

    /**
     * CORE METHOD: Trace a row-by-row path from starting piece to target border
     */
    traceRowByRowPath(player, startingPiece, piecesByPosition) {
        this.log(`🔍 Tracing enhanced row-by-row path for ${player} from (${startingPiece.row},${startingPiece.col})...`);
        
        const fullPath = [startingPiece];
        let currentRow = startingPiece.row;
        let currentCol = startingPiece.col;
        let currentRowPieces = [startingPiece]; // Pieces we can continue from in current row
        
        // Determine traversal direction and target
        let targetBorder, rowIncrement, maxIterations;
        
        if (player === 'X') {
            // X: traverse from row 0 to row 14 (top to bottom)
            targetBorder = this.size - 1; // row 14
            rowIncrement = 1;
            maxIterations = this.size; // max 15 iterations
            this.log(`🎯 X traversal: row 0 → row ${targetBorder}`);
        } else {
            // O: traverse from col 0 to col 14 (left to right)
            targetBorder = this.size - 1; // col 14  
            rowIncrement = 1; // actually col increment for O
            maxIterations = this.size; // max 15 iterations
            this.log(`🎯 O traversal: col 0 → col ${targetBorder}`);
        }
        
        // Row-by-row traversal loop
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Calculate next position based on player direction
            let nextPosition;
            if (player === 'X') {
                nextPosition = currentRow + rowIncrement; // next row
                if (nextPosition > targetBorder) break; // reached target
            } else {
                nextPosition = currentCol + rowIncrement; // next column  
                if (nextPosition > targetBorder) break; // reached target
            }
            
            this.log(`🔄 Iteration ${iteration + 1}: Looking for connections to ${player === 'X' ? 'row' : 'col'} ${nextPosition}`);
            
            // Find all possible connections from current row pieces to next row/col
            const nextRowPieces = this.findConnectedPiecesInNextPosition(
                player, 
                currentRowPieces, 
                nextPosition, 
                piecesByPosition
            );
            
            if (nextRowPieces.length === 0) {
                this.log(`❌ No connections found to ${player === 'X' ? 'row' : 'col'} ${nextPosition}`);
                return {
                    isComplete: false,
                    reason: `Path broken at ${player === 'X' ? 'row' : 'col'} ${nextPosition} - no valid connections`,
                    fullPath: fullPath,
                    stoppedAt: nextPosition
                };
            }
            
            this.log(`✅ Found ${nextRowPieces.length} connected pieces in ${player === 'X' ? 'row' : 'col'} ${nextPosition}`);
            
            // Add new pieces to path and update current position
            fullPath.push(...nextRowPieces);
            currentRowPieces = nextRowPieces;
            
            if (player === 'X') {
                currentRow = nextPosition;
            } else {
                currentCol = nextPosition;
            }
            
            // Check if we've reached the target border
            const hasReachedTarget = (player === 'X') ? 
                (nextPosition === targetBorder) : 
                (nextPosition === targetBorder);
                
            if (hasReachedTarget) {
                this.log(`🎉 Reached target border ${player === 'X' ? 'row' : 'col'} ${targetBorder}!`);
                break;
            }
        }
        
        // Verify we actually reached the target
        const finalPosition = (player === 'X') ? currentRow : currentCol;
        const reachedTarget = (finalPosition === targetBorder);
        
        if (reachedTarget) {
            this.log(`✅ Complete path traced: ${fullPath.length} pieces from border to border`);
            return {
                isComplete: true,
                reason: `Complete ${player === 'X' ? 'vertical' : 'horizontal'} path found`,
                fullPath: fullPath,
                pathLength: fullPath.length,
                finalPosition: finalPosition
            };
        } else {
            this.log(`❌ Path incomplete: stopped at ${player === 'X' ? 'row' : 'col'} ${finalPosition}, target was ${targetBorder}`);
            return {
                isComplete: false,
                reason: `Path incomplete: reached ${player === 'X' ? 'row' : 'col'} ${finalPosition}, needed ${targetBorder}`,
                fullPath: fullPath,
                stoppedAt: finalPosition
            };
        }
    }

    /**
     * Find all pieces in next row/column that connect to any piece in current row/column
     */
    findConnectedPiecesInNextPosition(player, currentPieces, nextPosition, piecesByPosition) {
        const connectedPieces = [];
        
        // Get all pieces at the next position (row or column depending on player)
        let candidatePieces;
        if (player === 'X') {
            // For X, nextPosition is a row number
            candidatePieces = piecesByPosition.byRow[nextPosition] || [];
        } else {
            // For O, nextPosition is a column number
            candidatePieces = piecesByPosition.byCol[nextPosition] || [];
        }
        
        this.log(`🔍 Checking connections between ${currentPieces.length} current pieces and ${candidatePieces.length} candidate pieces`);
        
        // Check each candidate piece for connections to any current piece
        for (const candidatePiece of candidatePieces) {
            let isConnected = false;
            
            for (const currentPiece of currentPieces) {
                if (this.arePiecesAdjacent(currentPiece, candidatePiece)) {
                    // Found a connection - validate it's not blocked by opponent
                    const connectionValid = this.validateConnection(currentPiece, candidatePiece, player);
                    
                    if (connectionValid.isValid) {
                        isConnected = true;
                        this.log(`✅ Valid connection: (${currentPiece.row},${currentPiece.col}) ↔ (${candidatePiece.row},${candidatePiece.col}) [${connectionValid.type}]`);
                        break; // Found at least one valid connection
                    } else {
                        this.log(`🚫 Connection blocked: (${currentPiece.row},${currentPiece.col}) ↔ (${candidatePiece.row},${candidatePiece.col}) - ${connectionValid.reason}`);
                    }
                }
            }
            
            if (isConnected) {
                connectedPieces.push(candidatePiece);
            }
        }
        
        this.log(`🔗 Found ${connectedPieces.length} valid connections to ${player === 'X' ? 'row' : 'col'} ${nextPosition}`);
        return connectedPieces;
    }

    /**
     * Check if two pieces are adjacent (lateral or diagonal)
     */
    arePiecesAdjacent(piece1, piece2) {
        const dr = Math.abs(piece2.row - piece1.row);
        const dc = Math.abs(piece2.col - piece1.col);
        
        // Adjacent if distance is 1 in both directions and at least one direction has distance 1
        return (dr <= 1 && dc <= 1 && (dr > 0 || dc > 0));
    }

    /**
     * ENHANCED: Validate that a connection between two pieces is not blocked by opponent
     */
    validateConnection(piece1, piece2, player) {
        const dr = Math.abs(piece2.row - piece1.row);
        const dc = Math.abs(piece2.col - piece1.col);
        
        // Lateral connections (horizontal/vertical) are never blocked
        if (dr === 0 || dc === 0) {
            return {
                isValid: true,
                type: 'lateral',
                reason: 'Lateral connections cannot be blocked'
            };
        }
        
        // Diagonal connections need to be checked for opponent blocking
        if (dr === 1 && dc === 1) {
            // Get opponent diagonal blocking lines
            const opponent = player === 'X' ? 'O' : 'X';
            const blockingLines = this.getOpponentDiagonalBlocks(opponent);
            
            // Check if this diagonal is blocked
            const isBlocked = this.isConnectionBlocked(piece1, piece2, blockingLines);
            
            if (isBlocked) {
                return {
                    isValid: false,
                    type: 'diagonal-blocked',
                    reason: 'Diagonal connection blocked by opponent'
                };
            } else {
                return {
                    isValid: true,
                    type: 'diagonal',
                    reason: 'Diagonal connection clear'
                };
            }
        }
        
        // Should not reach here for adjacent pieces
        return {
            isValid: false,
            type: 'invalid',
            reason: `Invalid adjacency: dr=${dr}, dc=${dc}`
        };
    }

    /**
     * Verify that the traced path provides complete coverage
     */
    verifyCoverageFromPath(player, pathPieces) {
        if (player === 'X') {
            // X needs coverage of all rows (0 to size-1)
            const coveredRows = new Set(pathPieces.map(p => p.row));
            const requiredRows = this.size;
            
            this.log(`📊 X path coverage: ${coveredRows.size}/${requiredRows} rows`);
            
            if (coveredRows.size === requiredRows) {
                return {
                    isComplete: true,
                    coveredRows: Array.from(coveredRows).sort((a,b) => a-b)
                };
            } else {
                const missingRows = [];
                for (let row = 0; row < this.size; row++) {
                    if (!coveredRows.has(row)) {
                        missingRows.push(row);
                    }
                }
                return {
                    isComplete: false,
                    reason: `Missing rows: [${missingRows.join(', ')}]`,
                    missingRows: missingRows
                };
            }
        } else {
            // O needs coverage of all columns (0 to size-1)
            const coveredCols = new Set(pathPieces.map(p => p.col));
            const requiredCols = this.size;
            
            this.log(`📊 O path coverage: ${coveredCols.size}/${requiredCols} columns`);
            
            if (coveredCols.size === requiredCols) {
                return {
                    isComplete: true,
                    coveredCols: Array.from(coveredCols).sort((a,b) => a-b)
                };
            } else {
                const missingCols = [];
                for (let col = 0; col < this.size; col++) {
                    if (!coveredCols.has(col)) {
                        missingCols.push(col);
                    }
                }
                return {
                    isComplete: false,
                    reason: `Missing columns: [${missingCols.join(', ')}]`,
                    missingCols: missingCols
                };
            }
        }
    }

    // ===== DIAGONAL BLOCKING LOGIC (REUSED FROM EXISTING CODE) =====
    
    /**
     * Get opponent diagonal lines that could block connections
     */
    getOpponentDiagonalBlocks(opponentPlayer) {
        const blockingLines = [];
        
        // Check if diagonal lines manager is available
        if (!this.diagonalLinesManager) {
            this.log(`⚠️ Diagonal lines manager not available - no blocking detection possible`);
            return blockingLines;
        }
        
        try {
            // Get opponent's diagonal connections
            const opponentConnections = this.diagonalLinesManager.getPlayerConnections(opponentPlayer);
            
            this.log(`🔍 Checking ${opponentConnections.length} ${opponentPlayer} diagonal connections for blocking...`);
            
            for (const connection of opponentConnections) {
                blockingLines.push({
                    player: opponentPlayer,
                    row1: connection.row1,
                    col1: connection.col1,
                    row2: connection.row2,
                    col2: connection.col2,
                    establishedAt: connection.establishedAtMove || 0,
                    type: connection.type
                });
                
                this.log(`   🔍 ${opponentPlayer} diagonal: (${connection.row1},${connection.col1})-(${connection.row2},${connection.col2}) [move ${connection.establishedAtMove}]`);
            }
            
        } catch (error) {
            this.log(`⚠️ Error getting opponent diagonal connections: ${error.message}`);
        }
        
        return blockingLines;
    }

    /**
     * Check if a connection between two pieces is blocked by opponent diagonal
     */
    isConnectionBlocked(piece1, piece2, blockingLines) {
        // Skip blocking check for lateral connections
        const dr = Math.abs(piece2.row - piece1.row);
        const dc = Math.abs(piece2.col - piece1.col);
        
        // Only diagonal connections (dr=1, dc=1) can be blocked by opponent diagonals
        if (!(dr === 1 && dc === 1)) {
            return false; // Lateral connections are never blocked
        }
        
        this.log(`🔍 Checking diagonal connection (${piece1.row},${piece1.col}) → (${piece2.row},${piece2.col})`);
        
        // For each blocking line, check if it intersects with our diagonal connection
        for (const blockingLine of blockingLines) {
            if (this.doConnectionsIntersect(piece1, piece2, blockingLine)) {
                this.log(`🚫 Diagonal connection blocked by ${blockingLine.player} line (${blockingLine.row1},${blockingLine.col1})-(${blockingLine.row2},${blockingLine.col2})`);
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if two line segments intersect
     */
    doConnectionsIntersect(conn1Start, conn1End, blockingLine) {
        // Line 1: our connection
        const x1 = conn1Start.col, y1 = conn1Start.row;
        const x2 = conn1End.col, y2 = conn1End.row;
        
        // Line 2: opponent's blocking diagonal
        const x3 = blockingLine.col1, y3 = blockingLine.row1;
        const x4 = blockingLine.col2, y4 = blockingLine.row2;
        
        // Check if lines share an endpoint (allowed - pieces can be adjacent)
        if ((x1 === x3 && y1 === y3) || (x1 === x4 && y1 === y4) ||
            (x2 === x3 && y2 === y3) || (x2 === x4 && y2 === y4)) {
            return false; // Sharing endpoint is allowed
        }
        
        // Use parametric line intersection test
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        
        // Lines are parallel
        if (Math.abs(denom) < 0.0001) {
            return false;
        }
        
        // Calculate intersection parameters
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        // Check if intersection point is within both line segments
        const intersects = (t > 0.01 && t < 0.99) && (u > 0.01 && u < 0.99);
        
        if (intersects) {
            const intersectX = x1 + t * (x2 - x1);
            const intersectY = y1 + t * (y2 - y1);
            this.log(`⚡ INTERSECTION: Lines cross at (${intersectX.toFixed(1)}, ${intersectY.toFixed(1)})`);
        }
        
        return intersects;
    }

    // ===== FRAGMENT-AWARE TESTING METHODS =====
    
    /**
     * NEW: Test if a fragment (subset of pieces) could be a winning candidate
     * This is useful for the fragment-aware system to evaluate fragment potential
     */
    testFragmentAsWinningCandidate(player, fragmentPieces) {
        this.log(`🧪 Testing fragment as winning candidate for ${player}: ${fragmentPieces.length} pieces`);
        
        // Must have pieces at both borders to be a candidate
        const borderTest = this.testFragmentBorderConnectivity(player, fragmentPieces);
        if (!borderTest.hasBothBorders) {
            this.log(`❌ Fragment fails border test: ${borderTest.reason}`);
            return {
                isCandidate: false,
                reason: borderTest.reason,
                fragmentSize: fragmentPieces.length
            };
        }
        
        // Test if fragment could form a winning path
        const pathTest = this.checkWinByRowTraversal(player, fragmentPieces);
        
        return {
            isCandidate: pathTest.isWin,
            reason: pathTest.reason,
            fragmentSize: fragmentPieces.length,
            borderTest: borderTest,
            pathTest: pathTest
        };
    }

    /**
     * NEW: Test if fragment has connectivity to both required borders
     */
    testFragmentBorderConnectivity(player, fragmentPieces) {
        if (player === 'X') {
            const topBorderPieces = fragmentPieces.filter(p => p.row === 0);
            const bottomBorderPieces = fragmentPieces.filter(p => p.row === this.size - 1);
            
            const hasBoth = topBorderPieces.length > 0 && bottomBorderPieces.length > 0;
            
            return {
                hasBothBorders: hasBoth,
                startBorderPieces: topBorderPieces.length,
                endBorderPieces: bottomBorderPieces.length,
                reason: hasBoth ? 'Fragment connects both borders' : 
                       (topBorderPieces.length === 0 ? 'No top border connection' : 'No bottom border connection')
            };
        } else {
            const leftBorderPieces = fragmentPieces.filter(p => p.col === 0);
            const rightBorderPieces = fragmentPieces.filter(p => p.col === this.size - 1);
            
            const hasBoth = leftBorderPieces.length > 0 && rightBorderPieces.length > 0;
            
            return {
                hasBothBorders: hasBoth,
                startBorderPieces: leftBorderPieces.length,
                endBorderPieces: rightBorderPieces.length,
                reason: hasBoth ? 'Fragment connects both borders' : 
                       (leftBorderPieces.length === 0 ? 'No left border connection' : 'No right border connection')
            };
        }
    }

    // ===== UTILITY METHODS =====
    
    getPlayerPositions(player) {
        const positions = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === player) {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }

    getLastOpponentMove(currentPlayer) {
        const opponent = currentPlayer === 'X' ? 'O' : 'X';
        
        // Find the most recent move by the opponent
        for (let i = this.gameHistory.length - 1; i >= 0; i--) {
            const move = this.gameHistory[i];
            if (move.player === opponent) {
                return move;
            }
        }
        
        return null;
    }

    getTotalMoves() {
        return this.moveCount;
    }

    getCurrentPlayer() {
        return this.currentPlayer;
    }

    isGameOver() {
        return this.gameOver;
    }

    getBoard() {
        return this.board.map(row => [...row]); // Return a copy
    }

    getBoardSize() {
        return this.size;
    }

    // ===== ENHANCED DEBUG AND ANALYSIS =====
    
    /**
     * ENHANCED: Analyze board with fragment awareness
     */
    analyzeBoard() {
        console.log('\n🔍 === FRAGMENT-AWARE BOARD ANALYSIS ===');
        console.log(`Board size: ${this.size}x${this.size}`);
        console.log(`Move count: ${this.moveCount}`);
        console.log(`Current player: ${this.currentPlayer}`);
        console.log(`Game over: ${this.gameOver}`);
        console.log(`Fragment analysis: ${this.fragmentAnalysisEnabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`Win detection method: ${this.winDetectionMethod}`);
        
        const xPositions = this.getPlayerPositions('X');
        const oPositions = this.getPlayerPositions('O');
        
        console.log(`X pieces: ${xPositions.length}`);
        console.log(`O pieces: ${oPositions.length}`);
        
        if (this.lastMove) {
            console.log(`Last move: ${this.lastMove.player} at (${this.lastMove.row},${this.lastMove.col})`);
        }
        
        // Fragment analysis if enabled
        if (this.fragmentAnalysisEnabled && xPositions.length > 0) {
            const xFragmentTest = this.testFragmentAsWinningCandidate('X', xPositions);
            console.log(`X winning candidate: ${xFragmentTest.isCandidate} - ${xFragmentTest.reason}`);
        }
        
        if (this.fragmentAnalysisEnabled && oPositions.length > 0) {
            const oFragmentTest = this.testFragmentAsWinningCandidate('O', oPositions);
            console.log(`O winning candidate: ${oFragmentTest.isCandidate} - ${oFragmentTest.reason}`);
        }
        
        console.log('🔍 === END FRAGMENT-AWARE ANALYSIS ===\n');
    }

    /**
     * ENHANCED: Debug win condition with fragment awareness
     */
    debugWinCondition(player) {
        console.log(`\n🏆 === FRAGMENT-AWARE WIN CONDITION DEBUG FOR ${player} ===`);
        
        const positions = this.getPlayerPositions(player);
        console.log(`Player positions (${positions.length}):`, positions);
        
        // Test fragment as winning candidate
        const fragmentTest = this.testFragmentAsWinningCandidate(player, positions);
        console.log('Fragment candidate test:', fragmentTest);
        
        // Test full win condition
        const winResult = this.checkWin(player);
        console.log('Final win result:', winResult);
        
        console.log('🏆 === END FRAGMENT-AWARE WIN DEBUG ===\n');
        
        return winResult;
    }

    /**
     * NEW: Debug specific path for troubleshooting
     */
    debugRowTraversalPath(player, pathResult) {
        this.log(`\n🔍 === ROW TRAVERSAL PATH DEBUG FOR ${player} ===`);
        
        if (!pathResult || !pathResult.fullPath || pathResult.fullPath.length === 0) {
            this.log(`❌ No path to debug`);
            return;
        }
        
        const path = pathResult.fullPath;
        this.log(`📊 Path length: ${path.length} pieces`);
        this.log(`🎯 Path completion: ${pathResult.isComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
        
        if (player === 'X') {
            // Show path by rows
            const pathByRows = {};
            path.forEach(piece => {
                if (!pathByRows[piece.row]) pathByRows[piece.row] = [];
                pathByRows[piece.row].push(`(${piece.row},${piece.col})`);
            });
            
            this.log(`📍 X Path by rows:`);
            for (let row = 0; row < this.size; row++) {
                if (pathByRows[row]) {
                    this.log(`   Row ${row}: ${pathByRows[row].join(', ')}`);
                }
            }
            
            const coveredRows = Object.keys(pathByRows).map(Number).sort((a,b) => a-b);
            this.log(`📊 Covered rows: [${coveredRows.join(', ')}] (${coveredRows.length}/${this.size})`);
        } else {
            // Show path by columns  
            const pathByCols = {};
            path.forEach(piece => {
                if (!pathByCols[piece.col]) pathByCols[piece.col] = [];
                pathByCols[piece.col].push(`(${piece.row},${piece.col})`);
            });
            
            this.log(`📍 O Path by columns:`);
            for (let col = 0; col < this.size; col++) {
                if (pathByCols[col]) {
                    this.log(`   Col ${col}: ${pathByCols[col].join(', ')}`);
                }
            }
            
            const coveredCols = Object.keys(pathByCols).map(Number).sort((a,b) => a-b);
            this.log(`📊 Covered columns: [${coveredCols.join(', ')}] (${coveredCols.length}/${this.size})`);
        }
        
        this.log(`🔍 === END ROW TRAVERSAL DEBUG ===\n`);
    }

    log(message) {
        console.log(`[FRAGMENT-AWARE-CORE] ${message}`);
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ConnectionGameCore = ConnectionGameCore;
}

console.log('✅ Fragment-Aware Connection Game Core with Enhanced Row-by-Row Win Detection loaded');
console.log('🔗 Features: Row traversal validation, fragment candidate testing, diagonal blocking integration');
console.log('🧪 Fragment testing: testFragmentAsWinningCandidate() method available for AI fragment analysis');