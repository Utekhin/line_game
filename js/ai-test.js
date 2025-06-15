// game-ai-test.js - Single Player Chain Building AI for X
// Builds a single chain using L-patterns and I-patterns to connect top and bottom

class SinglePlayerChainAI {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.chain = []; // Array of positions in the chain
        this.moveCount = 0;
        this.debugMode = true;
        
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

    // ========================= MAIN ENTRY POINT =========================
    
    getNextMove() {
        this.moveCount++;
        this.log(`\n=== MOVE ${this.moveCount} ===`);
        
        if (this.chain.length === 0) {
            // First move: start from center area
            return this.makeFirstMove();
        } else if (this.chain.length === 1) {
            // Second move: create L or I pattern from first piece
            return this.makeSecondMove();
        } else {
            // Subsequent moves: extend the chain from heads
            return this.extendChain();
        }
    }

    // ========================= MOVE GENERATION =========================

    makeFirstMove() {
        const center = Math.floor(this.gameCore.size / 2);
        const candidates = [];
        
        // Generate candidates in center area (within 3 cells of center)
        for (let rowOffset = -3; rowOffset <= 3; rowOffset++) {
            for (let colOffset = -3; colOffset <= 3; colOffset++) {
                const row = center + rowOffset;
                const col = center + colOffset;
                
                if (this.gameCore.isValidMove(row, col)) {
                    candidates.push({
                        row: row,
                        col: col,
                        priority: Math.abs(rowOffset) + Math.abs(colOffset) // Prefer center
                    });
                }
            }
        }
        
        if (candidates.length === 0) return null;
        
        // Sort by priority (lower is better - closer to center)
        candidates.sort((a, b) => a.priority - b.priority);
        
        // Add some randomness - pick from top 5 candidates
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
            
            if (this.gameCore.isValidMove(newRow, newCol)) {
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
            
            if (this.gameCore.isValidMove(newRow, newCol)) {
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
        
        // Sort by value and add randomness
        candidates.sort((a, b) => b.value - a.value);
        
        this.log(`Generated ${candidates.length} second move options:`);
        candidates.slice(0, 3).forEach((move, i) => {
            this.log(`  ${i + 1}. (${move.row},${move.col}) - ${move.reason} (value: ${move.value})`);
        });
        
        // Pick from top 3 candidates with randomness
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
        this.log(`Found ${heads.length} chain heads: ${heads.map(h => `(${h.row},${h.col})`).join(', ')}`);
        
        if (heads.length === 0) {
            this.log('No chain heads found - cannot extend');
            return null;
        }
        
        // Randomly choose a head to extend from
        const chosenHead = heads[Math.floor(Math.random() * heads.length)];
        this.log(`Extending from head: (${chosenHead.row},${chosenHead.col})`);
        
        // Generate extension moves from this head
        const extensions = this.generateExtensionsFromHead(chosenHead);
        
        if (extensions.length === 0) {
            this.log('No valid extensions from chosen head');
            // Try other heads
            for (const head of heads) {
                if (head !== chosenHead) {
                    const altExtensions = this.generateExtensionsFromHead(head);
                    if (altExtensions.length > 0) {
                        extensions.push(...altExtensions);
                        break;
                    }
                }
            }
        }
        
        if (extensions.length === 0) {
            this.log('No valid extensions from any head');
            return null;
        }
        
        // Sort by value and pick with randomness
        extensions.sort((a, b) => b.value - a.value);
        
        this.log(`Generated ${extensions.length} extension options:`);
        extensions.slice(0, 3).forEach((move, i) => {
            this.log(`  ${i + 1}. (${move.row},${move.col}) - ${move.reason} (value: ${move.value})`);
        });
        
        // Pick from top candidates with bias towards best moves
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
        // A piece is a head if it has fewer connections or is at the extremes
        const connections = this.countConnections(piece);
        
        // If it has 0 or 1 connections, it's definitely a head
        if (connections <= 1) return true;
        
        // Check if it's at the vertical extremes of the chain (for X player)
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
        
        // L-pattern connection
        if ((rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1)) {
            return true;
        }
        
        // I-pattern connection
        if ((rowDiff === 0 && colDiff === 2) || (rowDiff === 2 && colDiff === 0)) {
            return true;
        }
        
        // Diagonal I-pattern
        if (rowDiff === 2 && colDiff === 2) {
            return true;
        }
        
        // Adjacent connection (backup)
        if (rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0)) {
            return true;
        }
        
        return false;
    }

    // ========================= MOVE EVALUATION =========================

    evaluateSecondMove(firstPiece, targetPos, pattern) {
        let score = 50; // Base score
        let reason = "";
        
        // Vertical progress bonus (X wants to connect top-bottom)
        const verticalSpan = Math.abs(targetPos.row - firstPiece.row);
        score += verticalSpan * 15;
        reason += `vertical span +${verticalSpan * 15}`;
        
        // Pattern preference
        if (pattern.name.includes('up') || pattern.name.includes('down')) {
            score += 20;
            reason += `, vertical pattern +20`;
        }
        
        // L-pattern preference (creates dual extension possibilities)
        if (pattern.dr && pattern.dc && Math.abs(pattern.dr) !== Math.abs(pattern.dc)) {
            score += 10;
            reason += `, L-pattern +10`;
        }
        
        return { score, reason };
    }

    generateExtensionsFromHead(head) {
        const extensions = [];
        
        // Try L-patterns from head
        for (const pattern of this.lPatterns) {
            const newRow = head.row + pattern.dr;
            const newCol = head.col + pattern.dc;
            
            if (this.gameCore.isValidMove(newRow, newCol) && !this.isInChain(newRow, newCol)) {
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
        
        // Try I-patterns from head
        for (const pattern of this.iPatterns) {
            const newRow = head.row + pattern.dr;
            const newCol = head.col + pattern.dc;
            
            if (this.gameCore.isValidMove(newRow, newCol) && !this.isInChain(newRow, newCol)) {
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
        
        return extensions;
    }

    evaluateExtension(head, targetPos, pattern) {
        let score = 30; // Base score
        let reason = "";
        
        // MAJOR: Vertical progress toward edges (primary goal for X)
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
        
        // Edge bonus - huge bonus for reaching edges
        if (targetPos.row === 0) {
            score += 200;
            reason += `, TOP EDGE +200`;
        } else if (targetPos.row === this.gameCore.size - 1) {
            score += 200;
            reason += `, BOTTOM EDGE +200`;
        }
        
        // Distance to edges bonus
        const distanceToTop = targetPos.row;
        const distanceToBottom = this.gameCore.size - 1 - targetPos.row;
        const minDistanceToEdge = Math.min(distanceToTop, distanceToBottom);
        const edgeBonus = Math.max(30 - minDistanceToEdge * 3, 0);
        score += edgeBonus;
        if (edgeBonus > 0) reason += `, near edge +${edgeBonus}`;
        
        // Pattern direction preference
        if (pattern.name.includes('up') && head.row > this.gameCore.size / 2) {
            score += 25;
            reason += `, up from bottom +25`;
        } else if (pattern.name.includes('down') && head.row < this.gameCore.size / 2) {
            score += 25;
            reason += `, down from top +25`;
        }
        
        // Central column preference (better for spanning)
        const center = Math.floor(this.gameCore.size / 2);
        const distanceFromCenterCol = Math.abs(targetPos.col - center);
        const centralBonus = Math.max(15 - distanceFromCenterCol * 2, 0);
        score += centralBonus;
        if (centralBonus > 0) reason += `, central +${centralBonus}`;
        
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
                isComplete: false
            };
        }
        
        const minRow = Math.min(...chainPositions.map(p => p.row));
        const maxRow = Math.max(...chainPositions.map(p => p.row));
        const verticalSpan = maxRow - minRow + 1;
        const progress = (verticalSpan / this.gameCore.size) * 100;
        
        // Check if chain connects top to bottom
        const hasTopEdge = chainPositions.some(p => p.row === 0);
        const hasBottomEdge = chainPositions.some(p => p.row === this.gameCore.size - 1);
        const isComplete = hasTopEdge && hasBottomEdge;
        
        return {
            moveCount: this.moveCount,
            chainLength: chainPositions.length,
            chainHeads: this.findChainHeads().length,
            progress: progress,
            isComplete: isComplete,
            minRow: minRow,
            maxRow: maxRow,
            verticalSpan: verticalSpan
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
        this.log('Chain AI reset');
    }

    // ========================= DEBUGGING =========================

    log(message) {
        if (this.debugMode) {
            console.log(`[CHAIN AI] ${message}`);
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
    }
}

// Export for use in other modules
window.SinglePlayerChainAI = SinglePlayerChainAI;