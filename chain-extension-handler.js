// chain-extension-handler.js - FIXED VERSION
class ChainExtensionHandler {
constructor(gameCore, player) {
    this.gameCore = gameCore;
    this.player = player;
    this.debugMode = false;
    
    // Component references (injected by SimpleChainController)
    this.gapRegistry = null;
    this.fragmentManager = null;
    this.headManager = null;
    this.patternDetector = null;
    this.moveValidator = null;
    this.fragmentAnalyzer = null;
    
    // Initialize mathematical geometry (will fail if not available)
    this.geometry = new GameGeometry(gameCore.size);
    this.geometry.setDebugMode(this.debugMode);
    
    // Get player configuration and player data
    const genericConfig = window.getDirectionConfig(player);
    this.playerConfig = {
        ...genericConfig,              //  All generic directional logic
        player: player,                // Add player
        opponent: player === 'X' ? 'O' : 'X'  //  Add opponent
    };
    this.geometry.setDirectionConfiguration(this.playerConfig);
    
    this.log('Universal Chain Extension Handler initialized');
    this.log(`Player: ${player}, Direction: ${this.playerConfig.direction}`);
    console.log(`[CHAIN-EXTENSION] ✅ PlayerConfig complete: player=${this.playerConfig.player}, isValidPattern=${typeof this.playerConfig.isValidPattern === 'function'}`);
}

    // ===== COMPONENT CONNECTIONS =====

    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        this.log('📗 Gap registry connected');
    }

    setFragmentManager(fragmentManager) {
        this.fragmentManager = fragmentManager;
        this.log('📗 Fragment manager connected');
    }

    setHeadManager(headManager) {
        this.headManager = headManager;
        this.log('📗 Head manager connected');
    }

    setPatternDetector(patternDetector) {
        this.patternDetector = patternDetector;
        this.log('📗 Pattern detector connected');
    }

    setMoveValidator(moveValidator) {
        this.moveValidator = moveValidator;
        this.log('📗 Move validator connected');
    }

    setFragmentAnalyzer(fragmentAnalyzer) {
        this.fragmentAnalyzer = fragmentAnalyzer;
        this.log('📗 Fragment analyzer connected');
    }

    // ===== COMPONENT GETTERS =====
    
    getGapRegistry() { return this.gapRegistry; }
    getFragmentManager() { return this.fragmentManager; }
    getHeadManager() { return this.headManager; }
    getPatternDetector() { return this.patternDetector; }
    getMoveValidator() { return this.moveValidator; }
    getFragmentAnalyzer() { return this.fragmentAnalyzer; }

    // ===== MAIN EXTENSION GENERATION ENTRY POINT =====
    
    generateChainExtension(head = null, direction = null, recommendation = null) {
        this.log('🔗 === CHAIN EXTENSION GENERATION ===');
        
        // If head is provided directly, use direct extension method
        if (head) {
            this.log(`📍 Using provided head: (${head.row},${head.col})`);
            return this.generateExtensionFromHead(head, direction, recommendation);
        }
        
        // Otherwise, get head from HeadManager
        this.log('🎯 No head provided - using HeadManager integration');
        return this.generateChainExtensionWithHead(direction, recommendation);
    }

    // ===== HEAD MANAGER INTEGRATION =====

    generateChainExtensionWithHead(direction = null, recommendation = null) {
        // 1. Validate components
        if (!this.headManager || !this.fragmentManager) {
            return this.generateFallbackExtension();
        }
        
        // 2. Update fragments (FIX: Access fragments property after update)
        this.fragmentManager.updateFragments();
        const fragments = this.fragmentManager.fragments; // Access the property
        
        if (!fragments || fragments.length === 0) {
            return this.generateFallbackExtension();
        }
        
        // 3. Get head tactics
        const tactics = this.headManager.getHeadTactics();
        if (!tactics?.activeHead) {
            return this.generateFallbackExtension();
        }
        
        // 4. Generate from head
        const move = this.generateExtensionFromHead(
            tactics.activeHead,
            tactics.extensionDirection || direction,
            tactics.tacticalRecommendation
        );
        
        // 5. Mark as used and return
        if (move && this.fragmentManager.markHeadAsUsed) {
            this.fragmentManager.markHeadAsUsed(tactics.activeHead);
        }
        
        return move || this.generateFallbackExtension();
    }

    generateMidChainBranchingExtension(headTactics) {
        this.log('🌿 === MID-CHAIN BRANCHING EXTENSION ===');
        
        if (!headTactics.midChainBranchingPoint) {
            this.log('❌ Mid-chain branching requested but no branching point provided - falling back');
            return this.generateFallbackExtension();
        }
        
        const branchingPoint = headTactics.midChainBranchingPoint;
        const branchingHead = branchingPoint.head;
        const branchingDirection = branchingPoint.direction;
        
        this.log(`🎯 Branching from: (${branchingHead.row},${branchingHead.col}) → ${branchingDirection}`);
        
        // Generate extension from branching point
        const branchingMove = this.generateExtensionFromHead(
            branchingHead,
            branchingDirection,
            'mid-chain-branching'
        );
        
        if (branchingMove) {
            // Add mid-chain branching metadata
            branchingMove.midChainBranching = {
                branchingPoint: { row: branchingHead.row, col: branchingHead.col },
                branchingDirection: branchingDirection,
                branchingReason: branchingPoint.reason,
                branchingPriority: branchingPoint.priority
            };
            
            branchingMove.moveType = 'mid-chain-branching';
            branchingMove.reason = `Mid-chain branching: ${branchingPoint.reason}`;
            
            this.log(`✅ Mid-chain branching extension: (${branchingMove.row},${branchingMove.col})`);
            return branchingMove;
        }
        
        this.log('❌ Mid-chain branching extension failed - falling back');
        return this.generateFallbackExtension();
    }

    // ===== DIRECT EXTENSION GENERATION (FIXED) =====

    generateExtensionFromHead(head, direction, recommendation) {
    this.log(`🎯 Extension from (${head.row},${head.col}), direction: ${direction}`);
    
    // Step 1: Get pattern moves from geometry (WITHOUT filterOccupied)
    const patternMoves = this.geometry.generatePatternMoves(head, {
        patterns: ['L', 'I'],
        filterValid: true,           // Only filters board boundaries
        directionFilter: direction,  // This parameter EXISTS and works
        includeMetadata: true,
        playerConfig: this.playerConfig
    });
    
    if (patternMoves.length === 0) {
        this.log('❌ No valid pattern moves from this head');
        return null;
    }
    
    this.log(`📊 Generated ${patternMoves.length} pattern moves from geometry`);
    
    // Step 2: MANUALLY filter out occupied positions
// Step 2: MANUALLY filter out occupied positions
const emptyMoves = patternMoves.filter(move => {
    const isEmpty = this.gameCore.board[move.row][move.col] === '';
    if (!isEmpty && this.debugMode) {
        this.log(`   Skipping occupied: (${move.row},${move.col})`);
    }
    return isEmpty;
});

if (emptyMoves.length === 0) {
    this.log('❌ All pattern positions are occupied');
    return null;
}

// Step 2a: Filter moves that would create immediately threatened patterns
const opponent = this.player === 'X' ? 'O' : 'X';
const opponentPieces = this.gameCore.getPlayerPositions(opponent);

let validMoves = emptyMoves;

if (opponentPieces.length > 0) {
    // Filter out threatened pattern moves
    const safeMoves = emptyMoves.filter(move => {
        return !this.wouldCreateThreatenedPattern(head, move);
    });
    
    if (safeMoves.length < emptyMoves.length && this.debugMode) {
        this.log(`   Filtered ${emptyMoves.length - safeMoves.length} threatened patterns`);
    }
    
    if (safeMoves.length > 0) {
        // Use safe pattern moves
        validMoves = safeMoves;
    } else {
        // ALL pattern moves are threatened - try diagonal extension instead
        this.log('   All pattern moves threatened - attempting diagonal extension');
        
        const diagonalMoves = this.generateDiagonalMovesFromHead(head, direction);
        
        if (diagonalMoves.length > 0) {
            this.log(`   Found ${diagonalMoves.length} diagonal alternatives`);
            return {
                row: diagonalMoves[0].row,
                col: diagonalMoves[0].col,
                type: 'EXTENSION',
                pattern: 'diagonal',
                patternType: 'diagonal-extension',
                direction: direction,
                fromHead: { row: head.row, col: head.col },
                reason: 'Diagonal extension (pattern moves threatened)',
                moveType: 'diagonal-extension',
                value: 70
            };
        }
        
        // No diagonal moves either - return null (will try other strategies)
        this.log('   No diagonal moves available either');
        return null;
    }
}

if (validMoves.length === 0) {
    this.log('❌ No valid moves available');
    return null;
}

this.log(`✅ Found ${validMoves.length} valid positions`);
    
    // Step 3: Select best move (already prioritized by geometry)
    const bestMove = validMoves[0];
    
    // Step 4: Create extension move object
    // Step 4: Create extension move object
const extensionMove = {
    row: bestMove.row,
    col: bestMove.col,
    type: 'EXTENSION',
    pattern: bestMove.pattern,
    patternType: bestMove.patternOrientation,
    direction: direction,
    fromHead: { row: head.row, col: head.col },
    reason: `${bestMove.pattern} extension from (${head.row},${head.col})`,
    moveType: 'chain-extension',
    
    value: window.MovePriorities?.CHAIN_EXTENSION || 75,
    
    // ⭐ ADD: Include strategic extension metadata if present
    strategicExtension: head.type === 'strategic-extension' ? {
        mode: head.mode,  // 'fragment-bridging' or 'border-extension'
        originalType: head.type
    } : undefined,
    
    // Include mathematical metadata
    vector: bestMove.vector,
    vectorMagnitude: bestMove.vectorMagnitude,
    vectorDirection: bestMove.strategicDirection
};
    
    // ✅ CRITICAL FIX: Mark head as used BEFORE returning
    // This prevents the same head from being used multiple times
    if (this.fragmentManager && typeof this.fragmentManager.markHeadAsUsed === 'function') {
        this.fragmentManager.markHeadAsUsed(head, direction);
        this.log(`✅ Head (${head.row},${head.col}) marked as used for direction: ${direction}`);
    } else {
        this.log(`⚠️ Fragment manager not available to mark head as used`);
    }
    
    if (extensionMove.strategicExtension) {
    this.log(`🌿 STRATEGIC EXTENSION: ${extensionMove.strategicExtension.mode}`);
    this.log(`   From: (${head.row},${head.col}) → (${extensionMove.row},${extensionMove.col})`);
}
    return extensionMove;
}


    // ===== FALLBACK EXTENSION GENERATION (FIXED) =====

    generateFallbackExtension() {
        this.log('🔄 TRUE FALLBACK - Finding ANY valid move');
        
        // Get all player pieces
        const pieces = this.gameCore.getPlayerPositions(this.player);
        
        // Try each piece until we find ANY valid move
        for (const piece of pieces) {
            // Step 1: Get pattern moves from geometry (WITHOUT filterOccupied)
            const patternMoves = this.geometry.generatePatternMoves(piece, {
                patterns: ['L', 'I'],
                filterValid: true,  // Only filters board boundaries
                playerConfig: this.playerConfig
            });
            
            // Step 2: MANUALLY filter occupied positions
            const validMoves = patternMoves.filter(m => 
                this.gameCore.board[m.row][m.col] === ''
            );
            
            if (validMoves.length > 0) {
                return {
                    row: validMoves[0].row,
                    col: validMoves[0].col,
                    type: 'EXTENSION',
                    pattern: 'fallback',
                    fallback: true,
                    fromHead: piece,
                    reason: `Emergency fallback from (${piece.row},${piece.col})`,
                    moveType: 'chain-extension'
                };
            }
        }
        
        this.log('❌ CRITICAL: No valid moves anywhere on board');
        return null;
    }

    // ===== UTILITY METHODS =====
    
    /**
 * Check if a pattern move would be blocked by opponent diagonal
 * Uses move's existing pattern information (no recalculation needed)
 */
isPatternMoveBlocked(head, move) {
    // The move object already has pattern information from geometry!
    const pattern = {
        piece1: head,
        piece2: move,
        patternType: move.pattern || move.patternOrientation?.split('-')[0], // Use existing!
        player: this.player
    };
    
    // Use PatternDetector's existing blocking check
    if (this.patternDetector && typeof this.patternDetector.isPatternDiagonallyBlocked === 'function') {
        const blocked = this.patternDetector.isPatternDiagonallyBlocked(pattern, this.gameCore);
        
        if (blocked && this.debugMode) {
            this.log(`   ❌ Pattern blocked: (${head.row},${head.col}) → (${move.row},${move.col}) [${pattern.patternType}]`);
        }
        
        return blocked;
    }
    
    // Fallback if PatternDetector not available
    return false;
}

/**
 * Check if extending to this move would create an immediately threatened pattern
 * Only checks when opponent pieces exist
 */
/**
 * Check if extending to this move would create an immediately threatened pattern
 */
wouldCreateThreatenedPattern(head, move) {
    const opponent = this.player === 'X' ? 'O' : 'X';
    const opponentPieces = this.gameCore.getPlayerPositions(opponent);
    
    // Safety: No threat without opponent
    if (opponentPieces.length === 0) {
        return false;
    }
    
    const dr = move.row - head.row;
    const dc = move.col - head.col;
    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);
    
    // Only check L-patterns (2 cells one way, 1 cell perpendicular)
    if (!((absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2))) {
        return false;
    }
    
    // Calculate gap cells for this L-pattern
    let gap1, gap2;
    if (absDr === 2) {
        // Vertical L: 2 rows apart
        const midRow = head.row + (dr > 0 ? 1 : -1);
        gap1 = { row: midRow, col: head.col };
        gap2 = { row: midRow, col: move.col };
    } else {
        // Horizontal L: 2 cols apart
        const midCol = head.col + (dc > 0 ? 1 : -1);
        gap1 = { row: head.row, col: midCol };
        gap2 = { row: move.row, col: midCol };
    }
    
    // THREAT CHECK 1: Any gap cell occupied by opponent
    for (const gap of [gap1, gap2]) {
        if (this.gameCore.board[gap.row]?.[gap.col] === opponent) {
            if (this.debugMode) {
                this.log(`   ⚠️ Threat: opponent in gap at (${gap.row},${gap.col})`);
            }
            return true;
        }
    }
    
    // THREAT CHECK 2: Opponent laterally adjacent to EITHER piece
    // AND in same row/col as the OTHER piece (can cut the pattern)
    
    // Check all 4 lateral positions around HEAD
    const headLaterals = [
        { row: head.row - 1, col: head.col },
        { row: head.row + 1, col: head.col },
        { row: head.row, col: head.col - 1 },
        { row: head.row, col: head.col + 1 }
    ];
    
    for (const pos of headLaterals) {
        if (this.gameCore.isValidPosition(pos.row, pos.col) &&
            this.gameCore.board[pos.row][pos.col] === opponent) {
            // Opponent adjacent to head - is it also in line with move?
            if (pos.row === move.row || pos.col === move.col) {
                if (this.debugMode) {
                    this.log(`   ⚠️ Threat: opponent at (${pos.row},${pos.col}) adjacent to head, in line with move`);
                }
                return true;
            }
        }
    }
    
    // Check all 4 lateral positions around MOVE
    const moveLaterals = [
        { row: move.row - 1, col: move.col },
        { row: move.row + 1, col: move.col },
        { row: move.row, col: move.col - 1 },
        { row: move.row, col: move.col + 1 }
    ];
    
    for (const pos of moveLaterals) {
        if (this.gameCore.isValidPosition(pos.row, pos.col) &&
            this.gameCore.board[pos.row][pos.col] === opponent) {
            // Opponent adjacent to move - is it also in line with head?
            if (pos.row === head.row || pos.col === head.col) {
                if (this.debugMode) {
                    this.log(`   ⚠️ Threat: opponent at (${pos.row},${pos.col}) adjacent to move, in line with head`);
                }
                return true;
            }
        }
    }
    
    return false;
}


/**
 * Generate diagonal moves from head (1-cell diagonal steps toward target border)
 */
generateDiagonalMovesFromHead(head, direction) {
    const opponent = this.player === 'X' ? 'O' : 'X';
    const diagonalOffsets = [
        { row: -1, col: -1 }, // NW
        { row: -1, col: 1 },  // NE
        { row: 1, col: -1 },  // SW
        { row: 1, col: 1 }    // SE
    ];
    
    const validDiagonals = [];
    
    for (const offset of diagonalOffsets) {
        const newRow = head.row + offset.row;
        const newCol = head.col + offset.col;
        
        // Check if valid position
        if (!this.gameCore.isValidPosition(newRow, newCol)) {
            continue;
        }
        
        // Check if empty
        if (this.gameCore.board[newRow][newCol] !== '') {
            continue;
        }
        
        // Check if moves in correct direction
        const movesTowardTarget = this.moveIsTowardTarget(head, {row: newRow, col: newCol}, direction);
        if (!movesTowardTarget) {
            continue;
        }
        
        // Check if diagonal is not blocked by opponent diagonal
        const cross1 = { row: head.row, col: newCol };
        const cross2 = { row: newRow, col: head.col };
        const cell1 = this.gameCore.board[cross1.row]?.[cross1.col];
        const cell2 = this.gameCore.board[cross2.row]?.[cross2.col];
        
        if (cell1 === opponent && cell2 === opponent) {
            continue; // Blocked by opponent diagonal
        }
        
        validDiagonals.push({ row: newRow, col: newCol });
    }
    
    return validDiagonals;
}

/**
 * Check if move is toward target border
 */
moveIsTowardTarget(from, to, direction) {
    if (this.player === 'X') {
        // X needs to move vertically
        if (direction === 'north') {
            return to.row < from.row;
        } else if (direction === 'south') {
            return to.row > from.row;
        }
    } else {
        // O needs to move horizontally
        if (direction === 'west') {
            return to.col < from.col;
        } else if (direction === 'east') {
            return to.col > from.col;
        }
    }
    return true; // Default to allowing
}
/**
 * Find laterally adjacent opponent piece (N, S, E, W)
 */
findLaterallyAdjacentOpponent(pos) {
    const opponent = this.player === 'X' ? 'O' : 'X';
    const lateralOffsets = [
        { row: -1, col: 0 },  // North
        { row: 1, col: 0 },   // South
        { row: 0, col: -1 },  // West
        { row: 0, col: 1 }    // East
    ];
    
    for (const offset of lateralOffsets) {
        const checkRow = pos.row + offset.row;
        const checkCol = pos.col + offset.col;
        
        if (this.gameCore.isValidPosition(checkRow, checkCol) &&
            this.gameCore.board[checkRow][checkCol] === opponent) {
            return { row: checkRow, col: checkCol };
        }
    }
    
    return null;
}

/**
 * Check if two positions share the same row or column
 */
isInLineWith(pos1, pos2) {
    return pos1.row === pos2.row || pos1.col === pos2.col;
}

isConnectedToHead(head, move) {
    const dr = Math.abs(move.row - head.row);
    const dc = Math.abs(move.col - head.col);
    
    // Lateral - always connected
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        return true;
    }
    
    // Diagonal - check opponent blocking
    if (dr === 1 && dc === 1) {
        const cross1 = { row: head.row, col: move.col };
        const cross2 = { row: move.row, col: head.col };
        const cell1 = this.gameCore.board[cross1.row]?.[cross1.col];
        const cell2 = this.gameCore.board[cross2.row]?.[cross2.col];
        const opponent = this.player === 'X' ? 'O' : 'X';
        return !(cell1 === opponent && cell2 === opponent);
    }
    
    // Pattern moves - assume connected
    return true;
}

    filterMovesWithDirectionVector(moves, requestedDirection) {
        if (!requestedDirection || !this.geometry.DIRECTION_VECTORS[requestedDirection]) {
            return moves;
        }
        
        const targetVector = this.geometry.DIRECTION_VECTORS[requestedDirection];
        
        return moves.filter(move => {
            return this.geometry.vectorAlignsWith(move.vector, targetVector, 0.3);
        });
    }

    findPlayerPieces() {
        const pieces = [];
        for (let row = 0; row < this.gameCore.size; row++) {
            for (let col = 0; col < this.gameCore.size; col++) {
                if (this.gameCore.board[row][col] === this.player) {
                    pieces.push({ row, col });
                }
            }
        }
        return pieces;
    }

    canPieceExtend(piece) {
        // Use geometry if available
        if (this.geometry) {
            const options = this.geometry.generatePatternMoves(piece, {
                patterns: ['L', 'I'],
                filterValid: true,
                playerConfig: this.playerConfig
            });
            // Check if any moves are empty
            const emptyMoves = options.filter(m => 
                this.gameCore.board[m.row][m.col] === ''
            );
            return emptyMoves.length > 0;
        }
        
        // Basic fallback check
        if (this.player === 'X') {
            return piece.row > 0 && piece.row < 14;
        } else {
            return piece.col > 0 && piece.col < 14;
        }
    }

    selectFallbackHead(pieces) {
        // Prioritize by border distance
        return pieces.reduce((best, current) => {
            const currentDistance = this.calculateBorderDistance(current);
            const bestDistance = this.calculateBorderDistance(best);
            return currentDistance < bestDistance ? current : best;
        });
    }

    calculateBorderDistance(piece) {
        if (this.player === 'X') {
            return Math.min(piece.row, 14 - piece.row);
        } else {
            return Math.min(piece.col, 14 - piece.col);
        }
    }

    determineFallbackDirection(piece) {
        if (this.player === 'X') {
            return piece.row < 7 ? 'south' : 'north';
        } else {
            return piece.col < 7 ? 'east' : 'west';
        }
    }

    // ===== LOGGING METHODS =====

    logPatternMoves(patternMoves) {
        this.log(`📋 Mathematical patterns generated: ${patternMoves.length}`);
        patternMoves.forEach((move, index) => {
            this.log(`   ${index + 1}. (${move.row},${move.col}) ${move.pattern}-${move.patternOrientation} [P:${move.priority}] Dir:${move.strategicDirection}`);
        });
    }

    logSelectedMove(extensionMove) {
        this.log(`✅ MATHEMATICAL SELECTION: (${extensionMove.row},${extensionMove.col})`);
        this.log(`📍 Pattern: ${extensionMove.pattern}-${extensionMove.patternType}`);
        this.log(`🧭 Vector: [${extensionMove.vector.join(',')}], Direction: ${extensionMove.vectorDirection}`);
        this.log(`🎯 Priority: ${extensionMove.priority} (mathematically calculated)`);
    }

    logExtensionWithTactics(move, headTactics) {
        this.log(`📋 === EXTENSION WITH TACTICAL CONTEXT ===`);
        this.log(`   Move: (${move.row},${move.col})`);
        this.log(`   Pattern: ${move.pattern}`);
        this.log(`   Head: (${headTactics.activeHead.row},${headTactics.activeHead.col})`);
        this.log(`   Tactical: ${headTactics.tacticalRecommendation}`);
        
        if (headTactics.shouldReassignHead) {
            this.log(`   🔄 Head was reassigned`);
        }
        
        if (headTactics.tacticalRecommendation === 'mid-chain-branching') {
            this.log(`   🌿 Mid-chain branching from: ${JSON.stringify(headTactics.midChainBranchingPoint?.head)}`);
        }
    }

    // ===== DIAGNOSTIC METHODS =====

    checkHeadManagerIntegration() {
        const status = {
            headManagerConnected: !!this.headManager,
            fragmentManagerConnected: !!this.fragmentManager,
            canGetHeadTactics: false,
            canGetActiveHead: false
        };
        
        if (this.headManager) {
            try {
                const tactics = this.headManager.getHeadTactics();
                status.canGetHeadTactics = !!tactics;
                status.canGetActiveHead = !!tactics.activeHead;
            } catch (error) {
                this.log(`❌ Error checking head manager: ${error.message}`);
            }
        }
        
        this.log('📍 Head Manager Integration Status:', status);
        return status;
    }

    getSystemStatus() {
        return {
            componentsConnected: {
                gapRegistry: !!this.gapRegistry,
                fragmentManager: !!this.fragmentManager,
                headManager: !!this.headManager,
                patternDetector: !!this.patternDetector,
                moveValidator: !!this.moveValidator,
                fragmentAnalyzer: !!this.fragmentAnalyzer
            },
            geometry: !!this.geometry,
            playerConfig: !!this.playerConfig,
            ready: this.isSystemReady()
        };
    }

    isSystemReady() {
        // Core requirements
        return !!(this.geometry && this.playerConfig);
    }

    // ===== UTILITY =====

    isValidPosition(row, col) {
        return this.geometry.isValidPosition(row, col);
    }

    recordSuccessfulExtension(head, move) {
        this.log(`📊 Extension recorded: (${head.row},${head.col}) → (${move.row},${move.col})`);
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[CHAIN-EXTENSION] ${message}`);
        }
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
        if (this.geometry) {
            this.geometry.setDebugMode(enabled);
        }
        this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// ===== BROWSER EXPORT =====

if (typeof window !== 'undefined') {
    window.ChainExtensionHandler = ChainExtensionHandler;
    console.log('✅ Chain Extension Handler loaded - FIXED VERSION');
}