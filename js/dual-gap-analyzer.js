// dual-gap-analyzer.js - Strategic Dual Gap Analysis Module
// Implements the concept of dual gaps and winning before completion

class DualGapAnalyzer {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.cache = new Map();
    }

    // ========================= MAIN ANALYSIS ENTRY POINT =========================
    
    analyzeDualGapThreats(player) {
        console.log(`🎯 === DUAL GAP ANALYSIS FOR ${player} ===`);
        
        const playerPositions = this.gameCore.getPlayerPositions(player);
        const analysis = {
            immediateWins: [],
            dualGapThreats: [],
            securableChains: [],
            blockingFutility: false,
            strategicValue: 0
        };
        
        // 1. Find all potential chain segments
        const chainSegments = this.findChainSegments(playerPositions, player);
        console.log(`Found ${chainSegments.length} chain segments for ${player}`);
        
        // 2. Analyze each segment for dual gap potential
        for (const segment of chainSegments) {
            const dualGaps = this.findDualGapsInSegment(segment, player);
            
            if (dualGaps.length > 0) {
                analysis.dualGapThreats.push(...dualGaps);
                console.log(`Segment has ${dualGaps.length} dual gap threats`);
            }
        }
        
        // 3. Evaluate chain securability
        analysis.securableChains = this.findSecurableChains(chainSegments, player);
        
        // 4. Assess overall strategic position
        analysis.strategicValue = this.calculateStrategicValue(analysis);
        analysis.blockingFutility = this.assessBlockingFutility(analysis);
        
        console.log(`🎯 ${player} Strategic Summary: ${analysis.dualGapThreats.length} dual gaps, ${analysis.securableChains.length} securable chains`);
        console.log(`🎯 === END DUAL GAP ANALYSIS ===`);
        
        return analysis;
    }

    // ========================= CHAIN SEGMENT ANALYSIS =========================
    
    findChainSegments(positions, player) {
        if (positions.length === 0) return [];
        
        const segments = [];
        const processed = new Set();
        
        // Find connected components and project them toward goal
        for (const pos of positions) {
            const posKey = `${pos.row}-${pos.col}`;
            if (processed.has(posKey)) continue;
            
            const segment = this.buildChainSegment(pos, positions, player, processed);
            if (segment.potentialChain.length > 0) {
                segments.push(segment);
            }
        }
        
        return segments;
    }
    
    buildChainSegment(startPos, allPositions, player, processed) {
        const segment = {
            corePositions: [startPos],
            potentialChain: [],
            goalDirection: player === 'X' ? 'vertical' : 'horizontal',
            threatLevel: 0
        };
        
        processed.add(`${startPos.row}-${startPos.col}`);
        
        // Build connected component
        const queue = [startPos];
        while (queue.length > 0) {
            const current = queue.shift();
            
            // Find adjacent pieces
            const adjacent = this.findAdjacentPieces(current, allPositions);
            for (const adjPos of adjacent) {
                const adjKey = `${adjPos.row}-${adjPos.col}`;
                if (!processed.has(adjKey)) {
                    segment.corePositions.push(adjPos);
                    processed.add(adjKey);
                    queue.push(adjPos);
                }
            }
        }
        
        // Project toward goal to find potential chain
        segment.potentialChain = this.projectChainTowardGoal(segment.corePositions, player);
        segment.threatLevel = this.evaluateSegmentThreat(segment);
        
        return segment;
    }
    
    projectChainTowardGoal(corePositions, player) {
        const chain = [...corePositions];
        
        if (player === 'X') {
            // X needs vertical connection - find path from top to bottom
            const minRow = Math.min(...corePositions.map(p => p.row));
            const maxRow = Math.max(...corePositions.map(p => p.row));
            
            // Project upward to edge
            for (let row = minRow - 1; row >= 0; row--) {
                const projectedPos = this.findBestProjectionInRow(row, corePositions);
                if (projectedPos) {
                    chain.unshift(projectedPos);
                }
            }
            
            // Project downward to edge
            for (let row = maxRow + 1; row < this.gameCore.size; row++) {
                const projectedPos = this.findBestProjectionInRow(row, corePositions);
                if (projectedPos) {
                    chain.push(projectedPos);
                }
            }
        } else {
            // O needs horizontal connection - find path from left to right
            const minCol = Math.min(...corePositions.map(p => p.col));
            const maxCol = Math.max(...corePositions.map(p => p.col));
            
            // Project leftward
            for (let col = minCol - 1; col >= 0; col--) {
                const projectedPos = this.findBestProjectionInCol(col, corePositions);
                if (projectedPos) {
                    chain.unshift(projectedPos);
                }
            }
            
            // Project rightward
            for (let col = maxCol + 1; col < this.gameCore.size; col++) {
                const projectedPos = this.findBestProjectionInCol(col, corePositions);
                if (projectedPos) {
                    chain.push(projectedPos);
                }
            }
        }
        
        return chain;
    }
    
    // ========================= DUAL GAP DETECTION =========================
    
    findDualGapsInSegment(segment, player) {
        const dualGaps = [];
        const chain = segment.potentialChain;
        
        // Find gaps in the chain
        const gaps = this.identifyGapsInChain(chain, player);
        console.log(`   Analyzing ${gaps.length} gaps in chain segment`);
        
        // Check all pairs of gaps for dual gap potential
        for (let i = 0; i < gaps.length; i++) {
            for (let j = i + 1; j < gaps.length; j++) {
                const gap1 = gaps[i];
                const gap2 = gaps[j];
                
                const dualGapData = this.evaluateDualGap(gap1, gap2, segment, player);
                
                if (dualGapData.isDualGap) {
                    dualGaps.push({
                        gap1: gap1,
                        gap2: gap2,
                        segment: segment,
                        unblockable: dualGapData.unblockable,
                        movesToSecure: dualGapData.movesToSecure,
                        threatLevel: dualGapData.threatLevel,
                        reason: dualGapData.reason
                    });
                    
                    console.log(`   🎯 DUAL GAP: (${gap1.row},${gap1.col}) & (${gap2.row},${gap2.col}) - ${dualGapData.reason}`);
                }
            }
        }
        
        return dualGaps;
    }
    
    identifyGapsInChain(chain, player) {
        const gaps = [];
        
        for (const pos of chain) {
            // Check if position is empty and strategically important
            if (this.gameCore.board[pos.row][pos.col] === '') {
                const gapValue = this.evaluateGapImportance(pos, chain, player);
                
                if (gapValue > 10) { // Only consider significant gaps
                    gaps.push({
                        row: pos.row,
                        col: pos.col,
                        importance: gapValue,
                        connectsTo: this.findGapConnections(pos, chain)
                    });
                }
            }
        }
        
        return gaps.sort((a, b) => b.importance - a.importance);
    }
    
    evaluateDualGap(gap1, gap2, segment, player) {
        console.log(`     Evaluating dual gap: (${gap1.row},${gap1.col}) + (${gap2.row},${gap2.col})`);
        
        // Calculate distance between gaps
        const gapDistance = Math.max(
            Math.abs(gap1.row - gap2.row),
            Math.abs(gap1.col - gap2.col)
        );
        
        // Basic dual gap criteria:
        // 1. Both gaps advance toward goal
        // 2. Opponent cannot block both in one move
        // 3. Filling either creates new threat or completes connection
        
        let isDualGap = false;
        let unblockable = false;
        let movesToSecure = 2; // Default: need 2 moves to secure both gaps
        let threatLevel = 0;
        let reason = '';
        
        // Rule 1: Distance check - gaps should be far enough apart
        if (gapDistance >= 2) {
            isDualGap = true;
            threatLevel += 30;
            reason += `Distance ${gapDistance} prevents single-move block; `;
            
            // Rule 2: Check if both gaps advance significantly toward goal
            const gap1Advance = this.calculateGoalAdvancement(gap1, segment, player);
            const gap2Advance = this.calculateGoalAdvancement(gap2, segment, player);
            
            if (gap1Advance > 5 && gap2Advance > 5) {
                threatLevel += 40;
                reason += `Both gaps advance toward goal; `;
                
                // Rule 3: Check if securing creates unblockable chain
                if (this.wouldCreateUnblockableChain(gap1, gap2, segment, player)) {
                    unblockable = true;
                    threatLevel += 50;
                    reason += `Creates unblockable chain; `;
                }
            }
            
            // Rule 4: Check opponent's defensive options
            const opponentMoves = this.countOpponentBlockingMoves(gap1, gap2);
            if (opponentMoves < 2) {
                unblockable = true;
                threatLevel += 60;
                reason += `Opponent cannot block both gaps; `;
            }
            
            // Calculate moves to secure
            movesToSecure = Math.min(2, this.calculateMovesToSecure(gap1, gap2, segment));
        }
        
        console.log(`       Result: isDualGap=${isDualGap}, threat=${threatLevel}, reason="${reason}"`);
        
        return {
            isDualGap: isDualGap,
            unblockable: unblockable,
            movesToSecure: movesToSecure,
            threatLevel: threatLevel,
            reason: reason.trim()
        };
    }
    
    // ========================= STRATEGIC EVALUATION =========================
    
    calculateGoalAdvancement(gap, segment, player) {
        let advancement = 0;
        
        if (player === 'X') {
            // X advances toward vertical connection
            const edgeDistance = Math.min(gap.row, this.gameCore.size - 1 - gap.row);
            advancement = Math.max(20 - edgeDistance * 4, 0);
        } else {
            // O advances toward horizontal connection  
            const edgeDistance = Math.min(gap.col, this.gameCore.size - 1 - gap.col);
            advancement = Math.max(20 - edgeDistance * 4, 0);
        }
        
        return advancement;
    }
    
    wouldCreateUnblockableChain(gap1, gap2, segment, player) {
        // Simulate filling both gaps and check if resulting chain has more dual gaps
        const simulatedChain = [...segment.potentialChain];
        
        // Add gap positions to simulation
        simulatedChain.push(gap1, gap2);
        
        // Check if this creates additional dual gap opportunities
        const newGaps = this.identifyGapsInChain(simulatedChain, player);
        const additionalDualGaps = this.countDualGapsInList(newGaps);
        
        return additionalDualGaps > 0;
    }
    
    countOpponentBlockingMoves(gap1, gap2) {
        // Count how many moves opponent needs to block both gaps
        // Simple version: if gaps are distance 2+ apart, opponent needs 2 moves
        const distance = Math.max(
            Math.abs(gap1.row - gap2.row),
            Math.abs(gap1.col - gap2.col)
        );
        
        return distance >= 2 ? 2 : 1;
    }
    
    calculateMovesToSecure(gap1, gap2, segment) {
        // Calculate how many moves this player needs to secure both gaps
        // Consider current player's turn and optimal move order
        return 2; // Simplified: usually need 2 moves to fill both gaps
    }
    
    // ========================= STRATEGIC VALUE CALCULATION =========================
    
    findSecurableChains(chainSegments, player) {
        const securable = [];
        
        for (const segment of chainSegments) {
            const dualGaps = this.findDualGapsInSegment(segment, player);
            
            if (dualGaps.length > 0) {
                const securability = this.evaluateChainSecurability(segment, dualGaps);
                
                if (securability.canSecure) {
                    securable.push({
                        segment: segment,
                        dualGaps: dualGaps,
                        movesToSecure: securability.movesToSecure,
                        confidence: securability.confidence
                    });
                }
            }
        }
        
        return securable.sort((a, b) => a.movesToSecure - b.movesToSecure);
    }
    
    evaluateChainSecurability(segment, dualGaps) {
        let totalMovesToSecure = 0;
        let confidence = 100;
        
        for (const dualGap of dualGaps) {
            totalMovesToSecure += dualGap.movesToSecure;
            
            if (!dualGap.unblockable) {
                confidence -= 20;
            }
        }
        
        return {
            canSecure: confidence > 50,
            movesToSecure: totalMovesToSecure,
            confidence: confidence
        };
    }
    
    calculateStrategicValue(analysis) {
        let value = 0;
        
        // Value dual gap threats highly
        value += analysis.dualGapThreats.length * 100;
        
        // Add threat level values
        for (const threat of analysis.dualGapThreats) {
            value += threat.threatLevel;
            
            if (threat.unblockable) {
                value += 200; // Unblockable threats are extremely valuable
            }
        }
        
        // Value securable chains
        value += analysis.securableChains.length * 150;
        
        return value;
    }
    
    assessBlockingFutility(analysis) {
        // If opponent has multiple unblockable dual gap threats, blocking becomes futile
        const unblockableThreats = analysis.dualGapThreats.filter(t => t.unblockable).length;
        
        return unblockableThreats >= 2;
    }
    
    // ========================= UTILITY METHODS =========================
    
    findAdjacentPieces(centerPos, allPositions) {
        const adjacent = [];
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        
        for (const [dr, dc] of directions) {
            const checkRow = centerPos.row + dr;
            const checkCol = centerPos.col + dc;
            
            const foundPos = allPositions.find(p => 
                p.row === checkRow && p.col === checkCol
            );
            
            if (foundPos) {
                adjacent.push(foundPos);
            }
        }
        
        return adjacent;
    }
    
    findBestProjectionInRow(row, corePositions) {
        // Find best column in this row for projection
        const avgCol = corePositions.reduce((sum, p) => sum + p.col, 0) / corePositions.length;
        const targetCol = Math.round(avgCol);
        
        if (this.gameCore.isValidPosition(row, targetCol)) {
            return { row: row, col: targetCol };
        }
        
        return null;
    }
    
    findBestProjectionInCol(col, corePositions) {
        // Find best row in this column for projection  
        const avgRow = corePositions.reduce((sum, p) => sum + p.row, 0) / corePositions.length;
        const targetRow = Math.round(avgRow);
        
        if (this.gameCore.isValidPosition(targetRow, col)) {
            return { row: targetRow, col: col };
        }
        
        return null;
    }
    
    evaluateGapImportance(gap, chain, player) {
        let importance = 0;
        
        // Base importance for being in chain
        importance += 20;
        
        // Bonus for advancing toward goal
        importance += this.calculateGoalAdvancement(gap, null, player);
        
        // Bonus for connecting existing pieces
        const connectivityBonus = this.calculateConnectivityBonus(gap, chain);
        importance += connectivityBonus;
        
        return importance;
    }
    
    findGapConnections(gap, chain) {
        const connections = [];
        
        for (const pos of chain) {
            if (pos === gap) continue;
            
            const distance = Math.max(
                Math.abs(gap.row - pos.row),
                Math.abs(gap.col - pos.col)
            );
            
            if (distance <= 2) {
                connections.push(pos);
            }
        }
        
        return connections;
    }
    
    calculateConnectivityBonus(gap, chain) {
        let bonus = 0;
        
        const connections = this.findGapConnections(gap, chain);
        bonus += connections.length * 5;
        
        return bonus;
    }
    
    evaluateSegmentThreat(segment) {
        // Simple threat evaluation based on chain length and goal proximity
        const chainLength = segment.potentialChain.length;
        let threat = chainLength * 10;
        
        // Add bonus for being close to goal edges
        // (implementation depends on goal direction)
        
        return threat;
    }
    
    countDualGapsInList(gaps) {
        // Count potential dual gaps in a list of gaps
        let dualGapCount = 0;
        
        for (let i = 0; i < gaps.length; i++) {
            for (let j = i + 1; j < gaps.length; j++) {
                const distance = Math.max(
                    Math.abs(gaps[i].row - gaps[j].row),
                    Math.abs(gaps[i].col - gaps[j].col)
                );
                
                if (distance >= 2) {
                    dualGapCount++;
                }
            }
        }
        
        return dualGapCount;
    }
    
    // ========================= PUBLIC API =========================
    
    getBestDualGapMove(player) {
        const analysis = this.analyzeDualGapThreats(player);
        
        if (analysis.dualGapThreats.length > 0) {
            // Return move to secure most valuable dual gap
            const bestThreat = analysis.dualGapThreats
                .sort((a, b) => b.threatLevel - a.threatLevel)[0];
            
            return {
                row: bestThreat.gap1.row,
                col: bestThreat.gap1.col,
                value: 950 + bestThreat.threatLevel,
                reason: `Secure dual gap: ${bestThreat.reason}`
            };
        }
        
        return null;
    }
    
    getBestBlockingMove(opponentPlayer) {
        const opponentAnalysis = this.analyzeDualGapThreats(opponentPlayer);
        
        if (opponentAnalysis.dualGapThreats.length > 0) {
            // Find most critical opponent dual gap to block
            const mostDangerous = opponentAnalysis.dualGapThreats
                .sort((a, b) => b.threatLevel - a.threatLevel)[0];
            
            // Try to block the more important gap
            const targetGap = mostDangerous.gap1.importance > mostDangerous.gap2.importance 
                ? mostDangerous.gap1 
                : mostDangerous.gap2;
            
            return {
                row: targetGap.row,
                col: targetGap.col,
                value: 940 + mostDangerous.threatLevel,
                reason: `Block opponent dual gap: ${mostDangerous.reason}`
            };
        }
        
        return null;
    }
    
    getStrategicReport(player) {
        const analysis = this.analyzeDualGapThreats(player);
        
        return {
            summary: `${analysis.dualGapThreats.length} dual gap threats, ${analysis.securableChains.length} securable chains`,
            strategicValue: analysis.strategicValue,
            blockingFutility: analysis.blockingFutility,
            recommendation: analysis.blockingFutility ? 'ABANDON_BLOCKING' : 'STRATEGIC_PLAY',
            threats: analysis.dualGapThreats,
            opportunities: analysis.securableChains
        };
    }
}

// Export for use in Enhanced AI
window.DualGapAnalyzer = DualGapAnalyzer;