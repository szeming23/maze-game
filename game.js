// ---- Game State ----
const state = {
    gender: 'male',
    difficulty: 'easy',
    maze: null,
    mazeWidth: 0,
    mazeHeight: 0,
    playerX: 0,
    playerY: 0,
    goalX: 0,
    goalY: 0,
    cellSize: 0,
    timerStart: 0,
    timerInterval: null,
    won: false,
};

const DIFFICULTIES = {
    easy:   { size: 15, minDist: 15 },
    medium: { size: 25, minDist: 25 },
    hard:   { size: 50, minDist: 50 },
};

// ---- DOM refs ----
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const winScreen = document.getElementById('win-screen');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const timerEl = document.getElementById('timer');
const winTimeEl = document.getElementById('win-time');
const winSceneCanvas = document.getElementById('win-scene');

// ---- Menu logic ----
document.querySelectorAll('.char-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.gender = btn.dataset.gender;
    });
});

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.difficulty = btn.dataset.difficulty;
    });
});

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('back-btn').addEventListener('click', backToMenu);
document.getElementById('play-again-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', backToMenu);

// ---- Draw character previews ----
function drawPreviews() {
    const maleCtx = document.getElementById('preview-male').getContext('2d');
    const femaleCtx = document.getElementById('preview-female').getContext('2d');
    maleCtx.clearRect(0, 0, 64, 64);
    femaleCtx.clearRect(0, 0, 64, 64);
    drawSpriteScaled(maleCtx, SPRITE_MALE, 0, 0, 64, getPlayerPalette('male'));
    drawSpriteScaled(femaleCtx, SPRITE_FEMALE, 0, 0, 64, getPlayerPalette('female'));
}
drawPreviews();

// ---- Screen management ----
function showScreen(screen) {
    menuScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    winScreen.classList.remove('active');
    screen.classList.add('active');
}

function backToMenu() {
    stopTimer();
    showScreen(menuScreen);
}

// ---- Timer ----
function startTimer() {
    state.timerStart = Date.now();
    state.timerInterval = setInterval(updateTimer, 100);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTimer() {
    const elapsed = Date.now() - state.timerStart;
    const seconds = Math.floor(elapsed / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerEl.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function getElapsedTime() {
    const elapsed = Date.now() - state.timerStart;
    const seconds = Math.floor(elapsed / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

// ---- Game init ----
function startGame() {
    const diff = DIFFICULTIES[state.difficulty];
    state.mazeWidth = diff.size;
    state.mazeHeight = diff.size;
    state.won = false;

    // Generate maze
    state.maze = generateMaze(state.mazeWidth, state.mazeHeight);

    // Player starts in center
    state.playerX = Math.floor(state.mazeWidth / 2);
    state.playerY = Math.floor(state.mazeHeight / 2);

    // Find goal position
    const goal = findGoalPosition(state.maze, state.playerX, state.playerY, diff.minDist);
    state.goalX = goal.x;
    state.goalY = goal.y;

    // Calculate cell size to fit canvas
    resizeCanvas();

    showScreen(gameScreen);
    startTimer();
    render();
}

// ---- Canvas sizing ----
// Viewport shows a fixed number of cells centered on the player
const VIEW_CELLS = 7; // 7x7 viewport (player in center, 3 cells each side)

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;

    // Size cells to fill the viewport area
    const maxCellFromWidth = Math.floor(availW / VIEW_CELLS);
    const maxCellFromHeight = Math.floor(availH / VIEW_CELLS);
    state.cellSize = Math.max(16, Math.min(maxCellFromWidth, maxCellFromHeight, 80));

    canvas.width = VIEW_CELLS * state.cellSize;
    canvas.height = VIEW_CELLS * state.cellSize;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
}

// ---- Rendering ----
function render() {
    const cs = state.cellSize;
    const maze = state.maze;
    const px = state.playerX;
    const py = state.playerY;
    const visionRadius = 1.5; // cells — reveals the 8 adjacent cells
    const half = Math.floor(VIEW_CELLS / 2); // cells visible each side of player

    // Camera: player is always at center of viewport
    // camX/camY = maze coords of the top-left cell in viewport
    const camX = px - half;
    const camY = py - half;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cells in viewport
    for (let vy = 0; vy < VIEW_CELLS; vy++) {
        for (let vx = 0; vx < VIEW_CELLS; vx++) {
            const mx = camX + vx; // maze x
            const my = camY + vy; // maze y

            // Screen position
            const sx = vx * cs;
            const sy = vy * cs;

            // Distance from player
            const dx = mx - px;
            const dy = my - py;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Outside vision — stays black
            if (dist > visionRadius) continue;

            // Outside maze bounds — stays black
            if (mx < 0 || mx >= state.mazeWidth || my < 0 || my >= state.mazeHeight) continue;

            const cell = maze[my][mx];

            // Floor with brightness falloff
            const brightness = Math.max(0, 1 - dist / (visionRadius + 0.5));
            const floorR = Math.floor(40 * brightness) + 15;
            const floorG = Math.floor(36 * brightness) + 15;
            const floorB = Math.floor(58 * brightness) + 20;
            ctx.fillStyle = `rgb(${floorR}, ${floorG}, ${floorB})`;
            ctx.fillRect(sx, sy, cs, cs);

            // Walls
            ctx.strokeStyle = `rgba(100, 140, 200, ${brightness})`;
            ctx.lineWidth = Math.max(2, cs / 6);

            if (cell.n) {
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + cs, sy);
                ctx.stroke();
            }
            if (cell.s) {
                ctx.beginPath();
                ctx.moveTo(sx, sy + cs);
                ctx.lineTo(sx + cs, sy + cs);
                ctx.stroke();
            }
            if (cell.w) {
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx, sy + cs);
                ctx.stroke();
            }
            if (cell.e) {
                ctx.beginPath();
                ctx.moveTo(sx + cs, sy);
                ctx.lineTo(sx + cs, sy + cs);
                ctx.stroke();
            }

            // Draw goal if on this cell
            if (mx === state.goalX && my === state.goalY) {
                const goalSprite = getGoalSprite(state.gender);
                const goalPalette = getGoalPalette(state.gender);
                drawSprite(ctx, goalSprite, sx, sy, cs, goalPalette);

                // Heart above goal
                const heartSize = cs * 0.5;
                const heartX = sx + (cs - heartSize) / 2;
                const heartY = sy - heartSize * 0.3;
                drawSpriteScaled(ctx, SPRITE_HEART, heartX, heartY, heartSize, getHeartPalette());
            }
        }
    }

    // Draw player at center of viewport
    const playerSprite = getPlayerSprite(state.gender);
    const playerPalette = getPlayerPalette(state.gender);
    drawSprite(ctx, playerSprite, half * cs, half * cs, cs, playerPalette);

    // Fog-of-war gradient overlay
    const centerX = (half + 0.5) * cs;
    const centerY = (half + 0.5) * cs;
    const innerR = visionRadius * cs * 0.7;
    const outerR = (visionRadius + 0.5) * cs;

    const grad = ctx.createRadialGradient(centerX, centerY, innerR, centerX, centerY, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ---- Movement ----
function movePlayer(dx, dy) {
    if (state.won) return;

    const nx = state.playerX + dx;
    const ny = state.playerY + dy;
    const maze = state.maze;

    // Check bounds
    if (nx < 0 || nx >= state.mazeWidth || ny < 0 || ny >= state.mazeHeight) return;

    // Check wall
    const cell = maze[state.playerY][state.playerX];
    if (dx === 1 && cell.e) return;
    if (dx === -1 && cell.w) return;
    if (dy === 1 && cell.s) return;
    if (dy === -1 && cell.n) return;

    state.playerX = nx;
    state.playerY = ny;

    render();

    // Check win
    if (nx === state.goalX && ny === state.goalY) {
        winGame();
    }
}

function winGame() {
    state.won = true;
    stopTimer();
    const time = getElapsedTime();
    winTimeEl.textContent = `Time: ${time}`;

    // Draw win scene
    const wCtx = winSceneCanvas.getContext('2d');
    wCtx.clearRect(0, 0, 200, 200);
    wCtx.fillStyle = '#1a1a2e';
    wCtx.fillRect(0, 0, 200, 200);

    // Draw both characters facing each other
    const playerSprite = getPlayerSprite(state.gender);
    const goalSprite = getGoalSprite(state.gender);
    const playerPal = getPlayerPalette(state.gender);
    const goalPal = getGoalPalette(state.gender);

    drawSpriteScaled(wCtx, playerSprite, 25, 70, 64, playerPal);
    drawSpriteScaled(wCtx, goalSprite, 110, 70, 64, goalPal);

    // Heart between them
    drawSpriteScaled(wCtx, SPRITE_HEART, 75, 30, 50, getHeartPalette());

    setTimeout(() => showScreen(winScreen), 300);
}

// ---- Input handling ----
document.addEventListener('keydown', (e) => {
    if (!gameScreen.classList.contains('active')) return;

    switch (e.key) {
        case 'w': case 'W': case 'ArrowUp':
            e.preventDefault();
            movePlayer(0, -1);
            break;
        case 's': case 'S': case 'ArrowDown':
            e.preventDefault();
            movePlayer(0, 1);
            break;
        case 'a': case 'A': case 'ArrowLeft':
            e.preventDefault();
            movePlayer(-1, 0);
            break;
        case 'd': case 'D': case 'ArrowRight':
            e.preventDefault();
            movePlayer(1, 0);
            break;
    }
});

// Mobile d-pad
document.querySelectorAll('.dpad-btn').forEach(btn => {
    const handler = (e) => {
        e.preventDefault();
        if (!gameScreen.classList.contains('active')) return;
        switch (btn.dataset.dir) {
            case 'up': movePlayer(0, -1); break;
            case 'down': movePlayer(0, 1); break;
            case 'left': movePlayer(-1, 0); break;
            case 'right': movePlayer(1, 0); break;
        }
    };
    btn.addEventListener('touchstart', handler);
    btn.addEventListener('mousedown', handler);
});

// Handle resize
window.addEventListener('resize', () => {
    if (gameScreen.classList.contains('active') && state.maze) {
        resizeCanvas();
        render();
    }
});
