// fence-region-finder.js - Enclosed Region Detection
// Uses perimeter calculation to determine which side is enclosed

class FenceRegionFinder {
    constructor(gameCore) {
        this.gameCore = gameCore;
    }

    /**
     * Find the region enclosed by a fence
     * @param {Set} fenceCells - Set of "row-col" strings forming the fence
     * @param {string} fenceType - 'circular' or 'border-to-border'
     * @param {Array|null} anchors - Border anchors
     * @param {Object} fenceResult - Full fence detection result
     * @returns {Set} Set of "row-col" strings for enclosed cells
     */
    findEnclosedRegion(fenceCells, fenceType, anchors, fenceResult = null) {
        if (fenceType === 'circular') {
            return this.findCircularEnclosure(fenceCells);
        } else if (fenceType === 'border-to-border') {
            return this.findBorderToBorderEnclosure(fenceCells, fenceResult);
        }
        return new Set();
    }

    /**
     * Find enclosed region for a circular fence
     */
    findCircularEnclosure(fenceCells) {
        const size = this.gameCore.size;

        const grid = Array(size).fill().map(() => Array(size).fill('empty'));
        for (const key of fenceCells) {
            const [row, col] = key.split('-').map(Number);
            grid[row][col] = 'fence';
        }

        const external = new Set();
        const queue = [];

        for (let i = 0; i < size; i++) {
            if (grid[0][i] !== 'fence') queue.push({ row: 0, col: i });
            if (grid[size - 1][i] !== 'fence') queue.push({ row: size - 1, col: i });
            if (grid[i][0] !== 'fence') queue.push({ row: i, col: 0 });
            if (grid[i][size - 1] !== 'fence') queue.push({ row: i, col: size - 1 });
        }

        while (queue.length > 0) {
            const pos = queue.shift();
            const key = `${pos.row}-${pos.col}`;

            if (external.has(key)) continue;
            if (!this.gameCore.isValidPosition(pos.row, pos.col)) continue;
            if (grid[pos.row][pos.col] === 'fence') continue;

            external.add(key);

            const neighbors = [
                { row: pos.row - 1, col: pos.col },
                { row: pos.row + 1, col: pos.col },
                { row: pos.row, col: pos.col - 1 },
                { row: pos.row, col: pos.col + 1 }
            ];

            for (const n of neighbors) {
                const nKey = `${n.row}-${n.col}`;
                if (!external.has(nKey) &&
                    this.gameCore.isValidPosition(n.row, n.col) &&
                    grid[n.row][n.col] !== 'fence') {
                    queue.push(n);
                }
            }
        }

        const enclosed = new Set();
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const key = `${row}-${col}`;
                if (!external.has(key) && !fenceCells.has(key)) {
                    enclosed.add(key);
                }
            }
        }

        console.log(`Circular enclosure: ${enclosed.size} cells enclosed`);
        return enclosed;
    }

    /**
     * Find enclosed region for border-to-border fence using perimeter calculation
     */
    findBorderToBorderEnclosure(fenceCells, fenceResult) {
        const size = this.gameCore.size;

        if (!fenceResult || !fenceResult.borders) {
            console.log('No fence result provided, using flood fill approach');
            return this.findEnclosureByFloodFill(fenceCells);
        }

        const borders = fenceResult.borders;
        const fenceSubType = fenceResult.fenceType;

        console.log(`Finding enclosure for ${fenceSubType} fence connecting ${borders[0]}-${borders[1]}`);

        if (fenceSubType === 'vertical') {
            // Top-to-bottom fence
            return this.findVerticalFenceEnclosure(fenceCells, fenceResult.topAnchorCol, fenceResult.bottomAnchorCol);
        } else if (fenceSubType === 'horizontal') {
            // Left-to-right fence
            return this.findHorizontalFenceEnclosure(fenceCells, fenceResult.leftAnchorRow, fenceResult.rightAnchorRow);
        } else if (fenceSubType === 'corner') {
            // Corner fence (connects adjacent borders)
            return this.findCornerFenceEnclosure(fenceCells, fenceResult);
        }

        return this.findEnclosureByFloodFill(fenceCells);
    }

    /**
     * Find enclosed region for vertical (top-to-bottom) fence
     */
    findVerticalFenceEnclosure(fenceCells, topAnchorCol, bottomAnchorCol) {
        const size = this.gameCore.size;

        // Perimeter calculation
        // Left side: topAnchorCol + size + bottomAnchorCol
        // Right side: (size-1 - topAnchorCol) + size + (size-1 - bottomAnchorCol)

        const leftPerimeter = topAnchorCol + size + bottomAnchorCol;
        const rightPerimeter = (size - 1 - topAnchorCol) + size + (size - 1 - bottomAnchorCol);

        console.log(`Vertical fence perimeters: left=${leftPerimeter}, right=${rightPerimeter}`);

        const enclosedSide = leftPerimeter <= rightPerimeter ? 'left' : 'right';
        console.log(`Enclosed side: ${enclosedSide}`);

        return this.floodFillEnclosedSide(fenceCells, enclosedSide, 'vertical');
    }

    /**
     * Find enclosed region for horizontal (left-to-right) fence
     */
    findHorizontalFenceEnclosure(fenceCells, leftAnchorRow, rightAnchorRow) {
        const size = this.gameCore.size;

        const topPerimeter = leftAnchorRow + size + rightAnchorRow;
        const bottomPerimeter = (size - 1 - leftAnchorRow) + size + (size - 1 - rightAnchorRow);

        console.log(`Horizontal fence perimeters: top=${topPerimeter}, bottom=${bottomPerimeter}`);

        const enclosedSide = topPerimeter <= bottomPerimeter ? 'top' : 'bottom';
        console.log(`Enclosed side: ${enclosedSide}`);

        return this.floodFillEnclosedSide(fenceCells, enclosedSide, 'horizontal');
    }

    /**
     * Find enclosed region for corner fence (connects adjacent borders like top-right)
     */
    findCornerFenceEnclosure(fenceCells, fenceResult) {
        const size = this.gameCore.size;
        const borders = fenceResult.borders;

        // For corner fences, we need to determine which corner is enclosed
        // The enclosed region is the corner area bounded by the fence and the two borders

        let cornerStartCells = [];

        if (borders.includes('top') && borders.includes('right')) {
            // Top-right corner - start from top-right
            const topCol = fenceResult.topAnchorCol;
            const rightRow = fenceResult.rightAnchorRow;
            // Enclosed is cells in top-right area
            for (let col = topCol + 1; col < size; col++) cornerStartCells.push({ row: 0, col });
            for (let row = 0; row < rightRow; row++) cornerStartCells.push({ row, col: size - 1 });
        } else if (borders.includes('top') && borders.includes('left')) {
            // Top-left corner
            const topCol = fenceResult.topAnchorCol;
            const leftRow = fenceResult.leftAnchorRow;
            for (let col = 0; col < topCol; col++) cornerStartCells.push({ row: 0, col });
            for (let row = 0; row < leftRow; row++) cornerStartCells.push({ row, col: 0 });
        } else if (borders.includes('bottom') && borders.includes('right')) {
            // Bottom-right corner
            const bottomCol = fenceResult.bottomAnchorCol;
            const rightRow = fenceResult.rightAnchorRow;
            for (let col = bottomCol + 1; col < size; col++) cornerStartCells.push({ row: size - 1, col });
            for (let row = rightRow + 1; row < size; row++) cornerStartCells.push({ row, col: size - 1 });
        } else if (borders.includes('bottom') && borders.includes('left')) {
            // Bottom-left corner
            const bottomCol = fenceResult.bottomAnchorCol;
            const leftRow = fenceResult.leftAnchorRow;
            for (let col = 0; col < bottomCol; col++) cornerStartCells.push({ row: size - 1, col });
            for (let row = leftRow + 1; row < size; row++) cornerStartCells.push({ row, col: 0 });
        }

        // Flood fill from corner
        return this.floodFillFromCells(fenceCells, cornerStartCells);
    }

    /**
     * Flood fill from specific starting cells
     */
    floodFillFromCells(fenceCells, startCells) {
        const size = this.gameCore.size;
        const enclosed = new Set();
        const visited = new Set();
        const queue = [...startCells];

        while (queue.length > 0) {
            const pos = queue.shift();
            const key = `${pos.row}-${pos.col}`;

            if (visited.has(key)) continue;
            if (!this.gameCore.isValidPosition(pos.row, pos.col)) continue;
            if (fenceCells.has(key)) continue;

            visited.add(key);
            enclosed.add(key);

            const neighbors = [
                { row: pos.row - 1, col: pos.col },
                { row: pos.row + 1, col: pos.col },
                { row: pos.row, col: pos.col - 1 },
                { row: pos.row, col: pos.col + 1 }
            ];

            for (const n of neighbors) {
                const nKey = `${n.row}-${n.col}`;
                if (!visited.has(nKey) && !fenceCells.has(nKey)) {
                    queue.push(n);
                }
            }
        }

        console.log(`Corner enclosure: ${enclosed.size} cells`);
        return enclosed;
    }

    /**
     * Flood fill to find all cells on the enclosed side of the fence
     */
    floodFillEnclosedSide(fenceCells, enclosedSide, fenceOrientation) {
        const size = this.gameCore.size;
        const startCells = [];

        if (fenceOrientation === 'vertical') {
            if (enclosedSide === 'left') {
                for (let row = 0; row < size; row++) startCells.push({ row, col: 0 });
            } else {
                for (let row = 0; row < size; row++) startCells.push({ row, col: size - 1 });
            }
        } else {
            if (enclosedSide === 'top') {
                for (let col = 0; col < size; col++) startCells.push({ row: 0, col });
            } else {
                for (let col = 0; col < size; col++) startCells.push({ row: size - 1, col });
            }
        }

        return this.floodFillFromCells(fenceCells, startCells);
    }

    /**
     * Fallback: find enclosure by flood fill from all borders
     */
    findEnclosureByFloodFill(fenceCells) {
        const size = this.gameCore.size;

        // Flood fill from all border cells
        const external = new Set();
        const queue = [];

        for (let i = 0; i < size; i++) {
            queue.push({ row: 0, col: i });
            queue.push({ row: size - 1, col: i });
            queue.push({ row: i, col: 0 });
            queue.push({ row: i, col: size - 1 });
        }

        while (queue.length > 0) {
            const pos = queue.shift();
            const key = `${pos.row}-${pos.col}`;

            if (external.has(key)) continue;
            if (!this.gameCore.isValidPosition(pos.row, pos.col)) continue;
            if (fenceCells.has(key)) continue;

            external.add(key);

            const neighbors = [
                { row: pos.row - 1, col: pos.col },
                { row: pos.row + 1, col: pos.col },
                { row: pos.row, col: pos.col - 1 },
                { row: pos.row, col: pos.col + 1 }
            ];

            for (const n of neighbors) {
                const nKey = `${n.row}-${n.col}`;
                if (!external.has(nKey) && !fenceCells.has(nKey)) {
                    queue.push(n);
                }
            }
        }

        // Enclosed = all cells - external - fence
        const enclosed = new Set();
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const key = `${row}-${col}`;
                if (!external.has(key) && !fenceCells.has(key)) {
                    enclosed.add(key);
                }
            }
        }

        console.log(`Flood fill enclosure: ${enclosed.size} cells`);
        return enclosed;
    }
}

if (typeof window !== 'undefined') {
    window.FenceRegionFinder = FenceRegionFinder;
}
