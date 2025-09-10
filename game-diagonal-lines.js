// game-diagonal-lines.js - Complete Working Version with Diagonal Crossing Fix
// Handles detection and rendering of diagonal connections with "first locks wins" rule

console.log('Loading game-diagonal-lines.js...'); // Verify file is loading

class ConnectionGameDiagonalLines {
    constructor(gameCore, svgElement) {
        this.gameCore = gameCore;
        this.svgElement = svgElement;
        this.diagonalConnections = [];
        this.debugMode = false;
        
        console.log('🔗 ConnectionGameDiagonalLines initialized with crossing prevention');
    }

    // Main update method called after each move
    updateDiagonalLines() {
        console.log('\n🔄 Updating diagonal connections with crossing detection...');
        this.diagonalConnections = this.findAllDiagonalConnections();
        this.renderDiagonalLines();
    }

    // Find all diagonal connections respecting "first locks wins"
    findAllDiagonalConnections() {
        const connections = [];
        
        if (!this.gameCore.gameHistory || this.gameCore.gameHistory.length === 0) {
            console.log('📊 No moves in history');
            return connections;
        }
        
        const moveHistory = this.gameCore.gameHistory || [];
        console.log(`🔗 Building diagonal connections from ${moveHistory.length} moves`);
        
        // Track established diagonals to prevent crossing
        const establishedDiagonals = new Map();
        
        // Process moves in chronological order
        for (let moveIndex = 0; moveIndex < moveHistory.length; moveIndex++) {
            const move = moveHistory[moveIndex];
            
            // Find new connections for this move
            const newConnections = this.findNewConnectionsForMove(
                move, 
                connections, 
                establishedDiagonals
            );
            
            // Add new connections and record them
            for (const conn of newConnections) {
                connections.push(conn);
                
                // Record this diagonal as established
                const diagKey = this.getDiagonalKey(
                    {row: conn.row1, col: conn.col1}, 
                    {row: conn.row2, col: conn.col2}
                );
                establishedDiagonals.set(diagKey, {
                    player: conn.player,
                    moveIndex: conn.establishedAtMove,
                    from: {row: conn.row1, col: conn.col1},
                    to: {row: conn.row2, col: conn.col2}
                });
            }
        }
        
        console.log(`🎯 Final diagonal connections: ${connections.length}`);
        connections.forEach((conn, i) => {
            console.log(`  ${i+1}. ${conn.player} (${conn.row1},${conn.col1})-(${conn.row2},${conn.col2}) [move ${conn.establishedAtMove}]`);
        });
        
        return connections;
    }

    // Find new connections for a specific move
    findNewConnectionsForMove(move, existingConnections, establishedDiagonals) {
        const newConnections = [];
        const board = this.gameCore.board;
        
        // Check all 4 diagonal directions
        const diagonalOffsets = [
            { dr: -1, dc: -1, name: 'NW' },
            { dr: -1, dc: 1, name: 'NE' },
            { dr: 1, dc: -1, name: 'SW' },
            { dr: 1, dc: 1, name: 'SE' }
        ];
        
        for (const offset of diagonalOffsets) {
            const adjRow = move.row + offset.dr;
            const adjCol = move.col + offset.dc;
            
            // Check if adjacent position is valid and has same player
            if (this.isValidPosition(adjRow, adjCol) && 
                board[adjRow][adjCol] === move.player) {
                
                // Check if this diagonal would cross an existing one
                const wouldCross = this.checkDiagonalCrossing(
                    move, 
                    { row: adjRow, col: adjCol },
                    move.player,
                    establishedDiagonals
                );
                
                if (wouldCross.crosses) {
                    console.log(`  ❌ Diagonal ${move.player} (${move.row},${move.col})-(${adjRow},${adjCol}) blocked by ${wouldCross.blockingPlayer}'s earlier diagonal`);
                    continue;
                }
                
                // Check if already connected
                if (!this.isAlreadyConnected(move, { row: adjRow, col: adjCol }, existingConnections)) {
                    newConnections.push({
                        player: move.player,
                        row1: move.row,
                        col1: move.col,
                        row2: adjRow,
                        col2: adjCol,
                        establishedAtMove: move.moveNumber || 0,
                        type: 'diagonal'
                    });
                }
            }
        }
        
        return newConnections;
    }

    // Check if a diagonal would cross an established diagonal
    checkDiagonalCrossing(pos1, pos2, player, establishedDiagonals) {
        // Get the crossing positions
        const crossPos1 = { row: pos1.row, col: pos2.col };
        const crossPos2 = { row: pos2.row, col: pos1.col };
        
        // Check if there's an established diagonal at the crossing positions
        const crossKey = this.getDiagonalKey(crossPos1, crossPos2);
        
        if (establishedDiagonals.has(crossKey)) {
            const established = establishedDiagonals.get(crossKey);
            const opponent = player === 'X' ? 'O' : 'X';
            
            if (established.player === opponent) {
                return {
                    crosses: true,
                    blockingPlayer: established.player,
                    blockingMove: established.moveIndex
                };
            }
        }
        
        return { crosses: false };
    }

    // Generate canonical key for diagonal
    getDiagonalKey(pos1, pos2) {
        if (pos1.row < pos2.row || (pos1.row === pos2.row && pos1.col < pos2.col)) {
            return `${pos1.row},${pos1.col}-${pos2.row},${pos2.col}`;
        } else {
            return `${pos2.row},${pos2.col}-${pos1.row},${pos1.col}`;
        }
    }

    // Check if connection already exists
    isAlreadyConnected(pos1, pos2, connections) {
        return connections.some(conn => 
            (conn.row1 === pos1.row && conn.col1 === pos1.col &&
             conn.row2 === pos2.row && conn.col2 === pos2.col) ||
            (conn.row1 === pos2.row && conn.col1 === pos2.col &&
             conn.row2 === pos1.row && conn.col2 === pos1.col)
        );
    }

    // Check if position is valid
    isValidPosition(row, col) {
        return row >= 0 && row < this.gameCore.size && 
               col >= 0 && col < this.gameCore.size;
    }

    // Render diagonal lines to DOM
    renderDiagonalLines() {
        // Remove existing lines
        const existingLines = document.querySelectorAll('.diagonal-line');
        existingLines.forEach(line => line.remove());
        
        console.log(`🎨 Rendering ${this.diagonalConnections.length} diagonal connections`);
        
        // Render each connection
        this.diagonalConnections.forEach(conn => {
            this.drawDiagonalLine(conn);
        });
    }

    // Draw a single diagonal line
    drawDiagonalLine(conn) {
        const board = document.getElementById('gameBoard');
        if (!board) return;
        
        const fromCell = document.querySelector(`[data-row="${conn.row1}"][data-col="${conn.col1}"]`);
        const toCell = document.querySelector(`[data-row="${conn.row2}"][data-col="${conn.col2}"]`);
        
        if (!fromCell || !toCell) return;
        
        const fromRect = fromCell.getBoundingClientRect();
        const toRect = toCell.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        
        const x1 = fromRect.left + fromRect.width / 2 - boardRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - boardRect.top;
        const x2 = toRect.left + toRect.width / 2 - boardRect.left;
        const y2 = toRect.top + toRect.height / 2 - boardRect.top;
        
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        
        const line = document.createElement('div');
        line.className = `diagonal-line diagonal-${conn.player.toLowerCase()}`;
        line.style.cssText = `
            position: absolute;
            width: ${length}px;
            height: 3px;
            background-color: ${conn.player === 'X' ? '#4A90E2' : '#E94B3C'};
            opacity: 0.7;
            left: ${x1}px;
            top: ${y1}px;
            transform-origin: 0 50%;
            transform: rotate(${angle}deg);
            pointer-events: none;
            z-index: 5;
        `;
        
        board.appendChild(line);
    }

    // Clear all diagonal lines
    clear() {
        this.diagonalConnections = [];
        const existingLines = document.querySelectorAll('.diagonal-line');
        existingLines.forEach(line => line.remove());
        console.log('🧹 Cleared all diagonal lines');
    }

    // Legacy compatibility methods
    updateBoard() {
        this.updateDiagonalLines();
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Export to window
if (typeof window !== 'undefined') {
    window.ConnectionGameDiagonalLines = ConnectionGameDiagonalLines;
    console.log('✅ ConnectionGameDiagonalLines exported to window');
}

// Verify export
setTimeout(() => {
    if (window.ConnectionGameDiagonalLines) {
        console.log('✅ ConnectionGameDiagonalLines verified in window object');
    } else {
        console.error('❌ ConnectionGameDiagonalLines NOT found in window object');
    }
}, 100);
