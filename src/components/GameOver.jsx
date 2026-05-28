export default function GameOver({ score, victory, onRestart }) {
  return (
    <div className={`screen game-over-screen ${victory ? 'victory' : 'defeat'}`}>
      <h1 className="title">
        {victory ? '🏆 VICTORY!' : '💥 MISSION FAILED'}
      </h1>
      <p className="subtitle">
        {victory
          ? 'You defeated Lord Zorak! The galaxy is safe.'
          : 'Your ship was destroyed. The galaxy still needs a hero.'}
      </p>

      <div className="final-score">
        <span className="hud-label">FINAL SCORE</span>
        <span className="hud-value">{score.toLocaleString()}</span>
      </div>

      <button className="primary-btn" onClick={onRestart}>
        {victory ? '✨ Play Again' : '🔄 Try Again'}
      </button>
    </div>
  );
}
