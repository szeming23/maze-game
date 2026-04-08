// Maze generation using recursive backtracker (DFS)
// Returns a 2D grid where each cell has walls: { n, s, e, w }

function generateMaze(width, height) {
    // Initialize grid: every cell has all 4 walls
    const grid = [];
    for (let y = 0; y < height; y++) {
        grid[y] = [];
        for (let x = 0; x < width; x++) {
            grid[y][x] = { n: true, s: true, e: true, w: true, visited: false };
        }
    }

    const directions = [
        { dx: 0, dy: -1, wall: 'n', opposite: 's' },
        { dx: 0, dy: 1, wall: 's', opposite: 'n' },
        { dx: 1, dy: 0, wall: 'e', opposite: 'w' },
        { dx: -1, dy: 0, wall: 'w', opposite: 'e' },
    ];

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Iterative DFS to avoid stack overflow on large mazes
    const stack = [];
    const startX = Math.floor(width / 2);
    const startY = Math.floor(height / 2);
    grid[startY][startX].visited = true;
    stack.push({ x: startX, y: startY });

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const dirs = shuffle([...directions]);
        let found = false;

        for (const dir of dirs) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !grid[ny][nx].visited) {
                // Remove walls between current and neighbor
                grid[current.y][current.x][dir.wall] = false;
                grid[ny][nx][dir.opposite] = false;
                grid[ny][nx].visited = true;
                stack.push({ x: nx, y: ny });
                found = true;
                break;
            }
        }

        if (!found) {
            stack.pop();
        }
    }

    // Add loops by removing some extra walls to create multiple paths
    addLoops(grid, width, height);

    return grid;
}

// Remove a percentage of walls to create loops and alternate paths
function addLoops(grid, width, height) {
    const loopFactor = 0.15; // remove ~15% of remaining walls
    const candidates = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x + 1 < width && grid[y][x].e) {
                candidates.push({ x1: x, y1: y, x2: x + 1, y2: y, wall: 'e', opposite: 'w' });
            }
            if (y + 1 < height && grid[y][x].s) {
                candidates.push({ x1: x, y1: y, x2: x, y2: y + 1, wall: 's', opposite: 'n' });
            }
        }
    }

    // Shuffle and remove a portion
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const toRemove = Math.floor(candidates.length * loopFactor);
    for (let i = 0; i < toRemove; i++) {
        const c = candidates[i];
        grid[c.y1][c.x1][c.wall] = false;
        grid[c.y2][c.x2][c.opposite] = false;
    }
}

// BFS to find shortest path distances from a start point
function bfsDistances(grid, startX, startY) {
    const height = grid.length;
    const width = grid[0].length;
    const dist = [];
    for (let y = 0; y < height; y++) {
        dist[y] = new Array(width).fill(-1);
    }

    const queue = [{ x: startX, y: startY }];
    dist[startY][startX] = 0;

    const moves = [
        { dx: 0, dy: -1, wall: 'n' },
        { dx: 0, dy: 1, wall: 's' },
        { dx: 1, dy: 0, wall: 'e' },
        { dx: -1, dy: 0, wall: 'w' },
    ];

    let head = 0;
    while (head < queue.length) {
        const { x, y } = queue[head++];
        for (const move of moves) {
            if (!grid[y][x][move.wall]) {
                const nx = x + move.dx;
                const ny = y + move.dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && dist[ny][nx] === -1) {
                    dist[ny][nx] = dist[y][x] + 1;
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }

    return dist;
}

// Find a goal position that is at least minDist steps from start
function findGoalPosition(grid, startX, startY, minDist) {
    const dist = bfsDistances(grid, startX, startY);
    const height = grid.length;
    const width = grid[0].length;
    const candidates = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (dist[y][x] >= minDist) {
                candidates.push({ x, y, d: dist[y][x] });
            }
        }
    }

    if (candidates.length === 0) {
        // Fallback: pick the farthest cell
        let best = { x: 0, y: 0, d: 0 };
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (dist[y][x] > best.d) {
                    best = { x, y, d: dist[y][x] };
                }
            }
        }
        return best;
    }

    // Pick a random candidate from those meeting the minimum distance
    return candidates[Math.floor(Math.random() * candidates.length)];
}
