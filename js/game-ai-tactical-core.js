// game-ai-tactical-core.js - Core Tactical Rules with Strategic Direction Analysis
// Handles distance constraints, advance direction detection, and defensive gap analysis

class AITacticalCore {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.moveHistory = [];
    }

    // ========================= MAIN TACTICAL ANALYSIS =========================

    getTacticalMove(xPositions, oPositions, moveCount) {
        console.log(`🎯 TACTICAL CORE ANALYSIS: ${xPositions.length} X threats, ${oPositions.length} O pieces (Move ${moveCount})`);
        
        // Get all valid candidates following core rules
        const tacticalCandidates = this.generateTacticalCandidates(xPositions, oPositions, moveCount);
        
        if (tacticalCandidates.length === 0) {
            console.log(`⚠️ No tactical candidates found`);
            return null;
        }
        
        console.log(`📋 Generated ${tacticalCandidates.length} tactical candidates`);
        
        // Evaluate each candidate with strategic context
        for (const candidate of tacticalCandidates) {
            candidate.value = this.evaluateStrategicMove(candidate, xPositions, oPositions);
        }
        
        // Sort by strategic value
        tacticalCandidates.sort((a, b) => b.value - a.value);
        
        const bestMove = tacticalCandidates[0];
        console.log(`🏆 Best tactical move: (${bestMove.row},${bestMove.col}) - ${bestMove.reason} (value: ${bestMove.value})`);
        
        return bestMove;
    }

    generateTacticalCandidates(xPositions, oPositions, moveCount) {
        const candidates = [];
        const emptyPositions = this.gameCore.getEmptyPositions();
        
        for (const pos of emptyPositions) {
            // RULE 1: Must be within general threat range (all X pieces)
            if (!this.isWithinGeneralThreatRange(pos, xPositions)) {
                continue;
            }
            
            // RULE 1B: From move 5+, must be within 3 cells of LAST opponent move
            if (moveCount >= 5 && !this.isWithinLastMoveRange(pos, xPositions)) {
                continue;
            }
            
            // Determine move type and validate spacing
            const moveType = this.classifyMoveType(pos, xPositions, oPositions);
            
            if (moveType.valid) {
                candidates.push({
                    row: pos.row,
                    col: pos.col,
                    type: moveType.type,
                    reason: moveType.reason,
                    spacing: moveType.spacing
                });
            }
        }
        
        return candidates;
    }

    // ========================= STRATEGIC DIRECTION ANALYSIS =========================

    evaluateStrategicMove(candidate, xPositions, oPositions) {
        let value = 0;
        
        // Base values by move type
        switch (candidate.type) {
            case 'blocking':
                value = 80;
                break;
            case 'extension':
                value = 60;
                break;
            case 'strategic':
                value = 40;
                break;
        }
        
        // STRATEGIC ENHANCEMENT: Analyze X advance direction
        const advanceAnalysis = this.analyzeXAdvanceDirection(xPositions, oPositions);
        const strategicBonus = this.calculateStrategicBonus(candidate, advanceAnalysis, oPositions);
        value += strategicBonus;
        
        // Spacing bonuses (existing)
        value += this.calculateSpacingBonus(candidate);
        
        // Threat urgency (existing but enhanced)
        if (candidate.type === 'blocking') {
            const threatUrgency = this.calculateEnhancedThreatUrgency(candidate, xPositions, advanceAnalysis);
            value += threatUrgency;
        }
        
        // Chain connectivity (existing)
        if (candidate.type === 'extension') {
            const connectivityBonus = this.calculateConnectivityBonus(candidate, oPositions);
            value += connectivityBonus;
        }
        
        // Central control bonus
        value += this.calculateCentralControlBonus(candidate);
        
        return value;
    }

    analyzeXAdvanceDirection(xPositions, oPositions) {
        if (xPositions.length < 2) {
            return { 
                hasDirection: false, 
                primaryVector: null,
                threatAreas: [],
                advanceStrength: 0
            };
        }
        
        console.log(`🧭 ANALYZING X ADVANCE DIRECTION`);
        
        // Find X advance vectors
        const vectors = this.findXAdvanceVectors(xPositions);
        const primaryVector = this.identifyPrimaryAdvanceVector(vectors);
        
        // Identify threat areas based on advance direction
        const threatAreas = this.identifyThreatAreas(xPositions, primaryVector);
        
        // Check existing O defensive coverage
        const defensiveCoverage = this.analyzeDefensiveCoverage(threatAreas, oPositions);
        
        console.log(`📊 X advance: ${primaryVector ? `(${primaryVector.dr},${primaryVector.dc})` : 'none'}, threat areas: ${threatAreas.length}, coverage: ${defensiveCoverage.coveredAreas}/${defensiveCoverage.totalAreas}`);
        
        return {
            hasDirection: primaryVector !== null,
            primaryVector: primaryVector,
            threatAreas: threatAreas,
            advanceStrength: this.calculateAdvanceStrength(vectors),
            defensiveCoverage: defensiveCoverage,
            uncoveredAreas: defensiveCoverage.uncoveredAreas
        };
    }

    findXAdvanceVectors(xPositions) {
        const vectors = [];
        
        // Find vectors between connected X pieces
        for (let i = 0; i < xPositions.length; i++) {
            for (let j = i + 1; j < xPositions.length; j++) {
                const pos1 = xPositions[i];
                const pos2 = xPositions[j];
                
                const distance = Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
                
                // Only consider close pieces (likely connected)
                if (distance <= 3) {
                    const vector = {
                        dr: pos2.row - pos1.row,
                        dc: pos2.col - pos1.col,
                        from: pos1,
                        to: pos2,
                        strength: 1 / distance // Closer = stronger vector
                    };
                    
                    vectors.push(vector);
                }
            }
        }
        
        return vectors;
    }

    identifyPrimaryAdvanceVector(vectors) {
        if (vectors.length === 0) return null;
        
        // Group similar vectors
        const vectorGroups = {};
        
        for (const vector of vectors) {
            // Normalize direction
            const normalizedDir = this.normalizeDirection(vector.dr, vector.dc);
            const key = `${normalizedDir.dr},${normalizedDir.dc}`;
            
            if (!vectorGroups[key]) {
                vectorGroups[key] = {
                    direction: normalizedDir,
                    vectors: [],
                    totalStrength: 0
                };
            }
            
            vectorGroups[key].vectors.push(vector);
            vectorGroups[key].totalStrength += vector.strength;
        }
        
        // Find strongest direction
        let strongestGroup = null;
        let maxStrength = 0;
        
        for (const group of Object.values(vectorGroups)) {
            if (group.totalStrength > maxStrength) {
                maxStrength = group.totalStrength;
                strongestGroup = group;
            }
        }
        
        return strongestGroup ? strongestGroup.direction : null;
    }

    normalizeDirection(dr, dc) {
        if (dr === 0 && dc === 0) return { dr: 0, dc: 0 };
        
        const gcd = this.gcd(Math.abs(dr), Math.abs(dc));
        return {
            dr: dr / gcd,
            dc: dc / gcd
        };
    }

    gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    identifyThreatAreas(xPositions, primaryVector) {
        if (!primaryVector) return [];
        
        const threatAreas = [];
        
        // For each X piece, project threat areas in advance direction
        for (const xPos of xPositions) {
            // Project 2-3 steps ahead in advance direction
            for (let steps = 1; steps <= 3; steps++) {
                const threatRow = xPos.row + (primaryVector.dr * steps);
                const threatCol = xPos.col + (primaryVector.dc * steps);
                
                if (this.gameCore.isValidPosition(threatRow, threatCol)) {
                    threatAreas.push({
                        row: threatRow,
                        col: threatCol,
                        sourceX: xPos,
                        steps: steps,
                        priority: 4 - steps // Closer threats have higher priority
                    });
                }
            }
            
            // Also project adjacent/flanking positions
            const flankingPositions = this.getFlankingPositions(xPos, primaryVector);
            for (const flankPos of flankingPositions) {
                if (this.gameCore.isValidPosition(flankPos.row, flankPos.col)) {
                    threatAreas.push({
                        row: flankPos.row,
                        col: flankPos.col,
                        sourceX: xPos,
                        steps: 1,
                        priority: 2,
                        type: 'flanking'
                    });
                }
            }
        }
        
        return threatAreas;
    }

    getFlankingPositions(xPos, vector) {
        const flanking = [];
        
        // Get perpendicular directions
        const perp1 = { dr: -vector.dc, dc: vector.dr };
        const perp2 = { dr: vector.dc, dc: -vector.dr };
        
        flanking.push({
            row: xPos.row + perp1.dr,
            col: xPos.col + perp1.dc
        });
        
        flanking.push({
            row: xPos.row + perp2.dr,
            col: xPos.col + perp2.dc
        });
        
        return flanking;
    }

    analyzeDefensiveCoverage(threatAreas, oPositions) {
        let coveredAreas = 0;
        const uncoveredAreas = [];
        
        for (const threatArea of threatAreas) {
            let isCovered = false;
            
            // Check if any O piece covers this threat area
            for (const oPos of oPositions) {
                const distance = Math.abs(threatArea.row - oPos.row) + Math.abs(threatArea.col - oPos.col);
                
                // Consider covered if O piece is adjacent or in same position
                if (distance <= 1) {
                    isCovered = true;
                    break;
                }
            }
            
            if (isCovered) {
                coveredAreas++;
            } else {
                uncoveredAreas.push(threatArea);
            }
        }
        
        return {
            totalAreas: threatAreas.length,
            coveredAreas: coveredAreas,
            uncoveredAreas: uncoveredAreas,
            coverageRatio: threatAreas.length > 0 ? coveredAreas / threatAreas.length : 0
        };
    }

    calculateStrategicBonus(candidate, advanceAnalysis, oPositions) {
        let bonus = 0;
        
        if (!advanceAnalysis.hasDirection) return bonus;
        
        // MAJOR BONUS: Covers uncovered threat areas
        for (const uncoveredArea of advanceAnalysis.uncoveredAreas) {
            const distance = Math.abs(candidate.row - uncoveredArea.row) + Math.abs(candidate.col - uncoveredArea.col);
            
            if (distance <= 1) {
                bonus += uncoveredArea.priority * 25; // High bonus for covering gaps
                console.log(`🎯 Covers uncovered threat area (${uncoveredArea.row},${uncoveredArea.col}): +${uncoveredArea.priority * 25}`);
            }
        }
        
        // PENALTY: Redundant coverage where we already have defense
        const redundancyPenalty = this.calculateRedundancyPenalty(candidate, oPositions);
        bonus -= redundancyPenalty;
        
        // BONUS: Blocking advance direction
        const directionBonus = this.calculateDirectionBlockingBonus(candidate, advanceAnalysis.primaryVector);
        bonus += directionBonus;
        
        return bonus;
    }

    calculateRedundancyPenalty(candidate, oPositions) {
        let penalty = 0;
        
        // Check if this move would be redundant (too close to existing O pieces in same defensive role)
        for (const oPos of oPositions) {
            const distance = Math.abs(candidate.row - oPos.row) + Math.abs(candidate.col - oPos.col);
            
            if (distance <= 2) {
                // Check if they would be defending the same area
                const sameDefensiveRole = this.checkSameDefensiveRole(candidate, oPos);
                if (sameDefensiveRole) {
                    penalty += Math.max(20 - distance * 5, 0);
                    console.log(`⚠️ Redundant with O(${oPos.row},${oPos.col}): -${Math.max(20 - distance * 5, 0)}`);
                }
            }
        }
        
        return penalty;
    }

    checkSameDefensiveRole(pos1, pos2) {
        // Simplified: consider same role if in same row or column
        return pos1.row === pos2.row || pos1.col === pos2.col;
    }

    calculateDirectionBlockingBonus(candidate, primaryVector) {
        if (!primaryVector) return 0;
        
        // Bonus for being positioned to block the advance direction
        // This is a simplified version - could be enhanced
        return 10;
    }

    calculateAdvanceStrength(vectors) {
        return vectors.reduce((sum, v) => sum + v.strength, 0);
    }

    // ========================= DISTANCE CONSTRAINTS =========================

    isWithinGeneralThreatRange(pos, xPositions) {
        if (xPositions.length === 0) return true;
        
        const posRow = pos.row !== undefined ? pos.row : pos.row;
        
        for (const xPos of xPositions) {
            const rowDistance = Math.abs(posRow - xPos.row);
            if (rowDistance <= 3) {
                return true;
            }
        }
        
        return false;
    }

    isWithinLastMoveRange(pos, xPositions) {
        if (xPositions.length === 0) return true;
        
        const lastXMove = this.findLastOpponentMove(xPositions);
        if (!lastXMove) return true;
        
        const posRow = pos.row !== undefined ? pos.row : pos.row;
        const posCol = pos.col !== undefined ? pos.col : pos.col;
        
        const rowDistance = Math.abs(posRow - lastXMove.row);
        const colDistance = Math.abs(posCol - lastXMove.col);
        const maxDistance = Math.max(rowDistance, colDistance);
        
        const withinRange = maxDistance <= 3;
        
        if (!withinRange) {
            console.log(`🚫 Move (${posRow},${posCol}) rejected: >3 cells from last X move (${lastXMove.row},${lastXMove.col})`);
        }
        
        return withinRange;
    }

    // In game-ai-tactical-core.js - Replace the existing findLastOpponentMove method

findLastOpponentMove(xPositions) {
    console.log(`🔍 Finding last X move from ${xPositions.length} X positions`);
    
    // PRIMARY STRATEGY: Use game core history (most reliable)
    if (this.gameCore.gameHistory && this.gameCore.gameHistory.length > 0) {
        console.log(`🔍 Checking game core history (${this.gameCore.gameHistory.length} moves)`);
        
        // Find the most recent X move in game core history
        for (let i = this.gameCore.gameHistory.length - 1; i >= 0; i--) {
            const historyMove = this.gameCore.gameHistory[i];
            
            if (historyMove.player === 'X') {
                // Verify this move still exists on the board
                const matchingPosition = xPositions.find(x => 
                    x.row === historyMove.row && x.col === historyMove.col
                );
                
                if (matchingPosition) {
                    console.log(`✅ Last X move from game core: (${historyMove.row},${historyMove.col}) - Move #${historyMove.moveNumber}`);
                    return { row: historyMove.row, col: historyMove.col };
                } else {
                    console.log(`⚠️ History move (${historyMove.row},${historyMove.col}) not found on current board`);
                }
            }
        }
        
        console.log(`⚠️ No X moves found in game core history`);
    } else {
        console.log(`⚠️ Game core history not available`);
    }
    
    // FALLBACK STRATEGY: Use tactical core history if available
    if (this.moveHistory && this.moveHistory.length > 0) {
        console.log(`🔍 Checking tactical core history (${this.moveHistory.length} moves)`);
        
        for (let i = this.moveHistory.length - 1; i >= 0; i--) {
            const move = this.moveHistory[i];
            
            if (move.player === 'X') {
                const matchingPosition = xPositions.find(x => 
                    x.row === move.position.row && x.col === move.position.col
                );
                
                if (matchingPosition) {
                    console.log(`✅ Last X move from tactical history: (${move.position.row},${move.position.col})`);
                    return { row: move.position.row, col: move.position.col };
                }
            }
        }
    }
    
    // LAST RESORT: Heuristic guess (find most isolated X piece - likely most recent)
    console.log(`⚠️ WARNING: Using isolation heuristic fallback!`);
    
    if (xPositions.length > 0) {
        // Find the X piece with fewest connections (likely most recent)
        const mostIsolated = xPositions.reduce((mostIso, current) => {
            const currentConnections = this.countAdjacentSamePlayer(current, xPositions);
            const mostIsoConnections = this.countAdjacentSamePlayer(mostIso, xPositions);
            
            // Prefer less connected pieces
            if (currentConnections < mostIsoConnections) {
                return current;
            } else if (currentConnections === mostIsoConnections) {
                // If same connections, prefer piece closer to center (more likely recent)
                const center = Math.floor(this.gameCore.size / 2);
                const currentDist = Math.abs(current.row - center) + Math.abs(current.col - center);
                const mostIsoDist = Math.abs(mostIso.row - center) + Math.abs(mostIso.col - center);
                return currentDist < mostIsoDist ? current : mostIso;
            }
            
            return mostIso;
        });
        
        console.log(`⚠️ Estimated last X move (isolation heuristic): (${mostIsolated.row},${mostIsolated.col})`);
        return mostIsolated;
    }
    
    console.log(`❌ Could not determine last X move - no X pieces found!`);
    return null;
}

// Helper method for isolation heuristic
countAdjacentSamePlayer(pos, allPositions) {
    let count = 0;
    const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    
    for (const [dr, dc] of directions) {
        const checkRow = pos.row + dr;
        const checkCol = pos.col + dc;
        
        if (allPositions.some(p => p.row === checkRow && p.col === checkCol)) {
            count++;
        }
    }
    
    return count;
}
    // ========================= MOVE CLASSIFICATION & VALIDATION =========================

    classifyMoveType(pos, xPositions, oPositions) {
        // Check if this is a blocking move
        const blockingInfo = this.analyzeBlockingMove(pos, xPositions);
        if (blockingInfo.isBlocking) {
            return {
                valid: true,
                type: 'blocking',
                reason: `Block X threat: ${blockingInfo.reason}`,
                spacing: blockingInfo.spacing
            };
        }
        
        // Check if this is a chain extension move
        const extensionInfo = this.analyzeChainExtension(pos, oPositions);
        if (extensionInfo.isExtension) {
            if (extensionInfo.validSpacing) {
                return {
                    valid: true,
                    type: 'extension',
                    reason: `Extend O chain: ${extensionInfo.reason}`,
                    spacing: extensionInfo.spacing
                };
            } else {
                return { valid: false, type: 'pattern', reason: 'Invalid spacing' };
            }
        }
        
        return {
            valid: true,
            type: 'strategic',
            reason: 'Strategic positioning within threat range',
            spacing: 'independent'
        };
    }

    analyzeBlockingMove(pos, xPositions) {
        for (const xPos of xPositions) {
            const distance = Math.abs(pos.row - xPos.row) + Math.abs(pos.col - xPos.col);
            const rowDistance = Math.abs(pos.row - xPos.row);
            const colDistance = Math.abs(pos.col - xPos.col);
            
            if (distance === 1) {
                return {
                    isBlocking: true,
                    reason: `Adjacent block of X(${xPos.row},${xPos.col})`,
                    spacing: 'adjacent',
                    targetX: xPos
                };
            }
            
            if (distance === 2) {
                return {
                    isBlocking: true,
                    reason: `One-gap block of X(${xPos.row},${xPos.col})`,
                    spacing: 'one-gap',
                    targetX: xPos
                };
            }
            
            if (rowDistance === 1 && colDistance === 1) {
                return {
                    isBlocking: true,
                    reason: `Diagonal block of X(${xPos.row},${xPos.col})`,
                    spacing: 'diagonal',
                    targetX: xPos
                };
            }
            
            if (colDistance === 0 && rowDistance <= 3) {
                return {
                    isBlocking: true,
                    reason: `Column ${xPos.col} vertical block`,
                    spacing: 'vertical-block',
                    targetX: xPos
                };
            }
        }
        
        return { isBlocking: false };
    }

    analyzeChainExtension(pos, oPositions) {
        if (oPositions.length === 0) {
            return {
                isExtension: true,
                validSpacing: true,
                reason: 'First O piece',
                spacing: 'initial'
            };
        }
        
        for (const oPos of oPositions) {
            const rowDistance = Math.abs(pos.row - oPos.row);
            const colDistance = Math.abs(pos.col - oPos.col);
            const totalDistance = rowDistance + colDistance;
            
            // VALID spacing patterns
            if (rowDistance === 1 && colDistance === 1) {
                return {
                    isExtension: true,
                    validSpacing: true,
                    reason: `Diagonal extension from O(${oPos.row},${oPos.col})`,
                    spacing: 'diagonal'
                };
            }
            
            if ((rowDistance === 0 && colDistance === 2) || (rowDistance === 2 && colDistance === 0)) {
                return {
                    isExtension: true,
                    validSpacing: true,
                    reason: `One-gap extension from O(${oPos.row},${oPos.col})`,
                    spacing: 'one-gap'
                };
            }
            
            if ((rowDistance === 1 && colDistance === 2) || (rowDistance === 2 && colDistance === 1)) {
                return {
                    isExtension: true,
                    validSpacing: true,
                    reason: `Knight extension from O(${oPos.row},${oPos.col})`,
                    spacing: 'knight'
                };
            }
            
            // INVALID: Direct lateral adjacent
            if (totalDistance === 1) {
                return {
                    isExtension: true,
                    validSpacing: false,
                    reason: `Invalid lateral adjacent to O(${oPos.row},${oPos.col})`
                };
            }
        }
        
        return { isExtension: false };
    }

    // ========================= BONUS CALCULATIONS =========================

    calculateSpacingBonus(candidate) {
        switch (candidate.spacing) {
            case 'adjacent': return 20;
            case 'diagonal': return 15;
            case 'one-gap': return 10;
            case 'vertical-block': return 25;
            case 'knight': return 5;
            default: return 0;
        }
    }

    calculateEnhancedThreatUrgency(candidate, xPositions, advanceAnalysis) {
        let urgency = 0;
        
        // Standard urgency calculation
        for (const xPos of xPositions) {
            const distanceToEdge = Math.min(xPos.row, this.gameCore.size - 1 - xPos.row);
            urgency += Math.max(20 - distanceToEdge * 4, 0);
            
            if (Math.abs(candidate.col - xPos.col) === 0) {
                urgency += 15;
            }
        }
        
        // Enhanced: Consider advance direction
        if (advanceAnalysis.hasDirection) {
            urgency += advanceAnalysis.advanceStrength * 10;
        }
        
        return Math.min(urgency, 50);
    }

    calculateConnectivityBonus(candidate, oPositions) {
        let bonus = 0;
        
        let connections = 0;
        for (const oPos of oPositions) {
            const distance = Math.abs(candidate.row - oPos.row) + Math.abs(candidate.col - oPos.col);
            if (distance <= 2) {
                connections++;
            }
        }
        
        bonus += connections * 8;
        
        if (oPositions.length > 0) {
            const leftmost = Math.min(...oPositions.map(p => p.col));
            const rightmost = Math.max(...oPositions.map(p => p.col));
            
            if (candidate.col < leftmost || candidate.col > rightmost) {
                bonus += 12;
            }
        }
        
        return Math.min(bonus, 30);
    }

    calculateCentralControlBonus(candidate) {
        const center = Math.floor(this.gameCore.size / 2);
        const distanceFromCenter = Math.abs(candidate.row - center) + Math.abs(candidate.col - center);
        return Math.max(10 - distanceFromCenter * 2, 0);
    }

    // ========================= UTILITY METHODS =========================

    isValidMove(row, col) {
        return this.gameCore.isValidPosition(row, col) && this.gameCore.board[row][col] === '';
    }

    recordMove(move) {
        this.moveHistory.push({
            position: { row: move.row, col: move.col },
            reason: move.reason || 'Unknown'
        });
    }
}

// Export for use in main AI
window.AITacticalCore = AITacticalCore;