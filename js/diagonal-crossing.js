// diagonal-crossing.js - Shared diagonal crossing validation ("First Lock Wins" rule)
// Used by Span (game-core.js), Fence (fence-detector.js, fence-game-core.js),
// and the diagonal rendering layer (game-diagonal-lines.js).

class DiagonalCrossingValidator {
    /**
     * @param {Object} gameCore - Any game core with .board, .size, and move history
     *   For Span: ConnectionGameCore (.gameHistory)
     *   For Fence: FenceGameCore (.moveHistory)
     */
    constructor(gameCore) {
        this.gameCore = gameCore;
    }

    // ========================= PUBLIC API =========================

    /**
     * Check if two diagonally adjacent cells are connected (not blocked by
     * an earlier crossing opponent diagonal).
     * Returns true if the diagonal is valid, false if blocked.
     */
    areDiagonallyConnected(row1, col1, row2, col2, player) {
        const board = this.gameCore.board;
        const size = this.gameCore.size;

        // Must be exactly 1 step diagonally
        if (Math.abs(row1 - row2) !== 1 || Math.abs(col1 - col2) !== 1) return false;

        // Both cells must belong to the same player
        if (!this._isValidPos(row1, col1, size) || !this._isValidPos(row2, col2, size)) return false;
        if (board[row1][col1] !== player || board[row2][col2] !== player) return false;

        // Find the crossing diagonal endpoints
        const crossRow1 = row1, crossCol1 = col2;
        const crossRow2 = row2, crossCol2 = col1;

        const opponent = player === 'X' ? 'O' : 'X';

        // If the crossing pair doesn't both belong to the opponent, no conflict
        if (board[crossRow1][crossCol1] !== opponent || board[crossRow2][crossCol2] !== opponent) {
            return true; // No crossing opponent diagonal exists
        }

        // Both crossing cells belong to opponent - compare establishment times
        const history = this._getMoveHistory();

        const currentEstablished = Math.max(
            this._getMoveNumber(row1, col1, history),
            this._getMoveNumber(row2, col2, history)
        );
        const crossingEstablished = Math.max(
            this._getMoveNumber(crossRow1, crossCol1, history),
            this._getMoveNumber(crossRow2, crossCol2, history)
        );

        // First established wins. If equal (shouldn't happen), current is allowed.
        return currentEstablished <= crossingEstablished;
    }

    /**
     * Check if two cells are connected (orthogonal or diagonal).
     * Orthogonal neighbors are always connected.
     * Diagonal neighbors must pass the crossing check.
     */
    areConnected(row1, col1, row2, col2, player) {
        const dr = Math.abs(row1 - row2);
        const dc = Math.abs(col1 - col2);

        // Not adjacent at all
        if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return false;

        // Orthogonal (horizontal or vertical) - always valid
        if (dr === 0 || dc === 0) return true;

        // Diagonal - check crossing rule
        return this.areDiagonallyConnected(row1, col1, row2, col2, player);
    }

    /**
     * Build the complete list of valid diagonal connections from move history.
     * Processes moves in chronological order, applying "first lock wins".
     * Returns: array of {row1, col1, row2, col2, player, establishedAtMove}
     */
    buildValidConnections() {
        const board = this.gameCore.board;
        const size = this.gameCore.size;
        const history = this._getMoveHistory();
        const validConnections = [];
        const blockedCrossings = new Set(); // Set of crossing-point keys that are locked

        for (const move of history) {
            if (move.row === undefined || move.row < 0) continue; // skip surrenders etc.
            const { row, col, player } = move;
            const moveNumber = move.moveNumber;

            const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dr, dc] of diagonals) {
                const adjRow = row + dr;
                const adjCol = col + dc;

                if (!this._isValidPos(adjRow, adjCol, size)) continue;
                if (board[adjRow][adjCol] !== player) continue;

                // Check the adjacent piece was placed before or at this move
                const adjMoveNum = this._getMoveNumber(adjRow, adjCol, history);
                if (adjMoveNum > moveNumber) continue; // Adjacent piece placed later; will be picked up when processing that move

                const establishedAt = Math.max(moveNumber, adjMoveNum);

                // Avoid duplicate connections (normalize order)
                const connKey = this._connectionKey(row, col, adjRow, adjCol);
                if (validConnections.some(c => this._connectionKey(c.row1, c.col1, c.row2, c.col2) === connKey)) {
                    continue;
                }

                // Crossing point key: top-left corner of the 2x2 square
                const crossingKey = `${Math.min(row, adjRow)}-${Math.min(col, adjCol)}`;

                // Check if the crossing point is already locked by an opponent diagonal
                if (blockedCrossings.has(crossingKey)) {
                    // There's already a diagonal through this crossing point.
                    // Check if it belongs to the opponent.
                    const existingConn = validConnections.find(c => {
                        const ck = `${Math.min(c.row1, c.row2)}-${Math.min(c.col1, c.col2)}`;
                        return ck === crossingKey;
                    });
                    if (existingConn && existingConn.player !== player) {
                        // Opponent's diagonal was established first - blocked
                        continue;
                    }
                }

                // This diagonal is valid - add it
                validConnections.push({
                    row1: Math.min(row, adjRow) === row ? row : adjRow,
                    col1: Math.min(row, adjRow) === row ? col : adjCol,
                    row2: Math.max(row, adjRow) === row ? row : adjRow,
                    col2: Math.max(row, adjRow) === row ? col : adjCol,
                    player: player,
                    establishedAtMove: establishedAt
                });

                // Lock this crossing point
                blockedCrossings.add(crossingKey);
            }
        }

        return validConnections;
    }

    /**
     * Get valid neighbors of a cell for a given player.
     * Returns only neighbors that are actually connected (respecting crossing rule).
     */
    getValidNeighbors(row, col, player) {
        const board = this.gameCore.board;
        const size = this.gameCore.size;
        const neighbors = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (!this._isValidPos(nr, nc, size)) continue;
            if (board[nr][nc] !== player) continue;

            if (this.areConnected(row, col, nr, nc, player)) {
                neighbors.push({ row: nr, col: nc });
            }
        }

        return neighbors;
    }

    // ========================= INTERNAL HELPERS =========================

    _isValidPos(row, col, size) {
        return row >= 0 && row < size && col >= 0 && col < size;
    }

    _getMoveHistory() {
        // Support both Span (gameHistory) and Fence (moveHistory) naming
        return this.gameCore.gameHistory || this.gameCore.moveHistory || [];
    }

    _getMoveNumber(row, col, history) {
        for (const move of history) {
            if (move.row === row && move.col === col) {
                return move.moveNumber || 1;
            }
        }
        // Fallback: piece exists on board but not in history (shouldn't normally happen)
        return 999;
    }

    _connectionKey(row1, col1, row2, col2) {
        if (row1 < row2 || (row1 === row2 && col1 < col2)) {
            return `${row1}-${col1}-${row2}-${col2}`;
        }
        return `${row2}-${col2}-${row1}-${col1}`;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.DiagonalCrossingValidator = DiagonalCrossingValidator;
}
