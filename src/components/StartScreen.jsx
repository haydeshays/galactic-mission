export default function StartScreen({ onStart }) {
  return (
    <div className="screen start-screen">
      <h1 className="title">
        <span className="title-line-1">GALACTIC</span>
        <span className="title-line-2">MISSION</span>
      </h1>
      <p className="subtitle">Defeat the evil Lord Zorak and save the galaxy!</p>

      <div className="controls-card">
        <h3>Controls</h3>
        <ul>
          <li><b>Arrow Keys / WASD</b> – Fly your ship</li>
          <li><b>Space</b> – Fire laser</li>
          <li><b>P</b> or <b>Esc</b> – Pause</li>
          <li><b>M</b> – Mute / Unmute music</li>
          <li><b>Pickups</b> – <span style={{color:'#00e5ff'}}>M</span> adds a beam, <span style={{color:'#fff176'}}>P</span> boosts damage, <span style={{color:'#40c4ff'}}>S</span> grants a shield</li>
        </ul>
      </div>

      <button className="primary-btn" onClick={onStart}>
        ▶ Start Mission
      </button>
    </div>
  );
}
