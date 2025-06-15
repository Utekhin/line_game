// game-ai.js - AI Strategy Module (FIXED VERSION)
// Contains all AI logic for playing against the system
// Requires game-core.js to be loaded first

class ConnectionGameAI {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.difficulty = 'medium';
        this.aiPlayer = 'O'; // AI typically plays O
        this.humanPlayer = 'X';
    }

    // Main AI decision making
    getBestMove(difficulty = this.difficulty) {
        this.difficulty = difficulty;
        
        console.log(`AI: Getting best move for difficulty ${difficulty}`);
        console.log(`AI: Current board state - Move count: ${this.gameCore.moveCount}`);
        
        switch (difficulty) {
            case 'easy':
                return this.getEasyMove();
            case 'medium':
                return this.getMediumMove();
            case 'hard':
                return this.getHardMove();
            default:
                return this.getMediumMove();
        }
    }

    // Easy AI - mostly random with basic blocking
    getEasyMove() {
        console.log('AI: Easy mode - random with basic blocking');
        
        // 30% chance to block obvious wins
        if (Math.random() < 0.3) {
            const blockMove = this.findImmediateBlockingMove();
            if (blockMove) {
                console.log('AI: Easy blocking move');
                return blockMove;
            }
        }

        // 70% random moves
        return this.getRandomMove();
    }

    // Medium AI - strategic with good blocking
    getMediumMove() {
        console.log('AI: Medium mode - strategic play');
        
        // 1. Block opponent's winning move (HIGHEST priority)
        const blockMove = this.findImmediateBlockingMove();
        if (blockMove) {
            console.log('AI: Blocking critical X path');
            return blockMove;
        }

        // 2. CRITICAL: Break up dangerous X diagonal chains
        const breakChainMove = this.findChainBreakingMove();
        if (breakChainMove) {
            console.log('AI: Breaking X diagonal chain');
            return breakChainMove;
        }

        // 3. Block X from extending dangerous diagonal formations
        const preventChainMove = this.findChainPreventionMove();
        if (preventChainMove) {
            console.log('AI: Preventing X chain extension');
            return preventChainMove;
        }

        // 4. Try to make own winning move
        const winMove = this.findWinningMove(this.aiPlayer);
        if (winMove) {
            console.log('AI: Found winning move');
            return winMove;
        }

        // 5. Find breakthrough opportunities in X's chain
        const breakthroughMove = this.findBreakthroughMove();
        if (breakthroughMove) {
            console.log('AI: Attempting breakthrough');
            return breakthroughMove;
        }

        // 6. Build horizontal bridge (only if no urgent blocking needed)
        const bridgeMove = this.findHorizontalBridgeMove();
        if (bridgeMove) {
            console.log('AI: Building horizontal bridge');
            return bridgeMove;
        }

        // 7. Last resort: random move
        console.log('AI: Random move (fallback)');
        return this.getRandomMove();
    }

    // Hard AI - advanced strategy with deeper analysis
    getHardMove() {
        console.log('AI: Hard mode - advanced strategy');
        
        // Use medium strategy but with enhanced evaluation
        return this.getMediumMove(); // Can be enhanced later with Monte Carlo or minimax
    }

    // FIXED: Non-destructive move simulation
    simulateMove(row, col, player) {
        // Create a deep copy of the current game state
        const originalState = this.gameCore.getGameState();
        
        // Temporarily set the current player for simulation
        const originalCurrentPlayer = this.gameCore.currentPlayer;
        this.gameCore.currentPlayer = player;
        
        // Try the move
        const result = this.gameCore.makeMove(row, col, player);
        
        // Store the result before restoring
        const moveResult = result.success ? { ...result } : null;
        
        // Restore the original game state
        this.gameCore.loadGameState(originalState);
        this.gameCore.currentPlayer = originalCurrentPlayer;
        
        return moveResult;
    }

    // Immediate Blocking (Win Prevention)
    findImmediateBlockingMove() {
        return this.findWinningMove(this.humanPlayer);
    }

    // FIXED: Safe winning move detection
    findWinningMove(player) {
        const emptyPositions = this.gameCore.getEmptyPositions();
        console.log(`AI: Checking ${emptyPositions.length} empty positions for winning moves`);
        
        for (const pos of emptyPositions) {
            console.log(`AI: Simulating ${player} at (${pos.row}, ${pos.col})`);
            
            const result = this.simulateMove(pos.row, pos.col, player);
            
            if (result && result.gameOver && result.winner === player) {
                console.log(`AI: Found winning move for ${player} at (${pos.row}, ${pos.col})`);
                return { row: pos.row, col: pos.col, value: 100 };
            }
        }
        
        console.log(`AI: No winning moves found for ${player}`);
        return null;
    }

    // Chain Breaking Logic
    findChainBreakingMove() {
        const breakMoves = [];
        const emptyPositions = this.gameCore.getEmptyPositions();
        
        for (const pos of emptyPositions) {
            const breakValue = this.evaluateChainBreaking(pos.row, pos.col);
            if (breakValue > 10) { // High threshold for breaking moves
                breakMoves.push({ row: pos.row, col: pos.col, value: breakValue });
            }
        }
        
        if (breakMoves.length > 0) {
            breakMoves.sort((a, b) => b.value - a.value);
            console.log(`AI: Found ${breakMoves.length} chain breaking moves, best value: ${breakMoves[0].value}`);
            return breakMoves[0];
        }
        return null;
    }

    evaluateChainBreaking(row, col) {
        let value = 0;
        
        // Check if this position would interrupt a dangerous X chain
        const diagonalDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        
        for (const [dr, dc] of diagonalDirections) {
            let chainLength = 0;
            
            // Count chain in one direction
            for (let step = 1; step < this.gameCore.size; step++) {
                const newRow = row + dr * step;
                const newCol = col + dc * step;
                if (!this.gameCore.isValidPosition(newRow, newCol)) break;
                if (this.gameCore.board[newRow][newCol] === 'X') {
                    chainLength++;
                } else {
                    break;
                }
            }
            
            // Count chain in opposite direction
            for (let step = 1; step < this.gameCore.size; step++) {
                const newRow = row - dr * step;
                const newCol = col - dc * step;
                if (!this.gameCore.isValidPosition(newRow, newCol)) break;
                if (this.gameCore.board[newRow][newCol] === 'X') {
                    chainLength++;
                } else {
                    break;
                }
            }
            
            // If we found a significant chain, breaking it is valuable
            if (chainLength >= 3) {
                value += chainLength * 5;
                // Extra value for diagonal chains (especially dangerous)
                if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
                    value += 10;
                }
            }
        }
        
        // Check for X pieces in all 8 directions (general blocking)
        const surroundingX = this.countAdjacentPieces(row, col, 'X');
        if (surroundingX >= 2) {
            value += surroundingX * 3;
        }
        
        return value;
    }

    // Chain Prevention
    findChainPreventionMove() {
        const preventMoves = [];
        const xPositions = this.gameCore.getPlayerPositions('X');
        
        for (const xPos of xPositions) {
            const adjacent = this.gameCore.getAdjacentPositions(xPos.row, xPos.col, true, null);
            for (const adjPos of adjacent) {
                if (adjPos.value === '') { // Empty position
                    const preventValue = this.evaluateChainPrevention(adjPos.row, adjPos.col);
                    if (preventValue > 5) {
                        preventMoves.push({ row: adjPos.row, col: adjPos.col, value: preventValue });
                    }
                }
            }
        }
        
        if (preventMoves.length > 0) {
            // Remove duplicates and sort
            const uniqueMoves = preventMoves.filter((move, index, self) => 
                index === self.findIndex(m => m.row === move.row && m.col === move.col)
            );
            uniqueMoves.sort((a, b) => b.value - a.value);
            return uniqueMoves[0];
        }
        return null;
    }

    evaluateChainPrevention(row, col) {
        let value = 0;
        
        const adjacentX = this.countAdjacentPieces(row, col, 'X');
        value += adjacentX * 2;
        
        // Extra value for preventing diagonal extensions
        const diagonalDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of diagonalDirections) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.gameCore.isValidPosition(newRow, newCol) && 
                this.gameCore.board[newRow][newCol] === 'X') {
                value += 4;
            }
        }
        
        // Check if this position would cut off a potential X pathway
        if (this.wouldCutOffXPathway(row, col)) {
            value += 8;
        }
        
        return value;
    }

    wouldCutOffXPathway(row, col) {
        // Check if placing O here would significantly disrupt X's vertical connectivity
        let hasXAbove = false;
        let hasXBelow = false;
        
        for (let r = 0; r < row; r++) {
            if (this.gameCore.board[r][col] === 'X') {
                hasXAbove = true;
                break;
            }
        }
        
        for (let r = row + 1; r < this.gameCore.size; r++) {
            if (this.gameCore.board[r][col] === 'X') {
                hasXBelow = true;
                break;
            }
        }
        
        return hasXAbove && hasXBelow;
    }

    // Breakthrough Opportunities
    findBreakthroughMove() {
        const breakthroughMoves = [];
        const emptyPositions = this.gameCore.getEmptyPositions();
        
        for (const pos of emptyPositions) {
            const breakthroughValue = this.evaluateBreakthrough(pos.row, pos.col);
            if (breakthroughValue > 3) {
                breakthroughMoves.push({ row: pos.row, col: pos.col, value: breakthroughValue });
            }
        }
        
        if (breakthroughMoves.length > 0) {
            breakthroughMoves.sort((a, b) => b.value - a.value);
            return breakthroughMoves[0];
        }
        return null;
    }

    evaluateBreakthrough(row, col) {
        let value = 0;
        
        // Check if blocked by diagonals first
        if (this.gameCore.isPositionBlockedByDiagonals(row, col, 'O')) {
            return -20;
        }
        
        // Check if this position could connect to existing O pieces
        const oPositions = this.gameCore.getPlayerPositions('O');
        for (const oPos of oPositions) {
            const distance = Math.abs(row - oPos.row) + Math.abs(col - oPos.col);
            if (distance <= 3) {
                value += 5 - distance;
            }
        }
        
        // Bonus for positions that could bypass X chains
        if (this.couldBypassXChain(row, col)) {
            value += 6;
        }
        
        return value;
    }

    couldBypassXChain(row, col) {
        const blockedDirections = this.countAdjacentPieces(row, col, 'X');
        return blockedDirections < 4; // If less than half directions blocked
    }

    // Horizontal Bridge Building
    findHorizontalBridgeMove() {
        const bridgeMoves = [];
        const emptyPositions = this.gameCore.getEmptyPositions();
        
        for (const pos of emptyPositions) {
            const bridgeValue = this.evaluateHorizontalBridge(pos.row, pos.col);
            if (bridgeValue > 0) {
                bridgeMoves.push({ row: pos.row, col: pos.col, value: bridgeValue });
            }
        }
        
        if (bridgeMoves.length > 0) {
            bridgeMoves.sort((a, b) => b.value - a.value);
            return bridgeMoves[0];
        }
        return null;
    }

    evaluateHorizontalBridge(row, col) {
        let value = 0;
        
        // Check if blocked by diagonals
        if (this.gameCore.isPositionBlockedByDiagonals(row, col, 'O')) {
            return -20;
        }
        
        // Find the leftmost and rightmost O pieces
        const oPositions = this.gameCore.getPlayerPositions('O');
        if (oPositions.length === 0) {
            // No O pieces yet - prefer edges
            if (col === 0 || col === this.gameCore.size - 1) {
                return 10;
            }
            return 1;
        }
        
        let leftmostO = this.gameCore.size;
        let rightmostO = -1;
        
        for (const pos of oPositions) {
            leftmostO = Math.min(leftmostO, pos.col);
            rightmostO = Math.max(rightmostO, pos.col);
        }
        
        // BRIDGE LOGIC: Extend the horizontal span
        if (col < leftmostO) {
            value += 15 + (leftmostO - col);
        } else if (col > rightmostO) {
            value += 15 + (col - rightmostO);
        } else if (col >= leftmostO && col <= rightmostO) {
            value += 5; // Filling gaps
        }
        
        // Bonus for being in same row as existing O pieces
        for (const pos of oPositions) {
            if (pos.row === row) {
                value += 3;
                break;
            }
        }
        
        // Small bonus for horizontal neighbors
        if (col > 0 && this.gameCore.board[row][col - 1] === 'O') value += 2;
        if (col < this.gameCore.size - 1 && this.gameCore.board[row][col + 1] === 'O') value += 2;
        
        // Penalty for vertical clustering
        let verticalNeighbors = 0;
        if (row > 0 && this.gameCore.board[row - 1][col] === 'O') verticalNeighbors++;
        if (row < this.gameCore.size - 1 && this.gameCore.board[row + 1][col] === 'O') verticalNeighbors++;
        
        if (verticalNeighbors > 1) {
            value -= 5;
        }
        
        return value;
    }

    // FIXED: Safe random move selection
    getRandomMove() {
        const emptyPositions = this.gameCore.getEmptyPositions();
        console.log(`AI: Getting random move from ${emptyPositions.length} empty positions`);
        
        if (emptyPositions.length === 0) {
            console.log('AI: No empty positions available!');
            return null;
        }
        
        // Double-check that positions are actually empty
        const validEmptyPositions = emptyPositions.filter(pos => 
            this.gameCore.isValidMove(pos.row, pos.col)
        );
        
        if (validEmptyPositions.length === 0) {
            console.log('AI: No valid empty positions after filtering!');
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * validEmptyPositions.length);
        const selectedMove = validEmptyPositions[randomIndex];
        
        console.log(`AI: Selected random move (${selectedMove.row}, ${selectedMove.col})`);
        return {
            row: selectedMove.row,
            col: selectedMove.col,
            value: 1
        };
    }

    countAdjacentPieces(row, col, player) {
        let count = 0;
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.gameCore.isValidPosition(newRow, newCol) && 
                this.gameCore.board[newRow][newCol] === player) {
                count++;
            }
        }
        
        return count;
    }

    // Performance Analysis
    analyzePosition() {
        const analysis = {
            emptySpaces: this.gameCore.getEmptyPositions().length,
            xPieces: this.gameCore.getPlayerPositions('X').length,
            oPieces: this.gameCore.getPlayerPositions('O').length,
            diagonalLocks: this.gameCore.diagonalLocks.length,
            gamePhase: this.getGamePhase()
        };
        
        return analysis;
    }

    getGamePhase() {
        const totalMoves = this.gameCore.moveCount;
        const boardSize = this.gameCore.size * this.gameCore.size;
        const progress = totalMoves / boardSize;
        
        if (progress < 0.2) return 'opening';
        if (progress < 0.6) return 'midgame';
        return 'endgame';
    }

    // AI Settings
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        console.log(`AI: Difficulty set to ${difficulty}`);
    }

    setAiPlayer(player) {
        this.aiPlayer = player;
        this.humanPlayer = player === 'X' ? 'O' : 'X';
        console.log(`AI: Playing as ${this.aiPlayer}, human is ${this.humanPlayer}`);
    }
}

// Export for use in other modules
window.ConnectionGameAI = ConnectionGameAI;