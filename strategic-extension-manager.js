// strategic-extension-manager.js
// Unified manager for all non-endpoint extension strategies
// Handles: fragment bridging, alternative border routes, blocked head workarounds

class StrategicExtensionManager {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        
        // Dependencies (injected)
        this.geometry = null;
        this.fragmentAnalyzer = null;
        
        // Configuration: Scoring weights for different modes
        this.scoringWeights = {
            'fragment-bridging': {
                distanceToTarget: 15,      // Very important to be close to gap
                extensionClearance: 20,    // Need space to extend
                opponentResistance: -25,   // Avoid opponent blocks
                congestionPenalty: -30,    // Avoid crowded areas
                borderProximity: 8         // Slight preference for pieces near borders
            },
            'border-extension': {
                distanceToTarget: 12,      // Important to reach border
                extensionClearance: 25,    // Critical to have clear path
                opponentResistance: -35,   // Very important to avoid blocks
                congestionPenalty: -20,    // Somewhat important
                borderProximity: 15        // Strong preference for border-directed pieces
            },
            'tactical-branching': {
                distanceToTarget: 10,      // Moderate importance
                extensionClearance: 22,    // Important
                opponentResistance: -28,   // Important to avoid
                congestionPenalty: -35,    // Very important to avoid
                borderProximity: 5         // Slight preference
            }
        };
        
        // History tracking (from branching-manager.js)
        this.extensionHistory = [];
        this.reassignmentHistory = [];
        
        this.debugMode = true;
        
        this.log('🌿 Strategic Extension Manager initialized');
    }
    
    // ===== CONTROL METHODS (from branching-manager.js pattern) =====
    
    enable() {
        this.enabled = true;
        this.log('Strategic Extension Manager ENABLED');
    }
    
    disable() {
        this.enabled = false;
        this.log('Strategic Extension Manager DISABLED');
    }
    
    reset() {
        this.extensionHistory = [];
        this.reassignmentHistory = [];
        this.log('Strategic Extension Manager reset');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEPENDENCY INJECTION
    // ═══════════════════════════════════════════════════════════════════════

    setGeometry(geometry) {
        this.geometry = geometry;
        this.log('🔗 Geometry connected');
    }

    setFragmentAnalyzer(analyzer) {
        this.fragmentAnalyzer = analyzer;
        this.log('🔗 Fragment Analyzer connected');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MAIN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Main method: Select best strategic extension when endpoint heads fail
     * 
     * @param {Object} fragment - Current active fragment
     * @param {Array} allFragments - All player fragments
     * @param {Object} context - Additional context (move count, game state, etc.)
     * @returns {Object|null} - { head, direction, target, mode, priority } or null
     */
    selectStrategicExtension(fragment, allFragments, context = {}) {
        this.log('🌿 === STRATEGIC EXTENSION SELECTION ===');
        
        if (!fragment || !fragment.pieces || fragment.pieces.length < 2) {
            this.log('❌ Fragment too small for strategic extension');
            return null;
        }
        
        // Step 1: Identify all possible extension targets
        const targets = this.identifyExtensionTargets(fragment, allFragments);
        
        if (targets.length === 0) {
            this.log('❌ No extension targets identified');
            return null;
        }
        
        this.log(`📍 Found ${targets.length} potential targets:`);
        targets.forEach((t, i) => {
            this.log(`   ${i + 1}. ${t.type} - Priority: ${t.priority}`);
        });
        
        // Step 2: For each target, find and score candidates
        const allCandidates = [];
        
        for (const target of targets) {
            const candidates = this.evaluateCandidatesForTarget(fragment, target);
            allCandidates.push(...candidates);
        }
        
        if (allCandidates.length === 0) {
            this.log('❌ No viable candidates found for any target');
            return null;
        }
        
        // Step 3: Select best candidate across all targets
        allCandidates.sort((a, b) => b.totalScore - a.totalScore);
        const best = allCandidates[0];
        
        this.log(`✅ Selected: (${best.piece.row},${best.piece.col}) → ${best.direction}`);
        this.log(`   Mode: ${best.target.type}`);
        this.log(`   Score: ${best.totalScore.toFixed(1)}`);
        
        return {
            head: {
                row: best.piece.row,
                col: best.piece.col,
                type: 'strategic-extension',
                mode: best.target.type
            },
            direction: best.direction,
            target: best.target,
            mode: best.target.type,
            priority: best.target.priority,
            score: best.totalScore,
            metadata: best.scoreBreakdown
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TARGET IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Identify all possible extension targets
     * 
     * @param {Object} fragment - Current fragment
     * @param {Array} allFragments - All player fragments
     * @returns {Array} - Array of target objects, sorted by priority
     */
    identifyExtensionTargets(fragment, allFragments) {
        const targets = [];
        
        // 1. Fragment connection opportunities (highest priority if win condition)
        if (allFragments && allFragments.length > 1) {
            const connections = this.detectFragmentConnections(allFragments, fragment);
            targets.push(...connections);
        }
        
        // 2. Border extension opportunities
        const borders = this.detectBorderTargets(fragment);
        targets.push(...borders);
        
        // 3. Future: Strategic positions, defensive moves, etc.
        
        // Sort by priority (highest first)
        return targets.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Detect fragment connection opportunities
     * 
     * @param {Array} fragments - All fragments
     * @param {Object} currentFragment - Fragment to extend from
     * @returns {Array} - Array of connection target objects
     */
    detectFragmentConnections(fragments, currentFragment) {
        if (fragments.length < 2) return [];
        
        this.log('🔗 Detecting fragment connection opportunities...');
        
        const connections = [];
        const axis = this.player === 'X' ? 'row' : 'col';
        
        // Get current fragment's position range
        const currentPositions = currentFragment.pieces.map(p => p[axis]);
        const currentMin = Math.min(...currentPositions);
        const currentMax = Math.max(...currentPositions);
        
        // Check other fragments
        for (const otherFragment of fragments) {
            // Skip if same fragment
            if (otherFragment === currentFragment) continue;
            
            const otherPositions = otherFragment.pieces.map(p => p[axis]);
            const otherMin = Math.min(...otherPositions);
            const otherMax = Math.max(...otherPositions);
            
            // Check if fragments are separated
            const areSeparated = (currentMax < otherMin) || (otherMax < currentMin);
            if (!areSeparated) continue;
            
            // Calculate gap
            let gapStart, gapEnd, gapDistance, direction;
            if (currentMax < otherMin) {
                // Current fragment is above/left of other
                gapStart = currentMax;
                gapEnd = otherMin;
                gapDistance = otherMin - currentMax - 1;
                direction = this.player === 'X' ? 'south' : 'east';
            } else {
                // Current fragment is below/right of other
                gapStart = otherMax;
                gapEnd = currentMin;
                gapDistance = currentMin - otherMax - 1;
                direction = this.player === 'X' ? 'north' : 'west';
            }
            
            // Check if both fragments are border-connected
            const currentBorderStatus = this.getFragmentBorderStatus(currentFragment);
            const otherBorderStatus = this.getFragmentBorderStatus(otherFragment);
            
            const bothBorderConnected = 
                (currentBorderStatus.north && otherBorderStatus.south) ||
                (currentBorderStatus.south && otherBorderStatus.north) ||
                (currentBorderStatus.west && otherBorderStatus.east) ||
                (currentBorderStatus.east && otherBorderStatus.west);
            
            // Calculate priority
            let priority = 0;
            
            // CRITICAL: Both fragments reach opposite borders = WIN
            if (bothBorderConnected) {
                priority += 1000;
                this.log(`   🎯 CRITICAL CONNECTION: Both fragments border-connected!`);
            }
            
            // Closer gaps are easier
            priority += Math.max(0, 100 - gapDistance * 10);
            
            // Larger fragments are more valuable
            priority += (currentFragment.pieces.length + otherFragment.pieces.length) * 2;
            
            if (priority > 50 || bothBorderConnected) {
                connections.push({
                    type: 'fragment-bridging',
                    direction: direction,
                    position: Math.floor((gapStart + gapEnd) / 2), // Gap center
                    priority: priority,
                    metadata: {
                        gapStart,
                        gapEnd,
                        gapDistance,
                        targetFragment: otherFragment,
                        bothBorderConnected,
                        winningMove: bothBorderConnected
                    }
                });
                
                this.log(`   Found connection: gap ${gapStart}-${gapEnd}, priority ${priority}`);
            }
        }
        
        return connections;
    }

    /**
     * Detect border extension opportunities
     * 
     * @param {Object} fragment - Current fragment
     * @returns {Array} - Array of border target objects
     */
    detectBorderTargets(fragment) {
        const targets = [];
        const axis = this.player === 'X' ? 'row' : 'col';
        const positions = fragment.pieces.map(p => p[axis]);
        const minPos = Math.min(...positions);
        const maxPos = Math.max(...positions);
        
        const borderStatus = this.getFragmentBorderStatus(fragment);
        
        // North/West border target
        if (!borderStatus.north && minPos > 2) {
            const distanceToBorder = minPos;
            const direction = this.player === 'X' ? 'north' : 'west';
            
            targets.push({
                type: 'border-extension',
                direction: direction,
                position: 0, // Target border
                priority: 200 - distanceToBorder * 5, // Closer is better
                metadata: {
                    border: direction,
                    distance: distanceToBorder,
                    currentEdge: minPos
                }
            });
        }
        
        // South/East border target
        if (!borderStatus.south && maxPos < 12) {
            const distanceToBorder = 14 - maxPos;
            const direction = this.player === 'X' ? 'south' : 'east';
            
            targets.push({
                type: 'border-extension',
                direction: direction,
                position: 14, // Target border
                priority: 200 - distanceToBorder * 5,
                metadata: {
                    border: direction,
                    distance: distanceToBorder,
                    currentEdge: maxPos
                }
            });
        }
        
        return targets;
    }

    /**
     * Get fragment's border connection status
     */
    getFragmentBorderStatus(fragment) {
        const axis = this.player === 'X' ? 'row' : 'col';
        const positions = fragment.pieces.map(p => p[axis]);
        const minPos = Math.min(...positions);
        const maxPos = Math.max(...positions);
        
        return {
            north: minPos <= 1,
            south: maxPos >= 13,
            west: minPos <= 1,
            east: maxPos >= 13
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CANDIDATE EVALUATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Evaluate all candidates for a specific target
     * 
     * @param {Object} fragment - Current fragment
     * @param {Object} target - Target to reach
     * @returns {Array} - Array of scored candidates
     */
    evaluateCandidatesForTarget(fragment, target) {
        // Get mid-chain pieces (exclude endpoints)
        const endpoints = fragment.heads || [];
        const endpointKeys = new Set(endpoints.map(h => `${h.row},${h.col}`));
        
        const midChainPieces = fragment.pieces.filter(p => {
            const key = `${p.row},${p.col}`;
            const isEndpoint = endpointKeys.has(key);
            const inBorderZone = this.isInBorderZone(p);
            return !isEndpoint && !inBorderZone;
        });
        
        if (midChainPieces.length === 0) {
            return [];
        }
        
        const candidates = [];
        
        // Evaluate each piece in target direction
        for (const piece of midChainPieces) {
            const score = this.scoreExtensionCandidate(piece, target);
            
            if (score.totalScore > 0) {
                candidates.push({
                    piece: piece,
                    direction: target.direction,
                    target: target,
                    totalScore: score.totalScore,
                    scoreBreakdown: score
                });
            }
        }
        
        return candidates;
    }

    /**
     * Unified scoring function for any piece extending toward any target
     * 
     * @param {Object} piece - Position to evaluate
     * @param {Object} target - Target to reach
     * @returns {Object} - Score breakdown
     */
    scoreExtensionCandidate(piece, target) {
        const mode = target.type;
        const weights = this.scoringWeights[mode] || this.scoringWeights['tactical-branching'];
        
        // Component scores
        const distanceScore = this.calculateDistanceToTarget(piece, target) * weights.distanceToTarget;
        const clearanceScore = this.calculateExtensionClearance(piece, target.direction, 3) * weights.extensionClearance;
        const resistanceScore = this.calculateOpponentResistance(piece, target.direction, 3) * weights.opponentResistance;
        const congestionScore = this.calculateCongestion(piece, 2) * weights.congestionPenalty;
        const borderScore = this.calculateBorderProximity(piece, target.direction) * weights.borderProximity;
        
        const totalScore = distanceScore + clearanceScore + resistanceScore + congestionScore + borderScore;
        
        return {
            totalScore: Math.max(0, totalScore),
            distance: distanceScore,
            clearance: clearanceScore,
            resistance: resistanceScore,
            congestion: congestionScore,
            border: borderScore
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCORING COMPONENTS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Calculate distance score (higher = closer to target)
     */
    calculateDistanceToTarget(piece, target) {
        const axis = this.player === 'X' ? 'row' : 'col';
        const piecePos = piece[axis];
        const targetPos = target.position;
        
        // For border targets (position 0 or 14)
        if (targetPos === 0 || targetPos === 14) {
            const distance = Math.abs(piecePos - targetPos);
            return Math.max(0, 10 - distance * 0.8);
        }
        
        // For fragment bridging (target is gap center)
        const distance = Math.abs(piecePos - targetPos);
        return Math.max(0, 10 - distance);
    }

    /**
     * Calculate extension clearance (how many empty cells ahead)
     */
    calculateExtensionClearance(piece, direction, range) {
        let emptyCount = 0;
        
        for (let dist = 1; dist <= range; dist++) {
            const pos = this.getPositionInDirection(piece, direction, dist);
            
            if (!this.gameCore.isValidPosition(pos.row, pos.col)) break;
            
            if (this.gameCore.board[pos.row][pos.col] === '') {
                emptyCount++;
            }
        }
        
        return emptyCount; // Returns 0-3
    }

    /**
     * Calculate opponent resistance (lower = less resistance)
     */
    calculateOpponentResistance(piece, direction, range) {
        let resistance = 0;
        
        for (let dist = 1; dist <= range; dist++) {
            const pos = this.getPositionInDirection(piece, direction, dist);
            
            if (!this.gameCore.isValidPosition(pos.row, pos.col)) break;
            
            if (this.gameCore.board[pos.row][pos.col] === this.opponent) {
                resistance += (1.0 / dist); // Closer opponents weigh more
            }
        }
        
        return Math.min(1.0, resistance); // Normalized 0-1
    }

    /**
     * Calculate congestion level (0-1, higher = more congested)
     */
    calculateCongestion(piece, radius) {
        let occupiedCount = 0;
        let totalCount = 0;
        
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const r = piece.row + dr;
                const c = piece.col + dc;
                
                if (this.gameCore.isValidPosition(r, c)) {
                    totalCount++;
                    if (this.gameCore.board[r][c] !== '') {
                        occupiedCount++;
                    }
                }
            }
        }
        
        return totalCount > 0 ? occupiedCount / totalCount : 0;
    }

    /**
     * Calculate border proximity bonus (pieces moving toward borders)
     */
    calculateBorderProximity(piece, direction) {
        const axis = this.player === 'X' ? 'row' : 'col';
        const pos = piece[axis];
        
        if (direction === 'north' || direction === 'west') {
            // Moving toward 0
            return Math.max(0, 10 - pos);
        } else {
            // Moving toward 14
            return Math.max(0, pos - 4);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Check if piece is in border zone (rows/cols 0, 1, 13, 14)
     */
    isInBorderZone(piece) {
        return piece.row <= 1 || piece.row >= 13 || piece.col <= 1 || piece.col >= 13;
    }

    /**
     * Get position at distance in direction
     */
    getPositionInDirection(piece, direction, distance) {
        let row = piece.row;
        let col = piece.col;
        
        switch (direction) {
            case 'north': row -= distance; break;
            case 'south': row += distance; break;
            case 'west': col -= distance; break;
            case 'east': col += distance; break;
        }
        
        return { row, col };
    }

    /**
     * Analyze specific fragment pair connection
     * (Kept for potential external use)
     */
    analyzeFragmentPairConnection(frag1, frag2) {
        const axis = this.player === 'X' ? 'row' : 'col';
        
        const frag1Positions = frag1.pieces.map(p => p[axis]);
        const frag2Positions = frag2.pieces.map(p => p[axis]);
        
        const frag1Min = Math.min(...frag1Positions);
        const frag1Max = Math.max(...frag1Positions);
        const frag2Min = Math.min(...frag2Positions);
        const frag2Max = Math.max(...frag2Positions);
        
        const areSeparated = (frag1Max < frag2Min) || (frag2Max < frag1Min);
        
        if (!areSeparated) {
            return { worthBridging: false, reason: 'fragments-overlap' };
        }
        
        let gapStart, gapEnd, gapDistance;
        if (frag1Max < frag2Min) {
            gapStart = frag1Max;
            gapEnd = frag2Min;
            gapDistance = frag2Min - frag1Max - 1;
        } else {
            gapStart = frag2Max;
            gapEnd = frag1Min;
            gapDistance = frag1Min - frag2Max - 1;
        }
        
        const frag1BorderConnected = this.getFragmentBorderStatus(frag1);
        const frag2BorderConnected = this.getFragmentBorderStatus(frag2);
        
        const bothBorderConnected = 
            (frag1BorderConnected.north && frag2BorderConnected.south) ||
            (frag1BorderConnected.south && frag2BorderConnected.north);
        
        let priority = 0;
        if (bothBorderConnected) priority += 1000;
        priority += Math.max(0, 100 - gapDistance * 10);
        priority += (frag1.pieces.length + frag2.pieces.length) * 2;
        
        return {
            worthBridging: priority > 50 || bothBorderConnected,
            gapStart,
            gapEnd,
            gapDistance,
            bothBorderConnected,
            priority
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOGGING
    // ═══════════════════════════════════════════════════════════════════════

    log(message) {
        if (this.debugMode) {
            console.log(`[STRATEGIC-EXT] ${message}`);
        }
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// BROWSER EXPORT
// ═══════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.StrategicExtensionManager = StrategicExtensionManager;
    console.log('✅ Strategic Extension Manager loaded');
}