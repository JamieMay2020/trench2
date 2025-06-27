 
// Audio Manager for Nintendo TrenchBoy

class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.3;
        
        // Initialize audio context on first user interaction
        this.audioContext = null;
        this.initialized = false;
        
        // Sound definitions (we'll use Web Audio API to generate these)
        this.soundDefinitions = {
            'boot': { type: 'boot', duration: 1500 },
            'menu-move': { type: 'blip', frequency: 400, duration: 50 },
            'menu-hover': { type: 'blip', frequency: 300, duration: 30 },
            'game-select': { type: 'confirm', duration: 300 },
            'button-press': { type: 'click', duration: 20 },
            'error': { type: 'buzz', duration: 200 },
            'coin': { type: 'coin', duration: 200 },
            'game-over': { type: 'fail', duration: 1000 }
        };
    }
    
    // Initialize audio context
    async init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            
            // Pre-generate some sounds
            this.generateSounds();
            
            console.log('Audio system initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.enabled = false;
        }
    }
    
    // Generate 8-bit style sounds
    generateSounds() {
        // We'll generate sounds on-demand for now
    }
    
    // Play a sound
    play(soundName) {
        if (!this.enabled || !this.initialized) {
            // Try to initialize on first play attempt
            if (!this.initialized) {
                this.init().then(() => {
                    if (this.initialized) {
                        this.playSound(soundName);
                    }
                });
            }
            return;
        }
        
        this.playSound(soundName);
    }
    
    // Actually play the sound
    playSound(soundName) {
        const soundDef = this.soundDefinitions[soundName];
        if (!soundDef) return;
        
        try {
            switch (soundDef.type) {
                case 'boot':
                    this.playBootSound();
                    break;
                case 'blip':
                    this.playBlip(soundDef.frequency, soundDef.duration);
                    break;
                case 'click':
                    this.playClick();
                    break;
                case 'confirm':
                    this.playConfirm();
                    break;
                case 'buzz':
                    this.playBuzz();
                    break;
                case 'coin':
                    this.playCoin();
                    break;
                case 'fail':
                    this.playGameOver();
                    break;
            }
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }
    
    // Boot sound - ascending tones
    playBootSound() {
        const now = this.audioContext.currentTime;
        
        [200, 400, 600, 800].forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(freq, now + index * 0.1);
            
            gainNode.gain.setValueAtTime(this.volume, now + index * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(now + index * 0.1);
            oscillator.stop(now + index * 0.1 + 0.1);
        });
    }
    
    // Simple blip sound
    playBlip(frequency = 400, duration = 50) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }
    
    // Click sound
    playClick() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.02);
        
        gainNode.gain.setValueAtTime(this.volume * 0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.02);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.02);
    }
    
    // Confirm sound
    playConfirm() {
        const now = this.audioContext.currentTime;
        
        [400, 600, 800].forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(freq, now + index * 0.05);
            
            gainNode.gain.setValueAtTime(this.volume, now + index * 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.05 + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(now + index * 0.05);
            oscillator.stop(now + index * 0.05 + 0.1);
        });
    }
    
    // Error buzz
    playBuzz() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    // Coin collection sound
    playCoin() {
        const now = this.audioContext.currentTime;
        
        [800, 1000, 1200].forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, now + index * 0.05);
            
            gainNode.gain.setValueAtTime(this.volume * 0.5, now + index * 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.05 + 0.05);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(now + index * 0.05);
            oscillator.stop(now + index * 0.05 + 0.05);
        });
    }
    
    // Game over sound
    playGameOver() {
        const now = this.audioContext.currentTime;
        
        [400, 350, 300, 250].forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(freq, now + index * 0.2);
            
            gainNode.gain.setValueAtTime(this.volume, now + index * 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.2 + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(now + index * 0.2);
            oscillator.stop(now + index * 0.2 + 0.2);
        });
    }
    
    // Toggle sound on/off
    toggleSound() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    // Set volume
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
}

// Create global audio manager instance
window.audioManager = new AudioManager();

// Initialize audio on first user interaction
document.addEventListener('click', () => {
    if (!window.audioManager.initialized) {
        window.audioManager.init();
    }
}, { once: true });

// Also try to initialize on keypress
document.addEventListener('keydown', () => {
    if (!window.audioManager.initialized) {
        window.audioManager.init();
    }
}, { once: true });