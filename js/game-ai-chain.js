// game-ai-chain.js - Generic Chain Building AI for X (vertical) and O (horizontal)
// Inherits from GameAIBase and implements chain building with L/I patterns

class ChainBuildingAI extends GameAIBase {
    constructor(gameCore, player) {
        super(gameCore, player);
        
        this.chain = []; // Array of positions in the chain
        this.gapFillingPhase = false; // Two-phase strategy flag
        this.identifiedGaps = []; // Store identified gaps
        this.filledGaps = []; // Track which gaps have been filled
        this.interferenceHandler = new OpponentInterferenceHandler(this);
        
        this.log(`Chain Building AI initialized for ${this.player} (${this.goalDirection})`);
    }

    // ========================= ABSTRACT METHOD IMPLEMENTATIONS =========================

    getNextMove() {
        this.moveCount++;
        this.log(`\n=== MOVE ${this.moveCount} ===`);
        
        // Check if we should enter gap filling phase
        if (!this.gapFillingPhase && this.shouldEnterGapFillingPhase()) {
            this.gapFillingPhase = true;
            this.identifyAllGaps();
            this.log('🔧 ENTERING GAP FILLING PHASE');
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
                this.log('Gap filling complete - continuous chain achieved!');
                return null;
            }
        }
        
        // Check if initial chain is already complete
        if (this.isGoalComplete()) {
            this.log('Initial chain complete! Checking for gaps...');
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

    reset() {
        this.chain = [];
        this.moveCount = 0;
        this.gapFillingPhase = false;
        this.identifiedGaps = [];
        this.filledGaps = [];
        this.log(`${this.player} Chain AI reset`);
    }

    getStats() {
        const chainPositions = [...this.chain];
        if (chainPositions.length === 0) {
            return {
                ...this.getCommonStats(),
                chainLength: 0,
                chainHeads: 0,
                phase: 'initial',
                gapFillingPhase: false,
                identifiedGaps: 0,
                filledGaps: 0
            };
        }
        
        const span = this.getPrimaryAxisSpan();
        const progress = this.calculateGoalProgress();
        
        const hasStartEdge = this.hasReachedStartEdge();
        const hasEndEdge = this.hasReachedEndEdge();
        const isComplete = hasStartEdge && hasEndEdge;
        
        let phase = 'initial';
        if (this.gapFillingPhase) {
            phase = 'gap-filling';
        } else if (isComplete) {
            phase = 'complete';
        }
        
        return {
            ...this.getCommonStats(),
            chainLength: chainPositions.length,
            chainHeads: this.findChainHeads().length,
            isComplete: isComplete && !this.chainHasGaps(),
            phase: phase,
            gapFillingPhase: this.gapFillingPhase,
            identifiedGaps: this.identifiedGaps.length,
            filledGaps: this.filledGaps.length,
            chainSpan: span
        };
    }

    // ========================= CHAIN BUILDING PHASE =========================

    makeFirstMove() {
        const center = Math.floor(this.gameCore.size / 2);
        const candidates = [];
        
        // Try positions around center
        for (let rowOffset = -3; rowOffset <= 3; rowOffset++) {
            for (let colOffset = -3; colOffset <= 3; colOffset++) {
                const row = center + rowOffset;
                const col = center + colOffset;
                
                if (this.isValidAndEmptyPosition(row, col)) {
                    candidates.push({
                        row: row,
                        col: col,
                        priority: Math.abs(rowOffset) + Math.abs(colOffset)
                    });
                }
            }
        }
        
        if (candidates.length === 0) return null;
        
        candidates.sort((a, b) => a.priority - b.priority);
        const topCandidates = candidates.slice(0, Math.min(5, candidates.length));
        const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        
        this.chain.push(chosen);
        this.log(`First move: (${chosen.row},${chosen.col}) - center area start`);
        
        return {
            row: chosen.row,
            col: chosen.col,
            value: 100,
            reason: `${this.player} first move in center area`,
            chainInfo: { chainLength: 1, heads: 1 }
        };
    }

    makeSecondMove() {
        const firstPiece = this.chain[0];
        const candidates = [];
        
        this.log(`Creating second move from first piece at (${firstPiece.row},${firstPiece.col})`);
        
        // Try all L-patterns
        for (const pattern of this.patterns.lPatterns) {
            const newPos = this.applyPattern(firstPiece.row, firstPiece.col, pattern);
            
            if (this.isValidAndEmptyPosition(newPos.row, newPos.col)) {
                const value = this.evaluateSecondMove(firstPiece, newPos, pattern);
                candidates.push({
                    row: newPos.row,
                    col: newPos.col,
                    value: value.score,
                    reason: `L-pattern: ${pattern.name} (${value.reason})`,
                    pattern: 'L'
                });
            }
        }
        
        // Try all I-patterns
        for (const pattern of this.patterns.iPatterns) {
            const newPos = this.applyPattern(firstPiece.row, firstPiece.col, pattern);
            
            if (this.isValidAndEmptyPosition(newPos.row, newPos.col)) {
                const value = this.evaluateSecondMove(firstPiece, newPos, pattern);
                candidates.push({
                    row: newPos.row,
                    col: newPos.col,
                    value: value.score,
                    reason: `I-pattern: ${pattern.name} (${value.reason})`,
                    pattern: 'I'
                });
            }
        }
        
        if (candidates.length === 0) {
            this.log('No valid L/I patterns for second move');
            return null;
        }
        
        candidates.sort((a, b) => b.value - a.value);
        const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
        const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        
        this.chain.push(chosen);
        this.log(`Second move chosen: (${chosen.row},${chosen.col}) - ${chosen.reason}`);
        
        return {
            row: chosen.row,
            col: chosen.col,
            value: chosen.value,
            reason: chosen.reason,
            chainInfo: { chainLength: 2, heads: 2 }
        };
    }

    extendChain() {
        const heads = this.findChainHeads();
        const requiredDirection = this.getRequiredDirection();
        
        this.log(`All heads found: ${heads.map(h => `(${h.row},${h.col})`).join(', ')}`);
        this.log(`Chain spans ${this.primaryAxis}s ${this.getChainAxisRange().min} to ${this.getChainAxisRange().max}`);
        this.log(`Required direction: ${requiredDirection}`);
        
        if (heads.length === 0) {
            this.log('No chain heads found - cannot extend');
            return null;
        }
        
        let validHeads = heads;
        if (requiredDirection !== 'any') {
            validHeads = this.filterHeadsByDirection(heads, requiredDirection);
            this.log(`Filtered to ${validHeads.length} valid heads after direction filtering`);
            
            const excludedHeads = heads.filter(h => !validHeads.includes(h));
            if (excludedHeads.length > 0) {
                this.log(`Excluded heads: ${excludedHeads.map(h => `(${h.row},${h.col})`).join(', ')} - near completed side`);
            }
            
            if (validHeads.length === 0) {
                this.log('No valid heads after direction filtering - chain may be stuck or complete');
                return null;
            }
        }
        
        const chosenHead = validHeads[Math.floor(Math.random() * validHeads.length)];
        this.log(`Extending from head: (${chosenHead.row},${chosenHead.col})`);
        
        const extensions = this.generateExtensionsFromHead(chosenHead);
        
        if (extensions.length === 0) {
            this.log('No valid extensions from chosen head');
            for (const head of validHeads) {
                if (head !== chosenHead) {
                    const altExtensions = this.generateExtensionsFromHead(head);
                    if (altExtensions.length > 0) {
                        extensions.push(...altExtensions);
                        this.log(`Found extensions from alternative head (${head.row},${head.col})`);
                        break;
                    }
                }
            }
        }
        
        if (extensions.length === 0) {
            this.log('No valid extensions from any valid head');
            return null;
        }
        
        extensions.sort((a, b) => b.value - a.value);
        this.log(`Generated ${extensions.length} extension options:`);
        extensions.slice(0, 3).forEach((move, i) => {
            this.log(`  ${i + 1}. (${move.row},${move.col}) - ${move.reason} (value: ${move.value})`);
        });
        
        const topCandidates = extensions.slice(0, Math.min(3, extensions.length));
        const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        
        this.chain.push(chosen);
        this.log(`Extension chosen: (${chosen.row},${chosen.col}) - ${chosen.reason}`);
        
        return {
            row: chosen.row,
            col: chosen.col,
            value: chosen.value,
            reason: chosen.reason,
            chainInfo: {
                chainLength: this.chain.length,
                heads: this.findChainHeads().length
            }
        };
    }

    // ========================= CHAIN ANALYSIS =========================

    getChainAxisRange() {
        if (this.chain.length === 0) return { min: 0, max: 0 };
        
        const values = this.chain.map(p => p[this.primaryAxis]);
        return {
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }

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
        
        const range = this.getChainAxisRange();
        return piece[this.primaryAxis] === range.min || piece[this.primaryAxis] === range.max;
    }

    countConnections(piece) {
        let connections = 0;
        for (const other of this.chain) {
            if (other === piece) continue;
            if (this.arePositionsConnected(piece, other)) {
                connections++;
            }
        }
        return connections;
    }

    isInChain(row, col) {
        return this.chain.some(piece => piece.row === row && piece.col === col);
    }

    // ========================= EDGE CONNECTION LOGIC =========================
    
    shouldUseAdjacentConnectionToEdge(head) {
        // Only use adjacent connections when exactly 1 step away from target edge
        const startDistance = Math.abs(head[this.edges.start.axis] - this.edges.start.value);
        const endDistance = Math.abs(head[this.edges.end.axis] - this.edges.end.value);
        
        // If we need to reach start edge and we're exactly 1 step away
        if (!this.hasReachedStartEdge() && startDistance === 1) {
            return true;
        }
        
        // If we need to reach end edge and we're exactly 1 step away
        if (!this.hasReachedEndEdge() && endDistance === 1) {
            return true;
        }
        
        // If already on edge and extending along edge
        if (head[this.edges.start.axis] === this.edges.start.value || 
            head[this.edges.end.axis] === this.edges.end.value) {
            return true;
        }
        
        return false;
    }

    generateExtensionsFromHead(head) {
    // Use opponent-aware extension generation
    return this.interferenceHandler.generateRobustExtensionsFromHead(head);
}

    generateAdjacentExtensionsToEdge(head) {
        const extensions = [];
        
        for (const pattern of this.patterns.adjacentPatterns) {
            const newPos = this.applyPattern(head.row, head.col, pattern);
            
            if (this.isValidAndEmptyPosition(newPos.row, newPos.col) && !this.isInChain(newPos.row, newPos.col)) {
                let isGoodEdgeMove = false;
                let reason = '';
                
                // Check for direct edge connections
                if (!this.hasReachedStartEdge() && newPos[this.edges.start.axis] === this.edges.start.value) {
                    isGoodEdgeMove = true;
                    reason = `DIRECT ${this.edges.start.name.toUpperCase()} EDGE CONNECTION`;
                }
                else if (!this.hasReachedEndEdge() && newPos[this.edges.end.axis] === this.edges.end.value) {
                    isGoodEdgeMove = true;
                    reason = `DIRECT ${this.edges.end.name.toUpperCase()} EDGE CONNECTION`;
                }
                // Lateral movement along actual edge
                else if (head[this.edges.start.axis] === this.edges.start.value && 
                         newPos[this.edges.start.axis] === this.edges.start.value) {
                    isGoodEdgeMove = true;
                    reason = `extend along ${this.edges.start.name} edge`;
                }
                else if (head[this.edges.end.axis] === this.edges.end.value && 
                         newPos[this.edges.end.axis] === this.edges.end.value) {
                    isGoodEdgeMove = true;
                    reason = `extend along ${this.edges.end.name} edge`;
                }
                
                if (isGoodEdgeMove) {
                    const value = this.evaluateAdjacentEdgeMove(head, newPos, reason);
                    extensions.push({
                        row: newPos.row,
                        col: newPos.col,
                        value: value.score,
                        reason: `Adjacent: ${reason} (${value.details})`,
                        pattern: 'Adjacent'
                    });
                }
            }
        }
        
        return extensions;
    }

    // ========================= MOVE EVALUATION =========================

    evaluateSecondMove(firstPiece, targetPos, pattern) {
        let score = 50;
        let reason = "";
        
        // Favor moves that increase span along primary axis
        const axisSpan = Math.abs(targetPos[this.primaryAxis] - firstPiece[this.primaryAxis]);
        score += axisSpan * 15;
        reason += `${this.primaryAxis} span +${axisSpan * 15}`;
        
        // Favor patterns that move in goal direction
        const patternMovesInGoalDirection = this.doesPatternMoveInGoalDirection(pattern);
        if (patternMovesInGoalDirection) {
            score += 20;
            reason += `, goal direction +20`;
        }
        
        // Slight preference for L-patterns
        if (pattern.name.startsWith('L-')) {
            score += 10;
            reason += `, L-pattern +10`;
        }
        
        return { score, reason };
    }

    doesPatternMoveInGoalDirection(pattern) {
        if (this.goalDirection === 'vertical') {
            return pattern.name.includes('up') || pattern.name.includes('down');
        } else {
            return pattern.name.includes('left') || pattern.name.includes('right');
        }
    }

    evaluateExtension(head, targetPos, pattern) {
        let score = 30;
        let reason = "";
        const requiredDirection = this.getRequiredDirection();
        
        // Progress toward goal edges
        const range = this.getChainAxisRange();
        let axisProgress = 0;
        
        if (targetPos[this.primaryAxis] < range.min) {
            axisProgress = range.min - targetPos[this.primaryAxis];
            score += axisProgress * 40;
            reason += `toward ${this.edges.start.name} +${axisProgress * 40}`;
        } else if (targetPos[this.primaryAxis] > range.max) {
            axisProgress = targetPos[this.primaryAxis] - range.max;
            score += axisProgress * 40;
            reason += `toward ${this.edges.end.name} +${axisProgress * 40}`;
        }
        
        // Direction alignment
        const directionValue = this.evaluateDirectionAlignment(head, targetPos, requiredDirection);
        score += directionValue.score;
        if (directionValue.reason) reason += `, ${directionValue.reason}`;
        
        // Edge bonuses
        const edgeValue = this.evaluateEdgeValue(targetPos);
        score += edgeValue.score;
        if (edgeValue.reason) reason += `, ${edgeValue.reason}`;
        
        return { score, reason };
    }

    evaluateDirectionAlignment(head, targetPos, requiredDirection) {
        const axisDiff = targetPos[this.primaryAxis] - head[this.primaryAxis];
        
        if (requiredDirection === this.edges.start.name && axisDiff < 0) {
            return { score: 500, reason: `CORRECT DIRECTION (${this.edges.start.name}) +500` };
        } else if (requiredDirection === this.edges.end.name && axisDiff > 0) {
            return { score: 500, reason: `CORRECT DIRECTION (${this.edges.end.name}) +500` };
        } else if (requiredDirection === this.edges.start.name && axisDiff > 0) {
            return { score: -1000, reason: `WRONG DIRECTION (need ${this.edges.start.name}) -1000` };
        } else if (requiredDirection === this.edges.end.name && axisDiff < 0) {
            return { score: -1000, reason: `WRONG DIRECTION (need ${this.edges.end.name}) -1000` };
        }
        
        return { score: 0, reason: '' };
    }

    evaluateAdjacentEdgeMove(head, targetPos, reason) {
        let score = 200; // High base score for edge connections
        let details = reason;
        
        // MASSIVE bonus for direct edge connection
        if (targetPos[this.edges.start.axis] === this.edges.start.value || 
            targetPos[this.edges.end.axis] === this.edges.end.value) {
            score += 1000;
            details += ' +1000 EDGE!';
        }
        
        return { score, details };
    }

    evaluateEdgeValue(targetPos) {
        let score = 0;
        let reason = '';
        
        if (targetPos[this.edges.start.axis] === this.edges.start.value) {
            score += 200;
            reason = `${this.edges.start.name.toUpperCase()} EDGE +200`;
        } else if (targetPos[this.edges.end.axis] === this.edges.end.value) {
            score += 200;
            reason = `${this.edges.end.name.toUpperCase()} EDGE +200`;
        }
        
        return { score, reason };
    }

    // ========================= DIRECTIONAL FILTERING =========================
    
    filterHeadsByDirection(heads, requiredDirection) {
        const filteredHeads = [];
        const threshold = Math.floor(this.gameCore.size / 3); // One-third of board
        
        this.log(`Filtering heads for required direction: ${requiredDirection}`);
        
        for (const head of heads) {
            let shouldInclude = false;
            
            if (requiredDirection === this.edges.start.name) {
                // If we need to go toward start edge, exclude heads too close to end
                const distanceFromEnd = Math.abs(head[this.edges.end.axis] - this.edges.end.value);
                if (distanceFromEnd > threshold) {
                    shouldInclude = true;
                    this.log(`Head (${head.row},${head.col}) included - can extend toward ${this.edges.start.name}`);
                } else {
                    this.log(`Head (${head.row},${head.col}) excluded - too close to ${this.edges.end.name}`);
                }
            } else if (requiredDirection === this.edges.end.name) {
                // If we need to go toward end edge, exclude heads too close to start
                const distanceFromStart = Math.abs(head[this.edges.start.axis] - this.edges.start.value);
                if (distanceFromStart > threshold) {
                    shouldInclude = true;
                    this.log(`Head (${head.row},${head.col}) included - can extend toward ${this.edges.end.name}`);
                } else {
                    this.log(`Head (${head.row},${head.col}) excluded - too close to ${this.edges.start.name}`);
                }
            }
            
            if (shouldInclude) {
                filteredHeads.push(head);
            }
        }
        
        this.log(`Filtered from ${heads.length} to ${filteredHeads.length} valid heads`);
        return filteredHeads;
    }

    isMoveInRequiredDirection(fromPos, toPos, requiredDirection) {
        if (requiredDirection === 'any') return true;
        
        const axisDiff = toPos[this.primaryAxis] - fromPos[this.primaryAxis];
        
        if (requiredDirection === this.edges.start.name) {
            return axisDiff <= 0;
        } else if (requiredDirection === this.edges.end.name) {
            return axisDiff >= 0;
        }
        
        return true;
    }

    // ========================= GAP FILLING PHASE =========================
    
    shouldEnterGapFillingPhase() {
        return this.isGoalComplete() && this.chainHasGaps();
    }
    
    chainHasGaps() {
        // Check if there's a continuous adjacent path from start to end edge
        const startEdgePieces = this.chain.filter(piece => 
            piece[this.edges.start.axis] === this.edges.start.value
        );
        if (startEdgePieces.length === 0) return true;
        
        for (const startPiece of startEdgePieces) {
            if (this.hasAdjacentPathToEndEdge(startPiece, new Set())) {
                return false; // Found continuous path, no gaps
            }
        }
        return true; // No continuous path found, has gaps
    }
    
    hasAdjacentPathToEndEdge(piece, visited) {
        const key = `${piece.row}-${piece.col}`;
        if (visited.has(key)) return false;
        visited.add(key);
        
        // Reached end edge
        if (piece[this.edges.end.axis] === this.edges.end.value) return true;
        
        // Check adjacent positions (8 directions) for continuous path check
        for (const pattern of this.patterns.adjacentPatterns) {
            const newPos = this.applyPattern(piece.row, piece.col, pattern);
            
            if (this.isValidPosition(newPos.row, newPos.col) && 
                this.gameCore.board[newPos.row][newPos.col] === this.player && 
                !visited.has(`${newPos.row}-${newPos.col}`)) {
                
                if (this.hasAdjacentPathToEndEdge(newPos, new Set(visited))) {
                    return true;
                }
            }
        }
        return false;
    }

    identifyAllGaps() {
        this.identifiedGaps = [];
        
        // Find all L/I pattern connections in the chain
        for (let i = 0; i < this.chain.length; i++) {
            for (let j = i + 1; j < this.chain.length; j++) {
                const piece1 = this.chain[i];
                const piece2 = this.chain[j];
                
                if (this.arePositionsConnected(piece1, piece2)) {
                    const gap = this.findGapBetweenPieces(piece1, piece2);
                    if (gap && gap.fillingOptions.length > 0) {
                        this.identifiedGaps.push(gap);
                    }
                }
            }
        }
        
        this.log(`Identified ${this.identifiedGaps.length} gaps in the chain`);
        this.identifiedGaps.forEach((gap, i) => {
            this.log(`Gap ${i + 1}: ${gap.connectionType} between (${gap.piece1.row},${gap.piece1.col}) and (${gap.piece2.row},${gap.piece2.col})`);
            this.log(`  Filling options: ${gap.fillingOptions.map(opt => `(${opt.row},${opt.col})`).join(', ')}`);
        });
        
        return this.identifiedGaps;
    }

    findGapBetweenPieces(piece1, piece2) {
        const rowDiff = piece2.row - piece1.row;
        const colDiff = piece2.col - piece1.col;
        const fillingOptions = [];
        let connectionType = '';
        
        // Check if this is an adjacent connection (no gap to fill)
        if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && (Math.abs(rowDiff) + Math.abs(colDiff) > 0)) {
            return null; // Adjacent connection - no gap to fill
        }
        
        // L-pattern gaps
        if ((Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2) || 
            (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1)) {
            connectionType = 'L-pattern';
            
            for (let testRow = Math.min(piece1.row, piece2.row); testRow <= Math.max(piece1.row, piece2.row); testRow++) {
                for (let testCol = Math.min(piece1.col, piece2.col); testCol <= Math.max(piece1.col, piece2.col); testCol++) {
                    if (this.isValidAndEmptyPosition(testRow, testCol) && 
                        !this.isInChain(testRow, testCol)) {
                        
                        // Check if this position is adjacent to both pieces
                        const adjacentToPiece1 = this.arePositionsConnected(
                            {row: testRow, col: testCol}, piece1, 'adjacent'
                        );
                        const adjacentToPiece2 = this.arePositionsConnected(
                            {row: testRow, col: testCol}, piece2, 'adjacent'
                        );
                        
                        if (adjacentToPiece1 && adjacentToPiece2) {
                            fillingOptions.push({ row: testRow, col: testCol });
                        }
                    }
                }
            }
        }
        
        // I-pattern gaps
        else if (Math.abs(rowDiff) === 2 && colDiff === 0) {
            connectionType = 'I-vertical';
            const gapRow = piece1.row + Math.sign(rowDiff);
            if (this.isValidAndEmptyPosition(gapRow, piece1.col)) {
                fillingOptions.push({ row: gapRow, col: piece1.col });
            }
        }
        else if (rowDiff === 0 && Math.abs(colDiff) === 2) {
            connectionType = 'I-horizontal';
            const gapCol = piece1.col + Math.sign(colDiff);
            if (this.isValidAndEmptyPosition(piece1.row, gapCol)) {
                fillingOptions.push({ row: piece1.row, col: gapCol });
            }
        }
        else if (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 2) {
            connectionType = 'I-diagonal';
            const gapRow = piece1.row + Math.sign(rowDiff);
            const gapCol = piece1.col + Math.sign(colDiff);
            if (this.isValidAndEmptyPosition(gapRow, gapCol)) {
                fillingOptions.push({ row: gapRow, col: gapCol });
            }
        }
        
        if (fillingOptions.length > 0) {
            return {
                piece1: piece1,
                piece2: piece2,
                connectionType: connectionType,
                fillingOptions: fillingOptions,
                filled: false
            };
        }
        
        return null;
    }

    getNextGapFillingMove() {
        // Find unfilled gaps
        const unfilledGaps = this.identifiedGaps.filter(gap => !gap.filled);
        
        if (unfilledGaps.length === 0) {
            this.log('All gaps have been filled!');
            return null;
        }
        
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
        
        if (candidates.length === 0) {
            this.log('No valid filling options for current gap');
            targetGap.filled = true; // Mark as unfillable
            return this.getNextGapFillingMove(); // Try next gap
        }
        
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
    }
    
    evaluateGapFillingMove(position, gap) {
        let score = 100; // Base score for gap filling
        let reason = `Fill ${gap.connectionType} gap`;
        
        // Prefer moves closer to center
        const centerRow = Math.floor(this.gameCore.size / 2);
        const centerCol = Math.floor(this.gameCore.size / 2);
        const distanceFromCenter = Math.abs(position.row - centerRow) + Math.abs(position.col - centerCol);
        score += Math.max(0, 10 - distanceFromCenter);
        
        // Prefer moves that create more connections
        const adjacentChainPieces = this.countAdjacentChainPieces(position.row, position.col);
        score += adjacentChainPieces * 5;
        
        if (adjacentChainPieces > 2) {
            reason += ` (connects ${adjacentChainPieces} pieces)`;
        }
        
        return { score, reason };
    }
    
    countAdjacentChainPieces(row, col) {
        let count = 0;
        
        for (const pattern of this.patterns.adjacentPatterns) {
            const newPos = this.applyPattern(row, col, pattern);
            
            if (this.isValidPosition(newPos.row, newPos.col) && 
                this.isInChain(newPos.row, newPos.col)) {
                count++;
            }
        }
        
        return count;
    }

    // ========================= ENHANCED LOGGING =========================

    log(message) {
        if (this.debugMode) {
            const phase = this.gapFillingPhase ? ' - GAP FILLING' : '';
            console.log(`[${this.player} CHAIN${phase}] ${message}`);
        }
    }
}

// Export for use in other modules
window.ChainBuildingAI = ChainBuildingAI;