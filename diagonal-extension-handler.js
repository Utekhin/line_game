// diagonal-extension-handler.js - CLEAN: Direct board access, all getCell removed  
// MODULAR: Handles diagonal extension moves for secure connections

class DiagonalExtensionHandler {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        this.direction = player === 'X' ? 'vertical' : 'horizontal';
        
        // Component references (injected)
        this.diagonalLinesManager = null;
        this.gapRegistry = null;
        
        // Diagonal extension tracking
        this.diagonalHistory = [];
        this.secureExtensions = [];
        this.lastDiagonalCheck = -1;
        
        this.debugMode = true;
        this.log('↗️ Diagonal Extension Handler initialized - Secure extension system');
    }

    // ===== COMPONENT INJECTION =====
    
    setDiagonalLinesManager(diagonalLinesManager) {
        this.diagonalLinesManager = diagonalLinesManager;
        this.log('🔗 Diagonal lines manager connected');
    }
    
    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        this.log('📊 Gap registry connected');
    }

    // ===== MAIN DIAGONAL EXTENSION =====
    
    /**
     * Generate diagonal extension moves
     * PRIORITY: Lower priority, used when other options aren't available
     */
    generateDiagonalExtension() {
        this.log('↗️ Analyzing diagonal extension opportunities...');
        
        try {
            // Find candidates for diagonal extension
            const candidates = this.findDiagonalExtensionCandidates();
            
            if (candidates.length === 0) {
                this.log('✅ No diagonal extension candidates found');
                return null;
            }
            
            this.log(`🔍 Found ${candidates.length} diagonal extension candidates`);
            
            // Generate diagonal moves for each candidate
            const diagonalMoves = [];
            for (const candidate of candidates) {
                const moves = this.generateDiagonalMovesForPiece(candidate);
                diagonalMoves.push(...moves);
            }
            
            if (diagonalMoves.length === 0) {
                this.log('❌ No valid diagonal moves generated');
                return null;
            }
            
            // Select best diagonal move
            const bestMove = this.selectBestDiagonalMove(diagonalMoves);
            if (bestMove) {
                this.recordDiagonalExtension(bestMove);
                return bestMove;
            }
            
            return null;
            
        } catch (error) {
            this.log(`💥 Error in diagonal extension: ${error.message}`);
            return null;
        }
    }

    // ===== CANDIDATE IDENTIFICATION =====
    
    findDiagonalExtensionCandidates() {
        const candidates = [];
        const playerPositions = this.getPlayerPositions();
        
        for (const position of playerPositions) {
            const extensionInfo = this.analyzeDiagonalExtensionPotential(position);
            if (extensionInfo.hasPotential) {
                candidates.push({
                    ...position,
                    extensionInfo: extensionInfo
                });
            }
        }
        
        // Sort by extension potential (best first)
        return candidates.sort((a, b) => 
            b.extensionInfo.overallValue - a.extensionInfo.overallValue
        );
    }
    
    analyzeDiagonalExtensionPotential(position) {
        const analysis = {
            hasPotential: false,
            overallValue: 0,
            directions: [],
            securityLevel: 0
        };
        
        // Check all 8 diagonal directions
        const diagonalDirections = [
            { row: -1, col: -1, name: 'northwest', type: 'diagonal' },
            { row: -1, col: 1, name: 'northeast', type: 'diagonal' },
            { row: 1, col: -1, name: 'southwest', type: 'diagonal' },
            { row: 1, col: 1, name: 'southeast', type: 'diagonal' }
        ];
        
        for (const direction of diagonalDirections) {
            const directionValue = this.evaluateDiagonalDirection(position, direction);
            if (directionValue.value > 15) {
                analysis.directions.push({
                    ...direction,
                    value: directionValue.value,
                    position: directionValue.position,
                    reasoning: directionValue.reasoning
                });
            }
        }
        
        if (analysis.directions.length > 0) {
            analysis.hasPotential = true;
            analysis.overallValue = Math.max(...analysis.directions.map(d => d.value));
            analysis.securityLevel = this.calculateSecurityLevel(position);
        }
        
        return analysis;
    }
    
    evaluateDiagonalDirection(fromPosition, direction) {
        const evaluation = {
            value: 0,
            position: null,
            reasoning: []
        };
        
        // Calculate target position
        const targetRow = fromPosition.row + direction.row;
        const targetCol = fromPosition.col + direction.col;
        
        if (!this.isValidPosition(targetRow, targetCol)) {
            return evaluation;
        }
        
        // Check if target position is empty
        if (this.gameCore.board[targetRow][targetCol]) {
            return evaluation;
        }
        
        evaluation.position = { row: targetRow, col: targetCol };
        
        // Base value for valid diagonal move
        evaluation.value = 20;
        evaluation.reasoning.push('Valid diagonal position');
        
        // Strategic bonuses
        evaluation.value += this.calculateProximityToOpponent(evaluation.position);
        evaluation.value += this.calculateConnectivityBonus(evaluation.position);
        evaluation.value += this.calculateBorderProgressBonus(evaluation.position);
        
        return evaluation;
    }
    
    calculateProximityToOpponent(position) {
        let proximity = 0;
        
        // Check 8 directions for opponent pieces
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const checkRow = position.row + dr;
                const checkCol = position.col + dc;
                
                if (this.isValidPosition(checkRow, checkCol) &&
                    this.gameCore.board[checkRow][checkCol] === this.opponent) {
                    proximity++;
                }
            }
        }
        
        return proximity;
    }
    
    calculateConnectivityBonus(position) {
        let bonus = 0;
        
        // Check for adjacent own pieces
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const checkRow = position.row + dr;
                const checkCol = position.col + dc;
                
                if (this.isValidPosition(checkRow, checkCol) &&
                    this.gameCore.board[checkRow][checkCol] === this.player) {
                    
                    // Different bonuses for different connection types
                    if (Math.abs(dr) === Math.abs(dc)) {
                        bonus += 8; // Diagonal connection
                    } else {
                        bonus += 5; // Adjacent connection
                    }
                }
            }
        }
        
        return Math.min(bonus, 20); // Cap the bonus
    }
    
    calculateBorderProgressBonus(position) {
        let bonus = 0;
        
        // Calculate distance to target borders
        const borderDistance = this.calculateBorderDistance(position);
        
        // Closer to border = higher bonus
        if (borderDistance <= 3) {
            bonus += 15 - borderDistance * 3;
        }
        
        return Math.max(0, bonus);
    }
    
    calculateSecurityLevel(position) {
        let security = 50; // Base security
        
        // Check for opponent threats
        const threats = this.countNearbyOpponentThreats(position);
        security -= threats * 10;
        
        // Check for our support
        const support = this.countNearbyOwnPieces(position);
        security += support * 5;
        
        return Math.max(0, Math.min(100, security));
    }
    
    countNearbyOpponentThreats(position) {
        let threats = 0;
        
        // Check in 2-cell radius for opponent pieces
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const checkRow = position.row + dr;
                const checkCol = position.col + dc;
                
                if (this.isValidPosition(checkRow, checkCol) &&
                    this.gameCore.board[checkRow][checkCol] === this.opponent) {
                    threats++;
                }
            }
        }
        
        return threats;
    }
    
    countNearbyOwnPieces(position) {
        let count = 0;
        
        // Check in adjacent cells for our pieces
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const checkRow = position.row + dr;
                const checkCol = position.col + dc;
                
                if (this.isValidPosition(checkRow, checkCol) &&
                    this.gameCore.board[checkRow][checkCol] === this.player) {
                    count++;
                }
            }
        }
        
        return count;
    }

    // ===== DIAGONAL MOVE GENERATION =====
    
    generateDiagonalMovesForPiece(candidate) {
        const moves = [];
        
        // Generate moves for each viable direction
        for (const direction of candidate.extensionInfo.directions) {
            if (direction.value >= 15) { // Only consider good directions
                const move = {
                    row: direction.position.row,
                    col: direction.position.col,
                    fromPiece: { row: candidate.row, col: candidate.col },
                    direction: direction.name,
                    directionType: direction.type,
                    value: direction.value,
                    extensionType: 'diagonal',
                    securityLevel: candidate.extensionInfo.securityLevel,
                    reasoning: direction.reasoning
                };
                
                // Additional validation
                if (this.isValidDiagonalMove(move)) {
                    moves.push(move);
                }
            }
        }
        
        return moves;
    }
    
    isValidDiagonalMove(move) {
        // Basic position check
        if (!this.isValidPosition(move.row, move.col)) return false;
        
        // Check if position is empty
        if (this.gameCore.board[move.row][move.col]) return false;
        
        // Check if move would create illegal crossing
        if (this.wouldCreateIllegalCrossing(move)) return false;
        
        // Check if move advances our strategic position
        if (move.value < 10) return false;
        
        return true;
    }
    
    wouldCreateIllegalCrossing(move) {
        // Check if this diagonal move would cross opponent's established diagonal lines
        if (!this.diagonalLinesManager) return false;
        
        try {
            // This would need to interface with the diagonal lines system
            // For now, implement basic crossing detection
            return this.wouldCrossOpponentDiagonal(move.fromPiece, { row: move.row, col: move.col });
        } catch (error) {
            this.log(`⚠️ Error checking illegal crossing: ${error.message}`);
            return false;
        }
    }
    
    wouldCrossOpponentDiagonal(fromPos, toPos) {
        // Simple implementation - check if there's an opponent diagonal line between positions
        // This is a placeholder for more sophisticated diagonal line checking
        
        const deltaRow = toPos.row - fromPos.row;
        const deltaCol = toPos.col - fromPos.col;
        
        // Only check for diagonal moves
        if (Math.abs(deltaRow) !== Math.abs(deltaCol) || deltaRow === 0) {
            return false;
        }
        
        // Check intermediate positions for opponent diagonal blocking
        const stepRow = deltaRow > 0 ? 1 : -1;
        const stepCol = deltaCol > 0 ? 1 : -1;
        
        let currentRow = fromPos.row + stepRow;
        let currentCol = fromPos.col + stepCol;
        
        while (currentRow !== toPos.row && currentCol !== toPos.col) {
            if (this.gameCore.board[currentRow][currentCol] === this.opponent) {
                return true; // Opponent blocking this diagonal
            }
            currentRow += stepRow;
            currentCol += stepCol;
        }
        
        return false;
    }

    // ===== MOVE SELECTION =====
    
    selectBestDiagonalMove(moves) {
        if (!moves || moves.length === 0) return null;
        
        // Score and sort moves
        const scoredMoves = moves.map(move => ({
            ...move,
            finalScore: this.calculateFinalDiagonalScore(move)
        }));
        
        scoredMoves.sort((a, b) => b.finalScore - a.finalScore);
        
        // Log top candidates
        this.log('📊 Diagonal extension candidates:');
        scoredMoves.slice(0, 3).forEach((move, i) => {
            this.log(`  ${i+1}. (${move.row},${move.col}) ${move.direction} - Score: ${move.finalScore}`);
        });
        
        const bestMove = scoredMoves[0];
        
        return {
            row: bestMove.row,
            col: bestMove.col,
            reason: `Diagonal extension ${bestMove.direction} from (${bestMove.fromPiece.row},${bestMove.fromPiece.col})`,
            pattern: 'diagonal',
            value: bestMove.finalScore,
            direction: bestMove.direction,
            extensionType: bestMove.extensionType
        };
    }
    
    calculateFinalDiagonalScore(move) {
        let score = move.value; // Base value from direction evaluation
        
        // Security bonus
        score += move.securityLevel * 0.3;
        
        // Strategic position bonus
        score += this.calculateStrategicDiagonalBonus(move);
        
        // Timing bonus (early game vs late game)
        score += this.calculateTimingBonus();
        
        return Math.round(score);
    }
    
    calculateStrategicDiagonalBonus(move) {
        let bonus = 0;
        
        // Center area bonus
        const center = Math.floor(this.gameCore.size / 2);
        const distanceFromCenter = Math.abs(move.row - center) + Math.abs(move.col - center);
        
        if (distanceFromCenter <= 4) {
            bonus += 8;
        }
        
        // Border approach bonus
        const borderDistance = this.calculateBorderDistance({ row: move.row, col: move.col });
        if (borderDistance <= 4) {
            bonus += 10 - borderDistance;
        }
        
        return bonus;
    }
    
    calculateTimingBonus() {
        const moveCount = this.gameCore.moveCount || 0;
        
        // Diagonal extensions are better in mid-game
        if (moveCount >= 8 && moveCount <= 20) {
            return 5; // Mid-game bonus
        } else if (moveCount < 5) {
            return -5; // Early game penalty
        }
        
        return 0;
    }

    // ===== TRACKING AND HISTORY =====
    
    recordDiagonalExtension(move) {
        this.diagonalHistory.push({
            moveNumber: this.gameCore.moveCount || 0,
            position: { row: move.row, col: move.col },
            direction: move.direction,
            extensionType: move.extensionType,
            score: move.value,
            timestamp: Date.now()
        });
        
        this.log(`📝 Recorded diagonal move: ${move.direction} extension to (${move.row},${move.col})`);
    }

    // ===== UTILITY METHODS =====
    
    getPlayerPositions() {
        const positions = [];
        for (let row = 0; row < this.gameCore.size; row++) {
            for (let col = 0; col < this.gameCore.size; col++) {
                // FIXED: Use direct board access instead of getCell
                if (this.gameCore.board[row][col] === this.player) {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }
    
    calculateBorderDistance(position) {
        if (this.player === 'X') {
            // Vertical player - distance to top/bottom borders
            return Math.min(position.row, this.gameCore.size - 1 - position.row);
        } else {
            // Horizontal player - distance to left/right borders
            return Math.min(position.col, this.gameCore.size - 1 - position.col);
        }
    }
    
    isValidPosition(row, col) {
        return row >= 0 && row < this.gameCore.size && 
               col >= 0 && col < this.gameCore.size;
    }
    
    log(message) {
        if (this.debugMode) {
            console.log(`[DIAGONAL-EXTENSION] ${message}`);
        }
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.DiagonalExtensionHandler = DiagonalExtensionHandler;
    console.log('✅ DiagonalExtensionHandler module loaded - CLEAN: Direct board access, no getCell');
}