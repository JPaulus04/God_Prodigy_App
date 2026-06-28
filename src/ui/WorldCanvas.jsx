// V96-OVERWORLD-ZONES-REV-001
import React, { useEffect, useRef } from 'react';
import { useGameStore }  from '../store/useGameStore';
import { InputState }    from '../game/systems/InputState';
import { EnemyConfig }   from '../game/config/EnemyConfig';
import { AbilityConfig } from '../game/config/AbilityConfig';
import { hapticAttack, hapticHit, hapticCheckpoint, hapticCollect, hapticLevelUp } from '../utils/haptics';
import { sfxAttack, sfxHit, sfxCollect, sfxCheckpoint, sfxLevelUp, sfxPortal, resumeAudio } from '../utils/sfx';

const WORLD_REVISION = 'V96-OVERWORLD-ZONES-REV-001';
const TILE = 32;
const MAP_W = 120;
const MAP_H = 120;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const BORDER = TILE * 3;

const REALM_PORTALS = [
  { realm: 'forest', name: 'Sylvara Gate', icon: '🌿', color: '#27ae60', skulls: 1, x: 25, y: 27 },
  { realm: 'wind',   name: 'Zephyros Gate', icon: '💨', color: '#87ceeb', skulls: 1, x: 42, y: 24 },
  { realm: 'earth',  name: 'Terran Gate',   icon: '🪨', color: '#95a5a6', skulls: 2, x: 58, y: 36 },
  { realm: 'fire',   name: 'Ignar Gate',    icon: '🔥', color: '#e74c3c', skulls: 2, x: 39, y: 74 },
  { realm: 'ice',    name: 'Glacius Gate',  icon: '❄️', color: '#3498db', skulls: 3, x: 66, y: 14 },
  { realm: 'ocean',  name: 'Nepthar Gate',  icon: '🌊', color: '#1abc9c', skulls: 3, x: 13, y: 62 },
  { realm: 'storm',  name: 'Vortus Gate',   icon: '⚡', color: '#9b59b6', skulls: 4, x: 76, y: 42 },
  { realm: 'shadow', name: 'Umbris Gate',   icon: '🌑', color: '#6c3483', skulls: 4, x: 25, y: 82 },
  { realm: 'lava',   name: 'Magmara Gate',  icon: '🌋', color: '#e67e22', skulls: 5, x: 58, y: 86 },
  { realm: 'void',   name: 'Nihilus Gate',  icon: '✨', color: '#f1c40f', skulls: 5, x: 101, y: 78 },
];

const RESPAWN_POINTS = {
  stronghold:   { x: 25*TILE, y: 45*TILE },
  cp_center:    { x: 25*TILE, y: 38*TILE },
  cp_forest:    { x: 25*TILE, y: 29*TILE },
  cp_east:      { x: 43*TILE, y: 29*TILE },
  cp_south:     { x: 25*TILE, y: 62*TILE },
  cp_far_east:  { x: 70*TILE, y: 43*TILE },
  cp_deep_east: { x: 93*TILE, y: 38*TILE },
  cp_far_south: { x: 55*TILE, y: 91*TILE },
  cp_void_gate: { x:101*TILE, y: 80*TILE },
};

const CHECKPOINTS = [
  { id: 'cp_center',    x: 25*TILE, y: 38*TILE },
  { id: 'cp_forest',    x: 25*TILE, y: 29*TILE },
  { id: 'cp_east',      x: 43*TILE, y: 29*TILE },
  { id: 'cp_south',     x: 25*TILE, y: 62*TILE },
  { id: 'cp_far_east',  x: 70*TILE, y: 43*TILE },
  { id: 'cp_deep_east', x: 93*TILE, y: 38*TILE },
  { id: 'cp_far_south', x: 55*TILE, y: 91*TILE },
  { id: 'cp_void_gate', x:101*TILE, y: 80*TILE },
];

const LANDMARKS = [
  { type: 'village', x: 25, y: 45, label: 'STRONGHOLD VILLAGE' },
  { type: 'forest_shrine', x: 25, y: 27, label: 'SYLVARA SHRINE' },
  { type: 'ruins', x: 37, y: 30, label: 'ANCIENT RUINS' },
  { type: 'bridge', x: 33, y: 37, label: 'OLD RIVER BRIDGE' },
  { type: 'wind_altar', x: 42, y: 24, label: 'WIND ALTAR' },
  { type: 'stone_circle', x: 58, y: 36, label: 'STONE CIRCLE' },
  { type: 'lake', x: 14, y: 61, label: 'SOUTHERN LAKE' },
  { type: 'lava_vents', x: 39, y: 74, label: 'LAVA VENTS' },
  { type: 'void_gate', x: 101, y: 78, label: 'VOID APPROACH' },
];

const RESOURCE_DEFS = [
  { type: 'tree', res: 'wood', amt: 2, x: 18*TILE, y: 30*TILE },
  { type: 'tree', res: 'wood', amt: 2, x: 21*TILE, y: 25*TILE },
  { type: 'tree', res: 'wood', amt: 2, x: 28*TILE, y: 24*TILE },
  { type: 'tree', res: 'wood', amt: 2, x: 32*TILE, y: 27*TILE },
  { type: 'tree', res: 'wood', amt: 2, x: 15*TILE, y: 37*TILE },
  { type: 'tree', res: 'wood', amt: 2, x: 18*TILE, y: 54*TILE },
  { type: 'tree', res: 'wood', amt: 2, x: 12*TILE, y: 66*TILE },
  { type: 'rock', res: 'stone', amt: 2, x: 31*TILE, y: 35*TILE },
  { type: 'rock', res: 'stone', amt: 2, x: 38*TILE, y: 34*TILE },
  { type: 'rock', res: 'stone', amt: 2, x: 50*TILE, y: 36*TILE },
  { type: 'rock', res: 'stone', amt: 2, x: 62*TILE, y: 39*TILE },
  { type: 'ore_node', res: 'ore', amt: 1, x: 55*TILE, y: 42*TILE },
  { type: 'ore_node', res: 'ore', amt: 1, x: 67*TILE, y: 44*TILE },
  { type: 'ore_node', res: 'ore', amt: 1, x: 77*TILE, y: 47*TILE },
  { type: 'ore_node', res: 'ore', amt: 1, x: 52*TILE, y: 75*TILE },
  { type: 'ore_node', res: 'ore', amt: 2, x: 59*TILE, y: 88*TILE },
  { type: 'fire_shard', res: 'fire_shard', amt: 1, x: 40*TILE, y: 80*TILE },
  { type: 'fire_shard', res: 'fire_shard', amt: 1, x: 50*TILE, y: 86*TILE },
];

const ENEMY_DEFS = [
  { type: 'goblin', x: 21*TILE, y: 31*TILE },
  { type: 'goblin', x: 29*TILE, y: 31*TILE },
  { type: 'goblin', x: 36*TILE, y: 30*TILE },
  { type: 'gold_goblin', x: 41*TILE, y: 34*TILE },
  { type: 'golem', x: 54*TILE, y: 38*TILE },
  { type: 'golem', x: 62*TILE, y: 42*TILE },
  { type: 'stone_guardian', x: 72*TILE, y: 45*TILE },
  { type: 'goblin', x: 15*TILE, y: 62*TILE },
  { type: 'goblin', x: 20*TILE, y: 66*TILE },
  { type: 'fire_imp', x: 38*TILE, y: 76*TILE },
  { type: 'fire_imp', x: 47*TILE, y: 81*TILE },
  { type: 'lava_titan', x: 58*TILE, y: 89*TILE },
  { type: 'shadow_wraith', x: 25*TILE, y: 84*TILE },
  { type: 'shadow_wraith', x: 88*TILE, y: 70*TILE },
  { type: 'stone_guardian', x: 100*TILE, y: 81*TILE },
];

const NPCS = [
  { id:'keeper', x:25*TILE, y:43*TILE, color:'#1abc9c', name:'The Keeper',
    lines: [
      'Many have killed a god. None have survived all ten.',
      'The forest shrine north of the village leads to Sylvara, the first throne.',
      'Use bridges and roads. The old world was built to guide challengers between realms.',
    ] },
  { id:'smith', x:29*TILE, y:46*TILE, color:'#e67e22', name:'Aldric',
    lines: ['Bring ore to the Forge. Better gear turns impossible fights into survivable ones.'] },
  { id:'merchant', x:21*TILE, y:46*TILE, color:'#9b59b6', name:'Mira',
    lines: ['The river splits the safe road from the wild road. Cross only when you are ready.'] },
];

function tileHash(tx, ty) {
  let h = (tx * 2654435761 ^ ty * 2246822519) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

function dist(ax, ay, bx, by) {
  return Math.sqrt((ax-bx)**2 + (ay-by)**2);
}

function inRect(tx, ty, x1, y1, x2, y2) {
  return tx >= x1 && tx <= x2 && ty >= y1 && ty <= y2;
}

function isRoad(tx, ty) {
  // Main village crossroad + guided adventure routes.
  if (tx >= 22 && tx <= 28 && ty >= 26 && ty <= 70) return true;     // vertical north/south road
  if (ty >= 37 && ty <= 41 && tx >= 14 && tx <= 48) return true;     // bridge road across river
  if (ty >= 30 && ty <= 34 && tx >= 25 && tx <= 44) return true;     // ruins/wind route
  if (tx >= 42 && tx <= 46 && ty >= 24 && ty <= 43) return true;     // east bend
  if (tx >= 13 && tx <= 25 && ty >= 60 && ty <= 64) return true;     // lake route
  if (tx >= 25 && tx <= 59 && ty >= 83 && ty <= 87) return true;     // southern badlands road
  if (tx >= 55 && tx <= 59 && ty >= 64 && ty <= 90) return true;     // lava route
  if (ty >= 43 && ty <= 47 && tx >= 58 && tx <= 78) return true;     // east highland route
  if (tx >= 76 && tx <= 80 && ty >= 43 && ty <= 78) return true;     // void approach road
  if (ty >= 76 && ty <= 80 && tx >= 76 && tx <= 102) return true;    // void road
  return false;
}

function isBridge(tx, ty) {
  return (
    inRect(tx, ty, 30, 36, 36, 42) || // main river bridge
    inRect(tx, ty, 21, 55, 29, 60) || // village/lake bridge
    inRect(tx, ty, 54, 61, 60, 66) || // lava route bridge
    inRect(tx, ty, 73, 52, 82, 56)    // east bridge
  );
}

function isWater(tx, ty) {
  if (isBridge(tx, ty)) return false;

  // Main river snakes vertically through the first half of the map.
  const riverCenter = 34 + Math.sin(ty * 0.18) * 3;
  if (ty >= 16 && ty <= 70 && Math.abs(tx - riverCenter) <= 2.8) return true;

  // Southern lake / ocean pocket.
  const dxLake = tx - 13;
  const dyLake = ty - 62;
  if ((dxLake*dxLake)/(8*8) + (dyLake*dyLake)/(7*7) <= 1) return true;

  // Northeast cold water / mountain spring.
  const dxPond = tx - 67;
  const dyPond = ty - 18;
  if ((dxPond*dxPond)/(5*5) + (dyPond*dyPond)/(4*4) <= 1) return true;

  return false;
}

function isLava(tx, ty) {
  if (isBridge(tx, ty)) return false;
  const dx = tx - 49;
  const dy = ty - 82;
  if ((dx*dx)/(13*13) + (dy*dy)/(10*10) <= 1) return true;
  if (ty >= 72 && ty <= 92 && tx >= 39 && tx <= 59 && tileHash(tx, ty) > 0.78) return true;
  return false;
}

function isVillageFloor(tx, ty) {
  return inRect(tx, ty, 18, 40, 32, 50);
}

function isObstacleCluster(tx, ty) {
  const clusters = [
    { type:'trees', cx:18, cy:24, r:3.4 },
    { type:'trees', cx:31, cy:23, r:3.0 },
    { type:'trees', cx:17, cy:54, r:2.5 },
    { type:'trees', cx:10, cy:66, r:3.2 },
    { type:'rocks', cx:52, cy:35, r:3.0 },
    { type:'rocks', cx:64, cy:38, r:3.0 },
    { type:'rocks', cx:73, cy:47, r:2.4 },
    { type:'rocks', cx:97, cy:80, r:4.0 },
    { type:'rocks', cx:58, cy:88, r:2.5 },
  ];

  for (const c of clusters) {
    const dx = tx - c.cx;
    const dy = ty - c.cy;
    if (dx*dx + dy*dy < (c.r * 0.68) * (c.r * 0.68)) return true;
  }
  return false;
}

function isBuildingBlocked(tx, ty) {
  // Stronghold village buildings. Door tiles remain open.
  if (inRect(tx, ty, 22.5, 40.0, 27.5, 43.0)) return false; // crafting hall door/path
  if (inRect(tx, ty, 22, 39, 28, 43)) return true;          // crafting hall
  if (inRect(tx, ty, 28, 44, 32, 48)) return true;          // forge
  if (inRect(tx, ty, 18, 44, 22, 48)) return true;          // market
  if (inRect(tx, ty, 19, 48, 23, 51)) return true;          // healer hut
  return false;
}

function isBlocked(wx, wy) {
  const tx = wx / TILE;
  const ty = wy / TILE;

  if (tx < 3 || tx > MAP_W - 3 || ty < 3 || ty > MAP_H - 3) return true;
  if (isWater(tx, ty)) return true;
  if (isLava(tx, ty)) return true;
  if (isBuildingBlocked(tx, ty)) return true;

  // Keep main roads/bridges clear even when nearby terrain art exists.
  if (isRoad(tx, ty) || isVillageFloor(tx, ty) || isBridge(tx, ty)) return false;

  if (isObstacleCluster(tx, ty)) return true;
  return false;
}

function tileColor(tx, ty) {
  const h = tileHash(tx, ty);

  if (tx < 2 || tx >= MAP_W-2 || ty < 2 || ty >= MAP_H-2) return '#1a6fa8';
  if (isWater(tx, ty)) return h > 0.5 ? '#1d6f94' : '#155a7a';
  if (isLava(tx, ty)) return h > 0.65 ? '#b43211' : '#5f1708';
  if (isBridge(tx, ty)) return h > 0.5 ? '#8b633b' : '#76512f';
  if (isRoad(tx, ty)) return h > 0.58 ? '#9a7650' : '#886842';
  if (isVillageFloor(tx, ty)) return h > 0.5 ? '#7f684c' : '#6f5a42';

  // Zone identity.
  if (ty < 32 && tx < 36) return h > 0.6 ? '#2f8b45' : '#246f38';      // forest approach
  if (ty < 34 && tx >= 36 && tx < 52) return h > 0.6 ? '#66615a' : '#514d48'; // ruins
  if (ty < 28 && tx >= 52 && tx < 78) return h > 0.6 ? '#8290a0' : '#647181'; // highlands / ice
  if (tx >= 52 && tx < 82 && ty >= 28 && ty < 55) return h > 0.6 ? '#58534a' : '#453f38'; // stone fields
  if (tx < 24 && ty >= 54 && ty < 72) return h > 0.6 ? '#1e5b3f' : '#184834'; // wetland/lake
  if (ty >= 70 && tx < 64) return h > 0.6 ? '#4a2616' : '#35170d';     // fire badlands
  if (tx >= 76 && ty >= 55) return h > 0.6 ? '#21152b' : '#17101f';    // shadow/void
  if (tx >= 82 && ty < 55) return h > 0.6 ? '#4c445e' : '#3d354d';     // eastern ridge

  return h < 0.25 ? '#276038' : h > 0.75 ? '#348a4a' : '#2d6a3f';
}

function makeEnemy(def) {
  const cfg = EnemyConfig[def.type] || EnemyConfig.goblin;
  return {
    type: def.type,
    x: def.x,
    y: def.y,
    originX: def.x,
    originY: def.y,
    hp: cfg.hp,
    maxHp: cfg.hp,
    alive: true,
    attackTimer: 0,
    patrolTimer: 0,
    patrolDir: Math.random() > 0.5 ? 1 : -1,
    respawnAt: 0,
  };
}

function clampToWorld(x, y) {
  return {
    x: Math.max(BORDER, Math.min(WORLD_W - BORDER, x)),
    y: Math.max(BORDER, Math.min(WORLD_H - BORDER, y)),
  };
}

function drawTree(ctx, x, y, scale = 1) {
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(x - 4*scale, y + 4*scale, 8*scale, 14*scale);
  ctx.fillStyle = '#1b6729';
  ctx.beginPath(); ctx.arc(x, y, 14*scale, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#25853a';
  ctx.beginPath(); ctx.arc(x - 5*scale, y - 5*scale, 9*scale, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5*scale, y - 4*scale, 8*scale, 0, Math.PI*2); ctx.fill();
}

function drawRock(ctx, x, y, scale = 1) {
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.18;
  ctx.beginPath(); ctx.ellipse(x+3, y+8, 13*scale, 5*scale, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#756f6c';
  ctx.beginPath();
  ctx.moveTo(x-13*scale, y+7*scale);
  ctx.lineTo(x-7*scale, y-9*scale);
  ctx.lineTo(x+6*scale, y-11*scale);
  ctx.lineTo(x+14*scale, y-2*scale);
  ctx.lineTo(x+10*scale, y+8*scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a59d96';
  ctx.beginPath();
  ctx.moveTo(x-5*scale, y-7*scale);
  ctx.lineTo(x+5*scale, y-9*scale);
  ctx.lineTo(x+10*scale, y-1*scale);
  ctx.lineTo(x+1*scale, y+2*scale);
  ctx.closePath();
  ctx.fill();
}

function drawPortal(ctx, x, y, portal, t) {
  const pulse = 0.75 + Math.sin(t*3) * 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.25 * pulse;
  ctx.fillStyle = portal.color;
  ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = portal.color;
  ctx.lineWidth = 4;
  for (let i=0; i<3; i++) {
    ctx.globalAlpha = 0.45 + i*0.15;
    ctx.beginPath();
    ctx.arc(0, 0, 19 + i*9 + Math.sin(t*2+i)*2, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(portal.icon, 0, 9);
  ctx.font = 'bold 10px sans-serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.fillStyle = '#fff';
  ctx.strokeText(portal.realm.toUpperCase(), 0, -44);
  ctx.fillText(portal.realm.toUpperCase(), 0, -44);
  ctx.restore();
}

function drawBuilding(ctx, x, y, kind, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(5, 36, 55, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  if (kind === 'hall') {
    ctx.fillStyle = '#6b5030'; ctx.fillRect(-44, -30, 88, 70);
    ctx.fillStyle = '#8b6914';
    ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(-54, -28); ctx.lineTo(54, -28); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6b5010'; ctx.lineWidth = 1.4;
    for (let i=-4; i<=4; i++) {
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(i*10, -56 + Math.abs(i)*2); ctx.lineTo(-50 + (i+4)*12, -28); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#2a1808'; ctx.fillRect(-10, 15, 20, 25);
    ctx.fillStyle = '#d4af37'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.strokeText('CRAFTING HALL', 0, 8);
    ctx.fillText('CRAFTING HALL', 0, 8);
  }

  if (kind === 'forge') {
    ctx.fillStyle = '#3a2618'; ctx.fillRect(-24, -20, 48, 42);
    ctx.fillStyle = '#4a3222';
    ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(-30, -18); ctx.lineTo(30, -18); ctx.closePath(); ctx.fill();
    const glow = 0.6 + Math.sin(t*4)*0.3;
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(-6, 0, 11, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e67e22'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.strokeText('FORGE', 0, -29);
    ctx.fillText('FORGE', 0, -29);
  }

  if (kind === 'market') {
    ctx.fillStyle = '#7a5030'; ctx.fillRect(-24, -16, 48, 14);
    ctx.fillStyle = '#9b59b6'; ctx.fillRect(-27, -30, 54, 13);
    ctx.fillStyle = '#c39bd3'; for (let i=-22; i<=22; i+=8) ctx.fillRect(i, -17, 5, 5);
    ctx.fillStyle = '#9b59b6'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.strokeText('MARKET', 0, -36);
    ctx.fillText('MARKET', 0, -36);
  }

  ctx.restore();
}

function drawShrine(ctx, x, y, color, label, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 18, 42, 9, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#5f5f5f';
  ctx.fillRect(-28, 10, 56, 10);
  ctx.fillStyle = '#888';
  ctx.fillRect(-24, 5, 48, 7);
  [[-22,0],[14,0]].forEach(([px]) => {
    ctx.fillStyle = '#777'; ctx.fillRect(px, -36, 10, 42);
    ctx.fillStyle = '#aaa'; ctx.fillRect(px-2, -39, 14, 6);
  });
  ctx.fillStyle = '#777'; ctx.fillRect(-28, -43, 56, 8);

  const pulse = 0.4 + Math.sin(t*2.1)*0.2;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, -10, 18, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeText(label, 0, 35);
  ctx.fillText(label, 0, 35);
  ctx.restore();
}

function resolveDrop(drop, store, x, y, addFloat) {
  const resources = ['wood', 'stone', 'ore', 'fire_shard', 'goblin_tooth'];
  if (resources.includes(drop.item)) {
    store.addResource(drop.item, drop.amount);
    addFloat(x, y, `+${drop.amount} ${drop.item}`, '#7ed321');
    return;
  }
  if (drop.item === 'hunters_charm') {
    const item = { id: 'hunters_charm', name: "Hunter's Charm", slot: 'accessory', rarity: 'rare', atk: 4, spd: 1, instanceId: `item_${Date.now()}_hunters_charm` };
    if (store.addItem(item)) addFloat(x, y, "Hunter's Charm!", '#3498db');
    return;
  }
  if (drop.item?.includes('gear_drop')) {
    const rare = drop.item.includes('rare');
    const item = {
      id: rare ? 'steel_sword' : 'iron_sword',
      name: rare ? 'Steel Sword' : 'Iron Sword',
      slot: 'weapon',
      type: 'sword',
      tier: rare ? 'steel' : 'iron',
      rarity: rare ? 'rare' : 'common',
      atk: rare ? 35 : 15,
      abilityId: 'whirlwind',
      instanceId: `item_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    };
    if (store.addItem(item)) addFloat(x, y, `${item.name}!`, rare ? '#3498db' : '#bdc3c7', true);
  }
}

function drawLabel(ctx, text, x, y, color = '#d4af37') {
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.fillStyle = color;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

export default function WorldCanvas() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  const G = useRef({
    player: { x: 25*TILE, y: 45*TILE, attackCooldown: 0, invincible: false, invTimer: 0 },
    camera: { x: 25*TILE, y: 45*TILE },
    enemies: ENEMY_DEFS.map(makeEnemy),
    resources: RESOURCE_DEFS.map(r => ({ ...r, depleted: false, respawnAt: 0 })),
    checkpoints: CHECKPOINTS.map(c => ({ ...c, activated: false })),
    villageNPCs: NPCS.map(n => ({ ...n, hintIdx: 0 })),
    floats: [],
    keys: {},
    prevE: false,
    prevSpace: false,
    prevAbility: false,
    npcMessage: null,
    attackEffect: null,
    abilityCooldown: 0,
    W: 390,
    H: 844,
    lastRespawnAt: null,
    swordPicked: false,
  }).current;

  const addFloat = (x, y, text, color = '#fff', big = false) => {
    G.floats.push({ x, y, text, color, life: big ? 1.5 : 1.1, vy: big ? -48 : -36, big });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      G.W = window.innerWidth;
      G.H = window.innerHeight;
      canvas.width = Math.floor(G.W * dpr);
      canvas.height = Math.floor(G.H * dpr);
      canvas.style.width = `${G.W}px`;
      canvas.style.height = `${G.H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onKeyDown = (e) => {
      G.keys[e.code] = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = (e) => { G.keys[e.code] = false; };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const saved = useGameStore.getState().position;
    if (saved?.zone === 'world' && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      G.player.x = saved.x;
      G.player.y = saved.y;
      G.camera.x = saved.x;
      G.camera.y = saved.y;
    }

    let stopped = false;
    const frame = (ts) => {
      if (stopped) return;
      const dt = Math.min(0.033, (ts - (lastTimeRef.current || ts)) / 1000);
      lastTimeRef.current = ts;

      try {
        update(dt);
        render(ctx);
      } catch (e) {
        console.error('WorldCanvas V96 loop error', WORLD_REVISION, e);
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  function getMoveVector() {
    let mx = 0, my = 0;

    if (G.keys['KeyA'] || G.keys['ArrowLeft']) mx -= 1;
    if (G.keys['KeyD'] || G.keys['ArrowRight']) mx += 1;
    if (G.keys['KeyW'] || G.keys['ArrowUp']) my -= 1;
    if (G.keys['KeyS'] || G.keys['ArrowDown']) my += 1;

    if (InputState.joystick?.active) {
      mx += InputState.joystick.x || 0;
      my += InputState.joystick.y || 0;
    }

    const len = Math.sqrt(mx*mx + my*my);
    if (len > 1) { mx /= len; my /= len; }
    return { mx, my };
  }

  function tryMove(p, nx, ny) {
    const radius = 13;
    const checks = [
      [nx-radius, ny-radius], [nx+radius, ny-radius],
      [nx-radius, ny+radius], [nx+radius, ny+radius],
      [nx, ny+radius],
    ];
    if (!checks.some(([x,y]) => isBlocked(x, y))) {
      p.x = nx;
      p.y = ny;
      return;
    }

    if (!checks.some(([x,y]) => isBlocked(x, p.y))) p.x = nx;
    if (!checks.some(([x,y]) => isBlocked(p.x, y))) p.y = ny;
  }

  function update(dt) {
    const store = useGameStore.getState();
    const p = G.player;

    // Respawn/flee support.
    if (store.respawnAt && G.lastRespawnAt !== store.respawnAt) {
      const rp = RESPAWN_POINTS[store.respawnAt] || RESPAWN_POINTS.stronghold;
      p.x = rp.x;
      p.y = rp.y;
      G.camera.x = p.x;
      G.camera.y = p.y;
      G.lastRespawnAt = store.respawnAt;
      useGameStore.setState({ respawnAt: null });
    }

    if (store.playerHP <= 0 || store.showDeathModal || store.showInventory || store.showHelpMenu || store.showShop || store.showLevelUp) {
      renderOnlyTimers(dt);
      return;
    }

    if (G.abilityCooldown > 0) G.abilityCooldown -= dt;
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.invincible) { p.invTimer -= dt; if (p.invTimer <= 0) p.invincible = false; }

    const { mx, my } = getMoveVector();
    const speed = Math.max(80, 112 + ((store.playerSPD || 5) - 5) * 2);
    if (mx || my) {
      resumeAudio?.();
      tryMove(p, p.x + mx * speed * dt, p.y + my * speed * dt);
    }

    p.x = clampToWorld(p.x, p.y).x;
    p.y = clampToWorld(p.x, p.y).y;

    const camEase = 0.12;
    G.camera.x += (p.x - G.camera.x) * camEase;
    G.camera.y += (p.y - G.camera.y) * camEase;
    G.camera.x = Math.max(G.W/2, Math.min(WORLD_W - G.W/2, G.camera.x));
    G.camera.y = Math.max(G.H/2, Math.min(WORLD_H - G.H/2, G.camera.y));

    const eNow = G.keys['KeyE'] || window.__gameInteract || InputState.interact;
    const eJust = eNow && !G.prevE;
    G.prevE = eNow;
    if (window.__gameInteract) window.__gameInteract = false;
    if (InputState.interact) InputState.interact = false;
    if (eJust) handleInteract(store);

    const attackNow = G.keys['Space'] || window.__gameAttack || InputState.attack;
    const attackJust = attackNow && !G.prevSpace;
    G.prevSpace = attackNow;
    if (window.__gameAttack) window.__gameAttack = false;
    if (InputState.attack) InputState.attack = false;
    if (attackJust && p.attackCooldown <= 0) handleAttack(store);

    const abilityNow = G.keys['KeyQ'] || window.__gameAbility || InputState.ability;
    const abilityJust = abilityNow && !G.prevAbility;
    G.prevAbility = abilityNow;
    if (window.__gameAbility) window.__gameAbility = false;
    if (InputState.ability) InputState.ability = false;
    if (abilityJust && G.abilityCooldown <= 0 && store.equippedAbilityId) handleAbility(store);

    updateEnemies(dt, store);
    renderOnlyTimers(dt);

    // Light autosave.
    G.saveTimer = (G.saveTimer || 0) + dt;
    if (G.saveTimer >= 5) {
      G.saveTimer = 0;
      useGameStore.setState({ position: { zone: 'world', x: p.x, y: p.y } });
    }
  }

  function renderOnlyTimers(dt) {
    const now = Date.now();
    G.resources.forEach(r => {
      if (r.depleted && r.respawnAt && now >= r.respawnAt) {
        r.depleted = false;
        r.respawnAt = 0;
      }
    });

    G.floats = G.floats
      .map(f => ({ ...f, y: f.y + f.vy * dt, life: f.life - dt }))
      .filter(f => f.life > 0);

    if (G.attackEffect) {
      G.attackEffect.timer -= dt;
      if (G.attackEffect.timer <= 0) G.attackEffect = null;
    }

    if (G.npcMessage) {
      G.npcMessage.timer -= dt;
      if (G.npcMessage.timer <= 0) G.npcMessage = null;
    }
  }

  function handleInteract(store) {
    const p = G.player;

    for (const r of G.resources) {
      if (r.depleted || dist(p.x, p.y, r.x, r.y) > 52) continue;
      store.addResource(r.res, r.amt);
      addFloat(r.x, r.y - 24, `+${r.amt} ${r.res}`, '#7ed321');
      hapticCollect(); sfxCollect();
      r.depleted = true;
      r.respawnAt = Date.now() + 180_000;
      return;
    }

    for (const cp of G.checkpoints) {
      if (dist(p.x, p.y, cp.x, cp.y) > 58) continue;
      if (!cp.activated) {
        cp.activated = true;
        store.activateCheckpoint(cp.id);
        hapticCheckpoint();
        sfxCheckpoint();
      }
      addFloat(cp.x, cp.y - 30, 'Checkpoint saved', '#f1c40f');
      return;
    }

    const hasSword = store.inventory?.some(i => i.id === 'iron_sword');
    if (!G.swordPicked && !hasSword && dist(p.x, p.y, 25*TILE, 37*TILE) <= 52) {
      const item = { id: 'iron_sword', name: 'Iron Sword', slot: 'weapon', type: 'sword', tier: 'iron', rarity: 'common', atk: 6, abilityId: 'whirlwind', instanceId: `item_${Date.now()}_sword` };
      if (store.addItem(item)) {
        G.swordPicked = true;
        store.equipItem(item);
        addFloat(25*TILE, 37*TILE - 30, 'Iron Sword + Whirlwind', '#bdc3c7', true);
      }
      return;
    } else if (hasSword) {
      G.swordPicked = true;
    }

    if (dist(p.x, p.y, 25*TILE, 43*TILE) <= 70) {
      store.setGamePhase('stronghold');
      return;
    }

    if (dist(p.x, p.y, 37*TILE, 30*TILE) <= 64) {
      addFloat(p.x, p.y - 40, 'Entering Ancient Ruins...', '#cc88ff');
      setTimeout(() => store.setGamePhase('dungeon'), 400);
      return;
    }

    for (const portal of REALM_PORTALS) {
      if (dist(p.x, p.y, portal.x*TILE, portal.y*TILE) <= 62) {
        const recLv = Math.max(1, portal.skulls * 4);
        if ((store.level || 1) < recLv && !G._levelGateShown?.[portal.realm]) {
          if (!G._levelGateShown) G._levelGateShown = {};
          G._levelGateShown[portal.realm] = true;
          G.npcMessage = {
            text: `Danger: recommended level ${recLv}+ for ${portal.name}. You can still enter.`,
            speaker: portal.name,
            speakerColor: '#e74c3c',
            timer: 3.2,
          };
        }
        addFloat(p.x, p.y - 42, `Entering ${portal.name}...`, portal.color);
        sfxPortal();
        setTimeout(() => { store.setCurrentRealm(portal.realm); store.setGamePhase('realm'); }, 400);
        return;
      }
    }

    for (const npc of G.villageNPCs) {
      if (dist(p.x, p.y, npc.x, npc.y) > 56) continue;
      const line = npc.lines[npc.hintIdx % npc.lines.length];
      npc.hintIdx += 1;
      G.npcMessage = { text: line, speaker: npc.name, speakerColor: npc.color, timer: 5.5 };
      return;
    }
  }

  function handleAttack(store) {
    const p = G.player;
    p.attackCooldown = 0.58;
    hapticAttack();
    sfxAttack();

    let hitCount = 0;
    const range = 58;
    for (const e of G.enemies) {
      if (!e.alive || dist(p.x, p.y, e.x, e.y) > range) continue;
      const cfg = EnemyConfig[e.type] || EnemyConfig.goblin;
      const dmg = Math.max(1, (store.playerATK || 8) - Math.floor((cfg.def || 0) * 0.45));
      e.hp -= dmg;
      hitCount++;
      store.addDamageDealt?.(dmg);
      addFloat(e.x, e.y - 20, `-${dmg}`, '#ff5555');
      if (e.hp <= 0) killEnemy(e, store);
    }

    G.attackEffect = { x: p.x, y: p.y, timer: 0.22, hit: hitCount > 0 };
  }

  function handleAbility(store) {
    const ability = AbilityConfig[store.equippedAbilityId];
    const p = G.player;
    const cooldown = ability?.cooldown || 6;
    G.abilityCooldown = cooldown;
    store.recordAbilityFired?.(cooldown);
    addFloat(p.x, p.y - 50, ability?.name || 'Ability', '#d4af37', true);

    let hitCount = 0;
    for (const e of G.enemies) {
      if (!e.alive || dist(p.x, p.y, e.x, e.y) > 96) continue;
      const cfg = EnemyConfig[e.type] || EnemyConfig.goblin;
      const dmg = Math.max(1, Math.round((store.playerATK || 8) * 1.35) - Math.floor((cfg.def || 0) * 0.25));
      e.hp -= dmg;
      hitCount++;
      store.addDamageDealt?.(dmg);
      addFloat(e.x, e.y - 22, `-${dmg}`, '#f1c40f');
      if (e.hp <= 0) killEnemy(e, store);
    }

    G.attackEffect = { x: p.x, y: p.y, timer: 0.38, ability: true, hit: hitCount > 0 };
  }

  function killEnemy(e, store) {
    e.alive = false;
    const cfg = EnemyConfig[e.type] || EnemyConfig.goblin;
    store.addKill?.();
    store.gainXP(cfg.xpReward || 10);
    hapticHit();
    addFloat(e.x, e.y - 44, `+${cfg.xpReward || 10} XP`, '#9b59b6');

    cfg.drops?.forEach(drop => {
      if (Math.random() < drop.chance) resolveDrop(drop, store, e.x, e.y - 32, addFloat);
    });

    const respawnTime = cfg.respawnTime || 30000;
    e.respawnAt = Date.now() + respawnTime;
  }

  function updateEnemies(dt, store) {
    const p = G.player;
    const now = Date.now();

    for (const e of G.enemies) {
      const cfg = EnemyConfig[e.type] || EnemyConfig.goblin;

      if (!e.alive) {
        if (e.respawnAt && now >= e.respawnAt) {
          e.alive = true;
          e.hp = e.maxHp;
          e.x = e.originX;
          e.y = e.originY;
          e.respawnAt = 0;
        }
        continue;
      }

      e.attackTimer = Math.max(0, e.attackTimer - dt);
      const d = dist(p.x, p.y, e.x, e.y);

      if (d <= cfg.attackRange) {
        if (e.attackTimer <= 0 && !p.invincible) {
          e.attackTimer = (cfg.attackCooldown || 1200) / 1000;
          const dmg = Math.max(1, (cfg.atk || 5) - (store.playerDEF || 4));
          store.takeDamage(dmg);
          hapticHit();
          sfxHit();
          p.invincible = true;
          p.invTimer = 0.75;
          addFloat(p.x, p.y - 24, `-${dmg}`, '#e74c3c');
        }
      } else if (d <= cfg.aggroRange) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        const nx = e.x + Math.cos(a) * (cfg.speed || 60) * dt;
        const ny = e.y + Math.sin(a) * (cfg.speed || 60) * dt;
        if (!isBlocked(nx, ny)) { e.x = nx; e.y = ny; }
      } else {
        e.patrolTimer += dt;
        if (e.patrolTimer > 2.4) {
          e.patrolTimer = 0;
          e.patrolDir *= -1;
        }
        const nx = e.x + e.patrolDir * (cfg.speed || 60) * 0.25 * dt;
        if (!isBlocked(nx, e.y) && dist(nx, e.y, e.originX, e.originY) < 110) e.x = nx;
      }
    }
  }

  function wx(x) { return x - G.camera.x + G.W / 2; }
  function wy(y) { return y - G.camera.y + G.H / 2; }

  function render(ctx) {
    const W = G.W;
    const H = G.H;
    const t = Date.now() / 1000;
    const store = useGameStore.getState();

    ctx.clearRect(0, 0, W, H);

    const startTx = Math.max(0, Math.floor((G.camera.x - W/2) / TILE) - 1);
    const endTx = Math.min(MAP_W, Math.ceil((G.camera.x + W/2) / TILE) + 1);
    const startTy = Math.max(0, Math.floor((G.camera.y - H/2) / TILE) - 1);
    const endTy = Math.min(MAP_H, Math.ceil((G.camera.y + H/2) / TILE) + 1);

    for (let ty = startTy; ty <= endTy; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        const sx = wx(tx * TILE);
        const sy = wy(ty * TILE);
        ctx.fillStyle = tileColor(tx, ty);
        ctx.fillRect(sx, sy, TILE + 1, TILE + 1);

        const h = tileHash(tx, ty);
        if (!isRoad(tx, ty) && !isWater(tx, ty) && !isLava(tx, ty) && h > 0.88) {
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx + 8, sy + 12, 14, 2);
          ctx.globalAlpha = 1;
        }

        if (isWater(tx, ty) && h > 0.74) {
          ctx.globalAlpha = 0.24;
          ctx.strokeStyle = '#bdefff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx + 5, sy + 12 + Math.sin(t + tx) * 2);
          ctx.lineTo(sx + 24, sy + 12 + Math.sin(t + tx + 1) * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        if (isLava(tx, ty) && h > 0.72) {
          ctx.globalAlpha = 0.35 + Math.sin(t*3 + h*10) * 0.12;
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath(); ctx.arc(sx + 16, sy + 16, 3, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    drawMapDecor(ctx, t);

    // Sword pickup.
    if (!G.swordPicked && !store.inventory?.some(i => i.id === 'iron_sword')) {
      const sx = wx(25*TILE);
      const sy = wy(37*TILE);
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️', sx, sy);
      if (dist(G.player.x, G.player.y, 25*TILE, 37*TILE) < 52) drawLabel(ctx, '[E] Take Iron Sword', sx, sy - 24, '#d4af37');
    }

    // Resources.
    for (const r of G.resources) {
      if (r.depleted) continue;
      const sx = wx(r.x);
      const sy = wy(r.y);
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
      if (r.type === 'tree') drawTree(ctx, sx, sy);
      if (r.type === 'rock') drawRock(ctx, sx, sy);
      if (r.type === 'ore_node') {
        drawRock(ctx, sx, sy, 1.05);
        ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(sx+4, sy-4, 4, 0, Math.PI*2); ctx.fill();
      }
      if (r.type === 'fire_shard') {
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥', sx, sy + 6);
      }
      if (dist(G.player.x, G.player.y, r.x, r.y) < 48) drawLabel(ctx, `[E] ${r.res}`, sx, sy - 24, '#7ed321');
    }

    // Checkpoints.
    for (const cp of G.checkpoints) {
      const sx = wx(cp.x);
      const sy = wy(cp.y);
      ctx.fillStyle = cp.activated ? '#f1c40f' : '#8a6a2a';
      ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cp.activated ? '#d4af37' : '#6f551f';
      ctx.beginPath(); ctx.moveTo(sx, sy-28); ctx.lineTo(sx+22, sy-18); ctx.lineTo(sx, sy-8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#47360f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx, sy-28); ctx.lineTo(sx, sy+22); ctx.stroke();
      if (dist(G.player.x, G.player.y, cp.x, cp.y) < 54) drawLabel(ctx, '[E] Save', sx, sy - 34, '#f1c40f');
    }

    // Portals.
    for (const portal of REALM_PORTALS) {
      const sx = wx(portal.x * TILE);
      const sy = wy(portal.y * TILE);
      drawPortal(ctx, sx, sy, portal, t);
      if (dist(G.player.x, G.player.y, portal.x*TILE, portal.y*TILE) < 64) drawLabel(ctx, `[E] ${portal.name}`, sx, sy + 58, portal.color);
    }

    // NPCs.
    for (const npc of G.villageNPCs) {
      const sx = wx(npc.x);
      const sy = wy(npc.y);
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.ellipse(sx, sy + 14, 11, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = npc.color;
      ctx.beginPath(); ctx.arc(sx, sy - 6, 10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f2d7b6';
      ctx.beginPath(); ctx.arc(sx, sy - 18, 7, 0, Math.PI*2); ctx.fill();
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(npc.name, sx, sy - 30);
      ctx.fillText(npc.name, sx, sy - 30);
      if (dist(G.player.x, G.player.y, npc.x, npc.y) < 54) drawLabel(ctx, '[E] Talk', sx, sy - 43, npc.color);
    }

    // Enemies.
    for (const e of G.enemies) {
      if (!e.alive) continue;
      const cfg = EnemyConfig[e.type] || EnemyConfig.goblin;
      const sx = wx(e.x);
      const sy = wy(e.y);
      if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue;

      const elite = cfg.isElite;
      ctx.fillStyle = elite ? '#8e44ad' : (e.type.includes('fire') ? '#e74c3c' : e.type.includes('shadow') ? '#6c3483' : '#2ecc71');
      if (e.type.includes('golem') || e.type.includes('guardian') || e.type.includes('titan')) ctx.fillStyle = elite ? '#444' : '#777';
      ctx.beginPath();
      ctx.arc(sx, sy, elite ? 18 : 14, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx-5, sy-4, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx+5, sy-4, 3, 0, Math.PI*2); ctx.fill();

      if (e.hp < e.maxHp) {
        const pct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = '#000000aa';
        ctx.fillRect(sx - 22, sy - 30, 44, 6);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(sx - 22, sy - 30, 44 * pct, 6);
      }
    }

    drawPlayer(ctx, store, t);

    if (G.attackEffect) {
      const sx = wx(G.attackEffect.x);
      const sy = wy(G.attackEffect.y);
      const pct = G.attackEffect.timer / (G.attackEffect.ability ? 0.38 : 0.22);
      ctx.globalAlpha = Math.max(0, pct);
      ctx.strokeStyle = G.attackEffect.ability ? '#d4af37' : '#e74c3c';
      ctx.lineWidth = G.attackEffect.ability ? 4 : 3;
      ctx.beginPath();
      ctx.arc(sx, sy, G.attackEffect.ability ? 96 * (1 - pct * 0.2) : 58, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Floats.
    for (const f of G.floats) {
      const sx = wx(f.x);
      const sy = wy(f.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.font = `${f.big ? 'bold 16px' : 'bold 12px'} sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.fillStyle = f.color;
      ctx.strokeText(f.text, sx, sy);
      ctx.fillText(f.text, sx, sy);
      ctx.globalAlpha = 1;
    }

    drawNpcMessage(ctx, W, H);
    drawMinimap(ctx, W, H);
  }

  function drawMapDecor(ctx, t) {
    const decorTrees = [
      [18,24],[20,26],[22,24],[29,22],[31,24],[33,25],[14,54],[17,55],[11,64],[13,67],
      [9,34],[10,36],[16,30],[29,30],[31,31],
    ];
    decorTrees.forEach(([tx,ty]) => drawTree(ctx, wx(tx*TILE), wy(ty*TILE), 0.9));

    const decorRocks = [
      [51,35],[53,37],[63,38],[65,40],[72,47],[74,48],[96,80],[99,82],[58,88],[60,90],
      [37,31],[39,32],
    ];
    decorRocks.forEach(([tx,ty]) => drawRock(ctx, wx(tx*TILE), wy(ty*TILE), 0.9));

    // Stronghold village fence box, with openings at north and south roads.
    const fence = '#60401f';
    ctx.fillStyle = fence;
    for (let tx=18; tx<=32; tx++) {
      if (tx >= 23 && tx <= 27) continue;
      ctx.fillRect(wx(tx*TILE), wy(39*TILE), TILE, 6);
      ctx.fillRect(wx(tx*TILE), wy(51*TILE), TILE, 6);
    }
    for (let ty=39; ty<=51; ty++) {
      ctx.fillRect(wx(18*TILE), wy(ty*TILE), 6, TILE);
      ctx.fillRect(wx(33*TILE), wy(ty*TILE), 6, TILE);
    }

    drawBuilding(ctx, wx(25*TILE), wy(41*TILE), 'hall', t);
    drawBuilding(ctx, wx(30*TILE), wy(46*TILE), 'forge', t);
    drawBuilding(ctx, wx(20*TILE), wy(46*TILE), 'market', t);

    // Realm shrines and landmarks.
    drawShrine(ctx, wx(25*TILE), wy(27*TILE), '#27ae60', 'SYLVARA', t);
    drawShrine(ctx, wx(42*TILE), wy(24*TILE), '#87ceeb', 'ZEPHYROS', t);
    drawShrine(ctx, wx(58*TILE), wy(36*TILE), '#95a5a6', 'TERRAN', t);
    drawShrine(ctx, wx(39*TILE), wy(74*TILE), '#e74c3c', 'IGNAR', t);

    // Ancient Ruins, first dungeon marker.
    const rx = wx(37*TILE), ry = wy(30*TILE);
    ctx.fillStyle = '#5f5f5f';
    ctx.fillRect(rx-36, ry+10, 72, 10);
    [[-28,0],[-10,-4],[14,2],[30,-6]].forEach(([dx,dy], i) => {
      ctx.fillStyle = i % 2 ? '#777' : '#666';
      ctx.fillRect(rx+dx, ry-34+dy, 10, 44-dy);
      ctx.fillStyle = '#aaa';
      ctx.fillRect(rx+dx-2, ry-37+dy, 14, 6);
    });
    ctx.fillStyle = '#29202d';
    ctx.fillRect(rx-18, ry-8, 36, 28);
    drawLabel(ctx, 'ANCIENT RUINS', rx, ry - 46, '#b7a0ff');
    if (dist(G.player.x, G.player.y, 37*TILE, 30*TILE) < 64) drawLabel(ctx, '[E] Enter Dungeon', rx, ry + 45, '#cc88ff');

    // Draw bridge rails on top of bridge tiles.
    const bridges = [
      [30,36,36,42],
      [21,55,29,60],
      [54,61,60,66],
      [73,52,82,56],
    ];
    bridges.forEach(([x1,y1,x2,y2]) => {
      const sx = wx(x1*TILE), sy = wy(y1*TILE);
      const ww = (x2-x1+1)*TILE, hh = (y2-y1+1)*TILE;
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#4b2f16';
      ctx.lineWidth = 4;
      ctx.strokeRect(sx+4, sy+4, ww-8, hh-8);
      ctx.globalAlpha = 1;
    });

    for (const lm of LANDMARKS) {
      const sx = wx(lm.x*TILE);
      const sy = wy(lm.y*TILE);
      if (sx < -100 || sx > G.W + 100 || sy < -100 || sy > G.H + 100) continue;
      if (['village','bridge'].includes(lm.type)) continue;
      drawLabel(ctx, lm.label, sx, sy - 58, '#ffffffaa');
    }
  }

  function drawPlayer(ctx, store, t) {
    const p = G.player;
    const sx = wx(p.x);
    const sy = wy(p.y);

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(sx, sy + 18, 16, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    if (p.invincible) {
      ctx.globalAlpha = 0.45 + Math.sin(t*18)*0.25;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    const skin = store.activeSkin;
    const bodyColor = skin === 'gods_chosen' ? '#d4af37' : skin === 'shadow_knight' ? '#28243a' : '#2d6c9e';
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.roundRect(sx - 12, sy - 12, 24, 30, 8); ctx.fill();

    ctx.fillStyle = '#9bd9ff';
    ctx.beginPath(); ctx.arc(sx - 5, sy - 3, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 5, sy - 3, 3, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#d4af37';
    ctx.fillRect(sx - 5, sy + 6, 10, 5);

    ctx.strokeStyle = '#d4d4d4';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx + 15, sy - 4); ctx.lineTo(sx + 25, sy - 18); ctx.stroke();
  }

  function drawNpcMessage(ctx, W, H) {
    if (!G.npcMessage) return;
    const boxW = Math.min(340, W - 32);
    const boxH = 108;
    const x = (W - boxW) / 2;
    const y = H - boxH - 118;
    ctx.fillStyle = 'rgba(8,8,18,0.93)';
    ctx.strokeStyle = G.npcMessage.speakerColor || '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, boxW, boxH, 16); ctx.fill(); ctx.stroke();

    ctx.fillStyle = G.npcMessage.speakerColor || '#d4af37';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(G.npcMessage.speaker || 'Guide', x + 16, y + 25);

    ctx.fillStyle = '#ddd';
    ctx.font = '12px sans-serif';
    wrapText(ctx, G.npcMessage.text, x + 16, y + 48, boxW - 32, 17);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, yy);
        line = word + ' ';
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), x, yy);
  }

  function drawMinimap(ctx, W, H) {
    const mw = 132, mh = 132;
    const x = W - mw - 18;
    const y = 74;

    ctx.fillStyle = 'rgba(7,10,18,0.78)';
    ctx.strokeStyle = '#d4af3777';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, mw, mh, 10); ctx.fill(); ctx.stroke();

    const sx = mw / MAP_W;
    const sy = mh / MAP_H;

    // Water, lava, roads simplified.
    for (let ty=0; ty<MAP_H; ty+=3) {
      for (let tx=0; tx<MAP_W; tx+=3) {
        if (isWater(tx,ty)) ctx.fillStyle = '#1d6f94';
        else if (isLava(tx,ty)) ctx.fillStyle = '#b43211';
        else if (isRoad(tx,ty)) ctx.fillStyle = '#9a7650';
        else continue;
        ctx.fillRect(x + tx*sx, y + ty*sy, 3*sx, 3*sy);
      }
    }

    REALM_PORTALS.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(x + p.x*sx, y + p.y*sy, 3.2, 0, Math.PI*2); ctx.fill();
    });

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.arc(x + (G.player.x/TILE)*sx, y + (G.player.y/TILE)*sy, 4, 0, Math.PI*2); ctx.fill();
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        background: '#0d0d1a',
      }}
    />
  );
}

// CanvasRenderingContext2D.roundRect support fallback for older WebViews.
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + rr, y);
    this.lineTo(x + w - rr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rr);
    this.lineTo(x + w, y + h - rr);
    this.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    this.lineTo(x + rr, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rr);
    this.lineTo(x, y + rr);
    this.quadraticCurveTo(x, y, x + rr, y);
    this.closePath();
    return this;
  };
}

export { WORLD_REVISION };
