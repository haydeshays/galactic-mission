// Small localStorage wrapper. Silently no-ops if storage is unavailable
// (Safari private mode, disabled storage, etc.) so the game never crashes.

const KEY_HIGH_SCORE = 'galactic-mission:highscore';

function safeGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function getHighScore() {
  const raw = safeGet(KEY_HIGH_SCORE);
  const n = raw === null ? 0 : parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Save a run's final score if it beats the previous best.
 * Returns { beat: boolean, best: number } so callers can show a "New best!" banner.
 */
export function saveHighScoreIfBest(score) {
  const prev = getHighScore();
  if (score > prev) {
    safeSet(KEY_HIGH_SCORE, String(score));
    return { beat: true, best: score };
  }
  return { beat: false, best: prev };
}
