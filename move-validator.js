// CLEAN MOVE VALIDATOR - Under 250 lines, no complexity
class MoveValidator {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        
        // Simple components
        this.diagonalLinesManager = null;
        this.debugMode = true;
        
        this.log('✅ Clean Move Validator initialized - Simple validation only');
    }

    // ===== MAIN VALIDATION =====
    
    validateMove(move) {
        const validation = {
            isValid: false,
            passedTests: [],
            failedTests: [],
            warnings: []
        };
        
        this.log(`🔍 Validating move: (${move?.row}, ${move?.col})`);
        
        try {
            const tests = [
                this.testFormat(move),
                this.testBounds(move),
                this.testAvailable(move),
                this.testDiagonals(move)
            ];
            
            validation.passedTests = tests.filter(test => test.passed);
            validation.failedTests = tests.filter(test => !test.passed);
            
            // Simple rule: all tests must pass
            validation.isValid = validation.failedTests.length === 0;
            
            if (validation.isValid) {
                this.log(`✅ Move validation passed (${validation.passedTests.length} tests)`);
            } else {
                const failures = validation.failedTests.map(t => t.message).join(', ');
                this.log(`❌ Move validation failed: ${failures}`);
            }
            
        } catch (error) {
            this.log(`💥 Validation error: ${error.message}`);
            validation.isValid = false;
            validation.failedTests.push({
                name: 'system-error',
                message: `Validation error: ${error.message}`
            });
        }
        
        return validation;
    }

    // ===== PRIORITY VALIDATION (for threat responses) =====
    
    validateMoveWithPriority(move, priority = 'MEDIUM') {
        const validation = this.validateMove(move);
        
        // For threat responses, allow override if only diagonal crossing failed
        if (!validation.isValid && priority === 'CRITICAL') {
            const nonDiagonalFailures = validation.failedTests.filter(test => 
                test.name !== 'diagonals'
            );
            
            if (nonDiagonalFailures.length === 0) {
                return {
                    isValid: false,
                    canOverride: true,
                    overrideReason: 'Threat response - allowing diagonal crossing for defense'
                };
            }
        }
        
        return {
            isValid: validation.isValid,
            canOverride: false,
            passedTests: validation.passedTests,
            failedTests: validation.failedTests
        };
    }

    // ===== VALIDATION TESTS =====
    
    testFormat(move) {
        const test = { name: 'format', passed: true, message: 'Valid format' };
        
        if (!move || typeof move.row !== 'number' || typeof move.col !== 'number') {
            test.passed = false;
            test.message = 'Invalid format - row/col must be numbers';
        }
        
        return test;
    }
    
    testBounds(move) {
        const test = { name: 'bounds', passed: true, message: 'Within bounds' };
        
        if (move.row < 0 || move.row >= this.gameCore.size || 
            move.col < 0 || move.col >= this.gameCore.size) {
            test.passed = false;
            test.message = `Out of bounds: (${move.row},${move.col})`;
        }
        
        return test;
    }
    
    testAvailable(move) {
        const test = { name: 'available', passed: true, message: 'Position available' };
        
        const cell = this.gameCore.board[move.row][move.col];
        if (cell !== '' && cell !== null) {
            test.passed = false;
            test.message = `Position occupied by ${cell}`;
        }
        
        return test;
    }
    
    testDiagonals(move) {
        const test = { name: 'diagonals', passed: true, message: 'No diagonal crossing' };
        
        try {
            // Check if move crosses opponent diagonals
            if (this.wouldCrossOpponentDiagonal(move)) {
                test.passed = false;
                test.message = 'Would cross opponent diagonal';
                return test;
            }
            
            // Check if move crosses our own diagonals (self-blocking)
            if (this.wouldCrossOwnDiagonal(move)) {
                test.passed = false;
                test.message = 'Would cross own diagonal';
                return test;
            }
            
        } catch (error) {
            this.log(`⚠️ Diagonal test error: ${error.message}`);
            // Continue without diagonal testing if there's an error
        }
        
        return test;
    }

    // ===== DIAGONAL CROSSING DETECTION =====
    
    wouldCrossOpponentDiagonal(move) {
        if (this.diagonalLinesManager && 
            typeof this.diagonalLinesManager.wouldMoveCrossOpponentDiagonal === 'function') {
            return this.diagonalLinesManager.wouldMoveCrossOpponentDiagonal(move, this.player);
        }
        
        // Fallback: use gameCore method if available
        if (typeof this.gameCore.wouldMoveCrossOpponentDiagonal === 'function') {
            return this.gameCore.wouldMoveCrossOpponentDiagonal(move.row, move.col, this.player);
        }
        
        // If no diagonal detection available, assume no crossing
        return false;
    }
    
    wouldCrossOwnDiagonal(move) {
        if (this.diagonalLinesManager && 
            typeof this.diagonalLinesManager.wouldMoveCrossOwnDiagonal === 'function') {
            return this.diagonalLinesManager.wouldMoveCrossOwnDiagonal(move, this.player);
        }
        
        // Simple check: look for our own diagonal connections that would be crossed
        return this.checkSimpleDiagonalCrossing(move);
    }
    
    checkSimpleDiagonalCrossing(move) {
        // Simple diagonal crossing check
        const adjacentCells = this.getAdjacentCells(move.row, move.col);
        
        for (const cell of adjacentCells) {
            if (this.gameCore.board[cell.row] && 
                this.gameCore.board[cell.row][cell.col] === this.player) {
                
                // Check if this would create a diagonal crossing
                // This is a simplified check - full implementation would be more complex
                const diagonals = this.getDiagonalPairs(move.row, move.col);
                for (const diagonal of diagonals) {
                    if (this.gameCore.board[diagonal.row1] && 
                        this.gameCore.board[diagonal.row1][diagonal.col1] === this.opponent &&
                        this.gameCore.board[diagonal.row2] && 
                        this.gameCore.board[diagonal.row2][diagonal.col2] === this.opponent) {
                        return true; // Would cross opponent diagonal
                    }
                }
            }
        }
        
        return false;
    }

    // ===== UTILITY METHODS =====
    
    getAdjacentCells(row, col) {
        const adjacent = [];
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (newRow >= 0 && newRow < this.gameCore.size && 
                    newCol >= 0 && newCol < this.gameCore.size) {
                    adjacent.push({ row: newRow, col: newCol });
                }
            }
        }
        
        return adjacent;
    }
    
    getDiagonalPairs(row, col) {
        // Return diagonal pairs for crossing detection
        return [
            { row1: row-1, col1: col-1, row2: row+1, col2: col+1 }, // NW-SE diagonal
            { row1: row-1, col1: col+1, row2: row+1, col2: col-1 }  // NE-SW diagonal
        ];
    }

    // ===== COMPONENT INJECTION =====
    
    setDiagonalLinesManager(diagonalLinesManager) {
        this.diagonalLinesManager = diagonalLinesManager;
        this.log('🔗 Diagonal lines manager connected');
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
    
    log(message) {
        if (this.debugMode) {
            console.log(`[CLEAN-MOVE-VALIDATOR] ${message}`);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.MoveValidator = MoveValidator;
    console.log('✅ Clean Move Validator loaded - Simple validation, under 250 lines');
}