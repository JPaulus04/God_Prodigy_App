// EnemyConfig.js
// Single source of truth for all enemy stats.
// Includes standard, elite, and dungeon enemy variants.

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
  // Elites are named, tinted, much harder, and drop rare gear

  gold_goblin: {
    key:           'goblin',        // reuses goblin sprite
    name:          'Gold Goblin',
    tint:          0xf1c40f,        // gold tint
    hp: 80, atk: 10, def: 4,
    speed: 110, aggroRange: 140, attackRange: 32,
    attackCooldown: 900,
    xpReward:      60,
    isElite:       true,
    eliteStars:    1,
    drops: [
      { item: 'ore',             amount: 2, chance: 0.9 },
      { item: 'goblin_tooth',    amount: 2, chance: 0.8 },
      { item: 'hunters_charm',   amount: 1, chance: 0.12 },
      { item: 'gear_drop_uncommon_weapon', amount: 1, chance: 0.35 },
    ],
    respawnTime: 90000,
  },

  stone_guardian: {
    key:           'golem',         // reuses golem sprite
    name:          'Stone Guardian',
    tint:          0x1a1a2e,        // dark tint
    hp: 220, atk: 22, def: 15,
    speed: 55, aggroRange: 120, attackRange: 52,
    attackCooldown: 2400,
    xpReward:      120,
    isElite:       true,
    eliteStars:    2,
    drops: [
      { item: 'stone',           amount: 5, chance: 1.0 },
      { item: 'ore',             amount: 3, chance: 0.9 },
      { item: 'shadow_armor',    amount: 1, chance: 0.06 },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 0.25 },
    ],
    respawnTime: 180000,
  },

  // ── Dungeon enemies ───────────────────────────────────────────────────
  // These do not respawn — dungeon resets when re-entered

  shadow_stalker: {
    key:           'goblin',
    name:          'Shadow Stalker',
    tint:          0x6c3483,        // dark purple
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
    key:               'golem',
    name:              'Dungeon Champion',
    tint:              0xc0392b,    // deep red
    hp: 400, atk: 28, def: 12,
    speed: 70, aggroRange: 220, attackRange: 56,
    attackCooldown: 1800,
    xpReward:          300,
    isElite:           true,
    isBoss:            true,
    eliteStars:        3,
    isDungeonOnly:     true,
    // Phase 2 triggers at 50% HP — gets faster and stronger
    phase2Threshold:   0.5,
    phase2AtkMult:     1.5,
    phase2SpeedMult:   1.3,
    drops: [
      { item: 'fire_shard',       amount: 1, chance: 1.0  },  // guaranteed
      { item: 'shadow_armor',     amount: 1, chance: 0.5  },
      { item: 'gear_drop_rare_weapon', amount: 1, chance: 0.8 },
    ],
    respawnTime: 0,
  },
};
