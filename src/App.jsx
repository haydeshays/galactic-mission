import { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen.jsx';
import LevelIntro from './components/LevelIntro.jsx';
import LevelComplete from './components/LevelComplete.jsx';
import Game from './components/Game.jsx';
import GameOver from './components/GameOver.jsx';
import { GAME_CONFIG } from './game/config.js';
import { resumeAudio } from './game/audio.js';
import './styles/App.css';

// Screen states for the game flow
const SCREENS = {
  START: 'start',
  LEVEL_INTRO: 'level_intro',
  PLAYING: 'playing',
  LEVEL_COMPLETE: 'level_complete',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.START);
  const [levelIndex, setLevelIndex] = useState(0);
  const [levelScore, setLevelScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [perks, setPerks] = useState({ beams: 1, damage: 1 });

  const levels = GAME_CONFIG.LEVELS;
  const currentLevel = levels[levelIndex];

  const handleStart = useCallback(() => {
    // User gesture — safe to unlock the Web Audio context here
    resumeAudio();
    setLevelIndex(0);
    setLevelScore(0);
    setTotalScore(0);
    setPerks({ beams: 1, damage: 1, shield: 0 });
    setScreen(SCREENS.LEVEL_INTRO);
  }, []);

  const handleBegin = useCallback(() => {
    resumeAudio();
    setScreen(SCREENS.PLAYING);
  }, []);

  const handleLevelComplete = useCallback((score, finalPerks) => {
    setLevelScore(score);
    setTotalScore((prev) => prev + score);
    if (finalPerks) setPerks(finalPerks);
    setScreen(SCREENS.LEVEL_COMPLETE);
  }, []);

  const handleContinue = useCallback(() => {
    setLevelIndex((idx) => Math.min(idx + 1, levels.length - 1));
    setScreen(SCREENS.LEVEL_INTRO);
  }, [levels.length]);

  const handleGameOver = useCallback((score) => {
    setLevelScore(score);
    setTotalScore((prev) => prev + score);
    setScreen(SCREENS.GAME_OVER);
  }, []);

  const handleVictory = useCallback((score, finalPerks) => {
    setLevelScore(score);
    setTotalScore((prev) => prev + score);
    if (finalPerks) setPerks(finalPerks);
    setScreen(SCREENS.VICTORY);
  }, []);

  const handleRestart = useCallback(() => {
    setScreen(SCREENS.START);
  }, []);

  return (
    <div className="app">
      {screen === SCREENS.START && <StartScreen onStart={handleStart} />}

      {screen === SCREENS.LEVEL_INTRO && (
        <LevelIntro
          level={currentLevel}
          levelNumber={levelIndex + 1}
          totalLevels={levels.length}
          onBegin={handleBegin}
        />
      )}

      {screen === SCREENS.PLAYING && (
        <Game
          key={levelIndex}
          levelIndex={levelIndex}
          initialPerks={perks}
          onLevelComplete={handleLevelComplete}
          onGameOver={handleGameOver}
          onVictory={handleVictory}
        />
      )}

      {screen === SCREENS.LEVEL_COMPLETE && (
        <LevelComplete
          level={currentLevel}
          levelNumber={levelIndex + 1}
          levelScore={levelScore}
          totalScore={totalScore}
          onContinue={handleContinue}
        />
      )}

      {screen === SCREENS.GAME_OVER && (
        <GameOver
          score={totalScore}
          victory={false}
          onRestart={handleRestart}
        />
      )}

      {screen === SCREENS.VICTORY && (
        <GameOver
          score={totalScore}
          victory={true}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
