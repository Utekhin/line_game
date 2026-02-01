// fence-detector.js - Fence Detection Module
// Detects circular fences (loops) and border-to-border fences

class FenceDetector {
    constructor(gameCore) {
        this.gameCore = gameCore;
    }

    /**
     * Main entry point: detect if placing a piece creates a fence
     * @param {Object} lastMove - {row, col} of the last move
     * @param {string} player - 'X' or 'O'
     * @returns {Object|null} Fence info or null if no fence
     */
    detectFence(lastMove, player) {
        // Get the connected component containing the last move
        const component = this.getConnectedComponent(lastMove, player);

        if (component.size < 2) {
            return null;
        }

        // Check for border-to-border fence (any two different borders)
        const borderResult = this.detectBorderToBorderFence(component, player);
        if (borderResult) {
            console.log('Border-to-border fence detected!', borderResult);
            return borderResult;
        }

        // Check for circular fence (complete loop)
        if (component.size >= 4) {
            const cycleResult = this.detectCycle(component, player);
            if (cycleResult) {
                console.log('Circular fence detected!', cycleResult);
                return {
                    type: 'circular',
                    fenceCells: cycleResult.cycleCells,
                    anchors: null
                };
            }
        }

        return null;
    }

    /**
     * Get all pieces connected to a position (8-adjacency)
     */
    getConnectedComponent(startPos, player) {
        const component = new Set();
        const stack = [startPos];
        const visited = new Set();

        while (stack.length > 0) {
            const pos = stack.pop();
            const key = `${pos.row}-${pos.col}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (this.gameCore.board[pos.row][pos.col] !== player) continue;

            component.add(key);

            const neighbors = this.gameCore.getNeighbors(pos.row, pos.col);
            for (const neighbor of neighbors) {
                const nKey = `${neighbor.row}-${neighbor.col}`;
                if (!visited.has(nKey) && this.gameCore.board[neighbor.row][neighbor.col] === player) {
                    stack.push(neighbor);
                }
            }
        }

        return component;
    }

    /**
     * Detect border-to-border fence
     * A fence connects any two different borders (top, bottom, left, right)
     */
    detectBorderToBorderFence(component, player) {
        const size = this.gameCore.size;

        // Find all border pieces and which borders they touch
        const borderInfo = {
            top: [],      // row 0
            bottom: [],   // row size-1
            left: [],     // col 0
            right: []     // col size-1
        };

        for (const key of component) {
            const [row, col] = key.split('-').map(Number);

            if (row === 0) borderInfo.top.push({ row, col, key });
            if (row === size - 1) borderInfo.bottom.push({ row, col, key });
            if (col === 0) borderInfo.left.push({ row, col, key });
            if (col === size - 1) borderInfo.right.push({ row, col, key });
        }

        // Check all pairs of different borders
        const borderPairs = [
            ['top', 'bottom'],
            ['left', 'right'],
            ['top', 'left'],
            ['top', 'right'],
            ['bottom', 'left'],
            ['bottom', 'right']
        ];

        for (const [border1, border2] of borderPairs) {
            if (borderInfo[border1].length > 0 && borderInfo[border2].length > 0) {
                // Found a fence connecting two borders
                return this.createFenceResult(component, border1, border2, borderInfo, size);
            }
        }

        return null;
    }

    /**
     * Create fence result with anchor information for perimeter calculation
     */
    createFenceResult(component, border1, border2, borderInfo, size) {
        // Get anchor positions
        const anchor1 = borderInfo[border1][0];
        const anchor2 = borderInfo[border2][0];

        // Determine fence orientation and anchor positions for perimeter calculation
        let fenceType, topAnchorCol, bottomAnchorCol, leftAnchorRow, rightAnchorRow;

        // Initialize all to null
        topAnchorCol = bottomAnchorCol = leftAnchorRow = rightAnchorRow = null;

        // Set the relevant anchors based on which borders are connected
        if (borderInfo.top.length > 0) {
            topAnchorCol = borderInfo.top[0].col;
        }
        if (borderInfo.bottom.length > 0) {
            bottomAnchorCol = borderInfo.bottom[0].col;
        }
        if (borderInfo.left.length > 0) {
            leftAnchorRow = borderInfo.left[0].row;
        }
        if (borderInfo.right.length > 0) {
            rightAnchorRow = borderInfo.right[0].row;
        }

        // Determine fence type based on which borders are connected
        if ((border1 === 'top' && border2 === 'bottom') || (border1 === 'bottom' && border2 === 'top')) {
            fenceType = 'vertical';
        } else if ((border1 === 'left' && border2 === 'right') || (border1 === 'right' && border2 === 'left')) {
            fenceType = 'horizontal';
        } else {
            // Corner fence (e.g., top-left, top-right, bottom-left, bottom-right)
            fenceType = 'corner';
        }

        console.log(`Fence type: ${fenceType}, borders: ${border1}-${border2}`);
        console.log(`Anchors: top=${topAnchorCol}, bottom=${bottomAnchorCol}, left=${leftAnchorRow}, right=${rightAnchorRow}`);

        return {
            type: 'border-to-border',
            fenceType: fenceType,
            borders: [border1, border2],
            fenceCells: component,
            anchors: [...borderInfo[border1], ...borderInfo[border2]],
            topAnchorCol,
            bottomAnchorCol,
            leftAnchorRow,
            rightAnchorRow
        };
    }

    /**
     * Detect if the component contains a cycle (loop)
     */
    detectCycle(component, player) {
        if (component.size < 4) return null;

        const componentArray = Array.from(component);
        const startKey = componentArray[0];
        const [startRow, startCol] = startKey.split('-').map(Number);

        const visited = new Set();
        const parent = new Map();

        const hasCycle = this.dfsDetectCycle(
            { row: startRow, col: startCol },
            null,
            visited,
            parent,
            component,
            player
        );

        if (hasCycle) {
            return { cycleCells: component };
        }

        return null;
    }

    /**
     * DFS helper for cycle detection
     */
    dfsDetectCycle(pos, parentPos, visited, parent, component, player) {
        const key = `${pos.row}-${pos.col}`;
        visited.add(key);

        const neighbors = this.gameCore.getNeighbors(pos.row, pos.col);

        for (const neighbor of neighbors) {
            const nKey = `${neighbor.row}-${neighbor.col}`;

            if (!component.has(nKey)) continue;

            if (!visited.has(nKey)) {
                parent.set(nKey, key);
                if (this.dfsDetectCycle(neighbor, pos, visited, parent, component, player)) {
                    return true;
                }
            } else if (parentPos) {
                const parentKey = `${parentPos.row}-${parentPos.col}`;
                if (nKey !== parentKey) {
                    return true;
                }
            }
        }

        return false;
    }
}

if (typeof window !== 'undefined') {
    window.FenceDetector = FenceDetector;
}
