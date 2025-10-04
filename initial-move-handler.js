// initial-move-handler.js - COMPLETE VERSION
// FIXED: x2 now includes fromHead metadata so x1's valency is properly tracked
// ARCHITECTURE: Generates x1 and x2, both treated as extensions for head tracking

class InitialMoveHandler {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        this.direction = player === 'X' ? 'vertical' : 'horizontal';
        
        this.debugMode = true;
        this.log('🎯 Initial Move Handler initialized - with x2 head tracking');
    }

    // ===== INITIAL MOVE (FIRST MOVE) =====
    
    /**
     * Generate the very first move of the game
     * STRATEGY: Place in center area with small random offset
     */
    generateInitialMove() {
        this.log('🎲 Generating initial move...');
        
        const centerRow = Math.floor(this.gameCore.size / 2);
        const centerCol = Math.floor(this.gameCore.size / 2);
        
        // Small random offset from center
        const rowOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const colOffset = Math.floor(Math.random() * 3) - 1;
        
        // Ensure we stay within reasonable bounds
        const row = Math.max(2, Math.min(this.gameCore.size - 3, centerRow + rowOffset));
        const col = Math.max(2, Math.min(this.gameCore.size - 3, centerCol + colOffset));
        
        this.log(`✅ Initial move selected: (${row}, ${col})`);
        
        return {
            row: row,
            col: col,
            reason: `Initial move - center area with offset (${rowOffset}, ${colOffset})`,
            pattern: 'initial',
            moveType: 'initial',
            value: 50
        };
    }

    // ===== SECOND MOVE =====
    
    /**
     * Generate the second move of the game
     * STRATEGY: Create L-pattern from first move, with threat response
     * FIXED: Returns move with fromHead metadata
     */
    generateSecondMove() {
        this.log('🎯 Generating second move...');
        
        const firstMove = this.getFirstMovePosition();
        if (!firstMove) {
            this.log('❌ Cannot find first move position');
            return null;
        }
        
        this.log(`📍 First move was at (${firstMove.row}, ${firstMove.col})`);
        
        // Check for opponent threat
        const opponentThreat = this.detectSecondMoveThreat(firstMove);
        if (opponentThreat) {
            this.log(`🚨 Opponent threat detected: ${opponentThreat.direction}`);
            return this.generateThreatResponseSecondMove(firstMove, opponentThreat);
        }
        
        // Normal second move - L-pattern
        return this.generateNormalSecondMove(firstMove);
    }
    
    getFirstMovePosition() {
        // Find our only piece on the board
        for (let row = 0; row < this.gameCore.size; row++) {
            for (let col = 0; col < this.gameCore.size; col++) {
                if (this.gameCore.board[row][col] === this.player) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    
    detectSecondMoveThreat(firstMove) {
        // Check 4 lateral directions for opponent pieces
        const directions = [
            { row: -1, col: 0, name: 'north' },
            { row: 1, col: 0, name: 'south' },
            { row: 0, col: -1, name: 'west' },
            { row: 0, col: 1, name: 'east' }
        ];
        
        for (const dir of directions) {
            const checkRow = firstMove.row + dir.row;
            const checkCol = firstMove.col + dir.col;
            
            if (this.isValidPosition(checkRow, checkCol)) {
                const cellValue = this.gameCore.board[checkRow][checkCol];
                if (cellValue === this.opponent) {
                    return {
                        direction: dir.name,
                        position: { row: checkRow, col: checkCol },
                        offset: dir
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Generate threat response second move
     * FIXED: Includes fromHead metadata and proper direction
     */
    generateThreatResponseSecondMove(firstMove, threat) {
        this.log(`⚡ Generating diagonal threat response from x1...`);
        
        // Calculate diagonal position away from threat
        const diagonalRow = firstMove.row - threat.offset.row;
        const diagonalCol = firstMove.col - threat.offset.col;
        
        if (!this.isValidPosition(diagonalRow, diagonalCol)) {
            this.log('❌ Diagonal threat response position invalid');
            return this.generateNormalSecondMove(firstMove);
        }
        
        if (this.gameCore.board[diagonalRow][diagonalCol]) {
            this.log('❌ Diagonal threat response position occupied');
            return this.generateNormalSecondMove(firstMove);
        }
        
        // ✅ Determine direction from x1 to x2
        const rowDiff = diagonalRow - firstMove.row;
        let direction = 'north';
        
        if (this.player === 'X') {
            direction = rowDiff < 0 ? 'north' : 'south';
        } else {
            const colDiff = diagonalCol - firstMove.col;
            direction = colDiff < 0 ? 'west' : 'east';
        }
        
        this.log(`✅ Diagonal threat response: (${diagonalRow}, ${diagonalCol}), direction: ${direction}`);
        
        // ✅ FIXED: Return move with fromHead metadata and chain-extension type
        return {
            row: diagonalRow,
            col: diagonalCol,
            reason: `Diagonal threat response from x1 (${firstMove.row},${firstMove.col}) - blocking ${threat.direction} threat`,
            pattern: 'diagonal',
            moveType: 'chain-extension',  // ✅ Changed from 'second-move'
            direction: direction,          // ✅ Added direction
            fromHead: {                    // ✅ Added fromHead metadata
                row: firstMove.row,
                col: firstMove.col
            },
            value: 80
        };
    }
    
    /**
     * Generate normal second move (no threat)
     * FIXED: Includes fromHead metadata and proper direction
     */
    generateNormalSecondMove(firstMove) {
        this.log('📐 Generating normal L-shaped second move...');
        
        // Generate all possible L-shaped moves
        const lMoves = this.generateLShapedMoves(firstMove);
        
        // Filter valid moves
        const validMoves = lMoves.filter(move => 
            this.isValidPosition(move.row, move.col) && 
            !this.gameCore.board[move.row][move.col]
        );
        
        if (validMoves.length === 0) {
            this.log('❌ No valid L-shaped moves available');
            return null;
        }
        
        // Prioritize moves based on player direction
        const prioritizedMoves = this.prioritizeSecondMoves(validMoves, firstMove);
        
        // Select best move
        const selectedMove = prioritizedMoves[0];
        
        // ✅ Calculate direction from x1 to x2
        const rowDiff = selectedMove.row - firstMove.row;
        const colDiff = selectedMove.col - firstMove.col;
        
        // Determine primary direction
        let direction = 'north';
        if (this.player === 'X') {
            direction = rowDiff < 0 ? 'north' : 'south';
        } else {
            direction = colDiff < 0 ? 'west' : 'east';
        }
        
        this.log(`✅ L-shaped second move: (${selectedMove.row}, ${selectedMove.col}), direction: ${direction}`);
        
        // ✅ FIXED: Return move with fromHead metadata
        return {
            row: selectedMove.row,
            col: selectedMove.col,
            reason: `L-pattern extension from x1 (${firstMove.row},${firstMove.col}) - ${selectedMove.pattern} extending ${direction}`,
            pattern: selectedMove.pattern,
            moveType: 'chain-extension',  // ✅ Changed from 'second-move'
            direction: direction,          // ✅ Added direction
            fromHead: {                    // ✅ Added fromHead metadata
                row: firstMove.row,
                col: firstMove.col
            },
            value: 60
        };
    }
    
    generateLShapedMoves(fromPosition) {
        const moves = [];
        
        // All 8 L-shaped offsets
        const lOffsets = [
            { row: -2, col: -1, pattern: 'L-up-left' },
            { row: -2, col: 1, pattern: 'L-up-right' },
            { row: 2, col: -1, pattern: 'L-down-left' },
            { row: 2, col: 1, pattern: 'L-down-right' },
            { row: -1, col: -2, pattern: 'L-left-up' },
            { row: 1, col: -2, pattern: 'L-left-down' },
            { row: -1, col: 2, pattern: 'L-right-up' },
            { row: 1, col: 2, pattern: 'L-right-down' }
        ];
        
        for (const offset of lOffsets) {
            const newRow = fromPosition.row + offset.row;
            const newCol = fromPosition.col + offset.col;
            
            moves.push({
                row: newRow,
                col: newCol,
                pattern: offset.pattern,
                fromPosition: fromPosition
            });
        }
        
        return moves;
    }
    
    prioritizeSecondMoves(moves, firstMove) {
        const scoredMoves = moves.map(move => {
            let score = 0;
            
            // Prioritize based on player direction
            if (this.player === 'X') {
                // Vertical player: prefer vertical L-patterns
                if (move.pattern.includes('up') || move.pattern.includes('down')) {
                    score += 20;
                }
                // Prefer moving toward target borders
                if (move.row < firstMove.row) {
                    score += 10; // Toward top border
                } else if (move.row > firstMove.row) {
                    score += 5;  // Toward bottom border
                }
            } else {
                // Horizontal player: prefer horizontal L-patterns
                if (move.pattern.includes('left') || move.pattern.includes('right')) {
                    score += 20;
                }
                // Prefer moving toward target borders
                if (move.col < firstMove.col) {
                    score += 10; // Toward left border
                } else if (move.col > firstMove.col) {
                    score += 5;  // Toward right border
                }
            }
            
            // Small random factor
            score += Math.random() * 5;
            
            return { ...move, priority: score };
        });
        
        // Sort by priority
        scoredMoves.sort((a, b) => b.priority - a.priority);
        
        return scoredMoves;
    }

    // ===== UTILITY =====
    
    isValidPosition(row, col) {
        return row >= 0 && row < this.gameCore.size &&
               col >= 0 && col < this.gameCore.size;
    }

    // ===== LOGGING =====
    
    log(message) {
        if (this.debugMode) {
            console.log(`[INITIAL-MOVE-HANDLER] ${message}`);
        }
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.InitialMoveHandler = InitialMoveHandler;
    console.log('✅ Initial Move Handler loaded - x2 with fromHead metadata');
}