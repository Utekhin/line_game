// threat-handler.js - FIXED: Proper connection to gap registry
// CORRECTED: Method names, data formats, and return values

class ThreatHandler {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        
        // Component reference
        this.gapRegistry = null;
        
        this.debugMode = true;
        this.log('🚨 Threat Handler initialized');
    }

    // ===== COMPONENT INJECTION =====
    
    setGapRegistry(gapRegistry) {
        this.gapRegistry = gapRegistry;
        this.log('📊 Gap Registry connected');
    }

    // ===== MAIN THREAT HANDLING =====
    
    /**
     * Handle threats - CORRECTED: Proper gap registry connection
     */
    handleThreats() {
        // Skip in early game (threats impossible before move 4)
        const moveCount = this.gameCore.moveCount || 0;
        if (moveCount < 4) {
            return null;
        }
        
        this.log('🚨 Checking for threats...');
        
        try {
            // Get threatened gaps from registry
            const threatenedGaps = this.getThreatenedGaps();
            
            if (!threatenedGaps || threatenedGaps.length === 0) {
                this.log('✅ No threats detected');
                return null;
            }
            
            this.log(`🚨 THREAT DETECTED: ${threatenedGaps.length} threatened gap(s)`);
            
            // Handle first threat (highest priority)
            const threat = threatenedGaps[0];
            
            if (this.debugMode) {
                this.log(`   Pattern: ${threat.patternType}`);
                this.log(`   FillCells available: ${threat.fillCells?.length || 0}`);
            }
            
            // Generate gap fill move
            const fillMove = this.generateGapFillMove(threat);
            
            if (fillMove) {
                this.log(`✅ THREAT RESPONSE: Fill gap at (${fillMove.row},${fillMove.col})`);
                return fillMove;
            }
            
            this.log('⚠️ Could not generate gap fill move');
            return null;
            
        } catch (error) {
            this.log(`❌ Threat handling error: ${error.message}`);
            console.error('[THREAT-HANDLER] Error:', error);
            return null;
        }
    }

    // ===== THREAT DETECTION =====
    
    /**
     * Get threatened gaps - CORRECTED: Proper method call
     */
    getThreatenedGaps() {
        // Verify gap registry connection
        if (!this.gapRegistry) {
            this.log('⚠️ Gap Registry not available');
            return [];
        }
        
        // Verify method exists - CORRECTED: Check actual method name
        if (typeof this.gapRegistry.getThreatenedGaps !== 'function') {
            this.log('⚠️ Gap Registry missing getThreatenedGaps method');
            return [];
        }
        
        try {
            // CORRECTED: Call with proper signature (player, filterBlocked)
            const threats = this.gapRegistry.getThreatenedGaps(this.player, true);
            
            this.log(`📊 Gap Registry reports: ${threats.length} threat(s)`);
            
            // Debug first threat structure
            if (threats.length > 0 && this.debugMode) {
                const firstThreat = threats[0];
                this.log(`   First threat: ${firstThreat.patternType}-pattern`);
                this.log(`   FillCells: ${JSON.stringify(firstThreat.fillCells)}`);
            }
            
            return threats;
            
        } catch (error) {
            this.log(`⚠️ Gap Registry query error: ${error.message}`);
            return [];
        }
    }

    // ===== GAP FILLING =====
    
    /**
     * Generate move to fill threatened gap - CORRECTED: Proper fillCells handling
     */
    generateGapFillMove(threat) {
        // Validate threat structure
        if (!threat) {
            this.log('❌ Invalid threat (null)');
            return null;
        }
        
        if (!threat.fillCells || !Array.isArray(threat.fillCells)) {
            this.log('❌ Threat missing fillCells array');
            return null;
        }
        
        if (threat.fillCells.length === 0) {
            this.log('⚠️ Threat has empty fillCells array');
            return null;
        }
        
        this.log(`🔧 Generating fill move for ${threat.patternType}-gap`);
        this.log(`   Available fillCells: ${threat.fillCells.length}`);
        
        // Find empty cells from fillCells array
        const availableCells = threat.fillCells.filter(cell => 
            this.isValidPosition(cell.row, cell.col) &&
            this.gameCore.board[cell.row][cell.col] === ''
        );
        
        if (availableCells.length === 0) {
            this.log('⚠️ No available fillCells (all occupied)');
            return null;
        }
        
        // Select first available cell (any cell fills the gap)
        const targetCell = availableCells[0];
        
        this.log(`✅ Selected fillCell: (${targetCell.row},${targetCell.col})`);
        
        // CORRECTED: Return standardized move object format
        return {
            row: targetCell.row,
            col: targetCell.col,
            reason: `Threat response: Fill ${threat.patternType} gap`,
            pattern: threat.patternType,
            moveType: 'threat-response',  // Used by move-generator
            value: 1000,                  // Highest priority
            patternId: threat.patternId
        };
    }

    // ===== VALIDATION =====
    
    /**
     * Check if position is valid
     */
    isValidPosition(row, col) {
        return row >= 0 && row < this.gameCore.size &&
               col >= 0 && col < this.gameCore.size;
    }

    // ===== DIAGNOSTICS =====
    
    /**
     * Debug threat detection system
     */
    debugThreatSystem() {
        console.log('=== THREAT HANDLER DEBUG ===');
        console.log('Player:', this.player);
        console.log('Move count:', this.gameCore.moveCount);
        console.log('Gap Registry connected:', !!this.gapRegistry);
        
        if (this.gapRegistry) {
            // Check method availability
            console.log('getThreatenedGaps available:', 
                typeof this.gapRegistry.getThreatenedGaps === 'function');
            
            // Try to get threats
            try {
                const threats = this.getThreatenedGaps();
                console.log('Current threats:', threats.length);
                
                if (threats.length > 0) {
                    console.log('First threat structure:', {
                        patternType: threats[0].patternType,
                        fillCells: threats[0].fillCells?.length,
                        patternId: threats[0].patternId
                    });
                }
            } catch (error) {
                console.error('Threat detection test failed:', error.message);
            }
        }
        
        console.log('=== END THREAT HANDLER DEBUG ===');
    }
    
    /**
     * Get statistics
     */
    getStatistics() {
        const threats = this.getThreatenedGaps();
        return {
            currentThreats: threats.length,
            lastCheck: this.gameCore.moveCount
        };
    }

    // ===== UTILITY =====
    
    reset() {
        this.log('🔄 Threat handler reset');
    }
    
    log(message) {
        if (this.debugMode) {
            console.log(`[THREAT-HANDLER] ${message}`);
        }
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ThreatHandler = ThreatHandler;
    console.log('✅ Threat Handler loaded - CONNECTION FIXED');
}