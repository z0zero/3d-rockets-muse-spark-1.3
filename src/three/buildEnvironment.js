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
  trunks.instanceMatrix.needsUpdate = true; tops.instanceMatrix.needsUpdate = true;
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

  // update(dt) ignores 2nd arg (t) passed by caller; signature keeps unused _t for clarity.
  return { update(dt, _t) { for (const c of clouds) { c.position.x += dt * 0.35; if (c.position.x > 80) c.position.x = -80; } } };
}
