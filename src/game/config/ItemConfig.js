// ItemConfig.js
// Single source of truth for all items in God Prodigy.
// Batch B+ reads from this to render gear, crafting menus, and drops.

// ── Weapon base stats (at Wood tier, Common rarity, level 1) ──────────────
export const WEAPON_BASES = {
  sword:  { atk: 8,  atkSpeed: 1.0, range: 52,  abilityId: 'whirlwind'    },
  hammer: { atk: 12, atkSpeed: 0.6, range: 48,  abilityId: 'ground_slam'  },
  bow:    { atk: 7,  atkSpeed: 0.8, range: 120, abilityId: 'power_shot'   },
  dagger: { atk: 5,  atkSpeed: 1.8, range: 40,  abilityId: 'flurry'       },
  staff:  { atk: 8,  atkSpeed: 0.9, range: 80,  abilityId: 'arcane_burst' },
};

// ── Material tier multipliers ────────────────────────────────────────────
export const TIER_MULT = {
  wood:      { atk: 1.0,  label: 'Wood',      color: '#a0785a', forgeLevel: 0 },
  iron:      { atk: 1.6,  label: 'Iron',      color: '#95a5a6', forgeLevel: 1 },
  steel:     { atk: 2.4,  label: 'Steel',     color: '#5d8aa8', forgeLevel: 2 },
  elemental: { atk: 3.8,  label: 'Elemental', color: '#e67e22', forgeLevel: 3 },
  god:       { atk: 6.0,  label: 'God',       color: '#f1c40f', forgeLevel: 3 },
};

// ── Rarity config ────────────────────────────────────────────────────────
export const RARITY = {
  common:    { mult: 1.0,  color: '#aaaaaa', border: '#444',    label: 'Common',    stars: 1, maxUpgrade: 3 },
  uncommon:  { mult: 1.25, color: '#2ecc71', border: '#2ecc71', label: 'Uncommon',  stars: 2, maxUpgrade: 3 },
  rare:      { mult: 1.6,  color: '#3498db', border: '#3498db', label: 'Rare',      stars: 3, maxUpgrade: 4 },
  epic:      { mult: 2.2,  color: '#9b59b6', border: '#9b59b6', label: 'Epic',      stars: 4, maxUpgrade: 5 },
  legendary: { mult: 3.0,  color: '#f1c40f', border: '#f1c40f', label: 'Legendary', stars: 5, maxUpgrade: 5 },
};

// ── Upgrade costs per level ──────────────────────────────────────────────
export const UPGRADE_COSTS = {
  1: { ore: 3 },
  2: { ore: 5,  stone: 2 },
  3: { ore: 8,  stone: 5 },
  4: { ore: 12, stone: 8,  fire_shard: 1 },
  5: { ore: 18, stone: 12, fire_shard: 2 },
};

// Flat ATK added per upgrade level (scales with rarity)
export const UPGRADE_ATK_BONUS = {
  common: 2, uncommon: 3, rare: 4, epic: 6, legendary: 9,
};

// ── Stat computation helpers ─────────────────────────────────────────────

/** Compute final ATK for a weapon given its config and upgrade level */
export function computeWeaponATK(type, tier, rarity, upgradeLevel = 0) {
  const base      = WEAPON_BASES[type]?.atk    || 8;
  const tierMult  = TIER_MULT[tier]?.atk        || 1;
  const rarMult   = RARITY[rarity]?.mult        || 1;
  const baseATK   = Math.round(base * tierMult * rarMult);
  const bonus     = (UPGRADE_ATK_BONUS[rarity] || 2) * upgradeLevel;
  return baseATK + bonus;
}

/** Generate a unique instance ID for an item pickup */
export function makeInstanceId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Craftable weapon recipes ─────────────────────────────────────────────
// Only Common rarity is craftable — Uncommon/Rare/Epic come from drops

export const WEAPON_RECIPES = [
  // ── Wood tier (no Forge required) ──────────────────────────────────────
  { id: 'wood_sword_common',  name: 'Wooden Sword',  type: 'sword',  tier: 'wood',  rarity: 'common', icon: '🗡',  cost: { wood: 5             }, forgeLevel: 0 },
  { id: 'wood_hammer_common', name: 'Wooden Hammer', type: 'hammer', tier: 'wood',  rarity: 'common', icon: '🔨', cost: { wood: 8             }, forgeLevel: 0 },
  { id: 'wood_bow_common',    name: 'Wooden Bow',    type: 'bow',    tier: 'wood',  rarity: 'common', icon: '🏹', cost: { wood: 6             }, forgeLevel: 0 },
  { id: 'wood_dagger_common', name: 'Wooden Dagger', type: 'dagger', tier: 'wood',  rarity: 'common', icon: '🔪', cost: { wood: 4             }, forgeLevel: 0 },

  // ── Iron tier (Forge Lv 1+) ────────────────────────────────────────────
  { id: 'iron_sword_common',  name: 'Iron Sword',    type: 'sword',  tier: 'iron',  rarity: 'common', icon: '⚔️', cost: { ore: 3, wood: 1     }, forgeLevel: 1 },
  { id: 'iron_hammer_common', name: 'Iron Hammer',   type: 'hammer', tier: 'iron',  rarity: 'common', icon: '🔨', cost: { ore: 5, wood: 2     }, forgeLevel: 1 },
  { id: 'iron_bow_common',    name: 'Iron Bow',      type: 'bow',    tier: 'iron',  rarity: 'common', icon: '🏹', cost: { ore: 3, wood: 3     }, forgeLevel: 1 },
  { id: 'iron_dagger_common', name: 'Iron Dagger',   type: 'dagger', tier: 'iron',  rarity: 'common', icon: '🔪', cost: { ore: 2, wood: 1     }, forgeLevel: 1 },

  // ── Steel tier (Forge Lv 2+) ───────────────────────────────────────────
  { id: 'steel_sword_common',  name: 'Steel Sword',   type: 'sword',  tier: 'steel', rarity: 'common', icon: '⚔️', cost: { ore: 8,  stone: 5   }, forgeLevel: 2 },
  { id: 'steel_hammer_common', name: 'Steel Hammer',  type: 'hammer', tier: 'steel', rarity: 'common', icon: '🔨', cost: { ore: 12, stone: 8   }, forgeLevel: 2 },
  { id: 'steel_bow_common',    name: 'Steel Bow',     type: 'bow',    tier: 'steel', rarity: 'common', icon: '🏹', cost: { ore: 8,  stone: 4   }, forgeLevel: 2 },
  { id: 'steel_dagger_common', name: 'Steel Dagger',  type: 'dagger', tier: 'steel', rarity: 'common', icon: '🔪', cost: { ore: 6,  stone: 3   }, forgeLevel: 2 },
];

// ── Named special items (boss/dungeon drops only) ────────────────────────
export const SPECIAL_ITEMS = {
  fire_shard: {
    id: 'fire_shard',
    name: 'Fire Shard',
    slot: null,
    rarity: 'rare',
    icon: '🔥',
    color: '#e74c3c',
    description: 'A crystallized fragment of the Fire God\'s power. Required for elemental crafting.',
  },
  ember_blade: {
    id: 'ember_blade',
    name: 'Ember Blade',
    slot: 'weapon',
    type: 'sword',
    tier: 'elemental',
    rarity: 'epic',
    icon: '🔥',
    color: '#e74c3c',
    atk: 45,
    atkSpeed: 1.0,
    range: 52,
    abilityId: 'whirlwind',
    element: 'fire',
    description: 'Forged from the Fire God\'s essence. Burns enemies on hit.',
  },
  frost_hammer: {
    id: 'frost_hammer',
    name: 'Frost Hammer',
    slot: 'weapon',
    type: 'hammer',
    tier: 'elemental',
    rarity: 'epic',
    icon: '❄️',
    color: '#3498db',
    atk: 55,
    atkSpeed: 0.6,
    range: 48,
    abilityId: 'ground_slam',
    element: 'ice',
    description: 'Channels the Ice God\'s cold fury. Slows enemies on hit.',
  },
  storm_bow: {
    id: 'storm_bow',
    name: 'Storm Bow',
    slot: 'weapon',
    type: 'bow',
    tier: 'elemental',
    rarity: 'epic',
    icon: '⚡',
    color: '#f1c40f',
    atk: 40,
    atkSpeed: 0.9,
    range: 160,
    abilityId: 'power_shot',
    element: 'storm',
    description: 'Crackling with storm energy. Pierces through armor.',
  },
};

// ── Armor items ──────────────────────────────────────────────────────────
export const ARMOR_ITEMS = {
  leather_vest: {
    id: 'leather_vest',
    name: 'Leather Vest',
    slot: 'armor',
    tier: 'wood',
    rarity: 'common',
    icon: '🧥',
    color: '#a0785a',
    def: 4,
    description: 'Basic protection. Better than nothing.',
    craftCost: { wood: 8 },
    forgeLevel: 0,
  },
  iron_chestplate: {
    id: 'iron_chestplate',
    name: 'Iron Chestplate',
    slot: 'armor',
    tier: 'iron',
    rarity: 'common',
    icon: '🛡️',
    color: '#95a5a6',
    def: 10,
    description: 'Solid iron protection.',
    craftCost: { ore: 6, stone: 3 },
    forgeLevel: 1,
  },
  steel_plate: {
    id: 'steel_plate',
    name: 'Steel Plate',
    slot: 'armor',
    tier: 'steel',
    rarity: 'common',
    icon: '⚙️',
    color: '#5d8aa8',
    def: 18,
    spdPenalty: -1,
    description: 'Heavy steel protection. Slightly reduces speed.',
    craftCost: { ore: 10, stone: 8 },
    forgeLevel: 2,
  },
  shadow_armor: {
    id: 'shadow_armor',
    name: 'Shadow Armor',
    slot: 'armor',
    tier: 'iron',
    rarity: 'rare',
    icon: '🌑',
    color: '#9b59b6',
    def: 14,
    description: 'Light and silent. Drops from the Dungeon Champion.',
    dropOnly: true,
  },
};

// ── Accessory items ──────────────────────────────────────────────────────
export const ACCESSORY_ITEMS = {
  ring_of_speed: {
    id: 'ring_of_speed',
    name: 'Ring of Speed',
    slot: 'accessory',
    rarity: 'uncommon',
    icon: '💍',
    color: '#2ecc71',
    spd: 2,
    description: 'A silver ring that quickens your step.',
    craftCost: { ore: 4, stone: 2 },
    forgeLevel: 1,
  },
  ring_of_power: {
    id: 'ring_of_power',
    name: 'Ring of Power',
    slot: 'accessory',
    rarity: 'uncommon',
    icon: '💍',
    color: '#e74c3c',
    atk: 4,
    description: 'A heavy ring that strengthens your strikes.',
    craftCost: { ore: 5, stone: 2 },
    forgeLevel: 1,
  },
  hunters_charm: {
    id: 'hunters_charm',
    name: "Hunter's Charm",
    slot: 'accessory',
    rarity: 'rare',
    icon: '🎯',
    color: '#3498db',
    atk: 4,
    spd: 1,
    description: 'Drops from Gold Goblins. Increases power and agility.',
    dropOnly: true,
  },
  warriors_seal: {
    id: 'warriors_seal',
    name: "Warrior's Seal",
    slot: 'accessory',
    rarity: 'epic',
    icon: '🔮',
    color: '#9b59b6',
    atk: 8,
    def: 4,
    description: 'Forged from ancient warrior spirit. Boss drop.',
    dropOnly: true,
  },
};

// ── XP thresholds per level ──────────────────────────────────────────────
// Level cap: 30
export const XP_THRESHOLDS = [
  0,    // Level 1 (starting)
  100,  // Level 2
  250,  // Level 3
  450,  // Level 4
  700,  // Level 5
  1000, // Level 6
  1350, // Level 7
  1750, // Level 8
  2200, // Level 9
  2700, // Level 10
  3300, // Level 11
  4000, // Level 12
  4800, // Level 13
  5700, // Level 14
  6700, // Level 15
  7800, // Level 16
  9000, // Level 17
  10300,// Level 18
  11700,// Level 19
  13200,// Level 20
  15000,// Level 21
  17000,// Level 22
  19200,// Level 23
  21600,// Level 24
  24200,// Level 25
  27000,// Level 26
  30000,// Level 27
  33200,// Level 28
  36600,// Level 29
  40200,// Level 30 (cap)
];
