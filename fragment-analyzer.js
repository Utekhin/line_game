// fragment-analyzer.js - COMPLETE VERSION with Border-Aware Head Identification
// PRIMARY ROLE: Fragment analysis and data provider for HeadManager
// ARCHITECTURE: Analyzes fragments, identifies heads with metadata, provides strategic metrics
// SEPARATION OF CONCERNS: Provides data, HeadManager makes decisions

class FragmentAnalyzer {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        this.direction = player === 'X' ? 'vertical' : 'horizontal';
        
        // Dependencies (injected by controller)
        this.universalGapCalculator = null;
        this.patternDetector = null;
        this.gapRegistry = null;
        this.geometry = null;
        this.gapBlockingDetector = null;
        
        // Cache for performance
        this._analysisCache = null;
        this._cacheValidUntil = 0;
        this.cacheDuration = 50; // ms
        
        // Debug
        this.debugMode = false;
        this.verboseLogging = false;
        
        this.log('🔬 Fragment Analyzer initialized - Border-aware head identification');
    }

    // ===== DEPENDENCY INJECTION =====
    
    setGapCalculator(calculator) {
        this.universalGapCalculator = calculator;
        this.log('🔗 Universal Gap Calculator injected');
    }
    
    setPatternDetector(detector) {
        this.patternDetector = detector;
        this.log('🔗 Pattern Detector injected');
    }
    
    setGapRegistry(registry) {
        this.gapRegistry = registry;
        this.log('🔗 Gap Registry injected');
    }
    
    setGeometry(geometry) {
        this.geometry = geometry;
        this.log('🔗 GameGeometry injected');
    }

	setGapBlockingDetector(detector) {
    this.gapBlockingDetector = detector;
    this.log('🔗 Gap Blocking Detector injected');
}
    // ===== MAIN ANALYSIS ENTRY POINTS =====
    
    /**
     * PRIMARY: Analyze all player fragments for HeadManager
     * Returns array of fragments with comprehensive strategic analysis
     */
    analyzePlayerFragments() {
        const now = Date.now();
        
        // Use cache if valid
        if (this._analysisCache && now < this._cacheValidUntil) {
            return this._analysisCache;
        }
        
        const pieces = this.gameCore.getPlayerPositions(this.player);
        
        if (pieces.length === 0) {
            this._analysisCache = [];
            this._cacheValidUntil = now + this.cacheDuration;
            return [];
        }
        
        try {
            // Step 1: Build fragments using connectivity
            const fragments = this.buildFragments(pieces);
            
            // Step 2: Analyze each fragment comprehensively
            const analyzedFragments = fragments.map((fragment, index) => {
                const analysis = this.createComprehensiveAnalysis(fragment);
                
                return {
                    id: `frag-${index}`,
                    pieces: fragment.pieces,
                    heads: fragment.heads,
                    analysis: analysis,
                    // Border connection flags
                    connectedToTopBorder: this.isConnectedToBorder(fragment.pieces, 'top'),
                    connectedToBottomBorder: this.isConnectedToBorder(fragment.pieces, 'bottom'),
                    connectedToLeftBorder: this.isConnectedToBorder(fragment.pieces, 'left'),
                    connectedToRightBorder: this.isConnectedToBorder(fragment.pieces, 'right')
                };
            });
            
            // Cache result
            this._analysisCache = analyzedFragments;
            this._cacheValidUntil = now + this.cacheDuration;
            
            if (this.verboseLogging) {
                this.log(`✅ Analyzed ${analyzedFragments.length} fragments`);
            }
            
            return analyzedFragments;
            
        } catch (error) {
            this.log(`❌ Fragment analysis error: ${error.message}`);
            console.error('[FRAGMENT-ANALYZER] Error stack:', error.stack);
            return [];
        }
    }
    
    /**
     * Alias for compatibility
     */
    analyzeAllFragments() {
        return this.analyzePlayerFragments();
    }
    
    analyzeFragments() {
        return this.analyzePlayerFragments();
    }

    // ===== FRAGMENT BUILDING (Using Connectivity) =====
    
    /**
     * Build fragments using pattern-based connectivity
     */
    buildFragments(pieces) {
        if (pieces.length === 0) return [];
        if (pieces.length === 1) {
            const type = this.getHeadType(pieces[0]);
            return [{ 
                pieces: pieces, 
                heads: [this.wrapHeadWithMetadata(pieces[0], type, pieces)]
            }];
        }
        
        // Try pattern-based connectivity first
        if (this.gapRegistry && this.patternDetector) {
            try {
                return this.buildFragmentsUsingPatterns(pieces);
            } catch (error) {
                this.log(`⚠️ Pattern-based fragment building failed: ${error.message}`);
            }
        }
        
        // Fallback: simple adjacency
        return this.buildFragmentsUsingAdjacency(pieces);
    }
    
 /**
 * Build fragments using pattern connections from gap registry
 * FIXED: Properly checks diagonal blocking to split fragments
 * CRITICAL: Uses gameCore.isDiagonalBlocked for consistency
 */
buildFragmentsUsingPatterns(pieces) {
    const connections = [];
    
    // Get all player patterns from gap registry
    const playerPatterns = this.gapRegistry.getPlayerPatterns(this.player);
    
    // PATTERN LINKS: pieces forming patterns (regardless of gap fill status)
    playerPatterns.forEach(pattern => {
        let from, to;
        
        if (pattern.piece1 && pattern.piece2) {
            from = pattern.piece1;
            to = pattern.piece2;
        } else if (pattern.pieces && pattern.pieces.length === 2) {
            from = pattern.pieces[0];
            to = pattern.pieces[1];
        } else {
            return; // Skip invalid patterns
        }
        
        connections.push({
            from: from,
            to: to,
            type: 'pattern-link'
        });
    });
    
    // ADJACENCY LINKS: pieces that touch laterally or diagonally
    // CRITICAL: Check if opponent diagonals block diagonal adjacencies
    pieces.forEach(p1 => {
        pieces.forEach(p2 => {
            if (p1 === p2) return;
            
            const dr = Math.abs(p1.row - p2.row);
            const dc = Math.abs(p1.col - p2.col);
            
            // Check if adjacent (lateral or diagonal)
            if (dr <= 1 && dc <= 1 && (dr + dc > 0)) {
                // For diagonal adjacency, check if opponent blocks
                if (dr === 1 && dc === 1) {
                    // ✅ CRITICAL FIX: Use gameCore method for consistency
                    // This checks if opponent has BOTH crossing cells
                    let isBlocked = false;
                    
                    if (this.gameCore.isDiagonalBlocked) {
                        // Use gameCore's method (preferred)
                        isBlocked = this.gameCore.isDiagonalBlocked(p1, p2, this.player);
                    } else {
                        // Fallback: manual check
                        const cross1 = { row: p1.row, col: p2.col };
                        const cross2 = { row: p2.row, col: p1.col };
                        
                        const cell1 = this.gameCore.board[cross1.row]?.[cross1.col];
                        const cell2 = this.gameCore.board[cross2.row]?.[cross2.col];
                        
                        isBlocked = (cell1 === this.opponent && cell2 === this.opponent);
                    }
                    
                    if (isBlocked) {
                        // Opponent diagonal cuts across - do NOT connect
                        if (this.verboseLogging) {
                            this.log(`🚫 Diagonal blocked: (${p1.row},${p1.col}) ↔ (${p2.row},${p2.col})`);
                        }
                        return; // Skip this connection
                    }
                }
                
                // Connection is valid - add it
                connections.push({
                    from: p1,
                    to: p2,
                    type: 'adjacency-link'
                });
            }
        });
    });
    
    if (this.verboseLogging) {
        this.log(`Built connectivity graph: ${connections.length} connections`);
        const blockedCount = connections.filter(c => c.type === 'blocked').length;
        if (blockedCount > 0) {
            this.log(`  (${blockedCount} blocked diagonals excluded)`);
        }
    }
    
    // Build connectivity graph and find components
    return this.findConnectedComponents(pieces, connections);
}
/**
 * Find connected components using DFS (Depth-First Search)
 * This properly handles BOTH pattern links AND adjacency links
 */
findConnectedComponents(pieces, connections) {
    // Build adjacency list (graph representation)
    const graph = new Map();
    
    // Initialize graph with all pieces
    pieces.forEach(p => {
        const key = `${p.row},${p.col}`;
        graph.set(key, []);
    });
    
    // Add all connections to graph (both directions)
    connections.forEach(conn => {
        const fromKey = `${conn.from.row},${conn.from.col}`;
        const toKey = `${conn.to.row},${conn.to.col}`;
        
        // Add bidirectional edges
        if (graph.has(fromKey)) {
            // Avoid duplicate connections
            const neighbors = graph.get(fromKey);
            if (!neighbors.some(n => n.row === conn.to.row && n.col === conn.to.col)) {
                neighbors.push(conn.to);
            }
        }
        
        if (graph.has(toKey)) {
            const neighbors = graph.get(toKey);
            if (!neighbors.some(n => n.row === conn.from.row && n.col === conn.from.col)) {
                neighbors.push(conn.from);
            }
        }
    });
    
    // DFS to find connected components
    const visited = new Set();
    const fragments = [];
    
    pieces.forEach(piece => {
        const key = `${piece.row},${piece.col}`;
        
        if (!visited.has(key)) {
            // Start new fragment
            const component = [];
            const stack = [piece];
            
            while (stack.length > 0) {
                const current = stack.pop();
                const currentKey = `${current.row},${current.col}`;
                
                if (visited.has(currentKey)) {
                    continue;
                }
                
                visited.add(currentKey);
                component.push(current);
                
                // Add all unvisited neighbors to stack
                const neighbors = graph.get(currentKey) || [];
                neighbors.forEach(neighbor => {
                    const neighborKey = `${neighbor.row},${neighbor.col}`;
                    if (!visited.has(neighborKey)) {
                        stack.push(neighbor);
                    }
                });
            }
            
            if (component.length > 0) {
                fragments.push({
                    pieces: component,
                    heads: this.identifyHeads(component)
                });
            }
        }
    });
    
    this.log(`✅ Built ${fragments.length} fragments from ${pieces.length} pieces`);
    
    if (this.verboseLogging) {
        fragments.forEach((frag, idx) => {
            this.log(`  Fragment ${idx}: ${frag.pieces.length} pieces`);
        });
    }
    
    return fragments;
}


/**
 * Check if two pieces are adjacent (including diagonally)
 */
areAdjacent(p1, p2) {
    const dr = Math.abs(p1.row - p2.row);
    const dc = Math.abs(p1.col - p2.col);
    return (dr <= 1 && dc <= 1 && (dr + dc > 0));
}

/**
 * Check if two pieces are diagonally adjacent (not lateral)
 * @param {object} p1 - First piece {row, col}
 * @param {object} p2 - Second piece {row, col}
 * @returns {boolean} - True if diagonally adjacent
 */
isDiagonalAdjacency(p1, p2) {
    const dr = Math.abs(p1.row - p2.row);
    const dc = Math.abs(p1.col - p2.col);
    // Diagonal if both dr and dc are 1
    return (dr === 1 && dc === 1);
}

/**
 * Check if diagonal connection is blocked by opponent diagonal
 * @param {object} p1 - First piece {row, col}
 * @param {object} p2 - Second piece {row, col}
 * @returns {boolean} - True if blocked by opponent diagonal
 */
isDiagonalBlocked(p1, p2) {
    // Use game core's diagonal blocking check if available
    if (this.gameCore && typeof this.gameCore.isDiagonalBlocked === 'function') {
        return this.gameCore.isDiagonalBlocked(p1, p2, this.player);
    }
    
    // Fallback: manual check for crossing opponent pieces
    const dr = p2.row - p1.row;
    const dc = p2.col - p1.col;
    
    // Not diagonal adjacency
    if (Math.abs(dr) !== 1 || Math.abs(dc) !== 1) {
        return false;
    }
    
    // Get the two crossing cells
    const cross1 = { row: p1.row, col: p2.col };
    const cross2 = { row: p2.row, col: p1.col };
    
    // Check if both crossing cells have opponent pieces
    const cell1 = this.gameCore.board[cross1.row]?.[cross1.col];
    const cell2 = this.gameCore.board[cross2.row]?.[cross2.col];
    
    // Blocked if BOTH crossing cells have opponent pieces
    const blocked = (cell1 === this.opponent && cell2 === this.opponent);
    
    if (blocked && this.verboseLogging) {
        this.log(`Diagonal blocked: ${this.opponent} at (${cross1.row},${cross1.col}) and (${cross2.row},${cross2.col})`);
    }
    
    return blocked;
}
    
    /**
     * Fallback: Build fragments using simple adjacency
     */
    buildFragmentsUsingAdjacency(pieces) {
        const visited = new Set();
        const fragments = [];
        
        pieces.forEach(piece => {
            const key = `${piece.row},${piece.col}`;
            if (!visited.has(key)) {
                const component = this.floodFill(piece, pieces, visited);
                if (component.length > 0) {
                    fragments.push({
                        pieces: component,
                        heads: this.identifyHeads(component)
                    });
                }
            }
        });
        
        return fragments;
    }
    
    /**
     * Find connected components from connections (DFS)
     */
    findConnectedComponents(pieces, connections) {
        const graph = new Map();
        
        // Build adjacency list
        pieces.forEach(p => {
            graph.set(`${p.row},${p.col}`, []);
        });
        
        connections.forEach(conn => {
            const fromKey = `${conn.from.row},${conn.from.col}`;
            const toKey = `${conn.to.row},${conn.to.col}`;
            
            if (graph.has(fromKey)) graph.get(fromKey).push(conn.to);
            if (graph.has(toKey)) graph.get(toKey).push(conn.from);
        });
        
        // DFS to find components
        const visited = new Set();
        const fragments = [];
        
        pieces.forEach(piece => {
            const key = `${piece.row},${piece.col}`;
            if (!visited.has(key)) {
                const component = this.dfsComponent(piece, graph, visited);
                if (component.length > 0) {
                    fragments.push({
                        pieces: component,
                        heads: this.identifyHeads(component)
                    });
                }
            }
        });
        
        return fragments;
    }
    
    /**
     * DFS traversal for connected component
     */
    dfsComponent(start, graph, visited) {
        const component = [];
        const stack = [start];
        
        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.row},${current.col}`;
            
            if (visited.has(key)) continue;
            
            visited.add(key);
            component.push(current);
            
            const neighbors = graph.get(key) || [];
            neighbors.forEach(neighbor => {
                if (!visited.has(`${neighbor.row},${neighbor.col}`)) {
                    stack.push(neighbor);
                }
            });
        }
        
        return component;
    }
    
    /**
     * Simple flood fill for adjacency-based fragments
     */
    floodFill(start, allPieces, visited) {
        const component = [];
        const stack = [start];
        
        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.row},${current.col}`;
            
            if (visited.has(key)) continue;
            
            visited.add(key);
            component.push(current);
            
            // Find adjacent pieces
            allPieces.forEach(piece => {
                const pieceKey = `${piece.row},${piece.col}`;
                if (!visited.has(pieceKey) && this.areAdjacent(current, piece)) {
                    stack.push(piece);
                }
            });
        }
        
        return component;
    }

    // ===== HEAD IDENTIFICATION - BORDER-AWARE =====
    
    /**
     * Identify fragment heads (pieces closest to target borders)
     * PLAYER-INDEPENDENT: Works for both X (vertical) and O (horizontal)
     * BORDER-AWARE: Heads in border zones are properly classified
     * 
     * Border Zones:
     * - X player: Rows 0,1 (north) and 13,14 (south) 
     * - O player: Cols 0,1 (west) and 13,14 (east)
     * 
     * Head Types:
     * - Position 0 or 14: fully-connected (symbolic only)
     * - Position 1 or 13: border-connection (gap-fill only)
     * - Positions 2-12: active (can extend with patterns)
     */
    identifyHeads(pieces) {
        if (!pieces || pieces.length === 0) return [];
        
        // Single piece = that piece is the head
        if (pieces.length === 1) {
            const type = this.getHeadType(pieces[0]);
            return [this.wrapHeadWithMetadata(pieces[0], type, pieces)];
        }
        
        // Determine target axis based on player
        const isVertical = (this.player === 'X');
        const axis = isVertical ? 'row' : 'col';
        const direction1 = isVertical ? 'north' : 'west';
        const direction2 = isVertical ? 'south' : 'east';
        
        // Find extreme positions on target axis
        const positions = pieces.map(p => p[axis]);
        const minPos = Math.min(...positions);
        const maxPos = Math.max(...positions);
        
        // Get candidates at each extreme
        const head1Candidates = pieces.filter(p => p[axis] === minPos);
        const head2Candidates = pieces.filter(p => p[axis] === maxPos);
        
        // Select best from each extreme (fewest adjacencies = true endpoint)
        const head1 = this.selectBestHead(head1Candidates, pieces);
        const head2 = this.selectBestHead(head2Candidates, pieces);
        
        // Determine types based on position
        const type1 = this.getHeadType(head1, direction1);
        const type2 = this.getHeadType(head2, direction2);
        
        // Log results
        this.log(`🎯 ${this.player} Heads: ${direction1} (${head1.row},${head1.col}) [${type1}], ${direction2} (${head2.row},${head2.col}) [${type2}]`);
        
        // Check if fragment spans both borders
        const inBorderZone1 = (head1[axis] <= 1);
        const inBorderZone2 = (head2[axis] >= 13);
        
        if (inBorderZone1 && inBorderZone2) {
            this.log('✅ Fragment spans both borders - chain extension COMPLETE');
        }
        
        // Return heads with metadata
        return [
            this.wrapHeadWithMetadata(head1, type1, pieces, direction1),
            this.wrapHeadWithMetadata(head2, type2, pieces, direction2)
        ];
    }
    
    /**
     * Get head type based on position - PLAYER-INDEPENDENT
     * @param {object} piece - Position {row, col}
     * @param {string} direction - 'north'|'south'|'west'|'east' (optional)
     * @returns {string} 'fully-connected' | 'border-connection' | 'active'
     */
    getHeadType(piece, direction = null) {
        // Determine which coordinate to check based on player
        const pos = (this.player === 'X') ? piece.row : piece.col;
        
        // Determine if this is the near border (0,1) or far border (13,14)
        const isNearBorder = direction === 'north' || direction === 'west';
        
        if (isNearBorder) {
            // Near border: 0 or 1
            if (pos === 0) return 'fully-connected';
            if (pos === 1) return 'border-connection';
            return 'active';
        } else {
            // Far border: 13 or 14
            if (pos === 14) return 'fully-connected';
            if (pos === 13) return 'border-connection';
            return 'active';
        }
    }
    
    /**
     * Wrap head with metadata for move generation
     * @param {object} piece - Position {row, col}
     * @param {string} type - 'fully-connected'|'border-connection'|'active'
     * @param {array} allPieces - All pieces in fragment
     * @param {string} direction - 'north'|'south'|'west'|'east'
     * @returns {object} Head with metadata
     */
    wrapHeadWithMetadata(piece, type, allPieces, direction = null) {
        return {
            // Position
            row: piece.row,
            col: piece.col,
            
            // Head status
            type: type,
            direction: direction,
            
            // Action flags for move generation
            canExtend: (type === 'active'),                      // Can extend with L/I patterns
            needsBorderConnection: (type === 'border-connection'), // Needs gap-fill to border
            isSymbolic: (type === 'fully-connected'),            // Border-connected, tracking only
            
            // Debug info
            _debugInfo: {
                player: this.player,
                adjacencyCount: this.countAdjacencies(piece, allPieces)
            }
        };
    }
    
    /**
     * Count adjacencies for a piece
     */
    countAdjacencies(piece, allPieces) {
        let count = 0;
        allPieces.forEach(other => {
            if (piece === other) return;
            if (this.areAdjacent(piece, other)) {
                count++;
            }
        });
        return count;
    }
    
    /**
     * Select best head from candidates
     * Prefer pieces with fewer adjacencies (true endpoints)
     */
    selectBestHead(candidates, allPieces) {
        if (candidates.length === 1) return candidates[0];
        
        // Count adjacencies for each candidate
        const withCounts = candidates.map(candidate => ({
            piece: candidate,
            count: this.countAdjacencies(candidate, allPieces)
        }));
        
        // Sort by adjacency count (ascending)
        withCounts.sort((a, b) => a.count - b.count);
        
        const selected = withCounts[0];
        this.log(`   Selected from ${candidates.length} candidates: (${selected.piece.row},${selected.piece.col}) with ${selected.count} adjacencies`);
        
        return selected.piece;
    }

    // ===== COMPREHENSIVE STRATEGIC ANALYSIS =====
    
    /**
     * Create comprehensive strategic analysis for HeadManager
     */
    createComprehensiveAnalysis(fragment) {
        const pieces = fragment.pieces || [];
        const heads = fragment.heads || [];
        
        return {
            // 1. Fragment value: Coverage of target axis
            value: this.calculateFragmentValue(pieces),
            coverage: this.calculateCoverage(pieces),
            
            // 2. Border distance: How far from completing
            distanceToBorder: this.calculateBorderDistance(heads),
            
            // 3. Blockage status: Are heads blocked?
            blockageStatus: this.analyzeBlockageStatus(heads),
            
            // 4. Connectivity: Extension potential
            connectivity: this.analyzeConnectivity(heads),
            
            // 5. Span: How spread out is the fragment
            span: this.calculateSpan(pieces),
            
            // 6. Potential heads: Alternative extension points
            potentialHeads: this.findPotentialHeads(pieces, heads)
        };
    }
    
    /**
     * Calculate fragment value (how many rows/cols covered)
     */
    calculateFragmentValue(pieces) {
        if (pieces.length === 0) return 0;
        
        if (this.player === 'X') {
            // Count unique rows covered
            const rows = new Set(pieces.map(p => p.row));
            return rows.size;
        } else {
            // Count unique cols covered
            const cols = new Set(pieces.map(p => p.col));
            return cols.size;
        }
    }
    
    /**
     * Calculate coverage details
     */
    calculateCoverage(pieces) {
        if (pieces.length === 0) return { covered: 0, total: 15, percentage: 0 };
        
        const covered = this.calculateFragmentValue(pieces);
        return {
            covered: covered,
            total: 15,
            percentage: (covered / 15) * 100
        };
    }
    
    /**
     * Calculate border distance for heads
     */
    calculateBorderDistance(heads) {
        if (heads.length === 0) return { min: 15, max: 15, avg: 15 };
        
        const distances = heads.map(head => {
            if (this.player === 'X') {
                return Math.min(head.row, 14 - head.row);
            } else {
                return Math.min(head.col, 14 - head.col);
            }
        });
        
        return {
            min: Math.min(...distances),
            max: Math.max(...distances),
            avg: distances.reduce((a, b) => a + b, 0) / distances.length
        };
    }
    
    /**
     * Analyze blockage status of heads
     */
    analyzeBlockageStatus(heads) {
        if (heads.length === 0) {
            return { fullyBlocked: true, blockedHeadCount: 0, totalHeads: 0 };
        }
        
        let blockedCount = 0;
        
        heads.forEach(head => {
            // Heads in border zones that can't extend are not considered "blocked"
            // They're complete, which is different from blocked
            if (head.isSymbolic || head.needsBorderConnection) {
                return; // Don't count as blocked
            }
            
            if (this.isHeadBlocked(head)) {
                blockedCount++;
            }
        });
        
        return {
            fullyBlocked: blockedCount === heads.filter(h => h.canExtend).length,
            blockedHeadCount: blockedCount,
            totalHeads: heads.length,
            activeHeads: heads.filter(h => h.canExtend).length
        };
    }
    
    /**
     * Check if a head is blocked
     */
    isHeadBlocked(head) {
        // Try geometry-based check first
        if (this.geometry && typeof this.geometry.generatePatternMoves === 'function') {
            const moves = this.geometry.generatePatternMoves(head, {
                patterns: ['L', 'I'],
                filterValid: true
            });
            
            // Filter out occupied cells
            const validMoves = moves.filter(move => {
                return this.gameCore.board[move.row]?.[move.col] === '';
            });
            
            return validMoves.length === 0;
        }
        
        // Fallback: simple 3x3 area check
        let emptyCount = 0;
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = head.row + dr;
                const c = head.col + dc;
                
                if (this.isValidPosition(r, c) && this.gameCore.board[r][c] === '') {
                    emptyCount++;
                }
            }
        }
        
        return emptyCount < 2; // Blocked if less than 2 empty neighbors
    }
    
    /**
     * Analyze connectivity and extension options
     */
    analyzeConnectivity(heads) {
        let totalOptions = 0;
        
        heads.forEach(head => {
            if (head.canExtend) {
                totalOptions += this.countExtensionOptions(head);
            }
        });
        
        const activeHeads = heads.filter(h => h.canExtend).length;
        
        return {
            extensionOptions: totalOptions,
            averagePerHead: activeHeads > 0 ? totalOptions / activeHeads : 0
        };
    }
    
    /**
     * Count extension options for a head
     */
    countExtensionOptions(head) {
        if (this.geometry && typeof this.geometry.generatePatternMoves === 'function') {
            const moves = this.geometry.generatePatternMoves(head, {
                patterns: ['L', 'I'],
                filterValid: true
            });
            
            return moves.filter(move => {
                return this.gameCore.board[move.row]?.[move.col] === '';
            }).length;
        }
        
        // Fallback: count empty L and I pattern positions
        let count = 0;
        const patterns = [
            {dr: -2, dc: -1}, {dr: -2, dc: 1},
            {dr: 2, dc: -1}, {dr: 2, dc: 1},
            {dr: -1, dc: -2}, {dr: -1, dc: 2},
            {dr: 1, dc: -2}, {dr: 1, dc: 2},
            {dr: -2, dc: 0}, {dr: 2, dc: 0},
            {dr: 0, dc: -2}, {dr: 0, dc: 2}
        ];
        
        patterns.forEach(p => {
            const r = head.row + p.dr;
            const c = head.col + p.dc;
            if (this.isValidPosition(r, c) && this.gameCore.board[r][c] === '') {
                count++;
            }
        });
        
        return count;
    }
    
    /**
     * Calculate fragment span
     */
    calculateSpan(pieces) {
        if (pieces.length === 0) return { rows: 0, cols: 0 };
        
        const rows = pieces.map(p => p.row);
        const cols = pieces.map(p => p.col);
        
        return {
            rows: Math.max(...rows) - Math.min(...rows) + 1,
            cols: Math.max(...cols) - Math.min(...cols) + 1
        };
    }
    
    /**
     * Find potential heads for mid-chain branching
     */
    findPotentialHeads(pieces, currentHeads) {
        // Pieces that could serve as alternative heads if current heads blocked
        const potentials = pieces.filter(piece => {
            // Not already a head
            const isCurrentHead = currentHeads.some(h => 
                h.row === piece.row && h.col === piece.col
            );
            if (isCurrentHead) return false;
            
            // Has extension options
            return this.countExtensionOptions(piece) > 0;
        });
        
        return potentials;
    }

    // ===== BORDER CONNECTION CHECKS =====
    
    /**
     * Check if fragment is connected to a specific border
     */
    isConnectedToBorder(pieces, border) {
        if (!pieces || pieces.length === 0) return false;
        
        return pieces.some(piece => {
            switch (border) {
                case 'top': return piece.row === 0;
                case 'bottom': return piece.row === 14;
                case 'left': return piece.col === 0;
                case 'right': return piece.col === 14;
                default: return false;
            }
        });
    }

    // ===== UTILITY METHODS =====
    
    /**
     * Check if two pieces are adjacent (including diagonally)
     */
    areAdjacent(p1, p2) {
        const dr = Math.abs(p1.row - p2.row);
        const dc = Math.abs(p1.col - p2.col);
        return (dr <= 1 && dc <= 1 && (dr + dc > 0));
    }
    
    /**
     * Validate position
     */
    isValidPosition(row, col) {
        return row >= 0 && row < this.gameCore.size && 
               col >= 0 && col < this.gameCore.size;
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this._analysisCache = null;
        this._cacheValidUntil = 0;
    }
    
    /**
     * Set debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.verboseLogging = enabled;
    }
    
    /**
     * Logging
     */
    log(message) {
        if (this.debugMode) {
            console.log(`[FRAGMENT-ANALYZER] ${message}`);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.FragmentAnalyzer = FragmentAnalyzer;
    console.log('✅ Fragment Analyzer loaded - Border-aware head identification with proper separation of concerns');
}