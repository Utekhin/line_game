// game-ai-aggressive.js - L-Pattern Dual Gap Strategy AI
// Implements head-based chain extension with dual gap analysis

class AggressiveConnectionGameAI {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.difficulty = 'medium';
        this.aiPlayer = 'O';
        this.humanPlayer = 'X';
        this.debugMode = true;
    }

    // ========================= MAIN AI ENTRY POINT =========================
    
    getBestMove(difficulty = this.difficulty) {
        this.difficulty = difficulty;
        
        this.log(`=== L-PATTERN DUAL GAP AI (${this.aiPlayer}) ===`);
        this.log(`Difficulty: ${difficulty}, Move: ${this.gameCore.moveCount + 1}`);
        
        // Analyze current board state
        const boardAnalysis = this.analyzeBoardState();
        this.log(`Board Analysis: My chains: ${boardAnalysis.myChains.length}, Opponent chains: ${boardAnalysis.opponentChains.length}`);
        
        switch (difficulty) {
            case 'easy':
                return this.getEasyMove(boardAnalysis);
            case 'medium':
                return this.getMediumMove(boardAnalysis);
            case 'hard':
                return this.getHardMove(boardAnalysis);
            default:
                return this.getMediumMove(boardAnalysis);
        }
    }

    // ========================= DIFFICULTY IMPLEMENTATIONS =========================

    getEasyMove(analysis) {
        // 60% L-pattern, 40% random
        if (Math.random() < 0.6) {
            const lPatternMove = this.findBestLPatternExtension(analysis);
            if (lPatternMove) {
                this.log(`Easy: L-pattern move`);
                return lPatternMove;
            }
        }
        
        this.log(`Easy: Random move`);
        return this.getRandomMove();
    }

    getMediumMove(analysis) {
        this.log(`Medium: ONE CHAIN strategy`);
        
        // 1. CRITICAL: Immediate win if chain is complete
        const winMove = this.findChainCompletionWin(analysis);
        if (winMove) {
            this.log(`🏆 CHAIN COMPLETION WIN!`);
            return winMove;
        }

        // 2. CRITICAL: Block opponent's unblockable chains
        const criticalBlock = this.findCriticalChainBlock(analysis);
        if (criticalBlock) {
            this.log(`🛡️ CRITICAL CHAIN BLOCK!`);
            return criticalBlock;
        }

        // 3. SPECIAL CASE: If only one piece, create L-pattern or I-pattern from it
        if (analysis.myPositions.length === 1) {
            const firstExtension = this.createSecondMoveFromFirst(analysis.myPositions[0]);
            if (firstExtension) {
                this.log(`🔥 SECOND MOVE: Create dual-headed chain`);
                return firstExtension;
            }
        }

        // 4. PRIMARY: Extend THE MAIN CHAIN only
        const mainChainExtension = this.extendMainChain(analysis);
        if (mainChainExtension) {
            this.log(`⚡ MAIN CHAIN EXTENSION: ${mainChainExtension.reason}`);
            return mainChainExtension;
        }

        // 5. ONLY IF NO PIECES: Start first piece
        if (analysis.myPositions.length === 0) {
            const firstMove = this.findOptimalFirstMove();
            if (firstMove) {
                this.log(`🚀 FIRST MOVE: ${firstMove.reason}`);
                return firstMove;
            }
        }

        // 6. FALLBACK: Random move
        this.log(`⚠️ FALLBACK: Random move`);
        return this.getRandomMove();
    }

    getHardMove(analysis) {
        // Enhanced with deeper chain analysis
        return this.getMediumMove(analysis);
    }

    // ========================= BOARD STATE ANALYSIS =========================

    analyzeBoardState() {
        const myPositions = this.gameCore.getPlayerPositions(this.aiPlayer);
        const opponentPositions = this.gameCore.getPlayerPositions(this.humanPlayer);
        
        const analysis = {
            myPositions: myPositions,
            opponentPositions: opponentPositions,
            myChains: this.findChains(myPositions, this.aiPlayer),
            opponentChains: this.findChains(opponentPositions, this.humanPlayer),
            myHeads: this.findChainHeads(myPositions, this.aiPlayer),
            opponentHeads: this.findChainHeads(opponentPositions, this.humanPlayer)
        };

        // Analyze chain security
        analysis.mySecureChains = analysis.myChains.filter(chain => this.isChainSecure(chain));
        analysis.opponentSecureChains = analysis.opponentChains.filter(chain => this.isChainSecure(chain));
        
        this.logChainAnalysis(analysis);
        
        return analysis;
    }

    findChains(positions, player) {
        const chains = [];
        const processed = new Set();
        
        for (const pos of positions) {
            const key = `${pos.row}-${pos.col}`;
            if (processed.has(key)) continue;
            
            const chain = this.buildChainFromPosition(pos, positions, processed, player);
            if (chain.positions.length >= 2) {
                chains.push(chain);
            }
        }
        
        return chains;
    }

    buildChainFromPosition(startPos, allPositions, processed, player) {
        const chain = {
            positions: [],
            player: player,
            goalProgress: 0,
            dualGaps: [],
            tripleGaps: [],
            isSecure: false
        };
        
        // Find connected positions using BFS with stricter connection rules
        const queue = [startPos];
        const visited = new Set();
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row}-${current.col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            processed.add(key);
            
            chain.positions.push(current);
            
            // Find connected positions (STRICTER - within ONE chain only)
            const connected = this.findDirectlyConnectedPositions(current, allPositions);
            for (const conn of connected) {
                const connKey = `${conn.row}-${conn.col}`;
                if (!visited.has(connKey)) {
                    queue.push(conn);
                }
            }
        }
        
        // Only return as chain if it has meaningful length
        if (chain.positions.length >= 1) {
            // Analyze chain properties
            chain.goalProgress = this.calculateChainGoalProgress(chain.positions, player);
            chain.dualGaps = this.findDualGaps(chain.positions, player);
            chain.tripleGaps = this.findTripleGaps(chain.positions, player);
            chain.isSecure = this.isChainSecure(chain);
        }
        
        return chain;
    }

    findDirectlyConnectedPositions(pos, allPositions) {
        const connected = [];
        
        // More restrictive connection rules to avoid multiple scattered chains
        for (const other of allPositions) {
            if (pos.row === other.row && pos.col === other.col) continue;
            
            const rowDiff = Math.abs(other.row - pos.row);
            const colDiff = Math.abs(other.col - pos.col);
            
            // Allow only close connections that form coherent chains
            // Direct adjacency (including diagonal)
            if (rowDiff <= 1 && colDiff <= 1) {
                connected.push(other);
            }
            // L-pattern connections
            else if ((rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1)) {
                connected.push(other);
            }
            // I-pattern connections (straight line gaps up to 2 cells)
            else if ((rowDiff === 0 && colDiff === 2) || (colDiff === 0 && rowDiff === 2)) {
                connected.push(other);
            }
            // Diagonal I-pattern
            else if (rowDiff === colDiff && rowDiff === 2) {
                connected.push(other);
            }
        }
        
        return connected;
    }

    findConnectedPositions(pos, allPositions) {
        const connected = [];
        
        // Check all positions within 3 cells (allowing for gaps)
        for (const other of allPositions) {
            if (pos.row === other.row && pos.col === other.col) continue;
            
            const distance = Math.max(
                Math.abs(other.row - pos.row),
                Math.abs(other.col - pos.col)
            );
            
            if (distance <= 3) {
                // Check if there's a valid connection path
                if (this.hasValidConnectionPath(pos, other)) {
                    connected.push(other);
                }
            }
        }
        
        return connected;
    }

    hasValidConnectionPath(pos1, pos2) {
        // Allow direct connections, L-patterns, and gaps up to 2 cells
        const rowDiff = Math.abs(pos2.row - pos1.row);
        const colDiff = Math.abs(pos2.col - pos1.col);
        
        // Direct adjacency (including diagonal)
        if (rowDiff <= 1 && colDiff <= 1) return true;
        
        // L-pattern connections
        if ((rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1)) return true;
        
        // Straight line gaps (up to 2 cells apart)
        if ((rowDiff === 0 && colDiff <= 3) || (colDiff === 0 && rowDiff <= 3)) return true;
        
        // Diagonal gaps (equal row and column differences)
        if (rowDiff === colDiff && rowDiff <= 3) return true;
        
        return false;
    }

    // ========================= HEAD-BASED CHAIN EXTENSION =========================

    findChainHeads(positions, player) {
        const heads = [];
        
        for (const pos of positions) {
            if (this.isChainHead(pos, positions, player)) {
                heads.push({
                    position: pos,
                    goalDirection: this.getGoalDirection(pos, player),
                    priority: this.calculateHeadPriority(pos, player)
                });
            }
        }
        
        // Sort by priority (highest first)
        heads.sort((a, b) => b.priority - a.priority);
        
        return heads;
    }

    isChainHead(pos, allPositions, player) {
        // A head is a position that has advancement potential toward the goal
        const goalDirection = this.getGoalDirection(pos, player);
        
        // Check if there are fewer connections in the goal direction
        const goalConnections = this.countConnectionsInDirection(pos, allPositions, goalDirection);
        const backConnections = this.countConnectionsInDirection(pos, allPositions, {
            dr: -goalDirection.dr,
            dc: -goalDirection.dc
        });
        
        return goalConnections <= backConnections;
    }

    getGoalDirection(pos, player) {
        if (player === 'X') {
            // X needs to connect top to bottom - find closest edge
            const distanceToTop = pos.row;
            const distanceToBottom = this.gameCore.size - 1 - pos.row;
            
            return distanceToTop < distanceToBottom ? 
                { dr: -1, dc: 0 } : // Go up
                { dr: 1, dc: 0 };   // Go down
        } else {
            // O needs to connect left to right - find closest edge
            const distanceToLeft = pos.col;
            const distanceToRight = this.gameCore.size - 1 - pos.col;
            
            return distanceToLeft < distanceToRight ?
                { dr: 0, dc: -1 } : // Go left
                { dr: 0, dc: 1 };   // Go right
        }
    }

    countConnectionsInDirection(pos, allPositions, direction) {
        let count = 0;
        
        // Check positions in the specified direction
        for (let dist = 1; dist <= 3; dist++) {
            const checkRow = pos.row + direction.dr * dist;
            const checkCol = pos.col + direction.dc * dist;
            
            if (allPositions.some(p => p.row === checkRow && p.col === checkCol)) {
                count++;
            }
        }
        
        return count;
    }

    calculateHeadPriority(pos, player) {
        let priority = 0;
        
        // Higher priority for positions closer to goal edges
        if (player === 'X') {
            const distanceToNearestEdge = Math.min(pos.row, this.gameCore.size - 1 - pos.row);
            priority += (this.gameCore.size - distanceToNearestEdge) * 10;
        } else {
            const distanceToNearestEdge = Math.min(pos.col, this.gameCore.size - 1 - pos.col);
            priority += (this.gameCore.size - distanceToNearestEdge) * 10;
        }
        
        // Bonus for central positions (better connectivity)
        const center = Math.floor(this.gameCore.size / 2);
        const distanceFromCenter = Math.abs(pos.row - center) + Math.abs(pos.col - center);
        priority += Math.max(20 - distanceFromCenter * 2, 0);
        
        return priority;
    }

    // ========================= ONE CHAIN STRATEGY =========================

    createSecondMoveFromFirst(firstPiece) {
        this.log(`Creating second move from first piece at (${firstPiece.row}, ${firstPiece.col})`);
        
        const candidates = [];
        
        // L-pattern moves (knight's move)
        const lPatterns = [
            { dr: 1, dc: 2 }, { dr: 1, dc: -2 },
            { dr: -1, dc: 2 }, { dr: -1, dc: -2 },
            { dr: 2, dc: 1 }, { dr: 2, dc: -1 },
            { dr: -2, dc: 1 }, { dr: -2, dc: -1 }
        ];
        
        // I-pattern moves (straight line with gap)
        const iPatterns = [
            { dr: 0, dc: 2 }, { dr: 0, dc: -2 },  // Horizontal
            { dr: 2, dc: 0 }, { dr: -2, dc: 0 },  // Vertical
            { dr: 2, dc: 2 }, { dr: 2, dc: -2 },  // Diagonal
            { dr: -2, dc: 2 }, { dr: -2, dc: -2 }
        ];
        
        // Evaluate L-patterns
        for (const pattern of lPatterns) {
            const newRow = firstPiece.row + pattern.dr;
            const newCol = firstPiece.col + pattern.dc;
            
            if (this.gameCore.isValidMove(newRow, newCol)) {
                const value = this.evaluateSecondMove(firstPiece, { row: newRow, col: newCol }, 'L-pattern');
                candidates.push({
                    row: newRow,
                    col: newCol,
                    value: value.score,
                    reason: `L-pattern: ${value.reason}`,
                    pattern: 'L'
                });
            }
        }
        
        // Evaluate I-patterns  
        for (const pattern of iPatterns) {
            const newRow = firstPiece.row + pattern.dr;
            const newCol = firstPiece.col + pattern.dc;
            
            if (this.gameCore.isValidMove(newRow, newCol)) {
                const value = this.evaluateSecondMove(firstPiece, { row: newRow, col: newCol }, 'I-pattern');
                candidates.push({
                    row: newRow,
                    col: newCol,
                    value: value.score,
                    reason: `I-pattern: ${value.reason}`,
                    pattern: 'I'
                });
            }
        }
        
        if (candidates.length === 0) return null;
        
        // Sort by value and return best
        candidates.sort((a, b) => b.value - a.value);
        
        this.log(`Generated ${candidates.length} second move options:`);
        candidates.slice(0, 3).forEach((move, i) => {
            this.log(`  ${i + 1}. (${move.row},${move.col}) - ${move.reason} (value: ${move.value})`);
        });
        
        return candidates[0];
    }

    evaluateSecondMove(firstPiece, secondPos, patternType) {
        let score = 50; // Base score
        let reason = patternType;
        
        // Goal direction preference
        const goalProgress = this.calculateGoalProgressScore(firstPiece, secondPos, this.aiPlayer);
        score += goalProgress.score;
        if (goalProgress.reason) reason += ` + ${goalProgress.reason}`;
        
        // Central positioning bonus
        const center = Math.floor(this.gameCore.size / 2);
        const avgRow = (firstPiece.row + secondPos.row) / 2;
        const avgCol = (firstPiece.col + secondPos.col) / 2;
        const distanceFromCenter = Math.abs(avgRow - center) + Math.abs(avgCol - center);
        const centralBonus = Math.max(20 - distanceFromCenter * 2, 0);
        score += centralBonus;
        if (centralBonus > 0) reason += ` + Central(${centralBonus})`;
        
        // L-pattern preference (creates dual gap)
        if (patternType === 'L-pattern') {
            score += 30;
            reason += ` + DualGap`;
        }
        
        return { score, reason };
    }

    extendMainChain(analysis) {
        // Find THE main chain (longest/most advanced chain)
        const mainChain = this.findMainChain(analysis);
        if (!mainChain) {
            this.log(`No main chain found to extend`);
            return null;
        }
        
        this.log(`Extending main chain with ${mainChain.positions.length} pieces`);
        
        // Find the heads of this chain
        const chainHeads = this.findChainHeads(mainChain.positions, this.aiPlayer);
        
        if (chainHeads.length === 0) {
            this.log(`No heads found in main chain`);
            return null;
        }
        
        // Generate extensions from the best head
        const bestHead = chainHeads[0]; // Already sorted by priority
        const extensions = this.generateChainExtensions(bestHead, mainChain, analysis);
        
        if (extensions.length === 0) {
            this.log(`No valid extensions from best head`);
            return null;
        }
        
        // Return the best extension
        extensions.sort((a, b) => b.value - a.value);
        return extensions[0];
    }

    findMainChain(analysis) {
        if (analysis.myChains.length === 0) return null;
        
        // For ONE CHAIN strategy, there should ideally be only one chain
        // If multiple chains exist, pick the most advanced one
        let mainChain = analysis.myChains[0];
        
        for (const chain of analysis.myChains) {
            // Prefer chain with better goal progress
            if (chain.goalProgress > mainChain.goalProgress) {
                mainChain = chain;
            }
            // If equal progress, prefer longer chain
            else if (chain.goalProgress === mainChain.goalProgress && 
                     chain.positions.length > mainChain.positions.length) {
                mainChain = chain;
            }
        }
        
        this.log(`Main chain selected: ${mainChain.positions.length} pieces, ${mainChain.goalProgress.toFixed(1)}% progress`);
        return mainChain;
    }

    generateChainExtensions(head, chain, analysis) {
        const extensions = [];
        const goalDirection = head.goalDirection;
        
        // Generate L-pattern extensions from head
        const lPatterns = [
            // Primary goal direction + side step
            { dr: goalDirection.dr, dc: goalDirection.dc + 1 },
            { dr: goalDirection.dr, dc: goalDirection.dc - 1 },
            { dr: goalDirection.dr + 1, dc: goalDirection.dc },
            { dr: goalDirection.dr - 1, dc: goalDirection.dc },
            
            // Double step toward goal
            { dr: goalDirection.dr * 2, dc: goalDirection.dc },
            { dr: goalDirection.dr, dc: goalDirection.dc * 2 },
            
            // Diagonal L-patterns
            { dr: goalDirection.dr + 1, dc: goalDirection.dc + 1 },
            { dr: goalDirection.dr + 1, dc: goalDirection.dc - 1 },
            { dr: goalDirection.dr - 1, dc: goalDirection.dc + 1 },
            { dr: goalDirection.dr - 1, dc: goalDirection.dc - 1 }
        ];
        
        for (const pattern of lPatterns) {
            const newRow = head.position.row + pattern.dr;
            const newCol = head.position.col + pattern.dc;
            
            if (this.gameCore.isValidMove(newRow, newCol)) {
                const value = this.evaluateChainExtension(head, { row: newRow, col: newCol }, chain, analysis);
                
                if (value.score > 0) {
                    extensions.push({
                        row: newRow,
                        col: newCol,
                        value: value.score,
                        reason: value.reason,
                        headPosition: head.position
                    });
                }
            }
        }
        
        return extensions;
    }

    evaluateChainExtension(head, targetPos, chain, analysis) {
        let score = 0;
        let reason = "";
        
        // 1. Goal progress (highest priority)
        const goalProgress = this.calculateGoalProgressScore(head.position, targetPos, this.aiPlayer);
        score += goalProgress.score;
        reason += goalProgress.reason;
        
        // 2. Dual gap creation
        const dualGapValue = this.evaluateDualGapCreation(head.position, targetPos, analysis);
        score += dualGapValue.score;
        if (dualGapValue.reason) reason += ` + ${dualGapValue.reason}`;
        
        // 3. Chain connectivity within same chain
        const connectivity = this.evaluateInternalChainConnectivity(targetPos, chain);
        score += connectivity.score;
        if (connectivity.reason) reason += ` + ${connectivity.reason}`;
        
        // 4. Edge bonus
        const edgeBonus = this.calculateEdgeBonus(targetPos, this.aiPlayer);
        score += edgeBonus.score;
        if (edgeBonus.reason) reason += ` + ${edgeBonus.reason}`;
        
        return { score, reason };
    }

    evaluateInternalChainConnectivity(targetPos, chain) {
        let score = 0;
        let reason = "";
        let connections = 0;
        
        // Count connections to existing pieces in THIS chain only
        for (const chainPos of chain.positions) {
            if (this.hasValidConnectionPath(targetPos, chainPos)) {
                connections++;
                score += 15;
            }
        }
        
        if (connections > 0) {
            reason = `${connections} internal connections`;
            
            // Bonus for bridging gaps within the chain
            if (connections >= 2) {
                score += 20;
                reason += " + Bridge";
            }
        }
        
        return { score, reason };
    }

    findOptimalFirstMove() {
        // Place first piece near center of goal edge
        const center = Math.floor(this.gameCore.size / 2);
        const candidates = [];
        
        if (this.aiPlayer === 'X') {
            // X: Start from top or bottom edge, near center
            const edges = [0, this.gameCore.size - 1];
            for (const row of edges) {
                for (let colOffset = 0; colOffset <= 3; colOffset++) {
                    const cols = colOffset === 0 ? [center] : [center - colOffset, center + colOffset];
                    for (const col of cols) {
                        if (col >= 0 && col < this.gameCore.size && this.gameCore.isValidMove(row, col)) {
                            candidates.push({
                                row: row,
                                col: col,
                                value: 100 - colOffset * 10,
                                reason: `X start at ${row === 0 ? 'top' : 'bottom'} edge`
                            });
                        }
                    }
                }
            }
        } else {
            // O: Start from left or right edge, near center  
            const edges = [0, this.gameCore.size - 1];
            for (const col of edges) {
                for (let rowOffset = 0; rowOffset <= 3; rowOffset++) {
                    const rows = rowOffset === 0 ? [center] : [center - rowOffset, center + rowOffset];
                    for (const row of rows) {
                        if (row >= 0 && row < this.gameCore.size && this.gameCore.isValidMove(row, col)) {
                            candidates.push({
                                row: row,
                                col: col,
                                value: 100 - rowOffset * 10,
                                reason: `O start at ${col === 0 ? 'left' : 'right'} edge`
                            });
                        }
                    }
                }
            }
        }
        
        if (candidates.length === 0) return null;
        
        // Sort by value and return best
        candidates.sort((a, b) => b.value - a.value);
        return candidates[0];
    }

    // ========================= DUAL GAP ANALYSIS =========================

    findDualGaps(positions, player) {
        const dualGaps = [];
        
        // Find all L-pattern formations that create dual gaps
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const pos1 = positions[i];
                const pos2 = positions[j];
                
                const gaps = this.findGapsBetweenPositions(pos1, pos2);
                if (gaps.length === 2) {
                    // This is a dual gap
                    dualGaps.push({
                        position1: pos1,
                        position2: pos2,
                        gapCells: gaps,
                        isBlocked: this.isDualGapBlocked(gaps),
                        priority: this.calculateDualGapPriority(pos1, pos2, player)
                    });
                }
            }
        }
        
        return dualGaps;
    }

    findGapsBetweenPositions(pos1, pos2) {
        const gaps = [];
        
        // Check if this is an L-pattern formation
        const rowDiff = pos2.row - pos1.row;
        const colDiff = pos2.col - pos1.col;
        
        // L-pattern: (1,2) or (2,1) separation
        if ((Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2) ||
            (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1)) {
            
            // Find the two possible connection cells
            if (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2) {
                // Horizontal L
                gaps.push({ row: pos1.row, col: pos1.col + (colDiff > 0 ? 1 : -1) });
                gaps.push({ row: pos2.row, col: pos2.col + (colDiff > 0 ? -1 : 1) });
            } else {
                // Vertical L
                gaps.push({ row: pos1.row + (rowDiff > 0 ? 1 : -1), col: pos1.col });
                gaps.push({ row: pos2.row + (rowDiff > 0 ? -1 : 1), col: pos2.col });
            }
        }
        
        return gaps.filter(gap => 
            this.gameCore.isValidPosition(gap.row, gap.col) &&
            this.gameCore.board[gap.row][gap.col] === ''
        );
    }

    evaluateDualGapCreation(headPos, targetPos, analysis) {
        let score = 0;
        let reason = "";
        
        // Check if this move creates new dual gaps with existing pieces
        for (const pos of analysis.myPositions) {
            if (pos.row === headPos.row && pos.col === headPos.col) continue;
            
            const gaps = this.findGapsBetweenPositions(pos, targetPos);
            if (gaps.length === 2) {
                score += 50;
                reason = `Creates dual gap with (${pos.row},${pos.col})`;
                break;
            }
        }
        
        return { score, reason };
    }

    isDualGapBlocked(gapCells) {
        // A dual gap is blocked if opponent has marked one of the gap cells
        return gapCells.some(gap => this.gameCore.board[gap.row][gap.col] !== '');
    }

    calculateDualGapPriority(pos1, pos2, player) {
        // Higher priority for gaps closer to goal edges
        let priority = 0;
        
        if (player === 'X') {
            const minRow = Math.min(pos1.row, pos2.row);
            const maxRow = Math.max(pos1.row, pos2.row);
            priority += (this.gameCore.size - Math.min(minRow, this.gameCore.size - 1 - maxRow)) * 10;
        } else {
            const minCol = Math.min(pos1.col, pos2.col);
            const maxCol = Math.max(pos1.col, pos2.col);
            priority += (this.gameCore.size - Math.min(minCol, this.gameCore.size - 1 - maxCol)) * 10;
        }
        
        return priority;
    }

    // ========================= CHAIN SECURITY ANALYSIS =========================

    isChainSecure(chain) {
        // A chain is secure if it has enough dual gaps that opponent cannot block them all
        const unblocked = chain.dualGaps.filter(gap => !gap.isBlocked);
        const opponentMovesNeeded = unblocked.length;
        
        // Simple heuristic: if we have more unblocked dual gaps than opponent can handle
        return opponentMovesNeeded > 2; // Opponent can't block more than 2 gaps effectively
    }

    findCriticalChainBlock(analysis) {
        // Find opponent chains that are becoming unblockable
        for (const chain of analysis.opponentChains) {
            if (this.isChainBecomingUnblockable(chain)) {
                // Find the best dual gap to block
                const blockMove = this.findBestDualGapBlock(chain);
                if (blockMove) {
                    return {
                        row: blockMove.row,
                        col: blockMove.col,
                        value: 900,
                        reason: `Block critical ${this.humanPlayer} chain`
                    };
                }
            }
        }
        
        return null;
    }

    isChainBecomingUnblockable(chain) {
        const unblocked = chain.dualGaps.filter(gap => !gap.isBlocked);
        return unblocked.length >= 2; // Multiple unblocked dual gaps
    }

    findBestDualGapBlock(chain) {
        // Find the highest priority dual gap to block
        const unblocked = chain.dualGaps.filter(gap => !gap.isBlocked);
        
        if (unblocked.length === 0) return null;
        
        // Sort by priority and block the most critical gap
        unblocked.sort((a, b) => b.priority - a.priority);
        const gapToBlock = unblocked[0];
        
        // Choose one of the gap cells to block (prefer the one closer to goal)
        const gapCells = gapToBlock.gapCells;
        if (gapCells.length === 0) return null;
        
        // Return the cell that's most strategically important to block
        return gapCells.reduce((best, cell) => {
            const cellPriority = this.calculateBlockingPriority(cell, chain.player);
            const bestPriority = this.calculateBlockingPriority(best, chain.player);
            return cellPriority > bestPriority ? cell : best;
        });
    }

    calculateBlockingPriority(cell, opponentPlayer) {
        let priority = 0;
        
        // Higher priority for cells closer to opponent's goal
        if (opponentPlayer === 'X') {
            const distanceToGoal = Math.min(cell.row, this.gameCore.size - 1 - cell.row);
            priority += (this.gameCore.size - distanceToGoal) * 10;
        } else {
            const distanceToGoal = Math.min(cell.col, this.gameCore.size - 1 - cell.col);
            priority += (this.gameCore.size - distanceToGoal) * 10;
        }
        
        return priority;
    }

    // ========================= GOAL PROGRESS CALCULATION =========================

    calculateGoalProgressScore(fromPos, toPos, player) {
        let score = 0;
        let reason = "";
        
        if (player === 'X') {
            // Vertical progress toward edges
            const fromDistance = Math.min(fromPos.row, this.gameCore.size - 1 - fromPos.row);
            const toDistance = Math.min(toPos.row, this.gameCore.size - 1 - toPos.row);
            
            if (toDistance < fromDistance) {
                score += (fromDistance - toDistance) * 30;
                reason = `Vertical progress (+${(fromDistance - toDistance) * 30})`;
            }
        } else {
            // Horizontal progress toward edges
            const fromDistance = Math.min(fromPos.col, this.gameCore.size - 1 - fromPos.col);
            const toDistance = Math.min(toPos.col, this.gameCore.size - 1 - toPos.col);
            
            if (toDistance < fromDistance) {
                score += (fromDistance - toDistance) * 30;
                reason = `Horizontal progress (+${(fromDistance - toDistance) * 30})`;
            }
        }
        
        return { score, reason };
    }

    calculateChainGoalProgress(positions, player) {
        if (positions.length === 0) return 0;
        
        if (player === 'X') {
            const minRow = Math.min(...positions.map(p => p.row));
            const maxRow = Math.max(...positions.map(p => p.row));
            return ((maxRow - minRow + 1) / this.gameCore.size) * 100;
        } else {
            const minCol = Math.min(...positions.map(p => p.col));
            const maxCol = Math.max(...positions.map(p => p.col));
            return ((maxCol - minCol + 1) / this.gameCore.size) * 100;
        }
    }

    // ========================= UTILITY METHODS =========================

    calculateEdgeBonus(pos, player) {
        let score = 0;
        let reason = "";
        
        if (player === 'X') {
            if (pos.row === 0 || pos.row === this.gameCore.size - 1) {
                score += 100;
                reason = "EDGE REACHED";
            }
        } else {
            if (pos.col === 0 || pos.col === this.gameCore.size - 1) {
                score += 100;
                reason = "EDGE REACHED";
            }
        }
        
        return { score, reason };
    }

    evaluatePatternQuality(pattern) {
        // Prefer true L-patterns over straight lines
        const isLPattern = (Math.abs(pattern.dr) === 1 && Math.abs(pattern.dc) === 2) ||
                          (Math.abs(pattern.dr) === 2 && Math.abs(pattern.dc) === 1);
        
        if (isLPattern) {
            return { score: 20, reason: "True L-pattern" };
        }
        
        return { score: 0, reason: "" };
    }

    evaluateChainConnectivity(pos, analysis) {
        let score = 0;
        let reason = "";
        let connections = 0;
        
        // Count connections to existing chains
        for (const chain of analysis.myChains) {
            for (const chainPos of chain.positions) {
                if (this.hasValidConnectionPath(pos, chainPos)) {
                    connections++;
                    score += 15;
                    break; // One connection per chain is enough
                }
            }
        }
        
        if (connections > 0) {
            reason = `${connections} chain connections`;
        }
        
        return { score, reason };
    }

    findChainCompletionWin(analysis) {
        // Check if any of our chains can be completed for an immediate win
        for (const chain of analysis.myChains) {
            const completionMoves = this.findChainCompletionMoves(chain);
            for (const move of completionMoves) {
                if (this.simulateWin(move.row, move.col, this.aiPlayer)) {
                    return {
                        row: move.row,
                        col: move.col,
                        value: 1000,
                        reason: 'Chain completion win!'
                    };
                }
            }
        }
        
        return null;
    }

    findChainCompletionMoves(chain) {
        const completionMoves = [];
        
        // Find moves that would complete the chain to goal edges
        for (const dualGap of chain.dualGaps) {
            if (!dualGap.isBlocked) {
                completionMoves.push(...dualGap.gapCells);
            }
        }
        
        return completionMoves;
    }

    findDualGapBlock(analysis) {
        // Find opponent dual gaps that need blocking
        for (const chain of analysis.opponentChains) {
            for (const dualGap of chain.dualGaps) {
                if (!dualGap.isBlocked && dualGap.priority > 50) {
                    const blockMove = this.findBestDualGapBlock(chain);
                    if (blockMove) {
                        return {
                            row: blockMove.row,
                            col: blockMove.col,
                            value: 70,
                            reason: `Block ${this.humanPlayer} dual gap`
                        };
                    }
                }
            }
        }
        
        return null;
    }

    findOptimalChainStart(analysis) {
        // Start new chain with L-pattern near goal edges
        const starts = [];
        
        if (this.aiPlayer === 'X') {
            // Start from top or bottom edges
            starts.push(...this.generateEdgeStarts('top'));
            starts.push(...this.generateEdgeStarts('bottom'));
        } else {
            // Start from left or right edges
            starts.push(...this.generateEdgeStarts('left'));
            starts.push(...this.generateEdgeStarts('right'));
        }
        
        if (starts.length === 0) return null;
        
        // Sort by value and return best
        starts.sort((a, b) => b.value - a.value);
        return starts[0];
    }

    generateEdgeStarts(edge) {
        const starts = [];
        const center = Math.floor(this.gameCore.size / 2);
        
        switch (edge) {
            case 'top':
                for (let col = Math.max(0, center - 3); col <= Math.min(this.gameCore.size - 1, center + 3); col++) {
                    if (this.gameCore.isValidMove(0, col)) {
                        starts.push({
                            row: 0,
                            col: col,
                            value: 80 - Math.abs(col - center) * 5,
                            reason: `Top edge L-pattern start`
                        });
                    }
                }
                break;
            case 'bottom':
                for (let col = Math.max(0, center - 3); col <= Math.min(this.gameCore.size - 1, center + 3); col++) {
                    if (this.gameCore.isValidMove(this.gameCore.size - 1, col)) {
                        starts.push({
                            row: this.gameCore.size - 1,
                            col: col,
                            value: 80 - Math.abs(col - center) * 5,
                            reason: `Bottom edge L-pattern start`
                        });
                    }
                }
                break;
            case 'left':
                for (let row = Math.max(0, center - 3); row <= Math.min(this.gameCore.size - 1, center + 3); row++) {
                    if (this.gameCore.isValidMove(row, 0)) {
                        starts.push({
                            row: row,
                            col: 0,
                            value: 80 - Math.abs(row - center) * 5,
                            reason: `Left edge L-pattern start`
                        });
                    }
                }
                break;
            case 'right':
                for (let row = Math.max(0, center - 3); row <= Math.min(this.gameCore.size - 1, center + 3); row++) {
                    if (this.gameCore.isValidMove(row, this.gameCore.size - 1)) {
                        starts.push({
                            row: row,
                            col: this.gameCore.size - 1,
                            value: 80 - Math.abs(row - center) * 5,
                            reason: `Right edge L-pattern start`
                        });
                    }
                }
                break;
        }
        
        return starts;
    }

    simulateWin(row, col, player) {
        // Non-destructive win simulation
        const originalState = this.gameCore.getGameState();
        const originalCurrentPlayer = this.gameCore.currentPlayer;
        
        this.gameCore.currentPlayer = player;
        const result = this.gameCore.makeMove(row, col, player);
        const isWin = result.success && result.gameOver && result.winner === player;
        
        // Restore state
        this.gameCore.loadGameState(originalState);
        this.gameCore.currentPlayer = originalCurrentPlayer;
        
        return isWin;
    }

    getRandomMove() {
        const emptyPositions = this.gameCore.getEmptyPositions();
        if (emptyPositions.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * emptyPositions.length);
        const move = emptyPositions[randomIndex];
        
        return {
            row: move.row,
            col: move.col,
            value: 1,
            reason: 'Random fallback'
        };
    }

    // ========================= DEBUG AND LOGGING =========================

    logChainAnalysis(analysis) {
        this.log(`=== CHAIN ANALYSIS ===`);
        this.log(`My chains: ${analysis.myChains.length}, Heads: ${analysis.myHeads.length}`);
        this.log(`Opponent chains: ${analysis.opponentChains.length}, Heads: ${analysis.opponentHeads.length}`);
        
        analysis.myChains.forEach((chain, i) => {
            this.log(`  My Chain ${i + 1}: ${chain.positions.length} pieces, ${chain.dualGaps.length} dual gaps, Progress: ${chain.goalProgress.toFixed(1)}%`);
        });
        
        analysis.opponentChains.forEach((chain, i) => {
            this.log(`  Opp Chain ${i + 1}: ${chain.positions.length} pieces, ${chain.dualGaps.length} dual gaps, Progress: ${chain.goalProgress.toFixed(1)}%`);
        });
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.log(`Difficulty set to: ${difficulty}`);
    }

    setAiPlayer(player) {
        this.aiPlayer = player;
        this.humanPlayer = player === 'X' ? 'O' : 'X';
        this.log(`AI playing as: ${this.aiPlayer}`);
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[L-PATTERN AI] ${message}`);
        }
    }
}

// Export for use in other modules
window.AggressiveConnectionGameAI = AggressiveConnectionGameAI;