// gap-analyzer.js - REAL FIX: Eliminate Cache Spam and Lightweight hasAnyGaps
// Addresses root cause of excessive logging and calls

class GapAnalyzer {
    constructor(gameEngine, patternDetector) {
        this.gameEngine = gameEngine;
        this.patternDetector = patternDetector;
        this.debugMode = true;
        this.verboseLogging = false; // NEW: Separate verbose mode
        
        // Priority constants
        this.PRIORITIES = {
            IMMEDIATE_THREAT: 15000,
            THREATENED_GAP: 10000,
            CRITICAL_ATTACK: 6000,
            STANDARD_ATTACK: 4000,
            CHAIN_EXTENSION: 2200,
            GAP_FILLING: 1000,
            BASE_GAP: 500
        };
        
        // FIXED: Enhanced cache with minimal logging
        this.cache = new Map();
        this.cacheValid = false;
        this.lastAnalyzedMove = -1;
        
        // NEW: Lightweight gap existence cache
        this.gapExistenceCache = new Map(); // Just for hasAnyGaps()
        this.gapExistenceValid = false;
        
        // NEW: Call tracking for debugging (only when verbose)
        this.callTracking = {
            enabled: false,
            calls: [],
            maxCalls: 50
        };
        
        this.log('🔍 Gap Analyzer initialized with spam-free logging');
    }

    // ===== LIGHTWEIGHT GAP EXISTENCE CHECK =====
    
    /**
     * FIXED: Lightweight method to check if gaps exist without full analysis
     * This is what gets called repeatedly during initialization
     */
    hasAnyGaps(player) {
        const currentMove = this.gameEngine.moveCount || 0;
        const cacheKey = `hasGaps-${player}-${currentMove}`;
        
        // Check lightweight cache first
        if (this.gapExistenceValid && this.gapExistenceCache.has(cacheKey)) {
            // FIXED: NO LOGGING for existence check to prevent spam
            return this.gapExistenceCache.get(cacheKey);
        }
        
        // Lightweight check: just count player pieces and do basic pattern detection
        const playerPositions = this.gameEngine.getPlayerPositions ? 
            this.gameEngine.getPlayerPositions(player) : [];
            
        if (playerPositions.length < 2) {
            // Need at least 2 pieces for patterns
            this.gapExistenceCache.set(cacheKey, false);
            this.gapExistenceValid = true;
            return false;
        }
        
        // Quick pattern existence check without full gap analysis
        const hasPatterns = this.quickPatternCheck(playerPositions);
        
        this.gapExistenceCache.set(cacheKey, hasPatterns);
        this.gapExistenceValid = true;
        
        // Only log in verbose mode
        if (this.verboseLogging) {
            this.log(`🔍 Quick gap check for ${player}: ${hasPatterns} (${playerPositions.length} pieces)`);
        }
        
        return hasPatterns;
    }

    /**
     * NEW: Quick pattern check without creating full gap objects
     */
    quickPatternCheck(pieces) {
        if (pieces.length < 2) return false;
        
        // Check if any pair of pieces forms L or I pattern with open gaps
        for (let i = 0; i < pieces.length; i++) {
            for (let j = i + 1; j < pieces.length; j++) {
                const piece1 = pieces[i];
                const piece2 = pieces[j];
                
                // Quick L-pattern check
                if (this.patternDetector.isLPattern(piece1, piece2)) {
                    const gaps = this.patternDetector.getLPatternGaps(piece1, piece2, this.gameEngine);
                    if (gaps.some(gap => this.gameEngine.board[gap.row][gap.col] === '')) {
                        return true; // Found open L-pattern gaps
                    }
                }
                
                // Quick I-pattern check
                if (this.patternDetector.isIPattern(piece1, piece2)) {
                    const gaps = this.patternDetector.getIPatternGaps(piece1, piece2, this.gameEngine);
                    if (gaps.some(gap => this.gameEngine.board[gap.row][gap.col] === '')) {
                        return true; // Found open I-pattern gaps
                    }
                }
            }
        }
        
        return false;
    }

    // ===== MAIN GAP ANALYSIS - FIXED LOGGING =====
    
    /**
     * Comprehensive gap analysis - FIXED to eliminate cache spam
     */
    analyzeGaps(player) {
        const currentMove = this.gameEngine.moveCount || 0;
        const cacheKey = `${player}-${currentMove}`;
        
        // Track calls if enabled
        if (this.callTracking.enabled) {
            this.trackCall('analyzeGaps', player, currentMove);
        }
        
        // Check cache validity
        if (this.cacheValid && this.cache.has(cacheKey) && this.lastAnalyzedMove === currentMove) {
            // FIXED: NO CACHE LOGGING unless verbose mode is on
            if (this.verboseLogging) {
                this.log(`📋 Cache hit for ${player} (move ${currentMove})`);
            }
            return this.cache.get(cacheKey);
        }
        
        // Only log new analysis, not cache hits
        this.log(`🔍 Analyzing gaps for ${player} (move ${currentMove})...`);
        
        // Get all patterns for this player
        const patterns = this.patternDetector.findAllPatterns(this.gameEngine, player);
        const validPatterns = this.patternDetector.filterValidPatterns(patterns, this.gameEngine);
        
        // Extract and categorize gaps
        const allGaps = this.extractGapsFromPatterns(validPatterns, player);
        
        const analysis = {
            player: player,
            moveNumber: currentMove,
            
            // Categorized gaps
            immediateThreats: allGaps.filter(gap => this.isImmediateThreat(gap, player)),
            threatenedGaps: allGaps.filter(gap => this.isGapThreatened(gap, player) && !this.isImmediateThreat(gap, player)),
            unthreatenedGaps: allGaps.filter(gap => !this.isGapThreatened(gap, player)),
            
            // Raw data
            allGaps: allGaps,
            patterns: validPatterns,
            
            // Statistics
            stats: this.calculateGapStats(allGaps, validPatterns)
        };
        
        // Sort all categories by priority
        analysis.immediateThreats.sort((a, b) => b.priority - a.priority);
        analysis.threatenedGaps.sort((a, b) => b.priority - a.priority);
        analysis.unthreatenedGaps.sort((a, b) => b.priority - a.priority);
        
        // Cache the result
        this.cache.set(cacheKey, analysis);
        this.cacheValid = true;
        this.lastAnalyzedMove = currentMove;
        
        // Only log summary for actual analysis
        this.log(`✅ Analysis complete for ${player}: ${analysis.immediateThreats.length} threats, ${analysis.threatenedGaps.length} threatened, ${analysis.unthreatenedGaps.length} safe`);
        
        return analysis;
    }

    // ===== ENHANCED DEBUGGING AND CALL TRACKING =====
    
    /**
     * NEW: Enable call tracking to debug excessive calls
     */
    enableCallTracking(maxCalls = 50) {
        this.callTracking.enabled = true;
        this.callTracking.maxCalls = maxCalls;
        this.callTracking.calls = [];
        this.log(`🕵️ Call tracking ENABLED (max ${maxCalls} calls)`);
    }

    /**
     * NEW: Disable call tracking
     */
    disableCallTracking() {
        this.callTracking.enabled = false;
        this.log(`🕵️ Call tracking DISABLED`);
    }

    /**
     * NEW: Track method calls for debugging
     */
    trackCall(method, player, move) {
        if (!this.callTracking.enabled) return;
        
        const call = {
            method: method,
            player: player,
            move: move,
            timestamp: Date.now(),
            stack: this.verboseLogging ? new Error().stack : null
        };
        
        this.callTracking.calls.push(call);
        
        // Keep only recent calls
        if (this.callTracking.calls.length > this.callTracking.maxCalls) {
            this.callTracking.calls.shift();
        }
        
        // Log excessive calls
        const recentCalls = this.callTracking.calls.filter(c => 
            c.method === method && c.player === player && c.move === move
        );
        
        if (recentCalls.length >= 10) {
            this.log(`⚠️ EXCESSIVE CALLS: ${method}(${player}, ${move}) called ${recentCalls.length} times`);
            if (recentCalls.length === 10) {
                this.log(`🔍 Call stack trace available - enable verbose logging to see details`);
            }
        }
    }

    /**
     * NEW: Show call tracking report
     */
    showCallReport() {
        if (!this.callTracking.enabled) {
            this.log(`⚠️ Call tracking is disabled. Enable with enableCallTracking()`);
            return;
        }
        
        this.log(`\n🕵️ === CALL TRACKING REPORT ===`);
        
        // Group calls by method and player
        const grouped = {};
        this.callTracking.calls.forEach(call => {
            const key = `${call.method}(${call.player})`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(call);
        });
        
        Object.entries(grouped).forEach(([key, calls]) => {
            this.log(`${key}: ${calls.length} calls`);
            
            // Show move distribution
            const moveDistribution = {};
            calls.forEach(call => {
                moveDistribution[call.move] = (moveDistribution[call.move] || 0) + 1;
            });
            
            Object.entries(moveDistribution).forEach(([move, count]) => {
                if (count > 3) {
                    this.log(`  Move ${move}: ${count} calls ${count > 10 ? '⚠️ EXCESSIVE' : ''}`);
                }
            });
        });
        
        this.log(`🕵️ === END CALL REPORT ===\n`);
    }

    // ===== CACHE MANAGEMENT - ENHANCED =====
    
    /**
     * Invalidate cache when board changes - ENHANCED
     */
    invalidateCache() {
        this.cacheValid = false;
        this.cache.clear();
        
        // Also invalidate lightweight cache
        this.gapExistenceValid = false;
        this.gapExistenceCache.clear();
        
        // Only log in verbose mode
        if (this.verboseLogging) {
            this.log(`🗑️ All caches invalidated`);
        }
    }

    /**
     * Force refresh of analysis (bypasses cache)
     */
    forceRefresh(player) {
        this.invalidateCache();
        return this.analyzeGaps(player);
    }

    // ===== COMPREHENSIVE ANALYSIS (UNCHANGED BUT WITH BETTER LOGGING) =====
    
    /**
     * Get comprehensive analysis for both players at once
     */
    getComprehensiveAnalysis(ourPlayer) {
        const opponent = ourPlayer === 'X' ? 'O' : 'X';
        
        const currentMove = this.gameEngine.moveCount || 0;
        const comprehensiveKey = `comprehensive-${currentMove}`;
        
        if (this.cache.has(comprehensiveKey)) {
            if (this.verboseLogging) {
                this.log(`📋 Using comprehensive cached analysis (move ${currentMove})`);
            }
            return this.cache.get(comprehensiveKey);
        }
        
        this.log(`🔍 Comprehensive analysis for both players (move ${currentMove})...`);
        
        const ourAnalysis = this.analyzeGaps(ourPlayer);
        const opponentAnalysis = this.analyzeGaps(opponent);
        
        const comprehensive = {
            moveNumber: currentMove,
            ourPlayer: ourPlayer,
            opponent: opponent,
            ourAnalysis: ourAnalysis,
            opponentAnalysis: opponentAnalysis,
            
            // Quick access helpers
            ourThreats: ourAnalysis.immediateThreats.concat(ourAnalysis.threatenedGaps),
            opponentAttackable: opponentAnalysis.unthreatenedGaps.concat(opponentAnalysis.threatenedGaps),
            
            // Summary stats
            summary: {
                ourGaps: ourAnalysis.allGaps.length,
                ourThreats: ourAnalysis.immediateThreats.length + ourAnalysis.threatenedGaps.length,
                opponentGaps: opponentAnalysis.allGaps.length,
                attackOpportunities: opponentAnalysis.allGaps.length
            }
        };
        
        // Cache comprehensive analysis
        this.cache.set(comprehensiveKey, comprehensive);
        
        this.log(`✅ Comprehensive analysis cached - Our: ${comprehensive.summary.ourGaps} gaps, Opponent: ${comprehensive.summary.opponentGaps} gaps`);
        
        return comprehensive;
    }

    // ===== ALL OTHER METHODS UNCHANGED =====
    // (Gap extraction, threat detection, attack analysis, etc.)
    
    getThreatenedGaps(player) {
        const analysis = this.analyzeGaps(player);
        return analysis.threatenedGaps;
    }

    getUnthreatenedGaps(player) {
        const analysis = this.analyzeGaps(player);
        return analysis.unthreatenedGaps;
    }

    getImmediateThreats(player) {
        const analysis = this.analyzeGaps(player);
        return analysis.immediateThreats;
    }

    findAttackableGaps(opponent) {
        this.log(`⚔️ Analyzing attack opportunities against ${opponent}...`);
        
        const opponentAnalysis = this.analyzeGaps(opponent);
        const attackableGaps = [];
        
        const targetGaps = [...opponentAnalysis.threatenedGaps, ...opponentAnalysis.unthreatenedGaps];
        
        for (const gap of targetGaps) {
            if (this.canDirectlyAttackGap(gap)) {
                const attackPriority = this.calculateAttackPriority(gap);
                
                attackableGaps.push({
                    ...gap,
                    originalPriority: gap.priority,
                    attackPriority: attackPriority,
                    attackMove: { row: gap.row, col: gap.col },
                    attackType: 'direct-gap-fill',
                    reason: `Direct attack: Fill opponent ${gap.patternType} gap`
                });
            }
        }
        
        attackableGaps.sort((a, b) => b.attackPriority - a.attackPriority);
        
        this.log(`⚔️ Found ${attackableGaps.length} direct attack opportunities against ${opponent}`);
        
        return attackableGaps;
    }

    getBestAttackOpportunity(opponent) {
        const attackableGaps = this.findAttackableGaps(opponent);
        
        if (attackableGaps.length > 0) {
            const bestAttack = attackableGaps[0];
            
            this.log(`🎯 Best attack target: ${opponent} ${bestAttack.patternType} gap at (${bestAttack.row},${bestAttack.col}) - Priority ${bestAttack.attackPriority}`);
            
            return {
                gap: {
                    row: bestAttack.row,
                    col: bestAttack.col,
                    patternType: bestAttack.patternType
                },
                move: bestAttack.attackMove,
                priority: bestAttack.attackPriority,
                reason: bestAttack.reason
            };
        }
        
        return null;
    }

    // Gap extraction and processing methods (unchanged)
    extractGapsFromPatterns(patterns, player) {
        const gaps = [];
        
        for (const pattern of patterns) {
            for (const gapCell of pattern.gaps) {
                if (this.gameEngine.board[gapCell.row][gapCell.col] === '') {
                    const gap = {
                        row: gapCell.row,
                        col: gapCell.col,
                        patternType: pattern.type,
                        patternId: pattern.id,
                        pattern: pattern,
                        player: player,
                        priority: this.calculateGapPriority(gapCell, pattern, player),
                        createdAt: pattern.createdAt || 0
                    };
                    
                    gaps.push(gap);
                }
            }
        }
        
        if (this.verboseLogging) {
            this.log(`🔍 Extracted ${gaps.length} open gaps from ${patterns.length} patterns`);
        }
        return gaps;
    }

    calculateGapPriority(gapCell, pattern, player) {
        let priority = this.PRIORITIES.BASE_GAP;
        
        if (pattern.type === 'L') {
            priority += 500;
        } else if (pattern.type === 'I') {
            priority += 300;
        }
        
        const borderBonus = this.calculateBorderProximityBonus(gapCell, player);
        priority += borderBonus;
        
        const completionBonus = this.calculateCompletionBonus(pattern);
        priority += completionBonus;
        
        const strategicBonus = this.calculateStrategicPositionBonus(gapCell);
        priority += strategicBonus;
        
        return priority;
    }

    calculateBorderProximityBonus(gapCell, player) {
        const boardSize = this.gameEngine.size || 15;
        
        if (player === 'X') {
            const distanceFromBorders = Math.min(gapCell.row, boardSize - 1 - gapCell.row);
            return (15 - distanceFromBorders) * 20;
        } else {
            const distanceFromBorders = Math.min(gapCell.col, boardSize - 1 - gapCell.col);
            return (15 - distanceFromBorders) * 20;
        }
    }

    calculateCompletionBonus(pattern) {
        if (!pattern.gaps) return 0;
        
        const remainingGaps = pattern.gaps.filter(gap => 
            this.gameEngine.isValidPosition(gap.row, gap.col) &&
            this.gameEngine.board[gap.row][gap.col] === ''
        );
        
        if (remainingGaps.length === 1) {
            return 2000;
        } else if (remainingGaps.length === 2) {
            return 1000;
        } else if (remainingGaps.length === 3) {
            return 500;
        }
        
        return 0;
    }

    calculateStrategicPositionBonus(gapCell) {
        const boardSize = this.gameEngine.size || 15;
        const center = Math.floor(boardSize / 2);
        
        const centerDistance = Math.abs(gapCell.row - center) + Math.abs(gapCell.col - center);
        const centerBonus = Math.max(0, (10 - centerDistance) * 10);
        
        const connectivityBonus = this.countAdjacentOwnPieces(gapCell) * 50;
        
        return centerBonus + connectivityBonus;
    }

    countAdjacentOwnPieces(gapCell) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        let count = 0;
        
        for (const [dr, dc] of directions) {
            const checkRow = gapCell.row + dr;
            const checkCol = gapCell.col + dc;
            
            if (this.gameEngine.isValidPosition(checkRow, checkCol)) {
                const cellContent = this.gameEngine.board[checkRow][checkCol];
                if (cellContent === 'X' || cellContent === 'O') {
                    count++;
                }
            }
        }
        
        return count;
    }

    // Threat detection methods (unchanged)
    isImmediateThreat(gap, ourPlayer) {
        const opponent = ourPlayer === 'X' ? 'O' : 'X';
        
        const lastMove = this.gameEngine.getLastOpponentMove ? 
            this.gameEngine.getLastOpponentMove(ourPlayer) : null;
        
        if (!lastMove || lastMove.player !== opponent) {
            return false;
        }
        
        const distance = Math.abs(gap.row - lastMove.row) + Math.abs(gap.col - lastMove.col);
        const isAdjacent = distance <= 1;
        
        if (isAdjacent && this.verboseLogging) {
            this.log(`🚨 IMMEDIATE THREAT: ${opponent} move at (${lastMove.row},${lastMove.col}) threatens gap at (${gap.row},${gap.col})`);
        }
        
        return isAdjacent;
    }

    isGapThreatened(gap, ourPlayer) {
        const opponent = ourPlayer === 'X' ? 'O' : 'X';
        
        const currentContent = this.gameEngine.board[gap.row][gap.col];
        if (currentContent === opponent) {
            return true;
        }
        
        const adjacentDirections = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dr, dc] of adjacentDirections) {
            const checkRow = gap.row + dr;
            const checkCol = gap.col + dc;
            
            if (this.gameEngine.isValidPosition(checkRow, checkCol)) {
                if (this.gameEngine.board[checkRow][checkCol] === opponent) {
                    return true;
                }
            }
        }
        
        return false;
    }

    canDirectlyAttackGap(gap) {
        if (!gap || typeof gap.row === 'undefined' || typeof gap.col === 'undefined') {
            return false;
        }
        
        try {
            return this.gameEngine.board[gap.row][gap.col] === '' &&
                   this.gameEngine.isValidPosition(gap.row, gap.col) &&
                   this.gameEngine.isValidMove(gap.row, gap.col);
        } catch (error) {
            if (this.verboseLogging) {
                this.log(`⚠️ Error checking gap position (${gap.row},${gap.col}): ${error.message}`);
            }
            return false;
        }
    }

    calculateAttackPriority(gap) {
        let priority = this.PRIORITIES.STANDARD_ATTACK;
        
        if (gap.patternType === 'L') {
            priority += 2000;
        } else if (gap.patternType === 'I') {
            priority += 1000;
        }
        
        const completionBonus = this.calculateCompletionBonus(gap.pattern);
        if (completionBonus >= 2000) {
            priority += 3000;
        } else if (completionBonus >= 1000) {
            priority += 1500;
        }
        
        const strategicBonus = this.calculateStrategicPositionBonus({ row: gap.row, col: gap.col });
        priority += Math.min(strategicBonus, 500);
        
        return priority;
    }

    calculateGapStats(gaps, patterns) {
        return {
            totalGaps: gaps.length,
            totalPatterns: patterns.length,
            lPatterns: patterns.filter(p => p.type === 'L').length,
            iPatterns: patterns.filter(p => p.type === 'I').length,
            avgGapsPerPattern: patterns.length > 0 ? (gaps.length / patterns.length).toFixed(1) : 0,
            avgPriority: gaps.length > 0 ? Math.round(gaps.reduce((sum, g) => sum + g.priority, 0) / gaps.length) : 0,
            highestPriority: gaps.length > 0 ? Math.max(...gaps.map(g => g.priority)) : 0
        };
    }

    generateAnalysisReport(player) {
        this.log(`\n📊 === GAP ANALYSIS REPORT FOR ${player} ===`);
        
        const analysis = this.analyzeGaps(player);
        const opponent = player === 'X' ? 'O' : 'X';
        const attackOpportunities = this.findAttackableGaps(opponent);
        
        this.log(`🔍 Move ${analysis.moveNumber} Analysis:`);
        this.log(`   🔍 Patterns: ${analysis.stats.totalPatterns} (${analysis.stats.lPatterns} L, ${analysis.stats.iPatterns} I)`);
        this.log(`   🔍 Gaps: ${analysis.stats.totalGaps} total, avg priority: ${analysis.stats.avgPriority}`);
        this.log(`   🚨 Immediate threats: ${analysis.immediateThreats.length}`);
        this.log(`   ⚠️ Threatened gaps: ${analysis.threatenedGaps.length}`);
        this.log(`   🔧 Safe gaps: ${analysis.unthreatenedGaps.length}`);
        this.log(`   ⚔️ Attack opportunities: ${attackOpportunities.length}`);
        
        if (analysis.immediateThreats.length > 0) {
            this.log(`\n🚨 TOP IMMEDIATE THREATS:`);
            analysis.immediateThreats.slice(0, 3).forEach((threat, i) => {
                this.log(`   ${i+1}. (${threat.row},${threat.col}) - ${threat.patternType} pattern, priority ${threat.priority}`);
            });
        }
        
        if (attackOpportunities.length > 0) {
            this.log(`\n⚔️ TOP ATTACK OPPORTUNITIES:`);
            attackOpportunities.slice(0, 3).forEach((attack, i) => {
                this.log(`   ${i+1}. (${attack.row},${attack.col}) - ${attack.patternType} gap, priority ${attack.attackPriority}`);
            });
        }
        
        this.log(`📊 === END ANALYSIS REPORT ===\n`);
        
        return {
            analysis,
            attackOpportunities,
            report: 'complete'
        };
    }

    getCacheStats() {
        const currentMove = this.gameEngine.moveCount || 0;
        
        return {
            mainCache: {
                entries: this.cache.size,
                valid: this.cacheValid,
                lastAnalyzedMove: this.lastAnalyzedMove,
                currentMove: currentMove
            },
            gapExistence: {
                entries: this.gapExistenceCache.size,
                valid: this.gapExistenceValid
            },
            callTracking: {
                enabled: this.callTracking.enabled,
                totalCalls: this.callTracking.calls.length,
                maxCalls: this.callTracking.maxCalls
            }
        };
    }

    /**
     * ENHANCED: Set debug mode with verbosity control
     */
    setDebugMode(enabled, verbose = false) {
        this.debugMode = enabled;
        this.verboseLogging = verbose;
        this.log(`Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}${verbose ? ' (VERBOSE)' : ' (QUIET)'}`);
        
        if (verbose) {
            this.log(`💡 Verbose mode will show cache hits, detailed extraction logs, and call stacks`);
        } else {
            this.log(`🔇 Quiet mode - only essential logs (recommended for gameplay)`);
        }
    }

    /**
     * Internal logging method with verbosity control
     */
    log(message) {
        if (this.debugMode) {
            console.log(`[GAP-ANALYZER] ${message}`);
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.GapAnalyzer = GapAnalyzer;
}

console.log('🎯 USAGE: analyzer.enableCallTracking() and analyzer.showCallReport() to debug excessive calls');
console.log('🔇 QUIET MODE: Logs only essential analysis, not cache hits (default)');
console.log('📢 VERBOSE MODE: analyzer.setDebugMode(true, true) for detailed debugging');