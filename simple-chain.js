// simple-chain.js - FIXED VERSION
// Resolves "heads is not iterable" error + adds threat follow-through
// Properly handles ChainHeadManager API: getHeads() returns object, getActiveHeads() returns array

class SimpleChainAI {
    constructor(gameCore, player, personalityConfig = null) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        this.direction = player === 'X' ? 'vertical' : 'horizontal';
        
        // Chain head management - safe initialization
        try {
            if (typeof ChainHeadManager !== 'undefined') {
                this.chainHeadManager = new ChainHeadManager(gameCore, player);
            } else {
                console.warn('ChainHeadManager not available');
                this.chainHeadManager = null;
            }
        } catch (error) {
            console.warn(`Failed to initialize ChainHeadManager: ${error.message}`);
            this.chainHeadManager = null;
        }
        
        // Personality System Integration
        this.initializePersonality(personalityConfig);
        
        // Gap registry connection
        this.gapRegistry = null;
        
        // Move tracking
        this.moveCount = 0;
        this.lastMoveType = null;
        this.debugMode = true;
        
        // THREAT FOLLOW-THROUGH SYSTEM
        this.threatMemory = new Map();
        this.lastThreatMade = null;
        this.recentOpponentMoves = [];
        
        // L-pattern definitions (strategic order for chain extension)
        this.strategicLPatterns = [
            // Vertical L-patterns (2-row advancement) - HIGHEST PRIORITY
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            // Horizontal L-patterns (1-row advancement) - MEDIUM PRIORITY  
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];
        
        this.log(`🤖 SimpleChainAI initialized for ${player}`);
    }

    // Personality initialization
    initializePersonality(personalityConfig) {
        if (personalityConfig) {
            this.personality = personalityConfig;
            this.personalityName = personalityConfig.name;
            this.personalityId = personalityConfig.id || 'custom';
        } else {
            this.personality = this.createMinimalPersonality();
            this.personalityName = 'Default';
            this.personalityId = 'default';
        }
        
        this.priorities = { ...this.personality.priorities };
        this.randomization = { ...this.personality.randomization };
        this.strategy = { ...this.personality.strategy };
        this.startingArea = { ...this.personality.startingArea };
        
        this.log(`🎭 Personality: ${this.personalityName}`);
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

    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        this.log(`🔗 Gap Registry connected`);
    }

    reset() {
        this.moveCount = 0;
        this.lastMoveType = null;
        
        try {
            if (typeof ChainHeadManager !== 'undefined') {
                this.chainHeadManager = new ChainHeadManager(this.gameCore, this.player);
            }
        } catch (error) {
            this.chainHeadManager = null;
        }
        
        this.gapRegistry = null;
        this.threatMemory.clear();
        this.lastThreatMade = null;
        this.recentOpponentMoves = [];
        
        this.log(`🔄 AI reset`);
    }

    // ===== MAIN ENTRY POINT =====
    getNextMove() {
        this.moveCount++;
        this.log(`\n=== MOVE ${this.moveCount} ===`);
        
        // Clean up old threats
        this.cleanupOldThreats();
        
        // Update chain heads if available
        if (this.chainHeadManager && typeof this.chainHeadManager.updateHeads === 'function') {
            try {
                this.chainHeadManager.updateHeads();
            } catch (error) {
                this.log(`⚠️ Chain head update failed: ${error.message}`);
            }
        }
        
        // Notify gap registry
        if (this.gapRegistry && typeof this.gapRegistry.onBoardChanged === 'function') {
            try {
                this.gapRegistry.onBoardChanged();
            } catch (error) {
                this.log(`⚠️ Gap registry notification failed: ${error.message}`);
            }
        }
        
        // STEP 1: Handle threats (defense + follow-through)
        const gapMove = this.handleGapThreats();
        if (gapMove) {
            this.logMoveDecision(gapMove, 'threat-handling');
            return gapMove;
        }

        // STEP 2: Fragment connection
        if (this.moveCount >= 5) {
            const fragmentMove = this.checkFragmentConnection();
            if (fragmentMove) {
                this.logMoveDecision(fragmentMove, 'fragment-connection');
                return fragmentMove;
            }
        }

        // STEP 3: Attack opponent
        const attackMove = this.getPersonalityDrivenAttackMove();
        if (attackMove) {
            this.logMoveDecision(attackMove, 'attack');
            return attackMove;
        }

        // STEP 4: Border connection - FIXED
        const borderMove = this.checkPersonalityDrivenBorderConnection();
        if (borderMove) {
            this.logMoveDecision(borderMove, 'border-connection');
            return borderMove;
        }

        // STEP 5: Chain extension - FIXED
        const chainMove = this.getFragmentAwareChainExtension();
        if (chainMove) {
            this.logMoveDecision(chainMove, 'chain-extension');
            return chainMove;
        }

        // STEP 6: Fill safe gaps
        const safeGapMove = this.fillPersonalityDrivenSafeGaps();
        if (safeGapMove) {
            this.logMoveDecision(safeGapMove, 'safe-gap');
            return safeGapMove;
        }

        this.log('⚠️ No valid moves found');
        return null;
    }

    // ===== STEP 1: ENHANCED Threat Handling with Follow-Through =====
    handleGapThreats() {
        if (!this.gapRegistry) {
            return null;
        }

        this.log('🔍 Checking threats...');

        // DEFENSE: Check our own threatened gaps first
        try {
            const threatenedGaps = this.gapRegistry.getOwnThreatenedGaps ? 
                this.gapRegistry.getOwnThreatenedGaps(this.player) : [];
            
            if (Array.isArray(threatenedGaps) && threatenedGaps.length > 0) {
                const threat = threatenedGaps[0];
                this.log(`🚨 Defending threat at (${threat.row},${threat.col})`);
                
                return {
                    row: threat.row,
                    col: threat.col,
                    value: threat.priority || 9000,
                    reason: 'Defend threatened gap',
                    pattern: 'defense'
                };
            }
        } catch (error) {
            this.log(`⚠️ Threat check failed: ${error.message}`);
        }

        // ATTACK FOLLOW-THROUGH: Complete pending attacks
        const followThrough = this.checkPendingAttackCompletion();
        if (followThrough) {
            return followThrough;
        }

        return null;
    }

    // NEW: Check and complete pending attacks (CORE FEATURE)
    checkPendingAttackCompletion() {
        // If we made a threat 2 moves ago, check if opponent responded
        if (this.lastThreatMade && 
            this.moveCount - this.lastThreatMade.moveNumber === 2) {
            
            const threat = this.lastThreatMade;
            
            // Check if opponent filled any of the gap cells
            const opponentResponded = this.checkIfOpponentRespondedToThreat(threat);
            
            if (!opponentResponded) {
                // COMPLETE THE CUT! Fill all remaining gap cells
                const cutMove = this.completeThreatCut(threat);
                if (cutMove) {
                    this.log(`⚔️ COMPLETING ATTACK: Cutting opponent's chain at (${cutMove.row},${cutMove.col})`);
                    this.lastThreatMade = null; // Clear threat after completion
                    return cutMove;
                }
            } else {
                this.log(`ℹ️ Opponent defended threat at (${threat.targetRow},${threat.targetCol})`);
                this.lastThreatMade = null; // Clear defended threat
            }
        }
        
        return null;
    }

    // NEW: Complete threat by filling remaining gap cells
    completeThreatCut(threat) {
        const gapCells = threat.gapCells || [];
        
        // Find an unfilled gap cell (not the one we already threatened)
        for (const cell of gapCells) {
            // Skip the cell we already threatened
            if (cell.row === threat.targetRow && cell.col === threat.targetCol) {
                continue;
            }
            
            // Check if this cell is still empty
            if (this.isValidMove(cell.row, cell.col)) {
                return {
                    row: cell.row,
                    col: cell.col,
                    value: 8500,
                    reason: `⚔️ COMPLETE CUT: Severing ${threat.patternType} chain`,
                    pattern: 'attack-completion',
                    completingThreat: true
                };
            }
        }
        
        return null;
    }

    // NEW: Check if opponent responded to our threat
    checkIfOpponentRespondedToThreat(threat) {
        // Check if opponent filled any of the gap cells
        for (const cell of threat.gapCells || []) {
            const currentPiece = this.gameCore.board[cell.row][cell.col];
            if (currentPiece === this.opponent) {
                return true; // Opponent responded
            }
        }
        return false; // Opponent ignored the threat
    }

    // ===== STEP 2: Fragment Connection =====
    checkFragmentConnection() {
        if (!this.chainHeadManager || !this.chainHeadManager.getStats) {
            return null;
        }
        
        try {
            const stats = this.chainHeadManager.getStats();
            if (stats.fragmentCount <= 1) {
                return null;
            }
            
            if (this.chainHeadManager.findBestFragmentConnection) {
                const move = this.chainHeadManager.findBestFragmentConnection();
                if (move) {
                    return {
                        row: move.row,
                        col: move.col,
                        value: 6500,
                        reason: 'Connect fragments',
                        pattern: 'fragment-connection'
                    };
                }
            }
        } catch (error) {
            this.log(`⚠️ Fragment connection failed: ${error.message}`);
        }
        
        return null;
    }

    // ===== STEP 3: ENHANCED Attack Move with Threat Recording =====
    getPersonalityDrivenAttackMove() {
        if (!this.gapRegistry) {
            return null;
        }
        
        const attackThreshold = this.strategy.attackThreshold || 5000;
        
        if (Math.random() < (this.priorities.standardAttack || 0.3)) {
            try {
                const opponentGaps = this.gapRegistry.getOpponentVulnerableGaps ? 
                    this.gapRegistry.getOpponentVulnerableGaps(this.opponent) : [];
                
                if (Array.isArray(opponentGaps) && opponentGaps.length > 0) {
                    const gap = opponentGaps[0];
                    
                    // RECORD THREAT for follow-through
                    this.recordThreatMade(gap);
                    
                    return {
                        row: gap.row,
                        col: gap.col,
                        value: attackThreshold + (gap.priority || 0),
                        reason: 'Threaten opponent gap',
                        pattern: 'attack'
                    };
                }
            } catch (error) {
                this.log(`⚠️ Attack move failed: ${error.message}`);
            }
        }
        
        return null;
    }

    // NEW: Record threats for follow-through tracking
    recordThreatMade(gap) {
        const gapCells = this.getGapCells(gap);
        
        this.lastThreatMade = {
            moveNumber: this.moveCount,
            targetRow: gap.row,
            targetCol: gap.col,
            patternType: gap.patternType || 'pattern',
            gapCells: gapCells,
            gapKey: `${gap.row},${gap.col}`
        };
        
        this.threatMemory.set(this.lastThreatMade.gapKey, this.lastThreatMade);
        this.log(`📝 Threat recorded at (${gap.row},${gap.col}) - ${gap.patternType}`);
    }

    // NEW: Get all cells that can fill a gap
    getGapCells(gap) {
        if (gap.fillCells && Array.isArray(gap.fillCells)) {
            return gap.fillCells;
        }
        
        // For L-patterns, typically 2 cells can fill the gap
        // For I-patterns, typically 3 cells can fill the gap
        // Simple fallback: return the gap position itself
        return [{ row: gap.row, col: gap.col }];
    }

    // ===== STEP 4: FIXED Border Connection =====
    checkPersonalityDrivenBorderConnection() {
        this.log('🎯 Checking border connections...');
        
        // FIXED: Get heads as ARRAY, not object
        let headsArray = this.getHeadsAsArray();
        
        if (headsArray.length === 0) {
            return null;
        }
        
        for (const head of headsArray) {
            const borderDistance = this.player === 'X' ? 
                Math.min(head.row, 14 - head.row) : 
                Math.min(head.col, 14 - head.col);
            
            if (borderDistance <= 2) {
                const move = this.generateBorderConnectionMove(head);
                if (move) {
                    return move;
                }
            }
        }
        
        return null;
    }

    // ===== STEP 5: FIXED Chain Extension =====
    getFragmentAwareChainExtension() {
        this.log('🔗 Chain extension...');
        
        // FIXED: Get heads as ARRAY, not object
        let headsArray = this.getHeadsAsArray();
        
        // If no heads, try initial move
        if (headsArray.length === 0) {
            return this.generateInitialMove();
        }
        
        const selectedHead = this.selectHeadWithPersonality(headsArray);
        
        if (selectedHead) {
            const move = this.generateLPatternFromHead(selectedHead);
            if (move) {
                return move;
            }
        }
        
        return null;
    }

    // CRITICAL FIX: Convert ChainHeadManager results to arrays
    getHeadsAsArray() {
        let headsArray = [];
        
        if (this.chainHeadManager) {
            try {
                // Method 1: Try getActiveHeads() - returns array
                if (typeof this.chainHeadManager.getActiveHeads === 'function') {
                    const result = this.chainHeadManager.getActiveHeads();
                    if (Array.isArray(result)) {
                        headsArray = result;
                        this.log(`✅ Got ${headsArray.length} active heads from ChainHeadManager`);
                        if (headsArray.length > 0) return headsArray;
                    }
                }
                
                // Method 2: Try getHeads() - returns {nearBorder, farBorder} object
                if (typeof this.chainHeadManager.getHeads === 'function') {
                    const result = this.chainHeadManager.getHeads();
                    
                    // Handle object result: {nearBorder: head1, farBorder: head2}
                    if (result && typeof result === 'object' && !Array.isArray(result)) {
                        if (result.nearBorder) headsArray.push(result.nearBorder);
                        if (result.farBorder) headsArray.push(result.farBorder);
                        this.log(`✅ Got ${headsArray.length} heads from ChainHeadManager.getHeads() object`);
                        if (headsArray.length > 0) return headsArray;
                    }
                    
                    // Handle array result (fallback)
                    if (Array.isArray(result)) {
                        headsArray = result;
                        this.log(`✅ Got ${headsArray.length} heads from ChainHeadManager.getHeads() array`);
                        if (headsArray.length > 0) return headsArray;
                    }
                }
                
            } catch (error) {
                this.log(`⚠️ ChainHeadManager error: ${error.message}`);
            }
        }
        
        // Fallback: Get all player positions as heads
        if (headsArray.length === 0) {
            const board = this.gameCore.board;
            for (let row = 0; row < this.gameCore.size; row++) {
                for (let col = 0; col < this.gameCore.size; col++) {
                    if (board[row][col] === this.player) {
                        headsArray.push({ row, col });
                    }
                }
            }
            this.log(`📍 Using ${headsArray.length} player positions as fallback heads`);
        }
        
        return headsArray;
    }

    selectHeadWithPersonality(heads) {
        if (!Array.isArray(heads) || heads.length === 0) {
            return null;
        }
        
        if (Math.random() < this.randomization.headSelection) {
            return heads[Math.floor(Math.random() * heads.length)];
        }
        
        return heads.reduce((best, head) => {
            const headScore = this.evaluateHead(head);
            const bestScore = best ? this.evaluateHead(best) : -1;
            return headScore > bestScore ? head : best;
        }, null);
    }

    evaluateHead(head) {
        const borderDistance = this.player === 'X' ? 
            Math.min(head.row, 14 - head.row) : 
            Math.min(head.col, 14 - head.col);
        
        return 100 - borderDistance;
    }

    generateLPatternFromHead(head) {
        const patterns = this.getValidLPatterns(head);
        
        if (patterns.length === 0) {
            return null;
        }
        
        const selected = Math.random() < this.randomization.lPatternChoice ?
            patterns[Math.floor(Math.random() * patterns.length)] :
            patterns[0];
        
        return {
            row: selected.row,
            col: selected.col,
            value: 5000,
            reason: 'L-pattern extension',
            pattern: 'L-pattern'
        };
    }

    getValidLPatterns(position) {
        const valid = [];
        
        for (const [dr, dc] of this.strategicLPatterns) {
            const newRow = position.row + dr;
            const newCol = position.col + dc;
            
            if (this.isValidMove(newRow, newCol)) {
                valid.push({ row: newRow, col: newCol });
            }
        }
        
        return valid;
    }

    generateBorderConnectionMove(head) {
        const targetBorder = this.player === 'X' ? 
            (head.row < 7 ? 0 : 14) : 
            (head.col < 7 ? 0 : 14);
        
        if (this.player === 'X') {
            const targetRow = targetBorder === 0 ? 
                Math.max(0, head.row - 2) : 
                Math.min(14, head.row + 2);
            
            if (this.isValidMove(targetRow, head.col)) {
                return {
                    row: targetRow,
                    col: head.col,
                    value: 7000,
                    reason: `Connect to ${targetBorder === 0 ? 'top' : 'bottom'} border`,
                    pattern: 'border-connection'
                };
            }
        } else {
            const targetCol = targetBorder === 0 ? 
                Math.max(0, head.col - 2) : 
                Math.min(14, head.col + 2);
            
            if (this.isValidMove(head.row, targetCol)) {
                return {
                    row: head.row,
                    col: targetCol,
                    value: 7000,
                    reason: `Connect to ${targetBorder === 0 ? 'left' : 'right'} border`,
                    pattern: 'border-connection'
                };
            }
        }
        
        return null;
    }

    generateInitialMove() {
        const center = Math.floor(this.gameCore.size / 2);
        const range = 2;
        
        for (let dr = -range; dr <= range; dr++) {
            for (let dc = -range; dc <= range; dc++) {
                const row = center + dr;
                const col = center + dc;
                
                if (this.isValidMove(row, col)) {
                    return {
                        row: row,
                        col: col,
                        value: 4000,
                        reason: 'Initial position',
                        pattern: 'initial'
                    };
                }
            }
        }
        
        return null;
    }

    // ===== STEP 6: Safe Gap Filling =====
    fillPersonalityDrivenSafeGaps() {
        if (!this.gapRegistry) {
            return null;
        }
        
        try {
            const safeGaps = this.gapRegistry.getOwnUnthreatenedGaps ? 
                this.gapRegistry.getOwnUnthreatenedGaps(this.player) : [];
            
            if (Array.isArray(safeGaps) && safeGaps.length > 0) {
                const gap = safeGaps[0];
                
                return {
                    row: gap.row,
                    col: gap.col,
                    value: 3000 + (gap.priority || 0),
                    reason: 'Fill safe gap',
                    pattern: 'gap-fill'
                };
            }
        } catch (error) {
            this.log(`⚠️ Safe gap filling failed: ${error.message}`);
        }
        
        return null;
    }

    // ===== Utility Methods =====
    
    isValidMove(row, col) {
        if (this.gameCore.isValidMove) {
            return this.gameCore.isValidMove(row, col);
        }
        
        // Fallback validation
        return row >= 0 && row < this.gameCore.size && 
               col >= 0 && col < this.gameCore.size &&
               this.gameCore.board[row][col] === '';
    }

    cleanupOldThreats() {
        const currentMove = this.moveCount;
        
        for (const [key, threat] of this.threatMemory) {
            if (currentMove - threat.moveNumber > 4) {
                this.threatMemory.delete(key);
            }
        }
    }

    logMoveDecision(move, type) {
        this.lastMoveType = type;
        this.log(`📝 Decision: ${type} at (${move.row},${move.col}) - ${move.reason}`);
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[${this.player}-AI] ${message}`);
        }
    }

    // ===== Stats and Debug =====
    
    getStats() {
        return {
            player: this.player,
            personality: this.personalityName,
            moveCount: this.moveCount,
            lastMoveType: this.lastMoveType,
            fragments: this.chainHeadManager && this.chainHeadManager.getStats ? 
                this.chainHeadManager.getStats() : 
                { fragmentCount: 0, totalPieces: 0, activeHeads: 0 },
            threatMemory: {
                active: this.threatMemory.size,
                pending: this.lastThreatMade ? 1 : 0
            }
        };
    }

    debugThreatMemory() {
        console.log('🔍 THREAT MEMORY:');
        console.log(`  Last threat: ${this.lastThreatMade ? 
            `(${this.lastThreatMade.targetRow},${this.lastThreatMade.targetCol}) at move ${this.lastThreatMade.moveNumber}` : 
            'None'}`);
        console.log(`  Stored: ${this.threatMemory.size}`);
        
        for (const [key, threat] of this.threatMemory) {
            console.log(`    - ${key}: ${threat.patternType} from move ${threat.moveNumber}`);
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.SimpleChainAI = SimpleChainAI;
    console.log('✅ FIXED SimpleChainAI loaded - TypeError resolved + threat follow-through added');
}
