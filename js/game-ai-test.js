// game-ai-test.js - Single Player Chain Building AI for X
// Builds a single chain using L-patterns and I-patterns to connect top and bottom
// Then fills gaps to create continuous chain

class SinglePlayerChainAI {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.chain = []; // Array of positions in the chain
        this.moveCount = 0;
        this.debugMode = true;
        this.gapFillingPhase = false; // New phase flag
        this.identifiedGaps = []; // Store identified gaps
        this.filledGaps = []; // Track which gaps have been filled
        
        // Pattern definitions
        this.lPatterns = [
            // L-patterns (knight's move): distance 1,2 or 2,1
            { dr: 1, dc: 2, name: 'L-right-down' },
            { dr: 1, dc: -2, name: 'L-left-down' },
            { dr: -1, dc: 2, name: 'L-right-up' },
            { dr: -1, dc: -2, name: 'L-left-up' },
            { dr: 2, dc: 1, name: 'L-down-right' },
            { dr: 2, dc: -1, name: 'L-down-left' },
            { dr: -2, dc: 1, name: 'L-up-right' },
            { dr: -2, dc: -1, name: 'L-up-left' }
        ];
        
        this.iPatterns = [
            // I-patterns (straight line with gaps): distance 2,0 or 0,2 or 2,2
            { dr: 0, dc: 2, name: 'I-right' },
            { dr: 0, dc: -2, name: 'I-left' },
            { dr: 2, dc: 0, name: 'I-down' },
            { dr: -2, dc: 0, name: 'I-up' },
            { dr: 2, dc: 2, name: 'I-diagonal-down-right' },
            { dr: 2, dc: -2, name: 'I-diagonal-down-left' },
            { dr: -2, dc: 2, name: 'I-diagonal-up-right' },
            { dr: -2, dc: -2, name: 'I-diagonal-up-left' }
        ];
    }

    // ========================= BOUNDARY VALIDATION =========================
    
    isValidBoardPosition(row, col) {
        return row >= 0 && row < this.gameCore.size && 
               col >= 0 && col < this.gameCore.size;
    }
    
    isValidAndEmptyPosition(row, col) {
        return this.isValidBoardPosition(row, col) && 
               this.gameCore.isValidMove(row, col);
    }

    // ========================= EDGE PROXIMITY CHECKS =========================
    
    hasReachedTopArea() {
        return this.chain.some(piece => piece.row <= 1);
    }
    
    hasReachedBottomArea() {
        return this.chain.some(piece => piece.row >= this.gameCore.size - 2);
    }
    
    hasReachedTopEdge() {
        return this.chain.some(piece => piece.row === 0);
    }
    
    hasReachedBottomEdge() {
        return this.chain.some(piece => piece.row === this.gameCore.size - 1);
    }
    
    isGameComplete() {
        return this.hasReachedTopEdge() && this.hasReachedBottomEdge();
    }
    
    getRequiredDirection() {
        const reachedTop = this.hasReachedTopArea();
        const reachedBottom = this.hasReachedBottomArea();
        
        if (reachedTop && !this.hasReachedBottomEdge()) {
            return 'down';
        } else if (reachedBottom && !this.hasReachedTopEdge()) {
            return 'up';
        }
        return 'any';
    }

    // ========================= GAP FILLING PHASE DETECTION =========================
    
    shouldEnterGapFillingPhase() {
        // Enter gap filling phase when chain connects top to bottom but has gaps
        return this.isGameComplete() && this.chainHasGaps();
    }
    
    chainHasGaps() {
        // Check if there's a continuous adjacent path from top to bottom
        const topPieces = this.chain.filter(piece => piece.row === 0);
        if (topPieces.length === 0) return true;
        
        for (const topPiece of topPieces) {
            if (this.hasAdjacentPathToBottom(topPiece, new Set())) {
                return false; // Found continuous path, no gaps
            }
        }
        return true; // No continuous path found, has gaps
    }
    
    hasAdjacentPathToBottom(piece, visited) {
        const key = `${piece.row}-${piece.col}`;
        if (visited.has(key)) return false;
        visited.add(key);
        
        // Reached bottom edge
        if (piece.row === this.gameCore.size - 1) return true;
        
        // Check adjacent positions (8 directions) - not L/I patterns for continuous path check
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        for (const [dr, dc] of directions) {
            const newRow = piece.row + dr;
            const newCol = piece.col + dc;
            
            if (this.isValidBoardPosition(newRow, newCol) && 
                this.gameCore.board[newRow][newCol] === 'X' && 
                !visited.has(`${newRow}-${newCol}`)) {
                
                if (this.hasAdjacentPathToBottom({row: newRow, col: newCol}, new Set(visited))) {
                    return true;
                }
            }
        }
        return false;
    }

    // ========================= GAP IDENTIFICATION AND FILLING =========================
    
    identifyAllGaps() {
        this.identifiedGaps = [];
        
        // Find all L/I pattern connections in the chain
        for (let i = 0; i < this.chain.length; i++) {
            for (let j = i + 1; j < this.chain.length; j++) {
                const piece1 = this.chain[i];
                const piece2 = this.chain[j];
                
                if (this.areConnected(piece1, piece2)) {
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
        
        // L-pattern gaps
        if ((Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2) || 
            (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1)) {
            connectionType = 'L-pattern';
            
            // L-pattern has multiple gap cells - we need to find cells that connect both pieces
            const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
            
            for (let testRow = Math.min(piece1.row, piece2.row); testRow <= Math.max(piece1.row, piece2.row); testRow++) {
                for (let testCol = Math.min(piece1.col, piece2.col); testCol <= Math.max(piece1.col, piece2.col); testCol++) {
                    if (this.isValidAndEmptyPosition(testRow, testCol) && 
                        !this.isInChain(testRow, testCol)) {
                        
                        // Check if this position is adjacent to both pieces
                        const adjacentToPiece1 = this.isAdjacent(testRow, testCol, piece1.row, piece1.col);
                        const adjacentToPiece2 = this.isAdjacent(testRow, testCol, piece2.row, piece2.col);
                        
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
    
    isAdjacent(row1, col1, row2, col2) {
        const rowDiff = Math.abs(row2 - row1);
        const colDiff = Math.abs(col2 - col1);
        return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
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
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isValidBoardPosition(newRow, newCol) && 
                this.isInChain(newRow, newCol)) {
                count++;
            }
        }
        
        return count;
    }

    // ========================= MAIN ENTRY POINT =========================

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
        if (this.isGameComplete()) {
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

    // ========================= MOVE GENERATION (EXISTING METHODS) =========================

    makeFirstMove() {
        const center = Math.floor(this.gameCore.size / 2);
        const candidates = [];
        
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
            reason: 'First move in center area',
            chainInfo: { chainLength: 1, heads: 1 }
        };
    }

    makeSecondMove() {
        const firstPiece = this.chain[0];
        const candidates = [];
        
        this.log(`Creating second move from first piece at (${firstPiece.row},${firstPiece.col})`);
        
        // Try all L-patterns
        for (const pattern of this.lPatterns) {
            const newRow = firstPiece.row + pattern.dr;
            const newCol = firstPiece.col + pattern.dc;
            
            if (this.isValidAndEmptyPosition(newRow, newCol)) {
                const value = this.evaluateSecondMove(firstPiece, { row: newRow, col: newCol }, pattern);
                candidates.push({
                    row: newRow,
                    col: newCol,
                    value: value.score,
                    reason: `L-pattern: ${pattern.name} (${value.reason})`,
                    pattern: 'L'
                });
            }
        }
        
        // Try all I-patterns
        for (const pattern of this.iPatterns) {
            const newRow = firstPiece.row + pattern.dr;
            const newCol = firstPiece.col + pattern.dc;
            
            if (this.isValidAndEmptyPosition(newRow, newCol)) {
                const value = this.evaluateSecondMove(firstPiece, { row: newRow, col: newCol }, pattern);
                candidates.push({
                    row: newRow,
                    col: newCol,
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
        this.log(`Chain spans rows ${Math.min(...this.chain.map(p => p.row))} to ${Math.max(...this.chain.map(p => p.row))}`);
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

    // ========================= EDGE CONNECTION LOGIC =========================
    
    shouldUseAdjacentConnectionToEdge(head) {
        // Only use adjacent connections when exactly 1 row away from target edge
        // OR when already on the edge and extending along it
        const distanceToTop = head.row;
        const distanceToBottom = this.gameCore.size - 1 - head.row;
        
        // If we need to reach top and we're exactly 1 row away (row 1 -> row 0)
        if (!this.hasReachedTopEdge() && distanceToTop === 1) {
            return true;
        }
        
        // If we need to reach bottom and we're exactly 1 row away (row 13 -> row 14)
        if (!this.hasReachedBottomEdge() && distanceToBottom === 1) {
            return true;
        }
        
        // If already on edge and extending along edge
        if (head.row === 0 || head.row === this.gameCore.size - 1) {
            return true;
        }
        
        return false;
    }
    
    generateAdjacentExtensionsToEdge(head) {
        const extensions = [];
        const distanceToTop = head.row;
        const distanceToBottom = this.gameCore.size - 1 - head.row;
        
        // Generate adjacent moves in 8 directions
        const adjacentDirections = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        
        for (const [dr, dc] of adjacentDirections) {
            const newRow = head.row + dr;
            const newCol = head.col + dc;
            
            if (this.isValidAndEmptyPosition(newRow, newCol) && !this.isInChain(newRow, newCol)) {
                let isGoodEdgeMove = false;
                let reason = '';
                
                // CASE 1: Direct move to target edge (row 1 -> row 0, or row 13 -> row 14)
                if (!this.hasReachedTopEdge() && head.row === 1 && newRow === 0) {
                    isGoodEdgeMove = true;
                    reason = 'DIRECT TOP EDGE CONNECTION';
                }
                else if (!this.hasReachedBottomEdge() && head.row === this.gameCore.size - 2 && newRow === this.gameCore.size - 1) {
                    isGoodEdgeMove = true;
                    reason = 'DIRECT BOTTOM EDGE CONNECTION';
                }
                // CASE 2: Lateral movement along the actual edge (already on row 0 or row 14)
                else if (head.row === 0 && newRow === 0) {
                    isGoodEdgeMove = true;
                    reason = 'extend along top edge';
                }
                else if (head.row === this.gameCore.size - 1 && newRow === this.gameCore.size - 1) {
                    isGoodEdgeMove = true;
                    reason = 'extend along bottom edge';
                }
                
                // NO lateral moves on near-edge rows (row 1 or row 13)
                // NO moves away from the target edge
                
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
    
    evaluateAdjacentEdgeMove(head, targetPos, reason) {
        let score = 200; // High base score for edge connections
        let details = reason;
        
        // MASSIVE bonus for direct edge connection
        if (targetPos.row === 0 || targetPos.row === this.gameCore.size - 1) {
            score += 1000;
            details += ' +1000 EDGE!';
        }
        
        // Bonus for moving toward needed edge
        const distanceToTop = targetPos.row;
        const distanceToBottom = this.gameCore.size - 1 - targetPos.row;
        
        if (!this.hasReachedTopEdge()) {
            score += Math.max(0, 100 - distanceToTop * 20);
            details += ` +${Math.max(0, 100 - distanceToTop * 20)} closer to top`;
        }
        
        if (!this.hasReachedBottomEdge()) {
            score += Math.max(0, 100 - distanceToBottom * 20);
            details += ` +${Math.max(0, 100 - distanceToBottom * 20)} closer to bottom`;
        }
        
        // Prefer center columns to avoid corners
        const centerCol = Math.floor(this.gameCore.size / 2);
        const distanceFromCenterCol = Math.abs(targetPos.col - centerCol);
        const centerBonus = Math.max(0, 20 - distanceFromCenterCol * 2);
        score += centerBonus;
        if (centerBonus > 0) details += ` +${centerBonus} center`;
        
        return { score, details };
    }

    // ========================= DIRECTIONAL FILTERING =========================
    
    filterHeadsByDirection(heads, requiredDirection) {
        const filteredHeads = [];
        
        this.log(`Filtering heads for required direction: ${requiredDirection}`);
        
        for (const head of heads) {
            let shouldInclude = false;
            
            if (requiredDirection === 'up') {
                if (head.row < this.gameCore.size - 5) {
                    shouldInclude = true;
                    this.log(`Head (${head.row},${head.col}) included - can extend upward (not near bottom)`);
                } else {
                    this.log(`Head (${head.row},${head.col}) excluded - near bottom (completed side)`);
                }
            } else if (requiredDirection === 'down') {
                if (head.row > 4) {
                    shouldInclude = true;
                    this.log(`Head (${head.row},${head.col}) included - can extend downward (not near top)`);
                } else {
                    this.log(`Head (${head.row},${head.col}) excluded - near top (completed side)`);
                }
            }
            
            if (shouldInclude) {
                filteredHeads.push(head);
            }
        }
        
        this.log(`Filtered from ${heads.length} to ${filteredHeads.length} valid heads`);
        return filteredHeads;
    }

    // ========================= CHAIN ANALYSIS =========================

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
        
        const minRow = Math.min(...this.chain.map(p => p.row));
        const maxRow = Math.max(...this.chain.map(p => p.row));
        
        return piece.row === minRow || piece.row === maxRow;
    }

    countConnections(piece) {
        let connections = 0;
        for (const other of this.chain) {
            if (other === piece) continue;
            if (this.areConnected(piece, other)) {
                connections++;
            }
        }
        return connections;
    }

    areConnected(piece1, piece2) {
        const rowDiff = Math.abs(piece2.row - piece1.row);
        const colDiff = Math.abs(piece2.col - piece1.col);
        
        // L-pattern connection (knight's move)
        if ((rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1)) {
            return true;
        }
        
        // I-pattern connection (straight line with gap)
        if ((rowDiff === 0 && colDiff === 2) || (rowDiff === 2 && colDiff === 0)) {
            return true;
        }
        
        // Diagonal I-pattern (diagonal with gap)
        if (rowDiff === 2 && colDiff === 2) {
            return true;
        }
        
        return false;
    }

    // ========================= MOVE EVALUATION =========================

    evaluateSecondMove(firstPiece, targetPos, pattern) {
        let score = 50;
        let reason = "";
        
        const verticalSpan = Math.abs(targetPos.row - firstPiece.row);
        score += verticalSpan * 15;
        reason += `vertical span +${verticalSpan * 15}`;
        
        if (pattern.name.includes('up') || pattern.name.includes('down')) {
            score += 20;
            reason += `, vertical pattern +20`;
        }
        
        if (pattern.dr && pattern.dc && Math.abs(pattern.dr) !== Math.abs(pattern.dc)) {
            score += 10;
            reason += `, L-pattern +10`;
        }
        
        return { score, reason };
    }

    generateExtensionsFromHead(head) {
        const extensions = [];
        const requiredDirection = this.getRequiredDirection();
        
        // Check if head is near an edge and should use adjacent connections
        if (this.shouldUseAdjacentConnectionToEdge(head)) {
            this.log(`Head (${head.row},${head.col}) is near edge - using adjacent connections`);
            const adjacentExtensions = this.generateAdjacentExtensionsToEdge(head);
            extensions.push(...adjacentExtensions);
            
            // If we found adjacent extensions to edge, prioritize them
            if (adjacentExtensions.length > 0) {
                this.log(`Found ${adjacentExtensions.length} adjacent extensions to edge`);
                return extensions;
            }
        }
        
        // Use L/I patterns for normal chain extension
        // Try L-patterns from head
        for (const pattern of this.lPatterns) {
            const newRow = head.row + pattern.dr;
            const newCol = head.col + pattern.dc;
            
            if (this.isValidAndEmptyPosition(newRow, newCol) && !this.isInChain(newRow, newCol)) {
                if (this.isMoveInRequiredDirection(head, { row: newRow, col: newCol }, requiredDirection)) {
                    const value = this.evaluateExtension(head, { row: newRow, col: newCol }, pattern);
                    extensions.push({
                        row: newRow,
                        col: newCol,
                        value: value.score,
                        reason: `L: ${pattern.name} (${value.reason})`,
                        pattern: 'L'
                    });
                }
            }
        }
        
        // Try I-patterns from head
        for (const pattern of this.iPatterns) {
            const newRow = head.row + pattern.dr;
            const newCol = head.col + pattern.dc;
            
            if (this.isValidAndEmptyPosition(newRow, newCol) && !this.isInChain(newRow, newCol)) {
                if (this.isMoveInRequiredDirection(head, { row: newRow, col: newCol }, requiredDirection)) {
                    const value = this.evaluateExtension(head, { row: newRow, col: newCol }, pattern);
                    extensions.push({
                        row: newRow,
                        col: newCol,
                        value: value.score,
                        reason: `I: ${pattern.name} (${value.reason})`,
                        pattern: 'I'
                    });
                }
            }
        }
        
        return extensions;
    }

    isMoveInRequiredDirection(fromPos, toPos, requiredDirection) {
        if (requiredDirection === 'any') return true;
        
        const rowDiff = toPos.row - fromPos.row;
        
        if (requiredDirection === 'up') {
            return rowDiff <= 0;
        } else if (requiredDirection === 'down') {
            return rowDiff >= 0;
        }
        
        return true;
    }

    evaluateExtension(head, targetPos, pattern) {
        let score = 30;
        let reason = "";
        const requiredDirection = this.getRequiredDirection();
        
        const currentMinRow = Math.min(...this.chain.map(p => p.row));
        const currentMaxRow = Math.max(...this.chain.map(p => p.row));
        
        let verticalProgress = 0;
        if (targetPos.row < currentMinRow) {
            verticalProgress = currentMinRow - targetPos.row;
            score += verticalProgress * 40;
            reason += `toward top +${verticalProgress * 40}`;
        } else if (targetPos.row > currentMaxRow) {
            verticalProgress = targetPos.row - currentMaxRow;
            score += verticalProgress * 40;
            reason += `toward bottom +${verticalProgress * 40}`;
        }
        
        if (requiredDirection === 'up' && targetPos.row > head.row) {
            score -= 1000;
            reason += `, WRONG DIRECTION (need up) -1000`;
        } else if (requiredDirection === 'down' && targetPos.row < head.row) {
            score -= 1000;
            reason += `, WRONG DIRECTION (need down) -1000`;
        }
        
        if (requiredDirection === 'up' && targetPos.row < head.row) {
            score += 500;
            reason += `, CORRECT DIRECTION (up) +500`;
        } else if (requiredDirection === 'down' && targetPos.row > head.row) {
            score += 500;
            reason += `, CORRECT DIRECTION (down) +500`;
        }
        
        if (targetPos.row === 0) {
            score += 200;
            reason += `, TOP EDGE +200`;
        } else if (targetPos.row === this.gameCore.size - 1) {
            score += 200;
            reason += `, BOTTOM EDGE +200`;
        }
        
        const distanceToTop = targetPos.row;
        const distanceToBottom = this.gameCore.size - 1 - targetPos.row;
        const minDistanceToEdge = Math.min(distanceToTop, distanceToBottom);
        const edgeBonus = Math.max(30 - minDistanceToEdge * 3, 0);
        score += edgeBonus;
        if (edgeBonus > 0) reason += `, near edge +${edgeBonus}`;
        
        if (pattern.name.includes('up') && (requiredDirection === 'up' || head.row > this.gameCore.size / 2)) {
            score += 25;
            reason += `, up pattern +25`;
        } else if (pattern.name.includes('down') && (requiredDirection === 'down' || head.row < this.gameCore.size / 2)) {
            score += 25;
            reason += `, down pattern +25`;
        }
        
        return { score, reason };
    }

    isInChain(row, col) {
        return this.chain.some(piece => piece.row === row && piece.col === col);
    }

    // ========================= STATUS AND STATS =========================

    getStats() {
        const chainPositions = [...this.chain];
        if (chainPositions.length === 0) {
            return {
                moveCount: this.moveCount,
                chainLength: 0,
                chainHeads: 0,
                progress: 0,
                isComplete: false,
                phase: 'initial'
            };
        }
        
        const minRow = Math.min(...chainPositions.map(p => p.row));
        const maxRow = Math.max(...chainPositions.map(p => p.row));
        const verticalSpan = maxRow - minRow + 1;
        const progress = (verticalSpan / this.gameCore.size) * 100;
        
        const hasTopEdge = this.hasReachedTopEdge();
        const hasBottomEdge = this.hasReachedBottomEdge();
        const isComplete = hasTopEdge && hasBottomEdge;
        
        let phase = 'initial';
        if (this.gapFillingPhase) {
            phase = 'gap-filling';
        } else if (isComplete) {
            phase = 'complete';
        }
        
        return {
            moveCount: this.moveCount,
            chainLength: chainPositions.length,
            chainHeads: this.findChainHeads().length,
            progress: progress,
            isComplete: isComplete && !this.chainHasGaps(),
            minRow: minRow,
            maxRow: maxRow,
            verticalSpan: verticalSpan,
            hasReachedTopArea: this.hasReachedTopArea(),
            hasReachedBottomArea: this.hasReachedBottomArea(),
            hasReachedTopEdge: hasTopEdge,
            hasReachedBottomEdge: hasBottomEdge,
            requiredDirection: this.getRequiredDirection(),
            phase: phase,
            gapFillingPhase: this.gapFillingPhase,
            identifiedGaps: this.identifiedGaps.length,
            filledGaps: this.filledGaps.length
        };
    }

    getChainInfo() {
        return {
            positions: [...this.chain],
            length: this.chain.length
        };
    }

    reset() {
        this.chain = [];
        this.moveCount = 0;
        this.gapFillingPhase = false;
        this.identifiedGaps = [];
        this.filledGaps = [];
        this.log('Chain AI reset');
    }

    // ========================= DEBUGGING =========================

    log(message) {
        if (this.debugMode) {
            console.log(`[CHAIN AI${this.gapFillingPhase ? ' - GAP FILLING' : ''}] ${message}`);
        }
    }

    debugChain() {
        this.log('=== CHAIN DEBUG ===');
        this.log(`Chain length: ${this.chain.length}`);
        this.chain.forEach((piece, i) => {
            this.log(`  ${i + 1}. (${piece.row},${piece.col})`);
        });
        const heads = this.findChainHeads();
        this.log(`Chain heads: ${heads.map(h => `(${h.row},${h.col})`).join(', ')}`);
        const stats = this.getStats();
        this.log(`Progress: ${stats.progress.toFixed(1)}%, Complete: ${stats.isComplete}`);
        this.log(`Required direction: ${stats.requiredDirection}`);
        this.log(`Phase: ${stats.phase}`);
        this.log(`Gap filling: ${this.gapFillingPhase}, Gaps identified: ${this.identifiedGaps.length}`);
        this.log(`Top area reached: ${stats.hasReachedTopArea}, Bottom area reached: ${stats.hasReachedBottomArea}`);
    }
}

// Export for use in other modules
window.SinglePlayerChainAI = SinglePlayerChainAI;