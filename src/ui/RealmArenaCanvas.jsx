import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { InputState }   from '../game/systems/InputState';
import { AbilityConfig } from '../game/config/AbilityConfig';
import { hapticAttack, hapticHit, hapticBossDeath, hapticLevelUp } from '../utils/haptics';
import { sfxAttack, sfxHit, sfxBossDeath, sfxLevelUp, resumeAudio } from '../utils/sfx';

const TILE    = 32;
const ARENA_W = 30;
const ARENA_H = 30;
const WW      = ARENA_W * TILE;
const WH      = ARENA_H * TILE;

// ── Simple hash for tile variation (deterministic noise) ────────────────────
function tileHash(tx, ty) {
  let h = (tx * 2654435761 ^ ty * 2246822519) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

// ── Realm configs ────────────────────────────────────────────────────────────
const REALM_CFG = {
  forest: {
    terrain:'#1e5e28', terrainAlt:'#174d20', terrainAlt2:'#236b2e',
    border:'#0a2a0d', accent:'#27ae60', skyColor:'#0d1f0f',
    treePositions:[[4,4],[25,4],[4,25],[25,25],[8,8],[20,8],[8,20],[20,20],[12,3],[17,3],[3,12],[26,12]],
    floorDetail:'forest',
    waves:[
      [{type:'thornling',x:8*TILE,y:5*TILE},{type:'thornling',x:13*TILE,y:4*TILE},
       {type:'thornling',x:18*TILE,y:5*TILE},{type:'thornling',x:22*TILE,y:4*TILE}],
      [{type:'thornling',x:6*TILE,y:6*TILE},{type:'thornling',x:23*TILE,y:6*TILE},
       {type:'forest_wraith',x:10*TILE,y:4*TILE},{type:'forest_wraith',x:15*TILE,y:3*TILE},
       {type:'forest_wraith',x:20*TILE,y:4*TILE}],
    ],
    boss:{name:'Sylvara',hp:900,atk:18,color:'#2ecc71',size:28,x:15*TILE,y:5*TILE,
          icon:'🌿',chargeInterval:4.5,chargeTelegraph:0.9,chargeSpeed:420,chargeDist:280},
    reward:{label:'Nature Essence',icon:'🌿',color:'#27ae60',key:'natureEssence'},
  },
  earth:{
    terrain:'#4a3828', terrainAlt:'#3d2e1f', terrainAlt2:'#554030',
    border:'#2a1e10', accent:'#95a5a6', skyColor:'#1a1008',
    treePositions:[[3,3],[26,3],[3,26],[26,26],[6,6],[23,6],[6,23],[23,23]],
    floorDetail:'earth',
    waves:[
      [{type:'stone_golem',x:7*TILE,y:5*TILE},{type:'stone_golem',x:22*TILE,y:5*TILE},
       {type:'thornling',x:14*TILE,y:4*TILE},{type:'thornling',x:10*TILE,y:6*TILE}],
      [{type:'stone_golem',x:5*TILE,y:4*TILE},{type:'stone_golem',x:24*TILE,y:4*TILE},
       {type:'stone_golem',x:14*TILE,y:3*TILE},{type:'forest_wraith',x:9*TILE,y:5*TILE},
       {type:'forest_wraith',x:19*TILE,y:5*TILE}],
      [{type:'stone_golem',x:6*TILE,y:3*TILE},{type:'stone_golem',x:22*TILE,y:3*TILE},
       {type:'stone_golem',x:14*TILE,y:4*TILE},{type:'stone_golem',x:10*TILE,y:6*TILE},
       {type:'stone_golem',x:18*TILE,y:6*TILE}],
    ],
    boss:{name:'Terran',hp:1800,atk:38,color:'#95a5a6',size:34,x:15*TILE,y:5*TILE,
          icon:'🪨',chargeInterval:4,chargeTelegraph:1.0,chargeSpeed:680,chargeDist:260},
    reward:{label:'Earth Shard',icon:'🪨',color:'#95a5a6',key:'earthShard'},
  },
  wind:{
    terrain:'#1a3a4a', terrainAlt:'#14303e', terrainAlt2:'#1f4455',
    border:'#0a1a28', accent:'#87ceeb', skyColor:'#080e14',
    treePositions:[],
    floorDetail:'wind',
    waves:[
      [{type:'wind_sprite',x:8*TILE,y:4*TILE},{type:'wind_sprite',x:14*TILE,y:3*TILE},
       {type:'wind_sprite',x:20*TILE,y:4*TILE},{type:'wind_sprite',x:24*TILE,y:5*TILE}],
      [{type:'wind_sprite',x:6*TILE,y:5*TILE},{type:'wind_sprite',x:22*TILE,y:5*TILE},
       {type:'forest_wraith',x:10*TILE,y:3*TILE},{type:'forest_wraith',x:18*TILE,y:3*TILE},
       {type:'wind_sprite',x:14*TILE,y:4*TILE}],
    ],
    boss:{name:'Zephyros',hp:1100,atk:22,color:'#87ceeb',size:28,x:15*TILE,y:5*TILE,
          icon:'💨',chargeInterval:3.0,chargeTelegraph:0.7,chargeSpeed:640,chargeDist:320},
    reward:{label:'Wind Essence',icon:'💨',color:'#87ceeb',key:'windEssence'},
  },
  fire:{
    terrain:'#3a1810', terrainAlt:'#2e1008', terrainAlt2:'#461e12',
    border:'#1a0808', accent:'#e74c3c', skyColor:'#0f0504',
    treePositions:[],
    floorDetail:'fire',
    waves:[
      [{type:'ember_imp',x:7*TILE,y:4*TILE},{type:'ember_imp',x:14*TILE,y:3*TILE},
       {type:'ember_imp',x:21*TILE,y:4*TILE},{type:'ember_imp',x:10*TILE,y:5*TILE}],
      [{type:'ember_imp',x:5*TILE,y:5*TILE},{type:'ember_imp',x:23*TILE,y:5*TILE},
       {type:'ember_imp',x:11*TILE,y:4*TILE},{type:'ember_imp',x:18*TILE,y:4*TILE},
       {type:'lava_crawler',x:14*TILE,y:3*TILE}],
      [{type:'lava_crawler',x:6*TILE,y:4*TILE},{type:'lava_crawler',x:22*TILE,y:4*TILE},
       {type:'ember_imp',x:10*TILE,y:5*TILE},{type:'ember_imp',x:18*TILE,y:5*TILE},
       {type:'lava_crawler',x:14*TILE,y:3*TILE}],
    ],
    boss:{name:'Ignar',hp:2400,atk:48,color:'#e74c3c',size:30,x:15*TILE,y:5*TILE,
          icon:'🔥',chargeInterval:1.4,chargeTelegraph:0.8,chargeSpeed:600,chargeDist:300},
    reward:{label:'Fire Ember',icon:'🔥',color:'#e74c3c',key:'fireEmber'},
  },
  ice:{
    terrain:'#1a2a40', terrainAlt:'#14223a', terrainAlt2:'#1f3248',
    border:'#0a1428', accent:'#3498db', skyColor:'#06080f',
    treePositions:[],
    floorDetail:'ice',
    waves:[
      [{type:'frost_shard',x:7*TILE,y:4*TILE},{type:'frost_shard',x:14*TILE,y:3*TILE},
       {type:'frost_shard',x:21*TILE,y:4*TILE},{type:'frost_shard',x:10*TILE,y:5*TILE}],
      [{type:'frost_shard',x:5*TILE,y:5*TILE},{type:'frost_shard',x:23*TILE,y:5*TILE},
       {type:'ice_witch',x:12*TILE,y:3*TILE},{type:'ice_witch',x:18*TILE,y:3*TILE}],
      [{type:'frost_shard',x:6*TILE,y:4*TILE},{type:'frost_shard',x:22*TILE,y:4*TILE},
       {type:'ice_witch',x:10*TILE,y:3*TILE},{type:'ice_witch',x:18*TILE,y:3*TILE},
       {type:'frost_shard',x:14*TILE,y:5*TILE}],
    ],
    boss:{name:'Glacius',hp:3200,atk:58,color:'#85c1e9',size:32,x:15*TILE,y:5*TILE,
          icon:'❄️',chargeInterval:2.8,chargeTelegraph:1.0,chargeSpeed:460,chargeDist:300},
    reward:{label:'Glacial Shard',icon:'❄️',color:'#85c1e9',key:'glacialShard'},
  },
  ocean:{
    terrain:'#0e3a30', terrainAlt:'#0a2e26', terrainAlt2:'#114438',
    border:'#06181a', accent:'#1abc9c', skyColor:'#040d0e',
    treePositions:[],
    floorDetail:'ocean',
    waves:[
      [{type:'sea_sprite',x:7*TILE,y:4*TILE},{type:'sea_sprite',x:14*TILE,y:3*TILE},
       {type:'sea_sprite',x:21*TILE,y:4*TILE},{type:'sea_sprite',x:10*TILE,y:5*TILE}],
      [{type:'sea_sprite',x:5*TILE,y:5*TILE},{type:'sea_sprite',x:23*TILE,y:5*TILE},
       {type:'forest_wraith',x:12*TILE,y:3*TILE},{type:'forest_wraith',x:18*TILE,y:3*TILE},
       {type:'sea_sprite',x:15*TILE,y:4*TILE}],
      [{type:'sea_sprite',x:4*TILE,y:4*TILE},{type:'sea_sprite',x:24*TILE,y:4*TILE},
       {type:'sea_sprite',x:9*TILE,y:3*TILE},{type:'sea_sprite',x:19*TILE,y:3*TILE},
       {type:'forest_wraith',x:14*TILE,y:3*TILE},{type:'forest_wraith',x:11*TILE,y:5*TILE}],
    ],
    boss:{name:'Nepthar',hp:4000,atk:68,color:'#1abc9c',size:30,x:15*TILE,y:5*TILE,
          icon:'🌊',chargeInterval:3,chargeTelegraph:0.9,chargeSpeed:560,chargeDist:290},
    reward:{label:'Sea Crystal',icon:'🌊',color:'#1abc9c',key:'seaCrystal'},
  },
  storm:{
    terrain:'#18103a', terrainAlt:'#120c2e', terrainAlt2:'#1e1444',
    border:'#0a0820', accent:'#9b59b6', skyColor:'#06050f',
    treePositions:[],
    floorDetail:'storm',
    waves:[
      [{type:'storm_wisp',x:7*TILE,y:4*TILE},{type:'storm_wisp',x:14*TILE,y:3*TILE},
       {type:'storm_wisp',x:21*TILE,y:4*TILE},{type:'storm_wisp',x:10*TILE,y:5*TILE}],
      [{type:'storm_wisp',x:5*TILE,y:5*TILE},{type:'storm_wisp',x:23*TILE,y:5*TILE},
       {type:'storm_wisp',x:12*TILE,y:3*TILE},{type:'forest_wraith',x:16*TILE,y:3*TILE},
       {type:'storm_wisp',x:19*TILE,y:4*TILE}],
      [{type:'storm_wisp',x:6*TILE,y:4*TILE},{type:'storm_wisp',x:22*TILE,y:4*TILE},
       {type:'forest_wraith',x:10*TILE,y:3*TILE},{type:'forest_wraith',x:18*TILE,y:3*TILE},
       {type:'storm_wisp',x:14*TILE,y:5*TILE},{type:'storm_wisp',x:11*TILE,y:4*TILE}],
    ],
    boss:{name:'Vortus',hp:5200,atk:82,color:'#9b59b6',size:32,x:15*TILE,y:5*TILE,
          icon:'⚡',chargeInterval:2,chargeTelegraph:0.6,chargeSpeed:840,chargeDist:340},
    reward:{label:'Storm Core',icon:'⚡',color:'#9b59b6',key:'stormCore'},
  },
  shadow:{
    terrain:'#10101e', terrainAlt:'#0c0c18', terrainAlt2:'#141422',
    border:'#060610', accent:'#6c3483', skyColor:'#040408',
    treePositions:[],
    floorDetail:'shadow',
    waves:[
      [{type:'shade',x:7*TILE,y:4*TILE},{type:'shade',x:14*TILE,y:3*TILE},
       {type:'shade',x:21*TILE,y:4*TILE},{type:'shade',x:10*TILE,y:5*TILE}],
      [{type:'shade',x:5*TILE,y:5*TILE},{type:'shade',x:23*TILE,y:5*TILE},
       {type:'shadow_stalker',x:12*TILE,y:3*TILE},{type:'shadow_stalker',x:18*TILE,y:3*TILE}],
      [{type:'shade',x:6*TILE,y:4*TILE},{type:'shade',x:22*TILE,y:4*TILE},
       {type:'shadow_stalker',x:9*TILE,y:3*TILE},{type:'shadow_stalker',x:19*TILE,y:3*TILE},
       {type:'shade',x:14*TILE,y:5*TILE},{type:'shade',x:11*TILE,y:4*TILE}],
    ],
    boss:{name:'Umbris',hp:6800,atk:98,color:'#8e44ad',size:34,x:15*TILE,y:5*TILE,
          icon:'🌑',chargeInterval:1.6,chargeTelegraph:0.7,chargeSpeed:580,chargeDist:310},
    reward:{label:'Shadow Veil',icon:'🌑',color:'#8e44ad',key:'shadowVeil'},
  },
  lava:{
    terrain:'#2a1008', terrainAlt:'#220c04', terrainAlt2:'#32140a',
    border:'#120604', accent:'#e67e22', skyColor:'#0a0402',
    treePositions:[],
    floorDetail:'lava',
    waves:[
      [{type:'lava_crawler',x:7*TILE,y:4*TILE},{type:'lava_crawler',x:14*TILE,y:3*TILE},
       {type:'lava_crawler',x:21*TILE,y:4*TILE},{type:'ember_imp',x:10*TILE,y:5*TILE},
       {type:'ember_imp',x:18*TILE,y:5*TILE}],
      [{type:'lava_crawler',x:5*TILE,y:4*TILE},{type:'lava_crawler',x:23*TILE,y:4*TILE},
       {type:'lava_crawler',x:14*TILE,y:3*TILE},{type:'ember_imp',x:9*TILE,y:5*TILE},
       {type:'ember_imp',x:19*TILE,y:5*TILE},{type:'lava_crawler',x:11*TILE,y:4*TILE}],
      [{type:'lava_crawler',x:6*TILE,y:3*TILE},{type:'lava_crawler',x:22*TILE,y:3*TILE},
       {type:'lava_crawler',x:12*TILE,y:4*TILE},{type:'lava_crawler',x:18*TILE,y:4*TILE},
       {type:'ember_imp',x:8*TILE,y:5*TILE},{type:'ember_imp',x:20*TILE,y:5*TILE},
       {type:'lava_crawler',x:15*TILE,y:3*TILE}],
    ],
    boss:{name:'Magmara',hp:9000,atk:118,color:'#e67e22',size:36,x:15*TILE,y:5*TILE,
          icon:'🌋',chargeInterval:3,chargeTelegraph:1.0,chargeSpeed:520,chargeDist:280},
    reward:{label:'Lava Core',icon:'🌋',color:'#e67e22',key:'lavaCore'},
  },
  void:{
    terrain:'#080808', terrainAlt:'#060606', terrainAlt2:'#0a0a0c',
    border:'#020202', accent:'#f1c40f', skyColor:'#030303',
    treePositions:[],
    floorDetail:'void',
    waves:[
      [{type:'void_wraith',x:7*TILE,y:4*TILE},{type:'void_wraith',x:14*TILE,y:3*TILE},
       {type:'void_wraith',x:21*TILE,y:4*TILE},{type:'shade',x:10*TILE,y:5*TILE},
       {type:'shade',x:18*TILE,y:5*TILE}],
      [{type:'void_wraith',x:5*TILE,y:4*TILE},{type:'void_wraith',x:23*TILE,y:4*TILE},
       {type:'void_wraith',x:12*TILE,y:3*TILE},{type:'shadow_stalker',x:16*TILE,y:3*TILE},
       {type:'shade',x:8*TILE,y:5*TILE},{type:'shade',x:20*TILE,y:5*TILE}],
      [{type:'void_wraith',x:6*TILE,y:3*TILE},{type:'void_wraith',x:22*TILE,y:3*TILE},
       {type:'void_wraith',x:10*TILE,y:4*TILE},{type:'void_wraith',x:18*TILE,y:4*TILE},
       {type:'shadow_stalker',x:8*TILE,y:5*TILE},{type:'shadow_stalker',x:20*TILE,y:5*TILE},
       {type:'shade',x:14*TILE,y:6*TILE}],
    ],
    boss:{name:'Nihilus',hp:14000,atk:145,color:'#f1c40f',size:38,x:15*TILE,y:5*TILE,
          icon:'✨',chargeInterval:2,chargeTelegraph:0.5,chargeSpeed:760,chargeDist:360},
    reward:{label:'Void Fragment',icon:'✨',color:'#f1c40f',key:'voidFragment'},
  },
};

// ── Enemy stats for all types ────────────────────────────────────────────────
const ENEMY_STATS = {
  thornling:      {hp:30, atk:4,  def:0, speed:145, aggroRange:440, attackRange:38,  attackCooldown:1.1, color:'#7ed321', size:12, xp:8 },
  forest_wraith:  {hp:50, atk:6,  def:1, speed:72,  aggroRange:520, attackRange:240, attackCooldown:2.4, color:'#1abc9c', size:16, xp:14, ranged:true, projColor:'#2ecc71'},
  stone_golem:    {hp:120,atk:14, def:4, speed:80,  aggroRange:380, attackRange:48,  attackCooldown:1.8, color:'#95a5a6', size:18, xp:22},
  wind_sprite:    {hp:35, atk:7,  def:0, speed:200, aggroRange:480, attackRange:200, attackCooldown:1.8, color:'#87ceeb', size:12, xp:12, ranged:true, projColor:'#87ceeb'},
  ember_imp:      {hp:45, atk:10, def:0, speed:165, aggroRange:420, attackRange:180, attackCooldown:1.6, color:'#e74c3c', size:13, xp:16, ranged:true, projColor:'#e67e22'},
  lava_crawler:   {hp:90, atk:18, def:3, speed:95,  aggroRange:360, attackRange:50,  attackCooldown:1.4, color:'#e67e22', size:17, xp:24},
  frost_shard:    {hp:40, atk:8,  def:1, speed:130, aggroRange:400, attackRange:44,  attackCooldown:1.2, color:'#85c1e9', size:13, xp:14},
  ice_witch:      {hp:65, atk:12, def:1, speed:70,  aggroRange:500, attackRange:260, attackCooldown:2.2, color:'#3498db', size:15, xp:20, ranged:true, projColor:'#85c1e9'},
  sea_sprite:     {hp:38, atk:8,  def:0, speed:155, aggroRange:440, attackRange:200, attackCooldown:2.0, color:'#1abc9c', size:12, xp:13, ranged:true, projColor:'#1abc9c'},
  storm_wisp:     {hp:42, atk:9,  def:0, speed:220, aggroRange:500, attackRange:220, attackCooldown:1.5, color:'#9b59b6', size:12, xp:15, ranged:true, projColor:'#9b59b6'},
  shade:          {hp:55, atk:11, def:2, speed:140, aggroRange:460, attackRange:42,  attackCooldown:1.0, color:'#6c3483', size:14, xp:18},
  shadow_stalker: {hp:80, atk:16, def:2, speed:110, aggroRange:480, attackRange:220, attackCooldown:2.0, color:'#8e44ad', size:16, xp:22, ranged:true, projColor:'#8e44ad'},
  void_wraith:    {hp:70, atk:14, def:1, speed:130, aggroRange:500, attackRange:240, attackCooldown:1.8, color:'#f1c40f', size:15, xp:20, ranged:true, projColor:'#f1c40f'},
};

function dist(ax,ay,bx,by){ return Math.sqrt((ax-bx)**2+(ay-by)**2); }
function clp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// ── Per-realm floor detail renderer ─────────────────────────────────────────
function drawFloorDetail(ctx, cfg, wx, wy, camX, camY, W, H, t) {
  const det = cfg.floorDetail;
  const txS = Math.max(0, Math.floor((camX - W/2) / TILE));
  const txE = Math.min(ARENA_W, Math.ceil((camX + W/2) / TILE) + 1);
  const tyS = Math.max(0, Math.floor((camY - H/2) / TILE));
  const tyE = Math.min(ARENA_H, Math.ceil((camY + H/2) / TILE) + 1);

  for (let ty = tyS; ty < tyE; ty++) {
    for (let tx = txS; tx < txE; tx++) {
      const h = tileHash(tx, ty);
      const sx = wx(tx * TILE + 16);
      const sy = wy(ty * TILE + 16);
      const isBorder = tx <= 0 || tx >= ARENA_W-1 || ty <= 0 || ty >= ARENA_H-1;
      if (isBorder) continue;
      // Check tree positions
      let isTree = false;
      for (const [ttx, tty] of (cfg.treePositions || [])) {
        if (Math.abs(tx - ttx) <= 1 && Math.abs(ty - tty) <= 1) { isTree = true; break; }
      }
      if (isTree) continue;

      if (det === 'forest') {
        // Grass tufts
        if (h < 0.18) {
          ctx.strokeStyle = h < 0.09 ? '#2ecc71' : '#27ae60';
          ctx.lineWidth = 1.5; ctx.globalAlpha = 0.55;
          const bx = wx(tx * TILE + (h * 28 | 0));
          const by = wy(ty * TILE + (tileHash(tx+1,ty) * 28 | 0));
          ctx.beginPath(); ctx.moveTo(bx - 3, by + 4); ctx.lineTo(bx, by - 5); ctx.lineTo(bx + 3, by + 4); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // Flower dots
        if (h > 0.92) {
          ctx.globalAlpha = 0.6; ctx.fillStyle = h > 0.96 ? '#f1c40f' : '#ffffff';
          ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        // Root lines near border trees
        if (h > 0.78 && h < 0.82) {
          ctx.strokeStyle = '#0a2a0d'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3;
          ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx + 6, sy + 4); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (det === 'earth') {
        // Cracked earth lines
        if (h < 0.12) {
          ctx.strokeStyle = '#2a1e10'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.moveTo(sx - 8, sy - 2); ctx.lineTo(sx + 5, sy + 3);
          ctx.moveTo(sx + 4, sy + 2); ctx.lineTo(sx + 10, sy - 4);
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        // Rock pebbles
        if (h > 0.86) {
          ctx.globalAlpha = 0.5; ctx.fillStyle = '#6b5a45';
          ctx.beginPath(); ctx.ellipse(sx, sy, 4, 3, h*Math.PI, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (det === 'fire') {
        // Lava crack glow
        if (h < 0.10) {
          const glow = 0.3 + Math.sin(t * 2.5 + h * 10) * 0.15;
          ctx.globalAlpha = glow; ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(sx - 7, sy); ctx.lineTo(sx + 7, sy + 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // Ember sparks
        if (h > 0.93) {
          const spark = 0.4 + Math.sin(t * 4 + h * 20) * 0.3;
          ctx.globalAlpha = spark; ctx.fillStyle = h > 0.97 ? '#f1c40f' : '#e67e22';
          ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (det === 'ice') {
        // Frost crystal lines
        if (h < 0.14) {
          ctx.globalAlpha = 0.35; ctx.strokeStyle = '#85c1e9'; ctx.lineWidth = 1;
          const ang = h * Math.PI * 3;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(ang) * 6, sy + Math.sin(ang) * 6);
          ctx.lineTo(sx - Math.cos(ang) * 6, sy - Math.sin(ang) * 6);
          ctx.moveTo(sx + Math.cos(ang + 1.05) * 4, sy + Math.sin(ang + 1.05) * 4);
          ctx.lineTo(sx - Math.cos(ang + 1.05) * 4, sy - Math.sin(ang + 1.05) * 4);
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        // Snow sparkle
        if (h > 0.90) {
          ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (det === 'ocean') {
        // Wave ripples
        if (h < 0.15) {
          const wave = 0.25 + Math.sin(t * 1.5 + h * 8) * 0.12;
          ctx.globalAlpha = wave; ctx.strokeStyle = '#1abc9c'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // Bubble dots
        if (h > 0.91) {
          ctx.globalAlpha = 0.4; ctx.strokeStyle = '#1abc9c'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI*2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (det === 'storm') {
        // Lightning scar lines
        if (h < 0.08) {
          ctx.globalAlpha = 0.4; ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(sx - 5, sy - 6); ctx.lineTo(sx + 2, sy); ctx.lineTo(sx - 2, sy + 6); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // Electric sparks
        if (h > 0.94) {
          const spark = 0.4 + Math.sin(t * 8 + h * 30) * 0.35;
          ctx.globalAlpha = spark; ctx.fillStyle = '#f1c40f';
          ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (det === 'shadow') {
        // Dark rune circles
        if (h < 0.06) {
          ctx.globalAlpha = 0.3; ctx.strokeStyle = '#6c3483'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // Void wisps
        if (h > 0.93) {
          const wisp = 0.2 + Math.sin(t * 2 + h * 15) * 0.15;
          ctx.globalAlpha = wisp; ctx.fillStyle = '#8e44ad';
          ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (det === 'lava') {
        // Lava pools
        if (h < 0.07) {
          const pulse = 0.4 + Math.sin(t * 1.8 + h * 12) * 0.2;
          ctx.globalAlpha = pulse; ctx.fillStyle = '#e67e22';
          ctx.beginPath(); ctx.ellipse(sx, sy, 7, 5, h * Math.PI, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        // Ash patches
        if (h > 0.87) {
          ctx.globalAlpha = 0.3; ctx.fillStyle = '#333';
          ctx.beginPath(); ctx.ellipse(sx, sy, 5, 4, h * Math.PI, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (det === 'wind') {
        // Wind streak lines
        if (h < 0.12) {
          const drift = Math.sin(t * 1.2 + h * 6) * 3;
          ctx.globalAlpha = 0.2; ctx.strokeStyle = '#87ceeb'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx - 10 + drift, sy); ctx.lineTo(sx + 10 + drift, sy - 1); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (det === 'void') {
        // Star field
        if (h > 0.90) {
          const twinkle = 0.4 + Math.sin(t * 3 + h * 25) * 0.35;
          ctx.globalAlpha = twinkle; ctx.fillStyle = h > 0.96 ? '#f1c40f' : '#ffffff';
          ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        // Void cracks
        if (h < 0.04) {
          ctx.globalAlpha = 0.25; ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx - 6, sy - 3); ctx.lineTo(sx + 6, sy + 3); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
  }
}

// ── Arena tile color (with variation) ────────────────────────────────────────
function arenaTile(tx, ty, cfg) {
  if (tx <= 0 || tx >= ARENA_W-1 || ty <= 0 || ty >= ARENA_H-1) return cfg.border;
  for (const [ttx, tty] of (cfg.treePositions || [])) {
    if (Math.abs(tx - ttx) <= 1 && Math.abs(ty - tty) <= 1) return cfg.border;
  }
  const h = tileHash(tx, ty);
  if (h < 0.15) return cfg.terrainAlt || cfg.terrain;
  if (h > 0.85) return cfg.terrainAlt2 || cfg.terrain;
  return cfg.terrain;
}

// ── Tree / pillar art per realm ────────────────────────────────────────────
function drawArenaTree(ctx, sx, sy, cfg) {
  const det = cfg.floorDetail;
  ctx.save();
  if (det === 'forest' || det === 'wind') {
    // Trunk
    ctx.fillStyle = '#5c3a1e'; ctx.fillRect(sx - 5, sy + 4, 10, 16);
    // Canopy layers
    ctx.fillStyle = '#1a5e20';
    ctx.beginPath(); ctx.arc(sx, sy - 2, 17, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1e7026';
    ctx.beginPath(); ctx.arc(sx - 4, sy - 6, 11, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 5, sy - 5, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#25892e';
    ctx.beginPath(); ctx.arc(sx, sy - 10, 9, 0, Math.PI*2); ctx.fill();
  } else if (det === 'earth') {
    // Stone pillar
    ctx.fillStyle = '#6b5a45';
    ctx.fillRect(sx - 8, sy - 20, 16, 36);
    ctx.fillStyle = '#8a7260';
    ctx.fillRect(sx - 10, sy - 24, 20, 8);
    ctx.fillRect(sx - 10, sy + 10, 20, 6);
    // Cracks
    ctx.strokeStyle = '#3d2e1f'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx - 2, sy - 16); ctx.lineTo(sx + 3, sy + 4); ctx.stroke();
  } else if (det === 'ice') {
    // Ice spire
    ctx.fillStyle = '#85c1e9';
    ctx.beginPath(); ctx.moveTo(sx, sy - 28); ctx.lineTo(sx - 8, sy + 8); ctx.lineTo(sx + 8, sy + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#aed6f1';
    ctx.beginPath(); ctx.moveTo(sx, sy - 18); ctx.lineTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx - 4, sy - 10); ctx.lineTo(sx + 4, sy); ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (det === 'shadow' || det === 'void') {
    // Dark obelisk
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(sx - 6, sy - 28, 12, 40);
    ctx.fillStyle = '#2d1b4e';
    ctx.fillRect(sx - 8, sy + 10, 16, 4);
    ctx.fillRect(sx - 8, sy - 30, 16, 6);
    // Glow runes
    ctx.globalAlpha = 0.5; ctx.fillStyle = det === 'void' ? '#f1c40f' : '#8e44ad';
    ctx.beginPath(); ctx.arc(sx, sy - 10, 3, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (det === 'lava' || det === 'fire') {
    // Scorched pillar
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(sx - 6, sy - 22, 12, 36);
    ctx.fillStyle = '#2d1200';
    ctx.fillRect(sx - 8, sy - 26, 16, 7);
    ctx.fillRect(sx - 8, sy + 8, 16, 5);
    // Ember glow
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#e67e22';
    ctx.beginPath(); ctx.arc(sx, sy - 18, 3, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (det === 'storm') {
    // Cracked stone with lightning
    ctx.fillStyle = '#18103a';
    ctx.fillRect(sx - 7, sy - 24, 14, 38);
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(sx - 9, sy - 28, 18, 6);
    ctx.globalAlpha = 0.6; ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx, sy - 22); ctx.lineTo(sx + 4, sy - 10); ctx.lineTo(sx - 2, sy); ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (det === 'ocean') {
    // Coral pillar
    ctx.fillStyle = '#0e5a46';
    ctx.fillRect(sx - 5, sy - 16, 10, 28);
    ctx.fillStyle = '#1abc9c';
    ctx.beginPath(); ctx.arc(sx, sy - 18, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx - 6, sy - 12, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 6, sy - 12, 5, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ── Enemy body art ───────────────────────────────────────────────────────────
function drawEnemySprite(ctx, e, ex, ey) {
  ctx.save();
  const s = e.size;
  // Shadow
  ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(ex, ey + s + 2, s * 0.9, s * 0.35, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  const type = e.type || 'thornling';
  if (type === 'thornling') {
    // Round green goblin-like body
    ctx.fillStyle = '#5a9e20'; ctx.beginPath(); ctx.arc(ex, ey, s, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#7ed321'; ctx.beginPath(); ctx.arc(ex, ey - s * 0.2, s * 0.7, 0, Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.1, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.1, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.1, s*0.12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.1, s*0.12, 0, Math.PI*2); ctx.fill();
    // Spike ears
    ctx.fillStyle = '#5a9e20';
    ctx.beginPath(); ctx.moveTo(ex - s*0.7, ey - s*0.5); ctx.lineTo(ex - s*1.0, ey - s*1.0); ctx.lineTo(ex - s*0.3, ey - s*0.7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ex + s*0.7, ey - s*0.5); ctx.lineTo(ex + s*1.0, ey - s*1.0); ctx.lineTo(ex + s*0.3, ey - s*0.7); ctx.closePath(); ctx.fill();
  } else if (type === 'forest_wraith' || type === 'sea_sprite' || type === 'wind_sprite' || type === 'storm_wisp') {
    // Wispy ghost form
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(ex, ey, s, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex - s*0.2, ey - s*0.3, s * 0.5, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Glowing eyes
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.1, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.1, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.1, s*0.14, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.1, s*0.14, 0, Math.PI*2); ctx.fill();
    // Wispy tail
    ctx.globalAlpha = 0.3; ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(ex, ey + s * 0.8, s * 0.5, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (type === 'stone_golem') {
    // Blocky square body
    ctx.fillStyle = '#7f8c8d'; ctx.fillRect(ex - s, ey - s, s*2, s*2);
    ctx.fillStyle = '#95a5a6'; ctx.fillRect(ex - s*0.7, ey - s*0.8, s*1.4, s*0.8);
    // Cracks
    ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ex - s*0.2, ey - s*0.6); ctx.lineTo(ex + s*0.4, ey); ctx.stroke();
    // Glowing eyes
    ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(ex - s*0.35, ey - s*0.35, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.35, ey - s*0.35, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  } else if (type === 'ember_imp' || type === 'lava_crawler') {
    ctx.fillStyle = type === 'lava_crawler' ? '#c0392b' : '#e74c3c';
    ctx.beginPath(); ctx.arc(ex, ey, s, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(ex, ey - s*0.2, s*0.65, 0, Math.PI*2); ctx.fill();
    // Flame eyes
    ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.15, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.15, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.15, s*0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.15, s*0.1, 0, Math.PI*2); ctx.fill();
    if (type === 'ember_imp') {
      // Horns
      ctx.fillStyle = '#922b21';
      ctx.beginPath(); ctx.moveTo(ex - s*0.5, ey - s*0.7); ctx.lineTo(ex - s*0.8, ey - s*1.2); ctx.lineTo(ex - s*0.2, ey - s*0.8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ex + s*0.5, ey - s*0.7); ctx.lineTo(ex + s*0.8, ey - s*1.2); ctx.lineTo(ex + s*0.2, ey - s*0.8); ctx.closePath(); ctx.fill();
    }
  } else if (type === 'frost_shard' || type === 'ice_witch') {
    ctx.fillStyle = type === 'ice_witch' ? '#2980b9' : '#85c1e9';
    ctx.beginPath(); ctx.arc(ex, ey, s, 0, Math.PI*2); ctx.fill();
    // Ice crystal overlay
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a) * s, ey + Math.sin(a) * s); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.15, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.15, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.15, s*0.12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.15, s*0.12, 0, Math.PI*2); ctx.fill();
  } else if (type === 'shade' || type === 'shadow_stalker' || type === 'void_wraith') {
    // Dark smoke form
    ctx.globalAlpha = 0.8; ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(ex, ey, s, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey + s*0.2, s*0.6, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Glowing eyes
    ctx.fillStyle = type === 'void_wraith' ? '#f1c40f' : '#8e44ad';
    ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.1, s*0.28, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.1, s*0.28, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(ex - s*0.3, ey - s*0.1, s*0.12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s*0.3, ey - s*0.1, s*0.12, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Fallback circle
    ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(ex, ey, s, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}

// ── Boss sprite art ─────────────────────────────────────────────────────────
function drawBossSprite(ctx, b, bx, by, phase, t) {
  ctx.save();
  const s = b.size;
  const pulse = 0.5 + Math.sin(t * 2.5) * 0.3;
  const p2 = phase === 2;

  // Ground shadow
  ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(bx, by + s + 5, s * 1.2, s * 0.38, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  // Outer glow
  ctx.globalAlpha = pulse * 0.3; ctx.fillStyle = b.color;
  ctx.beginPath(); ctx.arc(bx, by, s + 20, 0, Math.PI*2); ctx.fill();
  if (p2) {
    ctx.globalAlpha = pulse * 0.2; ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(bx, by, s + 36, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const bossName = b.name;

  // ── SYLVARA (forest) — thorny vine crown, leaf wings ──────────────────────
  if (bossName === 'Sylvara') {
    // Body — dark green oval
    ctx.fillStyle = '#145a32';
    ctx.beginPath(); ctx.ellipse(bx, by + 4, s * 0.7, s * 0.9, 0, 0, Math.PI*2); ctx.fill();
    // Leaf wings
    for (let side = -1; side <= 1; side += 2) {
      ctx.fillStyle = side < 0 ? '#1e8449' : '#27ae60';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(bx + side * s * 1.8, by - s * 1.2, bx + side * s * 2.2, by + s * 0.4, bx + side * s * 0.8, by + s * 0.6);
      ctx.closePath(); ctx.fill();
      // Leaf vein
      ctx.strokeStyle = '#145a32'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(bx + side * s * 0.3, by + s * 0.2);
      ctx.lineTo(bx + side * s * 1.4, by - s * 0.5);
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // Head
    ctx.fillStyle = '#1a6b35';
    ctx.beginPath(); ctx.arc(bx, by - s * 0.6, s * 0.55, 0, Math.PI*2); ctx.fill();
    // Thorn crown
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + (i / 6) * Math.PI + Math.sin(t * 1.5 + i) * 0.08;
      ctx.fillStyle = i % 2 === 0 ? '#27ae60' : '#a9dfbf';
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * s * 0.52, by - s * 0.6 + Math.sin(a) * s * 0.52);
      ctx.lineTo(bx + Math.cos(a) * s * 0.9, by - s * 0.6 + Math.sin(a) * s * 0.9);
      ctx.lineTo(bx + Math.cos(a + 0.18) * s * 0.6, by - s * 0.6 + Math.sin(a + 0.18) * s * 0.6);
      ctx.closePath(); ctx.fill();
    }
    // Eyes
    ctx.fillStyle = '#a9dfbf';
    ctx.beginPath(); ctx.arc(bx - s*0.2, by - s*0.65, s*0.14, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.2, by - s*0.65, s*0.14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(bx - s*0.2, by - s*0.65, s*0.07, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.2, by - s*0.65, s*0.07, 0, Math.PI*2); ctx.fill();

  // ── TERRAN (earth) — stacked rock blocks, glowing cracks ──────────────────
  } else if (bossName === 'Terran') {
    // Legs/base blocks
    ctx.fillStyle = '#717d7e';
    ctx.fillRect(bx - s*0.65, by + s*0.3, s*0.55, s*0.7);
    ctx.fillRect(bx + s*0.1, by + s*0.3, s*0.55, s*0.7);
    // Torso block
    ctx.fillStyle = '#808b96';
    ctx.fillRect(bx - s*0.8, by - s*0.3, s*1.6, s*0.7);
    // Arm blocks
    ctx.fillStyle = '#6b6f72';
    ctx.fillRect(bx - s*1.4, by - s*0.25, s*0.55, s*0.55);
    ctx.fillRect(bx + s*0.85, by - s*0.25, s*0.55, s*0.55);
    // Head block
    ctx.fillStyle = '#909497';
    ctx.fillRect(bx - s*0.6, by - s*1.05, s*1.2, s*0.85);
    // Cracks — animated orange glow
    const crackGlow = p2 ? 0.9 : (0.5 + Math.sin(t*2)*0.3);
    ctx.globalAlpha = crackGlow; ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx - s*0.3, by - s*0.95); ctx.lineTo(bx + s*0.1, by - s*0.4); ctx.lineTo(bx - s*0.2, by + s*0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + s*0.3, by - s*0.2); ctx.lineTo(bx + s*0.6, by + s*0.2); ctx.stroke();
    ctx.globalAlpha = 1;
    // Eyes
    ctx.fillStyle = '#e67e22';
    ctx.beginPath(); ctx.arc(bx - s*0.25, by - s*0.72, s*0.17, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.25, by - s*0.72, s*0.17, 0, Math.PI*2); ctx.fill();
    // Block outlines
    ctx.strokeStyle = '#4d5656'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx - s*0.8, by - s*0.3, s*1.6, s*0.7);
    ctx.strokeRect(bx - s*0.6, by - s*1.05, s*1.2, s*0.85);

  // ── ZEPHYROS (wind) — swirling rings, translucent wispy form ──────────────
  } else if (bossName === 'Zephyros') {
    // Rotating wind rings
    for (let ring = 0; ring < 4; ring++) {
      const ra = t * (1.5 + ring * 0.4) + (ring * Math.PI / 2);
      const rr = s * (0.5 + ring * 0.3);
      ctx.globalAlpha = 0.25 - ring * 0.04;
      ctx.strokeStyle = '#87ceeb'; ctx.lineWidth = 3 - ring * 0.5;
      ctx.beginPath(); ctx.arc(bx, by, rr, ra, ra + Math.PI * 1.6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Core translucent body
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#87ceeb';
    ctx.beginPath(); ctx.ellipse(bx, by, s * 0.55, s * 0.8, Math.sin(t * 0.8) * 0.2, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(bx - s*0.15, by - s*0.2, s*0.3, s*0.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Head
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#aed6f1';
    ctx.beginPath(); ctx.arc(bx, by - s*0.65, s * 0.42, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Eyes — hollow
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx - s*0.17, by - s*0.7, s*0.12, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx + s*0.17, by - s*0.7, s*0.12, 0, Math.PI*2); ctx.stroke();
    // Trailing wind wisps
    for (let w = 0; w < 5; w++) {
      const wa = (t * 2.2 + w * 1.26) % (Math.PI * 2);
      const wr = s * (0.9 + w * 0.18);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#87ceeb';
      ctx.beginPath(); ctx.arc(bx + Math.cos(wa) * wr, by + Math.sin(wa) * wr * 0.5, 5, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

  // ── IGNAR (fire) — flame-horned demon skull, lava drips ───────────────────
  } else if (bossName === 'Ignar') {
    // Body
    ctx.fillStyle = '#922b21';
    ctx.beginPath(); ctx.ellipse(bx, by + s*0.1, s*0.7, s*0.85, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.ellipse(bx, by, s*0.55, s*0.65, 0, 0, Math.PI*2); ctx.fill();
    // Flame horns — animated flicker
    for (let side = -1; side <= 1; side += 2) {
      const flicker = Math.sin(t * 6 + side * 2) * 0.12;
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(bx + side * s*0.35, by - s*0.5);
      ctx.lineTo(bx + side * s*0.7, by - s*(1.3 + flicker));
      ctx.lineTo(bx + side * s*0.55, by - s*0.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.moveTo(bx + side * s*0.42, by - s*0.5);
      ctx.lineTo(bx + side * s*0.65, by - s*(1.0 + flicker * 0.7));
      ctx.lineTo(bx + side * s*0.52, by - s*0.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(bx + side * s*0.48, by - s*0.5);
      ctx.lineTo(bx + side * s*0.6, by - s*(0.8 + flicker * 0.5));
      ctx.lineTo(bx + side * s*0.54, by - s*0.5);
      ctx.closePath(); ctx.fill();
    }
    // Head
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(bx, by - s*0.55, s*0.5, 0, Math.PI*2); ctx.fill();
    // Glowing eyes
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.arc(bx - s*0.2, by - s*0.6, s*0.16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.2, by - s*0.6, s*0.16, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(bx - s*0.2, by - s*0.6, s*0.07, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.2, by - s*0.6, s*0.07, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Lava drips
    for (let d = 0; d < 3; d++) {
      const dy = ((t * 40 + d * 30) % (s * 1.5));
      ctx.fillStyle = '#e67e22'; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(bx + (d-1)*s*0.3, by + s*0.2 + dy, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

  // ── GLACIUS (ice) — spire crown, crystal arms ─────────────────────────────
  } else if (bossName === 'Glacius') {
    // Body — ice blue
    ctx.fillStyle = '#1a5276';
    ctx.beginPath(); ctx.ellipse(bx, by + s*0.1, s*0.65, s*0.85, 0, 0, Math.PI*2); ctx.fill();
    // Crystal arm spires
    for (let side = -1; side <= 1; side += 2) {
      ctx.fillStyle = '#5dade2';
      ctx.beginPath();
      ctx.moveTo(bx + side * s*0.65, by + s*0.1);
      ctx.lineTo(bx + side * s*1.6, by - s*0.5);
      ctx.lineTo(bx + side * s*1.4, by + s*0.5);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.4; ctx.fillStyle = '#aed6f1';
      ctx.beginPath();
      ctx.moveTo(bx + side * s*0.8, by);
      ctx.lineTo(bx + side * s*1.4, by - s*0.3);
      ctx.lineTo(bx + side * s*1.2, by + s*0.2);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Head
    ctx.fillStyle = '#2e86c1';
    ctx.beginPath(); ctx.arc(bx, by - s*0.6, s*0.5, 0, Math.PI*2); ctx.fill();
    // Ice spire crown
    for (let i = 0; i < 5; i++) {
      const ca = -Math.PI * 0.85 + (i / 4) * Math.PI * 0.7;
      ctx.fillStyle = i % 2 === 0 ? '#85c1e9' : '#aed6f1';
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(ca) * s*0.48, by - s*0.6 + Math.sin(ca) * s*0.48);
      ctx.lineTo(bx + Math.cos(ca) * s*(0.85 + i*0.06), by - s*0.6 + Math.sin(ca) * s*(0.85 + i*0.06));
      ctx.lineTo(bx + Math.cos(ca + 0.2) * s*0.55, by - s*0.6 + Math.sin(ca + 0.2) * s*0.55);
      ctx.closePath(); ctx.fill();
    }
    // Eyes — cold blue
    ctx.fillStyle = '#d6eaf8';
    ctx.beginPath(); ctx.arc(bx - s*0.2, by - s*0.65, s*0.15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.2, by - s*0.65, s*0.15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a5276';
    ctx.beginPath(); ctx.arc(bx - s*0.2, by - s*0.65, s*0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.2, by - s*0.65, s*0.08, 0, Math.PI*2); ctx.fill();
    // Frost glint
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = t * 0.8 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * s * 0.7, by + Math.sin(a) * s * 0.7);
      ctx.lineTo(bx + Math.cos(a) * s * 1.0, by + Math.sin(a) * s * 1.0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

  // ── NEPTHAR (ocean) — tentacle silhouette, coral crown ────────────────────
  } else if (bossName === 'Nepthar') {
    // Tentacles — animated sway
    for (let i = 0; i < 6; i++) {
      const baseX = bx + (i - 2.5) * s * 0.32;
      const sway = Math.sin(t * 2 + i * 0.9) * s * 0.4;
      ctx.strokeStyle = '#0e6655'; ctx.lineWidth = 8 - i * 0.5;
      ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(baseX, by + s * 0.4);
      ctx.quadraticCurveTo(baseX + sway, by + s * 1.1, baseX + sway * 1.4, by + s * 1.8);
      ctx.stroke();
      // Sucker dots
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#1abc9c'; ctx.lineWidth = 1;
      for (let d = 0; d < 3; d++) {
        const dt2 = d / 3;
        const sx2 = baseX + sway * dt2 * 1.2;
        const sy2 = by + s * 0.4 + (s * 1.4) * dt2;
        ctx.beginPath(); ctx.arc(sx2, sy2, 3, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    // Body
    ctx.fillStyle = '#0e6655';
    ctx.beginPath(); ctx.ellipse(bx, by, s*0.75, s*0.65, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#148f77';
    ctx.beginPath(); ctx.ellipse(bx, by - s*0.1, s*0.55, s*0.45, 0, 0, Math.PI*2); ctx.fill();
    // Coral crown
    for (let i = 0; i < 5; i++) {
      const ca = -Math.PI + (i / 4) * Math.PI;
      ctx.fillStyle = i % 2 === 0 ? '#e74c3c' : '#f39c12';
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(ca) * s*0.62, by - s*0.1 + Math.sin(ca) * s*0.42);
      ctx.bezierCurveTo(
        bx + Math.cos(ca) * s*0.9, by - s*0.1 + Math.sin(ca) * s*0.9,
        bx + Math.cos(ca) * s*1.0, by - s*0.1 + Math.sin(ca) * s*1.0,
        bx + Math.cos(ca + 0.2) * s*0.7, by - s*0.1 + Math.sin(ca + 0.2) * s*0.5
      );
      ctx.closePath(); ctx.fill();
    }
    // Eyes — large, octopus-like
    ctx.fillStyle = '#f39c12';
    ctx.beginPath(); ctx.arc(bx - s*0.25, by - s*0.05, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.25, by - s*0.05, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(bx - s*0.25, by - s*0.05, s*0.1, s*0.18, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx + s*0.25, by - s*0.05, s*0.1, s*0.18, 0, 0, Math.PI*2); ctx.fill();

  // ── VORTUS (storm) — crackling lightning halo, cloud form ─────────────────
  } else if (bossName === 'Vortus') {
    // Dark cloud body — multiple overlapping ellipses
    ctx.fillStyle = '#1a1030';
    ctx.beginPath(); ctx.arc(bx, by, s*0.85, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx - s*0.5, by - s*0.2, s*0.55, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.5, by - s*0.2, s*0.55, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2e1f5e';
    ctx.beginPath(); ctx.arc(bx, by - s*0.3, s*0.65, 0, Math.PI*2); ctx.fill();
    // Rotating lightning halo
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 3;
      const flicker = Math.sin(t * 12 + i * 1.3) > 0.3;
      if (!flicker) continue;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = i % 2 === 0 ? '#f1c40f' : '#9b59b6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const lx = bx + Math.cos(a) * s;
      const ly = by + Math.sin(a) * s;
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + Math.cos(a + 0.4) * s * 0.45, ly + Math.sin(a + 0.4) * s * 0.45);
      ctx.lineTo(lx + Math.cos(a) * s * 0.7, ly + Math.sin(a) * s * 0.7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Eyes — electric
    const eyePulse = 0.7 + Math.sin(t * 8) * 0.3;
    ctx.globalAlpha = eyePulse; ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.arc(bx - s*0.28, by - s*0.15, s*0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.28, by - s*0.15, s*0.2, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Central lightning bolt
    ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8 + Math.sin(t*10)*0.2;
    ctx.beginPath();
    ctx.moveTo(bx, by - s*0.6);
    ctx.lineTo(bx + s*0.18, by - s*0.1);
    ctx.lineTo(bx - s*0.12, by + s*0.1);
    ctx.lineTo(bx + s*0.08, by + s*0.6);
    ctx.stroke();
    ctx.globalAlpha = 1;

  // ── UMBRIS (shadow) — torn cloak, hollow void eyes ────────────────────────
  } else if (bossName === 'Umbris') {
    // Cloak — wide at bottom, tears animated
    ctx.fillStyle = '#0d0010';
    ctx.beginPath();
    ctx.moveTo(bx - s*1.1, by + s*1.0);
    ctx.lineTo(bx - s*0.7, by - s*0.3);
    ctx.lineTo(bx - s*0.4, by - s*0.8);
    ctx.lineTo(bx, by - s*1.0);
    ctx.lineTo(bx + s*0.4, by - s*0.8);
    ctx.lineTo(bx + s*0.7, by - s*0.3);
    ctx.lineTo(bx + s*1.1, by + s*1.0);
    // Torn bottom
    const tearCount = 7;
    for (let i = tearCount - 1; i >= 0; i--) {
      const tx2 = bx - s*1.1 + ((i + 0.5) / tearCount) * s*2.2;
      const tearY = by + s*1.0 - Math.abs(Math.sin(t*1.5 + i*0.9)) * s*0.3 - s*0.05;
      ctx.lineTo(tx2, tearY);
    }
    ctx.closePath(); ctx.fill();
    // Inner glow
    ctx.fillStyle = '#1a0028'; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.ellipse(bx, by - s*0.1, s*0.5, s*0.65, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Hood
    ctx.fillStyle = '#0d0010';
    ctx.beginPath(); ctx.arc(bx, by - s*0.7, s*0.55, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a0028';
    ctx.beginPath(); ctx.arc(bx, by - s*0.65, s*0.4, 0, Math.PI*2); ctx.fill();
    // Hollow eyes — void void void
    const voidPulse = 0.5 + Math.sin(t * 4) * 0.4;
    ctx.globalAlpha = voidPulse; ctx.fillStyle = '#8e44ad';
    ctx.beginPath(); ctx.arc(bx - s*0.2, by - s*0.7, s*0.18, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.2, by - s*0.7, s*0.18, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(bx - s*0.2, by - s*0.7, s*0.07, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.2, by - s*0.7, s*0.07, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Floating shadow orbs
    for (let i = 0; i < 4; i++) {
      const oa = t * 1.5 + i * Math.PI / 2;
      const or2 = s * 1.2;
      ctx.globalAlpha = 0.35 + Math.sin(t * 2 + i) * 0.15;
      ctx.fillStyle = '#6c3483';
      ctx.beginPath(); ctx.arc(bx + Math.cos(oa) * or2, by + Math.sin(oa) * or2 * 0.6, 6, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

  // ── MAGMARA (lava) — molten boulder, eruption crown ───────────────────────
  } else if (bossName === 'Magmara') {
    // Boulder body — dark with lava veins
    ctx.fillStyle = '#1c0a00';
    ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2c1200';
    ctx.beginPath(); ctx.arc(bx - s*0.2, by - s*0.15, s*0.7, 0, Math.PI*2); ctx.fill();
    // Lava vein network — animated pulse
    const lavaPulse = 0.6 + Math.sin(t * 1.8) * 0.3;
    ctx.globalAlpha = lavaPulse; ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - s*0.5, by + s*0.2);
    ctx.lineTo(bx - s*0.1, by - s*0.3);
    ctx.lineTo(bx + s*0.4, by - s*0.1);
    ctx.moveTo(bx - s*0.1, by - s*0.3);
    ctx.lineTo(bx + s*0.1, by + s*0.5);
    ctx.moveTo(bx - s*0.4, by - s*0.5);
    ctx.lineTo(bx + s*0.3, by - s*0.7);
    ctx.stroke();
    ctx.globalAlpha = lavaPulse * 0.5; ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx + s*0.2, by + s*0.3);
    ctx.lineTo(bx + s*0.5, by - s*0.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Eruption crown — rising lava chunks
    for (let i = 0; i < 5; i++) {
      const ea = -Math.PI * 0.9 + (i / 4) * Math.PI * 0.8;
      const erise = (Math.sin(t * 2.5 + i * 0.7) + 1) / 2;
      const er2 = s * (0.85 + erise * 0.3);
      ctx.fillStyle = i % 2 === 0 ? '#e67e22' : '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(ea) * s * 0.75, by + Math.sin(ea) * s * 0.75);
      ctx.lineTo(bx + Math.cos(ea) * er2, by + Math.sin(ea) * er2);
      ctx.lineTo(bx + Math.cos(ea + 0.22) * s * 0.8, by + Math.sin(ea + 0.22) * s * 0.8);
      ctx.closePath(); ctx.fill();
    }
    // Eyes — molten orange
    ctx.fillStyle = '#e67e22';
    ctx.beginPath(); ctx.arc(bx - s*0.28, by - s*0.25, s*0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.28, by - s*0.25, s*0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.arc(bx - s*0.28, by - s*0.25, s*0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + s*0.28, by - s*0.25, s*0.1, 0, Math.PI*2); ctx.fill();
    // Lava drip drops
    for (let d = 0; d < 4; d++) {
      const dropY = ((t * 55 + d * 22) % (s * 2.2));
      const dropX = bx - s*0.5 + d * s*0.35;
      ctx.globalAlpha = Math.max(0, 0.8 - dropY / (s*2.2));
      ctx.fillStyle = '#e67e22';
      ctx.beginPath(); ctx.arc(dropX, by + s*0.5 + dropY, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

  // ── NIHILUS (void) — fractured star, golden eye ───────────────────────────
  } else if (bossName === 'Nihilus') {
    // Void core — deep black with subtle nebula tones
    ctx.fillStyle = '#050508';
    ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI*2); ctx.fill();
    // Fractured star shards — rotating
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.4;
      const r1 = s * (0.6 + (i % 2) * 0.35);
      const r2 = s * (0.35 + (i % 3) * 0.1);
      ctx.fillStyle = i % 3 === 0 ? '#f1c40f' : i % 3 === 1 ? '#9b59b6' : '#ffffff';
      ctx.globalAlpha = 0.7 + Math.sin(t * 3 + i) * 0.25;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1);
      ctx.lineTo(bx + Math.cos(a + Math.PI/8) * r2, by + Math.sin(a + Math.PI/8) * r2);
      ctx.lineTo(bx + Math.cos(a - Math.PI/8) * r2, by + Math.sin(a - Math.PI/8) * r2);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Inner void swirl
    for (let ring = 0; ring < 3; ring++) {
      const ra = -t * (2 + ring) + ring * 1.2;
      ctx.globalAlpha = 0.3 - ring * 0.08;
      ctx.strokeStyle = ring === 0 ? '#f1c40f' : ring === 1 ? '#9b59b6' : '#ffffff';
      ctx.lineWidth = 2.5 - ring * 0.5;
      ctx.beginPath(); ctx.arc(bx, by, s * (0.5 - ring * 0.1), ra, ra + Math.PI * 1.7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // The golden eye
    const eyePulse2 = 0.6 + Math.sin(t * 3) * 0.35;
    ctx.fillStyle = '#f1c40f'; ctx.globalAlpha = eyePulse2;
    ctx.beginPath(); ctx.arc(bx, by, s * 0.28, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath(); ctx.ellipse(bx, by, s*0.1, s*0.24, 0, 0, Math.PI*2); ctx.fill();
    // Gold iris
    ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, s * 0.22, 0, Math.PI*2); ctx.stroke();
    // Radiating cracks from eye
    for (let i = 0; i < 6; i++) {
      const ca = (i / 6) * Math.PI * 2 + t * 0.2;
      ctx.globalAlpha = 0.5 + Math.sin(t * 4 + i) * 0.3;
      ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(ca) * s*0.3, by + Math.sin(ca) * s*0.3);
      ctx.lineTo(bx + Math.cos(ca) * s*0.85, by + Math.sin(ca) * s*0.85);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Floating void particles
    for (let i = 0; i < 10; i++) {
      const pa = (t * 1.2 + i * 0.628) % (Math.PI * 2);
      const pr2 = s * (1.1 + (i % 3) * 0.2);
      ctx.globalAlpha = 0.5 + Math.sin(t * 3 + i * 1.1) * 0.35;
      ctx.fillStyle = i % 2 === 0 ? '#f1c40f' : '#9b59b6';
      ctx.beginPath(); ctx.arc(bx + Math.cos(pa) * pr2, by + Math.sin(pa) * pr2, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

  // ── FALLBACK — generic boss circle ────────────────────────────────────────
  } else {
    ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.15;
    ctx.beginPath(); ctx.arc(bx - s*0.25, by - s*0.3, s*0.55, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p2 ? '#e74c3c' : '#ffffff'; ctx.lineWidth = p2 ? 4 : 3;
    ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI*2); ctx.stroke();
    ctx.font = `${Math.round(s * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(b.icon, bx, by + 2);
    ctx.textBaseline = 'alphabetic';
  }

  // Phase 2 — shared cracked overlay
  if (p2) {
    ctx.globalAlpha = 0.22 + Math.sin(t * 4) * 0.1;
    ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, s + 10, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, s + 20, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Boss name label (always on top)
  ctx.textAlign = 'center';
  const nameY = by - s - (bossName === 'Sylvara' ? s*0.6 : 10);
  ctx.font = 'bold 10px sans-serif';
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 3;
  ctx.strokeText(b.name.toUpperCase(), bx, nameY);
  ctx.fillStyle = b.color;
  ctx.fillText(b.name.toUpperCase(), bx, nameY);

  ctx.restore();
}

const ABILITY_COLORS = {
  whirlwind:    {primary:'#4a90e2', secondary:'#7ab3e0'},
  ground_slam:  {primary:'#c0392b', secondary:'#e67e22'},
  power_shot:   {primary:'#FCD34D', secondary:'#F97316'},
  flurry:       {primary:'#f39c12', secondary:'#fff'},
  arcane_burst: {primary:'#9b59b6', secondary:'#d4af37'},
};

export default function RealmArenaCanvas({ realmId, onFlee }) {
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const lastTimeRef = useRef(0);
  const cfg = REALM_CFG[realmId] || REALM_CFG.forest;
  const showLevelUp  = useGameStore(s => s.showLevelUp);
  const prevLevelUp  = useRef(false);
  useEffect(() => {
    if (!prevLevelUp.current && showLevelUp) { hapticLevelUp(); sfxLevelUp(); }
    prevLevelUp.current = showLevelUp;
  }, [showLevelUp]);

  const G = useRef({
    player:       { x:15*TILE, y:24*TILE, attackCooldown:0, invincible:true, invTimer:2.0 },
    camera:       { x:15*TILE, y:24*TILE },
    enemies:      [],
    projectiles:  [],
    bossHpSaveTimer: 0,
    boss:         null,
    bossPhase:    1,
    bossChargeTimer: 0,
    bossSpawnTimer: 0,
    wave:         0,
    victory:      false,
    victoryTimer: 0,
    victoryBannerTimer: 0,
    victoryPortal: null,
    abilityEffect: null,
    abilityCooldown: 0,
    floats:       [],
    keys:         {},
    prevSpace:    false,
    prevAbility:  false,
    attackFlash:  null,
    lastMoveDir:  {x:0,y:1},
    t:            0,
    W:390, H:844,
  }).current;

  const addFloat=(x,y,text,color='#fff',big=false)=>{
    G.floats.push({x,y,text,color,life:big?1.5:1.2,vy:big?-55:-42,big});
  };

  const spawnWave=(waveIdx)=>{
    const defs=cfg.waves[waveIdx];
    if(!defs||!defs.length) return;
    G.enemies=defs.map(d=>{
      const s=ENEMY_STATS[d.type]||ENEMY_STATS.thornling;
      return{...d,type:d.type,hp:s.hp,maxHp:s.hp,atk:s.atk,def:s.def,speed:s.speed,
        aggroRange:s.aggroRange,attackRange:s.attackRange,attackCooldown:s.attackCooldown,
        color:s.color,size:s.size,xp:s.xp,ranged:s.ranged||false,projColor:s.projColor,
        alive:true,attackTimer:0,stunTimer:0,state:'patrol',patrolTimer:0,patrolDir:1};
    });
  };

  const spawnBoss=()=>{
    const b=cfg.boss;
    const _startHp = (savedBossHp && savedBossHp < b.hp) ? savedBossHp : b.hp;
    // Spawn boss at arena center so it's always on screen
    const spawnX = WW / 2;
    const spawnY = WH * 0.35;
    G.boss={ ...b, hp:_startHp, maxHp:b.hp, alive:true,
      x: spawnX, y: spawnY,
      // attackTimer starts at 2.5s so boss can't attack on spawn frame
      attackTimer:2.5, stunTimer:0, chargeTimer:b.chargeInterval||4, chargeState:'idle',
      telegraphTimer:0, chargeVx:0, chargeVy:0, spawnTimer:10,
      patrolDir:1, patrolTimer:0,
      // introTimer: boss is non-attacking for 1.5s while intro plays
      introTimer:1.5 };
    G.bossChargeTimer=b.chargeInterval||4;
    G.bossSpawnTimer=8;
    G.bossPhase=1;
    // Clear dead minions and enemy projectiles so arena feels clean
    G.enemies=[];
    G.projectiles=G.projectiles.filter(proj=>proj.fromPlayer);
    if(savedBossPhase===2){ G.bossPhase=2; }
    addFloat(spawnX, spawnY-80, `⚠ ${b.name || 'BOSS'} APPROACHES!`, '#e74c3c', true);
  };

  // ── Godkiller passive helpers ────────────────────────────────────────────
  const getGodkillerPassive=(store)=>{
    const wId=store.gear?.weapon;
    const w=wId?store.inventory.find(i=>i.instanceId===wId):null;
    if(!w||w.rarity!=='godkiller') return {};
    return{lifesteal:w.id==='soulbreaker',defPierce:w.id==='voidpiercer',aoeStun:w.id==='godsplitter'};
  };
  const applyGodkillerPassives=(dmg,e,p,store,enemies,addFloat)=>{
    const passive=getGodkillerPassive(store);
    if(passive.lifesteal){const heal=Math.max(1,Math.round(dmg*0.15));store.healPlayer(heal);addFloat(p.x,p.y-30,`+${heal}`,'#2ecc71');}
    if(passive.aoeStun&&e){enemies.forEach(en=>{if(!en.alive)return;const dx=en.x-(e.x??p.x),dy=en.y-(e.y??p.y);if(Math.sqrt(dx*dx+dy*dy)<=80)en.stunTimer=Math.max(en.stunTimer||0,1.5);});addFloat(e.x??p.x,(e.y??p.y)-36,'⚡ STUNNED','#f1c40f',true);}
  };
  const applyDefPierce=(baseDmg,enemyDef,store)=>{
    const passive=getGodkillerPassive(store);
    // Voidpiercer weapon: full pierce. Mage class: 50% pierce.
    if(passive.defPierce) return Math.max(1,baseDmg);
    if(store.prestigeClass==='mage'||store.prestigeClass==='god'){
      const pierced=Math.round(enemyDef*(store.prestigeClass==='mage'?0.5:0.3));
      return Math.max(1,baseDmg-(enemyDef-pierced));
    }
    return Math.max(1,baseDmg-enemyDef);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const killEnemy=(e,store)=>{
    e.alive=false;
    store.gainXP(e.xp||8);
    addFloat(e.x,e.y-40,`+${e.xp||8} XP`,'#9b59b6');
  };

  const executeAbility=(abilityId,store)=>{
    const ability=AbilityConfig[abilityId];
    if(!ability) return;
    const p=G.player;
    G.abilityCooldown=ability.cooldown;
    store.recordAbilityFired(ability.cooldown);
    addFloat(p.x,p.y-55,ability.name,'#d4af37',true);
    const allTargets=[...G.enemies,(G.boss&&G.boss.alive?[G.boss]:[])].flat();
    if(ability.type==='aoe'||ability.type==='elemental_aoe'){
      allTargets.forEach(e=>{
        if(!e.alive||dist(p.x,p.y,e.x,e.y)>ability.range) return;
        const dmg=Math.max(1,Math.round(store.playerATK*ability.damageMult));
        e.hp-=dmg;
        addFloat(e.x,e.y-24,`-${dmg}`,'#ff4444');
        if(e.hp<=0){ if(e===G.boss){G.boss.alive=false;}else killEnemy(e,store); }
      });
      G.abilityEffect={id:abilityId,x:p.x,y:p.y,maxRadius:ability.range,timer:0.7,maxTimer:0.7};
    } else if(ability.type==='projectile'){
      let tx=p.x+G.lastMoveDir.x*200,ty=p.y+G.lastMoveDir.y*200,nd=Infinity;
      allTargets.forEach(e=>{ if(!e.alive) return; const d=dist(p.x,p.y,e.x,e.y); if(d<nd){nd=d;tx=e.x;ty=e.y;} });
      const angle=Math.atan2(ty-p.y,tx-p.x);
      G.projectiles.push({x:p.x,y:p.y,vx:Math.cos(angle)*420,vy:Math.sin(angle)*420,
        traveled:0,maxRange:ability.range,dmg:Math.max(1,Math.round(store.playerATK*ability.damageMult)),
        hitTargets:new Set(),fromPlayer:true});
    } else if(ability.type==='multi_hit'){
      G.abilityEffect={id:abilityId,x:p.x,y:p.y,timer:0.6,maxTimer:0.6};
      for(let i=0;i<ability.hits;i++){
        setTimeout(()=>{
          const cs=useGameStore.getState();
          allTargets.forEach(e=>{
            if(!e.alive||dist(G.player.x,G.player.y,e.x,e.y)>ability.range) return;
            const dmg=Math.max(1,Math.round(cs.playerATK*ability.damageMult));
            e.hp-=dmg;
            addFloat(e.x,e.y-20-i*8,`-${dmg}`,'#f39c12');
            applyGodkillerPassives(dmg,e,G.player,cs,[...G.enemies,(G.boss&&G.boss.alive?G.boss:null)].filter(Boolean),addFloat);
            if(e.hp<=0){ if(e===G.boss) G.boss.alive=false; else killEnemy(e,cs); }
          });
        },i*ability.hitDelay*1000);
      }
    }
  };

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const resize=()=>{ setTimeout(()=>{ const r=canvas.getBoundingClientRect();
      canvas.width=Math.round(r.width>0?r.width:window.innerWidth);
      canvas.height=Math.round(r.height>0?r.height:window.innerHeight);
      G.W=canvas.width; G.H=canvas.height; },50); };
    resize(); window.addEventListener('resize',resize);

    // ── Wave start logic ──────────────────────────────────────────────
    if (cfg.waves.length > 0) {
      spawnWave(0); G.wave = 1;
    } else {
      // No waves — go straight to boss
      G.wave = 'boss'; spawnBoss();
      addFloat(15*TILE, 20*TILE, '⚠ BOSS INCOMING!', '#e74c3c', true);
    }

    const kd=e=>{G.keys[e.code]=true;}; const ku=e=>{G.keys[e.code]=false;};
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);
    canvas.addEventListener('pointerdown', () => resumeAudio(), { once: true });

    const ctx=canvas.getContext('2d');
    const loop=ts=>{
      // Guard against huge dt spikes when app was backgrounded / screen locked
      const raw = (ts - lastTimeRef.current) / 1000;
      const dt  = lastTimeRef.current === 0 ? 0 : Math.min(raw, 0.05);
      lastTimeRef.current = ts;
      if(dt>=0&&G.W>100){
        try{ update(dt); }catch(err){ console.warn('[RealmArena] update error:', err); }
        try{ render(ctx); }catch(err){ console.warn('[RealmArena] render error:', err); }
      }
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return ()=>{ cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown',kd); window.removeEventListener('keyup',ku);
      window.removeEventListener('resize',resize); };
  },[]);

  function update(dt){
    G.t += dt;
    const store=useGameStore.getState();
    const p=G.player;

    // Stop all combat processing once player is dead — prevents save-spam freeze
    if(store.playerHP <= 0) return;

    if(G.victory && G.victoryBannerTimer <= 0) {
      // After banner fades, only check for portal walk-in — still update time
    }
    if(G.abilityEffect){G.abilityEffect.timer-=dt;if(G.abilityEffect.timer<=0)G.abilityEffect=null;}
    if(G.attackFlash){G.attackFlash.timer-=dt;if(G.attackFlash.timer<=0)G.attackFlash=null;}
    if(G.abilityCooldown>0)G.abilityCooldown=Math.max(0,G.abilityCooldown-dt);

    // Movement
    let vx=0,vy=0;
    if(G.keys['ArrowLeft']||G.keys['KeyA'])vx-=1;
    if(G.keys['ArrowRight']||G.keys['KeyD'])vx+=1;
    if(G.keys['ArrowUp']||G.keys['KeyW'])vy-=1;
    if(G.keys['ArrowDown']||G.keys['KeyS'])vy+=1;
    if(InputState.joystick.active){vx=InputState.joystick.x;vy=InputState.joystick.y;}
    if(vx!==0&&vy!==0){const m=Math.sqrt(vx*vx+vy*vy);vx/=m;vy/=m;}
    if(vx!==0||vy!==0)G.lastMoveDir={x:vx,y:vy};
    const spd=150+(store.playerSPD-5)*12;
    p.x=clp(p.x+vx*spd*dt,TILE*2,WW-TILE*2);
    p.y=clp(p.y+vy*spd*dt,TILE*2,WH-TILE*2);

    // Camera
    G.camera.x+=(p.x-G.camera.x)*Math.min(1,8*dt);
    G.camera.y+=(p.y-G.camera.y)*Math.min(1,8*dt);
    G.camera.x=clp(G.camera.x,G.W/2,WW-G.W/2);
    G.camera.y=clp(G.camera.y,G.H/2,WH-G.H/2);

    if(p.attackCooldown>0)p.attackCooldown-=dt;
    if(p.invincible){p.invTimer-=dt;if(p.invTimer<=0)p.invincible=false;}

    // Attack
    const spaceNow=G.keys['Space']||window.__gameAttack;
    const spaceJust=spaceNow&&!G.prevSpace; G.prevSpace=spaceNow;
    if(window.__gameAttack)window.__gameAttack=false;
    if(spaceJust&&p.attackCooldown<=0){
      hapticAttack(); sfxAttack();
      const _aid=store.equippedAbilityId||'whirlwind';
      const wType=_aid==='power_shot'?'bow':_aid==='ground_slam'?'hammer':_aid==='flurry'?'dagger':_aid==='arcane_burst'?'staff':'sword';
      const allT=[...G.enemies,(G.boss&&G.boss.alive?[G.boss]:[])].flat().filter(e=>e.alive);
      if(wType==='bow'||wType==='staff'){
        p.attackCooldown=0.6;
        let tx=p.x+G.lastMoveDir.x*400,ty=p.y+G.lastMoveDir.y*400,nd=Infinity;
        allT.forEach(e=>{const d=dist(p.x,p.y,e.x,e.y);if(d<nd){nd=d;tx=e.x;ty=e.y;}});
        const ang=Math.atan2(ty-p.y,tx-p.x);
        const dmg=store.playerATK;
        G.projectiles.push({x:p.x,y:p.y,vx:Math.cos(ang)*480,vy:Math.sin(ang)*480,
          traveled:0,maxRange:520,dmg,hitTargets:new Set(),fromPlayer:true});
        G.attackFlash={x:p.x,y:p.y,timer:0.15,type:'ranged',ang};
      } else {
        const rng=wType==='hammer'?72:wType==='dagger'?48:60;
        p.attackCooldown=wType==='hammer'?0.85:wType==='dagger'?0.35:0.55;
        allT.forEach(e=>{
          if(dist(p.x,p.y,e.x,e.y)>rng) return;
          const dmg=applyDefPierce(store.playerATK,(e.def||0),store);
          e.hp-=dmg; addFloat(e.x,e.y-20,`-${dmg}`,'#ff4444');
          hapticHit(); sfxHit();
          const allRA=[...G.enemies,(G.boss&&G.boss.alive?[G.boss]:[])].flat();
          applyGodkillerPassives(dmg,e,p,store,allRA,addFloat);
          if(e.hp<=0){if(e===G.boss)G.boss.alive=false;else killEnemy(e,store);}
        });
        G.attackFlash={x:p.x,y:p.y,timer:0.18,type:'melee',rng};
      }
    }

    // Ability
    const abilityNow=G.keys['KeyQ']||window.__gameAbility;
    const abilityJust=abilityNow&&!G.prevAbility; G.prevAbility=abilityNow;
    if(window.__gameAbility)window.__gameAbility=false;
    if(abilityJust&&G.abilityCooldown<=0&&store.equippedAbilityId) executeAbility(store.equippedAbilityId,store);

    // Projectiles
    G.projectiles=G.projectiles.filter(proj=>{
      // Spawn delay (wave_burst stagger)
      if((proj.spawnDelay||0)>0){ proj.spawnDelay-=dt; return true; }
      // Ground slam — AoE pulse, no movement
      if(proj.slamRadius){
        proj.slamTimer=(proj.slamTimer||0)-dt;
        if(proj.slamTimer<=0){
          const sb=G.boss; const sx=sb?sb.x:proj.x; const sy=sb?sb.y:proj.y;
          if(!p.invincible&&dist(sx,sy,p.x,p.y)<proj.slamRadius){
            const sdmg=Math.max(1,proj.dmg-store.playerDEF);
            store.takeDamage(sdmg); addFloat(p.x,p.y-30,`-${sdmg}`,'#e74c3c');
            p.invincible=true; p.invTimer=0.6;
          }
          return false;
        }
        return true;
      }
      // Homing orbs — lock onto player after delay
      if(proj.homing){
        proj.homingTimer=(proj.homingTimer||0)-dt;
        if(proj.homingTimer<=0){
          const hAng=Math.atan2(p.y-proj.y,p.x-proj.x);
          const spd=proj.speed||220;
          proj.vx=Math.cos(hAng)*spd; proj.vy=Math.sin(hAng)*spd;
        } else { return true; }
      }
      proj.x+=proj.vx*dt; proj.y+=proj.vy*dt;
      proj.traveled+=Math.sqrt(proj.vx*proj.vx+proj.vy*proj.vy)*dt;
      if(proj.fromPlayer){
        const targets=[...G.enemies,(G.boss&&G.boss.alive?[G.boss]:[])].flat();
        targets.forEach(e=>{
          if(!e.alive||proj.hitTargets.has(e)||dist(proj.x,proj.y,e.x,e.y)>22) return;
          const projDmg_ra = applyDefPierce(proj.dmg,(e.def||0),store);
          proj.hitTargets.add(e); e.hp-=projDmg_ra;
          addFloat(e.x,e.y-24,`-${projDmg_ra}`,'#FCD34D');
          hapticHit(); sfxHit();
          const allRA2=[...G.enemies,(G.boss&&G.boss.alive?[G.boss]:[])].flat();
          applyGodkillerPassives(projDmg_ra,e,p,store,allRA2,addFloat);
          if(e.hp<=0){ if(e===G.boss) G.boss.alive=false; else killEnemy(e,store); }
        });
      } else {
        if(!p.invincible&&dist(proj.x,proj.y,p.x,p.y)<18){
          const dmg=Math.max(1,(proj.dmg||5)-store.playerDEF);
          store.takeDamage(dmg); addFloat(p.x,p.y-30,`-${dmg}`,'#e74c3c');
          p.invincible=true; p.invTimer=0.5;
          return false;
        }
      }
      return proj.traveled<(proj.maxRange||400)&&proj.x>0&&proj.x<WW&&proj.y>0&&proj.y<WH;
    });

    // Enemy AI (skip if victory)
    if (!G.victory) {
      G.enemies.forEach(e=>{
        if(!e.alive) return;
        if(e.stunTimer>0){ e.stunTimer=Math.max(0,e.stunTimer-dt); return; }
        e.attackTimer=Math.max(0,e.attackTimer-dt);
        const d=dist(p.x,p.y,e.x,e.y);
        if(d<=e.attackRange){
          if(e.ranged){
            if(e.attackTimer<=0){
              e.attackTimer=e.attackCooldown;
              const ang=Math.atan2(p.y-e.y,p.x-e.x);
              G.projectiles.push({x:e.x,y:e.y,vx:Math.cos(ang)*280,vy:Math.sin(ang)*280,
                traveled:0,maxRange:360,dmg:e.atk,hitTargets:new Set(),fromPlayer:false});
            }
            const ang=Math.atan2(e.y-p.y,e.x-p.x);
            e.x=clp(e.x+Math.cos(ang)*e.speed*0.5*dt,TILE,WW-TILE);
            e.y=clp(e.y+Math.sin(ang)*e.speed*0.5*dt,TILE,WH-TILE);
          } else {
            if(e.attackTimer<=0&&!p.invincible){
              e.attackTimer=e.attackCooldown;
              const dmg=Math.max(1,e.atk-store.playerDEF);
              store.takeDamage(dmg); addFloat(p.x,p.y-30,`-${dmg}`,'#e74c3c');
              p.invincible=true; p.invTimer=0.5;
            }
          }
        } else if(d<=e.aggroRange){
          const ang=Math.atan2(p.y-e.y,p.x-e.x);
          e.x=clp(e.x+Math.cos(ang)*e.speed*dt,TILE,WW-TILE);
          e.y=clp(e.y+Math.sin(ang)*e.speed*dt,TILE,WH-TILE);
        }
      });
    }

    // Wave clear check
    const allDead=G.enemies.every(e=>!e.alive);
    if(!G.victory && G.enemies.length>0 && allDead){
      if(G.wave<cfg.waves.length){
        G.wave++; spawnWave(G.wave-1);
        addFloat(p.x,p.y-60,`Wave ${G.wave}!`,'#f1c40f',true);
      } else if(G.wave===cfg.waves.length&&!G.boss){
        G.wave='boss'; spawnBoss();
        addFloat(p.x,p.y-60,'⚠ BOSS INCOMING!','#e74c3c',true);
      }
    }

    // Boss AI
    if(G.boss&&G.boss.alive&&!G.victory){
      const b=G.boss; const bcfg=cfg.boss;
      // Intro grace period — boss visible but not yet attacking
      if(b.introTimer>0){
        b.introTimer=Math.max(0,b.introTimer-dt);
      } else if(b.stunTimer>0){ b.stunTimer=Math.max(0,b.stunTimer-dt); }
      else {
      b.attackTimer=Math.max(0,(b.attackTimer||0)-dt);
      if(b.hp<=b.maxHp*0.5&&G.bossPhase===1){
        G.bossPhase=2; addFloat(b.x,b.y-60,'⚠ Phase 2!','#e74c3c',true);
        G.bossSpawnTimer=4;
      }
      if(G.bossPhase===2){ G.bossSpawnTimer-=dt;
        if(G.bossSpawnTimer<=0){ G.bossSpawnTimer=6;
          const s=ENEMY_STATS.thornling;
          G.enemies.push({type:'thornling',x:b.x+60,y:b.y+40,...s,alive:true,attackTimer:0,stunTimer:0,state:'patrol',patrolTimer:0,patrolDir:1});
          G.enemies.push({type:'thornling',x:b.x-60,y:b.y+40,...s,alive:true,attackTimer:0,stunTimer:0,state:'patrol',patrolTimer:0,patrolDir:-1});
        }
      }
      // ── Boss movement: orbit + patrol ────────────────────────────
      b.orbitAngle=(b.orbitAngle||0)+dt*(G.bossPhase===2?1.4:0.9);
      if(b.chargeState==='idle'){
        b.patrolTimer=(b.patrolTimer||0)+dt;
        if(b.patrolTimer>1.8){b.patrolDir=(b.patrolDir||1)*-1;b.patrolTimer=0;}
        b.x=clp(b.x+90*(b.patrolDir||1)*dt,TILE*3,WW-TILE*3);
        // Slow drift toward player between attacks
        const driftDx=p.x-b.x, driftDy=p.y-b.y;
        const driftD=Math.sqrt(driftDx*driftDx+driftDy*driftDy)||1;
        if(driftD>220){ b.x+=driftDx/driftD*55*dt; b.y+=driftDy/driftD*55*dt; }
        G.bossChargeTimer-=dt;
        if(G.bossChargeTimer<=0){
          // ── Pick next attack based on boss personality ──────────
          const bname=b.name;
          const p2=G.bossPhase===2;
          // Each boss has a weighted attack pool
          const pools={
            Sylvara:  p2?['charge','spread3','heal_pulse','spread5']:['charge','spread3','charge'],
            Terran:   p2?['charge','ground_slam','rock_ring','charge']:['charge','ground_slam','charge'],
            Zephyros: p2?['charge','wind_spiral','dash_shot','wind_spiral']:['charge','dash_shot','charge'],
            Ignar:    p2?['charge','fire_ring','homing3','charge','fire_ring']:['charge','fire_ring','charge'],
            Glacius:  p2?['charge','freeze_ring','homing3','spread5']:['charge','freeze_ring','charge'],
            Nepthar:  p2?['charge','wave_burst','spread5','homing3']:['charge','wave_burst','charge'],
            Vortus:   p2?['charge','lightning_cross','dash_shot','spread5','charge']:['charge','lightning_cross','charge'],
            Umbris:   p2?['charge','shadow_clone','homing3','spread5','charge']:['charge','shadow_clone','charge'],
            Magmara:  p2?['charge','fire_ring','ground_slam','homing3','spread5']:['charge','fire_ring','ground_slam','charge'],
            Nihilus:  p2?['charge','spread5','homing3','lightning_cross','wave_burst','shadow_clone']:['charge','spread3','homing2','charge'],
          };
          const pool=pools[bname]||['charge','spread3'];
          // Don't repeat last attack
          let choices=pool.filter(a=>a!==b.lastAttack);
          if(!choices.length) choices=pool;
          const nextAtk=choices[Math.floor(Math.random()*choices.length)];
          b.pendingAttack=nextAtk; b.lastAttack=nextAtk;
          b.chargeState='telegraph'; b.telegraphTimer=bcfg.chargeTelegraph;
          b.telegraphTargetX=p.x; b.telegraphTargetY=p.y;
        }
      } else if(b.chargeState==='telegraph'){
        b.telegraphTimer-=dt;
        if(b.telegraphTimer<=0){
          const p2=G.bossPhase===2;
          const spd=p2?bcfg.chargeSpeed*1.3:bcfg.chargeSpeed;
          const ang=Math.atan2(b.telegraphTargetY-b.y,b.telegraphTargetX-b.x);
          const atk=b.pendingAttack||'charge';

          if(atk==='charge'){
            b.chargeState='charging';
            b.chargeVx=Math.cos(ang)*spd; b.chargeVy=Math.sin(ang)*spd; b.chargeTraveled=0;

          } else if(atk==='spread3'||atk==='spread5'){
            // Fan of projectiles
            const count=atk==='spread5'?5:3;
            const spread=atk==='spread5'?0.55:0.38;
            for(let i=0;i<count;i++){
              const a=ang-spread*(count-1)/2+spread*i;
              G.projectiles.push({x:b.x,y:b.y,vx:Math.cos(a)*320,vy:Math.sin(a)*320,
                traveled:0,maxRange:480,dmg:b.atk,hitTargets:new Set(),fromPlayer:false,color:b.color});
            }
            addFloat(b.x,b.y-50,'⚠ Spread Shot!','#e74c3c');
            b.chargeState='idle'; G.bossChargeTimer=p2?bcfg.chargeInterval*0.55:bcfg.chargeInterval*0.8;

          } else if(atk==='fire_ring'||atk==='rock_ring'||atk==='freeze_ring'||atk==='wind_spiral'){
            // Ring burst — 8 or 12 directions
            const count=atk==='wind_spiral'?12:8;
            const rotOff=atk==='wind_spiral'?(G.t*2):0;
            for(let i=0;i<count;i++){
              const a=(Math.PI*2/count)*i+rotOff;
              G.projectiles.push({x:b.x,y:b.y,vx:Math.cos(a)*260,vy:Math.sin(a)*260,
                traveled:0,maxRange:420,dmg:b.atk,hitTargets:new Set(),fromPlayer:false,color:b.color});
            }
            const label=atk==='fire_ring'?'🔥 Ring!':atk==='freeze_ring'?'❄️ Ring!':atk==='rock_ring'?'🪨 Ring!':'💨 Spiral!';
            addFloat(b.x,b.y-50,label,'#e74c3c');
            b.chargeState='idle'; G.bossChargeTimer=p2?bcfg.chargeInterval*0.6:bcfg.chargeInterval*0.85;

          } else if(atk==='ground_slam'){
            // Telegraph wait, then ring + charge
            G.projectiles.push({x:b.x,y:b.y,vx:0,vy:0,
              traveled:0,maxRange:1,dmg:b.atk*1.5|0,hitTargets:new Set(),fromPlayer:false,
              slamRadius:160,slamTimer:0.5,color:'#c0392b'}); // handled in proj update
            addFloat(b.x,b.y-50,'💥 SLAM!','#e74c3c',true);
            b.chargeState='idle'; G.bossChargeTimer=p2?bcfg.chargeInterval*0.55:bcfg.chargeInterval*0.75;

          } else if(atk==='homing2'||atk==='homing3'){
            // Delayed homing orbs
            const count=atk==='homing3'?3:2;
            for(let i=0;i<count;i++){
              const delay=i*0.3;
              G.projectiles.push({x:b.x,y:b.y,vx:0,vy:0,
                traveled:0,maxRange:600,dmg:b.atk,hitTargets:new Set(),fromPlayer:false,
                homing:true,homingDelay:delay,homingTimer:delay,speed:200+i*30,color:b.color});
            }
            addFloat(b.x,b.y-50,'👁 Homing!','#e74c3c');
            b.chargeState='idle'; G.bossChargeTimer=p2?bcfg.chargeInterval*0.5:bcfg.chargeInterval*0.8;

          } else if(atk==='dash_shot'){
            // Quick dash + shoot 3 in cone behind dash direction
            b.chargeState='charging';
            b.chargeVx=Math.cos(ang)*spd*1.2; b.chargeVy=Math.sin(ang)*spd*1.2; b.chargeTraveled=0;
            b.dashShotPending=true;

          } else if(atk==='lightning_cross'){
            // 4-cardinal + 4-diagonal burst
            for(let i=0;i<8;i++){
              const a=(Math.PI/4)*i;
              G.projectiles.push({x:b.x,y:b.y,vx:Math.cos(a)*380,vy:Math.sin(a)*380,
                traveled:0,maxRange:440,dmg:b.atk,hitTargets:new Set(),fromPlayer:false,color:'#f1c40f'});
            }
            addFloat(b.x,b.y-50,'⚡ Cross!','#f1c40f',true);
            b.chargeState='idle'; G.bossChargeTimer=p2?bcfg.chargeInterval*0.5:bcfg.chargeInterval*0.75;

          } else if(atk==='wave_burst'){
            // 3 staggered rings
            for(let wave=0;wave<3;wave++){
              for(let i=0;i<6;i++){
                const a=(Math.PI*2/6)*i+(wave*Math.PI/6);
                G.projectiles.push({x:b.x,y:b.y,
                  vx:Math.cos(a)*(220+wave*40),vy:Math.sin(a)*(220+wave*40),
                  traveled:0,maxRange:460,dmg:b.atk,hitTargets:new Set(),fromPlayer:false,color:b.color,
                  spawnDelay:wave*0.25,spawnTimer:wave*0.25});
              }
            }
            addFloat(b.x,b.y-50,'🌊 Wave!','#1abc9c',true);
            b.chargeState='idle'; G.bossChargeTimer=p2?bcfg.chargeInterval*0.55:bcfg.chargeInterval*0.8;

          } else if(atk==='shadow_clone'){
            // Teleport boss to random spot + spawn ghost clone projectiles
            b.x=clp(TILE*5+Math.random()*(WW-TILE*10),TILE*2,WW-TILE*2);
            b.y=clp(TILE*5+Math.random()*(WH-TILE*10),TILE*2,WH-TILE*2);
            for(let i=0;i<5;i++){
              const a=(Math.PI*2/5)*i;
              G.projectiles.push({x:b.x,y:b.y,vx:Math.cos(a)*290,vy:Math.sin(a)*290,
                traveled:0,maxRange:400,dmg:b.atk,hitTargets:new Set(),fromPlayer:false,color:'#8e44ad'});
            }
            addFloat(b.x,b.y-50,'👥 Clone!','#8e44ad',true);
            b.chargeState='idle'; G.bossChargeTimer=p2?bcfg.chargeInterval*0.5:bcfg.chargeInterval*0.75;

          } else if(atk==='heal_pulse'){
            // Sylvara only: heals 5% max HP, spawns ring
            const healAmt=Math.ceil(b.maxHp*0.05);
            b.hp=Math.min(b.maxHp,b.hp+healAmt);
            for(let i=0;i<6;i++){
              const a=(Math.PI*2/6)*i;
              G.projectiles.push({x:b.x,y:b.y,vx:Math.cos(a)*200,vy:Math.sin(a)*200,
                traveled:0,maxRange:340,dmg:b.atk,hitTargets:new Set(),fromPlayer:false,color:'#2ecc71'});
            }
            addFloat(b.x,b.y-50,`💚 +${healAmt} Heal!`,'#2ecc71',true);
            b.chargeState='idle'; G.bossChargeTimer=p2?bcfg.chargeInterval*0.6:bcfg.chargeInterval*0.9;
          } else {
            // fallback: charge
            b.chargeState='charging';
            b.chargeVx=Math.cos(ang)*spd; b.chargeVy=Math.sin(ang)*spd; b.chargeTraveled=0;
          }
        }
      } else if(b.chargeState==='charging'){
        b.x=clp(b.x+b.chargeVx*dt,TILE,WW-TILE);
        b.y=clp(b.y+b.chargeVy*dt,TILE,WH-TILE);
        b.chargeTraveled+=(Math.abs(b.chargeVx)+Math.abs(b.chargeVy))*dt;
        // dash_shot: fire cone halfway through charge
        if(b.dashShotPending&&b.chargeTraveled>bcfg.chargeDist*0.4){
          b.dashShotPending=false;
          const backAng=Math.atan2(-b.chargeVy,-b.chargeVx);
          for(let i=-1;i<=1;i++){
            const a=backAng+i*0.4;
            G.projectiles.push({x:b.x,y:b.y,vx:Math.cos(a)*350,vy:Math.sin(a)*350,
              traveled:0,maxRange:440,dmg:b.atk,hitTargets:new Set(),fromPlayer:false,color:b.color});
          }
        }
        if(!p.invincible&&dist(b.x,b.y,p.x,p.y)<b.size+16){
          const dmg=Math.max(1,applyDefPierce(b.atk,store.playerDEF,store));
          store.takeDamage(dmg); addFloat(p.x,p.y-30,`-${dmg}`,'#e74c3c');
          p.invincible=true; p.invTimer=0.6;
        }
        if(b.chargeTraveled>=(G.bossPhase===2?bcfg.chargeDist*1.2:bcfg.chargeDist)){
          b.chargeState='idle'; b.dashShotPending=false;
          G.bossChargeTimer=G.bossPhase===2?bcfg.chargeInterval*0.6:bcfg.chargeInterval;
        }
      }
      // Persist boss HP for checkpoint every 3 s
      G.bossHpSaveTimer=(G.bossHpSaveTimer||0)+dt;
      if(G.bossHpSaveTimer>=3){ G.bossHpSaveTimer=0; saveBossCheckpoint(G.boss.hp,G.bossPhase); }
      } // end stun else
    }

    // Boss death → victory (only once)
    if(G.boss && !G.boss.alive && !G.victory){
      // XP — scale by boss xpReward from config
      const bossXP = G.boss.xpReward || 400;
      try{ store.gainXP(bossXP); }catch(e){}
      try{ if(realmId && store.defeatBoss) store.defeatBoss(realmId); }catch(e){}
      clearBossCheckpoint();
      hapticBossDeath(); sfxBossDeath();
      G.victory=true;
      G.victoryPortal={ x:G.boss.x, y:G.boss.y };
      G.victoryBannerTimer=5.0;
      G.enemies.forEach(e=>{ e.alive=false; });
      G.projectiles=[];

      // Process all boss drops (essence, ore, fire_shard, gear items)
      const RESOURCE_KEYS = ['ore','stone','wood','fire_shard','forest_essence','wind_essence','earth_essence','fire_essence','ice_essence','ocean_essence','storm_essence','shadow_essence','lava_essence','void_essence'];
      let dropLines = [];
      if(G.boss.drops){
        G.boss.drops.forEach(drop => {
          if(Math.random() > drop.chance) return;
          if(RESOURCE_KEYS.includes(drop.item)){
            store.addResource(drop.item, drop.amount || 1);
            // Label essence drops nicely
            if(drop.item.endsWith('_essence')){
              const label = drop.item.replace('_essence','').charAt(0).toUpperCase() + drop.item.replace('_essence','').slice(1);
              dropLines.push({ text:`✦ ${label} Essence`, color:'#d4af37' });
            } else {
              dropLines.push({ text:`+${drop.amount} ${drop.item}`, color:'#7ed321' });
            }
          } else if(drop.item === 'shadow_armor'){
            const item={id:'shadow_armor',name:'Shadow Armor',slot:'armor',tier:'iron',rarity:'rare',def:14,instanceId:`item_${Date.now()}_shadow_armor`};
            if(store.addItem(item)) dropLines.push({ text:'🌑 Shadow Armor!', color:'#9b59b6' });
          } else if(drop.item === 'gear_drop_rare_weapon'){
            const TYPES=['sword','hammer','bow','dagger'];
            const ABILITY={sword:'whirlwind',hammer:'ground_slam',bow:'power_shot',dagger:'flurry'};
            const type=TYPES[Math.floor(Math.random()*TYPES.length)];
            const item={id:`steel_${type}_rare`,name:`Steel ${type.charAt(0).toUpperCase()+type.slice(1)}`,slot:'weapon',type,tier:'steel',rarity:'rare',atk:31,abilityId:ABILITY[type],instanceId:`item_${Date.now()}_${type}`};
            if(store.addItem(item)) dropLines.push({ text:`💎 Rare ${item.name}!`, color:'#3498db' });
          }
        });
      }

      // Show reward floats staggered above boss
      addFloat(G.boss.x, G.boss.y-60,'VICTORY!','#f1c40f',true);
      addFloat(G.boss.x, G.boss.y-92,`+${bossXP} XP`,'#9b59b6',true);
      dropLines.forEach((line, i) => {
        addFloat(G.boss.x, G.boss.y - 124 - i*28, line.text, line.color, false);
      });

      // Store reward lines for victory banner
      G.victoryDrops = dropLines;
    }

    // Victory banner countdown — movement still works
    if(G.victoryBannerTimer>0) G.victoryBannerTimer-=dt;

    // Victory portal walk-in
    if(G.victory && G.victoryPortal){
      if(dist(p.x,p.y,G.victoryPortal.x,G.victoryPortal.y)<48){
        onFlee(); return;
      }
    }

    // Floats
    G.floats=G.floats.map(f=>({...f,y:f.y+f.vy*dt,life:f.life-dt})).filter(f=>f.life>0);
  }

  function render(ctx){
    const p=G.player; const cx=G.camera.x; const cy=G.camera.y;
    const wxf=x=>Math.round(x-cx+G.W/2);
    const wyf=y=>Math.round(y-cy+G.H/2);
    const onScreen=(sx,sy,pad=50)=>sx>-pad&&sx<G.W+pad&&sy>-pad&&sy<G.H+pad;
    const t=G.t;

    // Sky
    ctx.fillStyle=cfg.skyColor; ctx.fillRect(0,0,G.W,G.H);

    // Base tiles with variation
    const txS=Math.max(0,Math.floor((cx-G.W/2)/TILE));
    const txE=Math.min(ARENA_W,Math.ceil((cx+G.W/2)/TILE)+1);
    const tyS=Math.max(0,Math.floor((cy-G.H/2)/TILE));
    const tyE=Math.min(ARENA_H,Math.ceil((cy+G.H/2)/TILE)+1);
    for(let ty=tyS;ty<tyE;ty++) for(let tx=txS;tx<txE;tx++){
      ctx.fillStyle=arenaTile(tx,ty,cfg);
      ctx.fillRect(wxf(tx*TILE),wyf(ty*TILE),TILE+1,TILE+1);
    }

    // Floor detail (grass, cracks, runes, etc.)
    drawFloorDetail(ctx, cfg, wxf, wyf, cx, cy, G.W, G.H, t);

    // Arena tree/pillar decorations
    for(const [ttx,tty] of (cfg.treePositions||[])){
      const sx=wxf(ttx*TILE+16), sy=wyf(tty*TILE+16);
      if(!onScreen(sx,sy,80)) continue;
      drawArenaTree(ctx,sx,sy,cfg);
    }

    // Enemy projectiles
    G.projectiles.filter(pr=>!pr.fromPlayer).forEach(pr=>{
      // Slam ring — pulsing AoE indicator
      if(pr.slamRadius){
        const sb=G.boss; const sx=wxf(sb?sb.x:pr.x); const sy=wyf(sb?sb.y:pr.y);
        const pct=1-Math.max(0,(pr.slamTimer||0)/0.5);
        ctx.globalAlpha=0.35+pct*0.3;
        ctx.strokeStyle='#c0392b'; ctx.lineWidth=4;
        ctx.beginPath();ctx.arc(sx,sy,pr.slamRadius*pct,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=0.08+pct*0.1; ctx.fillStyle='#c0392b';
        ctx.beginPath();ctx.arc(sx,sy,pr.slamRadius*pct,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1; return;
      }
      if((pr.spawnDelay||0)>0) return; // not visible yet
      const px=wxf(pr.x),py=wyf(pr.y);
      const pc=pr.color||cfg.accent;
      const isHoming=pr.homing&&(pr.homingTimer||0)<=0;
      const radius=isHoming?10:8;
      ctx.globalAlpha=0.92; ctx.fillStyle=pc;
      ctx.beginPath();ctx.arc(px,py,radius,0,Math.PI*2);ctx.fill();
      // Glow ring — larger for homing
      ctx.globalAlpha=isHoming?0.5:0.35; ctx.strokeStyle=pc; ctx.lineWidth=isHoming?4:3;
      ctx.beginPath();ctx.arc(px,py,radius+5,0,Math.PI*2);ctx.stroke();
      // Homing: spinning indicator
      if(isHoming){
        ctx.globalAlpha=0.7; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
        const ta=G.t*4;
        ctx.beginPath();ctx.arc(px,py,radius+10,ta,ta+Math.PI*0.8);ctx.stroke();
      }
      ctx.globalAlpha=1;
    });

    // Player projectiles
    G.projectiles.filter(pr=>pr.fromPlayer).forEach(pr=>{
      const px=wxf(pr.x),py=wyf(pr.y);
      ctx.globalAlpha=0.35;ctx.strokeStyle='#FCD34D';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-(pr.vx/420)*22,py-(pr.vy/420)*22);ctx.stroke();
      ctx.globalAlpha=0.6;ctx.fillStyle='#F97316';ctx.beginPath();ctx.arc(px,py,10,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;ctx.fillStyle='#FCD34D';ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();
    });

    // Enemies
    G.enemies.filter(e=>e.alive).forEach(e=>{
      const ex=wxf(e.x),ey=wyf(e.y); if(!onScreen(ex,ey)) return;
      drawEnemySprite(ctx,e,ex,ey);
      // HP bar
      const bw=e.size*2+8;
      ctx.fillStyle='#222';ctx.fillRect(ex-bw/2,ey-e.size-12,bw,5);
      const hpColor=e.hp/e.maxHp>0.5?'#2ecc71':'#e74c3c';
      ctx.fillStyle=hpColor;ctx.fillRect(ex-bw/2,ey-e.size-12,bw*(e.hp/e.maxHp||1),5);
    });

    // Boss
    if(G.boss&&G.boss.alive){
      const b=G.boss; const bx=wxf(b.x),by=wyf(b.y);
      // Telegraph indicator
      if(b.chargeState==='telegraph'){
        const pct=1-b.telegraphTimer/cfg.boss.chargeTelegraph;
        ctx.globalAlpha=0.5+pct*0.3;ctx.strokeStyle='#e74c3c';ctx.lineWidth=3;
        ctx.setLineDash([10,5]);
        ctx.beginPath();ctx.moveTo(bx,by);
        ctx.lineTo(wxf(b.telegraphTargetX),wyf(b.telegraphTargetY));
        ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
      }
      drawBossSprite(ctx,b,bx,by,G.bossPhase,t);
    }

    // Ability effect
    if(G.abilityEffect){
      const fx=G.abilityEffect,px=wxf(fx.x),py=wyf(fx.y);
      const pr=1-(fx.timer/fx.maxTimer),al=fx.timer/fx.maxTimer;
      const col=ABILITY_COLORS[fx.id]||{primary:'#fff',secondary:'#aaa'};
      ctx.globalAlpha=al*0.85;
      if(fx.id==='whirlwind'){
        const r=fx.maxRadius*pr; ctx.strokeStyle=col.primary;ctx.lineWidth=4;
        ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.stroke();
        for(let i=0;i<6;i++){
          const a=(i/6)*Math.PI*2+pr*Math.PI*4;
          ctx.strokeStyle=col.secondary;ctx.lineWidth=2;
          ctx.beginPath();ctx.arc(px+Math.cos(a)*r*0.5,py+Math.sin(a)*r*0.5,r*0.25,a+0.5,a+2.5);ctx.stroke();
        }
      } else if(fx.id==='ground_slam'){
        for(let ring=0;ring<4;ring++){
          const rp=Math.max(0,pr-ring*0.12);const r=fx.maxRadius*rp;if(r<=0)continue;
          ctx.strokeStyle=ring===0?col.primary:col.secondary;ctx.lineWidth=Math.max(1,5-ring*1.2);
          ctx.globalAlpha=al*(1-ring*0.2)*0.85;
          ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.stroke();
        }
      } else {
        const r=fx.maxRadius*pr; ctx.strokeStyle=col.primary;ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.stroke();
      }
      ctx.globalAlpha=1;
    }

    // Victory banner (render only — no update logic here)
    if(G.victoryBannerTimer>0){
      const bt=G.victoryBannerTimer;
      const alpha=bt>4?1:bt/4;
      ctx.globalAlpha=alpha*0.88;
      ctx.fillStyle='#000000';
      ctx.fillRect(0,G.H*0.28,G.W,220);
      ctx.globalAlpha=alpha;
      ctx.textAlign='center';
      ctx.font='bold 36px sans-serif';
      ctx.fillStyle='#f1c40f';
      ctx.strokeStyle='#000'; ctx.lineWidth=3;
      ctx.strokeText('VICTORY!',G.W/2,G.H*0.28+56);
      ctx.fillText('VICTORY!',G.W/2,G.H*0.28+56);
      ctx.font='18px sans-serif'; ctx.fillStyle='#ffffff';
      ctx.fillText(`${cfg.boss.icon}  ${cfg.boss.name} Defeated`,G.W/2,G.H*0.28+90);
      ctx.fillStyle=cfg.accent; ctx.font='bold 15px sans-serif';
      ctx.fillText(`${cfg.reward.icon}  ${cfg.reward.label} Awarded`,G.W/2,G.H*0.28+122);
      ctx.font='+200 XP awarded'; // label trick — just draw the text
      ctx.fillStyle='#9b59b6'; ctx.font='bold 13px sans-serif';
      ctx.fillText('+200 XP Awarded',G.W/2,G.H*0.28+150);
      ctx.fillStyle='#ffffff88'; ctx.font='12px sans-serif';
      ctx.fillText('Walk into the portal to return',G.W/2,G.H*0.28+176);
      ctx.globalAlpha=1;
    }

    // Victory portal
    if(G.victory&&G.victoryPortal){
      const vp=G.victoryPortal;
      const vpx=wxf(vp.x),vpy=wyf(vp.y);
      const pulse=0.65+Math.sin(t*3)*0.35;
      // Outer glow
      ctx.globalAlpha=pulse*0.35; ctx.fillStyle=cfg.accent;
      ctx.beginPath();ctx.arc(vpx,vpy,64,0,Math.PI*2);ctx.fill();
      // Mid ring rotating
      ctx.globalAlpha=0.5; ctx.strokeStyle=cfg.accent; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(vpx,vpy,48,t*1.5,t*1.5+Math.PI*1.5); ctx.stroke();
      // Inner counter-rotating
      ctx.strokeStyle='#ffffff'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(vpx,vpy,34,-t*2,-t*2+Math.PI*1.2); ctx.stroke();
      // Portal face
      ctx.globalAlpha=0.92; ctx.fillStyle='#000000cc';
      ctx.beginPath();ctx.arc(vpx,vpy,30,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ffffff';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(vpx,vpy,30,0,Math.PI*2);ctx.stroke();
      // Rotating particles
      for(let i=0;i<10;i++){
        const a=(i/10)*Math.PI*2+t*2.2;
        const rx=vpx+Math.cos(a)*50,ry=vpy+Math.sin(a)*50;
        ctx.globalAlpha=pulse*0.9; ctx.fillStyle=cfg.accent;
        ctx.beginPath();ctx.arc(rx,ry,4,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;
      ctx.fillStyle='#ffffff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';
      ctx.strokeStyle='#000';ctx.lineWidth=3;
      ctx.strokeText('RETURN TO WORLD',vpx,vpy-54);
      ctx.fillText('RETURN TO WORLD',vpx,vpy-54);
      ctx.fillStyle='#ffffff88';ctx.font='11px sans-serif';
      ctx.fillText('walk into the portal',vpx,vpy-38);
    }

    // Attack flash
    if(G.attackFlash){
      const af=G.attackFlash,al=af.timer/0.18;
      ctx.globalAlpha=al*0.7;
      if(af.type==='melee'){
        ctx.strokeStyle='#ffffffcc';ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(wxf(af.x),wyf(af.y),af.rng||60,0,Math.PI*2);ctx.stroke();
      } else {
        ctx.strokeStyle='#FCD34Dcc';ctx.lineWidth=4;
        ctx.beginPath();
        ctx.moveTo(wxf(af.x),wyf(af.y));
        ctx.lineTo(wxf(af.x)+Math.cos(af.ang||0)*80,wyf(af.y)+Math.sin(af.ang||0)*80);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }

    // Player — top-down Zelda-style
    const ppx=wxf(p.x),ppy=wyf(p.y);
    const blinkOn=!p.invincible||Math.sin(Date.now()/80)>0;
    ctx.globalAlpha=blinkOn?1:0.2;
    ctx.save();

    // Walk cycle
    const walkCycle=Math.sin(G.t*9);
    const dir=G.lastMoveDir;
    const moving=(dir.x!==0||dir.y!==0);
    const legSwing=moving?walkCycle*3:0;

    // Ground shadow
    ctx.fillStyle='#00000033';
    ctx.beginPath();ctx.ellipse(ppx,ppy+16,12,4,0,0,Math.PI*2);ctx.fill();

    // ── Skin palette ─────────────────────────────────────────────────────────
    const { activeSkin: _rSkin } = useGameStore.getState();
    const REALM_SKINS = {
      shadow_knight: { cape:'#1a1a2e', tunic1:'#2c003e', tunic2:'#4b0082', belt:'#6a0dad', helmet:'#1a0030', helmetFace:'#4b0082', helmetVisor:'#9b59b6', shield1:'#2c003e', shield2:'#6a0dad', boot:'#0d0010' },
      gods_chosen:   { cape:'#7d6008', tunic1:'#b8860b', tunic2:'#d4af37', belt:'#f1c40f', helmet:'#7d6008', helmetFace:'#d4af37', helmetVisor:'#fffde7', shield1:'#b8860b', shield2:'#f1c40f', boot:'#5a4500' },
      frost_warden:  { cape:'#c8eeff', tunic1:'#e8f8ff', tunic2:'#ffffff', belt:'#80d8ff', helmet:'#b0e0ff', helmetFace:'#e8f8ff', helmetVisor:'#ffffff', shield1:'#7ecfff', shield2:'#b3ecff', boot:'#6abcdf' },
    };
    const RSK = REALM_SKINS[_rSkin] || { cape:'#1a4a7a', tunic1:'#2980b9', tunic2:'#3498db', belt:'#1a5276', helmet:'#1a5276', helmetFace:'#2980b9', helmetVisor:'#85c1e9', shield1:'#2471a3', shield2:'#e74c3c', boot:'#6b4226' };

    // Cloak / cape (behind body)
    ctx.fillStyle=RSK.cape;
    ctx.beginPath();
    ctx.moveTo(ppx-8,ppy+2);
    ctx.bezierCurveTo(ppx-14,ppy+12,ppx-10,ppy+24,ppx-4,ppy+22);
    ctx.lineTo(ppx+4,ppy+22);
    ctx.bezierCurveTo(ppx+10,ppy+24,ppx+14,ppy+12,ppx+8,ppy+2);
    ctx.closePath();ctx.fill();

    // Boots
    ctx.fillStyle=RSK.boot;
    const lbx=ppx-5+legSwing, rbx=ppx+5-legSwing;
    ctx.beginPath();ctx.ellipse(lbx,ppy+20,5,4,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(rbx,ppy+20,5,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=RSK.boot+'cc';
    ctx.beginPath();ctx.ellipse(lbx-1,ppy+18,3,2,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(rbx-1,ppy+18,3,2,0,0,Math.PI*2);ctx.fill();

    // Tunic body
    ctx.fillStyle=RSK.tunic1;
    ctx.beginPath();
    ctx.moveTo(ppx-11,ppy+4);
    ctx.lineTo(ppx-9,ppy-6);
    ctx.quadraticCurveTo(ppx,ppy-10,ppx+9,ppy-6);
    ctx.lineTo(ppx+11,ppy+4);
    ctx.quadraticCurveTo(ppx,ppy+10,ppx-11,ppy+4);
    ctx.closePath();ctx.fill();
    ctx.fillStyle=RSK.tunic2;
    ctx.beginPath();
    ctx.moveTo(ppx-6,ppy+2);
    ctx.lineTo(ppx-5,ppy-5);
    ctx.quadraticCurveTo(ppx,ppy-8,ppx+5,ppy-5);
    ctx.lineTo(ppx+6,ppy+2);
    ctx.quadraticCurveTo(ppx,ppy+7,ppx-6,ppy+2);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle=RSK.belt;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(ppx-10,ppy+3);ctx.lineTo(ppx+10,ppy+3);ctx.stroke();
    ctx.fillStyle='#f1c40f'; ctx.fillRect(ppx-3,ppy+1,6,4);

    // Left arm + shield
    const lArmSway=moving?Math.sin(G.t*9+Math.PI)*4:0;
    ctx.fillStyle=RSK.shield1;
    ctx.fillRect(ppx-17,ppy-4+lArmSway,5,10);
    ctx.fillStyle=RSK.shield2;
    ctx.beginPath();
    ctx.moveTo(ppx-22,ppy-5+lArmSway);
    ctx.lineTo(ppx-14,ppy-5+lArmSway);
    ctx.lineTo(ppx-14,ppy+4+lArmSway);
    ctx.quadraticCurveTo(ppx-18,ppy+9+lArmSway,ppx-22,ppy+4+lArmSway);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle='#922b21';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(ppx-18,ppy-4+lArmSway);ctx.lineTo(ppx-18,ppy+4+lArmSway);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ppx-22,ppy+lArmSway);ctx.lineTo(ppx-15,ppy+lArmSway);ctx.stroke();
    ctx.fillStyle='#f39c12';
    ctx.beginPath();ctx.arc(ppx-18,ppy+lArmSway,2.5,0,Math.PI*2);ctx.fill();

    // Right arm + sword
    const rArmSway=moving?Math.sin(G.t*9)*4:0;
    ctx.fillStyle=RSK.shield1;
    ctx.fillRect(ppx+12,ppy-4+rArmSway,5,10);
    ctx.strokeStyle='#d5d8dc';ctx.lineWidth=2.5;ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(ppx+18,ppy-2+rArmSway);
    ctx.lineTo(ppx+18,ppy-22+rArmSway);
    ctx.stroke();
    ctx.strokeStyle='#f1c40f';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(ppx+14,ppy-4+rArmSway);ctx.lineTo(ppx+22,ppy-4+rArmSway);ctx.stroke();
    // Handle
    ctx.strokeStyle='#6b4226';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(ppx+18,ppy+2+rArmSway);ctx.lineTo(ppx+18,ppy+7+rArmSway);ctx.stroke();
    ctx.lineCap='butt';

    // Head — hero helmet
    ctx.fillStyle=RSK.helmet;
    ctx.beginPath();ctx.arc(ppx,ppy-12,11,0,Math.PI*2);ctx.fill();
    // Helmet faceplate
    ctx.fillStyle=RSK.helmetFace;
    ctx.beginPath();ctx.arc(ppx,ppy-11,9,Math.PI*0.1,Math.PI*0.9);ctx.fill();
    // Visor slit
    ctx.fillStyle=RSK.helmetVisor;
    ctx.beginPath();ctx.roundRect(ppx-6,ppy-13,12,4,2);ctx.fill();
    // Visor shine
    ctx.fillStyle='#aed6f1';ctx.globalAlpha=blinkOn?0.7:0.1;
    ctx.beginPath();ctx.roundRect(ppx-4,ppy-13,5,2,1);ctx.fill();
    ctx.globalAlpha=blinkOn?1:0.2;
    // Helmet plume / feather
    ctx.fillStyle='#f1c40f';
    ctx.beginPath();
    ctx.moveTo(ppx-2,ppy-22);
    ctx.bezierCurveTo(ppx+4,ppy-30,ppx+10,ppy-28,ppx+8,ppy-22);
    ctx.bezierCurveTo(ppx+6,ppy-20,ppx+2,ppy-21,ppx-2,ppy-22);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='#f39c12';
    ctx.beginPath();
    ctx.moveTo(ppx,ppy-22);
    ctx.bezierCurveTo(ppx+3,ppy-27,ppx+7,ppy-25,ppx+6,ppy-22);
    ctx.bezierCurveTo(ppx+4,ppy-20,ppx+2,ppy-21,ppx,ppy-22);
    ctx.closePath();ctx.fill();

    // Invincible outline flash
    if(p.invincible){
      ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.globalAlpha=0.9;
      ctx.beginPath();ctx.arc(ppx,ppy-2,20,0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=1;
    ctx.restore();

    // Floats
    G.floats.forEach(f=>{
      const fx=wxf(f.x),fy=wyf(f.y);
      ctx.globalAlpha=Math.max(0,f.life);
      ctx.font=`bold ${f.big?16:13}px sans-serif`;ctx.textAlign='center';
      ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(f.text,fx,fy);
      ctx.fillStyle=f.color;ctx.fillText(f.text,fx,fy);
    });
    ctx.globalAlpha=1;

    // Boss HP bar (bottom)
    const wx2=G.W/2; ctx.textAlign='center';
    if(G.boss&&G.boss.alive){
      const b=G.boss; const bpct=Math.max(0,b.hp/b.maxHp);
      const barY=G.H-80;
      ctx.fillStyle='#000000dd';
      ctx.fillRect(0,barY-28,G.W,76);
      ctx.fillStyle=b.color;ctx.font='bold 13px sans-serif';ctx.textAlign='center';
      ctx.fillText(`${b.icon}  ${b.name.toUpperCase()}${G.bossPhase===2?'  ⚡ PHASE 2':''}`,wx2,barY-10);
      const pad=16,bh=20;
      ctx.fillStyle='#333';ctx.fillRect(pad,barY,G.W-pad*2,bh);
      const hpColor=bpct>0.5?b.color:bpct>0.25?'#e67e22':'#e74c3c';
      ctx.fillStyle=hpColor;ctx.fillRect(pad,barY,(G.W-pad*2)*bpct,bh);
      ctx.strokeStyle='#ffffff33';ctx.lineWidth=1;ctx.strokeRect(pad,barY,G.W-pad*2,bh);
      ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';
      ctx.fillText(`${b.hp} / ${b.maxHp}  (${Math.round(bpct*100)}%)`,wx2,barY+bh/2+4);
    } else if(G.wave!=='boss'&&!G.victory){
      ctx.fillStyle='#ffffff88';ctx.font='bold 11px sans-serif';
      ctx.fillText(`Wave ${G.wave} / ${cfg.waves.length}`,wx2,20);
    }
  }

  return (
    <div style={{ position:'absolute',inset:0 }}>
      <canvas ref={canvasRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',display:'block',touchAction:'none' }} />
      {!G.victory && (
        <button onPointerDown={onFlee}
          style={{ position:'absolute',top:54,right:14,background:'#000000cc',border:'1px solid #ffffff55',
            borderRadius:10,padding:'10px 16px',color:'#ffffffcc',fontSize:13,fontWeight:'bold',cursor:'pointer',zIndex:100 }}>
          ✕ Flee
        </button>
      )}
    </div>
  );
}

