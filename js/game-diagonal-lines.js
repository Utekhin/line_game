// game-diagonal-lines.js - Diagonal Lines Visualization Module
// Handles detection and rendering of diagonal locks between immediately adjacent pieces
// Requires game-core.js to be loaded first

class ConnectionGameDiagonalLines {
    constructor(gameCore, svgElement) {
        this.gameCore = gameCore;
        this.svgElement = svgElement;
        this.diagonalConnections = []; // Store current diagonal connections
        this.lastBoardState = null; // To detect changes
        
        // Diagonal direction vectors (4 diagonal directions)
        this.diagonalDirections = [
            [-1, -1], // Top-left
            [-1, 1],  // Top-right  
            [1, -1],  // Bottom-left
            [1, 1]    // Bottom-right
        ];
        
        console.log('Diagonal Lines module initialized');
    }

    // MAIN: Update diagonal lines display
    updateDiagonalLines(cellSize = null) {
        // Cell size is now calculated from DOM, so we don't need the parameter
        // but we keep it for backward compatibility
        
        // Check if board state changed to avoid unnecessary updates
        const currentBoardState = JSON.stringify(this.gameCore.board);
        if (currentBoardState === this.lastBoardState) {
            return; // No changes, skip update
        }
        this.lastBoardState = currentBoardState;
        
        console.log('=== Updating Diagonal Lines ===');
        
        // Find all current diagonal connections
        this.diagonalConnections = this.findAllDiagonalConnections();
        
        console.log(`Found ${this.diagonalConnections.length} diagonal connections`);
        this.diagonalConnections.forEach((conn, index) => {
            console.log(`Connection ${index + 1}: ${conn.player} from (${conn.row1},${conn.col1}) to (${conn.row2},${conn.col2}) [established at move ${conn.establishedAtMove || '?'}]`);
        });
        
        // Render lines in SVG
        this.renderDiagonalLines();
        
        console.log('=== Diagonal Lines Update Complete ===');
    }

    // CORE: Find all diagonal connections (respecting move order and crossing rules)
    findAllDiagonalConnections() {
    const connections = [];
    
    // SAFETY CHECK: Make sure game core and board are initialized
    if (!this.gameCore || !this.gameCore.board || !Array.isArray(this.gameCore.board)) {
        console.warn('Game core or board not properly initialized, skipping diagonal connections');
        return connections;
    }
    
    // Build connections incrementally based on move history to respect "first locks wins" rule
    const moveHistory = this.gameCore.gameHistory || [];
    
    console.log(`Building diagonal connections from ${moveHistory.length} moves`);
    
    // Process moves in chronological order
    for (let moveIndex = 0; moveIndex < moveHistory.length; moveIndex++) {
        const move = moveHistory[moveIndex];
        const newConnections = this.findNewConnectionsForMove(move, connections);
        connections.push(...newConnections);
    }
    
    // Also check any pieces not in history (fallback for direct board analysis)
    const historyPositions = new Set(moveHistory.map(m => `${m.row}-${m.col}`));
    
    // SAFETY CHECK: Make sure getPlayerPositions exists
    if (typeof this.gameCore.getPlayerPositions !== 'function') {
        console.warn('getPlayerPositions method not available, skipping fallback analysis');
        return connections;
    }
    
    ['X', 'O'].forEach(player => {
        try {
            const playerPositions = this.gameCore.getPlayerPositions(player);
            if (Array.isArray(playerPositions)) {
                for (const pos of playerPositions) {
                    const posKey = `${pos.row}-${pos.col}`;
                    if (!historyPositions.has(posKey)) {
                        // This piece wasn't found in history, check it as if it were placed now
                        const move = { row: pos.row, col: pos.col, player: player, moveNumber: 999 };
                        const newConnections = this.findNewConnectionsForMove(move, connections);
                        connections.push(...newConnections);
                    }
                }
            }
        } catch (error) {
            console.warn(`Error getting positions for player ${player}:`, error);
        }
    });
    
    return connections;
}

    // NEW: Find new diagonal connections created by a specific move
    findNewConnectionsForMove(move, existingConnections) {
        const newConnections = [];
        const { row, col, player } = move;
        
        // Check all 4 diagonal directions from the new piece
        for (const [dr, dc] of this.diagonalDirections) {
            const adjacentRow = row + dr;
            const adjacentCol = col + dc;
            
            // Check if adjacent position is valid and contains same player
            if (this.gameCore.isValidPosition(adjacentRow, adjacentCol) && 
                this.gameCore.board[adjacentRow][adjacentCol] === player) {
                
                // Create potential connection
                const connection = this.createOrderedConnection(
                    row, col, 
                    adjacentRow, adjacentCol, 
                    player
                );
                
                // Add move number for tracking
                connection.establishedAtMove = move.moveNumber || 999;
                
                // Check if this connection already exists
                if (this.connectionExists(existingConnections, connection) || 
                    this.connectionExists(newConnections, connection)) {
                    continue; // Skip duplicate
                }
                
                // CRITICAL: Check if this connection would cross any existing opponent lines
                const opponent = player === 'X' ? 'O' : 'X';
                const opponentConnections = existingConnections.filter(conn => conn.player === opponent);
                
                if (this.wouldConnectionCrossOpponentLines(connection, opponentConnections)) {
                    console.log(`Move ${move.moveNumber}: Blocked connection ${player} (${row},${col}) ↔ (${adjacentRow},${adjacentCol}) - crosses opponent line`);
                    continue; // Skip this connection - it's blocked
                }
                
                newConnections.push(connection);
                console.log(`Move ${move.moveNumber}: Added diagonal connection ${player} (${row},${col}) ↔ (${adjacentRow},${adjacentCol})`);
            }
        }
        
        return newConnections;
    }

    // NEW: Check if a potential connection would cross existing opponent lines
    wouldConnectionCrossOpponentLines(newConnection, opponentConnections) {
        for (const opponentConn of opponentConnections) {
            if (this.doLinesIntersect(newConnection, opponentConn)) {
                console.log(`Line intersection detected: ${newConnection.player}(${newConnection.row1},${newConnection.col1})-(${newConnection.row2},${newConnection.col2}) crosses ${opponentConn.player}(${opponentConn.row1},${opponentConn.col1})-(${opponentConn.row2},${opponentConn.col2})`);
                return true;
            }
        }
        return false;
    }

    // NEW: Check if two line segments intersect
    doLinesIntersect(line1, line2) {
        // Get line endpoints
        const x1 = line1.col1, y1 = line1.row1;
        const x2 = line1.col2, y2 = line1.row2;
        const x3 = line2.col1, y3 = line2.row1;  
        const x4 = line2.col2, y4 = line2.row2;
        
        // Check if lines share an endpoint (not considered intersection)
        if ((x1 === x3 && y1 === y3) || (x1 === x4 && y1 === y4) ||
            (x2 === x3 && y2 === y3) || (x2 === x4 && y2 === y4)) {
            return false; // Sharing endpoint is allowed
        }
        
        // Calculate direction vectors and cross products
        const d1 = this.orientation(x1, y1, x2, y2, x3, y3);
        const d2 = this.orientation(x1, y1, x2, y2, x4, y4);
        const d3 = this.orientation(x3, y3, x4, y4, x1, y1);
        const d4 = this.orientation(x3, y3, x4, y4, x2, y2);
        
        // General case: lines intersect if orientations are different
        if (d1 !== d2 && d3 !== d4) {
            return true;
        }
        
        // Special cases: check if points are collinear and on segments
        if (d1 === 0 && this.onSegment(x1, y1, x3, y3, x2, y2)) return true;
        if (d2 === 0 && this.onSegment(x1, y1, x4, y4, x2, y2)) return true;
        if (d3 === 0 && this.onSegment(x3, y3, x1, y1, x4, y4)) return true;
        if (d4 === 0 && this.onSegment(x3, y3, x2, y2, x4, y4)) return true;
        
        return false;
    }

    // Helper: Find orientation of ordered triplet (p, q, r)
    // Returns 0 if collinear, 1 if clockwise, 2 if counterclockwise
    orientation(px, py, qx, qy, rx, ry) {
        const val = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
        if (val === 0) return 0; // collinear
        return (val > 0) ? 1 : 2; // clock or counterclock wise
    }

    // Helper: Check if point q lies on line segment pr
    onSegment(px, py, qx, qy, rx, ry) {
        return qx <= Math.max(px, rx) && qx >= Math.min(px, rx) &&
               qy <= Math.max(py, ry) && qy >= Math.min(py, ry);
    }

    // Create ordered connection (smaller coordinates first to avoid duplicates)
    createOrderedConnection(row1, col1, row2, col2, player) {
        // Order by row first, then by column
        if (row1 < row2 || (row1 === row2 && col1 < col2)) {
            return {
                row1: row1, col1: col1,
                row2: row2, col2: col2,
                player: player,
                type: this.getDiagonalType(row1, col1, row2, col2),
                establishedAtMove: null // Will be set by caller
            };
        } else {
            return {
                row1: row2, col1: col2,
                row2: row1, col2: col1,
                player: player,
                type: this.getDiagonalType(row2, col2, row1, col1),
                establishedAtMove: null // Will be set by caller
            };
        }
    }

    // Determine diagonal type for styling
    getDiagonalType(row1, col1, row2, col2) {
        const rowDiff = row2 - row1;
        const colDiff = col2 - col1;
        
        if (rowDiff > 0 && colDiff > 0) return 'main-diagonal';     // ↘ (top-left to bottom-right)
        if (rowDiff > 0 && colDiff < 0) return 'anti-diagonal';    // ↙ (top-right to bottom-left)
        if (rowDiff < 0 && colDiff > 0) return 'anti-diagonal';    // ↗ (bottom-left to top-right)
        if (rowDiff < 0 && colDiff < 0) return 'main-diagonal';    // ↖ (bottom-right to top-left)
        
        return 'unknown';
    }

    // Check if connection already exists in array
    connectionExists(connections, newConnection) {
        return connections.some(conn => 
            conn.row1 === newConnection.row1 && 
            conn.col1 === newConnection.col1 && 
            conn.row2 === newConnection.row2 && 
            conn.col2 === newConnection.col2 && 
            conn.player === newConnection.player
        );
    }

    // RENDER: Draw all diagonal lines in SVG
    renderDiagonalLines() {
        if (!this.svgElement) {
            console.warn('SVG element not found for diagonal lines');
            return;
        }
        
        // Clear existing lines
        this.svgElement.innerHTML = '';
        
        // Get board container for positioning reference
        const boardContainer = this.svgElement.closest('.board-container');
        if (!boardContainer) {
            console.warn('Board container not found');
            return;
        }
        
        // Set SVG dimensions to match board container
        const containerRect = boardContainer.getBoundingClientRect();
        const boardElement = boardContainer.querySelector('.board-grid');
        if (!boardElement) {
            console.warn('Board grid not found');
            return;
        }
        
        const boardRect = boardElement.getBoundingClientRect();
        const svgWidth = boardRect.width;
        const svgHeight = boardRect.height;
        
        this.svgElement.setAttribute('width', svgWidth);
        this.svgElement.setAttribute('height', svgHeight);
        this.svgElement.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        
        console.log(`Rendering ${this.diagonalConnections.length} diagonal lines in ${svgWidth}x${svgHeight} SVG`);
        
        // Draw each connection
        this.diagonalConnections.forEach((connection, index) => {
            this.drawDiagonalLine(connection, index);
        });
    }

    // NEW: Get actual cell center coordinates from DOM
    getCellCenter(row, col) {
        // Find the specific cell element
        const boardElement = document.querySelector('.board-grid');
        if (!boardElement) {
            console.warn('Board grid element not found');
            return null;
        }
        
        const cellElement = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cellElement) {
            console.warn(`Cell element not found for (${row}, ${col})`);
            return null;
        }
        
        // Get the board container for reference (where SVG is positioned)
        const boardContainer = document.querySelector('.board-container');
        if (!boardContainer) {
            console.warn('Board container not found');
            return null;
        }
        
        // Get bounding rectangles
        const cellRect = cellElement.getBoundingClientRect();
        const containerRect = boardContainer.getBoundingClientRect();
        
        // Calculate cell center relative to board container
        const centerX = cellRect.left - containerRect.left + cellRect.width / 2;
        const centerY = cellRect.top - containerRect.top + cellRect.height / 2;
        
        // Account for any padding in the board container
        const boardRect = boardElement.getBoundingClientRect();
        const paddingLeft = boardRect.left - containerRect.left;
        const paddingTop = boardRect.top - containerRect.top;
        
        return {
            x: centerX - paddingLeft,
            y: centerY - paddingTop,
            cellRect: cellRect,      // For debugging
            containerRect: containerRect, // For debugging
            boardRect: boardRect,    // For debugging
            paddingLeft: paddingLeft, // For debugging
            paddingTop: paddingTop   // For debugging
        };
    }

    // Draw a single diagonal line
    drawDiagonalLine(connection, index) {
        // Get actual cell center coordinates from DOM elements
        const cellCenter1 = this.getCellCenter(connection.row1, connection.col1);
        const cellCenter2 = this.getCellCenter(connection.row2, connection.col2);
        
        if (!cellCenter1 || !cellCenter2) {
            console.warn(`Could not get cell centers for connection ${index + 1}`);
            return;
        }
        
        const x1 = cellCenter1.x;
        const y1 = cellCenter1.y;
        const x2 = cellCenter2.x;
        const y2 = cellCenter2.y;
        
        // Create SVG line element
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        
        // Set line coordinates
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        
        // Set line styling based on player
        const strokeColor = connection.player === 'X' ? '#6c7b7f' : '#708b75';
        const strokeWidth = 2;
        const opacity = 0.7;
        
        line.setAttribute('stroke', strokeColor);
        line.setAttribute('stroke-width', strokeWidth);
        line.setAttribute('stroke-opacity', opacity);
        line.setAttribute('stroke-linecap', 'round');
        
        // Add subtle animation for new lines
        line.style.strokeDasharray = '3,2';
        line.style.animation = 'dash 2s linear infinite';
        
        // Add class for styling
        line.classList.add('diagonal-line');
        line.classList.add(`diagonal-line-${connection.player.toLowerCase()}`);
        line.classList.add(`diagonal-${connection.type}`);
        
        // Add to SVG
        this.svgElement.appendChild(line);
        
        console.log(`Drew diagonal line ${index + 1}: ${connection.player} from (${x1.toFixed(1)},${y1.toFixed(1)}) to (${x2.toFixed(1)},${y2.toFixed(1)})`);
    }

    // PUBLIC API: Force update (useful for external calls)
    forceUpdate(cellSize = null) {
        this.lastBoardState = null; // Force update
        this.updateDiagonalLines(cellSize);
    }

    // NEW: Debug cell positioning
    debugCellPositions() {
        console.log('=== DEBUGGING CELL POSITIONS ===');
        
        // Test a few cell positions
        const testCells = [
            [0, 0], [0, this.gameCore.size - 1], 
            [this.gameCore.size - 1, 0], [this.gameCore.size - 1, this.gameCore.size - 1],
            [Math.floor(this.gameCore.size / 2), Math.floor(this.gameCore.size / 2)]
        ];
        
        testCells.forEach(([row, col]) => {
            const center = this.getCellCenter(row, col);
            if (center) {
                console.log(`Cell (${row},${col}) center: (${center.x.toFixed(1)}, ${center.y.toFixed(1)})`);
                console.log(`  Cell rect: ${center.cellRect.width}x${center.cellRect.height} at (${center.cellRect.left}, ${center.cellRect.top})`);
                console.log(`  Padding: left=${center.paddingLeft.toFixed(1)}, top=${center.paddingTop.toFixed(1)}`);
            } else {
                console.log(`Cell (${row},${col}): CENTER NOT FOUND`);
            }
        });
        
        console.log('=== END CELL POSITION DEBUG ===');
    }

    // PUBLIC API: Get current diagonal connections
    getDiagonalConnections() {
        return [...this.diagonalConnections]; // Return copy
    }

    // PUBLIC API: Get connections for specific player
    getPlayerConnections(player) {
        return this.diagonalConnections.filter(conn => conn.player === player);
    }

    // PUBLIC API: Check if position is part of any diagonal connection
    isPositionInDiagonalConnection(row, col, player = null) {
        return this.diagonalConnections.some(conn => {
            const matchesPosition = (conn.row1 === row && conn.col1 === col) || 
                                  (conn.row2 === row && conn.col2 === col);
            const matchesPlayer = player === null || conn.player === player;
            return matchesPosition && matchesPlayer;
        });
    }

    // PUBLIC API: Get statistics
    getStatistics() {
        const stats = {
            totalConnections: this.diagonalConnections.length,
            xConnections: this.diagonalConnections.filter(c => c.player === 'X').length,
            oConnections: this.diagonalConnections.filter(c => c.player === 'O').length,
            mainDiagonals: this.diagonalConnections.filter(c => c.type === 'main-diagonal').length,
            antiDiagonals: this.diagonalConnections.filter(c => c.type === 'anti-diagonal').length
        };
        
        return stats;
    }

    // PUBLIC API: Clear all diagonal lines
    clear() {
        this.diagonalConnections = [];
        this.lastBoardState = null;
        if (this.svgElement) {
            this.svgElement.innerHTML = '';
        }
        console.log('Diagonal lines cleared');
    }

    // PUBLIC API: Analyze which lines would block which (separate method)
    analyzeBlocking() {
        const xConnections = this.diagonalConnections.filter(c => c.player === 'X');
        const oConnections = this.diagonalConnections.filter(c => c.player === 'O');
        
        console.log('X lines that would block O:');
        xConnections.forEach(xConn => {
            const blockedO = [];
            oConnections.forEach(oConn => {
                if ((oConn.establishedAtMove || 999) > (xConn.establishedAtMove || 999) && 
                    this.doLinesIntersect(xConn, oConn)) {
                    blockedO.push(`O(${oConn.row1},${oConn.col1})-(${oConn.row2},${oConn.col2})`);
                }
            });
            if (blockedO.length > 0) {
                console.log(`  X(${xConn.row1},${xConn.col1})-(${xConn.row2},${xConn.col2}) blocks: ${blockedO.join(', ')}`);
            }
        });
        
        console.log('O lines that would block X:');
        oConnections.forEach(oConn => {
            const blockedX = [];
            xConnections.forEach(xConn => {
                if ((xConn.establishedAtMove || 999) > (oConn.establishedAtMove || 999) && 
                    this.doLinesIntersect(oConn, xConn)) {
                    blockedX.push(`X(${xConn.row1},${xConn.col1})-(${xConn.row2},${xConn.col2})`);
                }
            });
            if (blockedX.length > 0) {
                console.log(`  O(${oConn.row1},${oConn.col1})-(${oConn.row2},${oConn.col2}) blocks: ${blockedX.join(', ')}`);
            }
        });
    }

    // UTILITY: Debug information
    debugPrint() {
        console.log('=== DIAGONAL LINES DEBUG ===');
        console.log(`Board size: ${this.gameCore.size}x${this.gameCore.size}`);
        console.log(`Cell size: ${this.cellSize}px`);
        console.log(`Total connections: ${this.diagonalConnections.length}`);
        
        const stats = this.getStatistics();
        console.log('Statistics:', stats);
        
        console.log('Connections:');
        this.diagonalConnections.forEach((conn, i) => {
            console.log(`  ${i + 1}. ${conn.player} (${conn.row1},${conn.col1}) ↔ (${conn.row2},${conn.col2}) [${conn.type}]`);
        });
        
        console.log('=== END DEBUG ===');
    }
}

// Add CSS animation for diagonal lines (inject into document head)
function addDiagonalLineStyles() {
    if (document.getElementById('diagonal-line-styles')) return; // Already added
    
    const style = document.createElement('style');
    style.id = 'diagonal-line-styles';
    style.textContent = `
        @keyframes dash {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: 10; }
        }
        
        .diagonal-line {
            pointer-events: none;
        }
        
        .diagonal-line-x {
            stroke: #6c7b7f !important;
        }
        
        .diagonal-line-o {
            stroke: #708b75 !important;
        }
        
        .diagonal-main-diagonal {
            stroke-dasharray: 3,2;
        }
        
        .diagonal-anti-diagonal {
            stroke-dasharray: 4,1;
        }
    `;
    
    document.head.appendChild(style);
}

// Auto-inject styles when module loads
addDiagonalLineStyles();

// Export for use in other modules
window.ConnectionGameDiagonalLines = ConnectionGameDiagonalLines;