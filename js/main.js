// Main Controller for Nintendo TrenchBoy

// Game state management
const GameState = {
    OFF: 'off',
    BOOTING: 'booting',
    MENU: 'menu',
    SUBMENU: 'submenu',
    LOADING: 'loading',
    PLAYING: 'playing'
};

// Global app state
let app = {
    currentState: GameState.OFF,
    currentGame: null,
    selectedGameIndex: 0,
    selectedSubmenuIndex: 0,
    currentSubmenuGame: null,
    currentTheme: 'green',
    games: [
        { id: 'snake', name: 'SNAKE', icon: '🐍', hasSubmenu: true },
        { id: 'pong', name: 'PONG', icon: '🏓', hasSubmenu: true },
        { id: 'tetris', name: 'TETRIS', icon: '🔲', hasSubmenu: true },
        { id: 'twitter', name: 'TWITTER', icon: '𝕏', hasSubmenu: false },
        { id: 'ca', name: 'CONTRACT', icon: 'CA', hasSubmenu: false },
        { id: 'settings', name: 'SETTINGS', icon: '⚙️', hasSubmenu: false }
    ],
    submenuOptions: ['PLAY GAME', 'LEADERBOARD', 'RETURN'],
    soundEnabled: true
};

// DOM Elements
const elements = {
    gameboy: document.getElementById('gameboy'),
    screen: document.getElementById('screen'),
    canvas: document.getElementById('game-canvas'),
    powerSwitch: document.getElementById('power-switch'),
    powerLed: document.getElementById('power-led'),
    bootScreen: document.getElementById('boot-screen'),
    menuScreen: document.getElementById('menu-screen'),
    submenuScreen: document.getElementById('submenu-screen'),
    submenuTitle: document.getElementById('submenu-title'),
    screenOverlay: document.getElementById('screen-overlay'),
    gameSlots: document.querySelectorAll('.game-slot'),
    submenuOptions: document.querySelectorAll('.submenu-option'),
    dpadButtons: document.querySelectorAll('.dpad > div[data-key]'),
    actionButtons: document.querySelectorAll('.action-button'),
    optionButtons: document.querySelectorAll('.option-button')
};

// Initialize the app
function init() {
    setupEventListeners();
    updatePowerState();
    loadColorTheme();
    console.log('Nintendo TrenchBoy initialized');
}

// Setup all event listeners
function setupEventListeners() {
    // Power switch
    elements.powerSwitch.addEventListener('click', togglePower);
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyRelease);
    
    // Button visual feedback
    setupButtonFeedback();
}

// Setup visual feedback for buttons
function setupButtonFeedback() {
    // D-pad buttons
    elements.dpadButtons.forEach(button => {
        button.addEventListener('mousedown', () => button.classList.add('pressed'));
        button.addEventListener('mouseup', () => button.classList.remove('pressed'));
        button.addEventListener('mouseleave', () => button.classList.remove('pressed'));
    });
    
    // Action buttons
    elements.actionButtons.forEach(button => {
        button.addEventListener('mousedown', () => button.classList.add('pressed'));
        button.addEventListener('mouseup', () => button.classList.remove('pressed'));
        button.addEventListener('mouseleave', () => button.classList.remove('pressed'));
    });
    
    // Return button
    const returnButton = document.querySelector('.button-return');
    if (returnButton) {
        returnButton.addEventListener('click', () => {
            if (app.currentState !== GameState.OFF) {
                showMenu();
            }
        });
    }
}

// Toggle power state
function togglePower() {
    if (app.currentState === GameState.OFF) {
        powerOn();
    } else {
        powerOff();
    }
}

// Power on sequence
async function powerOn() {
    app.currentState = GameState.BOOTING;
    elements.powerSwitch.classList.add('on');
    elements.powerLed.classList.add('on');
    elements.gameboy.classList.add('powered-on');
    
    // Play boot sound
    playSound('boot');
    
    // Show boot screen with animation
    elements.bootScreen.style.display = 'flex';
    elements.menuScreen.style.display = 'none';
    
    // Force reflow to ensure animation plays
    elements.bootScreen.offsetHeight;
    
    // Add animation class
    elements.bootScreen.classList.add('animating');
    
    // Wait for boot animation
    await delay(2500);
    
    // Remove animation class for next time
    elements.bootScreen.classList.remove('animating');
    
    // Transition to menu
    showMenu();
}

// Power off sequence
function powerOff() {
    app.currentState = GameState.OFF;
    elements.powerSwitch.classList.remove('on');
    elements.powerLed.classList.remove('on');
    elements.gameboy.classList.remove('powered-on');
    
    // Hide all screens
    elements.bootScreen.style.display = 'none';
    elements.menuScreen.style.display = 'none';
    elements.canvas.style.display = 'none';
    elements.screenOverlay.style.display = 'block';
    
    // Stop current game if playing
    if (app.currentGame) {
        // Game cleanup will be handled by game engine
        app.currentGame = null;
    }
}

// Show game menu
function showMenu() {
    app.currentState = GameState.MENU;
    elements.bootScreen.style.display = 'none';
    elements.menuScreen.style.display = 'flex';
    elements.submenuScreen.style.display = 'none';
    elements.canvas.style.display = 'none';
    elements.screenOverlay.style.display = 'block';
    
    // Stop current game if playing
    if (app.currentGame) {
        app.currentGame.stop();
        app.currentGame = null;
    }
    
    // Clean up handlers
    if (app.copyHandler) {
        document.removeEventListener('keydown', app.copyHandler);
        app.copyHandler = null;
    }
    
    if (app.settingsHandler) {
        document.removeEventListener('keydown', app.settingsHandler);
        app.settingsHandler = null;
        app.settingsState = null;
    }
    
    // Reset selection to first game
    app.selectedGameIndex = 0;
    updateGameSelection();
}

// Update game selection highlight
function updateGameSelection() {
    elements.gameSlots.forEach((slot, index) => {
        if (index === app.selectedGameIndex) {
            slot.classList.add('active');
        } else {
            slot.classList.remove('active');
        }
    });
}

// Handle keyboard input
function handleKeyPress(event) {
    if (app.currentState === GameState.OFF) return;
    
    const key = event.key.toLowerCase();
    
    // Visual feedback
    const buttonMap = {
        'arrowup': 'up',
        'arrowdown': 'down',
        'arrowleft': 'left',
        'arrowright': 'right',
        'z': 'b',
        'x': 'a',
        ' ': 'start',
        'escape': 'return',
        'shift': 'return'
    };
    
    if (buttonMap[key]) {
        const button = document.querySelector(`[data-key="${buttonMap[key]}"]`);
        if (button) button.classList.add('pressed');
    }
    
    // Handle return to menu from any state (except OFF)
    if ((key === 'escape' || key === 'shift') && app.currentState !== GameState.OFF) {
        showMenu();
        return;
    }
    
    // Handle input based on current state
    switch (app.currentState) {
        case GameState.MENU:
            handleMenuInput(key);
            break;
        case GameState.SUBMENU:
            handleSubmenuInput(key);
            break;
        case GameState.PLAYING:
            handleGameInput(key);
            break;
    }
}

// Handle key release
function handleKeyRelease(event) {
    const key = event.key.toLowerCase();
    
    // Remove visual feedback
    const buttonMap = {
        'arrowup': 'up',
        'arrowdown': 'down',
        'arrowleft': 'left',
        'arrowright': 'right',
        'z': 'b',
        'x': 'a',
        ' ': 'start',
        'escape': 'return',
        'shift': 'return'
    };
    
    if (buttonMap[key]) {
        const button = document.querySelector(`[data-key="${buttonMap[key]}"]`);
        if (button) button.classList.remove('pressed');
    }
    
    // Pass key release to game
    if (app.currentState === GameState.PLAYING) {
        handleGameKeyRelease(event.key);
    }
}

// Handle menu navigation
function handleMenuInput(key) {
    const totalGames = app.games.length;
    const columns = 3;
    const rows = Math.ceil(totalGames / columns);
    
    switch (key) {
        case 'arrowup':
            if (app.selectedGameIndex >= columns) {
                app.selectedGameIndex -= columns;
                updateGameSelection();
                playSound('menu-move');
            }
            break;
        case 'arrowdown':
            if (app.selectedGameIndex + columns < totalGames) {
                app.selectedGameIndex += columns;
                updateGameSelection();
                playSound('menu-move');
            }
            break;
        case 'arrowleft':
            if (app.selectedGameIndex % columns !== 0) {
                app.selectedGameIndex--;
                updateGameSelection();
                playSound('menu-move');
            }
            break;
        case 'arrowright':
            if (app.selectedGameIndex % columns !== columns - 1 && app.selectedGameIndex < totalGames - 1) {
                app.selectedGameIndex++;
                updateGameSelection();
                playSound('menu-move');
            }
            break;
        case 'enter':
            selectGame();
            break;
    }
}

// Handle game input
function handleGameInput(key) {
    // This will be passed to the current game
    if (app.currentGame && app.currentGame.handleInput) {
        app.currentGame.handleInput(key);
    }
}

// Handle key release for games
function handleGameKeyRelease(key) {
    if (app.currentGame && app.currentGame.handleKeyUp) {
        app.currentGame.handleKeyUp(key);
    }
}

// Select and start a game
async function selectGame() {
    const selectedGame = app.games[app.selectedGameIndex];
    
    // Handle special cards
    if (selectedGame.id === 'twitter') {
        playSound('game-select');
        // Open Twitter link in new tab - CHANGE THIS URL TO YOUR TWITTER
        window.open('https://x.com/TrenchBoyTM', '_blank');
        return;
    }
    
    if (selectedGame.id === 'ca') {
        playSound('game-select');
        showContractAddress();
        return;
    }
    
    if (selectedGame.id === 'settings') {
        playSound('game-select');
        showSettings();
        return;
    }
    
    // Games with submenus
    if (selectedGame.hasSubmenu) {
        showSubmenu(selectedGame);
        return;
    }
}

// Start a game
function startGame(gameId) {
    app.currentState = GameState.PLAYING;
    
    // Clean up previous game
    if (app.currentGame) {
        app.currentGame.stop();
        app.currentGame = null;
    }
    
    // Load the appropriate game
    switch(gameId) {
        case 'snake':
            if (window.SnakeGame) {
                app.currentGame = new window.SnakeGame(elements.canvas);
                app.currentGame.start();
            } else {
                console.error('Snake game not loaded');
                showMenu();
            }
            break;
        case 'pong':
            if (window.PongGame) {
                app.currentGame = new window.PongGame(elements.canvas);
                app.currentGame.start();
            } else {
                console.error('Pong game not loaded');
                showMenu();
            }
            break;
        case 'tetris':
            if (window.TetrisGame) {
                app.currentGame = new window.TetrisGame(elements.canvas);
                app.currentGame.start();
            } else {
                console.error('Tetris game not loaded');
                showMenu();
            }
            break;
        default:
            // Show coming soon message
            const ctx = elements.canvas.getContext('2d');
            ctx.fillStyle = '#9BBC0F';
            ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
            ctx.fillStyle = '#0F380F';
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME COMING SOON', elements.canvas.width / 2, elements.canvas.height / 2);
            ctx.font = '12px monospace';
            ctx.fillText('Press ESC to return to menu', elements.canvas.width / 2, elements.canvas.height / 2 + 30);
    }
}

// Update power state
function updatePowerState() {
    if (app.currentState === GameState.OFF) {
        elements.powerSwitch.classList.remove('on');
        elements.powerLed.classList.remove('on');
    } else {
        elements.powerSwitch.classList.add('on');
        elements.powerLed.classList.add('on');
    }
}

// Utility function for delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Placeholder for sound playing
function playSound(soundName) {
    // This will be implemented in audio.js
    if (window.audioManager && window.audioManager.play) {
        window.audioManager.play(soundName);
    }
}

// Show contract address screen
function showContractAddress() {
    app.currentState = GameState.PLAYING;
    
    // Hide menu and show canvas
    elements.menuScreen.style.display = 'none';
    elements.screenOverlay.style.display = 'none';
    elements.canvas.style.display = 'block';
    
    const ctx = elements.canvas.getContext('2d');
    
    // Get current theme colors
    const gameboy = document.getElementById('gameboy');
    const style = getComputedStyle(gameboy);
    const colors = {
        bg: style.getPropertyValue('--screen-green-1').trim() || '#9BBC0F',
        primary: style.getPropertyValue('--screen-green-2').trim() || '#8BAC0F',
        secondary: style.getPropertyValue('--screen-green-3').trim() || '#306230',
        dark: style.getPropertyValue('--screen-green-4').trim() || '#0F380F'
    };
    
    // Contract address - CHANGE THIS TO YOUR ACTUAL CONTRACT ADDRESS
    const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
    
    // Clear screen with theme colors
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
    
    // Dark background box for better contrast
    ctx.fillStyle = colors.dark;
    ctx.fillRect(30, 30, elements.canvas.width - 60, elements.canvas.height - 60);
    
    // Inner lighter box
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(40, 40, elements.canvas.width - 80, elements.canvas.height - 80);
    
    // Title background
    ctx.fillStyle = colors.dark;
    ctx.fillRect(40, 40, elements.canvas.width - 80, 80);
    
    // Draw CA title
    ctx.fillStyle = colors.bg;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CA', elements.canvas.width / 2, 95);
    
    // Contract label
    ctx.fillStyle = colors.primary;
    ctx.font = 'bold 18px monospace';
    ctx.fillText('CONTRACT ADDRESS', elements.canvas.width / 2, 160);
    
    // Address background box
    ctx.fillStyle = colors.bg;
    ctx.fillRect(60, 180, elements.canvas.width - 120, 80);
    
    // Draw border around address box
    ctx.strokeStyle = colors.dark;
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 180, elements.canvas.width - 120, 80);
    
    // Draw contract address with better spacing
    ctx.fillStyle = colors.dark;
    ctx.font = 'bold 16px monospace';
    
    // Split address for readability
    const addressPart1 = contractAddress.substring(0, 21);
    const addressPart2 = contractAddress.substring(21);
    
    ctx.fillText(addressPart1, elements.canvas.width / 2, 210);
    ctx.fillText(addressPart2, elements.canvas.width / 2, 235);
    
    // Create clickable area for copy
    const copyButton = {
        x: 150,
        y: 280,
        width: 180,
        height: 40
    };
    
    // Draw copy button
    ctx.fillStyle = colors.dark;
    ctx.fillRect(copyButton.x, copyButton.y, copyButton.width, copyButton.height);
    
    ctx.strokeStyle = colors.bg;
    ctx.lineWidth = 2;
    ctx.strokeRect(copyButton.x, copyButton.y, copyButton.width, copyButton.height);
    
    ctx.fillStyle = colors.bg;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('[A] COPY ADDRESS', elements.canvas.width / 2, copyButton.y + 25);
    
    // Instructions
    ctx.font = '12px monospace';
    ctx.fillStyle = colors.primary;
    ctx.fillText('PUMP.FUN CONTRACT', elements.canvas.width / 2, 350);
    
    ctx.fillStyle = colors.bg;
    ctx.fillText('Press RETURN to go back', elements.canvas.width / 2, 380);
    
    // Store contract address and colors for copy functionality
    app.currentContractAddress = contractAddress;
    app.currentColors = colors;
    
    // Add copy handler
    app.copyHandler = (e) => {
        if (e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'a') {
            copyContractAddress();
        }
    };
    
    document.addEventListener('keydown', app.copyHandler);
}

// Copy contract address to clipboard
function copyContractAddress() {
    if (!app.currentContractAddress) return;
    
    navigator.clipboard.writeText(app.currentContractAddress).then(() => {
        // Visual feedback
        const ctx = elements.canvas.getContext('2d');
        const colors = app.currentColors;
        
        // Flash effect
        ctx.fillStyle = colors.bg;
        ctx.fillRect(150, 280, 180, 40);
        
        ctx.fillStyle = colors.dark;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('COPIED!', elements.canvas.width / 2, 305);
        
        // Play sound
        if (window.audioManager) {
            window.audioManager.play('coin');
        }
        
        // Restore button after delay
        setTimeout(() => {
            ctx.fillStyle = colors.dark;
            ctx.fillRect(150, 280, 180, 40);
            
            ctx.strokeStyle = colors.bg;
            ctx.lineWidth = 2;
            ctx.strokeRect(150, 280, 180, 40);
            
            ctx.fillStyle = colors.bg;
            ctx.font = 'bold 14px monospace';
            ctx.fillText('[A] COPY ADDRESS', elements.canvas.width / 2, 305);
        }, 1000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Show submenu for a game
function showSubmenu(game) {
    app.currentState = GameState.SUBMENU;
    app.currentSubmenuGame = game;
    app.selectedSubmenuIndex = 0;
    
    // Update submenu title
    elements.submenuTitle.textContent = game.name;
    
    // Hide menu and show submenu
    elements.menuScreen.style.display = 'none';
    elements.submenuScreen.style.display = 'flex';
    
    // Update submenu selection
    updateSubmenuSelection();
    
    playSound('game-select');
}

// Update submenu selection highlight
function updateSubmenuSelection() {
    elements.submenuOptions.forEach((option, index) => {
        if (index === app.selectedSubmenuIndex) {
            option.classList.add('active');
            option.querySelector('.option-arrow').textContent = '▶';
        } else {
            option.classList.remove('active');
            option.querySelector('.option-arrow').textContent = '';
        }
    });
}

// Handle submenu navigation
function handleSubmenuInput(key) {
    switch (key) {
        case 'arrowup':
            if (app.selectedSubmenuIndex > 0) {
                app.selectedSubmenuIndex--;
                updateSubmenuSelection();
                playSound('menu-move');
            }
            break;
        case 'arrowdown':
            if (app.selectedSubmenuIndex < app.submenuOptions.length - 1) {
                app.selectedSubmenuIndex++;
                updateSubmenuSelection();
                playSound('menu-move');
            }
            break;
        case 'enter':
            selectSubmenuOption();
            break;
    }
}

// Handle submenu selection
function selectSubmenuOption() {
    const option = app.submenuOptions[app.selectedSubmenuIndex];
    
    switch (option) {
        case 'PLAY GAME':
            playSound('game-select');
            startGameDirectly(app.currentSubmenuGame.id);
            break;
        case 'LEADERBOARD':
            playSound('game-select');
            showLeaderboard(app.currentSubmenuGame.id);
            break;
        case 'RETURN':
            playSound('menu-move');
            returnToMainMenu();
            break;
    }
}

// Start game directly (bypassing submenu)
async function startGameDirectly(gameId) {
    app.currentState = GameState.LOADING;
    
    // Add transition effect
    elements.screen.classList.add('transitioning');
    await delay(500);
    
    // Hide submenu and show canvas
    elements.submenuScreen.style.display = 'none';
    elements.screenOverlay.style.display = 'none';
    elements.canvas.style.display = 'block';
    
    // Start the game
    elements.screen.classList.remove('transitioning');
    elements.screen.classList.add('game-starting');
    
    // Load and start the selected game
    startGame(gameId);
    
    setTimeout(() => {
        elements.screen.classList.remove('game-starting');
    }, 800);
}

// Show leaderboard
function showLeaderboard(gameId) {
    app.currentState = GameState.PLAYING;
    
    // Hide submenu and show canvas
    elements.submenuScreen.style.display = 'none';
    elements.screenOverlay.style.display = 'none';
    elements.canvas.style.display = 'block';
    
    // Create and display leaderboard
    if (window.LeaderboardDisplay) {
        const leaderboard = new window.LeaderboardDisplay(elements.canvas, gameId);
        leaderboard.loadScores();
        
        // Store reference for cleanup
        app.currentLeaderboard = leaderboard;
    } else {
        // Fallback if Firebase not loaded yet
        const ctx = elements.canvas.getContext('2d');
        
        // Get current theme colors
        const gameboy = document.getElementById('gameboy');
        const style = getComputedStyle(gameboy);
        const colors = {
            bg: style.getPropertyValue('--screen-green-1').trim() || '#9BBC0F',
            primary: style.getPropertyValue('--screen-green-2').trim() || '#8BAC0F',
            secondary: style.getPropertyValue('--screen-green-3').trim() || '#306230',
            dark: style.getPropertyValue('--screen-green-4').trim() || '#0F380F'
        };
        
        // Clear screen
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
        
        // Draw loading message
        ctx.fillStyle = colors.dark;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${gameId.toUpperCase()} LEADERBOARD`, elements.canvas.width / 2, 50);
        
        // Loading message
        ctx.font = '16px monospace';
        ctx.fillText('LOADING...', elements.canvas.width / 2, elements.canvas.height / 2);
        
        ctx.font = '12px monospace';
        ctx.fillStyle = colors.secondary;
        ctx.fillText('Press RETURN to go back', elements.canvas.width / 2, elements.canvas.height - 30);
        
        // Try again after a short delay
        setTimeout(() => {
            if (window.LeaderboardDisplay) {
                showLeaderboard(gameId);
            } else {
                console.error('LeaderboardDisplay not loaded. Check that leaderboard.js is included.');
            }
        }, 500);
    }
}

// Return to main menu from submenu
function returnToMainMenu() {
    app.currentState = GameState.MENU;
    elements.submenuScreen.style.display = 'none';
    elements.menuScreen.style.display = 'flex';
    updateGameSelection();
}

// Show settings screen with improved legibility
function showSettings() {
    app.currentState = GameState.PLAYING;
    
    // Hide menu and show canvas
    elements.menuScreen.style.display = 'none';
    elements.screenOverlay.style.display = 'none';
    elements.canvas.style.display = 'block';
    
    const ctx = elements.canvas.getContext('2d');
    
    // Get current theme colors
    const gameboy = document.getElementById('gameboy');
    const style = getComputedStyle(gameboy);
    const colors = {
        bg: style.getPropertyValue('--screen-green-1').trim() || '#9BBC0F',
        primary: style.getPropertyValue('--screen-green-2').trim() || '#8BAC0F',
        secondary: style.getPropertyValue('--screen-green-3').trim() || '#306230',
        dark: style.getPropertyValue('--screen-green-4').trim() || '#0F380F'
    };
    
    // Settings state
    if (!app.settingsState) {
        app.settingsState = {
            selectedOption: 0,
            options: ['THEME: ' + app.currentTheme.toUpperCase(), 'RETURN'],
            tempTheme: app.currentTheme, // Store temporary theme selection
            originalTheme: app.currentTheme // Store original theme to revert if cancelled
        };
    }
    
    // Ensure we're showing the current theme
    previewTheme(app.settingsState.tempTheme);
    
    // Draw settings screen
    drawSettingsScreen(ctx, colors);
    
    // Add settings input handler
    app.settingsHandler = (e) => {
        handleSettingsInput(e.key.toLowerCase(), ctx, colors);
    };
    
    document.addEventListener('keydown', app.settingsHandler);
}

// Draw settings screen with improved legibility
function drawSettingsScreen(ctx, colors) {
    // Get current preview colors (not the passed colors)
    const gameboy = document.getElementById('gameboy');
    const style = getComputedStyle(gameboy);
    const currentColors = {
        bg: style.getPropertyValue('--screen-green-1').trim() || '#9BBC0F',
        primary: style.getPropertyValue('--screen-green-2').trim() || '#8BAC0F',
        secondary: style.getPropertyValue('--screen-green-3').trim() || '#306230',
        dark: style.getPropertyValue('--screen-green-4').trim() || '#0F380F'
    };
    
    // Use current preview colors
    colors = currentColors;
    
    // Clear screen
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
    
    // Larger dark background for better contrast
    ctx.fillStyle = colors.dark;
    ctx.fillRect(20, 20, elements.canvas.width - 40, elements.canvas.height - 40);
    
    // Inner box with more padding
    ctx.fillStyle = colors.bg;
    ctx.fillRect(30, 30, elements.canvas.width - 60, elements.canvas.height - 60);
    
    // Title background with more height
    ctx.fillStyle = colors.dark;
    ctx.fillRect(30, 30, elements.canvas.width - 60, 90);
    
    // Title - larger and bolder
    ctx.fillStyle = colors.bg;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SETTINGS', elements.canvas.width / 2, 85);
    
    // Draw options with better spacing and larger text
    app.settingsState.options.forEach((option, index) => {
        const y = 170 + index * 60; // Increased spacing between options
        const isSelected = index === app.settingsState.selectedOption;
        
        if (isSelected) {
            // Larger selection box with rounded effect
            ctx.fillStyle = colors.dark;
            ctx.fillRect(60, y - 30, elements.canvas.width - 120, 50);
            
            // Inner highlight for depth
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(65, y - 25, elements.canvas.width - 130, 40);
        }
        
        // Option text - larger font
        ctx.fillStyle = isSelected ? colors.bg : colors.dark;
        ctx.font = isSelected ? 'bold 24px monospace' : 'bold 22px monospace';
        ctx.fillText(option, elements.canvas.width / 2, y);
        
        // Larger arrow for selected
        if (isSelected) {
            ctx.font = 'bold 28px monospace';
            ctx.fillText('▶', 80, y);
        }
    });
    
    // Color preview if on theme option
    if (app.settingsState.selectedOption === 0) {
        const themes = ['GREEN', 'TEAL', 'ORANGE'];
        const themeColors = {
            'GREEN': ['#9BBC0F', '#8BAC0F', '#306230', '#0F380F'],
            'TEAL': ['#84D2E8', '#4B8B9B', '#294C60', '#001B2E'],
            'ORANGE': ['#FF9E00', '#B85C00', '#5C2E00', '#1A0707']
        };
        
        // Draw larger color swatches
        const swatchY = 260;
        const swatchSize = 40; // Increased from 30
        const startX = (elements.canvas.width - (themes.length * (swatchSize + 25) - 25)) / 2;
        
        themes.forEach((theme, index) => {
            const x = startX + index * (swatchSize + 25);
            const isCurrentTheme = theme === app.settingsState.tempTheme.toUpperCase();
            const isSavedTheme = theme === app.settingsState.originalTheme.toUpperCase();
            
            // Draw swatch with all 4 colors
            const swatch = themeColors[theme];
            const miniSize = swatchSize / 2;
            
            // Top left
            ctx.fillStyle = swatch[0];
            ctx.fillRect(x, swatchY, miniSize, miniSize);
            
            // Top right
            ctx.fillStyle = swatch[1];
            ctx.fillRect(x + miniSize, swatchY, miniSize, miniSize);
            
            // Bottom left
            ctx.fillStyle = swatch[2];
            ctx.fillRect(x, swatchY + miniSize, miniSize, miniSize);
            
            // Bottom right
            ctx.fillStyle = swatch[3];
            ctx.fillRect(x + miniSize, swatchY + miniSize, miniSize, miniSize);
            
            // Border for current selection (preview)
            if (isCurrentTheme) {
                ctx.strokeStyle = colors.dark;
                ctx.lineWidth = 4;
                ctx.strokeRect(x - 3, swatchY - 3, swatchSize + 6, swatchSize + 6);
                
                // Inner border for visibility
                ctx.strokeStyle = colors.bg;
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 1, swatchY - 1, swatchSize + 2, swatchSize + 2);
            }
            
            // Checkmark for saved theme
            if (isSavedTheme) {
                ctx.fillStyle = colors.dark;
                ctx.font = 'bold 16px monospace';
                ctx.fillText('✓', x + swatchSize/2, swatchY - 8);
            }
            
            // Theme name - larger text
            ctx.fillStyle = colors.dark;
            ctx.font = 'bold 14px monospace';
            ctx.fillText(theme[0], x + swatchSize/2, swatchY + swatchSize + 20);
        });
        
        // Instructions - larger and clearer
        ctx.fillStyle = colors.dark;
        ctx.font = 'bold 16px monospace';
        ctx.fillText('← → Preview  •  ENTER Save', elements.canvas.width / 2, 340);
        
        // Show if changes are unsaved - more prominent
        if (app.settingsState.tempTheme !== app.settingsState.originalTheme) {
            ctx.fillStyle = colors.secondary;
            ctx.fillRect(elements.canvas.width/2 - 80, 355, 160, 25);
            
            ctx.fillStyle = colors.bg;
            ctx.font = 'bold 14px monospace';
            ctx.fillText('UNSAVED CHANGES', elements.canvas.width / 2, 372);
        }
    }
    
    // Bottom instructions - clearer and larger
    ctx.fillStyle = colors.dark;
    ctx.fillRect(50, 385, elements.canvas.width - 100, 30);
    
    ctx.fillStyle = colors.bg;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('↑↓ Navigate  •  ENTER Select  •  ESC Exit', elements.canvas.width / 2, 404);
}

// Handle settings input with improved feedback
function handleSettingsInput(key, ctx, colors) {
    switch(key) {
        case 'arrowup':
            if (app.settingsState.selectedOption > 0) {
                app.settingsState.selectedOption--;
                drawSettingsScreen(ctx, colors);
                playSound('menu-move');
            }
            break;
            
        case 'arrowdown':
            if (app.settingsState.selectedOption < app.settingsState.options.length - 1) {
                app.settingsState.selectedOption++;
                drawSettingsScreen(ctx, colors);
                playSound('menu-move');
            }
            break;
            
        case 'arrowleft':
            if (app.settingsState.selectedOption === 0) {
                // Cycle backwards through themes
                const themes = ['green', 'teal', 'orange'];
                const currentIndex = themes.indexOf(app.settingsState.tempTheme);
                const prevIndex = (currentIndex - 1 + themes.length) % themes.length;
                app.settingsState.tempTheme = themes[prevIndex];
                app.settingsState.options[0] = 'THEME: ' + app.settingsState.tempTheme.toUpperCase();
                
                // Preview the theme without saving
                previewTheme(app.settingsState.tempTheme);
                
                // Redraw with new colors
                const gameboy = document.getElementById('gameboy');
                const style = getComputedStyle(gameboy);
                const newColors = {
                    bg: style.getPropertyValue('--screen-green-1').trim() || '#9BBC0F',
                    primary: style.getPropertyValue('--screen-green-2').trim() || '#8BAC0F',
                    secondary: style.getPropertyValue('--screen-green-3').trim() || '#306230',
                    dark: style.getPropertyValue('--screen-green-4').trim() || '#0F380F'
                };
                drawSettingsScreen(ctx, newColors);
                playSound('menu-move');
            }
            break;
            
        case 'arrowright':
            if (app.settingsState.selectedOption === 0) {
                // Cycle forwards through themes
                const themes = ['green', 'teal', 'orange'];
                const currentIndex = themes.indexOf(app.settingsState.tempTheme);
                const nextIndex = (currentIndex + 1) % themes.length;
                app.settingsState.tempTheme = themes[nextIndex];
                app.settingsState.options[0] = 'THEME: ' + app.settingsState.tempTheme.toUpperCase();
                
                // Preview the theme without saving
                previewTheme(app.settingsState.tempTheme);
                
                // Redraw with new colors
                const gameboy = document.getElementById('gameboy');
                const style = getComputedStyle(gameboy);
                const newColors = {
                    bg: style.getPropertyValue('--screen-green-1').trim() || '#9BBC0F',
                    primary: style.getPropertyValue('--screen-green-2').trim() || '#8BAC0F',
                    secondary: style.getPropertyValue('--screen-green-3').trim() || '#306230',
                    dark: style.getPropertyValue('--screen-green-4').trim() || '#0F380F'
                };
                drawSettingsScreen(ctx, newColors);
                playSound('menu-move');
            }
            break;
            
        case 'enter':
            if (app.settingsState.selectedOption === 0) { // Theme option - confirm selection
                // Save the theme choice
                setColorTheme(app.settingsState.tempTheme);
                app.settingsState.originalTheme = app.settingsState.tempTheme;
                
                // Visual feedback
                playSound('coin');
                
                // Flash confirmation with better visibility
                ctx.fillStyle = colors.dark;
                ctx.fillRect(elements.canvas.width/2 - 100, 340, 200, 40);
                
                ctx.fillStyle = colors.bg;
                ctx.font = 'bold 20px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('THEME SAVED!', elements.canvas.width / 2, 365);
                
                setTimeout(() => {
                    drawSettingsScreen(ctx, colors);
                }, 800);
                
            } else if (app.settingsState.selectedOption === 1) { // Return
                // Revert to original theme if not saved
                if (app.currentTheme !== app.settingsState.originalTheme) {
                    setColorTheme(app.settingsState.originalTheme);
                }
                
                // Clean up handler
                document.removeEventListener('keydown', app.settingsHandler);
                app.settingsHandler = null;
                app.settingsState = null;
                showMenu();
            }
            break;
            
        case 'escape':
        case 'shift':
            // Revert to original theme if not saved
            if (app.currentTheme !== app.settingsState.originalTheme) {
                setColorTheme(app.settingsState.originalTheme);
            }
            
            // Clean up handler
            document.removeEventListener('keydown', app.settingsHandler);
            app.settingsHandler = null;
            app.settingsState = null;
            showMenu();
            break;
    }
}

// Preview theme without saving
function previewTheme(theme) {
    // Update gameboy class
    elements.gameboy.classList.remove('theme-green', 'theme-teal', 'theme-orange');
    if (theme !== 'green') {
        elements.gameboy.classList.add(`theme-${theme}`);
    }
    
    // Update game colors if a game is running
    if (app.currentGame && app.currentGame.updateColors) {
        app.currentGame.updateColors();
    }
}

// Load game scripts
function loadGameScripts() {
    // Load game engine
    const gameEngineScript = document.createElement('script');
    gameEngineScript.src = 'js/games/game-engine.js';
    document.head.appendChild(gameEngineScript);
    
    // Load Snake game after engine loads
    gameEngineScript.onload = () => {
        const snakeScript = document.createElement('script');
        snakeScript.src = 'js/games/snake.js';
        document.head.appendChild(snakeScript);
        
        const pongScript = document.createElement('script');
        pongScript.src = 'js/games/pong.js';
        document.head.appendChild(pongScript);
        
        const tetrisScript = document.createElement('script');
        tetrisScript.src = 'js/games/tetris.js';
        document.head.appendChild(tetrisScript);
    };
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Update elements after DOM is ready
    elements.submenuScreen = document.getElementById('submenu-screen');
    elements.submenuTitle = document.getElementById('submenu-title');
    elements.submenuOptions = document.querySelectorAll('.submenu-option');
    
    loadGameScripts();
    init();
});

// Color theme functions
function cycleColorTheme() {
    const themes = ['green', 'teal', 'orange'];
    const currentIndex = themes.indexOf(app.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    
    setColorTheme(themes[nextIndex]);
}

function setColorTheme(theme) {
    app.currentTheme = theme;
    
    // Update gameboy class
    elements.gameboy.classList.remove('theme-green', 'theme-teal', 'theme-orange');
    if (theme !== 'green') {
        elements.gameboy.classList.add(`theme-${theme}`);
    }
    
    // Update color dots
    const dots = document.querySelectorAll('.color-dot');
    dots.forEach(dot => {
        dot.classList.remove('active');
        if (dot.classList.contains(theme)) {
            dot.classList.add('active');
        }
    });
    
    // Update game colors if a game is running
    if (app.currentGame && app.currentGame.updateColors) {
        app.currentGame.updateColors();
    }
    
    // Save preference
    localStorage.setItem('trenchboy_color_theme', theme);
    
    // Play sound
    playSound('menu-move');
}

function loadColorTheme() {
    const savedTheme = localStorage.getItem('trenchboy_color_theme') || 'green';
    setColorTheme(savedTheme);
}

// Add keyboard shortcut for color theme (C key)
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c' && app.currentState !== GameState.OFF) {
        cycleColorTheme();
    }
});
