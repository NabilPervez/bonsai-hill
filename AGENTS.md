# AGENTS.md — Bonsai Hill

Ambient full-screen new-tab page: a 3D bonsai on a feudal-Japan hilltop, slow cinematic camera, local-time day cycle, weather. Nothing to click.

## Sources of truth
- PRD: https://claude.ai/artifact/9ThuoTaxku22Gj3fzvAYX5
- Design (3 boards): https://claude.ai/artifact/XLPLGY3pe891H5HtF62qTY
- Sprint plan + DoD (S0–S5): https://claude.ai/artifact/UbFf8GXtw7iTrF1x6WyfUS
- Change Log: Notion Second Brain → Change Log database (one row per sprint/push).

## Decisions (locked Nov 7 2026)
- Procedural bonsai (seeded). Fallback to a CC0 GLB only if it misses the bar at S2.
- Green leaves all year (a few faded yellow). No seasons.
- Clock always on. No sound in v1. No /anatomy skills.
- Mood reference = palette and spirit only. No names, UI, characters or assets from any game.

## Stack
- React + Vite + React Three Fiber + drei. Plain CSS (no Tailwind needed: almost no DOM UI).
- Reused patterns: Component Library G3 (R3F setup + `extendMaterial()` shader injection, for wind sway) and G5 (full-screen shader, for the sky dome). D8 theme color, S2 safe localStorage.
- Library rules: one canvas, dispose on unmount, reduced-motion fallback.

## Structure
```
src/
  main.jsx, App.jsx        app shell: still → canvas cross-fade
  hooks/                   useReducedMotion, usePageVisible, useSceneClock
  scene/                   Scene, Sky, Hill, Ridges, Landmarks, Lights
  lib/                     time.js (compressed clock, sun/moon math), storage.js
public/still.svg           painted first frame (shown before JS/3D)
```

## Rules
- Render loop: `frameloop="never"` when tab hidden or reduced motion; drop to 30 fps after 2 min idle.
- Reduced motion: no camera moves; static still/scene that updates with time of day.
- No network calls after load, no analytics, no cookies.
- Check at 375 px and 1280 px. 60 fps at 1440p target.
- Pure logic (time, sun/moon, phases) lives in `src/lib` and has Vitest tests.
- Every sprint: build clean, tests pass, push to main, Netlify green, Change Log row, flag PRD deviations with a reason.

## Commands
- `npm run dev` · `npm run build` · `npm test`
- Debug: `?t=HH:MM` pins scene time; `?debug` shows the time slider.
