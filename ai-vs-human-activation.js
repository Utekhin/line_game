// ai-vs-human-activation.js - FIXED: Works with corrected observer
// SIMPLIFIED: Activation without redundant board creation

console.log('🎮 Loading AI vs Human Activation...');

// ===== WAIT FOR OBSERVER =====
function waitForObserver(maxAttempts = 50) {
    return new Promise((resolve) => {
        let attempts = 0;
        
        const checkLoop = () => {
            attempts++;
            
            if (window.aivsHumanObserver && window.aivsHumanObserver.controller) {
                console.log(`✅ Observer ready after ${attempts} attempts`);
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error('❌ Observer not ready after maximum attempts');
                resolve(false);
                return;
            }
            
            setTimeout(checkLoop, 100);
        };
        
        checkLoop();
    });
}

// ===== MAIN ACTIVATION FUNCTION =====
window.activateAIvsHuman = async function() {
    console.log('🚀 Starting AI vs Human activation...');
    
    try {
        // Step 1: Wait for observer to be ready
        const observerReady = await waitForObserver();
        if (!observerReady) {
            showError('Observer not initialized. Check console for errors.');
            return false;
        }
        
        const observer = window.aivsHumanObserver;
        const controller = observer.controller;
        
        console.log('✅ Observer and controller ready');
        
        // Step 2: Verify system components
        console.log('🔍 Verifying system components...');
        
        if (!controller) {
            showError('Controller not available');
            return false;
        }
        
        if (!controller.ai) {
            showError('AI not initialized');
            return false;
        }
        
        if (!controller.components) {
            showError('System components not initialized');
            return false;
        }
        
        console.log('✅ Core systems verified');
        
        // Step 3: Verify board was created
        const boardGrid = document.getElementById('board-grid');
        if (!boardGrid) {
            showError('Board grid element not found');
            return false;
        }
        
        const cells = boardGrid.querySelectorAll('.cell');
        const expectedCells = 15 * 15; // 225 cells
        
        if (cells.length !== expectedCells) {
            console.warn(`⚠️ Expected ${expectedCells} cells, found ${cells.length}`);
            
            // Try to recreate board if cells are missing
            if (cells.length === 0) {
                console.log('🔧 Attempting to recreate board...');
                observer.createBoard();
                
                // Check again
                const newCells = boardGrid.querySelectorAll('.cell');
                if (newCells.length === 0) {
                    showError('Board creation failed - no cells created');
                    return false;
                }
                console.log(`✅ Board recreated with ${newCells.length} cells`);
            }
        } else {
            console.log(`✅ Board verified: ${cells.length} cells`);
        }
        
        // Step 4: Store global reference
        window.aivsHumanInstance = {
            observer: observer,
            controller: controller,
            ai: controller.ai,
            gameCore: observer.gameCore
        };
        
        console.log('✅ Global instance created');
        
        // Step 5: Verify AI system
        if (controller.ai) {
            console.log('🤖 AI System:', controller.ai.constructor?.name || 'Unknown');
            
            if (typeof controller.ai.getMove === 'function') {
                console.log('✅ AI getMove method available');
            } else {
                console.warn('⚠️ AI getMove method missing');
            }
            
            // Check AI status
            const aiStatus = controller.ai.getSystemStatus();
            console.log('🤖 AI Status:', aiStatus);
        }
        
        // Step 6: Print system report
        if (controller.initializer && typeof controller.initializer.printSystemReport === 'function') {
            controller.initializer.printSystemReport();
        }
        
        // Step 7: Setup main button
        const mainButton = document.getElementById('mainButton');
        if (mainButton) {
            mainButton.onclick = () => {
                if (!observer.gameRunning) {
                    controller.startGame();
                    mainButton.textContent = 'Pause Game';
                } else {
                    if (controller.pauseGame) {
                        controller.pauseGame();
                        mainButton.textContent = 'Resume Game';
                    }
                }
            };
            console.log('✅ Main button configured');
        }
        
        // Step 8: Final verification
        console.log('\n📊 Final System Verification:');
        console.log('- Observer exists:', !!window.aivsHumanObserver);
        console.log('- Controller exists:', !!controller);
        console.log('- AI exists:', !!controller.ai);
        console.log('- Game Core exists:', !!observer.gameCore);
        console.log('- Diagonal Lines exists:', !!observer.diagonalLines);
        console.log('- Board cells count:', cells.length);
        
        // Test getGameState
        try {
            const testState = controller.getGameState();
            console.log('- getGameState works:', !!testState);
            console.log('- State properties:', Object.keys(testState || {}));
        } catch (error) {
            console.warn('- getGameState test failed:', error.message);
        }
        
        console.log('\n✅ AI vs Human game activated successfully!');
        console.log('🎯 System ready for gameplay');
        console.log('💡 Click "Start Game" to begin\n');
        
        return true;
        
    } catch (error) {
        console.error('💥 Activation error:', error);
        console.error('Stack trace:', error.stack);
        showError(`Activation failed: ${error.message}`);
        return false;
    }
};

// ===== ERROR DISPLAY FUNCTION =====
function showError(message) {
    console.error('🚨 Showing error to user:', message);
    
    const errorTarget = document.getElementById('gameStatus') || 
                       document.getElementById('mainButton') || 
                       document.body;
    
    if (errorTarget) {
        const errorHTML = `
            <div style="color: red; padding: 15px; border: 2px solid red; margin: 10px; border-radius: 5px; background: #fff5f5;">
                <h3>❌ Game Loading Error</h3>
                <p><strong>Error:</strong> ${message}</p>
                <p><small>Check browser console (F12) for details</small></p>
            </div>
        `;
        
        if (errorTarget.id === 'gameStatus') {
            errorTarget.innerHTML = 'Error!';
        } else {
            errorTarget.insertAdjacentHTML('afterend', errorHTML);
        }
    }
}

// ===== AUTO-ACTIVATE =====
// Automatically activate when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, activating game...');
        setTimeout(() => window.activateAIvsHuman(), 500);
    });
} else {
    console.log('📄 DOM already loaded, activating game...');
    setTimeout(() => window.activateAIvsHuman(), 500);
}

console.log('✅ Activation script loaded');