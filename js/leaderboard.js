// Firebase Leaderboard System for Nintendo TrenchBoy

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAmvZzRXdopnzq5TRKZzawBUH1ADUl-244",
    authDomain: "trenchboy-9ae50.firebaseapp.com",
    projectId: "trenchboy-9ae50",
    storageBucket: "trenchboy-9ae50.firebasestorage.app",
    messagingSenderId: "930567495668",
    appId: "1:930567495668:web:851cd0692b76d25515e3a1",
    measurementId: "G-XHE879CX5S"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Leaderboard Manager
class LeaderboardManager {
    constructor() {
        this.collection = 'leaderboards';
        this.cache = new Map(); // Cache leaderboard data
        this.cacheTimeout = 60000; // 1 minute cache
    }
    
    // Submit a new score
    async submitScore(gameId, playerName, score, metadata = {}) {
        try {
            const scoreData = {
                playerName: playerName.toUpperCase(),
                score: score,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                gameId: gameId,
                ...metadata // Additional data like level for Tetris, etc.
            };
            
            await db.collection(this.collection).add(scoreData);
            console.log('Score submitted successfully');
            
            // Clear cache for this game
            this.cache.delete(gameId);
            
            return true;
        } catch (error) {
            console.error('Error submitting score:', error);
            return false;
        }
    }
    
    // Get top scores for a game
    async getTopScores(gameId, limit = 5) {
        // Check cache first
        const cached = this.cache.get(gameId);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        try {
            const snapshot = await db.collection(this.collection)
                .where('gameId', '==', gameId)
                .orderBy('score', 'desc')
                .limit(limit)
                .get();
            
            const scores = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                scores.push({
                    rank: scores.length + 1,
                    playerName: data.playerName,
                    score: data.score,
                    timestamp: data.timestamp
                });
            });
            
            // Cache the results
            this.cache.set(gameId, {
                data: scores,
                timestamp: Date.now()
            });
            
            return scores;
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }
    }
    
    // Check if a score makes it to the leaderboard
    async isHighScore(gameId, score) {
        const topScores = await this.getTopScores(gameId, 5);
        if (topScores.length < 5) return true;
        return score > topScores[topScores.length - 1].score;
    }
}

// Create global instance
window.leaderboardManager = new LeaderboardManager();

// Leaderboard Display Component
class LeaderboardDisplay {
    constructor(canvas, gameId) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameId = gameId;
        this.loading = true;
        this.scores = [];
        this.error = null;
        
        // Get current theme colors
        this.updateColors();
    }
    
    updateColors() {
        const gameboy = document.getElementById('gameboy');
        const style = getComputedStyle(gameboy);
        
        this.colors = {
            bg: style.getPropertyValue('--screen-green-1').trim() || '#9BBC0F',
            primary: style.getPropertyValue('--screen-green-2').trim() || '#8BAC0F',
            secondary: style.getPropertyValue('--screen-green-3').trim() || '#306230',
            dark: style.getPropertyValue('--screen-green-4').trim() || '#0F380F'
        };
    }
    
    async loadScores() {
        this.loading = true;
        this.render();
        
        try {
            this.scores = await window.leaderboardManager.getTopScores(this.gameId);
            this.loading = false;
            this.error = null;
        } catch (error) {
            this.loading = false;
            this.error = 'Failed to load scores';
            console.error('Leaderboard error:', error);
        }
        
        this.render();
    }
    
    render() {
        // Clear screen
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = this.colors.dark;
        this.ctx.fillRect(30, 30, this.canvas.width - 60, this.canvas.height - 60);
        
        // Inner lighter box
        this.ctx.fillStyle = this.colors.secondary;
        this.ctx.fillRect(40, 40, this.canvas.width - 80, this.canvas.height - 80);
        
        // Title background
        this.ctx.fillStyle = this.colors.dark;
        this.ctx.fillRect(40, 40, this.canvas.width - 80, 60);
        
        // Draw title
        const gameTitle = this.getGameTitle();
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.font = 'bold 20px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${gameTitle} LEADERBOARD`, this.canvas.width / 2, 75);
        
        // Draw content based on state
        if (this.loading) {
            this.drawLoading();
        } else if (this.error) {
            this.drawError();
        } else if (this.scores.length === 0) {
            this.drawEmpty();
        } else {
            this.drawScores();
        }
        
        // Instructions
        this.ctx.fillStyle = this.colors.dark;
        this.ctx.fillRect(50, this.canvas.height - 50, this.canvas.width - 100, 30);
        
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.font = 'bold 14px monospace';
        this.ctx.fillText('Press RETURN to go back', this.canvas.width / 2, this.canvas.height - 30);
    }
    
    drawLoading() {
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LOADING...', this.canvas.width / 2, this.canvas.height / 2);
    }
    
    drawError() {
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ERROR LOADING SCORES', this.canvas.width / 2, this.canvas.height / 2 - 10);
        this.ctx.font = '12px monospace';
        this.ctx.fillText('Check connection', this.canvas.width / 2, this.canvas.height / 2 + 10);
    }
    
    drawEmpty() {
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('NO SCORES YET', this.canvas.width / 2, this.canvas.height / 2 - 10);
        this.ctx.font = '12px monospace';
        this.ctx.fillText('Be the first!', this.canvas.width / 2, this.canvas.height / 2 + 10);
    }
    

drawScores() {
        // Table header
        const startY = 120;
        const rowHeight = 25;
        
        // Header background
        this.ctx.fillStyle = this.colors.dark;
        this.ctx.fillRect(60, startY - 20, this.canvas.width - 120, 25);
        
        // Header text
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.font = 'bold 18px monospace'; // Increased from 14px
        this.ctx.textAlign = 'left';
        this.ctx.fillText('NAME', 70, startY - 5);
        this.ctx.textAlign = 'right';
        this.ctx.fillText('SCORE', this.canvas.width - 70, startY - 5);
        
        // Draw scores
        this.scores.forEach((score, index) => {
            const y = startY + 15 + (index * rowHeight);
            
            // Alternating row backgrounds
            if (index % 2 === 0) {
                this.ctx.fillStyle = this.colors.primary;
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillRect(60, y - 15, this.canvas.width - 120, 22);
                this.ctx.globalAlpha = 1;
            }
            
            // Player name
            this.ctx.fillStyle = this.colors.dark;
            this.ctx.font = 'bold 18px monospace'; // Increased from 14px
            this.ctx.textAlign = 'left';
            this.ctx.fillText(score.playerName, 70, y);
            
            // Score with formatting
            this.ctx.textAlign = 'right';
            this.ctx.fillText(this.formatScore(score.score), this.canvas.width - 70, y);
        });
    }
    
    getGameTitle() {
        const titles = {
            'snake': 'SNAKE',
            'pong': 'PONG',
            'tetris': 'TETRIS'
        };
        return titles[this.gameId] || this.gameId.toUpperCase();
    }
    
    formatScore(score) {
        // Format based on game type
        if (this.gameId === 'pong') {
            return `${score} WINS`;
        }
        return score.toString();
    }
}

// Make LeaderboardDisplay global
window.LeaderboardDisplay = LeaderboardDisplay;

// Update the game-engine.js to submit scores to Firebase
function enhanceGameEngine() {
    const originalGenerateCert = window.GameEngine.prototype.generateScoreCertificate;
    
    window.GameEngine.prototype.generateScoreCertificate = async function() {
        // Save the high score first
        this.saveHighScore(this.score);
        
        // Submit to Firebase leaderboard
        if (window.leaderboardManager) {
            const gameId = this.constructor.name.toLowerCase().replace('game', '');
            const metadata = {};
            
            // Add game-specific metadata
            if (gameId === 'tetris') {
                metadata.level = this.level;
                metadata.lines = this.lines;
            } else if (gameId === 'pong') {
                metadata.streak = this.winStreak;
            }
            
            try {
                await window.leaderboardManager.submitScore(
                    gameId,
                    this.playerName,
                    this.score,
                    metadata
                );
                console.log('Score submitted to Firebase!');
            } catch (error) {
                console.error('Failed to submit score:', error);
            }
        }
        
        // Call original certificate generation
        originalGenerateCert.call(this);
    };
}

// Initialize enhancement when game engine loads
if (window.GameEngine) {
    enhanceGameEngine();
} else {
    // Wait for game engine to load
    const checkInterval = setInterval(() => {
        if (window.GameEngine) {
            enhanceGameEngine();
            clearInterval(checkInterval);
        }
    }, 100);
}

// Test Firebase connection
console.log('Firebase initialized:', firebase);
console.log('Firestore db:', db);