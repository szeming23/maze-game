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
    fogOfWar: false,
    movingGoal: false,
    goalInterval: null,
    steps: 0,
};

const DIFFICULTIES = {
    easy:   { size: 10, minDist: 30, goalMoveMs: 2000 },
    medium: { size: 20, minDist: 45, goalMoveMs: 1000 },
    hard:   { size: 40, minDist: 75, goalMoveMs: 500 },
};

// ---- DOM refs ----
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const winScreen = document.getElementById('win-screen');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const timerEl = document.getElementById('timer');
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
    stopGoalMovement();
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

// ---- Goal movement ----
function getValidGoalMoves() {
    const maze = state.maze;
    const gx = state.goalX;
    const gy = state.goalY;

    const moves = [];
    if (!maze[gy][gx].n && gy - 1 >= 0) moves.push({ x: gx, y: gy - 1 });
    if (!maze[gy][gx].s && gy + 1 < state.mazeHeight) moves.push({ x: gx, y: gy + 1 });
    if (!maze[gy][gx].w && gx - 1 >= 0) moves.push({ x: gx - 1, y: gy });
    if (!maze[gy][gx].e && gx + 1 < state.mazeWidth) moves.push({ x: gx + 1, y: gy });

    return moves.filter(m => m.x !== state.playerX || m.y !== state.playerY);
}

function moveGoalTowardsPlayer() {
    if (state.won) return;
    const filtered = getValidGoalMoves();
    if (filtered.length === 0) return;

    const dist = bfsDistances(state.maze, state.playerX, state.playerY);
    filtered.sort((a, b) => dist[a.y][a.x] - dist[b.y][b.x]);
    const bestDist = dist[filtered[0].y][filtered[0].x];
    const best = filtered.filter(m => dist[m.y][m.x] === bestDist);
    const pick = best[Math.floor(Math.random() * best.length)];

    state.goalX = pick.x;
    state.goalY = pick.y;
    render();
}

function moveGoalRandomly() {
    if (state.won) return;
    const filtered = getValidGoalMoves();
    if (filtered.length === 0) return;

    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    state.goalX = pick.x;
    state.goalY = pick.y;
    render();
}

function startGoalMovement(intervalMs) {
    const moveFn = state.difficulty === 'easy' ? moveGoalTowardsPlayer : moveGoalRandomly;
    state.goalInterval = setTimeout(() => {
        moveFn();
        state.goalInterval = setInterval(moveFn, intervalMs);
    }, 1000);
}

function stopGoalMovement() {
    if (state.goalInterval) {
        clearTimeout(state.goalInterval);
        clearInterval(state.goalInterval);
        state.goalInterval = null;
    }
}

// ---- Game init ----
function startGame() {
    const diff = DIFFICULTIES[state.difficulty];
    state.mazeWidth = diff.size;
    state.mazeHeight = diff.size;
    state.won = false;
    state.steps = 0;
    state.fogOfWar = document.getElementById('fog-toggle').checked;
    state.movingGoal = document.getElementById('moving-goal-toggle').checked;
    stopGoalMovement();

    // Generate maze
    state.maze = generateMaze(state.mazeWidth, state.mazeHeight);

    // Player starts in center
    state.playerX = Math.floor(state.mazeWidth / 2);
    state.playerY = Math.floor(state.mazeHeight / 2);

    // Find goal position
    const goal = findGoalPosition(state.maze, state.playerX, state.playerY, diff.minDist);
    state.goalX = goal.x;
    state.goalY = goal.y;

    showScreen(gameScreen);

    // Resize after screen is visible so wrapper has dimensions
    requestAnimationFrame(() => {
        resizeCanvas();
        render();
        startTimer();
        if (state.movingGoal) {
            startGoalMovement(diff.goalMoveMs);
        }
    });
}

// ---- Canvas sizing ----
const VIEW_CELLS_FOG = 7; // 7x7 viewport when fog is on

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;

    if (state.fogOfWar) {
        // Internal resolution for fog viewport
        const cellRes = 48;
        state.cellSize = cellRes;
        canvas.width = VIEW_CELLS_FOG * cellRes;
        canvas.height = VIEW_CELLS_FOG * cellRes;
    } else {
        // Internal resolution for full maze
        const cellRes = 16;
        state.cellSize = cellRes;
        canvas.width = state.mazeWidth * cellRes;
        canvas.height = state.mazeHeight * cellRes;
    }

    // Scale canvas element to fill available space while keeping aspect ratio
    const scaleX = availW / canvas.width;
    const scaleY = availH / canvas.height;
    const scale = Math.min(scaleX, scaleY);
    canvas.style.width = Math.floor(canvas.width * scale) + 'px';
    canvas.style.height = Math.floor(canvas.height * scale) + 'px';
}

// ---- Rendering ----
function render() {
    if (state.fogOfWar) {
        renderFog();
    } else {
        renderFull();
    }
}

function renderFull() {
    const cs = state.cellSize;
    const maze = state.maze;
    const w = state.mazeWidth;
    const h = state.mazeHeight;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const cell = maze[y][x];
            const sx = x * cs;
            const sy = y * cs;

            // Floor
            ctx.fillStyle = '#252540';
            ctx.fillRect(sx, sy, cs, cs);

            // Walls
            ctx.strokeStyle = '#6488c8';
            ctx.lineWidth = Math.max(1, cs / 8);

            if (cell.n) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + cs, sy); ctx.stroke(); }
            if (cell.s) { ctx.beginPath(); ctx.moveTo(sx, sy + cs); ctx.lineTo(sx + cs, sy + cs); ctx.stroke(); }
            if (cell.w) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + cs); ctx.stroke(); }
            if (cell.e) { ctx.beginPath(); ctx.moveTo(sx + cs, sy); ctx.lineTo(sx + cs, sy + cs); ctx.stroke(); }
        }
    }

    // Draw goal
    const goalSprite = getGoalSprite(state.gender);
    const goalPalette = getGoalPalette(state.gender);
    drawSprite(ctx, goalSprite, state.goalX * cs, state.goalY * cs, cs, goalPalette);
    const heartSize = cs * 0.5;
    drawSpriteScaled(ctx, SPRITE_HEART,
        state.goalX * cs + (cs - heartSize) / 2,
        state.goalY * cs - heartSize * 0.3,
        heartSize, getHeartPalette());

    // Draw player
    const playerSprite = getPlayerSprite(state.gender);
    const playerPalette = getPlayerPalette(state.gender);
    drawSprite(ctx, playerSprite, state.playerX * cs, state.playerY * cs, cs, playerPalette);
}

function renderFog() {
    const cs = state.cellSize;
    const maze = state.maze;
    const px = state.playerX;
    const py = state.playerY;
    const visionRadius = 1.5;
    const half = Math.floor(VIEW_CELLS_FOG / 2);

    const camX = px - half;
    const camY = py - half;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let vy = 0; vy < VIEW_CELLS_FOG; vy++) {
        for (let vx = 0; vx < VIEW_CELLS_FOG; vx++) {
            const mx = camX + vx;
            const my = camY + vy;
            const sx = vx * cs;
            const sy = vy * cs;

            const dx = mx - px;
            const dy = my - py;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > visionRadius) continue;
            if (mx < 0 || mx >= state.mazeWidth || my < 0 || my >= state.mazeHeight) continue;

            const cell = maze[my][mx];
            const brightness = Math.max(0, 1 - dist / (visionRadius + 0.5));

            ctx.fillStyle = `rgb(${Math.floor(40 * brightness) + 15}, ${Math.floor(36 * brightness) + 15}, ${Math.floor(58 * brightness) + 20})`;
            ctx.fillRect(sx, sy, cs, cs);

            ctx.strokeStyle = `rgba(100, 140, 200, ${brightness})`;
            ctx.lineWidth = Math.max(2, cs / 6);

            if (cell.n) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + cs, sy); ctx.stroke(); }
            if (cell.s) { ctx.beginPath(); ctx.moveTo(sx, sy + cs); ctx.lineTo(sx + cs, sy + cs); ctx.stroke(); }
            if (cell.w) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + cs); ctx.stroke(); }
            if (cell.e) { ctx.beginPath(); ctx.moveTo(sx + cs, sy); ctx.lineTo(sx + cs, sy + cs); ctx.stroke(); }

            if (mx === state.goalX && my === state.goalY) {
                drawSprite(ctx, getGoalSprite(state.gender), sx, sy, cs, getGoalPalette(state.gender));
                const hs = cs * 0.5;
                drawSpriteScaled(ctx, SPRITE_HEART, sx + (cs - hs) / 2, sy - hs * 0.3, hs, getHeartPalette());
            }
        }
    }

    // Player at center
    drawSprite(ctx, getPlayerSprite(state.gender), half * cs, half * cs, cs, getPlayerPalette(state.gender));

    // Fog gradient
    const centerX = (half + 0.5) * cs;
    const centerY = (half + 0.5) * cs;
    const grad = ctx.createRadialGradient(centerX, centerY, visionRadius * cs * 0.7, centerX, centerY, (visionRadius + 0.5) * cs);
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
    state.steps++;

    render();

    // Check win
    if (nx === state.goalX && ny === state.goalY) {
        winGame();
    }
}

function winGame() {
    state.won = true;
    stopTimer();
    stopGoalMovement();
    const time = getElapsedTime();
    const elapsedSec = (Date.now() - state.timerStart) / 1000;
    const stepsPerSec = elapsedSec > 0 ? (state.steps / elapsedSec).toFixed(2) : '0.00';
    const diffLabel = state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);

    document.getElementById('win-stats').innerHTML =
        `<p>Difficulty: <span>${diffLabel}</span></p>` +
        `<p>Time: <span>${time}</span></p>` +
        `<p>Steps: <span>${state.steps}</span></p>` +
        `<p>Avg: <span>${stepsPerSec} steps/sec</span></p>`;

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
