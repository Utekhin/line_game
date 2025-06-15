// Simple AI vs AI Fix - Replace complex strategy with working single player logic
// Add this code to your HTML page after all other scripts are loaded

// Simple AI vs AI Controller that uses two independent chain building AIs
class SimpleAIvsAI {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.playerAIs = {
            X: null,
            O: null
        };
        this.gameState = 'ready'; // 'ready', 'running', 'paused', 'complete'
        this.currentPlayer = 'X';
        this.moveDelay = 800;
        this.gameLoop = null;
        
        // Event handlers
        this.eventHandlers = {
            'move': [],
            'gameStart': [],
            'gameEnd': [],
            'playerChange': [],
            'error': []
        };
        
        this.initializeAIs();
    }
    
    initializeAIs() {
        console.log('🔧 Initializing simple AI vs AI...');
        
        try {
            // Create X AI (vertical chain builder)
            this.playerAIs.X = new SinglePlayerChainAI(this.gameCore);
            console.log('✅ X AI (vertical) initialized');
            
            // Create O AI (horizontal chain builder) - we'll adapt the single player AI
            this.playerAIs.O = new HorizontalChainAI(this.gameCore);
            console.log('✅ O AI (horizontal) initialized');
            
        } catch (error) {
            console.error('❌ Error initializing AIs:', error);
            throw error;
        }
    }
    
    async startGame() {
        if (this.gameState !== 'ready') {
            console.log('Cannot start game - not ready');
            return false;
        }
        
        console.log('🎮 Starting simple AI vs AI game...');
        
        // Reset AIs
        this.playerAIs.X.reset();
        this.playerAIs.O.reset();
        
        this.gameState = 'running';
        this.currentPlayer = 'X';
        
        this.emit('gameStart', {
            players: {
                X: { name: 'X Chain Builder', strategy: 'Vertical Chain' },
                O: { name: 'O Chain Builder', strategy: 'Horizontal Chain' }
            }
        });
        
        // Start the game loop
        this.runGameLoop();
        
        return true;
    }
    
    async runGameLoop() {
        while (this.gameState === 'running') {
            try {
                console.log(`\n=== ${this.currentPlayer} TURN ===`);
                
                // Sync the AI's chain with actual board state before getting move
                this.syncAIChain(this.currentPlayer);
                
                // Get move from current player's AI
                const currentAI = this.playerAIs[this.currentPlayer];
                const move = currentAI.getNextMove();
                
                if (!move) {
                    console.log(`${this.currentPlayer} has no moves - checking if complete...`);
                    
                    // Check if this player's chain is actually complete
                    const stats = currentAI.getStats();
                    if (stats.isComplete) {
                        console.log(`${this.currentPlayer} chain is complete!`);
                        this.endGame('win', `${this.currentPlayer} completed their chain`);
                    } else {
                        console.log(`${this.currentPlayer} cannot find moves but chain not complete`);
                        this.endGame('no-moves', `${this.currentPlayer} cannot move`);
                    }
                    break;
                }
                
                // Validate move
                if (!this.gameCore.isValidMove(move.row, move.col)) {
                    console.warn(`⚠️ ${this.currentPlayer} tried invalid move (${move.row},${move.col}) - occupied!`);
                    
                    // Try to get emergency move
                    const emergencyMove = this.getEmergencyMove();
                    if (emergencyMove) {
                        console.log(`🚨 Using emergency move for ${this.currentPlayer}`);
                        this.makeMove(emergencyMove);
                    } else {
                        console.log(`${this.currentPlayer} has no valid moves`);
                        this.endGame('no-moves', `${this.currentPlayer} cannot move`);
                        break;
                    }
                    continue;
                }
                
                // Make the move
                this.makeMove(move);
                
                // Wait before next move
                await this.delay(this.moveDelay);
                
            } catch (error) {
                console.error(`Error in game loop:`, error);
                this.emit('error', { player: this.currentPlayer, message: error.message });
                break;
            }
        }
    }
    
    // Sync AI chain with actual board state
    syncAIChain(player) {
        const ai = this.playerAIs[player];
        if (!ai) return;
        
        // Get all positions for this player from the board
        const boardPositions = this.gameCore.getPlayerPositions(player);
        
        // Update AI's chain to match board
        ai.chain = boardPositions.map(pos => ({
            row: pos.row,
            col: pos.col
        }));
        
        console.log(`${player} chain synced: ${ai.chain.length} pieces`);
    }
    
    makeMove(move) {
        const result = this.gameCore.makeMove(move.row, move.col, this.currentPlayer);
        
        if (result.success) {
            console.log(`✅ ${this.currentPlayer} plays (${move.row},${move.col}) - ${move.reason}`);
            
            // Update the AI's chain with the new move
            const ai = this.playerAIs[this.currentPlayer];
            if (ai && ai.chain) {
                ai.chain.push({ row: move.row, col: move.col });
                console.log(`${this.currentPlayer} chain updated: ${ai.chain.length} pieces`);
            }
            
            this.emit('move', {
                player: this.currentPlayer,
                move: move,
                result: result,
                playerMoveNumber: result.playerMoveNumber
            });
            
            // Check for win
            if (result.gameOver) {
                this.endGame('win', `${result.winner} wins by ${result.winType}`);
                return;
            }
            
            // Check if current player completed their chain
            if (ai) {
                const stats = ai.getStats();
                if (stats.isComplete) {
                    console.log(`🎉 ${this.currentPlayer} completed their chain!`);
                    this.endGame('win', `${this.currentPlayer} completed chain connection`);
                    return;
                }
            }
            
            // Switch players
            const previousPlayer = this.currentPlayer;
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
            
            this.emit('playerChange', {
                previous: previousPlayer,
                current: this.currentPlayer
            });
            
        } else {
            console.error(`❌ Move failed: ${result.reason}`);
            this.emit('error', { player: this.currentPlayer, message: result.reason });
        }
    }
    
    getEmergencyMove() {
        const emptyPositions = this.gameCore.getEmptyPositions();
        if (emptyPositions.length === 0) return null;
        
        // Find position closest to center
        const center = Math.floor(this.gameCore.size / 2);
        emptyPositions.sort((a, b) => {
            const distA = Math.abs(a.row - center) + Math.abs(a.col - center);
            const distB = Math.abs(b.row - center) + Math.abs(b.col - center);
            return distA - distB;
        });
        
        return {
            row: emptyPositions[0].row,
            col: emptyPositions[0].col,
            value: 1,
            reason: 'Emergency move',
            pattern: 'Emergency'
        };
    }
    
    endGame(type, reason) {
        this.gameState = 'complete';
        console.log(`🏁 Game ended: ${type} - ${reason}`);
        
        this.emit('gameEnd', {
            result: {
                type: type,
                reason: reason,
                winner: this.determineWinner(type),
                duration: Date.now(),
                totalMoves: this.gameCore.moveCount
            }
        });
    }
    
    determineWinner(endType) {
        if (endType === 'win') {
            return this.gameCore.checkWin('X').isWin ? 'X' : 
                   this.gameCore.checkWin('O').isWin ? 'O' : null;
        } else if (endType === 'no-moves') {
            return this.currentPlayer === 'X' ? 'O' : 'X';
        }
        return null;
    }
    
    pauseGame() {
        if (this.gameState === 'running') {
            this.gameState = 'paused';
            return true;
        }
        return false;
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'running';
            this.runGameLoop();
            return true;
        }
        return false;
    }
    
    stopGame() {
        this.gameState = 'complete';
        return true;
    }
    
    updateConfig(config) {
        if (config.turnDelay !== undefined) {
            this.moveDelay = config.turnDelay;
        }
    }
    
    getGameState() {
        return {
            state: this.gameState,
            currentPlayer: this.currentPlayer,
            moveCount: this.gameCore.moveCount,
            players: {
                X: this.getPlayerStatus('X'),
                O: this.getPlayerStatus('O')
            }
        };
    }
    
    getPlayerStatus(player) {
        const ai = this.playerAIs[player];
        return {
            strategy: player === 'X' ? 'Vertical Chain' : 'Horizontal Chain',
            stats: ai ? ai.getStats() : null
        };
    }
    
    // Event system
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }
    
    emit(event, data) {
        if (this.eventHandlers[event]) {
            for (const handler of this.eventHandlers[event]) {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            }
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getAvailableStrategies() {
        return [
            { id: 'chain', name: 'Chain Builder', description: 'Builds L/I pattern chains' }
        ];
    }
    
    updatePlayerStrategy() {
        // Simple implementation - always uses chain building
        return true;
    }
    
    getGameAnalysis() {
        return {
            gameState: this.getGameState(),
            statistics: { averageMoveTime: this.moveDelay },
            strategies: {
                X: { name: 'Vertical Chain Builder' },
                O: { name: 'Horizontal Chain Builder' }
            }
        };
    }
}

// Horizontal Chain AI - adapted from SinglePlayerChainAI for O player
class HorizontalChainAI extends SinglePlayerChainAI {
    constructor(gameCore) {
        super(gameCore);
        
        // Override for horizontal chain building
        this.goalDirection = 'horizontal';
        this.primaryAxis = 'col';
        this.secondaryAxis = 'row';
        
        console.log('Horizontal Chain AI initialized for O player');
    }
    
    // Override edge checks for horizontal connection
    hasReachedStartArea() {
        return this.chain.some(piece => piece.col <= 1);
    }
    
    hasReachedEndArea() {
        return this.chain.some(piece => piece.col >= this.gameCore.size - 2);
    }
    
    hasReachedStartEdge() {
        return this.chain.some(piece => piece.col === 0);
    }
    
    hasReachedEndEdge() {
        return this.chain.some(piece => piece.col === this.gameCore.size - 1);
    }
    
    getRequiredDirection() {
        const reachedLeft = this.hasReachedStartArea();
        const reachedRight = this.hasReachedEndArea();
        
        if (reachedLeft && !this.hasReachedEndEdge()) {
            return 'right';
        } else if (reachedRight && !this.hasReachedStartEdge()) {
            return 'left';
        }
        return 'any';
    }
    
    // Override chain analysis for horizontal
    findChainHeads() {
        const heads = [];
        for (const piece of this.chain) {
            if (this.isChainHead(piece)) {
                heads.push(piece);
            }
        }
        return heads;
    }
    
    isChainHead(piece) {
        const connections = this.countConnections(piece);
        
        if (connections <= 1) return true;
        
        const minCol = Math.min(...this.chain.map(p => p.col));
        const maxCol = Math.max(...this.chain.map(p => p.col));
        
        return piece.col === minCol || piece.col === maxCol;
    }
    
    // Override evaluation for horizontal progress
    evaluateSecondMove(firstPiece, targetPos, pattern) {
        let score = 50;
        let reason = "";
        
        const horizontalSpan = Math.abs(targetPos.col - firstPiece.col);
        score += horizontalSpan * 15;
        reason += `horizontal span +${horizontalSpan * 15}`;
        
        if (pattern.name.includes('left') || pattern.name.includes('right')) {
            score += 20;
            reason += `, horizontal pattern +20`;
        }
        
        if (pattern.dr && pattern.dc && Math.abs(pattern.dr) !== Math.abs(pattern.dc)) {
            score += 10;
            reason += `, L-pattern +10`;
        }
        
        return { score, reason };
    }
    
    // Override extension evaluation for horizontal goal
    evaluateExtension(head, targetPos, pattern) {
        let score = 30;
        let reason = "";
        const requiredDirection = this.getRequiredDirection();
        
        const currentMinCol = Math.min(...this.chain.map(p => p.col));
        const currentMaxCol = Math.max(...this.chain.map(p => p.col));
        
        let horizontalProgress = 0;
        if (targetPos.col < currentMinCol) {
            horizontalProgress = currentMinCol - targetPos.col;
            score += horizontalProgress * 40;
            reason += `toward left +${horizontalProgress * 40}`;
        } else if (targetPos.col > currentMaxCol) {
            horizontalProgress = targetPos.col - currentMaxCol;
            score += horizontalProgress * 40;
            reason += `toward right +${horizontalProgress * 40}`;
        }
        
        // Direction bonuses/penalties
        if (requiredDirection === 'left' && targetPos.col > head.col) {
            score -= 1000;
            reason += `, WRONG DIRECTION (need left) -1000`;
        } else if (requiredDirection === 'right' && targetPos.col < head.col) {
            score -= 1000;
            reason += `, WRONG DIRECTION (need right) -1000`;
        }
        
        if (requiredDirection === 'left' && targetPos.col < head.col) {
            score += 500;
            reason += `, CORRECT DIRECTION (left) +500`;
        } else if (requiredDirection === 'right' && targetPos.col > head.col) {
            score += 500;
            reason += `, CORRECT DIRECTION (right) +500`;
        }
        
        // Edge bonuses
        if (targetPos.col === 0) {
            score += 200;
            reason += `, LEFT EDGE +200`;
        } else if (targetPos.col === this.gameCore.size - 1) {
            score += 200;
            reason += `, RIGHT EDGE +200`;
        }
        
        return { score, reason };
    }
    
    // Override for horizontal edge connection
    shouldUseAdjacentConnectionToEdge(head) {
        const distanceToLeft = head.col;
        const distanceToRight = this.gameCore.size - 1 - head.col;
        
        if (!this.hasReachedStartEdge() && distanceToLeft === 1) {
            return true;
        }
        
        if (!this.hasReachedEndEdge() && distanceToRight === 1) {
            return true;
        }
        
        if (head.col === 0 || head.col === this.gameCore.size - 1) {
            return true;
        }
        
        return false;
    }

    // Override direction filtering for horizontal chains
    filterHeadsByDirection(heads, requiredDirection) {
        const filteredHeads = [];
        const threshold = Math.floor(this.gameCore.size / 3); // One-third of board
        
        this.log(`Filtering heads for required direction: ${requiredDirection}`);
        
        for (const head of heads) {
            let shouldInclude = false;
            
            if (requiredDirection === 'left') {
                // If we need to go toward left edge, exclude heads too close to right
                const distanceFromRight = Math.abs(head.col - (this.gameCore.size - 1));
                if (distanceFromRight > threshold) {
                    shouldInclude = true;
                    this.log(`Head (${head.row},${head.col}) included - can extend toward left`);
                } else {
                    this.log(`Head (${head.row},${head.col}) excluded - too close to right`);
                }
            } else if (requiredDirection === 'right') {
                // If we need to go toward right edge, exclude heads too close to left
                const distanceFromLeft = Math.abs(head.col - 0);
                if (distanceFromLeft > threshold) {
                    shouldInclude = true;
                    this.log(`Head (${head.row},${head.col}) included - can extend toward right`);
                } else {
                    this.log(`Head (${head.row},${head.col}) excluded - too close to left`);
                }
            } else {
                // 'any' direction - include all heads
                shouldInclude = true;
                this.log(`Head (${head.row},${head.col}) included - any direction allowed`);
            }
            
            if (shouldInclude) {
                filteredHeads.push(head);
            }
        }
        
        this.log(`Filtered from ${heads.length} to ${filteredHeads.length} valid heads`);
        return filteredHeads;
    }

    // Override path checking for horizontal chains
    hasAdjacentPathToBottom(piece, visited) {
        const key = `${piece.row}-${piece.col}`;
        if (visited.has(key)) return false;
        visited.add(key);
        
        // For horizontal chains, we check path to right edge
        if (piece.col === this.gameCore.size - 1) return true;
        
        // Check adjacent positions (8 directions) for continuous path check
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        for (const [dr, dc] of directions) {
            const newRow = piece.row + dr;
            const newCol = piece.col + dc;
            
            if (this.isValidBoardPosition(newRow, newCol) && 
                this.gameCore.board[newRow][newCol] === 'O' && 
                !visited.has(`${newRow}-${newCol}`)) {
                
                if (this.hasAdjacentPathToBottom({row: newRow, col: newCol}, new Set(visited))) {
                    return true;
                }
            }
        }
        return false;
    }

    // Override gap filling path check for horizontal chains
    chainHasGaps() {
        // Check if there's a continuous adjacent path from left to right
        const leftPieces = this.chain.filter(piece => piece.col === 0);
        if (leftPieces.length === 0) return true;
        
        for (const leftPiece of leftPieces) {
            if (this.hasAdjacentPathToBottom(leftPiece, new Set())) {
                return false; // Found continuous path, no gaps
            }
        }
        return true; // No continuous path found, has gaps
    }

    // Override adjacent extensions for horizontal edge moves
    generateAdjacentExtensionsToEdge(head) {
        const extensions = [];
        const distanceToLeft = head.col;
        const distanceToRight = this.gameCore.size - 1 - head.col;
        
        // Generate adjacent moves in 8 directions
        const adjacentDirections = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        
        for (const [dr, dc] of adjacentDirections) {
            const newRow = head.row + dr;
            const newCol = head.col + dc;
            
            if (this.isValidAndEmptyPosition(newRow, newCol) && !this.isInChain(newRow, newCol)) {
                let isGoodEdgeMove = false;
                let reason = '';
                
                // CASE 1: Direct move to target edge (col 1 -> col 0, or col 13 -> col 14)
                if (!this.hasReachedStartEdge() && head.col === 1 && newCol === 0) {
                    isGoodEdgeMove = true;
                    reason = 'DIRECT LEFT EDGE CONNECTION';
                }
                else if (!this.hasReachedEndEdge() && head.col === this.gameCore.size - 2 && newCol === this.gameCore.size - 1) {
                    isGoodEdgeMove = true;
                    reason = 'DIRECT RIGHT EDGE CONNECTION';
                }
                // CASE 2: Lateral movement along the actual edge (already on col 0 or col 14)
                else if (head.col === 0 && newCol === 0) {
                    isGoodEdgeMove = true;
                    reason = 'extend along left edge';
                }
                else if (head.col === this.gameCore.size - 1 && newCol === this.gameCore.size - 1) {
                    isGoodEdgeMove = true;
                    reason = 'extend along right edge';
                }
                
                if (isGoodEdgeMove) {
                    const value = this.evaluateAdjacentEdgeMove(head, { row: newRow, col: newCol }, reason);
                    extensions.push({
                        row: newRow,
                        col: newCol,
                        value: value.score,
                        reason: `Adjacent: ${reason} (${value.details})`,
                        pattern: 'Adjacent'
                    });
                }
            }
        }
        
        return extensions;
    }

    // Override adjacent edge evaluation for horizontal
    evaluateAdjacentEdgeMove(head, targetPos, reason) {
        let score = 200; // High base score for edge connections
        let details = reason;
        
        // MASSIVE bonus for direct edge connection
        if (targetPos.col === 0 || targetPos.col === this.gameCore.size - 1) {
            score += 1000;
            details += ' +1000 EDGE!';
        }
        
        // Bonus for moving toward needed edge
        const distanceToLeft = targetPos.col;
        const distanceToRight = this.gameCore.size - 1 - targetPos.col;
        
        if (!this.hasReachedStartEdge()) {
            score += Math.max(0, 100 - distanceToLeft * 20);
            details += ` +${Math.max(0, 100 - distanceToLeft * 20)} closer to left`;
        }
        
        if (!this.hasReachedEndEdge()) {
            score += Math.max(0, 100 - distanceToRight * 20);
            details += ` +${Math.max(0, 100 - distanceToRight * 20)} closer to right`;
        }
        
        // Prefer center rows to avoid corners
        const centerRow = Math.floor(this.gameCore.size / 2);
        const distanceFromCenterRow = Math.abs(targetPos.row - centerRow);
        const centerBonus = Math.max(0, 20 - distanceFromCenterRow * 2);
        score += centerBonus;
        if (centerBonus > 0) details += ` +${centerBonus} center`;
        
        return { score, details };
    }
    
    // Override move validation for horizontal
    isMoveInRequiredDirection(fromPos, toPos, requiredDirection) {
        if (requiredDirection === 'any') return true;
        
        const colDiff = toPos.col - fromPos.col;
        
        if (requiredDirection === 'left') {
            return colDiff <= 0;
        } else if (requiredDirection === 'right') {
            return colDiff >= 0;
        }
        
        return true;
    }
    
    // Override completion detection for horizontal chains - check actual game win condition
    isGoalComplete() {
        // First check if we've reached both edges
        if (!this.hasReachedStartEdge() || !this.hasReachedEndEdge()) {
            return false;
        }
        
        // Then check if we actually have a winning path according to game rules
        return this.gameCore.checkWin('O').isWin;
    }

    // Override progress calculation for horizontal
    calculateGoalProgress() {
        const positions = this.chain;
        if (positions.length === 0) return 0;
        
        const minCol = Math.min(...positions.map(p => p.col));
        const maxCol = Math.max(...positions.map(p => p.col));
        return ((maxCol - minCol + 1) / this.gameCore.size) * 100;
    }

    // Override gap filling phase detection for horizontal
    shouldEnterGapFillingPhase() {
        return this.isGoalComplete() && this.chainHasGaps();
    }

    // Override the main move logic to include gap filling phase
    getNextMove() {
        this.moveCount++;
        this.log(`\n=== MOVE ${this.moveCount} ===`);
        
        // Check if we should enter gap filling phase
        if (!this.gapFillingPhase && this.shouldEnterGapFillingPhase()) {
            this.gapFillingPhase = true;
            this.identifyAllGaps();
            this.log('🔧 ENTERING GAP FILLING PHASE (HORIZONTAL)');
        }
        
        // Handle gap filling phase
        if (this.gapFillingPhase) {
            const gapMove = this.getNextGapFillingMove();
            if (gapMove) {
                this.chain.push(gapMove);
                return {
                    row: gapMove.row,
                    col: gapMove.col,
                    value: gapMove.value,
                    reason: gapMove.reason,
                    chainInfo: {
                        chainLength: this.chain.length,
                        heads: this.findChainHeads().length,
                        phase: 'gap-filling'
                    }
                };
            } else {
                this.log('Gap filling complete - continuous horizontal chain achieved!');
                return null;
            }
        }
        
        // Check if initial chain is already complete
        if (this.isGoalComplete()) {
            this.log('Initial horizontal chain complete! Checking for gaps...');
            return null;
        }
        
        // Handle initial chain building phase
        if (this.chain.length === 0) {
            return this.makeFirstMove();
        } else if (this.chain.length === 1) {
            return this.makeSecondMove();
        } else {
            return this.extendChain();
        }
    }

    // Custom log method for horizontal AI
    log(message) {
        if (this.debugMode) {
            console.log(`[O HORIZONTAL CHAIN${this.gapFillingPhase ? ' - GAP FILLING' : ''}] ${message}`);
        }
    }
}

// Add bridge building logic to HorizontalChainAI
HorizontalChainAI.prototype.findBridgingMove = function() {
    // Find all our pieces and look for adjacent connections that would complete the path
    const allPieces = this.gameCore.getPlayerPositions('O');
    
    for (const piece of allPieces) {
        // Check all 8 adjacent positions
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        
        for (const [dr, dc] of directions) {
            const newRow = piece.row + dr;
            const newCol = piece.col + dc;
            
            if (this.isValidAndEmptyPosition(newRow, newCol)) {
                // Test if placing here would create a win
                this.gameCore.board[newRow][newCol] = 'O'; // Temporary placement
                const wouldWin = this.gameCore.checkWin('O').isWin;
                this.gameCore.board[newRow][newCol] = ''; // Remove temporary placement
                
                if (wouldWin) {
                    this.log(`🎯 Found winning bridge move: (${newRow},${newCol})`);
                    return {
                        row: newRow,
                        col: newCol,
                        value: 1000,
                        reason: 'Bridge move for final connection',
                        moveType: 'bridging'
                    };
                }
            }
        }
    }
    
    return null;
};

// Override gap filling for horizontal AI with bridge building fallback
HorizontalChainAI.prototype.getNextGapFillingMove = function() {
    // Find unfilled gaps
    const unfilledGaps = this.identifiedGaps.filter(gap => !gap.filled);
    
    if (unfilledGaps.length > 0) {
        // Choose the first unfilled gap
        const targetGap = unfilledGaps[0];
        
        // Evaluate filling options for this gap
        const candidates = [];
        for (const option of targetGap.fillingOptions) {
            if (this.isValidAndEmptyPosition(option.row, option.col)) {
                const value = this.evaluateGapFillingMove(option, targetGap);
                candidates.push({
                    row: option.row,
                    col: option.col,
                    value: value.score,
                    reason: value.reason,
                    gap: targetGap
                });
            }
        }
        
        if (candidates.length > 0) {
            // Choose best candidate
            candidates.sort((a, b) => b.value - a.value);
            const chosen = candidates[0];
            
            // Mark this gap as filled
            chosen.gap.filled = true;
            
            this.log(`Gap filling move: (${chosen.row},${chosen.col}) - ${chosen.reason}`);
            
            return {
                row: chosen.row,
                col: chosen.col,
                value: chosen.value,
                reason: chosen.reason,
                moveType: 'gap-filling'
            };
        } else {
            // Mark gap as unfillable
            targetGap.filled = true;
            return this.getNextGapFillingMove(); // Try next gap
        }
    }
    
    // If no gap filling moves but we still don't have actual win, try bridge building
    if (!this.gameCore.checkWin('O').isWin) {
        this.log('🌉 No gap moves found - trying bridge building');
        return this.findBridgingMove();
    }
    
    this.log('All gaps filled and bridge building complete!');
    return null;
};

// Simple AI vs AI Observer that uses the simple controller
class SimpleAIvsAIObserver {
    constructor() {
        this.gameCore = null;
        this.aiController = null;
        this.diagonalLines = null;
        this.boardSize = 15;
        this.lastMovePosition = null;
        this.gameRunning = false;
        
        // Initialize the simple system
        this.initializeGame();
        this.setupEventListeners();
    }
    
    initializeGame() {
        console.log('🎮 Initializing Simple AI vs AI...');
        
        // Initialize game core
        this.gameCore = new ConnectionGameCore(this.boardSize);
        
        // Initialize simple AI controller
        this.aiController = new SimpleAIvsAI(this.gameCore);
        
        // Setup event handlers
        this.setupAIControllerEvents();
        
        this.createBoard();
        
        // Initialize diagonal lines
        const svgElement = document.getElementById('diagonal-lines-svg');
        if (svgElement && typeof ConnectionGameDiagonalLines !== 'undefined') {
            setTimeout(() => {
                this.diagonalLines = new ConnectionGameDiagonalLines(this.gameCore, svgElement);
                console.log('✅ Diagonal lines initialized for Simple AI vs AI');
            }, 100);
        }
        
        this.updateDisplay();
    }
    
    setupAIControllerEvents() {
        this.aiController.on('gameStart', (data) => {
            this.onGameStart(data);
        });
        
        this.aiController.on('move', (data) => {
            this.onPlayerMove(data);
        });
        
        this.aiController.on('playerChange', (data) => {
            this.onPlayerChange(data);
        });
        
        this.aiController.on('gameEnd', (data) => {
            this.onGameEnd(data);
        });
        
        this.aiController.on('error', (data) => {
            this.onError(data);
        });
    }
    
    setupEventListeners() {
        const speedSlider = document.getElementById('gameSpeed');
        const speedValue = document.getElementById('speedValue');
        
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const newSpeed = parseInt(e.target.value);
                this.aiController.updateConfig({ turnDelay: newSpeed });
                if (speedValue) speedValue.textContent = newSpeed + 'ms';
            });
        }
    }
    
    createBoard() {
        const boardElement = document.getElementById('gameBoard');
        if (!boardElement) return;
        
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const cellNumber = document.createElement('div');
                cellNumber.className = 'cell-number';
                cellNumber.textContent = row * this.boardSize + col + 1;
                cell.appendChild(cellNumber);
                
                boardElement.appendChild(cell);
            }
        }
    }
    
    updateBoard(animate = true) {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const cellValue = this.gameCore.board[row][col];
            
            cell.classList.remove('x', 'o', 'last-move');
            
            const existingMoveText = cell.querySelector('.move-text');
            if (existingMoveText) {
                existingMoveText.remove();
            }
            
            if (cellValue === 'X') {
                cell.classList.add('x');
                const playerMoveNumber = this.getPlayerMoveNumber(row, col, 'X');
                
                const moveText = document.createElement('div');
                moveText.className = 'move-text';
                moveText.textContent = `X${playerMoveNumber}`;
                cell.appendChild(moveText);
            } else if (cellValue === 'O') {
                cell.classList.add('o');
                const playerMoveNumber = this.getPlayerMoveNumber(row, col, 'O');
                
                const moveText = document.createElement('div');
                moveText.className = 'move-text';
                moveText.textContent = `O${playerMoveNumber}`;
                cell.appendChild(moveText);
            }
            
            if (this.lastMovePosition && 
                this.lastMovePosition.row === row && 
                this.lastMovePosition.col === col) {
                cell.classList.add('last-move');
            }
        });
        
        if (this.diagonalLines) {
            setTimeout(() => {
                this.diagonalLines.updateDiagonalLines();
            }, 50);
        }
    }
    
    getPlayerMoveNumber(row, col, player) {
        if (!this.gameCore || !this.gameCore.gameHistory) return '';
        
        let playerMoveCount = 0;
        for (const move of this.gameCore.gameHistory) {
            if (move.player === player) {
                playerMoveCount++;
                if (move.row === row && move.col === col) {
                    return playerMoveCount;
                }
            }
        }
        return '';
    }
    
    updateDisplay() {
        const gameState = this.aiController.getGameState();
        
        const currentPlayerEl = document.getElementById('currentPlayer');
        const moveCountEl = document.getElementById('moveCount');
        const gameStatusEl = document.getElementById('gameStatus');
        
        if (currentPlayerEl) {
            if (gameState.state === 'running') {
                currentPlayerEl.textContent = gameState.currentPlayer;
                currentPlayerEl.className = `value current-player-${gameState.currentPlayer.toLowerCase()}`;
            } else {
                currentPlayerEl.textContent = gameState.state.charAt(0).toUpperCase() + gameState.state.slice(1);
                currentPlayerEl.className = 'value';
            }
        }
        
        if (moveCountEl) {
            moveCountEl.textContent = gameState.moveCount;
        }
        
        if (gameStatusEl) {
            let status = 'Ready';
            let statusClass = 'value';
            
            switch (gameState.state) {
                case 'running':
                    status = 'Simple AI vs AI Playing';
                    statusClass = 'value game-running';
                    break;
                case 'paused':
                    status = 'Paused';
                    statusClass = 'value game-paused';
                    break;
                case 'complete':
                    status = 'Game Complete';
                    statusClass = 'value game-over';
                    break;
            }
            
            gameStatusEl.textContent = status;
            gameStatusEl.className = statusClass;
        }
    }
    
    // Event handlers
    onGameStart(data) {
        this.logMessage(`🎮 Simple AI vs AI game started!`);
        this.logMessage(`X: Vertical Chain Builder, O: Horizontal Chain Builder`);
        this.gameRunning = true;
        this.updateDisplay();
    }
    
    onPlayerMove(data) {
        this.lastMovePosition = { 
            row: data.move.row, 
            col: data.move.col,
            player: data.player 
        };
        
        this.updateBoard(true);
        this.updateDisplay();
        
        const cellNumber = data.move.row * this.boardSize + data.move.col + 1;
        const playerMoveNum = data.playerMoveNumber || 1;
        
        this.logMessage(`${data.player}${playerMoveNum} plays (${data.move.row},${data.move.col}) [cell ${cellNumber}] - ${data.move.reason || 'no reason'}`);
    }
    
    onPlayerChange(data) {
        this.updateDisplay();
        this.logMessage(`Turn: ${data.current}`);
    }
    
    onGameEnd(data) {
        this.gameRunning = false;
        this.updateDisplay();
        
        this.logMessage(`🎉 Game finished: ${data.result.type}`);
        this.logMessage(`   Result: ${data.result.reason}`);
        if (data.result.winner) {
            this.logMessage(`   Winner: ${data.result.winner}`);
        }
        this.logMessage(`   Total moves: ${data.result.totalMoves}`);
    }
    
    onError(data) {
        this.logMessage(`❌ ERROR: ${data.message} (Player: ${data.player})`);
    }
    
    // Public API for buttons
    handleStartGame() {
        this.gameCore.resetGame(this.boardSize);
        if (this.diagonalLines) {
            this.diagonalLines.clear();
        }
        this.updateBoard(false);
        this.aiController.startGame();
    }
    
    handlePauseGame() {
        this.aiController.pauseGame();
        this.gameRunning = false;
        this.updateDisplay();
    }
    
    handleResumeGame() {
        this.aiController.resumeGame();
        this.gameRunning = true;
        this.updateDisplay();
    }
    
    handleStopGame() {
        this.aiController.stopGame();
        this.gameRunning = false;
        this.updateDisplay();
    }
    
    logMessage(message) {
        const gameLog = document.getElementById('gameLog');
        if (!gameLog) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        gameLog.appendChild(logEntry);
        
        gameLog.scrollTop = gameLog.scrollHeight;
        
        while (gameLog.children.length > 100) {
            gameLog.removeChild(gameLog.firstChild);
        }
        
        console.log(`[Simple AI vs AI] ${message}`);
    }
}

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================

// Replace the complex AI vs AI system with the simple one
window.replaceWithSimpleAI = function() {
    console.log('🔄 Replacing complex AI vs AI with simple version...');
    
    // Clear any existing AI vs AI observer
    if (window.aivsaiObserverInstance) {
        try {
            if (window.aivsaiObserverInstance.aiController) {
                window.aivsaiObserverInstance.aiController.stopGame();
            }
        } catch (error) {
            console.log('Error stopping previous game:', error);
        }
    }
    
    // Create new simple AI vs AI observer
    try {
        window.aivsaiObserverInstance = new SimpleAIvsAIObserver();
        console.log('✅ Simple AI vs AI system activated!');
        
        // Update button handlers to use simple version
        window.startAIvsAIGame = function() {
            if (window.aivsaiObserverInstance) {
                window.aivsaiObserverInstance.handleStartGame();
            }
        };
        
        window.pauseAIvsAIGame = function() {
            if (window.aivsaiObserverInstance) {
                window.aivsaiObserverInstance.handlePauseGame();
            }
        };
        
        window.resumeAIvsAIGame = function() {
            if (window.aivsaiObserverInstance) {
                window.aivsaiObserverInstance.handleResumeGame();
            }
        };
        
        window.stopAIvsAIGame = function() {
            if (window.aivsaiObserverInstance) {
                window.aivsaiObserverInstance.handleStopGame();
            }
        };
        
        // Show success message
        const gameLog = document.getElementById('gameLog');
        if (gameLog) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.textContent = `${new Date().toLocaleTimeString()}: ✅ Simple AI vs AI activated - ready to play with FULL gap filling logic!`;
            gameLog.appendChild(logEntry);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error creating simple AI vs AI:', error);
        return false;
    }
};

// Quick reload function for testing
window.reloadSimpleAI = function() {
    console.log('🔄 Reloading Simple AI vs AI system...');
    
    // Force stop any running game
    if (window.aivsaiObserverInstance && window.aivsaiObserverInstance.aiController) {
        try {
            window.aivsaiObserverInstance.aiController.stopGame();
        } catch (e) {}
    }
    
    // Clear board
    const boardElement = document.getElementById('gameBoard');
    if (boardElement) {
        const cells = boardElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('x', 'o', 'last-move');
            const moveText = cell.querySelector('.move-text');
            if (moveText) moveText.remove();
        });
    }
    
    // Reinitialize
    setTimeout(() => {
        window.replaceWithSimpleAI();
        console.log('✅ Simple AI vs AI reloaded - ready for new game!');
    }, 500);
};

// ========================================================================
// PATCHES FOR EXISTING CLASSES (if they exist)
// ========================================================================

// Patch the SinglePlayerChainAI to use actual game win condition
if (typeof SinglePlayerChainAI !== 'undefined') {
    // Override the isGameComplete method to check actual win condition
    const originalIsGameComplete = SinglePlayerChainAI.prototype.isGameComplete;
    
    SinglePlayerChainAI.prototype.isGameComplete = function() {
        // First check if we've reached both edges
        if (!this.hasReachedTopEdge() || !this.hasReachedBottomEdge()) {
            return false;
        }
        
        // Then check if we actually have a winning path according to game rules
        return this.gameCore.checkWin('X').isWin;
    };
    
    // Override shouldEnterGapFillingPhase to be more permissive
    const originalShouldEnterGapFillingPhase = SinglePlayerChainAI.prototype.shouldEnterGapFillingPhase;
    
    SinglePlayerChainAI.prototype.shouldEnterGapFillingPhase = function() {
        // Enter gap filling if we've reached both edges but don't have actual win
        const reachedBothEdges = this.hasReachedTopEdge() && this.hasReachedBottomEdge();
        const hasActualWin = this.gameCore.checkWin('X').isWin;
        
        if (reachedBothEdges && !hasActualWin) {
            this.log('🔧 Chain reaches edges but no actual win - entering gap filling');
            return true;
        }
        
        // Also enter gap filling if we have a good L/I chain that just needs connection
        return reachedBothEdges && this.chainHasGaps();
    };
    
    // Add emergency extension logic when gap filling can't find moves
    const originalGetNextGapFillingMove = SinglePlayerChainAI.prototype.getNextGapFillingMove;
    
    SinglePlayerChainAI.prototype.getNextGapFillingMove = function() {
        // Try original gap filling logic first
        const gapMove = originalGetNextGapFillingMove.call(this);
        
        if (gapMove) {
            return gapMove;
        }
        
        // If no gap filling moves but we still don't have actual win, try bridge building
        if (!this.gameCore.checkWin('X').isWin) {
            this.log('🌉 No gap moves found - trying bridge building');
            return this.findBridgingMove();
        }
        
        return null;
    };
    
    // Add bridge building logic for final connections
    SinglePlayerChainAI.prototype.findBridgingMove = function() {
        // Find all our pieces and look for adjacent connections that would complete the path
        const allPieces = this.gameCore.getPlayerPositions('X');
        
        for (const piece of allPieces) {
            // Check all 8 adjacent positions
            const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
            
            for (const [dr, dc] of directions) {
                const newRow = piece.row + dr;
                const newCol = piece.col + dc;
                
                if (this.isValidAndEmptyPosition(newRow, newCol)) {
                    // Test if placing here would create a win
                    this.gameCore.board[newRow][newCol] = 'X'; // Temporary placement
                    const wouldWin = this.gameCore.checkWin('X').isWin;
                    this.gameCore.board[newRow][newCol] = ''; // Remove temporary placement
                    
                    if (wouldWin) {
                        this.log(`🎯 Found winning bridge move: (${newRow},${newCol})`);
                        return {
                            row: newRow,
                            col: newCol,
                            value: 1000,
                            reason: 'Bridge move for final connection',
                            moveType: 'bridging'
                        };
                    }
                }
            }
        }
        
        return null;
    };
    
    console.log('✅ SinglePlayerChainAI patched with actual win condition checking');
}

// ========================================================================
// EXPORTS
// ========================================================================

// Export for use in other modules
window.SimpleAIvsAI = SimpleAIvsAI;
window.HorizontalChainAI = HorizontalChainAI;
window.SimpleAIvsAIObserver = SimpleAIvsAIObserver;
window.replaceWithSimpleAI = replaceWithSimpleAI;
window.reloadSimpleAI = reloadSimpleAI;

// Auto-initialize flag
window.SIMPLE_AI_LOADED = true;

console.log('✅ simple-ai.js loaded successfully');
console.log('📦 Exported: SimpleAIvsAI, HorizontalChainAI, SimpleAIvsAIObserver');
console.log('🔧 Exported: replaceWithSimpleAI(), reloadSimpleAI()');
console.log('🎯 Ready for AI vs AI with complete gap filling + bridge building logic!');

// Auto-activate simple AI vs AI when in AI vs AI mode
setTimeout(() => {
    const gameMode = document.getElementById('gameMode');
    if (gameMode && gameMode.value === 'ai_vs_ai') {
        console.log('🔄 Auto-activating simple AI vs AI...');
        window.replaceWithSimpleAI();
    }
}, 2000);