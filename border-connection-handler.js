// border-connection-handler.js - COMPLETE: I-pattern gap logic for border connection

class BorderConnectionHandler {
    constructor(gameCore, player) {
        this.gameCore = gameCore;
        this.player = player;
        this.opponent = player === 'X' ? 'O' : 'X';
        this.direction = player === 'X' ? 'vertical' : 'horizontal';
        
        // Border rows/cols
        this.borderRows = player === 'X' ? [0, 14] : null;
        this.borderCols = player === 'O' ? [0, 14] : null;
        this.nearBorderRows = player === 'X' ? [1, 13] : null;
        this.nearBorderCols = player === 'O' ? [1, 13] : null;
        
        // Tracking
        this.connectedBorders = new Set();
        this.borderConnections = [];
        
        this.debugMode = true;
        this.log('Border Connection Handler initialized - I-pattern gap logic');
    }

    // ===== MAIN BORDER CONNECTION =====
    
    checkBorderConnection() {
        this.log('Checking for border connection...');
        
        try {
            const nearBorderPieces = this.findPiecesNeedingConnection();
            
            if (nearBorderPieces.length === 0) {
                this.log('No pieces near target borders');
                return null;
            }
            
            this.log(`Found ${nearBorderPieces.length} pieces needing border connection`);
            
            const connectionMove = this.generateBorderConnectionMove(nearBorderPieces);
            
            if (connectionMove) {
                this.log(`Border connection: (${connectionMove.row},${connectionMove.col})`);
                return connectionMove;
            }
            
            return null;
            
        } catch (error) {
            this.log(`Error in border connection: ${error.message}`);
            return null;
        }
    }

    // ===== PIECE DETECTION =====
    
    findPiecesNeedingConnection() {
        const pieces = [];
        
        for (let row = 0; row < this.gameCore.size; row++) {
            for (let col = 0; col < this.gameCore.size; col++) {
                if (this.gameCore.board[row][col] !== this.player) continue;
                
                if (this.needsBorderConnection(row, col)) {
                    const borderInfo = this.analyzeBorderConnection(row, col);
                    if (borderInfo && !this.isBorderConnected(borderInfo.borderType)) {
                        pieces.push({
                            row,
                            col,
                            targetBorder: borderInfo.targetBorder,
                            borderType: borderInfo.borderType,
                            distance: borderInfo.distance
                        });
                    }
                }
            }
        }
        
        return pieces;
    }

    needsBorderConnection(row, col) {
        if (this.player === 'X') {
            return row === 1 || row === 13;
        } else {
            return col === 1 || col === 13;
        }
    }

    analyzeBorderConnection(row, col) {
        if (this.player === 'X') {
            if (row === 1) {
                return { targetBorder: 0, borderType: 'top', distance: 1 };
            } else if (row === 13) {
                return { targetBorder: 14, borderType: 'bottom', distance: 1 };
            }
        } else {
            if (col === 1) {
                return { targetBorder: 0, borderType: 'left', distance: 1 };
            } else if (col === 13) {
                return { targetBorder: 14, borderType: 'right', distance: 1 };
            }
        }
        return null;
    }

    // ===== CONNECTION MOVE GENERATION =====
    
    generateBorderConnectionMove(nearBorderPieces) {
        const piece = nearBorderPieces[0];
        
        const borderKey = `${piece.borderType}-${piece.targetBorder}`;
        if (this.connectedBorders.has(borderKey)) {
            this.log(`Border ${piece.borderType} already connected`);
            return null;
        }
        
        const gapCells = this.generateIPatternGap(piece);
        
        if (gapCells.length === 0) {
            this.log('No valid gap cells for border connection');
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * gapCells.length);
        const selectedCell = gapCells[randomIndex];
        
        this.connectedBorders.add(borderKey);
        
        return {
            row: selectedCell.row,
            col: selectedCell.col,
            type: 'BORDER_CONNECTION',
            reason: `Border connection ${piece.borderType} (I-pattern gap)`,
            moveType: 'border-connection',
            pattern: 'I-border',
            fromPiece: { row: piece.row, col: piece.col },
            gapCells: gapCells,
            priority: 900
        };
    }

    generateIPatternGap(piece) {
        const gapCells = [];
        
        if (this.player === 'X') {
            const targetRow = piece.targetBorder;
            
            for (let colOffset = -1; colOffset <= 1; colOffset++) {
                const gapCol = piece.col + colOffset;
                
                if (this.isValidAndEmpty(targetRow, gapCol)) {
                    gapCells.push({ row: targetRow, col: gapCol });
                }
            }
        } else {
            const targetCol = piece.targetBorder;
            
            for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                const gapRow = piece.row + rowOffset;
                
                if (this.isValidAndEmpty(gapRow, targetCol)) {
                    gapCells.push({ row: gapRow, col: targetCol });
                }
            }
        }
        
        return gapCells;
    }

    isValidAndEmpty(row, col) {
        return row >= 0 && row < this.gameCore.size &&
               col >= 0 && col < this.gameCore.size &&
               this.gameCore.board[row][col] === '';
    }

    isBorderConnected(borderType) {
        if (this.player === 'X') {
            if (borderType === 'top') {
                for (let col = 0; col < this.gameCore.size; col++) {
                    if (this.gameCore.board[0][col] === this.player) return true;
                }
            } else if (borderType === 'bottom') {
                for (let col = 0; col < this.gameCore.size; col++) {
                    if (this.gameCore.board[14][col] === this.player) return true;
                }
            }
        } else {
            if (borderType === 'left') {
                for (let row = 0; row < this.gameCore.size; row++) {
                    if (this.gameCore.board[row][0] === this.player) return true;
                }
            } else if (borderType === 'right') {
                for (let row = 0; row < this.gameCore.size; row++) {
                    if (this.gameCore.board[row][14] === this.player) return true;
                }
            }
        }
        return false;
    }

    // ===== UTILITY =====
    
    reset() {
        this.connectedBorders.clear();
        this.borderConnections = [];
        this.log('Border connection handler reset');
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[BORDER-CONNECTION] ${message}`);
        }
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Browser export
if (typeof window !== 'undefined') {
    window.BorderConnectionHandler = BorderConnectionHandler;
    console.log('✅ Border Connection Handler loaded - I-pattern gap logic');
}