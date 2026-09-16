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
