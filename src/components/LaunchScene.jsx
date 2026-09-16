import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildRocket } from '../three/buildRocket.js';
import { buildLaunchSite } from '../three/buildLaunchSite.js';
import { buildEnvironment } from '../three/buildEnvironment.js';
import { createExhaust } from '../three/effects.js';
import { getPhase, rocketY, ignitionAmount, LOOP } from '../three/sequence.js';
import { updateCamera } from '../three/cameraRig.js';

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

    const rocket = buildRocket(); rocket.group.position.set(0, 3.0, 0); scene.add(rocket.group);
    const site = buildLaunchSite(); scene.add(site.group);
    const env = buildEnvironment(scene);

    const exhaust = createExhaust(scene, rocket.flameAnchor, rocket.engineAnchor);

    let elapsed = 0; let burstDone = false;

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    // pause clock when tab hidden to avoid jumps:
    let hidden = false;
    const onVis = () => { hidden = document.hidden; if (!hidden) clock.getDelta(); };
    document.addEventListener('visibilitychange', onVis);
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const rawDt = Math.min(clock.getDelta(), 0.05); const dt = hidden ? 0 : rawDt;
      elapsed += dt; const loopT = elapsed % LOOP;
      const phase = getPhase(loopT);
      rocket.group.position.y = 3.0 + rocketY(loopT);
      exhaust.setIgnition(ignitionAmount(loopT), dt);
      if (phase === 'ignition' && !burstDone) { exhaust.burst(60); burstDone = true; }
      if (phase === 'idle') burstDone = false;
      exhaust.update(dt, loopT, rocket.group.position.y);
      env.update(dt, clock.elapsedTime);
      updateCamera(camera, rocket.group.position.y - 3.0, dt, loopT);
      mount.dataset.phase = phase;
      window.dispatchEvent(new CustomEvent('launch-phase', { detail: phase }));
      renderer.render(scene, camera);
    };
    animate();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); renderer.dispose(); mount.removeChild(renderer.domElement); };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} data-phase="shell" />;
}
