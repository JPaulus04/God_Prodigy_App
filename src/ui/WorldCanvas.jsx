// V105-STRONGHOLD-SCALE-POLISH-REV-001
import React, { useEffect, useRef } from 'react';
import { useGameStore }  from '../store/useGameStore';

// ── Sprite system ─────────────────────────────────────────────────────────────
// All sheets confirmed from asset_manifest.json:
//   Mob idle:    128×32 → 4 frames @ 32×32
//   Mob run:     384×64 → 6 frames @ 64×64
//   NPC idle:    128×32 → 4 frames @ 32×32  (Knight/Rogue/Wizzard)
//   NPC run:     384×64 → 6 frames @ 64×64
//   Citizen idle:256×64 → 4 frames @ 64×64
//   Trees: static PNGs (various sizes, draw as-is)
//   Buildings: static PNGs from Buildings/ folder
//
// Player = Knight NPC sprite (fully armored, 32×32 idle / 64×64 run)
// Draw size for player: 96px (3× sprite pixel size)
// Draw size for enemies: proportional to their game radius

const _SC = {};
function _img(key, path) {
  if (_SC[key]) return _SC[key];
  const img = new Image(); img.src = path; _SC[key] = img; return img;
}
const PC = '/assets/world/pixel_crawler/';
const BD = '/assets/world/Buildings/';

// ── Player: Knight NPC (fully armored)
// Idle: 128×32 (4 frames @ 32×32)  Run: 384×64 (6 frames @ 64×64)
_img('p_idle_side', PC + 'entities__npcs__knight__idle__idle_sheet.png');
_img('p_idle_down', PC + 'entities__npcs__knight__idle__idle_sheet.png');
_img('p_run_side',  PC + 'entities__npcs__knight__run__run_sheet.png');
_img('p_run_down',  PC + 'entities__npcs__knight__run__run_sheet.png');
_img('p_run_up',    PC + 'entities__npcs__knight__run__run_sheet.png');
_img('p_death',     PC + 'entities__npcs__knight__death__death_sheet.png');

// ── World NPCs
// Keeper (Wizzard): idle 128×32 / run 384×64
_img('npc_keeper_idle', PC + 'entities__npcs__wizzard__idle__idle_sheet.png');
_img('npc_keeper_run',  PC + 'entities__npcs__wizzard__run__run_sheet.png');
// Smith (Knight): idle 128×32 / run 384×64
_img('npc_smith_idle', PC + 'entities__npcs__knight__idle__idle_sheet.png');
_img('npc_smith_run',  PC + 'entities__npcs__knight__run__run_sheet.png');
// Merchant (Rogue): idle 128×32 / run 384×64
_img('npc_merchant_idle', PC + 'entities__npcs__rogue__idle__idle_sheet.png');
_img('npc_merchant_run',  PC + 'entities__npcs__rogue__run__run_sheet.png');
// Citizen (Tavern): idle 256×64 (4 frames @ 64×64)
_img('npc_citizen_idle', PC + 'entities__npcs__citizen_f__tavern_a__idle__idle_down_sheet.png');

// ── Trees (static PNGs)
_img('tree2', PC + 'environment__props__static__trees__model_01__size_02.png');
_img('tree3', PC + 'environment__props__static__trees__model_01__size_03.png');
_img('tree4', PC + 'environment__props__static__trees__model_01__size_04.png');

// ── Buildings (static PNGs)
_img('bld_hall',     BD + 'stronghold_crafting_hall.png');
_img('bld_forge',    BD + 'stronghold_forge.png');
_img('bld_market',   BD + 'stronghold_market.png');
_img('bld_barracks', BD + 'stronghold_barracks.png');
_img('bld_shrine',   BD + 'stronghold_shrine.png');

// ── Sprite draw helpers ───────────────────────────────────────────────────────
// Draw one frame from a horizontal sheet.
// Returns true if image was loaded and drawn.
function drawFrame(ctx, key, frame, srcW, srcH, dx, dy, dW, dH, flipX = false) {
  const img = _SC[key];
  if (!img || !img.complete || img.naturalWidth === 0) return false;
  ctx.save();
  if (flipX) { ctx.scale(-1, 1); dx = -dx - dW; }
  ctx.drawImage(img, frame * srcW, 0, srcW, srcH, dx, dy, dW, dH);
  ctx.restore();
  return true;
}

// Draw player (Knight sprite). Draw size = 96px.
// dir: 'down' | 'up' | 'side_right' | 'side_left'
// ── Player draw constants (single source of truth) ──────────────────────────
// All player states MUST use these exact destination dimensions.
// Source aspect is always square (32×32 idle, 64×64 run) but the character
// art only fills the inner portion of the frame, so we draw non-square to
// get proper human proportions and consistent visual height.
const PLAYER_DRAW_W = 42;   // destination width  (px on screen)
const PLAYER_DRAW_H = 54;   // destination height (px on screen)
const PLAYER_AX = 0.5;      // anchor X: 0 = left edge, 0.5 = center
const PLAYER_AY = 1.0;      // anchor Y: 1 = bottom edge (feet on ground)

function drawPlayerSprite(ctx, cx, cy, t, moving, dir) {
  const W = PLAYER_DRAW_W;
  const H = PLAYER_DRAW_H;
  const flipX = (dir === 'side_left');
  // Destination rect — bottom-center anchored
  const dx = cx - W * PLAYER_AX;
  const dy = cy - H * PLAYER_AY;

  if (moving) {
    // Knight run sheet: 384×64 → 6 frames @ 64×64
    const frame = Math.floor(t * 8) % 6;
    return drawFrame(ctx, 'p_run_side', frame, 64, 64, dx, dy, W, H, flipX);
  } else {
    // Knight idle sheet: 128×32 → 4 frames @ 32×32
    const frame = Math.floor(t * 4) % 4;
    return drawFrame(ctx, 'p_idle_side', frame, 32, 32, dx, dy, W, H, flipX);
  }
}

// Draw NPC sprite. Draw size = 72px.
// npcId: 'keeper' | 'smith' | 'merchant'
function drawNPCSprite(ctx, npcId, cx, cy, t) {
  // NPC idle: 128×32 → 4 frames @ 32×32
  // Draw at 38×48 — slightly smaller than player, bottom-center anchored
  const W = 38, H = 48;
  const key = 'npc_' + npcId + '_idle';
  const frame = Math.floor(t * 4) % 4;
  return drawFrame(ctx, key, frame, 32, 32, cx - W / 2, cy - H, W, H);
}

// Draw building PNG centered at (x,y)
function drawBuildingSprite(ctx, kind, x, y) {
  const img = _SC['bld_' + kind];
  if (!img || !img.complete || img.naturalWidth === 0) return false;
  // Target heights by building type
  const H = kind === 'hall' ? 150 : kind === 'barracks' ? 140 : 110;
  const W = H * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, x - W / 2, y - H * 0.75, W, H);
  return true;
}

// Draw tree PNG centered at (x,y)
function drawTreeSprite(ctx, x, y, scale = 1) {
  // Pick size based on scale
  const key = scale > 1.3 ? 'tree4' : scale > 0.9 ? 'tree3' : 'tree2';
  const img = _SC[key];
  if (!img || !img.complete || img.naturalWidth === 0) return false;
  const W = img.naturalWidth * 0.55 * scale;
  const H = img.naturalHeight * 0.55 * scale;
  ctx.drawImage(img, x - W / 2, y - H * 0.82, W, H);
  return true;
}

import { InputState }    from '../game/systems/InputState';
import { EnemyConfig }   from '../game/config/EnemyConfig';
import { AbilityConfig } from '../game/config/AbilityConfig';
import { hapticAttack, hapticHit, hapticCheckpoint, hapticCollect, hapticLevelUp } from '../utils/haptics';
import { sfxAttack, sfxHit, sfxCollect, sfxCheckpoint, sfxLevelUp, sfxPortal, resumeAudio } from '../utils/sfx';

const WORLD_REVISION = 'V105-STRONGHOLD-TOWN-POLISH-REV-001';
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
  // === OVERWORLD ROUTES ===
  if (tx >= 22 && tx <= 28 && ty >= 26 && ty <= 38) return true;   // N village approach
  if (tx >= 22 && tx <= 28 && ty >= 56 && ty <= 70) return true;   // S village exit
  if (ty >= 37 && ty <= 41 && tx >= 14 && tx <= 48) return true;   // bridge road across river
  if (ty >= 30 && ty <= 34 && tx >= 25 && tx <= 44) return true;   // ruins-wind route
  if (tx >= 42 && tx <= 46 && ty >= 24 && ty <= 43) return true;   // east bend
  if (tx >= 13 && tx <= 25 && ty >= 60 && ty <= 64) return true;   // lake route
  if (tx >= 25 && tx <= 59 && ty >= 83 && ty <= 87) return true;   // southern badlands road
  if (tx >= 55 && tx <= 59 && ty >= 64 && ty <= 90) return true;   // lava route
  if (ty >= 43 && ty <= 47 && tx >= 58 && tx <= 78) return true;   // east highland route
  if (tx >= 76 && tx <= 80 && ty >= 43 && ty <= 78) return true;   // void approach road
  if (ty >= 76 && ty <= 80 && tx >= 76 && tx <= 102) return true;  // void road

  // === STRONGHOLD VILLAGE INTERNAL PATHS ===
  if (tx >= 24 && tx <= 28 && ty >= 38 && ty <= 57) return true;   // main N-S spine / plaza
  if (ty >= 44 && ty <= 46 && tx >= 14 && tx <= 36) return true;   // E-W plaza cross
  if (tx >= 14 && tx <= 24 && ty >= 42 && ty <= 48) return true;   // market district path
  if (tx >= 26 && tx <= 36 && ty >= 43 && ty <= 49) return true;   // forge district path
  if (tx >= 14 && tx <= 24 && ty >= 48 && ty <= 52) return true;   // barracks path
  if (tx >= 24 && tx <= 30 && ty >= 50 && ty <= 58) return true;   // shrine sacred path

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
  // Central plaza + all district lots
  if (inRect(tx, ty, 18, 40, 32, 56)) return true;  // main village area
  if (inRect(tx, ty, 14, 42, 20, 56)) return true;  // market/barracks west wing
  if (inRect(tx, ty, 28, 43, 36, 54)) return true;  // forge east wing
  return false;
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

  if (tx < 2 || tx >= MAP_W-2 || ty < 2 || ty >= MAP_H-2) return '#175d8c';
  if (isWater(tx, ty)) return h > 0.6 ? '#207ca3' : h > 0.3 ? '#1c6f94' : '#186284';
  if (isLava(tx, ty)) return h > 0.7 ? '#c0392b' : h > 0.4 ? '#a93226' : '#8e271f';
  if (isBridge(tx, ty)) return h > 0.5 ? '#704f33' : '#61442b';
  if (isRoad(tx, ty)) return h > 0.7 ? '#a68560' : h > 0.3 ? '#997a57' : '#8c6e4e';
  if (isVillageFloor(tx, ty)) return h > 0.6 ? '#826e54' : h > 0.2 ? '#78644c' : '#6e5a43';

  if (ty < 32 && tx < 36) return h > 0.7 ? '#308c46' : h > 0.3 ? '#2c8040' : '#277439';
  if (ty < 34 && tx >= 36 && tx < 52) return h > 0.6 ? '#5e5a55' : '#524e4a';
  if (ty < 28 && tx >= 52 && tx < 78) return h > 0.6 ? '#8b9aab' : '#778696';
  if (tx >= 52 && tx < 82 && ty >= 28 && ty < 55) return h > 0.6 ? '#5c574f' : '#4d4841';
  if (tx < 24 && ty >= 54 && ty < 72) return h > 0.6 ? '#226848' : '#1d5a3e';
  if (ty >= 70 && tx < 64) return h > 0.6 ? '#4f2b1a' : '#402315';
  if (tx >= 76 && ty >= 55) return h > 0.6 ? '#281c36' : '#1e1529';
  if (tx >= 82 && ty < 55) return h > 0.6 ? '#534b66' : '#474057';

  return h > 0.75 ? '#36944e' : h > 0.25 ? '#308546' : '#2b783f';
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
  // Try sprite first
  if (drawTreeSprite(ctx, x, y, scale)) return;
  // Fallback primitives
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y + 16*scale, 16*scale, 6*scale, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#4a2e15';
  ctx.beginPath();
  ctx.moveTo(x - 3*scale, y + 16*scale);
  ctx.lineTo(x + 3*scale, y + 16*scale);
  ctx.lineTo(x + 2*scale, y + 2*scale);
  ctx.lineTo(x - 2*scale, y + 2*scale);
  ctx.fill();

  const gradient = ctx.createRadialGradient(x - 4*scale, y - 6*scale, 2*scale, x, y, 18*scale);
  gradient.addColorStop(0, '#3a9e46');
  gradient.addColorStop(0.6, '#237330');
  gradient.addColorStop(1, '#154c1e');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y - 4*scale, 16*scale, 0, Math.PI*2);
  ctx.arc(x - 8*scale, y + 2*scale, 10*scale, 0, Math.PI*2);
  ctx.arc(x + 8*scale, y + 2*scale, 10*scale, 0, Math.PI*2);
  ctx.arc(x, y - 16*scale, 12*scale, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#4cc95c';
  ctx.globalAlpha = 0.4;
  ctx.beginPath(); ctx.arc(x - 4*scale, y - 18*scale, 4*scale, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 10*scale, y, 3*scale, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawRock(ctx, x, y, scale = 1) {
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.ellipse(x+2, y+10*scale, 16*scale, 6*scale, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#5c5855';
  ctx.beginPath();
  ctx.moveTo(x-14*scale, y+8*scale);
  ctx.lineTo(x-8*scale, y-10*scale);
  ctx.lineTo(x+8*scale, y-12*scale);
  ctx.lineTo(x+16*scale, y-2*scale);
  ctx.lineTo(x+12*scale, y+9*scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#8a8581';
  ctx.beginPath();
  ctx.moveTo(x-12*scale, y+6*scale);
  ctx.lineTo(x-6*scale, y-8*scale);
  ctx.lineTo(x+4*scale, y-2*scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#736d6a';
  ctx.beginPath();
  ctx.moveTo(x+4*scale, y-2*scale);
  ctx.lineTo(x+6*scale, y-10*scale);
  ctx.lineTo(x+14*scale, y-2*scale);
  ctx.lineTo(x+10*scale, y+7*scale);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#423f3d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x-2*scale, y-8*scale);
  ctx.lineTo(x+4*scale, y-2*scale);
  ctx.lineTo(x+2*scale, y+8*scale);
  ctx.stroke();
}

function drawPortal(ctx, x, y, portal, t) {
  const pulse = 0.75 + Math.sin(t*3) * 0.18;
  ctx.save();
  ctx.translate(x, y);

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 20, 36, 12, 0, 0, Math.PI*2); ctx.fill();

  ctx.globalAlpha = 0.3 * pulse;
  const radGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 50);
  radGrad.addColorStop(0, portal.color);
  radGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = radGrad;
  ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = portal.color;
  ctx.lineWidth = 3;
  for (let i=0; i<3; i++) {
    ctx.globalAlpha = 0.5 + i*0.15;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18 + i*10 + Math.sin(t*2+i)*3, 24 + i*12 + Math.cos(t*2.5+i)*3, t*0.5 + i, 0, Math.PI*2);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, 8 + Math.sin(t*5)*2, 0, Math.PI*2); ctx.fill();

  ctx.globalAlpha = 1;
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const iconY = Math.sin(t*2) * 4;
  ctx.fillText(portal.icon, 0, iconY);

  ctx.font = 'bold 11px sans-serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.fillStyle = '#fff';
  ctx.strokeText(portal.realm.toUpperCase(), 0, -50);
  ctx.fillText(portal.realm.toUpperCase(), 0, -50);
  ctx.restore();
}

function drawBuilding(ctx, x, y, kind, t) {
  // Try PNG sprite first — draws label on top regardless
  const spriteDrawn = drawBuildingSprite(ctx, kind, x, y);
  if (spriteDrawn) {
    // Ground shadow
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+2, y+38, 58, 12, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Building label above
    const labels = { hall:'CRAFTING HALL', forge:'FORGE', market:'MARKET', barracks:'BARRACKS', shrine:'SHRINE' };
    const lbl = labels[kind] || kind.toUpperCase();
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeText(lbl, x, y - 68);
    ctx.fillStyle = '#d4af37'; ctx.fillText(lbl, x, y - 68);
    return;
  }
  ctx.save();
  ctx.translate(x, y);

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(2, 38, 58, 12, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  if (kind === 'hall') {
    ctx.fillStyle = '#594024'; ctx.fillRect(-46, -30, 92, 70);
    ctx.strokeStyle = '#3d2a15'; ctx.lineWidth = 1;
    for (let i=-40; i<=40; i+=8) {
      ctx.beginPath(); ctx.moveTo(i, -30); ctx.lineTo(i, 40); ctx.stroke();
    }

    ctx.fillStyle = '#782315'; 
    ctx.beginPath(); ctx.moveTo(0, -64); ctx.lineTo(-58, -30); ctx.lineTo(58, -30); ctx.closePath(); ctx.fill();

    ctx.strokeStyle = '#54150a'; ctx.lineWidth = 2;
    for (let i=-4; i<=4; i++) {
      ctx.beginPath(); ctx.moveTo(i*10, -60 + Math.abs(i)*2.5); ctx.lineTo(-50 + (i+4)*12, -30); ctx.stroke();
    }

    ctx.fillStyle = '#1c1005'; ctx.fillRect(-12, 12, 24, 28);
    ctx.fillStyle = '#3d2511'; ctx.beginPath(); ctx.arc(0, 12, 12, Math.PI, 0); ctx.fill(); 
    ctx.fillStyle = '#d4af37'; ctx.beginPath(); ctx.arc(8, 26, 2, 0, Math.PI*2); ctx.fill(); 

    ctx.fillStyle = '#d4af37'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
    ctx.strokeText('CRAFTING HALL', 0, 4);
    ctx.fillText('CRAFTING HALL', 0, 4);
  }

  if (kind === 'forge') {
    ctx.fillStyle = '#423d38'; ctx.fillRect(-26, -20, 52, 44);
    ctx.fillStyle = '#302d29'; ctx.fillRect(-20, -20, 40, 44);

    ctx.fillStyle = '#262422'; ctx.fillRect(10, -50, 12, 30);
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(16, -58 - (t%2)*10, 8 + (t%2)*4, 0, Math.PI*2); ctx.fill(); 
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#2e2016';
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(-34, -18); ctx.lineTo(34, -18); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#111'; ctx.fillRect(-12, 10, 24, 14);
    const glow = 0.6 + Math.sin(t*6)*0.4;
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#ff6b00'; 
    ctx.beginPath(); ctx.arc(0, 18, 8 + Math.random()*2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffb300';
    ctx.beginPath(); ctx.arc(0, 18, 4, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#e67e22'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
    ctx.strokeText('FORGE', 0, -28);
    ctx.fillText('FORGE', 0, -28);
  }

  if (kind === 'market') {
    ctx.fillStyle = '#5c4028'; ctx.fillRect(-26, -12, 52, 16);

    ctx.fillStyle = '#8e44ad'; ctx.fillRect(-30, -32, 60, 16);
    ctx.fillStyle = '#f1c40f'; 
    for(let i=-26; i<=26; i+=12) {
       ctx.fillRect(i, -32, 6, 16);
    }

    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(-14, -14, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3498db'; ctx.fillRect(-4, -16, 6, 6);
    ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(10, -14, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(16, -14, 3, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#9b59b6'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
    ctx.strokeText('MARKET', 0, -40);
    ctx.fillText('MARKET', 0, -40);
  }


  if (kind === 'barracks') {
    // Main building
    ctx.fillStyle = '#3a5228';
    ctx.fillRect(-36, -28, 72, 54);
    ctx.strokeStyle = '#2a3d1a'; ctx.lineWidth = 1;
    for (let si=-30; si<=30; si+=9) {
      ctx.beginPath(); ctx.moveTo(si, -28); ctx.lineTo(si, 26); ctx.stroke();
    }
    // Roof
    ctx.fillStyle = '#21355e';
    ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(-46, -26); ctx.lineTo(46, -26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#162444'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(-40, -26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(40, -26); ctx.stroke();
    // Windows
    ctx.fillStyle = '#7bb8d8';
    ctx.fillRect(-28, -14, 12, 10);
    ctx.fillRect(16, -14, 12, 10);
    ctx.strokeStyle = '#4a90b0'; ctx.lineWidth = 1;
    ctx.strokeRect(-28, -14, 12, 10);
    ctx.strokeRect(16, -14, 12, 10);
    // Door
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(-8, 4, 16, 22);
    ctx.fillStyle = '#4a3518'; ctx.beginPath(); ctx.arc(0, 4, 8, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#d4af37'; ctx.beginPath(); ctx.arc(4, 16, 1.5, 0, Math.PI*2); ctx.fill();
    // Label
    ctx.fillStyle = '#5ba0c8'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
    ctx.strokeText('BARRACKS', 0, -36);
    ctx.fillText('BARRACKS', 0, -36);
  }

  ctx.restore();
}

function drawShrine(ctx, x, y, color, label, t) {
  ctx.save();
  ctx.translate(x, y);

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 20, 44, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#4f4f4f'; ctx.fillRect(-30, 12, 60, 8);
  ctx.fillStyle = '#3d3d3d'; ctx.fillRect(-30, 20, 60, 2);
  ctx.fillStyle = '#6b6b6b'; ctx.fillRect(-26, 6, 52, 6);
  ctx.fillStyle = '#555555'; ctx.fillRect(-26, 12, 52, 2);

  [[-24,0],[16,0]].forEach(([px]) => {
    ctx.fillStyle = '#444'; ctx.fillRect(px+8, -36, 2, 42);
    const grad = ctx.createLinearGradient(px, 0, px+8, 0);
    grad.addColorStop(0, '#888'); grad.addColorStop(1, '#555');
    ctx.fillStyle = grad; 
    ctx.fillRect(px, -36, 8, 42);
    ctx.fillStyle = '#999'; ctx.fillRect(px-2, -40, 12, 6);
    ctx.fillStyle = '#999'; ctx.fillRect(px-2, 2, 12, 4);
  });

  ctx.fillStyle = '#666'; ctx.fillRect(-30, -46, 60, 8);
  ctx.fillStyle = '#888'; ctx.fillRect(-28, -48, 56, 2);

  const floatY = Math.sin(t*2.5) * 4;
  const pulse = 0.5 + Math.sin(t*3)*0.2;

  ctx.globalAlpha = pulse * 0.4;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, -14 + floatY, 22, 0, Math.PI*2); ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -28 + floatY);
  ctx.lineTo(-10, -14 + floatY);
  ctx.lineTo(0, 0 + floatY);
  ctx.lineTo(10, -14 + floatY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(0, -26 + floatY); ctx.lineTo(-4, -14 + floatY); ctx.lineTo(0, -2 + floatY); ctx.fill();

  ctx.globalAlpha = 1;
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  ctx.strokeText(label, 0, 38);
  ctx.fillText(label, 0, 38);
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
    playerDir: 'down',     // 'down' | 'up' | 'side_left' | 'side_right'
    playerMoving: false,
    playerAttacking: false,
    playerAtkTimer: 0,
    spriteT: 0,            // monotonic time for sprite animation
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
    G.playerMoving = !!(mx || my);
    if (mx || my) {
      resumeAudio?.();
      tryMove(p, p.x + mx * speed * dt, p.y + my * speed * dt);
      // Update facing direction for sprite animation
      if (Math.abs(mx) > Math.abs(my)) {
        G.playerDir = mx > 0 ? 'side_right' : 'side_left';
      } else if (my < 0) {
        G.playerDir = 'up';
      } else {
        G.playerDir = 'down';
      }
    }
    G.spriteT += dt;

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
    if (attackJust && p.attackCooldown <= 0) { handleAttack(store); G.playerAtkTimer = 0.4; }
    if (G.playerAtkTimer > 0) { G.playerAtkTimer -= dt; G.playerAttacking = G.playerAtkTimer > 0; } else { G.playerAttacking = false; }

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
      // Ground shadow
      ctx.fillStyle = '#000'; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.ellipse(sx, sy + 14, 11, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      // Try NPC sprite (idle animation)
      const npcDrawn = drawNPCSprite(ctx, npc.id, sx, sy, G.spriteT);
      if (!npcDrawn) {
        // Fallback: colored body+head
        ctx.fillStyle = npc.color;
        ctx.beginPath(); ctx.arc(sx, sy - 6, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#f2d7b6';
        ctx.beginPath(); ctx.arc(sx, sy - 18, 7, 0, Math.PI*2); ctx.fill();
      }
      // Name label
      ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.strokeText(npc.name, sx, sy - 34);
      ctx.fillText(npc.name, sx, sy - 34);
      if (dist(G.player.x, G.player.y, npc.x, npc.y) < 54) drawLabel(ctx, '[E] Talk', sx, sy - 47, npc.color);
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
  // =====================================================
  // V105-STRONGHOLD-TOWN-POLISH-REV-001
  // Overworld trees & rocks
  // =====================================================
  const decorTrees = [
    [18,24],[20,26],[22,24],[29,22],[31,24],[33,25],
    [14,54],[17,55],[11,64],[13,67],
    [9,34],[10,36],[16,30],[29,30],[31,31],
    [11,42],[12,43],[10,45], // west woods edge
  ];
  decorTrees.forEach(([tx,ty]) => drawTree(ctx, wx(tx*TILE), wy(ty*TILE), 0.9));

  const decorRocks = [
    [51,35],[53,37],[63,38],[65,40],[72,47],[74,48],[96,80],[99,82],[58,88],[60,90],
    [37,31],[39,32],
  ];
  decorRocks.forEach(([tx,ty]) => drawRock(ctx, wx(tx*TILE), wy(ty*TILE), 0.9));

  // =====================================================
  // STRONGHOLD VILLAGE TOWN COMPOSITION
  // =====================================================

  // --- Ground: Plaza stone center ---
  const px = wx(24*TILE), py = wy(44*TILE);
  const plazaW = 4*TILE, plazaH = 3*TILE;
  ctx.fillStyle = '#8a7a65';
  ctx.fillRect(px, py, plazaW, plazaH);
  // Plaza stone tile pattern
  ctx.strokeStyle = '#6e6254';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < plazaW; gx += 16) {
    ctx.beginPath(); ctx.moveTo(px+gx, py); ctx.lineTo(px+gx, py+plazaH); ctx.stroke();
  }
  for (let gy = 0; gy < plazaH; gy += 16) {
    ctx.beginPath(); ctx.moveTo(px, py+gy); ctx.lineTo(px+plazaW, py+gy); ctx.stroke();
  }
  // Plaza center well/fountain
  const wellX = wx(26*TILE), wellY = wy(45*TILE);
  ctx.fillStyle = '#4a3a2e';
  ctx.beginPath(); ctx.arc(wellX, wellY, 14, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2a6080';
  ctx.beginPath(); ctx.arc(wellX, wellY, 10, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 0.5 + Math.sin(t*2)*0.2;
  ctx.strokeStyle = '#5ab5d4';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(wellX, wellY, 6 + Math.sin(t*3)*1, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#6b5030'; ctx.lineWidth = 2;
  ctx.strokeRect(wx(24*TILE)-2, wy(44*TILE)-2, 4*TILE+4, 3*TILE+4);

  // === VILLAGE FENCE ===
  // Full perimeter with gate openings
  const fenceColor = '#5c3a1a';
  const postColor  = '#3d2510';
  ctx.fillStyle = fenceColor;
  ctx.lineWidth = 0;

  function fenceH(x1t, x2t, tileY, gapStart, gapEnd) {
    for (let tx = x1t; tx <= x2t; tx++) {
      if (tx >= gapStart && tx <= gapEnd) continue;
      const sx = wx(tx*TILE);
      const sy = wy(tileY*TILE);
      ctx.fillStyle = fenceColor;
      ctx.fillRect(sx, sy+4, TILE, 5);
      ctx.fillStyle = postColor;
      ctx.fillRect(sx, sy+2, 4, 10);
    }
  }
  function fenceV(y1t, y2t, tileX, gapStart, gapEnd) {
    for (let ty = y1t; ty <= y2t; ty++) {
      if (ty >= gapStart && ty <= gapEnd) continue;
      const sx = wx(tileX*TILE);
      const sy = wy(ty*TILE);
      ctx.fillStyle = fenceColor;
      ctx.fillRect(sx+4, sy, 5, TILE);
      ctx.fillStyle = postColor;
      ctx.fillRect(sx+2, sy, 10, 4);
    }
  }

  // North fence — gap at main road (tx 24-28) for path in from north
  fenceH(13, 36, 38, 24, 28);
  // South fence — gap at shrine path (tx 24-28) and south exit
  fenceH(13, 36, 57, 24, 28);
  // West fence — gap at market door (ty 44-46)
  fenceV(38, 57, 13, 44, 46);
  // East fence — gap at forge door (ty 44-46)
  fenceV(38, 57, 36, 44, 46);

  // Inner district separators (lighter low fence / hedge)
  ctx.fillStyle = '#4a7a30';
  // Hedge row between market and barracks district (west side)
  for (let tx=14; tx<=21; tx++) {
    ctx.fillRect(wx(tx*TILE)+4, wy(48*TILE)+4, TILE-8, 5);
  }
  // Hedge row between forge district and shrine (east side)  
  for (let tx=28; tx<=35; tx++) {
    ctx.fillRect(wx(tx*TILE)+4, wy(50*TILE)+4, TILE-8, 5);
  }
  // Small garden bushes in plaza corners
  const bushPositions = [[14,40],[14,41],[35,40],[35,41],[14,54],[14,55],[35,54],[35,55]];
  bushPositions.forEach(([btx, bty]) => {
    const bx = wx(btx*TILE) + TILE/2;
    const by = wy(bty*TILE) + TILE/2;
    ctx.fillStyle = '#2d6e20';
    ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3d8c2a';
    ctx.beginPath(); ctx.arc(bx-3, by-3, 5, 0, Math.PI*2); ctx.fill();
  });

  // Flower beds along plaza edges
  const flowerColors = ['#e74c3c','#f39c12','#3498db','#9b59b6','#e67e22'];
  [[25,43],[26,43],[27,43],[25,47],[26,47],[27,47]].forEach(([ftx,fty],i) => {
    const fx = wx(ftx*TILE) + TILE/2;
    const fy = wy(fty*TILE) + TILE/2;
    ctx.fillStyle = '#1e5c10';
    ctx.fillRect(fx-5, fy, 10, 6);
    ctx.fillStyle = flowerColors[i % flowerColors.length];
    ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx-4, fy+3, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx+4, fy+3, 3, 0, Math.PI*2); ctx.fill();
  });

  // === BUILDINGS ===
  // Crafting Hall — central north of plaza
  drawBuilding(ctx, wx(26*TILE), wy(40*TILE), 'hall', t);

  // Forge — east district (forge fire glow effect)
  drawBuilding(ctx, wx(32*TILE), wy(46*TILE), 'forge', t);
  // Forge props: anvil + crates
  {
    const fx = wx(34*TILE), fy = wy(47*TILE);
    // Anvil
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(fx-6, fy-4, 12, 6);
    ctx.fillRect(fx-3, fy-8, 6, 4);
    // Fire pit nearby
    const fireGlow = 0.5 + Math.sin(t*4)*0.3;
    ctx.globalAlpha = fireGlow;
    ctx.fillStyle = '#ff6b00';
    ctx.beginPath(); ctx.arc(fx+14, fy-2, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffb300';
    ctx.beginPath(); ctx.arc(fx+14, fy-4, 3, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Ore crate
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(fx-18, fy, 10, 8);
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1;
    ctx.strokeRect(fx-18, fy, 10, 8);
    ctx.fillStyle = '#e67e22';
    ctx.beginPath(); ctx.arc(fx-13, fy-3, 3, 0, Math.PI*2); ctx.fill();
  }

  // Market — west district
  drawBuilding(ctx, wx(17*TILE), wy(44*TILE), 'market', t);
  // Market stall tables
  {
    const mx = wx(20*TILE), my = wy(45*TILE);
    // Table 1
    ctx.fillStyle = '#7a5030';
    ctx.fillRect(mx, my-4, 18, 3);
    ctx.fillRect(mx+1, my-1, 3, 8);
    ctx.fillRect(mx+14, my-1, 3, 8);
    // Items on table
    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(mx+5, my-7, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(mx+10, my-7, 2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f39c12'; ctx.fillRect(mx+13, my-8, 4, 4);
  }

  // Barracks — west south district
  drawBuilding(ctx, wx(17*TILE), wy(52*TILE), 'barracks', t);
  // Training yard: wooden dummies + fence
  {
    const bx = wx(21*TILE), by = wy(51*TILE);
    // Wooden training dummy 1
    ctx.fillStyle = '#7a5030';
    ctx.fillRect(bx, by-18, 4, 20); // post
    ctx.fillRect(bx-8, by-16, 20, 4); // crossbar
    ctx.fillStyle = '#5a3a1e';
    ctx.beginPath(); ctx.arc(bx+2, by-20, 5, 0, Math.PI*2); ctx.fill(); // "head"
    // Dummy 2
    ctx.fillStyle = '#7a5030';
    ctx.fillRect(bx+20, by-14, 4, 16);
    ctx.fillRect(bx+12, by-12, 18, 3);
    ctx.fillStyle = '#5a3a1e';
    ctx.beginPath(); ctx.arc(bx+22, by-16, 4, 0, Math.PI*2); ctx.fill();
    // Training ground dusty floor
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#a08060';
    ctx.beginPath(); ctx.ellipse(bx+10, by+4, 28, 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Shrine — south-east sacred area
  drawShrine(ctx, wx(27*TILE), wy(53*TILE), '#d4af37', 'SHRINE', t);
  // Sacred path stone markers
  for (let sty=50; sty<=53; sty++) {
    const sx2 = wx(25*TILE), sy2 = wy(sty*TILE);
    ctx.fillStyle = '#888070';
    ctx.fillRect(sx2-4, sy2+TILE/2-2, 6, 4);
    const sx3 = wx(29*TILE);
    ctx.fillRect(sx3-2, sy2+TILE/2-2, 6, 4);
  }

  // Shrine rune glow on ground
  {
    const rx = wx(27*TILE), ry = wy(54*TILE);
    const glowR = 0.3 + Math.sin(t*1.5)*0.12;
    ctx.globalAlpha = glowR;
    const rg = ctx.createRadialGradient(rx, ry, 4, rx, ry, 48);
    rg.addColorStop(0, '#d4af37');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(rx, ry, 48, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // === BRIDGES (upgraded with planks + rails) ===
  const bridges = [
    [30,36,36,42],
    [21,55,29,60],
    [54,61,60,66],
    [73,52,82,56],
  ];
  bridges.forEach(([x1,y1,x2,y2]) => {
    const sx = wx(x1*TILE), sy = wy(y1*TILE);
    const ww = (x2-x1+1)*TILE, hh = (y2-y1+1)*TILE;
    // Shadow under
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.fillRect(sx, sy+hh-8, ww, 16);
    ctx.globalAlpha = 1;
    // Plank lines
    ctx.strokeStyle = '#3d2510';
    ctx.lineWidth = 1;
    const isVert = hh > ww;
    if (isVert) {
      for (let py=0; py<hh; py+=14) { ctx.beginPath(); ctx.moveTo(sx, sy+py); ctx.lineTo(sx+ww, sy+py); ctx.stroke(); }
    } else {
      for (let bpx=0; bpx<ww; bpx+=14) { ctx.beginPath(); ctx.moveTo(sx+bpx, sy); ctx.lineTo(sx+bpx, sy+hh); ctx.stroke(); }
    }
    // Handrails
    ctx.fillStyle = '#59391a'; ctx.strokeStyle = '#2b1a0b'; ctx.lineWidth = 2;
    if (isVert) {
      ctx.fillRect(sx+1, sy-4, 5, hh+8); ctx.strokeRect(sx+1, sy-4, 5, hh+8);
      ctx.fillRect(sx+ww-6, sy-4, 5, hh+8); ctx.strokeRect(sx+ww-6, sy-4, 5, hh+8);
    } else {
      ctx.fillRect(sx-4, sy+1, ww+8, 5); ctx.strokeRect(sx-4, sy+1, ww+8, 5);
      ctx.fillRect(sx-4, sy+hh-6, ww+8, 5); ctx.strokeRect(sx-4, sy+hh-6, ww+8, 5);
    }
  });

  // === ANCIENT RUINS ===
  {
    const rx = wx(37*TILE), ry = wy(30*TILE);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(rx, ry+18, 52, 12, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4a4745'; ctx.fillRect(rx-40, ry+14, 80, 6);
    ctx.fillStyle = '#5c5855'; ctx.fillRect(rx-36, ry+10, 72, 10);
    [[-28,0],[-10,-4],[14,2],[30,-6]].forEach(([dx,dy], i) => {
      ctx.fillStyle = i % 2 ? '#6e6966' : '#5c5855';
      ctx.fillRect(rx+dx, ry-34+dy, 12, 44-dy);
      ctx.strokeStyle = '#3d3a38'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rx+dx+4, ry-20+dy); ctx.lineTo(rx+dx+8, ry-10+dy); ctx.stroke();
      ctx.fillStyle = '#8a8581';
      ctx.fillRect(rx+dx-2, ry-37+dy, 16, 6);
    });
    ctx.fillStyle = '#17121a';
    ctx.beginPath(); ctx.arc(rx, ry-2, 18, Math.PI, 0);
    ctx.lineTo(rx+18, ry+10); ctx.lineTo(rx-18, ry+10); ctx.fill();
    const glow = 0.5 + Math.sin(t*2)*0.3;
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#9b59b6';
    ctx.beginPath(); ctx.arc(rx-6, ry-12, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(rx+6, ry-8, 2, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    drawLabel(ctx, 'ANCIENT RUINS', rx, ry - 48, '#c39bd3');
    if (dist(G.player.x, G.player.y, 37*TILE, 30*TILE) < 64)
      drawLabel(ctx, '[E] Enter Dungeon', rx, ry + 40, '#d2b4de');
  }

  // === LANDMARK LABELS ===
  for (const lm of LANDMARKS) {
    const sx = wx(lm.x*TILE);
    const sy = wy(lm.y*TILE);
    if (sx < -100 || sx > G.W+100 || sy < -100 || sy > G.H+100) continue;
    if (['village','bridge','ruins'].includes(lm.type)) continue;
    drawLabel(ctx, lm.label, sx, sy - 58, '#ffffffaa');
  }
}

  function drawPlayer(ctx, store, t) {
  const p = G.player;
  const sx = wx(p.x);
  const sy = wy(p.y);

  // Ground shadow
  // Ground shadow — drawn at feet (sy), small ellipse
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(sx, sy + 3, 14, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  // Invincible shield flash
  if (p.invincible) {
    ctx.globalAlpha = 0.45 + Math.sin(t*18)*0.25;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Try sprite. If not loaded yet fall back to primitives.
  const spriteOk = drawPlayerSprite(ctx, sx, sy, G.spriteT, G.playerMoving, G.playerDir);
  if (spriteOk) return;

  // ── Primitive fallback ──
  const skin = store.activeSkin;
  let bodyColor = skin === 'gods_chosen' ? '#d4af37' : skin === 'shadow_knight' ? '#28243a' : '#2d6c9e';
  let bodyHighlight = skin === 'gods_chosen' ? '#ffe270' : skin === 'shadow_knight' ? '#443d63' : '#4990c7';

  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.roundRect(sx - 12, sy - 12, 24, 30, 8); ctx.fill();

  ctx.fillStyle = bodyHighlight;
  ctx.beginPath(); ctx.roundRect(sx - 8, sy - 10, 10, 8, 4); ctx.fill();

  ctx.fillStyle = '#9bd9ff';
  ctx.beginPath(); ctx.arc(sx - 5, sy - 3, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 5, sy - 3, 3.5, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(sx - 6, sy - 4, 1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 4, sy - 4, 1, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#d4af37';
  ctx.fillRect(sx - 6, sy + 6, 12, 4);

  ctx.strokeStyle = '#d4d4d4';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx + 15, sy - 2); ctx.lineTo(sx + 26, sy - 18); ctx.stroke();
  ctx.strokeStyle = '#8c7335';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(sx + 12, sy + 2); ctx.lineTo(sx + 16, sy - 4); ctx.stroke();
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
