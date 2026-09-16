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
