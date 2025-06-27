// Tetris Game for Nintendo TrenchBoy

class TetrisGame extends GameEngine {
    constructor(canvas) {
        super(canvas);
        
        // Game settings
        this.blockSize = 6; // Reduced from 8 to fit screen better
        this.boardWidth = 10;
        this.boardHeight = 18; // Reduced from 20 to fit screen
        this.boardOffsetX = 25; // Adjusted for better centering
        this.boardOffsetY = 25; // More space at top for UI
        
        // Game state
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.pieceX = 0;
        this.pieceY = 0;
        this.rotation = 0;
        
        // Timing
        this.dropTimer = 0;
        this.dropDelay = 800; // Start at 800ms
        this.lockTimer = 0;
        this.lockDelay = 500; // Half second to move piece before it locks
        this.isLocking = false;
        
        // Input handling
        this.dasTimer = 0; // Delayed Auto Shift
        this.dasDelay = 150;
        this.dasSpeed = 50;
        this.lastMoveDirection = 0;
        
        // Scoring
        this.level = 1;
        this.lines = 0;
        this.lineScores = [40, 100, 300, 1200]; // 1-4 lines
        
        // Tetromino definitions
        this.tetrominoes = {
            I: {
                shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
                color: 'cyan'
            },
            O: {
                shape: [[1,1],[1,1]],
                color: 'yellow'
            },
            T: {
                shape: [[0,1,0],[1,1,1],[0,0,0]],
                color: 'purple'
            },
            S: {
                shape: [[0,1,1],[1,1,0],[0,0,0]],
                color: 'green'
            },
            Z: {
                shape: [[1,1,0],[0,1,1],[0,0,0]],
                color: 'red'
            },
            J: {
                shape: [[1,0,0],[1,1,1],[0,0,0]],
                color: 'blue'
            },
            L: {
                shape: [[0,0,1],[1,1,1],[0,0,0]],
                color: 'orange'
            }
        };
        
        // Bag randomization
        this.pieceBag = [];
        
        this.init();
    }
    
    init() {
        // Initialize empty board
        this.board = Array(this.boardHeight).fill(null).map(() => 
            Array(this.boardWidth).fill(0)
        );
        
        // Reset game state
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropDelay = 800;
        this.pieceBag = [];
        
        // Spawn first pieces
        this.nextPiece = this.getNextPiece();
        this.spawnPiece();
    }
    
    // 7-bag randomization
    getNextPiece() {
        if (this.pieceBag.length === 0) {
            // Refill bag with all 7 pieces
            this.pieceBag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
            // Shuffle
            for (let i = this.pieceBag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.pieceBag[i], this.pieceBag[j]] = [this.pieceBag[j], this.pieceBag[i]];
            }
        }
        return this.pieceBag.pop();
    }
    
    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.getNextPiece();
        this.rotation = 0;
        
        // Calculate spawn position (top center)
        const piece = this.tetrominoes[this.currentPiece].shape;
        this.pieceX = Math.floor((this.boardWidth - piece[0].length) / 2);
        this.pieceY = 0;
        
        // Check game over
        if (!this.isValidPosition(this.pieceX, this.pieceY, piece)) {
            this.endGame();
        }
    }
    
    update(deltaTime) {
        // Handle input
        this.handleTetrisInput(deltaTime);
        
        // Update drop timer
        this.dropTimer += deltaTime;
        if (this.dropTimer >= this.dropDelay) {
            this.dropPiece();
            this.dropTimer = 0;
        }
        
        // Handle lock timer
        if (this.isLocking) {
            this.lockTimer += deltaTime;
            if (this.lockTimer >= this.lockDelay) {
                this.lockPiece();
            }
        }
    }
    
    handleTetrisInput(deltaTime) {
        // Rotation
        if (this.keys.a || this.keys.b) {
            if (!this.rotatePressed) {
                this.rotatePiece(this.keys.a ? 1 : -1);
                this.rotatePressed = true;
                
                // Reset lock timer on successful rotation
                if (this.isLocking) {
                    this.lockTimer = 0;
                }
            }
        } else {
            this.rotatePressed = false;
        }
        
        // Horizontal movement with DAS
        let moveDir = 0;
        if (this.keys.left) moveDir = -1;
        else if (this.keys.right) moveDir = 1;
        
        if (moveDir !== 0) {
            if (this.lastMoveDirection !== moveDir) {
                // Initial move
                this.movePiece(moveDir, 0);
                this.dasTimer = 0;
                this.lastMoveDirection = moveDir;
                
                // Reset lock timer on successful move
                if (this.isLocking) {
                    this.lockTimer = 0;
                }
            } else {
                // DAS (Delayed Auto Shift)
                this.dasTimer += deltaTime;
                if (this.dasTimer >= this.dasDelay) {
                    // Auto repeat
                    if (this.dasTimer >= this.dasDelay + this.dasSpeed) {
                        this.movePiece(moveDir, 0);
                        this.dasTimer = this.dasDelay;
                        
                        // Reset lock timer on successful move
                        if (this.isLocking) {
                            this.lockTimer = 0;
                        }
                    }
                }
            }
        } else {
            this.lastMoveDirection = 0;
            this.dasTimer = 0;
        }
        
        // Soft drop
        if (this.keys.down) {
            this.dropTimer += deltaTime * 19; // 20x speed
            this.score += 1; // 1 point per cell soft dropped
        }
        
        // Hard drop
        if (this.keys.up && !this.hardDropPressed) {
            this.hardDrop();
            this.hardDropPressed = true;
        } else if (!this.keys.up) {
            this.hardDropPressed = false;
        }
    }
    
    movePiece(dx, dy) {
        const piece = this.getRotatedPiece();
        if (this.isValidPosition(this.pieceX + dx, this.pieceY + dy, piece)) {
            this.pieceX += dx;
            this.pieceY += dy;
            return true;
        }
        return false;
    }
    
    dropPiece() {
        if (!this.movePiece(0, 1)) {
            // Can't move down, start lock timer
            if (!this.isLocking) {
                this.isLocking = true;
                this.lockTimer = 0;
            }
        }
    }
    
    hardDrop() {
        let dropDistance = 0;
        while (this.movePiece(0, 1)) {
            dropDistance++;
        }
        this.score += dropDistance * 2; // 2 points per cell hard dropped
        this.lockPiece();
        
        if (window.audioManager) {
            window.audioManager.play('button-press');
        }
    }
    
    rotatePiece(direction) {
        const oldRotation = this.rotation;
        this.rotation = (this.rotation + direction + 4) % 4;
        
        const piece = this.getRotatedPiece();
        
        // Try basic rotation
        if (this.isValidPosition(this.pieceX, this.pieceY, piece)) {
            if (window.audioManager) {
                window.audioManager.play('menu-move');
            }
            return;
        }
        
        // Wall kicks for all pieces except O
        if (this.currentPiece !== 'O') {
            const kicks = this.getWallKicks(oldRotation, this.rotation);
            for (let kick of kicks) {
                if (this.isValidPosition(this.pieceX + kick[0], this.pieceY + kick[1], piece)) {
                    this.pieceX += kick[0];
                    this.pieceY += kick[1];
                    if (window.audioManager) {
                        window.audioManager.play('menu-move');
                    }
                    return;
                }
            }
        }
        
        // Rotation failed, revert
        this.rotation = oldRotation;
    }
    
    getWallKicks(fromRot, toRot) {
        // Simplified SRS wall kicks
        const kicks = [
            [0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]
        ];
        return kicks;
    }
    
    getRotatedPiece() {
        const piece = this.tetrominoes[this.currentPiece].shape;
        if (this.rotation === 0) return piece;
        
        // Rotate the piece matrix
        let rotated = piece;
        for (let r = 0; r < this.rotation; r++) {
            rotated = this.rotateMatrix(rotated);
        }
        return rotated;
    }
    
    rotateMatrix(matrix) {
        const n = matrix.length;
        const rotated = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rotated[j][n - 1 - i] = matrix[i][j];
            }
        }
        return rotated;
    }
    
    isValidPosition(x, y, piece) {
        for (let py = 0; py < piece.length; py++) {
            for (let px = 0; px < piece[py].length; px++) {
                if (piece[py][px]) {
                    const boardX = x + px;
                    const boardY = y + py;
                    
                    // Check bounds
                    if (boardX < 0 || boardX >= this.boardWidth || 
                        boardY >= this.boardHeight) {
                        return false;
                    }
                    
                    // Check collision with board
                    if (boardY >= 0 && this.board[boardY][boardX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    lockPiece() {
        const piece = this.getRotatedPiece();
        const color = this.currentPiece;
        
        // Add piece to board
        for (let py = 0; py < piece.length; py++) {
            for (let px = 0; px < piece[py].length; px++) {
                if (piece[py][px]) {
                    const boardY = this.pieceY + py;
                    const boardX = this.pieceX + px;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = color;
                    }
                }
            }
        }
        
        // Check for completed lines
        this.checkLines();
        
        // Reset lock state
        this.isLocking = false;
        this.lockTimer = 0;
        
        // Spawn next piece
        this.spawnPiece();
        
        if (window.audioManager) {
            window.audioManager.play('blip');
        }
    }
    
    checkLines() {
        let linesCleared = 0;
        
        // Check from bottom to top
        for (let y = this.boardHeight - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                // Remove line
                this.board.splice(y, 1);
                // Add empty line at top
                this.board.unshift(Array(this.boardWidth).fill(0));
                linesCleared++;
                y++; // Check same row again
            }
        }
        
        if (linesCleared > 0) {
            // Update score
            this.score += this.lineScores[linesCleared - 1] * this.level;
            this.lines += linesCleared;
            
            // Level up every 10 lines
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.dropDelay = Math.max(50, 800 - (this.level - 1) * 50);
                
                if (window.audioManager) {
                    window.audioManager.play('coin');
                }
            }
            
            // Play sound based on lines cleared
            if (window.audioManager) {
                if (linesCleared === 4) {
                    window.audioManager.play('coin');
                } else {
                    window.audioManager.play('button-press');
                }
            }
        }
    }
    
    render() {
        // Draw board border
        this.drawRect(
            this.boardOffsetX - 2,
            this.boardOffsetY - 2,
            this.boardWidth * this.blockSize + 4,
            this.boardHeight * this.blockSize + 4,
            this.colors.secondary
        );
        
        // Draw board background
        this.drawRect(
            this.boardOffsetX,
            this.boardOffsetY,
            this.boardWidth * this.blockSize,
            this.boardHeight * this.blockSize,
            this.colors.background
        );
        
        // Draw board pieces
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.board[y][x]);
                }
            }
        }
        
        // Draw ghost piece
        this.drawGhostPiece();
        
        // Draw current piece
        if (this.currentPiece) {
            const piece = this.getRotatedPiece();
            for (let py = 0; py < piece.length; py++) {
                for (let px = 0; px < piece[py].length; px++) {
                    if (piece[py][px]) {
                        this.drawBlock(
                            this.pieceX + px,
                            this.pieceY + py,
                            this.currentPiece
                        );
                    }
                }
            }
        }
        
        // Draw next piece preview
        this.drawNextPiece();
        
        // Draw stats
        this.drawStats();
    }
    
    drawBlock(x, y, type) {
        if (y < 0) return; // Don't draw above board
        
        const pixelX = this.boardOffsetX + x * this.blockSize;
        const pixelY = this.boardOffsetY + y * this.blockSize;
        
        // Main block
        this.drawRect(
            pixelX,
            pixelY,
            this.blockSize,
            this.blockSize,
            this.colors.dark
        );
        
        // Inner highlight
        this.drawRect(
            pixelX + 1,
            pixelY + 1,
            this.blockSize - 2,
            this.blockSize - 2,
            this.colors.secondary
        );
    }
    
    drawGhostPiece() {
        if (!this.currentPiece) return;
        
        // Find drop position
        let ghostY = this.pieceY;
        const piece = this.getRotatedPiece();
        
        while (this.isValidPosition(this.pieceX, ghostY + 1, piece)) {
            ghostY++;
        }
        
        // Draw ghost blocks
        for (let py = 0; py < piece.length; py++) {
            for (let px = 0; px < piece[py].length; px++) {
                if (piece[py][px]) {
                    const x = this.pieceX + px;
                    const y = ghostY + py;
                    
                    if (y >= 0) {
                        const pixelX = this.boardOffsetX + x * this.blockSize;
                        const pixelY = this.boardOffsetY + y * this.blockSize;
                        
                        // Ghost outline
                        this.drawBorder(
                            pixelX / this.scale,
                            pixelY / this.scale,
                            this.blockSize,
                            this.blockSize,
                            this.colors.secondary,
                            1
                        );
                    }
                }
            }
        }
    }
    
    drawNextPiece() {
        // Next piece label
        this.drawPixelText('NEXT', 115, 30, 1, this.colors.dark);
        
        // Next piece box
        this.drawBorder(105, 38, 28, 28, this.colors.secondary, 1);
        
        if (this.nextPiece) {
            const piece = this.tetrominoes[this.nextPiece].shape;
            const offsetX = 108 + (4 - piece[0].length) * 3;
            const offsetY = 41 + (4 - piece.length) * 3;
            
            for (let y = 0; y < piece.length; y++) {
                for (let x = 0; x < piece[y].length; x++) {
                    if (piece[y][x]) {
                        this.drawRect(
                            offsetX + x * 5,
                            offsetY + y * 5,
                            5,
                            5,
                            this.colors.dark
                        );
                        this.drawRect(
                            offsetX + x * 5 + 1,
                            offsetY + y * 5 + 1,
                            3,
                            3,
                            this.colors.secondary
                        );
                    }
                }
            }
        }
    }
    
    drawStats() {
        // Background boxes for better readability
        this.drawRect(105, 70, 45, 50, this.colors.secondary);
        this.drawBorder(105, 70, 45, 50, this.colors.dark, 1);
        
        // Level
        this.drawPixelText('LEVEL', 115, 75, 1, this.colors.dark);
        this.drawPixelText(this.level.toString(), 115, 88, 1.2, this.colors.background);
        
        // Lines
        this.drawPixelText('LINES', 115, 103, 1, this.colors.dark);
        this.drawPixelText(this.lines.toString(), 115, 116, 1.2, this.colors.background);
        
        // Score section with background
        this.drawRect(5, 5, 150, 15, this.colors.secondary);
        this.drawBorder(5, 5, 150, 15, this.colors.dark, 1);
        
        // Score (moved to top)
        this.drawPixelText(`SCORE:${this.score}`, this.screenWidth / 2, 13, 1, this.colors.background);
        
        // High score
        this.drawPixelText(`HI:${this.highScore}`, this.screenWidth - 25, 13, 1, this.colors.background);
    }
    
    restart() {
        this.gameOver = false;
        this.paused = false;
        this.newHighScore = false;
        this.enteringName = false;
        this.playerName = '';
        this.dropTimer = 0;
        this.init();
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    // Override drawUI to prevent double score display
    drawUI() {
        // Don't draw the default score - we draw it in drawStats()
        
        // Pause indicator
        if (this.paused) {
            // Draw pause overlay
            this.ctx.fillStyle = 'rgba(15, 56, 15, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawPixelText('PAUSED', this.screenWidth / 2, this.screenHeight / 2, 2, this.colors.background);
            this.drawPixelText('PRESS START', this.screenWidth / 2, this.screenHeight / 2 + 20, 1, this.colors.primary);
            this.drawPixelText('RETURN FOR MENU', this.screenWidth / 2, this.screenHeight / 2 + 30, 1, this.colors.primary);
        }
        
        // Name entry screen
        if (this.enteringName) {
            this.drawNameEntry();
            return;
        }
        
        // Game over screen
        if (this.gameOver) {
            // Draw game over overlay
            this.ctx.fillStyle = 'rgba(15, 56, 15, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawPixelText('GAME OVER', this.screenWidth / 2, this.screenHeight / 2 - 20, 2, this.colors.background);
            this.drawPixelText(`SCORE: ${this.score}`, this.screenWidth / 2, this.screenHeight / 2, 1, this.colors.primary);
            
            if (this.newHighScore) {
                this.drawPixelText('NEW HIGH SCORE!', this.screenWidth / 2, this.screenHeight / 2 + 15, 1, this.colors.background);
                this.drawPixelText('PRESS START', this.screenWidth / 2, this.screenHeight / 2 + 30, 1, this.colors.primary);
                this.drawPixelText('TO ENTER NAME', this.screenWidth / 2, this.screenHeight / 2 + 40, 1, this.colors.primary);
            } else {
                this.drawPixelText('PRESS START', this.screenWidth / 2, this.screenHeight / 2 + 30, 1, this.colors.primary);
            }
            
            this.drawPixelText('RETURN FOR MENU', this.screenWidth / 2, this.screenHeight / 2 + 50, 1, this.colors.primary);
        }
    }
}

// Register the game globally
window.TetrisGame = TetrisGame;