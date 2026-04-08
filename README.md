# Maze of Hearts

A browser-based maze game where you navigate through a maze to find your love.

**Play at:** [game.jojomingming.org](https://game.jojomingming.org)

## Features

- **Character select** -- choose Boy or Girl; the goal is the opposite gender
- **3 difficulty levels** -- Easy (15x15), Medium (25x25), Hard (50x50)
- **Camera view** -- larger mazes scroll with the player; easy shows the full maze
- **Fog of War** (toggle) -- limits vision to adjacent cells for a spookier experience
- **Moving Goal** (toggle, on by default) -- the goal wanders the maze
  - Starts at 1 step/sec, random movement
  - Dialogue interaction sequence triggers BFS pathfinding at 1.5 steps/sec
  - Slows to 0.5 steps/sec within 3 steps; freezes when adjacent
- **Dialogue system** -- both characters shout phrases; trigger an interaction sequence to call the goal toward you
- **Timer and stats** -- completion screen shows difficulty, time, steps, and average steps/sec
- **Mobile support** -- on-screen d-pad for touch devices

## Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | WASD / Arrow keys | D-pad |
| Shout | 1, 2, 3, 4 | Shout buttons in HUD |

## Dialogue Interaction

1. Press **[1] I'm lost!** -- goal replies "Where are you?"
2. Press **[3] I'm here!** -- goal replies "On my way!" and starts pathfinding toward you
3. Keep pressing **[3] I'm here!** -- goal speeds up (max 3 steps/sec)
4. When close, goal says "There you are!" / "Reunited at last :D"

## Run locally

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Tech

Pure HTML/CSS/JS, no dependencies or build tools. Pixel art sprites drawn programmatically on canvas.

## Files

- `index.html` -- main page with menu, game, and win screens
- `style.css` -- dark theme, responsive layout
- `game.js` -- game logic, rendering, input, dialogue system
- `maze.js` -- maze generation (DFS), loop addition, BFS pathfinding
- `sprites.js` -- pixel art sprite definitions and drawing functions
