// game-geometry-utils.js - Complete Mathematical Geometry Module
// Universal source of truth for all pattern calculations

class GameGeometry {
    constructor(boardSize = 15, directionConfig = null) {
        this.boardSize = boardSize;
        this.debugMode = false;
        
        // Integrate direction configuration
        this.directionConfig = directionConfig;
        
        // Mathematical pattern definitions - abstract vectors
        this.PATTERN_VECTORS = {
            L: [
                [-2, -1], [-2, 1], [2, -1], [2, 1],    // Vertical L-patterns  
                [-1, -2], [1, -2], [-1, 2], [1, 2]     // Horizontal L-patterns
            ],
            I: [
                [-2, 0], [2, 0], [0, -2], [0, 2]       // Straight line patterns
            ],
            D: [
                [-2, -2], [-2, 2], [2, -2], [2, 2]     // Diagonal patterns (future use)
            ]
        };
        
        // Mathematical direction vectors
        this.DIRECTION_VECTORS = {
            north: [-1, 0], south: [1, 0],
            west: [0, -1], east: [0, 1],
            northwest: [-1, -1], northeast: [-1, 1],
            southwest: [1, -1], southeast: [1, 1]
        };
        
        console.log(`🔬 Mathematical GameGeometry initialized (${boardSize}x${boardSize})`);
    }

    // ===== BASIC POSITION VALIDATION =====

    isValidPosition(row, col) {
        return (
            row >= 0 && row < this.boardSize &&
            col >= 0 && col < this.boardSize
        );
    }

    isValidPositionObject(pos) {
        return (
            pos && 
            typeof pos.row === 'number' && 
            typeof pos.col === 'number' &&
            this.isValidPosition(pos.row, pos.col)
        );
    }

    normalizePosition(rowOrPos, col = null) {
        if (col !== null) {
            return { row: rowOrPos, col: col };
        } else if (this.isValidPositionObject(rowOrPos)) {
            return rowOrPos;
        } else {
            throw new Error('Invalid position format');
        }
    }

    arePositionsAdjacent(pos1, pos2) {
        const p1 = this.normalizePosition(pos1);
        const p2 = this.normalizePosition(pos2);
        
        const dr = Math.abs(p2.row - p1.row);
        const dc = Math.abs(p2.col - p1.col);
        
        return (dr <= 1 && dc <= 1) && !(dr === 0 && dc === 0);
    }

    // ===== MATHEMATICAL PATTERN GENERATION =====

    generatePatternMoves(fromPosition, options = {}) {
        const defaults = {
            patterns: ['L', 'I'],           // Pattern types to generate
            filterValid: true,               // Filter by board boundaries  
            includeMetadata: true,           // Include mathematical analysis
            directionFilter: null,           // Filter by direction vector
            playerConfig: null              // Player-specific configuration
        };
        const opts = { ...defaults, ...options };
        
        const from = this.normalizePosition(fromPosition);
        if (!this.isValidPositionObject(from)) {
            this.debugLog(`❌ Invalid position: ${JSON.stringify(fromPosition)}`);
            return [];
        }
        
        this.debugLog(`🎯 Generating patterns: ${opts.patterns.join('+')} from (${from.row},${from.col})`);
        
        let moves = [];
        
        // Generate each requested pattern type
        for (const patternType of opts.patterns) {
            if (this.PATTERN_VECTORS[patternType]) {
                moves.push(...this.generateVectorPatternMoves(from, patternType, opts));
            }
        }
        
        // Apply mathematical filters
        moves = this.applyGeometricFilters(moves, opts);
        
        this.debugLog(`✅ Generated ${moves.length} pattern moves`);
        return moves;
    }

    generateVectorPatternMoves(fromPosition, patternType, options) {
        const vectors = this.PATTERN_VECTORS[patternType];
        const moves = [];
        
        for (const [dr, dc] of vectors) {
            const move = {
                row: fromPosition.row + dr,
                col: fromPosition.col + dc,
                pattern: patternType,
                vector: [dr, dc],
                fromPosition: fromPosition
            };
            
            if (options.includeMetadata) {
                // Mathematical classification
                move.vectorMagnitude = Math.sqrt(dr * dr + dc * dc);
                move.vectorAngle = Math.atan2(dr, dc);
                move.patternOrientation = this.classifyPatternOrientation(dr, dc, patternType);
                move.strategicDirection = this.getVectorDirection(dr, dc);
                move.borderAlignment = this.calculateBorderAlignment(move, options.playerConfig);
            }
            
            moves.push(move);
        }
        
        this.debugLog(`🔍 Generated ${moves.length} ${patternType}-pattern moves`);
        return moves;
    }

    // ===== MATHEMATICAL CLASSIFICATION =====

    classifyPatternOrientation(dr, dc, patternType) {
        if (patternType === 'L') {
            return Math.abs(dr) > Math.abs(dc) ? 'vertical' : 'horizontal';
        } else if (patternType === 'I') {
            if (dr === 0) return 'horizontal';
            if (dc === 0) return 'vertical';
        } else if (patternType === 'D') {
            if (dr * dc > 0) return 'main-diagonal';
            return 'anti-diagonal';
        }
        return 'undefined';
    }

    getVectorDirection(dr, dc) {
        if (dr === 0 && dc !== 0) return dc > 0 ? 'east' : 'west';
        if (dc === 0 && dr !== 0) return dr > 0 ? 'south' : 'north';
        
        if (dr < 0 && dc < 0) return 'northwest';
        if (dr < 0 && dc > 0) return 'northeast';
        if (dr > 0 && dc < 0) return 'southwest';
        if (dr > 0 && dc > 0) return 'southeast';
        
        return 'undefined';
    }

    // ===== BORDER CALCULATIONS =====

    calculateBorderAlignment(move, playerConfig) {
        if (!playerConfig) return 0;
        
        const pos = this.normalizePosition(move);
        let alignment = 0;
        
        if (playerConfig.direction === 'vertical') {
            const topDistance = pos.row - playerConfig.startEdge;
            const bottomDistance = playerConfig.endEdge(this.boardSize) - pos.row;
            alignment = Math.min(topDistance, bottomDistance);
        } else {
            const leftDistance = pos.col - playerConfig.startEdge;
            const rightDistance = playerConfig.endEdge(this.boardSize) - pos.col;
            alignment = Math.min(leftDistance, rightDistance);
        }
        
        return alignment;
    }


/**
 * ADAPTER: Provide border distances in format expected by HeadManager
 * USES: Existing calculateMathematicalBorderDistance (player-independent advantage)
 * RETURNS: {top, bottom, left, right} format for direction decisions
 */
calculateBorderDistances(position) {
    const pos = this.normalizePosition(position);
    
    if (!this.isValidPositionObject(pos)) {
        console.error('Invalid position for border distance calculation:', position);
        return { top: Infinity, bottom: Infinity, left: Infinity, right: Infinity };
    }
    
    // Simple direct calculations using existing pattern
    // This is player-independent and follows same logic as calculateMathematicalBorderDistance
    const distances = {
        top: pos.row,                               // Distance to row 0 (north border)
        bottom: (this.boardSize - 1) - pos.row,    // Distance to row 14 (south border)  
        left: pos.col,                              // Distance to col 0 (west border)
        right: (this.boardSize - 1) - pos.col      // Distance to col 14 (east border)
    };
    
    // Debug logging if enabled (consistent with existing methods)
    if (this.debugMode) {
        console.log(`[GEOMETRY] Border distances for (${pos.row},${pos.col}):`, distances);
    }
    
    return distances;
}

    calculateMathematicalBorderDistance(position, playerConfig, borderType = 'near') {
        const pos = this.normalizePosition(position);
        
        if (playerConfig.direction === 'vertical') {
            if (borderType === 'near') {
                return pos.row - playerConfig.startEdge;
            } else {
                return playerConfig.endEdge(this.boardSize) - pos.row;
            }
        } else {
            if (borderType === 'near') {
                return pos.col - playerConfig.startEdge;
            } else {
                return playerConfig.endEdge(this.boardSize) - pos.col;
            }
        }
    }

    // ===== FILTERING METHODS =====

    applyGeometricFilters(moves, options) {
        let filteredMoves = moves;
        
        if (options.filterValid) {
            filteredMoves = filteredMoves.filter(move => 
                this.isValidPosition(move.row, move.col)
            );
        }
        
        if (options.directionFilter) {
            const directionVector = this.DIRECTION_VECTORS[options.directionFilter];
            if (directionVector) {
                filteredMoves = filteredMoves.filter(move => 
                    this.vectorAlignsWith(move.vector, directionVector)
                );
            }
        }
        
        if (options.playerConfig) {
            filteredMoves = this.applyPlayerConfigurationFilter(filteredMoves, options.playerConfig);
        }
        
        return filteredMoves;
    }

    applyPlayerConfigurationFilter(moves, playerConfig) {
        return moves.map(move => {
            let priority = 50;
            
            if (playerConfig.isValidPattern) {
                const [dr, dc] = move.vector;
                const isValidForPlayer = playerConfig.isValidPattern(dr, dc);
                if (!isValidForPlayer) {
                    priority -= 50;
                }
            }
            
            if (playerConfig.direction === 'vertical') {
                if (move.pattern === 'L' && move.patternOrientation === 'vertical') {
                    priority += 30;
                } else if (move.pattern === 'L' && move.patternOrientation === 'horizontal') {
                    priority -= 20;
                }
                
                if (move.strategicDirection === 'north' || move.strategicDirection === 'south') {
                    priority += 15;
                }
            } else {
                if (move.pattern === 'L' && move.patternOrientation === 'horizontal') {
                    priority += 30;
                } else if (move.pattern === 'L' && move.patternOrientation === 'vertical') {
                    priority -= 20;
                }
                
                if (move.strategicDirection === 'east' || move.strategicDirection === 'west') {
                    priority += 15;
                }
            }
            
            priority += Math.max(0, 15 - move.borderAlignment * 2);
            
            return { ...move, priority };
        }).sort((a, b) => b.priority - a.priority);
    }

    // ===== VECTOR MATHEMATICS =====

    vectorAlignsWith(moveVector, directionVector, threshold = 0.5) {
        const [dr1, dc1] = moveVector;
        const [dr2, dc2] = directionVector;
        
        const dotProduct = dr1 * dr2 + dc1 * dc2;
        const magnitude1 = Math.sqrt(dr1 * dr1 + dc1 * dc1);
        const magnitude2 = Math.sqrt(dr2 * dr2 + dc2 * dc2);
        
        const cosineAngle = dotProduct / (magnitude1 * magnitude2);
        return cosineAngle >= threshold;
    }

    // ===== PATTERN TYPE DETECTION =====

    getPatternTypeAdvanced(pos1, pos2) {
        const p1 = this.normalizePosition(pos1);
        const p2 = this.normalizePosition(pos2);
        
        const dr = p2.row - p1.row;
        const dc = p2.col - p1.col;
        const vector = [dr, dc];
        
        for (const [patternType, vectors] of Object.entries(this.PATTERN_VECTORS)) {
            for (const patternVector of vectors) {
                if (patternVector[0] === Math.abs(dr) && patternVector[1] === Math.abs(dc)) {
                    return {
                        type: patternType,
                        vector: vector,
                        orientation: this.classifyPatternOrientation(dr, dc, patternType),
                        direction: this.getVectorDirection(dr, dc)
                    };
                }
            }
        }
        
        if (this.arePositionsAdjacent(pos1, pos2)) {
            return { type: 'adjacent', vector: vector };
        }
        
        return { type: null, vector: vector };
    }

    // ===== CONFIGURATION METHODS =====

    setDirectionConfiguration(directionConfig) {
        this.directionConfig = directionConfig;
        this.debugLog('🔧 Direction configuration updated');
    }

    isValidPatternForConfiguration(vector, directionConfig) {
        if (!directionConfig || !directionConfig.isValidPattern) return true;
        
        const [dr, dc] = vector;
        return directionConfig.isValidPattern(dr, dc);
    }

    // ===== DEBUG UTILITIES =====

    debugPattern(pos1, pos2) {
        const analysis = this.getPatternTypeAdvanced(pos1, pos2);
        
        console.log(`🔬 Mathematical Pattern Analysis:`);
        console.log(`   Positions: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col})`);
        console.log(`   Vector: [${analysis.vector.join(', ')}]`);
        console.log(`   Type: ${analysis.type || 'none'}`);
        console.log(`   Orientation: ${analysis.orientation || 'none'}`);
        console.log(`   Direction: ${analysis.direction || 'none'}`);
    }

    debugLog(message) {
        if (this.debugMode) {
            console.log(`[GAME-GEOMETRY] ${message}`);
        }
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// ===== FACTORY FUNCTION =====

function createGameGeometry(boardSize = 15) {
    return new GameGeometry(boardSize);
}

// ===== BROWSER EXPORT =====

if (typeof window !== 'undefined') {
    window.GameGeometry = GameGeometry;
    window.createGameGeometry = createGameGeometry;
    
    console.log('🔬 Mathematical GameGeometry exported to window');
    console.log('🎯 Usage: new GameGeometry(15) or createGameGeometry(15)');
} else {
    console.warn('⚠️ Non-browser environment detected');
}