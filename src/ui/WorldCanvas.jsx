// V116-WORLD-RENDER-RECOVERY-REV-001
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
_img('bld_barracks', 'assets/world/v108_stronghold/v108_barracks_clean.png');
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
// ── Player draw constants ────────────────────────────────────────────────────
// SINGLE source of truth — ALL animation states use these exact values.
// Changing PLAYER_DRAW_W / PLAYER_DRAW_H here changes every state at once.
const PLAYER_DRAW_W = 36;   // destination width  on screen (px)
const PLAYER_DRAW_H = 48;   // destination height on screen (px)

// Tight source crops — measured from actual PNG pixel data so the character
// art fills the destination box the same amount in every state.
// Idle (32×32 frame): char art at srcX=5, srcY=3, w=19, h=29
// Run  (64×64 frame): char art at srcX=21, srcY=35, w=24, h=29
// We crop to these tight bounds so both states look the same visual size.
const _P_IDLE_CROP = { srcX: 5,  srcY: 3,  srcW: 22, srcH: 29 }; // per 32×32 frame
const _P_RUN_CROP  = { srcX: 21, srcY: 35, srcW: 24, srcH: 29 }; // per 64×64 frame

function _drawTightFrame(ctx, key, frame, frameSize, crop, dx, dy, dW, dH, flipX) {
  const img = _SC[key];
  if (!img || !img.complete || img.naturalWidth === 0) return false;
  const sx = frame * frameSize + crop.srcX;
  const sy = crop.srcY;
  ctx.save();
  if (flipX) { ctx.scale(-1, 1); dx = -dx - dW; }
  ctx.drawImage(img, sx, sy, crop.srcW, crop.srcH, dx, dy, dW, dH);
  ctx.restore();
  return true;
}

function drawPlayerSprite(ctx, cx, cy, t, moving, dir) {
  const W = PLAYER_DRAW_W;
  const H = PLAYER_DRAW_H;
  const flipX = dir === 'side_left';
  // Bottom-center anchor: feet sit exactly at (cx, cy)
  const dx = cx - W * 0.5;
  const dy = cy - H;

  if (moving) {
    // Run: 384×64 → 6 frames @64×64, tight crop to char art
    const frame = Math.floor(t * 8) % 6;
    return _drawTightFrame(ctx, 'p_run_side', frame, 64, _P_RUN_CROP, dx, dy, W, H, flipX);
  } else {
    // Idle: 128×32 → 4 frames @32×32, tight crop to char art
    const frame = Math.floor(t * 4) % 4;
    return _drawTightFrame(ctx, 'p_idle_side', frame, 32, _P_IDLE_CROP, dx, dy, W, H, flipX);
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
// V107: anchor = bottom-center at (x, y) so image sits ON the ground.
// Clip matches the drawn rect exactly — no over/underclip that creates fragments.
function drawBuildingSprite(ctx, kind, x, y) {
  const img = _SC['bld_' + kind];
  if (!img || !img.complete || img.naturalWidth === 0) return false;

  // Target heights per building type (unchanged from V106)
  const H = kind === 'hall' ? 150 : kind === 'barracks' ? 130 : kind === 'shrine' ? 120 : 110;
  const rawW = H * (img.naturalWidth / img.naturalHeight);
  const W    = Math.min(rawW, 160);

  // Bottom-center anchor: image spans (x-W/2, y-H) → (x+W/2, y)
  // Clip matches exactly so no part is cut and no fragment leaks outside.
  const ix = x - W / 2;
  const iy = y - H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix - 2, iy - 2, W + 4, H + 4);
  ctx.clip();
  ctx.drawImage(img, ix, iy, W, H);
  ctx.restore();
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

// V110: Portals placed at ends of radial routes from village center (60,60)
const REALM_PORTALS = [
  { realm: 'forest', name: 'Sylvara Gate',  icon: '🌿', color: '#27ae60', skulls: 1, x:  60, y:  38 }, // N route
  { realm: 'wind',   name: 'Zephyros Gate', icon: '💨', color: '#87ceeb', skulls: 2, x:  78, y:  42 }, // NE route
  { realm: 'earth',  name: 'Terran Gate',   icon: '🪨', color: '#95a5a6', skulls: 2, x:  85, y:  60 }, // E route
  { realm: 'fire',   name: 'Ignar Gate',    icon: '🔥', color: '#e74c3c', skulls: 4, x:  75, y:  76 }, // SE route
  { realm: 'ocean',  name: 'Nepthar Gate',  icon: '🌊', color: '#1abc9c', skulls: 3, x:  60, y:  80 }, // S route
  { realm: 'shadow', name: 'Umbris Gate',   icon: '🌑', color: '#6c3483', skulls: 4, x:  42, y:  78 }, // SW route
  { realm: 'ice',    name: 'Glacius Gate',  icon: '❄️', color: '#3498db', skulls: 3, x:  35, y:  60 }, // W route
  { realm: 'storm',  name: 'Vortus Gate',   icon: '⚡', color: '#9b59b6', skulls: 3, x:  40, y:  45 }, // NW route
  { realm: 'lava',   name: 'Magmara Gate',  icon: '🌋', color: '#e67e22', skulls: 5, x:  84, y:  75 }, // SE far
  { realm: 'void',   name: 'Nihilus Gate',  icon: '✨', color: '#f1c40f', skulls: 5, x:  90, y:  85 }, // SE void
];

// V110: respawn points centered around village hub (60,60)
const RESPAWN_POINTS = {
  stronghold:   { x: 60*TILE, y: 62*TILE }, // village plaza
  cp_north:     { x: 60*TILE, y: 44*TILE }, // N route (past N river)
  cp_ne:        { x: 74*TILE, y: 46*TILE }, // NE wind route
  cp_east:      { x: 82*TILE, y: 60*TILE }, // E ruins approach
  cp_se:        { x: 72*TILE, y: 72*TILE }, // SE fire approach
  cp_south:     { x: 60*TILE, y: 76*TILE }, // S ocean approach
  cp_sw:        { x: 46*TILE, y: 74*TILE }, // SW shadow approach
  cp_west:      { x: 38*TILE, y: 60*TILE }, // W wildlands
  cp_nw:        { x: 44*TILE, y: 44*TILE }, // NW ice/storm
  cp_void:      { x: 88*TILE, y: 83*TILE }, // void approach
};

// V110: checkpoints at midpoints of each radial route
const CHECKPOINTS = [
  { id: 'cp_north', x: 60*TILE, y: 44*TILE },  // N forest route midpoint
  { id: 'cp_ne',    x: 74*TILE, y: 46*TILE },  // NE wind route
  { id: 'cp_east',  x: 82*TILE, y: 60*TILE },  // E ruins approach
  { id: 'cp_se',    x: 72*TILE, y: 72*TILE },  // SE fire route
  { id: 'cp_south', x: 60*TILE, y: 76*TILE },  // S ocean route
  { id: 'cp_sw',    x: 46*TILE, y: 74*TILE },  // SW shadow route
  { id: 'cp_west',  x: 38*TILE, y: 60*TILE },  // W wildlands
  { id: 'cp_nw',    x: 44*TILE, y: 44*TILE },  // NW ice/storm route
  { id: 'cp_void',  x: 88*TILE, y: 83*TILE },  // void approach
];

// V110: landmarks at route midpoints/destinations
const LANDMARKS = [
  { type: 'village',      x:  60, y:  62, label: 'STRONGHOLD VILLAGE' },
  { type: 'forest_shrine',x:  60, y:  38, label: 'SYLVARA SHRINE' },
  { type: 'wind_altar',   x:  78, y:  42, label: 'WIND ALTAR' },
  { type: 'ruins',        x:  85, y:  60, label: 'ANCIENT RUINS' },
  { type: 'fire_peak',    x:  75, y:  76, label: 'IGNAR PEAK' },
  { type: 'southern_lake',x:  60, y:  88, label: 'SOUTHERN OCEAN' },
  { type: 'shadow_grove', x:  42, y:  78, label: 'SHADOW GROVE' },
  { type: 'ice_mountain', x:  35, y:  60, label: 'GLACIUS PEAK' },
  { type: 'storm_ridge',  x:  40, y:  45, label: 'STORM RIDGE' },
  { type: 'void_gate',    x:  90, y:  85, label: 'VOID THRONE' },
];

// V110: resources placed along radial routes, on walkable ground
const RESOURCE_DEFS = [
  // N forest route — wood
  { type: 'tree', res: 'wood', amt: 2, x:  56*TILE, y:  44*TILE },
  { type: 'tree', res: 'wood', amt: 2, x:  64*TILE, y:  44*TILE },
  { type: 'tree', res: 'wood', amt: 2, x:  57*TILE, y:  38*TILE },
  { type: 'tree', res: 'wood', amt: 2, x:  63*TILE, y:  38*TILE },
  // NE wind route — rocks
  { type: 'rock', res: 'stone', amt: 2, x:  72*TILE, y:  46*TILE },
  { type: 'rock', res: 'stone', amt: 2, x:  76*TILE, y:  44*TILE },
  // E ruins route — stone/ore
  { type: 'rock',     res: 'stone', amt: 2, x:  78*TILE, y:  58*TILE },
  { type: 'ore_node', res: 'ore',   amt: 1, x:  82*TILE, y:  58*TILE },
  { type: 'ore_node', res: 'ore',   amt: 1, x:  84*TILE, y:  62*TILE },
  // SE fire route — ore/fire_shard
  { type: 'ore_node',  res: 'ore',        amt: 1, x:  72*TILE, y:  70*TILE },
  { type: 'fire_shard',res: 'fire_shard', amt: 1, x:  74*TILE, y:  74*TILE },
  { type: 'fire_shard',res: 'fire_shard', amt: 1, x:  78*TILE, y:  76*TILE },
  // W wildlands — wood/stone
  { type: 'tree', res: 'wood',  amt: 2, x:  44*TILE, y:  60*TILE },
  { type: 'tree', res: 'wood',  amt: 2, x:  42*TILE, y:  64*TILE },
  { type: 'rock', res: 'stone', amt: 2, x:  38*TILE, y:  58*TILE },
  // SW shadow route — ore
  { type: 'ore_node', res: 'ore', amt: 1, x:  48*TILE, y:  72*TILE },
  { type: 'ore_node', res: 'ore', amt: 2, x:  44*TILE, y:  76*TILE },
  // NW ice route — stone
  { type: 'rock', res: 'stone', amt: 2, x:  46*TILE, y:  48*TILE },
  { type: 'rock', res: 'stone', amt: 2, x:  42*TILE, y:  46*TILE },
];

// V110: enemies placed on radial routes, ring-scaled by distance from village (60,60)
// Ring 0 = safe zone (r<8 tiles) | Ring 1 (8-14) | Ring 2 (14-22) | Ring 3 (22-30) | Ring 4 (30-40) | Ring 5 (>40)
const ENEMY_DEFS = [
  // ── Ring 1: immediate outskirts (forest north approach) ──
  { type: 'goblin',         x:  58*TILE, y:  51*TILE }, // NW near bridge
  { type: 'goblin',         x:  62*TILE, y:  51*TILE }, // NE near bridge
  { type: 'goblin',         x:  55*TILE, y:  56*TILE }, // W village fringe
  { type: 'goblin',         x:  65*TILE, y:  56*TILE }, // E village fringe

  // ── Ring 2: N forest route (past river) ──
  { type: 'goblin',         x:  56*TILE, y:  44*TILE },
  { type: 'goblin',         x:  64*TILE, y:  44*TILE },
  { type: 'goblin',         x:  57*TILE, y:  40*TILE },
  { type: 'goblin',         x:  63*TILE, y:  40*TILE },

  // ── Ring 2: W wildlands ──
  { type: 'goblin',         x:  46*TILE, y:  58*TILE },
  { type: 'goblin',         x:  44*TILE, y:  62*TILE },
  { type: 'gold_goblin',    x:  40*TILE, y:  60*TILE }, // ring2 E end of W route

  // ── Ring 2: NE wind approach ──
  { type: 'golem',          x:  70*TILE, y:  52*TILE },
  { type: 'golem',          x:  72*TILE, y:  48*TILE },

  // ── Ring 3: NW ice/storm route ──
  { type: 'frost_wraith',   x:  46*TILE, y:  48*TILE },
  { type: 'frost_wraith',   x:  43*TILE, y:  46*TILE },
  { type: 'frost_wraith',   x:  40*TILE, y:  48*TILE },

  // ── Ring 3: S ocean route ──
  { type: 'goblin',         x:  58*TILE, y:  74*TILE },
  { type: 'goblin',         x:  62*TILE, y:  74*TILE },
  { type: 'golem',          x:  60*TILE, y:  77*TILE },

  // ── Ring 3: E ruins ──
  { type: 'stone_guardian', x:  80*TILE, y:  60*TILE },
  { type: 'golem',          x:  78*TILE, y:  57*TILE },
  { type: 'golem',          x:  78*TILE, y:  63*TILE },

  // ── Ring 4: SE fire/lava ──
  { type: 'fire_imp',       x:  70*TILE, y:  70*TILE },
  { type: 'fire_imp',       x:  72*TILE, y:  73*TILE },
  { type: 'fire_imp',       x:  74*TILE, y:  72*TILE },

  // ── Ring 4: SW shadow ──
  { type: 'shadow_wraith',  x:  46*TILE, y:  72*TILE },
  { type: 'shadow_wraith',  x:  44*TILE, y:  76*TILE },
  { type: 'shadow_wraith',  x:  42*TILE, y:  74*TILE },

  // ── Ring 5: Lava zone ──
  { type: 'lava_titan',     x:  82*TILE, y:  74*TILE },
  { type: 'fire_imp',       x:  86*TILE, y:  72*TILE },

  // ── Ring 5: Void approach ──
  { type: 'stone_guardian', x:  88*TILE, y:  82*TILE },
  { type: 'shadow_wraith',  x:  90*TILE, y:  80*TILE },
];

// V110: NPCs placed in centered village (60,60)
const NPCS = [
  { id:'keeper', x:60*TILE, y:63*TILE, color:'#1abc9c', name:'The Keeper',
    lines: [
      'Many have killed a god. None have survived all ten.',
      'North road leads to Sylvara. Eight more thrones lie further out.',
      'Roads exist for a reason — follow them. The further you travel, the stronger the enemy.',
    ] },
  { id:'smith', x:66*TILE, y:63*TILE, color:'#e67e22', name:'Aldric',
    lines: ['The Forge is east of the plaza. Bring ore. Better gear turns impossible fights into survivable ones.'] },
  { id:'merchant', x:54*TILE, y:63*TILE, color:'#9b59b6', name:'Mira',
    lines: ['The river north of town guards the forest routes. Cross it only when you are ready.'] },
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

// V110: Radial road network from village center (60,60)
function isRoad(tx, ty) {
  // ── Village internal path network ──
  // N-S plaza spine (entry bridge → plaza → shrine south)
  if (tx >= 58 && tx <= 62 && ty >= 50 && ty <= 72) return true;
  // Central plaza (wider zone)
  if (tx >= 56 && tx <= 64 && ty >= 59 && ty <= 65) return true;
  // Hall spur: plaza N → Crafting Hall door (60,56)
  if (tx >= 59 && tx <= 61 && ty >= 55 && ty <= 60) return true;
  // Market branch: plaza W → Market door (54,61)
  if (ty >= 60 && ty <= 62 && tx >= 54 && tx <= 59) return true;
  // Forge branch: plaza E → Forge door (66,61)
  if (ty >= 60 && ty <= 62 && tx >= 61 && tx <= 66) return true;
  // Barracks branch: west of market → Barracks (54,67)
  if (tx >= 53 && tx <= 55 && ty >= 61 && ty <= 67) return true;
  // Shrine branch: spine S → Shrine (60,68)
  if (tx >= 59 && tx <= 61 && ty >= 65 && ty <= 69) return true;

  // ── N route: plaza → north river → Sylvara Gate (60,38) ──
  if (tx >= 58 && tx <= 62 && ty >= 38 && ty <= 50) return true;   // N spine
  // River crossing handled by bridge (ty 46-49 bridged)

  // ── NE route: plaza → wind zone → Zephyros Gate (78,42) ──
  if (ty >= 58 && ty <= 62 && tx >= 62 && tx <= 72) return true;   // E departure
  if (tx >= 70 && tx <= 74 && ty >= 42 && ty <= 62) return true;   // NE vertical leg
  if (ty >= 42 && ty <= 46 && tx >= 70 && tx <= 80) return true;   // NE horizontal to gate

  // ── E route: plaza → ruins → Terran Gate (85,60) ──
  if (ty >= 58 && ty <= 62 && tx >= 64 && tx <= 86) return true;   // main E road

  // ── SE route: E road → fire → Ignar Gate (75,76) ──
  if (tx >= 72 && tx <= 76 && ty >= 58 && ty <= 78) return true;   // SE vertical

  // ── S route: plaza → south bridge → Nepthar Gate (60,80) ──
  if (tx >= 58 && tx <= 62 && ty >= 69 && ty <= 82) return true;   // S spine

  // ── SW route: S spine → shadow → Umbris Gate (42,78) ──
  if (ty >= 76 && ty <= 80 && tx >= 42 && tx <= 60) return true;   // SW horizontal

  // ── W route: plaza → west wildlands → Glacius Gate (35,60) ──
  if (ty >= 58 && ty <= 62 && tx >= 34 && tx <= 56) return true;   // W road

  // ── NW route: W road → storm ridge → Vortus Gate (40,45) ──
  if (tx >= 38 && tx <= 42 && ty >= 45 && ty <= 60) return true;   // NW vertical

  // ── Lava route: SE road junction → Magmara Gate (84,75) ──
  if (tx >= 82 && tx <= 86 && ty >= 60 && ty <= 76) return true;   // lava S spur

  // ── Void road: E road → Nihilus Gate (90,85) ──
  if (tx >= 86 && tx <= 92 && ty >= 60 && ty <= 86) return true;   // void descent

  return false;
}

// V110: bridges connect routes over actual water, each with clear purpose
function isBridge(tx, ty) {
  return (
    // 1. N route bridge: N road (tx=58-62) over N river (ty=47-48)
    inRect(tx, ty, 58, 46, 62, 49) ||
    // 2. W route bridge: W road (ty=58-62) over western river arm (tx=48-49)
    inRect(tx, ty, 47, 58, 50, 62) ||
    // 3. SW route bridge: SW road (ty=76-80) over western river arm (tx=48-49) southern exit
    inRect(tx, ty, 47, 76, 50, 80) ||
    // 4. S route bridge: S spine (tx=58-62) over southern lake approach (ty=83-87)
    inRect(tx, ty, 58, 83, 62, 87)
  );
}

// V110: water shapes the centered world — river N of village, southern ocean, ponds
function isWater(tx, ty) {
  if (isBridge(tx, ty)) return false;

  // North river: horizontal band ty=47-48, running from x=34 to x=86
  // Gaps: N road ford at tx=58-62 (bridge covers it instead)
  if (ty >= 47 && ty <= 48 && tx >= 34 && tx <= 86) return true;

  // Western river arm: vertical at tx=48-49, ty=52-82
  // This arm runs from the N river south toward the SW shadow route
  if (tx >= 48 && tx <= 49 && ty >= 52 && ty <= 82) return true;

  // Southern lake / ocean
  const dxL = tx - 60; const dyL = ty - 88;
  if ((dxL*dxL)/(10*10) + (dyL*dyL)/(7*7) <= 1) return true;

  // NW cold pond (near storm route)
  const dxNW = tx - 42; const dyNW = ty - 40;
  if ((dxNW*dxNW)/(5*5) + (dyNW*dyNW)/(4*4) <= 1) return true;

  // SE volcano lake (near fire/lava route)
  const dxSE = tx - 82; const dySE = ty - 80;
  if ((dxSE*dxSE)/(6*6) + (dySE*dySE)/(5*5) <= 1) return true;

  return false;
}

// V110: lava zone centered around SE fire route (75,76)
function isLava(tx, ty) {
  if (isBridge(tx, ty)) return false;
  // Lava pool near fire/lava gate (75,76)
  const dx = tx - 78; const dy = ty - 78;
  if ((dx*dx)/(8*8) + (dy*dy)/(6*6) <= 1) return true;
  // Scattered lava vents along SE route
  if (ty >= 72 && ty <= 82 && tx >= 72 && tx <= 85 && tileHash(tx, ty) > 0.82) return true;
  return false;
}

// V110: village floor centered at (60,60)
function isVillageFloor(tx, ty) {
  // Main plaza and surrounding district lots
  if (inRect(tx, ty, 56, 54, 64, 70)) return true;  // central N-S spine + plaza
  if (inRect(tx, ty, 50, 59, 56, 70)) return true;  // market/barracks west district
  if (inRect(tx, ty, 64, 59, 70, 70)) return true;  // forge east district
  return false;
}

// V110: obstacle clusters placed to frame routes without blocking them
function isObstacleCluster(tx, ty) {
  const clusters = [
    // N of river — forest flanking the N road
    { cx: 55, cy: 42, r: 2.5 },
    { cx: 65, cy: 42, r: 2.5 },
    { cx: 55, cy: 38, r: 2.0 },
    { cx: 65, cy: 38, r: 2.0 },
    // NW approach — rocky terrain near storm route
    { cx: 43, cy: 44, r: 2.2 },
    { cx: 37, cy: 58, r: 2.0 },
    // E ruins flanking
    { cx: 80, cy: 56, r: 2.0 },
    { cx: 80, cy: 64, r: 2.0 },
    // SE lava field rocks
    { cx: 76, cy: 70, r: 2.0 },
    // Void throne approach
    { cx: 90, cy: 82, r: 3.0 },
    // S ocean flanking
    { cx: 55, cy: 80, r: 2.0 },
    { cx: 65, cy: 80, r: 2.0 },
  ];

  for (const c of clusters) {
    const dx = tx - c.cx; const dy = ty - c.cy;
    if (dx*dx + dy*dy < (c.r * 0.65) * (c.r * 0.65)) return true;
  }
  return false;
}

// V110: Tight per-building collision for centered village buildings
// Village center (60,60). Building draw centers moved to new tile positions:
//   Hall (60,56) | Market (54,61) | Forge (66,61) | Barracks (54,67) | Shrine (60,68)
function isBuildingBlocked(tx, ty) {
  // ── Crafting Hall (draw center 60,56; body top ~53.4, bottom ~56) ──
  if (inRect(tx, ty, 58.6, 55.2, 61.4, 56.2)) return false; // hall door open
  if (inRect(tx, ty, 57.5, 53.8, 62.5, 56.0)) return true;  // hall body

  // ── Market (draw center 54,61; body top ~59.1, bottom ~61) ──
  if (inRect(tx, ty, 52.1, 59.4, 55.9, 61.0)) return true;  // market body

  // ── Forge (draw center 66,61; body top ~59.1, bottom ~61) ──
  if (inRect(tx, ty, 64.1, 59.4, 67.9, 61.0)) return true;  // forge body

  // ── Barracks (draw center 54,67; body top ~64.8, bottom ~67) ──
  if (inRect(tx, ty, 52.1, 65.2, 55.9, 66.8)) return true;  // barracks body

  // ── Shrine (draw center 60,68; body top ~65.9, bottom ~68) ──
  if (inRect(tx, ty, 58.2, 66.2, 61.8, 67.8)) return true;  // shrine body

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

// V108: walkability guard for spawn/placement validation
function isWalkableWorldPoint(worldX, worldY) {
  const tx = worldX / TILE;
  const ty = worldY / TILE;
  if (tx < 3 || tx > MAP_W - 3 || ty < 3 || ty > MAP_H - 3) return false;
  if (isWater(tx, ty)) return false;
  if (isLava(tx, ty)) return false;
  if (isBuildingBlocked(tx, ty)) return false;
  if (isObstacleCluster(tx, ty)) return false;
  return true;
}

// V110: biome-based tile coloring centered on village (60,60)
function tileColor(tx, ty) {
  const h = tileHash(tx, ty);
  const dxV = tx - 60; const dyV = ty - 60;
  const distV = Math.sqrt(dxV*dxV + dyV*dyV);

  if (tx < 2 || tx >= MAP_W-2 || ty < 2 || ty >= MAP_H-2) return '#175d8c';
  if (isWater(tx, ty)) return h > 0.6 ? '#207ca3' : h > 0.3 ? '#1c6f94' : '#186284';
  if (isLava(tx, ty)) return h > 0.7 ? '#c0392b' : h > 0.4 ? '#a93226' : '#8e271f';
  if (isBridge(tx, ty)) return h > 0.5 ? '#7a5a35' : '#6a4c2c';
  if (isRoad(tx, ty)) return h > 0.7 ? '#a68560' : h > 0.3 ? '#997a57' : '#8c6e4e';
  if (isVillageFloor(tx, ty)) return h > 0.6 ? '#826e54' : h > 0.2 ? '#78644c' : '#6e5a43';

  // ── Biome regions keyed to centered village ──
  // N region: forest (north of river, ty < 47)
  if (ty < 47 && tx >= 52 && tx <= 68) return h > 0.7 ? '#308c46' : h > 0.3 ? '#2c8040' : '#277439';
  // NW region: ice/storm tundra
  if (tx < 52 && ty < 56) return h > 0.7 ? '#7a9aab' : h > 0.3 ? '#6a8898' : '#5a7886';
  // NE region: wind highlands
  if (tx > 68 && ty < 56) return h > 0.6 ? '#8b9aab' : '#778696';
  // E region: ancient ruins (stone)
  if (tx >= 68 && ty >= 56 && ty <= 65) return h > 0.6 ? '#5c574f' : '#4d4841';
  // SE region: fire/lava terrain
  if (tx > 68 && ty > 65) return h > 0.6 ? '#5c3a2a' : '#4a2f20';
  // S region: tropical/ocean shore
  if (ty > 68 && tx >= 52 && tx <= 68) return h > 0.6 ? '#226848' : '#1d5a3e';
  // SW region: shadow/dark forest
  if (tx < 52 && ty > 65) return h > 0.6 ? '#281c36' : '#1e1529';
  // W region: green wildlands
  if (tx < 52 && ty >= 56 && ty <= 65) return h > 0.7 ? '#308c46' : h > 0.3 ? '#2c8040' : '#277439';

  // Default: mid-range grass
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
  // V108: per-building pad dimensions matched to actual sprite widths
  // hall PNG: 159px → drawn ~150px; forge/market: ~110px; barracks PNG: 128px → drawn ~120px; shrine: 100px
  const padDefs = {
    hall:     { padW: 154, doorW: 28, doorH: 12 },
    forge:    { padW: 114, doorW: 20, doorH: 10 },
    market:   { padW: 114, doorW: 24, doorH: 10 },
    barracks: { padW: 120, doorW: 24, doorH: 10 },
    shrine:   { padW: 96,  doorW: 18, doorH: 10 },
  };
  const { padW, doorW, doorH } = padDefs[kind] || padDefs.forge;
  const padH = 8;

  // Contact shadow under pad (drawn first, behind everything)
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x + 2, y + 5, padW * 0.46, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  // Foundation stone pad — sits at the building's base line
  ctx.fillStyle = '#7a6c57';
  ctx.beginPath(); ctx.roundRect(x - padW/2, y - padH, padW, padH, 2); ctx.fill();
  ctx.fillStyle = '#5c4f3a';
  ctx.beginPath(); ctx.roundRect(x - padW/2, y - padH, padW, 2, 0); ctx.fill(); // top edge dark line
  ctx.strokeStyle = '#4a3c2e'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x - padW/2, y - padH, padW, padH, 2); ctx.stroke();

  // Doorstep: small raised stone step at door center bottom
  ctx.fillStyle = '#8a7860';
  ctx.beginPath(); ctx.roundRect(x - doorW/2, y, doorW, doorH, 2); ctx.fill();
  ctx.strokeStyle = '#4a3c2e'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x - doorW/2, y, doorW, doorH, 2); ctx.stroke();
  // Path connection: thin strip leading south from doorstep
  ctx.fillStyle = '#997a57';
  ctx.fillRect(x - doorW*0.3, y + doorH, doorW*0.6, TILE * 0.8);

  // Try PNG sprite first — draws label on top regardless
  const spriteDrawn = drawBuildingSprite(ctx, kind, x, y);
  if (spriteDrawn) {
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
    player: { x: 60*TILE, y: 62*TILE, attackCooldown: 0, invincible: false, invTimer: 0 },
    camera: { x: 60*TILE, y: 62*TILE },
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

  // Building interaction zones — each maps to a distinct menu view
  const BUILDING_ZONES = [
    { kind: 'hall',     x: 60*TILE, y: 56*TILE, r: 72,  label: 'Crafting Hall' }, // V110
    { kind: 'forge',    x: 66*TILE, y: 61*TILE, r: 68,  label: 'Forge'         }, // V110
    { kind: 'market',   x: 54*TILE, y: 61*TILE, r: 68,  label: 'Market'        }, // V110
    { kind: 'barracks', x: 54*TILE, y: 67*TILE, r: 68,  label: 'Barracks'      }, // V110
    { kind: 'shrine',   x: 25*TILE, y: 58*TILE, r: 72,  label: 'Shrine'        },
  ];

  function handleInteract(store) {
    const p = G.player;

    // ── 1. Resources (highest priority — no menu involved) ────────────────
    for (const r of G.resources) {
      if (r.depleted || dist(p.x, p.y, r.x, r.y) > 52) continue;
      store.addResource(r.res, r.amt);
      addFloat(r.x, r.y - 24, `+${r.amt} ${r.res}`, '#7ed321');
      hapticCollect(); sfxCollect();
      r.depleted = true;
      r.respawnAt = Date.now() + 180_000;
      return;
    }

    // ── 2. Checkpoints ────────────────────────────────────────────────────
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

    // ── 3. Sword pickup ───────────────────────────────────────────────────
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

    // ── 4. NPCs — PRIORITY over buildings (fixes Keeper bug) ──────────────
    for (const npc of G.villageNPCs) {
      if (dist(p.x, p.y, npc.x, npc.y) > 56) continue;
      const line = npc.lines[npc.hintIdx % npc.lines.length];
      npc.hintIdx += 1;
      G.npcMessage = { text: line, speaker: npc.name, speakerColor: npc.color, timer: 5.5 };
      return;
    }

    // ── 5. Buildings — each routes to its own menu view ───────────────────
    for (const bz of BUILDING_ZONES) {
      if (dist(p.x, p.y, bz.x, bz.y) > bz.r) continue;
      addFloat(p.x, p.y - 40, `Entering ${bz.label}...`, '#d4af37');
      store.setStrongholdBuilding(bz.kind);
      store.setGamePhase('stronghold');
      return;
    }

    // ── 6. Dungeon ────────────────────────────────────────────────────────
    if (dist(p.x, p.y, 37*TILE, 30*TILE) <= 64) {
      addFloat(p.x, p.y - 40, 'Entering Ancient Ruins...', '#cc88ff');
      setTimeout(() => store.setGamePhase('dungeon'), 400);
      return;
    }

    // ── 7. Realm portals ──────────────────────────────────────────────────
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

    // V108: store centerOffsetY so render lifts effect to torso/weapon area
    G.attackEffect = { x: p.x, y: p.y, centerOffsetY: PLAYER_DRAW_H * 0.55, timer: 0.22, hit: hitCount > 0 };
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

    G.attackEffect = { x: p.x, y: p.y, centerOffsetY: PLAYER_DRAW_H * 0.55, timer: 0.38, ability: true, hit: hitCount > 0 };
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
      // V108: skip resources that landed in water/lava/blocked terrain
      if (!isWalkableWorldPoint(r.x, r.y)) continue;
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

    // Building E-prompts — shown above door area of each building
    {
      const p = G.player;
      const BZONE_LABELS = [
        { kind:'hall',     x:60*TILE, y:56*TILE, r:72,  label:'[E] Crafting Hall', color:'#d4af37' },
        { kind:'forge',    x:66*TILE, y:61*TILE, r:68,  label:'[E] Forge',         color:'#e67e22' },
        { kind:'market',   x:54*TILE, y:61*TILE, r:68,  label:'[E] Market',        color:'#3498db' },
        { kind:'barracks', x:54*TILE, y:67*TILE, r:68,  label:'[E] Barracks',      color:'#27ae60' },
        { kind:'shrine',   x:25*TILE, y:58*TILE, r:72,  label:'[E] Shrine',        color:'#9b59b6' },
      ];
      // Only show prompt if no NPC is closer than 56 (NPC takes priority)
      const nearNPC = G.villageNPCs.some(n => dist(p.x, p.y, n.x, n.y) < 56);
      if (!nearNPC) {
        for (const bz of BZONE_LABELS) {
          if (dist(p.x, p.y, bz.x, bz.y) > bz.r) continue;
          const bsx = wx(bz.x), bsy = wy(bz.y) - 60;
          drawLabel(ctx, bz.label, bsx, bsy, bz.color);
          break; // only show nearest
        }
      }
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
      // V108: lift origin to center mass / weapon hand (not feet)
      const sy = wy(G.attackEffect.y) - (G.attackEffect.centerOffsetY || 0);
      const pct = G.attackEffect.timer / (G.attackEffect.ability ? 0.38 : 0.22);
      const alpha = Math.max(0, pct);
      ctx.save();
      ctx.globalAlpha = alpha;

      if (G.attackEffect.ability) {
        // ── Whirlwind ability: radial blade burst ──────────────────────────
        const r = 72 + (1 - pct) * 24;   // expands outward
        const blades = 6;
        for (let i = 0; i < blades; i++) {
          const angle = (i / blades) * Math.PI * 2 + (1 - pct) * Math.PI;
          const bx = sx + Math.cos(angle) * r * 0.55;
          const by = sy + Math.sin(angle) * r * 0.55;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(angle + Math.PI / 4);
          ctx.strokeStyle = '#d4af37';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(0, 14);
          ctx.stroke();
          ctx.restore();
        }
        // outer glow ring (subtle, not full opaque)
        ctx.strokeStyle = 'rgba(212,175,55,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // ── Normal attack: sword-swing arc ────────────────────────────────
        // Direction based on player facing
        const dir = G.playerDir || 'side_right';
        const baseAngle =
          dir === 'up'         ? -Math.PI / 2 :
          dir === 'down'       ?  Math.PI / 2 :
          dir === 'side_left'  ?  Math.PI      : 0;

        // Swing arc: starts wide, sweeps 110° 
        const swingProgress = 1 - pct;            // 0→1 over attack duration
        const arcSpan = Math.PI * 0.65;            // 117° sweep
        const startAngle = baseAngle - arcSpan / 2;
        const endAngle   = startAngle + arcSpan * Math.min(1, swingProgress * 1.6);

        const r = 42;  // sword reach (px)

        // Blade trail (faded arc)
        ctx.strokeStyle = G.attackEffect.hit ? '#e8d060' : '#c8c8e0';
        ctx.lineWidth = 6;
        ctx.lineCap  = 'round';
        ctx.globalAlpha = alpha * 0.45;
        ctx.beginPath();
        ctx.arc(sx, sy, r - 4, startAngle, endAngle);
        ctx.stroke();

        // Main sword line
        ctx.globalAlpha = alpha;
        const tipX = sx + Math.cos(endAngle) * r;
        const tipY = sy + Math.sin(endAngle) * r;
        ctx.strokeStyle = '#dce8f0';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(endAngle) * 10, sy + Math.sin(endAngle) * 10);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Tip flash on hit
        if (G.attackEffect.hit && pct > 0.5) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(tipX, tipY, 4 * pct, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
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

  // === V108 GRASS EDGE OVERLAYS ===
  // Grass patches frame the village boundary — outer fence edge → dirt field transition
  // Uses tileColor green variants to paint soft grass edges without PNG dependency
  {
    const grassColor1 = '#2a7e3a';
    const grassColor2 = '#238033';
    const grassColor3 = '#1d6a2b';

    // Helper: draw a tufty grass cluster at a tile position
    function grassTuft(ctx, gx, gy, seed) {
      const bx = wx(gx * TILE) + TILE / 2;
      const by = wy(gy * TILE) + TILE / 2;
      const h = tileHash(gx + seed, gy + seed);
      const col = h > 0.6 ? grassColor1 : h > 0.3 ? grassColor2 : grassColor3;
      ctx.fillStyle = col;
      // 3 short vertical blades
      ctx.globalAlpha = 0.85;
      [[-4, 0], [0, -2], [4, 1]].forEach(([dx, dy]) => {
        ctx.fillRect(bx + dx, by + dy - 9, 2, 9 + dy);
      });
      ctx.globalAlpha = 1;
    }

    // V110: Grass edge overlays framing centered village (60,60) and route exits
    // North outer edge — above village (ty=53-54), below N river bridge
    for (let gx = 52; gx <= 68; gx++) {
      if (gx >= 57 && gx <= 63) continue; // skip N road gap
      if (isWater(gx, 53) || isRoad(gx, 53)) continue;
      grassTuft(ctx, gx, 53, 1);
    }
    // South outer edge — below shrine (ty=70-71)
    for (let gx = 52; gx <= 68; gx++) {
      if (gx >= 57 && gx <= 63) continue;
      if (isWater(gx, 71) || isRoad(gx, 71)) continue;
      grassTuft(ctx, gx, 71, 3);
    }
    // West outer edge
    for (let gy = 55; gy <= 70; gy++) {
      if (gy >= 59 && gy <= 63) continue; // market/W road gap
      if (isWater(51, gy) || isRoad(51, gy)) continue;
      grassTuft(ctx, 51, gy, 5);
      grassTuft(ctx, 52, gy, 7);
    }
    // East outer edge
    for (let gy = 55; gy <= 70; gy++) {
      if (gy >= 59 && gy <= 63) continue; // forge/E road gap
      if (isWater(69, gy) || isRoad(69, gy)) continue;
      grassTuft(ctx, 69, gy, 9);
    }

    // Inner corner grass patches — soften transitions
    [[52,55],[52,56],[53,54],[52,69],[52,70],[53,70]].forEach(([gx,gy]) => {
      if (isVillageFloor(gx,gy) || isRoad(gx,gy) || isWater(gx,gy)) return;
      grassTuft(ctx, gx, gy, 11);
    });
    [[69,55],[69,56],[68,54],[69,69],[69,70],[68,70]].forEach(([gx,gy]) => {
      if (isVillageFloor(gx,gy) || isRoad(gx,gy) || isWater(gx,gy)) return;
      grassTuft(ctx, gx, gy, 13);
    });

    // Route-edge grass tufts along main outbound roads
    // N route grass fringe (ty=44-50, flanking tx=57-63)
    for (let gy=44; gy<=50; gy++) {
      if (isWater(55,gy) || isRoad(55,gy)) continue;
      grassTuft(ctx, 55, gy, 17);
      if (!isWater(65,gy) && !isRoad(65,gy)) grassTuft(ctx, 65, gy, 19);
    }
  }

  // === BUILDINGS ===
  // Crafting Hall — central north of plaza
  drawBuilding(ctx, wx(60*TILE), wy(56*TILE), 'hall', t); // V110

  // Forge — east district (forge fire glow effect)
  drawBuilding(ctx, wx(66*TILE), wy(61*TILE), 'forge', t); // V110
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
  drawBuilding(ctx, wx(54*TILE), wy(61*TILE), 'market', t); // V110
  // Market stall tables
  {
    const mx = wx(54*TILE), my = wy(60*TILE) // V110: market interior;
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
  drawBuilding(ctx, wx(54*TILE), wy(67*TILE), 'barracks', t); // V110
  // Training yard: wooden dummies + fence
  {
    const bx = wx(58*TILE), by = wy(66*TILE); // V110: moved to match barracks
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
  drawShrine(ctx, wx(60*TILE), wy(68*TILE), '#d4af37', 'SHRINE', t); // V110
  // V110: Sacred path stone markers (shrine at 60,68 — spine 59-61, ty 65-68)
  for (let sty=65; sty<=68; sty++) {
    const sx2 = wx(58*TILE), sy2 = wy(sty*TILE);
    ctx.fillStyle = '#888070';
    ctx.fillRect(sx2-4, sy2+TILE/2-2, 6, 4);
    const sx3 = wx(62*TILE);
    ctx.fillRect(sx3-2, sy2+TILE/2-2, 6, 4);
  }

  // V110: Shrine rune glow on ground
  {
    const rx = wx(60*TILE), ry = wy(69*TILE);
    const glowR = 0.3 + Math.sin(t*1.5)*0.12;
    ctx.globalAlpha = glowR;
    const rg = ctx.createRadialGradient(rx, ry, 4, rx, ry, 48);
    rg.addColorStop(0, '#d4af37');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(rx, ry, 48, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // === V110 BRIDGES — matching isBridge() purposeful placements ===
  const bridges = [
    [58, 46, 62, 49],  // 1. N route: N road over N river
    [47, 58, 50, 62],  // 2. W route: W road over western river arm
    [47, 76, 50, 80],  // 3. SW route: SW road over western river arm (south)
    [58, 83, 62, 87],  // 4. S route: S spine over southern lake approach
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
