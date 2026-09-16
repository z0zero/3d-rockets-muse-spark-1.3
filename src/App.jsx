import { useEffect, useState } from 'react';
import LaunchScene from './components/LaunchScene.jsx';
export default function App() {
  const [phase, setPhase] = useState('idle');
  useEffect(() => { const h = (e) => setPhase((prev) => (prev === e.detail ? prev : e.detail)); window.addEventListener('launch-phase', h); return () => window.removeEventListener('launch-phase', h); }, []);
  return (
    <div id="root-scene">
      <LaunchScene />
      <div className="hud">
        <div className="title">STYLIZED LAUNCH SITE</div>
        <div className="status" data-testid="phase-status">{phase}</div>
      </div>
    </div>
  );
}
