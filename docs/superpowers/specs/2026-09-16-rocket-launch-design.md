# 3D Rocket Launch Experience — Design Spec (2026-09-16)

## Context
- Repo is greenfield: only `ssstwitter.com_1789521302229.mp4` reference exists.
- Reference is a split-screen “Opus 5 (before) / Opus 5 (now)” comparison video. Split layout and labels are video overlays, NOT product UI.
- Target: single-view web-based stylized launch site + full auto-loop launch sequence.

### Reference observations (frames at ~0s, ~4s, ~10s, ~22s)
- Stylized low-poly aesthetic, clean flat-ish materials, bright blue sky, blocky white clouds.
- “Now” rocket: white cylinder body, black bands, thin red stripe near base, dark fins, pointed nose cone, small side details. Bright yellow-white exhaust flame.
- Pad: red/orange truss launch mount. Tower: white/light-gray truss with multiple platforms, red accents, crane arm on top, small orange lights.
- Environment: green ground plane, scattered cone/low-poly trees, distant treeline, heavy white-gray smoke spreading radially at ignition.
- Motion: stationary on pad → ignition glow + smoke burst → slow lift → accelerating ascent with upward camera tracking.

## Decision
- Stack: Vite + React + plain Three.js (imperative inside a React component). No React Three Fiber.
- Rationale: smallest suitable architecture, minimal deps, full control over timeline/particles/camera, best perf for billboard smoke and flickering flame. Matches user’s “pragmatic React-based setup with Three.js” guidance.

## Architecture
- `index.html` — root + canvas mount, responsive viewport.
- `src/main.jsx` — React entry.
- `src/App.jsx` — layout: full-viewport canvas, minimal overlay (title + status + replay hint; no before/now labels).
- `src/components/LaunchScene.jsx` — owns Three.js renderer/scene/lifecycle, resize handling, rAF loop.
- `src/three/` modules (keep files focused, <300 lines each):
  - `buildEnvironment.js` — sky color + fog, hemisphere + directional light, ground, trees (instanced), clouds (merged blobs), distant hills.
  - `buildRocket.js` — procedural rocket group (body, nose, bands, fins, engine bell, glow light anchor).
  - `buildLaunchSite.js` — pad truss, deck, tower truss + platforms + crane + lights.
  - `effects.js` — canvas-generated soft-particle texture, smoke pool (THREE.Sprite or InstancedMesh billboards), flame cone + inner glow sprite + PointLight, flicker helper.
  - `sequence.js` — time-based state machine: phases + rocket Y(t) + smoke emission rate + camera blend factor.
  - `cameraRig.js` — ground 3/4 view → tracking view damping.

## Scene composition
- Rocket height ~10 units on pad at origin. Pad truss ~3 units tall, deck ~6×6.
- Tower ~14 tall, offset x ~+6, z ~-2, with 4 platforms, crane arm, emissive orange spheres as lights.
- Ground: large circle/plane, muted green, slight vertex variation or flat. Trees: ~80 instanced cones + cylinders, avoiding pad radius.
- Clouds: ~10 groups of 3-5 flattened white spheres, MeshStandardMaterial flat, slow drift.
- Lighting: HemisphereLight (sky blue / ground green), DirectionalLight warm with shadows (1024 map, tight frustum on pad only), engine PointLight orange (intensity animated).
- Sky: solid gradient via large sphere shader or scene.background color + fog for depth. Slight stylized look: `flatShading: true` where appropriate.

## Launch sequence (auto-loop, ~22s total)
- `idle` (0–2s): rocket stationary, subtle pad lights, faint vapor.
- `ignition` (2–3.5s): flame scales 0→1 with flicker, engine light ramps, smoke burst emission high, camera slight push-in + shake (tiny).
- `liftoff` (3.5–6.5s): rocket Y eases slow (ease-in, ~0→8 units), smoke spreads radially, tower clears.
- `ascent` (6.5–17s): accelerating climb (quadratic), flame elongates, smoke trail follows base, camera tilts up and follows Y with damping.
- `reset` (17–22s): rocket fades/high-altitude hold or continues up, overlay fades, then quick fade-to-sky and loop restart at pad.
- Status text updates per phase. No user input required; tab visibility pauses clock to avoid jumps.

## Camera
- Start: pos ~(14, 7, 18) lookAt (0, 6, 0) — sees rocket + tower + ground.
- Tracking: pos follows `(rocketX + 12, rocketY*0.85 + 5, rocketZ + 14)`, lookAt rocket + 2 up. Damped with `lerp` factor ~2–3/s for smooth ground→air transition.
- FOV 50, near 0.1, far 1000. No orbit controls in v1 (keeps motion cinematic and code small).

## Effects details
- Flame: two nested cones (outer orange-transparent, inner yellow-white emissive) + additive sprite glow. Scale Y flickers via noise each frame.
- Smoke: pool ~220 sprites, each with life, velocity (outward + up), growth + fade. Spawn rate tied to phase. Soft radial texture from offscreen canvas. Color near-white to light gray, depthWrite false.
- No external assets, no postprocessing in v1 (keeps 60fps on typical desktop).

## Responsiveness & performance
- Resize observer, `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, antialias true.
- Instanced trees, shared geometries/materials, capped smoke pool, single shadow-casting light.
- Target: 60fps desktop, >30fps integrated GPU. Verify via devtools FPS + screenshots at each phase.

## Testing / verification
- `npm run dev` + agent-browser CLI (https://github.com/vercel-labs/agent-browser): load page, screenshot idle / ignition / liftoff / ascent, confirm rocket Y increases, smoke visible, no console errors. Do NOT use MCP Playwright.
- Check resize (1280×800 and 390×844) for full-viewport canvas, no overflow.
- Confirm auto-loop restarts without manual refresh.

## Out of scope (v1)
- Split-screen / before-now labels, orbit controls, audio, multiple rockets, day-night cycle, postprocessing bloom, mobile touch camera.
