import { GAME_CONFIG } from '../game/config.js';

/**
 * Level briefing screen. Shown before each level starts so the pilot knows
 * where they're headed and what the mission is.
 */
export default function LevelIntro({ level, levelNumber, totalLevels, onBegin }) {
  const miniBoss =
    level.miniBossIndex !== null && level.miniBossIndex !== undefined
      ? GAME_CONFIG.MINI_BOSSES[level.miniBossIndex]
      : null;

  return (
    <div className="screen level-intro-screen">
      <div className="level-badge">
        LEVEL {levelNumber} / {totalLevels}
      </div>
      <h1 className="title level-title">{level.name}</h1>

      <div className="controls-card mission-card">
        <h3>MISSION</h3>
        <p className="mission-text">{level.mission}</p>
        {miniBoss && (
          <p className="mini-boss-tag" style={{ color: miniBoss.color }}>
            ⚠ Mini-boss: <b>{miniBoss.name}</b>
          </p>
        )}
        {level.boss && (
          <p className="mission-warning">
            ⚠ Final boss encounter — 3 tiers. Stay sharp, pilot.
          </p>
        )}
      </div>

      <button className="primary-btn" onClick={onBegin}>
        {level.boss ? '⚔ Engage Lord Zorak' : '▶ Begin Mission'}
      </button>
    </div>
  );
}
