export class GameRenderer {
    constructor(canvas, gridSize) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = gridSize;
        this.cellSize = canvas.width / gridSize;
        this.config = {
            connectionWidth: 4,
            xColor: '#0066cc',
            oColor: '#00cc66',
            conflictColor: '#ff2222',
            markSize: 0.4
        };
    }

    drawAll(gameEngine) {
        this.clearCanvas();
        this.drawGrid();
        this.drawConnections(gameEngine.connectionManager);
        this.drawMarks(gameEngine.grid);
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        this.ctx.strokeStyle = '#cccccc';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= this.gridSize; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.gridSize; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }
    }

    drawConnections(connectionManager) {
        const connections = Array.from(connectionManager.connections.values())
            .sort((a, b) => a.turn - b.turn);
        
        connections.forEach(conn => {
            this.drawConnection(conn);
        });
    }

    drawConnection(conn) {
        const [start, end] = conn.cells.map(c => this.getCellCenter(c));
        this.ctx.strokeStyle = this.config[`${conn.player.toLowerCase()}Color`];
        this.ctx.lineWidth = this.config.connectionWidth;
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
    }

    drawMarks(grid) {
        grid.forEach(row => row.forEach(cell => {
            if (cell.owner) {
                this.drawCellMark(cell);
            }
        }));
    }

    drawCellMark(cell) {
        const center = this.getCellCenter(cell);
        if (cell.owner === 'X') {
            this.drawX(center);
        } else {
            this.drawO(center);
        }
    }

    drawX(center) {
        const size = this.cellSize * this.config.markSize;
        this.ctx.strokeStyle = this.config.xColor;
        this.ctx.lineWidth = 3;
        
        this.ctx.beginPath();
        this.ctx.moveTo(center.x - size, center.y - size);
        this.ctx.lineTo(center.x + size, center.y + size);
        this.ctx.moveTo(center.x + size, center.y - size);
        this.ctx.lineTo(center.x - size, center.y + size);
        this.ctx.stroke();
    }

    drawO(center) {
        const radius = this.cellSize * this.config.markSize;
        this.ctx.strokeStyle = this.config.oColor;
        this.ctx.lineWidth = 3;
        
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    getCellCenter(cell) {
        return {
            x: (cell.gridX * this.cellSize) + this.cellSize/2,
            y: (cell.gridY * this.cellSize) + this.cellSize/2
        };
    }

    highlightConflict(connection) {
        const [start, end] = connection.cells.map(c => this.getCellCenter(c));
        this.ctx.strokeStyle = this.config.conflictColor;
        this.ctx.lineWidth = this.config.connectionWidth + 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
    }
}
