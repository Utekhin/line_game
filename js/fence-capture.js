// fence-capture.js - Capture Execution Module
// Handles piece removal and pool updates when a fence captures

class FenceCaptureHandler {
    constructor(gameCore) {
        this.gameCore = gameCore;
    }

    /**
     * Execute a capture: remove fence and enclosed pieces, update pools
     *
     * Rules:
     * 1. Fence pieces (capturing player's) → removed, returned to their pool
     * 2. Opponent pieces inside → removed, LOST forever (counted as captured)
     * 3. Own pieces inside (not fence) → removed, returned to their pool
     *
     * @param {Set} fenceCells - Set of "row-col" strings forming the fence
     * @param {Set} enclosedCells - Set of "row-col" strings for enclosed region
     * @param {string} capturingPlayer - 'X' or 'O' who made the fence
     * @returns {Object} Capture result with statistics
     */
    executeCapture(fenceCells, enclosedCells, capturingPlayer) {
        const opponent = capturingPlayer === 'X' ? 'O' : 'X';

        let fencePiecesReturned = 0;      // Own fence pieces returned to pool
        let opponentPiecesCaptured = 0;   // Opponent pieces LOST forever
        let ownPiecesInsideReturned = 0;  // Own pieces inside (not fence) returned to pool

        const cellsRemoved = new Set();

        // Process fence pieces - return to capturing player's pool
        for (const key of fenceCells) {
            const [row, col] = key.split('-').map(Number);
            const owner = this.gameCore.board[row][col];

            if (owner === capturingPlayer) {
                this.gameCore.board[row][col] = '';
                cellsRemoved.add(key);
                fencePiecesReturned++;
            }
        }

        // Process enclosed cells
        for (const key of enclosedCells) {
            const [row, col] = key.split('-').map(Number);
            const owner = this.gameCore.board[row][col];

            if (owner === opponent) {
                // Opponent pieces are CAPTURED (lost forever)
                this.gameCore.board[row][col] = '';
                cellsRemoved.add(key);
                opponentPiecesCaptured++;
            } else if (owner === capturingPlayer) {
                // Own pieces inside are returned to pool
                this.gameCore.board[row][col] = '';
                cellsRemoved.add(key);
                ownPiecesInsideReturned++;
            }
        }

        // Update pools
        // Fence pieces + own pieces inside → return to capturing player's pool
        const piecesReturnedToPool = fencePiecesReturned + ownPiecesInsideReturned;

        if (capturingPlayer === 'X') {
            this.gameCore.poolX += piecesReturnedToPool;
            this.gameCore.capturedByX += opponentPiecesCaptured;
        } else {
            this.gameCore.poolO += piecesReturnedToPool;
            this.gameCore.capturedByO += opponentPiecesCaptured;
        }

        // Opponent pieces are LOST - they don't go back to any pool
        // This is how you exhaust opponent's pool to win!

        const result = {
            capturingPlayer,
            fenceCells,
            enclosedCells,
            cellsRemoved,

            fencePiecesReturned,
            opponentPiecesCaptured,
            ownPiecesInsideReturned,

            totalRemoved: cellsRemoved.size,
            piecesReturnedToPool,

            poolXAfter: this.gameCore.poolX,
            poolOAfter: this.gameCore.poolO,
            capturedByXAfter: this.gameCore.capturedByX,
            capturedByOAfter: this.gameCore.capturedByO
        };

        console.log('Capture executed:', result);
        console.log(`${capturingPlayer} returned ${piecesReturnedToPool} pieces to pool, captured ${opponentPiecesCaptured} opponent pieces (lost forever)`);

        return result;
    }

    /**
     * Preview a capture without executing it
     */
    previewCapture(fenceCells, enclosedCells, capturingPlayer) {
        const opponent = capturingPlayer === 'X' ? 'O' : 'X';

        let fencePieces = 0;
        let opponentPieces = 0;
        let ownPiecesInside = 0;

        for (const key of fenceCells) {
            const [row, col] = key.split('-').map(Number);
            const owner = this.gameCore.board[row][col];
            if (owner === capturingPlayer) fencePieces++;
        }

        for (const key of enclosedCells) {
            const [row, col] = key.split('-').map(Number);
            const owner = this.gameCore.board[row][col];
            if (owner === opponent) opponentPieces++;
            else if (owner === capturingPlayer) ownPiecesInside++;
        }

        return {
            fencePiecesReturned: fencePieces,
            opponentPiecesCaptured: opponentPieces,
            ownPiecesInsideReturned: ownPiecesInside,
            totalPiecesReturnedToPool: fencePieces + ownPiecesInside
        };
    }
}

if (typeof window !== 'undefined') {
    window.FenceCaptureHandler = FenceCaptureHandler;
}
