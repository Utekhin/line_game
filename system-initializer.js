// system-initializer.js - CLEAN ARCHITECTURE
// SINGLE RESPONSIBILITY: Initialize all game components in correct order
// NO DUPLICATIONS: One initialization path for the entire system
// RETURNS: Fully wired, ready-to-use component ecosystem

class GameSystemInitializer {
    constructor(gameCore, aiPlayer) {
        this.gameCore = gameCore;
        this.aiPlayer = aiPlayer;
        this.humanPlayer = aiPlayer === 'X' ? 'O' : 'X';
        
        // Component storage
        this.components = {};
        
        console.log('🏗️ Game System Initializer created');
    }

    /**
     * MAIN: Initialize complete system
     * Returns fully wired component ecosystem
     */
    initializeCompleteSystem() {
        console.log('🚀 === INITIALIZING COMPLETE GAME SYSTEM ===\n');
        
        try {
            // Step 1: Foundation
            this.initializeFoundation();
            
            // Step 2: Gap System
            this.initializeGapSystem();
            
            // Step 3: Fragment System
            this.initializeFragmentSystem();
            
            // Step 4: Move Handlers
            this.initializeMoveHandlers();
            
            // Step 5: AI Container (empty shell)
            this.initializeAIContainer();
            
            // Step 6: Wire everything together
            this.wireAllComponents();
            
            // Step 7: Verify connections
            this.verifySystem();
            
            console.log('\n✅ === SYSTEM INITIALIZATION COMPLETE ===');
            console.log(`📦 Total components created: ${Object.keys(this.components).length}`);
            
            return this.components;
            
        } catch (error) {
            console.error('❌ System initialization failed:', error);
            throw error;
        }
    }

    // ===== STEP 1: FOUNDATION =====
    
    initializeFoundation() {
        console.log('📐 Step 1: Initializing foundation...');
        
        // Universal Gap Calculator - SINGLE SOURCE OF TRUTH
        if (typeof UniversalGapCalculator !== 'undefined') {
            this.components.universalGapCalculator = new UniversalGapCalculator(this.gameCore.size);
            console.log('  ✅ Universal Gap Calculator');
        } else {
            throw new Error('UniversalGapCalculator not available');
        }
        
        // Game Geometry
        if (typeof GameGeometry !== 'undefined') {
            this.components.geometry = new GameGeometry(this.gameCore.size);
            
            // Get player configuration for geometry
            if (typeof getDirectionConfig !== 'undefined') {
                this.playerConfig = getDirectionConfig(this.aiPlayer);
                this.components.geometry.setDirectionConfiguration(this.playerConfig);
                console.log('  ✅ Game Geometry with player configuration');
            } else {
                console.log('  ✅ Game Geometry (no direction config)');
            }
        }
        
        console.log('✅ Foundation initialized\n');
    }

    // ===== STEP 2: GAP SYSTEM =====
    
   /**
 * QUICK FIX for system-initializer.js
 * Replace the initializeGapSystem() method at line ~95
 */

initializeGapSystem() {
    console.log('📊 Step 2: Initializing gap system...');
    
    // Universal Gap Calculator - Foundation
    this.components.universalGapCalculator = new UniversalGapCalculator();
    
    // Pattern Detector
    this.components.patternDetector = new PatternDetector(this.gameCore);
    this.components.patternDetector.setGapCalculator(this.components.universalGapCalculator);
    
    // Gap Blocking Detector - Create BEFORE Gap Analyzer (dependency)
    this.components.gapBlockingDetector = new GapBlockingDetector(
        this.gameCore,
        this.components.patternDetector  // Inject pattern detector immediately
    );
    
    // Gap Analyzer
    this.components.gapAnalyzer = new GapAnalyzer(this.gameCore, this.aiPlayer);
    this.components.gapAnalyzer.setPatternDetector(this.components.patternDetector);
    // ❌ REMOVE THIS LINE - GapAnalyzer doesn't have setGapCalculator()
    // this.components.gapAnalyzer.setGapCalculator(this.components.universalGapCalculator);
    // ✅ Gap Analyzer gets calculator through pattern detector, not directly
    
    // Inject gap blocking detector into gap analyzer
    if (this.components.gapAnalyzer.setGapBlockingDetector) {
        this.components.gapAnalyzer.setGapBlockingDetector(this.components.gapBlockingDetector);
    }
    
    // Gap Registry
    this.components.gapRegistry = new GapRegistry(this.gameCore, this.aiPlayer);
    this.components.gapRegistry.setPatternDetector(this.components.patternDetector);
    this.components.gapRegistry.setGapAnalyzer(this.components.gapAnalyzer);
    this.components.gapRegistry.setUniversalGapCalculator(this.components.universalGapCalculator);
    this.components.gapRegistry.setGapBlockingDetector(this.components.gapBlockingDetector);
    
    console.log('✅ Gap system initialized');
}

    // ===== STEP 3: FRAGMENT SYSTEM =====
    
    initializeFragmentSystem() {
        console.log('🧩 Step 3: Initializing fragment system...');
        
        // Fragment Analyzer
        if (typeof FragmentAnalyzer !== 'undefined') {
            this.components.fragmentAnalyzer = new FragmentAnalyzer(this.gameCore, this.aiPlayer);
            
            // Inject dependencies
            if (this.components.fragmentAnalyzer.setGapCalculator) {
                this.components.fragmentAnalyzer.setGapCalculator(this.components.universalGapCalculator);
            }
            
            if (this.components.fragmentAnalyzer.setPatternDetector) {
                this.components.fragmentAnalyzer.setPatternDetector(this.components.patternDetector);
            }
            
            if (this.components.fragmentAnalyzer.setGapRegistry) {
                this.components.fragmentAnalyzer.setGapRegistry(this.components.gapRegistry);
            }
            
            if (this.components.fragmentAnalyzer.setGeometry) {
                this.components.fragmentAnalyzer.setGeometry(this.components.geometry);
            }
            
            if (this.components.fragmentAnalyzer.setGapBlockingDetector && this.components.gapBlockingDetector) {
            this.components.fragmentAnalyzer.setGapBlockingDetector(this.components.gapBlockingDetector);
        }
            console.log('  ✅ Fragment Analyzer');
        }
        
        // Fragment Manager
        if (typeof FragmentManager !== 'undefined' && this.components.fragmentAnalyzer) {
            this.components.fragmentManager = new FragmentManager(
                this.gameCore,
                this.aiPlayer,
                this.components.fragmentAnalyzer
            );
            
            if (this.components.fragmentManager.setGapRegistry) {
                this.components.fragmentManager.setGapRegistry(this.components.gapRegistry);
            }
            
            console.log('  ✅ Fragment Manager');
        }
        
        // Head Manager
        if (typeof HeadManager !== 'undefined') {
            this.components.headManager = new HeadManager(this.gameCore, this.aiPlayer);
            
            // Inject geometry
            if (this.components.geometry) {
                this.components.headManager.geometry = this.components.geometry;
            }
            
            // Connect fragment manager
            if (this.components.fragmentManager && this.components.headManager.setFragmentManager) {
                this.components.headManager.setFragmentManager(this.components.fragmentManager);
            }
            
            console.log('  ✅ Head Manager');
        }
           
           
           // Strategic Extension Manager
        if (typeof StrategicExtensionManager !== 'undefined') {
            this.components.strategicExtensionManager = new StrategicExtensionManager(
                this.gameCore,
                this.aiPlayer
            );
            
            // Inject geometry
            if (this.components.geometry) {
                this.components.strategicExtensionManager.setGeometry(this.components.geometry);
            }
            
            // Inject fragment analyzer
            if (this.components.fragmentAnalyzer) {
                this.components.strategicExtensionManager.setFragmentAnalyzer(this.components.fragmentAnalyzer);
            }
            
            // Connect to head manager
            if (this.components.headManager && this.components.headManager.setStrategicExtensionManager) {
                this.components.headManager.setStrategicExtensionManager(this.components.strategicExtensionManager);
            }
            
            console.log('  ✅ Strategic Extension Manager');
        }
        console.log('✅ Fragment system initialized\n');
    }

    // ===== STEP 4: MOVE HANDLERS =====
    
    initializeMoveHandlers() {
        console.log('⚔️ Step 4: Initializing move handlers...');
        
        const handlers = [
            'InitialMoveHandler',
            'ThreatHandler',
            'ChainExtensionHandler',
            'GapFillingHandler',
            'BorderConnectionHandler',
            'AttackHandler',
            'DiagonalExtensionHandler',
            'MoveValidator'
        ];
        
        handlers.forEach(handlerName => {
            if (typeof window[handlerName] !== 'undefined') {
                const propName = handlerName.charAt(0).toLowerCase() + handlerName.slice(1);
                this.components[propName] = new window[handlerName](this.gameCore, this.aiPlayer);
                console.log(`  ✅ ${handlerName}`);
            }
        });
        
        // Move Generator
        if (typeof MoveGenerator !== 'undefined') {
            this.components.moveGenerator = new MoveGenerator(this.gameCore, this.aiPlayer);
            console.log('  ✅ Move Generator');
        }
        
        console.log('✅ Move handlers initialized\n');
    }

    // ===== STEP 5: AI CONTAINER =====
    
    initializeAIContainer() {
        console.log('🤖 Step 5: Creating AI container...');
        
        if (typeof SimpleChainController !== 'undefined') {
            // Create as EMPTY container - no internal initialization
            this.components.ai = new SimpleChainController(this.gameCore, this.aiPlayer);
            this.components.ai.skipInternalInit = true; // Flag to prevent duplicate init
            console.log('  ✅ Simple Chain Controller (empty container)');
        } else if (typeof SimpleChainAI !== 'undefined') {
            this.components.ai = new SimpleChainAI(this.gameCore, this.aiPlayer);
            console.log('  ✅ Simple Chain AI (empty container)');
        } else {
            throw new Error('No AI container available');
        }
        
        console.log('✅ AI container created\n');
    }

    // ===== STEP 6: WIRE EVERYTHING =====
    
    wireAllComponents() {
        console.log('🔗 Step 6: Wiring all components...');
        
        // Wire handlers to move generator
        this.wireHandlersToMoveGenerator();
        
        // Wire dependencies to handlers
        this.wireDependenciesToHandlers();
        
        // Wire everything to AI container
        this.wireComponentsToAI();
        
        // CRITICAL: Inject mathematical geometry into AI modules
        this.injectMathematicalGeometry();
        
        console.log('✅ All components wired\n');
    }
    
    /**
     * CRITICAL: Inject mathematical geometry into AI modules
     * Required for proper border calculations and pattern validation
     */
    injectMathematicalGeometry() {
        console.log('🔬 Injecting mathematical geometry into AI modules...');
        
        const modulesToEnhance = [
            { module: this.components.chainExtensionHandler, name: 'Chain Extension Handler' },
            { module: this.components.headManager, name: 'Head Manager' },
            { module: this.components.patternDetector, name: 'Pattern Detector' },
            { module: this.components.fragmentAnalyzer, name: 'Fragment Analyzer' }
        ];
        
        modulesToEnhance.forEach(({module, name}) => {
            if (module && this.components.geometry) {
                // Inject geometry instance
                module.geometry = this.components.geometry;
                
                // Also inject player config if available
                if (this.playerConfig) {
                    module.playerConfig = this.playerConfig;
                }
                
                console.log(`  ✅ ${name} enhanced with mathematical geometry`);
            }
        });
        
        console.log('✅ Mathematical geometry injected\n');
    }

    wireHandlersToMoveGenerator() {
        if (!this.components.moveGenerator) return;
        
        const connections = [
            { handler: 'initialMoveHandler', method: 'setInitialMoveHandler' },
            { handler: 'threatHandler', method: 'setThreatHandler' },
            { handler: 'chainExtensionHandler', method: 'setChainExtensionHandler' },
            { handler: 'gapFillingHandler', method: 'setGapFillingHandler' },
            { handler: 'borderConnectionHandler', method: 'setBorderConnectionHandler' },
            { handler: 'attackHandler', method: 'setAttackHandler' },
            { handler: 'diagonalExtensionHandler', method: 'setDiagonalExtensionHandler' },
            { handler: 'moveValidator', method: 'setMoveValidator' }
        ];
        
        connections.forEach(({ handler, method }) => {
            if (this.components[handler] && this.components.moveGenerator[method]) {
                this.components.moveGenerator[method](this.components[handler]);
            }
        });
    }

   wireDependenciesToHandlers() {
    const injectionMap = [
        { dep: 'universalGapCalculator', method: 'setGapCalculator' },
        { dep: 'gapRegistry', method: 'setGapRegistry' },
        { dep: 'gapAnalyzer', method: 'setGapAnalyzer' },
        { dep: 'patternDetector', method: 'setPatternDetector' },
        { dep: 'gapBlockingDetector', method: 'setGapBlockingDetector' },
        { dep: 'fragmentAnalyzer', method: 'setFragmentAnalyzer' },
        { dep: 'fragmentManager', method: 'setFragmentManager' },
        { dep: 'headManager', method: 'setHeadManager' },
        { dep: 'strategicExtensionManager', method: 'setStrategicExtensionManager' }, // ⭐ ADD THIS LINE
        { dep: 'moveValidator', method: 'setMoveValidator' },
        { dep: 'geometry', prop: 'geometry' }
    ];
    
    // Apply to all handlers
    Object.keys(this.components).forEach(componentKey => {
        const component = this.components[componentKey];
        if (!component) return;
        
        injectionMap.forEach(({ dep, method, prop }) => {
            if (!this.components[dep]) return;
            
            if (method && typeof component[method] === 'function') {
                component[method](this.components[dep]);
            } else if (prop && component.hasOwnProperty(prop)) {
                component[prop] = this.components[dep];
            }
        });
    });
}

    wireComponentsToAI() {
        if (!this.components.ai) return;
        
        // Inject ALL components into AI
        Object.keys(this.components).forEach(key => {
            if (key === 'ai') return; // Don't inject AI into itself
            
            const component = this.components[key];
            const setterMethod = 'set' + key.charAt(0).toUpperCase() + key.slice(1);
            
            // Try setter method first
            if (typeof this.components.ai[setterMethod] === 'function') {
                this.components.ai[setterMethod](component);
            } 
            // Otherwise direct assignment
            else {
                this.components.ai[key] = component;
            }
        });
    }

    // ===== STEP 7: VERIFY =====
    
    verifySystem() {
        console.log('🔍 Step 7: Verifying system...');
        
        const criticalComponents = [
            'universalGapCalculator',
            'gapRegistry',
            'patternDetector',
            'moveGenerator',
            'ai'
        ];
        
        const missing = criticalComponents.filter(comp => !this.components[comp]);
        
        if (missing.length > 0) {
            throw new Error(`Critical components missing: ${missing.join(', ')}`);
        }
        
        console.log('✅ System verification passed\n');
    }

    // ===== HELPER: Inject diagonal lines manager =====
    
   
injectDiagonalLinesManager(diagonalLinesManager) {
    console.log('🔗 Injecting diagonal lines manager...');
    
    this.components.diagonalLinesManager = diagonalLinesManager;
    
    // ✅ Inject into gap blocking detector (CRITICAL)
    if (this.components.gapBlockingDetector) {
        this.components.gapBlockingDetector.setDiagonalLinesManager(diagonalLinesManager);
        console.log('  ✅ Diagonal lines → Gap Blocking Detector');
    }
    
    // Inject into handlers that need it
    if (this.components.diagonalExtensionHandler && 
        this.components.diagonalExtensionHandler.setDiagonalLinesManager) {
        this.components.diagonalExtensionHandler.setDiagonalLinesManager(diagonalLinesManager);
        console.log('  ✅ Diagonal lines → Diagonal Extension Handler');
    }
    
    console.log('✅ Diagonal lines manager injection complete');
}
    // ===== DIAGNOSTICS =====
    
    getSystemReport() {
        const report = {
            totalComponents: Object.keys(this.components).length,
            components: {},
            connections: {}
        };
        
        Object.keys(this.components).forEach(key => {
            report.components[key] = !!this.components[key];
        });
        
        return report;
    }

    // Minor fix for system-initializer.js printSystemReport method
// Just replace the printSystemReport method in your existing file:

printSystemReport() {
    console.log('\n📊 === SYSTEM REPORT ===');
    console.log(`Total components: ${Object.keys(this.components).length}\n`);
    
    console.log('Core System:');
    // Fixed: Don't check for gameCore in components (it's stored separately)
    ['universalGapCalculator', 'geometry'].forEach(key => {
        console.log(`  ${!!this.components[key] ? '✅' : '❌'} ${key}`);
    });
    console.log(`  ✅ gameCore (${this.gameCore ? 'passed to initializer' : 'missing'})`);
    
    console.log('\nGap System:');
    ['patternDetector', 'gapAnalyzer', 'gapRegistry', 'gapBlockingDetector'].forEach(key => {
        console.log(`  ${!!this.components[key] ? '✅' : '❌'} ${key}`);
    });
    
    console.log('\nFragment System:');
    ['fragmentAnalyzer', 'fragmentManager', 'headManager'].forEach(key => {
        console.log(`  ${!!this.components[key] ? '✅' : '❌'} ${key}`);
    });
    
    console.log('\nMove Handlers:');
    ['initialMoveHandler', 'threatHandler', 'chainExtensionHandler', 'gapFillingHandler', 
     'attackHandler', 'borderConnectionHandler', 'diagonalExtensionHandler'].forEach(key => {
        console.log(`  ${!!this.components[key] ? '✅' : '❌'} ${key}`);
    });
    
    console.log('\nAI System:');
    ['moveGenerator', 'ai'].forEach(key => {
        console.log(`  ${!!this.components[key] ? '✅' : '❌'} ${key}`);
    });
    
    console.log('\n======================\n');
}
}
// Export
if (typeof window !== 'undefined') {
    window.GameSystemInitializer = GameSystemInitializer;
    console.log('✅ Game System Initializer loaded');
}