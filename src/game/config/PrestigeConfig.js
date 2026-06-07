// PrestigeConfig.js
// Class definitions for prestige system — unlocked progressively

export const PRESTIGE_CLASSES = [
  {
    id:       'warrior',
    name:     'Warrior',
    icon:     '⚔️',
    color:    '#e74c3c',
    unlockAt: 0,  // always available
    desc:     'The classic path. Strength through endurance.',
    passive:  '+2 DEF per level · +15% max HP',
    ability:  'Whirlwind',
    bonuses: {
      defPerLevel: 2,
      maxHPMult:   1.15,
      atkMult:     1.0,
      xpMult:      1.0,
      spdMult:     1.0,
    },
  },
  {
    id:       'mage',
    name:     'Mage',
    icon:     '🔮',
    color:    '#3498db',
    unlockAt: 1,  // prestige ≥ 1
    desc:     'Intelligence over brute force. Spells ignore defense.',
    passive:  '×1.5 XP · all attacks ignore 50% DEF',
    ability:  'Arcane Nova',
    bonuses: {
      defPerLevel: 0,
      maxHPMult:   0.9,
      atkMult:     1.2,
      xpMult:      1.5,
      spdMult:     1.0,
      defPierce:   0.5,  // attacks ignore 50% of enemy DEF
    },
  },
  {
    id:       'assassin',
    name:     'Assassin',
    icon:     '🗡️',
    color:    '#9b59b6',
    unlockAt: 2,  // prestige ≥ 2
    desc:     'Speed and precision. Strike before they see you.',
    passive:  '+50% crit damage · ×1.3 attack speed · stealth dash',
    ability:  'Shadow Step',
    bonuses: {
      defPerLevel: 0,
      maxHPMult:   0.85,
      atkMult:     1.35,
      xpMult:      1.0,
      spdMult:     1.5,
      critMult:    1.5,
    },
  },
  {
    id:       'god',
    name:     'God',
    icon:     '👑',
    color:    '#d4af37',
    unlockAt: 3,  // prestige ≥ 3
    desc:     'You have transcended mortality. All bonuses, fully stacked.',
    passive:  'All class passives combined · +30% to all stats',
    ability:  'Divine Wrath',
    bonuses: {
      defPerLevel: 1,
      maxHPMult:   1.25,
      atkMult:     1.5,
      xpMult:      1.75,
      spdMult:     1.3,
      defPierce:   0.3,
      critMult:    1.3,
    },
  },
];

export function getClassById(id) {
  return PRESTIGE_CLASSES.find(c => c.id === id) || PRESTIGE_CLASSES[0];
}

export function getAvailableClasses(prestigeLevel) {
  return PRESTIGE_CLASSES.filter(c => c.unlockAt <= prestigeLevel);
}
