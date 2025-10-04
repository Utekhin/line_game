// game-log-handler.js - Game Log UI Handler
// Single responsibility: Manage game log display

class GameLogHandler {
    constructor(logElementId = 'gameLog') {
        this.logElement = null;
        this.logElementId = logElementId;
        this.initialized = false;
        
        // Initialize immediately if DOM ready, otherwise wait
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.logElement = document.getElementById(this.logElementId);
        
        if (!this.logElement) {
            console.error(`❌ Game log element #${this.logElementId} not found`);
            return;
        }
        
        this.logElement.textContent = 'System ready. Click \'Start Game\' to begin...';
        this.initialized = true;
        console.log('✅ Game log handler initialized');
    }

    log(message) {
        if (!this.initialized || !this.logElement) {
            console.warn('⚠️ Game log not initialized yet, logging to console:', message);
            console.log(`[GAME-LOG] ${message}`);
            return;
        }
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const logEntry = `[${timeStr}] ${message}`;
        
        if (this.logElement.textContent === 'System ready. Click \'Start Game\' to begin...') {
            this.logElement.textContent = logEntry;
        } else {
            this.logElement.textContent += '\n' + logEntry;
        }
        
        this.logElement.scrollTop = this.logElement.scrollHeight;
        console.log(`[GAME-LOG] ${message}`);
    }

    clear() {
        if (this.logElement) {
            this.logElement.textContent = '';
        }
    }

    reset() {
        if (this.logElement) {
            this.logElement.textContent = 'System ready. Click \'Start Game\' to begin...';
        }
    }
}

// Export immediately - no delays
if (typeof window !== 'undefined') {
    window.GameLogHandler = GameLogHandler;
    window.gameLogHandler = new GameLogHandler();
    
    // Create the global log function immediately
    window.logToGameLog = function(message) {
        if (window.gameLogHandler) {
            window.gameLogHandler.log(message);
        } else {
            console.log(`[GAME-LOG] ${message}`);
        }
    };
    
    console.log('✅ Game Log Handler loaded and window.logToGameLog created');
}