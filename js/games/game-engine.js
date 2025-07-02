// Base Game Engine for Nintendo TrenchBoy Games

class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Game Boy screen dimensions
        this.screenWidth = 160;
        this.screenHeight = 144;
        this.scale = 3; // Scale factor for modern displays
        
        // Set canvas size
        this.canvas.width = this.screenWidth * this.scale;
        this.canvas.height = this.screenHeight * this.scale;
        
        // Game state
        this.running = false;
        this.paused = false;
        this.gameOver = false;
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.newHighScore = false;
        this.enteringName = false;
        this.playerName = '';
        
        // Virtual keyboard for name entry
        this.keyboard = {
            chars: [
                'ABCDEFGHI',
                'JKLMNOPQR',
                'STUVWXYZ_0123456789←'
            ],
            selectedRow: 0,
            selectedCol: 0,
            layout: [
                'ABCDEFGHI',
                'JKLMNOPQR', 
                'STUVWXYZ_',
                '0123456789',
                '←'
            ]
        };
        
        console.log(`Game initialized. High score: ${this.highScore}`); // Debug log
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.frameRate = 60;
        this.frameInterval = 1000 / this.frameRate;
        
        // Game Boy colors
        this.colors = {
            background: '#9BBC0F',
            primary: '#8BAC0F',
            secondary: '#306230',
            dark: '#0F380F'
        };
        
        // Update colors based on theme
        this.updateColors();
        
        // Input state
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            a: false,
            b: false,
            start: false,
            select: false
        };
        
        this.setupCanvas();
    }
    
    setupCanvas() {
        // Enable pixelated rendering
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
    }
    
    // Update colors based on current theme
    updateColors() {
        const gameboy = document.getElementById('gameboy');
        const style = getComputedStyle(gameboy);
        
        this.colors.background = style.getPropertyValue('--screen-green-1').trim() || '#9BBC0F';
        this.colors.primary = style.getPropertyValue('--screen-green-2').trim() || '#8BAC0F';
        this.colors.secondary = style.getPropertyValue('--screen-green-3').trim() || '#306230';
        this.colors.dark = style.getPropertyValue('--screen-green-4').trim() || '#0F380F';
    }
    
    // Start the game loop
    start() {
        this.updateColors(); // Update colors when game starts
        this.running = true;
        this.gameOver = false;
        this.score = 0;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    // Stop the game
    stop() {
        this.running = false;
        if (this.score > this.highScore) {
            this.saveHighScore(this.score);
        }
    }
    
    // Pause/unpause
    togglePause() {
        this.paused = !this.paused;
        if (!this.paused) {
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }
    
    // Main game loop
    gameLoop(currentTime) {
        if (!this.running) return;
        
        // Calculate delta time
        this.deltaTime = currentTime - this.lastTime;
        
        if (this.deltaTime >= this.frameInterval) {
            // Clear screen
            this.clearScreen();
            
            // Update and render
            if (!this.paused && !this.gameOver) {
                this.update(this.deltaTime);
            }
            this.render();
            
            // Draw UI elements
            this.drawUI();
            
            this.lastTime = currentTime - (this.deltaTime % this.frameInterval);
        }
        
        if (!this.paused) {
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
    
    // Clear the screen with Game Boy color
    clearScreen() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Handle keyboard input
    handleInput(key) {
        const keyMap = {
            'arrowup': 'up',
            'arrowdown': 'down',
            'arrowleft': 'left',
            'arrowright': 'right',
            'b': 'b',
            'a': 'a',
            ' ': 'start',
            'enter': 'start',
            'shift': 'return',
            'escape': 'return'
        };
        
        const mappedKey = keyMap[key.toLowerCase()];
        if (mappedKey) {
            // Don't process return key here - let main.js handle it
            if (mappedKey === 'return') return;
            
            // Handle name entry mode
            if (this.enteringName) {
                this.handleNameInput(mappedKey);
                return;
            }
            
            this.keys[mappedKey] = true;
            
            // Handle pause
            if (mappedKey === 'start' && this.running && !this.gameOver) {
                this.togglePause();
            }
            
            // Handle game over restart or name entry
            if (mappedKey === 'start' && this.gameOver) {
                if (this.newHighScore && !this.enteringName) {
                    this.enteringName = true;
                } else if (!this.newHighScore) {
                    this.restart();
                }
            }
        }
    }
    
    // Handle key release
    handleKeyUp(key) {
        const keyMap = {
            'arrowup': 'up',
            'arrowdown': 'down',
            'arrowleft': 'left',
            'arrowright': 'right',
            'z': 'b',
            'x': 'a',
            ' ': 'start',
            'enter': 'start',
            'shift': 'return',
            'escape': 'return'
        };
        
        const mappedKey = keyMap[key.toLowerCase()];
        if (mappedKey && mappedKey !== 'return') {
            this.keys[mappedKey] = false;
        }
    }
    
    // Draw pixel-perfect text
    drawPixelText(text, x, y, size = 1, color = this.colors.dark) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.font = `${8 * size * this.scale}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x * this.scale, y * this.scale);
        this.ctx.restore();
    }
    
    // Draw a pixel
    drawPixel(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            Math.floor(x) * this.scale,
            Math.floor(y) * this.scale,
            this.scale,
            this.scale
        );
    }
    
    // Draw a rectangle
    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            Math.floor(x) * this.scale,
            Math.floor(y) * this.scale,
            Math.floor(width) * this.scale,
            Math.floor(height) * this.scale
        );
    }
    
    // Draw a border
    drawBorder(x, y, width, height, color, thickness = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness * this.scale;
        this.ctx.strokeRect(
            Math.floor(x) * this.scale,
            Math.floor(y) * this.scale,
            Math.floor(width) * this.scale,
            Math.floor(height) * this.scale
        );
    }
    
    // Draw UI elements (score, pause, game over)
    drawUI() {
        // Score
        this.drawPixelText(`SCORE:${this.score}`, this.screenWidth / 2, 8, 1, this.colors.dark);
        
        // High score
        this.drawPixelText(`HI:${this.highScore}`, this.screenWidth - 30, 8, 1, this.colors.secondary);
        
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
    
    // Load high score from localStorage
    loadHighScore() {
        const saved = localStorage.getItem(`trenchboy_${this.constructor.name}_highscore`);
        return saved ? parseInt(saved) : 0;
    }
    
    // Save high score
    saveHighScore(score) {
        this.highScore = score;
        localStorage.setItem(`trenchboy_${this.constructor.name}_highscore`, score);
    }
    
    // End the game
    endGame() {
        this.gameOver = true;
        this.newHighScore = false;
        
        // Check if it's a new high score
        if (this.score > this.highScore) {
            this.newHighScore = true;
            console.log(`New high score! ${this.score} > ${this.highScore}`); // Debug
            // Don't save high score yet - wait until after name entry
        }
        
        // Play game over sound
        if (window.audioManager) {
            window.audioManager.play('game-over');
        }
    }
    
    // Methods to be overridden by specific games
    update(deltaTime) {
        // Override in subclass
    }
    
    render() {
        // Override in subclass
    }
    
    restart() {
        // Override in subclass
    }
    
    // Handle name input
    handleNameInput(key) {
        // Map visual layout to actual character selection
        let currentChar = '';
        
        // Determine which character is selected based on visual layout
        if (this.keyboard.selectedRow < 3) {
            // First 3 rows (letters)
            const rowStr = this.keyboard.layout[this.keyboard.selectedRow];
            if (this.keyboard.selectedCol < rowStr.length) {
                currentChar = rowStr[this.keyboard.selectedCol];
            }
        } else if (this.keyboard.selectedRow === 3) {
            // Numbers row
            const numbersStr = this.keyboard.layout[3];
            if (this.keyboard.selectedCol < numbersStr.length) {
                currentChar = numbersStr[this.keyboard.selectedCol];
            }
        } else if (this.keyboard.selectedRow === 4) {
            // Delete row
            currentChar = '←';
        }
        
        switch(key) {
            case 'up':
                this.keyboard.selectedRow = Math.max(0, this.keyboard.selectedRow - 1);
                // Adjust column for different row lengths
                this.adjustColumnForRow();
                if (window.audioManager) window.audioManager.play('menu-move');
                break;
                
            case 'down':
                this.keyboard.selectedRow = Math.min(4, this.keyboard.selectedRow + 1);
                // Adjust column for different row lengths
                this.adjustColumnForRow();
                if (window.audioManager) window.audioManager.play('menu-move');
                break;
                
            case 'left':
                if (this.keyboard.selectedRow === 4) {
                    // Can't move left on delete row
                } else {
                    this.keyboard.selectedCol = Math.max(0, this.keyboard.selectedCol - 1);
                }
                if (window.audioManager) window.audioManager.play('menu-move');
                break;
                
            case 'right':
                if (this.keyboard.selectedRow === 4) {
                    // Can't move right on delete row
                } else {
                    const maxCol = this.keyboard.layout[this.keyboard.selectedRow].length - 1;
                    this.keyboard.selectedCol = Math.min(maxCol, this.keyboard.selectedCol + 1);
                }
                if (window.audioManager) window.audioManager.play('menu-move');
                break;
                
            case 'a':
                if (currentChar === '←') {
                    // Delete
                    this.playerName = this.playerName.slice(0, -1);
                } else if (currentChar && this.playerName.length < 15) {
                    // Add character
                    this.playerName += currentChar;
                }
                if (window.audioManager) window.audioManager.play('button-press');
                break;
                
            case 'b':
                // Delete
                this.playerName = this.playerName.slice(0, -1);
                if (window.audioManager) window.audioManager.play('button-press');
                break;
                
            case 'start':
                if (this.playerName.length > 0) {
                    this.generateScoreCertificate();
                }
                break;
        }
    }
    
    // Adjust column position when changing rows
    adjustColumnForRow() {
        if (this.keyboard.selectedRow === 4) {
            // Delete row - always center
            this.keyboard.selectedCol = 0;
        } else {
            // Make sure column is within bounds of new row
            const maxCol = this.keyboard.layout[this.keyboard.selectedRow].length - 1;
            if (this.keyboard.selectedCol > maxCol) {
                this.keyboard.selectedCol = maxCol;
            }
        }
    }
    
    // Draw name entry screen
    drawNameEntry() {
        // Dark overlay for focus
        this.ctx.fillStyle = 'rgba(15, 56, 15, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Main container background
        const containerX = 10;
        const containerY = 10;
        const containerWidth = this.screenWidth - 20;
        const containerHeight = this.screenHeight - 20;
        
        // Draw container
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(
            containerX * this.scale,
            containerY * this.scale,
            containerWidth * this.scale,
            containerHeight * this.scale
        );
        
        // Draw border
        this.drawBorder(containerX, containerY, containerWidth, containerHeight, this.colors.dark, 2);
        
        // Title section
        this.drawPixelText('NEW HIGH SCORE!', this.screenWidth / 2, 20, 1.2, this.colors.dark);
        this.drawPixelText(`${this.constructor.name.replace('Game', '').toUpperCase()}: ${this.score}`, this.screenWidth / 2, 32, 1, this.colors.secondary);
        
        // Draw separator line
        this.drawRect(containerX + 10, 40, containerWidth - 20, 2, this.colors.secondary);
        
        // Input section
        this.drawPixelText('ENTER YOUR NAME:', this.screenWidth / 2, 50, 1, this.colors.dark);
        
        // Input field box
        const inputBoxX = 25;
        const inputBoxY = 58;
        const inputBoxWidth = this.screenWidth - 50;
        const inputBoxHeight = 16;
        
        // Draw input field background
        this.drawRect(inputBoxX, inputBoxY, inputBoxWidth, inputBoxHeight, this.colors.primary);
        this.drawBorder(inputBoxX, inputBoxY, inputBoxWidth, inputBoxHeight, this.colors.dark, 1);
        
        // Draw entered name with better visibility
        const displayName = this.playerName + (this.playerName.length < 15 && Math.floor(Date.now() / 500) % 2 ? '_' : '');
        this.drawPixelText(displayName, this.screenWidth / 2, inputBoxY + 8, 1.2, this.colors.background);
        
        // Character count
        this.drawPixelText(`${this.playerName.length}/15`, this.screenWidth - 20, inputBoxY + 8, 0.8, this.colors.dark);
        
        // Virtual keyboard with better spacing
        const keyboardY = 85;
        const charSize = 12;
        const charSpacing = 14;
        
        // Draw keyboard layout
        for (let row = 0; row < this.keyboard.layout.length; row++) {
            const rowStr = this.keyboard.layout[row];
            const rowWidth = rowStr.length * charSpacing;
            const startX = (this.screenWidth - rowWidth) / 2 + charSpacing / 2;
            
            // Skip delete row in character drawing (handled separately)
            if (row === 4) continue;
            
            for (let col = 0; col < rowStr.length; col++) {
                const char = rowStr[col];
                const x = startX + col * charSpacing;
                const y = keyboardY + row * charSpacing;
                
                // Check if this is the selected character
                const isSelected = (this.keyboard.selectedRow === row && 
                                  this.keyboard.selectedCol === col);
                
                // Draw character with selection
                if (isSelected) {
                    // Draw selection box
                    this.drawRect(
                        x - 6,
                        y - 6,
                        11,
                        11,
                        this.colors.dark
                    );
                    this.drawPixelText(char, x, y, 1, this.colors.background);
                } else {
                    this.drawPixelText(char, x, y, 1, this.colors.dark);
                }
            }
        }
        
        // Draw delete button separately
        const deleteX = this.screenWidth / 2;
        const deleteY = keyboardY + 4 * charSpacing;
        const deleteSelected = (this.keyboard.selectedRow === 4);
        
        if (deleteSelected) {
            // Draw selection box for delete
            this.drawRect(
                deleteX - 25,
                deleteY - 6,
                50,
                14,
                this.colors.dark
            );
            this.drawPixelText('DELETE', deleteX, deleteY + 2, 1, this.colors.background);
        } else {
            // Draw delete button normally
            this.drawRect(
                deleteX - 25,
                deleteY - 6,
                50,
                14,
                this.colors.secondary
            );
            this.drawPixelText('DELETE', deleteX, deleteY + 2, 1, this.colors.dark);
        }
        
        // Draw separator line
        this.drawRect(containerX + 10, keyboardY + 70, containerWidth - 20, 1, this.colors.secondary);
        
        // Instructions with better visibility
        const instructY = keyboardY + 78;
        this.drawPixelText('[A] SELECT', this.screenWidth / 2 - 30, instructY, 0.9, this.colors.dark);
        this.drawPixelText('[B] DELETE', this.screenWidth / 2 + 30, instructY, 0.9, this.colors.dark);
        this.drawPixelText('START TO FINISH', this.screenWidth / 2, instructY + 10, 1, this.colors.secondary);
    }
    
    // Generate score certificate image
    generateScoreCertificate() {
        // Save the high score now that we have the name
        this.saveHighScore(this.score);
        
        // Create off-screen canvas
        const certCanvas = document.createElement('canvas');
        certCanvas.width = 320;
        certCanvas.height = 288;
        const certCtx = certCanvas.getContext('2d');
        
        // Enable pixel perfect rendering
        certCtx.imageSmoothingEnabled = false;
        
        // Background
        certCtx.fillStyle = this.colors.background;
        certCtx.fillRect(0, 0, certCanvas.width, certCanvas.height);
        
        // Border
        certCtx.strokeStyle = this.colors.dark;
        certCtx.lineWidth = 4;
        certCtx.strokeRect(10, 10, certCanvas.width - 20, certCanvas.height - 20);
        
        // Inner border
        certCtx.lineWidth = 2;
        certCtx.strokeRect(20, 20, certCanvas.width - 40, certCanvas.height - 40);
        
        // Title
        certCtx.fillStyle = this.colors.dark;
        certCtx.font = 'bold 16px monospace';
        certCtx.textAlign = 'center';
        certCtx.fillText('Nintendo TRENCH BOY', certCanvas.width / 2, 50);
        
        // Line under title
        certCtx.fillRect(30, 60, certCanvas.width - 60, 2);
        
        // Game name and score
        certCtx.font = 'bold 24px monospace';
        const gameName = this.constructor.name.replace('Game', '').toUpperCase();
        certCtx.fillText(gameName, certCanvas.width / 2, 110);
        
        certCtx.font = 'bold 32px monospace';
        certCtx.fillText(this.score.toString(), certCanvas.width / 2, 150);
        
        // Player name
        certCtx.font = 'bold 20px monospace';
        certCtx.fillStyle = this.colors.secondary;
        certCtx.fillText(this.playerName.toUpperCase(), certCanvas.width / 2, 190);
        
        // Date and time
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear().toString().substr(2)}`;
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        certCtx.font = '14px monospace';
        certCtx.fillStyle = this.colors.dark;
        certCtx.fillText(`${dateStr}  ${timeStr}`, certCanvas.width / 2, 240);
        
        // Add scanline effect
        certCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let y = 0; y < certCanvas.height; y += 4) {
            certCtx.fillRect(0, y, certCanvas.width, 2);
        }
        
        // Convert to blob and open in new tab
        certCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                // Create a new window with the image
                const win = window.open('', '_blank');
                win.document.write(`
                    <html>
                    <head>
                        <title>TRENCH BOY High Score</title>
                        <style>
                            body { 
                                margin: 0; 
                                padding: 20px; 
                                background: #2C1B3D; 
                                display: flex; 
                                justify-content: center; 
                                align-items: center; 
                                min-height: 100vh;
                            }
                            img { 
                                max-width: 100%; 
                                image-rendering: pixelated;
                                image-rendering: -moz-crisp-edges;
                                image-rendering: crisp-edges;
                                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                            }
                            p {
                                color: #9BBC0F;
                                font-family: monospace;
                                text-align: center;
                                margin-top: 20px;
                            }
                        </style>
                    </head>
                    <body>
                        <div>
                            <img src="${url}" alt="High Score Certificate">
                            <p>Right-click and copy image to share!</p>
                        </div>
                    </body>
                    </html>
                `);
                
                // Reset game after sharing
                this.enteringName = false;
                this.playerName = '';
                this.restart();
            };
            img.src = url;
        });
    }
}

// Export to global scope
window.GameEngine = GameEngine;
