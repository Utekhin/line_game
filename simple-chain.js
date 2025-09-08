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
        
        // L-pattern definitions (strategic order for chain extension)
        this.strategicLPatterns = [
            // Vertical L-patterns (2-row advancement) - HIGHEST PRIORITY
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            // Horizontal L-patterns (1-row advancement) - MEDIUM PRIORITY  
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];
        
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
        return {
            name: "Default AI",
            priorities: {
                gapThreat: 1.0, criticalAttack: 1.0, standardAttack: 1.0, 
                opportunisticAttack: 1.0, borderConnection: 1.0, 
                chainExtension: 1.0, safeGapFilling: 1.0
            },
            randomization: {
                startingPosition: 0.2, moveSelection: 0.1, 
                headSelection: 0.3, lPatternChoice: 0.2
            },
            strategy: {
                attackThreshold: 3500, defensiveReactivity: 1.0,
                independentPlaying: 0.5, riskTaking: 0.5
            },
            startingArea: {
                centerWeight: 0.8, rowRange: [6, 8], colRange: [6, 8], avoidEdges: true
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

        // STEP 6: Fill remaining safe gaps with personality
        const safeGapMove = this.fillPersonalityDrivenSafeGaps();
        if (safeGapMove) {
            this.log(`🔧 SAFE GAP MOVE: ${safeGapMove.reason}`);
            this.logMoveDecision(safeGapMove, 'safe-gap');
            return safeGapMove;
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
        
        if (this.player === 'X') {
            // Apply personality randomization to border connection eagerness
            const borderEagerness = this.priorities.borderConnection;
            if (Math.random() > borderEagerness && this.moveCount < 10) {
                this.log(`🎭 ${this.personalityName}: Delaying border connection (personality preference)`);
                return null;
            }
            
            // Check both top and bottom border connections
            const topBorderMove = this.checkBorderConnection(ourPieces, 'top');
            if (topBorderMove) return topBorderMove;
            
            const bottomBorderMove = this.checkBorderConnection(ourPieces, 'bottom');
            if (bottomBorderMove) return bottomBorderMove;
        }
        
        return null;
    }

    checkBorderConnection(ourPieces, borderType) {
        const targetRow = borderType === 'top' ? 1 : (this.gameCore.size - 2);
        const pieces = ourPieces.filter(p => p.row === targetRow);
        
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

    // ===== STEP 6: Safe Gap Filling (unchanged) =====
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

    // All validation and helper methods (unchanged)
    validateLPatternGaps(fromPos, toRow, toCol) {
        const dr = toRow - fromPos.row;
        const dc = toCol - fromPos.col;
        
        if (!((Math.abs(dr) === 2 && Math.abs(dc) === 1) || 
              (Math.abs(dr) === 1 && Math.abs(dc) === 2))) {
            return false;
        }
        
        let gapCells = [];
        
        if (Math.abs(dr) === 2 && Math.abs(dc) === 1) {
            const midRow = fromPos.row + (dr > 0 ? 1 : -1);
            gapCells = [
                { row: midRow, col: fromPos.col },
                { row: midRow, col: toCol }
            ];
        } else if (Math.abs(dr) === 1 && Math.abs(dc) === 2) {
            const midCol = fromPos.col + (dc > 0 ? 1 : -1);
            gapCells = [
                { row: fromPos.row, col: midCol },
                { row: toRow, col: midCol }
            ];
        }
        
        const opponent = this.getOpponent();
        let navigableGaps = 0;
        
        for (const gap of gapCells) {
            if (!this.gameCore.isValidPosition(gap.row, gap.col)) {
                continue;
            }
            
            const cellContent = this.gameCore.board[gap.row][gap.col];
            
            if (cellContent === '' || cellContent === this.player) {
                navigableGaps++;
            }
        }
        
        return navigableGaps > 0;
    }

    getBorderIPatternGaps(piece, borderType) {
        const gaps = [];
        
        if (this.player === 'X') {
            if (borderType === 'top') {
                gaps.push({ row: 0, col: piece.col - 1 });
                gaps.push({ row: 0, col: piece.col });     
                gaps.push({ row: 0, col: piece.col + 1 });
            } else if (borderType === 'bottom') {
                const borderRow = this.gameCore.size - 1;
                gaps.push({ row: borderRow, col: piece.col - 1 });
                gaps.push({ row: borderRow, col: piece.col });
                gaps.push({ row: borderRow, col: piece.col + 1 });
            }
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
                return 'chain-extension';
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

