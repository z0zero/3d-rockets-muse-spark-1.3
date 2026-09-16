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
    p.s.material.opacity = 0.65;
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
        const n = rocketY < 8 ? 2 : 2;
        for (let i = 0; i < n; i++) spawn(base, rocketY < 8 ? 6 : 2.5, rocketY < 8 ? 1.2 : -2, 2.4, rocketY < 8 ? 2.2 : 2.8);
      }
      for (const p of puffs) {
        if (!p.s.visible) continue;
        p.life += dt;
        if (p.life >= p.max) { p.s.visible = false; continue; }
        const k = p.life / p.max;
        p.s.position.addScaledVector(p.vel, dt);
        p.vel.y += dt * 0.6; p.vel.multiplyScalar(1 - dt * 0.5);
        p.s.scale.setScalar(p.s.scale.x + dt * p.grow * 1.6);
        p.s.material.opacity = 0.65 * (1 - k);
      }
    }
  };
}
