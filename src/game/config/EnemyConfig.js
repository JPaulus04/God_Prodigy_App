// EnemyConfig.js — single source of truth for all enemy stats.
// Add new enemy types here; nothing else needs to change downstream.

export const EnemyConfig = {
  goblin: {
    key: 'goblin',
    name: 'Goblin',
    hp: 30,
    atk: 5,
    def: 2,
    speed: 80,
    aggroRange: 120,
    attackRange: 32,
    attackCooldown: 1200,
    drops: [
      { item: 'wood',         amount: 1, chance: 0.6 },
      { item: 'goblin_tooth', amount: 1, chance: 0.3 },
    ],
    respawnTime: 20000,
  },

  golem: {
    key: 'golem',
    name: 'Stone Golem',
    hp: 80,
    atk: 12,
    def: 8,
    speed: 48,
    aggroRange: 100,
    attackRange: 42,
    attackCooldown: 2000,
    drops: [
      { item: 'stone', amount: 2, chance: 0.8 },
      { item: 'ore',   amount: 1, chance: 0.4 },
    ],
    respawnTime: 40000,
  },
};
