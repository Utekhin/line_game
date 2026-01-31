// game-diagonal-lines.js - FIXED: Proper Diagonal Line Detection with "First Locks Wins" Rule
// Handles detection and rendering of diagonal connections between immediately adjacent pieces
// CRITICAL FIX: Prevents later diagonals from crossing earlier established diagonals

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
        
        console.log('🔗 Diagonal Lines module initialized with crossing prevention');
    }

    // MAIN: Update diagonal lines display
    updateDiagonalLines(cellSize = null) {
        // Check if board state changed to avoid unnecessary updates
        const currentBoardState = JSON.stringify(this.gameCore.board);
        if (currentBoardState === this.lastBoardState) {
            return; // No changes, skip update
        }
        this.lastBoardState = currentBoardState;
        
        console.log('=== Updating Diagonal Lines with Rule Enforcement ===');
        
        // Find all current diagonal connections with proper rule enforcement
        this.diagonalConnections = this.findAllDiagonalConnections();
        
        console.log(`Found ${this.diagonalConnections.length} valid diagonal connections`);
        this.diagonalConnections.forEach((conn, index) => {
            console.log(`Connection ${index + 1}: ${conn.player} from (${conn.row1},${conn.col1}) to (${conn.row2},${conn.col2}) [move ${conn.establishedAtMove}]`);
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
        
        console.log(`🔗 Building diagonal connections from ${moveHistory.length} moves (chronological order)`);
        
        // Process moves in chronological order (CRITICAL for first-locks-wins)
        for (let moveIndex = 0; moveIndex < moveHistory.length; moveIndex++) {
            const move = moveHistory[moveIndex];
            console.log(`\n🔍 Processing move ${moveIndex + 1}: ${move.player} at (${move.row},${move.col})`);
            
            const newConnections = this.findNewConnectionsForMove(move, connections);
            connections.push(...newConnections);
            
            console.log(`  📊 Total connections after move ${moveIndex + 1}: ${connections.length}`);
        }
        
        // Also check any pieces not in history (fallback for direct board analysis)
        this.checkMissingPieces(moveHistory, connections);
        
        console.log(`\n🎯 Final diagonal connections: ${connections.length}`);
        connections.forEach((conn, i) => {
            console.log(`  ${i+1}. ${conn.player} (${conn.row1},${conn.col1})-(${conn.row2},${conn.col2}) [move ${conn.establishedAtMove}]`);
        });
        
        return connections;
    }

    // FIXED: Find new diagonal connections created by a specific move
    findNewConnectionsForMove(move, existingConnections) {
        const newConnections = [];
        const { row, col, player } = move;
        
        console.log(`🔗 Finding connections for ${player} move at (${row},${col})`);
        
        // Check all 4 diagonal directions from the new piece
        for (const [dr, dc] of this.diagonalDirections) {
            const adjacentRow = row + dr;
            const adjacentCol = col + dc;
            
            console.log(`  🔍 Checking direction [${dr},${dc}] → (${adjacentRow},${adjacentCol})`);
            
            // Check if adjacent position is valid and contains same player
            if (!this.gameCore.isValidPosition(adjacentRow, adjacentCol)) {
                console.log(`    ❌ Invalid position`);
                continue;
            }
            
            const adjacentContent = this.gameCore.board[adjacentRow][adjacentCol];
            if (adjacentContent !== player) {
                console.log(`    ➡️ Not same player (need ${player}, found "${adjacentContent}")`);
                continue;
            }
            
            // FIXED: Find when the adjacent piece was actually placed and use max
            const adjacentMoveNumber = this.findMoveNumberForPosition(adjacentRow, adjacentCol);
            const currentMoveNumber = move.moveNumber || this.gameCore.moveCount;
            const diagonalEstablishedAt = Math.max(adjacentMoveNumber, currentMoveNumber);
            
            console.log(`    📋 Adjacent piece at (${adjacentRow},${adjacentCol}) placed at move ${adjacentMoveNumber}`);
            console.log(`    📋 Current piece at (${row},${col}) placed at move ${currentMoveNumber}`);
            console.log(`    📋 Diagonal established at move ${diagonalEstablishedAt} (max of the two)`);
            
            // Create potential connection
            const connection = this.createOrderedConnection(
                row, col, 
                adjacentRow, adjacentCol, 
                player
            );
            connection.establishedAtMove = diagonalEstablishedAt;
            
            // Check if this connection already exists
            if (this.connectionExists(existingConnections, connection) || 
                this.connectionExists(newConnections, connection)) {
                console.log(`    ⭐ Connection already exists: (${connection.row1},${connection.col1})-(${connection.row2},${connection.col2})`);
                continue;
            }
            
            // CRITICAL: Check if this connection would cross any existing opponent lines
            const opponent = player === 'X' ? 'O' : 'X';
            const opponentConnections = existingConnections.filter(conn => conn.player === opponent);
            
            console.log(`    🔍 Checking against ${opponentConnections.length} existing ${opponent} connections`);
            
            if (this.wouldConnectionCrossOpponentLines(connection, opponentConnections)) {
                console.log(`    🚫 BLOCKED: ${player} connection (${row},${col}) ↔ (${adjacentRow},${adjacentCol}) crosses opponent line`);
                continue; // Skip this connection - it's blocked
            }
            
            newConnections.push(connection);
            console.log(`    ✅ ADDED: ${player} diagonal connection (${row},${col}) ↔ (${adjacentRow},${adjacentCol})`);
        }
        
        return newConnections;
    }

    // HELPER: Find when a specific position was placed
    findMoveNumberForPosition(row, col) {
        const moveHistory = this.gameCore.gameHistory || [];
        
        for (let i = 0; i < moveHistory.length; i++) {
            const move = moveHistory[i];
            if (move.row === row && move.col === col) {
                return move.moveNumber || (i + 1);
            }
        }
        
        // Fallback: assume it was placed recently
        return this.gameCore.moveCount || 1;
    }

    // FIXED: Enhanced connection crossing check with chronological ordering
    wouldConnectionCrossOpponentLines(newConnection, opponentConnections) {
        console.log(`🔍 Checking if ${newConnection.player} line (${newConnection.row1},${newConnection.col1})-(${newConnection.row2},${newConnection.col2}) crosses opponent lines`);
        
        for (let i = 0; i < opponentConnections.length; i++) {
            const opponentConn = opponentConnections[i];
            console.log(`  Checking against opponent line ${i+1}: ${opponentConn.player}(${opponentConn.row1},${opponentConn.col1})-(${opponentConn.row2},${opponentConn.col2})`);
            
            if (this.doLinesIntersect(newConnection, opponentConn)) {
                // FIXED: Check chronological order - "first locks wins"
                const newMoveNumber = newConnection.establishedAtMove || 999;
                const opponentMoveNumber = opponentConn.establishedAtMove || 0;
                
                console.log(`  📅 Chronological check: New move ${newMoveNumber} vs Opponent move ${opponentMoveNumber}`);
                
                if (newMoveNumber < opponentMoveNumber) {
                    // New connection was established earlier - it wins
                    console.log(`  ✅ NEW connection established first (${newMoveNumber} < ${opponentMoveNumber}) - allowing new connection`);
                    return false; // Don't block the new connection
                } else {
                    // Opponent connection was established earlier - opponent wins  
                    console.log(`  🚫 OPPONENT connection established first (${opponentMoveNumber} < ${newMoveNumber}) - blocking new connection`);
                    return true; // Block the new connection
                }
            }
        }
        
        console.log(`  ✅ Clear: No intersections found`);
        return false;
    }

    // FIXED: Improved line intersection detection
    doLinesIntersect(line1, line2) {
        // Get line endpoints
        const x1 = line1.col1, y1 = line1.row1;
        const x2 = line1.col2, y2 = line1.row2;
        const x3 = line2.col1, y3 = line2.row1;  
        const x4 = line2.col2, y4 = line2.row2;
        
        console.log(`🔍 Intersection test:`);
        console.log(`   Line1: (${x1},${y1})-(${x2},${y2}) [${line1.player}]`);
        console.log(`   Line2: (${x3},${y3})-(${x4},${y4}) [${line2.player}]`);
        
        // Check if lines share an endpoint (allowed - pieces can be adjacent)
        if ((x1 === x3 && y1 === y3) || (x1 === x4 && y1 === y4) ||
            (x2 === x3 && y2 === y3) || (x2 === x4 && y2 === y4)) {
            console.log(`  ✅ Lines share endpoint - allowed`);
            return false; // Sharing endpoint is allowed
        }
        
        // Use parametric line intersection test
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        
        // Lines are parallel
        if (Math.abs(denom) < 0.0001) {
            console.log(`  ➡️ Lines are parallel`);
            return false;
        }
        
        // Calculate intersection parameters
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        console.log(`   📐 Intersection parameters: t=${t.toFixed(3)}, u=${u.toFixed(3)}`);
        
        // Check if intersection point is within both line segments
        const intersects = (t > 0.01 && t < 0.99) && (u > 0.01 && u < 0.99);
        
        if (intersects) {
            const intersectX = x1 + t * (x2 - x1);
            const intersectY = y1 + t * (y2 - y1);
            console.log(`  ⚠️ INTERSECTION DETECTED at (${intersectX.toFixed(1)}, ${intersectY.toFixed(1)})`);
        } else {
            console.log(`  ✅ No intersection (t=${t.toFixed(3)}, u=${u.toFixed(3)})`);
        }
        
        return intersects;
    }

    // Enhanced: Check for pieces not in history
    checkMissingPieces(moveHistory, connections) {
        const historyPositions = new Set(moveHistory.map(m => `${m.row}-${m.col}`));
        
        ['X', 'O'].forEach(player => {
            try {
                if (typeof this.gameCore.getPlayerPositions === 'function') {
                    const playerPositions = this.gameCore.getPlayerPositions(player);
                    if (Array.isArray(playerPositions)) {
                        for (const pos of playerPositions) {
                            const posKey = `${pos.row}-${pos.col}`;
                            if (!historyPositions.has(posKey)) {
                                console.log(`🔍 Found piece not in history: ${player} at (${pos.row},${pos.col})`);
                                // This piece wasn't found in history, check it as if it were placed now
                                const move = { 
                                    row: pos.row, 
                                    col: pos.col, 
                                    player: player, 
                                    moveNumber: 999 
                                };
                                const newConnections = this.findNewConnectionsForMove(move, connections);
                                connections.push(...newConnections);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`Error getting positions for player ${player}:`, error);
            }
        });
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

    // Get actual cell center coordinates from DOM
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
            y: centerY - paddingTop
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

    // PUBLIC API: Force update (useful for external calls)
    forceUpdate(cellSize = null) {
        this.lastBoardState = null; // Force update
        this.updateDiagonalLines(cellSize);
    }

    // Enhanced debugging method
    analyzeBlocking() {
        const xConnections = this.diagonalConnections.filter(c => c.player === 'X');
        const oConnections = this.diagonalConnections.filter(c => c.player === 'O');
        
        console.log('\n🔍 === DIAGONAL LINE BLOCKING ANALYSIS ===');
        console.log('X connections:', xConnections.length);
        console.log('O connections:', oConnections.length);
        
        console.log('\n⚠️ Lines that WOULD block others (if established later):');
        xConnections.forEach((xConn, i) => {
            const blocked = [];
            oConnections.forEach((oConn, j) => {
                if ((oConn.establishedAtMove || 999) > (xConn.establishedAtMove || 999) && 
                    this.doLinesIntersect(xConn, oConn)) {
                    blocked.push(`O${j+1}(${oConn.row1},${oConn.col1})-(${oConn.row2},${oConn.col2})`);
                }
            });
            if (blocked.length > 0) {
                console.log(`  X${i+1}(${xConn.row1},${xConn.col1})-(${xConn.row2},${xConn.col2}) [move ${xConn.establishedAtMove}] blocks: ${blocked.join(', ')}`);
            }
        });
        
        oConnections.forEach((oConn, i) => {
            const blocked = [];
            xConnections.forEach((xConn, j) => {
                if ((xConn.establishedAtMove || 999) > (oConn.establishedAtMove || 999) && 
                    this.doLinesIntersect(oConn, xConn)) {
                    blocked.push(`X${j+1}(${xConn.row1},${xConn.col1})-(${xConn.row2},${xConn.col2})`);
                }
            });
            if (blocked.length > 0) {
                console.log(`  O${i+1}(${oConn.row1},${oConn.col1})-(${oConn.row2},${oConn.col2}) [move ${oConn.establishedAtMove}] blocks: ${blocked.join(', ')}`);
            }
        });
        
        console.log('🔍 === END BLOCKING ANALYSIS ===\n');
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

    // UTILITY: Debug information
    debugPrint() {
        console.log('=== DIAGONAL LINES DEBUG ===');
        console.log(`Board size: ${this.gameCore.size}x${this.gameCore.size}`);
        console.log(`Total connections: ${this.diagonalConnections.length}`);
        
        const stats = this.getStatistics();
        console.log('Statistics:', stats);
        
        console.log('Connections:');
        this.diagonalConnections.forEach((conn, i) => {
            console.log(`  ${i + 1}. ${conn.player} (${conn.row1},${conn.col1}) ↔ (${conn.row2},${conn.col2}) [${conn.type}] move:${conn.establishedAtMove}`);
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
            vector-effect: non-scaling-stroke;
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

