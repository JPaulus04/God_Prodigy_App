import React, { useEffect, useRef } from 'react';
import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import RealmArenaCanvas from './RealmArenaCanvas';

const REALM_CONFIGS = {
  forest: {
    name: 'Forest Realm',
    god: 'Sylvara, Goddess of the Forest',
    icon: '🌿',
    color: '#27ae60',
    bgColor: '#0a1f10',
    skulls: 1,
    description: 'Ancient trees that whisper dark secrets. Guardian spirits protect their goddess. Bring a sharp blade and quick feet.',
    enemies: 'Thornlings, Forest Wraiths',
    reward: 'Nature Essence',
  },
  wind: {
    name: 'Wind Realm',
    god: 'Zephyros, God of Wind',
    icon: '💨',
    color: '#87ceeb',
    bgColor: '#080f18',
    skulls: 1,
    description: 'Howling gales and invisible foes that strike from every direction. Speed is your only ally here.',
    enemies: 'Wind Sprites, Gale Wraiths',
    reward: 'Storm Fragment',
  },
  earth: {
    name: 'Earth Realm',
    god: 'Terran, God of Earth',
    icon: '🪨',
    color: '#95a5a6',
    bgColor: '#131310',
    skulls: 2,
    description: 'Crushing stone giants and trembling ground. Heavy armor recommended. The earth itself fights against you.',
    enemies: 'Stone Brutes, Rock Sentinels',
    reward: 'Earth Core',
  },
  fire: {
    name: 'Fire Realm',
    god: 'Ignar, God of Fire',
    icon: '🔥',
    color: '#e74c3c',
    bgColor: '#1a0500',
    skulls: 2,
    description: 'Lava flows and fire imps that swarm without mercy. The air burns your lungs. The Fire Shard only opens the door.',
    enemies: 'Fire Imps, Lava Brutes',
    reward: 'Flame Core',
  },
  ice: {
    name: 'Ice Realm',
    god: 'Glacius, God of Ice',
    icon: '❄️',
    color: '#3498db',
    bgColor: '#050f18',
    skulls: 3,
    description: 'Frozen tundra where your movement slows to a crawl. Ice elementals appear from nowhere. The Cold God waits at the end.',
    enemies: 'Frost Shades, Ice Colossi',
    reward: 'Glacial Shard',
  },
  ocean: {
    name: 'Ocean Realm',
    god: 'Nepthar, God of the Ocean',
    icon: '🌊',
    color: '#1abc9c',
    bgColor: '#030f15',
    skulls: 3,
    description: 'The deep waters drag you down. Currents push you off course. Sea serpents lurk in the darkness below.',
    enemies: 'Deep Ones, Tide Serpents',
    reward: 'Sea Crystal',
  },
  storm: {
    name: 'Storm Realm',
    god: 'Vortus, God of Storms',
    icon: '⚡',
    color: '#9b59b6',
    bgColor: '#0a0515',
    skulls: 4,
    description: 'Lightning strikes without warning. The ground itself conducts the charge. Only the fastest survive the Storm God\'s domain.',
    enemies: 'Thunder Wraiths, Lightning Colossi',
    reward: 'Storm Heart',
  },
  shadow: {
    name: 'Shadow Realm',
    god: 'Umbris, God of Shadow',
    icon: '🌑',
    color: '#6c3483',
    bgColor: '#020205',
    skulls: 4,
    description: 'Total darkness except where you stand. Enemies can see you — you cannot see them. Trust nothing.',
    enemies: 'Shadow Stalkers, Void Shades',
    reward: 'Dark Essence',
  },
  lava: {
    name: 'Lava Realm',
    god: 'Magmara, Goddess of Lava',
    icon: '🌋',
    color: '#e67e22',
    bgColor: '#1a0800',
    skulls: 5,
    description: 'Rivers of magma cut off your escape. Ancient volcanic titans rise from the earth. Only gods survive here.',
    enemies: 'Magma Titans, Lava Golems',
    reward: 'Magma Core',
  },
  void: {
    name: 'Void Realm',
    god: 'Nihilus, God of the Void',
    icon: '✨',
    color: '#f1c40f',
    bgColor: '#000003',
    skulls: 5,
    description: 'Reality unravels at the edges. The final god unmakes existence itself. Defeat Nihilus and Ascend.',
    enemies: 'Void Revenants, Reality Shards',
    reward: 'Void Shard — Key to Ascension',
  },
};

export default function RealmCanvas() {
  const [inArena, setInArena] = useState(false);
  const { currentRealm, realmEntryEdge, setGamePhase, bossesDefeated } = useGameStore();
  const cfg = REALM_CONFIGS[currentRealm] || REALM_CONFIGS.forest;
  const isDefeated = bossesDefeated?.includes(currentRealm);

  // Particle animation
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const particles = useRef(
    Array.from({ length: 30 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008,
      vy: -Math.random() * 0.001 - 0.0003,
      size: Math.random() * 3 + 1,
      alpha: Math.random(),
    }))
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      particles.current.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        ctx.globalAlpha = p.alpha * 0.6;
        ctx.fillStyle = cfg.color;
        ctx.beginPath(); ctx.arc(p.x*W, p.y*H, p.size, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, [currentRealm]);

  if (inArena) {
    return (
      <RealmArenaCanvas
        realmId={currentRealm || 'forest'}
        onFlee={() => { setInArena(false); setGamePhase('world'); }}
      />
    );
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: `linear-gradient(180deg, ${cfg.bgColor} 0%, #000 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 28px',
      paddingTop: 'calc(40px + env(safe-area-inset-top))',
    }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380, width: '100%' }}>

        {/* Icon */}
        <div style={{ fontSize: 64, marginBottom: 12, filter: `drop-shadow(0 0 20px ${cfg.color})` }}>
          {cfg.icon}
        </div>

        {/* Realm name */}
        <h1 style={{
          color: cfg.color, fontSize: 28, fontWeight: 'bold',
          margin: '0 0 4px', letterSpacing: 2,
          textShadow: `0 0 30px ${cfg.color}66`,
        }}>
          {cfg.name.toUpperCase()}
        </h1>

        {/* God name */}
        <p style={{ color: '#ffffff66', fontSize: 13, margin: '0 0 16px', fontStyle: 'italic' }}>
          {cfg.god}
        </p>

        {/* Difficulty + defeated badge */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ fontSize: 16, opacity: i < cfg.skulls ? 1 : 0.15 }}>💀</span>
            ))}
          </div>
          {isDefeated && (
            <div style={{
              background: '#1a3a1a', border: '1px solid #2ecc71',
              borderRadius: 20, padding: '3px 12px',
              color: '#2ecc71', fontSize: 11, fontWeight: 'bold',
            }}>✓ DEFEATED</div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `${cfg.color}33`, marginBottom: 20 }} />

        {/* Description */}
        <p style={{ color: '#aaa', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
          {cfg.description}
        </p>

        {/* Enemies & reward */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 28, justifyContent: 'center',
        }}>
          <div style={{
            background: '#ffffff08', borderRadius: 10, padding: '10px 14px',
            border: `1px solid ${cfg.color}33`, flex: 1,
          }}>
            <div style={{ color: '#666', fontSize: 9, marginBottom: 4, letterSpacing: 1 }}>ENEMIES</div>
            <div style={{ color: '#ccc', fontSize: 11 }}>{cfg.enemies}</div>
          </div>
          <div style={{
            background: '#ffffff08', borderRadius: 10, padding: '10px 14px',
            border: `1px solid ${cfg.color}33`, flex: 1,
          }}>
            <div style={{ color: '#666', fontSize: 9, marginBottom: 4, letterSpacing: 1 }}>REWARD</div>
            <div style={{ color: cfg.color, fontSize: 11 }}>{cfg.reward}</div>
          </div>
        </div>

        {/* Entry direction info */}
        <div style={{
          background: '#ffffff08', borderRadius: 10, padding: '10px 14px',
          border: `1px solid ${cfg.color}22`, marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>
            {{ north:'▲', south:'▼', east:'▶', west:'◀' }[realmEntryEdge] || '▶'}
          </span>
          <div style={{ color: '#777', fontSize: 11 }}>
            Entered from the <strong style={{ color: '#aaa' }}>{realmEntryEdge}</strong> edge.
            Return to that edge to exit.
          </div>
        </div>

        {/* CTA row */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Return to World */}
          <button
            onPointerDown={() => {
              try { useGameStore.getState().setCurrentRealm(null); } catch(e) {}
              setGamePhase('world');
            }}
            style={{
              flex: 1, padding: '14px',
              background: '#1a1a2e', border: `1px solid ${cfg.color}66`,
              borderRadius: 12, color: cfg.color,
              fontSize: 14, fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            ← World
          </button>

          {/* Enter Realm */}
          <button
            onPointerDown={() => setInArena(true)}
            style={{
              flex: 2, padding: '16px',
              background: cfg.color, border: 'none', borderRadius: 12,
              color: '#000', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
              boxShadow: `0 0 20px ${cfg.color}66`,
            }}
          >
            ⚔ Enter Realm
          </button>
        </div>
      </div>
    </div>
  );
}

