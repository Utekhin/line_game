// game-ai-opponent-handler.js - Handles opponent interference and blocking strategies
// Provides fallback logic when opponent blocks chain extensions

class OpponentInterferenceHandler {
    constructor(ai) {
        this.ai = ai; // Reference to the main AI (ChainBuildingAI instance)
        this.gameCore = ai.gameCore;
        this.player = ai.player;
        this.opponent = ai.opponent;
        
        // Head blocking state management
        this.blockedHeads = new Map(); // headKey -> blockingInfo
        this.headBlockHistory = new Map(); // headKey -> Array of block attempts
        this.lastBlockCheck = 0; // Move number of last block status check
        
        // Pattern fallback configuration
        this.patternPriority = ['L', 'I', 'adjacent']; // Try in this order
        this.maxFallbackAttempts = 3;
        
        this.log('Opponent Interference Handler initialized');
    }

    // ========================= MAIN INTERFERENCE DETECTION =========================

    /**
     * Generate extensions with opponent interference handling
     */
    generateRobustExtensionsFromHead(head) {
        const headKey = this.getHeadKey(head);
        
        // Check if this head is currently blocked
        if (this.isHeadBlocked(head)) {
            this.log(`Head (${head.row},${head.col}) is blocked - trying alternatives`);
            return this.handleBlockedHead(head);
        }
        
        // Try to generate normal extensions
        const normalExtensions = this.tryNormalExtensions(head);
        
        if (normalExtensions.length > 0) {
            // Normal extensions work, clear any blocked status
            this.clearHeadBlocked(head);
            return normalExtensions;
        }
        
        // No normal extensions possible, analyze why and try fallbacks
        this.log(`No normal extensions from head (${head.row},${head.col}) - analyzing interference`);
        return this.handleInterference(head);
    }

    /**
     * Try normal extensions (L/I patterns) from a head
     */
    tryNormalExtensions(head) {
        const extensions = [];
        const requiredDirection = this.ai.getRequiredDirection();
        
        // Try L-patterns first
        for (const pattern of this.ai.patterns.lPatterns) {
            const newPos = this.ai.applyPattern(head.row, head.col, pattern);
            
            if (this.canUsePosition(newPos, head, requiredDirection)) {
                const canApply = this.gameCore.canApplyPattern(head.row, head.col, pattern, this.player);
                
                if (canApply.canApply) {
                    const value = this.ai.evaluateExtension(head, newPos, pattern);
                    extensions.push({
                        row: newPos.row,
                        col: newPos.col,
                        value: value.score,
                        reason: `L: ${pattern.name} (${value.reason})`,
                        pattern: 'L',
                        patternDetails: pattern
                    });
                } else {
                    this.log(`L-pattern ${pattern.name} blocked: ${canApply.reason}`);
                }
            }
        }
        
        // Try I-patterns if L-patterns failed or as backup
        if (extensions.length < 2) { // Keep some I-pattern options even if L works
            for (const pattern of this.ai.patterns.iPatterns) {
                const newPos = this.ai.applyPattern(head.row, head.col, pattern);
                
                if (this.canUsePosition(newPos, head, requiredDirection)) {
                    const canApply = this.gameCore.canApplyPattern(head.row, head.col, pattern, this.player);
                    
                    if (canApply.canApply) {
                        const value = this.ai.evaluateExtension(head, newPos, pattern);
                        extensions.push({
                            row: newPos.row,
                            col: newPos.col,
                            value: value.score,
                            reason: `I: ${pattern.name} (${value.reason})`,
                            pattern: 'I',
                            patternDetails: pattern
                        });
                    } else {
                        this.log(`I-pattern ${pattern.name} blocked: ${canApply.reason}`);
                    }
                }
            }
        }
        
        return extensions;
    }

    /**
     * Handle interference when normal patterns are blocked
     */
    handleInterference(head) {
        const alternatives = [];
        
        // 1. Try adjacent patterns as emergency fallback
        const adjacentOptions = this.tryAdjacentPatterns(head);
        alternatives.push(...adjacentOptions);
        
        // 2. Try alternative L/I patterns with modified evaluation
        const modifiedOptions = this.tryModifiedPatterns(head);
        alternatives.push(...modifiedOptions);
        
        // 3. Try defensive moves to clear blocking
        const defensiveOptions = this.tryDefensiveMoves(head);
        alternatives.push(...defensiveOptions);
        
        if (alternatives.length === 0) {
            // Mark head as blocked and try other heads
            this.markHeadBlocked(head, 'All patterns blocked by opponent');
            return [];
        }
        
        // Sort alternatives by strategic value
        alternatives.sort((a, b) => b.value - a.value);
        
        this.log(`Found ${alternatives.length} interference alternatives for head (${head.row},${head.col})`);
        return alternatives;
    }

    /**
     * Try adjacent patterns when L/I patterns are blocked
     */
    tryAdjacentPatterns(head) {
        const adjacent = [];
        const requiredDirection = this.ai.getRequiredDirection();
        
        // Only try adjacent if we're near edges for direct connection
        if (!this.ai.shouldUseAdjacentConnectionToEdge(head)) {
            return adjacent; // Don't use adjacent patterns in middle of board
        }
        
        for (const pattern of this.ai.patterns.adjacentPatterns) {
            const newPos = this.ai.applyPattern(head.row, head.col, pattern);
            
            if (this.canUsePosition(newPos, head, requiredDirection)) {
                // Adjacent patterns are less likely to be blocked
                const value = this.evaluateAdjacentFallback(head, newPos, pattern);
                adjacent.push({
                    row: newPos.row,
                    col: newPos.col,
                    value: value.score,
                    reason: `Adjacent fallback: ${pattern.name} (${value.reason})`,
                    pattern: 'Adjacent',
                    patternDetails: pattern
                });
            }
        }
        
        return adjacent;
    }

    /**
     * Try modified L/I patterns with different evaluation
     */
    tryModifiedPatterns(head) {
        const modified = [];
        const threats = this.gameCore.analyzeOpponentThreats(this.player);
        const requiredDirection = this.ai.getRequiredDirection();
        
        // Look for patterns that also serve defensive purposes
        for (const pattern of [...this.ai.patterns.lPatterns, ...this.ai.patterns.iPatterns]) {
            const newPos = this.ai.applyPattern(head.row, head.col, pattern);
            
            if (this.canUsePosition(newPos, head, requiredDirection)) {
                const canApply = this.gameCore.canApplyPattern(head.row, head.col, pattern, this.player);
                
                if (canApply.canApply) {
                    // Check if this position also blocks opponent threats
                    const defensiveValue = this.calculateDefensiveValue(newPos, threats);
                    
                    if (defensiveValue > 0) {
                        const baseValue = this.ai.evaluateExtension(head, newPos, pattern);
                        const totalValue = baseValue.score + defensiveValue;
                        
                        modified.push({
                            row: newPos.row,
                            col: newPos.col,
                            value: totalValue,
                            reason: `Defensive ${pattern.name}: ${baseValue.reason} + defensive ${defensiveValue}`,
                            pattern: pattern.name.startsWith('L-') ? 'L' : 'I',
                            patternDetails: pattern
                        });
                    }
                }
            }
        }
        
        return modified;
    }

    /**
     * Try defensive moves to clear opponent blocking
     */
    tryDefensiveMoves(head) {
        const defensive = [];
        const threats = this.gameCore.analyzeOpponentThreats(this.player);
        
        // Look for high-priority opponent threats we can block
        const highThreats = threats.filter(threat => threat.threatLevel >= 5);
        
        for (const threat of highThreats.slice(0, 3)) { // Top 3 threats
            // Check if blocking this threat also helps our chain
            const blockingValue = this.evaluateBlockingMove(threat.position, head);
            
            if (blockingValue.score > 50) { // Worth considering
                defensive.push({
                    row: threat.position.row,
                    col: threat.position.col,
                    value: blockingValue.score,
                    reason: `Defensive block: ${blockingValue.reason}`,
                    pattern: 'Defensive',
                    threatLevel: threat.threatLevel
                });
            }
        }
        
        return defensive;
    }

    // ========================= HEAD BLOCKING MANAGEMENT =========================

    /**
     * Check if a head is currently blocked
     */
    isHeadBlocked(head) {
        const headKey = this.getHeadKey(head);
        const blockInfo = this.blockedHeads.get(headKey);
        
        if (!blockInfo) return false;
        
        // Check if block is still valid (opponent pieces still there)
        if (this.isBlockStillValid(blockInfo)) {
            return true;
        } else {
            // Block cleared, remove from blocked list
            this.clearHeadBlocked(head);
            return false;
        }
    }

    /**
     * Mark a head as blocked
     */
    markHeadBlocked(head, reason) {
        const headKey = this.getHeadKey(head);
        const blockInfo = {
            head: head,
            reason: reason,
            blockedAtMove: this.ai.moveCount,
            blockingPositions: this.findBlockingPositions(head),
            retryCount: 0
        };
        
        this.blockedHeads.set(headKey, blockInfo);
        this.log(`Head (${head.row},${head.col}) marked as blocked: ${reason}`);
    }

    /**
     * Clear blocked status for a head
     */
    clearHeadBlocked(head) {
        const headKey = this.getHeadKey(head);
        if (this.blockedHeads.has(headKey)) {
            this.blockedHeads.delete(headKey);
            this.log(`Head (${head.row},${head.col}) unblocked`);
        }
    }

    /**
     * Handle a head that is currently blocked
     */
    handleBlockedHead(head) {
        const headKey = this.getHeadKey(head);
        const blockInfo = this.blockedHeads.get(headKey);
        
        if (!blockInfo) return [];
        
        blockInfo.retryCount++;
        
        // Try to find alternative patterns that might work now
        if (blockInfo.retryCount <= this.maxFallbackAttempts) {
            this.log(`Attempting fallback for blocked head (${head.row},${head.col}), attempt ${blockInfo.retryCount}`);
            
            // Try less conventional patterns
            const fallbackExtensions = this.tryFallbackPatterns(head, blockInfo);
            if (fallbackExtensions.length > 0) {
                return fallbackExtensions;
            }
        }
        
        // Head is persistently blocked, recommend switching to different head
        this.log(`Head (${head.row},${head.col}) persistently blocked, recommending head switch`);
        return [];
    }

    /**
     * Try fallback patterns for persistently blocked heads
     */
    tryFallbackPatterns(head, blockInfo) {
        const fallbacks = [];
        
        // Try patterns in different directions than originally blocked
        const avoidDirections = this.getBlockedDirections(blockInfo);
        
        for (const pattern of this.ai.patterns.lPatterns) {
            const direction = this.getPatternDirection(pattern);
            
            if (!avoidDirections.includes(direction)) {
                const newPos = this.ai.applyPattern(head.row, head.col, pattern);
                
                if (this.ai.isValidAndEmptyPosition(newPos.row, newPos.col) && 
                    !this.ai.isInChain(newPos.row, newPos.col)) {
                    
                    const canApply = this.gameCore.canApplyPattern(head.row, head.col, pattern, this.player);
                    
                    if (canApply.canApply) {
                        const value = this.ai.evaluateExtension(head, newPos, pattern);
                        fallbacks.push({
                            row: newPos.row,
                            col: newPos.col,
                            value: value.score * 0.8, // Slightly reduced value for fallback
                            reason: `Fallback L: ${pattern.name} (${value.reason})`,
                            pattern: 'L-fallback',
                            patternDetails: pattern
                        });
                    }
                }
            }
        }
        
        return fallbacks;
    }

    // ========================= ALTERNATIVE HEAD SELECTION =========================

    /**
     * Select alternative heads when current head is blocked
     */
    selectAlternativeHeads(originalHeads) {
        const availableHeads = [];
        const blockedCount = this.blockedHeads.size;
        
        this.log(`Selecting alternative heads: ${originalHeads.length} total, ${blockedCount} blocked`);
        
        for (const head of originalHeads) {
            if (!this.isHeadBlocked(head)) {
                // Check if this head has viable extensions
                const extensions = this.tryNormalExtensions(head);
                
                if (extensions.length > 0) {
                    availableHeads.push({
                        head: head,
                        extensionCount: extensions.length,
                        bestExtension: extensions[0],
                        priority: this.calculateHeadPriority(head, extensions)
                    });
                }
            }
        }
        
        // Sort by priority (highest first)
        availableHeads.sort((a, b) => b.priority - a.priority);
        
        this.log(`Found ${availableHeads.length} viable alternative heads`);
        return availableHeads.map(h => h.head);
    }

    /**
     * Calculate priority for head selection
     */
    calculateHeadPriority(head, extensions) {
        let priority = 0;
        
        // Base priority from number of extensions
        priority += extensions.length * 10;
        
        // Bonus for heads that advance toward goal
        const requiredDirection = this.ai.getRequiredDirection();
        if (this.headAdvancesInRequiredDirection(head, requiredDirection)) {
            priority += 50;
        }
        
        // Bonus for heads near edges
        const edgeDistance = this.calculateEdgeDistance(head);
        priority += Math.max(0, 30 - edgeDistance * 5);
        
        // Penalty for recently blocked heads
        const headKey = this.getHeadKey(head);
        const blockHistory = this.headBlockHistory.get(headKey);
        if (blockHistory && blockHistory.length > 0) {
            priority -= blockHistory.length * 10;
        }
        
        return priority;
    }

    // ========================= EVALUATION HELPERS =========================

    /**
     * Check if a position can be used for extension
     */
    canUsePosition(newPos, head, requiredDirection) {
        return this.ai.isValidAndEmptyPosition(newPos.row, newPos.col) && 
               !this.ai.isInChain(newPos.row, newPos.col) &&
               this.ai.isMoveInRequiredDirection(head, newPos, requiredDirection);
    }

    /**
     * Evaluate adjacent pattern as fallback
     */
    evaluateAdjacentFallback(head, targetPos, pattern) {
        let score = 80; // Lower than L/I patterns but still viable
        let reason = "adjacent fallback";
        
        // Check if this gets us to an edge
        if (targetPos[this.ai.edges.start.axis] === this.ai.edges.start.value ||
            targetPos[this.ai.edges.end.axis] === this.ai.edges.end.value) {
            score += 200;
            reason += " to edge";
        }
        
        return { score, reason };
    }

    /**
     * Calculate defensive value of a position
     */
    calculateDefensiveValue(position, threats) {
        let defensiveValue = 0;
        
        for (const threat of threats) {
            if (threat.position.row === position.row && threat.position.col === position.col) {
                defensiveValue += threat.threatLevel * 10;
            }
        }
        
        return defensiveValue;
    }

    /**
     * Evaluate a blocking move
     */
    evaluateBlockingMove(position, head) {
        let score = 0;
        let reason = "blocks opponent";
        
        // Base blocking value
        score += 60;
        
        // Check if position also advances our chain
        const distanceToHead = Math.abs(position.row - head.row) + Math.abs(position.col - head.col);
        if (distanceToHead <= 3) {
            score += 30;
            reason += " and near our chain";
        }
        
        // Check if position is strategically important
        const strategic = this.gameCore.getStrategicPositions(this.player);
        const isStrategic = strategic.edges.some(pos => 
            pos.row === position.row && pos.col === position.col
        );
        
        if (isStrategic) {
            score += 40;
            reason += " at strategic edge";
        }
        
        return { score, reason };
    }

    // ========================= UTILITY METHODS =========================

    /**
     * Generate unique key for head position
     */
    getHeadKey(head) {
        return `${head.row}-${head.col}`;
    }

    /**
     * Check if blocking positions are still occupied by opponent
     */
    isBlockStillValid(blockInfo) {
        for (const pos of blockInfo.blockingPositions) {
            if (this.gameCore.board[pos.row][pos.col] === this.opponent) {
                return true; // At least one blocking position still occupied
            }
        }
        return false;
    }

    /**
     * Find positions that are blocking a head
     */
    findBlockingPositions(head) {
        const blocking = [];
        
        // Check positions that would block common patterns
        const checkOffsets = [
            [-1, 0], [1, 0], [0, -1], [0, 1], // Adjacent
            [-1, -1], [-1, 1], [1, -1], [1, 1], // Diagonal
            [-2, 0], [2, 0], [0, -2], [0, 2] // I-pattern intermediate
        ];
        
        for (const [dr, dc] of checkOffsets) {
            const checkRow = head.row + dr;
            const checkCol = head.col + dc;
            
            if (this.gameCore.isPositionBlockedByPlayer(checkRow, checkCol, this.opponent)) {
                blocking.push({ row: checkRow, col: checkCol });
            }
        }
        
        return blocking;
    }

    /**
     * Get directions that are blocked for a head
     */
    getBlockedDirections(blockInfo) {
        const directions = [];
        
        for (const pos of blockInfo.blockingPositions) {
            const dr = pos.row - blockInfo.head.row;
            const dc = pos.col - blockInfo.head.col;
            
            if (dr < 0) directions.push('up');
            if (dr > 0) directions.push('down');
            if (dc < 0) directions.push('left');
            if (dc > 0) directions.push('right');
        }
        
        return [...new Set(directions)]; // Remove duplicates
    }

    /**
     * Get general direction of a pattern
     */
    getPatternDirection(pattern) {
        const directions = [];
        
        if (pattern.dr < 0) directions.push('up');
        if (pattern.dr > 0) directions.push('down');
        if (pattern.dc < 0) directions.push('left');
        if (pattern.dc > 0) directions.push('right');
        
        return directions.join('-');
    }

    /**
     * Check if head advances in required direction
     */
    headAdvancesInRequiredDirection(head, requiredDirection) {
        if (requiredDirection === 'any') return true;
        
        const edgeAxis = this.ai.edges.start.axis;
        const headPosition = head[edgeAxis];
        
        if (requiredDirection === this.ai.edges.start.name) {
            return headPosition > this.ai.edges.start.value;
        } else if (requiredDirection === this.ai.edges.end.name) {
            return headPosition < this.ai.edges.end.value;
        }
        
        return false;
    }

    /**
     * Calculate distance to nearest edge
     */
    calculateEdgeDistance(head) {
        const startDistance = Math.abs(head[this.ai.edges.start.axis] - this.ai.edges.start.value);
        const endDistance = Math.abs(head[this.ai.edges.end.axis] - this.ai.edges.end.value);
        
        return Math.min(startDistance, endDistance);
    }

    /**
     * Update blocked head history
     */
    updateBlockedHeadHistory() {
        // Periodically clean up old block history
        if (this.ai.moveCount % 10 === 0) {
            for (const [headKey, history] of this.headBlockHistory.entries()) {
                // Keep only recent blocks (last 20 moves)
                const recentBlocks = history.filter(block => 
                    this.ai.moveCount - block.moveNumber <= 20
                );
                
                if (recentBlocks.length === 0) {
                    this.headBlockHistory.delete(headKey);
                } else {
                    this.headBlockHistory.set(headKey, recentBlocks);
                }
            }
        }
    }

    /**
     * Get statistics about opponent interference
     */
    getInterferenceStats() {
        return {
            blockedHeads: this.blockedHeads.size,
            totalBlockHistory: Array.from(this.headBlockHistory.values())
                .reduce((sum, hist) => sum + hist.length, 0),
            recentInterference: this.ai.moveCount - this.lastBlockCheck,
            interferenceLevel: this.calculateInterferenceLevel()
        };
    }

    /**
     * Calculate overall interference level
     */
    calculateInterferenceLevel() {
        const threats = this.gameCore.analyzeOpponentThreats(this.player);
        const highThreats = threats.filter(t => t.threatLevel >= 5).length;
        const blockedHeads = this.blockedHeads.size;
        
        return Math.min(10, highThreats + blockedHeads); // Scale 0-10
    }

    /**
     * Debug logging
     */
    log(message) {
        if (this.ai.debugMode) {
            console.log(`[${this.player} INTERFERENCE] ${message}`);
        }
    }
}

// Export for use in other modules
window.OpponentInterferenceHandler = OpponentInterferenceHandler;