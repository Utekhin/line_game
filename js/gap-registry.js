// gap-registry.js - FIXED: Proper Pattern Validation and Connection Detection
// UPDATED: Added Diagonal Pattern Support (2x2 distance with single gap)
// Eliminates phantom gaps and ensures only valid, attackable patterns are registered

class UniversalGapRegistry {
    constructor(gameCore, aiPlayer) {
        this.gameCore = gameCore;
        this.aiPlayer = aiPlayer; // The AI player (X)
        this.humanPlayer = aiPlayer === 'X' ? 'O' : 'X';
        
        // Use unified modules
        this.patternDetector = new PatternDetector();
        
        // Gap storage
        this.patterns = new Map(); // All patterns
        this.patternsByType = {
            'X-X': new Map(),    // X player patterns
            'O-O': new Map(),    // O player patterns  
            'X-O': new Map()     // Mixed patterns (X-O interactions)
        };
        
        this.gaps = new Map(); // key: "row-col", value: gap info
        this.activeGaps = new Map(); // key: pattern type, value: Set of gap keys
        this.patternCounter = 0;
        
        // Initialize active gaps by type
        this.activeGaps.set('X-X', new Set());
        this.activeGaps.set('O-O', new Set());
        this.activeGaps.set('X-O', new Set());
        
        // Enhanced validation settings
        this.strictValidation = true;
        this.debugMode = true;
        
        console.log(`📋 FIXED Gap Registry initialized - Strict validation enabled with Diagonal support`);
    }

    // ===== CORE FIX: STRICT PATTERN VALIDATION =====
    
    autoDetectAndRegisterPatterns() {
        this.log('🔍 Auto-detecting patterns with STRICT validation...');
        
        // Clear existing patterns first
        this.clearAllPatterns();
        
        // Get current piece positions with validation
        const xPieces = this.getValidatedPlayerPositions('X');
        const oPieces = this.getValidatedPlayerPositions('O');
        
        this.log(`📊 Found ${xPieces.length} X pieces, ${oPieces.length} O pieces`);
        
        // STRICT: Only detect patterns with rigorous validation
        const xPatterns = this.detectStrictPatterns(xPieces, 'X');
        const oPatterns = this.detectStrictPatterns(oPieces, 'O');
        
        this.log(`🔍 STRICT detection: ${xPatterns.length} X patterns, ${oPatterns.length} O patterns`);
        
        // Register patterns with enhanced validation
        for (const pattern of xPatterns) {
            this.registerStrictPattern(pattern, 'X-X');
        }
        
        for (const pattern of oPatterns) {
            this.registerStrictPattern(pattern, 'O-O');
        }
        
        const stats = this.getStats();
        this.log(`✅ STRICT pattern registration complete: ${stats.totalPatterns} patterns, ${stats.totalActiveGaps} gaps`);
    }

    // NEW: Get validated player positions
    getValidatedPlayerPositions(player) {
        const positions = [];
        const board = this.gameCore.board;
        const size = this.gameCore.size;
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (board[row][col] === player) {
                    positions.push({ row, col });
                }
            }
        }
        
        this.log(`🔍 ${player} positions: ${positions.map(p => `(${p.row},${p.col})`).join(', ')}`);
        return positions;
    }

    // NEW: Strict pattern detection with enhanced validation
    detectStrictPatterns(pieces, player) {
        const patterns = [];
        
        if (pieces.length < 2) {
            this.log(`⚠️ Only ${pieces.length} ${player} pieces - no patterns possible`);
            return patterns;
        }
        
        // Check all pairs of pieces
        for (let i = 0; i < pieces.length; i++) {
            for (let j = i + 1; j < pieces.length; j++) {
                const piece1 = pieces[i];
                const piece2 = pieces[j];
                
                // STRICT: Check if pieces are already connected
                if (this.areDirectlyConnected(piece1, piece2, player)) {
                    this.log(`🔗 ${player} pieces (${piece1.row},${piece1.col}) and (${piece2.row},${piece2.col}) already connected - no gap needed`);
                    continue;
                }
                
                // STRICT: Check for valid L-pattern
                if (this.isStrictLPattern(piece1, piece2)) {
                    const gaps = this.getValidatedLPatternGaps(piece1, piece2);
                    if (gaps.length > 0) {
                        patterns.push({
                            id: `L-${i}-${j}`,
                            type: 'L',
                            piece1: piece1,
                            piece2: piece2,
                            gaps: gaps,
                            player: player,
                            validated: true
                        });
                        this.log(`✅ Valid L-pattern: ${player} (${piece1.row},${piece1.col}) ↔ (${piece2.row},${piece2.col}) with ${gaps.length} gaps`);
                    }
                }
                
                // STRICT: Check for valid I-pattern
                if (this.isStrictIPattern(piece1, piece2)) {
                    const gaps = this.getValidatedIPatternGaps(piece1, piece2);
                    if (gaps.length > 0) {
                        patterns.push({
                            id: `I-${i}-${j}`,
                            type: 'I',
                            piece1: piece1,
                            piece2: piece2,
                            gaps: gaps,
                            player: player,
                            validated: true
                        });
                        this.log(`✅ Valid I-pattern: ${player} (${piece1.row},${piece1.col}) ↔ (${piece2.row},${piece2.col}) with ${gaps.length} gaps`);
                    }
                }
                
                // NEW: Check for valid Diagonal pattern
                if (this.isStrictDiagonalPattern(piece1, piece2)) {
                    const gap = this.getValidatedDiagonalPatternGap(piece1, piece2);
                    if (gap) {
                        patterns.push({
                            id: `D-${i}-${j}`,
                            type: 'D',
                            piece1: piece1,
                            piece2: piece2,
                            gaps: [gap], // Single gap
                            player: player,
                            validated: true
                        });
                        this.log(`✅ Valid Diagonal pattern: ${player} (${piece1.row},${piece1.col}) ↔ (${piece2.row},${piece2.col}) with gap at (${gap.row},${gap.col})`);
                    }
                }
            }
        }
        
        return patterns;
    }

    // ENHANCED: Strict L-pattern validation
    isStrictLPattern(pos1, pos2) {
        if (!this.validatePosition(pos1) || !this.validatePosition(pos2)) {
            return false;
        }
        
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        
        const isL = (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
        
        if (isL) {
            this.log(`🔍 L-pattern check: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col}) - VALID`);
        }
        
        return isL;
    }

    // ENHANCED: Strict I-pattern validation
    isStrictIPattern(pos1, pos2) {
        if (!this.validatePosition(pos1) || !this.validatePosition(pos2)) {
            return false;
        }
        
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        
        // STRICT: I-pattern must be exactly 2 cells apart in same row OR same column
        const isVerticalI = (dr === 2 && dc === 0); // Same column, 2 rows apart
        const isHorizontalI = (dr === 0 && dc === 2); // Same row, 2 columns apart
        
        const isValidI = isVerticalI || isHorizontalI;
        
        if (isValidI) {
            this.log(`🔍 I-pattern check: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col}) - VALID ${isVerticalI ? 'VERTICAL' : 'HORIZONTAL'}`);
        } else {
            this.log(`❌ I-pattern check: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col}) - INVALID (dr=${dr}, dc=${dc})`);
        }
        
        return isValidI;
    }

    // NEW: Strict Diagonal pattern validation
    isStrictDiagonalPattern(pos1, pos2) {
        if (!this.validatePosition(pos1) || !this.validatePosition(pos2)) {
            return false;
        }
        
        const dr = Math.abs(pos2.row - pos1.row);
        const dc = Math.abs(pos2.col - pos1.col);
        
        const isDiagonal = (dr === 2 && dc === 2);
        
        if (isDiagonal) {
            this.log(`🔍 Diagonal pattern check: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col}) - VALID`);
        }
        
        return isDiagonal;
    }

    // ENHANCED: Validated L-pattern gaps
    getValidatedLPatternGaps(pos1, pos2) {
        if (!this.isStrictLPattern(pos1, pos2)) {
            this.log(`❌ Cannot get L-gaps for invalid L-pattern`);
            return [];
        }
        
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        const gaps = [];
        
        if (Math.abs(dr) === 2 && Math.abs(dc) === 1) {
            // Vertical L: 2 rows, 1 column
            const midRow = pos1.row + (dr > 0 ? 1 : -1);
            const gap1 = { row: midRow, col: pos1.col };
            const gap2 = { row: midRow, col: pos2.col };
            
            // STRICT: Only include gaps that are empty and valid
            if (this.isValidGapCell(gap1)) gaps.push(gap1);
            if (this.isValidGapCell(gap2)) gaps.push(gap2);
            
            this.log(`🔍 L-pattern gaps: ${gaps.map(g => `(${g.row},${g.col})`).join(', ')}`);
            
        } else if (Math.abs(dr) === 1 && Math.abs(dc) === 2) {
            // Horizontal L: 1 row, 2 columns
            const midCol = pos1.col + (dc > 0 ? 1 : -1);
            const gap1 = { row: pos1.row, col: midCol };
            const gap2 = { row: pos2.row, col: midCol };
            
            // STRICT: Only include gaps that are empty and valid
            if (this.isValidGapCell(gap1)) gaps.push(gap1);
            if (this.isValidGapCell(gap2)) gaps.push(gap2);
            
            this.log(`🔍 L-pattern gaps: ${gaps.map(g => `(${g.row},${g.col})`).join(', ')}`);
        }
        
        return gaps;
    }

    // ENHANCED: Validated I-pattern gaps
    getValidatedIPatternGaps(pos1, pos2) {
        if (!this.isStrictIPattern(pos1, pos2)) {
            this.log(`❌ Cannot get I-gaps for invalid I-pattern`);
            return [];
        }
        
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        const gaps = [];
        
        if (Math.abs(dr) === 2 && dc === 0) {
            // Vertical I: same column, 2 rows apart
            const midRow = pos1.row + (dr > 0 ? 1 : -1);
            const gap1 = { row: midRow, col: pos1.col - 1 };
            const gap2 = { row: midRow, col: pos1.col };     // Center gap
            const gap3 = { row: midRow, col: pos1.col + 1 };
            
            // STRICT: Only include gaps that are empty and valid
            if (this.isValidGapCell(gap1)) gaps.push(gap1);
            if (this.isValidGapCell(gap2)) gaps.push(gap2);
            if (this.isValidGapCell(gap3)) gaps.push(gap3);
            
            this.log(`🔍 Vertical I-pattern gaps: ${gaps.map(g => `(${g.row},${g.col})`).join(', ')}`);
            
        } else if (dr === 0 && Math.abs(dc) === 2) {
            // Horizontal I: same row, 2 columns apart
            const midCol = pos1.col + (dc > 0 ? 1 : -1);
            const gap1 = { row: pos1.row - 1, col: midCol };
            const gap2 = { row: pos1.row, col: midCol };     // Center gap
            const gap3 = { row: pos1.row + 1, col: midCol };
            
            // STRICT: Only include gaps that are empty and valid
            if (this.isValidGapCell(gap1)) gaps.push(gap1);
            if (this.isValidGapCell(gap2)) gaps.push(gap2);
            if (this.isValidGapCell(gap3)) gaps.push(gap3);
            
            this.log(`🔍 Horizontal I-pattern gaps: ${gaps.map(g => `(${g.row},${g.col})`).join(', ')}`);
        }
        
        return gaps;
    }

    // NEW: Validated Diagonal pattern gap
    getValidatedDiagonalPatternGap(pos1, pos2) {
        if (!this.isStrictDiagonalPattern(pos1, pos2)) {
            this.log(`❌ Cannot get diagonal gap for invalid diagonal pattern`);
            return null;
        }
        
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        
        // The gap is at the midpoint
        const gapRow = pos1.row + (dr > 0 ? 1 : -1);
        const gapCol = pos1.col + (dc > 0 ? 1 : -1);
        const gap = { row: gapRow, col: gapCol };
        
        // STRICT: Only include gap if it's empty and valid
        if (this.isValidGapCell(gap)) {
            this.log(`🔍 Diagonal pattern gap: (${gap.row},${gap.col})`);
            return gap;
        }
        
        return null;
    }

    // NEW: Validate gap cell
    isValidGapCell(gap) {
        // Check position bounds
        if (!this.gameCore.isValidPosition(gap.row, gap.col)) {
            return false;
        }
        
        // Check if cell is empty
        if (this.gameCore.board[gap.row][gap.col] !== '') {
            this.log(`❌ Gap (${gap.row},${gap.col}) already filled with ${this.gameCore.board[gap.row][gap.col]}`);
            return false;
        }
        
        return true;
    }

    // NEW: Enhanced connection detection
    areDirectlyConnected(piece1, piece2, player) {
        // Check if there's a direct path between pieces through adjacent pieces of same player
        const visited = new Set();
        return this.hasConnectionPath(piece1, piece2, player, visited);
    }

    hasConnectionPath(fromPiece, targetPiece, player, visited, depth = 0) {
        const key = `${fromPiece.row}-${fromPiece.col}`;
        
        // Prevent infinite loops
        if (visited.has(key) || depth > 10) {
            return false;
        }
        visited.add(key);
        
        // Found target
        if (fromPiece.row === targetPiece.row && fromPiece.col === targetPiece.col) {
            return true;
        }
        
        // Check all 8 adjacent directions
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dr, dc] of directions) {
            const newRow = fromPiece.row + dr;
            const newCol = fromPiece.col + dc;
            
            if (this.gameCore.isValidPosition(newRow, newCol) &&
                this.gameCore.board[newRow][newCol] === player) {
                
                const adjacentPiece = { row: newRow, col: newCol };
                if (this.hasConnectionPath(adjacentPiece, targetPiece, player, visited, depth + 1)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // ENHANCED: Strict pattern registration with critical gap detection
    registerStrictPattern(pattern, ownershipType) {
        // Double-check pattern is still valid before registering
        if (!this.validatePatternBeforeRegistration(pattern)) {
            this.log(`❌ Pattern rejected during registration: ${pattern.id}`);
            return;
        }

        const patternId = ++this.patternCounter;

        const registeredPattern = {
            id: patternId,
            originalId: pattern.id,
            type: pattern.type,
            ownershipType: ownershipType,
            piece1: pattern.piece1,
            piece2: pattern.piece2,
            piece1Player: pattern.player,
            piece2Player: pattern.player,
            gapCells: pattern.gaps,
            createdAt: this.gameCore.moveCount,
            status: 'active',
            validated: true
        };

        // Store pattern
        this.patterns.set(patternId, registeredPattern);
        this.patternsByType[ownershipType].set(patternId, registeredPattern);

        // ENHANCED: Detect if any gap cells are blocked by opponent (critical detection)
        const expectedGaps = this.getExpectedGapCount(pattern.type);
        const allGapCells = this.getAllPatternGapCells(pattern);
        const opponent = pattern.player === 'X' ? 'O' : 'X';

        let blockedByOpponent = 0;
        for (const gapCell of allGapCells) {
            if (this.gameCore.isValidPosition(gapCell.row, gapCell.col) &&
                this.gameCore.board[gapCell.row][gapCell.col] === opponent) {
                blockedByOpponent++;
                this.log(`🚫 Gap (${gapCell.row},${gapCell.col}) blocked by ${opponent} in pattern #${patternId}`);
            }
        }

        // If some gaps are blocked by opponent, remaining gaps are CRITICAL
        const isCritical = blockedByOpponent > 0;
        if (isCritical) {
            this.log(`🚨 Pattern #${patternId} has ${blockedByOpponent} gap(s) blocked - remaining gaps are CRITICAL`);
        }

        // Register each gap cell with strict validation
        let validGapsCount = 0;
        for (const gapCell of pattern.gaps) {
            if (this.registerValidatedGap(gapCell, registeredPattern, isCritical)) {
                validGapsCount++;
            }
        }

        // Remove pattern if no valid gaps remain
        if (validGapsCount === 0) {
            this.log(`❌ Pattern #${patternId} removed - no valid gaps`);
            this.patterns.delete(patternId);
            this.patternsByType[ownershipType].delete(patternId);
            return;
        }

        this.log(`✅ Pattern #${patternId} registered: ${ownershipType} ${pattern.type} with ${validGapsCount} valid gaps${isCritical ? ' [CRITICAL]' : ''}`);
    }

    // NEW: Get expected number of gap cells for pattern type
    getExpectedGapCount(patternType) {
        switch (patternType) {
            case 'L': return 2;
            case 'I': return 3;
            case 'D': return 1;
            default: return 2;
        }
    }

    // NEW: Get ALL gap cells for a pattern (including potentially blocked ones)
    getAllPatternGapCells(pattern) {
        const pos1 = pattern.piece1;
        const pos2 = pattern.piece2;
        const dr = pos2.row - pos1.row;
        const dc = pos2.col - pos1.col;
        const allGaps = [];

        if (pattern.type === 'L') {
            if (Math.abs(dr) === 2 && Math.abs(dc) === 1) {
                const midRow = pos1.row + (dr > 0 ? 1 : -1);
                allGaps.push({ row: midRow, col: pos1.col });
                allGaps.push({ row: midRow, col: pos2.col });
            } else if (Math.abs(dr) === 1 && Math.abs(dc) === 2) {
                const midCol = pos1.col + (dc > 0 ? 1 : -1);
                allGaps.push({ row: pos1.row, col: midCol });
                allGaps.push({ row: pos2.row, col: midCol });
            }
        } else if (pattern.type === 'I') {
            if (Math.abs(dr) === 2 && dc === 0) {
                const midRow = pos1.row + (dr > 0 ? 1 : -1);
                allGaps.push({ row: midRow, col: pos1.col - 1 });
                allGaps.push({ row: midRow, col: pos1.col });
                allGaps.push({ row: midRow, col: pos1.col + 1 });
            } else if (dr === 0 && Math.abs(dc) === 2) {
                const midCol = pos1.col + (dc > 0 ? 1 : -1);
                allGaps.push({ row: pos1.row - 1, col: midCol });
                allGaps.push({ row: pos1.row, col: midCol });
                allGaps.push({ row: pos1.row + 1, col: midCol });
            }
        } else if (pattern.type === 'D') {
            const gapRow = pos1.row + (dr > 0 ? 1 : -1);
            const gapCol = pos1.col + (dc > 0 ? 1 : -1);
            allGaps.push({ row: gapRow, col: gapCol });
        }

        return allGaps.filter(g => this.gameCore.isValidPosition(g.row, g.col));
    }

    // NEW: Validate pattern before registration
    validatePatternBeforeRegistration(pattern) {
        // Check pieces still exist on board
        const piece1Content = this.gameCore.board[pattern.piece1.row][pattern.piece1.col];
        const piece2Content = this.gameCore.board[pattern.piece2.row][pattern.piece2.col];
        
        if (piece1Content !== pattern.player) {
            this.log(`❌ Pattern validation failed: piece1 (${pattern.piece1.row},${pattern.piece1.col}) expected ${pattern.player}, found ${piece1Content}`);
            return false;
        }
        
        if (piece2Content !== pattern.player) {
            this.log(`❌ Pattern validation failed: piece2 (${pattern.piece2.row},${pattern.piece2.col}) expected ${pattern.player}, found ${piece2Content}`);
            return false;
        }
        
        // Check pattern geometry is still valid
        if (pattern.type === 'L' && !this.isStrictLPattern(pattern.piece1, pattern.piece2)) {
            this.log(`❌ L-pattern geometry validation failed`);
            return false;
        }
        
        if (pattern.type === 'I' && !this.isStrictIPattern(pattern.piece1, pattern.piece2)) {
            this.log(`❌ I-pattern geometry validation failed`);
            return false;
        }
        
        if (pattern.type === 'D' && !this.isStrictDiagonalPattern(pattern.piece1, pattern.piece2)) {
            this.log(`❌ Diagonal pattern geometry validation failed`);
            return false;
        }
        
        // Check pieces aren't already connected
        if (this.areDirectlyConnected(pattern.piece1, pattern.piece2, pattern.player)) {
            this.log(`❌ Pattern invalid: pieces already connected`);
            return false;
        }
        
        return true;
    }

    // ENHANCED: Register validated gap with critical status detection
    registerValidatedGap(gapCell, pattern, isCritical = false) {
        const key = `${gapCell.row}-${gapCell.col}`;

        // Strict validation
        if (!this.isValidGapCell(gapCell)) {
            this.log(`❌ Gap (${gapCell.row},${gapCell.col}) failed validation`);
            return false;
        }

        const gap = {
            row: gapCell.row,
            col: gapCell.col,
            patternId: pattern.id,
            patternType: pattern.type,
            ownershipType: pattern.ownershipType,
            patternCells: [pattern.piece1, pattern.piece2],
            createdAt: this.gameCore.moveCount,
            status: 'open',
            validated: true,
            isCritical: isCritical  // NEW: Mark if this is a single-point-of-failure
        };

        this.gaps.set(key, gap);
        this.activeGaps.get(pattern.ownershipType).add(key);

        const criticalMarker = isCritical ? ' [CRITICAL]' : '';
        this.log(`✅ Valid gap registered at (${gapCell.row},${gapCell.col}) for ${pattern.ownershipType} ${pattern.type}-pattern #${pattern.id}${criticalMarker}`);
        return true;
    }

    // ===== ENHANCED ATTACK SYSTEM =====
    
    getOpponentVulnerableGaps() {
        const vulnerableGaps = [];
        const opponentType = this.aiPlayer === 'X' ? 'O-O' : 'X-X';
        
        if (!this.activeGaps.has(opponentType)) {
            this.log(`⚠️ No opponent gaps of type ${opponentType}`);
            return vulnerableGaps;
        }
        
        const opponentGaps = this.activeGaps.get(opponentType);
        this.log(`🔍 Checking ${opponentGaps.size} validated opponent gaps...`);
        
        for (const gapKey of opponentGaps) {
            if (!this.gaps.has(gapKey)) continue;
            
            const gap = this.gaps.get(gapKey);
            
            // ENHANCED: Re-validate gap before considering attack
            if (!this.isValidGapCell({ row: gap.row, col: gap.col })) {
                this.log(`❌ Skipping invalid gap: (${gap.row},${gap.col})`);
                continue;
            }
            
            // Check if we can attack this gap directly
            if (this.canDirectlyAttackGap(gap)) {
                vulnerableGaps.push({
                    row: gap.row,
                    col: gap.col,
                    patternType: gap.patternType || 'unknown',
                    patternId: gap.patternId || 0,
                    attackMove: { row: gap.row, col: gap.col },
                    priority: this.calculateAttackPriority(gap),
                    reason: `Direct attack: Fill opponent ${gap.patternType || 'unknown'} gap`,
                    strategy: 'direct-gap-fill',
                    validated: true
                });
            }
        }
        
        vulnerableGaps.sort((a, b) => b.priority - a.priority);
        this.log(`⚔️ Found ${vulnerableGaps.length} VALIDATED attackable opponent gaps`);
        return vulnerableGaps;
    }

    // ===== UTILITY AND COMPATIBILITY METHODS =====
    
    validatePosition(pos) {
        return pos && typeof pos.row === 'number' && typeof pos.col === 'number';
    }

    clearAllPatterns() {
        this.patterns.clear();
        this.patternsByType['X-X'].clear();
        this.patternsByType['O-O'].clear();
        this.patternsByType['X-O'].clear();
        this.gaps.clear();
        this.activeGaps.get('X-X').clear();
        this.activeGaps.get('O-O').clear();
        this.activeGaps.get('X-O').clear();
        this.patternCounter = 0;
        
        this.log('🗑️ All patterns cleared');
    }

    canDirectlyAttackGap(gap) {
        if (!gap || typeof gap.row === 'undefined' || typeof gap.col === 'undefined') {
            return false;
        }
        
        return this.gameCore.board[gap.row][gap.col] === '' &&
               this.gameCore.isValidPosition(gap.row, gap.col) &&
               this.gameCore.isValidMove(gap.row, gap.col);
    }

    calculateAttackPriority(gap) {
        let priority = 4000; // Base attack priority
        
        if (gap.patternType === 'L') {
            priority += 2000;
        } else if (gap.patternType === 'I') {
            priority += 1000;
        } else if (gap.patternType === 'D') {
            priority += 1500; // Diagonal patterns are important
        }
        
        return priority;
    }

    // Compatibility methods
    hasAnyGaps() {
        this.autoDetectAndRegisterPatterns();
        const ownGaps = this.activeGaps.get('X-X').size;
        this.log(`📋 AI gaps check: ${ownGaps > 0} (${ownGaps} VALIDATED X-X gaps)`);
        return ownGaps > 0;
    }

    getOwnThreatenedGaps() {
        return this.getThreatenedGapsByType('X-X');
    }

    getOwnUnthreatenedGaps() {
        return this.getUnthreatenedGapsByType('X-X');
    }

    getThreatenedGapsByType(ownershipType) {
        const activeGapSet = this.activeGaps.get(ownershipType);
        const threatenedGaps = [];
        
        for (const gapKey of activeGapSet) {
            const gap = this.gaps.get(gapKey);
            if (this.isGapThreatened(gap)) {
                threatenedGaps.push({
                    row: gap.row,
                    col: gap.col,
                    patternType: gap.patternType,
                    ownershipType: gap.ownershipType,
                    priority: 10000,
                    reason: `Threatened ${gap.patternType} gap`,
                    validated: true
                });
            }
        }
        
        return threatenedGaps.sort((a, b) => b.priority - a.priority);
    }

    getUnthreatenedGapsByType(ownershipType) {
        const activeGapSet = this.activeGaps.get(ownershipType);
        const unthreatenedGaps = [];
        
        for (const gapKey of activeGapSet) {
            const gap = this.gaps.get(gapKey);
            if (!this.isGapThreatened(gap)) {
                unthreatenedGaps.push({
                    row: gap.row,
                    col: gap.col,
                    patternType: gap.patternType,
                    ownershipType: gap.ownershipType,
                    priority: gap.patternType === 'D' ? 1500 : 1000, // Higher priority for diagonal gaps
                    reason: `${gap.patternType} gap`,
                    validated: true
                });
            }
        }
        
        return unthreatenedGaps.sort((a, b) => b.priority - a.priority);
    }

    isGapThreatened(gap) {
        // ENHANCED: Critical gaps are always considered threatened
        if (gap.isCritical) {
            this.log(`🚨 Gap (${gap.row},${gap.col}) is CRITICAL (single point of failure)`);
            return true;
        }

        const opponent = this.aiPlayer === 'X' ? 'O' : 'X';

        // Check adjacent cells for opponent pieces
        const adjacentDirections = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dr, dc] of adjacentDirections) {
            const checkRow = gap.row + dr;
            const checkCol = gap.col + dc;

            if (this.gameCore.isValidPosition(checkRow, checkCol)) {
                if (this.gameCore.board[checkRow][checkCol] === opponent) {
                    return true;
                }
            }
        }

        return false;
    }

    // Compatibility methods
    getThreatenedGaps() { return this.getOwnThreatenedGaps(); }
    getUnthreatenedGaps() { return this.getOwnUnthreatenedGaps(); }
    
    onBoardChanged() {
        this.log('📋 Board changed - triggering STRICT auto-detection...');
        this.autoDetectAndRegisterPatterns();
    }

    getStats() {
        // Count patterns by type
        let lPatterns = 0, iPatterns = 0, dPatterns = 0;
        for (const pattern of this.patterns.values()) {
            if (pattern.type === 'L') lPatterns++;
            else if (pattern.type === 'I') iPatterns++;
            else if (pattern.type === 'D') dPatterns++;
        }
        
        return {
            totalPatterns: this.patterns.size,
            patternsByType: {
                'X-X': this.patternsByType['X-X'].size,
                'O-O': this.patternsByType['O-O'].size,
                'X-O': this.patternsByType['X-O'].size
            },
            patternCounts: {
                L: lPatterns,
                I: iPatterns,
                D: dPatterns
            },
            activeGapsByType: {
                'X-X': this.activeGaps.get('X-X').size,
                'O-O': this.activeGaps.get('O-O').size,
                'X-O': this.activeGaps.get('X-O').size
            },
            totalActiveGaps: this.activeGaps.get('X-X').size + 
                           this.activeGaps.get('O-O').size + 
                           this.activeGaps.get('X-O').size,
            strictValidation: this.strictValidation
        };
    }

    debugGapDetection() {
        const stats = this.getStats();
        
        console.log('\n📋 === FIXED GAP REGISTRY DEBUG ===');
        console.log(`🔍 STRICT VALIDATION MODE: ${this.strictValidation ? 'ENABLED' : 'DISABLED'}`);
        console.log(`Total VALIDATED patterns: ${stats.totalPatterns}`);
        console.log(`  X-X patterns: ${stats.patternsByType['X-X']}`);
        console.log(`  O-O patterns: ${stats.patternsByType['O-O']}`);
        console.log(`  X-O patterns: ${stats.patternsByType['X-O']}`);
        
        console.log(`Pattern types breakdown:`);
        console.log(`  L-patterns: ${stats.patternCounts.L}`);
        console.log(`  I-patterns: ${stats.patternCounts.I}`);
        console.log(`  Diagonal patterns: ${stats.patternCounts.D}`);
        
        console.log(`Active VALIDATED gaps: ${stats.totalActiveGaps}`);
        console.log(`  X-X gaps: ${stats.activeGapsByType['X-X']}`);
        console.log(`  O-O gaps: ${stats.activeGapsByType['O-O']}`);
        console.log(`  X-O gaps: ${stats.activeGapsByType['X-O']}`);
        
        // Show detailed pattern information
        console.log('\n🔍 DETAILED PATTERN ANALYSIS:');
        
        for (const [ownershipType, patternMap] of Object.entries(this.patternsByType)) {
            if (patternMap.size > 0) {
                console.log(`\n${ownershipType} PATTERNS:`);
                for (const [id, pattern] of patternMap) {
                    const patternTypeName = pattern.type === 'D' ? 'Diagonal' : 
                                          pattern.type === 'L' ? 'L-pattern' : 
                                          pattern.type === 'I' ? 'I-pattern' : pattern.type;
                    console.log(`  Pattern #${id}: ${patternTypeName} (${pattern.piece1.row},${pattern.piece1.col}) ↔ (${pattern.piece2.row},${pattern.piece2.col})`);
                    console.log(`    Gaps: ${pattern.gapCells.map(g => `(${g.row},${g.col})`).join(', ')}`);
                }
            }
        }
        
        console.log('\n📋 === END FIXED GAP REGISTRY DEBUG ===\n');
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[FIXED-GAP-REGISTRY] ${message}`);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.UniversalGapRegistry = UniversalGapRegistry;
    window.GapRegistry = UniversalGapRegistry;
}

