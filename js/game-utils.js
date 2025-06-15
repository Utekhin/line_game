export const ConnectionValidator = {
    isDiagonalConnection(cellA, cellB) {
        const dx = Math.abs(cellA.gridX - cellB.gridX);
        const dy = Math.abs(cellA.gridY - cellB.gridY);
        return dx === 1 && dy === 1;
    },

    getConnectionBounds(cells) {
        const xs = cells.map(c => c.gridX);
        const ys = cells.map(c => c.gridY);
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys)
        };
    },

    connectionsIntersect(conn1, conn2) {
        const b1 = this.getConnectionBounds(conn1.cells);
        const b2 = this.getConnectionBounds(conn2.cells);
        
        return !(b1.maxX < b2.minX || 
                b1.minX > b2.maxX || 
                b1.maxY < b2.minY || 
                b1.minY > b2.maxY);
    }
};

export const GridHelper = {
    getCellNeighbors(grid, x, y) {
        const neighbors = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                if (grid[x + dx]?.[y + dy]) {
                    neighbors.push(grid[x + dx][y + dy]);
                }
            }
        }
        return neighbors;
    }
};
