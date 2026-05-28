/**
 * Shown between levels after the current mission is cleared.
 */
export default function LevelComplete({ level, levelNumber, levelScore, totalScore, onContinue }) {
  return (
    <div className="screen level-complete-screen">
      <h1 className="title victory-title">✅ MISSION ACCOMPLISHED</h1>
      <p className="subtitle">
        {level.name} secured. The galaxy breathes a little easier.
      </p>

      <div className="final-score">
        <span className="hud-label">LEVEL SCORE</span>
        <span className="hud-value">{levelScore.toLocaleString()}</span>
      </div>
      <div className="final-score">
        <span className="hud-label">TOTAL SCORE</span>
        <span className="hud-value">{totalScore.toLocaleString()}</span>
      </div>

      <button className="primary-btn" onClick={onContinue}>
        ▶ Next Level ({levelNumber + 1})
      </button>
    </div>
  );
}
