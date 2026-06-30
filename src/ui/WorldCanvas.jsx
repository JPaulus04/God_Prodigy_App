// V100-STRONGHOLD-VILLAGE-REV-001
import React, { useEffect, useRef } from 'react';
import { useGameStore }  from '../store/useGameStore';
import { InputState }    from '../game/systems/InputState';
import { EnemyConfig }   from '../game/config/EnemyConfig';
import { AbilityConfig } from '../game/config/AbilityConfig';
import { PIXEL_CRAWLER_ASSETS } from '../game/config/WorldAssetManifest';
import { hapticAttack, hapticHit, hapticCheckpoint, hapticCollect, hapticLevelUp } from '../utils/haptics';
import { sfxAttack, sfxHit, sfxCollect, sfxCheckpoint, sfxLevelUp, sfxPortal, resumeAudio } from '../utils/sfx';

const WORLD_REVISION = 'V100-STRONGHOLD-VILLAGE-REV-001';
const TILE = 32;
const MAP_W = 120;
const MAP_H = 120;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const BORDER = TILE * 3;


// V100 Stronghold village rebuild: safe image loading + canvas fallbacks.
// Only low-risk world objects use assets in this pass.
const V99_ASSET_PATHS = {
  tree: PIXEL_CRAWLER_ASSETS?.props?.treeGreen || '/assets/world/pixel_crawler/environment__props__static__trees__model_01__size_02.png',
  rock: PIXEL_CRAWLER_ASSETS?.props?.rocks || '/assets/world/pixel_crawler/environment__props__static__rocks.png',
  resources: PIXEL_CRAWLER_ASSETS?.props?.resources || '/assets/world/pixel_crawler/environment__props__static__resources.png',
  vegetation: PIXEL_CRAWLER_ASSETS?.props?.vegetation || '/assets/world/pixel_crawler/environment__props__static__vegetation.png',
  workbench: PIXEL_CRAWLER_ASSETS?.stations?.workbench || '/assets/world/pixel_crawler/environment__structures__stations__workbench__workbench.png',
  furnace: PIXEL_CRAWLER_ASSETS?.stations?.furnace || '/assets/world/pixel_crawler/environment__structures__stations__furnace__furnace.png',
  anvil: PIXEL_CRAWLER_ASSETS?.stations?.anvil || '/assets/world/pixel_crawler/environment__structures__stations__anvil__anvil.png',

  // V99.3: real Stronghold exterior building sprites from user-provided assets.
  strongholdForge: '/assets/world/buildings/stronghold_forge.png',
  strongholdCrafting: '/assets/world/buildings/stronghold_crafting_hall.png',
  strongholdMarket: '/assets/world/buildings/stronghold_market.png',
  strongholdShrine: '/assets/world/buildings/stronghold_shrine.png',
  strongholdBarracks: '/assets/world/buildings/stronghold_barracks.png',

  // V100: stronger Stronghold village sprites cropped from the user-provided asset sheets.
  v100StrongholdForge: '/assets/world/buildings/v100_stronghold_forge.png',
  v100StrongholdCrafting: '/assets/world/buildings/v100_stronghold_crafting_hall.png',
  v100StrongholdMarket: '/assets/world/buildings/v100_stronghold_market.png',
  v100StrongholdShrine: '/assets/world/buildings/v100_stronghold_shrine.png',
  v100StrongholdBarracks: '/assets/world/buildings/v100_stronghold_barracks.png',
  v100StrongholdCrates: '/assets/world/buildings/v100_stronghold_crates_props.png',
  v100StrongholdGarden: '/assets/world/buildings/v100_stronghold_garden_props.png',
  v100StrongholdFountain: '/assets/world/buildings/v100_stronghold_fountain_single.png',
  v100StrongholdTraining: '/assets/world/buildings/v100_stronghold_training_props.png',
};

const V99_ASSET_SPRITES = {
  // Source rectangles are intentionally conservative so failed/odd crops fall back cleanly.
  treeGreen: { src: 'tree', sx: 32, sy: 0, sw: 32, sh: 64, ox: -22, oy: -48, dw: 44, dh: 66 },
  rockA:     { src: 'rock', sx: 42, sy: 18, sw: 36, sh: 34, ox: -18, oy: -19, dw: 36, dh: 34 },
  rockB:     { src: 'rock', sx: 80, sy: 18, sw: 36, sh: 34, ox: -18, oy: -19, dw: 36, dh: 34 },
  oreGlow:   { src: 'rock', sx: 146, sy: 16, sw: 32, sh: 40, ox: -17, oy: -23, dw: 34, dh: 40 },
  woodLog:   { src: 'resources', sx: 8, sy: 96, sw: 64, sh: 24, ox: -20, oy: -12, dw: 40, dh: 18 },
  workbench: { src: 'workbench', sx: 0, sy: 0, sw: 96, sh: 72, ox: -40, oy: -6, dw: 80, dh: 54 },
  furnace:   { src: 'furnace', sx: 0, sy: 0, sw: 64, sh: 96, ox: -22, oy: -24, dw: 44, dh: 66 },
  anvil:     { src: 'anvil', sx: 0, sy: 0, sw: 84, sh: 58, ox: -34, oy: -7, dw: 68, dh: 48 },
};

const V99_IMAGE_CACHE = new Map();

function getV99AssetImage(assetKey) {
  const src = V99_ASSET_PATHS[assetKey];
  if (!src || typeof Image === 'undefined') return null;
  let img = V99_IMAGE_CACHE.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = src;
    V99_IMAGE_CACHE.set(src, img);
  }
  if (!img.complete || !img.naturalWidth || !img.naturalHeight) return null;
  return img;
}

function preloadV99WorldAssets() {
  Object.keys(V99_ASSET_PATHS).forEach(getV99AssetImage);
}

function drawV99Sprite(ctx, spriteKey, x, y, scale = 1) {
  const sprite = V99_ASSET_SPRITES[spriteKey];
  if (!sprite) return false;
  const img = getV99AssetImage(sprite.src);
  if (!img) return false;

  ctx.save();
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    sprite.sx, sprite.sy, sprite.sw, sprite.sh,
    x + sprite.ox * scale,
    y + sprite.oy * scale,
    sprite.dw * scale,
    sprite.dh * scale
  );
  ctx.imageSmoothingEnabled = previousSmoothing;
  ctx.restore();
  return true;
}

function drawV99AssetImage(ctx, assetKey, x, y, width, height, options = {}) {
  const img = getV99AssetImage(assetKey);
  if (!img) return false;

  const { anchorX = 0.5, anchorY = 1, offsetX = 0, offsetY = 0 } = options;
  ctx.save();
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    x - width * anchorX + offsetX,
    y - height * anchorY + offsetY,
    width,
    height
  );
  ctx.imageSmoothingEnabled = previousSmoothing;
  ctx.restore();
  return true;
}

function drawHubNameplate(ctx, label, y, color, fontSize = 9.5) {
  const width = Math.max(58, label.length * fontSize * 0.78);
  const height = 16;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#090706';
  ctx.fillRect(-width/2, y - height/2, width, height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-width/2, y - height/2, width, height);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  ctx.strokeText(label, 0, y);
  ctx.fillText(label, 0, y);
  ctx.restore();
}

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
  { id:'keeper', x:25.0*TILE, y:44.6*TILE, color:'#1abc9c', name:'The Keeper',
    lines: [
      'Many have killed a god. None have survived all ten.',
      'The Stronghold is your sanctuary. Each building prepares you for a different part of the climb.',
      'Use the village, then follow the old roads north toward the first throne.',
    ] },
  { id:'smith', x:28.7*TILE, y:47.3*TILE, color:'#e67e22', name:'Aldric',
    lines: ['The Forge is where gear becomes god-killing steel. Bring ore and I will make it bite.'] },
  { id:'merchant', x:18.2*TILE, y:47.4*TILE, color:'#9b59b6', name:'Mira',
    lines: ['The Market keeps challengers supplied. Crates, coin, and luck — that is my business.'] },
];

const STRONGHOLD_BUILDINGS = [
  // V100: tighter hub layout, centered away from the right-side action buttons.
  { id:'crafting', kind:'crafting', label:'Crafting Hall', shortLabel:'CRAFTING', prompt:'Enter Crafting Hall', color:'#53d4ff', x:23.6*TILE, y:42.35*TILE, radius:62 },
  { id:'market', kind:'market', label:'Market', shortLabel:'MARKET', prompt:'Enter Market', color:'#f6c46b', x:19.2*TILE, y:46.25*TILE, radius:62 },
  { id:'forge', kind:'forge', label:'Forge', shortLabel:'FORGE', prompt:'Enter Forge', color:'#ff8a1f', x:27.8*TILE, y:46.25*TILE, radius:64 },
  { id:'barracks', kind:'barracks', label:'Barracks', shortLabel:'BARRACKS', prompt:'Enter Barracks', color:'#78d8ff', x:20.6*TILE, y:50.55*TILE, radius:64 },
  { id:'shrine', kind:'shrine_house', label:'Ascension Shrine', shortLabel:'SHRINE', prompt:'Enter Shrine', color:'#f1c40f', x:25.7*TILE, y:50.65*TILE, radius:66 },
];

function getStrongholdBuildingNear(worldX, worldY, extraRadius = 0) {
  let best = null;
  let bestDist = Infinity;
  for (const building of STRONGHOLD_BUILDINGS) {
    const d = dist(worldX, worldY, building.x, building.y);
    if (d <= building.radius + extraRadius && d < bestDist) {
      best = building;
      bestDist = d;
    }
  }
  return best;
}

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
  if (ty >= 44 && ty <= 48 && tx >= 17 && tx <= 30) return true;     // V100 Stronghold main plaza road
  if (ty >= 49 && ty <= 52 && tx >= 19 && tx <= 27) return true;     // V100 lower village loop
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
  return (
    inRect(tx, ty, 17, 39, 30, 53) ||
    inRect(tx, ty, 19, 53, 27, 55)
  );
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
  // V100 Stronghold village buildings. Door/front approach tiles remain open.
  if (inRect(tx, ty, 22.9, 42.9, 24.4, 44.0)) return false; // Crafting Hall door
  if (inRect(tx, ty, 18.4, 46.7, 19.9, 47.9)) return false; // Market door
  if (inRect(tx, ty, 27.0, 46.8, 28.7, 48.0)) return false; // Forge door
  if (inRect(tx, ty, 20.0, 51.0, 21.4, 52.2)) return false; // Barracks door
  if (inRect(tx, ty, 24.9, 51.1, 26.5, 52.4)) return false; // Shrine steps

  if (inRect(tx, ty, 21.4, 40.0, 25.7, 43.2)) return true;  // Crafting Hall
  if (inRect(tx, ty, 17.5, 44.4, 20.9, 47.1)) return true;  // Market
  if (inRect(tx, ty, 26.1, 44.1, 29.8, 47.2)) return true;  // Forge
  if (inRect(tx, ty, 18.9, 48.8, 22.3, 51.5)) return true;  // Barracks
  if (inRect(tx, ty, 23.7, 48.3, 27.9, 51.3)) return true;  // Ascension Shrine
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
  if (isRoad(tx, ty)) return h > 0.7 ? '#b79a72' : h > 0.3 ? '#a98961' : '#96734f';
  if (isVillageFloor(tx, ty)) return h > 0.6 ? '#8c7559' : h > 0.2 ? '#7f684e' : '#735c43';

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
  if (drawV99Sprite(ctx, 'treeGreen', x, y, scale)) return;

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
  const variant = tileHash(Math.round(x), Math.round(y)) > 0.55 ? 'rockB' : 'rockA';
  if (drawV99Sprite(ctx, variant, x, y, scale)) return;

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

function drawSignText(ctx, text, y, color, size = 10) {
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.fillStyle = color;
  ctx.strokeText(text, 0, y);
  ctx.fillText(text, 0, y);
}

function drawDoor(ctx, x = 0, y = 14, w = 20, h = 28, color = '#1c1005') {
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = '#3d2511';
  ctx.beginPath(); ctx.arc(x, y, w / 2, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#d4af37';
  ctx.beginPath(); ctx.arc(x + w * 0.32, y + h * 0.55, 2, 0, Math.PI*2); ctx.fill();
}

function drawWoodCabin(ctx, roofColor, wallColor, label, labelColor, options = {}) {
  const { width = 88, height = 66, roofHeight = 34, doorY = 10 } = options;
  ctx.fillStyle = wallColor;
  ctx.fillRect(-width/2, -28, width, height);
  ctx.strokeStyle = '#3d2a15'; ctx.lineWidth = 1;
  for (let i = -width/2 + 8; i <= width/2 - 8; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, -28); ctx.lineTo(i, -28 + height); ctx.stroke();
  }

  ctx.fillStyle = roofColor;
  ctx.beginPath(); ctx.moveTo(0, -28 - roofHeight); ctx.lineTo(-width/2 - 12, -28); ctx.lineTo(width/2 + 12, -28); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  for (let i=-4; i<=4; i++) {
    ctx.beginPath(); ctx.moveTo(i*10, -28 - roofHeight + Math.abs(i)*2); ctx.lineTo(-width/2 + (i+4)*12, -28); ctx.stroke();
  }
  drawDoor(ctx, 0, doorY, 20, 28);
  drawSignText(ctx, label, doorY - 8, labelColor, label.length > 8 ? 8.5 : 10);
}

const STRONGHOLD_BUILDING_ASSETS = {
  crafting: {
    asset: 'v100StrongholdCrafting', label: 'CRAFTING', color: '#73e4ff',
    width: 118, height: 93, shadowW: 58, nameY: -58, promptY: 55,
  },
  forge: {
    asset: 'v100StrongholdForge', label: 'FORGE', color: '#ff9a2e',
    width: 122, height: 106, shadowW: 62, nameY: -64, promptY: 58,
  },
  market: {
    asset: 'v100StrongholdMarket', label: 'MARKET', color: '#ffd071',
    width: 116, height: 82, shadowW: 58, nameY: -52, promptY: 52,
  },
  shrine_house: {
    asset: 'v100StrongholdShrine', label: 'SHRINE', color: '#f1c40f',
    width: 126, height: 102, shadowW: 68, nameY: -64, promptY: 58,
  },
  barracks: {
    asset: 'v100StrongholdBarracks', label: 'BARRACKS', color: '#8ee6ff',
    width: 120, height: 87, shadowW: 60, nameY: -56, promptY: 54,
  },
};

function drawSmallSignpost(ctx, x, y, label, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#3b2512';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, 10);
  ctx.stroke();

  ctx.fillStyle = '#5b3718';
  ctx.strokeStyle = '#1b0e05';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-18, -26, 36, 14, 3);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeText(label, 0, -19);
  ctx.fillText(label, 0, -19);
  ctx.restore();
}

function drawBuilding(ctx, x, y, kind, t) {
  ctx.save();
  ctx.translate(x, y);

  const spec = STRONGHOLD_BUILDING_ASSETS[kind];
  if (spec) {
    // V100: real asset-based exteriors with stronger shadows and lighter labels.
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(3, 35, spec.shadowW, 13, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const bob = kind === 'shrine_house' ? Math.sin(t * 2) * 1.5 : 0;
    const drewAsset = drawV99AssetImage(ctx, spec.asset, 0, 42 + bob, spec.width, spec.height);
    if (drewAsset) {
      if (kind === 'forge') {
        const glow = 0.35 + Math.sin(t * 5) * 0.10;
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#ff6b00';
        ctx.beginPath(); ctx.arc(-40, 16, 12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(-40, 16, 4.5, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (kind === 'shrine_house') {
        const pulse = 0.18 + Math.sin(t * 3) * 0.06;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, -26, 44, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -26, 30, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      drawHubNameplate(ctx, spec.label, spec.nameY, spec.color, spec.label.length > 7 ? 8 : 8.5);
      ctx.restore();
      return;
    }
  }

  // Fallback canvas buildings. These should only display if the PNG assets fail to load.
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(2, 38, 58, 12, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  if (kind === 'hall' || kind === 'crafting') {
    drawWoodCabin(ctx, '#2fa8cf', '#314a59', 'CRAFTING', '#73e4ff', { width: 88, height: 66, roofHeight: 34, doorY: 10 });
  }

  if (kind === 'forge') {
    drawWoodCabin(ctx, '#aa3d1e', '#302d29', 'FORGE', '#ff9a2e', { width: 84, height: 60, roofHeight: 34, doorY: 8 });
  }

  if (kind === 'market') {
    drawWoodCabin(ctx, '#c76126', '#5c4028', 'MARKET', '#ffd071', { width: 78, height: 50, roofHeight: 26, doorY: 6 });
  }

  if (kind === 'shrine_house') {
    drawWoodCabin(ctx, '#e6e6df', '#545a65', 'SHRINE', '#f1c40f', { width: 84, height: 58, roofHeight: 30, doorY: 7 });
  }

  if (kind === 'barracks') {
    drawWoodCabin(ctx, '#38a9df', '#34495e', 'BARRACKS', '#8ee6ff', { width: 84, height: 54, roofHeight: 28, doorY: 8 });
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
  }).current;

  const addFloat = (x, y, text, color = '#fff', big = false) => {
    G.floats.push({ x, y, text, color, life: big ? 1.5 : 1.1, vy: big ? -48 : -36, big });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    preloadV99WorldAssets();

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

    const strongholdTarget = getStrongholdBuildingNear(p.x, p.y);
    if (strongholdTarget) {
      addFloat(strongholdTarget.x, strongholdTarget.y - 42, `Entering ${strongholdTarget.label}...`, strongholdTarget.color, true);
      setTimeout(() => store.setGamePhase('stronghold'), 250);
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
        if (!drawV99Sprite(ctx, 'oreGlow', sx, sy, 1.05)) {
          drawRock(ctx, sx, sy, 1.05);
          ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(sx+4, sy-4, 4, 0, Math.PI*2); ctx.fill();
        }
      }
      if (r.type === 'fire_shard') {
        if (!drawV99Sprite(ctx, 'oreGlow', sx, sy, 1.0)) {
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔥', sx, sy + 6);
        }
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(sx + 7, sy - 7, 3, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
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

    // Stronghold building entry prompts. Each exterior is distinct, but this pass still opens the current Stronghold menu.
    for (const building of STRONGHOLD_BUILDINGS) {
      const sx = wx(building.x);
      const sy = wy(building.y);
      if (sx < -80 || sx > W + 80 || sy < -90 || sy > H + 90) continue;
      if (dist(G.player.x, G.player.y, building.x, building.y) < building.radius) {
        const spec = STRONGHOLD_BUILDING_ASSETS[building.kind];
        drawLabel(ctx, `[E] ${building.prompt}`, sx, sy + (spec?.promptY || 56), building.color);
      }
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
      const nearbyBuilding = getStrongholdBuildingNear(G.player.x, G.player.y, -14);
      if (!nearbyBuilding && dist(G.player.x, G.player.y, npc.x, npc.y) < 48) drawLabel(ctx, '[E] Talk', sx, sy - 43, npc.color);
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

    // V100 Stronghold Village Visual Rebuild: plaza, fences, props, and clearer districts.
    const fillWorldRect = (x1, y1, x2, y2, color, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(wx(x1*TILE), wy(y1*TILE), (x2-x1)*TILE, (y2-y1)*TILE);
      ctx.restore();
    };

    // Soft village plaza overlays on top of tile terrain.
    fillWorldRect(17.0, 39.0, 30.5, 53.4, '#6f5a40', 0.18);
    fillWorldRect(21.6, 39.0, 26.8, 53.6, '#b99566', 0.20);
    fillWorldRect(17.4, 44.0, 30.2, 48.4, '#b99566', 0.22);
    fillWorldRect(19.2, 49.0, 27.4, 52.6, '#a77f55', 0.18);

    // Cobblestone flecks / worn path detail.
    for (let ty=40; ty<=53; ty++) {
      for (let tx=17; tx<=30; tx++) {
        const h = tileHash(tx, ty);
        if (h < 0.52) continue;
        ctx.save();
        ctx.globalAlpha = 0.12 + (h * 0.08);
        ctx.fillStyle = h > 0.82 ? '#ead6b5' : '#493828';
        ctx.fillRect(wx(tx*TILE + 8 + (h*7)%9), wy(ty*TILE + 10 + (h*11)%11), 9 + (h*5)%10, 2);
        ctx.restore();
      }
    }

    // Fence line with clear road openings.
    const drawFenceSegment = (x1, y1, x2, y2) => {
      const sx = wx(x1*TILE), sy = wy(y1*TILE);
      const ex = wx(x2*TILE), ey = wy(y2*TILE);
      ctx.save();
      ctx.strokeStyle = '#422611';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#7b4d22';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy-1); ctx.lineTo(ex, ey-1); ctx.stroke();
      const steps = Math.max(1, Math.floor(dist(sx, sy, ex, ey) / 32));
      for (let i=0; i<=steps; i++) {
        const px = sx + (ex-sx) * (i/steps);
        const py = sy + (ey-sy) * (i/steps);
        ctx.fillStyle = '#2b1708';
        ctx.fillRect(px-2, py-10, 4, 18);
        ctx.fillStyle = '#8a5a2a';
        ctx.fillRect(px-1, py-10, 2, 16);
      }
      ctx.restore();
    };

    drawFenceSegment(17.2, 39.0, 21.0, 39.0);
    drawFenceSegment(27.8, 39.0, 30.4, 39.0);
    drawFenceSegment(17.2, 53.2, 19.0, 53.2);
    drawFenceSegment(27.5, 53.2, 30.4, 53.2);
    drawFenceSegment(17.2, 39.0, 17.2, 44.0);
    drawFenceSegment(17.2, 48.8, 17.2, 53.2);
    drawFenceSegment(30.4, 39.0, 30.4, 44.2);
    drawFenceSegment(30.4, 48.5, 30.4, 53.2);

    // Environmental dressing by district.
    drawV99AssetImage(ctx, 'v100StrongholdGarden', wx(18.0*TILE), wy(43.9*TILE), 72, 60, { anchorX: 0.5, anchorY: 1 });
    drawV99AssetImage(ctx, 'v100StrongholdCrates', wx(18.3*TILE), wy(48.2*TILE), 58, 24, { anchorX: 0.5, anchorY: 1 });
    drawV99Sprite(ctx, 'anvil', wx(29.4*TILE), wy(48.2*TILE), 0.60);
    drawV99Sprite(ctx, 'furnace', wx(29.0*TILE), wy(47.6*TILE), 0.52);
    drawV99AssetImage(ctx, 'v100StrongholdTraining', wx(22.2*TILE), wy(52.15*TILE), 24, 48, { anchorX: 0.5, anchorY: 1 });
    drawV99AssetImage(ctx, 'v100StrongholdFountain', wx(24.7*TILE), wy(47.0*TILE), 42, 54, { anchorX: 0.5, anchorY: 1 });

    // Signposts give identity without oversized labels on the buildings.
    drawSmallSignpost(ctx, wx(23.0*TILE), wy(43.6*TILE), 'CRAFT', '#73e4ff');
    drawSmallSignpost(ctx, wx(18.6*TILE), wy(47.7*TILE), 'SHOP', '#ffd071');
    drawSmallSignpost(ctx, wx(28.9*TILE), wy(48.1*TILE), 'FORGE', '#ff9a2e');
    drawSmallSignpost(ctx, wx(21.9*TILE), wy(52.0*TILE), 'TRAIN', '#8ee6ff');
    drawSmallSignpost(ctx, wx(26.9*TILE), wy(52.1*TILE), 'ASCEND', '#f1c40f');

    // Draw buildings in y-order so the village feels like a layered scene.
    [...STRONGHOLD_BUILDINGS]
      .sort((a, b) => a.y - b.y)
      .forEach((building) => {
        drawBuilding(ctx, wx(building.x), wy(building.y), building.kind, t);
      });

    // Realm shrines and landmarks.
    drawShrine(ctx, wx(25*TILE), wy(27*TILE), '#27ae60', 'SYLVARA', t);
    drawShrine(ctx, wx(42*TILE), wy(24*TILE), '#87ceeb', 'ZEPHYROS', t);
    drawShrine(ctx, wx(58*TILE), wy(36*TILE), '#95a5a6', 'TERRAN', t);
    drawShrine(ctx, wx(39*TILE), wy(74*TILE), '#e74c3c', 'IGNAR', t);

    // Ancient Ruins, first dungeon marker.
    const rx = wx(37*TILE), ry = wy(30*TILE);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(rx, ry + 18, 50, 12, 0, 0, Math.PI*2); ctx.fill();
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
    if (dist(G.player.x, G.player.y, 37*TILE, 30*TILE) < 64) drawLabel(ctx, '[E] Enter Dungeon', rx, ry + 40, '#d2b4de');

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
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.fillRect(sx, sy+hh-8, ww, 16);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#382310';
      ctx.lineWidth = 1;
      const isVertical = hh > ww;
      if (isVertical) {
        for (let py=0; py<hh; py+=16) { ctx.beginPath(); ctx.moveTo(sx, sy+py); ctx.lineTo(sx+ww, sy+py); ctx.stroke(); }
      } else {
         for (let px=0; px<ww; px+=16) { ctx.beginPath(); ctx.moveTo(sx+px, sy); ctx.lineTo(sx+px, sy+hh); ctx.stroke(); }
      }
      ctx.fillStyle = '#59391a';
      ctx.strokeStyle = '#2b1a0b';
      ctx.lineWidth = 2;
      if (isVertical) {
        ctx.fillRect(sx+2, sy-4, 6, hh+8); ctx.strokeRect(sx+2, sy-4, 6, hh+8);
        ctx.fillRect(sx+ww-8, sy-4, 6, hh+8); ctx.strokeRect(sx+ww-8, sy-4, 6, hh+8);
      } else {
        ctx.fillRect(sx-4, sy+2, ww+8, 6); ctx.strokeRect(sx-4, sy+2, ww+8, 6);
        ctx.fillRect(sx-4, sy+hh-8, ww+8, 6); ctx.strokeRect(sx-4, sy+hh-8, ww+8, 6);
      }
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

  ctx.globalAlpha = 0.3;
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
