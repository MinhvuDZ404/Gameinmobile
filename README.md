# Nebula Orchard

Game 3D HTML/Three.js mobile-first. Concept, systems, art direction and gameplay in this project were designed specifically for this build.

## Features

- Third-person 3D exploration in a procedural space garden.
- Mobile joystick for movement, right-side swipe camera, BOOST, HARVEST, DOCK and pause controls.
- Keyboard fallback on desktop: WASD + mouse/touch pointer for camera area.
- Harvest crystals, combo chain, fuel management and plasma-storm hazards.
- Three zones: Luminous Grove, Aurora Marsh, Prism Basin.
- Star gates unlock at 10/20/30 crystals.
- Dock with six upgrade lines and persistent in-session progression.
- Radar/minimap, mission progress, dynamic fog and animated scenery.
- Local `world-atlas.json` contains the authored world-atlas records used as the game's content payload.

## Technical note

The game imports Three.js r0.186.0 through a browser import map from jsDelivr. Three.js's official manual documents the import-map approach and touch input support for games. `WebGLRenderer` is used because the official docs currently describe it as the maintained/recommended renderer for pure WebGL 2 applications.

Run with any local HTTP server (for example `npx serve .`) because module-based web projects are intended to be served over HTTP(S).
