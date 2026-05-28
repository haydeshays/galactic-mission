import { GAME_CONFIG } from '../game/config.js';

export default function HUD({
  levelNumber,
  levelName,
  mission,
  enemyGoal,
  enemiesDefeated,
  isBossLevel,
  score,
  health,
  maxHealth,
  bossHealth,
  bossMaxHealth,
  bossPhase,
  miniBossHealth,
  miniBossMaxHealth,
  miniBossName,
  beams,
  damage,
  shield,
  muted,
  onToggleMute,
}) {
  const hearts = [];
  for (let i = 0; i < maxHealth; i++) {
    hearts.push(
      <span key={i} className={`heart ${i < health ? 'filled' : 'empty'}`}>
        ♥
      </span>
    );
  }

  const phaseCfg = bossPhase ? GAME_CONFIG.BOSS.PHASES[bossPhase - 1] : null;

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-score">
          <span className="hud-label">SCORE</span>
          <span className="hud-value">{score.toLocaleString()}</span>
        </div>

        <div className="hud-level">
          <span className="hud-label">LVL {levelNumber}</span>
          <span className="hud-level-name">{levelName}</span>
        </div>

        <div className="hud-right">
          <div className="hud-hearts">{hearts}</div>
          <button
            className="hud-mute-btn"
            onClick={onToggleMute}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <div className="hud-perks">
        <span className="hud-perk hud-perk-beams">
          <span className="hud-perk-icon">M</span>
          <span className="hud-perk-value">x{beams || 1}</span>
        </span>
        <span className="hud-perk hud-perk-power">
          <span className="hud-perk-icon">P</span>
          <span className="hud-perk-value">x{damage || 1}</span>
        </span>
        {shield > 0 && (
          <span className="hud-perk hud-perk-shield">
            <span className="hud-perk-icon">S</span>
            <span className="hud-perk-value">x{shield}</span>
          </span>
        )}
      </div>

      {!isBossLevel && (
        <div className="hud-mission">
          <span className="hud-mission-text">{mission}</span>
          <span className="hud-mission-progress">
            {Math.min(enemiesDefeated, enemyGoal)} / {enemyGoal}
          </span>
        </div>
      )}

      {miniBossHealth !== null && miniBossHealth !== undefined && miniBossMaxHealth > 0 && (
        <div className="mini-boss-bar">
          <div className="mini-boss-bar-label">⚠ {miniBossName}</div>
          <div className="mini-boss-bar-track">
            <div
              className="mini-boss-bar-fill"
              style={{ width: `${Math.max(0, (miniBossHealth / miniBossMaxHealth) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {bossHealth !== null && bossHealth !== undefined && (
        <div className="boss-bar">
          <div className="boss-bar-label">
            LORD ZORAK{' '}
            {phaseCfg && (
              <span className="boss-phase-tag" style={{ color: phaseCfg.glow }}>
                • {phaseCfg.label}
              </span>
            )}
          </div>
          <div className="boss-bar-track">
            <div
              className="boss-bar-fill"
              style={{
                width: `${Math.max(0, (bossHealth / bossMaxHealth) * 100)}%`,
                background: phaseCfg ? phaseCfg.glow : undefined,
                boxShadow: phaseCfg ? `0 0 14px ${phaseCfg.glow}` : undefined,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
