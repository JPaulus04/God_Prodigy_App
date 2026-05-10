import React, { useEffect, useRef } from 'react';
import { useGameStore }  from '../store/useGameStore';
import { InputState }    from '../game/systems/InputState';
import { EnemyConfig }   from '../game/config/EnemyConfig';
import { AbilityConfig } from '../game/config/AbilityConfig';

const TILE     = 32;
const DUNGEON_W = 40;
const DUNGEON_H = 16;
const WORLD_W   = DUNGEON_W * TILE;
const WORLD_H   = DUNGEON_H * TILE;

// Room boundaries
const DOOR1_X  = 13 * TILE;   // between room 1 and room 2
const DOOR2_X  = 27 * TILE;   // between room 2 and boss room
const BOSS_X   = 31 * TILE;   // dungeon champion spawn
const EXIT_X   = 2  * TILE;   // exit portal
const CHEST_X  = 36 * TILE;   // reward chest position
const CHEST_Y  = 8  * TILE;

// Torch positions
const TORCHES = [
  { x: 4*TILE,  y: 2*TILE },  { x: 4*TILE,  y: 14*TILE },
  { x: 10*TILE, y: 2*TILE },  { x: 10*TILE, y: 14*TILE },
  { x: 18*TILE, y: 2*TILE },  { x: 18*TILE, y: 14*TILE },
  { x: 24*TILE, y: 2*TILE },  { x: 24*TILE, y: 14*TILE },
  { x: 32*TILE, y: 2*TILE },  { x: 32*TILE, y: 14*TILE },
  { x: 38*TILE, y: 2*TILE },  { x: 38*TILE, y: 14*TILE },
];

function dungeonTileColor(tx, ty, door1Open, door2Open) {
  // Outer walls
  if (ty === 0 || ty >= DUNGEON_H - 1 || tx === 0 || tx >= DUNGEON_W - 1) return '#080810';
  // Inner wall bands (top/bottom of corridors)
  if ((tx >= 13 && tx <= 14) && (ty < 5 || ty > 10)) return '#080810';
  if ((tx >= 27 && tx <= 28) && (ty < 5 || ty > 10)) return '#080810';
  // Doors — blocking if not open
  if (!door1Open && tx >= 13 && tx <= 14 && ty >= 5 && ty <= 10) return '#1a1a30';
  if (!door2Open && tx >= 27 && tx <= 28 && ty >= 5 && ty <= 10) return '#1a1a30';
  // Boss room — slightly different
  if (tx >= 29) return '#10101c';
  return '#14141e';
}

function dist(ax, ay, bx, by) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// Enemy definitions per room
const ROOM1_DEFS = [
  { type: 'shadow_stalker', x:  7*TILE, y:  5*TILE },
  { type: 'shadow_stalker', x: 10*TILE, y:  9*TILE },
  { type: 'shadow_stalker', x: 12*TILE, y:  6*TILE },
  { type: 'shadow_stalker', x:  8*TILE, y: 11*TILE },
];
const ROOM2_DEFS = [
  { type: 'shadow_stalker', x: 17*TILE, y:  5*TILE },
  { type: 'shadow_stalker', x: 22*TILE, y: 10*TILE },
  { type: 'stone_guardian', x: 20*TILE, y:  8*TILE },
];
const ROOM3_DEFS = [
  { type: 'shadow_stalker',   x: 30*TILE, y:  4*TILE },
  { type: 'shadow_stalker',   x: 30*TILE, y: 12*TILE },
  { type: 'dungeon_champion', x: 34*TILE, y:  8*TILE },
];

function makeEnemy(def) {
  const cfg = EnemyConfig[def.type];
  return {
    type: def.type, x: def.x, y: def.y,
    originX: def.x, originY: def.y,
    hp: cfg.hp, maxHp: cfg.hp,
    state: 'idle', alive: true,
    attackTimer: 0, stunTimer: 0, alerted: false,
    phase2: false,
    isBoss: cfg.isBoss || false,
  };
}

const ABILITY_COLORS = {
  whirlwind:    '#4a90e2',
  ground_slam:  '#c0392b',
  power_shot:   '#FCD34D',
  flurry:       '#f39c12',
  arcane_burst: '#9b59b6',
};

export default function DungeonCanvas() {
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const lastTimeRef = useRef(0);

  // React subscriptions for effects
  const showDeathModal = useGameStore(s => s.showDeathModal);
  const prevDeath = useRef(false);

  const G = useRef({
    player:   { x: 3*TILE, y: 8*TILE, attackCooldown: 0, invincible: true, invTimer: 2.0 },
    camera:   { x: 3*TILE, y: WORLD_H / 2 },

    // Enemies per room — loaded all at once, gated by doors
    room1Enemies: ROOM1_DEFS.map(makeEnemy),
    room2Enemies: ROOM2_DEFS.map(makeEnemy),
    room3Enemies: ROOM3_DEFS.map(makeEnemy),

    door1Open: false,
    door2Open: false,

    // Chest state
    chestSpawned: false,
    chestOpened:  false,

    floats:      [],
    npcMessage:  null,
    abilityCooldown: 0,
    abilityEffect:   null,
    projectiles:     [],
    basicArrows:     [],
    attackEffect:    null,
    lastMoveDir:     { x: 1, y: 0 },

    keys:        {},
    prevSpace:   false,
    prevE:        false,
    prevAbility:  false,
    regenTimer:   0,
    W: 390, H: 844,
  }).current;

  const addFloat = (x, y, text, color = '#fff', big = false) => {
    G.floats.push({ x, y, text, color, life: big ? 1.5 : 1.2, vy: big ? -50 : -40, big });
  };

  const allEnemies = () => [...G.room1Enemies, ...G.room2Enemies, ...G.room3Enemies];

  const killEnemy = (e, store) => {
    e.alive = false;
    const cfg = EnemyConfig[e.type];
    const xp  = cfg?.xpReward || 10;
    store.gainXP(xp);
    addFloat(e.x, e.y - 50, `+${xp} XP`, '#9b59b6');

    cfg?.drops?.forEach(drop => {
      if (Math.random() >= drop.chance) return;
      if (['wood','stone','ore','fire_shard'].includes(drop.item)) {
        store.addResource(drop.item, drop.amount);
        addFloat(e.x, e.y - 36, `+${drop.amount} ${drop.item}`, '#7ed321');
      }
    });

    // Boss kill → spawn chest
    if (e.isBoss) {
      G.chestSpawned = true;
      addFloat(e.x, e.y - 60, '★ DUNGEON CLEARED! ★', '#d4af37', true);
    }
  };

  // Respawn handling (same as world)
  useEffect(() => {
    if (prevDeath.current && !showDeathModal) {
      // Respawn at dungeon entrance on death
      G.player.x = 3 * TILE;
      G.player.y = 8 * TILE;
      G.player.invincible = true;
      G.player.invTimer   = 3.0;
    }
    prevDeath.current = showDeathModal;
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
    if (store.showDeathModal) return;

    const p = G.player;

    if (G.npcMessage)    { G.npcMessage.timer -= dt; if (G.npcMessage.timer <= 0) G.npcMessage = null; }
    if (G.abilityEffect) { G.abilityEffect.timer -= dt; if (G.abilityEffect.timer <= 0) G.abilityEffect = null; }
    if (G.attackEffect)  { G.attackEffect.timer  -= dt; if (G.attackEffect.timer  <= 0) G.attackEffect  = null; }
    if (G.abilityCooldown > 0) G.abilityCooldown = Math.max(0, G.abilityCooldown - dt);
    if (p.invincible) { p.invTimer -= dt; if (p.invTimer <= 0) p.invincible = false; }
    if (p.attackCooldown > 0) p.attackCooldown -= dt;

    // Door auto-open logic
    const room1Clear = G.room1Enemies.every(e => !e.alive);
    const room2Clear = G.room2Enemies.every(e => !e.alive);
    if (room1Clear && !G.door1Open) {
      G.door1Open = true;
      addFloat(DOOR1_X, DUNGEON_H/2*TILE, '✓ Room Cleared!', '#2ecc71', true);
    }
    if (room2Clear && G.door1Open && !G.door2Open) {
      G.door2Open = true;
      addFloat(DOOR2_X, DUNGEON_H/2*TILE, '✓ Room Cleared!', '#2ecc71', true);
    }

    // Movement
    let vx = 0, vy = 0;
    if (G.keys['ArrowLeft']  || G.keys['KeyA']) vx -= 1;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) vx += 1;
    if (G.keys['ArrowUp']    || G.keys['KeyW']) vy -= 1;
    if (G.keys['ArrowDown']  || G.keys['KeyS']) vy += 1;
    if (InputState.joystick.active) { vx = InputState.joystick.x; vy = InputState.joystick.y; }
    if (vx !== 0 && vy !== 0) { const m = Math.sqrt(vx*vx+vy*vy); vx/=m; vy/=m; }
    if (vx !== 0 || vy !== 0) G.lastMoveDir = { x: vx, y: vy };

    const spd = 150 + (store.playerSPD - 5) * 12;
    p.x += vx * spd * dt;
    p.y += vy * spd * dt;

    // Dungeon bounds
    p.x = Math.max(TILE + 4, Math.min(WORLD_W - TILE - 4, p.x));
    p.y = Math.max(TILE * 2 + 4, Math.min(WORLD_H * TILE - TILE * 2 - 4, p.y));
    // Actually clamp y properly
    p.y = Math.max(2.5*TILE, Math.min((DUNGEON_H - 2.5)*TILE, p.y));

    // Door blocking
    if (!G.door1Open) p.x = Math.min(p.x, DOOR1_X - 20);
    if (!G.door2Open) p.x = Math.min(p.x, DOOR2_X - 20);

    // Wall blocking
    p.x = Math.max(1.5*TILE, Math.min((DUNGEON_W-1.5)*TILE, p.x));

    // Camera
    G.camera.x += (p.x - G.camera.x) * Math.min(1, 8*dt);
    G.camera.y += ((DUNGEON_H/2)*TILE - G.camera.y) * Math.min(1, 8*dt);
    G.camera.x = Math.max(G.W/2, Math.min(WORLD_W - G.W/2, G.camera.x));
    G.camera.y = Math.max(G.H/2, Math.min(WORLD_H - G.H/2, G.camera.y));

    // ── Weapon type ───────────────────────────────────────
    const weaponInstanceId = store.gear?.weapon;
    const equippedWeapon   = weaponInstanceId ? store.inventory.find(i => i.instanceId === weaponInstanceId) : null;
    const weaponType       = equippedWeapon?.type || 'sword';
    const WEAPON_ATTACK    = {
      sword:  { cooldown: 0.60, range: 52  },
      hammer: { cooldown: 1.00, range: 66  },
      bow:    { cooldown: 0.70, range: 50, ranged: true },
      dagger: { cooldown: 0.32, range: 40  },
      staff:  { cooldown: 0.65, range: 72  },
    };
    const wAtk = WEAPON_ATTACK[weaponType] || WEAPON_ATTACK.sword;

    // ── Attack ─────────────────────────────────────────────
    const spaceNow  = G.keys['Space'] || window.__gameAttack;
    const spaceJust = spaceNow && !G.prevSpace;
    G.prevSpace = spaceNow;
    if (window.__gameAttack) window.__gameAttack = false;

    if (spaceJust && p.attackCooldown <= 0) {
      p.attackCooldown = wAtk.cooldown;
      if (wAtk.ranged) {
        let targetX = p.x + G.lastMoveDir.x*150, targetY = p.y + G.lastMoveDir.y*150;
        let nd = Infinity;
        allEnemies().forEach(e => {
          if (!e.alive) return;
          const d = dist(p.x, p.y, e.x, e.y);
          if (d < nd) { nd = d; targetX = e.x; targetY = e.y; }
        });
        const angle = Math.atan2(targetY-p.y, targetX-p.x);
        G.basicArrows.push({ x: p.x, y: p.y, vx: Math.cos(angle)*340, vy: Math.sin(angle)*340, traveled: 0, maxRange: 200, dmg: Math.max(1, store.playerATK), hitEnemies: new Set() });
      } else {
        allEnemies().forEach(e => {
          if (!e.alive || dist(p.x,p.y,e.x,e.y) > wAtk.range) return;
          const cfg = EnemyConfig[e.type];
          const dmg = Math.max(1, store.playerATK - (cfg.def||0));
          e.hp -= dmg;
          if (e.isBoss && !e.phase2 && e.hp <= e.maxHp * 0.5) {
            e.phase2 = true;
            addFloat(e.x, e.y-60, '⚠ ENRAGED!', '#e74c3c', true);
          }
          addFloat(e.x, e.y-20, `-${dmg}`, '#ff4444');
          if (e.hp <= 0) killEnemy(e, store);
        });
        if (weaponType !== 'sword') {
          G.attackEffect = { x: p.x, y: p.y, type: weaponType, range: wAtk.range, timer: 0.3, maxTimer: 0.3 };
        }
      }
    }

    // ── Ability ────────────────────────────────────────────
    const abilityNow  = G.keys['KeyQ'] || window.__gameAbility;
    const abilityJust = abilityNow && !G.prevAbility;
    G.prevAbility = abilityNow;
    if (window.__gameAbility) window.__gameAbility = false;

    if (abilityJust && G.abilityCooldown <= 0 && store.equippedAbilityId) {
      const ability = AbilityConfig[store.equippedAbilityId];
      if (ability) {
        G.abilityCooldown = ability.cooldown;
        store.recordAbilityFired(ability.cooldown);
        addFloat(p.x, p.y-55, ability.name, '#d4af37', true);

        if (ability.type === 'projectile') {
          let tx = p.x+G.lastMoveDir.x*200, ty = p.y+G.lastMoveDir.y*200, nd2 = Infinity;
          allEnemies().forEach(e => { if (!e.alive) return; const d=dist(p.x,p.y,e.x,e.y); if(d<nd2){nd2=d;tx=e.x;ty=e.y;} });
          const a2 = Math.atan2(ty-p.y, tx-p.x);
          G.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a2)*420, vy: Math.sin(a2)*420, traveled: 0, maxRange: ability.range, dmg: Math.max(1, Math.round(store.playerATK*ability.damageMult)), hitEnemies: new Set() });
        } else if (ability.type === 'multi_hit') {
          for (let i = 0; i < ability.hits; i++) {
            setTimeout(() => {
              const s2 = useGameStore.getState();
              allEnemies().forEach(e => {
                if (!e.alive || dist(G.player.x,G.player.y,e.x,e.y) > ability.range) return;
                const dmg = Math.max(1, Math.round(s2.playerATK * ability.damageMult));
                e.hp -= dmg; addFloat(e.x, e.y-20, `-${dmg}`, '#f39c12');
                if (e.hp <= 0) killEnemy(e, s2);
              });
            }, i * ability.hitDelay * 1000);
          }
        } else {
          allEnemies().forEach(e => {
            if (!e.alive || dist(p.x,p.y,e.x,e.y) > ability.range) return;
            const dmg = Math.max(1, Math.round(store.playerATK*ability.damageMult));
            e.hp -= dmg;
            if (ability.stunDuration) e.stunTimer = ability.stunDuration;
            addFloat(e.x, e.y-24, `-${dmg}`, '#ff6644');
            if (e.hp <= 0) killEnemy(e, store);
          });
        }
        G.abilityEffect = { id: store.equippedAbilityId, x: p.x, y: p.y, maxRadius: ability.range, timer: 0.7, maxTimer: 0.7 };
      }
    }

    // ── Update projectiles ─────────────────────────────────
    G.projectiles = G.projectiles.filter(proj => {
      proj.x += proj.vx*dt; proj.y += proj.vy*dt;
      proj.traveled += Math.sqrt(proj.vx**2+proj.vy**2)*dt;
      allEnemies().forEach(e => {
        if (!e.alive || proj.hitEnemies.has(e) || dist(proj.x,proj.y,e.x,e.y)>22) return;
        proj.hitEnemies.add(e);
        const cfg = EnemyConfig[e.type];
        const dmg = Math.max(1, proj.dmg - (cfg.def||0));
        e.hp -= dmg; e.alerted = true;
        addFloat(e.x,e.y-24,`-${dmg}`,'#FCD34D');
        if (e.hp <= 0) killEnemy(e, store);
      });
      return proj.traveled < proj.maxRange;
    });
    G.basicArrows = G.basicArrows.filter(arrow => {
      arrow.x += arrow.vx*dt; arrow.y += arrow.vy*dt;
      arrow.traveled += Math.sqrt(arrow.vx**2+arrow.vy**2)*dt;
      allEnemies().forEach(e => {
        if (!e.alive || arrow.hitEnemies.has(e) || dist(arrow.x,arrow.y,e.x,e.y)>18) return;
        arrow.hitEnemies.add(e);
        const cfg = EnemyConfig[e.type];
        const dmg = Math.max(1, arrow.dmg-(cfg.def||0));
        e.hp -= dmg; e.alerted = true;
        addFloat(e.x,e.y-20,`-${dmg}`,'#d4af37');
        if (e.hp <= 0) killEnemy(e, store);
      });
      return arrow.traveled < arrow.maxRange;
    });

    // ── Interact ───────────────────────────────────────────
    const eNow  = G.keys['KeyE'] || window.__gameInteract;
    const eJust = eNow && !G.prevE;
    G.prevE = eNow;
    if (window.__gameInteract) window.__gameInteract = false;

    if (eJust) {
      // Exit portal
      if (dist(p.x, p.y, EXIT_X, 8*TILE) < 60) {
        store.setGamePhase('world');
        return;
      }
      // Chest
      if (G.chestSpawned && !G.chestOpened && dist(p.x, p.y, CHEST_X, CHEST_Y) < 60) {
        G.chestOpened = true;
        store.addResource('fire_shard', 1);
        addFloat(CHEST_X, CHEST_Y-50, '🔥 Fire Shard!', '#e74c3c', true);
        const TYPES   = ['sword','hammer','bow','dagger'];
        const ABILITY = { sword:'whirlwind', hammer:'ground_slam', bow:'power_shot', dagger:'flurry' };
        const type    = TYPES[Math.floor(Math.random()*TYPES.length)];
        const name    = `Steel ${type.charAt(0).toUpperCase()+type.slice(1)}`;
        const item    = {
          id: `steel_${type}_rare`, name,
          slot: 'weapon', type, tier: 'steel', rarity: 'rare',
          atk: 31, abilityId: ABILITY[type],
          instanceId: `item_${Date.now()}_dungeon_${type}`,
        };
        if (store.addItem(item)) addFloat(CHEST_X, CHEST_Y-75, `💎 Rare ${name}!`, '#3498db', true);
        store.defeatBoss('dungeon_champion');
      }
    }

    // ── Passive regen ──────────────────────────────────────
    // Heal 1 HP per 4 seconds when no alive enemy is nearby
    const inCombat = allEnemies().some(e => e.alive && e.state === 'chase' || e.alive && e.state === 'attack');
    if (!inCombat && store.playerHP < store.playerMaxHP) {
      G.regenTimer += dt;
      if (G.regenTimer >= 4) { G.regenTimer = 0; store.healPlayer(1); }
    } else { G.regenTimer = 0; }

    // ── Enemy AI — room gated ─────────────────────────────
    // Enemies only activate when the player has reached their room
    const playerInRoom2 = p.x > DOOR1_X;
    const playerInRoom3 = p.x > DOOR2_X;

    allEnemies().forEach(e => {
      if (!e.alive) return;
      const cfg = EnemyConfig[e.type];

      // Stun check
      if (e.stunTimer > 0) { e.stunTimer -= dt; return; }

      // Room gating — enemies sleep until player enters their area
      const isRoom2Enemy = G.room2Enemies.includes(e);
      const isRoom3Enemy = G.room3Enemies.includes(e);
      if (isRoom2Enemy && !playerInRoom2) { e.state = 'idle'; return; }
      if (isRoom3Enemy && !playerInRoom3) { e.state = 'idle'; return; }

      // Phase 2 stat boost for boss
      const atkMult = (e.phase2 && cfg.phase2AtkMult) ? cfg.phase2AtkMult : 1;
      const spdMult = (e.phase2 && cfg.phase2SpeedMult) ? cfg.phase2SpeedMult : 1;

      const d = dist(p.x, p.y, e.x, e.y);
      e.attackTimer = Math.max(0, (e.attackTimer||0) - dt);

      // Aggro range — shadow stalkers have wide aggro, boss always aggros in its room
      const aggroRange = e.isBoss ? 400 : (e.type === 'stone_guardian' ? 200 : 180);

      if (d <= cfg.attackRange) {
        e.state = 'attack';
        if (e.attackTimer <= 0 && !p.invincible) {
          e.attackTimer = (cfg.attackCooldown/1000) / atkMult;
          const dmg = Math.max(1, Math.round(cfg.atk * atkMult) - store.playerDEF);
          store.takeDamage(dmg);
          p.invincible = true; p.invTimer = 0.7;
        }
      } else if (d <= aggroRange || e.state === 'chase' || e.alerted) {
        // Chase if in range, already chasing, or alerted by ranged hit
        e.state = 'chase';
        const angle = Math.atan2(p.y-e.y, p.x-e.x);
        const speed = cfg.speed * spdMult;
        e.x += Math.cos(angle)*speed*dt;
        e.y += Math.sin(angle)*speed*dt;
      } else {
        e.state = 'idle';
      }

      // Dungeon bounds
      e.x = Math.max(1.5*TILE, Math.min((DUNGEON_W-1.5)*TILE, e.x));
      e.y = Math.max(2.5*TILE, Math.min((DUNGEON_H-2.5)*TILE, e.y));
    });

    G.floats = G.floats
      .map(f => ({ ...f, y: f.y + f.vy*dt, life: f.life - dt }))
      .filter(f => f.life > 0);
  }

  function render(ctx, W, H) {
    const p  = G.player;
    const cx = G.camera.x;
    const cy = G.camera.y;
    const wx = x => Math.round(x - cx + W/2);
    const wy = y => Math.round(y - cy + H/2);
    const onScreen = (sx, sy, pad=60) => sx>-pad && sx<W+pad && sy>-pad && sy<H+pad;

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, W, H);

    // Tiles
    const txS = Math.max(0, Math.floor((cx-W/2)/TILE));
    const txE = Math.min(DUNGEON_W, Math.ceil((cx+W/2)/TILE)+1);
    const tyS = Math.max(0, Math.floor((cy-H/2)/TILE));
    const tyE = Math.min(DUNGEON_H, Math.ceil((cy+H/2)/TILE)+1);
    for (let ty=tyS; ty<tyE; ty++)
      for (let tx=txS; tx<txE; tx++) {
        ctx.fillStyle = dungeonTileColor(tx, ty, G.door1Open, G.door2Open);
        ctx.fillRect(wx(tx*TILE), wy(ty*TILE), TILE+1, TILE+1);
      }

    // Door indicator
    const drawDoor = (doorX, open) => {
      const sx = wx(doorX), sy = wy(DUNGEON_H/2*TILE);
      if (!onScreen(sx, sy)) return;
      if (!open) {
        ctx.fillStyle = '#1a1a30';
        ctx.fillRect(sx, wy(5*TILE), TILE*2, TILE*6);
        ctx.strokeStyle = '#3a3a60'; ctx.lineWidth = 2;
        for (let i=0; i<3; i++) {
          ctx.beginPath();
          ctx.moveTo(sx+4, wy(5*TILE) + i*TILE*2 + 8);
          ctx.lineTo(sx+TILE*2-4, wy(5*TILE) + i*TILE*2 + 8);
          ctx.stroke();
        }
        ctx.fillStyle = '#888'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('LOCKED', sx+TILE, wy(5*TILE)-10);
      } else {
        ctx.fillStyle = '#2ecc7133';
        ctx.fillRect(sx, wy(5*TILE), TILE*2, TILE*6);
      }
    };
    drawDoor(DOOR1_X, G.door1Open);
    drawDoor(DOOR2_X, G.door2Open);

    // Torches (flickering glow)
    TORCHES.forEach(t => {
      const tx2 = wx(t.x), ty2 = wy(t.y);
      if (!onScreen(tx2, ty2)) return;
      const flicker = 0.6 + Math.sin(Date.now()/200 + t.x) * 0.4;
      // Glow
      ctx.globalAlpha = flicker * 0.3;
      const grad = ctx.createRadialGradient(tx2, ty2, 0, tx2, ty2, 28);
      grad.addColorStop(0, '#f39c12');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(tx2-28, ty2-28, 56, 56);
      // Torch body
      ctx.globalAlpha = flicker;
      ctx.fillStyle = '#f39c12';
      ctx.beginPath(); ctx.arc(tx2, ty2, 4, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Exit portal
    const epx = wx(EXIT_X), epy = wy(8*TILE);
    const exitPulse = 0.7 + Math.sin(Date.now()/500)*0.3;
    ctx.globalAlpha = exitPulse;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath(); ctx.arc(epx, epy, 18, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('EXIT', epx, epy-26);
    ctx.fillStyle = '#2ecc71aa'; ctx.font = '9px sans-serif';
    ctx.fillText('[E] Leave', epx, epy+26);

    // Room labels (world-space, above door area)
    const labelY = wy(1.2*TILE);
    [
      { text: 'ROOM 1',    x: wx(7*TILE)  },
      { text: 'ROOM 2',    x: wx(21*TILE) },
      { text: '⚠ BOSS',    x: wx(34*TILE) },
    ].forEach(({ text, x }) => {
      if (!onScreen(x, labelY)) return;
      ctx.fillStyle = '#ffffff22'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(text, x, labelY);
    });

    // Chest
    if (G.chestSpawned) {
      const chx = wx(CHEST_X), chy = wy(CHEST_Y);
      if (onScreen(chx, chy)) {
        const cpulse = G.chestOpened ? 0.4 : 0.7 + Math.sin(Date.now()/300)*0.3;
        ctx.globalAlpha = cpulse;
        ctx.fillStyle = G.chestOpened ? '#555' : '#d4af37';
        ctx.fillRect(chx-16, chy-12, 32, 24);
        ctx.fillStyle = G.chestOpened ? '#333' : '#a08020';
        ctx.fillRect(chx-16, chy-14, 32, 8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = G.chestOpened ? '#555' : '#d4af37';
        ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(G.chestOpened ? 'OPENED' : '✦ CHEST', chx, chy-20);
        if (!G.chestOpened) {
          ctx.fillStyle = '#d4af37aa'; ctx.font = '9px sans-serif';
          ctx.fillText('[E] Open', chx, chy+24);
        }
      }
    }

    // Enemies
    allEnemies().forEach(e => {
      if (!e.alive) return;
      const ex = wx(e.x), ey = wy(e.y);
      if (!onScreen(ex, ey)) return;

      const cfg    = EnemyConfig[e.type];
      const isBoss = e.isBoss;
      const r      = isBoss ? 22 : (e.type === 'stone_guardian' ? 20 : 12);
      const stunned = e.stunTimer > 0;

      // Boss phase 2 aura
      if (isBoss && e.phase2) {
        const aura = 0.3 + Math.sin(Date.now()/150)*0.2;
        ctx.globalAlpha = aura;
        ctx.fillStyle = '#c0392b';
        ctx.beginPath(); ctx.arc(ex, ey, r+12, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Elite glow for stone guardian
      if (e.type === 'stone_guardian') {
        ctx.globalAlpha = 0.3 + Math.sin(Date.now()/400)*0.1;
        ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ex, ey, r+5, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.globalAlpha = stunned ? (Math.sin(Date.now()/80)>0 ? 0.4:1) : 1;
      let fillColor =
        stunned          ? '#FCD34D' :
        isBoss           ? (e.phase2 ? '#c0392b' : '#8b0000') :
        e.type==='stone_guardian' ? '#5d3a7a' :
                           '#6c3483'; // shadow stalker purple
      ctx.fillStyle = fillColor;
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = isBoss ? '#ff6666' : '#c39bd3';
      ctx.lineWidth = isBoss ? 2.5 : 1.5; ctx.stroke();
      ctx.globalAlpha = 1;

      if (stunned) {
        ctx.font='12px sans-serif'; ctx.textAlign='center';
        ctx.fillText('💫', ex, ey-r-8);
      }

      // HP bar (always show for dungeon enemies)
      const bw = isBoss ? 50 : 36;
      ctx.fillStyle = '#222'; ctx.fillRect(ex-bw/2, ey-r-10, bw, 5);
      ctx.fillStyle = isBoss ? (e.phase2?'#c0392b':'#e74c3c') : '#9b59b6';
      ctx.fillRect(ex-bw/2, ey-r-10, bw*(e.hp/e.maxHp), 5);
      ctx.fillStyle = isBoss ? (e.phase2?'#ff8888':'#ff4444') : '#c39bd3';
      ctx.font = `bold ${isBoss?10:9}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(cfg.name||e.type, ex, ey-r-14);
      if (isBoss && e.phase2) {
        ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 8px sans-serif';
        ctx.fillText('⚠ ENRAGED', ex, ey-r-24);
      }
    });

    // ── Boss HP bar (top of screen) ───────────────────────
    const boss = G.room3Enemies.find(e => e.isBoss);
    if (boss && boss.alive) {
      const bPct = boss.hp / boss.maxHp;
      const barW = W - 60;
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(30, 70, barW, 16);
      ctx.fillStyle = boss.phase2 ? '#c0392b' : '#8b0000';
      ctx.fillRect(30, 70, barW * bPct, 16);
      ctx.strokeStyle = boss.phase2 ? '#ff4444' : '#c0392b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 70, barW, 16);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(
        `⚔ DUNGEON CHAMPION${boss.phase2?' — ENRAGED':''} — ${boss.hp}/${boss.maxHp}`,
        W/2, 64
      );
    }

    // Player
    const ppx = wx(p.x), ppy = wy(p.y);
    const blinkOn = !p.invincible || Math.sin(Date.now()/80) > 0;
    ctx.globalAlpha = blinkOn ? 1 : 0.15;
    ctx.fillStyle = '#4a90e2';
    ctx.beginPath(); ctx.arc(ppx, ppy, 14, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = p.invincible ? '#fff' : '#aaa';
    ctx.lineWidth = p.invincible ? 3 : 2; ctx.stroke();
    ctx.globalAlpha = 1;

    // Ability effects
    if (G.abilityEffect) {
      const ae = G.abilityEffect, alpha = ae.timer/ae.maxTimer;
      const progress = 1-alpha, ax = wx(ae.x), ay = wy(ae.y);
      const color = ABILITY_COLORS[ae.id] || '#fff';
      ctx.globalAlpha = alpha * 0.8;
      const r2 = ae.maxRadius * progress;
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ax, ay, r2, 0, Math.PI*2); ctx.stroke();
      if (ae.id==='whirlwind') {
        for (let i=0;i<5;i++) {
          const a=i/5*Math.PI*2+progress*Math.PI*4;
          ctx.strokeStyle='#7ab3e0'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.arc(ax+Math.cos(a)*r2*0.5, ay+Math.sin(a)*r2*0.5, r2*0.2, a+0.5, a+2.5); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Attack effects
    if (G.attackEffect) {
      const ae=G.attackEffect, ax=wx(ae.x), ay=wy(ae.y);
      const alpha=ae.timer/ae.maxTimer, prog=1-alpha;
      ctx.globalAlpha=alpha*0.7;
      if (ae.type==='hammer') {
        ctx.strokeStyle='#c0392b'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.arc(ax,ay,ae.range*prog,0,Math.PI*2); ctx.stroke();
      } else if (ae.type==='dagger') {
        for(let i=0;i<4;i++){const a=(i/4)*Math.PI*2+prog*Math.PI;ctx.strokeStyle='#f39c12';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ax+Math.cos(a)*10,ay+Math.sin(a)*10);ctx.lineTo(ax+Math.cos(a)*(ae.range*0.7),ay+Math.sin(a)*(ae.range*0.7));ctx.stroke();}
      } else {
        ctx.strokeStyle='#4a90e2'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(ax,ay,ae.range*0.7,-0.5,Math.PI*0.4); ctx.stroke();
      }
      ctx.globalAlpha=1;
    }

    // Projectiles
    G.projectiles.forEach(proj => {
      const px=wx(proj.x),py=wy(proj.y);
      ctx.globalAlpha=0.55; ctx.fillStyle='#F97316';
      ctx.beginPath(); ctx.arc(px,py,10,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1; ctx.fillStyle='#FCD34D';
      ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill();
    });
    G.basicArrows.forEach(arrow => {
      const ax=wx(arrow.x),ay=wy(arrow.y);
      const angle=Math.atan2(arrow.vy,arrow.vx);
      ctx.globalAlpha=0.9; ctx.strokeStyle='#d4af37'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(ax-Math.cos(angle)*12,ay-Math.sin(angle)*12); ctx.lineTo(ax+Math.cos(angle)*6,ay+Math.sin(angle)*6); ctx.stroke();
      ctx.fillStyle='#d4af37'; ctx.beginPath(); ctx.arc(ax+Math.cos(angle)*6,ay+Math.sin(angle)*6,3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    });

    // Float texts
    G.floats.forEach(f => {
      const fx=wx(f.x),fy=wy(f.y);
      ctx.globalAlpha=Math.max(0,f.life);
      ctx.font=`bold ${f.big?16:14}px sans-serif`; ctx.textAlign='center';
      ctx.strokeStyle='#000'; ctx.lineWidth=3;
      ctx.strokeText(f.text,fx,fy);
      ctx.fillStyle=f.color; ctx.fillText(f.text,fx,fy);
    });
    ctx.globalAlpha=1; ctx.textAlign='left';
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
