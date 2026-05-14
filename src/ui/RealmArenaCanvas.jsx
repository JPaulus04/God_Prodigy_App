import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { InputState }   from '../game/systems/InputState';
import { AbilityConfig } from '../game/config/AbilityConfig';

const TILE    = 32;
const ARENA_W = 30;
const ARENA_H = 30;
const WW      = ARENA_W * TILE;
const WH      = ARENA_H * TILE;

// ── Realm configs ─────────────────────────────────────────────────────────
const REALM_CFG = {
  forest: {
    terrain:'#1e5e28', border:'#0a2a0d', accent:'#27ae60', skyColor:'#0d1f0f',
    treePositions:[[4,4],[25,4],[4,25],[25,25],[8,8],[20,8],[8,20],[20,20]],
    waves:[
      [{type:'thornling',x:8*TILE,y:5*TILE},{type:'thornling',x:13*TILE,y:4*TILE},
       {type:'thornling',x:18*TILE,y:5*TILE},{type:'thornling',x:22*TILE,y:4*TILE}],
      [{type:'thornling',x:6*TILE,y:6*TILE},{type:'thornling',x:23*TILE,y:6*TILE},
       {type:'forest_wraith',x:10*TILE,y:4*TILE},{type:'forest_wraith',x:15*TILE,y:3*TILE},
       {type:'forest_wraith',x:20*TILE,y:4*TILE}],
    ],
    boss:{name:'Sylvara',hp:1000,atk:22,color:'#2ecc71',size:28,x:15*TILE,y:5*TILE,
          icon:'🌿',chargeInterval:3.5,chargeTelegraph:0.9,chargeSpeed:520,chargeDist:280},
    reward:{label:'Nature Essence',icon:'🌿',color:'#27ae60',key:'natureEssence'},
  },
  earth:{terrain:'#4a3828',border:'#2a1e10',accent:'#95a5a6',skyColor:'#1a1008',
    treePositions:[[3,3],[26,3],[3,26],[26,26]],waves:[],
    boss:{name:'Terran',hp:1400,atk:32,color:'#95a5a6',size:34,x:15*TILE,y:5*TILE,icon:'🪨',chargeInterval:4,chargeTelegraph:1.0,chargeSpeed:400,chargeDist:260},
    reward:{label:'Earth Shard',icon:'🪨',color:'#95a5a6',key:'earthShard'},
  },
  wind:{terrain:'#1a3a4a',border:'#0a1a28',accent:'#87ceeb',skyColor:'#080e14',
    treePositions:[],waves:[],
    boss:{name:'Zephyros',hp:1200,atk:28,color:'#87ceeb',size:28,x:15*TILE,y:5*TILE,icon:'💨',chargeInterval:2.5,chargeTelegraph:0.7,chargeSpeed:640,chargeDist:320},
    reward:{label:'Wind Essence',icon:'💨',color:'#87ceeb',key:'windEssence'},
  },
  fire:{terrain:'#3a1810',border:'#1a0808',accent:'#e74c3c',skyColor:'#0f0504',
    treePositions:[],waves:[],
    boss:{name:'Ignar',hp:1600,atk:38,color:'#e74c3c',size:30,x:15*TILE,y:5*TILE,icon:'🔥',chargeInterval:3,chargeTelegraph:0.8,chargeSpeed:560,chargeDist:300},
    reward:{label:'Fire Ember',icon:'🔥',color:'#e74c3c',key:'fireEmber'},
  },
  ice:{terrain:'#1a2a40',border:'#0a1428',accent:'#3498db',skyColor:'#06080f',
    treePositions:[],waves:[],
    boss:{name:'Glacius',hp:1800,atk:35,color:'#85c1e9',size:32,x:15*TILE,y:5*TILE,icon:'❄️',chargeInterval:3.5,chargeTelegraph:1.0,chargeSpeed:460,chargeDist:300},
    reward:{label:'Glacial Shard',icon:'❄️',color:'#85c1e9',key:'glacialShard'},
  },
  ocean:{terrain:'#0e3a30',border:'#06181a',accent:'#1abc9c',skyColor:'#040d0e',
    treePositions:[],waves:[],
    boss:{name:'Nepthar',hp:1600,atk:34,color:'#1abc9c',size:30,x:15*TILE,y:5*TILE,icon:'🌊',chargeInterval:3,chargeTelegraph:0.9,chargeSpeed:480,chargeDist:290},
    reward:{label:'Sea Crystal',icon:'🌊',color:'#1abc9c',key:'seaCrystal'},
  },
  storm:{terrain:'#18103a',border:'#0a0820',accent:'#9b59b6',skyColor:'#06050f',
    treePositions:[],waves:[],
    boss:{name:'Vortus',hp:2000,atk:42,color:'#9b59b6',size:32,x:15*TILE,y:5*TILE,icon:'⚡',chargeInterval:2,chargeTelegraph:0.6,chargeSpeed:700,chargeDist:340},
    reward:{label:'Storm Core',icon:'⚡',color:'#9b59b6',key:'stormCore'},
  },
  shadow:{terrain:'#10101e',border:'#060610',accent:'#6c3483',skyColor:'#040408',
    treePositions:[],waves:[],
    boss:{name:'Umbris',hp:2200,atk:48,color:'#8e44ad',size:34,x:15*TILE,y:5*TILE,icon:'🌑',chargeInterval:2.5,chargeTelegraph:0.7,chargeSpeed:580,chargeDist:310},
    reward:{label:'Shadow Veil',icon:'🌑',color:'#8e44ad',key:'shadowVeil'},
  },
  lava:{terrain:'#2a1008',border:'#120604',accent:'#e67e22',skyColor:'#0a0402',
    treePositions:[],waves:[],
    boss:{name:'Magmara',hp:2400,atk:55,color:'#e67e22',size:36,x:15*TILE,y:5*TILE,icon:'🌋',chargeInterval:3,chargeTelegraph:1.0,chargeSpeed:520,chargeDist:280},
    reward:{label:'Lava Core',icon:'🌋',color:'#e67e22',key:'lavaCore'},
  },
  void:{terrain:'#080808',border:'#020202',accent:'#f1c40f',skyColor:'#030303',
    treePositions:[],waves:[],
    boss:{name:'Nihilus',hp:2800,atk:65,color:'#f1c40f',size:38,x:15*TILE,y:5*TILE,icon:'✨',chargeInterval:2,chargeTelegraph:0.5,chargeSpeed:760,chargeDist:360},
    reward:{label:'Void Fragment',icon:'✨',color:'#f1c40f',key:'voidFragment'},
  },
};

const ENEMY_STATS = {
  thornling:     {hp:30,atk:4,def:0,speed:145,aggroRange:440,attackRange:38,attackCooldown:1.1,color:'#7ed321',size:12,xp:8 },
  forest_wraith: {hp:50,atk:6,def:1,speed:72, aggroRange:520,attackRange:240,attackCooldown:2.4,color:'#1abc9c',size:16,xp:14,ranged:true,projColor:'#2ecc71'},
};

function dist(ax,ay,bx,by){ return Math.sqrt((ax-bx)**2+(ay-by)**2); }
function clp(v,a,b){ return Math.max(a,Math.min(b,v)); }

function arenaTile(tx,ty,cfg){
  if(tx<=0||tx>=ARENA_W-1||ty<=0||ty>=ARENA_H-1) return cfg.border;
  for(const [ttx,tty] of (cfg.treePositions||[])){
    if(Math.abs(tx-ttx)<=1&&Math.abs(ty-tty)<=1) return cfg.border;
  }
  return cfg.terrain;
}

const ABILITY_COLORS={
  whirlwind:{primary:'#4a90e2',secondary:'#7ab3e0'},
  ground_slam:{primary:'#c0392b',secondary:'#e67e22'},
  power_shot:{primary:'#FCD34D',secondary:'#F97316'},
  flurry:{primary:'#f39c12',secondary:'#fff'},
  arcane_burst:{primary:'#9b59b6',secondary:'#d4af37'},
};

export default function RealmArenaCanvas({ realmId, onFlee }) {
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const lastTimeRef = useRef(0);
  const cfg = REALM_CFG[realmId] || REALM_CFG.forest;

  const G = useRef({
    player:       { x:15*TILE, y:24*TILE, attackCooldown:0, invincible:true, invTimer:2.0 },
    camera:       { x:15*TILE, y:24*TILE },
    enemies:      [],
    projectiles:  [],
    boss:         null,
    bossPhase:    1,
    bossCharge:   null,   // { tx, ty, speed, warning, warningTimer, active }
    bossChargeTimer: 0,
    bossSpawnTimer: 0,
    wave:         0,      // 0=not started, 1,2=waves, 'boss'=boss
    victory:      false,
    totalDmgDealt: 0,
    victoryTimer: 0,
    abilityEffect:  null,
    abilityCooldown:0,
    projectiles:  [],
    floats:       [],
    keys:         {},
    prevSpace:    false,
    prevAbility:  false,
    attackFlash:  null,
    lastMoveDir:  {x:0,y:1},
    W:390, H:844,
  }).current;

  const addFloat=(x,y,text,color='#fff',big=false)=>{
    G.floats.push({x,y,text,color,life:big?1.5:1.2,vy:big?-55:-42,big});
  };

  const spawnWave=(waveIdx)=>{
    const defs=cfg.waves[waveIdx];
    if(!defs) return;
    G.enemies=defs.map(d=>{
      const s=ENEMY_STATS[d.type]||ENEMY_STATS.thornling;
      return{...d,type:d.type,hp:s.hp,maxHp:s.hp,atk:s.atk,def:s.def,speed:s.speed,
        aggroRange:s.aggroRange,attackRange:s.attackRange,attackCooldown:s.attackCooldown,
        color:s.color,size:s.size,xp:s.xp,ranged:s.ranged||false,projColor:s.projColor,
        alive:true,attackTimer:0,state:'patrol',patrolTimer:0,patrolDir:1};
    });
  };

  const spawnBoss=()=>{
    const b=cfg.boss;
    const store=useGameStore.getState();
    const scaledHp=b.hp; // Fixed HP — balanced per realm difficulty
    G.boss={ ...b, hp:scaledHp, maxHp:scaledHp, alive:true,
      attackTimer:0, chargeTimer:b.chargeInterval, chargeState:'idle',
      telegraphTimer:0, chargeVx:0, chargeVy:0, spawnTimer:10 };
    G.bossChargeTimer=b.chargeInterval;
    G.bossSpawnTimer=8;
  };

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
        if(ability.stunDuration&&e.stunTimer!==undefined) e.stunTimer=ability.stunDuration;
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

    // Start wave 1
    spawnWave(0); G.wave=1;

    const kd=e=>{G.keys[e.code]=true;}; const ku=e=>{G.keys[e.code]=false;};
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);

    const ctx=canvas.getContext('2d');
    const loop=ts=>{
      const dt=Math.min((ts-lastTimeRef.current)/1000,0.05);
      lastTimeRef.current=ts;
      if(dt>0&&G.W>100){ update(dt,ctx); render(ctx); }
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return ()=>{ cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown',kd); window.removeEventListener('keyup',ku);
      window.removeEventListener('resize',resize); };
  },[]);

  function update(dt){
    if(G.victory) return;
    const store=useGameStore.getState();
    const p=G.player;
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
    G.camera.x+=( p.x-G.camera.x)*Math.min(1,8*dt);
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
      // store.gear.weapon is an instanceId string, not an item object.
      // Use equippedAbilityId which the store already resolves correctly.
      const _aid=store.equippedAbilityId||'whirlwind';
      const wType=_aid==='power_shot'?'bow':
                  _aid==='ground_slam'?'hammer':
                  _aid==='flurry'?'dagger':
                  _aid==='arcane_burst'?'staff':'sword';
      const allT=[...G.enemies,(G.boss&&G.boss.alive?[G.boss]:[])].flat().filter(e=>e.alive);
      if(wType==='bow'||wType==='staff'){
        // Ranged — fire projectile toward nearest enemy
        p.attackCooldown=0.6;
        let tx=p.x+G.lastMoveDir.x*400,ty=p.y+G.lastMoveDir.y*400,nd=Infinity;
        allT.forEach(e=>{const d=dist(p.x,p.y,e.x,e.y);if(d<nd){nd=d;tx=e.x;ty=e.y;}});
        const ang=Math.atan2(ty-p.y,tx-p.x);
        const dmg=store.playerATK;
        G.projectiles.push({x:p.x,y:p.y,vx:Math.cos(ang)*480,vy:Math.sin(ang)*480,
          traveled:0,maxRange:520,dmg,hitTargets:new Set(),fromPlayer:true});
        // Flash effect
        G.attackFlash={x:p.x,y:p.y,timer:0.15,type:'ranged',ang};
      } else {
        // Melee
        const rng=wType==='hammer'?72:wType==='dagger'?48:60;
        p.attackCooldown=wType==='hammer'?0.85:wType==='dagger'?0.35:0.55;
        allT.forEach(e=>{
          if(dist(p.x,p.y,e.x,e.y)>rng) return;
          const dmg=Math.max(1,store.playerATK-(e.def||0));
          e.hp-=dmg; addFloat(e.x,e.y-20,`-${dmg}`,'#ff4444');
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
      proj.x+=proj.vx*dt; proj.y+=proj.vy*dt;
      proj.traveled+=Math.sqrt(proj.vx*proj.vx+proj.vy*proj.vy)*dt;
      if(proj.fromPlayer){
        const targets=[...G.enemies,(G.boss&&G.boss.alive?[G.boss]:[])].flat();
        targets.forEach(e=>{
          if(!e.alive||proj.hitTargets.has(e)||dist(proj.x,proj.y,e.x,e.y)>22) return;
          proj.hitTargets.add(e); e.hp-=proj.dmg;
          addFloat(e.x,e.y-24,`-${proj.dmg}`,'#FCD34D');
          if(e.hp<=0){ if(e===G.boss) G.boss.alive=false; else killEnemy(e,store); }
        });
      } else {
        // Enemy projectile hitting player
        if(!p.invincible&&dist(proj.x,proj.y,p.x,p.y)<18){
          const dmg=Math.max(1,(proj.dmg||5)-store.playerDEF);
          store.takeDamage(dmg); addFloat(p.x,p.y-30,`-${dmg}`,'#e74c3c');
          p.invincible=true; p.invTimer=0.5;
          return false;
        }
      }
      return proj.traveled<(proj.maxRange||400)&&proj.x>0&&proj.x<WW&&proj.y>0&&proj.y<WH;
    });

    // Enemy AI
    G.enemies.forEach(e=>{
      if(!e.alive) return;
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
          // Keep distance
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

    // Check wave clear
    const allDead=G.enemies.every(e=>!e.alive);
    if(allDead&&G.enemies.length>0){
      if(G.wave<cfg.waves.length){
        G.wave++; spawnWave(G.wave-1);
        addFloat(p.x,p.y-60,`Wave ${G.wave}!`,'#f1c40f',true);
      } else if(G.wave===cfg.waves.length&&!G.boss){
        G.wave='boss'; spawnBoss();
        addFloat(p.x,p.y-60,'⚠ BOSS INCOMING!','#e74c3c',true);
      }
    }

    // Boss AI
    if(G.boss&&G.boss.alive){
      const b=G.boss; const bcfg=cfg.boss;
      b.attackTimer=Math.max(0,(b.attackTimer||0)-dt);

      // Phase 2 at 50% HP
      if(b.hp<=b.maxHp*0.5&&G.bossPhase===1){
        G.bossPhase=2; addFloat(b.x,b.y-60,'⚠ Phase 2!','#e74c3c',true);
        G.bossSpawnTimer=4;
      }
      // Phase 2: spawn thornlings periodically
      if(G.bossPhase===2){ G.bossSpawnTimer-=dt;
        if(G.bossSpawnTimer<=0){ G.bossSpawnTimer=6;
          const s=ENEMY_STATS.thornling;
          G.enemies.push({type:'thornling',x:b.x+60,y:b.y+40,...s,alive:true,attackTimer:0,state:'patrol',patrolTimer:0,patrolDir:1});
          G.enemies.push({type:'thornling',x:b.x-60,y:b.y+40,...s,alive:true,attackTimer:0,state:'patrol',patrolTimer:0,patrolDir:-1});
        }
      }

      if(b.chargeState==='idle'){
        // Slow patrol
        b.patrolTimer=(b.patrolTimer||0)+dt;
        if(b.patrolTimer>2.0){b.patrolDir=(b.patrolDir||1)*-1;b.patrolTimer=0;}
        b.x=clp(b.x+80*(b.patrolDir||1)*dt,TILE*3,WW-TILE*3);
        // Charge cooldown
        G.bossChargeTimer-=dt;
        if(G.bossChargeTimer<=0){
          b.chargeState='telegraph'; b.telegraphTimer=bcfg.chargeTelegraph;
          b.telegraphTargetX=p.x; b.telegraphTargetY=p.y;
        }
      } else if(b.chargeState==='telegraph'){
        b.telegraphTimer-=dt;
        if(b.telegraphTimer<=0){
          b.chargeState='charging';
          const ang=Math.atan2(b.telegraphTargetY-b.y,b.telegraphTargetX-b.x);
          b.chargeVx=Math.cos(ang)*(G.bossPhase===2?bcfg.chargeSpeed*1.3:bcfg.chargeSpeed);
          b.chargeVy=Math.sin(ang)*(G.bossPhase===2?bcfg.chargeSpeed*1.3:bcfg.chargeSpeed);
          b.chargeTraveled=0;
        }
      } else if(b.chargeState==='charging'){
        b.x=clp(b.x+b.chargeVx*dt,TILE,WW-TILE);
        b.y=clp(b.y+b.chargeVy*dt,TILE,WH-TILE);
        b.chargeTraveled+=(Math.abs(b.chargeVx)+Math.abs(b.chargeVy))*dt;
        // Hit player during charge
        if(!p.invincible&&dist(b.x,b.y,p.x,p.y)<b.size+16){
          const dmg=Math.max(1,b.atk-store.playerDEF);
          store.takeDamage(dmg); addFloat(p.x,p.y-30,`-${dmg}`,'#e74c3c');
          p.invincible=true; p.invTimer=0.6;
        }
        if(b.chargeTraveled>=(G.bossPhase===2?bcfg.chargeDist*1.2:bcfg.chargeDist)){
          b.chargeState='idle';
          G.bossChargeTimer=G.bossPhase===2?bcfg.chargeInterval*0.6:bcfg.chargeInterval;
        }
      }

      // death handled outside this block
    }

    // Victory banner (fades after 4s)
    if(G.victoryBannerTimer>0){
      const bt=G.victoryBannerTimer;
      const alpha=bt>3?1:bt/3; // fade out in last 3s
      ctx.globalAlpha=alpha*0.88;
      ctx.fillStyle='#000000';
      ctx.fillRect(0, G.H*0.28, G.W, 200);
      ctx.globalAlpha=alpha;
      // Victory text
      ctx.textAlign='center';
      ctx.font='bold 32px sans-serif';
      ctx.fillStyle='#f1c40f';
      ctx.fillText('VICTORY!', G.W/2, G.H*0.28+52);
      // God name
      ctx.font='16px sans-serif';
      ctx.fillStyle='#ffffff';
      ctx.fillText(`${cfg.boss.icon}  ${cfg.boss.name} Defeated`, G.W/2, G.H*0.28+82);
      // Reward
      ctx.fillStyle=cfg.accent;
      ctx.font='bold 15px sans-serif';
      ctx.fillText(`${cfg.reward.icon}  ${cfg.reward.label} Awarded`, G.W/2, G.H*0.28+114);
      // Portal hint
      ctx.fillStyle='#ffffff88';
      ctx.font='12px sans-serif';
      ctx.fillText('Walk into the portal to return', G.W/2, G.H*0.28+148);
      ctx.globalAlpha=1;
    }

    // Victory portal walk-in
    if(G.victory&&G.victoryPortal){
      if(dist(p.x,p.y,G.victoryPortal.x,G.victoryPortal.y)<48){
        onFlee(); return;
      }
    }

    if(G.victoryBannerTimer>0) G.victoryBannerTimer-=dt;

    // Boss death check — runs every frame, catches kills from any source
    if(G.boss && !G.boss.alive && !G.victory){
      try{ store.gainXP(200); }catch(e){}
      try{ store.defeatBoss && store.defeatBoss(realmId); }catch(e){}
      G.victory=true;
      G.victoryPortal={ x:G.boss.x, y:G.boss.y };
      G.victoryBannerTimer=4.0;
      addFloat(G.boss.x, G.boss.y-60,'VICTORY!','#f1c40f',true);
      addFloat(G.boss.x, G.boss.y-90,'+200 XP','#9b59b6',true);
    }

    // Floats
    G.floats=G.floats.map(f=>({...f,y:f.y+f.vy*dt,life:f.life-dt})).filter(f=>f.life>0);
  }

  function render(ctx){
    const p=G.player; const cx=G.camera.x; const cy=G.camera.y;
    const wx=x=>Math.round(x-cx+G.W/2);
    const wy=y=>Math.round(y-cy+G.H/2);
    const on=(sx,sy,pad=50)=>sx>-pad&&sx<G.W+pad&&sy>-pad&&sy<G.H+pad;

    ctx.fillStyle=cfg.skyColor; ctx.fillRect(0,0,G.W,G.H);

    // Tiles
    const txS=Math.max(0,Math.floor((cx-G.W/2)/TILE));
    const txE=Math.min(ARENA_W,Math.ceil((cx+G.W/2)/TILE)+1);
    const tyS=Math.max(0,Math.floor((cy-G.H/2)/TILE));
    const tyE=Math.min(ARENA_H,Math.ceil((cy+G.H/2)/TILE)+1);
    for(let ty=tyS;ty<tyE;ty++) for(let tx=txS;tx<txE;tx++){
      ctx.fillStyle=arenaTile(tx,ty,cfg);
      ctx.fillRect(wx(tx*TILE),wy(ty*TILE),TILE+1,TILE+1);
    }

    // Enemy projectiles
    G.projectiles.filter(pr=>!pr.fromPlayer).forEach(pr=>{
      const px=wx(pr.x),py=wy(pr.y);
      ctx.globalAlpha=0.9; ctx.fillStyle=cfg.accent;
      ctx.beginPath();ctx.arc(px,py,8,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
    });

    // Player projectiles
    G.projectiles.filter(pr=>pr.fromPlayer).forEach(pr=>{
      const px=wx(pr.x),py=wy(pr.y);
      ctx.globalAlpha=0.35;ctx.strokeStyle='#FCD34D';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-(pr.vx/420)*22,py-(pr.vy/420)*22);ctx.stroke();
      ctx.globalAlpha=0.6;ctx.fillStyle='#F97316';ctx.beginPath();ctx.arc(px,py,10,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;ctx.fillStyle='#FCD34D';ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();
    });

    // Enemies
    G.enemies.filter(e=>e.alive).forEach(e=>{
      const ex=wx(e.x),ey=wy(e.y); if(!on(ex,ey)) return;
      ctx.fillStyle=e.color; ctx.beginPath();ctx.arc(ex,ey,e.size,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
      // HP bar
      const bw=e.size*2+8;
      ctx.fillStyle='#333';ctx.fillRect(ex-bw/2,ey-e.size-10,bw,4);
      ctx.fillStyle=e.color;ctx.fillRect(ex-bw/2,ey-e.size-10,bw*(e.hp/e.maxHp||1),4);
    });

    // Boss
    if(G.boss&&G.boss.alive){
      const b=G.boss; const bx=wx(b.x),by=wy(b.y);
      // Telegraph indicator
      if(b.chargeState==='telegraph'){
        const pct=1-b.telegraphTimer/cfg.boss.chargeTelegraph;
        ctx.globalAlpha=0.5+pct*0.3;ctx.strokeStyle='#e74c3c';ctx.lineWidth=3;
        ctx.setLineDash([10,5]);
        ctx.beginPath();ctx.moveTo(bx,by);
        ctx.lineTo(wx(b.telegraphTargetX),wy(b.telegraphTargetY));
        ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
      }
      // Glow
      const pulse=0.5+Math.sin(Date.now()/400)*0.3;
      ctx.globalAlpha=pulse*0.3;ctx.fillStyle=b.color;
      ctx.beginPath();ctx.arc(bx,by,b.size+14,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      // Body
      ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(bx,by,b.size,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
      // Phase 2 inner ring
      if(G.bossPhase===2){
        ctx.strokeStyle='#e74c3c';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(bx,by,b.size-8,0,Math.PI*2);ctx.stroke();
      }
      // Icon + name
      ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText(b.icon,bx,by+6);
      ctx.fillStyle=b.color;ctx.font='bold 9px sans-serif';
      ctx.fillText(b.name.toUpperCase(),bx,by-b.size-6);
    }

    // Ability effect
    if(G.abilityEffect){
      const fx=G.abilityEffect,px=wx(fx.x),py=wy(fx.y);
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

    // Victory banner (fades after 4s)
    if(G.victoryBannerTimer>0){
      const bt=G.victoryBannerTimer;
      const alpha=bt>3?1:bt/3; // fade out in last 3s
      ctx.globalAlpha=alpha*0.88;
      ctx.fillStyle='#000000';
      ctx.fillRect(0, G.H*0.28, G.W, 200);
      ctx.globalAlpha=alpha;
      // Victory text
      ctx.textAlign='center';
      ctx.font='bold 32px sans-serif';
      ctx.fillStyle='#f1c40f';
      ctx.fillText('VICTORY!', G.W/2, G.H*0.28+52);
      // God name
      ctx.font='16px sans-serif';
      ctx.fillStyle='#ffffff';
      ctx.fillText(`${cfg.boss.icon}  ${cfg.boss.name} Defeated`, G.W/2, G.H*0.28+82);
      // Reward
      ctx.fillStyle=cfg.accent;
      ctx.font='bold 15px sans-serif';
      ctx.fillText(`${cfg.reward.icon}  ${cfg.reward.label} Awarded`, G.W/2, G.H*0.28+114);
      // Portal hint
      ctx.fillStyle='#ffffff88';
      ctx.font='12px sans-serif';
      ctx.fillText('Walk into the portal to return', G.W/2, G.H*0.28+148);
      ctx.globalAlpha=1;
    }

    // Victory portal
    if(G.victory&&G.victoryPortal){
      const vp=G.victoryPortal;
      const vpx=wx(vp.x),vpy=wy(vp.y);
      const t2=Date.now()/1000;
      const pulse=0.65+Math.sin(t2*3)*0.35;
      // Outer glow
      ctx.globalAlpha=pulse*0.35;
      ctx.fillStyle=cfg.accent;
      ctx.beginPath();ctx.arc(vpx,vpy,58,0,Math.PI*2);ctx.fill();
      // Inner portal
      ctx.globalAlpha=0.9;
      ctx.fillStyle='#000000bb';
      ctx.beginPath();ctx.arc(vpx,vpy,36,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ffffff';ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(vpx,vpy,36,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=cfg.accent;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(vpx,vpy,28,0,Math.PI*2);ctx.stroke();
      // Rotating particles
      for(let i=0;i<10;i++){
        const a=(i/10)*Math.PI*2+t2*2.2;
        const rx=vpx+Math.cos(a)*44,ry=vpy+Math.sin(a)*44;
        ctx.globalAlpha=pulse*0.9;
        ctx.fillStyle=cfg.accent;
        ctx.beginPath();ctx.arc(rx,ry,4.5,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;
      // Label
      ctx.fillStyle='#ffffff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';
      ctx.strokeStyle='#000';ctx.lineWidth=3;
      ctx.strokeText('RETURN TO WORLD',vpx,vpy-52);
      ctx.fillText('RETURN TO WORLD',vpx,vpy-52);
      ctx.fillStyle='#ffffff88';ctx.font='11px sans-serif';
      ctx.fillText('walk into the portal',vpx,vpy-36);
    }

    // Attack flash
    if(G.attackFlash){
      const af=G.attackFlash,al=af.timer/0.18;
      ctx.globalAlpha=al*0.7;
      if(af.type==='melee'){
        ctx.strokeStyle='#ffffffcc';ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(wx(af.x),wy(af.y),af.rng||60,0,Math.PI*2);ctx.stroke();
      } else {
        ctx.strokeStyle='#FCD34Dcc';ctx.lineWidth=4;
        ctx.beginPath();
        ctx.moveTo(wx(af.x),wy(af.y));
        ctx.lineTo(wx(af.x)+Math.cos(af.ang||0)*80,wy(af.y)+Math.sin(af.ang||0)*80);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }

    // Player
    const ppx=wx(p.x),ppy=wy(p.y);
    const blinkOn=!p.invincible||Math.sin(Date.now()/80)>0;
    ctx.globalAlpha=blinkOn?1:0.15;
    ctx.fillStyle='#4a90e2';ctx.beginPath();ctx.arc(ppx,ppy,14,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=p.invincible?'#ffffff':'#aaaaaa';ctx.lineWidth=p.invincible?3:2;ctx.stroke();
    ctx.globalAlpha=1;

    // Floats
    G.floats.forEach(f=>{
      const fx=wx(f.x),fy=wy(f.y);
      ctx.globalAlpha=Math.max(0,f.life);
      ctx.font=`bold ${f.big?16:13}px sans-serif`;ctx.textAlign='center';
      ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(f.text,fx,fy);
      ctx.fillStyle=f.color;ctx.fillText(f.text,fx,fy);
    });
    ctx.globalAlpha=1;

    // Wave / boss HP header
    const wx2=G.W/2; ctx.textAlign='center';
    if(G.boss&&G.boss.alive){
      const b=G.boss; const bpct=Math.max(0,b.hp/b.maxHp);
      // Full-width boss banner pinned to bottom of safe area
      const barY=G.H-80;
      ctx.fillStyle='#000000dd';
      ctx.fillRect(0,barY-28,G.W,76);
      // Boss name + phase
      ctx.fillStyle=b.color;ctx.font='bold 13px sans-serif';ctx.textAlign='center';
      ctx.fillText(`${b.icon}  ${b.name.toUpperCase()}${G.bossPhase===2?'  ⚡ PHASE 2':''}`,wx2,barY-10);
      // HP bar — full width with padding
      const pad=16,bh=20;
      ctx.fillStyle='#333';ctx.fillRect(pad,barY,G.W-pad*2,bh);
      const hpColor=bpct>0.5?b.color:bpct>0.25?'#e67e22':'#e74c3c';
      ctx.fillStyle=hpColor;ctx.fillRect(pad,barY,(G.W-pad*2)*bpct,bh);
      ctx.strokeStyle='#ffffff33';ctx.lineWidth=1;ctx.strokeRect(pad,barY,G.W-pad*2,bh);
      // HP numbers centered in bar
      ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';
      ctx.fillText(`${b.hp} / ${b.maxHp}  (${Math.round(bpct*100)}%)`,wx2,barY+bh/2+4);
      // Debug: total damage dealt — confirms hits are registering
      ctx.fillStyle='#ffffff66';ctx.font='10px sans-serif';
      ctx.fillText(`Total dmg dealt: ${G.totalDmgDealt}`,wx2,barY+bh+16);
    } else if(G.wave!=='boss'){
      ctx.fillStyle='#ffffff88';ctx.font='bold 11px sans-serif';
      ctx.fillText(`Wave ${G.wave} / ${cfg.waves.length}`,wx2,20);
    }
  }

  const store = useGameStore.getState();

  return (
    <div style={{ position:'absolute',inset:0 }}>
      <canvas ref={canvasRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',display:'block',touchAction:'none' }} />

      {/* Flee button */}
      {!G.victory && (
        <button onPointerDown={onFlee}
          style={{ position:'absolute',top:54,right:14,background:'#000000cc',border:'1px solid #ffffff55',
            borderRadius:10,padding:'10px 16px',color:'#ffffffcc',fontSize:13,fontWeight:'bold',cursor:'pointer',zIndex:100 }}>
          ✕ Flee
        </button>
      )}

      {/* Victory handled by in-world portal */}
    </div>
  );
}
