import React, { useEffect, useRef } from 'react';
import { useGameStore }  from '../store/useGameStore';
import { InputState }    from '../game/systems/InputState';
import { EnemyConfig }   from '../game/config/EnemyConfig';

const TILE    = 32;
const MAP_W   = 50;
const MAP_H   = 50;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const BORDER  = TILE * 4;

const RESPAWN_POINTS = {
  stronghold: { x: 25*TILE, y: 30*TILE },
  cp_center:  { x: 25*TILE, y: 25*TILE },
  cp_forest:  { x: 15*TILE, y: 10*TILE },
  cp_east:    { x: 40*TILE, y: 18*TILE },
};

function clampToWorld(x, y) {
  return {
    x: Math.max(BORDER, Math.min(WORLD_W - BORDER, x)),
    y: Math.max(BORDER, Math.min(WORLD_H - BORDER, y)),
  };
}

function getRespawnPos(checkpointId) {
  return RESPAWN_POINTS[checkpointId] || RESPAWN_POINTS.stronghold;
}

function tileColor(tx, ty) {
  if (tx < 2 || tx >= MAP_W-2 || ty < 2 || ty >= MAP_H-2) return '#2980b9';
  if (ty < 14 && tx > 4 && tx < MAP_W-4)                  return '#1a5c35';
  if (tx > 34 && ty > 8  && ty < MAP_H-4)                 return '#636e72';
  if (tx === 25 || ty === 25)                              return '#9b7a5b';
  return '#2d6a3f';
}

function dist(ax, ay, bx, by) {
  return Math.sqrt((ax-bx)**2 + (ay-by)**2);
}

const CHECKPOINTS = [
  { id: 'cp_center', x: 25*TILE, y: 25*TILE },
  { id: 'cp_forest', x: 15*TILE, y: 10*TILE },
  { id: 'cp_east',   x: 40*TILE, y: 18*TILE },
];

const RESOURCE_DEFS = [
  { type: 'tree',     res: 'wood',  amt: 2, x:  8*TILE, y:  7*TILE },
  { type: 'tree',     res: 'wood',  amt: 2, x: 12*TILE, y:  9*TILE },
  { type: 'tree',     res: 'wood',  amt: 2, x: 16*TILE, y:  6*TILE },
  { type: 'tree',     res: 'wood',  amt: 2, x: 20*TILE, y:  8*TILE },
  { type: 'tree',     res: 'wood',  amt: 2, x: 24*TILE, y: 11*TILE },
  { type: 'tree',     res: 'wood',  amt: 2, x: 30*TILE, y:  7*TILE },
  { type: 'rock',     res: 'stone', amt: 2, x: 14*TILE, y: 22*TILE },
  { type: 'rock',     res: 'stone', amt: 2, x: 20*TILE, y: 38*TILE },
  { type: 'rock',     res: 'stone', amt: 2, x: 10*TILE, y: 30*TILE },
  { type: 'rock',     res: 'stone', amt: 2, x: 32*TILE, y: 40*TILE },
  { type: 'ore_node', res: 'ore',   amt: 1, x: 37*TILE, y: 16*TILE },
  { type: 'ore_node', res: 'ore',   amt: 1, x: 41*TILE, y: 24*TILE },
  { type: 'ore_node', res: 'ore',   amt: 1, x: 38*TILE, y: 34*TILE },
];

const ENEMY_DEFS = [
  { type: 'goblin', x: 12*TILE, y: 18*TILE },
  { type: 'goblin', x: 18*TILE, y: 15*TILE },
  { type: 'goblin', x: 22*TILE, y: 20*TILE },
  { type: 'goblin', x:  8*TILE, y: 22*TILE },
  { type: 'golem',  x: 38*TILE, y: 20*TILE },
  { type: 'golem',  x: 42*TILE, y: 30*TILE },
];

const PATROL_RADIUS = 80; // max pixels enemy drifts from origin

function makeEnemy(def) {
  const cfg = EnemyConfig[def.type];
  return {
    type: def.type, x: def.x, y: def.y,
    originX: def.x, originY: def.y,
    hp: cfg.hp, maxHp: cfg.hp,
    state: 'patrol', alive: true,
    attackTimer: 0, patrolDir: 1, patrolTimer: 0,
  };
}

export default function WorldCanvas() {
  const canvasRef      = useRef(null);
  const rafRef         = useRef(null);
  const lastTimeRef    = useRef(0);
  const prevDeathModal = useRef(false);

  const G = useRef({
    player:      { x: 25*TILE, y: 30*TILE, attackCooldown: 0, invincible: false, invTimer: 0 },
    camera:      { x: 25*TILE, y: 30*TILE },
    enemies:     ENEMY_DEFS.map(makeEnemy),
    resources:   RESOURCE_DEFS.map(d => ({ ...d, depleted: false })),
    checkpoints: CHECKPOINTS.map(c => ({ ...c, activated: false })),
    swordPicked: false,
    floats:      [],
    keys:        {},
    prevE:       false,
    prevSpace:   false,
    saveTimer:   0,
    W: 390, H: 844,
    _hintIndex: 0,
  }).current;

  const addFloat = (x, y, text, color = '#fff') => {
    G.floats.push({ x, y, text, color, life: 1, vy: -55 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  > 0 ? rect.width  : window.innerWidth;
      canvas.height = rect.height > 0 ? rect.height : window.innerHeight;
      G.W = canvas.width;
      G.H = canvas.height;
    };
    resize();
    window.addEventListener('resize', resize);

    const savedPos = useGameStore.getState().position;
    if (savedPos?.x) {
      const c = clampToWorld(savedPos.x, savedPos.y);
      G.player.x = c.x; G.player.y = c.y;
      G.camera.x = c.x; G.camera.y = c.y;
    }

    const kd = e => { G.keys[e.code] = true; };
    const ku = e => { G.keys[e.code] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup',   ku);

    const ctx = canvas.getContext('2d');
    const loop = (ts) => {
      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = ts;
      if (dt > 0) { update(dt); render(ctx, G.W, G.H); }
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

    // ── Respawn detection ──────────────────────────────────
    const isDeathModal = store.showDeathModal;
    if (prevDeathModal.current && !isDeathModal) {
      const pos = store.activeZone === 'stronghold'
        ? RESPAWN_POINTS.stronghold
        : getRespawnPos(store.lastCheckpoint);
      G.player.x = pos.x; G.player.y = pos.y;
      G.camera.x = pos.x; G.camera.y = pos.y;
      // 3 seconds invincibility — enough time to move away
      G.player.invincible = true;
      G.player.invTimer   = 3.0;
    }
    prevDeathModal.current = isDeathModal;

    if (isDeathModal || store.gamePhase === 'stronghold') return;

    const p   = G.player;
    const cfg = EnemyConfig;

    // ── Movement ──────────────────────────────────────────
    let vx = 0, vy = 0;
    if (G.keys['ArrowLeft']  || G.keys['KeyA']) vx -= 1;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) vx += 1;
    if (G.keys['ArrowUp']    || G.keys['KeyW']) vy -= 1;
    if (G.keys['ArrowDown']  || G.keys['KeyS']) vy += 1;
    if (InputState.joystick.active) { vx = InputState.joystick.x; vy = InputState.joystick.y; }
    if (vx !== 0 && vy !== 0) { const m = Math.sqrt(vx*vx+vy*vy); vx/=m; vy/=m; }

    const spd  = 150 + (store.playerSPD - 5) * 12;
    const next = clampToWorld(p.x + vx * spd * dt, p.y + vy * spd * dt);
    p.x = next.x; p.y = next.y;

    G.camera.x += (p.x - G.camera.x) * Math.min(1, 8 * dt);
    G.camera.y += (p.y - G.camera.y) * Math.min(1, 8 * dt);

    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.invincible) { p.invTimer -= dt; if (p.invTimer <= 0) p.invincible = false; }

    // ── Attack ─────────────────────────────────────────────
    const spaceNow  = G.keys['Space'] || InputState.attack;
    const spaceJust = spaceNow && !G.prevSpace;
    G.prevSpace = spaceNow;
    if (InputState.attack) InputState.attack = false;

    if (spaceJust && p.attackCooldown <= 0) {
      p.attackCooldown = 0.6;
      G.enemies.forEach(e => {
        if (!e.alive || dist(p.x, p.y, e.x, e.y) > 52) return;
        const dmg = Math.max(1, store.playerATK - cfg[e.type].def);
        e.hp -= dmg;
        addFloat(e.x, e.y - 20, `-${dmg}`, '#ff4444');
        if (e.hp <= 0) {
          e.alive = false;
          cfg[e.type].drops.forEach(drop => {
            if (Math.random() < drop.chance) {
              store.addResource(drop.item, drop.amount);
              addFloat(e.x, e.y - 40, `+${drop.amount} ${drop.item}`, '#7ed321');
            }
          });
          setTimeout(() => {
            e.alive = true; e.hp = e.maxHp; e.state = 'patrol';
            e.x = e.originX; e.y = e.originY; // reset to origin on respawn
          }, cfg[e.type].respawnTime);
        }
      });
    }

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

      if (!G.swordPicked && dist(p.x, p.y, 27*TILE, 27*TILE) <= 44) {
        const item = { id: 'iron_sword', name: 'Iron Sword', slot: 'weapon', atk: 6 };
        const ok = store.addItem(item);
        if (ok) {
          G.swordPicked = true;
          store.equipItem(item);
          addFloat(27*TILE, 27*TILE - 30, '⚔ Iron Sword equipped!', '#bdc3c7');
        }
      }

      if (dist(p.x, p.y, 25*TILE, 44*TILE) <= 52) {
        store.setGamePhase('stronghold');
        return;
      }

      if (dist(p.x, p.y, 43*TILE, 10*TILE) <= 52) {
        addFloat(p.x, p.y - 40, '⚠ Dungeon — Phase 2!', '#cc88ff');
      }

      if (dist(p.x, p.y, 23*TILE, 28*TILE) <= 60) {
        const hints = [
          '"Defeat the 10 elemental gods. Ascend."',
          '"Gather wood, stone, and ore to build."',
          '"Your Stronghold is to the south."',
          '"The golems drop ore — they are tough."',
          '"Find checkpoints to save your progress."',
          '"Upgrade Training Grounds for more ATK."',
        ];
        addFloat(23*TILE, 28*TILE - 50, hints[G._hintIndex % hints.length], '#1abc9c');
        G._hintIndex++;
      }
    }

    // ── Enemy AI ───────────────────────────────────────────
    G.enemies.forEach(e => {
      if (!e.alive) return;
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
      } else if (d <= ecfg.aggroRange) {
        e.state = 'aggro';
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(angle) * ecfg.speed * dt;
        e.y += Math.sin(angle) * ecfg.speed * dt;
      } else if (dOrigin > PATROL_RADIUS) {
        // Too far from home — walk back to origin
        e.state = 'patrol';
        const homeAngle = Math.atan2(e.originY - e.y, e.originX - e.x);
        e.x += Math.cos(homeAngle) * ecfg.speed * 0.5 * dt;
        e.y += Math.sin(homeAngle) * ecfg.speed * 0.5 * dt;
      } else {
        // Normal patrol
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
      sx > -pad && sx < W+pad && sy > -pad && sy < H+pad;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    const txS = Math.max(0, Math.floor((cx - W/2) / TILE));
    const txE = Math.min(MAP_W, Math.ceil((cx + W/2) / TILE) + 1);
    const tyS = Math.max(0, Math.floor((cy - H/2) / TILE));
    const tyE = Math.min(MAP_H, Math.ceil((cy + H/2) / TILE) + 1);

    for (let ty = tyS; ty < tyE; ty++) {
      for (let tx = txS; tx < txE; tx++) {
        ctx.fillStyle = tileColor(tx, ty);
        ctx.fillRect(wx(tx*TILE), wy(ty*TILE), TILE+1, TILE+1);
      }
    }

    G.resources.forEach(r => {
      if (r.depleted) return;
      const sx = wx(r.x), sy = wy(r.y);
      if (!onScreen(sx, sy)) return;
      ctx.fillStyle = r.type === 'tree' ? '#27ae60' : r.type === 'rock' ? '#7f8c8d' : '#e67e22';
      ctx.beginPath(); ctx.arc(sx, sy, r.type === 'tree' ? 14 : 11, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffffffaa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(r.res, sx, sy + 24);
    });

    G.checkpoints.forEach(cp => {
      const sx = wx(cp.x), sy = wy(cp.y);
      if (!onScreen(sx, sy)) return;
      const pulse = cp.activated ? 1 : 0.6 + Math.sin(Date.now() / 600) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.fillStyle   = cp.activated ? '#00ff88' : '#f1c40f';
      ctx.fillRect(sx-8, sy-18, 16, 26);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffffaa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(cp.activated ? 'SAVED' : 'SAVE', sx, sy + 28);
    });

    const shx = wx(25*TILE), shy = wy(44*TILE);
    if (onScreen(shx, shy, 80)) {
      const pulse = 0.75 + Math.sin(Date.now() / 700) * 0.25;
      ctx.globalAlpha = pulse;
      ctx.fillStyle   = '#d4af37';
      ctx.fillRect(shx-24, shy-24, 48, 48);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000cc'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🏰 STRONGHOLD', shx, shy - 30);
      ctx.fillStyle = '#d4af37bb'; ctx.font = '9px sans-serif';
      ctx.fillText('[E] Enter', shx, shy + 36);
    }

    const dunx = wx(43*TILE), duny = wy(10*TILE);
    if (onScreen(dunx, duny, 80)) {
      ctx.fillStyle = '#8e44ad';
      ctx.fillRect(dunx-24, duny-24, 48, 48);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚠ DUNGEON', dunx, duny - 30);
      ctx.fillStyle = '#cc88ffaa'; ctx.font = '9px sans-serif';
      ctx.fillText('[E] Enter', dunx, duny + 36);
    }

    const nx = wx(23*TILE), ny = wy(28*TILE);
    if (onScreen(nx, ny)) {
      ctx.fillStyle = '#1abc9c'; ctx.beginPath(); ctx.arc(nx, ny, 14, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#1abc9c'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Elder Kael', nx, ny - 22);
      ctx.fillStyle = '#1abc9caa'; ctx.font = '9px sans-serif';
      ctx.fillText('[E] Talk', nx, ny + 26);
    }

    if (!G.swordPicked) {
      const isx = wx(27*TILE), isy = wy(27*TILE);
      if (onScreen(isx, isy)) {
        const pulse = 0.5 + Math.sin(Date.now() / 400) * 0.5;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(isx-5, isy-14, 10, 24);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#bdc3c7'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⚔ Iron Sword', isx, isy - 22);
        ctx.fillStyle = '#bdc3c7aa'; ctx.font = '9px sans-serif';
        ctx.fillText('[E] Pick up', isx, isy + 24);
      }
    }

    G.enemies.forEach(e => {
      if (!e.alive) return;
      const ex = wx(e.x), ey = wy(e.y);
      if (!onScreen(ex, ey)) return;
      const isGolem = e.type === 'golem';
      const r       = isGolem ? 18 : 12;
      const aggroed = e.state !== 'patrol';

      ctx.fillStyle = aggroed ? '#e74c3c' : (isGolem ? '#8e44ad' : '#7ed321');
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

      if (aggroed) {
        const bw = 36;
        ctx.fillStyle = '#333'; ctx.fillRect(ex-bw/2, ey-r-10, bw, 5);
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(ex-bw/2, ey-r-10, bw*(e.hp/e.maxHp), 5);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(e.type, ex, ey - r - 14);
      }
    });

    // Player — blink faster when invincible to signal grace period
    const ppx = wx(p.x), ppy = wy(p.y);
    const blinkOn = !p.invincible || Math.sin(Date.now() / 80) > 0;
    ctx.globalAlpha = blinkOn ? 1 : 0.15;
    ctx.fillStyle = '#4a90e2';
    ctx.beginPath(); ctx.arc(ppx, ppy, 14, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = p.invincible ? '#ffffff' : '#aaaaaa';
    ctx.lineWidth = p.invincible ? 3 : 2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    G.floats.forEach(f => {
      const fx = wx(f.x), fy = wy(f.y);
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(f.text, fx, fy);
      ctx.fillStyle = f.color; ctx.fillText(f.text, fx, fy);
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%', display: 'block',
        touchAction: 'none', userSelect: 'none',
        WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
      }}
    />
  );
}
