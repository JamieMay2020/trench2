// Snake Game for Nintendo TrenchBoy

class SnakeGame extends GameEngine {
    constructor(canvas) {
        super(canvas);
        
        // Game specific settings
        this.gridSize = 10; // Size of each grid cell
        this.gridWidth = Math.floor(this.screenWidth / this.gridSize);
        this.gridHeight = Math.floor((this.screenHeight - 20) / this.gridSize); // Leave space for UI
        
        // Snake properties
        this.snake = [];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.growing = false;
        
        // Food
        this.food = { x: 0, y: 0 };
        
        // Game speed (lower is faster)
        this.moveDelay = 150; // milliseconds between moves
        this.moveTimer = 0;
        
        // Difficulty
        this.speedIncrement = 5; // Speed up every N foods
        this.foodsEaten = 0;
        
        // Initialize game
        this.init();
    }
    
    init() {
        // Initialize snake in the center
        const startX = Math.floor(this.gridWidth / 2);
        const startY = Math.floor(this.gridHeight / 2);
        
        this.snake = [
            { x: startX - 2, y: startY },
            { x: startX - 1, y: startY },
            { x: startX, y: startY }
        ];
        
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        
        // Place first food
        this.placeFood();
        
        // Reset score
        this.score = 0;
        this.foodsEaten = 0;
        this.moveDelay = 150;
        
        // Reset high score flags
        this.newHighScore = false;
        this.enteringName = false;
    }
    
    update(deltaTime) {
        // Handle input
        this.handleSnakeInput();
        
        // Update move timer
        this.moveTimer += deltaTime;
        
        // Move snake at intervals
        if (this.moveTimer >= this.moveDelay) {
            this.moveSnake();
            this.moveTimer = 0;
        }
    }
    
    handleSnakeInput() {
        // Update direction based on input (prevent reversing)
        if (this.keys.up && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: -1 };
        } else if (this.keys.down && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: 1 };
        } else if (this.keys.left && this.direction.x === 0) {
            this.nextDirection = { x: -1, y: 0 };
        } else if (this.keys.right && this.direction.x === 0) {
            this.nextDirection = { x: 1, y: 0 };
        }
    }
    
    moveSnake() {
        // Apply next direction
        this.direction = { ...this.nextDirection };
        
        // Calculate new head position
        const head = this.snake[this.snake.length - 1];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };
        
        // Check wall collision
        if (newHead.x < 0 || newHead.x >= this.gridWidth ||
            newHead.y < 0 || newHead.y >= this.gridHeight) {
            this.endGame();
            return;
        }
        
        // Check self collision
        for (let segment of this.snake) {
            if (newHead.x === segment.x && newHead.y === segment.y) {
                this.endGame();
                return;
            }
        }
        
        // Add new head
        this.snake.push(newHead);
        
        // Check food collision
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.eatFood();
        } else {
            // Remove tail if not growing
            if (!this.growing) {
                this.snake.shift();
            } else {
                this.growing = false;
            }
        }
    }
    
    eatFood() {
        this.score += 10;
        this.foodsEaten++;
        this.growing = true;
        
        // Play sound
        if (window.audioManager) {
            window.audioManager.play('coin');
        }
        
        // Increase speed every N foods
        if (this.foodsEaten % this.speedIncrement === 0) {
            this.moveDelay = Math.max(50, this.moveDelay - 10);
        }
        
        // Place new food
        this.placeFood();
    }
    
    placeFood() {
        let validPosition = false;
        
        while (!validPosition) {
            this.food = {
                x: Math.floor(Math.random() * this.gridWidth),
                y: Math.floor(Math.random() * this.gridHeight)
            };
            
            // Check that food doesn't spawn on snake
            validPosition = true;
            for (let segment of this.snake) {
                if (segment.x === this.food.x && segment.y === this.food.y) {
                    validPosition = false;
                    break;
                }
            }
        }
    }
    
    render() {
        // Draw game area border
        this.drawBorder(0, 16, this.screenWidth, this.screenHeight - 16, this.colors.secondary, 1);
        
        // Draw snake
        for (let i = 0; i < this.snake.length; i++) {
            const segment = this.snake[i];
            const isHead = i === this.snake.length - 1;
            
            // Different color for head
            const color = isHead ? this.colors.dark : this.colors.secondary;
            
            this.drawRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize + 20,
                this.gridSize - 1,
                this.gridSize - 1,
                color
            );
            
            // Draw eyes on head
            if (isHead) {
                const eyeSize = 2;
                const eyeColor = this.colors.background;
                
                if (this.direction.x !== 0) {
                    // Horizontal movement - eyes on top
                    this.drawRect(
                        segment.x * this.gridSize + 2,
                        segment.y * this.gridSize + 21,
                        eyeSize,
                        eyeSize,
                        eyeColor
                    );
                    this.drawRect(
                        segment.x * this.gridSize + 6,
                        segment.y * this.gridSize + 21,
                        eyeSize,
                        eyeSize,
                        eyeColor
                    );
                } else {
                    // Vertical movement - eyes on side
                    this.drawRect(
                        segment.x * this.gridSize + (this.direction.y > 0 ? 2 : 6),
                        segment.y * this.gridSize + 23,
                        eyeSize,
                        eyeSize,
                        eyeColor
                    );
                    this.drawRect(
                        segment.x * this.gridSize + (this.direction.y > 0 ? 2 : 6),
                        segment.y * this.gridSize + 26,
                        eyeSize,
                        eyeSize,
                        eyeColor
                    );
                }
            }
        }
        
        // Draw food
        this.drawFood();
        
        // Draw speed indicator
        const speed = Math.floor((150 - this.moveDelay) / 10);
        this.drawPixelText(`SPD:${speed}`, 30, 8, 1, this.colors.secondary);
    }
    
    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize + 20;
        const size = this.gridSize - 1;
        
        // Draw food as a small square with a pattern
        this.drawRect(x + 2, y + 2, size - 4, size - 4, this.colors.dark);
        
        // Add some detail to make it look like food
        this.drawPixel(x + 4, y + 3, this.colors.secondary);
        this.drawPixel(x + 5, y + 4, this.colors.secondary);
    }
    
    restart() {
        this.gameOver = false;
        this.paused = false;
        this.newHighScore = false;
        this.enteringName = false;
        this.playerName = '';
        this.moveTimer = 0;
        this.init();
        this.lastTime = performance.now();
        this.gameLoop();
    }
}

// Register the game globally
window.SnakeGame = SnakeGame;