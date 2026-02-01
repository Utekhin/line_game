// fence-visualizer.js - Visual Feedback Module
// Handles fence highlighting, enclosed region shading, and capture animations

class FenceVisualizer {
    constructor(gameController) {
        this.gameController = gameController;
    }

    /**
     * Show capture visualization: highlight fence, shade enclosed, animate removal
     * @param {Set} fenceCells - Set of "row-col" strings forming the fence
     * @param {Set} enclosedCells - Set of "row-col" strings for enclosed region
     * @param {Object} captureResult - Result from capture handler
     */
    showCapture(fenceCells, enclosedCells, captureResult) {
        // Phase 1: Highlight fence cells
        this.highlightFence(fenceCells);

        // Phase 2: Shade enclosed region (after short delay)
        setTimeout(() => {
            this.highlightEnclosed(enclosedCells);
        }, 200);

        // Phase 3: Show notification
        setTimeout(() => {
            this.showCaptureNotification(captureResult);
        }, 300);

        // Phase 4: Animate capture (removal)
        setTimeout(() => {
            this.animateCapture(captureResult.cellsRemoved);
        }, 500);
    }

    /**
     * Highlight fence cells with glow effect
     * @param {Set} fenceCells - Set of "row-col" strings
     */
    highlightFence(fenceCells) {
        for (const key of fenceCells) {
            const [row, col] = key.split('-').map(Number);
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('fence-highlight');
            }
        }

        // Remove highlight after animation
        setTimeout(() => {
            for (const key of fenceCells) {
                const [row, col] = key.split('-').map(Number);
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.classList.remove('fence-highlight');
                }
            }
        }, 1500);
    }

    /**
     * Shade enclosed region
     * @param {Set} enclosedCells - Set of "row-col" strings
     */
    highlightEnclosed(enclosedCells) {
        for (const key of enclosedCells) {
            const [row, col] = key.split('-').map(Number);
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('enclosed');
            }
        }

        // Remove shading after animation
        setTimeout(() => {
            for (const key of enclosedCells) {
                const [row, col] = key.split('-').map(Number);
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.classList.remove('enclosed');
                }
            }
        }, 600);
    }

    /**
     * Animate piece removal
     * @param {Set} cellsToRemove - Set of "row-col" strings
     */
    animateCapture(cellsToRemove) {
        for (const key of cellsToRemove) {
            const [row, col] = key.split('-').map(Number);
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell && cell.textContent) {
                cell.classList.add('captured');
            }
        }
    }

    /**
     * Show capture notification banner
     * @param {Object} captureResult - Result from capture handler
     */
    showCaptureNotification(captureResult) {
        const notification = document.getElementById('captureNotification');
        if (!notification) return;

        const player = captureResult.capturingPlayer;
        const captured = captureResult.opponentPiecesCaptured;
        const returned = captureResult.piecesReturnedToPool;

        let msg = `${player} completes a fence!`;
        if (captured > 0) {
            msg += ` ${captured} opponent piece${captured !== 1 ? 's' : ''} captured!`;
        }
        if (returned > 0) {
            msg += ` ${returned} piece${returned !== 1 ? 's' : ''} returned to pool.`;
        }

        notification.textContent = msg;
        notification.classList.add('active');

        // Hide after delay
        setTimeout(() => {
            notification.classList.remove('active');
        }, 2500);
    }

    /**
     * Clear all visual effects
     */
    clearEffects() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('fence-highlight', 'enclosed', 'captured');
        });

        const notification = document.getElementById('captureNotification');
        if (notification) {
            notification.classList.remove('active');
        }
    }

    /**
     * Highlight potential fence (for preview/hints)
     * @param {Set} potentialFence - Set of "row-col" strings
     * @param {string} color - CSS color for highlight
     */
    showPotentialFence(potentialFence, color = 'rgba(255, 255, 0, 0.3)') {
        for (const key of potentialFence) {
            const [row, col] = key.split('-').map(Number);
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.style.boxShadow = `inset 0 0 0 2px ${color}`;
            }
        }
    }

    /**
     * Clear potential fence highlight
     * @param {Set} potentialFence - Set of "row-col" strings
     */
    clearPotentialFence(potentialFence) {
        for (const key of potentialFence) {
            const [row, col] = key.split('-').map(Number);
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.style.boxShadow = '';
            }
        }
    }

    /**
     * Flash a cell (for invalid move feedback)
     * @param {number} row
     * @param {number} col
     */
    flashCell(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
            setTimeout(() => {
                cell.style.backgroundColor = '';
            }, 200);
        }
    }
}

if (typeof window !== 'undefined') {
    window.FenceVisualizer = FenceVisualizer;
}
