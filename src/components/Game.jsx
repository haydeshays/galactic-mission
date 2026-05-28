import { useEffect, useRef, useState, useCallback } from 'react';
import HUD from './HUD.jsx';
import TouchControls from './TouchControls.jsx';
import { GAME_CONFIG } from '../game/config.js';
import { createGameState, updateGame, drawGame, togglePause } from '../game/engine.js';
import { attachInput, detachInput } from '../game/input.js';
import { playLevelMusic, stopMusic, toggleMute, isMuted, duckMusic, resumeAudio } from '../game/audio.js';

/**
 * Game component
 * - Renders a fixed-size canvas
 * - Runs a requestAnimationFrame game loop
 * - Exposes score + health + boss HP + mission progress + perks to the HUD
 * - Handles pause (P/Esc), mute (M) and per-level music
 */
export default function Game({ levelIndex, initialPerks, onLevelComplete, onGameOver, onVictory }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(0);

  const level = GAME_CONFIG.LEVELS[levelIndex] || GAME_CONFIG.LEVELS[0];

  const [hud, setHud] = useState({
    score: 0,
    health: GAME_CONFIG.PLAYER.MAX_HEALTH,
    bossHealth: null,
    bossMaxHealth: GAME_CONFIG.BOSS.MAX_HEALTH,
    bossPhase: 1,
    miniBossHealth: null,
    miniBossMaxHealth: 0,
    miniBossName: '',
    enemiesDefeated: 0,
    beams: initialPerks?.beams || 1,
    damage: initialPerks?.damage || 1,
    shield: initialPerks?.shield || 0,
    paused: false,
    muted: isMuted(),
  });

  const handleToggleMute = useCallback(() => {
    const m = toggleMute();
    setHud((h) => ({ ...h, muted: m }));
  }, []);

  const handleTogglePause = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    togglePause(state);
    duckMusic(state.paused);
    setHud((h) => ({ ...h, paused: state.paused }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    resumeAudio();
    const state = createGameState(levelIndex, initialPerks || {});
    stateRef.current = state;
    attachInput(state.input);

    playLevelMusic(levelIndex);

    // Pause / mute keys
    const onKey = (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        handleTogglePause();
        e.preventDefault();
      } else if (e.code === 'KeyM') {
        handleToggleMute();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);

    let lastTime = performance.now();
    let hudUpdateAccumulator = 0;

    const loop = (now) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      updateGame(state, dt);
      drawGame(ctx, state);

      hudUpdateAccumulator += dt;
      if (hudUpdateAccumulator >= 100) {
        hudUpdateAccumulator = 0;
        setHud({
          score: state.score,
          health: state.player.health,
          bossHealth: state.boss ? state.boss.health : null,
          bossMaxHealth: GAME_CONFIG.BOSS.MAX_HEALTH,
          bossPhase: state.boss ? state.boss.phase : 1,
          miniBossHealth: state.miniBoss ? state.miniBoss.health : null,
          miniBossMaxHealth: state.miniBoss ? state.miniBoss.maxHealth : 0,
          miniBossName: state.miniBoss ? state.miniBoss.name : '',
          enemiesDefeated: state.enemiesDefeated,
          beams: state.player.beams,
          damage: state.player.damage,
          shield: state.player.shield,
          paused: state.paused,
          muted: isMuted(),
        });
      }

      if (state.status === 'game_over') { stopMusic(); onGameOver(state.score); return; }
      if (state.status === 'victory')   { stopMusic(); onVictory(state.score, { beams: state.player.beams, damage: state.player.damage, shield: state.player.shield }); return; }
      if (state.status === 'level_complete') { stopMusic(); onLevelComplete(state.score, { beams: state.player.beams, damage: state.player.damage, shield: state.player.shield }); return; }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      detachInput();
      stopMusic();
    };
  }, [levelIndex, initialPerks, onGameOver, onVictory, onLevelComplete, handleToggleMute, handleTogglePause]);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.WIDTH}
        height={GAME_CONFIG.HEIGHT}
        className="game-canvas"
      />
      <HUD
        levelNumber={levelIndex + 1}
        levelName={level.name}
        mission={level.mission}
        enemyGoal={level.enemyGoal}
        enemiesDefeated={hud.enemiesDefeated}
        isBossLevel={!!level.boss}
        score={hud.score}
        health={hud.health}
        maxHealth={GAME_CONFIG.PLAYER.MAX_HEALTH}
        bossHealth={hud.bossHealth}
        bossMaxHealth={hud.bossMaxHealth}
        bossPhase={hud.bossPhase}
        miniBossHealth={hud.miniBossHealth}
        miniBossMaxHealth={hud.miniBossMaxHealth}
        miniBossName={hud.miniBossName}
        beams={hud.beams}
        damage={hud.damage}
        shield={hud.shield}
        muted={hud.muted}
        onToggleMute={handleToggleMute}
      />
      {hud.paused && (
        <div className="pause-overlay">
          <div className="pause-text">PAUSED</div>
          <div className="pause-hint">Press P / Esc or tap pause to resume</div>
        </div>
      )}

      <TouchControls onPause={handleTogglePause} />

      <div className="rotate-hint">
        <div className="rotate-hint-icon">↻</div>
        <div>Rotate your device to landscape</div>
        <div style={{ fontSize: 13, color: '#c9d1ff' }}>for the best experience</div>
      </div>
    </div>
  );
}
