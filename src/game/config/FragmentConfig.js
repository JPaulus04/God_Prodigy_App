// FragmentConfig.js
// Puzzle fragment system — collect fragments from dungeons to forge god-tier killer weapons

// ── Fragment types ────────────────────────────────────────────────────────────
export const FRAGMENT_TYPES = {
  rune:  { id: 'rune',  name: 'Ancient Rune',   icon: '🔷', color: '#3498db', desc: 'Etched with god-language. Glows faintly.' },
  shard: { id: 'shard', name: 'God Shard',       icon: '💎', color: '#9b59b6', desc: 'A sliver of divine essence.' },
  seal:  { id: 'seal',  name: 'Void Seal',       icon: '🔴', color: '#e74c3c', desc: 'Radiates dark energy. Handle with care.' },
};

// ── God-tier Legacy Weapon recipes ───────────────────────────────────────────
//
// DESIGN INTENT: These are end-game weapons requiring essence from 5 different
// realm bosses. The craft entry is HIDDEN until you have ALL materials in hand.
// There is no in-game hint about what is needed — players must discover on their own.
//
// Soulbreaker  — requires deep realm progression (fire + lava + shadow, 3 realms)
// Voidpiercer  — requires sky/storm arc (wind + storm + void, 3 realms)
// Godsplitter  — requires earth/ice arc  (earth + ice + ocean + void, 4 realms)
//
export const LEGACY_WEAPONS = [
  {
    id:          'soulbreaker',
    name:        'Soulbreaker',
    type:        'sword',
    icon:        '⚔️',
    color:       '#ff6b35',
    rarity:      'godkiller',
    atk:         150,
    abilityId:   'whirlwind',
    passiveId:   'lifesteal',
    desc:        'A balanced legacy blade forged after completing the full god path.',
    passiveDesc: 'Lifesteal: restores 7% of damage dealt as HP.',
    fragmentCost: { rune: 3, shard: 2, seal: 2 },
    essenceCost:  { forest_essence: 1, wind_essence: 1, earth_essence: 1, fire_essence: 1, ice_essence: 1, ocean_essence: 1, storm_essence: 1, shadow_essence: 1, lava_essence: 1, void_essence: 1 },
    fullPathRequired: true,
    setIndex:    1,
  },
  {
    id:          'voidpiercer',
    name:        'Voidpiercer',
    type:        'bow',
    icon:        '🏹',
    color:       '#9b59ff',
    rarity:      'godkiller',
    atk:         145,
    abilityId:   'power_shot',
    passiveId:   'def_pierce_35',
    desc:        'A precise legacy bow forged after completing the full god path.',
    passiveDesc: 'Piercing: ignores 35% of target DEF.',
    fragmentCost: { rune: 2, shard: 3, seal: 2 },
    essenceCost:  { forest_essence: 1, wind_essence: 1, earth_essence: 1, fire_essence: 1, ice_essence: 1, ocean_essence: 1, storm_essence: 1, shadow_essence: 1, lava_essence: 1, void_essence: 1 },
    fullPathRequired: true,
    setIndex:    2,
  },
  {
    id:          'godsplitter',
    name:        'Godsplitter',
    type:        'hammer',
    icon:        '🔨',
    color:       '#d4af37',
    rarity:      'godkiller',
    atk:         160,
    abilityId:   'ground_slam',
    passiveId:   'seismic_stun',
    desc:        'A heavy legacy hammer forged after completing the full god path.',
    passiveDesc: 'Seismic: 15% chance to stun nearby enemies for 0.75s.',
    fragmentCost: { rune: 3, shard: 2, seal: 3 },
    essenceCost:  { forest_essence: 1, wind_essence: 1, earth_essence: 1, fire_essence: 1, ice_essence: 1, ocean_essence: 1, storm_essence: 1, shadow_essence: 1, lava_essence: 1, void_essence: 1 },
    fullPathRequired: true,
    setIndex:    3,
  },
]

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
