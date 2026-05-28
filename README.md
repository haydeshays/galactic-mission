# 🚀 Galactic Mission

A kid-friendly (ages 10–13) space shooter built with **React + Vite**. Pilot your starfighter through waves of enemies and defeat the evil **Lord Zorak** to save the galaxy!

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Controls

| Key | Action |
|-----|--------|
| Arrow Keys / WASD | Move the spaceship |
| Space | Fire laser |

## Project structure

```
src/
├── main.jsx               # React entry point
├── App.jsx                # Screen routing (Start → Play → GameOver/Victory)
├── components/
│   ├── StartScreen.jsx    # Title screen
│   ├── Game.jsx           # Canvas + game loop host
│   ├── HUD.jsx            # Score, hearts, boss health overlay
│   └── GameOver.jsx       # End-of-game screen
├── game/
│   ├── config.js          # Tweak speeds, spawn rates, boss HP, etc.
│   ├── input.js           # Keyboard input manager
│   └── engine.js          # Core update/draw loop (canvas 2D)
└── styles/
    ├── index.css          # Global + galactic background
    └── App.css            # Screens, HUD, and buttons
```

## How it works

React handles the **menus, HUD, and screen transitions**, while an HTML5 `<canvas>` inside [Game.jsx](file:///Users/hady/Desktop/Elie's%20Game/src/components/Game.jsx) handles the high-FPS **game rendering** (player, bullets, enemies, boss, parallax starfield).

All gameplay tuning lives in [config.js](file:///Users/hady/Desktop/Elie's%20Game/src/game/config.js).

## Next ideas

- Power-ups (triple shot, shield, speed boost)
- Screen shake + particle explosions on hits
- Sound effects and background music
- Boss attack phases (changes at 66% / 33% HP)
- Local high-score leaderboard via `localStorage`
- Touch controls for tablets
