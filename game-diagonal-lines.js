// game-diagonal-lines.js - FIXED: Proper Diagonal Blocking Integration
// This addresses the core issue: diagonal connections crossing existing opponent diagonals

class ConnectionGameDiagonalLines {
    constructor(gameCore, svgElement) {
        this.gameCore = gameCore;
        this.svgElement = svgElement;
        this.diagonalConnections = [];
        this.lastBoardState = null;
        this.lastMoveCount = -1;
        
        // Diagonal direction vectors (4 diagonal directions)
        this.diagonalDirections = [
            [-1, -1], // Top-left
            [-1, 1],  // Top-right  
            [1, -1],  // Bottom-left
            [1, 1]    // Bottom-right
        ];
        
        this.initializeSVG();
        console.log('🔗 FIXED Diagonal Lines with proper blocking integration');
    }

    // FIXED: Proper SVG initialization
    initializeSVG() {
        if (!this.svgElement) {
            console.warn('SVG element not found');
            return;
        }
        
        this.svgElement.style.position = 'absolute';
        this.svgElement.style.top = '0';
        this.svgElement.style.left = '0';
        this.svgElement.style.pointerEvents = 'none';
        this.svgElement.style.zIndex = '10';
        
        console.log('✅ SVG initialized with proper styling');
    }

    // MAIN: Update diagonal lines display - FIXED with blocking validation
    updateDiagonalLines(cellSize = null) {
    if (!this.svgElement) {
        console.warn('No SVG element available for diagonal lines');
        return;
    }
    const currentBoardState = JSON.stringify(this.gameCore.board);
    const currentMoveCount = this.gameCore.moveCount || 0;
    
    if (this.lastBoardState === currentBoardState && this.lastMoveCount === currentMoveCount) {
        return; // No change, skip update
    }
    
    console.log(`🔄 Updating diagonal lines for move ${currentMoveCount}`);

    // OPTIMIZATION FIX: Don't check diagonal connections until move 3
    if (currentMoveCount < 3) {
        console.log(`⏭️ Diagonal check skipped - too early (move ${currentMoveCount} < 3)`);
        // Clear any existing lines and update tracking
        this.svgElement.innerHTML = '';
        this.diagonalConnections = [];
        this.lastBoardState = currentBoardState;
        this.lastMoveCount = currentMoveCount;
        return;
    }

    // Clear existing lines
    this.svgElement.innerHTML = '';
    
    // FIXED: Find diagonal connections with proper blocking validation
    this.diagonalConnections = this.findValidDiagonalConnections();
    
    // Update tracking
    this.lastBoardState = currentBoardState;
    this.lastMoveCount = currentMoveCount;
    
    if (this.diagonalConnections.length === 0) {
        console.log('🔍 No valid diagonal connections to draw');
        return;
    }
    
    this.renderDiagonalLines();
    console.log(`✅ Successfully rendered ${this.svgElement.children.length} valid diagonal line elements`);
}
    // FIXED: Find diagonal connections with proper blocking validation
    findValidDiagonalConnections() {
        const validConnections = [];
        const board = this.gameCore.board;
        
        if (!board) {
            console.warn('No board available for diagonal detection');
            return validConnections;
        }
        
        console.log('🔍 Finding valid diagonal connections with blocking checks...');
        
        for (let row = 0; row < 15; row++) {
            for (let col = 0; col < 15; col++) {
                const player = board[row][col];
                if (!player) continue;
                
                // Check all 4 diagonal directions
                this.diagonalDirections.forEach(([dr, dc]) => {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    
                    // Skip if out of bounds
                    if (newRow < 0 || newRow >= 15 || newCol < 0 || newCol >= 15) {
                        return;
                    }
                    
                    // Skip if not same player
                    if (board[newRow][newCol] !== player) {
                        return;
                    }
                    
                    // CRITICAL FIX: Check if this diagonal connection is blocked
                    const pos1 = { row, col };
                    const pos2 = { row: newRow, col: newCol };
                    
                    if (this.isDiagonalConnectionBlocked(pos1, pos2, player)) {
                        console.log(`❌ Diagonal ${player} (${row},${col}) → (${newRow},${newCol}) BLOCKED by opponent`);
                        return; // Skip this blocked connection
                    }
                    
                    // Create ordered connection to avoid duplicates
                    const connection = this.createOrderedConnection(row, col, newRow, newCol, player);
                    
                    // Check if this connection already exists
                    if (!this.connectionExists(validConnections, connection)) {
                        validConnections.push(connection);
                        console.log(`✅ Valid diagonal: ${player} (${row},${col}) to (${newRow},${newCol})`);
                    }
                });
            }
        }
        
        console.log(`✅ Found ${validConnections.length} valid diagonal connections (after blocking checks)`);
        return validConnections;
    }

    // CRITICAL FIX: Check if diagonal connection is blocked by opponent
    isDiagonalConnectionBlocked(pos1, pos2, player) {
        // Use the existing diagonal blocking logic from gameCore
        if (typeof this.gameCore.isDiagonalBlocked === 'function') {
            const opponent = player === 'X' ? 'O' : 'X';
            return this.gameCore.isDiagonalBlocked(pos1, pos2, opponent);
        }
        
        // FALLBACK: Basic blocking check if gameCore method not available
        return this.basicDiagonalBlockingCheck(pos1, pos2, player);
    }

    // FALLBACK: Basic diagonal blocking implementation
    basicDiagonalBlockingCheck(pos1, pos2, player) {
        const opponent = player === 'X' ? 'O' : 'X';
        const board = this.gameCore.board;
        
        // For diagonal from (r1,c1) to (r2,c2), check crossing cells
        const crossCell1 = { row: pos1.row, col: pos2.col };
        const crossCell2 = { row: pos2.row, col: pos1.col };
        
        // Check if opponent occupies both crossing cells
        const hasCross1 = board[crossCell1.row] && 
                         board[crossCell1.row][crossCell1.col] === opponent;
        const hasCross2 = board[crossCell2.row] && 
                         board[crossCell2.row][crossCell2.col] === opponent;
        
        // If opponent has both crossing cells, check timing
        if (hasCross1 && hasCross2) {
            return this.checkTimingPriority(pos1, pos2, crossCell1, crossCell2, opponent);
        }
        
        return false;
    }

    // TIMING CHECK: Who established the diagonal first
    checkTimingPriority(pos1, pos2, crossCell1, crossCell2, opponent) {
        const gameHistory = this.gameCore.gameHistory;
        if (!gameHistory || gameHistory.length === 0) {
            return false; // No history, allow connection
        }
        
        // Find when each piece was placed
        let pos1Time = -1, pos2Time = -1;
        let cross1Time = -1, cross2Time = -1;
        
        for (let i = 0; i < gameHistory.length; i++) {
            const move = gameHistory[i];
            
            if (move.row === pos1.row && move.col === pos1.col) pos1Time = i;
            if (move.row === pos2.row && move.col === pos2.col) pos2Time = i;
            if (move.row === crossCell1.row && move.col === crossCell1.col) cross1Time = i;
            if (move.row === crossCell2.row && move.col === crossCell2.col) cross2Time = i;
        }
        
        // Diagonal is established when second piece is placed
        const myDiagonalTime = Math.max(pos1Time, pos2Time);
        const opponentDiagonalTime = Math.max(cross1Time, cross2Time);
        
        // If pieces don't exist in history, no blocking
        if (pos1Time === -1 || pos2Time === -1 || cross1Time === -1 || cross2Time === -1) {
            return false;
        }
        
        // If opponent's diagonal was established first, it blocks
        const isBlocked = opponentDiagonalTime < myDiagonalTime;
        
        if (isBlocked) {
            console.log(`⏰ Diagonal blocked by timing: opponent established at move ${opponentDiagonalTime}, ours at ${myDiagonalTime}`);
        }
        
        return isBlocked;
    }

    // FIXED: Simplified and more reliable SVG rendering
    renderDiagonalLines() {
        if (!this.svgElement) {
            console.warn('SVG element not found for diagonal lines');
            return;
        }
        
        const boardElement = document.querySelector('.board-grid');
        if (!boardElement) {
            console.warn('Board grid not found');
            return;
        }
        
        const boardRect = boardElement.getBoundingClientRect();
        const containerRect = this.svgElement.parentElement.getBoundingClientRect();
        
        // Calculate relative positioning
        const offsetX = boardRect.left - containerRect.left;
        const offsetY = boardRect.top - containerRect.top;
        
        this.svgElement.setAttribute('width', boardRect.width);
        this.svgElement.setAttribute('height', boardRect.height);
        this.svgElement.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
        
        // Position SVG to overlay the board exactly
        this.svgElement.style.left = `${offsetX}px`;
        this.svgElement.style.top = `${offsetY}px`;
        
        console.log(`📐 SVG positioned at (${offsetX}, ${offsetY}) with size ${boardRect.width}x${boardRect.height}`);
        
        // Draw each valid connection
        this.diagonalConnections.forEach((connection, index) => {
            this.drawDiagonalLine(connection, index, boardRect);
        });
    }

    // FIXED: Simplified line drawing
    drawDiagonalLine(connection, index, boardRect) {
        const cellCenter1 = this.getCellCenterSimplified(connection.row1, connection.col1, boardRect);
        const cellCenter2 = this.getCellCenterSimplified(connection.row2, connection.col2, boardRect);
        
        if (!cellCenter1 || !cellCenter2) {
            console.warn(`Could not calculate centers for connection ${index + 1}`);
            return;
        }
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        
        line.setAttribute('x1', cellCenter1.x);
        line.setAttribute('y1', cellCenter1.y);
        line.setAttribute('x2', cellCenter2.x);
        line.setAttribute('y2', cellCenter2.y);
        
        // Styling
        const strokeColor = connection.player === 'X' ? '#2196F3' : '#4CAF50';
        line.setAttribute('stroke', strokeColor);
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-opacity', '0.8');
        line.setAttribute('stroke-linecap', 'round');
        
        // Add CSS classes
        line.classList.add('diagonal-line');
        line.classList.add(`diagonal-line-${connection.player.toLowerCase()}`);
        
        try {
            this.svgElement.appendChild(line);
            console.log(`✅ Drew valid diagonal line: ${connection.player} (${connection.row1},${connection.col1}) → (${connection.row2},${connection.col2})`);
        } catch (error) {
            console.error(`Failed to add line to SVG:`, error);
        }
    }

    // FIXED: Simplified coordinate calculation
    getCellCenterSimplified(row, col, boardRect) {
        const cellWidth = boardRect.width / 15;
        const cellHeight = boardRect.height / 15;
        
        const centerX = (col + 0.5) * cellWidth;
        const centerY = (row + 0.5) * cellHeight;
        
        return { x: centerX, y: centerY };
    }

    // Create ordered connection (smaller coordinates first)
    createOrderedConnection(row1, col1, row2, col2, player) {
        if (row1 < row2 || (row1 === row2 && col1 < col2)) {
            return {
                row1: row1, col1: col1,
                row2: row2, col2: col2,
                player: player,
                type: this.getDiagonalType(row1, col1, row2, col2)
            };
        } else {
            return {
                row1: row2, col1: col2,
                row2: row1, col2: col1,
                player: player,
                type: this.getDiagonalType(row2, col2, row1, col1)
            };
        }
    }

    // Check if connection already exists
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
        
        if (rowDiff > 0 && colDiff > 0) return 'main-diagonal';
        if (rowDiff > 0 && colDiff < 0) return 'anti-diagonal';
        if (rowDiff < 0 && colDiff > 0) return 'anti-diagonal';
        if (rowDiff < 0 && colDiff < 0) return 'main-diagonal';
        
        return 'unknown';
    }

    // PUBLIC API: Clear all diagonal lines
    clear() {
        this.diagonalConnections = [];
        this.lastBoardState = null;
        if (this.svgElement) {
            this.svgElement.innerHTML = '';
        }
        console.log('✅ Diagonal lines cleared');
    }

    // PUBLIC API: Force update
    forceUpdate(cellSize = null) {
        this.lastBoardState = null;
        this.updateDiagonalLines(cellSize);
    }

    // PUBLIC API: Get diagonal connections
    getDiagonalConnections() {
        return [...this.diagonalConnections];
    }

    // PUBLIC API: Get player connections
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
        return {
            totalConnections: this.diagonalConnections.length,
            xConnections: this.diagonalConnections.filter(c => c.player === 'X').length,
            oConnections: this.diagonalConnections.filter(c => c.player === 'O').length,
            mainDiagonals: this.diagonalConnections.filter(c => c.type === 'main-diagonal').length,
            antiDiagonals: this.diagonalConnections.filter(c => c.type === 'anti-diagonal').length
        };
    }
}

// FIXED: Simplified CSS injection
function addDiagonalLineStyles() {
    if (document.getElementById('diagonal-line-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'diagonal-line-styles';
    style.textContent = `
        .diagonal-line {
            pointer-events: none;
            vector-effect: non-scaling-stroke;
        }
        
        .diagonal-line-x {
            stroke: #6c7b7f !important;
            stroke-width: 3px !important;
        }
        
        .diagonal-line-o {
            stroke: #708b75 !important;
            stroke-width: 3px !important;
        }
        
        #diagonal-lines-svg {
            position: absolute !important;
            pointer-events: none !important;
            z-index: 10 !important;
        }
    `;
    
    document.head.appendChild(style);
    console.log('✅ Diagonal line styles injected');
}

// Auto-inject styles
addDiagonalLineStyles();

// Export for use in other modules
window.ConnectionGameDiagonalLines = ConnectionGameDiagonalLines;