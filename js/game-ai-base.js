// game-ai-base.js - Abstract Base Class for All AI Strategies
// Provides common interface and utilities for X and O players

class GameAIBase {
    constructor(gameCore, player) {
        if (this.constructor === GameAIBase) {
            throw new Error('GameAIBase is abstract and cannot be instantiated directly');
        }
        
        this.gameCore = gameCore;
        this.player = player; // 'X' or 'O'
        this.opponent = player === 'X' ? 'O' : 'X';
        this.moveCount = 0;
        this.debugMode = true;
        
        // Player-specific goal configuration
        this.goalDirection = player === 'X' ? 'vertical' : 'horizontal';
        this.primaryAxis = player === 'X' ? 'row' : 'col';
        this.secondaryAxis = player === 'X' ? 'col' : 'row';
        
        // Edge configuration for each player
        this.edges = this.initializeEdges();
        
        // Common pattern definitions
        this.patterns = this.initializePatterns();
        
        this.log(`${this.player} AI initialized - Goal: ${this.goalDirection}`);
    }

    // ========================= ABSTRACT INTERFACE =========================
    
    /**
     * Get the next move for this AI player
     * @returns {Object|null} Move object with {row, col, value, reason} or null if no move
     */
    getNextMove() {
        throw new Error('getNextMove() must be implemented by subclass');
    }
    
    /**
     * Reset AI to initial state
     */
    reset() {
        throw new Error('reset() must be implemented by subclass');
    }
    
    /**
     * Get current AI statistics and status
     * @returns {Object} Statistics object
     */
    getStats() {
        throw new Error('getStats() must be implemented by subclass');
    }

    // ========================= PLAYER CONFIGURATION =========================
    
    initializeEdges() {
        if (this.player === 'X') {
            // X tries to connect top (row 0) to bottom (row size-1)
            return {
                start: { axis: 'row', value: 0, name: 'top' },
                end: { axis: 'row', value: this.gameCore.size - 1, name: 'bottom' },
                startArea: { axis: 'row', min: 0, max: 1, name: 'top area' },
                endArea: { axis: 'row', min: this.gameCore.size - 2, max: this.gameCore.size - 1, name: 'bottom area' }
            };
        } else {
            // O tries to connect left (col 0) to right (col size-1)
            return {
                start: { axis: 'col', value: 0, name: 'left' },
                end: { axis: 'col', value: this.gameCore.size - 1, name: 'right' },
                startArea: { axis: 'col', min: 0, max: 1, name: 'left area' },
                endArea: { axis: 'col', min: this.gameCore.size - 2, max: this.gameCore.size - 1, name: 'right area' }
            };
        }
    }
    
    initializePatterns() {
        return {
            // L-patterns (knight's move): distance 1,2 or 2,1
            lPatterns: [
                { dr: 1, dc: 2, name: 'L-right-down' },
                { dr: 1, dc: -2, name: 'L-left-down' },
                { dr: -1, dc: 2, name: 'L-right-up' },
                { dr: -1, dc: -2, name: 'L-left-up' },
                { dr: 2, dc: 1, name: 'L-down-right' },
                { dr: 2, dc: -1, name: 'L-down-left' },
                { dr: -2, dc: 1, name: 'L-up-right' },
                { dr: -2, dc: -1, name: 'L-up-left' }
            ],
            
            // I-patterns (straight line with gaps): distance 2,0 or 0,2 or 2,2
            iPatterns: [
                { dr: 0, dc: 2, name: 'I-right' },
                { dr: 0, dc: -2, name: 'I-left' },
                { dr: 2, dc: 0, name: 'I-down' },
                { dr: -2, dc: 0, name: 'I-up' },
                { dr: 2, dc: 2, name: 'I-diagonal-down-right' },
                { dr: 2, dc: -2, name: 'I-diagonal-down-left' },
                { dr: -2, dc: 2, name: 'I-diagonal-up-right' },
                { dr: -2, dc: -2, name: 'I-diagonal-up-left' }
            ],
            
            // Adjacent patterns (8-directional)
            adjacentPatterns: [
                { dr: -1, dc: -1, name: 'adjacent-up-left' },
                { dr: -1, dc: 0, name: 'adjacent-up' },
                { dr: -1, dc: 1, name: 'adjacent-up-right' },
                { dr: 0, dc: -1, name: 'adjacent-left' },
                { dr: 0, dc: 1, name: 'adjacent-right' },
                { dr: 1, dc: -1, name: 'adjacent-down-left' },
                { dr: 1, dc: 0, name: 'adjacent-down' },
                { dr: 1, dc: 1, name: 'adjacent-down-right' }
            ]
        };
    }

    // ========================= BOARD ANALYSIS UTILITIES =========================
    
    /**
     * Check if position is valid and within board bounds
     */
    isValidPosition(row, col) {
        return row >= 0 && row < this.gameCore.size && 
               col >= 0 && col < this.gameCore.size;
    }
    
    /**
     * Check if position is valid, empty, and available for move
     */
    isValidAndEmptyPosition(row, col) {
        return this.isValidPosition(row, col) && 
               this.gameCore.isValidMove(row, col);
    }
    
    /**
     * Check if position contains opponent's piece
     */
    isBlockedByOpponent(row, col) {
        return this.isValidPosition(row, col) && 
               this.gameCore.board[row][col] === this.opponent;
    }
    
    /**
     * Check if position contains our piece
     */
    isOccupiedByUs(row, col) {
        return this.isValidPosition(row, col) && 
               this.gameCore.board[row][col] === this.player;
    }
    
    /**
     * Get all positions occupied by a specific player
     */
    getPlayerPositions(player = this.player) {
        const positions = [];
        for (let row = 0; row < this.gameCore.size; row++) {
            for (let col = 0; col < this.gameCore.size; col++) {
                if (this.gameCore.board[row][col] === player) {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }
    
    /**
     * Get all empty positions on the board
     */
    getEmptyPositions() {
        const positions = [];
        for (let row = 0; row < this.gameCore.size; row++) {
            for (let col = 0; col < this.gameCore.size; col++) {
                if (this.gameCore.board[row][col] === '') {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }

    // ========================= EDGE AND GOAL UTILITIES =========================
    
    /**
     * Check if any of our pieces have reached the start edge
     */
    hasReachedStartEdge() {
        const positions = this.getPlayerPositions();
        return positions.some(pos => {
            return pos[this.edges.start.axis] === this.edges.start.value;
        });
    }
    
    /**
     * Check if any of our pieces have reached the end edge
     */
    hasReachedEndEdge() {
        const positions = this.getPlayerPositions();
        return positions.some(pos => {
            return pos[this.edges.end.axis] === this.edges.end.value;
        });
    }
    
    /**
     * Check if any of our pieces are in the start area
     */
    hasReachedStartArea() {
        const positions = this.getPlayerPositions();
        return positions.some(pos => {
            const value = pos[this.edges.startArea.axis];
            return value >= this.edges.startArea.min && value <= this.edges.startArea.max;
        });
    }
    
    /**
     * Check if any of our pieces are in the end area
     */
    hasReachedEndArea() {
        const positions = this.getPlayerPositions();
        return positions.some(pos => {
            const value = pos[this.edges.endArea.axis];
            return value >= this.edges.endArea.min && value <= this.edges.endArea.max;
        });
    }
    
    /**
     * Check if goal is complete (connected both edges)
     */
    isGoalComplete() {
        return this.hasReachedStartEdge() && this.hasReachedEndEdge();
    }
    
    /**
     * Get required direction for progress
     */
    getRequiredDirection() {
        const reachedStart = this.hasReachedStartArea();
        const reachedEnd = this.hasReachedEndArea();
        
        if (reachedStart && !this.hasReachedEndEdge()) {
            return this.edges.end.name; // Focus on reaching end
        } else if (reachedEnd && !this.hasReachedStartEdge()) {
            return this.edges.start.name; // Focus on reaching start
        }
        return 'any'; // Can extend in any direction
    }

    // ========================= PATTERN UTILITIES =========================
    
    /**
     * Apply pattern to position and return new position
     */
    applyPattern(row, col, pattern) {
        return {
            row: row + pattern.dr,
            col: col + pattern.dc,
            pattern: pattern
        };
    }
    
    /**
     * Get all valid positions from applying patterns to a position
     */
    getValidPatternPositions(row, col, patternType = 'all') {
        const results = [];
        let patternsToTry = [];
        
        switch (patternType) {
            case 'L':
                patternsToTry = this.patterns.lPatterns;
                break;
            case 'I':
                patternsToTry = this.patterns.iPatterns;
                break;
            case 'adjacent':
                patternsToTry = this.patterns.adjacentPatterns;
                break;
            case 'all':
            default:
                patternsToTry = [
                    ...this.patterns.lPatterns,
                    ...this.patterns.iPatterns,
                    ...this.patterns.adjacentPatterns
                ];
                break;
        }
        
        for (const pattern of patternsToTry) {
            const newPos = this.applyPattern(row, col, pattern);
            if (this.isValidPosition(newPos.row, newPos.col)) {
                results.push(newPos);
            }
        }
        
        return results;
    }
    
    /**
     * Check if two positions are connected by a specific pattern type
     */
    arePositionsConnected(pos1, pos2, connectionType = 'any') {
        const rowDiff = Math.abs(pos2.row - pos1.row);
        const colDiff = Math.abs(pos2.col - pos1.col);
        
        switch (connectionType) {
            case 'adjacent':
                return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
                
            case 'L':
                return (rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1);
                
            case 'I':
                return (rowDiff === 0 && colDiff === 2) || 
                       (rowDiff === 2 && colDiff === 0) || 
                       (rowDiff === 2 && colDiff === 2);
                
            case 'any':
            default:
                return this.arePositionsConnected(pos1, pos2, 'adjacent') ||
                       this.arePositionsConnected(pos1, pos2, 'L') ||
                       this.arePositionsConnected(pos1, pos2, 'I');
        }
    }

    // ========================= PROGRESS CALCULATION =========================
    
    /**
     * Calculate progress toward goal (0-100%)
     */
    calculateGoalProgress() {
        const positions = this.getPlayerPositions();
        if (positions.length === 0) return 0;
        
        if (this.player === 'X') {
            // Vertical progress: span from top to bottom
            const minRow = Math.min(...positions.map(p => p.row));
            const maxRow = Math.max(...positions.map(p => p.row));
            return ((maxRow - minRow + 1) / this.gameCore.size) * 100;
        } else {
            // Horizontal progress: span from left to right
            const minCol = Math.min(...positions.map(p => p.col));
            const maxCol = Math.max(...positions.map(p => p.col));
            return ((maxCol - minCol + 1) / this.gameCore.size) * 100;
        }
    }
    
    /**
     * Get span of positions along primary axis
     */
    getPrimaryAxisSpan() {
        const positions = this.getPlayerPositions();
        if (positions.length === 0) return 0;
        
        const values = positions.map(p => p[this.primaryAxis]);
        return Math.max(...values) - Math.min(...values) + 1;
    }

    // ========================= MOVE EVALUATION UTILITIES =========================
    
    /**
     * Evaluate a position's strategic value
     */
    evaluatePosition(row, col, context = {}) {
        let score = 0;
        let reasons = [];
        
        // Base score
        score += 10;
        reasons.push('base');
        
        // Progress toward goal
        const progressValue = this.evaluateGoalProgress(row, col);
        score += progressValue;
        if (progressValue > 0) reasons.push(`goal +${progressValue}`);
        
        // Edge proximity
        const edgeValue = this.evaluateEdgeProximity(row, col);
        score += edgeValue;
        if (edgeValue > 0) reasons.push(`edge +${edgeValue}`);
        
        // Center preference (mild)
        const centerValue = this.evaluateCenterProximity(row, col);
        score += centerValue;
        if (centerValue > 0) reasons.push(`center +${centerValue}`);
        
        // Connectivity to existing pieces
        const connectivityValue = this.evaluateConnectivity(row, col);
        score += connectivityValue;
        if (connectivityValue > 0) reasons.push(`connect +${connectivityValue}`);
        
        return {
            score: score,
            reasons: reasons,
            details: reasons.join(', ')
        };
    }
    
    evaluateGoalProgress(row, col) {
        // Subclasses should override for specific goal evaluation
        return 0;
    }
    
    evaluateEdgeProximity(row, col) {
        const startDistance = Math.abs(col - this.edges.start.value);
        const endDistance = Math.abs(col - this.edges.end.value);
        const minDistance = Math.min(startDistance, endDistance);
        return Math.max(0, 20 - minDistance * 2);
    }
    
    evaluateCenterProximity(row, col) {
        const centerRow = Math.floor(this.gameCore.size / 2);
        const centerCol = Math.floor(this.gameCore.size / 2);
        const distance = Math.abs(row - centerRow) + Math.abs(col - centerCol);
        return Math.max(0, 15 - distance);
    }
    
    evaluateConnectivity(row, col) {
        // Count adjacent friendly pieces
        let count = 0;
        const adjacent = this.getValidPatternPositions(row, col, 'adjacent');
        
        for (const pos of adjacent) {
            if (this.isOccupiedByUs(pos.row, pos.col)) {
                count++;
            }
        }
        
        return count * 5; // 5 points per adjacent friendly piece
    }

    // ========================= DEBUGGING AND LOGGING =========================
    
    log(message) {
        if (this.debugMode) {
            console.log(`[${this.player} AI] ${message}`);
        }
    }
    
    logMove(move, context = '') {
        const cellNumber = move.row * this.gameCore.size + move.col + 1;
        const moveText = `${this.player}${this.moveCount} at (${move.row},${move.col}) [cell ${cellNumber}]`;
        this.log(`${context}${moveText} - ${move.reason || 'no reason'}`);
    }
    
    /**
     * Get common statistics shared by all AI types
     */
    getCommonStats() {
        const positions = this.getPlayerPositions();
        
        return {
            player: this.player,
            moveCount: this.moveCount,
            pieceCount: positions.length,
            goalDirection: this.goalDirection,
            goalProgress: this.calculateGoalProgress(),
            hasReachedStart: this.hasReachedStartEdge(),
            hasReachedEnd: this.hasReachedEndEdge(),
            hasReachedStartArea: this.hasReachedStartArea(),
            hasReachedEndArea: this.hasReachedEndArea(),
            isGoalComplete: this.isGoalComplete(),
            requiredDirection: this.getRequiredDirection(),
            primaryAxisSpan: this.getPrimaryAxisSpan()
        };
    }
    
    /**
     * Debug board state from this AI's perspective
     */
    debugBoardState() {
        this.log('=== BOARD STATE DEBUG ===');
        this.log(`Player: ${this.player}, Goal: ${this.goalDirection}`);
        this.log(`Our pieces: ${this.getPlayerPositions().length}`);
        this.log(`Opponent pieces: ${this.getPlayerPositions(this.opponent).length}`);
        this.log(`Goal progress: ${this.calculateGoalProgress().toFixed(1)}%`);
        this.log(`Start edge: ${this.hasReachedStartEdge()}, End edge: ${this.hasReachedEndEdge()}`);
        this.log(`Required direction: ${this.getRequiredDirection()}`);
        this.log('=== END DEBUG ===');
    }
}

// Export for use in other modules
window.GameAIBase = GameAIBase;