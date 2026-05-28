// Procedural Web Audio engine — music and SFX, no external assets.
// Music: simple 16-step sequencer with pad + bass + arpeggio per level.
// SFX: short synthesized blips triggered from the engine.

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let muted = false;

let musicInterval = null;
let musicStep = 0;
let currentLevelIndex = -1;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.6;
  masterGain.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = 0.35;
  musicGain.connect(masterGain);

  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.8;
  sfxGain.connect(masterGain);
  return ctx;
}

export function resumeAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(v) {
  muted = v;
  if (masterGain) masterGain.gain.value = v ? 0 : 0.6;
}

export function isMuted() { return muted; }

export function toggleMute() { setMuted(!muted); return muted; }

// ---------- SFX ----------

function tone({ freq = 440, type = 'sine', dur = 0.1, gain = 0.4, sweep = 0 }) {
  const c = ensureContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + sweep), now + dur);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g); g.connect(sfxGain);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function noise({ dur = 0.2, gain = 0.4, filterFreq = 1000 }) {
  const c = ensureContext();
  if (!c) return;
  const now = c.currentTime;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(lp); lp.connect(g); g.connect(sfxGain);
  src.start(now);
  src.stop(now + dur);
}

export function sfxLaser()     { tone({ freq: 900, type: 'sawtooth', dur: 0.08, gain: 0.18, sweep: -600 }); }
export function sfxExplosion() { noise({ dur: 0.35, gain: 0.45, filterFreq: 800 }); tone({ freq: 90, type: 'square', dur: 0.2, gain: 0.25, sweep: -50 }); }
export function sfxPickup()    { tone({ freq: 660, type: 'sine', dur: 0.12, gain: 0.3, sweep: 400 }); }
export function sfxHit()       { noise({ dur: 0.12, gain: 0.35, filterFreq: 600 }); tone({ freq: 220, type: 'square', dur: 0.1, gain: 0.2 }); }
export function sfxEnemyShot() { tone({ freq: 300, type: 'square', dur: 0.07, gain: 0.14, sweep: -120 }); }
export function sfxBossRoar()  { tone({ freq: 80, type: 'sawtooth', dur: 0.6, gain: 0.35, sweep: -30 }); noise({ dur: 0.6, gain: 0.2, filterFreq: 400 }); }
export function sfxPhaseShift(){ tone({ freq: 120, type: 'sawtooth', dur: 0.5, gain: 0.35, sweep: 600 }); tone({ freq: 200, type: 'square', dur: 0.4, gain: 0.2, sweep: 300 }); }

// ---------- Music ----------

// Minor-ish pentatonic base (semitone offsets) used as scale pool
const SCALES = [
  [0, 2, 3, 5, 7, 8, 10],   // minor
  [0, 2, 3, 5, 7, 10, 12],  // dorian-ish
  [0, 1, 3, 5, 7, 8, 10],   // phrygian
];

// Midi note -> Hz
function mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); }

function levelConfig(levelIndex) {
  // Root notes per level for variety
  const roots = [45, 43, 48, 46, 41, 44, 47, 42, 40, 36]; // last = very low for final
  const root = roots[levelIndex % roots.length];
  const scale = SCALES[levelIndex % SCALES.length];
  const bpm = 95 + levelIndex * 4;
  const isFinal = levelIndex === 9;
  return { root, scale, bpm, isFinal };
}

function stepTime(bpm) {
  // 16 steps per 4 beats → 1 step = 60 / bpm / 4
  return (60 / bpm / 4) * 1000;
}

function playStep(step, cfg) {
  const c = ensureContext();
  if (!c || !musicGain) return;
  const now = c.currentTime;
  const { root, scale, isFinal } = cfg;

  // Bass on every 4th step
  if (step % 4 === 0) {
    const bassNote = root - 12 + scale[(step / 4) % scale.length];
    const f = mtof(bassNote);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = isFinal ? 500 : 800;
    osc.connect(lp); lp.connect(g); g.connect(musicGain);
    osc.start(now); osc.stop(now + 0.3);
  }

  // Arpeggio every step
  const arpIdx = (step * 2 + Math.floor(step / 4)) % scale.length;
  const arpNote = root + 12 + scale[arpIdx];
  {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'square';
    osc.frequency.value = mtof(arpNote);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g); g.connect(musicGain);
    osc.start(now); osc.stop(now + 0.15);
  }

  // Pad chord every 8 steps
  if (step % 8 === 0) {
    for (const interval of [0, 3, 7]) {
      const padNote = root + scale[(interval) % scale.length];
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = mtof(padNote);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.04, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      osc.connect(g); g.connect(musicGain);
      osc.start(now); osc.stop(now + 2.1);
    }
  }

  // Kick on steps 0 and 8
  if (isFinal && (step === 0 || step === 8)) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g); g.connect(musicGain);
    osc.start(now); osc.stop(now + 0.22);
  }
}

export function playLevelMusic(levelIndex) {
  stopMusic();
  const c = ensureContext();
  if (!c) return;
  currentLevelIndex = levelIndex;
  const cfg = levelConfig(levelIndex);
  const dt = stepTime(cfg.bpm);
  musicStep = 0;
  musicInterval = setInterval(() => {
    playStep(musicStep % 16, cfg);
    musicStep = (musicStep + 1) % 16;
  }, dt);
}

export function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

export function duckMusic(ducked) {
  if (!musicGain || !ctx) return;
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.linearRampToValueAtTime(ducked ? 0.05 : 0.35, ctx.currentTime + 0.2);
}
