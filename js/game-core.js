// game-core.js - Pure game logic (FIXED DIAGONAL LOGIC)
// Simplified diagonal detection for immediate adjacency only
// Uses DiagonalCrossingValidator for "first lock wins" crossing rule

class ConnectionGameCore {
    constructor(size = 15) {
        this.size = size;
        this.board = [];
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.moveCount = 0;
        this.gameHistory = [];
        this.diagonalConnections = []; // Simplified diagonal tracking
        this.crossingValidator = null; // Initialized after DiagonalCrossingValidator is available
        this.initializeBoard();
        this._initCrossingValidator();
    }

    _initCrossingValidator() {
        if (typeof DiagonalCrossingValidator !== 'undefined') {
            this.crossingValidator = new DiagonalCrossingValidator(this);
        }
    }

    // ========================= CORE BOARD MANAGEMENT =========================

    initializeBoard() {
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(''));
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.moveCount = 0;
        this.gameHistory = [];
        this.diagonalConnections = [];
        console.log(`Board initialized: ${this.size}x${this.size}`);
    }

    resetGame(newSize = null) {
        if (newSize) {
            this.size = newSize;
        }
        this.initializeBoard();
        console.log(`Game reset: ${this.size}x${this.size}`);
    }

    // ========================= MOVE VALIDATION AND EXECUTION =========================

    isValidMove(row, col) {
        const isValid = this.isValidPosition(row, col) && 
                       this.board[row][col] === '' && 
                       !this.gameOver;
        
        if (!isValid) {
            console.log(`Invalid move check: (${row}, ${col}) - Position valid: ${this.isValidPosition(row, col)}, Cell empty: ${this.board[row][col] === ''}, Game not over: ${!this.gameOver}`);
        }
        
        return isValid;
    }

    // Surrender functionality
    surrender(player = this.currentPlayer) {
        if (this.gameOver) {
            console.log('Cannot surrender: game already over');
            return { success: false, reason: 'Game already over' };
        }

        console.log(`${player} surrenders!`);
        
        // Determine winner (opponent of surrendering player)
        const winner = player === 'X' ? 'O' : 'X';
        
        // Record surrender in history
        this.gameHistory.push({
            moveNumber: this.moveCount + 1,
            row: -1,  // Special marker for surrender
            col: -1,  // Special marker for surrender
            player: player,
            moveType: 'surrender',
            boardState: JSON.parse(JSON.stringify(this.board))
        });
        
        this.moveCount++;
        this.gameOver = true;
        
        console.log(`Game Over! ${winner} wins by surrender`);
        
        return {
            success: true,
            gameOver: true,
            winner: winner,
            winType: 'surrender',
            surrenderingPlayer: player,
            moveNumber: this.moveCount
        };
    }

    // Improved move execution with simplified diagonal tracking
    makeMove(row, col, player = this.currentPlayer) {
        console.log(`Making move: ${player} at (${row}, ${col})`);
        
        if (!this.isValidMove(row, col)) {
            console.log(`Move rejected: Invalid move ${player} at (${row}, ${col})`);
            return { success: false, reason: 'Invalid move' };
        }

        // Execute move first
        this.board[row][col] = player;
        this.moveCount++;

        // Record move in history AFTER the move is made
        this.gameHistory.push({
            moveNumber: this.moveCount,
            row: row,
            col: col,
            player: player,
            boardState: JSON.parse(JSON.stringify(this.board)) // Deep copy
        });

        console.log(`Move executed: ${player} at (${row}, ${col}), Move count: ${this.moveCount}`);

        // Update diagonal connections (simplified)
        this.updateDiagonalConnections();

        // Check for win condition
        const winResult = this.checkWin(player);
        
        if (winResult.isWin) {
            this.gameOver = true;
            console.log(`Game Over! ${player} wins by ${winResult.type}`);
            return {
                success: true,
                gameOver: true,
                winner: player,
                winType: winResult.type,
                winPath: winResult.path
            };
        }

        // Switch players for next turn
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';

        return {
            success: true,
            gameOver: false,
            moveNumber: this.moveCount,
            nextPlayer: this.currentPlayer
        };
    }

    // Proper undo functionality
    undoLastMove() {
        if (this.gameHistory.length === 0) {
            console.log('No moves to undo');
            return { success: false, reason: 'No moves to undo' };
        }

        // Remove last move from history
        const lastMove = this.gameHistory.pop();
        console.log(`Undoing move: ${lastMove.player} at (${lastMove.row}, ${lastMove.col})`);
        
        // Restore to previous board state
        if (this.gameHistory.length > 0) {
            const previousMove = this.gameHistory[this.gameHistory.length - 1];
            this.board = JSON.parse(JSON.stringify(previousMove.boardState));
            this.moveCount = previousMove.moveNumber;
        } else {
            // No previous moves, restore to empty board
            this.board = Array(this.size).fill().map(() => Array(this.size).fill(''));
            this.moveCount = 0;
        }

        // Reset game state
        this.gameOver = false;
        this.currentPlayer = lastMove.player; // Set to the player who made the undone move
        this.updateDiagonalConnections();

        console.log(`Move undone. New move count: ${this.moveCount}, Current player: ${this.currentPlayer}`);
        return { success: true, undoneMOve: lastMove };
    }

    // ========================= DIAGONAL CONNECTIONS =========================

    // Update diagonal connections (immediate adjacency only)
    updateDiagonalConnections() {
        this.diagonalConnections = this.findImmediateDiagonalConnections();
        console.log(`Updated diagonal connections: ${this.diagonalConnections.length} total`);
    }

    // Find immediate diagonal connections only (respects crossing rule)
    findImmediateDiagonalConnections() {
        // If crossing validator is available, use it for accurate results
        if (this.crossingValidator) {
            return this.crossingValidator.buildValidConnections().map(c => ({
                ...c,
                type: 'diagonal-lock'
            }));
        }

        // Fallback: naive scan (no crossing enforcement)
        const connections = [];
        const processed = new Set();

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const player = this.board[row][col];
                if (player === '') continue;

                const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

                for (const [dr, dc] of diagonals) {
                    const newRow = row + dr;
                    const newCol = col + dc;

                    if (this.isValidPosition(newRow, newCol) &&
                        this.board[newRow][newCol] === player) {

                        const key = this.createConnectionKey(row, col, newRow, newCol);

                        if (!processed.has(key)) {
                            processed.add(key);
                            connections.push({
                                row1: Math.min(row, newRow),
                                col1: row < newRow ? col : (row === newRow ? Math.min(col, newCol) : newCol),
                                row2: Math.max(row, newRow),
                                col2: row > newRow ? col : (row === newRow ? Math.max(col, newCol) : newCol),
                                player: player,
                                type: 'diagonal-lock'
                            });
                        }
                    }
                }
            }
        }

        return connections;
    }

    // Create unique key for connection to avoid duplicates
    createConnectionKey(row1, col1, row2, col2) {
        // Always put smaller coordinates first
        if (row1 < row2 || (row1 === row2 && col1 < col2)) {
            return `${row1}-${col1}-${row2}-${col2}`;
        } else {
            return `${row2}-${col2}-${row1}-${col1}`;
        }
    }

    // Get immediate diagonal connections for external access
    getDiagonalConnections() {
        return [...this.diagonalConnections]; // Return copy
    }

    // Check if two positions are immediately diagonally connected
    arePositionsDiagonallyConnected(row1, col1, row2, col2, player) {
        // Check if positions are immediately adjacent diagonally
        const rowDiff = Math.abs(row2 - row1);
        const colDiff = Math.abs(col2 - col1);
        
        // Must be exactly 1 step diagonally
        if (rowDiff !== 1 || colDiff !== 1) return false;
        
        // Both positions must have the same player
        return this.board[row1][col1] === player && 
               this.board[row2][col2] === player;
    }

    // ========================= WIN DETECTION =========================

    checkWin(player = this.currentPlayer) {
        if (player === 'X') {
            return this.checkVerticalConnection();
        } else {
            return this.checkHorizontalConnection();
        }
    }

    checkVerticalConnection() {
        // Start from top row, find all X pieces
        const startPositions = [];
        for (let col = 0; col < this.size; col++) {
            if (this.board[0][col] === 'X') {
                startPositions.push([0, col]);
            }
        }

        // DFS from each starting position
        for (const start of startPositions) {
            const result = this.dfsVertical(start[0], start[1], new Set());
            if (result.connected) {
                return {
                    isWin: true,
                    type: 'vertical',
                    path: Array.from(result.path).map(key => {
                        const [row, col] = key.split('-').map(Number);
                        return { row, col };
                    })
                };
            }
        }
        return { isWin: false };
    }

    checkHorizontalConnection() {
        // Start from left column, find all O pieces
        const startPositions = [];
        for (let row = 0; row < this.size; row++) {
            if (this.board[row][0] === 'O') {
                startPositions.push([row, 0]);
            }
        }

        // DFS from each starting position
        for (const start of startPositions) {
            const result = this.dfsHorizontal(start[0], start[1], new Set());
            if (result.connected) {
                return {
                    isWin: true,
                    type: 'horizontal',
                    path: Array.from(result.path).map(key => {
                        const [row, col] = key.split('-').map(Number);
                        return { row, col };
                    })
                };
            }
        }
        return { isWin: false };
    }

    dfsVertical(row, col, visited) {
        const key = `${row}-${col}`;
        if (visited.has(key)) return { connected: false, path: visited };
        visited.add(key);

        // Reached bottom row
        if (row === this.size - 1) return { connected: true, path: visited };

        // Check all 8 directions
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidPosition(newRow, newCol) &&
                this.board[newRow][newCol] === 'X' &&
                !visited.has(`${newRow}-${newCol}`)) {
                // Check diagonal crossing rule for diagonal moves
                if (dr !== 0 && dc !== 0 && this.crossingValidator) {
                    if (!this.crossingValidator.areDiagonallyConnected(row, col, newRow, newCol, 'X')) {
                        continue; // Diagonal blocked by earlier opponent crossing
                    }
                }
                const result = this.dfsVertical(newRow, newCol, new Set(visited));
                if (result.connected) {
                    return { connected: true, path: new Set([...visited, ...result.path]) };
                }
            }
        }
        return { connected: false, path: visited };
    }

    dfsHorizontal(row, col, visited) {
        const key = `${row}-${col}`;
        if (visited.has(key)) return { connected: false, path: visited };
        visited.add(key);

        // Reached right column
        if (col === this.size - 1) return { connected: true, path: visited };

        // Check all 8 directions
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidPosition(newRow, newCol) &&
                this.board[newRow][newCol] === 'O' &&
                !visited.has(`${newRow}-${newCol}`)) {
                // Check diagonal crossing rule for diagonal moves
                if (dr !== 0 && dc !== 0 && this.crossingValidator) {
                    if (!this.crossingValidator.areDiagonallyConnected(row, col, newRow, newCol, 'O')) {
                        continue; // Diagonal blocked by earlier opponent crossing
                    }
                }
                const result = this.dfsHorizontal(newRow, newCol, new Set(visited));
                if (result.connected) {
                    return { connected: true, path: new Set([...visited, ...result.path]) };
                }
            }
        }
        return { connected: false, path: visited };
    }

    // ========================= BOARD ANALYSIS =========================

    getEmptyPositions() {
        const empty = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === '') {
                    empty.push({ row, col });
                }
            }
        }
        return empty;
    }

    /**
     * Get all positions occupied by a specific player
     * Enhanced version with additional metadata
     */
    getPlayerPositions(player) {
        const positions = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === player) {
                    positions.push({ 
                        row, 
                        col,
                        cellNumber: row * this.size + col + 1
                    });
                }
            }
        }
        return positions;
    }

    // ========================= AI HELPER METHODS =========================

    /**
     * Check if a position is blocked by a specific player
     */
    isPositionBlockedByPlayer(row, col, player) {
        return this.isValidPosition(row, col) && this.board[row][col] === player;
    }

    /**
     * Get all positions adjacent to a given position with filtering
     * @param {number} row - Row coordinate
     * @param {number} col - Column coordinate
     * @param {Object} options - Filtering options
     * @returns {Array} Array of adjacent positions
     */
    getAdjacentPositions(row, col, options = {}) {
        const {
            includeEmpty = true,
            includePlayer = null,
            excludePlayer = null,
            patternType = 'adjacent' // 'adjacent', 'L', 'I', 'all'
        } = options;

        const adjacent = [];
        let patterns = [];

        switch (patternType) {
            case 'adjacent':
                patterns = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
                break;
            case 'L':
                patterns = [
                    [1, 2], [1, -2], [-1, 2], [-1, -2],
                    [2, 1], [2, -1], [-2, 1], [-2, -1]
                ];
                break;
            case 'I':
                patterns = [
                    [0, 2], [0, -2], [2, 0], [-2, 0],
                    [2, 2], [2, -2], [-2, 2], [-2, -2]
                ];
                break;
            case 'all':
                patterns = [
                    // Adjacent
                    [-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1],
                    // L-patterns
                    [1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1],
                    // I-patterns  
                    [0, 2], [0, -2], [2, 0], [-2, 0], [2, 2], [2, -2], [-2, 2], [-2, -2]
                ];
                break;
        }

        for (const [dr, dc] of patterns) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isValidPosition(newRow, newCol)) {
                const cellValue = this.board[newRow][newCol];
                
                let shouldInclude = false;
                
                if (includeEmpty && cellValue === '') {
                    shouldInclude = true;
                } else if (includePlayer && cellValue === includePlayer) {
                    shouldInclude = true;
                } else if (cellValue !== '' && !excludePlayer) {
                    shouldInclude = true;
                } else if (cellValue !== '' && cellValue !== excludePlayer) {
                    shouldInclude = true;
                }
                
                if (shouldInclude) {
                    adjacent.push({ 
                        row: newRow, 
                        col: newCol, 
                        value: cellValue,
                        pattern: `${dr},${dc}`,
                        distance: Math.abs(dr) + Math.abs(dc),
                        cellNumber: newRow * this.size + newCol + 1
                    });
                }
            }
        }
        
        return adjacent;
    }

    /**
     * Check if a pattern can be applied from a position without opponent interference
     */
    canApplyPattern(row, col, pattern, player) {
        const newRow = row + pattern.dr;
        const newCol = col + pattern.dc;
        const opponent = player === 'X' ? 'O' : 'X';
        
        // Target position must be valid and empty
        if (!this.isValidPosition(newRow, newCol) || this.board[newRow][newCol] !== '') {
            return { 
                canApply: false, 
                reason: 'Target position occupied or invalid' 
            };
        }
        
        // Check if pattern path is blocked by opponent
        const pathBlocked = this.isPatternPathBlocked(row, col, pattern, opponent);
        if (pathBlocked.blocked) {
            return {
                canApply: false,
                reason: `Pattern blocked by opponent: ${pathBlocked.reason}`
            };
        }
        
        return { canApply: true, reason: 'Pattern can be applied' };
    }

    /**
     * Check if the path for a pattern is blocked by opponent pieces
     */
    isPatternPathBlocked(row, col, pattern, opponent) {
        // For L-patterns, check if key intermediate positions are blocked
        if ((Math.abs(pattern.dr) === 1 && Math.abs(pattern.dc) === 2) ||
            (Math.abs(pattern.dr) === 2 && Math.abs(pattern.dc) === 1)) {
            
            // Check positions that would interfere with L-pattern
            const checkPositions = [
                [row + Math.sign(pattern.dr), col],
                [row, col + Math.sign(pattern.dc)]
            ];
            
            for (const [checkRow, checkCol] of checkPositions) {
                if (this.isPositionBlockedByPlayer(checkRow, checkCol, opponent)) {
                    return { 
                        blocked: true, 
                        reason: `L-pattern blocked at (${checkRow},${checkCol})` 
                    };
                }
            }
        }
        
        // For I-patterns, check the direct path
        if (pattern.dr === 0 || pattern.dc === 0 || Math.abs(pattern.dr) === Math.abs(pattern.dc)) {
            const stepRow = Math.sign(pattern.dr);
            const stepCol = Math.sign(pattern.dc);
            
            // Check intermediate position for I-patterns
            const midRow = row + stepRow;
            const midCol = col + stepCol;
            
            if (this.isPositionBlockedByPlayer(midRow, midCol, opponent)) {
                return { 
                    blocked: true, 
                    reason: `I-pattern blocked at (${midRow},${midCol})` 
                };
            }
        }
        
        return { blocked: false, reason: 'Pattern path is clear' };
    }

    /**
     * Find connected components for a player (groups of connected pieces)
     */
    getConnectedComponents(player) {
        const positions = this.getPlayerPositions(player);
        const visited = new Set();
        const components = [];
        
        for (const pos of positions) {
            const key = `${pos.row}-${pos.col}`;
            if (!visited.has(key)) {
                const component = this.findConnectedComponent(pos, player, visited);
                if (component.length > 0) {
                    components.push(component);
                }
            }
        }
        
        return components;
    }

    /**
     * Find all positions connected to a starting position
     * Respects diagonal crossing rule for immediate diagonal neighbors
     */
    findConnectedComponent(startPos, player, visited) {
        const component = [];
        const stack = [startPos];

        while (stack.length > 0) {
            const pos = stack.pop();
            const key = `${pos.row}-${pos.col}`;

            if (visited.has(key)) continue;
            visited.add(key);
            component.push(pos);

            // Check all connection types (adjacent, L, I)
            const connected = this.getAdjacentPositions(pos.row, pos.col, {
                includePlayer: player,
                patternType: 'all'
            });

            for (const connectedPos of connected) {
                const connectedKey = `${connectedPos.row}-${connectedPos.col}`;
                if (!visited.has(connectedKey)) {
                    // For diagonal neighbors (distance 1,1), check crossing rule
                    const dr = Math.abs(connectedPos.row - pos.row);
                    const dc = Math.abs(connectedPos.col - pos.col);
                    if (dr === 1 && dc === 1 && this.crossingValidator) {
                        if (!this.crossingValidator.areDiagonallyConnected(
                            pos.row, pos.col, connectedPos.row, connectedPos.col, player)) {
                            continue; // Blocked diagonal
                        }
                    }
                    stack.push({ row: connectedPos.row, col: connectedPos.col });
                }
            }
        }

        return component;
    }

    /**
     * Analyze opponent threats and blocking opportunities
     */
    analyzeOpponentThreats(player) {
        const opponent = player === 'X' ? 'O' : 'X';
        const opponentPositions = this.getPlayerPositions(opponent);
        const threats = [];
        
        // Analyze each opponent piece for extension threats
        for (const pos of opponentPositions) {
            const extensions = this.getAdjacentPositions(pos.row, pos.col, {
                includeEmpty: true,
                patternType: 'all'
            });
            
            for (const ext of extensions) {
                // Calculate threat level based on strategic importance
                const threatLevel = this.calculateThreatLevel(ext, opponent, player);
                if (threatLevel > 0) {
                    threats.push({
                        position: ext,
                        threatLevel: threatLevel,
                        fromPosition: pos,
                        reason: `Opponent ${opponent} can extend from (${pos.row},${pos.col})`
                    });
                }
            }
        }
        
        // Sort by threat level (highest first)
        threats.sort((a, b) => b.threatLevel - a.threatLevel);
        
        return threats;
    }

    /**
     * Calculate the threat level of a position for opponent extension
     */
    calculateThreatLevel(position, opponent, player) {
        let threatLevel = 1; // Base threat
        
        // Higher threat if position advances opponent's goal
        const opponentPositions = this.getPlayerPositions(opponent);
        if (opponentPositions.length === 0) return threatLevel;
        
        if (opponent === 'X') {
            // X wants vertical progress
            const minRow = Math.min(...opponentPositions.map(p => p.row));
            const maxRow = Math.max(...opponentPositions.map(p => p.row));
            
            if (position.row < minRow || position.row > maxRow) {
                threatLevel += 5; // Extends span
            }
            
            if (position.row === 0 || position.row === this.size - 1) {
                threatLevel += 10; // Reaches edge
            }
        } else {
            // O wants horizontal progress
            const minCol = Math.min(...opponentPositions.map(p => p.col));
            const maxCol = Math.max(...opponentPositions.map(p => p.col));
            
            if (position.col < minCol || position.col > maxCol) {
                threatLevel += 5; // Extends span
            }
            
            if (position.col === 0 || position.col === this.size - 1) {
                threatLevel += 10; // Reaches edge
            }
        }
        
        // Higher threat if position connects multiple opponent pieces
        const connectsTo = this.getAdjacentPositions(position.row, position.col, {
            includePlayer: opponent,
            patternType: 'all'
        });
        
        if (connectsTo.length > 1) {
            threatLevel += connectsTo.length * 3; // Multiplier for connectivity
        }
        
        return threatLevel;
    }

    /**
     * Get strategically important positions for a player
     */
    getStrategicPositions(player) {
        const strategic = {
            edges: [],
            corners: [],
            center: [],
            extensions: [],
            blocks: []
        };
        
        const centerRow = Math.floor(this.size / 2);
        const centerCol = Math.floor(this.size / 2);
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] !== '') continue; // Only empty positions
                
                const pos = { row, col, cellNumber: row * this.size + col + 1 };
                
                // Edge positions
                if (row === 0 || row === this.size - 1 || col === 0 || col === this.size - 1) {
                    strategic.edges.push({ ...pos, type: 'edge' });
                }
                
                // Corner positions
                if ((row === 0 || row === this.size - 1) && (col === 0 || col === this.size - 1)) {
                    strategic.corners.push({ ...pos, type: 'corner' });
                }
                
                // Center area positions
                const distFromCenter = Math.abs(row - centerRow) + Math.abs(col - centerCol);
                if (distFromCenter <= 2) {
                    strategic.center.push({ ...pos, type: 'center', distance: distFromCenter });
                }
                
                // Extension opportunities (adjacent to our pieces)
                const friendlyAdjacent = this.getAdjacentPositions(row, col, {
                    includePlayer: player,
                    patternType: 'all'
                });
                if (friendlyAdjacent.length > 0) {
                    strategic.extensions.push({ 
                        ...pos, 
                        type: 'extension', 
                        connectsTo: friendlyAdjacent.length 
                    });
                }
                
                // Blocking opportunities (adjacent to opponent pieces)
                const opponent = player === 'X' ? 'O' : 'X';
                const opponentAdjacent = this.getAdjacentPositions(row, col, {
                    includePlayer: opponent,
                    patternType: 'all'
                });
                if (opponentAdjacent.length > 0) {
                    strategic.blocks.push({ 
                        ...pos, 
                        type: 'block', 
                        blocks: opponentAdjacent.length 
                    });
                }
            }
        }
        
        return strategic;
    }

    // ========================= PATH CHECKING =========================

    /**
     * Check if a player has a continuous path between two edges
     */
    hasPathBetweenEdges(player) {
        if (player === 'X') {
            // Check vertical path from top to bottom
            return this.hasVerticalPath(player);
        } else {
            // Check horizontal path from left to right
            return this.hasHorizontalPath(player);
        }
    }

    /**
     * Check for continuous vertical path (for X player)
     */
    hasVerticalPath(player) {
        // Start from top row pieces
        const topPieces = this.getPlayerPositions(player).filter(p => p.row === 0);
        
        for (const startPiece of topPieces) {
            if (this.findPathToBottom(startPiece, player, new Set())) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check for continuous horizontal path (for O player)
     */
    hasHorizontalPath(player) {
        // Start from left column pieces
        const leftPieces = this.getPlayerPositions(player).filter(p => p.col === 0);
        
        for (const startPiece of leftPieces) {
            if (this.findPathToRight(startPiece, player, new Set())) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * DFS to find path to bottom edge (for X)
     * Respects diagonal crossing rule
     */
    findPathToBottom(piece, player, visited) {
        const key = `${piece.row}-${piece.col}`;
        if (visited.has(key)) return false;
        visited.add(key);

        // Reached bottom edge
        if (piece.row === this.size - 1) return true;

        // Check all adjacent connected pieces
        const adjacent = this.getAdjacentPositions(piece.row, piece.col, {
            includePlayer: player,
            patternType: 'adjacent'
        });

        for (const adj of adjacent) {
            // Check diagonal crossing rule
            const dr = Math.abs(adj.row - piece.row);
            const dc = Math.abs(adj.col - piece.col);
            if (dr === 1 && dc === 1 && this.crossingValidator) {
                if (!this.crossingValidator.areDiagonallyConnected(
                    piece.row, piece.col, adj.row, adj.col, player)) {
                    continue;
                }
            }
            if (this.findPathToBottom({ row: adj.row, col: adj.col }, player, new Set(visited))) {
                return true;
            }
        }

        return false;
    }

    /**
     * DFS to find path to right edge (for O)
     * Respects diagonal crossing rule
     */
    findPathToRight(piece, player, visited) {
        const key = `${piece.row}-${piece.col}`;
        if (visited.has(key)) return false;
        visited.add(key);

        // Reached right edge
        if (piece.col === this.size - 1) return true;

        // Check all adjacent connected pieces
        const adjacent = this.getAdjacentPositions(piece.row, piece.col, {
            includePlayer: player,
            patternType: 'adjacent'
        });

        for (const adj of adjacent) {
            // Check diagonal crossing rule
            const dr = Math.abs(adj.row - piece.row);
            const dc = Math.abs(adj.col - piece.col);
            if (dr === 1 && dc === 1 && this.crossingValidator) {
                if (!this.crossingValidator.areDiagonallyConnected(
                    piece.row, piece.col, adj.row, adj.col, player)) {
                    continue;
                }
            }
            if (this.findPathToRight({ row: adj.row, col: adj.col }, player, new Set(visited))) {
                return true;
            }
        }

        return false;
    }

    // ========================= POSITION EVALUATION FOR ML =========================

    /**
     * Position evaluation for neural network features
     */
    evaluatePosition(player) {
        const positions = this.getPlayerPositions(player);
        const opponent = player === 'X' ? 'O' : 'X';
        const opponentPositions = this.getPlayerPositions(opponent);
        
        return {
            // Connectivity metrics
            connectivity: this.calculateConnectivityScore(positions),
            
            // Goal progress
            goalProgress: this.calculateGoalProgress(positions, player),
            
            // Threat level
            threatLevel: this.calculatePositionalThreatLevel(positions, player),
            
            // Defensive strength
            defensiveStrength: this.calculateDefensiveStrength(positions, opponentPositions),
            
            // Position control
            centerControl: this.calculateCenterControl(positions),
            edgeControl: this.calculateEdgeControl(positions, player)
        };
    }

    /**
     * Analysis for ML training - connectivity score
     */
    calculateConnectivityScore(positions) {
        if (positions.length < 2) return 0;
        
        let totalConnectivity = 0;
        
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const distance = Math.abs(positions[i].row - positions[j].row) + 
                               Math.abs(positions[i].col - positions[j].col);
                
                // Closer pieces contribute more to connectivity
                if (distance <= 3) {
                    totalConnectivity += (4 - distance) / 3;
                }
            }
        }
        
        return totalConnectivity / Math.max(1, positions.length - 1);
    }

    /**
     * Calculate goal progress for ML evaluation
     */
    calculateGoalProgress(positions, player) {
        if (positions.length === 0) return 0;
        
        if (player === 'X') {
            // Vertical progress: span from top to bottom
            const minRow = Math.min(...positions.map(p => p.row));
            const maxRow = Math.max(...positions.map(p => p.row));
            return (maxRow - minRow + 1) / this.size;
        } else {
            // Horizontal progress: span from left to right
            const minCol = Math.min(...positions.map(p => p.col));
            const maxCol = Math.max(...positions.map(p => p.col));
            return (maxCol - minCol + 1) / this.size;
        }
    }

    /**
     * Calculate positional threat level for ML evaluation (different from extension threat level)
     */
    calculatePositionalThreatLevel(positions, player) {
        if (positions.length === 0) return 0;
        
        let threatLevel = 0;
        
        // Edge proximity increases threat
        for (const pos of positions) {
            if (player === 'X') {
                // X threatens more when near top/bottom edges
                const edgeDistance = Math.min(pos.row, this.size - 1 - pos.row);
                threatLevel += Math.max(0, 5 - edgeDistance);
            } else {
                // O threatens more when near left/right edges
                const edgeDistance = Math.min(pos.col, this.size - 1 - pos.col);
                threatLevel += Math.max(0, 5 - edgeDistance);
            }
        }
        
        return threatLevel / positions.length;
    }

    /**
     * Calculate defensive strength
     */
    calculateDefensiveStrength(positions, opponentPositions) {
        // Simplified defensive strength calculation
        return positions.length > 0 ? positions.length / (positions.length + opponentPositions.length) : 0;
    }

    /**
     * Calculate center control
     */
    calculateCenterControl(positions) {
        if (positions.length === 0) return 0;
        
        const centerRow = Math.floor(this.size / 2);
        const centerCol = Math.floor(this.size / 2);
        let centerControl = 0;
        
        for (const pos of positions) {
            const distance = Math.abs(pos.row - centerRow) + Math.abs(pos.col - centerCol);
            centerControl += Math.max(0, 10 - distance) / 10;
        }
        
        return centerControl / positions.length;
    }

    /**
     * Calculate edge control
     */
    calculateEdgeControl(positions, player) {
        if (positions.length === 0) return 0;
        
        let edgeControl = 0;
        
        for (const pos of positions) {
            if (player === 'X') {
                // X controls edges when on top/bottom rows
                if (pos.row === 0 || pos.row === this.size - 1) {
                    edgeControl += 1;
                }
            } else {
                // O controls edges when on left/right columns
                if (pos.col === 0 || pos.col === this.size - 1) {
                    edgeControl += 1;
                }
            }
        }
        
        return edgeControl / positions.length;
    }

    // ========================= DEBUG AND ANALYSIS =========================

    /**
     * Get debug information about board state for AI analysis
     */
    getAIDebugInfo() {
        return {
            boardSize: this.size,
            moveCount: this.moveCount,
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            xPositions: this.getPlayerPositions('X'),
            oPositions: this.getPlayerPositions('O'),
            emptyPositions: this.getEmptyPositions().length,
            xComponents: this.getConnectedComponents('X'),
            oComponents: this.getConnectedComponents('O'),
            hasXPath: this.hasPathBetweenEdges('X'),
            hasOPath: this.hasPathBetweenEdges('O')
        };
    }

    // ========================= UTILITY FUNCTIONS =========================

    isValidPosition(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    getPositionNotation(row, col) {
        return row * this.size + col + 1;
    }

    getPositionFromNotation(notation) {
        const index = notation - 1;
        return {
            row: Math.floor(index / this.size),
            col: index % this.size
        };
    }

    // ========================= GAME STATE MANAGEMENT =========================

    getGameState() {
        return {
            board: JSON.parse(JSON.stringify(this.board)), // Deep copy
            currentPlayer: this.currentPlayer,
            gameOver: this.gameOver,
            moveCount: this.moveCount,
            size: this.size,
            diagonalConnections: [...this.diagonalConnections], // Simplified
            history: [...this.gameHistory] // Shallow copy
        };
    }

    loadGameState(state) {
        console.log('Loading game state...');
        this.board = JSON.parse(JSON.stringify(state.board));
        this.currentPlayer = state.currentPlayer;
        this.gameOver = state.gameOver;
        this.moveCount = state.moveCount;
        this.size = state.size;
        this.diagonalConnections = state.diagonalConnections || [];
        this.gameHistory = [...(state.history || [])];
        console.log(`Game state loaded. Move count: ${this.moveCount}, Current player: ${this.currentPlayer}`);
    }

    // Board representation for debugging
    printBoard() {
        console.log('\n  ', Array.from({length: this.size}, (_, i) => String(i).padStart(2)).join(' '));
        for (let row = 0; row < this.size; row++) {
            const rowStr = String(row).padStart(2) + ' ';
            const cells = this.board[row].map(cell => (cell === '' ? '·' : cell).padStart(2)).join(' ');
            console.log(rowStr + cells);
        }
        console.log(`\nCurrent player: ${this.currentPlayer}`);
        console.log(`Move count: ${this.moveCount}`);
        console.log(`Diagonal connections: ${this.diagonalConnections.length}`);
    }
}

// Export for use in other modules
window.ConnectionGameCore = ConnectionGameCore;