// FragmentConfig.js
// Puzzle fragment system — collect fragments from dungeons to forge god-tier killer weapons

// ── Fragment types ────────────────────────────────────────────────────────────
export const FRAGMENT_TYPES = {
  rune:  { id: 'rune',  name: 'Ancient Rune',   icon: '🔷', color: '#3498db', desc: 'Etched with god-language. Glows faintly.' },
  shard: { id: 'shard', name: 'God Shard',       icon: '💎', color: '#9b59b6', desc: 'A sliver of divine essence.' },
  seal:  { id: 'seal',  name: 'Void Seal',       icon: '🔴', color: '#e74c3c', desc: 'Radiates dark energy. Handle with care.' },
};

// ── God-tier Killer Weapon recipes ───────────────────────────────────────────
// Each weapon requires fragments AND realm essence (dropped by realm bosses).
export const LEGACY_WEAPONS = [
  {
    id:          'soulbreaker',
    name:        'Soulbreaker',
    type:        'sword',
    icon:        '⚔️',
    color:       '#e74c3c',
    rarity:      'godkiller',
    atk:         95,
    abilityId:   'lifesteal_strike',
    desc:        'Each hit drains life from the target.',
    passiveDesc: 'Lifesteal: restore 15% of damage dealt as HP',
    fragmentCost: { rune: 1, shard: 1, seal: 1 },
    essenceCost:  { fire_essence: 1, lava_essence: 1 },
    setIndex:    1,
  },
  {
    id:          'voidpiercer',
    name:        'Voidpiercer',
    type:        'bow',
    icon:        '🏹',
    color:       '#9b59b6',
    rarity:      'godkiller',
    atk:         78,
    abilityId:   'void_shot',
    desc:        'Arrows ignore all enemy defense.',
    passiveDesc: 'Piercing: ignores 100% of target DEF',
    fragmentCost: { rune: 2, shard: 1, seal: 1 },
    essenceCost:  { shadow_essence: 1, void_essence: 1 },
    setIndex:    2,
  },
  {
    id:          'godsplitter',
    name:        'Godsplitter',
    type:        'hammer',
    icon:        '🔨',
    color:       '#d4af37',
    rarity:      'godkiller',
    atk:         110,
    abilityId:   'seismic_slam',
    desc:        'Slams the earth, stunning all nearby enemies.',
    passiveDesc: 'Seismic: every slam stuns enemies in 80px radius for 1.5s',
    fragmentCost: { rune: 1, shard: 2, seal: 2 },
    essenceCost:  { storm_essence: 1, void_essence: 1 },
    setIndex:    3,
  },
];

// ── Mini-challenge room types ─────────────────────────────────────────────────
export const CHALLENGE_TYPES = {
  timed_wave: {
    id:       'timed_wave',
    name:     'Timed Assault',
    desc:     'Defeat all enemies before time runs out.',
    icon:     '⏱',
    color:    '#e74c3c',
    timeLimit: 30, // seconds
    reward:   'rune',
  },
  no_damage: {
    id:       'no_damage',
    name:     'Untouched',
    desc:     'Clear the room without taking a single hit.',
    icon:     '🛡',
    color:    '#3498db',
    reward:   'shard',
  },
  survival: {
    id:       'survival',
    name:     'Survive the Surge',
    desc:     'Survive 20 seconds against an endless wave.',
    icon:     '🌊',
    color:    '#9b59b6',
    timeLimit: 20,
    reward:   'seal',
  },
};

// Drop chances per dungeon room clear (not challenge rooms)
export const FRAGMENT_DROP_CHANCE = {
  rune:  0.18,  // 18% per clear
  shard: 0.14,  // 14%
  seal:  0.10,  // 10%
};

// Max fragments of each type you can hold at once (prevents infinite stacking)
export const FRAGMENT_MAX = {
  rune:  3,
  shard: 3,
  seal:  3,
};
