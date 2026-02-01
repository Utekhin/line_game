// fence-game-core.js - Core game logic for Fence game variant

class FenceGameCore {
    constructor(size = 15, initialPool = 50) {
        this.size = size;
        this.initialPool = initialPool;
        this.board = [];
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.moveCount = 0;
        this.moveHistory = [];

        // Fence-specific: piece pools
        this.poolX = initialPool;
        this.poolO = initialPool;

        // Fence-specific: captured pieces count
        this.capturedByX = 0;
        this.capturedByO = 0;

        this.initializeBoard();
    }

    initializeBoard() {
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(''));
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.moveCount = 0;
        this.moveHistory = [];
        this.poolX = this.initialPool;
        this.poolO = this.initialPool;
        this.capturedByX = 0;
        this.capturedByO = 0;
        console.log(`Fence board initialized: ${this.size}x${this.size}, pools: ${this.initialPool} each`);
    }

    resetGame(newSize = null, newPool = null) {
        if (newSize) this.size = newSize;
        if (newPool) this.initialPool = newPool;
        this.initializeBoard();
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    isValidMove(row, col) {
        if (!this.isValidPosition(row, col)) return false;
        if (this.board[row][col] !== '') return false;
        if (this.gameOver) return false;

        const pool = this.currentPlayer === 'X' ? this.poolX : this.poolO;
        if (pool <= 0) return false;

        return true;
    }

    makeMove(row, col, player = this.currentPlayer) {
        if (!this.isValidMove(row, col)) {
            return { success: false, reason: 'Invalid move' };
        }

        this.board[row][col] = player;
        this.moveCount++;

        if (player === 'X') {
            this.poolX--;
        } else {
            this.poolO--;
        }

        this.moveHistory.push({
            moveNumber: this.moveCount,
            row: row,
            col: col,
            player: player
        });

        const previousPlayer = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';

        return {
            success: true,
            player: previousPlayer,
            row: row,
            col: col,
            moveNumber: this.moveCount
        };
    }

    executeCapture(cellsToRemove, capturingPlayer) {
        let capturedX = 0;
        let capturedO = 0;
        const removedCells = [];

        for (const cellKey of cellsToRemove) {
            const [row, col] = cellKey.split('-').map(Number);
            const pieceOwner = this.board[row][col];

            if (pieceOwner) {
                this.board[row][col] = '';
                removedCells.push({ row, col, owner: pieceOwner });

                if (pieceOwner === 'X') {
                    capturedX++;
                } else {
                    capturedO++;
                }
            }
        }

        const totalCaptured = capturedX + capturedO;
        if (capturingPlayer === 'X') {
            this.capturedByX += totalCaptured;
            this.poolX += totalCaptured;
        } else {
            this.capturedByO += totalCaptured;
            this.poolO += totalCaptured;
        }

        return { capturedX, capturedO, totalCaptured, removedCells };
    }

    checkGameOver() {
        if (this.poolX <= 0 && this.currentPlayer === 'X') {
            this.gameOver = true;
            return true;
        }
        if (this.poolO <= 0 && this.currentPlayer === 'O') {
            this.gameOver = true;
            return true;
        }

        let emptyCount = 0;
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === '') emptyCount++;
            }
        }
        if (emptyCount === 0) {
            this.gameOver = true;
            return true;
        }

        return false;
    }

    getWinner() {
        if (!this.gameOver) return null;

        if (this.poolX <= 0 && this.currentPlayer === 'X') return 'O';
        if (this.poolO <= 0 && this.currentPlayer === 'O') return 'X';

        if (this.capturedByX > this.capturedByO) return 'X';
        if (this.capturedByO > this.capturedByX) return 'O';

        return 'draw';
    }

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

    getNeighbors(row, col) {
        const neighbors = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.isValidPosition(nr, nc)) {
                neighbors.push({ row: nr, col: nc });
            }
        }
        return neighbors;
    }

    isOnBorder(row, col) {
        return row === 0 || row === this.size - 1 ||
               col === 0 || col === this.size - 1;
    }

    getBorderInfo(row, col) {
        const borders = [];
        if (row === 0) borders.push('top');
        if (row === this.size - 1) borders.push('bottom');
        if (col === 0) borders.push('left');
        if (col === this.size - 1) borders.push('right');
        return borders;
    }

    getGameState() {
        return {
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            moveCount: this.moveCount,
            size: this.size,
            poolX: this.poolX,
            poolO: this.poolO,
            capturedByX: this.capturedByX,
            capturedByO: this.capturedByO,
            history: [...this.moveHistory]
        };
    }
}

if (typeof window !== 'undefined') {
    window.FenceGameCore = FenceGameCore;
}
