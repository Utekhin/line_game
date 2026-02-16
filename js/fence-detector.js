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
     * Get all pieces connected to a position (8-adjacency, respecting crossing rule)
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

            // Use getValidNeighbors to respect diagonal crossing rule
            const neighbors = this.gameCore.getValidNeighbors
                ? this.gameCore.getValidNeighbors(pos.row, pos.col, player)
                : this.gameCore.getNeighbors(pos.row, pos.col).filter(
                    n => this.gameCore.board[n.row][n.col] === player
                );

            for (const neighbor of neighbors) {
                const nKey = `${neighbor.row}-${neighbor.col}`;
                if (!visited.has(nKey)) {
                    stack.push(neighbor);
                }
            }
        }

        return component;
    }

    /**
     * Detect border-to-border fence
     * A fence connects any two different borders (top, bottom, left, right)
     * Uses shortest path between borders (not the entire component) as fence cells
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

        // Check all pairs of different borders, find the shortest fence path
        const borderPairs = [
            ['top', 'bottom'],
            ['left', 'right'],
            ['top', 'left'],
            ['top', 'right'],
            ['bottom', 'left'],
            ['bottom', 'right']
        ];

        let bestResult = null;
        let bestPathLength = Infinity;

        for (const [border1, border2] of borderPairs) {
            if (borderInfo[border1].length === 0 || borderInfo[border2].length === 0) continue;

            // Find shortest path between the two borders within the component
            const path = this.findShortestPath(component, player, borderInfo[border1], borderInfo[border2]);
            if (!path || path.size >= bestPathLength) continue;

            // Recompute border info from the path only (not the whole component)
            const pathBorderInfo = { top: [], bottom: [], left: [], right: [] };
            for (const key of path) {
                const [row, col] = key.split('-').map(Number);
                if (row === 0) pathBorderInfo.top.push({ row, col, key });
                if (row === size - 1) pathBorderInfo.bottom.push({ row, col, key });
                if (col === 0) pathBorderInfo.left.push({ row, col, key });
                if (col === size - 1) pathBorderInfo.right.push({ row, col, key });
            }

            bestResult = this.createFenceResult(path, border1, border2, pathBorderInfo, size);
            bestPathLength = path.size;
        }

        if (bestResult) {
            console.log('Border-to-border fence detected!', bestResult);
        }
        return bestResult;
    }

    /**
     * BFS to find shortest path from any cell on border1 to any cell on border2
     * within the connected component, respecting diagonal crossing rules
     */
    findShortestPath(component, player, border1Cells, border2Cells) {
        const border2Keys = new Set(border2Cells.map(c => `${c.row}-${c.col}`));
        const queue = [];
        const parent = new Map();

        for (const cell of border1Cells) {
            const key = `${cell.row}-${cell.col}`;
            // Don't start BFS from cells that are on both borders (corner cells)
            // so they can be discovered as destinations via BFS
            if (component.has(key) && !border2Keys.has(key)) {
                queue.push(key);
                parent.set(key, null);
            }
        }

        while (queue.length > 0) {
            const key = queue.shift();

            // Check if we reached border2 (and path has at least 2 cells)
            if (border2Keys.has(key) && parent.get(key) !== null) {
                // Reconstruct path
                const path = new Set();
                let current = key;
                while (current !== null) {
                    path.add(current);
                    current = parent.get(current);
                }
                return path;
            }

            const [row, col] = key.split('-').map(Number);

            // Get valid neighbors within the component
            const neighbors = this.gameCore.getValidNeighbors
                ? this.gameCore.getValidNeighbors(row, col, player)
                : this.gameCore.getNeighbors(row, col).filter(
                    n => this.gameCore.board[n.row][n.col] === player
                );

            for (const n of neighbors) {
                const nKey = `${n.row}-${n.col}`;
                if (!parent.has(nKey) && component.has(nKey)) {
                    parent.set(nKey, key);
                    queue.push(nKey);
                }
            }
        }

        return null; // No path found
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
     * DFS helper for cycle detection (respects crossing rule)
     */
    dfsDetectCycle(pos, parentPos, visited, parent, component, player) {
        const key = `${pos.row}-${pos.col}`;
        visited.add(key);

        // Use valid neighbors to respect diagonal crossing rule
        const neighbors = this.gameCore.getValidNeighbors
            ? this.gameCore.getValidNeighbors(pos.row, pos.col, player)
            : this.gameCore.getNeighbors(pos.row, pos.col).filter(
                n => this.gameCore.board[n.row][n.col] === player
            );

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
