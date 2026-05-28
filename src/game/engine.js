import { GAME_CONFIG } from './config.js';
import { createInputState } from './input.js';
import {
  sfxLaser, sfxExplosion, sfxPickup, sfxHit, sfxBossRoar, sfxPhaseShift, sfxEnemyShot,
} from './audio.js';

// ---------- Factory ----------

export function createGameState(levelIndex = 0, initialPerks = {}) {
  const level = GAME_CONFIG.LEVELS[levelIndex] || GAME_CONFIG.LEVELS[0];

  const state = {
    status: 'playing', // 'playing' | 'level_complete' | 'game_over' | 'victory'
    paused: false,
    score: 0,
    timeMs: 0,
    lastFireMs: -Infinity,
    input: createInputState(),

    levelIndex,
    levelName: level.name,
    mission: level.mission,
    enemyGoal: level.enemyGoal,
    enemiesDefeated: 0,
    isBossLevel: !!level.boss,
    speedMult: level.speedMultiplier,
    palette: level.palette || ['scout'],

    player: {
      x: GAME_CONFIG.WIDTH / 2 - GAME_CONFIG.PLAYER.WIDTH / 2,
      y: GAME_CONFIG.HEIGHT - GAME_CONFIG.PLAYER.HEIGHT - 20,
      width: GAME_CONFIG.PLAYER.WIDTH,
      height: GAME_CONFIG.PLAYER.HEIGHT,
      health: GAME_CONFIG.PLAYER.MAX_HEALTH,
      invulnerableUntilMs: 0,
      shieldFlashMs: 0,
      beams: clamp(initialPerks.beams || 1, 1, GAME_CONFIG.PERKS.MAX_BEAMS),
      damage: clamp(initialPerks.damage || 1, 1, GAME_CONFIG.PERKS.MAX_DAMAGE),
      shield: clamp(initialPerks.shield || 0, 0, GAME_CONFIG.PERKS.MAX_SHIELD),
    },

    bullets: [],
    enemyBullets: [],
    enemies: [],
    boss: null,
    miniBoss: null,
    miniBossSpawned: false,
    miniBossDefeated: false,
    perks: [],
    particles: [],
    spawnQueue: [],

    shake: { magnitude: 0, timeLeftMs: 0 },
    banner: null, // { text, color, timeLeftMs }

    lastEnemySpawnMs: 0,
    stars: createStarfield(),
  };

  if (level.boss) {
    state.boss = createFinalBoss();
  }

  return state;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function createFinalBoss() {
  return {
    x: GAME_CONFIG.WIDTH / 2 - GAME_CONFIG.BOSS.WIDTH / 2,
    y: 50,
    width: GAME_CONFIG.BOSS.WIDTH,
    height: GAME_CONFIG.BOSS.HEIGHT,
    health: GAME_CONFIG.BOSS.MAX_HEALTH,
    dir: 1,
    phase: 1,
    phaseInvulnerableUntilMs: 0,
    nextSweepAtMs: 0,
    nextBombAtMs: 1500,
    nextRadialAtMs: 2000,
    nextDartAtMs: 1200,
    dartTargetX: null,
  };
}

function createMiniBoss(levelIndex) {
  const spec = GAME_CONFIG.MINI_BOSSES[levelIndex];
  return {
    x: GAME_CONFIG.WIDTH / 2 - spec.width / 2,
    y: -spec.height,
    targetY: 70,
    width: spec.width,
    height: spec.height,
    health: spec.health,
    maxHealth: spec.health,
    speed: spec.speed,
    color: spec.color,
    name: spec.name,
    points: spec.points,
    dir: 1,
    nextFireMs: 1200,
  };
}

// ---------- Particles & Shake ----------

function spawnExplosion(state, x, y, options = {}) {
  const {
    count = 18,
    colors = ['#fff176', '#ff9800', '#ff4081', '#ffffff'],
    minSpeed = 1.5, maxSpeed = 5,
    minLifeMs = 300, maxLifeMs = 700,
    minSize = 2, maxSize = 4,
  } = options;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifeMs: minLifeMs + Math.random() * (maxLifeMs - minLifeMs),
      ageMs: 0,
      size: minSize + Math.random() * (maxSize - minSize),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function triggerShake(state, magnitude, durationMs) {
  if (magnitude > state.shake.magnitude) state.shake.magnitude = magnitude;
  if (durationMs > state.shake.timeLeftMs) state.shake.timeLeftMs = durationMs;
}

function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.96; p.vy *= 0.96;
    p.ageMs += dt;
  }
  state.particles = state.particles.filter((p) => p.ageMs < p.lifeMs);
}

function updateShake(state, dt) {
  if (state.shake.timeLeftMs > 0) {
    state.shake.timeLeftMs -= dt;
    if (state.shake.timeLeftMs <= 0) {
      state.shake.timeLeftMs = 0;
      state.shake.magnitude = 0;
    }
  }
}

function setBanner(state, text, color, durationMs = 1200) {
  state.banner = { text, color, timeLeftMs: durationMs };
}

function updateBanner(state, dt) {
  if (state.banner) {
    state.banner.timeLeftMs -= dt;
    if (state.banner.timeLeftMs <= 0) state.banner = null;
  }
}

// ---------- Starfield ----------

function createStarfield() {
  const stars = [];
  for (let layer = 0; layer < GAME_CONFIG.STARFIELD.LAYERS; layer++) {
    const speed = 0.4 + layer * 0.8;
    const size = 1 + layer;
    for (let i = 0; i < GAME_CONFIG.STARFIELD.STARS_PER_LAYER; i++) {
      stars.push({
        x: Math.random() * GAME_CONFIG.WIDTH,
        y: Math.random() * GAME_CONFIG.HEIGHT,
        speed, size,
      });
    }
  }
  return stars;
}

// ---------- Update ----------

export function updateGame(state, dt) {
  if (state.status !== 'playing') return;
  if (state.paused) return;
  state.timeMs += dt;

  updateStars(state);
  updatePlayer(state, dt);
  updateBullets(state);
  updateEnemyBullets(state);
  updateEnemies(state, dt);
  updateMiniBoss(state, dt);
  updateBoss(state, dt);
  updatePerks(state);
  handleCollisions(state);
  updateParticles(state, dt);
  updateShake(state, dt);
  updateBanner(state, dt);
  checkWinLose(state);
}

function updateStars(state) {
  for (const s of state.stars) {
    s.y += s.speed;
    if (s.y > GAME_CONFIG.HEIGHT) {
      s.y = 0;
      s.x = Math.random() * GAME_CONFIG.WIDTH;
    }
  }
}

function updatePlayer(state, dt) {
  const p = state.player;
  const input = state.input;
  const speed = GAME_CONFIG.PLAYER.SPEED;

  if (input.left) p.x -= speed;
  if (input.right) p.x += speed;
  if (input.up) p.y -= speed;
  if (input.down) p.y += speed;

  p.x = clamp(p.x, 0, GAME_CONFIG.WIDTH - p.width);
  p.y = clamp(p.y, 0, GAME_CONFIG.HEIGHT - p.height);

  if (p.shieldFlashMs > 0) p.shieldFlashMs -= dt;

  if (input.fire && state.timeMs - state.lastFireMs >= GAME_CONFIG.PLAYER.FIRE_COOLDOWN_MS) {
    state.lastFireMs = state.timeMs;
    const bspeed = GAME_CONFIG.BULLET.SPEED;
    const angles = getBeamAngles(p.beams);
    for (const a of angles) {
      state.bullets.push({
        x: p.x + p.width / 2 - GAME_CONFIG.BULLET.WIDTH / 2,
        y: p.y,
        width: GAME_CONFIG.BULLET.WIDTH,
        height: GAME_CONFIG.BULLET.HEIGHT,
        vx: Math.sin(a) * bspeed,
        vy: -Math.cos(a) * bspeed,
        damage: p.damage,
      });
    }
    sfxLaser();
  }
}

function getBeamAngles(beams) {
  if (beams <= 1) return [0];
  if (beams === 2) return [-0.12, 0.12];
  return [-0.18, 0, 0.18];
}

function updateBullets(state) {
  for (const b of state.bullets) { b.x += b.vx; b.y += b.vy; }
  state.bullets = state.bullets.filter(
    (b) => b.y + b.height > 0 && b.x + b.width > 0 && b.x < GAME_CONFIG.WIDTH
  );
}

function updateEnemyBullets(state) {
  for (const b of state.enemyBullets) { b.x += b.vx; b.y += b.vy; }
  state.enemyBullets = state.enemyBullets.filter(
    (b) => b.y < GAME_CONFIG.HEIGHT + 20 && b.x > -20 && b.x < GAME_CONFIG.WIDTH + 20
  );
}

// ---------- Enemy spawning ----------

function updateEnemies(state, dt) {
  if (state.isBossLevel) return;

  // Drain spawn queue
  for (const q of state.spawnQueue) {
    if (state.timeMs >= q.spawnAtMs) {
      spawnEnemy(state, q.type, q.x);
      q.done = true;
    }
  }
  state.spawnQueue = state.spawnQueue.filter((q) => !q.done);

  // Still spawning regular enemies? Only until enemyGoal reached.
  const stillSpawning = state.enemiesDefeated < state.enemyGoal && !state.miniBossSpawned;
  if (stillSpawning && state.spawnQueue.length === 0) {
    const interval = GAME_CONFIG.ENEMY.SPAWN_INTERVAL_MS / state.speedMult;
    if (state.timeMs - state.lastEnemySpawnMs >= interval) {
      state.lastEnemySpawnMs = state.timeMs;
      if (Math.random() < 0.45) scheduleFormation(state);
      else scheduleSingle(state);
    }
  }

  // Move enemies
  for (const e of state.enemies) moveEnemy(e, state);

  // Spawn mini-boss when wave cleared
  if (!state.isBossLevel && !state.miniBossSpawned && state.enemiesDefeated >= state.enemyGoal) {
    // Wait until remaining regular enemies are gone before mini-boss enters
    if (state.enemies.length === 0 && state.spawnQueue.length === 0) {
      state.miniBossSpawned = true;
      state.miniBoss = createMiniBoss(state.levelIndex);
      setBanner(state, `⚠ ${state.miniBoss.name} INCOMING`, '#ff6d00', 2000);
      sfxBossRoar();
    }
  }

  state.enemies = state.enemies.filter((e) => e.y < GAME_CONFIG.HEIGHT + e.height);
}

function spawnEnemy(state, type, x) {
  const spec = GAME_CONFIG.ENEMY_TYPES[type] || GAME_CONFIG.ENEMY_TYPES.scout;
  const width = spec.width;
  const height = spec.height;
  const clampedX = clamp(x, 0, GAME_CONFIG.WIDTH - width);
  state.enemies.push({
    type,
    x: clampedX,
    y: -height,
    baseX: clampedX,
    width, height,
    color: spec.color,
    outline: spec.outline,
    health: spec.health,
    maxHealth: spec.health,
    speed: spec.speed * state.speedMult,
    behavior: spec.behavior,
    zigFreq: spec.zigFreq || 0,
    zigAmp: spec.zigAmp || 0,
    fireCooldownMs: spec.fireCooldownMs || 0,
    nextFireMs: state.timeMs + 800 + Math.random() * 800,
    phaseMs: Math.random() * 1000,
  });
}

function scheduleSingle(state) {
  const type = pickEnemyType(state);
  const spec = GAME_CONFIG.ENEMY_TYPES[type];
  const x = Math.random() * (GAME_CONFIG.WIDTH - spec.width);
  state.spawnQueue.push({ type, x, spawnAtMs: state.timeMs });
}

function scheduleFormation(state) {
  const patterns = ['V', 'line', 'chevron', 'arc'];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const type = pickEnemyType(state);
  const spec = GAME_CONFIG.ENEMY_TYPES[type];
  const count = 4 + Math.floor(Math.random() * 3); // 4-6
  const gap = 70;
  const totalWidth = (count - 1) * gap;
  const cx = clamp(
    GAME_CONFIG.WIDTH / 2 + (Math.random() - 0.5) * (GAME_CONFIG.WIDTH - totalWidth - 80),
    totalWidth / 2 + spec.width / 2,
    GAME_CONFIG.WIDTH - totalWidth / 2 - spec.width / 2,
  );

  for (let i = 0; i < count; i++) {
    let xOff, delay;
    if (pattern === 'V') {
      const mid = (count - 1) / 2;
      xOff = (i - mid) * gap;
      delay = Math.abs(i - mid) * 120;
    } else if (pattern === 'line') {
      xOff = (i - (count - 1) / 2) * gap;
      delay = i * 90;
    } else if (pattern === 'chevron') {
      xOff = (i - (count - 1) / 2) * gap;
      delay = i * 160;
    } else { // arc
      const angle = (i / (count - 1)) * Math.PI;
      xOff = -Math.cos(angle) * totalWidth / 2;
      delay = i * 100;
    }
    state.spawnQueue.push({
      type,
      x: cx + xOff - spec.width / 2,
      spawnAtMs: state.timeMs + delay,
    });
  }
}

function pickEnemyType(state) {
  const palette = state.palette && state.palette.length > 0 ? state.palette : ['scout'];
  return palette[Math.floor(Math.random() * palette.length)];
}

function moveEnemy(e, state) {
  e.phaseMs += 16;
  if (e.behavior === 'zigzag') {
    e.y += e.speed;
    e.x = e.baseX + Math.sin((state.timeMs + e.phaseMs) * e.zigFreq) * e.zigAmp;
    e.x = clamp(e.x, 0, GAME_CONFIG.WIDTH - e.width);
  } else if (e.behavior === 'gunner') {
    e.y += e.speed;
    if (state.timeMs >= e.nextFireMs && e.y > 40 && e.y < GAME_CONFIG.HEIGHT - 150) {
      e.nextFireMs = state.timeMs + e.fireCooldownMs;
      fireEnemyBulletAtPlayer(state, e.x + e.width / 2, e.y + e.height, 3.8);
    }
  } else {
    e.y += e.speed;
  }
}

function fireEnemyBulletAtPlayer(state, x, y, speed) {
  const p = state.player;
  const dx = (p.x + p.width / 2) - x;
  const dy = (p.y + p.height / 2) - y;
  const len = Math.max(1, Math.hypot(dx, dy));
  state.enemyBullets.push({
    x: x - GAME_CONFIG.ENEMY_BULLET.WIDTH / 2,
    y,
    width: GAME_CONFIG.ENEMY_BULLET.WIDTH,
    height: GAME_CONFIG.ENEMY_BULLET.HEIGHT,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
  });
  sfxEnemyShot();
}

function fireEnemyBullet(state, x, y, vx, vy) {
  state.enemyBullets.push({
    x: x - GAME_CONFIG.ENEMY_BULLET.WIDTH / 2,
    y,
    width: GAME_CONFIG.ENEMY_BULLET.WIDTH,
    height: GAME_CONFIG.ENEMY_BULLET.HEIGHT,
    vx, vy,
  });
}

// ---------- Mini-boss ----------

function updateMiniBoss(state, dt) {
  const mb = state.miniBoss;
  if (!mb) return;

  // Enter
  if (mb.y < mb.targetY) {
    mb.y += 2.2;
    return;
  }

  // Sweep
  mb.x += mb.dir * mb.speed * state.speedMult;
  if (mb.x <= 0) { mb.x = 0; mb.dir = 1; }
  if (mb.x + mb.width >= GAME_CONFIG.WIDTH) { mb.x = GAME_CONFIG.WIDTH - mb.width; mb.dir = -1; }

  // Fire at player periodically
  if (state.timeMs >= mb.nextFireMs) {
    mb.nextFireMs = state.timeMs + 1400;
    fireEnemyBulletAtPlayer(state, mb.x + mb.width / 2, mb.y + mb.height, 4.2);
  }
}

// ---------- Final boss (3 phases) ----------

function updateBoss(state, dt) {
  const boss = state.boss;
  if (!boss) return;

  // Determine phase from HP thresholds
  const maxHp = GAME_CONFIG.BOSS.MAX_HEALTH;
  const hpPct = boss.health / maxHp;
  let newPhase = 1;
  if (hpPct <= 0.33) newPhase = 3;
  else if (hpPct <= 0.66) newPhase = 2;

  if (newPhase !== boss.phase) {
    boss.phase = newPhase;
    boss.phaseInvulnerableUntilMs = state.timeMs + 800;
    const phaseCfg = GAME_CONFIG.BOSS.PHASES[newPhase - 1];
    setBanner(state, `PHASE ${newPhase}: ${phaseCfg.label} — ENRAGED`, phaseCfg.glow, 1600);
    triggerShake(state, 16, 500);
    spawnExplosion(state, boss.x + boss.width / 2, boss.y + boss.height / 2, {
      count: 60, colors: [phaseCfg.glow, '#ffffff', '#fff176'],
      maxSpeed: 7, maxLifeMs: 900,
    });
    sfxPhaseShift();
  }

  const phaseCfg = GAME_CONFIG.BOSS.PHASES[boss.phase - 1];
  const speed = phaseCfg.speed * state.speedMult;

  // Movement: sweep for phase 1-2, dart for phase 3
  if (phaseCfg.attacks.includes('dart')) {
    if (boss.dartTargetX === null || Math.abs(boss.x - boss.dartTargetX) < 6) {
      if (state.timeMs >= boss.nextDartAtMs) {
        boss.nextDartAtMs = state.timeMs + 900;
        boss.dartTargetX = Math.random() * (GAME_CONFIG.WIDTH - boss.width);
      }
    }
    if (boss.dartTargetX !== null) {
      const dx = boss.dartTargetX - boss.x;
      boss.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * 1.5);
    }
  } else {
    boss.x += boss.dir * speed;
    if (boss.x <= 0) { boss.x = 0; boss.dir = 1; }
    if (boss.x + boss.width >= GAME_CONFIG.WIDTH) { boss.x = GAME_CONFIG.WIDTH - boss.width; boss.dir = -1; }
  }

  // Attacks
  if (phaseCfg.attacks.includes('sweep')) {
    if (state.timeMs >= boss.nextSweepAtMs) {
      boss.nextSweepAtMs = state.timeMs + 1100;
      fireEnemyBulletAtPlayer(state, boss.x + boss.width / 2, boss.y + boss.height, 4.5);
    }
  }
  if (phaseCfg.attacks.includes('bombs')) {
    if (state.timeMs >= boss.nextBombAtMs) {
      boss.nextBombAtMs = state.timeMs + 1300;
      for (let i = -1; i <= 1; i++) {
        fireEnemyBullet(state, boss.x + boss.width / 2 + i * 30, boss.y + boss.height, i * 1.2, 5);
      }
      sfxEnemyShot();
    }
  }
  if (phaseCfg.attacks.includes('radialBurst')) {
    if (state.timeMs >= boss.nextRadialAtMs) {
      boss.nextRadialAtMs = state.timeMs + 2000;
      const cx = boss.x + boss.width / 2;
      const cy = boss.y + boss.height / 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        fireEnemyBullet(state, cx, cy, Math.cos(a) * 4, Math.sin(a) * 4);
      }
      sfxBossRoar();
    }
  }
}

// ---------- Perks ----------

function updatePerks(state) {
  for (const pk of state.perks) pk.y += GAME_CONFIG.PERKS.FALL_SPEED;
  state.perks = state.perks.filter((pk) => pk.y < GAME_CONFIG.HEIGHT);
}

function maybeDropPerk(state, x, y, guaranteed = false) {
  if (!guaranteed && Math.random() >= GAME_CONFIG.PERKS.DROP_CHANCE) return;

  const beamsMaxed  = state.player.beams  >= GAME_CONFIG.PERKS.MAX_BEAMS;
  const powerMaxed  = state.player.damage >= GAME_CONFIG.PERKS.MAX_DAMAGE;
  const shieldMaxed = state.player.shield >= GAME_CONFIG.PERKS.MAX_SHIELD;
  if (beamsMaxed && powerMaxed && shieldMaxed) return;

  const options = [];
  if (!beamsMaxed)  options.push('beams');
  if (!powerMaxed)  options.push('power');
  if (!shieldMaxed) options.push('shield');
  const type = options[Math.floor(Math.random() * options.length)];

  state.perks.push({
    x: x - GAME_CONFIG.PERKS.WIDTH / 2,
    y: y - GAME_CONFIG.PERKS.HEIGHT / 2,
    width: GAME_CONFIG.PERKS.WIDTH,
    height: GAME_CONFIG.PERKS.HEIGHT,
    type,
  });
}

// ---------- Collisions ----------

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

function handleCollisions(state) {
  // Player bullets vs enemies
  for (const b of state.bullets) {
    for (const e of state.enemies) {
      if (!b.dead && !e.dead && rectsOverlap(b, e)) {
        b.dead = true;
        e.health -= b.damage || 1;
        if (e.health <= 0) {
          e.dead = true;
          state.score += GAME_CONFIG.ENEMY_TYPES[e.type]?.points || GAME_CONFIG.ENEMY.POINTS;
          state.enemiesDefeated += 1;
          spawnExplosion(state, e.x + e.width / 2, e.y + e.height / 2, {
            count: 20, colors: [e.color, e.outline, '#fff176', '#ffffff'],
          });
          triggerShake(state, 4, 120);
          maybeDropPerk(state, e.x + e.width / 2, e.y + e.height / 2);
          sfxExplosion();
        } else {
          spawnExplosion(state, b.x, b.y, {
            count: 6, colors: [e.outline, '#ffffff'],
            maxSpeed: 2, maxLifeMs: 300,
          });
        }
      }
    }

    // Vs mini-boss
    if (state.miniBoss && !b.dead && rectsOverlap(b, state.miniBoss)) {
      b.dead = true;
      state.miniBoss.health -= b.damage || 1;
      spawnExplosion(state, b.x, b.y, {
        count: 6, colors: [state.miniBoss.color, '#ffffff'],
        maxSpeed: 2, maxLifeMs: 300,
      });
      triggerShake(state, 2, 60);
    }

    // Vs final boss
    if (state.boss && !b.dead && rectsOverlap(b, state.boss)) {
      b.dead = true;
      if (state.timeMs >= state.boss.phaseInvulnerableUntilMs) {
        state.boss.health -= b.damage || 1;
      }
      spawnExplosion(state, b.x, b.y, {
        count: 8, colors: ['#ff00ff', '#fff176', '#ffffff'],
        minSpeed: 0.5, maxSpeed: 2.5, minLifeMs: 200, maxLifeMs: 400,
      });
      triggerShake(state, 2, 80);
    }
  }
  state.bullets = state.bullets.filter((b) => !b.dead);
  state.enemies = state.enemies.filter((e) => !e.dead);

  // Mini-boss defeat
  if (state.miniBoss && state.miniBoss.health <= 0) {
    const mb = state.miniBoss;
    spawnExplosion(state, mb.x + mb.width / 2, mb.y + mb.height / 2, {
      count: 60, colors: [mb.color, '#fff176', '#ffffff', '#ff4081'],
      maxSpeed: 7, maxLifeMs: 1000, maxSize: 5,
    });
    triggerShake(state, 14, 500);
    state.score += mb.points;
    // Guaranteed perk drop
    maybeDropPerk(state, mb.x + mb.width / 2, mb.y + mb.height / 2, true);
    state.miniBoss = null;
    state.miniBossDefeated = true;
    sfxExplosion();
    sfxBossRoar();
  }

  // Pickups
  for (const pk of state.perks) {
    if (!pk.dead && rectsOverlap(state.player, pk)) {
      pk.dead = true;
      if (pk.type === 'beams') {
        state.player.beams = Math.min(GAME_CONFIG.PERKS.MAX_BEAMS, state.player.beams + 1);
      } else if (pk.type === 'power') {
        state.player.damage = Math.min(GAME_CONFIG.PERKS.MAX_DAMAGE, state.player.damage + 1);
      } else if (pk.type === 'shield') {
        state.player.shield = Math.min(GAME_CONFIG.PERKS.MAX_SHIELD, state.player.shield + 1);
      }
      const colors = pk.type === 'beams' ? ['#00e5ff', '#ffffff', '#b2ebf2']
                   : pk.type === 'power' ? ['#fff176', '#ff9800', '#ffffff']
                   : ['#40c4ff', '#81d4fa', '#ffffff'];
      spawnExplosion(state, pk.x + pk.width / 2, pk.y + pk.height / 2, {
        count: 14, colors, minSpeed: 0.5, maxSpeed: 3, minLifeMs: 200, maxLifeMs: 500,
      });
      sfxPickup();
    }
  }
  state.perks = state.perks.filter((pk) => !pk.dead);

  // Enemies/enemy-bullets/boss vs player
  const p = state.player;
  const canTakeDamage = state.timeMs >= p.invulnerableUntilMs;

  // Enemy bullets vs player
  for (const eb of state.enemyBullets) {
    if (!eb.dead && canTakeDamage && rectsOverlap(p, eb)) {
      eb.dead = true;
      damagePlayer(state, 1, eb.x + eb.width / 2, eb.y + eb.height / 2);
      break;
    }
  }
  state.enemyBullets = state.enemyBullets.filter((eb) => !eb.dead);

  if (canTakeDamage) {
    for (const e of state.enemies) {
      if (rectsOverlap(p, e)) {
        e.dead = true;
        damagePlayer(state, 1, e.x + e.width / 2, e.y + e.height / 2);
        spawnExplosion(state, e.x + e.width / 2, e.y + e.height / 2, {
          count: 24, colors: ['#ff1744', '#ff9800', '#fff176'], maxSpeed: 6,
        });
        break;
      }
    }
    state.enemies = state.enemies.filter((e) => !e.dead);

    if (state.miniBoss && rectsOverlap(p, state.miniBoss)) {
      damagePlayer(state, 1, p.x + p.width / 2, p.y);
    }
    if (state.boss && rectsOverlap(p, state.boss)) {
      damagePlayer(state, 1, p.x + p.width / 2, p.y);
    }
  }
}

function damagePlayer(state, amount, fxX, fxY) {
  const p = state.player;
  if (p.shield > 0) {
    p.shield -= 1;
    p.shieldFlashMs = 300;
    p.invulnerableUntilMs = state.timeMs + 600;
    spawnExplosion(state, fxX, fxY, {
      count: 20, colors: ['#40c4ff', '#81d4fa', '#ffffff'],
      minSpeed: 1, maxSpeed: 4,
    });
    triggerShake(state, 6, 180);
    sfxHit();
    return;
  }
  p.health -= amount;
  p.invulnerableUntilMs = state.timeMs + GAME_CONFIG.PLAYER.INVULNERABLE_MS;
  triggerShake(state, 12, 350);
  sfxHit();
}

function checkWinLose(state) {
  if (state.player.health <= 0) {
    spawnExplosion(state, state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, {
      count: 50, colors: ['#00e5ff', '#fff176', '#ff4081', '#ffffff'],
      maxSpeed: 7, maxLifeMs: 900,
    });
    triggerShake(state, 18, 500);
    state.status = 'game_over';
    return;
  }

  if (state.isBossLevel && state.boss && state.boss.health <= 0) {
    spawnExplosion(state, state.boss.x + state.boss.width / 2, state.boss.y + state.boss.height / 2, {
      count: 100, colors: ['#ff00ff', '#fff176', '#ff4081', '#ffffff', '#00e5ff'],
      maxSpeed: 9, maxLifeMs: 1400, maxSize: 6,
    });
    triggerShake(state, 22, 700);
    state.score += GAME_CONFIG.BOSS.POINTS;
    state.status = 'victory';
    return;
  }

  if (!state.isBossLevel && state.miniBossDefeated) {
    state.status = 'level_complete';
  }
}

// ---------- Draw ----------

export function drawGame(ctx, state) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#050018';
  ctx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

  let shakeX = 0, shakeY = 0;
  if (state.shake.timeLeftMs > 0 && state.shake.magnitude > 0) {
    const falloff = state.shake.timeLeftMs / 400;
    const m = state.shake.magnitude * Math.min(1, falloff);
    shakeX = (Math.random() - 0.5) * 2 * m;
    shakeY = (Math.random() - 0.5) * 2 * m;
  }
  ctx.setTransform(1, 0, 0, 1, shakeX, shakeY);

  drawStars(ctx, state);
  drawPerks(ctx, state);
  drawBullets(ctx, state);
  drawEnemyBullets(ctx, state);
  drawEnemies(ctx, state);
  drawMiniBoss(ctx, state);
  drawBoss(ctx, state);
  drawPlayer(ctx, state);
  drawParticles(ctx, state);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBanner(ctx, state);
}

function drawBanner(ctx, state) {
  if (!state.banner) return;
  const b = state.banner;
  const alpha = Math.min(1, b.timeLeftMs / 400);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, GAME_CONFIG.HEIGHT / 2 - 40, GAME_CONFIG.WIDTH, 80);
  ctx.fillStyle = b.color;
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 20;
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.text, GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2);
  ctx.restore();
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const lifeRatio = 1 - p.ageMs / p.lifeMs;
    ctx.globalAlpha = Math.max(0, lifeRatio);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10 * lifeRatio;
    const size = p.size * lifeRatio;
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawStars(ctx, state) {
  for (const s of state.stars) {
    ctx.fillStyle = s.size >= 3 ? '#ffffff' : s.size === 2 ? '#c9d1ff' : '#6b7bb8';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  const blinking = state.timeMs < p.invulnerableUntilMs && Math.floor(state.timeMs / 100) % 2 === 0;
  if (blinking) return;

  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

  // Shield halo
  if (p.shield > 0) {
    const pulse = 0.6 + 0.4 * Math.sin(state.timeMs / 180);
    ctx.strokeStyle = p.shieldFlashMs > 0 ? '#ffffff' : '#40c4ff';
    ctx.shadowColor = '#40c4ff';
    ctx.shadowBlur = 20 * pulse;
    ctx.lineWidth = 2 + p.shield;
    ctx.globalAlpha = 0.7 * pulse;
    ctx.beginPath();
    ctx.arc(0, 0, p.width / 2 + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#00bcd4';
  ctx.beginPath();
  ctx.moveTo(0, -p.height / 2);
  ctx.lineTo(p.width / 2, p.height / 2);
  ctx.lineTo(0, p.height / 4);
  ctx.lineTo(-p.width / 2, p.height / 2);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff176';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(-6, p.height / 2);
  ctx.lineTo(0, p.height / 2 + 10);
  ctx.lineTo(6, p.height / 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawBullets(ctx, state) {
  for (const b of state.bullets) {
    const dmg = b.damage || 1;
    const color = dmg >= 4 ? '#ff1744' : dmg === 3 ? '#ff9800' : dmg === 2 ? '#ffeb3b' : '#fff176';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 + Math.min(dmg, 5) * 2;
    const w = b.width + Math.max(0, dmg - 1);
    ctx.fillRect(b.x - (w - b.width) / 2, b.y, w, b.height);
  }
  ctx.shadowBlur = 0;
}

function drawEnemyBullets(ctx, state) {
  for (const b of state.enemyBullets) {
    ctx.fillStyle = '#ff1744';
    ctx.shadowColor = '#ff4081';
    ctx.shadowBlur = 10;
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }
  ctx.shadowBlur = 0;
}

function drawPerks(ctx, state) {
  for (const pk of state.perks) {
    const color = pk.type === 'beams' ? '#00e5ff' : pk.type === 'power' ? '#fff176' : '#40c4ff';
    const label = pk.type === 'beams' ? 'M' : pk.type === 'power' ? 'P' : 'S';
    ctx.save();
    ctx.translate(pk.x + pk.width / 2, pk.y + pk.height / 2);

    const pulse = 0.8 + 0.2 * Math.sin(state.timeMs / 120);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -pk.height / 2);
    ctx.lineTo(pk.width / 2, 0);
    ctx.lineTo(0, pk.height / 2);
    ctx.lineTo(-pk.width / 2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0625';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    ctx.save();
    ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
    ctx.shadowColor = e.outline;
    ctx.shadowBlur = 12;
    ctx.fillStyle = e.color;
    ctx.strokeStyle = e.outline;
    ctx.lineWidth = 2;

    if (e.type === 'scout') {
      // Inverted triangle
      ctx.beginPath();
      ctx.moveTo(0, e.height / 2);
      ctx.lineTo(e.width / 2, -e.height / 2);
      ctx.lineTo(-e.width / 2, -e.height / 2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (e.type === 'drone') {
      // Diamond
      ctx.beginPath();
      ctx.moveTo(0, -e.height / 2);
      ctx.lineTo(e.width / 2, 0);
      ctx.lineTo(0, e.height / 2);
      ctx.lineTo(-e.width / 2, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (e.type === 'gunner') {
      // Hexagon
      const w = e.width / 2; const h = e.height / 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.6, -h);
      ctx.lineTo(w * 0.6, -h);
      ctx.lineTo(w, 0);
      ctx.lineTo(w * 0.6, h);
      ctx.lineTo(-w * 0.6, h);
      ctx.lineTo(-w, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Gun barrel
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#111';
      ctx.fillRect(-3, h * 0.4, 6, 10);
    }

    // Health pip if damaged
    if (e.health < e.maxHealth) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-e.width / 2, -e.height / 2 - 8, e.width, 4);
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(-e.width / 2, -e.height / 2 - 8, e.width * (e.health / e.maxHealth), 4);
    }

    ctx.restore();
  }
}

function drawMiniBoss(ctx, state) {
  const mb = state.miniBoss;
  if (!mb) return;
  ctx.save();
  ctx.translate(mb.x + mb.width / 2, mb.y + mb.height / 2);
  ctx.shadowColor = mb.color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = mb.color;
  // Angular dreadnought shape
  ctx.beginPath();
  ctx.moveTo(-mb.width / 2, 0);
  ctx.lineTo(-mb.width / 3, -mb.height / 2);
  ctx.lineTo(mb.width / 3, -mb.height / 2);
  ctx.lineTo(mb.width / 2, 0);
  ctx.lineTo(mb.width / 3, mb.height / 2);
  ctx.lineTo(-mb.width / 3, mb.height / 2);
  ctx.closePath();
  ctx.fill();
  // Eye
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoss(ctx, state) {
  const boss = state.boss;
  if (!boss) return;
  const phaseCfg = GAME_CONFIG.BOSS.PHASES[boss.phase - 1];
  const invuln = state.timeMs < boss.phaseInvulnerableUntilMs;
  const flicker = invuln && Math.floor(state.timeMs / 80) % 2 === 0;

  ctx.save();
  ctx.translate(boss.x + boss.width / 2, boss.y + boss.height / 2);
  ctx.fillStyle = flicker ? '#ffffff' : phaseCfg.color;
  ctx.shadowColor = phaseCfg.glow;
  ctx.shadowBlur = 24;

  ctx.beginPath();
  ctx.ellipse(0, 0, boss.width / 2, boss.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Menacing details by phase
  ctx.shadowBlur = 0;
  ctx.fillStyle = phaseCfg.glow;
  for (let i = 0; i < boss.phase; i++) {
    const offset = (i - (boss.phase - 1) / 2) * 28;
    ctx.beginPath();
    ctx.arc(offset, -10, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ff1744';
  ctx.beginPath(); ctx.arc(0, 10, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 10, 5, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ---------- Pause helper ----------

export function togglePause(state) {
  if (state.status !== 'playing') return;
  state.paused = !state.paused;
}
