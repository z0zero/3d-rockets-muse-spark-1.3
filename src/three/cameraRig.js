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
