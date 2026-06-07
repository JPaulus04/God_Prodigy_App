// GP_WORLD_PASS7
import React, { useEffect, useRef } from 'react';
import { useGameStore }  from '../store/useGameStore';
import { InputState }    from '../game/systems/InputState';
import { EnemyConfig }   from '../game/config/EnemyConfig';
import { AbilityConfig } from '../game/config/AbilityConfig';
import { hapticAttack, hapticHit, hapticCheckpoint, hapticCollect } from '../utils/haptics';

const TILE = 32;

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

const MAP_W   = 120;
const MAP_H   = 120;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const BORDER  = TILE * 4;

const RESPAWN_POINTS = {
  stronghold:   { x: 25*TILE, y: 42*TILE },
  cp_center:    { x: 25*TILE, y: 25*TILE },
  cp_forest:    { x: 15*TILE, y: 10*TILE },
  cp_east:      { x: 40*TILE, y: 18*TILE },
  cp_south:     { x: 25*TILE, y: 60*TILE },
  cp_far_east:  { x: 65*TILE, y: 30*TILE },
  cp_deep_east: { x: 95*TILE, y: 25*TILE },
  cp_far_south: { x: 55*TILE, y: 95*TILE },
  cp_void_gate: { x:105*TILE, y: 80*TILE },
};

const CHECKPOINTS = [
  { id: 'cp_center',    x: 25*TILE, y: 25*TILE },
  { id: 'cp_forest',    x: 15*TILE, y: 10*TILE },
  { id: 'cp_east',      x: 40*TILE, y: 18*TILE },
  { id: 'cp_south',     x: 25*TILE, y: 60*TILE },
  { id: 'cp_far_east',  x: 65*TILE, y: 30*TILE },
  { id: 'cp_deep_east', x: 95*TILE, y: 25*TILE },
  { id: 'cp_far_south', x: 55*TILE, y: 95*TILE },
  { id: 'cp_void_gate', x:105*TILE, y: 80*TILE },
];

// ── Obstacle clusters ─────────────────────────────────────────────────────
// Each cluster blocks movement. Radius in tiles.
const OBSTACLE_CLUSTERS = [
  { type: 'trees', cx: 20, cy: 18, r: 3 },
  { type: 'trees', cx: 30, cy: 16, r: 2 },
  { type: 'trees', cx: 38, cy: 17, r: 2 },
  { type: 'rocks', cx: 47, cy: 20, r: 3 },
  { type: 'rocks', cx: 47, cy: 32, r: 2 },
  { type: 'rocks', cx: 47, cy: 44, r: 2 },
  { type: 'rocks', cx: 18, cy: 58, r: 2 },
  { type: 'rocks', cx: 30, cy: 64, r: 2 },
  { type: 'rocks', cx: 44, cy: 60, r: 3 },
  { type: 'trees', cx: 11, cy: 40, r: 2 },
  { type: 'trees', cx: 11, cy: 52, r: 2 },
  { type: 'rocks', cx: 82, cy: 18, r: 3 },
  { type: 'rocks', cx: 82, cy: 35, r: 2 },
  { type: 'rocks', cx: 88, cy: 65, r: 3 },
  { type: 'rocks', cx:100, cy: 45, r: 3 },
  { type: 'rocks', cx:108, cy: 78, r: 4 },
];

function isObstacle(wx, wy) {
  const tx = wx / TILE;
  const ty = wy / TILE;
  for (const c of OBSTACLE_CLUSTERS) {
    const dx = tx - c.cx, dy = ty - c.cy;
    if (dx*dx + dy*dy < (c.r * 0.7) * (c.r * 0.7)) return true;
  }
  return false;
}

// ── Landmark definitions ──────────────────────────────────────────────────
const LANDMARK_DEFS = [
  { type: 'ruins',         x: 28, y: 15, label: 'Ancient Ruins'   },
  { type: 'goblin_camp',   x: 12, y: 14, label: 'Goblin Camp'     },
  { type: 'stone_circle',  x: 55, y: 28, label: 'Stone Circle'    },
  { type: 'lava_vents',    x: 32, y: 75, label: 'Lava Vents'      },
  { type: 'shrine',        x:  8, y: 48, label: 'Forgotten Shrine'},
  { type: 'crystal_spire', x: 86, y: 20, label: 'Crystal Spire'   },
  { type: 'void_gate',     x:107, y: 82, label: 'Void Gate'       },
  { type: 'ice_fortress',  x: 62, y: 10, label: 'Ice Fortress'    },
];

// Simple deterministic noise for tile variation
function tileHash(tx, ty) {
  let h = (tx * 2654435761 ^ ty * 2246822519) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

function tileColor(tx, ty) {
  if (tx < 2 || tx >= MAP_W-2 || ty < 2 || ty >= MAP_H-2) return '#1a6fa8';
  // Expanded zones
  if (tx >= 95 && ty >= 75) return '#100d14';
  if (tx >= 90 && ty >= 50 && ty < 80) return '#1e1820';
  if (tx >= 80 && ty < 50) return '#4a4258';
  if (tx >= 80 && ty >= 50 && tx < 90) return '#1e3050';
  if (tx >= 80 && ty >= 80) return '#18141e';
  // Original zones — with tile variation
  const h = tileHash(tx, ty);
  if (ty < 8  && tx > 10 && tx < 75) return h < 0.3 ? '#0e3620' : h > 0.7 ? '#134428' : '#0f3d22';
  if (ty < 18 && tx > 4  && tx < 80) return h < 0.3 ? '#175230' : h > 0.7 ? '#1f6a3e' : '#1a5c35';
  if (tx > 60 && ty > 8  && ty < 45) return h < 0.3 ? '#32261e' : h > 0.7 ? '#44342a' : '#3a2e24';
  if (tx > 46 && ty > 8  && ty < 55) return h < 0.3 ? '#40342a' : h > 0.7 ? '#564840' : '#4a3e32';
  if (ty > 72 && tx > 4 && tx < 80 && ((tx + ty) % 7 < 2)) return '#4a0a00';
  if (ty > 68 && tx > 4 && tx < 80) return h < 0.3 ? '#220e06' : h > 0.7 ? '#32160a' : '#2a1208';
  if (ty > 54 && tx > 4 && tx < 52) return h < 0.3 ? '#5e4026' : h > 0.7 ? '#7a5636' : '#6b4a2e';
  if (tx < 7  && ty > 35 && ty < 65) return h < 0.3 ? '#0d2310' : h > 0.7 ? '#122e18' : '#0f2814';
  if (tx < 12 && ty > 25 && ty < 80) return h < 0.3 ? '#163418' : h > 0.7 ? '#1e4624' : '#1a3d20';
  if (tx === 25 || tx === 26) return '#8a6a4a';
  if (ty === 25 || ty === 26) return '#8a6a4a';
  if (tx === 50 || ty === 55) return '#7a5a3a';
  if (tx === 78 || tx === 79) return '#6a5070';
  const base = h < 0.25 ? '#276038' : h > 0.75 ? '#348a4a' : '#2d6a3f';
  return base;
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

const RESOURCE_DEFS = [
  // ── Original zones ─────────────────────────────────────────────────────
  { type: 'tree',          res: 'wood',       amt: 2, x:  8*TILE, y:  7*TILE },
  { type: 'tree',          res: 'wood',       amt: 2, x: 12*TILE, y:  9*TILE },
  { type: 'tree',          res: 'wood',       amt: 2, x: 16*TILE, y:  6*TILE },
  { type: 'tree',          res: 'wood',       amt: 2, x: 20*TILE, y:  8*TILE },
  { type: 'tree',          res: 'wood',       amt: 2, x: 24*TILE, y: 11*TILE },
  { type: 'tree',          res: 'wood',       amt: 2, x: 30*TILE, y:  7*TILE },
  { type: 'rock',          res: 'stone',      amt: 2, x: 14*TILE, y: 22*TILE },
  { type: 'rock',          res: 'stone',      amt: 2, x: 20*TILE, y: 38*TILE },
  { type: 'rock',          res: 'stone',      amt: 2, x: 10*TILE, y: 30*TILE },
  { type: 'rock',          res: 'stone',      amt: 2, x: 32*TILE, y: 40*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 1, x: 37*TILE, y: 16*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 1, x: 41*TILE, y: 24*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 1, x: 38*TILE, y: 34*TILE },
  { type: 'tree',          res: 'wood',       amt: 3, x: 35*TILE, y:  5*TILE },
  { type: 'tree',          res: 'wood',       amt: 3, x: 45*TILE, y:  8*TILE },
  { type: 'tree',          res: 'wood',       amt: 3, x: 55*TILE, y:  6*TILE },
  { type: 'tree',          res: 'wood',       amt: 2, x: 65*TILE, y: 10*TILE },
  { type: 'tree',          res: 'wood',       amt: 2, x: 72*TILE, y:  7*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 52*TILE, y: 20*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 60*TILE, y: 35*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 68*TILE, y: 22*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 74*TILE, y: 40*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 2, x: 55*TILE, y: 30*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 2, x: 63*TILE, y: 45*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 3, x: 70*TILE, y: 28*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 18*TILE, y: 60*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 35*TILE, y: 62*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 45*TILE, y: 58*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 2, x: 22*TILE, y: 65*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 3, x: 40*TILE, y: 70*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 3, x: 30*TILE, y: 72*TILE },
  { type: 'tree',          res: 'wood',       amt: 3, x:  6*TILE, y: 35*TILE },
  { type: 'tree',          res: 'wood',       amt: 3, x:  8*TILE, y: 48*TILE },
  { type: 'tree',          res: 'wood',       amt: 3, x:  7*TILE, y: 60*TILE },
  { type: 'rock',          res: 'stone',      amt: 2, x: 10*TILE, y: 40*TILE },
  // ── Expanded zones (80–119) ────────────────────────────────────────────
  { type: 'ore_node',      res: 'ore',        amt: 3, x: 84*TILE, y: 12*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 4, x: 90*TILE, y: 20*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 4, x: 88*TILE, y: 32*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 3, x: 97*TILE, y: 18*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 85*TILE, y: 40*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 93*TILE, y: 35*TILE },
  { type: 'tree',          res: 'wood',       amt: 2, x: 83*TILE, y: 55*TILE },
  { type: 'tree',          res: 'wood',       amt: 2, x: 87*TILE, y: 62*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x: 95*TILE, y: 58*TILE },
  { type: 'rock',          res: 'stone',      amt: 3, x:102*TILE, y: 65*TILE },
  { type: 'ore_node',      res: 'ore',        amt: 4, x: 98*TILE, y: 70*TILE },
  { type: 'fire_shard_node', res: 'fire_shard', amt: 1, x:104*TILE, y: 78*TILE },
  { type: 'fire_shard_node', res: 'fire_shard', amt: 1, x:112*TILE, y: 88*TILE },
  { type: 'fire_shard_node', res: 'fire_shard', amt: 1, x:108*TILE, y: 95*TILE },
];

const ENEMY_DEFS = [
  // ── Northern forest ────────────────────────────────────────────────────
  { type: 'goblin',         x: 12*TILE, y: 18*TILE },
  { type: 'goblin',         x: 18*TILE, y: 15*TILE },
  { type: 'goblin',         x: 22*TILE, y: 20*TILE },
  { type: 'goblin',         x:  8*TILE, y: 22*TILE },
  { type: 'gold_goblin',    x: 10*TILE, y:  8*TILE },
  { type: 'gold_goblin',    x: 26*TILE, y: 12*TILE },
  { type: 'goblin',         x: 35*TILE, y: 12*TILE },
  { type: 'goblin',         x: 48*TILE, y:  9*TILE },
  { type: 'goblin',         x: 58*TILE, y: 14*TILE },
  { type: 'goblin',         x: 68*TILE, y:  8*TILE },
  { type: 'gold_goblin',    x: 55*TILE, y:  8*TILE },
  { type: 'gold_goblin',    x: 72*TILE, y: 12*TILE },
  // ── Eastern rocky zone ────────────────────────────────────────────────
  { type: 'golem',          x: 38*TILE, y: 20*TILE },
  { type: 'golem',          x: 42*TILE, y: 30*TILE },
  { type: 'stone_guardian', x: 42*TILE, y: 14*TILE },
  { type: 'stone_guardian', x: 45*TILE, y: 35*TILE },
  { type: 'golem',          x: 52*TILE, y: 22*TILE },
  { type: 'golem',          x: 60*TILE, y: 32*TILE },
  { type: 'golem',          x: 68*TILE, y: 45*TILE },
  { type: 'golem',          x: 74*TILE, y: 30*TILE },
  { type: 'stone_guardian', x: 65*TILE, y: 40*TILE },
  // ── Southern badlands ─────────────────────────────────────────────────
  { type: 'goblin',         x: 18*TILE, y: 58*TILE },
  { type: 'goblin',         x: 35*TILE, y: 62*TILE },
  { type: 'goblin',         x: 48*TILE, y: 56*TILE },
  { type: 'golem',          x: 28*TILE, y: 68*TILE },
  { type: 'golem',          x: 42*TILE, y: 70*TILE },
  { type: 'golem',          x: 20*TILE, y: 72*TILE },
  { type: 'golem',          x: 38*TILE, y: 74*TILE },
  { type: 'stone_guardian', x: 30*TILE, y: 68*TILE },
  // ── Western wetlands ──────────────────────────────────────────────────
  { type: 'goblin',         x:  8*TILE, y: 38*TILE },
  { type: 'goblin',         x:  6*TILE, y: 52*TILE },
  // ── Mid-map ────────────────────────────────────────────────────────────
  { type: 'goblin',         x: 32*TILE, y: 18*TILE },
  { type: 'goblin',         x: 28*TILE, y: 14*TILE },
  { type: 'golem',          x: 48*TILE, y: 40*TILE },
  { type: 'goblin',         x: 15*TILE, y: 48*TILE },
  { type: 'goblin',         x: 40*TILE, y: 48*TILE },
  // ── Portal guards (original) ───────────────────────────────────────────
  { type: 'goblin',         x: 13*TILE, y: 10*TILE },
  { type: 'goblin',         x: 16*TILE, y: 14*TILE },
  { type: 'gold_goblin',    x: 14*TILE, y:  6*TILE },
  { type: 'goblin',         x:  7*TILE, y: 35*TILE },
  { type: 'goblin',         x:  9*TILE, y: 42*TILE },
  { type: 'golem',          x: 50*TILE, y: 25*TILE },
  { type: 'stone_guardian', x: 50*TILE, y: 20*TILE },
  { type: 'goblin',         x: 65*TILE, y:  6*TILE },
  { type: 'stone_guardian', x: 67*TILE, y:  5*TILE },
  { type: 'goblin',         x:  5*TILE, y: 55*TILE },
  { type: 'goblin',         x:  6*TILE, y: 63*TILE },
  { type: 'golem',          x: 70*TILE, y: 40*TILE },
  { type: 'stone_guardian', x: 73*TILE, y: 35*TILE },
  { type: 'golem',          x: 22*TILE, y: 72*TILE },
  { type: 'stone_guardian', x: 28*TILE, y: 73*TILE },
  { type: 'golem',          x: 53*TILE, y: 70*TILE },
  { type: 'stone_guardian', x: 55*TILE, y: 70*TILE },
  { type: 'golem',          x: 70*TILE, y: 62*TILE },
  { type: 'stone_guardian', x: 73*TILE, y: 68*TILE },
  // ── Expanded zones (80–119) ────────────────────────────────────────────
  { type: 'golem',          x: 84*TILE, y: 10*TILE },
  { type: 'golem',          x: 88*TILE, y: 25*TILE },
  { type: 'stone_guardian', x: 92*TILE, y: 15*TILE },
  { type: 'stone_guardian', x: 96*TILE, y: 28*TILE },
  { type: 'stone_guardian', x: 90*TILE, y: 40*TILE },
  { type: 'goblin',         x: 83*TILE, y: 52*TILE },
  { type: 'goblin',         x: 87*TILE, y: 58*TILE },
  { type: 'gold_goblin',    x: 85*TILE, y: 65*TILE },
  { type: 'gold_goblin',    x: 89*TILE, y: 72*TILE },
  { type: 'golem',          x: 94*TILE, y: 55*TILE },
  { type: 'golem',          x: 98*TILE, y: 62*TILE },
  { type: 'stone_guardian', x:102*TILE, y: 58*TILE },
  { type: 'stone_guardian', x:100*TILE, y: 72*TILE },
  { type: 'stone_guardian', x:106*TILE, y: 75*TILE },
  { type: 'gold_goblin',    x:103*TILE, y: 82*TILE },
  { type: 'stone_guardian', x:110*TILE, y: 80*TILE },
  { type: 'stone_guardian', x:112*TILE, y: 90*TILE },
  // Expanded portal guards
  { type: 'stone_guardian', x: 93*TILE, y: 12*TILE },
  { type: 'golem',          x: 97*TILE, y: 10*TILE },
  { type: 'stone_guardian', x: 98*TILE, y: 52*TILE },
  { type: 'stone_guardian', x:102*TILE, y: 50*TILE },
  { type: 'stone_guardian', x:108*TILE, y: 82*TILE },
  { type: 'stone_guardian', x:112*TILE, y: 86*TILE },
  // ── Fire / Lava Badlands (ty>68, tx 5-79) — spread across full zone ──
  { type: 'golem',          x:  8*TILE, y: 74*TILE },
  { type: 'golem',          x: 14*TILE, y: 80*TILE },
  { type: 'golem',          x: 20*TILE, y: 76*TILE },
  { type: 'golem',          x: 26*TILE, y: 84*TILE },
  { type: 'golem',          x: 33*TILE, y: 78*TILE },
  { type: 'golem',          x: 40*TILE, y: 86*TILE },
  { type: 'golem',          x: 48*TILE, y: 80*TILE },
  { type: 'golem',          x: 56*TILE, y: 90*TILE },
  { type: 'golem',          x: 64*TILE, y: 84*TILE },
  { type: 'golem',          x: 72*TILE, y: 76*TILE },
  { type: 'stone_guardian', x: 10*TILE, y: 90*TILE },
  { type: 'stone_guardian', x: 18*TILE, y: 96*TILE },
  { type: 'stone_guardian', x: 28*TILE, y: 92*TILE },
  { type: 'stone_guardian', x: 36*TILE, y: 98*TILE },
  { type: 'stone_guardian', x: 44*TILE, y: 94*TILE },
  { type: 'stone_guardian', x: 52*TILE, y:100*TILE },
  { type: 'stone_guardian', x: 60*TILE, y: 96*TILE },
  { type: 'stone_guardian', x: 70*TILE, y: 88*TILE },
  { type: 'gold_goblin',    x: 16*TILE, y: 86*TILE },
  { type: 'gold_goblin',    x: 38*TILE, y: 90*TILE },
  { type: 'gold_goblin',    x: 58*TILE, y: 84*TILE },
  { type: 'golem',          x:  6*TILE, y:102*TILE },
  { type: 'golem',          x: 22*TILE, y:108*TILE },
  { type: 'golem',          x: 46*TILE, y:106*TILE },
  { type: 'stone_guardian', x: 34*TILE, y:112*TILE },
  { type: 'stone_guardian', x: 62*TILE, y:108*TILE },
  { type: 'gold_goblin',    x: 50*TILE, y:112*TILE },
];

const PATROL_RADIUS = 80;

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
  'The eastern highlands hold ancient crystal formations. Dangerous stone guardians guard them.',
  'Beyond the rocky ridge lies the Ashen Wastes. Few return.',
  'The Void Gate is said to be the final challenge. Ten gods must fall before it opens.',
  'New checkpoints await in the deep east. Plant your flag before venturing to the void.',
];

// Per-NPC dialogue lines — id → array of hints (cycled)
const NPC_DIALOGUE = {
  kael: [
    "Welcome to Kaelford, traveler. Ten elemental gods rule this realm — you must defeat them all to ascend.",
    "The portals scattered across the land each lead to a god's domain. Beware their power.",
    "Ascension is no mere feat. Upgrade your gear at the Forge before challenging the higher gods.",
    "I have seen many warriors pass through this gate. Few have returned from the Void.",
    "The fire badlands to the south burn eternal. The Lava God is said to sleep there.",
  ],
  smith: [
    "You'll need a strong weapon for the gods ahead. Bring me ore from the golems — I'll forge you something worthy.",
    "Golems in the eastern highlands drop quality ore. Stone guardians drop even rarer materials.",
    "Don't forget to equip what you forge. An unequipped blade is just dead weight.",
    "The fire shards from the south can temper blades to cut through divine armor.",
    "I once tried the Fire Realm myself. My hammer melted in that heat. Be prepared.",
  ],
  merch: [
    "Psst — gold goblins drop special charms. Worth hunting them down if you find one.",
    "Resources sell for a tidy sum at the right market. I accept trades... if the price is right.",
    "The western wetlands have ancient trees — finest wood I've ever seen. Great for crafting.",
    "Crystal formations in the deep east are worth the danger. Beautiful, and powerful.",
    "I heard the Shadow Realm boss leaves a mark on all who face it. Not many walk away.",
  ],
  heal: [
    "Stay near checkpoints when you're low on health. Rest there — your body recovers faster.",
    "Each god realm drains your spirit. Heal before you enter a new portal.",
    "The regen between fights is slow. Don't rush the next battle when you're still wounded.",
    "Eastern golems hit hard. Defense upgrades from the Forge will save your life.",
    "I've treated wounds from the Void Realm. They do not heal easily. Train your DEF stat.",
  ],
  guard1: [
    "Stay on the paths. The wilderness beyond Kaelford is not friendly to the unprepared.",
    "We've had goblin raids from the northern woods lately. Watch your back out there.",
    "The realm portals glow brighter when a god has been defeated. At least, that's what I heard.",
    "Checkpoint flags are your lifeline out there. Never venture far without activating one.",
  ],
  guard2: [
    "I heard something massive stirs in the deep south. The ground trembles sometimes at night.",
    "Don't trust the shadows in the eastern wastes. Things move in them that don't belong here.",
    "Ten gods. Ten seals. One warrior. Good luck — you'll need it.",
    "The village is safe behind these walls. Out there? That's another story.",
  ],
  vil1: [
    "I once tried picking up that old sword near the northern checkpoint. It burned my hand!",
    "Renn the wanderer, at your service. I walk these streets and know all the gossip.",
    "Heard the Ice Fortress to the northeast is actually a god's outer sanctum. Chilling thought.",
    "You look like you've been in a few scraps. The Forge is east — Aldric will fix you up.",
  ],
  vil2: [
    "Lysa here. I stay seated because standing gets you recruited for dangerous quests.",
    "The stone circle to the east hums with energy at midnight. I don't go near it.",
    "My uncle tried the Ocean Realm once. He came back... wetter than usual.",
    "Did you activate the checkpoint near the village? You really should.",
  ],
  vil3: [
    "Torv's the name. I've counted those portal glows — there are more than ten, you know.",
    "Something in the void approach makes animals flee. Even the golems seem nervous.",
    "The lava vents south of here... they weren't there last season. Something woke them.",
    "Goblin Camp to the northwest keeps growing. Elder Kael says to ignore them. I disagree.",
  ],
};

function makeEnemy(def) {
  const cfg = EnemyConfig[def.type];
  return {
    type: def.type, x: def.x, y: def.y,
    originX: def.x, originY: def.y,
    hp: cfg.hp, maxHp: cfg.hp,
    state: 'patrol', alive: true,
    attackTimer: 0, patrolDir: 1, patrolTimer: 0,
    stunTimer: 0,
    isElite:    cfg.isElite    || false,
    isBoss:     cfg.isBoss     || false,
    eliteStars: cfg.eliteStars || 0,
  };
}

function clampToWorld(x, y) {
  return {
    x: Math.max(BORDER, Math.min(WORLD_W - BORDER, x)),
    y: Math.max(BORDER, Math.min(WORLD_H - BORDER, y)),
  };
}

function resolveDropItem(drop, store, floatX, floatY, addFloat) {
  const RESOURCE_TYPES = ['wood', 'stone', 'ore', 'fire_shard', 'goblin_tooth'];
  if (RESOURCE_TYPES.includes(drop.item)) {
    store.addResource(drop.item, drop.amount);
    addFloat(floatX, floatY, `+${drop.amount} ${drop.item}`, '#7ed321');
    return;
  }
  if (drop.item === 'hunters_charm') {
    const item = { id: 'hunters_charm', name: "Hunter's Charm", slot: 'accessory', rarity: 'rare', atk: 4, spd: 1, instanceId: `item_${Date.now()}_hunters_charm` };
    if (store.addItem(item)) addFloat(floatX, floatY - 16, "🎯 Hunter's Charm!", '#3498db');
    return;
  }
  if (drop.item === 'shadow_armor') {
    const item = { id: 'shadow_armor', name: 'Shadow Armor', slot: 'armor', tier: 'iron', rarity: 'rare', def: 14, instanceId: `item_${Date.now()}_shadow_armor` };
    if (store.addItem(item)) addFloat(floatX, floatY - 16, '🌑 Shadow Armor!', '#9b59b6');
    return;
  }
  if (drop.item === 'gear_drop_uncommon_weapon') {
    const TYPES = ['sword', 'hammer', 'bow', 'dagger'];
    const ABILITY = { sword: 'whirlwind', hammer: 'ground_slam', bow: 'power_shot', dagger: 'flurry' };
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const name = `Iron ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const item = { id: `iron_${type}_uncommon`, name, slot: 'weapon', type, tier: 'iron', rarity: 'uncommon', atk: 15, abilityId: ABILITY[type], instanceId: `item_${Date.now()}_${type}` };
    if (store.addItem(item)) addFloat(floatX, floatY - 16, `⚔ Uncommon ${name}!`, '#2ecc71');
    return;
  }
  if (drop.item === 'gear_drop_rare_weapon') {
    const TYPES = ['sword', 'hammer', 'bow', 'dagger'];
    const ABILITY = { sword: 'whirlwind', hammer: 'ground_slam', bow: 'power_shot', dagger: 'flurry' };
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const name = `Steel ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const item = { id: `steel_${type}_rare`, name, slot: 'weapon', type, tier: 'steel', rarity: 'rare', atk: 31, abilityId: ABILITY[type], instanceId: `item_${Date.now()}_${type}` };
    if (store.addItem(item)) addFloat(floatX, floatY - 16, `💎 Rare ${name}!`, '#3498db');
    return;
  }
}

const ABILITY_COLORS = {
  whirlwind:    { primary: '#4a90e2', secondary: '#7ab3e0' },
  ground_slam:  { primary: '#c0392b', secondary: '#e67e22' },
  power_shot:   { primary: '#FCD34D', secondary: '#F97316' },
  flurry:       { primary: '#f39c12', secondary: '#fff' },
  arcane_burst: { primary: '#9b59b6', secondary: '#d4af37' },
};

// ── Landmark renderer ─────────────────────────────────────────────────────
function drawLandmarks(ctx, wxFn, wyFn, onScreen, t) {
  LANDMARK_DEFS.forEach(lm => {
    const sx = wxFn(lm.x * TILE), sy = wyFn(lm.y * TILE);
    if (!onScreen(sx, sy, 140)) return;
    ctx.save();

    switch (lm.type) {

      case 'ruins': {
        // Ground shadow plate
        ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(sx, sy + 10, 44, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Rubble base stones
        [[-30,8],[-14,10],[0,9],[16,10],[28,8]].forEach(([dx,dy]) => {
          ctx.fillStyle = '#5a5a5a';
          ctx.beginPath(); ctx.ellipse(sx+dx, sy+dy, 7, 4, 0, 0, Math.PI*2); ctx.fill();
        });
        // Columns with tilt + depth
        const cols = ['#7a7a7a','#666','#888','#6a6a6a','#757575'];
        for (let i = 0; i < 5; i++) {
          const px = sx + (i - 2) * 14;
          const h = 20 + (i % 3) * 10;
          const tilt = (i - 2) * 0.09;
          ctx.save(); ctx.translate(px, sy); ctx.rotate(tilt);
          // Side face (depth)
          ctx.fillStyle = '#444';
          ctx.fillRect(3, -h, 4, h);
          // Front face
          ctx.fillStyle = cols[i % cols.length];
          ctx.fillRect(-4, -h, 8, h);
          // Capital (top slab)
          ctx.fillStyle = '#999';
          ctx.fillRect(-6, -h, 12, 4);
          // Moss line
          ctx.fillStyle = '#2e7d32'; ctx.globalAlpha = 0.4;
          ctx.fillRect(-4, -h + 4, 8, 3);
          ctx.globalAlpha = 1;
          // Crack
          ctx.strokeStyle = '#33333366'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-1, -h*0.7); ctx.lineTo(2, -h*0.3); ctx.stroke();
          ctx.restore();
        }
        // Fallen column block on ground
        ctx.fillStyle = '#666';
        ctx.save(); ctx.translate(sx + 20, sy + 4); ctx.rotate(0.3);
        ctx.fillRect(-14, -4, 28, 7); ctx.restore();
        break;
      }

      case 'goblin_camp': {
        // Ground dirt patch
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#5a3a1a';
        ctx.beginPath(); ctx.ellipse(sx, sy + 4, 38, 16, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Log ring around fire
        [[-12,8],[12,8],[0,-14],[-14,-2],[14,-2]].forEach(([dx,dy]) => {
          ctx.fillStyle = '#5c3a1e'; ctx.globalAlpha = 0.7;
          ctx.beginPath(); ctx.ellipse(sx+dx, sy+dy, 5, 3, Math.atan2(dy,dx), 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        });
        // Fire glow
        const flicker = 0.7 + Math.sin(t * 8.5) * 0.3;
        ctx.globalAlpha = flicker * 0.35; ctx.fillStyle = '#e67e22';
        ctx.beginPath(); ctx.arc(sx, sy, 28, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = flicker * 0.15; ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Fire flames — layered
        [[0,0,'#c0392b',7],[0,-3,'#e67e22',5],[0,-7,'#f39c12',3],[0,-10,'#f1c40f',2]].forEach(([dx,dy,col,r]) => {
          const ff = 0.85 + Math.sin(t*9+dx)*0.15;
          ctx.globalAlpha = ff; ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(sx+dx, sy+dy, r, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        // Tents — 3 with shadow and pole
        [[-24,4,0.06],[24,4,-0.06],[0,-22,0]].forEach(([dx,dy,tilt]) => {
          ctx.save(); ctx.translate(sx+dx, sy+dy); ctx.rotate(tilt);
          // Shadow
          ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.ellipse(0, 14, 12, 4, 0, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
          // Tent body
          ctx.fillStyle = '#7d5a3c';
          ctx.beginPath(); ctx.moveTo(0,-16); ctx.lineTo(-13,14); ctx.lineTo(13,14); ctx.closePath(); ctx.fill();
          // Tent stripe
          ctx.fillStyle = '#6a4a2e'; ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.moveTo(0,-16); ctx.lineTo(-4,14); ctx.lineTo(4,14); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          // Flap opening
          ctx.fillStyle = '#1a0a00';
          ctx.beginPath(); ctx.moveTo(0,14); ctx.lineTo(-4,4); ctx.lineTo(4,4); ctx.closePath(); ctx.fill();
          // Pole
          ctx.strokeStyle = '#4a2e10'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0,14); ctx.lineTo(0,-18); ctx.stroke();
          ctx.restore();
        });
        // Skull on stake
        ctx.fillStyle = '#e8e8d0';
        ctx.beginPath(); ctx.arc(sx - 32, sy - 18, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx-32, sy-14); ctx.lineTo(sx-32, sy-2); ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(sx-33, sy-19, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx-31, sy-19, 1.5, 0, Math.PI*2); ctx.fill();
        break;
      }

      case 'stone_circle': {
        // Ground rune circle
        ctx.globalAlpha = 0.12 + Math.sin(t*1.2)*0.06; ctx.strokeStyle = '#8888ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 32, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = 1;
        const r = 30;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const stx = sx + Math.cos(a) * r, sty = sy + Math.sin(a) * r;
          // Shadow
          ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.ellipse(stx + 3, sty + 14, 6, 3, 0, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
          // Side depth
          ctx.fillStyle = '#555';
          ctx.fillRect(stx + 3, sty - 16, 4, 20);
          // Front stone
          ctx.fillStyle = i % 2 === 0 ? '#7a7a8a' : '#686878';
          ctx.fillRect(stx - 4, sty - 18, 8, 22);
          // Top cap
          ctx.fillStyle = '#9a9aaa';
          ctx.fillRect(stx - 5, sty - 20, 10, 5);
          // Moss
          ctx.fillStyle = '#2e7d32'; ctx.globalAlpha = 0.35;
          ctx.fillRect(stx - 4, sty - 18, 8, 4);
          ctx.globalAlpha = 1;
        }
        // Center altar glow — animated pulse
        const pulse2 = 0.18 + Math.sin(t * 1.6) * 0.1;
        ctx.globalAlpha = pulse2; ctx.fillStyle = '#8888ff';
        ctx.beginPath(); ctx.arc(sx, sy, 20, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = pulse2 * 0.5; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Rune lines from center to stones
        for (let i = 0; i < 8; i += 2) {
          const a = (i / 8) * Math.PI * 2;
          ctx.globalAlpha = 0.08 + Math.sin(t*2+i)*0.06; ctx.strokeStyle = '#aaaaff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx+Math.cos(a)*r, sy+Math.sin(a)*r); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }

      case 'lava_vents': {
        // Cracked rock base
        ctx.fillStyle = '#1a0800';
        ctx.beginPath(); ctx.ellipse(sx, sy + 4, 36, 14, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2a1000';
        ctx.beginPath(); ctx.ellipse(sx, sy + 4, 28, 10, 0, 0, Math.PI*2); ctx.fill();
        // Crack lines on base
        ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 1.5;
        [[-12,0],[10,4],[0,-8]].forEach(([dx,dy]) => {
          ctx.globalAlpha = 0.35 + Math.sin(t*3+dx)*0.2;
          ctx.beginPath(); ctx.moveTo(sx+dx-6, sy+dy+4); ctx.lineTo(sx+dx+6, sy+dy-4); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        [[-18, 0], [18, 0], [0, -16]].forEach(([dx, dy]) => {
          // Outer glow halo
          const pulse = 0.4 + Math.sin(t * 4.5 + dx * 0.3) * 0.35;
          ctx.globalAlpha = pulse * 0.45; ctx.fillStyle = '#e67e22';
          ctx.beginPath(); ctx.arc(sx+dx, sy+dy, 18, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
          // Vent rock ring
          ctx.fillStyle = '#2a1200';
          ctx.beginPath(); ctx.arc(sx+dx, sy+dy, 10, 0, Math.PI*2); ctx.fill();
          // Vent hole
          ctx.fillStyle = '#0a0400';
          ctx.beginPath(); ctx.arc(sx+dx, sy+dy, 7, 0, Math.PI*2); ctx.fill();
          // Lava core glow
          ctx.globalAlpha = pulse; ctx.fillStyle = '#e74c3c';
          ctx.beginPath(); ctx.arc(sx+dx, sy+dy, 4, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = pulse * 0.7; ctx.fillStyle = '#f1c40f';
          ctx.beginPath(); ctx.arc(sx+dx, sy+dy, 2, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
          // Rising smoke puff
          const smoke = ((t * 30 + Math.abs(dx)) % 40);
          ctx.globalAlpha = Math.max(0, 0.3 - smoke/40*0.3);
          ctx.fillStyle = '#555';
          ctx.beginPath(); ctx.arc(sx+dx, sy+dy - smoke, 4 + smoke*0.15, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        });
        break;
      }

      case 'shrine': {
        // Stone base platform
        ctx.fillStyle = '#555';
        ctx.fillRect(sx - 22, sy + 4, 44, 8);
        ctx.fillStyle = '#666';
        ctx.fillRect(sx - 20, sy + 2, 40, 5);
        // Steps
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(sx - 16, sy - 1, 32, 5);
        // Shadow
        ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(sx, sy + 12, 26, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Pillars — with side depth
        [[-16, 0],[12, 0]].forEach(([px]) => {
          ctx.fillStyle = '#555'; ctx.fillRect(sx+px+7, sy-28, 4, 32); // depth
          ctx.fillStyle = '#8a8a8a'; ctx.fillRect(sx+px, sy-28, 8, 32);
          ctx.fillStyle = '#aaaaaa'; ctx.fillRect(sx+px, sy-28, 8, 5);
          ctx.fillStyle = '#aaaaaa'; ctx.fillRect(sx+px, sy+2, 8, 5);
          // Weathering
          ctx.strokeStyle = '#55555555'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx+px+3, sy-22); ctx.lineTo(sx+px+5, sy-10); ctx.stroke();
        });
        // Lintel
        ctx.fillStyle = '#555'; ctx.fillRect(sx-23, sy-30, 46, 4);
        ctx.fillStyle = '#8a8a8a'; ctx.fillRect(sx-22, sy-32, 44, 6);
        ctx.fillStyle = '#aaa'; ctx.fillRect(sx-22, sy-32, 44, 3);
        // Altar
        ctx.fillStyle = '#4a4a4a'; ctx.fillRect(sx-6, sy-18, 12, 20);
        ctx.fillStyle = '#606060'; ctx.fillRect(sx-7, sy-20, 14, 4);
        // Teal spirit glow — animated
        const shrineGlow = 0.35 + Math.sin(t * 2.2) * 0.2;
        ctx.globalAlpha = shrineGlow; ctx.fillStyle = '#1abc9c';
        ctx.beginPath(); ctx.arc(sx, sy - 8, 12, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = shrineGlow * 0.5; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy - 8, 5, 0, Math.PI*2); ctx.fill();
        // Floating particles
        for (let i = 0; i < 4; i++) {
          const pa = t * 1.4 + i * Math.PI / 2;
          ctx.globalAlpha = 0.4 + Math.sin(t*3+i)*0.3;
          ctx.fillStyle = '#1abc9c';
          ctx.beginPath(); ctx.arc(sx+Math.cos(pa)*14, sy-8+Math.sin(pa)*10, 2.5, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }

      case 'crystal_spire': {
        // Base rock mound
        ctx.fillStyle = '#0e2040';
        ctx.beginPath(); ctx.ellipse(sx, sy + 8, 30, 12, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#142850';
        ctx.beginPath(); ctx.ellipse(sx, sy + 4, 22, 8, 0, 0, Math.PI*2); ctx.fill();
        // Shadow
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(sx+6, sy+12, 28, 7, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Crystal clusters
        [[-16, 2, 24], [0, -10, 38], [16, 2, 26], [-8, -4, 18], [9, -3, 20]].forEach(([dx, dy, h]) => {
          const shimmer = 0.55 + Math.sin(t * 2.5 + dx) * 0.3;
          // Dark back face
          ctx.fillStyle = '#0d2040';
          ctx.beginPath(); ctx.moveTo(sx+dx+5, sy+dy+10); ctx.lineTo(sx+dx+8, sy+dy+10); ctx.lineTo(sx+dx+5, sy+dy-h); ctx.closePath(); ctx.fill();
          // Main crystal face
          ctx.fillStyle = '#1a3a6a';
          ctx.beginPath(); ctx.moveTo(sx+dx, sy+dy+10); ctx.lineTo(sx+dx+5, sy+dy+10); ctx.lineTo(sx+dx, sy+dy-h); ctx.closePath(); ctx.fill();
          // Left face
          ctx.fillStyle = '#1f4a80';
          ctx.beginPath(); ctx.moveTo(sx+dx-6, sy+dy+10); ctx.lineTo(sx+dx, sy+dy+10); ctx.lineTo(sx+dx, sy+dy-h); ctx.closePath(); ctx.fill();
          // Inner shimmer vein
          ctx.globalAlpha = shimmer; ctx.fillStyle = '#5a9fd4';
          ctx.beginPath(); ctx.moveTo(sx+dx, sy+dy-h+8); ctx.lineTo(sx+dx-2, sy+dy+6); ctx.lineTo(sx+dx+2, sy+dy+6); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = shimmer*0.5; ctx.fillStyle = '#aaddff';
          ctx.beginPath(); ctx.arc(sx+dx, sy+dy-h+4, 3, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        });
        break;
      }

      case 'void_gate': {
        // Ground shadow
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(sx, sy + 12, 36, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Two tall dark pillars with depth
        [[-22, 0], [16, 0]].forEach(([px]) => {
          ctx.fillStyle = '#0d0018'; ctx.fillRect(sx+px+8, sy-42, 5, 52); // depth
          ctx.fillStyle = '#1a0a2a'; ctx.fillRect(sx+px, sy-42, 10, 52);
          // Pillar cap
          ctx.fillStyle = '#2a1040';
          ctx.fillRect(sx+px-2, sy-44, 14, 6);
          // Rune etching
          ctx.globalAlpha = 0.4; ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx+px+5, sy-36); ctx.lineTo(sx+px+5, sy-14); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx+px+2, sy-28); ctx.lineTo(sx+px+8, sy-28); ctx.stroke();
          ctx.globalAlpha = 1;
        });
        // Void portal between pillars
        const voidPulse = 0.55 + Math.sin(t*2.5)*0.25;
        ctx.globalAlpha = voidPulse * 0.65; ctx.fillStyle = '#0a0014';
        ctx.beginPath(); ctx.ellipse(sx, sy-14, 14, 24, 0, 0, Math.PI*2); ctx.fill();
        // Swirling arcs
        for (let ring = 0; ring < 3; ring++) {
          const ra = t * (1.5 + ring*0.4) + ring * 1.0;
          ctx.globalAlpha = 0.6 - ring*0.15; ctx.strokeStyle = ring===0?'#9b59b6':ring===1?'#6c3483':'#ffffff';
          ctx.lineWidth = 2.5-ring*0.5;
          ctx.beginPath(); ctx.arc(sx, sy-14, 10-ring*2, ra, ra+Math.PI*1.4); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // Purple glow
        ctx.globalAlpha = voidPulse * 0.3; ctx.fillStyle = '#6c3483';
        ctx.beginPath(); ctx.arc(sx, sy-14, 22, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }

      case 'ice_fortress': {
        // Shadow
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(sx+4, sy+14, 44, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Side depth of main walls
        ctx.fillStyle = '#1a3050';
        ctx.fillRect(sx-22, sy-12, 4, 22); // left depth
        ctx.fillRect(sx+20, sy-12, 4, 22); // right depth
        // Base wall
        ctx.fillStyle = '#2a4a6a';
        ctx.fillRect(sx-24, sy-14, 48, 22);
        // Wall highlight
        ctx.fillStyle = '#3a6080'; ctx.globalAlpha = 0.5;
        ctx.fillRect(sx-24, sy-14, 48, 5);
        ctx.globalAlpha = 1;
        // Battlements
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = '#1a3050'; ctx.fillRect(sx-22+i*9, sy-24, 7, 3); // depth
          ctx.fillStyle = '#2a4a6a'; ctx.fillRect(sx-22+i*9, sy-25, 6, 12);
          ctx.fillStyle = '#3a6080'; ctx.globalAlpha = 0.4;
          ctx.fillRect(sx-22+i*9, sy-25, 6, 3);
          ctx.globalAlpha = 1;
        }
        // Side towers
        [[-28, -8],[22, -8]].forEach(([tx2,ty2]) => {
          ctx.fillStyle = '#1a3050'; ctx.fillRect(sx+tx2+12, sy+ty2-22, 4, 36);
          ctx.fillStyle = '#2a4a6a'; ctx.fillRect(sx+tx2, sy+ty2-22, 14, 36);
          ctx.fillStyle = '#3a6080'; ctx.globalAlpha = 0.4; ctx.fillRect(sx+tx2, sy+ty2-22, 14, 4); ctx.globalAlpha=1;
          // Tower top cone
          ctx.fillStyle = '#4a7a9a';
          ctx.beginPath(); ctx.moveTo(sx+tx2+7, sy+ty2-36); ctx.lineTo(sx+tx2, sy+ty2-22); ctx.lineTo(sx+tx2+14, sy+ty2-22); ctx.closePath(); ctx.fill();
        });
        // Central tower
        ctx.fillStyle = '#1a3050'; ctx.fillRect(sx-6, sy-40, 4, 52);
        ctx.fillStyle = '#3a5a7a'; ctx.fillRect(sx-10, sy-40, 20, 52);
        ctx.fillStyle = '#4a7090'; ctx.globalAlpha=0.4; ctx.fillRect(sx-10, sy-40, 20, 5); ctx.globalAlpha=1;
        // Tower cone
        ctx.fillStyle = '#5a8aaa';
        ctx.beginPath(); ctx.moveTo(sx, sy-56); ctx.lineTo(sx-10, sy-40); ctx.lineTo(sx+10, sy-40); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha=0.3;
        ctx.beginPath(); ctx.moveTo(sx, sy-56); ctx.lineTo(sx-3, sy-40); ctx.lineTo(sx+3, sy-40); ctx.closePath(); ctx.fill();
        ctx.globalAlpha=1;
        // Arrow slit windows
        ctx.fillStyle = '#0a1828';
        ctx.fillRect(sx-2, sy-32, 4, 8);
        ctx.fillRect(sx-2, sy-18, 4, 8);
        // Ice shimmer overlay
        ctx.globalAlpha = 0.12 + Math.sin(t*1.8)*0.06; ctx.fillStyle = '#aaddff';
        ctx.fillRect(sx-24, sy-40, 48, 54);
        ctx.globalAlpha = 1;
        break;
      }
    }

    // Label — with outline for readability
    ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000aa'; ctx.lineWidth = 2.5;
    ctx.strokeText(lm.label.toUpperCase(), sx, sy + 46);
    ctx.fillStyle = '#ffffffaa';
    ctx.fillText(lm.label.toUpperCase(), sx, sy + 46);
    ctx.restore();
  });
}

// ── Ground detail overlay (Zelda-style grass tufts, cracks, etc.) ──────────
function drawGroundDetail(ctx, wxFn, wyFn, cx, cy, W, H, t) {
  const txS = Math.max(0, Math.floor((cx - W/2) / TILE));
  const txE = Math.min(MAP_W, Math.ceil((cx + W/2) / TILE) + 1);
  const tyS = Math.max(0, Math.floor((cy - H/2) / TILE));
  const tyE = Math.min(MAP_H, Math.ceil((cy + H/2) / TILE) + 1);

  for (let ty = tyS; ty < tyE; ty++) {
    for (let tx = txS; tx < txE; tx++) {
      const h = tileHash(tx, ty);
      if (h > 0.85) continue; // skip most tiles for perf
      const sx = wxFn(tx * TILE + 16);
      const sy = wyFn(ty * TILE + 16);
      const isBorder = tx < 2 || tx >= MAP_W-2 || ty < 2 || ty >= MAP_H-2;
      if (isBorder) continue;

      // Northern forest — grass tufts
      if (ty < 18 && tx > 4 && tx < 80 && h < 0.18) {
        ctx.strokeStyle = h < 0.09 ? '#2ecc71' : '#27ae60';
        ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45;
        const bx = wxFn(tx * TILE + (h * 26 | 0));
        const by = wyFn(ty * TILE + (tileHash(tx+1,ty) * 26 | 0));
        ctx.beginPath(); ctx.moveTo(bx-3,by+4); ctx.lineTo(bx,by-5); ctx.lineTo(bx+3,by+4); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Flower dots in forest
      if (ty < 18 && tx > 4 && tx < 80 && h > 0.82 && h < 0.84) {
        ctx.globalAlpha = 0.55; ctx.fillStyle = h > 0.83 ? '#f1c40f' : '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
      }
      // Eastern rock zone — pebbles
      if (tx > 46 && ty > 8 && ty < 55 && h < 0.12) {
        ctx.globalAlpha = 0.4; ctx.fillStyle = '#6b5a45';
        ctx.beginPath(); ctx.ellipse(sx, sy, 4, 3, h*Math.PI, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
      }
      // Southern badlands — cracked earth
      if (ty > 54 && tx > 4 && tx < 52 && h < 0.10) {
        ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 1; ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(sx-8,sy-2); ctx.lineTo(sx+5,sy+3);
        ctx.moveTo(sx+4,sy+2); ctx.lineTo(sx+10,sy-4);
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      // Fire badlands — ember glow
      if (ty > 68 && tx > 4 && tx < 80 && h < 0.06) {
        const pulse = 0.35 + Math.sin(t*3 + h*15)*0.2;
        ctx.globalAlpha = pulse; ctx.fillStyle = '#e67e22';
        ctx.beginPath(); ctx.ellipse(sx, sy, 6, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
      }
      // Western wetlands — small root lines
      if (tx < 12 && ty > 25 && ty < 80 && h < 0.08) {
        ctx.strokeStyle = '#0a2a0d'; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(sx-6,sy); ctx.lineTo(sx+6,sy+4); ctx.stroke(); ctx.globalAlpha = 1;
      }
      // Expanded eastern highlands — rock shards
      if (tx > 80 && ty < 50 && h < 0.10) {
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#6b5a6a';
        ctx.beginPath(); ctx.ellipse(sx, sy, 5, 3, h*Math.PI*2, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
      }
      // Ashen wastes — ash piles
      if (tx > 88 && ty > 48 && tx < 100 && ty < 80 && h < 0.08) {
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.ellipse(sx, sy, 6, 4, h*Math.PI, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
      }
      // Void approach — star sparkles
      if (tx > 95 && ty > 75 && h > 0.78) {
        const twinkle = 0.35 + Math.sin(t*3 + h*25)*0.3;
        ctx.globalAlpha = twinkle; ctx.fillStyle = h > 0.82 ? '#f1c40f' : '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
  }
}

// ── Obstacle cluster art (trees and rock ridges, replaces blank circles) ──
function drawObstacleArt(ctx, wxFn, wyFn, onScreen, t) {
  OBSTACLE_CLUSTERS.forEach(c => {
    const osx = wxFn(c.cx * TILE);
    const osy = wyFn(c.cy * TILE);
    if (!onScreen(osx, osy, c.r * TILE + 60)) return;
    const r = c.r;

    if (c.type === 'trees') {
      // Draw a cluster of trees around center
      const positions = [
        [0,0],[r*0.5,r*0.4],[-(r*0.5),r*0.4],[r*0.4,-(r*0.5)],[-(r*0.4),-(r*0.5)],
        [0,r*0.7],[r*0.7,0],[-(r*0.7),0],
      ];
      positions.forEach(([dx, dy]) => {
        const tx2 = osx + dx * TILE * 0.8;
        const ty2 = osy + dy * TILE * 0.8;
        // Trunk
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(tx2 - 4, ty2 + 6, 8, 14);
        // Canopy layers
        ctx.fillStyle = '#1a5e20';
        ctx.beginPath(); ctx.arc(tx2, ty2 - 2, 14, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1e7026';
        ctx.beginPath(); ctx.arc(tx2 - 4, ty2 - 6, 9, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(tx2 + 4, ty2 - 5, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#25892e';
        ctx.beginPath(); ctx.arc(tx2, ty2 - 10, 7, 0, Math.PI*2); ctx.fill();
        // Shadow
        ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(tx2, ty2 + 14, 12, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      });
    } else {
      // Rock ridge — polygon rocks scattered around center
      const rockPositions = [
        [0,0,1.0],[r*0.6,r*0.4,0.7],[-(r*0.6),r*0.4,0.8],
        [r*0.4,-(r*0.6),0.6],[-(r*0.4),-(r*0.5),0.9],[0,r*0.8,0.7],[r*0.8,0,0.6],
      ];
      rockPositions.forEach(([dx, dy, scale]) => {
        const rx2 = osx + dx * TILE * 0.7;
        const ry2 = osy + dy * TILE * 0.7;
        const rs = 10 * scale;
        // Rock shadow
        ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(rx2+2, ry2+rs*0.5+3, rs*1.1, rs*0.4, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Rock body — irregular polygon
        ctx.fillStyle = '#6b6060';
        ctx.beginPath();
        ctx.moveTo(rx2 - rs*0.9, ry2 + rs*0.4);
        ctx.lineTo(rx2 - rs*0.5, ry2 - rs*0.7);
        ctx.lineTo(rx2 + rs*0.3, ry2 - rs*0.9);
        ctx.lineTo(rx2 + rs*1.0, ry2 - rs*0.3);
        ctx.lineTo(rx2 + rs*0.8, ry2 + rs*0.5);
        ctx.lineTo(rx2 - rs*0.2, ry2 + rs*0.6);
        ctx.closePath(); ctx.fill();
        // Highlight
        ctx.fillStyle = '#9a9090';
        ctx.beginPath();
        ctx.moveTo(rx2 - rs*0.4, ry2 - rs*0.5);
        ctx.lineTo(rx2 + rs*0.2, ry2 - rs*0.7);
        ctx.lineTo(rx2 + rs*0.6, ry2 - rs*0.1);
        ctx.lineTo(rx2 + rs*0.1, ry2 + rs*0.1);
        ctx.closePath(); ctx.fill();
      });
    }
  });
}

export default function WorldCanvas() {
  const canvasRef       = useRef(null);
  const rafRef          = useRef(null);
  const lastTimeRef     = useRef(0);
  const showDeathModal  = useGameStore(state => state.showDeathModal);
  const prevDeathModal  = useRef(false);
  const showLevelUp     = useGameStore(state => state.showLevelUp);
  const prevLevelUp     = useRef(false);

  const G = useRef({
    player:       { x: 25*TILE, y: 40*TILE, attackCooldown: 0, invincible: false, invTimer: 0 },
    camera:       { x: 25*TILE, y: 40*TILE },
    enemies:      ENEMY_DEFS.map(makeEnemy),
    resources:    RESOURCE_DEFS.map(d => ({ ...d, depleted: false, respawnAt: 0 })),
    checkpoints:  CHECKPOINTS.map(c => ({ ...c, activated: false })),
    swordPicked:  false,
    templeCooldown: 2.5,
    floats:       [],
    npcMessage:   null,
    villageNPCs: [
      // Elder Kael — stays near well
      { id:'kael',   x:23*TILE, y:40*TILE, tx:23*TILE, ty:40*TILE, color:'#1abc9c', name:'Elder Kael',  role:'elder',   walkTimer:0, waitTimer:3, dir:0, seated:false },
      // Blacksmith — paces near forge (east side)
      { id:'smith',  x:29*TILE, y:43*TILE, tx:29*TILE, ty:43*TILE, color:'#e67e22', name:'Aldric',     role:'smith',   walkTimer:0, waitTimer:2, dir:1, seated:false },
      // Shop keeper — sits at market stall (west side)
      { id:'merch',  x:21*TILE, y:43*TILE, tx:21*TILE, ty:43*TILE, color:'#9b59b6', name:'Mira',       role:'merchant',walkTimer:0, waitTimer:4, dir:2, seated:true  },
      // Healer — wanders herb garden (far west)
      { id:'heal',   x:21*TILE, y:46*TILE, tx:21*TILE, ty:46*TILE, color:'#2ecc71', name:'Sister Lyn', role:'healer',  walkTimer:0, waitTimer:3, dir:3, seated:false },
      // Guard — patrols village gate (south entry)
      { id:'guard1', x:24*TILE, y:48*TILE, tx:24*TILE, ty:48*TILE, color:'#95a5a6', name:'Guard',      role:'guard',   walkTimer:0, waitTimer:2, dir:0, seated:false },
      { id:'guard2', x:26*TILE, y:48*TILE, tx:26*TILE, ty:48*TILE, color:'#95a5a6', name:'Guard',      role:'guard',   walkTimer:0, waitTimer:2, dir:2, seated:false },
      // Villager wanderers
      { id:'vil1',   x:25*TILE, y:44*TILE, tx:25*TILE, ty:44*TILE, color:'#f39c12', name:'Renn',       role:'villager',walkTimer:0, waitTimer:2, dir:1, seated:false },
      { id:'vil2',   x:22*TILE, y:47*TILE, tx:22*TILE, ty:47*TILE, color:'#e8daef', name:'Lysa',       role:'villager',walkTimer:0, waitTimer:3, dir:3, seated:true  },
      { id:'vil3',   x:28*TILE, y:46*TILE, tx:28*TILE, ty:46*TILE, color:'#aab7b8', name:'Torv',       role:'villager',walkTimer:0, waitTimer:2, dir:2, seated:false },
    ],
    abilityCooldown: 0,
    abilityEffect:   null,
    projectiles:     [],
    basicArrows:     [],
    attackEffect:    null,
    lastMoveDir:     { x: 1, y: 0 },
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

  const killEnemy = (e, store) => {
    e.alive = false;
    const cfg      = EnemyConfig[e.type];
    const xpReward = cfg?.xpReward || 10;
    store.gainXP(xpReward);
    addFloat(e.x, e.y - 50, `+${xpReward} XP`, '#9b59b6');
    cfg?.drops?.forEach(drop => {
      if (Math.random() < drop.chance) resolveDropItem(drop, store, e.x, e.y - 36, addFloat);
    });
    const respawnTime = cfg?.respawnTime || 0;
    if (respawnTime > 0) {
      setTimeout(() => { e.alive = true; e.hp = e.maxHp; e.state = 'patrol'; e.x = e.originX; e.y = e.originY; e.stunTimer = 0; }, respawnTime);
    }
  };

  const executeAbility = (abilityId, store) => {
    const ability = AbilityConfig[abilityId];
    if (!ability) return;
    const p = G.player;
    G.abilityCooldown = ability.cooldown;
    store.recordAbilityFired(ability.cooldown);
    addFloat(p.x, p.y - 55, ability.name, '#d4af37', true);
    switch (ability.type) {
      case 'aoe': {
        G.enemies.forEach(e => {
          if (!e.alive || dist(p.x, p.y, e.x, e.y) > ability.range) return;
          const dmg = Math.max(1, Math.round(store.playerATK * ability.damageMult));
          e.hp -= dmg;
          addFloat(e.x, e.y - 24, `-${dmg}`, '#ff4444');
          if (ability.stunDuration) e.stunTimer = ability.stunDuration;
          if (e.hp <= 0) killEnemy(e, store);
        });
        G.abilityEffect = { id: abilityId, x: p.x, y: p.y, maxRadius: ability.range, radius: 0, timer: 0.7, maxTimer: 0.7 };
        break;
      }
      case 'projectile': {
        let targetX = p.x + G.lastMoveDir.x * 200, targetY = p.y + G.lastMoveDir.y * 200, nd = Infinity;
        G.enemies.forEach(e => { if (!e.alive) return; const d = dist(p.x, p.y, e.x, e.y); if (d < nd) { nd = d; targetX = e.x; targetY = e.y; } });
        const angle = Math.atan2(targetY - p.y, targetX - p.x);
        G.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(angle) * 420, vy: Math.sin(angle) * 420, traveled: 0, maxRange: ability.range, dmg: Math.max(1, Math.round(store.playerATK * ability.damageMult)), hitEnemies: new Set() });
        break;
      }
      case 'multi_hit': {
        G.abilityEffect = { id: abilityId, x: p.x, y: p.y, timer: 0.6, maxTimer: 0.6 };
        for (let i = 0; i < ability.hits; i++) {
          setTimeout(() => {
            const cs = useGameStore.getState();
            G.enemies.forEach(e => {
              if (!e.alive || dist(G.player.x, G.player.y, e.x, e.y) > ability.range) return;
              const dmg = Math.max(1, Math.round(cs.playerATK * ability.damageMult));
              e.hp -= dmg;
              addFloat(e.x, e.y - 20 - i * 8, `-${dmg}`, '#f39c12');
              if (e.hp <= 0) killEnemy(e, cs);
            });
          }, i * ability.hitDelay * 1000);
        }
        break;
      }
      case 'elemental_aoe': {
        G.enemies.forEach(e => {
          if (!e.alive || dist(p.x, p.y, e.x, e.y) > ability.range) return;
          const dmg = Math.max(1, Math.round(store.playerATK * ability.damageMult));
          e.hp -= dmg;
          addFloat(e.x, e.y - 24, `-${dmg}`, '#9b59b6');
          if (e.hp <= 0) killEnemy(e, store);
        });
        G.abilityEffect = { id: abilityId, x: p.x, y: p.y, maxRadius: ability.range, timer: 0.8, maxTimer: 0.8 };
        break;
      }
      default: break;
    }
  };

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
    if (!prevLevelUp.current && showLevelUp) hapticLevelUp();
    prevLevelUp.current = showLevelUp;
  }, [showLevelUp]);

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
      let { x, y } = store.position;
      const onPortal = REALM_PORTALS.some(p2 => dist(x, y, p2.x*TILE, p2.y*TILE) < TILE * 3);
      if (onPortal) { x = 25*TILE; y = 40*TILE; }
      const c = clampToWorld(x, y);
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

    // ── Village NPC walk AI ────────────────────────────────────────────────
    const VLG_CX = 25 * TILE, VLG_CY = 44 * TILE, VLG_R = 7 * TILE;
    G.villageNPCs.forEach(npc => {
      if (npc.seated) return; // seated NPCs stay put
      npc.waitTimer -= dt;
      if (npc.waitTimer > 0) return;
      npc.walkTimer -= dt;
      if (npc.walkTimer <= 0) {
        // Pick a new patrol target within village radius
        const angle = Math.random() * Math.PI * 2;
        const rad   = Math.random() * VLG_R;
        npc.tx = Math.max(TILE*18, Math.min(TILE*32, VLG_CX + Math.cos(angle) * rad));
        npc.ty = Math.max(TILE*38, Math.min(TILE*52, VLG_CY + Math.sin(angle) * rad));
        npc.walkTimer = 2.5 + Math.random() * 2;
        npc.waitTimer = 1.0 + Math.random() * 1.5;
      }
      // Move toward target
      const dx = npc.tx - npc.x, dy = npc.ty - npc.y;
      const dd = Math.sqrt(dx*dx + dy*dy);
      if (dd > 4) {
        const spd = 38;
        npc.x += (dx/dd) * spd * dt;
        npc.y += (dy/dd) * spd * dt;
        npc.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      }
    });
    if (G.abilityEffect) { G.abilityEffect.timer -= dt; if (G.abilityEffect.timer <= 0) G.abilityEffect = null; }
    if (G.abilityCooldown > 0) G.abilityCooldown = Math.max(0, G.abilityCooldown - dt);

    if (G.templeCooldown > 0) {
      G.templeCooldown -= dt;
    } else {
      for (const portal of REALM_PORTALS) {
        if (dist(p.x, p.y, portal.x*TILE, portal.y*TILE) <= TILE * 2.5) {
          G.templeCooldown = 3.0;
          store.setCurrentRealm(portal.realm);
          store.setGamePhase('realm');
          return;
        }
      }
    }

    const inCombat = G.enemies.some(e => e.alive && e.state !== 'patrol' && e.state !== 'idle');
    if (!inCombat && store.playerHP < store.playerMaxHP) {
      G.regenTimer += dt;
      if (G.regenTimer >= 4) { G.regenTimer = 0; store.healPlayer(1); }
    } else { G.regenTimer = 0; }

    let vx = 0, vy = 0;
    if (G.keys['ArrowLeft']  || G.keys['KeyA']) vx -= 1;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) vx += 1;
    if (G.keys['ArrowUp']    || G.keys['KeyW']) vy -= 1;
    if (G.keys['ArrowDown']  || G.keys['KeyS']) vy += 1;
    if (InputState.joystick.active) { vx = InputState.joystick.x; vy = InputState.joystick.y; }
    if (vx !== 0 && vy !== 0) { const m = Math.sqrt(vx*vx+vy*vy); vx/=m; vy/=m; }
    if (vx !== 0 || vy !== 0) G.lastMoveDir = { x: vx, y: vy };

    const spd = 150 + (store.playerSPD - 5) * 12;

    // Movement with obstacle sliding
    const nextFull = clampToWorld(p.x + vx * spd * dt, p.y + vy * spd * dt);
    if (!isObstacle(nextFull.x, nextFull.y)) {
      p.x = nextFull.x; p.y = nextFull.y;
    } else {
      const slideX = clampToWorld(p.x + vx * spd * dt, p.y);
      const slideY = clampToWorld(p.x, p.y + vy * spd * dt);
      if (!isObstacle(slideX.x, slideX.y)) { p.x = slideX.x; p.y = slideX.y; }
      else if (!isObstacle(slideY.x, slideY.y)) { p.x = slideY.x; p.y = slideY.y; }
    }

    G.camera.x += (p.x - G.camera.x) * Math.min(1, 8 * dt);
    G.camera.y += (p.y - G.camera.y) * Math.min(1, 8 * dt);
    G.camera.x = Math.max(G.W/2, Math.min(WORLD_W - G.W/2, G.camera.x));
    G.camera.y = Math.max(G.H/2, Math.min(WORLD_H - G.H/2, G.camera.y));

    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.invincible) { p.invTimer -= dt; if (p.invTimer <= 0) p.invincible = false; }

    // ── Ore respawn (3-min timer) ───────────────────────────────────────────
    const now3m = Date.now();
    G.resources.forEach(r => {
      if (r.depleted && r.respawnAt > 0 && now3m >= r.respawnAt) {
        r.depleted = false;
        r.respawnAt = 0;
      }
    });

    const weaponInstanceId = store.gear?.weapon;
    const equippedWeapon   = weaponInstanceId ? store.inventory.find(i => i.instanceId === weaponInstanceId) : null;
    const weaponType = equippedWeapon?.type || 'sword';
    const WEAPON_ATTACK = {
      sword:  { cooldown: 0.60, range: 52, aoe: false },
      hammer: { cooldown: 1.00, range: 66, aoe: true  },
      bow:    { cooldown: 0.70, range: 50, ranged: true },
      dagger: { cooldown: 0.32, range: 40, aoe: false },
      staff:  { cooldown: 0.65, range: 72, aoe: false },
    };
    const wAtk = WEAPON_ATTACK[weaponType] || WEAPON_ATTACK.sword;

    const spaceNow  = G.keys['Space'] || window.__gameAttack;
    const spaceJust = spaceNow && !G.prevSpace;
    G.prevSpace = spaceNow;
    if (window.__gameAttack) window.__gameAttack = false;

    if (G.attackEffect) { G.attackEffect.timer -= dt; if (G.attackEffect.timer <= 0) G.attackEffect = null; }

    if (spaceJust && p.attackCooldown <= 0) {
      p.attackCooldown = wAtk.cooldown;
      hapticAttack();
      if (wAtk.ranged) {
        let targetX = p.x + G.lastMoveDir.x * 150, targetY = p.y + G.lastMoveDir.y * 150, nd = Infinity;
        G.enemies.forEach(e => { if (!e.alive) return; const d = dist(p.x, p.y, e.x, e.y); if (d < nd) { nd = d; targetX = e.x; targetY = e.y; } });
        const angle = Math.atan2(targetY - p.y, targetX - p.x);
        G.basicArrows.push({ x: p.x, y: p.y, vx: Math.cos(angle) * 340, vy: Math.sin(angle) * 340, traveled: 0, maxRange: 200, dmg: Math.max(1, store.playerATK), hitEnemies: new Set() });
      } else {
        let hitCount = 0;
        G.enemies.forEach(e => {
          if (!e.alive || dist(p.x, p.y, e.x, e.y) > wAtk.range) return;
          const dmg = Math.max(1, store.playerATK - cfg[e.type].def);
          e.hp -= dmg;
          addFloat(e.x, e.y - 20, `-${dmg}`, '#ff4444');
          hitCount++;
          if (e.hp <= 0) killEnemy(e, store);
        });
        if (hitCount > 0 || weaponType === 'hammer') {
          G.attackEffect = { x: p.x, y: p.y, type: weaponType, range: wAtk.range, timer: 0.3, maxTimer: 0.3 };
        }
      }
    }

    const abilityNow  = G.keys['KeyQ'] || window.__gameAbility;
    const abilityJust = abilityNow && !G.prevAbility;
    G.prevAbility = abilityNow;
    if (window.__gameAbility) window.__gameAbility = false;
    if (abilityJust && G.abilityCooldown <= 0 && store.equippedAbilityId) executeAbility(store.equippedAbilityId, store);

    G.basicArrows = G.basicArrows.filter(arrow => {
      arrow.x += arrow.vx * dt; arrow.y += arrow.vy * dt;
      arrow.traveled += Math.sqrt(arrow.vx*arrow.vx + arrow.vy*arrow.vy) * dt;
      G.enemies.forEach(e => {
        if (!e.alive || arrow.hitEnemies.has(e)) return;
        if (dist(arrow.x, arrow.y, e.x, e.y) > 18) return;
        arrow.hitEnemies.add(e);
        const dmg = Math.max(1, arrow.dmg - cfg[e.type].def);
        e.hp -= dmg;
        addFloat(e.x, e.y - 20, `-${dmg}`, '#FCD34D');
        if (e.hp <= 0) killEnemy(e, store);
      });
      return arrow.traveled < arrow.maxRange && arrow.x > 0 && arrow.x < WORLD_W && arrow.y > 0 && arrow.y < WORLD_H;
    });

    G.projectiles = G.projectiles.filter(proj => {
      proj.x += proj.vx * dt; proj.y += proj.vy * dt;
      proj.traveled += Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy) * dt;
      G.enemies.forEach(e => {
        if (!e.alive || proj.hitEnemies.has(e)) return;
        if (dist(proj.x, proj.y, e.x, e.y) > 22) return;
        proj.hitEnemies.add(e); e.hp -= proj.dmg;
        addFloat(e.x, e.y - 24, `-${proj.dmg}`, '#FCD34D');
        if (e.hp <= 0) killEnemy(e, store);
      });
      return proj.traveled < proj.maxRange && proj.x > 0 && proj.x < WORLD_W && proj.y > 0 && proj.y < WORLD_H;
    });

    const eNow  = G.keys['KeyE'] || window.__gameInteract;
    const eJust = eNow && !G.prevE;
    G.prevE = eNow;
    if (window.__gameInteract) window.__gameInteract = false;

    if (eJust) {
      G.resources.forEach(r => {
        if (r.depleted || dist(p.x, p.y, r.x, r.y) > 48) return;
        store.addResource(r.res, r.amt);
        addFloat(r.x, r.y - 20, `+${r.amt} ${r.res}`, '#7ed321');
        hapticCollect();
        r.depleted = true;
        r.respawnAt = Date.now() + 180_000;
      });
      G.checkpoints.forEach(cp => {
        if (dist(p.x, p.y, cp.x, cp.y) > 55) return;
        if (!cp.activated) { cp.activated = true; store.activateCheckpoint(cp.id); hapticCheckpoint(); }
        addFloat(cp.x, cp.y - 30, '✓ Checkpoint saved!', '#f1c40f');
      });
      const hasSword = store.inventory.some(i => i.id === 'iron_sword');
      if (!G.swordPicked && !hasSword && dist(p.x, p.y, 27*TILE, 27*TILE) <= 44) {
        const item = { id: 'iron_sword', name: 'Iron Sword', slot: 'weapon', type: 'sword', tier: 'iron', rarity: 'common', atk: 6, abilityId: 'whirlwind', instanceId: `item_${Date.now()}_sword` };
        if (store.addItem(item)) { G.swordPicked = true; store.equipItem(item); addFloat(27*TILE, 27*TILE - 30, '⚔ Iron Sword + Whirlwind!', '#bdc3c7'); }
      } else if (hasSword) { G.swordPicked = true; }
      if (dist(p.x, p.y, 25*TILE, 44*TILE) <= 52) { store.setGamePhase('stronghold'); return; }
      if (dist(p.x, p.y, 43*TILE, 10*TILE) <= 52) {
        addFloat(p.x, p.y-40, '⚠ Entering Dungeon...', '#cc88ff');
        setTimeout(() => store.setGamePhase('dungeon'), 400);
        return;
      }
      for (const portal of REALM_PORTALS) {
        if (dist(p.x, p.y, portal.x*TILE, portal.y*TILE) <= 52) {
          addFloat(p.x, p.y-44, `Entering ${portal.name}...`, portal.color);
          const realm = portal.realm;
          setTimeout(() => { store.setCurrentRealm(realm); store.setGamePhase('realm'); }, 400);
          return;
        }
      }
      // Per-NPC dialogue — check each village NPC
      let talkedToNPC = false;
      for (const npc of G.villageNPCs) {
        if (dist(p.x, p.y, npc.x, npc.y) <= 52) {
          const lines = NPC_DIALOGUE[npc.id] || NPC_HINTS;
          if (!npc._hintIdx) npc._hintIdx = 0;
          G.npcMessage = { text: lines[npc._hintIdx % lines.length], speaker: npc.name, speakerColor: npc.color, timer: 6 };
          npc._hintIdx++;
          talkedToNPC = true;
          break;
        }
      }
      // Fallback: old Elder Kael zone if not near any specific NPC
      if (!talkedToNPC && dist(p.x, p.y, 23*TILE, 40*TILE) <= 60) {
        G.npcMessage = { text: NPC_HINTS[G._hintIndex % NPC_HINTS.length], speaker: 'Elder Kael', speakerColor: '#1abc9c', timer: 5 };
        G._hintIndex++;
      }
    }

    G.enemies.forEach(e => {
      if (!e.alive) return;
      if (e.stunTimer > 0) { e.stunTimer -= dt; return; }
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
          hapticHit();
          p.invincible = true; p.invTimer = 0.8;
        }
      } else if (d <= ecfg.aggroRange) {
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

    G.floats = G.floats.map(f => ({ ...f, y: f.y + f.vy * dt, life: f.life - dt })).filter(f => f.life > 0);
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
    const t  = Date.now() / 1000;
    const wx = x => Math.round(x - cx + W / 2);
    const wy = y => Math.round(y - cy + H / 2);
    const onScreen = (sx, sy, pad = 50) => sx > -pad && sx < W + pad && sy > -pad && sy < H + pad;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    // ── Tiles ──────────────────────────────────────────────────────────────
    const txS = Math.max(0, Math.floor((cx - W/2) / TILE));
    const txE = Math.min(MAP_W, Math.ceil((cx + W/2) / TILE) + 1);
    const tyS = Math.max(0, Math.floor((cy - H/2) / TILE));
    const tyE = Math.min(MAP_H, Math.ceil((cy + H/2) / TILE) + 1);
    for (let ty = tyS; ty < tyE; ty++)
      for (let tx = txS; tx < txE; tx++) {
        ctx.fillStyle = tileColor(tx, ty);
        ctx.fillRect(wx(tx*TILE), wy(ty*TILE), TILE+1, TILE+1);
      }

    // ── Ground detail overlay (grass tufts, cracks, embers, starfield) ───────
    drawGroundDetail(ctx, wx, wy, cx, cy, W, H, t);

    // ── Obstacle cluster art (drawn trees + rock ridges, no blank circles) ───
    drawObstacleArt(ctx, wx, wy, onScreen, t);

    // ── Landmarks ─────────────────────────────────────────────────────────
    drawLandmarks(ctx, wx, wy, onScreen, t);

    // ── Resources ─────────────────────────────────────────────────────────
    G.resources.forEach(r => {
      const sx = wx(r.x), sy = wy(r.y);
      if (!onScreen(sx, sy)) return;

      if (r.type === 'tree') {
        // Trunk
        ctx.fillStyle = r.depleted ? '#4a3010' : '#6b4226';
        ctx.fillRect(sx - 3, sy + 2, 6, 12);
        // Canopy
        ctx.fillStyle = r.depleted ? '#3a5a3a' : '#2ecc71';
        ctx.beginPath(); ctx.arc(sx, sy - 4, 14, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = r.depleted ? '#2a4a2a' : '#27ae60';
        ctx.beginPath(); ctx.arc(sx - 4, sy - 10, 9, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 4, sy - 10, 9, 0, Math.PI*2); ctx.fill();
      } else if (r.type === 'rock') {
        ctx.fillStyle = '#00000033';
        ctx.beginPath(); ctx.ellipse(sx, sy + 6, 13, 5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = r.depleted ? '#555' : '#7f8c8d';
        ctx.beginPath();
        ctx.moveTo(sx - 11, sy + 4); ctx.lineTo(sx - 8, sy - 8);
        ctx.lineTo(sx + 2, sy - 10); ctx.lineTo(sx + 12, sy - 3);
        ctx.lineTo(sx + 10, sy + 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#aaaaaa44';
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy - 4); ctx.lineTo(sx - 2, sy - 8);
        ctx.lineTo(sx + 4, sy - 5); ctx.closePath(); ctx.fill();
      } else if (r.type === 'ore_node') {
        ctx.fillStyle = r.depleted ? '#333' : '#c0392b';
        ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI*2); ctx.fill();
        if (!r.depleted) {
          ctx.globalAlpha = 0.4 + Math.sin(t * 3 + sx * 0.01) * 0.3;
          ctx.fillStyle = '#e67e22';
          ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (r.type === 'fire_shard_node') {
        // Void/fire shard node — pale gold pulse
        ctx.fillStyle = r.depleted ? '#222' : '#2a1a00';
        ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI*2); ctx.fill();
        if (!r.depleted) {
          ctx.globalAlpha = 0.5 + Math.sin(t * 5 + sx * 0.02) * 0.4;
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = '#f1c40f88'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('shard', sx, sy + 22);
        return;
      }

      if (!r.depleted) {
        ctx.fillStyle = '#ffffffaa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(r.res, sx, sy + 24);
      }
    });

    // ── Checkpoints (flag pole art) ──────────────────────────────────────────
    G.checkpoints.forEach(cp => {
      const sx = wx(cp.x), sy = wy(cp.y);
      if (!onScreen(sx, sy)) return;

      const activated = cp.activated;
      const flagColor = activated ? '#00ff88' : '#f1c40f';
      const pulse = 0.65 + Math.sin(t * 2.1) * 0.35;

      // Glow halo
      ctx.globalAlpha = activated ? 0.22 : pulse * 0.32;
      ctx.fillStyle   = flagColor;
      ctx.beginPath(); ctx.arc(sx, sy - 14, 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // Base stone
      ctx.fillStyle = '#7a6a50';
      ctx.fillRect(sx - 5, sy + 2, 10, 6);

      // Pole
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth   = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy + 2); ctx.lineTo(sx, sy - 34); ctx.stroke();

      // Flag body (waves when inactive)
      const wave = activated ? 0 : Math.sin(t * 4) * 2;
      ctx.fillStyle   = flagColor;
      ctx.globalAlpha = activated ? 1 : pulse;
      ctx.beginPath();
      ctx.moveTo(sx,      sy - 34);
      ctx.lineTo(sx + 15, sy - 28 + wave);
      ctx.lineTo(sx + 15, sy - 21 + wave);
      ctx.lineTo(sx,      sy - 20);
      ctx.closePath(); ctx.fill();

      // Flag shine
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx,     sy - 34);
      ctx.lineTo(sx + 7, sy - 30 + wave);
      ctx.lineTo(sx + 7, sy - 26 + wave);
      ctx.lineTo(sx,     sy - 28);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;

      // Label
      ctx.fillStyle = '#ffffffcc';
      ctx.font      = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activated ? '✓ SAVED' : 'SAVE', sx, sy + 18);
    });

    // ── Village of Kaelford ──────────────────────────────────────────────────
    const VX = wx(25*TILE), VY = wy(44*TILE);
    if (onScreen(VX, VY, 380)) {

      // ── Ground — cobblestone plaza (tiled pattern) ──────────────────────
      ctx.fillStyle = '#8a7a60';
      ctx.fillRect(VX - 195, VY - 145, 390, 270);
      // Stone tile grid
      ctx.strokeStyle = '#7a6a50'; ctx.lineWidth = 1;
      for (let gx = -195; gx < 195; gx += 20) ctx.strokeRect(VX + gx, VY - 145, 20, 20);
      for (let gy = -145; gy < 125; gy += 20)  ctx.strokeRect(VX - 195, VY + gy, 390, 20);
      // Path from gate to crafting hall — lighter stone
      ctx.fillStyle = '#9a8a6a';
      ctx.fillRect(VX - 16, VY - 145, 32, 270);
      ctx.fillRect(VX - 195, VY - 8, 390, 16);

      // ── Village fence / outer wall ──────────────────────────────────────
      const fenceColor = '#6b4f2c';
      // Top fence
      for (let fx = -195; fx < 195; fx += 14) {
        ctx.fillStyle = fenceColor;
        ctx.fillRect(VX + fx, VY - 153, 10, 16);
        ctx.fillStyle = '#8a6a3c';
        ctx.fillRect(VX + fx, VY - 153, 10, 3);
      }
      // Left fence
      for (let fy = -145; fy < 120; fy += 14) {
        ctx.fillStyle = fenceColor; ctx.fillRect(VX - 199, VY + fy, 10, 10);
      }
      // Right fence
      for (let fy = -145; fy < 120; fy += 14) {
        ctx.fillStyle = fenceColor; ctx.fillRect(VX + 191, VY + fy, 10, 10);
      }

      // ── Village Gate (south entry) ──────────────────────────────────────
      const gateX = VX, gateY = VY + 122;
      ctx.fillStyle = '#5a3a1e'; // Gate posts
      ctx.fillRect(gateX - 22, gateY - 28, 10, 34);
      ctx.fillRect(gateX + 12, gateY - 28, 10, 34);
      ctx.fillStyle = '#7a5a2e';
      ctx.fillRect(gateX - 22, gateY - 32, 44, 8); // crossbar
      ctx.fillStyle = '#d4af37'; // Gate lanterns
      const lanternPulse = 0.7 + Math.sin(t * 2.5) * 0.3;
      ctx.globalAlpha = lanternPulse * 0.6;
      ctx.beginPath(); ctx.arc(gateX - 17, gateY - 36, 8, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(gateX + 17, gateY - 36, 8, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e67e22';
      ctx.beginPath(); ctx.arc(gateX - 17, gateY - 36, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(gateX + 17, gateY - 36, 4, 0, Math.PI*2); ctx.fill();
      // Gate sign
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(gateX - 30, gateY - 54, 60, 16);
      ctx.fillStyle = '#d4af37'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.strokeText('KAELFORD', gateX, gateY - 43);
      ctx.fillText('KAELFORD', gateX, gateY - 43);

      // ── Village Well (center) ──────────────────────────────────────────
      const wellX = VX - 40, wellY = VY - 30;
      // Shadow
      ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(wellX + 3, wellY + 14, 16, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      // Well base ring
      ctx.fillStyle = '#5a5a5a'; ctx.beginPath(); ctx.arc(wellX, wellY, 14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0a0a1a'; ctx.beginPath(); ctx.arc(wellX, wellY, 10, 0, Math.PI*2); ctx.fill(); // water
      ctx.fillStyle = '#1a2a3a'; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(wellX, wellY + 2, 7, 0, Math.PI*2); ctx.fill(); // water surface
      ctx.globalAlpha = 1;
      // Well posts + crossbeam
      ctx.fillStyle = '#5c3a1e'; ctx.fillRect(wellX - 14, wellY - 20, 4, 22);
      ctx.fillRect(wellX + 10, wellY - 20, 4, 22);
      ctx.fillRect(wellX - 16, wellY - 22, 36, 5);
      // Rope
      ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(wellX, wellY - 19); ctx.lineTo(wellX, wellY - 6); ctx.stroke();
      // Bucket
      ctx.fillStyle = '#5c3a1e'; ctx.fillRect(wellX - 5, wellY - 8, 10, 8);
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(wellX - 5, wellY - 8); ctx.lineTo(wellX, wellY - 12); ctx.lineTo(wellX + 5, wellY - 8); ctx.stroke();

      // ── Crafting Hall (north, largest building) ────────────────────────
      const chX = VX, chY = VY - 105;
      // Shadow
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(chX + 5, chY + 36, 55, 10, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      // Building depth
      ctx.fillStyle = '#4a3520'; ctx.fillRect(chX - 42, chY - 32, 84, 70);
      ctx.translate(0, 0); // no transform needed
      // Main walls
      ctx.fillStyle = '#6b5030'; ctx.fillRect(chX - 40, chY - 34, 80, 70);
      // Wall highlight
      ctx.fillStyle = '#7a6040'; ctx.globalAlpha = 0.5;
      ctx.fillRect(chX - 40, chY - 34, 80, 8);
      ctx.globalAlpha = 1;
      // Roof — thatch style
      ctx.fillStyle = '#8b6914';
      ctx.beginPath();
      ctx.moveTo(chX, chY - 60);
      ctx.lineTo(chX - 48, chY - 30);
      ctx.lineTo(chX + 48, chY - 30);
      ctx.closePath(); ctx.fill();
      // Roof stripes (thatch lines)
      ctx.strokeStyle = '#6b5010'; ctx.lineWidth = 1.5;
      for (let rs = -4; rs <= 4; rs++) {
        const rx = chX + rs * 10;
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(rx, chY - 60 + Math.abs(rs)*2); ctx.lineTo(chX - 48 + (rs+4)*9, chY - 30); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Ridge cap
      ctx.fillStyle = '#5a4808'; ctx.fillRect(chX - 4, chY - 62, 8, 34);
      // Door
      ctx.fillStyle = '#2a1808'; ctx.fillRect(chX - 9, chY + 14, 18, 22);
      ctx.fillStyle = '#3a2010'; ctx.fillRect(chX - 8, chY + 15, 16, 20);
      ctx.fillStyle = '#d4af37'; // door handle
      ctx.beginPath(); ctx.arc(chX + 5, chY + 24, 2, 0, Math.PI*2); ctx.fill();
      // Windows
      [[-22, -5],[22, -5]].forEach(([wx2]) => {
        ctx.fillStyle = '#1a0e04'; ctx.fillRect(chX + wx2 - 7, chY - 10, 14, 12);
        // Warm interior glow
        ctx.globalAlpha = 0.5 + Math.sin(t * 1.8) * 0.15;
        ctx.fillStyle = '#e67e22'; ctx.fillRect(chX + wx2 - 6, chY - 9, 12, 10);
        ctx.globalAlpha = 1;
        // Window cross
        ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(chX+wx2, chY-10); ctx.lineTo(chX+wx2, chY+2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(chX+wx2-7, chY-4); ctx.lineTo(chX+wx2+7, chY-4); ctx.stroke();
      });
      // Sign above door
      ctx.fillStyle = '#5c3a1e'; ctx.fillRect(chX - 20, chY + 8, 40, 10);
      ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.strokeText('⚒ CRAFTING HALL', chX, chY + 16);
      ctx.fillText('⚒ CRAFTING HALL', chX, chY + 16);
      // Smoke from chimney
      ctx.fillStyle = '#8a8a7a';
      const chimneyX = chX + 24;
      for (let s = 0; s < 4; s++) {
        const sy2 = chY - 48 - ((t * 22 + s * 15) % 40);
        const sa = 0.25 - ((t * 22 + s * 15) % 40) / 200;
        ctx.globalAlpha = Math.max(0, sa);
        ctx.beginPath(); ctx.arc(chimneyX + Math.sin(t + s) * 3, sy2, 5 + s, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // [E] Enter
      const nearCH = dist(G.player.x, G.player.y, 25*TILE, (44-1.5)*TILE) < 60;
      if (nearCH) {
        ctx.fillStyle = '#d4af37'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('[E] Enter Crafting Hall', chX, chY + 42);
      }
      // [E] Talk prompts above NPCs
      G.villageNPCs.forEach(npc => {
        if (dist(G.player.x, G.player.y, npc.x, npc.y) > 52) return;
        const nx3 = wx(npc.x), ny3 = wy(npc.y);
        ctx.fillStyle = npc.color; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.strokeText('[E] Talk', nx3, ny3 - 26);
        ctx.fillText('[E] Talk', nx3, ny3 - 26);
      });

      // ── Forge / Blacksmith Shop (east) ─────────────────────────────────
      const fgX = VX + 120, fgY = VY - 15;
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(fgX - 24, fgY - 22, 44, 38);
      ctx.fillStyle = '#3a2618'; ctx.fillRect(fgX - 22, fgY - 24, 40, 38);
      ctx.fillStyle = '#4a3222';
      ctx.beginPath(); ctx.moveTo(fgX, fgY - 36); ctx.lineTo(fgX - 26, fgY - 20); ctx.lineTo(fgX + 20, fgY - 20); ctx.closePath(); ctx.fill();
      // Forge glow window
      const forgeGlow = 0.6 + Math.sin(t * 4) * 0.35;
      ctx.globalAlpha = forgeGlow; ctx.fillStyle = '#e67e22';
      ctx.beginPath(); ctx.arc(fgX - 6, fgY - 4, 9, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = forgeGlow * 0.5; ctx.fillStyle = '#f1c40f';
      ctx.beginPath(); ctx.arc(fgX - 6, fgY - 4, 5, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      // Anvil silhouette
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(fgX + 4, fgY + 2, 12, 6);
      ctx.fillRect(fgX + 2, fgY + 8, 16, 4);
      // Sign
      ctx.fillStyle = '#5c3a1e'; ctx.fillRect(fgX - 20, fgY - 42, 38, 10);
      ctx.fillStyle = '#e67e22'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.strokeText('⚔ FORGE', fgX - 2, fgY - 34);
      ctx.fillText('⚔ FORGE', fgX - 2, fgY - 34);

      // ── Market Stall (west) ─────────────────────────────────────────────
      const mkX = VX - 120, mkY = VY - 15;
      // Awning — striped
      ctx.fillStyle = '#9b59b6'; ctx.fillRect(mkX - 24, mkY - 24, 48, 4);
      for (let ms = 0; ms < 4; ms++) {
        ctx.fillStyle = ms % 2 === 0 ? '#8e44ad' : '#9b59b6';
        ctx.fillRect(mkX - 24 + ms * 12, mkY - 32, 12, 12);
      }
      // Awning edge fringe
      ctx.fillStyle = '#c39bd3';
      for (let mf = 0; mf < 7; mf++) ctx.fillRect(mkX - 24 + mf * 7, mkY - 20, 5, 5);
      // Counter / table
      ctx.fillStyle = '#5c3a1e'; ctx.fillRect(mkX - 22, mkY - 18, 44, 6);
      ctx.fillStyle = '#7a5030'; ctx.fillRect(mkX - 22, mkY - 24, 44, 8);
      // Items on display
      ['#e74c3c','#f1c40f','#3498db'].forEach((col, mi) => {
        ctx.fillStyle = col; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(mkX - 10 + mi * 10, mkY - 22, 4, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      // Sign
      ctx.fillStyle = '#5c3a1e'; ctx.fillRect(mkX - 20, mkY - 42, 38, 10);
      ctx.fillStyle = '#9b59b6'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.strokeText('🧪 MARKET', mkX - 1, mkY - 34);
      ctx.fillText('🧪 MARKET', mkX - 1, mkY - 34);

      // ── Healer Hut (west side) ──────────────────────────────────────────
      const hlX = VX - 130, hlY = VY + 50;
      ctx.fillStyle = '#2a4a2a'; ctx.fillRect(hlX - 20, hlY - 20, 36, 32);
      ctx.fillStyle = '#2e6b2e'; ctx.fillRect(hlX - 18, hlY - 22, 32, 30);
      ctx.fillStyle = '#3a8a3a';
      ctx.beginPath(); ctx.moveTo(hlX, hlY - 38); ctx.lineTo(hlX - 22, hlY - 18); ctx.lineTo(hlX + 16, hlY - 18); ctx.closePath(); ctx.fill();
      // Cross symbol
      ctx.fillStyle = '#e74c3c'; ctx.globalAlpha = 0.85;
      ctx.fillRect(hlX - 2, hlY - 12, 4, 10);
      ctx.fillRect(hlX - 5, hlY - 8, 10, 4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.strokeText('✚ HEALER', hlX - 2, hlY - 44);
      ctx.fillText('✚ HEALER', hlX - 2, hlY - 44);

      // ── Storage building (east side) ────────────────────────────────────
      const stX = VX + 130, stY = VY + 50;
      ctx.fillStyle = '#3a3010'; ctx.fillRect(stX - 20, stY - 18, 38, 32);
      ctx.fillStyle = '#4a4018'; ctx.fillRect(stX - 18, stY - 20, 34, 30);
      ctx.fillStyle = '#5a5020';
      ctx.beginPath(); ctx.moveTo(stX, stY - 34); ctx.lineTo(stX - 22, stY - 16); ctx.lineTo(stX + 18, stY - 16); ctx.closePath(); ctx.fill();
      // Crates outside
      [[-12, 6],[-2, 8],[8, 4]].forEach(([dx,dy]) => {
        ctx.fillStyle = '#5c3a1e'; ctx.fillRect(stX + dx, stY + dy, 8, 8);
        ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1; ctx.strokeRect(stX + dx, stY + dy, 8, 8);
        ctx.strokeStyle = '#7a5030'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(stX+dx+4, stY+dy); ctx.lineTo(stX+dx+4, stY+dy+8); ctx.stroke();
      });
      ctx.fillStyle = '#d4af37'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.strokeText('📦 STORAGE', stX - 1, stY - 40);
      ctx.fillText('📦 STORAGE', stX - 1, stY - 40);

      // ── Decorative trees inside village ────────────────────────────────
      [[-160,-110],[160,-110],[-160,90],[160,90]].forEach(([dx,dy]) => {
        const tx3 = VX+dx, ty3 = VY+dy;
        ctx.fillStyle = '#00000022';
        ctx.beginPath(); ctx.ellipse(tx3+3, ty3+16, 11, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#5c3a1e'; ctx.fillRect(tx3-3, ty3+4, 6, 14);
        ctx.fillStyle = '#1a5e20'; ctx.beginPath(); ctx.arc(tx3, ty3-4, 14, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1e7026'; ctx.beginPath(); ctx.arc(tx3-4, ty3-8, 9, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(tx3+4, ty3-7, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#25892e'; ctx.beginPath(); ctx.arc(tx3, ty3-12, 7, 0, Math.PI*2); ctx.fill();
      });

      // ── Village NPCs ────────────────────────────────────────────────────
      G.villageNPCs.forEach(npc => {
        const nx2 = wx(npc.x), ny2 = wy(npc.y);
        if (!onScreen(nx2, ny2, 30)) return;
        const npcWalk = Math.sin(t * 7 + npc.x * 0.01);
        const npcMoving = !npc.seated && (Math.abs(npc.tx - npc.x) > 4 || Math.abs(npc.ty - npc.y) > 4);

        // Shadow
        ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(nx2, ny2 + 12, 9, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;

        if (npc.seated) {
          // Seated pose — draw a short squashed figure on a stool
          ctx.fillStyle = '#5c3a1e';
          ctx.fillRect(nx2 - 6, ny2 + 4, 12, 6); // stool
          ctx.fillRect(nx2 - 3, ny2 + 10, 3, 5);
          ctx.fillRect(nx2 + 0, ny2 + 10, 3, 5);
          // Body (compressed — seated)
          ctx.fillStyle = npc.color;
          ctx.fillRect(nx2 - 6, ny2 - 4, 12, 10); // torso
          ctx.fillRect(nx2 - 8, ny2, 4, 6); // left leg across
          ctx.fillRect(nx2 + 4, ny2, 4, 6); // right leg across
          // Head
          ctx.fillStyle = npc.role === 'elder' ? '#f5cba7' : npc.role === 'healer' ? '#f0e6ff' : '#f5d5a0';
          ctx.beginPath(); ctx.arc(nx2, ny2 - 10, 8, 0, Math.PI*2); ctx.fill();
        } else {
          // Walking/standing figure
          const lLeg = npcMoving ? npcWalk * 3 : 0;
          // Legs
          ctx.fillStyle = '#4a3010';
          ctx.fillRect(nx2 - 5 + lLeg, ny2 + 6, 4, 7);
          ctx.fillRect(nx2 + 1 - lLeg, ny2 + 6, 4, 7);
          // Body
          ctx.fillStyle = npc.color;
          ctx.fillRect(nx2 - 7, ny2 - 4, 14, 12);
          // Role details
          if (npc.role === 'guard') {
            ctx.fillStyle = '#95a5a6'; ctx.fillRect(nx2 - 8, ny2 - 5, 16, 14); // armor
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(nx2 - 8, ny2 - 5, 16, 4); // chest plate
            // Spear
            ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(nx2 + 9, ny2 + 12); ctx.lineTo(nx2 + 9, ny2 - 22); ctx.stroke();
            ctx.fillStyle = '#95a5a6'; ctx.beginPath(); ctx.moveTo(nx2+9, ny2-22); ctx.lineTo(nx2+7, ny2-16); ctx.lineTo(nx2+11, ny2-16); ctx.closePath(); ctx.fill();
          } else if (npc.role === 'smith') {
            ctx.fillStyle = '#5d4037'; ctx.fillRect(nx2 - 7, ny2 - 3, 14, 12); // apron
            // Hammer
            ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(nx2 - 10, ny2 + 4); ctx.lineTo(nx2 - 10, ny2 - 8); ctx.stroke();
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(nx2 - 14, ny2 - 10, 10, 5);
          } else if (npc.role === 'merchant') {
            ctx.fillStyle = '#8e44ad'; ctx.fillRect(nx2 - 7, ny2 - 3, 14, 10);
          } else if (npc.role === 'healer') {
            ctx.fillStyle = '#27ae60'; ctx.fillRect(nx2 - 7, ny2 - 3, 14, 10);
            ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7;
            ctx.fillRect(nx2 - 2, ny2 - 1, 4, 8); ctx.fillRect(nx2 - 5, ny2 + 2, 10, 3);
            ctx.globalAlpha = 1;
          }
          // Arms
          ctx.fillStyle = npc.color;
          const armSway = npcMoving ? npcWalk * 2 : 0;
          ctx.fillRect(nx2 - 10, ny2 - 3 + armSway, 4, 8);
          ctx.fillRect(nx2 + 6, ny2 - 3 - armSway, 4, 8);
          // Head
          ctx.fillStyle = npc.role === 'elder' ? '#f5cba7' : npc.role === 'healer' ? '#f0e6ff' : '#f5d5a0';
          ctx.beginPath(); ctx.arc(nx2, ny2 - 10, 8, 0, Math.PI*2); ctx.fill();
          // Hair / hat by role
          if (npc.role === 'elder') {
            ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.arc(nx2, ny2 - 12, 7, Math.PI, 0); ctx.fill(); // white hair
            ctx.fillStyle = '#1abc9c'; ctx.fillRect(nx2 - 8, ny2 - 20, 16, 5); // teal hat
            ctx.fillRect(nx2 - 5, ny2 - 26, 10, 8);
          } else if (npc.role === 'smith') {
            ctx.fillStyle = '#2c2c2c'; ctx.beginPath(); ctx.arc(nx2, ny2 - 12, 8, Math.PI, 0); ctx.fill();
          } else if (npc.role === 'merchant') {
            ctx.fillStyle = '#6c3483'; ctx.fillRect(nx2 - 7, ny2 - 20, 14, 4);
            ctx.fillRect(nx2 - 4, ny2 - 26, 8, 8);
          } else if (npc.role === 'guard') {
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(nx2 - 8, ny2 - 18, 16, 10); // helmet
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(nx2 - 8, ny2 - 18, 16, 4);
            ctx.fillStyle = '#0a0a0a'; ctx.fillRect(nx2 - 4, ny2 - 14, 8, 4); // visor
          }
        }

        // Name label
        const nearNPC = dist(G.player.x, G.player.y, npc.x, npc.y) < 55;
        if (nearNPC || npc.role === 'elder') {
          ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
          ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
          ctx.strokeText(npc.name, nx2, ny2 - 22);
          ctx.fillStyle = npc.color;
          ctx.fillText(npc.name, nx2, ny2 - 22);
          if (nearNPC && npc.role !== 'guard') {
            ctx.fillStyle = '#ffffff88'; ctx.font = '7px sans-serif';
            ctx.fillText('[E] Talk', nx2, ny2 - 13);
          }
        }
      });

      // ── Proximity prompt ────────────────────────────────────────────────
      const nearVillage = dist(G.player.x, G.player.y, 25*TILE, 44*TILE) < 180;
      if (nearVillage) {
        ctx.fillStyle = '#d4af37'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.strokeText('⚒ KAELFORD', VX, VY - 118);
        ctx.fillText('⚒ KAELFORD', VX, VY - 118);
      }
    }

    // ── Dungeon ─────────────────────────────────────────────────────────────
    const dunx = wx(43*TILE), duny = wy(10*TILE);
    if (onScreen(dunx, duny, 80)) {
      // Stone arch base
      ctx.fillStyle = '#2c2c3a';
      ctx.fillRect(dunx - 22, duny - 16, 44, 28);
      // Arch cutout
      ctx.fillStyle = tileColor(43, 10);
      ctx.beginPath(); ctx.arc(dunx, duny + 2, 12, Math.PI, 0); ctx.fill();
      ctx.fillRect(dunx - 12, duny - 14, 24, 16);
      // Torches
      ctx.fillStyle = '#e67e22';
      ctx.globalAlpha = 0.7 + Math.sin(t * 7) * 0.3;
      ctx.beginPath(); ctx.arc(dunx - 22, duny - 20, 5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(dunx + 22, duny - 20, 5, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚠ DUNGEON', dunx, duny - 30);
      ctx.fillStyle = '#cc88ffaa'; ctx.font = '9px sans-serif';
      ctx.fillText('[E] Enter', dunx, duny + 24);
    }

    // ── Realm portals ──────────────────────────────────────────────────────
    REALM_PORTALS.forEach(portal => {
      const prx = wx(portal.x*TILE), pry = wy(portal.y*TILE);
      if (!onScreen(prx, pry, 100)) return;
      const pulse      = 0.65 + Math.sin(t * 0.7 + portal.x * 0.5) * 0.35;
      const nearPlayer = dist(p.x, p.y, portal.x*TILE, portal.y*TILE) < 64;
      const storeSnap  = useGameStore.getState();
      const beaten     = storeSnap.bossesDefeated?.includes(portal.realm);

      // ── Stone arch base / ground pad ──────────────────────────────────
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#2c2c2c';
      ctx.beginPath(); ctx.ellipse(prx, pry + 26, 34, 10, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;

      // Left pillar
      const pillarColor = beaten ? '#8a7a20' : '#4a4030';
      const pillarHighlight = beaten ? '#c8a030' : '#6a6048';
      ctx.fillStyle = pillarColor;
      ctx.fillRect(prx - 36, pry - 28, 12, 54);
      ctx.fillStyle = pillarHighlight; ctx.globalAlpha = 0.4;
      ctx.fillRect(prx - 36, pry - 28, 4, 54);
      ctx.globalAlpha = 1;
      // Left pillar cap
      ctx.fillStyle = beaten ? '#a08828' : '#5a5040';
      ctx.fillRect(prx - 39, pry - 32, 18, 7);
      // Left pillar rune etchings
      ctx.strokeStyle = portal.color + '88'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(prx - 32, pry - 18); ctx.lineTo(prx - 28, pry - 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(prx - 32, pry - 4); ctx.lineTo(prx - 28, pry + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(prx - 32, pry + 10); ctx.lineTo(prx - 28, pry + 16); ctx.stroke();

      // Right pillar
      ctx.fillStyle = pillarColor;
      ctx.fillRect(prx + 24, pry - 28, 12, 54);
      ctx.fillStyle = pillarHighlight; ctx.globalAlpha = 0.4;
      ctx.fillRect(prx + 32, pry - 28, 4, 54);
      ctx.globalAlpha = 1;
      // Right pillar cap
      ctx.fillStyle = beaten ? '#a08828' : '#5a5040';
      ctx.fillRect(prx + 21, pry - 32, 18, 7);
      // Right pillar rune etchings
      ctx.strokeStyle = portal.color + '88'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(prx + 28, pry - 18); ctx.lineTo(prx + 32, pry - 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(prx + 28, pry - 4); ctx.lineTo(prx + 32, pry + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(prx + 28, pry + 10); ctx.lineTo(prx + 32, pry + 16); ctx.stroke();

      // Arch crossbeam
      ctx.fillStyle = beaten ? '#8a7a20' : '#3a3028';
      ctx.fillRect(prx - 39, pry - 44, 82, 14);
      // Arch keystone
      ctx.fillStyle = beaten ? '#d4af37' : portal.color;
      ctx.beginPath();
      ctx.moveTo(prx, pry - 56); ctx.lineTo(prx - 10, pry - 44); ctx.lineTo(prx + 10, pry - 44);
      ctx.closePath(); ctx.fill();

      // ── Portal vortex ─────────────────────────────────────────────────
      // Outer color glow halo
      ctx.globalAlpha = 0.18 + pulse * 0.08;
      const grad = ctx.createRadialGradient(prx, pry, 4, prx, pry, 42);
      grad.addColorStop(0, portal.color);
      grad.addColorStop(1, portal.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(prx, pry, 42, 0, Math.PI*2); ctx.fill();
      // Portal surface
      ctx.globalAlpha = 0.55 + pulse * 0.15;
      ctx.fillStyle = portal.color + '44';
      ctx.beginPath(); ctx.arc(prx, pry, 22, 0, Math.PI*2); ctx.fill();
      // Rotating rings
      ctx.globalAlpha = pulse * 0.6;
      ctx.strokeStyle = portal.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(prx, pry, 28, t/1.1, t/1.1 + Math.PI * 1.5); ctx.stroke();
      ctx.globalAlpha = pulse * 0.8;
      ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(prx, pry, 18, -t/0.9, -t/0.9 + Math.PI * 1.1); ctx.stroke();
      ctx.globalAlpha = 1;

      // Icon
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(portal.icon, prx, pry + 6);

      // Realm name label on arch
      ctx.fillStyle = beaten ? '#d4af37' : '#fff';
      ctx.font = `bold 8px sans-serif`;
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.strokeText(portal.name.replace(' Realm','').toUpperCase(), prx, pry - 48);
      ctx.fillText(portal.name.replace(' Realm','').toUpperCase(), prx, pry - 48);

      // Skull difficulty under name
      ctx.fillStyle = '#ffffff88'; ctx.font = '7px sans-serif';
      ctx.fillText('💀'.repeat(portal.skulls), prx, pry + 36);

      // ── Defeated banner ───────────────────────────────────────────────
      if (beaten) {
        // Gold seal glow on keystone
        ctx.globalAlpha = 0.5 + Math.sin(t * 2) * 0.2;
        ctx.fillStyle = '#d4af37';
        ctx.beginPath(); ctx.arc(prx, pry - 52, 7, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('👑', prx, pry - 50);
        // "DEFEATED" ribbon across archway
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#1a8a1a';
        ctx.fillRect(prx - 34, pry - 16, 68, 12);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#90ee90'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('✓ DEFEATED', prx, pry - 7);
      }

      // Enter prompt
      if (nearPlayer) {
        ctx.fillStyle = portal.color;
        ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.strokeText('[E] Enter', prx, pry + 46);
        ctx.fillText('[E] Enter', prx, pry + 46);
      }
    });

    // ── Zone labels ────────────────────────────────────────────────────────
    [
      { text: 'NORTHERN FOREST',   lx: wx(35*TILE), ly: wy( 8*TILE) },
      { text: 'EASTERN REACHES',   lx: wx(62*TILE), ly: wy(25*TILE) },
      { text: 'SOUTHERN BADLANDS', lx: wx(30*TILE), ly: wy(58*TILE) },
      { text: 'DEEP SOUTH',        lx: wx(35*TILE), ly: wy(72*TILE) },
      { text: 'WESTERN VALLEY',    lx: wx( 8*TILE), ly: wy(45*TILE) },
      { text: 'EASTERN HIGHLANDS', lx: wx(88*TILE), ly: wy(15*TILE) },
      { text: 'ASHEN WASTES',      lx: wx(98*TILE), ly: wy(55*TILE) },
      { text: 'CRYSTAL PLAINS',    lx: wx(84*TILE), ly: wy(60*TILE) },
      { text: 'VOID APPROACH',     lx: wx(105*TILE),ly: wy(82*TILE) },
    ].forEach(({ text, lx, ly }) => {
      if (!onScreen(lx, ly, 100)) return;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(text, lx, ly);
      ctx.globalAlpha = 1;
    });

    // ── Village NPCs rendered inside the Village block above ───────────────

    // ── Starter sword pickup ───────────────────────────────────────────────
    if (!G.swordPicked) {
      const isx = wx(27*TILE), isy = wy(27*TILE);
      if (onScreen(isx, isy)) {
        ctx.globalAlpha = 0.5 + Math.sin(t * 2.5) * 0.5;
        ctx.fillStyle = '#bdc3c7'; ctx.fillRect(isx-5, isy-14, 10, 24);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#bdc3c7'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⚔ Iron Sword + Whirlwind', isx, isy - 22);
        ctx.fillStyle = '#bdc3c7aa'; ctx.font = '9px sans-serif';
        ctx.fillText('[E] Pick up', isx, isy + 24);
      }
    }

    // ── Ability effect ─────────────────────────────────────────────────────
    if (G.abilityEffect) {
      const fx = G.abilityEffect, fpx = wx(fx.x), fpy = wy(fx.y);
      const progress = 1 - (fx.timer / fx.maxTimer);
      const alpha    = fx.timer / fx.maxTimer;
      const colors   = ABILITY_COLORS[fx.id] || { primary: '#fff', secondary: '#aaa' };
      ctx.globalAlpha = alpha * 0.85;
      if (fx.id === 'whirlwind') {
        const r = fx.maxRadius * progress;
        ctx.strokeStyle = colors.primary; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(fpx, fpy, r, 0, Math.PI*2); ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i/6)*Math.PI*2 + progress*Math.PI*4;
          ctx.strokeStyle = colors.secondary; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(fpx+Math.cos(a)*r*0.5, fpy+Math.sin(a)*r*0.5, r*0.25, a+0.5, a+2.5); ctx.stroke();
        }
      } else if (fx.id === 'ground_slam') {
        for (let ring = 0; ring < 4; ring++) {
          const rp = Math.max(0, progress - ring * 0.12);
          const r = fx.maxRadius * rp; if (r <= 0) continue;
          ctx.strokeStyle = ring === 0 ? colors.primary : colors.secondary;
          ctx.lineWidth = Math.max(1, 5 - ring * 1.2);
          ctx.globalAlpha = alpha * (1 - ring * 0.2) * 0.85;
          ctx.beginPath(); ctx.arc(fpx, fpy, r, 0, Math.PI*2); ctx.stroke();
        }
        ctx.globalAlpha = (1 - progress) * alpha * 0.6;
        ctx.fillStyle = colors.primary;
        ctx.beginPath(); ctx.arc(fpx, fpy, 20 * (1-progress), 0, Math.PI*2); ctx.fill();
      } else if (fx.id === 'arcane_burst') {
        const r = fx.maxRadius * progress;
        ctx.strokeStyle = colors.primary; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fpx, fpy, r, 0, Math.PI*2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i/8)*Math.PI*2 + progress*Math.PI;
          const spx = fpx + Math.cos(a)*r, spy = fpy + Math.sin(a)*r;
          ctx.fillStyle = colors.secondary;
          ctx.beginPath(); ctx.arc(spx, spy, 4, 0, Math.PI*2); ctx.fill();
        }
      } else if (fx.id === 'flurry') {
        for (let i = 0; i < 8; i++) {
          const a = (i/8)*Math.PI*2 + progress*Math.PI*2;
          const r1 = 20 + progress * 30, r2 = r1 + 20;
          ctx.strokeStyle = i%2===0 ? colors.primary : colors.secondary; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(fpx+Math.cos(a)*r1, fpy+Math.sin(a)*r1);
          ctx.lineTo(fpx+Math.cos(a)*r2, fpy+Math.sin(a)*r2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Power Shot projectiles ─────────────────────────────────────────────
    G.projectiles.forEach(proj => {
      const ppx = wx(proj.x), ppy = wy(proj.y);
      if (!onScreen(ppx, ppy)) return;
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#FCD34D'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ppx, ppy); ctx.lineTo(ppx-(proj.vx/420)*22, ppy-(proj.vy/420)*22); ctx.stroke();
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#F97316';
      ctx.beginPath(); ctx.arc(ppx, ppy, 10, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#FCD34D';
      ctx.beginPath(); ctx.arc(ppx, ppy, 5, 0, Math.PI*2); ctx.fill();
    });

    // ── Basic arrows ───────────────────────────────────────────────────────
    G.basicArrows.forEach(arrow => {
      const ax = wx(arrow.x), ay = wy(arrow.y);
      if (!onScreen(ax, ay)) return;
      const angle = Math.atan2(arrow.vy, arrow.vx);
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ax - Math.cos(angle)*12, ay - Math.sin(angle)*12);
      ctx.lineTo(ax + Math.cos(angle)*6,  ay + Math.sin(angle)*6);
      ctx.stroke();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(ax+Math.cos(angle)*6, ay+Math.sin(angle)*6, 3, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    });

    // ── Melee attack effect ────────────────────────────────────────────────
    if (G.attackEffect) {
      const ae = G.attackEffect, ax = wx(ae.x), ay = wy(ae.y);
      const alpha = ae.timer / ae.maxTimer, prog = 1 - alpha;
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

    // ── Enemies ────────────────────────────────────────────────────────────
    G.enemies.forEach(e => {
      if (!e.alive) return;
      const ex = wx(e.x), ey = wy(e.y);
      if (!onScreen(ex, ey)) return;
      const ecfg    = EnemyConfig[e.type];
      const isGolem = e.type === 'golem' || e.type === 'stone_guardian';
      const r       = isGolem ? (e.isElite ? 22 : 18) : (e.isElite ? 15 : 12);
      const aggroed = e.state !== 'patrol';
      const stunned = e.stunTimer > 0;
      const isGold  = e.type === 'gold_goblin';

      // Ground shadow
      ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(ex, ey + r + 2, r * 0.9, r * 0.32, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;

      // Elite glow ring
      if (e.isElite && !stunned) {
        const glowColor = isGold ? '#f1c40f' : e.type === 'stone_guardian' ? '#8e44ad' : '#ff4444';
        ctx.globalAlpha = 0.3 + Math.sin(t * 2.5) * 0.15;
        ctx.strokeStyle = glowColor; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(ex, ey, r + 6, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.globalAlpha = stunned ? (Math.sin(t * 12.5) > 0 ? 0.4 : 1) : 1;

      if (isGolem) {
        // ── Stone Golem / Guardian ──────────────────────────────────────────
        const fillColor = e.type === 'stone_guardian' ? (aggroed ? '#5d3a7a' : '#8e44ad') : (aggroed ? '#606060' : '#7f8c8d');
        // Leg blocks
        ctx.fillStyle = fillColor;
        ctx.fillRect(ex - r*0.65, ey + r*0.25, r*0.55, r*0.75);
        ctx.fillRect(ex + r*0.1,  ey + r*0.25, r*0.55, r*0.75);
        // Torso
        ctx.fillStyle = fillColor;
        ctx.fillRect(ex - r*0.8, ey - r*0.3, r*1.6, r*0.65);
        // Arm blocks
        ctx.fillStyle = aggroed ? '#505050' : '#6b6f72';
        const armSway = aggroed ? Math.sin(t * 4) * 4 : 0;
        ctx.fillRect(ex - r*1.4, ey - r*0.25 + armSway, r*0.55, r*0.55);
        ctx.fillRect(ex + r*0.85, ey - r*0.25 - armSway, r*0.55, r*0.55);
        // Head block
        ctx.fillStyle = aggroed ? (e.type === 'stone_guardian' ? '#6c3483' : '#6b6b6b') : (e.type === 'stone_guardian' ? '#9b59b6' : '#909497');
        ctx.fillRect(ex - r*0.6, ey - r*1.05, r*1.2, r*0.85);
        // Cracks
        ctx.strokeStyle = e.type === 'stone_guardian' ? '#c39bd3' : '#555555';
        ctx.lineWidth = 1.5; ctx.globalAlpha = aggroed ? 0.8 : 0.4;
        ctx.beginPath(); ctx.moveTo(ex - r*0.2, ey - r*0.95); ctx.lineTo(ex + r*0.15, ey - r*0.45); ctx.lineTo(ex - r*0.1, ey + r*0.1); ctx.stroke();
        ctx.globalAlpha = stunned ? (Math.sin(t*12.5)>0?0.4:1) : 1;
        // Eyes
        const eyeColor = e.type === 'stone_guardian' ? '#c39bd3' : (aggroed ? '#e74c3c' : '#f39c12');
        const eyePulse = aggroed ? 0.7 + Math.sin(t*6)*0.3 : 1;
        ctx.globalAlpha = eyePulse;
        ctx.fillStyle = eyeColor;
        ctx.beginPath(); ctx.arc(ex - r*0.25, ey - r*0.72, r*0.18, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + r*0.25, ey - r*0.72, r*0.18, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = stunned ? (Math.sin(t*12.5)>0?0.4:1) : 1;
        // Block outlines
        ctx.strokeStyle = e.type === 'stone_guardian' ? '#4a235a' : '#4d5656';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ex - r*0.8, ey - r*0.3, r*1.6, r*0.65);
        ctx.strokeRect(ex - r*0.6, ey - r*1.05, r*1.2, r*0.85);
      } else {
        // ── Goblin ──────────────────────────────────────────────────────────
        let bodyColor, detailColor;
        if (isGold) {
          bodyColor   = aggroed ? '#c8860a' : '#f1c40f';
          detailColor = aggroed ? '#e6a800' : '#ffd700';
        } else if (stunned) {
          bodyColor = '#FCD34D'; detailColor = '#f39c12';
        } else if (aggroed) {
          bodyColor = '#c0392b'; detailColor = '#e74c3c';
        } else {
          bodyColor = '#27ae60'; detailColor = '#2ecc71';
        }

        // Body
        ctx.fillStyle = bodyColor;
        ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI*2); ctx.fill();
        // Belly highlight
        ctx.fillStyle = detailColor;
        ctx.beginPath(); ctx.arc(ex, ey + r*0.1, r*0.62, 0, Math.PI*2); ctx.fill();

        // Spike ears
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(ex - r*0.7, ey - r*0.5); ctx.lineTo(ex - r*1.1, ey - r*1.05); ctx.lineTo(ex - r*0.25, ey - r*0.75);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ex + r*0.7, ey - r*0.5); ctx.lineTo(ex + r*1.1, ey - r*1.05); ctx.lineTo(ex + r*0.25, ey - r*0.75);
        ctx.closePath(); ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ex - r*0.32, ey - r*0.1, r*0.24, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + r*0.32, ey - r*0.1, r*0.24, 0, Math.PI*2); ctx.fill();
        // Pupils — follow aggro direction
        const pupilOff = aggroed ? 2 : 0;
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(ex - r*0.32 + pupilOff, ey - r*0.1, r*0.12, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + r*0.32 + pupilOff, ey - r*0.1, r*0.12, 0, Math.PI*2); ctx.fill();

        // Gold goblin crown
        if (isGold) {
          ctx.fillStyle = '#e6a800';
          for (let ci = 0; ci < 3; ci++) {
            const ca = -Math.PI * 0.65 + ci * Math.PI * 0.32;
            ctx.beginPath();
            ctx.moveTo(ex + Math.cos(ca)*r*0.78, ey + Math.sin(ca)*r*0.78);
            ctx.lineTo(ex + Math.cos(ca)*r*1.15, ey + Math.sin(ca)*r*1.15);
            ctx.lineTo(ex + Math.cos(ca+0.18)*r*0.82, ey + Math.sin(ca+0.18)*r*0.82);
            ctx.closePath(); ctx.fill();
          }
          // Gem
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath(); ctx.arc(ex, ey - r*1.05, r*0.18, 0, Math.PI*2); ctx.fill();
        }

        // Aggroed — angry brow lines
        if (aggroed && !stunned) {
          ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(ex - r*0.5, ey - r*0.35); ctx.lineTo(ex - r*0.15, ey - r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ex + r*0.5, ey - r*0.35); ctx.lineTo(ex + r*0.15, ey - r*0.5); ctx.stroke();
        }

        ctx.strokeStyle = isGold ? '#c8860a' : (stunned ? '#FCD34D' : aggroed ? '#922b21' : '#1a7a3a');
        ctx.lineWidth = e.isElite ? 2.5 : 1.5;
        ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI*2); ctx.stroke();
      }

      ctx.globalAlpha = 1;

      if (stunned) { ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💫', ex, ey - r - 8); }

      if (aggroed && !stunned) {
        const bw = e.isElite ? 48 : 36;
        ctx.fillStyle = '#222'; ctx.fillRect(ex - bw/2, ey - r - 12, bw, 5);
        ctx.fillStyle = e.isElite ? '#f1c40f' : '#e74c3c';
        ctx.fillRect(ex - bw/2, ey - r - 12, bw * (e.hp / e.maxHp), 5);
        ctx.fillStyle = e.isElite ? '#ffd700' : '#fff';
        ctx.font = `bold ${e.isElite ? 10 : 9}px sans-serif`; ctx.textAlign = 'center';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.strokeText(ecfg?.name || e.type, ex, ey - r - 16);
        ctx.fillText(ecfg?.name || e.type, ex, ey - r - 16);
        if (e.eliteStars > 0) { ctx.font = '8px sans-serif'; ctx.fillText('⭐'.repeat(e.eliteStars), ex, ey - r - 26); }
      } else if (e.isElite && !aggroed) {
        ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = e.type === 'gold_goblin' ? '#ffd700aa' : '#c39bd3aa';
        ctx.fillText('⭐'.repeat(e.eliteStars), ex, ey - r - 8);
      }
    });

        // ── Player — overworld Zelda-style hero ───────────────────────────────
    const ppx = wx(p.x), ppy = wy(p.y);
    const blinkOn = !p.invincible || Math.sin(t * 12.5) > 0;
    ctx.save();
    ctx.globalAlpha = blinkOn ? 1 : 0.2;

    const owWalk = Math.sin(t * 9);
    const owMoving = G.lastMoveDir && (G.lastMoveDir.x !== 0 || G.lastMoveDir.y !== 0);
    const owLeg = owMoving ? owWalk * 3 : 0;

    // Ground shadow
    ctx.fillStyle = '#00000030';
    ctx.beginPath(); ctx.ellipse(ppx, ppy + 13, 10, 3.5, 0, 0, Math.PI*2); ctx.fill();

    // Cape
    ctx.fillStyle = '#1a4a7a';
    ctx.beginPath();
    ctx.moveTo(ppx - 7, ppy + 1);
    ctx.bezierCurveTo(ppx - 12, ppy + 10, ppx - 9, ppy + 20, ppx - 3, ppy + 18);
    ctx.lineTo(ppx + 3, ppy + 18);
    ctx.bezierCurveTo(ppx + 9, ppy + 20, ppx + 12, ppy + 10, ppx + 7, ppy + 1);
    ctx.closePath(); ctx.fill();

    // Boots
    ctx.fillStyle = '#6b4226';
    ctx.beginPath(); ctx.ellipse(ppx - 4 + owLeg, ppy + 16, 4, 3.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ppx + 4 - owLeg, ppy + 16, 4, 3.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#8b5e3c';
    ctx.beginPath(); ctx.ellipse(ppx - 5 + owLeg, ppy + 14, 2.5, 1.8, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ppx + 3 - owLeg, ppy + 14, 2.5, 1.8, 0, 0, Math.PI*2); ctx.fill();

    // Tunic
    ctx.fillStyle = '#2980b9';
    ctx.beginPath();
    ctx.moveTo(ppx - 9, ppy + 3); ctx.lineTo(ppx - 7, ppy - 5);
    ctx.quadraticCurveTo(ppx, ppy - 8, ppx + 7, ppy - 5);
    ctx.lineTo(ppx + 9, ppy + 3);
    ctx.quadraticCurveTo(ppx, ppy + 8, ppx - 9, ppy + 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.moveTo(ppx - 5, ppy + 1); ctx.lineTo(ppx - 4, ppy - 4);
    ctx.quadraticCurveTo(ppx, ppy - 7, ppx + 4, ppy - 4);
    ctx.lineTo(ppx + 5, ppy + 1);
    ctx.quadraticCurveTo(ppx, ppy + 5, ppx - 5, ppy + 1);
    ctx.closePath(); ctx.fill();
    // Belt
    ctx.strokeStyle = '#1a5276'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ppx - 8, ppy + 2); ctx.lineTo(ppx + 8, ppy + 2); ctx.stroke();
    ctx.fillStyle = '#f1c40f'; ctx.fillRect(ppx - 2, ppy + 1, 4, 3);

    // Shield (left arm)
    const lSway = owMoving ? Math.sin(t * 9 + Math.PI) * 3 : 0;
    ctx.fillStyle = '#2471a3'; ctx.fillRect(ppx - 14, ppy - 3 + lSway, 4, 8);
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(ppx - 18, ppy - 4 + lSway); ctx.lineTo(ppx - 11, ppy - 4 + lSway);
    ctx.lineTo(ppx - 11, ppy + 3 + lSway); ctx.quadraticCurveTo(ppx - 14, ppy + 7 + lSway, ppx - 18, ppy + 3 + lSway);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#922b21'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ppx - 14, ppy - 3 + lSway); ctx.lineTo(ppx - 14, ppy + 3 + lSway); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ppx - 18, ppy + lSway); ctx.lineTo(ppx - 11, ppy + lSway); ctx.stroke();
    ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(ppx - 14, ppy + lSway, 2, 0, Math.PI*2); ctx.fill();

    // Sword (right arm)
    const rSway = owMoving ? Math.sin(t * 9) * 3 : 0;
    ctx.fillStyle = '#2471a3'; ctx.fillRect(ppx + 10, ppy - 3 + rSway, 4, 8);
    ctx.strokeStyle = '#d5d8dc'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ppx + 15, ppy - 1 + rSway); ctx.lineTo(ppx + 15, ppy - 18 + rSway); ctx.stroke();
    ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ppx + 11, ppy - 3 + rSway); ctx.lineTo(ppx + 19, ppy - 3 + rSway); ctx.stroke();
    ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ppx + 15, ppy + 2 + rSway); ctx.lineTo(ppx + 15, ppy + 6 + rSway); ctx.stroke();
    ctx.lineCap = 'butt';

    // Head / Helmet
    ctx.fillStyle = '#1a5276';
    ctx.beginPath(); ctx.arc(ppx, ppy - 9, 9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2980b9';
    ctx.beginPath(); ctx.arc(ppx, ppy - 8, 7, Math.PI * 0.1, Math.PI * 0.9); ctx.fill();
    ctx.fillStyle = '#85c1e9';
    ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(ppx - 5, ppy - 11, 10, 3, 1); else ctx.rect(ppx-5,ppy-11,10,3);
    ctx.fill();
    ctx.fillStyle = '#aed6f1'; ctx.globalAlpha = blinkOn ? 0.6 : 0.1;
    ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(ppx - 3, ppy - 11, 4, 2, 1); else ctx.rect(ppx-3,ppy-11,4,2);
    ctx.fill();
    ctx.globalAlpha = blinkOn ? 1 : 0.2;
    // Plume
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(ppx - 1, ppy - 17); ctx.bezierCurveTo(ppx + 3, ppy - 24, ppx + 8, ppy - 22, ppx + 6, ppy - 17);
    ctx.bezierCurveTo(ppx + 4, ppy - 15, ppx + 2, ppy - 16, ppx - 1, ppy - 17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(ppx + 1, ppy - 17); ctx.bezierCurveTo(ppx + 3, ppy - 21, ppx + 6, ppy - 20, ppx + 5, ppy - 17);
    ctx.bezierCurveTo(ppx + 4, ppy - 15, ppx + 2, ppy - 16, ppx + 1, ppy - 17); ctx.closePath(); ctx.fill();

    if (p.invincible) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(ppx, ppy - 2, 18, 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Float texts ────────────────────────────────────────────────────────
    G.floats.forEach(f => {
      const fx = wx(f.x), fy = wy(f.y);
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = `bold ${f.big ? 16 : 14}px sans-serif`; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(f.text, fx, fy);
      ctx.fillStyle = f.color; ctx.fillText(f.text, fx, fy);
    });
    ctx.globalAlpha = 1;

    // ── NPC dialogue ────────────────────────────────────────────────────────
    if (G.npcMessage) {
      const msg   = G.npcMessage;
      const alpha = Math.min(1, msg.timer * 1.5);
      const pad   = 16, boxH = 90, boxY = H - boxH - 260, boxW = W - pad * 2;
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
      ctx.fillStyle = msg.speakerColor || '#1abc9c'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(msg.speaker || 'Elder Kael', pad + 12, boxY + 20);
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


