// EnemyConfig.js
// Single source of truth for all enemy stats.
// Includes standard, elite, dungeon, and realm boss variants.

export const EnemyConfig = {

  // ── Standard world enemies ────────────────────────────────────────────

  goblin: {
    key:           'goblin',
    name:          'Goblin',
    hp: 30, atk: 5, def: 2,
    speed: 80, aggroRange: 120, attackRange: 32,
    attackCooldown: 1200,
    xpReward:      10,
    isElite:       false,
    drops: [
      { item: 'wood',         amount: 1, chance: 0.6 },
      { item: 'goblin_tooth', amount: 1, chance: 0.3 },
    ],
    respawnTime: 20000,
  },

  golem: {
    key:           'golem',
    name:          'Stone Golem',
    hp: 80, atk: 12, def: 8,
    speed: 48, aggroRange: 100, attackRange: 42,
    attackCooldown: 2000,
    xpReward:      30,
    isElite:       false,
    drops: [
      { item: 'stone', amount: 2, chance: 0.8 },
      { item: 'ore',   amount: 1, chance: 0.4 },
    ],
    respawnTime: 40000,
  },

  // ── Elite world enemies ───────────────────────────────────────────────

  gold_goblin: {
    key:           'goblin',
    name:          'Gold Goblin',
    tint:          0xf1c40f,
    hp: 80, atk: 10, def: 4,
    speed: 110, aggroRange: 140, attackRange: 32,
    attackCooldown: 900,
    xpReward:      60,
    isElite:       true,
    eliteStars:    1,
    drops: [
      { item: 'ore',                       amount: 2, chance: 0.9 },
      { item: 'goblin_tooth',              amount: 2, chance: 0.8 },
      { item: 'hunters_charm',             amount: 1, chance: 0.12 },
      { item: 'gear_drop_uncommon_weapon', amount: 1, chance: 0.35 },
    ],
    respawnTime: 90000,
  },

  stone_guardian: {
    key:           'golem',
    name:          'Stone Guardian',
    tint:          0x1a1a2e,
    hp: 220, atk: 22, def: 15,
    speed: 55, aggroRange: 120, attackRange: 52,
    attackCooldown: 2400,
    xpReward:      120,
    isElite:       true,
    eliteStars:    2,
    drops: [
      { item: 'stone',                 amount: 5, chance: 1.0 },
      { item: 'ore',                   amount: 3, chance: 0.9 },
      { item: 'shadow_armor',          amount: 1, chance: 0.06 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 0.25 },
    ],
    respawnTime: 180000,
  },

  // ── Dungeon enemies ───────────────────────────────────────────────────

  shadow_stalker: {
    key:           'goblin',
    name:          'Shadow Stalker',
    tint:          0x6c3483,
    hp: 50, atk: 14, def: 3,
    speed: 130, aggroRange: 160, attackRange: 32,
    attackCooldown: 700,
    xpReward:      40,
    isElite:       false,
    isDungeonOnly: true,
    drops: [
      { item: 'ore',   amount: 1, chance: 0.6 },
      { item: 'stone', amount: 1, chance: 0.4 },
    ],
    respawnTime: 0,
  },

  dungeon_champion: {
    key:              'golem',
    name:             'Dungeon Champion',
    tint:             0xc0392b,
    hp: 400, atk: 28, def: 12,
    speed: 70, aggroRange: 220, attackRange: 56,
    attackCooldown: 1800,
    xpReward:         300,
    isElite:          true,
    isBoss:           true,
    eliteStars:       3,
    isDungeonOnly:    true,
    phase2Threshold:  0.5,
    phase2AtkMult:    1.5,
    phase2SpeedMult:  1.3,
    drops: [
      { item: 'fire_shard',            amount: 1, chance: 1.0 },
      { item: 'shadow_armor',          amount: 1, chance: 0.5 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 0.8 },
    ],
    respawnTime: 0,
  },


  // ── New world enemies (Pass 8) ────────────────────────────────────────

  fire_imp: {
    key:           'goblin',
    name:          'Fire Imp',
    tint:          0xe74c3c,
    hp: 55, atk: 14, def: 4,
    speed: 115, aggroRange: 140, attackRange: 34,
    attackCooldown: 900,
    xpReward:      35,
    isElite:       false,
    drops: [
      { item: 'fire_shard', amount: 1, chance: 0.25 },
      { item: 'ore',        amount: 1, chance: 0.5  },
    ],
    respawnTime: 25000,
  },

  shadow_wraith: {
    key:           'goblin',
    name:          'Shadow Wraith',
    tint:          0x6c3483,
    hp: 70, atk: 18, def: 6,
    speed: 105, aggroRange: 160, attackRange: 36,
    attackCooldown: 800,
    xpReward:      55,
    isElite:       false,
    drops: [
      { item: 'ore',   amount: 1, chance: 0.6 },
      { item: 'stone', amount: 1, chance: 0.4 },
    ],
    respawnTime: 30000,
  },

  lava_titan: {
    key:           'golem',
    name:          'Lava Titan',
    tint:          0xe67e22,
    hp: 160, atk: 26, def: 14,
    speed: 42, aggroRange: 110, attackRange: 50,
    attackCooldown: 2200,
    xpReward:      100,
    isElite:       true,
    eliteStars:    2,
    drops: [
      { item: 'fire_shard', amount: 2, chance: 0.9 },
      { item: 'ore',        amount: 3, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 0.18 },
    ],
    respawnTime: 120000,
  },

  // ── Realm bosses ──────────────────────────────────────────────────────
  // One boss per portal realm. Scaled by skull tier (1–5).
  // phase2Threshold: HP fraction that triggers phase 2 (faster + stronger + visual change).
  // Drops include realm_essence (currency for future use) + gear tokens.

  // ── Skull 1 ───────────────────────────────────────────────────────────

  boss_forest: {
    key:             'golem',
    name:            'Thornlord',
    color:           '#27ae60',
    realmLabel:      'Forest Realm',
    hp: 350, atk: 18, def: 8,
    speed: 65, aggroRange: 300, attackRange: 58,
    attackCooldown: 1600,
    xpReward:        400,
    isElite:         true,
    isBoss:          true,
    eliteStars:      3,
    phase2Threshold: 0.5,
    phase2AtkMult:   1.4,
    phase2SpeedMult: 1.5,
    // Phase 2 — summons root spikes (AOE pulses every 3s)
    phase2Ability:   'root_spike',
    drops: [
      { item: 'forest_essence',        amount: 1, chance: 1.0 },
      { item: 'ore',                   amount: 4, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 0.9 },
    ],
    respawnTime: 0,
  },

  boss_wind: {
    key:             'goblin',
    name:            'Galestrider',
    color:           '#87ceeb',
    realmLabel:      'Wind Realm',
    hp: 320, atk: 16, def: 5,
    speed: 160, aggroRange: 320, attackRange: 44,
    attackCooldown: 900,
    xpReward:        400,
    isElite:         true,
    isBoss:          true,
    eliteStars:      3,
    phase2Threshold: 0.5,
    phase2AtkMult:   1.3,
    phase2SpeedMult: 1.8,
    phase2Ability:   'wind_dash',
    drops: [
      { item: 'wind_essence',          amount: 1, chance: 1.0 },
      { item: 'ore',                   amount: 4, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 0.9 },
    ],
    respawnTime: 0,
  },

  // ── Skull 2 ───────────────────────────────────────────────────────────

  boss_earth: {
    key:             'golem',
    name:            'Granite Colossus',
    color:           '#95a5a6',
    realmLabel:      'Earth Realm',
    hp: 600, atk: 28, def: 20,
    speed: 42, aggroRange: 260, attackRange: 72,
    attackCooldown: 2200,
    xpReward:        600,
    isElite:         true,
    isBoss:          true,
    eliteStars:      4,
    phase2Threshold: 0.5,
    phase2AtkMult:   1.6,
    phase2SpeedMult: 1.3,
    phase2Ability:   'ground_slam',
    drops: [
      { item: 'earth_essence',         amount: 1, chance: 1.0 },
      { item: 'stone',                 amount: 8, chance: 1.0 },
      { item: 'ore',                   amount: 5, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 1.0 },
    ],
    respawnTime: 0,
  },

  boss_fire: {
    key:             'golem',
    name:            'Emberlord',
    color:           '#e74c3c',
    realmLabel:      'Fire Realm',
    hp: 550, atk: 34, def: 14,
    speed: 70, aggroRange: 280, attackRange: 60,
    attackCooldown: 1400,
    xpReward:        600,
    isElite:         true,
    isBoss:          true,
    eliteStars:      4,
    phase2Threshold: 0.5,
    phase2AtkMult:   1.5,
    phase2SpeedMult: 1.4,
    phase2Ability:   'fire_ring',
    drops: [
      { item: 'fire_essence',          amount: 1, chance: 1.0 },
      { item: 'fire_shard',            amount: 3, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 1.0 },
    ],
    respawnTime: 0,
  },

  // ── Skull 3 ───────────────────────────────────────────────────────────

  boss_ice: {
    key:             'golem',
    name:            'Permafrost King',
    color:           '#3498db',
    realmLabel:      'Ice Realm',
    hp: 800, atk: 36, def: 24,
    speed: 50, aggroRange: 280, attackRange: 68,
    attackCooldown: 2000,
    xpReward:        900,
    isElite:         true,
    isBoss:          true,
    eliteStars:      5,
    phase2Threshold: 0.4,
    phase2AtkMult:   1.6,
    phase2SpeedMult: 1.5,
    phase2Ability:   'ice_nova',
    drops: [
      { item: 'ice_essence',           amount: 1, chance: 1.0 },
      { item: 'ore',                   amount: 6, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 1.0 },
    ],
    respawnTime: 0,
  },

  boss_ocean: {
    key:             'golem',
    name:            'Tidecaller',
    color:           '#1abc9c',
    realmLabel:      'Ocean Realm',
    hp: 750, atk: 32, def: 18,
    speed: 85, aggroRange: 300, attackRange: 64,
    attackCooldown: 1600,
    xpReward:        900,
    isElite:         true,
    isBoss:          true,
    eliteStars:      5,
    phase2Threshold: 0.4,
    phase2AtkMult:   1.4,
    phase2SpeedMult: 1.6,
    phase2Ability:   'tidal_wave',
    drops: [
      { item: 'ocean_essence',         amount: 1, chance: 1.0 },
      { item: 'ore',                   amount: 6, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 1.0 },
    ],
    respawnTime: 0,
  },

  // ── Skull 4 ───────────────────────────────────────────────────────────

  boss_storm: {
    key:             'goblin',
    name:            'Stormcrown',
    color:           '#9b59b6',
    realmLabel:      'Storm Realm',
    hp: 1000, atk: 44, def: 22,
    speed: 120, aggroRange: 340, attackRange: 56,
    attackCooldown: 1100,
    xpReward:        1200,
    isElite:         true,
    isBoss:          true,
    eliteStars:      5,
    phase2Threshold: 0.4,
    phase2AtkMult:   1.7,
    phase2SpeedMult: 1.5,
    phase2Ability:   'lightning_storm',
    drops: [
      { item: 'storm_essence',         amount: 1, chance: 1.0 },
      { item: 'fire_shard',            amount: 2, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 1.0 },
    ],
    respawnTime: 0,
  },

  boss_shadow: {
    key:             'goblin',
    name:            'The Voidborn',
    color:           '#6c3483',
    realmLabel:      'Shadow Realm',
    hp: 950, atk: 48, def: 20,
    speed: 100, aggroRange: 360, attackRange: 52,
    attackCooldown: 1000,
    xpReward:        1200,
    isElite:         true,
    isBoss:          true,
    eliteStars:      5,
    phase2Threshold: 0.35,
    phase2AtkMult:   1.8,
    phase2SpeedMult: 1.6,
    phase2Ability:   'shadow_blink',
    drops: [
      { item: 'shadow_essence',        amount: 1, chance: 1.0 },
      { item: 'shadow_armor',          amount: 1, chance: 0.7 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 1.0 },
    ],
    respawnTime: 0,
  },

  // ── Skull 5 ───────────────────────────────────────────────────────────

  boss_lava: {
    key:             'golem',
    name:            'Magmaborn',
    color:           '#e67e22',
    realmLabel:      'Lava Realm',
    hp: 1300, atk: 58, def: 28,
    speed: 60, aggroRange: 320, attackRange: 78,
    attackCooldown: 1800,
    xpReward:        1800,
    isElite:         true,
    isBoss:          true,
    eliteStars:      5,
    phase2Threshold: 0.35,
    phase2AtkMult:   1.7,
    phase2SpeedMult: 1.4,
    phase2Ability:   'lava_burst',
    drops: [
      { item: 'lava_essence',          amount: 1, chance: 1.0 },
      { item: 'fire_shard',            amount: 5, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 1.0 },
    ],
    respawnTime: 0,
  },

  boss_void: {
    key:             'golem',
    name:            'The Eternal',
    color:           '#f1c40f',
    realmLabel:      'Void Realm',
    hp: 1500, atk: 65, def: 32,
    speed: 80, aggroRange: 380, attackRange: 82,
    attackCooldown: 1400,
    xpReward:        2500,
    isElite:         true,
    isBoss:          true,
    eliteStars:      5,
    isFinalBoss:     true,
    phase2Threshold: 0.3,
    phase2AtkMult:   2.0,
    phase2SpeedMult: 1.6,
    phase2Ability:   'void_collapse',
    drops: [
      { item: 'void_essence',          amount: 1, chance: 1.0 },
      { item: 'fire_shard',            amount: 8, chance: 1.0 },
      { item: 'shadow_armor',          amount: 1, chance: 1.0 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 1.0 },
    ],
    respawnTime: 0,
  },
};
