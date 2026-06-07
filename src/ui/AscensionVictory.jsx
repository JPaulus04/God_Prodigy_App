import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

const GODS = [
  { realm: 'forest',   name: 'Sylvara',    icon: '🌿', color: '#27ae60' },
  { realm: 'wind',     name: 'Zephyros',   icon: '💨', color: '#87ceeb' },
  { realm: 'earth',    name: 'Terran',     icon: '🪨', color: '#95a5a6' },
  { realm: 'fire',     name: 'Pyraxis',    icon: '🔥', color: '#e74c3c' },
  { realm: 'water',    name: 'Thalassa',   icon: '🌊', color: '#3498db' },
  { realm: 'shadow',   name: 'Umbrix',     icon: '🌑', color: '#9b59b6' },
  { realm: 'ice',      name: 'Glaciun',    icon: '❄️', color: '#aed6f1' },
  { realm: 'thunder',  name: 'Voltaran',   icon: '⚡', color: '#f1c40f' },
  { realm: 'void',     name: 'Vexarath',   icon: '🌀', color: '#8e44ad' },
  { realm: 'celestial',name: 'Aetherion',  icon: '✨', color: '#d4af37' },
];

export default function AscensionVictory() {
  const { playerName, level, killCount, openPrestigeSelect, setGamePhase } = useGameStore();
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('stars'); // stars → title → gods → actions
  const [visibleGods, setVisibleGods] = useState(0);

  // Particle star field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.8 + 0.3,
      speed: Math.random() * 0.4 + 0.1,
      brightness: Math.random(),
    }));

    let raf;
    const draw = () => {
      ctx.fillStyle = '#000010';
      ctx.fillRect(0, 0, W, H);
      stars.forEach(s => {
        s.brightness += (Math.random() - 0.5) * 0.05;
        s.brightness = Math.max(0.2, Math.min(1, s.brightness));
        s.y -= s.speed;
        if (s.y < 0) { s.y = H; s.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,200,${s.brightness})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sequence the reveal
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('title'),   400);
    const t2 = setTimeout(() => setPhase('gods'),   1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== 'gods') return;
    let idx = 0;
    const tick = () => {
      idx++;
      setVisibleGods(idx);
      if (idx < GODS.length) setTimeout(tick, 180);
      else setTimeout(() => setPhase('actions'), 800);
    };
    setTimeout(tick, 200);
  }, [phase]);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 500,
      background: '#000010',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      {/* Star canvas */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 420,
        padding: '0 20px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'calc(env(safe-area-inset-top) + 40px)',
      }}>
        {/* Title */}
        {phase !== 'stars' && (
          <div style={{
            textAlign: 'center', marginBottom: 28,
            animation: 'gpVicFadeIn 0.8s ease forwards',
          }}>
            <div style={{ fontSize: 52, marginBottom: 8, filter: 'drop-shadow(0 0 24px #d4af37)' }}>
              👑
            </div>
            <h1 style={{
              color: '#d4af37', fontSize: 28, margin: '0 0 6px',
              letterSpacing: 2, textShadow: '0 0 20px #d4af3788',
              fontWeight: 'bold',
            }}>
              ASCENSION COMPLETE
            </h1>
            <p style={{ color: '#ffffff99', fontSize: 14, margin: 0 }}>
              {playerName || 'Warrior'} has defeated all 10 Elemental Gods
            </p>
            <p style={{ color: '#d4af3799', fontSize: 12, marginTop: 4 }}>
              Lv.{level} · {(killCount || 0).toLocaleString()} kills
            </p>
          </div>
        )}

        {/* Gods defeated list */}
        {phase !== 'stars' && (
          <div style={{
            width: '100%', display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8, marginBottom: 24,
          }}>
            {GODS.map((g, i) => (
              <div key={g.realm} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: i < visibleGods ? `${g.color}22` : '#ffffff08',
                border: `1px solid ${i < visibleGods ? g.color + '88' : '#333'}`,
                borderRadius: 10, padding: '8px 10px',
                opacity: i < visibleGods ? 1 : 0.25,
                transition: 'all 0.3s ease',
              }}>
                <span style={{ fontSize: 18 }}>{i < visibleGods ? g.icon : '❔'}</span>
                <div>
                  <div style={{
                    color: i < visibleGods ? g.color : '#555',
                    fontSize: 12, fontWeight: 'bold',
                    transition: 'color 0.3s ease',
                  }}>{g.name}</div>
                  <div style={{ color: '#ffffff44', fontSize: 10 }}>
                    {i < visibleGods ? '⚔ Defeated' : '...'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {phase === 'actions' && (
          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: 12,
            animation: 'gpVicFadeIn 0.6s ease forwards',
          }}>
            {/* Prestige / New Journey */}
            <button
              onClick={() => openPrestigeSelect()}
              style={{
                width: '100%', padding: '18px',
                background: 'linear-gradient(135deg, #1a1200, #2a2000)',
                border: '2px solid #d4af37',
                borderRadius: 14, color: '#d4af37',
                fontSize: 16, fontWeight: 'bold',
                cursor: 'pointer', letterSpacing: 1,
                boxShadow: '0 0 20px #d4af3744',
              }}
            >
              ✨ Prestige — New Journey
              <div style={{ fontSize: 11, color: '#d4af3799', marginTop: 3, fontWeight: 'normal' }}>
                Start fresh · your legend endures
              </div>
            </button>

            {/* Keep exploring */}
            <button
              onClick={() => setGamePhase('world')}
              style={{
                width: '100%', padding: '14px',
                background: '#0a1a0d',
                border: '2px solid #2ecc71',
                borderRadius: 14, color: '#2ecc71',
                fontSize: 14, fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🗺 Keep Exploring
              <div style={{ fontSize: 11, color: '#2ecc7188', marginTop: 2, fontWeight: 'normal' }}>
                Continue in the world as a god
              </div>
            </button>
          </div>
        )}

        <div style={{ height: 'calc(env(safe-area-inset-bottom) + 20px)' }} />
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes gpVicFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
