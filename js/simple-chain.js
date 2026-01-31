// simple-chain.js - UPDATED: Fragment-Aware AI with Early Fragment Detection
// KEEPS: Same filename and class name for compatibility
// ADDS: Fragment awareness, X1 isolation fix, early fragment detection

class SimpleChainAI {
    constructor(gameCore, player, personalityConfig = null) {
        this.gameCore = gameCore;
        this.player = player;
        this.direction = player === 'X' ? 'vertical' : 'horizontal';
        
        // UPDATED: Use the enhanced ChainHeadManager (same name, new functionality)
        this.chainHeadManager = new ChainHeadManager(gameCore, player);
        
        // Personality System Integration
        this.initializePersonality(personalityConfig);
        
        // Gap registry connection (single source of truth)
        this.gapRegistry = null; // Will be set by controller
        
        // Move tracking
        this.moveCount = 0;
        this.lastMoveType = null;
        this.debugMode = true;
        
        // L-pattern definitions - strategic order depends on player direction
        if (this.direction === 'vertical') {
            // X player: prioritize patterns that advance rows (|dr| = 2)
            this.strategicLPatterns = [
                [2, 1], [2, -1], [-2, 1], [-2, -1],  // 2-row advancement - HIGHEST
                [1, 2], [1, -2], [-1, 2], [-1, -2]   // 1-row advancement - MEDIUM
            ];
        } else {
            // O player: prioritize patterns that advance columns (|dc| = 2)
            this.strategicLPatterns = [
                [1, 2], [1, -2], [-1, 2], [-1, -2],  // 2-col advancement - HIGHEST
                [2, 1], [2, -1], [-2, 1], [-2, -1]   // 1-col advancement - MEDIUM
            ];
        }
        
        this.log(`🤖 ${this.personalityName || 'Default'} Fragment-Aware AI initialized for ${player}`);
    }

    // Personality initialization (unchanged)
    initializePersonality(personalityConfig) {
        if (personalityConfig) {
            this.personality = personalityConfig;
            this.personalityName = personalityConfig.name;
            this.personalityId = personalityConfig.id || 'custom';
        } else {
            const defaultPersonalities = window.AI_PERSONALITIES;
            if (defaultPersonalities && defaultPersonalities['defensive_builder']) {
                this.personality = defaultPersonalities['defensive_builder'];
                this.personalityName = 'Defensive Builder';
                this.personalityId = 'defensive_builder';
            } else {
                this.personality = this.createMinimalPersonality();
                this.personalityName = 'Default';
                this.personalityId = 'default';
            }
        }
        
        this.priorities = { ...this.personality.priorities };
        this.randomization = { ...this.personality.randomization };
        this.strategy = { ...this.personality.strategy };
        this.startingArea = { ...this.personality.startingArea };
        
        this.log(`🎭 Personality loaded: ${this.personalityName}`);
    }

    createMinimalPersonality() {
        // More varied default personality for interesting games
        return {
            name: "Balanced Player",
            priorities: {
                gapThreat: 1.0, criticalAttack: 1.0, standardAttack: 1.0,
                opportunisticAttack: 1.0, borderConnection: 1.0,
                chainExtension: 1.2, safeGapFilling: 0.7  // Prioritize extension over gap filling
            },
            randomization: {
                startingPosition: 0.5,  // More variety in starting moves
                moveSelection: 0.3,     // More randomness in equal-priority moves
                headSelection: 0.4,     // Random head selection
                lPatternChoice: 0.4     // Variety in L-pattern directions
            },
            strategy: {
                attackThreshold: 3500, defensiveReactivity: 1.0,
                independentPlaying: 0.5, riskTaking: 0.5
            },
            startingArea: {
                centerWeight: 0.5,       // Lower center preference for variety
                rowRange: [4, 10],       // Much wider starting area
                colRange: [4, 10],
                avoidEdges: true
            }
        };
    }

    // Connect gap registry (called by controller)
    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        this.log(`🔗 Gap Registry connected to ${this.personalityName} AI`);
    }

    reset() {
        this.moveCount = 0;
        this.lastMoveType = null;
        this.chainHeadManager = new ChainHeadManager(this.gameCore, this.player);
        this.gapRegistry = null;

        // Reset head extension tracking for balanced development
        if (this.chainHeadManager.resetExtensionTracking) {
            this.chainHeadManager.resetExtensionTracking();
        }

        this.log(`🔄 ${this.personalityName} AI reset for ${this.player}`);
    }

    // ===== MAIN ENTRY POINT: ENHANCED 6-Step Decision System with Fragment Support =====
    getNextMove() {
        this.moveCount++;
        this.log(`\n=== MOVE ${this.moveCount} (${this.personalityName}) ===`);

        // CRITICAL: Update fragment analysis first (this is the key fix!)
        this.chainHeadManager.updateHeads();

        // Notify gap registry of move start
        if (this.gapRegistry && this.gapRegistry.onBoardChanged) {
            this.gapRegistry.onBoardChanged();
        }

        // STEP 1: Handle gap threats FIRST (highest priority)
        const gapMove = this.handleGapThreats();
        if (gapMove) {
            this.log(`🚨 GAP THREAT MOVE: ${gapMove.reason}`);
            this.logMoveDecision(gapMove, 'gap-threat');
            return gapMove;
        }

        // STEP 2: NEW - Early Fragment Connection (from move 5, not 20!)
        if (this.moveCount >= 5) {
            const fragmentMove = this.checkFragmentConnection();
            if (fragmentMove) {
                this.lastMoveType = 'fragment-connection';
                this.log(`🔗 FRAGMENT CONNECTION: ${fragmentMove.reason}`);
                this.logMoveDecision(fragmentMove, 'fragment-connection');
                return fragmentMove;
            }
        }

        // STEP 3: Aggressive opponent attack with personality
        const attackMove = this.getPersonalityDrivenAttackMove();
        if (attackMove) {
            this.lastMoveType = attackMove.pattern;
            this.log(`⚔️ PERSONALITY ATTACK: ${attackMove.reason}`);
            this.logMoveDecision(attackMove, 'personality-attack');
            return attackMove;
        }

        // STEP 4: Border connection check (enhanced with personality)
        const borderMove = this.checkPersonalityDrivenBorderConnection();
        if (borderMove) {
            this.lastMoveType = 'border-connection';
            this.log(`🎯 BORDER MOVE: ${borderMove.reason}`);
            this.logMoveDecision(borderMove, 'border-connection');
            return borderMove;
        }

        // STEP 5: Fragment-aware chain extension
        const chainMove = this.getFragmentAwareChainExtension();
        if (chainMove) {
            this.lastMoveType = 'chain-extension';
            this.log(`🔗 FRAGMENT-AWARE CHAIN EXTENSION: ${chainMove.reason}`);
            this.logMoveDecision(chainMove, 'chain-extension');
            return chainMove;
        }

        // STEP 5b: Try direct extensions (lateral/diagonal) when L-patterns fail
        const directExtension = this.getDirectExtensionMove();
        if (directExtension) {
            this.lastMoveType = 'direct-extension';
            this.log(`🔗 DIRECT EXTENSION: ${directExtension.reason}`);
            this.logMoveDecision(directExtension, 'direct-extension');
            return directExtension;
        }

        // STEP 6: Strategic new fragment creation (when current fragment is blocked)
        const newFragmentMove = this.createStrategicNewFragment();
        if (newFragmentMove) {
            this.lastMoveType = 'new-fragment';
            this.log(`🌱 NEW FRAGMENT: ${newFragmentMove.reason}`);
            this.logMoveDecision(newFragmentMove, 'new-fragment');
            return newFragmentMove;
        }

        // STEP 7: Fill remaining safe gaps with personality (deprioritized)
        const safeGapMove = this.fillPersonalityDrivenSafeGaps();
        if (safeGapMove) {
            this.log(`🔧 SAFE GAP MOVE: ${safeGapMove.reason}`);
            this.logMoveDecision(safeGapMove, 'safe-gap');
            return safeGapMove;
        }

        // STEP 8: Filler moves - TRUE LAST RESORT only
        const fillerMove = this.getFillerMove();
        if (fillerMove) {
            this.lastMoveType = 'filler';
            this.log(`🧱 FILLER MOVE: ${fillerMove.reason}`);
            this.logMoveDecision(fillerMove, 'filler');
            return fillerMove;
        }

        this.log('⚠️ NO VALID MOVES FOUND');
        return null;
    }

    // ===== STEP 1: Gap Threat Handling (unchanged) =====
    handleGapThreats() {
        if (!this.gapRegistry) {
            this.log('⚠️ No gap registry available for threat detection');
            return null;
        }

        this.log('🔍 Checking gap threats via Gap Registry...');

        const threatenedGaps = this.gapRegistry.getOwnThreatenedGaps();
        
        if (threatenedGaps.length > 0) {
            const urgentThreat = threatenedGaps[0];
            this.lastMoveType = 'threatened-gap';
            
            this.log(`🚨 THREATENED GAP FOUND: ${urgentThreat.patternType} at (${urgentThreat.row},${urgentThreat.col})`);
            
            return {
                row: urgentThreat.row,
                col: urgentThreat.col,
                value: urgentThreat.priority,
                reason: `${this.personalityName}: ${urgentThreat.reason}`,
                pattern: 'threatened-gap'
            };
        }

        this.log('✅ No gap threats found');
        return null;
    }

    // ===== STEP 2: ENHANCED Fragment Connection with Early Detection =====
    checkFragmentConnection() {
        this.log('🔗 Checking fragment connection...');
        
        const fragmentStats = this.chainHeadManager.getStats();
        
        // If we only have one fragment, no connection needed
        if (fragmentStats.fragmentCount <= 1) {
            this.log('✅ Single fragment - no connection needed');
            return null;
        }
        
        this.log(`📊 Found ${fragmentStats.fragmentCount} fragments - seeking connection`);
        
        // Try to get the best connection move using the enhanced chain head manager
        const connectionMove = this.chainHeadManager.getBestFragmentConnectionMove();
        
        if (connectionMove) {
            this.log(`🎯 Fragment connection found: (${connectionMove.row},${connectionMove.col})`);
            return connectionMove;
        }
        
        // If no direct connection possible, develop the best fragment
        this.log(`🔄 No direct fragment connection available - continuing with active fragment development`);
        return null;
    }

    // ===== STEP 3: Attack moves (unchanged) =====
    getPersonalityDrivenAttackMove() {
        if (!this.gapRegistry) {
            this.log('⚠️ No gap registry available for attack detection');
            return null;
        }

        this.log(`⚔️ ${this.personalityName} checking attack opportunities...`);

        const attackableGaps = this.gapRegistry.getOpponentVulnerableGaps();
        
        if (attackableGaps.length > 0) {
            const bestAttack = attackableGaps[0];
            
            const criticalThreshold = 6000 * this.priorities.criticalAttack;
            const standardThreshold = 4000 * this.priorities.standardAttack;
            const opportunisticThreshold = this.strategy.attackThreshold * this.priorities.opportunisticAttack;
            
            if (bestAttack.priority >= criticalThreshold) {
                return this.createPersonalizedAttackMove(bestAttack, 'critical-attack');
            } else if (bestAttack.priority >= standardThreshold) {
                return this.createPersonalizedAttackMove(bestAttack, 'standard-attack');
            } else if (bestAttack.priority >= opportunisticThreshold) {
                const independenceCheck = Math.random();
                if (independenceCheck >= this.strategy.independentPlaying) {
                    return this.createPersonalizedAttackMove(bestAttack, 'opportunistic-attack');
                }
            }
        }
        
        return null;
    }

    createPersonalizedAttackMove(attack, moveType) {
        const personalityMultiplier = this.priorities[moveType.replace('-', '')] || 1.0;
        const finalPriority = attack.priority * personalityMultiplier;
        
        return {
            row: attack.row,
            col: attack.col,
            value: finalPriority,
            reason: `${this.personalityName}: ${attack.reason} (×${personalityMultiplier.toFixed(1)})`,
            pattern: moveType
        };
    }

    // ===== STEP 4: Enhanced Border Connection =====
    checkPersonalityDrivenBorderConnection() {
        const ourPieces = this.gameCore.getPlayerPositions(this.player);
        
        this.log(`🎯 ${this.personalityName} checking border I-patterns for ${ourPieces.length} pieces...`);
        
        // Apply personality randomization to border connection eagerness
        const borderEagerness = this.priorities.borderConnection;
        if (Math.random() > borderEagerness && this.moveCount < 10) {
            this.log(`🎭 ${this.personalityName}: Delaying border connection (personality preference)`);
            return null;
        }

        if (this.player === 'X') {
            // X connects top (row 0) and bottom (row 14)
            const topBorderMove = this.checkBorderConnection(ourPieces, 'top');
            if (topBorderMove) return topBorderMove;

            const bottomBorderMove = this.checkBorderConnection(ourPieces, 'bottom');
            if (bottomBorderMove) return bottomBorderMove;
        } else {
            // O connects left (col 0) and right (col 14)
            const leftBorderMove = this.checkBorderConnection(ourPieces, 'left');
            if (leftBorderMove) return leftBorderMove;

            const rightBorderMove = this.checkBorderConnection(ourPieces, 'right');
            if (rightBorderMove) return rightBorderMove;
        }

        return null;
    }

    checkBorderConnection(ourPieces, borderType) {
        let pieces;

        // Filter pieces based on border type and player direction
        if (borderType === 'top') {
            // X: pieces 1 row from top border
            pieces = ourPieces.filter(p => p.row === 1);
        } else if (borderType === 'bottom') {
            // X: pieces 1 row from bottom border
            pieces = ourPieces.filter(p => p.row === this.gameCore.size - 2);
        } else if (borderType === 'left') {
            // O: pieces 1 col from left border
            pieces = ourPieces.filter(p => p.col === 1);
        } else if (borderType === 'right') {
            // O: pieces 1 col from right border
            pieces = ourPieces.filter(p => p.col === this.gameCore.size - 2);
        } else {
            return null;
        }

        for (const piece of pieces) {
            if (this.hasBorderConnectionForPiece(piece, borderType)) {
                continue; // Already connected
            }

            const gapCells = this.getBorderIPatternGaps(piece, borderType);

            for (const gapCell of gapCells) {
                if (this.gameCore.isValidPosition(gapCell.row, gapCell.col) &&
                    this.gameCore.board[gapCell.row][gapCell.col] === '') {

                    const basePriority = 8000;
                    const personalityPriority = basePriority * this.priorities.borderConnection;

                    this.log(`🎯 BORDER I-pattern: Connect (${piece.row},${piece.col}) to ${borderType.toUpperCase()} via (${gapCell.row},${gapCell.col})`);

                    return {
                        row: gapCell.row,
                        col: gapCell.col,
                        value: personalityPriority,
                        reason: `${this.personalityName}: Border I-pattern to ${borderType.toUpperCase()}`,
                        pattern: 'border-I-complete'
                    };
                }
            }
        }

        return null;
    }

    // ===== STEP 5: Fragment-Aware Chain Extension (KEY ENHANCEMENT) =====
    getFragmentAwareChainExtension() {
        if (this.moveCount === 1) {
            return this.makePersonalityDrivenFirstMove();
        }

        const fragmentStats = this.chainHeadManager.getStats();

        this.log(`🔗 Fragment-aware extension: ${fragmentStats.fragmentCount} fragments, active: ${fragmentStats.activeFragmentId}`);

        // If we have no active fragment, something is wrong
        if (fragmentStats.activeFragmentId === undefined) {
            this.log('⚠️ No active fragment for extension');
            return null;
        }

        const selectedHead = this.chainHeadManager.selectRandomHead();
        if (!selectedHead) {
            this.log('⚠️ No heads available for extension in active fragment');
            return null;
        }

        const headDirection = this.chainHeadManager.getHeadDirection(selectedHead);
        const extensionMove = this.generatePersonalityDrivenLPatternMove(selectedHead, headDirection);

        if (extensionMove) {
            // Apply personality to base priority
            const basePriority = 2200;
            extensionMove.value = basePriority * this.priorities.chainExtension;
            extensionMove.reason = `${this.personalityName}: Fragment ${fragmentStats.activeFragmentId} - ${extensionMove.reason}`;

            this.log(`🔗 Fragment extension: (${extensionMove.row},${extensionMove.col}) ${headDirection} priority=${extensionMove.value.toFixed(0)}`);
            return extensionMove;
        }

        return null;
    }

    // First move logic (unchanged)
    makePersonalityDrivenFirstMove() {
        const config = this.startingArea;
        const size = this.gameCore.size;
        
        this.log(`🎯 ${this.personalityName} making first move with personality preferences`);
        
        const candidates = [];
        
        for (let row = config.rowRange[0]; row <= config.rowRange[1]; row++) {
            for (let col = config.colRange[0]; col <= config.colRange[1]; col++) {
                if (this.gameCore.isValidPosition(row, col) && 
                    this.gameCore.board[row][col] === '' &&
                    this.gameCore.isValidMove(row, col)) {
                    
                    let weight = 1.0;
                    const center = Math.floor(size / 2);
                    const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center);
                    const centerBonus = config.centerWeight * (4 - Math.min(distanceFromCenter, 4)) / 4;
                    weight *= (1 + centerBonus);
                    
                    if (config.avoidEdges) {
                        const edgeDistance = Math.min(row, col, size - 1 - row, size - 1 - col);
                        if (edgeDistance < 2) {
                            weight *= 0.2;
                        } else if (edgeDistance < 3) {
                            weight *= 0.6;
                        }
                    }
                    
                    const randomFactor = 1 + (Math.random() - 0.5) * this.randomization.startingPosition;
                    weight *= randomFactor;
                    
                    candidates.push({ row, col, weight, distanceFromCenter });
                }
            }
        }
        
        if (candidates.length === 0) {
            const center = Math.floor(size / 2);
            return {
                row: center, col: center, value: 100,
                reason: `${this.personalityName} fallback center start`,
                pattern: 'start'
            };
        }
        
        const selectedPosition = this.weightedRandomSelect(candidates);
        
        return {
            row: selectedPosition.row,
            col: selectedPosition.col,
            value: 100,
            reason: `${this.personalityName} first move at (${selectedPosition.row},${selectedPosition.col})`,
            pattern: 'start'
        };
    }

    // L-pattern generation (unchanged)
    generatePersonalityDrivenLPatternMove(head, direction) {
        const directedPatterns = this.strategicLPatterns.filter(([dr, dc]) => {
            switch (direction) {
                case 'up': return dr < 0;
                case 'down': return dr > 0;
                case 'left': return dc < 0;
                case 'right': return dc > 0;
                default: return true;
            }
        });
        
        const randomizationLevel = this.randomization.lPatternChoice;
        
        if (randomizationLevel > 0 && Math.random() < randomizationLevel) {
            this.shuffleArray(directedPatterns);
            this.log(`🎲 ${this.personalityName}: Randomized L-pattern order`);
        }
        
        for (let i = 0; i < directedPatterns.length; i++) {
            const [dr, dc] = directedPatterns[i];
            const targetRow = head.row + dr;
            const targetCol = head.col + dc;
            
            if (this.isValidExtensionMove(targetRow, targetCol) &&
                this.validateLPatternGaps(head, targetRow, targetCol)) {
                
                const baseValue = this.calculateMoveValue(targetRow, targetCol);
                const personalityBonus = this.calculatePersonalityMoveBonus(targetRow, targetCol, dr, dc);
                const finalValue = baseValue + personalityBonus;
                
                return {
                    row: targetRow, col: targetCol,
                    value: finalValue,
                    reason: `L-pattern [${dr},${dc}] from head toward ${direction}`,
                    pattern: 'L-extension'
                };
            }
        }
        
        return null;
    }

    // ===== STEP 5b: Direct Extension (when L-patterns fail) =====
    // ENHANCED: Prioritizes diagonal when adjacency threat detected
    getDirectExtensionMove() {
        const heads = this.chainHeadManager.getHeads();
        if (!heads.nearBorder && !heads.farBorder) return null;

        this.log(`🔗 ${this.personalityName} trying direct extensions...`);

        // Try both heads
        const headsToTry = [heads.nearBorder, heads.farBorder].filter(h => h);

        // Randomize head order based on personality
        if (Math.random() < this.randomization.headSelection) {
            this.shuffleArray(headsToTry);
        }

        // ENHANCED: Check for adjacency threats on heads
        const threatenedHead = this.findThreatenedHead(headsToTry);

        // If a head is threatened, prioritize diagonal escape from that head
        if (threatenedHead) {
            this.log(`🚨 Head at (${threatenedHead.head.row},${threatenedHead.head.col}) has adjacency threat from ${threatenedHead.threatDirection}`);
            const diagonalEscape = this.getDiagonalEscapeMove(threatenedHead);
            if (diagonalEscape) {
                return diagonalEscape;
            }
        }

        // Standard direct extension patterns: adjacent cells (lateral and diagonal)
        const directPatterns = [
            [1, 0], [-1, 0], [0, 1], [0, -1],  // Lateral (priority)
            [1, 1], [1, -1], [-1, 1], [-1, -1] // Diagonal
        ];

        // Filter patterns based on player direction
        const filteredPatterns = directPatterns.filter(([dr, dc]) => {
            if (this.direction === 'vertical') {
                // X: prefer moves that advance rows
                return dr !== 0;
            } else {
                // O: prefer moves that advance columns
                return dc !== 0;
            }
        });

        for (const head of headsToTry) {
            for (const [dr, dc] of filteredPatterns) {
                const targetRow = head.row + dr;
                const targetCol = head.col + dc;

                if (!this.isValidExtensionMove(targetRow, targetCol)) continue;

                // Check diagonal blocking for diagonal moves
                if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
                    if (this.isDiagonalBlocked(head, { row: targetRow, col: targetCol })) {
                        continue;
                    }
                }

                const value = this.calculateMoveValue(targetRow, targetCol) * this.priorities.chainExtension;
                return {
                    row: targetRow,
                    col: targetCol,
                    value: value,
                    reason: `${this.personalityName}: Direct extension [${dr},${dc}] from (${head.row},${head.col})`,
                    pattern: 'direct-extension'
                };
            }
        }

        return null;
    }

    // NEW: Find if any head has adjacency threat (opponent laterally/frontally adjacent)
    findThreatenedHead(heads) {
        const opponent = this.getOpponent();

        for (const head of heads) {
            // Check lateral adjacency (same row, ±1 col)
            for (const dc of [-1, 1]) {
                const checkCol = head.col + dc;
                if (this.gameCore.isValidPosition(head.row, checkCol) &&
                    this.gameCore.board[head.row][checkCol] === opponent) {
                    return {
                        head: head,
                        threatDirection: dc > 0 ? 'right' : 'left',
                        threatType: 'lateral',
                        opponentPos: { row: head.row, col: checkCol }
                    };
                }
            }

            // Check frontal adjacency (same col, ±1 row)
            for (const dr of [-1, 1]) {
                const checkRow = head.row + dr;
                if (this.gameCore.isValidPosition(checkRow, head.col) &&
                    this.gameCore.board[checkRow][head.col] === opponent) {
                    return {
                        head: head,
                        threatDirection: dr > 0 ? 'down' : 'up',
                        threatType: 'frontal',
                        opponentPos: { row: checkRow, col: head.col }
                    };
                }
            }
        }

        return null;
    }

    // NEW: Get diagonal escape move when head is threatened
    getDiagonalEscapeMove(threat) {
        const head = threat.head;
        const opponent = threat.opponentPos;

        this.log(`🔄 Generating diagonal escape from (${head.row},${head.col}) away from ${threat.threatDirection} threat`);

        // Diagonal directions
        const diagonalPatterns = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        // Score each diagonal move
        const candidates = [];

        for (const [dr, dc] of diagonalPatterns) {
            const targetRow = head.row + dr;
            const targetCol = head.col + dc;

            if (!this.isValidExtensionMove(targetRow, targetCol)) continue;

            // Check if diagonal is blocked
            if (this.isDiagonalBlocked(head, { row: targetRow, col: targetCol })) {
                this.log(`🚫 Diagonal (${targetRow},${targetCol}) blocked`);
                continue;
            }

            // Score the diagonal move
            let score = 500;

            // Bonus for moving away from opponent
            const distBefore = Math.abs(head.row - opponent.row) + Math.abs(head.col - opponent.col);
            const distAfter = Math.abs(targetRow - opponent.row) + Math.abs(targetCol - opponent.col);
            if (distAfter > distBefore) {
                score += 200;
            }

            // Bonus for progress toward goal
            if (this.direction === 'vertical') {
                // X: bonus for row progress
                const rowProgress = Math.abs(targetRow - 7); // Distance from center
                score += (7 - Math.min(targetRow, this.gameCore.size - 1 - targetRow)) * 15;
            } else {
                // O: bonus for column progress
                score += (7 - Math.min(targetCol, this.gameCore.size - 1 - targetCol)) * 15;
            }

            // Penalty for edge positions
            const edgeDist = Math.min(targetRow, targetCol,
                this.gameCore.size - 1 - targetRow, this.gameCore.size - 1 - targetCol);
            if (edgeDist < 2) {
                score -= 100;
            }

            candidates.push({
                row: targetRow,
                col: targetCol,
                score: score,
                pattern: [dr, dc]
            });
        }

        if (candidates.length === 0) {
            this.log(`❌ No valid diagonal escapes found`);
            return null;
        }

        // Sort by score and pick best
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];

        this.log(`✅ Best diagonal escape: (${best.row},${best.col}) [${best.pattern}] score=${best.score}`);

        return {
            row: best.row,
            col: best.col,
            value: 2500 * this.priorities.chainExtension, // Higher than regular direct extension
            reason: `${this.personalityName}: Diagonal escape [${best.pattern}] from (${head.row},${head.col}) - ${threat.threatType} threat`,
            pattern: 'diagonal-escape'
        };
    }

    // ===== STEP 6: Strategic New Fragment Creation =====
    createStrategicNewFragment() {
        this.log(`🌱 ${this.personalityName} considering new fragment creation...`);

        const ourPieces = this.gameCore.getPlayerPositions(this.player);
        if (ourPieces.length === 0) return null;

        // Find the extent of our current pieces
        let minPos, maxPos;
        if (this.direction === 'vertical') {
            minPos = Math.min(...ourPieces.map(p => p.row));
            maxPos = Math.max(...ourPieces.map(p => p.row));
        } else {
            minPos = Math.min(...ourPieces.map(p => p.col));
            maxPos = Math.max(...ourPieces.map(p => p.col));
        }

        // Strategic locations: beyond current chain toward borders
        const candidates = [];
        const size = this.gameCore.size;

        if (this.direction === 'vertical') {
            // X: look for positions toward row 0 and row 14
            // Near top border (if we haven't reached it)
            if (minPos > 2) {
                for (let col = 3; col < size - 3; col++) {
                    const row = Math.max(0, minPos - 3);
                    if (this.isValidExtensionMove(row, col)) {
                        candidates.push({ row, col, priority: (size - row) * 10 });
                    }
                }
            }
            // Near bottom border
            if (maxPos < size - 3) {
                for (let col = 3; col < size - 3; col++) {
                    const row = Math.min(size - 1, maxPos + 3);
                    if (this.isValidExtensionMove(row, col)) {
                        candidates.push({ row, col, priority: row * 10 });
                    }
                }
            }
        } else {
            // O: look for positions toward col 0 and col 14
            // Near left border
            if (minPos > 2) {
                for (let row = 3; row < size - 3; row++) {
                    const col = Math.max(0, minPos - 3);
                    if (this.isValidExtensionMove(row, col)) {
                        candidates.push({ row, col, priority: (size - col) * 10 });
                    }
                }
            }
            // Near right border
            if (maxPos < size - 3) {
                for (let row = 3; row < size - 3; row++) {
                    const col = Math.min(size - 1, maxPos + 3);
                    if (this.isValidExtensionMove(row, col)) {
                        candidates.push({ row, col, priority: col * 10 });
                    }
                }
            }
        }

        if (candidates.length === 0) {
            this.log('✅ No strategic fragment locations found');
            return null;
        }

        // Add randomization
        if (Math.random() < this.randomization.moveSelection) {
            this.shuffleArray(candidates);
        } else {
            candidates.sort((a, b) => b.priority - a.priority);
        }

        const selected = candidates[0];
        const value = 1800 * this.priorities.chainExtension;

        this.log(`🌱 Creating new fragment at (${selected.row},${selected.col})`);

        return {
            row: selected.row,
            col: selected.col,
            value: value,
            reason: `${this.personalityName}: Strategic new fragment toward border`,
            pattern: 'new-fragment'
        };
    }

    // ===== STEP 7: Safe Gap Filling (deprioritized) =====
    fillPersonalityDrivenSafeGaps() {
        if (!this.gapRegistry) {
            this.log('⚠️ No gap registry available for safe gap filling');
            return null;
        }

        this.log(`🔧 ${this.personalityName} checking safe gaps...`);

        const safeGaps = this.gapRegistry.getOwnUnthreatenedGaps();
        
        if (safeGaps.length > 0) {
            const selectedGap = this.selectPersonalityDrivenSafeGap(safeGaps);
            this.lastMoveType = 'safe-gap';
            
            const personalityPriority = selectedGap.priority * this.priorities.safeGapFilling;
            
            return {
                row: selectedGap.row,
                col: selectedGap.col,
                value: personalityPriority,
                reason: `${this.personalityName}: ${selectedGap.reason}`,
                pattern: 'safe-gap'
            };
        }

        this.log('✅ No safe gaps available');
        return null;
    }

    selectPersonalityDrivenSafeGap(safeGaps) {
        const randomizationLevel = this.randomization.moveSelection;

        if (randomizationLevel > 0 && Math.random() < randomizationLevel && safeGaps.length > 1) {
            const topCandidates = safeGaps.slice(0, Math.min(3, safeGaps.length));
            const randomIndex = Math.floor(Math.random() * topCandidates.length);
            this.log(`🎲 ${this.personalityName}: Random gap selection from top ${topCandidates.length} candidates`);
            return topCandidates[randomIndex];
        }

        return safeGaps[0];
    }

    // ===== STEP 8: Filler Moves - Block Opponent's Path to Border =====
    getFillerMove() {
        this.log(`🧱 ${this.personalityName} checking filler moves (blocking opponent path)...`);

        const opponent = this.getOpponent();
        const opponentPieces = this.gameCore.getPlayerPositions(opponent);

        this.log(`🧱 Found ${opponentPieces.length} opponent pieces to analyze`);

        if (opponentPieces.length === 0) {
            this.log('✅ No opponent pieces - no filler needed');
            return null;
        }

        const size = this.gameCore.size;
        const fillerCandidates = [];
        // For opponent O (horizontal), target borders are col 0 and col 14
        // For opponent X (vertical), target borders are row 0 and row 14
        const isOpponentHorizontal = opponent === 'O';
        this.log(`🧱 Opponent ${opponent} is ${isOpponentHorizontal ? 'horizontal' : 'vertical'}, target borders: ${isOpponentHorizontal ? 'col 0 and col 14' : 'row 0 and row 14'}`);

        for (const piece of opponentPieces) {
            // Calculate distance to each target border
            let distanceToNearBorder, distanceToFarBorder;

            if (isOpponentHorizontal) {
                distanceToNearBorder = piece.col;           // Distance to col 0
                distanceToFarBorder = size - 1 - piece.col; // Distance to col 14
            } else {
                distanceToNearBorder = piece.row;           // Distance to row 0
                distanceToFarBorder = size - 1 - piece.row; // Distance to row 14
            }

            // Find pieces that are NOT yet at the border (any distance >= 1)
            // Prioritize blocking the side that's closer to completion
            if (distanceToNearBorder >= 1) {
                // Find empty cells between this piece and the near border
                const gapCells = this.findWideGapCells(piece, 'near', isOpponentHorizontal);
                fillerCandidates.push(...gapCells);
            }

            if (distanceToFarBorder >= 1) {
                // Find empty cells between this piece and the far border
                const gapCells = this.findWideGapCells(piece, 'far', isOpponentHorizontal);
                fillerCandidates.push(...gapCells);
            }
        }

        // Remove duplicates and invalid cells
        const uniqueCandidates = this.getUniqueValidCells(fillerCandidates);

        if (uniqueCandidates.length === 0) {
            this.log('✅ No filler candidates found');
            return null;
        }

        // Select a random cell from candidates
        const selectedIndex = Math.floor(Math.random() * uniqueCandidates.length);
        const selected = uniqueCandidates[selectedIndex];

        this.log(`🧱 Found ${uniqueCandidates.length} filler candidates, selected (${selected.row},${selected.col})`);

        return {
            row: selected.row,
            col: selected.col,
            value: 500, // Low priority
            reason: `${this.personalityName}: Filler - blocking ${this.getOpponent()} path to border`,
            pattern: 'filler'
        };
    }

    // Find empty cells in the "wide gap" between piece and border
    // Focuses on cells directly in the opponent's potential path (same row/col and ±1)
    findWideGapCells(piece, borderSide, isHorizontal) {
        const cells = [];
        const size = this.gameCore.size;

        if (isHorizontal) {
            // Opponent is O (horizontal) - check columns toward border
            const targetCol = borderSide === 'near' ? 0 : size - 1;
            const step = borderSide === 'near' ? -1 : 1;

            // Only check cells within 3 columns of the border (most critical blocking area)
            const maxDistance = 3;
            for (let dist = 1; dist <= maxDistance; dist++) {
                const col = targetCol + (borderSide === 'near' ? dist : -dist);
                if (col < 0 || col >= size) continue;

                // Check cells in the same row and adjacent rows (±1, ±2)
                for (let rowOffset = -2; rowOffset <= 2; rowOffset++) {
                    const checkRow = piece.row + rowOffset;
                    if (this.gameCore.isValidPosition(checkRow, col)) {
                        cells.push({ row: checkRow, col: col });
                    }
                }
            }
        } else {
            // Opponent is X (vertical) - check rows toward border
            const targetRow = borderSide === 'near' ? 0 : size - 1;

            // Only check cells within 3 rows of the border (most critical blocking area)
            const maxDistance = 3;
            for (let dist = 1; dist <= maxDistance; dist++) {
                const row = targetRow + (borderSide === 'near' ? dist : -dist);
                if (row < 0 || row >= size) continue;

                // Check cells in the same column and adjacent columns (±1, ±2)
                for (let colOffset = -2; colOffset <= 2; colOffset++) {
                    const checkCol = piece.col + colOffset;
                    if (this.gameCore.isValidPosition(row, checkCol)) {
                        cells.push({ row: row, col: checkCol });
                    }
                }
            }
        }

        return cells;
    }

    // Get unique valid empty cells from candidates
    getUniqueValidCells(candidates) {
        const seen = new Set();
        const unique = [];

        for (const cell of candidates) {
            const key = `${cell.row}-${cell.col}`;
            if (!seen.has(key)) {
                seen.add(key);
                // Check if cell is empty and valid
                if (this.gameCore.isValidPosition(cell.row, cell.col) &&
                    this.gameCore.board[cell.row][cell.col] === '' &&
                    this.gameCore.isValidMove(cell.row, cell.col)) {
                    unique.push(cell);
                }
            }
        }

        return unique;
    }

    // ===== ALL OTHER UTILITY METHODS (unchanged) =====
    
    // Utility methods
    weightedRandomSelect(candidates) {
        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];
        
        const totalWeight = candidates.reduce((sum, c) => sum + Math.max(c.weight, 0.01), 0);
        let random = Math.random() * totalWeight;
        
        for (const candidate of candidates) {
            random -= Math.max(candidate.weight, 0.01);
            if (random <= 0) return candidate;
        }
        
        return candidates[0];
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    calculatePersonalityMoveBonus(row, col, dr, dc) {
        let bonus = 0;
        
        const extensionDistance = Math.abs(dr) + Math.abs(dc);
        if (this.strategy.riskTaking > 0.6 && extensionDistance >= 3) {
            bonus += 50;
        }
        
        if (this.strategy.riskTaking < 0.4) {
            const edgeDistance = Math.min(
                row, col, 
                this.gameCore.size - 1 - row, 
                this.gameCore.size - 1 - col
            );
            if (edgeDistance >= 3) {
                bonus += 30;
            }
        }
        
        return bonus;
    }

    logMoveDecision(move, decisionType) {
        this.log(`📊 Decision Phase: ${this.getPhaseFromMoveType(this.lastMoveType || decisionType)}`);
        this.log(`🎯 Move: (${move.row},${move.col}) | Priority: ${move.value} | Type: ${move.pattern}`);
        this.log(`🎭 Personality Influence: ${this.personalityName}`);
    }

    // All validation and helper methods - ENHANCED with diagonal blocking check
    validateLPatternGaps(fromPos, toRow, toCol) {
        const dr = toRow - fromPos.row;
        const dc = toCol - fromPos.col;

        if (!((Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
              (Math.abs(dr) === 1 && Math.abs(dc) === 2))) {
            return false;
        }

        const toPos = { row: toRow, col: toCol };
        let gap1, gap2;

        // L-pattern has two possible paths through two gap cells
        // Path 1: fromPos → gap1 (lateral) → toPos (diagonal)
        // Path 2: fromPos → gap2 (diagonal) → toPos (lateral)
        if (Math.abs(dr) === 2 && Math.abs(dc) === 1) {
            // Vertical-dominant L: 2 rows, 1 col
            const midRow = fromPos.row + (dr > 0 ? 1 : -1);
            gap1 = { row: midRow, col: fromPos.col };  // Same col as fromPos (lateral from fromPos)
            gap2 = { row: midRow, col: toCol };        // Same col as toPos (lateral to toPos)
        } else {
            // Horizontal-dominant L: 1 row, 2 cols
            const midCol = fromPos.col + (dc > 0 ? 1 : -1);
            gap1 = { row: fromPos.row, col: midCol };  // Same row as fromPos (lateral from fromPos)
            gap2 = { row: toRow, col: midCol };        // Same row as toPos (lateral to toPos)
        }

        // Check if at least one complete path exists
        const path1Valid = this.isLPatternPathValid(fromPos, gap1, toPos, 'path1');
        const path2Valid = this.isLPatternPathValid(fromPos, gap2, toPos, 'path2');

        if (!path1Valid && !path2Valid) {
            this.log(`🚫 L-pattern (${fromPos.row},${fromPos.col})→(${toRow},${toCol}) BLOCKED: no valid path through gaps`);
            return false;
        }

        return true;
    }

    /**
     * Check if a specific L-pattern path is valid (gap cell navigable + diagonal not blocked)
     */
    isLPatternPathValid(fromPos, gapPos, toPos, pathName) {
        // Check if gap cell is valid and navigable
        if (!this.gameCore.isValidPosition(gapPos.row, gapPos.col)) {
            return false;
        }

        const cellContent = this.gameCore.board[gapPos.row][gapPos.col];
        if (cellContent !== '' && cellContent !== this.player) {
            return false; // Gap is occupied by opponent
        }

        // Now check diagonal connections for blocking
        // One connection is lateral (always OK), one is diagonal (needs checking)
        const fromToGap = this.getConnectionType(fromPos, gapPos);
        const gapToTarget = this.getConnectionType(gapPos, toPos);

        // Check diagonal connections against opponent's diagonal locks
        if (fromToGap === 'diagonal' && this.isDiagonalBlocked(fromPos, gapPos)) {
            this.log(`🚫 ${pathName}: diagonal fromPos→gap blocked`);
            return false;
        }

        if (gapToTarget === 'diagonal' && this.isDiagonalBlocked(gapPos, toPos)) {
            this.log(`🚫 ${pathName}: diagonal gap→toPos blocked`);
            return false;
        }

        return true;
    }

    /**
     * Determine if connection between two adjacent cells is lateral or diagonal
     */
    getConnectionType(pos1, pos2) {
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);

        if (dr === 0 || dc === 0) return 'lateral';
        if (dr === 1 && dc === 1) return 'diagonal';
        return 'invalid';
    }

    /**
     * Check if a diagonal connection would be blocked by opponent's established diagonals
     */
    isDiagonalBlocked(from, to) {
        // Need access to diagonal lines manager
        if (!this.gameCore.diagonalLinesManager) {
            return false; // Can't check, assume not blocked
        }

        const opponent = this.getOpponent();
        const opponentConnections = this.gameCore.diagonalLinesManager.getPlayerConnections(opponent);

        if (!opponentConnections || opponentConnections.length === 0) {
            return false;
        }

        // Check if our diagonal would cross any opponent diagonal
        const x1 = from.col, y1 = from.row;
        const x2 = to.col, y2 = to.row;

        for (const oppConn of opponentConnections) {
            const x3 = oppConn.col1, y3 = oppConn.row1;
            const x4 = oppConn.col2, y4 = oppConn.row2;

            // Check if lines share an endpoint (allowed)
            if ((x1 === x3 && y1 === y3) || (x1 === x4 && y1 === y4) ||
                (x2 === x3 && y2 === y3) || (x2 === x4 && y2 === y4)) {
                continue;
            }

            // Parametric line intersection test
            const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
            if (Math.abs(denom) < 0.0001) continue; // Parallel

            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

            if ((t > 0.01 && t < 0.99) && (u > 0.01 && u < 0.99)) {
                this.log(`🚫 Diagonal (${from.row},${from.col})→(${to.row},${to.col}) blocked by ${opponent} diagonal`);
                return true;
            }
        }

        return false;
    }

    getBorderIPatternGaps(piece, borderType) {
        const gaps = [];

        if (borderType === 'top') {
            // X: connect to top border (row 0)
            gaps.push({ row: 0, col: piece.col - 1 });
            gaps.push({ row: 0, col: piece.col });
            gaps.push({ row: 0, col: piece.col + 1 });
        } else if (borderType === 'bottom') {
            // X: connect to bottom border (row 14)
            const borderRow = this.gameCore.size - 1;
            gaps.push({ row: borderRow, col: piece.col - 1 });
            gaps.push({ row: borderRow, col: piece.col });
            gaps.push({ row: borderRow, col: piece.col + 1 });
        } else if (borderType === 'left') {
            // O: connect to left border (col 0)
            gaps.push({ row: piece.row - 1, col: 0 });
            gaps.push({ row: piece.row, col: 0 });
            gaps.push({ row: piece.row + 1, col: 0 });
        } else if (borderType === 'right') {
            // O: connect to right border (col 14)
            const borderCol = this.gameCore.size - 1;
            gaps.push({ row: piece.row - 1, col: borderCol });
            gaps.push({ row: piece.row, col: borderCol });
            gaps.push({ row: piece.row + 1, col: borderCol });
        }

        return gaps.filter(gap => this.gameCore.isValidPosition(gap.row, gap.col));
    }

    hasBorderConnectionForPiece(piece, borderType) {
        const gapCells = this.getBorderIPatternGaps(piece, borderType);
        
        for (const gapCell of gapCells) {
            if (this.gameCore.isValidPosition(gapCell.row, gapCell.col) &&
                this.gameCore.board[gapCell.row][gapCell.col] === this.player) {
                return true;
            }
        }
        
        return false;
    }

    calculateMoveValue(row, col) {
        let value = 100;
        
        if (this.player === 'X') {
            if (row === 0 || row === this.gameCore.size - 1) value += 300;
        } else {
            if (col === 0 || col === this.gameCore.size - 1) value += 300;
        }
        
        const connectivity = this.countAdjacentOurPieces({ row, col });
        value += connectivity * 50;
        
        return value;
    }

    isValidExtensionMove(row, col) {
        return this.gameCore.isValidPosition(row, col) && 
               this.gameCore.board[row][col] === '' &&
               this.gameCore.isValidMove(row, col);
    }

    countAdjacentOurPieces(position) {
        let count = 0;
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        
        for (const [dr, dc] of directions) {
            const checkRow = position.row + dr;
            const checkCol = position.col + dc;
            
            if (this.gameCore.isValidPosition(checkRow, checkCol) &&
                this.gameCore.board[checkRow][checkCol] === this.player) {
                count++;
            }
        }
        
        return count;
    }

    getOpponent() {
        return this.player === 'X' ? 'O' : 'X';
    }

    // ===== ENHANCED STATISTICS WITH FRAGMENT INFO =====
    
    getStats() {
        const fragmentStats = this.chainHeadManager.getStats();
        
        // LIGHTWEIGHT: Don't call expensive gap methods during display updates
        let gapStats = { totalGaps: 0, patterns: 0 };
        if (this.gapRegistry) {
            try {
                const registryStats = this.gapRegistry.getStats();
                gapStats = {
                    totalGaps: registryStats.totalActiveGaps || 0,
                    patterns: registryStats.totalPatterns || 0,
                    aiGaps: registryStats.activeGapsByType?.['X-X'] || 0,
                    humanGaps: registryStats.activeGapsByType?.['O-O'] || 0
                };
            } catch (error) {
                this.log(`⚠️ Error getting gap registry stats: ${error.message}`);
            }
        }
        
        return {
            chainLength: fragmentStats.totalPieces,
            moveCount: this.moveCount,
            direction: this.direction,
            lastMoveType: this.lastMoveType,
            heads: fragmentStats.nearBorderHead && fragmentStats.farBorderHead ? 2 : 
                   (fragmentStats.nearBorderHead || fragmentStats.farBorderHead ? 1 : 0),
            currentPhase: this.getPhaseFromMoveType(this.lastMoveType),
            gaps: gapStats,
            isComplete: false,
            
            // NEW: Fragment information
            fragments: {
                count: fragmentStats.fragmentCount,
                activeId: fragmentStats.activeFragmentId,
                activeSize: fragmentStats.activeFragmentSize,
                isConnected: fragmentStats.isConnected,
                canWin: fragmentStats.canWin
            },
            
            // Personality information
            personality: {
                name: this.personalityName,
                id: this.personalityId,
                attackThreshold: this.strategy.attackThreshold,
                riskTaking: this.strategy.riskTaking,
                independentPlaying: this.strategy.independentPlaying
            }
        };
    }

    getPhaseFromMoveType(moveType) {
        switch (moveType) {
            case 'threatened-gap':
            case 'safe-gap':
                return 'gap-filling';
            case 'critical-attack':
            case 'standard-attack':
            case 'opportunistic-attack':
                return 'attacking';
            case 'fragment-connection':
                return 'fragment-connection';
            case 'chain-extension':
            case 'border-connection':
            case 'direct-extension':
            case 'diagonal-escape':
            case 'L-extension':
                return 'chain-extension';
            case 'new-fragment':
                return 'fragment-creation';
            case 'filler':
                return 'blocking';
            case 'start':
                return 'initialization';
            default:
                return 'thinking';
        }
    }

    // Enhanced debug analysis with fragment info
    debugAnalyzeCurrentState() {
        this.log(`\n🤖 === ${this.personalityName.toUpperCase()} AI STATE ANALYSIS ===`);
        
        // Personality info
        this.log(`🎭 Personality: ${this.personalityName} (${this.personalityId})`);
        
        // Chain analysis with fragments
        const stats = this.getStats();
        this.log(`Chain: ${stats.chainLength} pieces in ${stats.fragments.count} fragments`);
        this.log(`Active fragment: #${stats.fragments.activeId} (${stats.fragments.activeSize} pieces)`);
        this.log(`Connected: ${stats.fragments.isConnected}, Can win: ${stats.fragments.canWin}`);
        
        // Fragment analysis
        if (this.chainHeadManager) {
            this.chainHeadManager.analyzeChainStructure();
        }
        
        // Gap analysis
        if (this.gapRegistry && typeof this.gapRegistry.debugGapDetection === 'function') {
            this.gapRegistry.debugGapDetection();
        }
        
        this.log(`🤖 === END ${this.personalityName.toUpperCase()} AI ANALYSIS ===\n`);
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[${this.player}-${this.personalityId?.toUpperCase() || 'DEFAULT'}] ${message}`);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SimpleChainAI = SimpleChainAI;
    console.log('✅ Fragment-Aware SimpleChainAI exported to window object (SAME FILENAME, NEW FUNCTIONALITY)');
} else {
    console.warn('⚠️ Window object not available - export failed');
}

