// ai-vs-human-controller.js - ENHANCED: AI Personality System Integration
// Uses ONLY gap-registry.js for gap detection + personality-driven AI behavior

class AIvsHumanController {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.aiPlayer = 'X';
        this.humanPlayer = 'O';
        this.ai = null;
        this.gapRegistry = null; // Single source of truth
        this.gameState = 'ready';
        
        this.waitingForHuman = false;
        
        this.eventHandlers = {
            'move': [], 'gameStart': [], 'gameEnd': [], 'error': [], 
            'turnChange': [], 'humanMoveNeeded': []
        };
        
        // NEW: Personality management
        this.personalityManager = null;
        this.currentPersonalityId = null;
        
        this.initializeAI();
        this.initializePersonalityManager();
        this.setupBoardClickHandlers();
        console.log('✅ ENHANCED AI Controller initialized - Gap Registry + Personality System');
    }

    // ENHANCED: AI Initialization with Personality System
    initializeAI() {
        if (typeof window.SimpleChainAI === 'undefined') {
            console.error('⚠️ SimpleChainAI not found. Make sure simple-chain.js is loaded.');
            throw new Error('SimpleChainAI class not available');
        }
        
        // ENHANCED: Load personality configuration
        const personalityConfig = this.loadPersonalityConfiguration();
        
        // Initialize AI with personality (enhanced version)
        this.ai = new SimpleChainAI(this.gameCore, this.aiPlayer, personalityConfig);
        
        // Log personality information
        const personalityName = personalityConfig?.name || 'Default';
        const personalityId = personalityConfig?.id || 'default';
        this.currentPersonalityId = personalityId;
        
        console.log(`🤖 Enhanced SimpleChainAI initialized for player ${this.aiPlayer}`);
        console.log(`🎭 Personality: ${personalityName} (${personalityId})`);
        
        if (personalityConfig) {
            console.log(`   📊 Attack threshold: ${personalityConfig.strategy.attackThreshold}`);
            console.log(`   🎯 Risk taking: ${personalityConfig.strategy.riskTaking.toFixed(2)}`);
            console.log(`   🎲 Starting randomization: ${personalityConfig.randomization.startingPosition.toFixed(2)}`);
            console.log(`   📍 Starting area: rows ${personalityConfig.startingArea.rowRange[0]}-${personalityConfig.startingArea.rowRange[1]}`);
        }
        
        // CRITICAL: Initialize Gap Registry as single source of truth
        this.initializeGapRegistry();
    }

    // NEW: Initialize personality management system
    initializePersonalityManager() {
        try {
            if (typeof window.AIPersonalityManager !== 'undefined') {
                this.personalityManager = new AIPersonalityManager();
                console.log('🎭 Personality Manager initialized');
                
                // Update UI elements
                setTimeout(() => this.updatePersonalityUI(), 100);
            } else {
                console.warn('⚠️ AIPersonalityManager not available - personality UI disabled');
            }
        } catch (error) {
            console.error('⚠️ Error initializing personality manager:', error);
        }
    }

    // NEW: Load personality configuration with multiple fallback methods
    loadPersonalityConfiguration() {
        try {
            // Method 1: Check for UI selection (personality dropdown)
            const personalitySelect = document.getElementById('personalityX');
            if (personalitySelect && personalitySelect.value) {
                const selectedPersonalityId = personalitySelect.value;
                console.log(`🎭 Loading personality from UI: ${selectedPersonalityId}`);
                
                if (window.AI_PERSONALITIES && window.AI_PERSONALITIES[selectedPersonalityId]) {
                    const config = window.AI_PERSONALITIES[selectedPersonalityId];
                    return {
                        ...config,
                        id: selectedPersonalityId
                    };
                } else {
                    console.warn(`⚠️ Selected personality '${selectedPersonalityId}' not found, using fallback`);
                }
            }
            
            // Method 2: Check for stored personality preference
            try {
                const storedPersonality = localStorage.getItem('ai_personality_x');
                if (storedPersonality && window.AI_PERSONALITIES) {
                    console.log(`🎭 Loading stored personality: ${storedPersonality}`);
                    
                    if (window.AI_PERSONALITIES[storedPersonality]) {
                        const config = window.AI_PERSONALITIES[storedPersonality];
                        return {
                            ...config,
                            id: storedPersonality
                        };
                    }
                }
            } catch (storageError) {
                console.warn('⚠️ Error accessing localStorage:', storageError.message);
            }
            
            // Method 3: Use default personality if available
            if (window.AI_PERSONALITIES) {
                const availablePersonalities = Object.keys(window.AI_PERSONALITIES);
                
                if (availablePersonalities.length > 0) {
                    // Prefer defensive_builder as default, or first available
                    const defaultId = window.AI_PERSONALITIES['defensive_builder'] ? 
                        'defensive_builder' : availablePersonalities[0];
                    
                    console.log(`🎭 Using default personality: ${defaultId}`);
                    const config = window.AI_PERSONALITIES[defaultId];
                    return {
                        ...config,
                        id: defaultId
                    };
                }
            }
            
            // Method 4: Create minimal personality if nothing is available
            console.log(`🎭 No personalities available, using minimal default`);
            return this.createMinimalPersonality();
            
        } catch (error) {
            console.error('⚠️ Error loading personality configuration:', error);
            console.log('🎭 Falling back to minimal personality');
            return this.createMinimalPersonality();
        }
    }

    // NEW: Create minimal fallback personality
    createMinimalPersonality() {
        return {
            id: 'minimal_default',
            name: "Minimal Default",
            description: "Basic AI personality with balanced settings",
            
            priorities: {
                gapThreat: 1.0,
                criticalAttack: 1.0,
                standardAttack: 1.0,
                opportunisticAttack: 1.0,
                borderConnection: 1.0,
                chainExtension: 1.0,
                safeGapFilling: 1.0
            },
            
            randomization: {
                startingPosition: 0.2,
                moveSelection: 0.1,
                headSelection: 0.3,
                lPatternChoice: 0.2
            },
            
            strategy: {
                attackThreshold: 3500,
                defensiveReactivity: 1.0,
                independentPlaying: 0.5,
                riskTaking: 0.5
            },
            
            startingArea: {
                centerWeight: 0.8,
                rowRange: [6, 8],
                colRange: [6, 8],
                avoidEdges: true
            }
        };
    }

    // ENHANCED: Gap Registry initialization (unchanged but documented)
    initializeGapRegistry() {
        if (typeof window.UniversalGapRegistry === 'undefined') {
            console.error('⚠️ UniversalGapRegistry not found. Make sure gap-registry.js is loaded.');
            throw new Error('UniversalGapRegistry class not available');
        }

        // Create gap registry instance
        this.gapRegistry = new UniversalGapRegistry(this.gameCore, this.aiPlayer);
        console.log('🔗 Gap Registry created for AI player X');

        // Connect gap registry to AI
        this.ai.setGapRegistry(this.gapRegistry);
        console.log('🔗 Gap Registry connected to AI');

        // Connect gap registry to game core (for compatibility)
        if (typeof this.gameCore.setGapRegistry === 'function') {
            this.gameCore.setGapRegistry(this.gapRegistry);
            console.log('🔗 Gap Registry connected to game core');
        }

        // Verify connections
        if (this.ai.gapRegistry && this.gameCore.gapRegistry) {
            console.log('✅ Gap Registry integration verified - Single source of truth established');
        } else {
            console.error('⚠️ Gap Registry integration failed');
        }
    }

    // NEW: Runtime personality changing
    changePersonality(personalityId, restartGame = false) {
        if (!personalityId) {
            console.warn('⚠️ No personality ID provided');
            return false;
        }
        
        if (!window.AI_PERSONALITIES || !window.AI_PERSONALITIES[personalityId]) {
            console.error(`⚠️ Personality '${personalityId}' not found`);
            return false;
        }
        
        try {
            // Store the preference
            try {
                localStorage.setItem('ai_personality_x', personalityId);
            } catch (storageError) {
                console.warn('⚠️ Could not save personality preference:', storageError.message);
            }
            
            // Update UI if dropdown exists
            const personalitySelect = document.getElementById('personalityX');
            if (personalitySelect) {
                personalitySelect.value = personalityId;
            }
            
            this.currentPersonalityId = personalityId;
            
            console.log(`🎭 Personality preference saved: ${personalityId}`);
            
            if (restartGame && this.gameState === 'running') {
                console.log('🔄 Restarting game with new personality...');
                this.stopGame();
                setTimeout(() => {
                    this.startGame();
                }, 500);
            } else {
                console.log('🔄 Restart the game to apply the new personality');
            }
            
            // Update personality description
            this.updatePersonalityDescription();
            
            return true;
            
        } catch (error) {
            console.error('⚠️ Error changing personality:', error);
            return false;
        }
    }

    // NEW: Update personality UI elements
    updatePersonalityUI() {
        // Update personality dropdowns with current selection
        const personalitySelect = document.getElementById('personalityX');
        if (personalitySelect && window.AI_PERSONALITIES) {
            // Clear existing options
            personalitySelect.innerHTML = '';
            
            // Add personality options
            Object.entries(window.AI_PERSONALITIES).forEach(([id, config]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = config.name;
                
                // Select current personality if it matches
                if (this.currentPersonalityId === id) {
                    option.selected = true;
                }
                
                personalitySelect.appendChild(option);
            });
            
            // Add change event listener (remove existing first)
            const newSelect = personalitySelect.cloneNode(true);
            personalitySelect.parentNode.replaceChild(newSelect, personalitySelect);
            
            newSelect.addEventListener('change', (event) => {
                this.changePersonality(event.target.value);
            });
            
            console.log('✅ Personality UI updated');
        }
        
        // Update personality description
        this.updatePersonalityDescription();
        
        // Setup customize button
        const customizeButton = document.getElementById('customizePersonality');
        if (customizeButton) {
            customizeButton.addEventListener('click', () => {
                this.openPersonalityCustomizer();
            });
        }
    }

    // NEW: Update personality description display
    updatePersonalityDescription() {
        const descriptionEl = document.getElementById('personalityDescription');
        if (!descriptionEl) return;
        
        const personalityInfo = this.getCurrentPersonalityInfo();
        
        if (personalityInfo.personality) {
            const p = personalityInfo.personality;
            descriptionEl.innerHTML = `
                <div class="personality-info">
                    <h4>${personalityInfo.name}</h4>
                    <div class="personality-stats">
                        <span><strong>Attack Threshold:</strong> ${p.attackThreshold}</span>
                        <span><strong>Risk Taking:</strong> ${p.riskTaking.toFixed(2)}</span>
                        <span><strong>Independence:</strong> ${p.independentPlaying.toFixed(2)}</span>
                    </div>
                    <div class="current-stats">
                        <span><strong>Chain:</strong> ${personalityInfo.currentStats.chainLength} pieces</span>
                        <span><strong>Phase:</strong> ${personalityInfo.currentStats.currentPhase}</span>
                    </div>
                </div>
            `;
        } else {
            descriptionEl.innerHTML = `
                <div class="personality-info">
                    <h4>No Personality Loaded</h4>
                    <p>Using default AI behavior</p>
                </div>
            `;
        }
    }

    // NEW: Get current personality information
    getCurrentPersonalityInfo() {
        if (!this.ai || !this.ai.personality) {
            return {
                id: 'unknown',
                name: 'Unknown',
                isDefault: true
            };
        }
        
        const stats = this.ai.getStats();
        return {
            id: this.ai.personalityId || 'custom',
            name: this.ai.personalityName || 'Custom',
            isDefault: false,
            personality: stats.personality,
            currentStats: {
                chainLength: stats.chainLength,
                moveCount: stats.moveCount,
                currentPhase: stats.currentPhase
            }
        };
    }

    // NEW: Open personality customization interface (placeholder)
    openPersonalityCustomizer() {
        if (this.personalityManager) {
            const currentPersonality = this.getCurrentPersonalityInfo();
            console.log('🎭 Opening personality customizer for:', currentPersonality.name);
            
            // Placeholder - could open a modal or separate interface
            alert(`Personality Customizer\n\nCurrent: ${currentPersonality.name}\n\nCustomization interface coming soon!\n\nFor now, you can:\n1. Select from available personalities\n2. Modify AI_PERSONALITIES in console\n3. Use personality manager methods`);
        } else {
            console.warn('⚠️ Personality manager not available');
        }
    }

    // ===== HUMAN MOVE HANDLING (Unchanged) =====
    
    setupBoardClickHandlers() {
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('cell')) {
                this.handleCellClick(event.target);
            }
        });
    }

    handleCellClick(cellElement) {
        if (!this.waitingForHuman || this.gameState !== 'running') {
            return;
        }

        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);

        console.log(`🖱️ Human clicked cell (${row},${col})`);

        if (this.isValidHumanMove(row, col)) {
            this.makeHumanMove(row, col);
        } else {
            this.showInvalidMoveWarning(row, col);
        }
    }

    isValidHumanMove(row, col) {
        return this.gameCore.isValidMove(row, col) && 
               this.gameCore.currentPlayer === this.humanPlayer;
    }

    makeHumanMove(row, col) {
        console.log(`👤 Human (${this.humanPlayer}) makes move at (${row},${col})`);
        
        const result = this.gameCore.makeMove(row, col, this.humanPlayer);
        
        if (result.success) {
            this.waitingForHuman = false;
            
            // CRITICAL: Notify gap registry of board change
            if (this.gapRegistry && this.gapRegistry.onBoardChanged) {
                this.gapRegistry.onBoardChanged();
                console.log('📋 Gap Registry notified of board change');
            }
            
            // Check for new threats created by human move
            this.logCurrentThreats();
            
            this.emit('move', {
                player: this.humanPlayer,
                move: {
                    row: row,
                    col: col,
                    reason: 'Human player move',
                    pattern: 'human'
                },
                result: result,
                isHuman: true
            });

            if (result.gameOver) {
                this.endGame('win', `${this.humanPlayer} wins!`, result.winner);
                return;
            }

            this.emit('turnChange', { 
                newPlayer: this.aiPlayer, 
                waitingForHuman: false 
            });

            // Small delay to let gap registry update before AI thinks
            setTimeout(() => {
                this.makeAIMove();
            }, 100);

        } else {
            console.error(`⚠️ Human move failed: ${result.reason}`);
            this.showInvalidMoveWarning(row, col, result.reason);
        }
    }

    showInvalidMoveWarning(row, col, reason = 'Invalid move') {
        console.warn(`⚠️ Invalid human move at (${row},${col}): ${reason}`);
        
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cellElement) {
            cellElement.style.backgroundColor = '#ffcccb';
            setTimeout(() => {
                cellElement.style.backgroundColor = '';
            }, 500);
        }

        this.emit('error', { 
            message: `Invalid move at (${row},${col}): ${reason}`,
            isHuman: true 
        });
    }

    // ===== AI MOVE PROCESSING (Enhanced with Personality Logging) =====
    
    async makeAIMove() {
        if (this.gameState !== 'running') return;
        if (this.gameCore.currentPlayer !== this.aiPlayer) return;

        try {
            const aiMoveCount = this.getPlayerMoveCount(this.aiPlayer);
            const personalityName = this.ai.personalityName || 'Default';
            console.log(`🤖 ${personalityName} AI (${this.aiPlayer}) thinking... Move #${aiMoveCount + 1}`);

            // Ensure gap registry is updated before AI thinks
            if (this.gapRegistry && this.gapRegistry.onBoardChanged) {
                this.gapRegistry.onBoardChanged();
            }

            // Log current situation for debugging
            this.logCurrentThreats();

            // Get the next move from personality-enhanced AI
            const nextMove = this.ai.getNextMove();
            
            if (!nextMove) {
                // Check win condition based on move count
                if (this.gameCore.moveCount < 29) {
                    console.warn('⚠️ AI reports no valid moves, but win check disabled (early game)');
                    this.endGame('complete', 'No valid moves available (early game)');
                } else if (this.gameCore.checkWin(this.aiPlayer).isWin) {
                    this.endGame('win', `${this.aiPlayer} completed the connection!`, this.aiPlayer);
                } else {
                    console.warn('⚠️ AI reports no valid moves');
                    this.endGame('complete', 'No valid moves available');
                }
                return;
            }

            this.executeAIMove(nextMove);

        } catch (error) {
            console.error('AI move error:', error);
            this.emit('error', { message: error.message, isAI: true });
        }
    }

    // NEW: Enhanced AI move execution with personality info
    executeAIMove(move) {
        const result = this.gameCore.makeMove(move.row, move.col, this.aiPlayer);
        
        if (result.success) {
            const personalityName = this.ai.personalityName || 'Default';
            console.log(`✅ ${personalityName} AI (${this.aiPlayer}) plays (${move.row},${move.col}) - ${move.reason}`);
            console.log(`   └── Move type: ${move.pattern || 'unknown'}`);
            console.log(`   └── Priority: ${move.value || 'N/A'}`);
            
            // CRITICAL: Notify gap registry of board change
            if (this.gapRegistry && this.gapRegistry.onBoardChanged) {
                this.gapRegistry.onBoardChanged();
                console.log('📋 Gap Registry notified of AI move');
            }
            
            this.emit('move', {
                player: this.aiPlayer,
                move: move,
                result: result,
                isAI: true,
                moveType: move.pattern || 'unknown',
                personalityName: personalityName
            });

            if (result.gameOver) {
                // Use gap registry to check if gaps still exist
                const hasGaps = this.hasAnyGaps();
                
                if (hasGaps) {
                    console.log('🚫 GAPS STILL EXIST - GAME CONTINUES');
                    this.gameCore.gameOver = false;
                    
                    this.waitingForHuman = true;
                    this.emit('turnChange', { 
                        newPlayer: this.humanPlayer, 
                        waitingForHuman: true 
                    });
                    this.emit('humanMoveNeeded', { 
                        player: this.humanPlayer,
                        message: 'Your turn! Click on an empty cell to place O.' 
                    });
                    return;
                }
                
                console.log('✅ No gaps remaining - game truly complete!');
                this.endGame('win', `${personalityName} AI completed the connection!`, result.winner);
                return;
            }

            this.waitingForHuman = true;
            this.emit('turnChange', { 
                newPlayer: this.humanPlayer, 
                waitingForHuman: true 
            });
            this.emit('humanMoveNeeded', { 
                player: this.humanPlayer,
                message: 'Your turn! Click on an empty cell to place O.' 
            });

        } else {
            console.error(`⚠️ AI move failed: ${result.reason}`);
            this.emit('error', { message: result.reason, isAI: true });
        }
    }

    // ENHANCED: Log current threat situation for debugging
    logCurrentThreats() {
        if (!this.gapRegistry) return;
        
        try {
            // Get current gap statistics from registry
            const stats = this.gapRegistry.getStats();
            const personalityName = this.ai?.personalityName || 'Default';
            console.log(`📊 ${personalityName} Gap Registry Status: ${stats.totalActiveGaps} active gaps, ${stats.totalPatterns} patterns`);
            
            // Check our threatened gaps
            const ourThreats = this.gapRegistry.getOwnThreatenedGaps();
            if (ourThreats.length > 0) {
                console.log(`🚨 OUR THREATENED GAPS: ${ourThreats.length}`);
                ourThreats.slice(0, 3).forEach((gap, i) => {
                    console.log(`  ${i+1}. ${gap.patternType} gap at (${gap.row},${gap.col}) - ${gap.reason}`);
                });
            }
            
            // Check attack opportunities
            const attacks = this.gapRegistry.getOpponentVulnerableGaps();
            if (attacks.length > 0) {
                console.log(`⚔️ ATTACK OPPORTUNITIES: ${attacks.length}`);
                attacks.slice(0, 3).forEach((attack, i) => {
                    console.log(`  ${i+1}. ${attack.patternType} gap at (${attack.row},${attack.col}) - Priority ${attack.priority}`);
                });
            }
        } catch (error) {
            console.log(`⚠️ Error logging threats: ${error.message}`);
        }
    }

    // ===== GAME CONTROL (Enhanced with Personality Info) =====
    
    async startGame() {
        if (this.gameState !== 'ready') return false;
        
        const personalityName = this.ai?.personalityName || 'Default';
        console.log(`🎮 Starting AI vs Human game with ${personalityName}...`);
        
        this.ai.reset();
        
        // Reinitialize gap registry for new game
        this.initializeGapRegistry();
        
        this.gameState = 'running';
        this.waitingForHuman = false;

        this.emit('gameStart', {
            aiPlayer: this.aiPlayer,
            humanPlayer: this.humanPlayer,
            personalityName: personalityName,
            personalityId: this.currentPersonalityId,
            mode: 'gap-registry-with-personality'
        });

        setTimeout(() => {
            this.makeAIMove();
        }, 500);

        return true;
    }

    endGame(type, reason, winner = null) {
        this.gameState = 'complete';
        this.waitingForHuman = false;
        
        const personalityName = this.ai?.personalityName || 'Default';
        console.log(`🏁 Game ended: ${type} - ${reason}`);
        
        const aiStats = this.ai.getStats();
        
        this.emit('gameEnd', {
            result: {
                type: type,
                reason: reason,
                winner: winner,
                aiPlayer: this.aiPlayer,
                humanPlayer: this.humanPlayer,
                personalityName: personalityName,
                personalityId: this.currentPersonalityId,
                totalMoves: this.gameCore.moveCount,
                chainLength: aiStats.chainLength,
                finalMoveType: aiStats.lastMoveType,
                personalityStats: aiStats.personality
            }
        });
    }

    // ===== GAP DETECTION - ONLY uses Gap Registry (Unchanged) =====
    
    hasAnyGaps() {
        // CLEAN: Only use gap registry (single source of truth)
        if (this.gapRegistry && typeof this.gapRegistry.hasAnyGaps === 'function') {
            return this.gapRegistry.hasAnyGaps();
        }
        
        console.warn('⚠️ Gap registry not available - assuming no gaps');
        return false;
    }

    // ===== CONTROL METHODS (Unchanged) =====
    
    triggerNextMove() {
        if (this.gameState !== 'running') return false;
        
        if (this.gameCore.currentPlayer === this.aiPlayer) {
            this.makeAIMove();
            return true;
        } else {
            console.log('Waiting for human move - click on a cell');
            return false;
        }
    }

    pauseGame() {
        if (this.gameState === 'running') {
            this.gameState = 'paused';
            this.waitingForHuman = false;
            return true;
        }
        return false;
    }

    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'running';
            
            if (this.gameCore.currentPlayer === this.humanPlayer) {
                this.waitingForHuman = true;
                this.emit('humanMoveNeeded', { 
                    player: this.humanPlayer,
                    message: 'Game resumed. Your turn!' 
                });
            } else {
                this.waitingForHuman = false;
                setTimeout(() => this.makeAIMove(), 500);
            }
            return true;
        }
        return false;
    }

    stopGame() {
        this.gameState = 'complete';
        this.waitingForHuman = false;
        return true;
    }

    // ENHANCED: Game State with Personality Info
    getGameState() {
        const aiStats = this.ai ? this.ai.getStats() : {};
        const personalityInfo = this.getCurrentPersonalityInfo();
        
        // REMOVE expensive gap registry calls from frequent operations
        let gapStats = {};
        if (this.gapRegistry) {
            // Use only cached basic info, no expensive calculations
            gapStats = {
                totalActiveGaps: this.gapRegistry.activeGaps?.get?.('X-X')?.size || 0,
                aiGaps: this.gapRegistry.activeGaps?.get?.('X-X')?.size || 0,
                humanGaps: this.gapRegistry.activeGaps?.get?.('O-O')?.size || 0
            };
        }
        
        return {
            state: this.gameState,
            currentPlayer: this.gameCore.currentPlayer,
            aiPlayer: this.aiPlayer,
            humanPlayer: this.humanPlayer,
            moveCount: this.gameCore.moveCount,
            waitingForHuman: this.waitingForHuman,
            lastMoveType: aiStats.lastMoveType || 'none',
            currentPhase: this.getPhaseFromMoveType(aiStats.lastMoveType),
            chainLength: aiStats.chainLength || 0,
            chainHeads: aiStats.heads || 0,
            direction: aiStats.direction || 'vertical',
            gapStats: gapStats,
            
            // NEW: Personality information
            personality: {
                name: personalityInfo.name,
                id: personalityInfo.id,
                isDefault: personalityInfo.isDefault,
                stats: personalityInfo.personality
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
            case 'chain-extension':
            case 'border-connection':
                return 'chain-extension';
            case 'fragment-connection':
                return 'fragment-connection';
            case 'start':
                return 'initialization';
            default:
                return 'unknown';
        }
    }

    // ===== EVENT SYSTEM (Unchanged) =====
    
    on(event, handler) {
        if (!this.eventHandlers[event]) this.eventHandlers[event] = [];
        this.eventHandlers[event].push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            for (const handler of this.eventHandlers[event]) {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Event handler error:`, error);
                }
            }
        }
    }

    // ===== UTILITY METHODS (Enhanced with Personality) =====
    
    getCurrentPlayerType() {
        return this.gameCore.currentPlayer === this.aiPlayer ? 'AI' : 'Human';
    }

    getPlayerMoveCount(player) {
        return this.gameCore.gameHistory.filter(move => move.player === player).length;
    }

    isGameWaitingForInput() {
        return this.gameState === 'running' && this.waitingForHuman;
    }

    // ENHANCED: Debug method with personality information
    logGameState() {
        const state = this.getGameState();
        const personalityInfo = this.getCurrentPersonalityInfo();
        
        console.log('\n=== ENHANCED GAME STATE (Gap Registry + Personality) ===');
        console.log(`State: ${state.state}`);
        console.log(`Current Player: ${state.currentPlayer} (${this.getCurrentPlayerType()})`);
        console.log(`Waiting for Human: ${state.waitingForHuman}`);
        console.log(`Move Count: ${state.moveCount} (Win check ${state.moveCount >= 29 ? 'ENABLED' : 'DISABLED'})`);
        console.log(`AI Phase: ${state.currentPhase}`);
        console.log(`Chain Length: ${state.chainLength}`);
        console.log(`Last Move Type: ${state.lastMoveType}`);
        
        // Enhanced personality info
        console.log(`🎭 AI Personality: ${personalityInfo.name} (${personalityInfo.id})`);
        if (personalityInfo.personality) {
            const p = personalityInfo.personality;
            console.log(`   Attack Threshold: ${p.attackThreshold}`);
            console.log(`   Risk Taking: ${p.riskTaking.toFixed(2)}`);
            console.log(`   Independence: ${p.independentPlaying.toFixed(2)}`);
        }
        
        console.log('Gap Registry Stats:', state.gapStats);
        
        // Additional gap registry debugging
        if (this.gapRegistry && typeof this.gapRegistry.debugGapDetection === 'function') {
            this.gapRegistry.debugGapDetection();
        }
        
        console.log('==================');
    }

    // NEW: Personality management methods for external access
    getAvailablePersonalities() {
        if (window.AI_PERSONALITIES) {
            return Object.entries(window.AI_PERSONALITIES).map(([id, config]) => ({
                id: id,
                name: config.name,
                description: config.description,
                isCurrent: id === this.currentPersonalityId
            }));
        }
        return [];
    }

    exportPersonalityData() {
        const personalityInfo = this.getCurrentPersonalityInfo();
        const gameStats = this.getGameState();
        
        return {
            personality: personalityInfo,
            gameState: gameStats,
            exportedAt: new Date().toISOString(),
            moveCount: gameStats.moveCount
        };
    }

    // NEW: Quick personality testing methods
    testPersonality(personalityId, moveCount = 10) {
        if (!window.AI_PERSONALITIES || !window.AI_PERSONALITIES[personalityId]) {
            console.error(`⚠️ Personality '${personalityId}' not found`);
            return false;
        }
        
        console.log(`🧪 Testing personality: ${personalityId} for ${moveCount} moves`);
        this.changePersonality(personalityId, true);
        
        // Could add automated testing here
        return true;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AIvsHumanController = AIvsHumanController;
}

console.log('✅ ENHANCED AI vs Human Controller loaded with full personality system');
console.log('🎭 Features: Personality loading, runtime changing, UI integration, enhanced debugging');