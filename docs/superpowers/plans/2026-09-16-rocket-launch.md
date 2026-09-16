# Rocket Launch Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive auto-looping stylized 3D rocket launch site with ignition, smoke, liftoff, ascent, and tracking camera.

**Architecture:** Vite + React shell owns a full-viewport canvas; a single `LaunchScene` component imperatively drives Three.js modules for rocket, pad/tower, environment, sprite-based smoke/flame, time-based sequence state machine, and damped camera rig.

**Tech Stack:** Node 24, Vite 5+, React 18+, Three.js 0.160+, Vitest for pure-logic tests, agent-browser CLI for browser verification.

**Spec:** `docs/superpowers/specs/2026-09-16-rocket-launch-design.md`

## Global Constraints

- No external 3D models, textures, or HDRIs — all geometry procedural, smoke texture from offscreen canvas.
- No split-screen or before/now labels — single cinematic view only.
- Auto-loop sequence ~22s: idle 0–2s, ignition 2–3.5s, liftoff 3.5–6.5s, ascent 6.5–17s, reset 17–22s.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, antialias true, single shadow-casting directional light.
- Browser verification ONLY via `agent-browser` CLI — do NOT use MCP Playwright tools.
- Responsive full-viewport canvas at 1280×800 and 390×844 with no overflow.
- Reuse shared geometries/materials, instanced trees, capped smoke pool (~220 sprites).

---

### Task 1: Scaffold Vite + React + Three + Vitest

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/App.css`, `src/three/__tests__/sequence.test.js` (placeholder test file created here, implemented in Task 6)
- Test: `src/three/__tests__/sequence.test.js`

**Interfaces:**
- Consumes: none.
- Produces: `npm run dev` (Vite dev server on port 5173), `npm run build` (production build), `npm test` (vitest run).

- [ ] **Step 1: Write the failing check (build script missing)**

```bash
test -f package.json && echo "exists" || echo "missing"
```

- [ ] **Step 2: Run check to verify it fails**

Run: `test -f package.json && echo "exists" || echo "missing"`
Expected: `missing`

- [ ] **Step 3: Scaffold minimal project**

Run:
```bash
npm create vite@latest . -- --template react
npm install
npm install three
npm install -D vitest
```

Then ensure `package.json` scripts contain exactly:
```json
{
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vite build",
    "preview": "vite preview --port 5173",
    "test": "vitest run"
  }
}
```

Minimal `vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { port: 5173 } });
```

Minimal `src/main.jsx`:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
```

Minimal `src/App.jsx` (temporary, replaced in Task 2):
```jsx
export default function App() { return <div id="root-scene">scaffold</div>; }
```

Minimal `src/App.css`:
```css
html, body, #root { margin: 0; height: 100%; overflow: hidden; background: #87bfe8; }
#root-scene { height: 100vh; width: 100vw; }
```

`index.html` must contain `<div id="root"></div>` and `<script type="module" src="/src/main.jsx">`.

- [ ] **Step 4: Run to verify scaffold works**

Run: `npm run build`
Expected: PASS — `dist/index.html` created with no errors.

- [ ] **Step 5: Commit**

```bash
git init 2>/dev/null || true
git add package.json vite.config.js index.html src/main.jsx src/App.jsx src/App.css
git commit -m "feat: scaffold vite react three baseline"
```

---

### Task 2: Scene shell — renderer, lights, ground, resize, status overlay

**Files:**
- Create: `src/components/LaunchScene.jsx`
- Modify: `src/App.jsx`
- Test: manual via agent-browser screenshot (no unit test — shell is integration)

**Interfaces:**
- Consumes: none yet.
- Produces: `LaunchScene` React component mounting a Three.js scene with `data-phase` attribute for verification; `App` renders full-viewport canvas + overlay.

- [ ] **Step 1: Write the failing verification (component missing)**

Run: `test -f src/components/LaunchScene.jsx && echo "exists" || echo "missing"`
Expected: `missing`

- [ ] **Step 2: Implement minimal `src/App.jsx`**

```jsx
import LaunchScene from './components/LaunchScene.jsx';
export default function App() {
  return (
    <div id="root-scene">
      <LaunchScene />
      <div className="hud">
        <div className="title">STYLIZED LAUNCH SITE</div>
        <div className="status" data-testid="phase-status">initializing</div>
      </div>
    </div>
  );
}
```

Add to `src/App.css`:
```css
.hud { position: fixed; top: 16px; left: 16px; z-index: 10; font-family: system-ui, sans-serif; pointer-events: none; }
.hud .title { font-weight: 800; letter-spacing: 0.12em; font-size: 13px; color: #0b2233; background: rgba(255,255,255,0.82); padding: 8px 12px; border-radius: 999px; }
.hud .status { margin-top: 8px; display: inline-block; font-size: 12px; color: #fff; background: rgba(11,34,51,0.65); padding: 6px 10px; border-radius: 8px; }
canvas { display: block; }
```

- [ ] **Step 3: Implement `src/components/LaunchScene.jsx` shell**

```jsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LaunchScene() {
  const mountRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87bfe8);
    scene.fog = new THREE.Fog(0x9fcbe8, 60, 220);

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(14, 7, 18);

    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x6a8f5f, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
    sun.position.set(20, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -10;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(120, 48),
      new THREE.MeshStandardMaterial({ color: 0x7aa968, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      camera.lookAt(0, 6, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); renderer.dispose(); mount.removeChild(renderer.domElement); };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} data-phase="shell" />;
}
```

- [ ] **Step 4: Verify with agent-browser**

Run:
```bash
npm run dev -- --host 127.0.0.1 --port 5173 &
sleep 4
agent-browser open http://127.0.0.1:5173
agent-browser wait 2500
agent-browser screenshot /tmp/opencode/shot-shell.png
agent-browser console
agent-browser close
```

Expected: screenshot shows blue sky + green ground, no console errors. Kill dev server after: `pkill -f "vite.*5173" || true`.

- [ ] **Step 5: Commit**

```bash
git add src/components/LaunchScene.jsx src/App.jsx src/App.css
git commit -m "feat: add scene shell with lights ground resize"
```

---

### Task 3: Procedural rocket + pad + tower

**Files:**
- Create: `src/three/buildRocket.js`, `src/three/buildLaunchSite.js`
- Modify: `src/components/LaunchScene.jsx` (import and add both groups)
- Test: build check + agent-browser screenshot shows rocket on pad next to tower.

**Interfaces:**
- Consumes: `THREE.Scene` from LaunchScene.
- Produces:
  - `buildRocket() -> { group: THREE.Group, engineAnchor: THREE.Object3D, flameAnchor: THREE.Object3D }`
  - `buildLaunchSite() -> { group: THREE.Group, padTopY: number }`

- [ ] **Step 1: Write failing check**

Run: `test -f src/three/buildRocket.js && echo "exists" || echo "missing"`
Expected: `missing`

- [ ] **Step 2: Implement `src/three/buildRocket.js`**

```js
import * as THREE from 'three';

export function buildRocket() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.55, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.7, flatShading: true });
  const red = new THREE.MeshStandardMaterial({ color: 0xd64533, roughness: 0.6, flatShading: true });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 7.2, 20), white);
  body.position.y = 5.6; body.castShadow = true; group.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 20), white);
  nose.position.y = 10.0; nose.castShadow = true; group.add(nose);

  const bandTop = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.5, 20), dark);
  bandTop.position.y = 8.2; group.add(bandTop);
  const bandMid = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.35, 20), dark);
  bandMid.position.y = 6.4; group.add(bandMid);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.93, 0.28, 20), red);
  stripe.position.y = 2.9; group.add(stripe);

  const finGeo = new THREE.BoxGeometry(0.18, 1.6, 0.9);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, dark);
    const a = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(a) * 1.05, 2.2, Math.sin(a) * 1.05);
    fin.rotation.y = -a;
    fin.castShadow = true;
    group.add(fin);
  }

  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 0.7, 16), dark);
  bell.position.y = 1.65; group.add(bell);

  const engineAnchor = new THREE.Object3D(); engineAnchor.position.y = 1.3; group.add(engineAnchor);
  const flameAnchor = new THREE.Object3D(); flameAnchor.position.y = 1.1; group.add(flameAnchor);
  return { group, engineAnchor, flameAnchor };
}
```

- [ ] **Step 3: Implement `src/three/buildLaunchSite.js`**

```js
import * as THREE from 'three';

function trussBeam(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true }));
}

export function buildLaunchSite() {
  const group = new THREE.Group();
  const redMat = 0xb33a2b, whiteMat = 0xdfe6ec, darkMat = 0x3a4149;

  const deck = trussBeam(7, 0.5, 7, redMat);
  deck.position.y = 2.75; deck.castShadow = true; deck.receiveShadow = true; group.add(deck);

  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    const leg = trussBeam(0.5, 2.75, 0.5, redMat);
    leg.position.set(x, 1.375, z); leg.castShadow = true; group.add(leg);
  }

  const tower = new THREE.Group(); tower.position.set(6.5, 0, -2.5);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const col = trussBeam(0.35, 14, 0.35, whiteMat);
    col.position.set(x, 7, z); col.castShadow = true; tower.add(col);
  }
  for (let i = 0; i < 5; i++) {
    const plat = trussBeam(3.4, 0.25, 3.4, i % 2 ? darkMat : whiteMat);
    plat.position.y = 3 + i * 2.6; plat.castShadow = true; tower.add(plat);
  }
  const craneArm = trussBeam(5.5, 0.3, 0.3, whiteMat);
  craneArm.position.set(-1.2, 14.4, 0); tower.add(craneArm);
  const cable = trussBeam(0.06, 2.2, 0.06, darkMat);
  cable.position.set(-3.4, 13.2, 0); tower.add(cable);

  const lightGeo = new THREE.SphereGeometry(0.16, 10, 10);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0xff7a1a, emissiveIntensity: 2 });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(lightGeo, lightMat);
    s.position.set(1.2, 4 + i * 2.6, 1.2); tower.add(s);
  }
  group.add(tower);
  return { group, padTopY: 3.0 };
}
```

- [ ] **Step 4: Wire into LaunchScene (add after ground creation)**

```js
import { buildRocket } from '../three/buildRocket.js';
import { buildLaunchSite } from '../three/buildLaunchSite.js';
// inside effect after ground:
const rocket = buildRocket(); rocket.group.position.set(0, 3.0, 0); scene.add(rocket.group);
const site = buildLaunchSite(); scene.add(site.group);
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: PASS.

Run agent-browser:
```bash
npm run dev -- --host 127.0.0.1 --port 5173 &
sleep 4
agent-browser open http://127.0.0.1:5173
agent-browser wait 2500
agent-browser screenshot /tmp/opencode/shot-rocket.png
agent-browser close
pkill -f "vite.*5173" || true
```

Expected: white rocket with dark bands/red stripe on red pad, white tower with crane to the right.

- [ ] **Step 6: Commit**

```bash
git add src/three/buildRocket.js src/three/buildLaunchSite.js src/components/LaunchScene.jsx
git commit -m "feat: add procedural rocket pad and tower"
```

---

### Task 4: Environment — trees, clouds, hills

**Files:**
- Create: `src/three/buildEnvironment.js`
- Modify: `src/components/LaunchScene.jsx`
- Test: agent-browser screenshot shows trees + clouds.

**Interfaces:**
- Consumes: `THREE.Scene`.
- Produces: `buildEnvironment(scene) -> { update(dt, t): void }` (cloud drift).

- [ ] **Step 1: Failing check**

Run: `test -f src/three/buildEnvironment.js && echo "exists" || echo "missing"`
Expected: `missing`

- [ ] **Step 2: Implement `src/three/buildEnvironment.js`**

```js
import * as THREE from 'three';

export function buildEnvironment(scene) {
  const treeTrunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.0, 6);
  const treeTopGeo = new THREE.ConeGeometry(1.0, 2.4, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1, flatShading: true });
  const topMat = new THREE.MeshStandardMaterial({ color: 0x3f7a44, roughness: 1, flatShading: true });
  const trunks = new THREE.InstancedMesh(treeTrunkGeo, trunkMat, 90);
  const tops = new THREE.InstancedMesh(treeTopGeo, topMat, 90);
  const dummy = new THREE.Object3D();
  let placed = 0, seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while (placed < 90) {
    const a = rand() * Math.PI * 2, r = 18 + rand() * 70;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;
    const s = 0.7 + rand() * 1.1;
    dummy.position.set(x, 0.5 * s, z); dummy.scale.setScalar(s); dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.set(x, (1.0 + 1.2) * s, z); dummy.updateMatrix();
    tops.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  trunks.castShadow = true; tops.castShadow = true;
  scene.add(trunks, tops);

  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    const n = 3 + (i % 3);
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1.6 + ((i + j) % 3), 8, 6), cloudMat);
      m.position.set(j * 2.2 - n, (j % 2) * 0.8, (j % 3) * 1.2);
      m.scale.y = 0.6; g.add(m);
    }
    g.position.set(-60 + i * 13, 22 + (i % 4) * 3, -40 - (i % 5) * 8);
    scene.add(g); clouds.push(g);
  }

  const hillMat = new THREE.MeshStandardMaterial({ color: 0x6f9e63, roughness: 1, flatShading: true });
  for (let i = 0; i < 5; i++) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(18 + i * 4, 12, 8), hillMat);
    hill.position.set(-80 + i * 38, -6, -85);
    hill.scale.y = 0.35; scene.add(hill);
  }

  return { update(dt) { for (const c of clouds) { c.position.x += dt * 0.35; if (c.position.x > 80) c.position.x = -80; } } };
}
```

- [ ] **Step 3: Wire into LaunchScene**

```js
import { buildEnvironment } from '../three/buildEnvironment.js';
// after site: const env = buildEnvironment(scene);
// in animate: env.update(dt, clock.elapsedTime);
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: PASS.

```bash
npm run dev -- --host 127.0.0.1 --port 5173 &
sleep 4
agent-browser open http://127.0.0.1:5173
agent-browser wait 2500
agent-browser screenshot /tmp/opencode/shot-env.png
agent-browser close
pkill -f "vite.*5173" || true
```

Expected: trees around pad, white blocky clouds, hills on horizon.

- [ ] **Step 5: Commit**

```bash
git add src/three/buildEnvironment.js src/components/LaunchScene.jsx
git commit -m "feat: add trees clouds hills environment"
```

---

### Task 5: Exhaust effects — flame, glow, smoke pool, engine light

**Files:**
- Create: `src/three/effects.js`
- Modify: `src/components/LaunchScene.jsx`
- Test: agent-browser ignition screenshot shows flame + smoke.

**Interfaces:**
- Consumes: `THREE.Scene`, `flameAnchor: THREE.Object3D`, `engineAnchor: THREE.Object3D`.
- Produces:
  - `createExhaust(scene, flameAnchor, engineAnchor) -> { setIgnition(amount01: number, dt: number): void, update(dt: number, t: number, rocketY: number): void, burst(n: number): void }`

- [ ] **Step 1: Failing check**

Run: `test -f src/three/effects.js && echo "exists" || echo "missing"`
Expected: `missing`

- [ ] **Step 2: Implement `src/three/effects.js`**

```js
import * as THREE from 'three';

function makeSmokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.55, 'rgba(235,235,235,0.55)');
  g.addColorStop(1, 'rgba(225,225,225,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); return tex;
}

export function createExhaust(scene, flameAnchor, engineAnchor) {
  const tex = makeSmokeTexture();

  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 3.2, 14, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff8c2e, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flameOuter.rotation.x = Math.PI; flameOuter.position.y = -1.4; flameOuter.visible = false;
  flameAnchor.add(flameOuter);

  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 2.2, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flameInner.rotation.x = Math.PI; flameInner.position.y = -1.0; flameInner.visible = false;
  flameAnchor.add(flameInner);

  const glowMat = new THREE.SpriteMaterial({ map: tex, color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Sprite(glowMat); glow.scale.setScalar(4); glow.position.y = -0.6;
  flameAnchor.add(glow);

  const engineLight = new THREE.PointLight(0xff9a3c, 0, 40, 1.8);
  engineAnchor.add(engineLight);

  const POOL = 220;
  const smokeMat = new THREE.SpriteMaterial({ map: tex, color: 0xececec, transparent: true, opacity: 0.75, depthWrite: false });
  const puffs = [];
  for (let i = 0; i < POOL; i++) {
    const s = new THREE.Sprite(smokeMat.clone());
    s.visible = false; scene.add(s);
    puffs.push({ s, life: 0, max: 1, vel: new THREE.Vector3(), grow: 1 });
  }
  let cursor = 0, ignition = 0;

  function spawn(base, spread, up, life, size) {
    const p = puffs[cursor]; cursor = (cursor + 1) % POOL;
    p.s.visible = true;
    p.s.position.copy(base).add(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * 0.6, (Math.random() - 0.5) * spread));
    const out = new THREE.Vector3(p.s.position.x, 0, p.s.position.z).normalize().multiplyScalar(3 + Math.random() * 5);
    p.vel.set(out.x, up + Math.random() * 2, out.z);
    p.life = 0; p.max = life * (0.7 + Math.random() * 0.6);
    p.grow = size; p.s.scale.setScalar(size * 0.5);
    p.s.material.opacity = 0.8;
  }

  return {
    setIgnition(a, dt) {
      ignition = a;
      flameOuter.visible = flameInner.visible = a > 0.02;
      const flick = 0.9 + Math.sin(performance.now() * 0.04) * 0.12 + Math.random() * 0.08;
      flameOuter.scale.set(a, a * flick * 1.6, a);
      flameInner.scale.set(a, a * flick, a);
      glowMat.opacity = a * 0.9;
      engineLight.intensity = a * 90;
    },
    burst(n) {
      const base = new THREE.Vector3(0, 3.2, 0);
      for (let i = 0; i < n; i++) spawn(base, 7, 1.5, 2.8, 3.2);
    },
    update(dt, t, rocketY) {
      if (ignition > 0.02) {
        const base = new THREE.Vector3(0, Math.max(3.0, rocketY - 1.5), 0);
        const n = rocketY < 8 ? 4 : 2;
        for (let i = 0; i < n; i++) spawn(base, rocketY < 8 ? 8 : 2.5, rocketY < 8 ? 1.2 : -2, 2.4, 2.8);
      }
      for (const p of puffs) {
        if (!p.s.visible) continue;
        p.life += dt;
        if (p.life >= p.max) { p.s.visible = false; continue; }
        const k = p.life / p.max;
        p.s.position.addScaledVector(p.vel, dt);
        p.vel.y += dt * 0.6; p.vel.multiplyScalar(1 - dt * 0.5);
        p.s.scale.setScalar(p.s.scale.x + dt * p.grow * 1.6);
        p.s.material.opacity = 0.8 * (1 - k);
      }
    }
  };
}
```

- [ ] **Step 3: Wire minimal ignition preview (temporary constant 1.0 for visual check)**

In LaunchScene after rocket/site/env:
```js
import { createExhaust } from '../three/effects.js';
// const exhaust = createExhaust(scene, rocket.flameAnchor, rocket.engineAnchor);
// exhaust.setIgnition(1.0, 0.016); — call once before animate; in animate call exhaust.update(dt, t, rocket.group.position.y);
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: PASS.

```bash
npm run dev -- --host 127.0.0.1 --port 5173 &
sleep 4
agent-browser open http://127.0.0.1:5173
agent-browser wait 2500
agent-browser screenshot /tmp/opencode/shot-flame.png
agent-browser console
agent-browser close
pkill -f "vite.*5173" || true
```

Expected: bright flame cone under rocket + white smoke spreading on pad.

- [ ] **Step 5: Commit**

```bash
git add src/three/effects.js src/components/LaunchScene.jsx
git commit -m "feat: add flame smoke engine light effects"
```

---

### Task 6: Sequence state machine + camera rig + auto-loop + HUD status

**Files:**
- Create: `src/three/sequence.js`, `src/three/cameraRig.js`, `src/three/__tests__/sequence.test.js`
- Modify: `src/components/LaunchScene.jsx`, `src/App.jsx` (status text via CustomEvent)
- Test: `src/three/__tests__/sequence.test.js` (vitest)

**Interfaces:**
- Consumes: elapsed loop time `t` in seconds.
- Produces:
  - `getPhase(t: number) -> 'idle' | 'ignition' | 'liftoff' | 'ascent' | 'reset'`
  - `rocketY(t: number) -> number` (world Y offset added to padTopY)
  - `ignitionAmount(t: number) -> number` (0..1)
  - `LOOP = 22`
  - `updateCamera(camera: THREE.PerspectiveCamera, rocketWorldY: number, blend: number, dt: number): void`

- [ ] **Step 1: Write the failing test**

`src/three/__tests__/sequence.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { getPhase, rocketY, ignitionAmount, LOOP } from '../sequence.js';

describe('sequence', () => {
  it('loops at 22s', () => { expect(LOOP).toBe(22); });
  it('phases match spec windows', () => {
    expect(getPhase(0.5)).toBe('idle');
    expect(getPhase(2.5)).toBe('ignition');
    expect(getPhase(5)).toBe('liftoff');
    expect(getPhase(10)).toBe('ascent');
    expect(getPhase(19)).toBe('reset');
  });
  it('rocket rises monotonically during liftoff+ascent', () => {
    expect(rocketY(6.5)).toBeGreaterThan(rocketY(3.5));
    expect(rocketY(15)).toBeGreaterThan(rocketY(6.5));
  });
  it('ignition ramps 0->1 and stays on until reset', () => {
    expect(ignitionAmount(0.5)).toBe(0);
    expect(ignitionAmount(3)).toBeGreaterThan(0.5);
    expect(ignitionAmount(10)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "sequence.js not found" or import error.

- [ ] **Step 3: Implement `src/three/sequence.js`**

```js
export const LOOP = 22;

export function getPhase(t) {
  const x = ((t % LOOP) + LOOP) % LOOP;
  if (x < 2) return 'idle';
  if (x < 3.5) return 'ignition';
  if (x < 6.5) return 'liftoff';
  if (x < 17) return 'ascent';
  return 'reset';
}

export function ignitionAmount(t) {
  const x = ((t % LOOP) + LOOP) % LOOP;
  if (x < 2) return 0;
  if (x < 3.5) return (x - 2) / 1.5;
  if (x < 17) return 1;
  return Math.max(0, 1 - (x - 17) / 1.5);
}

export function rocketY(t) {
  const x = ((t % LOOP) + LOOP) % LOOP;
  if (x < 3.5) return 0;
  if (x < 6.5) {
    const k = (x - 3.5) / 3;
    return 8 * k * k;
  }
  if (x < 17) {
    const k = (x - 6.5) / 10.5;
    return 8 + 120 * k * k;
  }
  return 128;
}
```

- [ ] **Step 4: Implement `src/three/cameraRig.js`**

```js
import * as THREE from 'three';
const _target = new THREE.Vector3();
const _pos = new THREE.Vector3();

export function updateCamera(camera, rocketWorldY, dt, t) {
  const airBlend = THREE.MathUtils.smoothstep(rocketWorldY, 3, 40);
  _pos.set(14 - airBlend * 2, 7 + rocketWorldY * 0.85, 18 - airBlend * 4);
  _target.set(0, 6 + rocketWorldY * 0.92, 0);
  const k = 1 - Math.exp(-dt * 2.5);
  camera.position.lerp(_pos, k);
  const cur = new THREE.Vector3();
  camera.getWorldDirection(cur);
  const want = _target.clone().sub(camera.position).normalize();
  const dir = cur.lerp(want, k).normalize();
  const look = camera.position.clone().add(dir);
  camera.lookAt(look);
  if (t !== undefined) {
    camera.position.x += Math.sin(t * 30) * 0.008 * (1 - airBlend);
    camera.position.y += Math.sin(t * 37) * 0.008 * (1 - airBlend);
  }
}
```

- [ ] **Step 5: Wire sequence + camera + HUD into LaunchScene animate loop**

Replace temporary ignition with:
```js
import { getPhase, rocketY, ignitionAmount, LOOP } from '../three/sequence.js';
import { updateCamera } from '../three/cameraRig.js';
// in effect: let elapsed = 0; let burstDone = false;
// in animate:
// elapsed += dt; const loopT = elapsed % LOOP;
// const phase = getPhase(loopT);
// rocket.group.position.y = 3.0 + rocketY(loopT);
// exhaust.setIgnition(ignitionAmount(loopT), dt);
// if (phase === 'ignition' && !burstDone) { exhaust.burst(60); burstDone = true; }
// if (phase === 'idle') burstDone = false;
// exhaust.update(dt, loopT, rocket.group.position.y);
// updateCamera(camera, rocket.group.position.y - 3.0, dt, loopT);
// mount.dataset.phase = phase;
// window.dispatchEvent(new CustomEvent('launch-phase', { detail: phase }));
```

In `App.jsx`, listen:
```jsx
import { useEffect, useState } from 'react';
// const [phase, setPhase] = useState('idle');
// useEffect(() => { const h = (e) => setPhase(e.detail); window.addEventListener('launch-phase', h); return () => window.removeEventListener('launch-phase', h); }, []);
// <div className="status" data-testid="phase-status">{phase}</div>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 4 tests.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/three/sequence.js src/three/cameraRig.js src/three/__tests__/sequence.test.js src/components/LaunchScene.jsx src/App.jsx
git commit -m "feat: add launch sequence camera rig auto-loop"
```

---

### Task 7: Final polish, perf caps, responsive verification

**Files:**
- Modify: `src/components/LaunchScene.jsx` (visibility pause, dispose, smoke color tweak), `src/App.css` (mobile)
- Test: agent-browser across phases + viewports + console check.

**Interfaces:**
- Consumes: all prior modules.
- Produces: shippable `dist/` passing all checks.

- [ ] **Step 1: Write failing check (no visibility handling)**

Run: `grep -q "visibilitychange" src/components/LaunchScene.jsx && echo "exists" || echo "missing"`
Expected: `missing`

- [ ] **Step 2: Add polish to LaunchScene**

```js
// pause clock when tab hidden to avoid jumps:
let hidden = false;
const onVis = () => { hidden = document.hidden; if (!hidden) clock.getDelta(); };
document.addEventListener('visibilitychange', onVis);
// in animate: const rawDt = Math.min(clock.getDelta(), 0.05); const dt = hidden ? 0 : rawDt;
// cleanup: document.removeEventListener('visibilitychange', onVis);
```

CSS mobile in `src/App.css`:
```css
@media (max-width: 600px) {
  .hud .title { font-size: 11px; padding: 6px 10px; }
  .hud { top: 10px; left: 10px; }
}
```

- [ ] **Step 3: Full verification via agent-browser**

Run:
```bash
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 &
sleep 4
agent-browser open http://127.0.0.1:5173
agent-browser wait 1000
agent-browser screenshot /tmp/opencode/final-idle.png
agent-browser wait 2500
agent-browser screenshot /tmp/opencode/final-ignition.png
agent-browser wait 2500
agent-browser screenshot /tmp/opencode/final-liftoff.png
agent-browser wait 6000
agent-browser screenshot /tmp/opencode/final-ascent.png
agent-browser console
agent-browser errors
agent-browser set viewport 390 844
agent-browser wait 1500
agent-browser screenshot /tmp/opencode/final-mobile.png
agent-browser close
pkill -f "vite.*5173" || true
```

Expected: four phase screenshots show idle → flame+smoke → airborne → high ascent with camera following; mobile screenshot fills viewport; `console` and `errors` empty.

- [ ] **Step 4: Run unit + build once more**

Run: `npm test && npm run build`
Expected: PASS both.

- [ ] **Step 5: Commit**

```bash
git add src/components/LaunchScene.jsx src/App.css
git commit -m "feat: polish loop pause responsive verification"
```

