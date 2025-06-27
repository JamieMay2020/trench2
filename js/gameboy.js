 // Game Boy specific functionality

class GameBoy {
    constructor() {
        this.screen = {
            width: 160,
            height: 144,
            scale: 3
        };
        
        this.colors = {
            darkest: '#0F380F',
            dark: '#306230',
            light: '#8BAC0F',
            lightest: '#9BBC0F'
        };
        
        this.pixelSize = 3;
        this.scanlineOpacity = 0.1;
    }
    
    // Create pixel art text
    drawPixelText(ctx, text, x, y, size = 1, color = this.colors.lightest) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${8 * size}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add pixelated effect
        ctx.imageSmoothingEnabled = false;
        ctx.fillText(text, x, y);
        ctx.restore();
    }
    
    // Draw a pixel-perfect rectangle
    drawPixelRect(ctx, x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.fillRect(
            Math.floor(x) * this.pixelSize,
            Math.floor(y) * this.pixelSize,
            Math.floor(width) * this.pixelSize,
            Math.floor(height) * this.pixelSize
        );
    }
    
    // Create scanline effect
    applyScanlines(ctx, width, height) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${this.scanlineOpacity})`;
        
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }
        
        ctx.restore();
    }
    
    // Screen fade effect
    fadeScreen(ctx, width, height, opacity) {
        ctx.save();
        ctx.fillStyle = `rgba(15, 56, 15, ${opacity})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
    
    // Draw Game Boy style border
    drawBorder(ctx, x, y, width, height, thickness = 2) {
        ctx.strokeStyle = this.colors.dark;
        ctx.lineWidth = thickness;
        ctx.strokeRect(x, y, width, height);
    }
    
    // Create a pixelated sprite
    drawSprite(ctx, sprite, x, y, scale = 1) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        
        const pixelSize = this.pixelSize * scale;
        
        for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
                if (sprite[row][col]) {
                    const color = this.getColorFromValue(sprite[row][col]);
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        x + col * pixelSize,
                        y + row * pixelSize,
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }
        
        ctx.restore();
    }
    
    // Map numeric values to Game Boy colors
    getColorFromValue(value) {
        switch(value) {
            case 1: return this.colors.lightest;
            case 2: return this.colors.light;
            case 3: return this.colors.dark;
            case 4: return this.colors.darkest;
            default: return 'transparent';
        }
    }
    
    // Create retro button effect
    createButtonEffect(element) {
        element.addEventListener('mousedown', () => {
            element.style.transform = 'scale(0.95)';
        });
        
        element.addEventListener('mouseup', () => {
            element.style.transform = 'scale(1)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'scale(1)';
        });
    }
    
    // Generate random static pattern
    generateStatic(ctx, width, height, density = 0.1) {
        ctx.save();
        
        for (let x = 0; x < width; x += this.pixelSize) {
            for (let y = 0; y < height; y += this.pixelSize) {
                if (Math.random() < density) {
                    const brightness = Math.random();
                    const color = brightness < 0.25 ? this.colors.darkest :
                                 brightness < 0.5 ? this.colors.dark :
                                 brightness < 0.75 ? this.colors.light :
                                 this.colors.lightest;
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, this.pixelSize, this.pixelSize);
                }
            }
        }
        
        ctx.restore();
    }
    
    // Boot sequence animation
    async animateBoot(ctx, width, height) {
        // Clear screen
        ctx.fillStyle = this.colors.darkest;
        ctx.fillRect(0, 0, width, height);
        
        // Simulate screen warming up
        for (let i = 0; i < 10; i++) {
            this.generateStatic(ctx, width, height, 0.3 - (i * 0.03));
            await this.delay(100);
        }
        
        // Clear for logo
        ctx.fillStyle = this.colors.darkest;
        ctx.fillRect(0, 0, width, height);
    }
    
    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Create menu cursor
    drawCursor(ctx, x, y, size = 8) {
        const cursor = [
            [1, 0, 0, 0],
            [1, 1, 0, 0],
            [1, 1, 1, 0],
            [1, 1, 1, 1],
            [1, 1, 1, 0],
            [1, 1, 0, 0],
            [1, 0, 0, 0]
        ];
        
        this.drawSprite(ctx, cursor, x, y, size / 8);
    }
    
    // Create loading animation
    drawLoadingBar(ctx, x, y, width, height, progress) {
        // Border
        ctx.strokeStyle = this.colors.light;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Fill
        ctx.fillStyle = this.colors.lightest;
        ctx.fillRect(x + 2, y + 2, (width - 4) * progress, height - 4);
    }
}

// Export as global objecta
window.gameBoy = new GameBoy();

// Additional Game Boy specific event handlers
document.addEventListener('DOMContentLoaded', () => {
    // Add button click sounds
    const buttons = document.querySelectorAll('.action-button, .option-button, .dpad > div');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            if (window.audioManager) {
                window.audioManager.play('button-press');
            }
        });
    });
    
    // Add hover effects
    const gameSlots = document.querySelectorAll('.game-slot');
    gameSlots.forEach(slot => {
        slot.addEventListener('mouseenter', () => {
            if (window.app && window.app.currentState === 'menu') {
                if (window.audioManager) {
                    window.audioManager.play('menu-hover');
                }
            }
        });
    });
});
