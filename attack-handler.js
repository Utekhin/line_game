// attack-handler.js - FIXED: Robust attack generation with proper error handling
// Attacks opponent's vulnerable gaps to threaten cutting their chain

class AttackHandler {
    constructor(gameCore, player) {
        // DEFENSIVE: Validate critical dependencies
        if (!gameCore) {
            throw new Error('AttackHandler requires gameCore');
        }
        
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        
        // Component references (injected)
        this.gapRegistry = null;
        
        // Attack tracking
        this.attackHistory = [];
        this.targetedGaps = new Set();
        this.pendingGapCuts = new Map();
        this.lastAttackCheck = -1;
        
        this.debugMode = true;
        this.log('⚔️ Attack Handler initialized - Gap attack system');
    }

    // ===== COMPONENT INJECTION =====
    
    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        this.log('📊 Gap registry connected for attack opportunities');
    }

    // ===== MAIN ATTACK GENERATION =====
    
    /**
     * Generate offensive moves against opponent's gaps
     * FIXED: Comprehensive error handling and validation
     */
    generateAttackMove() {
        this.log('⚔️ Analyzing gap attack opportunities...');
        
        // VALIDATION 1: Check gap registry connection
        if (!this.gapRegistry) {
            this.log('⚠️ No gap registry available for attacks');
            return null;
        }
        
        // VALIDATION 2: Verify gap registry has required method
        if (typeof this.gapRegistry.getPlayerPatterns !== 'function') {
            this.log('❌ Gap registry missing getPlayerPatterns method');
            return null;
        }
        
        try {
            // PRIORITY 1: Check for pending gap cuts (opponent didn't defend)
            const gapCutMove = this.checkPendingGapCuts();
            if (gapCutMove) {
                this.log('🎯 Completing undefended gap cut!');
                this.recordAttackMove(gapCutMove);
                return gapCutMove;
            }
            
            // PRIORITY 2: Find new vulnerable opponent gaps
            const gapAttacks = this.findOpponentGapAttacks();
            
            if (gapAttacks.length === 0) {
                this.log('✅ No vulnerable opponent gaps to attack');
                return null;
            }
            
            // Select best gap attack move
            const bestAttack = this.selectBestAttackMove(gapAttacks);
            if (bestAttack) {
                this.recordAttackMove(bestAttack);
                return bestAttack;
            }
            
            return null;
            
        } catch (error) {
            this.log(`💥 Error generating attack move: ${error.message}`);
            console.error('[ATTACK-HANDLER] Stack trace:', error.stack);
            return null;
        }
    }

    // ===== OPPONENT ANALYSIS =====
    
    /**
     * Check for pending gap cuts - FIXED with validation
     */
    checkPendingGapCuts() {
        if (this.pendingGapCuts.size === 0) return null;
        
        const currentMove = this.gameCore.moveCount || 0;
        
        for (const [gapKey, cutInfo] of this.pendingGapCuts.entries()) {
            // Check if opponent defended (filled gap)
            const opponentDefended = this.hasOpponentDefended(cutInfo);
            
            if (opponentDefended) {
                this.pendingGapCuts.delete(gapKey);
                this.log(`🛡️ Opponent defended gap at ${gapKey}`);
                continue;
            }
            
            // Generate completion move
            const completionMove = this.generateGapCompletionMove(cutInfo);
            if (completionMove) {
                this.pendingGapCuts.delete(gapKey);
                return completionMove;
            }
        }
        
        return null;
    }
    
    /**
     * Find opponent's vulnerable gaps - FIXED with comprehensive validation
     */
    findOpponentGapAttacks() {
        const attacks = [];
        
        try {
            // STEP 1: Get opponent patterns with validation
            const opponentPatterns = this.getValidatedOpponentPatterns();
            
            if (!opponentPatterns || opponentPatterns.length === 0) {
                this.log('✅ No opponent patterns found');
                return attacks;
            }
            
            this.log(`🎯 Found ${opponentPatterns.length} opponent patterns`);
            
            // STEP 2: Process each pattern
            for (const pattern of opponentPatterns) {
                // VALIDATION: Check pattern structure
                if (!this.isValidPattern(pattern)) {
                    this.log(`⚠️ Skipping invalid pattern: ${JSON.stringify(pattern)}`);
                    continue;
                }
                
                // ONLY ATTACK L-PATTERNS FOR NOW
                if (pattern.type !== 'L' && pattern.patternType !== 'L') {
                    continue;
                }
                
                // STEP 3: Find open gaps in pattern
                const openGaps = this.findOpenGapsInPattern(pattern);
                
                if (openGaps.length === 0) continue;
                
                // STEP 4: Generate attack moves for each gap
                for (const gap of openGaps) {
                    const gapAttacks = this.generateGapAttackMoves(gap, pattern);
                    attacks.push(...gapAttacks);
                }
            }
            
            this.log(`⚔️ Generated ${attacks.length} gap attack moves`);
            
        } catch (error) {
            this.log(`⚠️ Error finding gap attacks: ${error.message}`);
            console.error('[ATTACK-HANDLER] findOpponentGapAttacks error:', error.stack);
        }
        
        return attacks;
    }
    
    /**
     * NEW: Get validated opponent patterns with proper error handling
     */
    getValidatedOpponentPatterns() {
        try {
            const patterns = this.gapRegistry.getPlayerPatterns(this.opponent);
            
            if (!patterns) {
                this.log('⚠️ getPlayerPatterns returned null/undefined');
                return [];
            }
            
            if (!Array.isArray(patterns)) {
                this.log('⚠️ getPlayerPatterns returned non-array');
                return [];
            }
            
            return patterns;
            
        } catch (error) {
            this.log(`⚠️ Error getting opponent patterns: ${error.message}`);
            return [];
        }
    }
    
    /**
     * NEW: Validate pattern structure
     */
    isValidPattern(pattern) {
        if (!pattern) return false;
        
        // Check for type
        if (!pattern.type && !pattern.patternType) {
            this.log('⚠️ Pattern missing type property');
            return false;
        }
        
        // Check for gaps
        if (!pattern.gaps || !Array.isArray(pattern.gaps)) {
            this.log('⚠️ Pattern missing gaps array');
            return false;
        }
        
        return true;
    }
    
    /**
     * NEW: Find open gaps in pattern with validation
     */
    findOpenGapsInPattern(pattern) {
        const openGaps = [];
        
        for (const gap of pattern.gaps) {
            // VALIDATION: Check gap structure
            if (!gap || typeof gap.row !== 'number' || typeof gap.col !== 'number') {
                this.log(`⚠️ Invalid gap structure: ${JSON.stringify(gap)}`);
                continue;
            }
            
            // Check if gap cell is empty
            if (!this.isValidPosition(gap.row, gap.col)) continue;
            
            if (this.gameCore.board[gap.row][gap.col] === '') {
                openGaps.push({
                    ...gap,
                    pattern: pattern,
                    patternType: pattern.type || pattern.patternType
                });
            }
        }
        
        return openGaps;
    }
    
    /**
     * Generate attack moves for a gap - FIXED with validation
     */
    generateGapAttackMoves(gap, pattern) {
        const moves = [];
        
        // For L-pattern gaps, any gap cell creates a threat
        if (!gap.fillCells && gap.row !== undefined && gap.col !== undefined) {
            // Gap itself is the fill cell
            const score = this.scoreGapAttack(gap);
            
            moves.push({
                row: gap.row,
                col: gap.col,
                score: score,
                patternType: gap.patternType,
                attackType: 'gap-attack',
                targetGap: gap,
                reason: `Attack ${this.opponent}'s ${gap.patternType} gap`
            });
        }
        
        return moves;
    }
    
    /**
     * Score gap attack - FIXED with safe property access
     */
    scoreGapAttack(gap) {
        let score = 50; // Base attack score
        
        // DEFENSIVE: Validate gap has position
        if (typeof gap.row !== 'number' || typeof gap.col !== 'number') {
            this.log('⚠️ Gap missing row/col in scoreGapAttack');
            return score;
        }
        
        // DEFENSIVE: Validate gameCore exists (should never fail, but be safe)
        if (!this.gameCore || typeof this.gameCore.size !== 'number') {
            this.log('⚠️ gameCore or size undefined in scoreGapAttack');
            return score;
        }
        
        // Border proximity bonus - SAFE calculation
        try {
            const borderDistance = this.calculateBorderDistanceForPlayer(gap, this.opponent);
            if (borderDistance <= 3) {
                score += 20; // High priority for near-border gaps
            } else if (borderDistance <= 5) {
                score += 10; // Medium priority
            }
        } catch (error) {
            this.log(`⚠️ Border distance calculation failed: ${error.message}`);
        }
        
        // Pattern completion threat
        if (gap.pattern && gap.pattern.pieces && gap.pattern.pieces.length >= 2) {
            score += 10;
        }
        
        // Avoid attacking same gap repeatedly
        const gapKey = `${gap.row},${gap.col}`;
        if (this.targetedGaps.has(gapKey)) {
            score -= 15;
        }
        
        return score;
    }

    // ===== ATTACK SELECTION =====
    
    selectBestAttackMove(attackMoves) {
        if (!attackMoves || attackMoves.length === 0) return null;
        
        // Sort by score (highest first)
        const sortedAttacks = [...attackMoves].sort((a, b) => b.score - a.score);
        
        // Log top candidates
        this.log('📊 Gap attack candidates:');
        sortedAttacks.slice(0, 5).forEach((attack, i) => {
            this.log(`  ${i+1}. (${attack.row},${attack.col}) ${attack.patternType} gap - Score: ${attack.score}`);
        });
        
        const bestAttack = sortedAttacks[0];
        
        return {
            row: bestAttack.row,
            col: bestAttack.col,
            reason: bestAttack.reason,
            pattern: 'gap-attack',
            value: bestAttack.score,
            attackType: bestAttack.attackType,
            targetGap: bestAttack.targetGap
        };
    }

    // ===== UTILITY METHODS =====
    
    /**
     * Calculate border distance - DEFENSIVE version
     */
    calculateBorderDistanceForPlayer(position, player) {
        // DEFENSIVE: Validate inputs
        if (!position || typeof position.row !== 'number' || typeof position.col !== 'number') {
            this.log('⚠️ Invalid position in calculateBorderDistance');
            return 999; // Return large distance if invalid
        }
        
        if (!this.gameCore || typeof this.gameCore.size !== 'number') {
            this.log('⚠️ Invalid gameCore in calculateBorderDistance');
            return 999;
        }
        
        try {
            if (player === 'X') {
                // X connects vertically
                return Math.min(position.row, this.gameCore.size - 1 - position.row);
            } else {
                // O connects horizontally
                return Math.min(position.col, this.gameCore.size - 1 - position.col);
            }
        } catch (error) {
            this.log(`⚠️ Error calculating border distance: ${error.message}`);
            return 999;
        }
    }
    
    /**
     * Validate position is on board - DEFENSIVE version
     */
    isValidPosition(row, col) {
        if (!this.gameCore || typeof this.gameCore.size !== 'number') {
            return false;
        }
        
        return row >= 0 && row < this.gameCore.size && 
               col >= 0 && col < this.gameCore.size;
    }
    
    /**
     * Check if opponent defended gap
     */
    hasOpponentDefended(cutInfo) {
        if (!cutInfo || !cutInfo.gapCells) return false;
        
        return cutInfo.gapCells.some(cell => {
            return this.gameCore.board[cell.row]?.[cell.col] === this.opponent;
        });
    }
    
    /**
     * Generate gap completion move
     */
    generateGapCompletionMove(cutInfo) {
        const gap = cutInfo.targetGap;
        const attackedCell = cutInfo.attackedCell;
        
        if (!gap || !gap.pattern || !gap.pattern.gaps) return null;
        
        // Find remaining gap cell
        const remainingGapCell = gap.pattern.gaps.find(gapCell => {
            const notAttacked = !(gapCell.row === attackedCell.row && 
                                 gapCell.col === attackedCell.col);
            const isEmpty = this.gameCore.board[gapCell.row]?.[gapCell.col] === '';
            return notAttacked && isEmpty;
        });
        
        if (remainingGapCell) {
            return {
                row: remainingGapCell.row,
                col: remainingGapCell.col,
                reason: `Complete gap cut`,
                pattern: 'gap-cut-completion',
                value: 100,
                attackType: 'gap-cut-completion',
                targetGap: gap
            };
        }
        
        return null;
    }
    
    /**
     * Record attack move for tracking
     */
    recordAttackMove(move) {
        const currentMove = this.gameCore.moveCount || 0;
        
        this.attackHistory.push({
            moveNumber: currentMove,
            position: { row: move.row, col: move.col },
            attackType: move.attackType,
            reason: move.reason,
            score: move.value,
            timestamp: Date.now()
        });
        
        // Mark gap as targeted
        const gapKey = `${move.row},${move.col}`;
        this.targetedGaps.add(gapKey);
        
        // Track pending gap cuts for L-patterns
        if (move.attackType === 'gap-attack' && 
            move.targetGap && 
            move.targetGap.patternType === 'L') {
            
            const allGapCells = move.targetGap.pattern?.gaps || [move.targetGap];
            
            this.pendingGapCuts.set(gapKey, {
                attackMove: currentMove,
                attackedCell: { row: move.row, col: move.col },
                targetGap: move.targetGap,
                gapCells: allGapCells
            });
        }
        
        this.log(`📝 Recorded ${move.attackType} at (${move.row},${move.col})`);
    }
    
    /**
     * Get attack statistics
     */
    getAttackStats() {
        return {
            totalAttacks: this.attackHistory.length,
            targetedGaps: this.targetedGaps.size,
            pendingGapCuts: this.pendingGapCuts.size,
            lastAttackMove: this.attackHistory.length > 0 ? 
                this.attackHistory[this.attackHistory.length - 1].moveNumber : -1
        };
    }
    
    /**
     * Reset attack state
     */
    reset() {
        this.attackHistory = [];
        this.targetedGaps.clear();
        this.pendingGapCuts.clear();
        this.lastAttackCheck = -1;
        this.log('🔄 Attack Handler reset');
    }
    
    /**
     * Logging
     */
    log(message) {
        if (this.debugMode) {
            console.log(`[ATTACK-HANDLER] ${message}`);
        }
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AttackHandler = AttackHandler;
    console.log('✅ AttackHandler loaded - FIXED: Robust error handling and validation');
}