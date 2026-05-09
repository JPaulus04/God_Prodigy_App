import React, { useEffect, useRef } from 'react';
import { useGameStore }  from '../store/useGameStore';
import { InputState }    from '../game/systems/InputState';
import { EnemyConfig }   from '../game/config/EnemyConfig';
import { AbilityConfig } from '../game/config/AbilityConfig';

const TILE    = 32;

// ── God realm portals ────────────────────────────────────────────────────
const REALM_PORTALS = [
  { realm: 'forest', name: 'Forest Realm', icon: '🌿', color: '#27ae60', skulls: 1, x: 15, y: 12 },
  { realm: 'wind',   name: 'Wind Realm',   icon: '💨', color: '#87ceeb', skulls: 1, x:  8, y: 38 },
  { realm: 'earth',  name: 'Earth Realm',  icon: '🪨', color: '#95a5a6', skulls: 2, x: 52, y: 22 },
  { realm: 'fire',   name: 'Fire Realm',   icon: '🔥', color: '#e74c3c', skulls: 2, x: 40, y: 72 },
  { realm: 'ice',    name: 'Ice Realm',    icon: '❄️', color: '#3498db', skulls: 3, x: 68, y:  8 },
  { realm: 'ocean',  name: 'Ocean Realm',  icon: '🌊', color: '#1abc9c', skulls: 3, x:  5, y: 60 },
  { realm: 'storm',  name: 'Storm Realm',  icon: '⚡', color: '#9b59b6', skulls: 4, x: 72, y: 38 },
  { realm: 'shadow', name: 'Shadow Realm', icon: '🌑', color: '#6c3483', skulls: 4, x: 25, y: 74 },
  { realm: 'lava',   name: 'Lava Realm',   icon: '🌋', color: '#e67e22', skulls: 5, x: 55, y: 74 },
  { realm: 'void',   name: 'Void Realm',   icon: '✨', color: '#f1c40f', skulls: 5, x: 72, y: 65 },
];

const MAP_W   = 50;
const MAP_H   = 50;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const BORDER  = TILE * 4;

const RESPAWN_POINTS = {
  stronghold:    { x: 75*TILE, y: 98*TILE  },
  cp_center:     { x: 75*TILE, y: 75*TILE  },
  cp_forest:     { x: 70*TILE, y: 30*TILE  },
  cp_east:       { x:115*TILE, y: 50*TILE  },
  cp_south:      { x: 75*TILE, y:112*TILE  },
  cp_southwest:  { x: 28*TILE, y:112*TILE  },
  cp_far_east:   { x:122*TILE, y: 80*TILE  },
};

function clampToWorld(x, y) {
  return {
    x: Math.max(BORDER, Math.min(WORLD_W - BORDER, x)),
    y: Math.max(BORDER, Math.min(WORLD_H - BORDER, y)),
  };
}

function tileColor(tx, ty) {
  // Water border
  if (tx < 2 || tx >= MAP_W-2 || ty < 2 || ty >= MAP_H-2) return '#2980b9';

  // ── Boss Temple tiles (3×3 colored stone per god) ────────
  const temples = [
    { x:70,y:28,c:'#27ae60'},{x:28,y:70,c:'#87ceeb'},
    {x:118,y:48,c:'#636e72'},{x:28,y:112,c:'#1abc9c'},
    {x:75,y:115,c:'#8b0000'},{x:125,y:25,c:'#a8d8ea'},
    {x:125,y:75,c:'#4a235a'},{x:45,y:125,c:'#2c2c4a'},
    {x:120,y:125,c:'#7a3000'},{x:75,y:142,c:'#5a4800'},
  ];
  for (const t of temples) {
    if (tx >= t.x-1 && tx <= t.x+1 && ty >= t.y-1 && ty <= t.y+1) return t.c;
  }

  // ── God biome zones (difficulty increases with distance from center 75,75) ──
  if (tx>=55&&tx<=92&&ty>=18&&ty<=58)  return '#1a5c35'; // 🌿 Forest  (diff 1)
  if (tx>=12&&tx<=55&&ty>=55&&ty<=92)  return '#c8e6f5'; // 💨 Wind    (diff 1)
  if (tx>=95&&tx<=142&&ty>=22&&ty<=68) return '#5d6d7e'; // 🪨 Earth   (diff 2)
  if (tx>=8&&tx<=52&&ty>=95&&ty<=138)  return '#0e6655'; // 🌊 Ocean   (diff 2)
  if (tx>=55&&tx<=100&&ty>=98&&ty<=132)return '#6e2c2c'; // 🔥 Fire    (diff 3)
  if (tx>=105&&tx<=147&&ty>=4&&ty<=48) return '#d6eaf8'; // ❄️ Ice     (diff 3)
  if (tx>=105&&tx<=147&&ty>=55&&ty<=100)return '#1c2833'; // ⚡ Storm  (diff 4)
  if (tx>=4&&tx<=58&&ty>=105&&ty<=147) return '#1a1a2e'; // 🌑 Shadow  (diff 4)
  if (tx>=98&&tx<=147&&ty>=105&&ty<=147)return '#641e16'; // 🌋 Lava   (diff 5)
  if (ty>=132&&tx>=55&&tx<=100)         return '#0d0d1a'; // ✨ Void    (diff 5)

  // ── Paths ─────────────────────────────────────────────────
  if (tx===75||ty===75) return '#9b7a5b'; // Main cross
  if (tx===70&&ty<75)   return '#9b7a5b'; // North forest path
  if (ty===50&&tx>75)   return '#9b7a5b'; // East path
  if (tx===30&&ty>75)   return '#9b7a5b'; // Southwest path
  if (ty===80&&tx>100)  return '#9b7a5b'; // Far east path

  return '#2d6a3f';
}

function dist(ax, ay, bx, by) {
  return Math.sqrt((ax-bx)**2 + (ay-by)**2);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '', currentY = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, currentY);
      line = word + ' '; currentY += lineHeight;
    } else { line = test; }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, currentY);
}

const CHECKPOINTS = [
  { id: 'cp_center',    x:  75*TILE, y:  75*TILE },
  { id: 'cp_forest',    x:  70*TILE, y:  30*TILE },
  { id: 'cp_east',      x: 115*TILE, y:  50*TILE },
  { id: 'cp_south',     x:  75*TILE, y: 112*TILE },
  { id: 'cp_southwest', x:  28*TILE, y: 112*TILE },
  { id: 'cp_far_east',  x: 122*TILE, y:  80*TILE },
];

const RESOURCE_DEFS = [
  // Central starting area
  { type:'tree',     res:'wood',  amt:2, x: 78*TILE, y: 70*TILE },
  { type:'tree',     res:'wood',  amt:2, x: 68*TILE, y: 72*TILE },
  { type:'rock',     res:'stone', amt:2, x: 80*TILE, y: 80*TILE },
  { type:'rock',     res:'stone', amt:2, x: 72*TILE, y: 82*TILE },
  { type:'ore_node', res:'ore',   amt:1, x: 85*TILE, y: 72*TILE },

  // Forest zone (tx 55-92, ty 18-58)
  { type:'tree',     res:'wood',  amt:3, x: 62*TILE, y: 25*TILE },
  { type:'tree',     res:'wood',  amt:3, x: 72*TILE, y: 22*TILE },
  { type:'tree',     res:'wood',  amt:3, x: 80*TILE, y: 30*TILE },
  { type:'tree',     res:'wood',  amt:3, x: 65*TILE, y: 40*TILE },
  { type:'tree',     res:'wood',  amt:3, x: 78*TILE, y: 45*TILE },
  { type:'rock',     res:'stone', amt:2, x: 85*TILE, y: 35*TILE },

  // Wind zone (tx 12-55, ty 55-92)
  { type:'tree',     res:'wood',  amt:3, x: 20*TILE, y: 65*TILE },
  { type:'tree',     res:'wood',  amt:3, x: 35*TILE, y: 60*TILE },
  { type:'tree',     res:'wood',  amt:2, x: 45*TILE, y: 75*TILE },
  { type:'rock',     res:'stone', amt:2, x: 25*TILE, y: 78*TILE },

  // Earth zone (tx 95-142, ty 22-68)
  { type:'rock',     res:'stone', amt:3, x:105*TILE, y: 35*TILE },
  { type:'rock',     res:'stone', amt:3, x:118*TILE, y: 42*TILE },
  { type:'rock',     res:'stone', amt:3, x:130*TILE, y: 55*TILE },
  { type:'ore_node', res:'ore',   amt:2, x:110*TILE, y: 48*TILE },
  { type:'ore_node', res:'ore',   amt:2, x:125*TILE, y: 35*TILE },
  { type:'ore_node', res:'ore',   amt:3, x:135*TILE, y: 50*TILE },

  // Ocean zone (tx 8-52, ty 95-138)
  { type:'tree',     res:'wood',  amt:3, x: 15*TILE, y:105*TILE },
  { type:'tree',     res:'wood',  amt:3, x: 28*TILE, y: 98*TILE },
  { type:'rock',     res:'stone', amt:2, x: 40*TILE, y:108*TILE },
  { type:'ore_node', res:'ore',   amt:2, x: 22*TILE, y:120*TILE },

  // Fire zone (tx 55-100, ty 98-132)
  { type:'ore_node', res:'ore',   amt:3, x: 65*TILE, y:108*TILE },
  { type:'ore_node', res:'ore',   amt:3, x: 80*TILE, y:118*TILE },
  { type:'ore_node', res:'ore',   amt:2, x: 92*TILE, y:105*TILE },
  { type:'rock',     res:'stone', amt:3, x: 70*TILE, y:122*TILE },

  // Ice zone (tx 105-147, ty 4-48)
  { type:'rock',     res:'stone', amt:3, x:115*TILE, y: 15*TILE },
  { type:'rock',     res:'stone', amt:3, x:130*TILE, y: 25*TILE },
  { type:'ore_node', res:'ore',   amt:2, x:140*TILE, y: 18*TILE },

  // Storm zone (tx 105-147, ty 55-100)
  { type:'ore_node', res:'ore',   amt:3, x:118*TILE, y: 70*TILE },
  { type:'ore_node', res:'ore',   amt:3, x:135*TILE, y: 80*TILE },
  { type:'rock',     res:'stone', amt:3, x:128*TILE, y: 62*TILE },

  // Shadow / Lava / Void zones — rich but dangerous
  { type:'ore_node', res:'ore',   amt:3, x: 25*TILE, y:118*TILE },
  { type:'ore_node', res:'ore',   amt:3, x: 42*TILE, y:130*TILE },
  { type:'ore_node', res:'ore',   amt:3, x:112*TILE, y:118*TILE },
  { type:'ore_node', res:'ore',   amt:3, x:130*TILE, y:132*TILE },
];

const ENEMY_DEFS = [
  // ── Starting area (near spawn 75,75) ─────────────────────
  { type:'goblin',         x: 80*TILE, y: 68*TILE },
  { type:'goblin',         x: 70*TILE, y: 80*TILE },
  { type:'goblin',         x: 82*TILE, y: 82*TILE },
  { type:'gold_goblin',    x: 85*TILE, y: 65*TILE }, // ⭐ first elite

  // ── Forest Zone (diff 1) ─────────────────────────────────
  { type:'goblin',         x: 62*TILE, y: 28*TILE },
  { type:'goblin',         x: 72*TILE, y: 22*TILE },
  { type:'goblin',         x: 82*TILE, y: 32*TILE },
  { type:'goblin',         x: 65*TILE, y: 42*TILE },
  { type:'goblin',         x: 78*TILE, y: 48*TILE },
  { type:'gold_goblin',    x: 68*TILE, y: 35*TILE }, // ⭐ forest elite

  // ── Wind Zone (diff 1) ───────────────────────────────────
  { type:'goblin',         x: 22*TILE, y: 62*TILE },
  { type:'goblin',         x: 38*TILE, y: 68*TILE },
  { type:'goblin',         x: 25*TILE, y: 78*TILE },
  { type:'goblin',         x: 45*TILE, y: 82*TILE },
  { type:'gold_goblin',    x: 32*TILE, y: 72*TILE }, // ⭐ wind elite

  // ── Earth Zone (diff 2) ──────────────────────────────────
  { type:'golem',          x:108*TILE, y: 32*TILE },
  { type:'golem',          x:120*TILE, y: 42*TILE },
  { type:'golem',          x:132*TILE, y: 55*TILE },
  { type:'golem',          x:115*TILE, y: 58*TILE },
  { type:'stone_guardian', x:118*TILE, y: 38*TILE }, // ⭐⭐ earth elite
  { type:'stone_guardian', x:130*TILE, y: 45*TILE }, // ⭐⭐ earth elite

  // ── Ocean Zone (diff 2) ──────────────────────────────────
  { type:'goblin',         x: 18*TILE, y:102*TILE },
  { type:'goblin',         x: 32*TILE, y:108*TILE },
  { type:'golem',          x: 22*TILE, y:118*TILE },
  { type:'golem',          x: 40*TILE, y:122*TILE },
  { type:'stone_guardian', x: 30*TILE, y:115*TILE }, // ⭐⭐ ocean elite

  // ── Fire Zone (diff 3) ───────────────────────────────────
  { type:'golem',          x: 62*TILE, y:108*TILE },
  { type:'golem',          x: 75*TILE, y:118*TILE },
  { type:'golem',          x: 88*TILE, y:108*TILE },
  { type:'stone_guardian', x: 70*TILE, y:112*TILE }, // ⭐⭐
  { type:'stone_guardian', x: 85*TILE, y:120*TILE }, // ⭐⭐

  // ── Ice Zone (diff 3) ────────────────────────────────────
  { type:'goblin',         x:112*TILE, y: 15*TILE },
  { type:'goblin',         x:125*TILE, y: 22*TILE },
  { type:'golem',          x:135*TILE, y: 32*TILE },
  { type:'stone_guardian', x:120*TILE, y: 28*TILE }, // ⭐⭐
  { type:'stone_guardian', x:138*TILE, y: 18*TILE }, // ⭐⭐

  // ── Storm Zone (diff 4) ──────────────────────────────────
  { type:'golem',          x:112*TILE, y: 65*TILE },
  { type:'golem',          x:128*TILE, y: 72*TILE },
  { type:'golem',          x:140*TILE, y: 85*TILE },
  { type:'stone_guardian', x:120*TILE, y: 78*TILE }, // ⭐⭐
  { type:'stone_guardian', x:135*TILE, y: 65*TILE }, // ⭐⭐

  // ── Shadow Zone (diff 4) ─────────────────────────────────
  { type:'golem',          x: 18*TILE, y:115*TILE },
  { type:'golem',          x: 35*TILE, y:128*TILE },
  { type:'stone_guardian', x: 25*TILE, y:122*TILE }, // ⭐⭐
  { type:'stone_guardian', x: 45*TILE, y:118*TILE }, // ⭐⭐
  { type:'stone_guardian', x: 30*TILE, y:138*TILE }, // ⭐⭐ deep shadow

  // ── Lava Zone (diff 5) ───────────────────────────────────
  { type:'golem',          x:108*TILE, y:115*TILE },
  { type:'golem',          x:125*TILE, y:125*TILE },
  { type:'stone_guardian', x:115*TILE, y:122*TILE }, // ⭐⭐
  { type:'stone_guardian', x:135*TILE, y:118*TILE }, // ⭐⭐
  { type:'stone_guardian', x:128*TILE, y:138*TILE }, // ⭐⭐ deep lava

  // ── Void Zone (diff 5) ───────────────────────────────────
  { type:'stone_guardian', x: 65*TILE, y:138*TILE }, // ⭐⭐
  { type:'stone_guardian', x: 80*TILE, y:142*TILE }, // ⭐⭐
  { type:'stone_guardian', x: 92*TILE, y:136*TILE }, // ⭐⭐ near void temple
];

const PATROL_RADIUS = 80;

// ── Boss temple entrance tiles ─────────────────────────────────────────
// Step on temple tile → instant transition to boss arena (no flash, no key)
const BOSS_TEMPLES = [
  { realm:'forest', icon:'🌿', color:'#27ae60', name:'Sylvara',       x:70*TILE, y:28*TILE },
  { realm:'wind',   icon:'💨', color:'#87ceeb', name:'Zephyros',      x:28*TILE, y:70*TILE },
  { realm:'earth',  icon:'🪨', color:'#636e72', name:'Terran',        x:118*TILE,y:48*TILE },
  { realm:'ocean',  icon:'🌊', color:'#1abc9c', name:'Nepthar',       x:28*TILE, y:112*TILE},
  { realm:'fire',   icon:'🔥', color:'#e74c3c', name:'Ignar',         x:75*TILE, y:115*TILE},
  { realm:'ice',    icon:'❄️', color:'#3498db', name:'Glacius',       x:125*TILE,y:25*TILE },
  { realm:'storm',  icon:'⚡', color:'#9b59b6', name:'Vortus',        x:125*TILE,y:75*TILE },
  { realm:'shadow', icon:'🌑', color:'#6c3483', name:'Umbris',        x:45*TILE, y:125*TILE},
  { realm:'lava',   icon:'🌋', color:'#e67e22', name:'Magmara',       x:120*TILE,y:125*TILE},
  { realm:'void',   icon:'✨', color:'#f1c40f', name:'Nihilus',       x:75*TILE, y:142*TILE},
];

const NPC_HINTS = [
  'Defeat the 10 elemental gods and ascend to godhood.',
  'Gather wood, stone, and ore to build your Stronghold.',
  'The Stronghold is to the south. Upgrade your Forge first.',
  'Golems drop ore. They are tough — bring your best gear.',
  'Activate checkpoints to save your progress across the world.',
  'Each weapon type has a unique active ability — use it!',
  'Head south to find the Badlands. Ore is plentiful there.',
  'The deep south smells of sulfur. The Fire God stirs...',
  'Western wetlands hold ancient trees — good for crafting.',
  'Far east, beyond the rocky ridge, dangerous golems guard rich ore.',
  'Two new checkpoints await in the south and far east.',
];

function makeEnemy(def) {
  const cfg = EnemyConfig[def.type];
  return {
    type: def.type, x: def.x, y: def.y,
    originX: def.x, originY: def.y,
    hp: cfg.hp, maxHp: cfg.hp,
    state: 'patrol', alive: true,
    attackTimer: 0, patrolDir: 1, patrolTimer: 0,
    stunTimer: 0,
    alerted:   false,  // permanently true once hit — bypasses aggro range
    // Elite properties
    isElite:    cfg.isElite    || false,
    isBoss:     cfg.isBoss     || false,
    eliteStars: cfg.eliteStars || 0,
  };
}

// Resolve a drop item — handles resources, gear, and special items
function resolveDropItem(drop, store, floatX, floatY, addFloat) {
  const RESOURCE_TYPES = ['wood', 'stone', 'ore', 'fire_shard', 'goblin_tooth'];

  if (RESOURCE_TYPES.includes(drop.item)) {
    store.addResource(drop.item, drop.amount);
    addFloat(floatX, floatY, `+${drop.amount} ${drop.item}`, '#7ed321');
    return;
  }

  if (drop.item === 'hunters_charm') {
    const item = {
      id: 'hunters_charm', name: "Hunter's Charm",
      slot: 'accessory', rarity: 'rare',
      atk: 4, spd: 1,
      instanceId: `item_${Date.now()}_hunters_charm`,
    };
    if (store.addItem(item)) addFloat(floatX, floatY - 16, "🎯 Hunter's Charm!", '#3498db');
    return;
  }

  if (drop.item === 'shadow_armor') {
    const item = {
      id: 'shadow_armor', name: 'Shadow Armor',
      slot: 'armor', tier: 'iron', rarity: 'rare',
      def: 14,
      instanceId: `item_${Date.now()}_shadow_armor`,
    };
    if (store.addItem(item)) addFloat(floatX, floatY - 16, '🌑 Shadow Armor!', '#9b59b6');
    return;
  }

  if (drop.item === 'gear_drop_uncommon_weapon') {
    const TYPES    = ['sword', 'hammer', 'bow', 'dagger'];
    const ABILITY  = { sword: 'whirlwind', hammer: 'ground_slam', bow: 'power_shot', dagger: 'flurry' };
    const type     = TYPES[Math.floor(Math.random() * TYPES.length)];
    const name     = `Iron ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const item = {
      id: `iron_${type}_uncommon`, name,
      slot: 'weapon', type, tier: 'iron', rarity: 'uncommon',
      atk: 15,  // iron tier * uncommon rarity ≈ 8 * 1.6 * 1.25
      abilityId: ABILITY[type],
      instanceId: `item_${Date.now()}_${type}`,
    };
    if (store.addItem(item)) addFloat(floatX, floatY - 16, `⚔ Uncommon ${name}!`, '#2ecc71');
    return;
  }

  if (drop.item === 'gear_drop_rare_weapon') {
    const TYPES   = ['sword', 'hammer', 'bow', 'dagger'];
    const ABILITY = { sword: 'whirlwind', hammer: 'ground_slam', bow: 'power_shot', dagger: 'flurry' };
    const type    = TYPES[Math.floor(Math.random() * TYPES.length)];
    const name    = `Steel ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const item = {
      id: `steel_${type}_rare`, name,
      slot: 'weapon', type, tier: 'steel', rarity: 'rare',
      atk: 31,  // steel tier * rare rarity ≈ 8 * 2.4 * 1.6
      abilityId: ABILITY[type],
      instanceId: `item_${Date.now()}_${type}`,
    };
    if (store.addItem(item)) addFloat(floatX, floatY - 16, `💎 Rare ${name}!`, '#3498db');
    return;
  }
}

// Ability colors per ability ID
const ABILITY_COLORS = {
  whirlwind:    { primary: '#4a90e2', secondary: '#7ab3e0' },
  ground_slam:  { primary: '#c0392b', secondary: '#e67e22' },
  power_shot:   { primary: '#FCD34D', secondary: '#F97316' },
  flurry:       { primary: '#f39c12', secondary: '#fff' },
  arcane_burst: { primary: '#9b59b6', secondary: '#d4af37' },
};

export default function WorldCanvas() {
  const canvasRef       = useRef(null);
  const rafRef          = useRef(null);
  const lastTimeRef     = useRef(0);
  const showDeathModal  = useGameStore(state => state.showDeathModal);
  const prevDeathModal  = useRef(false);

  const G = useRef({
    player:       { x: 75*TILE, y: 75*TILE, attackCooldown: 0, invincible: false, invTimer: 0 },
    camera:       { x: 75*TILE, y: 75*TILE },
    enemies:      ENEMY_DEFS.map(makeEnemy),
    resources:    RESOURCE_DEFS.map(d => ({ ...d, depleted: false })),
    checkpoints:  CHECKPOINTS.map(c => ({ ...c, activated: false })),
    swordPicked:  false,
    floats:       [],
    npcMessage:   null,
    // ── Ability state ──────────────────────────────────
    abilityCooldown: 0,
    abilityEffect:   null,
    projectiles:     [],    // Power Shot ability projectiles
    basicArrows:     [],    // Bow basic attack arrows
    attackEffect:    null,  // brief visual on melee hit (hammer/sword)
    lastMoveDir:     { x: 1, y: 0 },
    // ── Input ─────────────────────────────────────────
    keys:         {},
    prevE:        false,
    prevSpace:    false,
    prevAbility:  false,
    regenTimer:   0,
    saveTimer:    0,
    W: 390, H: 844,
    _hintIndex: 0,
  }).current;

  const addFloat = (x, y, text, color = '#fff', big = false) => {
    G.floats.push({ x, y, text, color, life: big ? 1.5 : 1.2, vy: big ? -50 : -40, big });
  };

  // ── Kill enemy helper ────────────────────────────────────
  const killEnemy = (e, store) => {
    e.alive = false;
    const cfg       = EnemyConfig[e.type];
    const xpReward  = cfg?.xpReward || 10;
    store.gainXP(xpReward);
    addFloat(e.x, e.y - 50, `+${xpReward} XP`, '#9b59b6');

    cfg?.drops?.forEach(drop => {
      if (Math.random() < drop.chance) {
        resolveDropItem(drop, store, e.x, e.y - 36, addFloat);
      }
    });

    const respawnTime = cfg?.respawnTime || 0;
    if (respawnTime > 0) {
      setTimeout(() => {
        e.alive = true; e.hp = e.maxHp; e.state = 'patrol';
        e.x = e.originX; e.y = e.originY; e.stunTimer = 0; e.alerted = false;
      }, respawnTime);
    }
  };

  // ── Execute active ability ────────────────────────────────
  const executeAbility = (abilityId, store) => {
    const ability = AbilityConfig[abilityId];
    if (!ability) return;

    const p = G.player;
    G.abilityCooldown = ability.cooldown;
    store.recordAbilityFired(ability.cooldown);

    addFloat(p.x, p.y - 55, ability.name, '#d4af37', true);

    switch (ability.type) {
      // ── AOE: Whirlwind (sword) ────────────────────────────
      case 'aoe': {
        G.enemies.forEach(e => {
          if (!e.alive || dist(p.x, p.y, e.x, e.y) > ability.range) return;
          const dmg = Math.max(1, Math.round(store.playerATK * ability.damageMult));
          e.hp -= dmg;
          addFloat(e.x, e.y - 24, `-${dmg}`, '#ff4444');
          if (ability.stunDuration) e.stunTimer = ability.stunDuration;
          if (e.hp <= 0) killEnemy(e, store);
        });
        G.abilityEffect = {
          id: abilityId, x: p.x, y: p.y,
          maxRadius: ability.range, radius: 0,
          timer: 0.7, maxTimer: 0.7,
        };
        break;
      }

      // ── Projectile: Power Shot (bow) ──────────────────────
      case 'projectile': {
        // Aim at nearest enemy; fall back to last movement direction
        let targetX = p.x + G.lastMoveDir.x * 200;
        let targetY = p.y + G.lastMoveDir.y * 200;
        let nearestDist = Infinity;
        G.enemies.forEach(e => {
          if (!e.alive) return;
          const d = dist(p.x, p.y, e.x, e.y);
          if (d < nearestDist) { nearestDist = d; targetX = e.x; targetY = e.y; }
        });
        const angle = Math.atan2(targetY - p.y, targetX - p.x);
        G.projectiles.push({
          x: p.x, y: p.y,
          vx: Math.cos(angle) * 420,
          vy: Math.sin(angle) * 420,
          traveled: 0,
          maxRange: ability.range,
          dmg: Math.max(1, Math.round(store.playerATK * ability.damageMult)),
          hitEnemies: new Set(),
        });
        break;
      }

      // ── Multi-hit: Flurry (dagger) ────────────────────────
      case 'multi_hit': {
        G.abilityEffect = {
          id: abilityId, x: p.x, y: p.y,
          timer: 0.6, maxTimer: 0.6,
        };
        for (let i = 0; i < ability.hits; i++) {
          setTimeout(() => {
            const currentStore = useGameStore.getState();
            G.enemies.forEach(e => {
              if (!e.alive || dist(G.player.x, G.player.y, e.x, e.y) > ability.range) return;
              const dmg = Math.max(1, Math.round(currentStore.playerATK * ability.damageMult));
              e.hp -= dmg;
              addFloat(e.x, e.y - 20 - i * 8, `-${dmg}`, '#f39c12');
              if (e.hp <= 0) killEnemy(e, currentStore);
            });
          }, i * ability.hitDelay * 1000);
        }
        break;
      }

      // ── Elemental AOE: Arcane Burst (staff) ───────────────
      case 'elemental_aoe': {
        G.enemies.forEach(e => {
          if (!e.alive || dist(p.x, p.y, e.x, e.y) > ability.range) return;
          const dmg = Math.max(1, Math.round(store.playerATK * ability.damageMult));
          e.hp -= dmg;
          addFloat(e.x, e.y - 24, `-${dmg}`, '#9b59b6');
          if (e.hp <= 0) killEnemy(e, store);
        });
        G.abilityEffect = {
          id: abilityId, x: p.x, y: p.y,
          maxRadius: ability.range,
          timer: 0.8, maxTimer: 0.8,
        };
        break;
      }

      default: break;
    }
  };

  // ── Respawn via React effect ──────────────────────────────
  useEffect(() => {
    if (prevDeathModal.current && !showDeathModal) {
      const store    = useGameStore.getState();
      const respawnAt = store.respawnAt || store.lastCheckpoint || 'stronghold';
      const pos      = RESPAWN_POINTS[respawnAt] || RESPAWN_POINTS.stronghold;
      G.player.x = pos.x; G.player.y = pos.y;
      G.camera.x = pos.x; G.camera.y = pos.y;
      G.player.invincible = true; G.player.invTimer = 3.0;
      useGameStore.setState({ respawnAt: null });
    }
    prevDeathModal.current = showDeathModal;
  }, [showDeathModal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        canvas.width  = Math.round(rect.width  > 0 ? rect.width  : window.innerWidth);
        canvas.height = Math.round(rect.height > 0 ? rect.height : window.innerHeight);
        G.W = canvas.width; G.H = canvas.height;
      }, 50);
    };
    resize();
    window.addEventListener('resize', resize);

    const store = useGameStore.getState();
    if (store.position?.x) {
      const c = clampToWorld(store.position.x, store.position.y);
      G.player.x = c.x; G.player.y = c.y;
      G.camera.x = c.x; G.camera.y = c.y;
    }
    if (store.inventory.some(i => i.id === 'iron_sword')) G.swordPicked = true;

    const kd = e => { G.keys[e.code] = true; };
    const ku = e => { G.keys[e.code] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup',   ku);

    const ctx = canvas.getContext('2d');
    const loop = (ts) => {
      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = ts;
      if (dt > 0 && G.W > 100) { update(dt); render(ctx, G.W, G.H); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup',   ku);
      window.removeEventListener('resize',  resize);
    };
  }, []);

  function update(dt) {
    const store = useGameStore.getState();
    if (store.showDeathModal || store.gamePhase === 'stronghold') return;

    const p   = G.player;
    const cfg = EnemyConfig;

    if (G.npcMessage) { G.npcMessage.timer -= dt; if (G.npcMessage.timer <= 0) G.npcMessage = null; }
    if (G.abilityEffect) { G.abilityEffect.timer -= dt; if (G.abilityEffect.timer <= 0) G.abilityEffect = null; }
    if (G.abilityCooldown > 0) G.abilityCooldown = Math.max(0, G.abilityCooldown - dt);

    // ── Passive health regen ──────────────────────────────
    const inCombat = G.enemies.some(e => e.alive && e.state !== 'patrol' && e.state !== 'idle');
    if (!inCombat && store.playerHP < store.playerMaxHP) {
      G.regenTimer += dt;
      if (G.regenTimer >= 4) { G.regenTimer = 0; store.healPlayer(1); }
    } else { G.regenTimer = 0; }

    // ── Movement ──────────────────────────────────────────
    let vx = 0, vy = 0;
    if (G.keys['ArrowLeft']  || G.keys['KeyA']) vx -= 1;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) vx += 1;
    if (G.keys['ArrowUp']    || G.keys['KeyW']) vy -= 1;
    if (G.keys['ArrowDown']  || G.keys['KeyS']) vy += 1;
    if (InputState.joystick.active) { vx = InputState.joystick.x; vy = InputState.joystick.y; }
    if (vx !== 0 && vy !== 0) { const m = Math.sqrt(vx*vx+vy*vy); vx/=m; vy/=m; }
    if (vx !== 0 || vy !== 0) G.lastMoveDir = { x: vx, y: vy };

    const spd  = 150 + (store.playerSPD - 5) * 12;
    const next = clampToWorld(p.x + vx * spd * dt, p.y + vy * spd * dt);
    p.x = next.x; p.y = next.y;

    G.camera.x += (p.x - G.camera.x) * Math.min(1, 8 * dt);
    G.camera.y += (p.y - G.camera.y) * Math.min(1, 8 * dt);
    G.camera.x = Math.max(G.W/2, Math.min(WORLD_W - G.W/2, G.camera.x));
    G.camera.y = Math.max(G.H/2, Math.min(WORLD_H - G.H/2, G.camera.y));

    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.invincible) { p.invTimer -= dt; if (p.invTimer <= 0) p.invincible = false; }

    // ── Weapon type detection ──────────────────────────────
    const weaponInstanceId = store.gear?.weapon;
    const equippedWeapon   = weaponInstanceId
      ? store.inventory.find(i => i.instanceId === weaponInstanceId)
      : null;
    const weaponType = equippedWeapon?.type || 'sword';

    // Attack properties per weapon type
    const WEAPON_ATTACK = {
      sword:  { cooldown: 0.60, range: 52, aoe: false },
      hammer: { cooldown: 1.00, range: 66, aoe: true  },
      bow:    { cooldown: 0.70, range: 50, ranged: true },
      dagger: { cooldown: 0.32, range: 40, aoe: false },
      staff:  { cooldown: 0.65, range: 72, aoe: false },
    };
    const wAtk = WEAPON_ATTACK[weaponType] || WEAPON_ATTACK.sword;

    // ── Normal attack ─────────────────────────────────────
    const spaceNow  = G.keys['Space'] || InputState.attack;
    const spaceJust = spaceNow && !G.prevSpace;
    G.prevSpace = spaceNow;
    if (InputState.attack) InputState.attack = false;

    if (G.attackEffect) { G.attackEffect.timer -= dt; if (G.attackEffect.timer <= 0) G.attackEffect = null; }

    if (spaceJust && p.attackCooldown <= 0) {
      p.attackCooldown = wAtk.cooldown;

      if (wAtk.ranged) {
        // ── Bow: fire basic arrow ──────────────────────────
        let targetX = p.x + G.lastMoveDir.x * 150;
        let targetY = p.y + G.lastMoveDir.y * 150;
        let nearestDist = Infinity;
        G.enemies.forEach(e => {
          if (!e.alive) return;
          const d = dist(p.x, p.y, e.x, e.y);
          if (d < nearestDist) { nearestDist = d; targetX = e.x; targetY = e.y; }
        });
        const angle = Math.atan2(targetY - p.y, targetX - p.x);
        G.basicArrows.push({
          x: p.x, y: p.y,
          vx: Math.cos(angle) * 340,
          vy: Math.sin(angle) * 340,
          traveled: 0,
          maxRange: 200,
          dmg: Math.max(1, store.playerATK),
          hitEnemies: new Set(),
        });
      } else {
        // ── Melee attack (sword/hammer/dagger/staff) ───────
        let hitCount = 0;
        G.enemies.forEach(e => {
          if (!e.alive || dist(p.x, p.y, e.x, e.y) > wAtk.range) return;
          const dmg = Math.max(1, store.playerATK - cfg[e.type].def);
          e.hp -= dmg;
          addFloat(e.x, e.y - 20, `-${dmg}`, '#ff4444');
          hitCount++;
          if (e.hp <= 0) killEnemy(e, store);
        });

        // Attack effect visual
        if (hitCount > 0 || weaponType === 'hammer') {
          G.attackEffect = {
            x: p.x, y: p.y,
            type: weaponType,
            range: wAtk.range,
            timer: 0.3, maxTimer: 0.3,
          };
        }
      }
    }

    // ── Active ability ─────────────────────────────────────
    const abilityNow  = G.keys['KeyQ'] || InputState.ability;
    const abilityJust = abilityNow && !G.prevAbility;
    G.prevAbility = abilityNow;
    if (InputState.ability) InputState.ability = false;

    if (abilityJust && G.abilityCooldown <= 0 && store.equippedAbilityId) {
      executeAbility(store.equippedAbilityId, store);
    }

    // ── Update basic arrows (bow) ─────────────────────────
    G.basicArrows = G.basicArrows.filter(arrow => {
      arrow.x += arrow.vx * dt;
      arrow.y += arrow.vy * dt;
      arrow.traveled += Math.sqrt(arrow.vx*arrow.vx + arrow.vy*arrow.vy) * dt;
      G.enemies.forEach(e => {
        if (!e.alive || arrow.hitEnemies.has(e)) return;
        if (dist(arrow.x, arrow.y, e.x, e.y) > 18) return;
        arrow.hitEnemies.add(e);
        const dmg = Math.max(1, arrow.dmg - cfg[e.type].def);
        e.hp -= dmg;
        e.alerted = true; // permanently chase — patrol reset won't override
        addFloat(e.x, e.y - 20, `-${dmg}`, '#FCD34D');
        if (e.hp <= 0) killEnemy(e, store);
      });
      return arrow.traveled < arrow.maxRange &&
        arrow.x > 0 && arrow.x < WORLD_W && arrow.y > 0 && arrow.y < WORLD_H;
    });

    // ── Update Power Shot projectiles ─────────────────────
    G.projectiles = G.projectiles.filter(proj => {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.traveled += Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy) * dt;

      G.enemies.forEach(e => {
        if (!e.alive || proj.hitEnemies.has(e)) return;
        if (dist(proj.x, proj.y, e.x, e.y) > 22) return;
        proj.hitEnemies.add(e);
        e.hp -= proj.dmg;
        e.alerted = true; // permanently chase
        addFloat(e.x, e.y - 24, `-${proj.dmg}`, '#FCD34D');
        if (e.hp <= 0) killEnemy(e, store);
      });

      return proj.traveled < proj.maxRange &&
        proj.x > 0 && proj.x < WORLD_W && proj.y > 0 && proj.y < WORLD_H;
    });

    // ── Interact (E) ───────────────────────────────────────
    const eNow  = G.keys['KeyE'] || InputState.interact;
    const eJust = eNow && !G.prevE;
    G.prevE = eNow;
    if (InputState.interact) InputState.interact = false;

    if (eJust) {
      G.resources.forEach(r => {
        if (r.depleted || dist(p.x, p.y, r.x, r.y) > 48) return;
        store.addResource(r.res, r.amt);
        addFloat(r.x, r.y - 20, `+${r.amt} ${r.res}`, '#7ed321');
        r.depleted = true;
        setTimeout(() => { r.depleted = false; }, 30000);
      });

      G.checkpoints.forEach(cp => {
        if (dist(p.x, p.y, cp.x, cp.y) > 55) return;
        if (!cp.activated) { cp.activated = true; store.activateCheckpoint(cp.id); }
        addFloat(cp.x, cp.y - 30, '✓ Checkpoint saved!', '#f1c40f');
      });

      const hasSword = store.inventory.some(i => i.id === 'iron_sword');
      if (!G.swordPicked && !hasSword && dist(p.x, p.y, 77*TILE, 78*TILE) <= 44) {
        const item = {
          id: 'iron_sword', name: 'Iron Sword', slot: 'weapon',
          type: 'sword', tier: 'iron', rarity: 'common',
          atk: 6, abilityId: 'whirlwind',
          instanceId: `item_${Date.now()}_sword`,
        };
        if (store.addItem(item)) {
          G.swordPicked = true;
          store.equipItem(item);
          addFloat(27*TILE, 27*TILE - 30, '⚔ Iron Sword + Whirlwind!', '#bdc3c7');
        }
      } else if (hasSword) {
        G.swordPicked = true;
      }

      if (dist(p.x, p.y, 75*TILE, 100*TILE) <= 52) { store.setGamePhase('stronghold'); return; }

      if (dist(p.x, p.y, 105*TILE, 35*TILE) <= 52) {
        addFloat(p.x, p.y-40, '⚠ Entering Dungeon...', '#cc88ff');
        setTimeout(() => store.setGamePhase('dungeon'), 400);
        return;
      }

      // ── Boss temple step-on (no key needed, instant like stronghold) ──
      for (const temple of BOSS_TEMPLES) {
        if (dist(p.x, p.y, temple.x, temple.y) <= TILE * 2) {
          store.setCurrentRealm(temple.realm);
          store.setGamePhase('realm');
          return;
        }
      }

      if (dist(p.x, p.y, 72*TILE, 68*TILE) <= 60) {
        G.npcMessage = { text: NPC_HINTS[G._hintIndex % NPC_HINTS.length], timer: 5 };
        G._hintIndex++;
      }
    }

    // ── Enemy AI ───────────────────────────────────────────
    G.enemies.forEach(e => {
      if (!e.alive) return;

      // Stun check — skip AI entirely when stunned
      if (e.stunTimer > 0) {
        e.stunTimer -= dt;
        return;
      }

      const ecfg    = cfg[e.type];
      const d       = dist(p.x, p.y, e.x, e.y);
      const dOrigin = dist(e.x, e.y, e.originX, e.originY);
      e.attackTimer = Math.max(0, e.attackTimer - dt);

      if (d <= ecfg.attackRange) {
        e.state = 'attack';
        if (e.attackTimer <= 0 && !p.invincible) {
          e.attackTimer = ecfg.attackCooldown / 1000;
          const dmg = Math.max(1, ecfg.atk - store.playerDEF);
          store.takeDamage(dmg);
          p.invincible = true; p.invTimer = 0.8;
        }
      } else if (d <= ecfg.aggroRange || e.alerted) {
        // Chase if in range OR if already alerted (hit by ranged attack)
        e.state = 'aggro';
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(angle) * ecfg.speed * dt;
        e.y += Math.sin(angle) * ecfg.speed * dt;
      } else if (dOrigin > PATROL_RADIUS) {
        e.state = 'patrol';
        const homeAngle = Math.atan2(e.originY - e.y, e.originX - e.x);
        e.x += Math.cos(homeAngle) * ecfg.speed * 0.5 * dt;
        e.y += Math.sin(homeAngle) * ecfg.speed * 0.5 * dt;
      } else {
        e.state = 'patrol';
        e.patrolTimer += dt;
        if (e.patrolTimer > 2.2) { e.patrolDir *= -1; e.patrolTimer = 0; }
        e.x += ecfg.speed * 0.35 * e.patrolDir * dt;
      }
      const ec = clampToWorld(e.x, e.y);
      e.x = ec.x; e.y = ec.y;
    });

    G.floats = G.floats
      .map(f => ({ ...f, y: f.y + f.vy * dt, life: f.life - dt }))
      .filter(f => f.life > 0);

    G.saveTimer += dt;
    if (G.saveTimer > 5) {
      G.saveTimer = 0;
      useGameStore.setState({ position: { zone: 'world', x: p.x, y: p.y } });
    }
  }

  function render(ctx, W, H) {
    const p  = G.player;
    const cx = G.camera.x;
    const cy = G.camera.y;
    const wx = x => Math.round(x - cx + W / 2);
    const wy = y => Math.round(y - cy + H / 2);
    const onScreen = (sx, sy, pad = 50) =>
      sx > -pad && sx < W + pad && sy > -pad && sy < H + pad;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    // Tiles
    const txS = Math.max(0, Math.floor((cx - W/2) / TILE));
    const txE = Math.min(MAP_W, Math.ceil((cx + W/2) / TILE) + 1);
    const tyS = Math.max(0, Math.floor((cy - H/2) / TILE));
    const tyE = Math.min(MAP_H, Math.ceil((cy + H/2) / TILE) + 1);
    for (let ty = tyS; ty < tyE; ty++)
      for (let tx = txS; tx < txE; tx++) {
        ctx.fillStyle = tileColor(tx, ty);
        ctx.fillRect(wx(tx*TILE), wy(ty*TILE), TILE+1, TILE+1);
      }

    // Resources
    G.resources.forEach(r => {
      if (r.depleted) return;
      const sx = wx(r.x), sy = wy(r.y);
      if (!onScreen(sx, sy)) return;
      ctx.fillStyle = r.type === 'tree' ? '#27ae60' : r.type === 'rock' ? '#7f8c8d' : '#e67e22';
      ctx.beginPath(); ctx.arc(sx, sy, r.type === 'tree' ? 14 : 11, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffffffaa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(r.res, sx, sy + 24);
    });

    // Checkpoints
    G.checkpoints.forEach(cp => {
      const sx = wx(cp.x), sy = wy(cp.y);
      if (!onScreen(sx, sy)) return;
      ctx.globalAlpha = cp.activated ? 1 : 0.6 + Math.sin(Date.now() / 600) * 0.4;
      ctx.fillStyle   = cp.activated ? '#00ff88' : '#f1c40f';
      ctx.fillRect(sx-8, sy-18, 16, 26);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffffaa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(cp.activated ? 'SAVED' : 'SAVE', sx, sy + 28);
    });

    // Stronghold
    const shx = wx(25*TILE), shy = wy(44*TILE);
    if (onScreen(shx, shy, 80)) {
      ctx.globalAlpha = 0.75 + Math.sin(Date.now() / 700) * 0.25;
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(shx-24, shy-24, 48, 48);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000cc'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🏰 STRONGHOLD', shx, shy - 30);
      ctx.fillStyle = '#d4af37bb'; ctx.font = '9px sans-serif';
      ctx.fillText('[E] Enter', shx, shy + 36);
    }

    // Dungeon
    // ── Boss temple entrances ───────────────────────────────
    BOSS_TEMPLES.forEach(temple => {
      const tx2 = wx(temple.x), ty2 = wy(temple.y);
      if (!onScreen(tx2, ty2, 80)) return;
      const nearT = dist(p.x, p.y, temple.x, temple.y) < TILE*3.5;
      const pulse2 = 0.6 + Math.sin(Date.now()/800 + temple.x*0.1)*0.4;
      ctx.fillStyle = temple.color + '44';
      ctx.fillRect(tx2-TILE*1.5, ty2-TILE*1.5, TILE*3, TILE*3);
      ctx.strokeStyle = temple.color; ctx.lineWidth = 2;
      ctx.strokeRect(tx2-TILE*1.5, ty2-TILE*1.5, TILE*3, TILE*3);
      if (nearT) {
        ctx.globalAlpha = pulse2*0.25;
        ctx.fillStyle = temple.color;
        ctx.beginPath(); ctx.arc(tx2, ty2, TILE*2.5, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.font='18px sans-serif'; ctx.textAlign='center';
      ctx.fillText(temple.icon, tx2, ty2+7);
      ctx.fillStyle=temple.color; ctx.font='bold 8px sans-serif';
      ctx.fillText(temple.name.toUpperCase(), tx2, ty2-TILE-4);
      ctx.fillStyle='#ffffff77'; ctx.font='7px sans-serif';
      ctx.fillText('BOSS TEMPLE', tx2, ty2-TILE-14);
    });

    const dunx = wx(105*TILE), duny = wy(35*TILE);
    if (onScreen(dunx, duny, 80)) {
      ctx.fillStyle = '#8e44ad';
      ctx.fillRect(dunx-24, duny-24, 48, 48);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚠ DUNGEON', dunx, duny - 30);
      ctx.fillStyle = '#cc88ffaa'; ctx.font = '9px sans-serif';
      ctx.fillText('[E] Enter', dunx, duny + 36);
    }

    // ── God realm portals ──────────────────────────────────
    REALM_PORTALS.forEach(portal => {
      const prx = wx(portal.x*TILE), pry = wy(portal.y*TILE);
      if (!onScreen(prx, pry, 80)) return;

      const pulse     = 0.65 + Math.sin(Date.now()/700 + portal.x * 0.5) * 0.35;
      const nearPlayer = dist(p.x, p.y, portal.x*TILE, portal.y*TILE) < 64;

      // Outer glow ring
      ctx.globalAlpha = pulse * 0.25;
      ctx.fillStyle = portal.color;
      ctx.beginPath(); ctx.arc(prx, pry, 34, 0, Math.PI*2); ctx.fill();

      // Rotating ring
      ctx.globalAlpha = pulse * 0.6;
      ctx.strokeStyle = portal.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(prx, pry, 24, Date.now()/1000, Date.now()/1000 + Math.PI*1.4); ctx.stroke();

      // Inner circle
      ctx.globalAlpha = pulse;
      ctx.fillStyle = portal.color + '44';
      ctx.beginPath(); ctx.arc(prx, pry, 18, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;

      // Element icon
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(portal.icon, prx, pry + 6);

      // Realm name above
      ctx.fillStyle = portal.color;
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(portal.name.replace(' Realm','').toUpperCase(), prx, pry - 28);

      // Skull difficulty
      ctx.fillStyle = '#ffffff99'; ctx.font = '7px sans-serif';
      ctx.fillText('💀'.repeat(portal.skulls), prx, pry - 38);

      // Enter prompt when close
      if (nearPlayer) {
        ctx.fillStyle = portal.color; ctx.font = '9px sans-serif';
        ctx.fillText('[E] Enter', prx, pry + 32);
      }
    });

    // ── Zone labels ───────────────────────────────────────
    const zoneLabelAlpha = 0.25;
    [
      { text: 'NORTHERN FOREST',   wx: wx(35*TILE), wy: wy( 8*TILE) },
      { text: 'EASTERN REACHES',   wx: wx(62*TILE), wy: wy(25*TILE) },
      { text: 'SOUTHERN BADLANDS', wx: wx(30*TILE), wy: wy(58*TILE) },
      { text: 'DEEP SOUTH',        wx: wx(35*TILE), wy: wy(72*TILE) },
      { text: 'WESTERN VALLEY',    wx: wx( 8*TILE), wy: wy(45*TILE) },
    ].forEach(({ text, wx: lx, wy: ly }) => {
      if (!onScreen(lx, ly, 100)) return;
      ctx.globalAlpha = zoneLabelAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(text, lx, ly);
      ctx.globalAlpha = 1;
    });

    // NPC
    const nx = wx(72*TILE), ny = wy(68*TILE);
    if (onScreen(nx, ny)) {
      ctx.fillStyle = '#1abc9c'; ctx.beginPath(); ctx.arc(nx, ny, 14, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#1abc9c'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Elder Kael', nx, ny - 22);
      ctx.fillStyle = '#1abc9caa'; ctx.font = '9px sans-serif';
      ctx.fillText('[E] Talk', nx, ny + 26);
    }

    // Iron Sword pickup
    if (!G.swordPicked) {
      const isx = wx(27*TILE), isy = wy(27*TILE);
      if (onScreen(isx, isy)) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 400) * 0.5;
        ctx.fillStyle = '#bdc3c7'; ctx.fillRect(isx-5, isy-14, 10, 24);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#bdc3c7'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⚔ Iron Sword + Whirlwind', isx, isy - 22);
        ctx.fillStyle = '#bdc3c7aa'; ctx.font = '9px sans-serif';
        ctx.fillText('[E] Pick up', isx, isy + 24);
      }
    }

    // ── Ability effect rendering ───────────────────────────
    if (G.abilityEffect) {
      const fx = G.abilityEffect, px = wx(fx.x), py = wy(fx.y);
      const progress = 1 - (fx.timer / fx.maxTimer); // 0 → 1 as effect plays
      const alpha    = fx.timer / fx.maxTimer;        // 1 → 0 fading out
      const colors   = ABILITY_COLORS[fx.id] || { primary: '#fff', secondary: '#aaa' };

      ctx.globalAlpha = alpha * 0.85;

      if (fx.id === 'whirlwind') {
        // Expanding ring + rotating arcs
        const r = fx.maxRadius * progress;
        ctx.strokeStyle = colors.primary; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + progress * Math.PI * 4;
          ctx.strokeStyle = colors.secondary; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            px + Math.cos(a) * r * 0.5,
            py + Math.sin(a) * r * 0.5,
            r * 0.25, a + 0.5, a + 2.5,
          );
          ctx.stroke();
        }

      } else if (fx.id === 'ground_slam') {
        // Multiple shockwave rings
        for (let ring = 0; ring < 4; ring++) {
          const delay = ring * 0.12;
          const rProg = Math.max(0, progress - delay);
          const r = fx.maxRadius * rProg;
          if (r <= 0) continue;
          ctx.strokeStyle = ring === 0 ? colors.primary : colors.secondary;
          ctx.lineWidth = Math.max(1, 5 - ring * 1.2);
          ctx.globalAlpha = alpha * (1 - ring * 0.2) * 0.85;
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
        }
        // Center impact flash
        ctx.globalAlpha = (1 - progress) * alpha * 0.6;
        ctx.fillStyle = colors.primary;
        ctx.beginPath(); ctx.arc(px, py, 20 * (1 - progress), 0, Math.PI * 2); ctx.fill();

      } else if (fx.id === 'arcane_burst') {
        // Expanding star burst
        const r = fx.maxRadius * progress;
        ctx.strokeStyle = colors.primary; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
        // Star points
        for (let i = 0; i < 8; i++) {
          const a  = (i / 8) * Math.PI * 2 + progress * Math.PI;
          const sx = px + Math.cos(a) * r;
          const sy = py + Math.sin(a) * r;
          ctx.fillStyle = colors.secondary;
          ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
          // Spokes
          ctx.strokeStyle = colors.primary; ctx.lineWidth = 1.5;
          ctx.globalAlpha = alpha * 0.4;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
          ctx.globalAlpha = alpha * 0.85;
        }

      } else if (fx.id === 'flurry') {
        // Rapid slash marks radiating from player
        for (let i = 0; i < 8; i++) {
          const a  = (i / 8) * Math.PI * 2 + progress * Math.PI * 2;
          const r1 = 20 + progress * 30;
          const r2 = r1 + 20;
          ctx.strokeStyle = i % 2 === 0 ? colors.primary : colors.secondary;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1);
          ctx.lineTo(px + Math.cos(a) * r2, py + Math.sin(a) * r2);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    }

    // ── Power Shot projectiles ─────────────────────────────
    G.projectiles.forEach(proj => {
      const px = wx(proj.x), py = wy(proj.y);
      if (!onScreen(px, py)) return;
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#FCD34D'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - (proj.vx/420)*22, py - (proj.vy/420)*22);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#F97316';
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FCD34D';
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2); ctx.fill();
    });

    // Basic arrows (bow normal attack)
    G.basicArrows.forEach(arrow => {
      const ax = wx(arrow.x), ay = wy(arrow.y);
      if (!onScreen(ax, ay)) return;
      const angle = Math.atan2(arrow.vy, arrow.vx);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ax - Math.cos(angle)*12, ay - Math.sin(angle)*12);
      ctx.lineTo(ax + Math.cos(angle)*6,  ay + Math.sin(angle)*6);
      ctx.stroke();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(ax+Math.cos(angle)*6, ay+Math.sin(angle)*6, 3, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Melee attack effect
    if (G.attackEffect) {
      const ae = G.attackEffect;
      const ax = wx(ae.x), ay = wy(ae.y);
      const alpha = ae.timer / ae.maxTimer;
      const prog  = 1 - alpha;
      ctx.globalAlpha = alpha * 0.7;
      if (ae.type === 'hammer') {
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(ax, ay, ae.range*prog, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#e67e22';
        ctx.beginPath(); ctx.arc(ax, ay, 18*(1-prog), 0, Math.PI*2); ctx.fill();
      } else if (ae.type === 'dagger') {
        for (let i = 0; i < 4; i++) {
          const a = (i/4)*Math.PI*2 + prog*Math.PI;
          ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ax+Math.cos(a)*10, ay+Math.sin(a)*10);
          ctx.lineTo(ax+Math.cos(a)*(ae.range*0.7), ay+Math.sin(a)*(ae.range*0.7));
          ctx.stroke();
        }
      } else if (ae.type === 'staff') {
        ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ax, ay, ae.range*0.6*prog, 0, Math.PI*2); ctx.stroke();
      } else {
        ctx.strokeStyle = '#4a90e2'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ax, ay, ae.range*0.7, -0.5, Math.PI*0.4); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1;

    // Enemies
    G.enemies.forEach(e => {
      if (!e.alive) return;
      const ex = wx(e.x), ey = wy(e.y);
      if (!onScreen(ex, ey)) return;

      const cfg     = EnemyConfig[e.type];
      const isGolem = e.type === 'golem' || e.type === 'stone_guardian';
      const r       = isGolem ? (e.isElite ? 22 : 18) : (e.isElite ? 15 : 12);
      const aggroed = e.state !== 'patrol';
      const stunned = e.stunTimer > 0;

      // Elite glow ring
      if (e.isElite && !stunned) {
        const glowColor = e.type === 'gold_goblin'    ? '#f1c40f'
                        : e.type === 'stone_guardian' ? '#8e44ad'
                        : '#fff';
        ctx.globalAlpha = 0.35 + Math.sin(Date.now() / 400) * 0.15;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth   = 4;
        ctx.beginPath(); ctx.arc(ex, ey, r + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Body
      ctx.globalAlpha = stunned ? (Math.sin(Date.now() / 80) > 0 ? 0.4 : 1) : 1;

      // Elite tint colors
      let fillColor;
      if      (e.type === 'gold_goblin')    fillColor = aggroed ? '#e6a800' : '#f1c40f';
      else if (e.type === 'stone_guardian') fillColor = aggroed ? '#5d3a7a' : '#8e44ad'; // purple
      else if (stunned)                     fillColor = '#FCD34D';
      else if (aggroed)                     fillColor = '#e74c3c';
      else if (isGolem)                     fillColor = aggroed ? '#5d4037' : '#795548'; // stone brown
      else                                  fillColor = '#7ed321'; // goblin green

      ctx.fillStyle = fillColor;
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();

      const strokeColor = stunned ? '#FCD34D'
                        : e.isElite ? (e.type === 'gold_goblin' ? '#ffd700' : '#c39bd3')
                        : '#fff';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth   = e.isElite ? 2.5 : 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Stun stars
      if (stunned) {
        ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('💫', ex, ey - r - 8);
      }

      // HP bar + name + elite stars
      if (aggroed && !stunned) {
        const bw = e.isElite ? 48 : 36;

        // HP bar background
        ctx.fillStyle = '#333';
        ctx.fillRect(ex - bw/2, ey - r - 10, bw, 5);

        // HP bar fill — gold for elites
        ctx.fillStyle = e.isElite ? '#f1c40f' : '#e74c3c';
        ctx.fillRect(ex - bw/2, ey - r - 10, bw * (e.hp / e.maxHp), 5);

        // Name
        ctx.fillStyle = e.isElite ? '#ffd700' : '#fff';
        ctx.font = `bold ${e.isElite ? 10 : 9}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(cfg.name || e.type, ex, ey - r - 14);

        // Elite stars
        if (e.eliteStars > 0) {
          const stars = '⭐'.repeat(e.eliteStars);
          ctx.font = '8px sans-serif';
          ctx.fillText(stars, ex, ey - r - 24);
        }
      } else if (e.isElite && !aggroed) {
        // Show elite indicator even when patrolling
        ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = e.type === 'gold_goblin' ? '#ffd700aa' : '#c39bd3aa';
        ctx.fillText('⭐'.repeat(e.eliteStars), ex, ey - r - 8);
      }
    });

    // Player
    const ppx = wx(p.x), ppy = wy(p.y);
    const blinkOn = !p.invincible || Math.sin(Date.now() / 80) > 0;
    ctx.globalAlpha = blinkOn ? 1 : 0.15;
    ctx.fillStyle = '#4a90e2';
    ctx.beginPath(); ctx.arc(ppx, ppy, 14, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = p.invincible ? '#ffffff' : '#aaaaaa';
    ctx.lineWidth = p.invincible ? 3 : 2; ctx.stroke();
    ctx.globalAlpha = 1;

    // Float texts
    G.floats.forEach(f => {
      const fx = wx(f.x), fy = wy(f.y);
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = `bold ${f.big ? 16 : 14}px sans-serif`; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(f.text, fx, fy);
      ctx.fillStyle = f.color; ctx.fillText(f.text, fx, fy);
    });
    ctx.globalAlpha = 1;

    // NPC dialogue box — above controls
    if (G.npcMessage) {
      const msg    = G.npcMessage;
      const alpha  = Math.min(1, msg.timer * 1.5);
      const pad    = 16, boxH = 90, boxY = H - boxH - 260, boxW = W - pad * 2;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#000000ee';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pad, boxY, boxW, boxH, 10);
      else ctx.rect(pad, boxY, boxW, boxH);
      ctx.fill();
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pad, boxY, boxW, boxH, 10);
      else ctx.rect(pad, boxY, boxW, boxH);
      ctx.stroke();
      ctx.fillStyle = '#1abc9c'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('Elder Kael', pad + 12, boxY + 20);
      ctx.fillStyle = '#ffffff'; ctx.font = '12px sans-serif';
      wrapText(ctx, msg.text, pad + 12, boxY + 40, boxW - 24, 17);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
  }

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', top: 0, left: 0,
      width: '100%', height: '100%', display: 'block',
      touchAction: 'none', userSelect: 'none',
      WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
    }} />
  );
}
