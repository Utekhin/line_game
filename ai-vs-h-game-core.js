// ai-vs-h-game-core.js - Complete Updated Version with Player-Independent Win Detection
// Connection Game Core with clean, reliable win detection for both X and O players
// Version: 2.0 - Production Ready

class ConnectionGameCore {
    constructor(size = 15) {
        this.size = size;
        this.board = [];
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.gameHistory = [];
        this.moveCount = 0;
        this.lastMove = null;
        
        // Module dependencies (injected during initialization)
        this.geometry = null;
        this.connections = null;
        this.patterns = null;
        this.analyzer = null;
        
        // System integrations
        this.gapRegistry = null;
        this.diagonalLinesManager = null;
        
        // Core settings
        this.settings = {
            minMovesForWin: 29, // Earliest possible win (X needs 15 pieces on odd moves)
            enableDebugLogging: false,
            enableWinDetection: true
        };
        
        this.initializeBoard();
        console.log(`🎮 Connection Game Core v2.0 initialized (${size}x${size})`);
        console.log(`🎯 Player-independent win detection enabled`);
    }

    // ===== BOARD INITIALIZATION & MANAGEMENT =====
    
    initializeBoard() {
        this.board = [];
        for (let row = 0; row < this.size; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.size; col++) {
                this.board[row][col] = '';
            }
        }
        this.log(`📋 Board initialized (${this.size}x${this.size})`);
    }

    resetGame(newSize = null) {
        if (newSize && newSize !== this.size) {
            this.size = newSize;
        }
        
        this.initializeBoard();
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.gameHistory = [];
        this.moveCount = 0;
        this.lastMove = null;
        
        // Reset connected systems
        if (this.gapRegistry && typeof this.gapRegistry.reset === 'function') {
            this.gapRegistry.reset();
        }
        
        if (this.diagonalLinesManager && typeof this.diagonalLinesManager.clear === 'function') {
            this.diagonalLinesManager.clear();
        }
        
        console.log(`🔄 Game reset (${this.size}x${this.size})`);
    }

    // ===== MODULE INTEGRATION =====
    
    /**
     * Connect universal modules for enhanced functionality
     */
    initializeModules(geometry, connections, patterns, analyzer) {
        this.geometry = geometry;
        this.connections = connections;
        this.patterns = patterns;
        this.analyzer = analyzer;
        
        const hasModules = this.hasModules();
        if (hasModules) {
            console.log('🔗 Universal modules connected successfully');
        } else {
            console.warn('⚠️ Some modules not available - using fallback methods');
        }
        
        return { success: hasModules };
    }
    
    hasModules() {
        return !!(this.geometry && this.connections);
    }
    
    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        console.log('🔗 Gap registry connected to game core');
    }
    
    setDiagonalLinesManager(diagonalLinesManager) {
        this.diagonalLinesManager = diagonalLinesManager;
        console.log('🔗 Diagonal lines manager connected to game core');
    }

    // ===== MOVE HANDLING =====
    
    makeMove(row, col, player) {
        console.log(`🎯 Attempting move: ${player} at (${row},${col})`);
        
        // Validation
        const validationResult = this.validateMove(row, col, player);
        if (!validationResult.success) {
            console.log(`❌ Move validation failed: ${validationResult.reason}`);
            return validationResult;
        }

        // Execute the move
        this.board[row][col] = player;
        this.moveCount++;
        this.lastMove = { row, col, player, moveNumber: this.moveCount };

        // Record in history
        this.gameHistory.push({
            row: row,
            col: col,
            player: player,
            moveNumber: this.moveCount,
            timestamp: Date.now()
        });

        this.log(`✅ Move ${this.moveCount}: ${player} → (${row},${col})`);

        // Update connected systems
        this.updateSystemsAfterMove(row, col, player);

        // Check for win condition
        const winResult = this.settings.enableWinDetection ? 
            this.checkWin(player) : 
            { isWin: false, reason: 'Win detection disabled' };
        
        let gameOver = false;
        let winner = null;

        if (winResult.isWin) {
            this.gameOver = true;
            gameOver = true;
            winner = player;
            console.log(`🎉 ${player} WINS! ${winResult.reason}`);
            if (winResult.path) {
                console.log(`📊 Winning path: ${winResult.path.length} connected pieces`);
            }
        }

        // Switch players
        this.currentPlayer = player === 'X' ? 'O' : 'X';

        return {
            success: true,
            gameOver: gameOver,
            winner: winner,
            winResult: winResult,
            row: row,
            col: col,
            player: player,
            moveNumber: this.moveCount
        };
    }
    
    validateMove(row, col, player) {
        // Check position validity
        if (!this.isValidPosition(row, col)) {
            return { 
                success: false, 
                reason: 'Position out of bounds',
                row: row,
                col: col,
                player: player 
            };
        }

        // Check if position is occupied
        if (this.board[row][col] !== '') {
            return { 
                success: false, 
                reason: 'Position already occupied',
                row: row,
                col: col,
                player: player 
            };
        }

        // Check if game is over
        if (this.gameOver) {
            return { 
                success: false, 
                reason: 'Game is already over',
                row: row,
                col: col,
                player: player 
            };
        }

        // Check if it's the player's turn
        if (player !== this.currentPlayer) {
            return { 
                success: false, 
                reason: `Not ${player}'s turn (current: ${this.currentPlayer})`,
                row: row,
                col: col,
                player: player 
            };
        }

        return { success: true };
    }
    
    updateSystemsAfterMove(row, col, player) {
        // Update gap registry
        if (this.gapRegistry && typeof this.gapRegistry.updateGapStatus === 'function') {
            try {
                this.gapRegistry.updateGapStatus(row, col, player);
            } catch (error) {
                console.warn(`⚠️ Gap registry update failed: ${error.message}`);
            }
        }

        // Update diagonal lines
        if (this.diagonalLinesManager && typeof this.diagonalLinesManager.updateDiagonalLines === 'function') {
            try {
                setTimeout(() => this.diagonalLinesManager.updateDiagonalLines(), 10);
            } catch (error) {
                console.warn(`⚠️ Diagonal lines update failed: ${error.message}`);
            }
        }

        // Invalidate module caches
        if (this.connections) {
            this.connections.invalidateCache && this.connections.invalidateCache();
        }
        if (this.patterns) {
            this.patterns.invalidateCache && this.patterns.invalidateCache();
        }
        if (this.analyzer) {
            this.analyzer.invalidateCache && this.analyzer.invalidateCache();
        }
    }
//=====

wouldMoveCrossOpponentDiagonal(fromPos, toPos, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    
    // Get all existing opponent diagonal connections
    const opponentDiagonals = this.getExistingDiagonalConnections(opponent);
    
    // Check if the line from fromPos to toPos would cross any opponent diagonal
    for (const diagonal of opponentDiagonals) {
        if (this.doLinesIntersect(fromPos, toPos, diagonal.pos1, diagonal.pos2)) {
            this.log(`Chain extension from (${fromPos.row},${fromPos.col}) to (${toPos.row},${toPos.col}) would cross ${opponent} diagonal`);
            return true;
        }
    }
    
    return false;
}

/**
 * Get existing diagonal connections for a player
 */
getExistingDiagonalConnections(player) {
    const diagonals = [];
    
    for (let row = 0; row < this.size; row++) {
        for (let col = 0; col < this.size; col++) {
            if (this.board[row][col] === player) {
                // Check diagonal directions
                const diagonalDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                
                for (const [dr, dc] of diagonalDirs) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    
                    if (this.isValidPosition(newRow, newCol) && 
                        this.board[newRow][newCol] === player) {
                        
                        const pos1 = { row, col };
                        const pos2 = { row: newRow, col: newCol };
                        
                        // Only include if this diagonal was established first (timing check)
                        if (!this.isDiagonalBlockedByTiming(pos1, pos2, player)) {
                            // Avoid duplicates - only add if pos1 comes before pos2 in grid order
                            if (row < newRow || (row === newRow && col < newCol)) {
                                diagonals.push({ pos1, pos2, player });
                            }
                        }
                    }
                }
            }
        }
    }
    
    return diagonals;
}

/**
 * Check if diagonal is blocked by timing (who was first)
 */
isDiagonalBlockedByTiming(pos1, pos2, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    
    // Check crossing cells for opponent diagonal
    const crossCell1 = { row: pos1.row, col: pos2.col };
    const crossCell2 = { row: pos2.row, col: pos1.col };
    
    const hasCross1 = this.board[crossCell1.row] && 
                     this.board[crossCell1.row][crossCell1.col] === opponent;
    const hasCross2 = this.board[crossCell2.row] && 
                     this.board[crossCell2.row][crossCell2.col] === opponent;
    
    if (hasCross1 && hasCross2) {
        // Check timing using existing method
        if (typeof this.checkDiagonalTimingPriority === 'function') {
            const timingResult = this.checkDiagonalTimingPriority(pos1, pos2, crossCell1, crossCell2, opponent);
            return timingResult.opponentFirst;
        }
    }
    
    return false; // If no crossing or timing check unavailable, allow diagonal
}

/**
 * Check if two lines intersect (simplified for chain extension checking)
 */
doLinesIntersect(line1Start, line1End, line2Start, line2End) {
    // Simplified intersection check for chain extension paths crossing diagonals
    
    // Get all points along both lines
    const line1Path = this.getPathBetweenPoints(line1Start, line1End);
    const line2Path = this.getPathBetweenPoints(line2Start, line2End);
    
    // Check if any points intersect
    for (const point1 of line1Path) {
        for (const point2 of line2Path) {
            if (point1.row === point2.row && point1.col === point2.col) {
                return true; // Lines intersect at this point
            }
        }
    }
    
    return false;
}

/**
 * Get path between two points (for intersection checking)
 */
getPathBetweenPoints(start, end) {
    const path = [];
    const rowDiff = end.row - start.row;
    const colDiff = end.col - start.col;
    const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    
    if (steps === 0) {
        return [start];
    }
    
    const rowStep = rowDiff / steps;
    const colStep = colDiff / steps;
    
    for (let i = 0; i <= steps; i++) {
        path.push({
            row: Math.round(start.row + i * rowStep),
            col: Math.round(start.col + i * colStep)
        });
    }
    
    return path;
}

    // ===== PLAYER-INDEPENDENT WIN DETECTION =====
    
    /**
     * Main win detection method - works for both X and O players
     * @param {string} player - 'X' or 'O'
     * @returns {object} - { isWin: boolean, reason: string, path?: array }
     */
    checkWin(player) {
        const moveNumber = this.gameHistory.length;
        
        // Step 1: Check if minimum moves reached
        if (moveNumber < this.settings.minMovesForWin) {
            this.log(`🚫 Win check disabled (move ${moveNumber} < ${this.settings.minMovesForWin})`);
            return { 
                isWin: false, 
                reason: `Too early (move ${moveNumber}/${this.settings.minMovesForWin})` 
            };
        }
        
        this.log(`🏆 Checking win for ${player} at move ${moveNumber}...`);
        
        // Step 2: Get all player positions
        const positions = this.getPlayerPositions(player);
        if (positions.length === 0) {
            return { isWin: false, reason: 'No pieces on board' };
        }
        
        const isX = player === 'X';
        
        // Step 3: Check border presence (both borders required)
        const borderCheck = this.checkBorderPresence(positions, isX);
        if (!borderCheck.hasBothBorders) {
            this.log(`❌ Missing border connection: ${borderCheck.reason}`);
            return { 
                isWin: false, 
                reason: borderCheck.reason 
            };
        }
        
        // Step 4: Check complete coverage (all rows for X, all columns for O)
        const coverageCheck = this.checkCompleteCoverage(positions, isX);
        if (!coverageCheck.hasCompleteCoverage) {
            this.log(`❌ Incomplete coverage: ${coverageCheck.reason}`);
            return { 
                isWin: false, 
                reason: coverageCheck.reason 
            };
        }
        
        // Step 5: Find connected path from border to border
        const pathResult = this.findConnectedBorderPath(positions, player, isX);
        
        if (pathResult.hasPath) {
            this.log(`✅ WIN CONFIRMED! ${pathResult.reason}`);
            return {
                isWin: true,
                reason: pathResult.reason,
                path: pathResult.path,
                pathLength: pathResult.path.length
            };
        } else {
            this.log(`❌ No connected path: ${pathResult.reason}`);
            return {
                isWin: false,
                reason: pathResult.reason
            };
        }
    }
    
    /**
     * Check if player has pieces on both target borders
     */
    checkBorderPresence(positions, isX) {
        let startBorderPieces = [];
        let endBorderPieces = [];
        
        if (isX) {
            // X connects top (row 0) to bottom (row 14)
            startBorderPieces = positions.filter(p => p.row === 0);
            endBorderPieces = positions.filter(p => p.row === this.size - 1);
        } else {
            // O connects left (col 0) to right (col 14)
            startBorderPieces = positions.filter(p => p.col === 0);
            endBorderPieces = positions.filter(p => p.col === this.size - 1);
        }
        
        const hasStartBorder = startBorderPieces.length > 0;
        const hasEndBorder = endBorderPieces.length > 0;
        
        if (!hasStartBorder && !hasEndBorder) {
            return {
                hasBothBorders: false,
                reason: `No pieces on either ${isX ? 'top/bottom' : 'left/right'} border`
            };
        } else if (!hasStartBorder) {
            return {
                hasBothBorders: false,
                reason: `No pieces on ${isX ? 'top (row 0)' : 'left (col 0)'} border`
            };
        } else if (!hasEndBorder) {
            return {
                hasBothBorders: false,
                reason: `No pieces on ${isX ? 'bottom (row 14)' : 'right (col 14)'} border`
            };
        }
        
        return {
            hasBothBorders: true,
            startBorderPieces,
            endBorderPieces
        };
    }
    
    /**
     * Check if player has at least one piece on all rows (X) or columns (O)
     */
    checkCompleteCoverage(positions, isX) {
        const coverage = new Set();
        
        if (isX) {
            // X needs coverage of all rows (0-14)
            positions.forEach(p => coverage.add(p.row));
            
            const missingRows = [];
            for (let row = 0; row < this.size; row++) {
                if (!coverage.has(row)) {
                    missingRows.push(row);
                }
            }
            
            if (missingRows.length > 0) {
                return {
                    hasCompleteCoverage: false,
                    reason: `Missing rows: [${missingRows.join(', ')}]`
                };
            }
        } else {
            // O needs coverage of all columns (0-14)
            positions.forEach(p => coverage.add(p.col));
            
            const missingCols = [];
            for (let col = 0; col < this.size; col++) {
                if (!coverage.has(col)) {
                    missingCols.push(col);
                }
            }
            
            if (missingCols.length > 0) {
                return {
                    hasCompleteCoverage: false,
                    reason: `Missing columns: [${missingCols.join(', ')}]`
                };
            }
        }
        
        return {
            hasCompleteCoverage: true,
            coverage: Array.from(coverage).sort((a, b) => a - b)
        };
    }
    
    /**
     * Find a connected path from start border to end border
     * Uses BFS to traverse connected pieces
     */
    findConnectedBorderPath(positions, player, isX) {
        // Get border pieces
        const startBorderPieces = positions.filter(p => 
            isX ? p.row === 0 : p.col === 0
        );
        const endBorderPositions = new Set(
            positions.filter(p => 
                isX ? p.row === this.size - 1 : p.col === this.size - 1
            ).map(p => `${p.row},${p.col}`)
        );
        
        // Create position lookup for quick checks
        const positionSet = new Set(positions.map(p => `${p.row},${p.col}`));
        
        // Try to find path from each start border piece
        for (const startPiece of startBorderPieces) {
            const path = this.bfsPath(
                startPiece, 
                endBorderPositions, 
                positionSet, 
                player
            );
            
            if (path) {
                const endPiece = path[path.length - 1];
                return {
                    hasPath: true,
                    reason: `Connected path from ${isX ? 'top' : 'left'} (${startPiece.row},${startPiece.col}) to ${isX ? 'bottom' : 'right'} (${endPiece.row},${endPiece.col})`,
                    path: path
                };
            }
        }
        
        return {
            hasPath: false,
            reason: `No connected path found between ${isX ? 'top and bottom' : 'left and right'} borders`
        };
    }
    
    /**
     * BFS to find connected path
     */
    bfsPath(start, endPositions, validPositions, player) {
        const visited = new Set();
        const queue = [{
            pos: start,
            path: [start]
        }];
        const startKey = `${start.row},${start.col}`;
        visited.add(startKey);
        
        while (queue.length > 0) {
            const current = queue.shift();
            const currentKey = `${current.pos.row},${current.pos.col}`;
            
            // Check if we reached the end border
            if (endPositions.has(currentKey)) {
                return current.path;
            }
            
            // Get all valid adjacent positions
            const adjacentPositions = this.getValidAdjacentPositions(
                current.pos, 
                validPositions, 
                visited, 
                player
            );
            
            for (const adjPos of adjacentPositions) {
                const adjKey = `${adjPos.row},${adjPos.col}`;
                visited.add(adjKey);
                queue.push({
                    pos: adjPos,
                    path: [...current.path, adjPos]
                });
            }
        }
        
        return null; // No path found
    }
    
    /**
     * Get valid adjacent positions (considering diagonal blocking)
     */
    getValidAdjacentPositions(position, validPositions, visited, player) {
        const adjacent = [];
        const opponent = player === 'X' ? 'O' : 'X';
        
        // All 8 directions: lateral (4) + diagonal (4)
        const directions = [
            { dr: -1, dc: 0, type: 'lateral' },  // North
            { dr: 1, dc: 0, type: 'lateral' },   // South
            { dr: 0, dc: -1, type: 'lateral' },  // West
            { dr: 0, dc: 1, type: 'lateral' },   // East
            { dr: -1, dc: -1, type: 'diagonal' }, // NW
            { dr: -1, dc: 1, type: 'diagonal' },  // NE
            { dr: 1, dc: -1, type: 'diagonal' },  // SW
            { dr: 1, dc: 1, type: 'diagonal' }    // SE
        ];
        
        for (const dir of directions) {
            const newRow = position.row + dir.dr;
            const newCol = position.col + dir.dc;
            const newKey = `${newRow},${newCol}`;
            
            // Skip if already visited
            if (visited.has(newKey)) continue;
            
            // Skip if not a valid player position
            if (!validPositions.has(newKey)) continue;
            
            // For diagonal connections, check if blocked by opponent's diagonal
            if (dir.type === 'diagonal') {
                if (this.isDiagonalBlocked(position, { row: newRow, col: newCol }, opponent)) {
                    this.log(`  Diagonal (${position.row},${position.col}) → (${newRow},${newCol}) blocked by ${opponent}`);
                    continue; // Skip blocked diagonal
                }
            }
            
            adjacent.push({ row: newRow, col: newCol });
        }
        
        return adjacent;
    }
    
    /**
     * Check if diagonal connection is blocked by opponent's diagonal
     */
    isDiagonalBlocked(pos1, pos2, opponent) {
        // A diagonal is blocked if the opponent has both pieces in the crossing pattern
        // For diagonal from (r1,c1) to (r2,c2), the crossing cells are:
        // (r1,c2) and (r2,c1)
        
        const crossCell1 = { row: pos1.row, col: pos2.col };
        const crossCell2 = { row: pos2.row, col: pos1.col };
        
        // Check if opponent occupies both crossing cells
        const hasCross1 = this.board[crossCell1.row] && 
                         this.board[crossCell1.row][crossCell1.col] === opponent;
        const hasCross2 = this.board[crossCell2.row] && 
                         this.board[crossCell2.row][crossCell2.col] === opponent;
        
        // If opponent has both crossing cells, the diagonal is blocked
        if (hasCross1 && hasCross2) {
            // Check timing - who established the diagonal first
            const diagonalTiming = this.checkDiagonalTimingPriority(
                pos1, pos2, crossCell1, crossCell2, opponent
            );
            return diagonalTiming.opponentFirst;
        }
        
        return false;
    }
    
    /**
     * Check diagonal timing priority (first to establish blocks)
     */
    checkDiagonalTimingPriority(pos1, pos2, crossCell1, crossCell2, opponent) {
        // Find when each piece was placed from game history
        let pos1Time = -1, pos2Time = -1;
        let cross1Time = -1, cross2Time = -1;
        
        for (let i = 0; i < this.gameHistory.length; i++) {
            const move = this.gameHistory[i];
            
            if (move.row === pos1.row && move.col === pos1.col) {
                pos1Time = i;
            }
            if (move.row === pos2.row && move.col === pos2.col) {
                pos2Time = i;
            }
            if (move.row === crossCell1.row && move.col === crossCell1.col) {
                cross1Time = i;
            }
            if (move.row === crossCell2.row && move.col === crossCell2.col) {
                cross2Time = i;
            }
        }
        
        // Diagonal is established when second piece is placed
        const myDiagonalTime = Math.max(pos1Time, pos2Time);
        const opponentDiagonalTime = Math.max(cross1Time, cross2Time);
        
        // If both pieces aren't placed yet, no diagonal exists
        if (pos1Time === -1 || pos2Time === -1) {
            return { opponentFirst: false };
        }
        
        if (cross1Time === -1 || cross2Time === -1) {
            return { opponentFirst: false };
        }
        
        // If opponent's diagonal was established first, it blocks
        return {
            opponentFirst: opponentDiagonalTime < myDiagonalTime,
            myTime: myDiagonalTime,
            opponentTime: opponentDiagonalTime
        };
    }

    // ===== UTILITY METHODS =====
    
    /**
     * Get all positions occupied by a player
     */
    getPlayerPositions(player) {
        const positions = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === player) {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }
    
    /**
     * Check if a position is valid
     */
    isValidPosition(row, col) {
        // Use geometry module if available
        if (this.geometry && typeof this.geometry.isValidPosition === 'function') {
            return this.geometry.isValidPosition(row, col);
        }
        
        // Fallback to built-in validation
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }
    
    /**
     * Check if a move is valid
     */
    isValidMove(row, col) {
        if (!this.isValidPosition(row, col)) {
            return false;
        }
        
        if (this.board[row][col] !== '') {
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if a position is empty
     */
    isEmpty(row, col) {
        if (!this.isValidPosition(row, col)) {
            return false;
        }
        return this.board[row][col] === '';
    }
    
    /**
     * Get the last opponent move
     */
    getLastOpponentMove(currentPlayer) {
        const opponent = currentPlayer === 'X' ? 'O' : 'X';
        
        // Search backwards through history for last opponent move
        for (let i = this.gameHistory.length - 1; i >= 0; i--) {
            if (this.gameHistory[i].player === opponent) {
                return this.gameHistory[i];
            }
        }
        
        return null;
    }
    
    /**
     * Debug logging
     */
    log(message) {
        if (this.settings.enableDebugLogging) {
            console.log(`[GAME-CORE] ${message}`);
        }
    }
    
    /**
     * Set debug mode
     */
    setDebugMode(enabled) {
        this.settings.enableDebugLogging = enabled;
        console.log(`🔧 Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    // ===== DEBUG AND TESTING METHODS =====
    
    /**
     * Test win detection with various scenarios
     */
    testWinDetection(player = 'X') {
        console.log(`\n🧪 Testing win detection for ${player}...`);
        
        // Create a test scenario
        this.board = this.createTestBoard(player);
        this.moveCount = 30; // Ensure we're past move 29
        
        // Populate game history for timing checks
        this.gameHistory = [];
        let moveNum = 0;
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] !== '') {
                    this.gameHistory.push({
                        row, col,
                        player: this.board[row][col],
                        moveNumber: ++moveNum,
                        timestamp: Date.now()
                    });
                }
            }
        }
        
        const result = this.checkWin(player);
        console.log('Result:', result);
        return result;
    }
    
    /**
     * Create test board with winning configuration
     */
    createTestBoard(player) {
        const board = [];
        for (let row = 0; row < this.size; row++) {
            board[row] = [];
            for (let col = 0; col < this.size; col++) {
                board[row][col] = '';
            }
        }
        
        if (player === 'X') {
            // Create vertical winning line for X
            for (let row = 0; row < this.size; row++) {
                board[row][7] = 'X';
            }
            // Add some O pieces for realistic scenario
            board[5][6] = 'O';
            board[6][6] = 'O';
            board[7][8] = 'O';
        } else {
            // Create horizontal winning line for O
            for (let col = 0; col < this.size; col++) {
                board[7][col] = 'O';
            }
            // Add some X pieces for realistic scenario
            board[6][5] = 'X';
            board[6][6] = 'X';
            board[8][7] = 'X';
        }
        
        return board;
    }
    
    /**
     * Print the current board state
     */
    printBoard() {
        console.log('\n📋 Current Board State:');
        console.log('   ' + Array.from({ length: this.size }, (_, i) => 
            i.toString().padStart(2)).join(' '));
        
        for (let row = 0; row < this.size; row++) {
            let rowStr = row.toString().padStart(2) + ' ';
            for (let col = 0; col < this.size; col++) {
                const cell = this.board[row][col];
                rowStr += (cell || '.').padStart(2) + ' ';
            }
            console.log(rowStr);
        }
        console.log('');
    }
    
    /**
     * Get game statistics
     */
    getGameStats() {
        const xPositions = this.getPlayerPositions('X');
        const oPositions = this.getPlayerPositions('O');
        
        return {
            moveCount: this.moveCount,
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            xPieces: xPositions.length,
            oPieces: oPositions.length,
            boardSize: this.size,
            historyLength: this.gameHistory.length,
            lastMove: this.lastMove
        };
    }
    
    /**
     * Export game state
     */
    exportGameState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            gameHistory: this.gameHistory,
            moveCount: this.moveCount,
            lastMove: this.lastMove,
            size: this.size
        };
    }
    
    /**
     * Import game state
     */
    importGameState(state) {
        this.board = state.board || this.board;
        this.currentPlayer = state.currentPlayer || this.currentPlayer;
        this.gameOver = state.gameOver || false;
        this.gameHistory = state.gameHistory || [];
        this.moveCount = state.moveCount || 0;
        this.lastMove = state.lastMove || null;
        this.size = state.size || this.size;
        
        console.log('📥 Game state imported successfully');
    }
}

// ===== FACTORY FUNCTION =====

/**
 * Create game with automatic module connection
 */
function createConnectionGame(size = 15, opts = {}) {
    const defaults = {
        connectModulesAutomatically: true,
        enableDebugMode: false
    };
    const options = { ...defaults, ...opts };
    
    console.log('🗂️ Creating Connection Game...');
    
    const gameCore = new ConnectionGameCore(size);
    
    // Auto-connect universal modules if available
    if (options.connectModulesAutomatically && typeof window !== 'undefined') {
        try {
            const geometry = window.createGameGeometry ? 
                window.createGameGeometry(size) : null;
            const connections = window.createConnectionValidator && geometry ? 
                window.createConnectionValidator(gameCore, geometry) : null;
            const patterns = window.createPatternEngine && geometry ? 
                window.createPatternEngine(gameCore, geometry) : null;
            const analyzer = window.createBoardAnalyzer && geometry && patterns && connections ? 
                window.createBoardAnalyzer(gameCore, geometry, patterns, connections) : null;
            
            if (geometry && connections) {
                gameCore.initializeModules(geometry, connections, patterns, analyzer);
                console.log('🔗 Auto-connected universal modules');
            } else {
                console.warn('⚠️ Some modules not available for auto-connection');
            }
        } catch (error) {
            console.warn('⚠️ Auto-connection failed:', error.message);
        }
    }
    
    if (options.enableDebugMode) {
        gameCore.setDebugMode(true);
    }
    
    return gameCore;
}

// ===== EXPORTS =====

// Export for different module systems
if (typeof window !== 'undefined') {
    // Browser global
    window.ConnectionGameCore = ConnectionGameCore;
    window.createConnectionGame = createConnectionGame;
    console.log('✅ ConnectionGameCore exported to window');
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = { ConnectionGameCore, createConnectionGame };
} else if (typeof define === 'function' && define.amd) {
    // AMD
    define(() => ({ ConnectionGameCore, createConnectionGame }));
}

console.log('✅ Connection Game Core v2.0 loaded - Player-independent win detection ready');
console.log('🎮 Usage: const game = createConnectionGame(15);');
console.log('🧪 Test: game.testWinDetection("X"); game.testWinDetection("O");');
console.log('🔧 Debug: game.setDebugMode(true);');