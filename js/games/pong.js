// Pong Game for Nintendo TrenchBoy

class PongGame extends GameEngine {
    constructor(canvas) {
        super(canvas);
        
        // Game settings
        this.paddleWidth = 4;
        this.paddleHeight = 20;
        this.paddleSpeed = 2;
        this.ballSize = 4;
        this.ballSpeed = 2;
        this.maxBallSpeed = 4;
        this.winningScore = 5;
        
        // Game objects
        this.player = {
            x: 10,
            y: this.screenHeight / 2 - this.paddleHeight / 2,
            score: 0,
            speed: 0
        };
        
        this.ai = {
            x: this.screenWidth - 14,
            y: this.screenHeight / 2 - this.paddleHeight / 2,
            score: 0,
            speed: 0,
            difficulty: 0.85 // AI tracking accuracy (0.8 = 80%)
        };
        
        this.ball = {
            x: this.screenWidth / 2,
            y: this.screenHeight / 2,
            vx: 0,
            vy: 0,
            speed: this.ballSpeed
        };
        
        // Game state
        this.serving = true;
        this.server = 'player'; // 'player' or 'ai'
        this.rally = 0; // Hits in current rally
        
        // Win streak tracking
        this.winStreak = 0; // Current win streak
        this.currentMatchWon = false; // Track if current match was won
        
        // Sound timers
        this.soundTimer = 0;
        
        // Load win streak from localStorage
        this.loadWinStreak();
        
        // Initialize game
        this.init();
    }
    
    init() {
        // Reset positions
        this.player.y = this.screenHeight / 2 - this.paddleHeight / 2;
        this.ai.y = this.screenHeight / 2 - this.paddleHeight / 2;
        
        // Reset scores for new match
        this.player.score = 0;
        this.ai.score = 0;
        
        // Don't reset win streak here - it persists across matches
        this.currentMatchWon = false;
        
        // Reset high score flags
        this.newHighScore = false;
        this.enteringName = false;
        
        // Start first serve
        this.startServe('player');
    }
    
    // Load win streak from localStorage
    loadWinStreak() {
        const saved = localStorage.getItem('trenchboy_pong_winstreak');
        this.winStreak = saved ? parseInt(saved) : 0;
        this.score = this.winStreak; // Set score to current win streak
    }
    
    // Save win streak to localStorage
    saveWinStreak() {
        localStorage.setItem('trenchboy_pong_winstreak', this.winStreak);
    }
    
    startServe(server) {
        this.serving = true;
        this.server = server;
        this.rally = 0;
        
        // Reset ball position
        this.ball.x = this.screenWidth / 2;
        this.ball.y = this.screenHeight / 2;
        this.ball.vx = 0;
        this.ball.vy = 0;
        
        // Serve after a short delay
        setTimeout(() => {
            if (this.serving && !this.paused && !this.gameOver) {
                this.serve();
            }
        }, 1000);
    }
    
    serve() {
        this.serving = false;
        
        // Serve direction based on who's serving
        const direction = this.server === 'player' ? 1 : -1;
        
        // Random vertical direction
        const angle = (Math.random() - 0.5) * Math.PI / 4; // -45 to 45 degrees
        
        this.ball.vx = direction * this.ballSpeed * Math.cos(angle);
        this.ball.vy = this.ballSpeed * Math.sin(angle);
        
        // Play serve sound
        if (window.audioManager) {
            window.audioManager.play('blip');
        }
    }
    
    update(deltaTime) {
        if (this.serving) return;
        
        // Update sound timer
        this.soundTimer -= deltaTime;
        
        // Handle player input
        this.handlePlayerInput();
        
        // Update AI
        this.updateAI();
        
        // Update paddles
        this.updatePaddle(this.player);
        this.updatePaddle(this.ai);
        
        // Update ball
        this.updateBall();
        
        // Check for round end
        this.checkRoundEnd();
    }
    
    handlePlayerInput() {
        // Player paddle movement
        if (this.keys.up) {
            this.player.speed = -this.paddleSpeed;
        } else if (this.keys.down) {
            this.player.speed = this.paddleSpeed;
        } else {
            this.player.speed = 0;
        }
    }
    
    updateAI() {
        // Simple AI that tracks the ball
        const aiCenter = this.ai.y + this.paddleHeight / 2;
        const ballY = this.ball.y;
        const diff = ballY - aiCenter;
        
        // Add some imperfection to AI
        const threshold = 3;
        
        if (Math.abs(diff) > threshold) {
            // AI reaction with difficulty factor
            if (Math.random() < this.ai.difficulty) {
                if (diff > 0) {
                    this.ai.speed = this.paddleSpeed * 0.9; // Slightly slower than player
                } else {
                    this.ai.speed = -this.paddleSpeed * 0.9;
                }
            } else {
                // AI "misses" sometimes
                this.ai.speed = 0;
            }
        } else {
            this.ai.speed = 0;
        }
        
        // Make AI less perfect when ball is far away
        if (this.ball.vx > 0 && this.ball.x < this.screenWidth / 2) {
            this.ai.speed *= 0.5;
        }
    }
    
    updatePaddle(paddle) {
        paddle.y += paddle.speed;
        
        // Keep paddle on screen
        if (paddle.y < 0) {
            paddle.y = 0;
        } else if (paddle.y > this.screenHeight - this.paddleHeight) {
            paddle.y = this.screenHeight - this.paddleHeight;
        }
    }
    
    updateBall() {
        // Store old position for collision detection
        const oldX = this.ball.x;
        const oldY = this.ball.y;
        
        // Update position
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;
        
        // Top and bottom wall collision
        if (this.ball.y <= this.ballSize / 2 || this.ball.y >= this.screenHeight - this.ballSize / 2) {
            this.ball.vy = -this.ball.vy;
            this.ball.y = this.ball.y <= this.ballSize / 2 ? this.ballSize / 2 : this.screenHeight - this.ballSize / 2;
            this.playBounceSound();
        }
        
        // Paddle collisions
        this.checkPaddleCollision(this.player, oldX);
        this.checkPaddleCollision(this.ai, oldX);
    }
    
    checkPaddleCollision(paddle, oldBallX) {
        const ballLeft = this.ball.x - this.ballSize / 2;
        const ballRight = this.ball.x + this.ballSize / 2;
        const ballTop = this.ball.y - this.ballSize / 2;
        const ballBottom = this.ball.y + this.ballSize / 2;
        
        const paddleLeft = paddle.x;
        const paddleRight = paddle.x + this.paddleWidth;
        const paddleTop = paddle.y;
        const paddleBottom = paddle.y + this.paddleHeight;
        
        // Check if ball intersects paddle
        if (ballRight >= paddleLeft && ballLeft <= paddleRight &&
            ballBottom >= paddleTop && ballTop <= paddleBottom) {
            
            // Only bounce if ball is moving toward paddle
            if ((paddle === this.player && this.ball.vx < 0) ||
                (paddle === this.ai && this.ball.vx > 0)) {
                
                // Calculate hit position (-1 to 1)
                const hitPos = ((this.ball.y - paddle.y) / this.paddleHeight) * 2 - 1;
                
                // Reverse X direction and add spin based on hit position
                this.ball.vx = -this.ball.vx;
                this.ball.vy = hitPos * this.ballSpeed * 0.75;
                
                // Increase ball speed slightly (up to max)
                this.ball.speed = Math.min(this.ball.speed * 1.05, this.maxBallSpeed);
                const currentSpeed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
                const speedMultiplier = this.ball.speed / currentSpeed;
                this.ball.vx *= speedMultiplier;
                this.ball.vy *= speedMultiplier;
                
                // Move ball outside paddle
                if (paddle === this.player) {
                    this.ball.x = paddleRight + this.ballSize / 2;
                } else {
                    this.ball.x = paddleLeft - this.ballSize / 2;
                }
                
                // Increment rally
                this.rally++;
                
                // Play hit sound
                this.playBounceSound();
            }
        }
    }
    
    playBounceSound() {
        // Prevent sound spam
        if (this.soundTimer <= 0) {
            if (window.audioManager) {
                window.audioManager.play('blip');
            }
            this.soundTimer = 50; // Minimum time between sounds
        }
    }
    
    checkRoundEnd() {
        // Check if ball went off screen
        if (this.ball.x < -this.ballSize) {
            // AI scores
            this.ai.score++;
            this.checkGameEnd();
            if (!this.gameOver) {
                this.startServe('ai');
            }
        } else if (this.ball.x > this.screenWidth + this.ballSize) {
            // Player scores
            this.player.score++;
            this.checkGameEnd();
            if (!this.gameOver) {
                this.startServe('player');
                if (window.audioManager) {
                    window.audioManager.play('coin');
                }
            }
        }
    }
    
    checkGameEnd() {
        if (this.player.score >= this.winningScore || this.ai.score >= this.winningScore) {
            // Game is ending
            if (this.player.score >= this.winningScore) {
                // Player won!
                this.winStreak++;
                this.currentMatchWon = true;
                this.score = this.winStreak; // Update score for high score tracking
                this.saveWinStreak();
                
                // Check if this is a new record
                if (this.winStreak > this.highScore) {
                    this.newHighScore = true;
                }
            } else {
                // Player lost - reset win streak
                this.winStreak = 0;
                this.currentMatchWon = false;
                this.saveWinStreak();
            }
            
            this.endGame();
        }
    }
    
    render() {
        // Draw center line
        for (let y = 0; y < this.screenHeight; y += 8) {
            this.drawRect(
                this.screenWidth / 2 - 1,
                y,
                2,
                4,
                this.colors.secondary
            );
        }
        
        // Draw scores
        this.drawPixelText(
            this.player.score.toString(),
            this.screenWidth / 2 - 20,
            20,
            2,
            this.colors.dark
        );
        
        this.drawPixelText(
            this.ai.score.toString(),
            this.screenWidth / 2 + 20,
            20,
            2,
            this.colors.dark
        );
        
        // Draw paddles
        this.drawRect(
            this.player.x,
            this.player.y,
            this.paddleWidth,
            this.paddleHeight,
            this.colors.dark
        );
        
        this.drawRect(
            this.ai.x,
            this.ai.y,
            this.paddleWidth,
            this.paddleHeight,
            this.colors.dark
        );
        
        // Draw ball
        if (!this.serving) {
            this.drawRect(
                this.ball.x - this.ballSize / 2,
                this.ball.y - this.ballSize / 2,
                this.ballSize,
                this.ballSize,
                this.colors.dark
            );
        } else {
            // Show serve indicator
            if (Math.floor(Date.now() / 500) % 2) {
                this.drawRect(
                    this.ball.x - this.ballSize / 2,
                    this.ball.y - this.ballSize / 2,
                    this.ballSize,
                    this.ballSize,
                    this.colors.secondary
                );
            }
        }
        
        // Draw serving indicator
        if (this.serving) {
            const text = this.server === 'player' ? 'YOUR SERVE' : 'CPU SERVE';
            this.drawPixelText(
                text,
                this.screenWidth / 2,
                this.screenHeight - 20,
                1,
                this.colors.secondary
            );
        }
        
        // Draw rally counter if impressive
        if (this.rally > 5 && !this.serving) {
            this.drawPixelText(
                `RALLY: ${this.rally}`,
                this.screenWidth / 2,
                this.screenHeight - 10,
                1,
                this.colors.secondary
            );
        }
    }
    
    // Override drawUI to show Pong-specific UI
    drawUI() {
        // Draw game title and win streak
        this.drawPixelText('PONG', 30, 8, 1, this.colors.secondary);
        
        // Show current win streak
        if (this.winStreak > 0) {
            this.drawPixelText(`WINS:${this.winStreak}`, this.screenWidth / 2, 8, 1, this.colors.dark);
        }
        
        // Show best streak (high score)
        this.drawPixelText(`BEST:${this.highScore}`, this.screenWidth - 30, 8, 1, this.colors.secondary);
        
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
            
            const winner = this.player.score > this.ai.score ? 'YOU WIN!' : 'CPU WINS!';
            const winColor = this.player.score > this.ai.score ? this.colors.background : this.colors.primary;
            
            this.drawPixelText(winner, this.screenWidth / 2, this.screenHeight / 2 - 30, 2, winColor);
            this.drawPixelText(`${this.player.score} - ${this.ai.score}`, this.screenWidth / 2, this.screenHeight / 2 - 10, 1, this.colors.primary);
            
            if (this.currentMatchWon) {
                // Show win streak info
                this.drawPixelText(`WIN STREAK: ${this.winStreak}`, this.screenWidth / 2, this.screenHeight / 2 + 5, 1, this.colors.background);
                
                if (this.newHighScore) {
                    this.drawPixelText('NEW RECORD!', this.screenWidth / 2, this.screenHeight / 2 + 20, 1, this.colors.background);
                    this.drawPixelText('PRESS START', this.screenWidth / 2, this.screenHeight / 2 + 35, 1, this.colors.primary);
                    this.drawPixelText('TO ENTER NAME', this.screenWidth / 2, this.screenHeight / 2 + 45, 1, this.colors.primary);
                } else {
                    this.drawPixelText('PRESS START', this.screenWidth / 2, this.screenHeight / 2 + 30, 1, this.colors.primary);
                }
            } else {
                // Lost - streak broken
                this.drawPixelText('STREAK BROKEN!', this.screenWidth / 2, this.screenHeight / 2 + 10, 1, this.colors.primary);
                this.drawPixelText('PRESS START', this.screenWidth / 2, this.screenHeight / 2 + 30, 1, this.colors.primary);
            }
            
            this.drawPixelText('RETURN FOR MENU', this.screenWidth / 2, this.screenHeight / 2 + 55, 1, this.colors.primary);
        }
    }
    
    restart() {
        this.gameOver = false;
        this.paused = false;
        this.playerName = '';
        this.ball.speed = this.ballSpeed;
        this.init();
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    // Override endGame to handle Pong-specific logic
    endGame() {
        this.gameOver = true;
        
        // Play appropriate sound
        if (window.audioManager) {
            if (this.currentMatchWon) {
                window.audioManager.play('coin');
            } else {
                window.audioManager.play('game-over');
            }
        }
    }
}

// Register the game globally
window.PongGame = PongGame;