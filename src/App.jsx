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
