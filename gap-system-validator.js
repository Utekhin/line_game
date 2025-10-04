// gap-system-validator.js - NEW: Validation utility for gap system
// PURPOSE: Verify all module connections and interfaces
// USAGE: Call after system initialization to ensure everything is wired correctly

class GapSystemValidator {
    constructor() {
        this.results = [];
        this.errors = [];
        this.warnings = [];
    }

    /**
     * MAIN: Validate complete gap system
     * Returns validation report
     */
    validateGapSystem(components) {
        console.log('🔍 === GAP SYSTEM VALIDATION ===\n');
        
        this.results = [];
        this.errors = [];
        this.warnings = [];
        
        // Step 1: Validate Pattern Detector
        this.validatePatternDetector(components.patternDetector, components.universalGapCalculator);
        
        // Step 2: Validate Gap Analyzer
        this.validateGapAnalyzer(components.gapAnalyzer, components.patternDetector, components.gapBlockingDetector);
        
        // Step 3: Validate Gap Registry
        this.validateGapRegistry(components.gapRegistry, components.patternDetector, components.gapAnalyzer, components.gapBlockingDetector);
        
        // Step 4: Validate Gap Blocking Detector
        this.validateGapBlockingDetector(components.gapBlockingDetector);
        
        // Step 5: Test workflow
        this.testWorkflow(components);
        
        // Generate report
        return this.generateReport();
    }

    /**
     * Validate Pattern Detector
     */
    validatePatternDetector(patternDetector, universalGapCalculator) {
        console.log('📌 Validating Pattern Detector...');
        
        if (!patternDetector) {
            this.addError('Pattern Detector', 'Module not found');
            return;
        }
        
        // Check methods
        this.checkMethod(patternDetector, 'detectAllPatterns', 'Pattern Detector');
        this.checkMethod(patternDetector, 'findAllPatterns', 'Pattern Detector');
        this.checkMethod(patternDetector, 'findMixedPatterns', 'Pattern Detector');
        this.checkMethod(patternDetector, 'calculatePatternGaps', 'Pattern Detector');
        this.checkMethod(patternDetector, 'getPatternType', 'Pattern Detector');
        
        // Check connections
        if (!patternDetector.universalGapCalculator) {
            this.addError('Pattern Detector', 'UniversalGapCalculator not connected');
        } else if (patternDetector.universalGapCalculator !== universalGapCalculator) {
            this.addWarning('Pattern Detector', 'UniversalGapCalculator reference mismatch');
        } else {
            this.addSuccess('Pattern Detector', 'UniversalGapCalculator properly connected');
        }
        
        console.log('');
    }

    /**
     * Validate Gap Analyzer
     */
    validateGapAnalyzer(gapAnalyzer, patternDetector, gapBlockingDetector) {
        console.log('📌 Validating Gap Analyzer...');
        
        if (!gapAnalyzer) {
            this.addError('Gap Analyzer', 'Module not found');
            return;
        }
        
        // Check methods
        this.checkMethod(gapAnalyzer, 'analyzeGaps', 'Gap Analyzer');
        this.checkMethod(gapAnalyzer, 'hasAnyGaps', 'Gap Analyzer');
        this.checkMethod(gapAnalyzer, 'findAttackOpportunities', 'Gap Analyzer');
        this.checkMethod(gapAnalyzer, 'categorizeGaps', 'Gap Analyzer');
        this.checkMethod(gapAnalyzer, 'filterBlockedGaps', 'Gap Analyzer');
        
        // Check connections
        if (!gapAnalyzer.patternDetector) {
            this.addError('Gap Analyzer', 'PatternDetector not connected');
        } else if (gapAnalyzer.patternDetector !== patternDetector) {
            this.addWarning('Gap Analyzer', 'PatternDetector reference mismatch');
        } else {
            this.addSuccess('Gap Analyzer', 'PatternDetector properly connected');
        }
        
        if (!gapAnalyzer.gapBlockingDetector) {
            this.addWarning('Gap Analyzer', 'GapBlockingDetector not connected (optional)');
        } else if (gapAnalyzer.gapBlockingDetector !== gapBlockingDetector) {
            this.addWarning('Gap Analyzer', 'GapBlockingDetector reference mismatch');
        } else {
            this.addSuccess('Gap Analyzer', 'GapBlockingDetector properly connected');
        }
        
        // Check interface
        const analyzeGapsParams = this.getFunctionParamCount(gapAnalyzer.analyzeGaps);
        if (analyzeGapsParams !== 1) {
            this.addError('Gap Analyzer', `analyzeGaps should take 1 parameter (player), found ${analyzeGapsParams}`);
        } else {
            this.addSuccess('Gap Analyzer', 'analyzeGaps interface correct (1 parameter)');
        }
        
        console.log('');
    }

    /**
     * Validate Gap Registry
     */
    validateGapRegistry(gapRegistry, patternDetector, gapAnalyzer, gapBlockingDetector) {
        console.log('📌 Validating Gap Registry...');
        
        if (!gapRegistry) {
            this.addError('Gap Registry', 'Module not found');
            return;
        }
        
        // Check methods
        this.checkMethod(gapRegistry, 'updateRegistry', 'Gap Registry');
        this.checkMethod(gapRegistry, 'runGapAnalysis', 'Gap Registry');
        this.checkMethod(gapRegistry, 'getPlayerPatterns', 'Gap Registry');
        this.checkMethod(gapRegistry, 'getGapAnalysis', 'Gap Registry');
        this.checkMethod(gapRegistry, 'getThreatenedGaps', 'Gap Registry');
        this.checkMethod(gapRegistry, 'getSafeGaps', 'Gap Registry');
        this.checkMethod(gapRegistry, 'getAttackOpportunities', 'Gap Registry');
        
        // Check connections
        if (!gapRegistry.patternDetector) {
            this.addError('Gap Registry', 'PatternDetector not connected');
        } else if (gapRegistry.patternDetector !== patternDetector) {
            this.addWarning('Gap Registry', 'PatternDetector reference mismatch');
        } else {
            this.addSuccess('Gap Registry', 'PatternDetector properly connected');
        }
        
        if (!gapRegistry.gapAnalyzer) {
            this.addError('Gap Registry', 'GapAnalyzer not connected');
        } else if (gapRegistry.gapAnalyzer !== gapAnalyzer) {
            this.addWarning('Gap Registry', 'GapAnalyzer reference mismatch');
        } else {
            this.addSuccess('Gap Registry', 'GapAnalyzer properly connected');
        }
        
        if (!gapRegistry.gapBlockingDetector) {
            this.addWarning('Gap Registry', 'GapBlockingDetector not connected (optional)');
        } else if (gapRegistry.gapBlockingDetector !== gapBlockingDetector) {
            this.addWarning('Gap Registry', 'GapBlockingDetector reference mismatch');
        } else {
            this.addSuccess('Gap Registry', 'GapBlockingDetector properly connected');
        }
        
        console.log('');
    }

    /**
     * Validate Gap Blocking Detector
     */
    validateGapBlockingDetector(gapBlockingDetector) {
        console.log('📌 Validating Gap Blocking Detector...');
        
        if (!gapBlockingDetector) {
            this.addWarning('Gap Blocking Detector', 'Module not found (optional)');
            console.log('');
            return;
        }
        
        // Check methods
        this.checkMethod(gapBlockingDetector, 'isGapBlocked', 'Gap Blocking Detector');
        this.checkMethod(gapBlockingDetector, 'filterBlockedGaps', 'Gap Blocking Detector');
        this.checkMethod(gapBlockingDetector, 'isDiagonallyBlocked', 'Gap Blocking Detector');
        
        // Check diagonal lines connection
        if (!gapBlockingDetector.diagonalLinesManager) {
            this.addWarning('Gap Blocking Detector', 'DiagonalLinesManager not connected (will be injected later)');
        } else {
            this.addSuccess('Gap Blocking Detector', 'DiagonalLinesManager connected');
        }
        
        console.log('');
    }

    /**
     * Test workflow
     */
    testWorkflow(components) {
        console.log('📌 Testing Workflow...');
        
        try {
            // Test 1: Pattern Detection
            if (components.patternDetector && components.gameCore) {
                const allPatterns = components.patternDetector.detectAllPatterns();
                this.addSuccess('Workflow', `Pattern detection works: ${allPatterns.length} patterns found`);
            }
            
            // Test 2: Gap Analysis
            if (components.gapAnalyzer) {
                const xAnalysis = components.gapAnalyzer.analyzeGaps('X');
                const oAnalysis = components.gapAnalyzer.analyzeGaps('O');
                this.addSuccess('Workflow', `Gap analysis works: X has ${xAnalysis.totalGaps} gaps, O has ${oAnalysis.totalGaps} gaps`);
            }
            
            // Test 3: Registry Update
            if (components.gapRegistry) {
                components.gapRegistry.updateRegistry();
                const stats = components.gapRegistry.getStats();
                this.addSuccess('Workflow', `Registry update works: ${stats.totalPatterns} patterns, ${stats.totalGaps} gap positions`);
            }
            
            // Test 4: Blocking Detection (if available)
            if (components.gapBlockingDetector && components.gapAnalyzer) {
                const testGaps = components.gapAnalyzer.analyzeGaps('X').gaps;
                if (testGaps.length > 0) {
                    const filtered = components.gapBlockingDetector.filterBlockedGaps(testGaps, 'X');
                    this.addSuccess('Workflow', `Blocking detection works: ${filtered.blockedGaps.length} gaps filtered`);
                }
            }
            
        } catch (error) {
            this.addError('Workflow', `Test failed: ${error.message}`);
        }
        
        console.log('');
    }

    // ===== HELPER METHODS =====
    
    checkMethod(obj, methodName, moduleName) {
        if (typeof obj[methodName] === 'function') {
            this.addSuccess(moduleName, `Method ${methodName}() exists`);
        } else {
            this.addError(moduleName, `Method ${methodName}() missing`);
        }
    }

    getFunctionParamCount(func) {
        if (typeof func !== 'function') return 0;
        const funcStr = func.toString();
        const params = funcStr.slice(funcStr.indexOf('(') + 1, funcStr.indexOf(')'));
        return params.split(',').filter(p => p.trim()).length;
    }

    addSuccess(module, message) {
        this.results.push({ type: 'success', module, message });
        console.log(`  ✅ ${message}`);
    }

    addWarning(module, message) {
        this.warnings.push({ module, message });
        this.results.push({ type: 'warning', module, message });
        console.log(`  ⚠️  ${message}`);
    }

    addError(module, message) {
        this.errors.push({ module, message });
        this.results.push({ type: 'error', module, message });
        console.log(`  ❌ ${message}`);
    }

    generateReport() {
        console.log('📊 === VALIDATION REPORT ===\n');
        
        const successCount = this.results.filter(r => r.type === 'success').length;
        const warningCount = this.warnings.length;
        const errorCount = this.errors.length;
        
        console.log(`✅ Successes: ${successCount}`);
        console.log(`⚠️  Warnings: ${warningCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('');
        
        if (errorCount > 0) {
            console.log('🚨 CRITICAL ERRORS:');
            this.errors.forEach(err => {
                console.log(`   • [${err.module}] ${err.message}`);
            });
            console.log('');
        }
        
        if (warningCount > 0) {
            console.log('⚠️  WARNINGS:');
            this.warnings.forEach(warn => {
                console.log(`   • [${warn.module}] ${warn.message}`);
            });
            console.log('');
        }
        
        const isValid = errorCount === 0;
        
        if (isValid) {
            console.log('✅ GAP SYSTEM VALIDATION PASSED!');
        } else {
            console.log('❌ GAP SYSTEM VALIDATION FAILED!');
        }
        
        console.log('');
        
        return {
            valid: isValid,
            successCount,
            warningCount,
            errorCount,
            errors: this.errors,
            warnings: this.warnings,
            results: this.results
        };
    }

    /**
     * Quick validation check
     */
    static quickValidate(components) {
        const validator = new GapSystemValidator();
        return validator.validateGapSystem(components);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.GapSystemValidator = GapSystemValidator;
    console.log('✅ Gap System Validator loaded');
    console.log('   Usage: GapSystemValidator.quickValidate(components)');
}