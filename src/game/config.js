// Central game configuration - tweak these to balance difficulty and feel
export const GAME_CONFIG = {
  // Canvas dimensions
  WIDTH: 1000,
  HEIGHT: 750,

  // Player ship
  PLAYER: {
    WIDTH: 48,
    HEIGHT: 48,
    SPEED: 5,
    MAX_HEALTH: 3,
    FIRE_COOLDOWN_MS: 240,
    INVULNERABLE_MS: 1500,
  },

  // Bullets fired by the player
  BULLET: {
    WIDTH: 4,
    HEIGHT: 14,
    SPEED: 8,
    DAMAGE: 1,
  },

  // Bullets fired by enemies / boss
  ENEMY_BULLET: {
    WIDTH: 6,
    HEIGHT: 12,
    SPEED: 4.5,
  },

  // Legacy single-enemy defaults (still used for fallback sizing / spawn pacing)
  ENEMY: {
    WIDTH: 40,
    HEIGHT: 40,
    SPAWN_INTERVAL_MS: 1300,
    POINTS: 100,
  },

  // Enemy archetypes. Each has distinct color, stats, and behavior.
  //  - scout:  red,    1 HP, fast, straight
  //  - drone:  purple, 2 HP, medium, zig-zag
  //  - gunner: green,  3 HP, slow,  shoots at player
  ENEMY_TYPES: {
    scout:  { color: '#ff4081', outline: '#ff80ab', health: 1, speed: 2.4, width: 40, height: 40, points: 100, behavior: 'straight' },
    drone:  { color: '#b388ff', outline: '#e1bee7', health: 2, speed: 1.6, width: 44, height: 44, points: 180, behavior: 'zigzag', zigFreq: 0.004, zigAmp: 90 },
    gunner: { color: '#69f0ae', outline: '#b9f6ca', health: 3, speed: 1.1, width: 46, height: 46, points: 280, behavior: 'gunner', fireCooldownMs: 1700 },
  },

  // Final boss (Lord Zorak) - 3 phases
  BOSS: {
    WIDTH: 170,
    HEIGHT: 120,
    MAX_HEALTH: 90,
    POINTS: 10000,
    PHASES: [
      { label: 'TIER I',   speed: 1.6, attacks: ['sweep'],                 color: '#7c1d6f', glow: '#ff00ff' },
      { label: 'TIER II',  speed: 2.4, attacks: ['sweep', 'bombs'],        color: '#b71c1c', glow: '#ff6d00' },
      { label: 'TIER III', speed: 3.2, attacks: ['dart', 'radialBurst'],   color: '#4a148c', glow: '#ff1744' },
    ],
  },

  // One mini-boss per non-final level (levels 1-9 use index 0-8)
  MINI_BOSSES: [
    { name: 'Alpha Ravager',    color: '#ff6d00', health: 10, speed: 1.8, width: 92,  height: 70, points: 1000 },
    { name: 'Kryll Harvester',  color: '#ff4081', health: 14, speed: 2.0, width: 96,  height: 74, points: 1200 },
    { name: 'Ion Titan',        color: '#ffea00', health: 18, speed: 2.2, width: 100, height: 76, points: 1400 },
    { name: 'Xanthor Guardian', color: '#76ff03', health: 22, speed: 2.4, width: 100, height: 78, points: 1600 },
    { name: 'Pulsar Overlord',  color: '#00b0ff', health: 26, speed: 2.5, width: 104, height: 80, points: 1800 },
    { name: 'Vortex Maw',       color: '#d500f9', health: 30, speed: 2.6, width: 108, height: 82, points: 2000 },
    { name: 'Andromeda Warden', color: '#ff3d00', health: 34, speed: 2.8, width: 110, height: 84, points: 2200 },
    { name: 'Event Stalker',    color: '#651fff', health: 38, speed: 3.0, width: 112, height: 86, points: 2400 },
    { name: 'Armada Sentinel',  color: '#c51162', health: 44, speed: 3.2, width: 116, height: 90, points: 2600 },
  ],

  // Starfield parallax layers
  STARFIELD: {
    LAYERS: 3,
    STARS_PER_LAYER: 40,
  },

  // Power-up drops: 'beams' = +1 laser, 'power' = +1 damage, 'shield' = +1 absorb
  PERKS: {
    DROP_CHANCE: 0.20,
    WIDTH: 28,
    HEIGHT: 28,
    FALL_SPEED: 2.2,
    MAX_BEAMS: 3,
    MAX_DAMAGE: 5,
    MAX_SHIELD: 2,
  },

  // Level progression. Speed multiplier scales enemy + boss motion.
  // Each non-final level has a themed mini-boss. Level 10 is the 3-tier showdown.
  LEVELS: [
    { name: 'Sector Alpha-7',       mission: 'Clear 12 hostiles, then defeat Alpha Ravager',    enemyGoal: 12, speedMultiplier: 1.00, boss: false, miniBossIndex: 0, palette: ['scout'] },
    { name: 'Nebula of Kryll',      mission: 'Destroy 14 raiders, then crush Kryll Harvester',  enemyGoal: 14, speedMultiplier: 1.08, boss: false, miniBossIndex: 1, palette: ['scout', 'drone'] },
    { name: 'The Ion Belt',         mission: 'Clear 16 hostiles, then stop the Ion Titan',      enemyGoal: 16, speedMultiplier: 1.16, boss: false, miniBossIndex: 2, palette: ['scout', 'drone'] },
    { name: 'Rings of Xanthor',     mission: 'Take out 18 patrollers + the Xanthor Guardian',   enemyGoal: 18, speedMultiplier: 1.24, boss: false, miniBossIndex: 3, palette: ['scout', 'drone', 'gunner'] },
    { name: 'Pulsar Wastelands',    mission: 'Destroy 20 interceptors + Pulsar Overlord',       enemyGoal: 20, speedMultiplier: 1.32, boss: false, miniBossIndex: 4, palette: ['drone', 'gunner'] },
    { name: 'The Crimson Vortex',   mission: 'Wipe out 22 stalkers + the Vortex Maw',           enemyGoal: 22, speedMultiplier: 1.40, boss: false, miniBossIndex: 5, palette: ['scout', 'drone', 'gunner'] },
    { name: 'Andromeda Gate',       mission: 'Defeat 24 sentries + the Andromeda Warden',       enemyGoal: 24, speedMultiplier: 1.48, boss: false, miniBossIndex: 6, palette: ['drone', 'gunner'] },
    { name: 'Event Horizon',        mission: 'Obliterate 26 fighters + the Event Stalker',      enemyGoal: 26, speedMultiplier: 1.56, boss: false, miniBossIndex: 7, palette: ['scout', 'drone', 'gunner'] },
    { name: "Zorak's Armada",       mission: 'Break through 28 units + the Armada Sentinel',    enemyGoal: 28, speedMultiplier: 1.64, boss: false, miniBossIndex: 8, palette: ['drone', 'gunner'] },
    { name: 'Throne of Lord Zorak', mission: 'Defeat Lord Zorak across 3 tiers!',               enemyGoal: 0,  speedMultiplier: 1.72, boss: true,  miniBossIndex: null, palette: [] },
  ],
};
