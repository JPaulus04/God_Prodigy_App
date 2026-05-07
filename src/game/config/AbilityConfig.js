// AbilityConfig.js
// One active ability per weapon type.
// Batch C wires these into the combat system and HUD button.

export const AbilityConfig = {

  // ── Sword: Whirlwind ──────────────────────────────────────────────────
  whirlwind: {
    id:          'whirlwind',
    name:        'Whirlwind',
    icon:        '🌀',
    weaponType:  'sword',
    description: 'Spin attack — hits ALL enemies within range.',
    cooldown:    5,       // seconds
    damageMult:  1.5,     // multiplier of playerATK
    range:       72,      // wider than normal melee
    type:        'aoe',
  },

  // ── Hammer: Ground Slam ───────────────────────────────────────────────
  ground_slam: {
    id:           'ground_slam',
    name:         'Ground Slam',
    icon:         '💥',
    weaponType:   'hammer',
    description:  'Slam the ground — knockback and briefly stun nearby enemies.',
    cooldown:     6,
    damageMult:   2.0,
    range:        80,
    type:         'aoe',
    stunDuration: 1.5,    // seconds enemy is stunned
  },

  // ── Bow: Power Shot ────────────────────────────────────────────────────
  power_shot: {
    id:          'power_shot',
    name:        'Power Shot',
    icon:        '🎯',
    weaponType:  'bow',
    description: 'Charged piercing shot — passes through multiple enemies.',
    cooldown:    4,
    damageMult:  2.5,
    range:       320,     // much longer than normal bow range
    width:       24,      // projectile width for hit detection
    type:        'projectile',
  },

  // ── Dagger: Flurry ────────────────────────────────────────────────────
  flurry: {
    id:          'flurry',
    name:        'Flurry',
    icon:        '⚡',
    weaponType:  'dagger',
    description: '3 rapid strikes in 0.5 seconds — massive burst damage.',
    cooldown:    4,
    damageMult:  0.6,     // per hit — x3 hits = 1.8x total
    hits:        3,
    hitDelay:    0.16,    // seconds between each hit
    range:       44,
    type:        'multi_hit',
  },

  // ── Staff: Arcane Burst ───────────────────────────────────────────────
  arcane_burst: {
    id:          'arcane_burst',
    name:        'Arcane Burst',
    icon:        '✨',
    weaponType:  'staff',
    description: 'Elemental explosion — deals bonus damage based on equipped element.',
    cooldown:    5,
    damageMult:  2.0,
    range:       100,
    type:        'elemental_aoe',
    // elementalBonusMult applied if weapon has matching element
    elementalBonusMult: 1.4,
  },
};

// Helper: get ability for a given weapon type
export function getAbilityForWeapon(weaponType) {
  return Object.values(AbilityConfig).find(a => a.weaponType === weaponType) || null;
}

// Helper: get ability by ID
export function getAbility(abilityId) {
  return AbilityConfig[abilityId] || null;
}
