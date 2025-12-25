// Arnab's Adventure - Extended Platformer with Level Selection

const GameState = {
    MENU: 'menu',
    LEVEL_SELECT: 'level_select',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover',
    WIN: 'win'
};

const config = {
    width: 800,
    height: 600,
    gravity: 0.7,
    jumpStrength: -13,
    moveSpeed: 5.5,
    enemySpeedMultiplier: 1.3
};

// Game Variables
let gameState = GameState.MENU;
let canvas, ctx;
let score = 0;
let coins = 0;
let lives = 3;
let timeLeft = 180;
let gameTimer;
let highScore = localStorage.getItem('arnabHighScore') || 0;
let audioInitialized = false;
let isPaused = false;

// Level unlock system
let unlockedLevels = JSON.parse(localStorage.getItem('unlockedLevels')) || [1];

// Images and Audio
let arnabImage = new Image();
let jumpSound = new Audio('jump-sound.mp3');
let coinSound = new Audio('cid-acp-behn-choo.mp3');
let gameOverSound = new Audio('enymy-cauth-gameover-sound.mp3');
let imageLoaded = false;

// Current level
let currentLevel = 1;
const totalLevels = 5;

// Player (Arnab)
const player = {
    x: 100,
    y: 400,
    width: 50,
    height: 70,
    velocityX: 0,
    velocityY: 0,
    jumping: false,
    onGround: false,
    direction: 1
};

// Keyboard controls
const keys = {
    left: false,
    right: false,
    up: false,
    space: false
};

// Game Objects
let platforms = [];
let coins_objects = [];
let enemies = [];
let flags = [];
let clouds = [];

// Initialize Audio properly
function initAudio() {
    if (audioInitialized) return;
    
    try {
        // Set volumes
        jumpSound.volume = 0.5;
        coinSound.volume = 0.5;
        gameOverSound.volume = 0.6;
        
        // Preload audio
        jumpSound.load();
        coinSound.load();
        gameOverSound.load();
        
        console.log('🔊 Audio system initialized');
        audioInitialized = true;
    } catch (e) {
        console.log('Audio init error:', e);
    }
}

// Play sound with user interaction check
function playSound(audio) {
    if (!audioInitialized) {
        initAudio();
    }
    
    try {
        const sound = audio.cloneNode();
        sound.volume = audio.volume;
        sound.currentTime = 0;
        
        const playPromise = sound.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.log('Sound play prevented:', err.name);
            });
        }
    } catch (error) {
        console.log('Sound error:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Responsive canvas setup
    function resizeCanvas() {
        const container = document.getElementById('game-container');
        const containerWidth = container.offsetWidth;
        
        if (window.innerWidth <= 768) {
            // Mobile: maintain aspect ratio
            canvas.width = 800;
            canvas.height = 600;
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
        } else {
            // Desktop: fixed size
            canvas.width = config.width;
            canvas.height = config.height;
            canvas.style.width = '800px';
            canvas.style.height = '600px';
        }
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Load Arnab image
    arnabImage.src = 'arnab.jpg';
    arnabImage.onload = () => {
        imageLoaded = true;
        console.log('✅ Arnab image loaded!');
    };
    arnabImage.onerror = () => {
        console.log('❌ Failed to load Arnab image');
    };
    
    document.getElementById('high-score').textContent = highScore;
    
    // Menu button - open level selection
    document.getElementById('start-btn').addEventListener('click', () => {
        initAudio();
        playSound(coinSound);
        showLevelSelect();
    });
    
    // Level selection
    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', function() {
            const level = parseInt(this.dataset.level);
            if (!this.classList.contains('locked')) {
                initAudio();
                playSound(jumpSound);
                startGame(level);
            } else {
                playSound(gameOverSound);
                showToast('🔒 Complete previous level to unlock!');
            }
        });
    });
    
    document.getElementById('back-to-menu-btn').addEventListener('click', () => {
        playSound(coinSound);
        showMenu();
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
        playSound(coinSound);
        startGame(currentLevel);
    });
    
    document.getElementById('next-level-btn').addEventListener('click', () => {
        playSound(jumpSound);
        if (currentLevel < totalLevels) {
            startGame(currentLevel + 1);
        }
    });
    
    document.getElementById('level-select-btn').addEventListener('click', () => {
        playSound(coinSound);
        showLevelSelect();
    });
    
    document.getElementById('menu-btn').addEventListener('click', () => {
        playSound(coinSound);
        showMenu();
    });
    
    // Pause and Exit buttons
    document.getElementById('pause-btn').addEventListener('click', () => {
        togglePause();
    });
    
    document.getElementById('exit-btn').addEventListener('click', () => {
        if (confirm('Exit to main menu? Your progress will be lost.')) {
            playSound(gameOverSound);
            clearInterval(gameTimer);
            showMenu();
        }
    });
    
    // Mobile touch controls
    setupMobileControls();
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Update level select UI
    updateLevelSelectUI();
    
    // Create clouds for background
    createClouds();
});

function handleKeyDown(e) {
    // Pause with Escape or P key
    if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === GameState.PLAYING) {
            togglePause();
            e.preventDefault();
        }
        return;
    }
    
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keys.left = true;
        e.preventDefault();
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keys.right = true;
        e.preventDefault();
    }
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        keys.up = true;
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.up = false;
}

function togglePause() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pause-btn');
    
    if (isPaused) {
        gameState = GameState.PAUSED;
        clearInterval(gameTimer);
        pauseBtn.textContent = '▶️';
        pauseBtn.title = 'Resume';
        showToast('⏸️ Game Paused - Press P or ⏸️ to Resume');
    } else {
        gameState = GameState.PLAYING;
        pauseBtn.textContent = '⏸️';
        pauseBtn.title = 'Pause';
        
        // Resume timer
        gameTimer = setInterval(() => {
            timeLeft--;
            document.getElementById('timer').textContent = timeLeft;
            if (timeLeft <= 0) {
                endGame(false);
            }
        }, 1000);
        
        requestAnimationFrame(gameLoop);
        showToast('▶️ Game Resumed!');
    }
}

function setupMobileControls() {
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump = document.getElementById('btn-jump');
    
    if (!btnLeft || !btnRight || !btnJump) return;
    
    // Left button
    btnLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.left = true;
    });
    btnLeft.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.left = false;
    });
    
    // Right button
    btnRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.right = true;
    });
    btnRight.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.right = false;
    });
    
    // Jump button
    btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.up = true;
    });
    btnJump.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.up = false;
    });
    
    // Also support mouse for testing
    btnLeft.addEventListener('mousedown', () => keys.left = true);
    btnLeft.addEventListener('mouseup', () => keys.left = false);
    btnRight.addEventListener('mousedown', () => keys.right = true);
    btnRight.addEventListener('mouseup', () => keys.right = false);
    btnJump.addEventListener('mousedown', () => keys.up = true);
    btnJump.addEventListener('mouseup', () => keys.up = false);
}

function createClouds() {
    clouds = [];
    for (let i = 0; i < 6; i++) {
        clouds.push({
            x: Math.random() * 1000,
            y: Math.random() * 200 + 30,
            speed: Math.random() * 0.5 + 0.2,
            size: Math.random() * 40 + 25
        });
    }
}

function updateLevelSelectUI() {
    document.querySelectorAll('.level-card').forEach(card => {
        const level = parseInt(card.dataset.level);
        if (unlockedLevels.includes(level)) {
            card.classList.remove('locked');
            
            // Check if level is completed
            const levelCompleted = localStorage.getItem(`level${level}Completed`) === 'true';
            if (levelCompleted) {
                card.classList.add('completed');
            }
        } else {
            card.classList.add('locked');
        }
    });
}

function unlockLevel(level) {
    if (!unlockedLevels.includes(level)) {
        unlockedLevels.push(level);
        localStorage.setItem('unlockedLevels', JSON.stringify(unlockedLevels));
        updateLevelSelectUI();
    }
}

function markLevelCompleted(level) {
    localStorage.setItem(`level${level}Completed`, 'true');
    updateLevelSelectUI();
}

function createLevel() {
    platforms = [];
    coins_objects = [];
    enemies = [];
    flags = [];
    
    // Ground platform (always present)
    platforms.push({ x: 0, y: 550, width: 2400, height: 50, color: '#8B4513' });
    
    if (currentLevel === 1) {
        // LEVEL 1 - Tutorial (Extended to 2400px width)
        // First section
        platforms.push({ x: 200, y: 470, width: 120, height: 20, color: '#228B22' });
        platforms.push({ x: 370, y: 410, width: 120, height: 20, color: '#228B22' });
        platforms.push({ x: 540, y: 350, width: 120, height: 20, color: '#228B22' });
        platforms.push({ x: 700, y: 410, width: 120, height: 20, color: '#228B22' });
        
        // Middle section
        platforms.push({ x: 850, y: 470, width: 100, height: 20, color: '#228B22' });
        platforms.push({ x: 1000, y: 410, width: 100, height: 20, color: '#228B22' });
        platforms.push({ x: 1150, y: 350, width: 120, height: 20, color: '#228B22' });
        platforms.push({ x: 1300, y: 410, width: 100, height: 20, color: '#228B22' });
        
        // Final section
        platforms.push({ x: 1450, y: 470, width: 120, height: 20, color: '#228B22' });
        platforms.push({ x: 1600, y: 410, width: 120, height: 20, color: '#228B22' });
        platforms.push({ x: 1750, y: 350, width: 140, height: 20, color: '#228B22' });
        platforms.push({ x: 1920, y: 290, width: 150, height: 20, color: '#228B22' });
        platforms.push({ x: 2100, y: 350, width: 120, height: 20, color: '#228B22' });
        
        // Coins spread across map
        for (let i = 0; i < 15; i++) {
            coins_objects.push({ x: 250 + i * 130, y: 300 - (i % 3) * 40, collected: false });
        }
        
        // Enemies
        enemies.push({ x: 400, y: 530, width: 30, height: 30, vx: 2.5, direction: 1, patrolStart: 300, patrolEnd: 600 });
        enemies.push({ x: 1100, y: 530, width: 30, height: 30, vx: 2.5, direction: 1, patrolStart: 1000, patrolEnd: 1300 });
        enemies.push({ x: 1800, y: 530, width: 30, height: 30, vx: 2.5, direction: 1, patrolStart: 1700, patrolEnd: 2000 });
        
        flags.push({ x: 2150, y: 270, width: 30, height: 60 });
        
    } else if (currentLevel === 2) {
        // LEVEL 2 - Rising Challenge (3000px width, harder)
        platforms.push({ x: 0, y: 550, width: 3000, height: 50, color: '#8B4513' });
        
        // Complex platforming sections
        for (let i = 0; i < 25; i++) {
            let x = 150 + i * 110;
            let y = 480 - Math.sin(i * 0.5) * 100;
            let width = 80 + (i % 3) * 20;
            platforms.push({ x: x, y: y, width: width, height: 20, color: '#228B22' });
        }
        
        // Additional high platforms
        platforms.push({ x: 500, y: 250, width: 100, height: 20, color: '#228B22' });
        platforms.push({ x: 900, y: 220, width: 120, height: 20, color: '#228B22' });
        platforms.push({ x: 1300, y: 200, width: 100, height: 20, color: '#228B22' });
        platforms.push({ x: 1700, y: 220, width: 120, height: 20, color: '#228B22' });
        platforms.push({ x: 2100, y: 240, width: 100, height: 20, color: '#228B22' });
        platforms.push({ x: 2500, y: 200, width: 150, height: 20, color: '#228B22' });
        
        // Final platform near flag
        platforms.push({ x: 2700, y: 250, width: 200, height: 20, color: '#228B22' });
        
        // Coins
        for (let i = 0; i < 20; i++) {
            coins_objects.push({ x: 200 + i * 130, y: 250 - (i % 4) * 30, collected: false });
        }
        
        // More enemies with faster speeds
        enemies.push({ x: 300, y: 530, width: 30, height: 30, vx: 3 * config.enemySpeedMultiplier, direction: 1, patrolStart: 200, patrolEnd: 500 });
        enemies.push({ x: 800, y: 530, width: 30, height: 30, vx: 3.5 * config.enemySpeedMultiplier, direction: 1, patrolStart: 700, patrolEnd: 1000 });
        enemies.push({ x: 1400, y: 530, width: 30, height: 30, vx: 3 * config.enemySpeedMultiplier, direction: 1, patrolStart: 1300, patrolEnd: 1600 });
        enemies.push({ x: 2000, y: 530, width: 30, height: 30, vx: 3.5 * config.enemySpeedMultiplier, direction: 1, patrolStart: 1900, patrolEnd: 2200 });
        enemies.push({ x: 2600, y: 530, width: 30, height: 30, vx: 4 * config.enemySpeedMultiplier, direction: 1, patrolStart: 2500, patrolEnd: 2800 });
        
        // Flag on accessible platform
        flags.push({ x: 2750, y: 170, width: 30, height: 60 });
        
    } else if (currentLevel === 3) {
        // LEVEL 3 - The Climb (3600px, very challenging)
        platforms.push({ x: 0, y: 550, width: 3600, height: 50, color: '#8B4513' });
        
        // Zigzag pattern - requires precise jumping
        for (let i = 0; i < 30; i++) {
            let x = 100 + i * 115;
            let y = 480 - (i % 2) * 80 - Math.floor(i / 5) * 20;
            let width = 70 - (i % 4) * 5;
            platforms.push({ x: x, y: y, width: width, height: 20, color: '#228B22' });
        }
        
        // Vertical climbing sections
        for (let i = 0; i < 8; i++) {
            platforms.push({ x: 800 + i * 90, y: 450 - i * 50, width: 80, height: 20, color: '#228B22' });
        }
        
        for (let i = 0; i < 8; i++) {
            platforms.push({ x: 2000 + i * 90, y: 450 - i * 50, width: 75, height: 20, color: '#228B22' });
        }
        
        // High platforms near end
        platforms.push({ x: 2800, y: 280, width: 100, height: 20, color: '#228B22' });
        platforms.push({ x: 3000, y: 220, width: 100, height: 20, color: '#228B22' });
        platforms.push({ x: 3200, y: 160, width: 150, height: 20, color: '#228B22' });
        platforms.push({ x: 3400, y: 220, width: 120, height: 20, color: '#228B22' });
        
        // Coins
        for (let i = 0; i < 25; i++) {
            coins_objects.push({ x: 150 + i * 140, y: 200 - (i % 5) * 30, collected: false });
        }
        
        // Fast enemies with longer patrols
        enemies.push({ x: 400, y: 530, width: 30, height: 30, vx: 3.5 * config.enemySpeedMultiplier, direction: 1, patrolStart: 300, patrolEnd: 700 });
        enemies.push({ x: 1000, y: 530, width: 30, height: 30, vx: 4 * config.enemySpeedMultiplier, direction: 1, patrolStart: 900, patrolEnd: 1300 });
        enemies.push({ x: 1600, y: 530, width: 30, height: 30, vx: 3.5 * config.enemySpeedMultiplier, direction: 1, patrolStart: 1500, patrolEnd: 1900 });
        enemies.push({ x: 2200, y: 530, width: 30, height: 30, vx: 4 * config.enemySpeedMultiplier, direction: 1, patrolStart: 2100, patrolEnd: 2500 });
        enemies.push({ x: 2800, y: 530, width: 30, height: 30, vx: 4.5 * config.enemySpeedMultiplier, direction: 1, patrolStart: 2700, patrolEnd: 3100 });
        enemies.push({ x: 3300, y: 530, width: 30, height: 30, vx: 4 * config.enemySpeedMultiplier, direction: 1, patrolStart: 3200, patrolEnd: 3500 });
        
        flags.push({ x: 3450, y: 140, width: 30, height: 60 });
        
    } else if (currentLevel === 4) {
        // LEVEL 4 - Extreme (4200px, extreme difficulty)
        platforms.push({ x: 0, y: 550, width: 4200, height: 50, color: '#8B4513' });
        
        // Very tight platforming
        for (let i = 0; i < 40; i++) {
            let x = 80 + i * 100;
            let y = 500 - Math.abs(Math.sin(i * 0.3)) * 150 - (i % 5) * 10;
            let width = 60 - (i % 5) * 3;
            platforms.push({ x: x, y: y, width: width, height: 20, color: '#228B22' });
        }
        
        // Narrow vertical stacks
        for (let section = 0; section < 4; section++) {
            for (let i = 0; i < 9; i++) {
                platforms.push({ 
                    x: 1000 + section * 800 + i * 80, 
                    y: 480 - i * 55, 
                    width: 70, 
                    height: 20, 
                    color: '#228B22' 
                });
            }
        }
        
        // Final approach
        platforms.push({ x: 3800, y: 300, width: 80, height: 20, color: '#228B22' });
        platforms.push({ x: 3950, y: 240, width: 80, height: 20, color: '#228B22' });
        platforms.push({ x: 4100, y: 180, width: 100, height: 20, color: '#228B22' });
        
        // Coins
        for (let i = 0; i < 30; i++) {
            coins_objects.push({ x: 130 + i * 135, y: 180 - (i % 6) * 25, collected: false });
        }
        
        // Many fast enemies
        for (let i = 0; i < 10; i++) {
            enemies.push({ 
                x: 300 + i * 400, 
                y: 530, 
                width: 30, 
                height: 30, 
                vx: (3.5 + Math.random() * 1.5) * config.enemySpeedMultiplier, 
                direction: 1, 
                patrolStart: 250 + i * 400, 
                patrolEnd: 550 + i * 400 
            });
        }
        
        flags.push({ x: 4130, y: 100, width: 30, height: 60 });
        
    } else if (currentLevel === 5) {
        // LEVEL 5 - Master (5000px, insane length and difficulty)
        platforms.push({ x: 0, y: 550, width: 5000, height: 50, color: '#8B4513' });
        
        // Epic journey with varied challenges
        // Section 1: Wave pattern
        for (let i = 0; i < 15; i++) {
            let x = 100 + i * 120;
            let y = 450 - Math.sin(i * 0.6) * 120;
            platforms.push({ x: x, y: y, width: 70, height: 20, color: '#228B22' });
        }
        
        // Section 2: Stairway to heaven
        for (let i = 0; i < 12; i++) {
            platforms.push({ x: 2000 + i * 80, y: 480 - i * 40, width: 75, height: 20, color: '#228B22' });
        }
        
        // Section 3: Floating islands
        for (let i = 0; i < 20; i++) {
            let x = 3000 + (i % 4) * 90 + Math.floor(i / 4) * 200;
            let y = 450 - (i % 4) * 60;
            platforms.push({ x: x, y: y, width: 65, height: 20, color: '#228B22' });
        }
        
        // Section 4: The gauntlet
        for (let i = 0; i < 15; i++) {
            platforms.push({ x: 4200 + i * 50, y: 500 - (i % 3) * 80, width: 50, height: 20, color: '#228B22' });
        }
        
        // Final tower
        for (let i = 0; i < 10; i++) {
            platforms.push({ x: 4700 + (i % 2) * 80, y: 480 - i * 45, width: 80, height: 20, color: '#228B22' });
        }
        
        // Abundant coins
        for (let i = 0; i < 35; i++) {
            coins_objects.push({ x: 150 + i * 135, y: 150 - (i % 7) * 25, collected: false });
        }
        
        // Enemy army
        for (let i = 0; i < 15; i++) {
            enemies.push({ 
                x: 250 + i * 320, 
                y: 530, 
                width: 30, 
                height: 30, 
                vx: (3 + Math.random() * 2) * config.enemySpeedMultiplier, 
                direction: 1, 
                patrolStart: 200 + i * 320, 
                patrolEnd: 500 + i * 320 
            });
        }
        
        flags.push({ x: 4750, y: 30, width: 30, height: 60 });
    }
}

function showMenu() {
    gameState = GameState.MENU;
    document.getElementById('menu-screen').style.display = 'block';
    document.getElementById('level-select-screen').style.display = 'none';
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    canvas.style.display = 'none';
    clearInterval(gameTimer);
}

function showLevelSelect() {
    gameState = GameState.LEVEL_SELECT;
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('level-select-screen').style.display = 'block';
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    canvas.style.display = 'none';
    updateLevelSelectUI();
}

function startGame(level = 1) {
    currentLevel = level;
    gameState = GameState.PLAYING;
    isPaused = false;
    score = 0;
    coins = 0;
    lives = 3;
    timeLeft = 180 + (level * 30); // More time for harder levels
    
    player.x = 100;
    player.y = 400;
    player.velocityX = 0;
    player.velocityY = 0;
    player.jumping = false;
    player.onGround = false;
    
    // Reset pause button
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.textContent = '⏸️';
        pauseBtn.title = 'Pause';
    }
    
    createLevel();
    
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('level-select-screen').style.display = 'none';
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    canvas.style.display = 'block';
    
    // Ensure mobile controls are visible
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls && window.innerWidth <= 768) {
        mobileControls.style.display = 'flex';
    }
    
    clearInterval(gameTimer);
    gameTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame(false);
        }
    }, 1000);
    
    requestAnimationFrame(gameLoop);
    
    showToast(`Level ${level} - ${getLevelName(level)}! 🎮`);
}

function getLevelName(level) {
    const names = ['Tutorial', 'Rising Up', 'The Climb', 'Extreme', 'Master'];
    return names[level - 1] || 'Unknown';
}

let cameraX = 0; // Camera position for scrolling

function gameLoop() {
    if (gameState !== GameState.PLAYING || isPaused) return;
    
    // Camera follows player (with boundaries)
    const targetCameraX = player.x - canvas.width / 3;
    const levelWidth = platforms[0].width; // Ground platform width = level width
    cameraX = Math.max(0, Math.min(targetCameraX, levelWidth - canvas.width));
    
    // Clear canvas with sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E8F4F8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    ctx.translate(-cameraX, 0); // Apply camera offset
    
    // Draw clouds (parallax effect)
    clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > levelWidth + 100) cloud.x = -50;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.arc(cloud.x + 20, cloud.y - 10, cloud.size * 0.8, 0, Math.PI * 2);
        ctx.arc(cloud.x + 40, cloud.y, cloud.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Player physics
    if (keys.left) {
        player.velocityX = -config.moveSpeed;
        player.direction = -1;
    } else if (keys.right) {
        player.velocityX = config.moveSpeed;
        player.direction = 1;
    } else {
        player.velocityX = 0;
    }
    
    // Jumping
    if (keys.up && player.onGround) {
        player.velocityY = config.jumpStrength;
        player.jumping = true;
        player.onGround = false;
        playSound(jumpSound);
    }
    
    // Apply gravity
    player.velocityY += config.gravity;
    
    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Keep player in bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > levelWidth) player.x = levelWidth - player.width;
    
    // Check if falling off screen
    if (player.y > canvas.height) {
        playSound(gameOverSound);
        lives--;
        if (lives <= 0) {
            endGame(false);
            ctx.restore();
            return;
        } else {
            player.x = 100;
            player.y = 400;
            player.velocityX = 0;
            player.velocityY = 0;
            showToast(`Oops! Lives left: ${lives} ❤️`);
        }
    }
    
    // Platform collision
    player.onGround = false;
    platforms.forEach(platform => {
        if (player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + player.height > platform.y &&
            player.y + player.height < platform.y + 30 &&
            player.velocityY >= 0) {
            
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.onGround = true;
            player.jumping = false;
        }
    });
    
    // Draw platforms
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Add texture lines
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 2;
        for (let i = 0; i < platform.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(platform.x + i, platform.y);
            ctx.lineTo(platform.x + i + 5, platform.y + 5);
            ctx.stroke();
        }
    });
    
    // Draw and collect coins
    coins_objects.forEach(coin => {
        if (!coin.collected) {
            ctx.save();
            ctx.translate(coin.x, coin.y);
            
            let rotation = (Date.now() / 500) % (Math.PI * 2);
            ctx.rotate(rotation);
            
            // Indian flag
            ctx.fillStyle = '#FF9933';
            ctx.fillRect(-10, -15, 20, 10);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(-10, -5, 20, 10);
            ctx.fillStyle = '#138808';
            ctx.fillRect(-10, 5, 20, 10);
            
            ctx.strokeStyle = '#000080';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
            
            // Collision detection
            if (Math.abs(player.x + player.width / 2 - coin.x) < 30 &&
                Math.abs(player.y + player.height / 2 - coin.y) < 30) {
                coin.collected = true;
                coins++;
                score += 10;
                playSound(coinSound);
                showToast('+10 points! 🪙');
            }
        }
    });
    
    // Update and draw enemies
    enemies.forEach(enemy => {
        // Patrol behavior
        enemy.x += enemy.vx * enemy.direction;
        
        if (enemy.x <= enemy.patrolStart || enemy.x >= enemy.patrolEnd) {
            enemy.direction *= -1;
        }
        
        // Draw enemy
        ctx.fillStyle = '#DC143C';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Angry face
        ctx.fillStyle = '#000';
        ctx.fillRect(enemy.x + 8, enemy.y + 8, 4, 4);
        ctx.fillRect(enemy.x + 18, enemy.y + 8, 4, 4);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x + 15, enemy.y + 22, 6, 0.2, Math.PI - 0.2, true);
        ctx.stroke();
        
        // Collision with player
        if (player.x + player.width > enemy.x &&
            player.x < enemy.x + enemy.width &&
            player.y + player.height > enemy.y &&
            player.y < enemy.y + enemy.height) {
            
            if (player.velocityY > 0 && player.y + player.height - 10 < enemy.y + enemy.height / 2) {
                // Defeated enemy
                enemy.x = -1000;
                score += 50;
                player.velocityY = -8;
                playSound(coinSound);
                showToast('Enemy defeated! +50 💪');
            } else {
                // Hit by enemy
                playSound(gameOverSound);
                lives--;
                if (lives <= 0) {
                    endGame(false);
                    ctx.restore();
                    return;
                } else {
                    player.x = 100;
                    player.y = 400;
                    player.velocityX = 0;
                    player.velocityY = 0;
                    showToast(`Hit! Lives left: ${lives} ❤️`);
                }
            }
        }
    });
    
    // Draw and check win flag
    flags.forEach(flag => {
        // Flag pole
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(flag.x, flag.y, 5, flag.height);
        
        // Indian flag
        ctx.fillStyle = '#FF9933';
        ctx.fillRect(flag.x + 5, flag.y, 25, 10);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(flag.x + 5, flag.y + 10, 25, 10);
        ctx.fillStyle = '#138808';
        ctx.fillRect(flag.x + 5, flag.y + 20, 25, 10);
        
        ctx.strokeStyle = '#000080';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(flag.x + 17, flag.y + 15, 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Check if player reached flag
        if (Math.abs(player.x + player.width / 2 - flag.x) < 35 &&
            Math.abs(player.y + player.height / 2 - flag.y - 30) < 45) {
            
            score += 200;
            markLevelCompleted(currentLevel);
            
            if (currentLevel < totalLevels) {
                unlockLevel(currentLevel + 1);
                showToast(`Level ${currentLevel} Complete! Next level unlocked! 🎉`);
            }
            
            playSound(coinSound);
            endGame(true);
            ctx.restore();
            return;
        }
    });
    
    // Draw player
    ctx.save();
    
    if (player.direction === -1) {
        ctx.scale(-1, 1);
        ctx.translate(-player.x - player.width, 0);
    } else {
        ctx.translate(player.x, 0);
    }
    
    if (imageLoaded) {
        ctx.drawImage(arnabImage, 0, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = '#FF9933';
        ctx.fillRect(0, player.y, player.width, player.height);
        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.fillText('Arnab', 5, player.y + 35);
    }
    
    ctx.restore();
    
    // Restore context state
    ctx.restore();
    
    // Update HUD (not affected by camera)
    document.getElementById('score').textContent = score;
    const totalCoins = coins_objects.length;
    document.getElementById('mayhem').textContent = `L${currentLevel} | ${coins}/${totalCoins} 🪙 | ❤️${lives}`;
    
    requestAnimationFrame(gameLoop);
}

function endGame(won) {
    gameState = won ? GameState.WIN : GameState.GAMEOVER;
    clearInterval(gameTimer);
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('arnabHighScore', highScore);
        document.getElementById('high-score').textContent = highScore;
    }
    
    document.getElementById('game-screen').style.display = 'none';
    canvas.style.display = 'none';
    document.getElementById('gameover-screen').style.display = 'block';
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-mayhem').textContent = `Level ${currentLevel} | Coins: ${coins}/${coins_objects.length}`;
    
    // Show/hide next level button
    const nextLevelBtn = document.getElementById('next-level-btn');
    if (won && currentLevel < totalLevels) {
        nextLevelBtn.style.display = 'inline-block';
    } else {
        nextLevelBtn.style.display = 'none';
    }
    
    if (won) {
        if (currentLevel === totalLevels) {
            document.getElementById('achievement').textContent = `🏆 INCREDIBLE! You beat ALL ${totalLevels} levels! Master Champion! 🇮🇳`;
        } else {
            document.getElementById('achievement').textContent = `🎉 Level ${currentLevel} Complete! Level ${currentLevel + 1} is now unlocked!`;
        }
        playSound(coinSound);
    } else {
        playSound(gameOverSound);
        const achievement = getAchievement(score);
        document.getElementById('achievement').textContent = achievement;
    }
}

function getAchievement(score) {
    if (score >= 500) return '🌟 AMAZING! So close to victory!';
    if (score >= 400) return '💪 GREAT PERFORMANCE! Keep pushing!';
    if (score >= 300) return '😊 GOOD EFFORT! You can do it!';
    if (score >= 200) return '👍 NICE TRY! Practice makes perfect!';
    if (score >= 100) return '🎮 KEEP GOING! You\'re learning!';
    return '🙏 DON\'T GIVE UP! Try again!';
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}
