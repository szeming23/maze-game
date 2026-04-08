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
    goalDialogue: null,
    playerDialogue: null,
    dialogueInterval: null,
    calledOut: false,  // true after player completes "I'm lost!" → "I'm here!" sequence
    goalSpeed: 1,      // steps per second
    goalSlowed: false, // true once goal slows near player
    goalFrozen: false, // true when goal is 1 step away
};

const DIFFICULTIES = {
    easy:   { size: 15, minDist: 30, goalMoveMs: 1000, loopWalls: 10 },
    medium: { size: 25, minDist: 45, goalMoveMs: 1000, loopWalls: 25 },
    hard:   { size: 50, minDist: 75, goalMoveMs: 1000, loopWalls: 60 },
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
    maleCtx.clearRect(0, 0, 48, 48);
    femaleCtx.clearRect(0, 0, 48, 48);
    drawSpriteScaled(maleCtx, SPRITE_MALE, 0, 0, 48, getPlayerPalette('male'));
    drawSpriteScaled(femaleCtx, SPRITE_FEMALE, 0, 0, 48, getPlayerPalette('female'));
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
    stopDialogue();
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
    checkNearSlowdown();
}

function moveGoalRandomly() {
    if (state.won) return;
    const filtered = getValidGoalMoves();
    if (filtered.length === 0) return;

    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    state.goalX = pick.x;
    state.goalY = pick.y;
    render();
    checkNearSlowdown();
}

function getGoalBfsDist() {
    const dist = bfsDistances(state.maze, state.playerX, state.playerY);
    return dist[state.goalY][state.goalX];
}

function checkNearSlowdown() {
    if (!state.movingGoal) return;
    const d = getGoalBfsDist();

    if (d <= 1) {
        // Adjacent — freeze goal
        if (!state.goalFrozen) {
            state.goalFrozen = true;
            stopGoalMovement();
        }
    } else if (state.goalFrozen) {
        // Was frozen, player moved away — resume and say something
        state.goalFrozen = false;
        const unfreezeLines = ["Stop moving around!", "Come here!"];
        showGoalDialogue(unfreezeLines[Math.floor(Math.random() * unfreezeLines.length)]);
        const speed = state.goalSlowed ? 0.5 : state.goalSpeed;
        const ms = Math.round(1000 / speed);
        const moveFn = state.calledOut ? moveGoalTowardsPlayer : moveGoalRandomly;
        state.goalInterval = setInterval(moveFn, ms);
    } else if (!state.goalSlowed && d <= 3) {
        // First time within 3 steps — slow down
        state.goalSlowed = true;
        state.goalSpeed = 0.5;
        stopGoalMovement();
        const ms = Math.round(1000 / state.goalSpeed);
        state.goalInterval = setInterval(
            state.calledOut ? moveGoalTowardsPlayer : moveGoalRandomly, ms
        );
    }
}

function startGoalMovement(intervalMs) {
    // Always start with random movement
    state.goalInterval = setTimeout(() => {
        moveGoalRandomly();
        state.goalInterval = setInterval(moveGoalRandomly, intervalMs);
    }, 1000);
}

function switchGoalToBFS() {
    stopGoalMovement();
    const ms = Math.round(1000 / state.goalSpeed);
    moveGoalTowardsPlayer();
    state.goalInterval = setInterval(moveGoalTowardsPlayer, ms);
}

function restartGoalAtCurrentSpeed() {
    stopGoalMovement();
    const ms = Math.round(1000 / state.goalSpeed);
    state.goalInterval = setInterval(moveGoalTowardsPlayer, ms);
}

function stopGoalMovement() {
    if (state.goalInterval) {
        clearTimeout(state.goalInterval);
        clearInterval(state.goalInterval);
        state.goalInterval = null;
    }
}

// ---- Dialogue bubbles ----
const PLAYER_DIALOGUES_DEFAULT = [
    "I'm lost!",
    "Where are you?",
    "I'm here!",
    "On my way!",
];

const GOAL_DIALOGUES_BEFORE = [
    "I'm lost!",
    "Oh dear...",
    "Where are you?",
];

const GOAL_DIALOGUES_AFTER = [
    "Wait there!",
    "On my way!",
];

const GOAL_DIALOGUES_NEARBY = [
    "I can hear you!",
];

const GOAL_DIALOGUES_NEAR = [
    "There you are!",
    "Reunited at last :D",
];

const PLAYER_DIALOGUES_NEAR = [
    "Hey there!",
];

// Interaction sequence: player says "I'm lost!" → goal replies "Where are you?"
// Then player says "I'm here!" → goal replies "On my way!" → goal switches to BFS
const INTERACTION = {
    "I'm lost!":  { goalReply: "Where are you?", next: true },
    "I'm here!":  { goalReply: "On my way!", activateBFS: true },
};

function euclideanDist() {
    const dx = state.playerX - state.goalX;
    const dy = state.playerY - state.goalY;
    return Math.sqrt(dx * dx + dy * dy);
}

function isGoalNear() {
    const dist = bfsDistances(state.maze, state.playerX, state.playerY);
    return dist[state.goalY][state.goalX] <= 3;
}

function getGoalDialogues() {
    if (isGoalNear()) return GOAL_DIALOGUES_NEAR;
    if (euclideanDist() <= 5) return GOAL_DIALOGUES_NEARBY;
    return state.calledOut ? GOAL_DIALOGUES_AFTER : GOAL_DIALOGUES_BEFORE;
}

function getPlayerDialogues() {
    if (isGoalNear()) return PLAYER_DIALOGUES_NEAR;
    return PLAYER_DIALOGUES_DEFAULT;
}

function startDialogue() {
    function scheduleNext() {
        const delay = 3000 + Math.random() * 3000;
        state.dialogueInterval = setTimeout(() => {
            if (state.won) return;
            const pool = getGoalDialogues();
            const text = pool[Math.floor(Math.random() * pool.length)];
            showGoalDialogue(text);
            scheduleNext();
        }, delay);
    }
    scheduleNext();
}

function showGoalDialogue(text) {
    state.goalDialogue = text;
    render();
    setTimeout(() => {
        if (state.goalDialogue === text) {
            state.goalDialogue = null;
            render();
        }
    }, 2000);
}

function stopDialogue() {
    if (state.dialogueInterval) {
        clearTimeout(state.dialogueInterval);
        state.dialogueInterval = null;
    }
    state.goalDialogue = null;
    state.playerDialogue = null;
}

function updateShoutButtons() {
    const dialogues = getPlayerDialogues();
    const buttons = document.querySelectorAll('.shout-btn');
    buttons.forEach((btn, i) => {
        if (i < dialogues.length) {
            btn.textContent = `[${i + 1}] ${dialogues[i]}`;
            btn.style.display = '';
        } else {
            btn.style.display = 'none';
        }
    });
}

function playerShout(text) {
    if (state.won) return;
    state.playerDialogue = text;
    render();
    setTimeout(() => {
        if (state.playerDialogue === text) {
            state.playerDialogue = null;
            render();
        }
    }, 2000);

    // Check for interaction sequence
    const interaction = INTERACTION[text];
    if (interaction) {
        setTimeout(() => {
            if (state.won) return;
            showGoalDialogue(interaction.goalReply);
            if (interaction.activateBFS && state.movingGoal && !state.calledOut) {
                state.calledOut = true;
                state.goalSpeed = 1.5;
                switchGoalToBFS();
            }
        }, 1000);
    }

    // Post-sequence: "I'm here!" boosts goal speed by 0.5, up to 3
    if (text === "I'm here!" && state.calledOut && state.movingGoal) {
        setTimeout(() => {
            if (state.won) return;
            showGoalDialogue("On my way!");
            if (state.goalSpeed < 3) {
                state.goalSpeed = Math.min(3, state.goalSpeed + 0.5);
                restartGoalAtCurrentSpeed();
            }
        }, 1000);
    }
}

function drawDialogueBubble(ctx, text, x, y, cs) {
    ctx.save();
    ctx.font = `bold ${Math.max(10, cs * 0.35)}px sans-serif`;
    const metrics = ctx.measureText(text);
    const padX = 6;
    const padY = 4;
    const bw = metrics.width + padX * 2;
    const bh = cs * 0.4 + padY * 2;
    const bx = x + cs / 2 - bw / 2;
    const by = y - bh - 4;

    // Bubble background
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 4);
    ctx.fill();
    ctx.stroke();

    // Tail triangle
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x + cs / 2 - 4, by + bh);
    ctx.lineTo(x + cs / 2, by + bh + 5);
    ctx.lineTo(x + cs / 2 + 4, by + bh);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(x + cs / 2 - 4, by + bh);
    ctx.lineTo(x + cs / 2, by + bh + 5);
    ctx.lineTo(x + cs / 2 + 4, by + bh);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + cs / 2, by + bh / 2);
    ctx.restore();
}

// ---- Game init ----
function startGame() {
    const diff = DIFFICULTIES[state.difficulty];
    state.mazeWidth = diff.size;
    state.mazeHeight = diff.size;
    state.won = false;
    state.steps = 0;
    state.calledOut = false;
    state.goalSpeed = 1;
    state.goalSlowed = false;
    state.goalFrozen = false;
    state.fogOfWar = document.getElementById('fog-toggle').checked;
    state.movingGoal = document.getElementById('moving-goal-toggle').checked;
    stopGoalMovement();
    stopDialogue();

    // Generate maze then add loops
    state.maze = generateMaze(state.mazeWidth, state.mazeHeight);
    addLoops(state.maze, state.mazeWidth, state.mazeHeight, diff.loopWalls);

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
        startDialogue();
    });
}

// ---- Canvas sizing ----
const VIEW_CELLS_FOG = 7;
const VIEW_CELLS_NORMAL = 15; // camera viewport matches easy maze size
const MAZE_PADDING = 30;

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;

    if (state.fogOfWar) {
        const cellRes = 48;
        state.cellSize = cellRes;
        canvas.width = VIEW_CELLS_FOG * cellRes + MAZE_PADDING * 2;
        canvas.height = VIEW_CELLS_FOG * cellRes + MAZE_PADDING * 2;
    } else {
        // Fixed viewport of VIEW_CELLS_NORMAL cells (or full maze if smaller)
        const viewCells = Math.min(VIEW_CELLS_NORMAL, state.mazeWidth);
        const cellRes = 16;
        state.cellSize = cellRes;
        canvas.width = viewCells * cellRes + MAZE_PADDING * 2;
        canvas.height = viewCells * cellRes + MAZE_PADDING * 2;
    }

    const scaleX = availW / canvas.width;
    const scaleY = availH / canvas.height;
    const scale = Math.min(scaleX, scaleY);
    canvas.style.width = Math.floor(canvas.width * scale) + 'px';
    canvas.style.height = Math.floor(canvas.height * scale) + 'px';
}

// Calculate camera offset (top-left cell), clamped to maze edges
function getCameraOffset() {
    const viewCells = Math.min(VIEW_CELLS_NORMAL, state.mazeWidth);
    const half = Math.floor(viewCells / 2);

    // Center on player, clamp so camera doesn't go past maze edges
    let camX = state.playerX - half;
    let camY = state.playerY - half;
    camX = Math.max(0, Math.min(camX, state.mazeWidth - viewCells));
    camY = Math.max(0, Math.min(camY, state.mazeHeight - viewCells));

    return { camX, camY, viewCells };
}

// ---- Rendering ----
function render() {
    if (state.fogOfWar) {
        renderFog();
    } else {
        renderFull();
    }
    updateShoutButtons();
}

function renderFull() {
    const cs = state.cellSize;
    const maze = state.maze;
    const { camX, camY, viewCells } = getCameraOffset();

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(MAZE_PADDING, MAZE_PADDING);

    // Draw only visible cells
    for (let vy = 0; vy < viewCells; vy++) {
        for (let vx = 0; vx < viewCells; vx++) {
            const mx = camX + vx;
            const my = camY + vy;
            if (mx >= state.mazeWidth || my >= state.mazeHeight) continue;

            const cell = maze[my][mx];
            const sx = vx * cs;
            const sy = vy * cs;

            ctx.fillStyle = '#252540';
            ctx.fillRect(sx, sy, cs, cs);

            ctx.strokeStyle = '#6488c8';
            ctx.lineWidth = Math.max(1, cs / 8);

            if (cell.n) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + cs, sy); ctx.stroke(); }
            if (cell.s) { ctx.beginPath(); ctx.moveTo(sx, sy + cs); ctx.lineTo(sx + cs, sy + cs); ctx.stroke(); }
            if (cell.w) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + cs); ctx.stroke(); }
            if (cell.e) { ctx.beginPath(); ctx.moveTo(sx + cs, sy); ctx.lineTo(sx + cs, sy + cs); ctx.stroke(); }
        }
    }

    // Screen positions relative to camera
    const goalSX = (state.goalX - camX) * cs;
    const goalSY = (state.goalY - camY) * cs;
    const playerSX = (state.playerX - camX) * cs;
    const playerSY = (state.playerY - camY) * cs;
    const viewPx = viewCells * cs;

    // Is goal on screen?
    const goalOnScreen = state.goalX >= camX && state.goalX < camX + viewCells &&
                         state.goalY >= camY && state.goalY < camY + viewCells;

    // Draw goal if on screen
    if (goalOnScreen) {
        drawSprite(ctx, getGoalSprite(state.gender), goalSX, goalSY, cs, getGoalPalette(state.gender));
        const heartSize = cs * 0.5;
        drawSpriteScaled(ctx, SPRITE_HEART,
            goalSX + (cs - heartSize) / 2,
            goalSY - heartSize * 0.3,
            heartSize, getHeartPalette());
        if (state.goalDialogue) {
            drawDialogueBubble(ctx, state.goalDialogue, goalSX, goalSY, cs);
        }
    } else if (state.goalDialogue) {
        // Goal off-screen: show dialogue at edge of camera in goal's direction
        const dx = state.goalX - state.playerX;
        const dy = state.goalY - state.playerY;
        let edgeX = Math.max(0, Math.min(goalSX, viewPx - cs));
        let edgeY = Math.max(0, Math.min(goalSY, viewPx - cs));

        // Clamp to edges
        if (goalSX < 0) edgeX = 0;
        else if (goalSX >= viewPx) edgeX = viewPx - cs;
        if (goalSY < 0) edgeY = 0;
        else if (goalSY >= viewPx) edgeY = viewPx - cs;

        drawDialogueBubble(ctx, state.goalDialogue, edgeX, edgeY, cs);
    }

    // Draw player
    drawSprite(ctx, getPlayerSprite(state.gender), playerSX, playerSY, cs, getPlayerPalette(state.gender));
    if (state.playerDialogue) {
        drawDialogueBubble(ctx, state.playerDialogue, playerSX, playerSY, cs);
    }

    ctx.restore();
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

    ctx.save();
    ctx.translate(MAZE_PADDING, MAZE_PADDING);

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
                if (state.goalDialogue) {
                    drawDialogueBubble(ctx, state.goalDialogue, sx, sy, cs);
                }
            }
        }
    }

    // Player at center
    drawSprite(ctx, getPlayerSprite(state.gender), half * cs, half * cs, cs, getPlayerPalette(state.gender));
    if (state.playerDialogue) {
        drawDialogueBubble(ctx, state.playerDialogue, half * cs, half * cs, cs);
    }

    // Fog gradient
    const centerX = (half + 0.5) * cs;
    const centerY = (half + 0.5) * cs;
    const grad = ctx.createRadialGradient(centerX, centerY, visionRadius * cs * 0.7, centerX, centerY, (visionRadius + 0.5) * cs);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(-MAZE_PADDING, -MAZE_PADDING, canvas.width, canvas.height);

    // Goal dialogue at edge of viewport if goal is off-screen
    if (state.goalDialogue) {
        const goalSX = (state.goalX - camX) * cs;
        const goalSY = (state.goalY - camY) * cs;
        const viewPx = VIEW_CELLS_FOG * cs;
        const goalOnScreen = goalSX >= 0 && goalSX < viewPx && goalSY >= 0 && goalSY < viewPx;

        if (!goalOnScreen) {
            let edgeX = Math.max(0, Math.min(goalSX, viewPx - cs));
            let edgeY = Math.max(0, Math.min(goalSY, viewPx - cs));
            drawDialogueBubble(ctx, state.goalDialogue, edgeX, edgeY, cs);
        }
    }

    ctx.restore();
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
    checkNearSlowdown();

    // Check win
    if (nx === state.goalX && ny === state.goalY) {
        winGame();
    }
}

function winGame() {
    state.won = true;
    stopTimer();
    stopGoalMovement();
    stopDialogue();
    const time = getElapsedTime();
    const elapsedSec = (Date.now() - state.timerStart) / 1000;
    const stepsPerSec = elapsedSec > 0 ? (state.steps / elapsedSec).toFixed(2) : '0.00';
    const diffLabel = state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);

    const fogLabel = state.fogOfWar ? 'On' : 'Off';
    const soulLabel = state.movingGoal ? 'On' : 'Off';

    document.getElementById('win-stats').innerHTML =
        `<p>Difficulty: <span>${diffLabel}</span></p>` +
        `<p>Fog of War: <span>${fogLabel}</span></p>` +
        `<p>Moving Soulmate: <span>${soulLabel}</span></p>` +
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
    if (e.key === 'Enter') {
        if (menuScreen.classList.contains('active') || winScreen.classList.contains('active')) {
            e.preventDefault();
            startGame();
            return;
        }
    }

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
        case '1': { const d = getPlayerDialogues(); if (d[0]) playerShout(d[0]); break; }
        case '2': { const d = getPlayerDialogues(); if (d[1]) playerShout(d[1]); break; }
        case '3': { const d = getPlayerDialogues(); if (d[2]) playerShout(d[2]); break; }
        case '4': { const d = getPlayerDialogues(); if (d[3]) playerShout(d[3]); break; }
    }
});

// Shout buttons
document.querySelectorAll('.shout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!gameScreen.classList.contains('active')) return;
        const idx = parseInt(btn.dataset.index);
        const d = getPlayerDialogues();
        if (d[idx]) playerShout(d[idx]);
    });
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
