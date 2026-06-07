import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

// Tiny particle burst using CSS keyframes
const STYLE = `
@keyframes lvlSlide {
  from { opacity:0; transform: scale(0.85) translateY(30px); }
  to   { opacity:1; transform: scale(1)    translateY(0);    }
}
@keyframes lvlParticle {
  0%   { opacity:1; transform: translate(0,0) scale(1); }
  100% { opacity:0; transform: translate(var(--px),var(--py)) scale(0.3); }
}
@keyframes lvlPulse {
  0%,100% { box-shadow: 0 0 20px #d4af3744; }
  50%      { box-shadow: 0 0 48px #d4af3799; }
}
`;

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist  = 55 + Math.random() * 40;
  return {
    id: i,
    px: `${Math.cos(angle) * dist}px`,
    py: `${Math.sin(angle) * dist}px`,
    color: i % 3 === 0 ? '#f1c40f' : i % 3 === 1 ? '#e67e22' : '#fff',
    delay: `${(i / 14) * 0.25}s`,
  };
});

export default function LevelUpModal() {
  const {
    level, statPoints,
    playerATK, playerDEF, playerSPD,
    spendStatPoint, dismissLevelUp,
  } = useGameStore();

  const [pending, setPending] = useState({ atk: 0, def: 0, spd: 0 });
  const [burst,   setBurst]   = useState(true);
  const spent     = pending.atk + pending.def + pending.spd;
  const remaining = statPoints - spent;

  useEffect(() => {
    const t = setTimeout(() => setBurst(false), 900);
    return () => clearTimeout(t);
  }, []);

  const allocate = (stat) => { if (remaining <= 0) return; setPending(p => ({ ...p, [stat]: p[stat] + 1 })); };
  const undo     = (stat) => { if (pending[stat] <= 0) return; setPending(p => ({ ...p, [stat]: p[stat] - 1 })); };

  const confirm = () => {
    for (let i = 0; i < pending.atk; i++) spendStatPoint('atk');
    for (let i = 0; i < pending.def; i++) spendStatPoint('def');
    for (let i = 0; i < pending.spd; i++) spendStatPoint('spd');
    dismissLevelUp();
  };

  const stats = [
    { key: 'atk', label: 'ATK', icon: '⚔️', current: playerATK, color: '#e74c3c', desc: 'Damage output' },
    { key: 'def', label: 'DEF', icon: '🛡️', current: playerDEF, color: '#3498db', desc: 'Damage reduction' },
    { key: 'spd', label: 'SPD', icon: '💨', current: playerSPD, color: '#2ecc71', desc: 'Move speed' },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: '#000000cc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{STYLE}</style>

      {/* Particles */}
      {burst && PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 8, height: 8, borderRadius: '50%',
          background: p.color,
          '--px': p.px, '--py': p.py,
          animation: `lvlParticle 0.8s ease-out ${p.delay} both`,
          pointerEvents: 'none',
        }} />
      ))}

      <div style={{
        background: 'linear-gradient(160deg, #0d0d1a 0%, #1a1a3a 100%)',
        border: '2px solid #d4af37',
        borderRadius: 20, padding: '28px 24px',
        width: '90%', maxWidth: 340, color: '#fff',
        animation: 'lvlSlide 0.35s cubic-bezier(0.34,1.56,0.64,1) both, lvlPulse 2s ease-in-out 0.4s infinite',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 42, marginBottom: 6, filter: 'drop-shadow(0 0 14px #f1c40f)' }}>⭐</div>
          <h2 style={{ color: '#d4af37', fontSize: 26, margin: '0 0 4px', fontWeight: 900, letterSpacing: 1 }}>
            LEVEL UP!
          </h2>
          <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>
            You reached <strong style={{ color: '#fff' }}>Level {level}</strong>
          </p>
        </div>

        {/* Points remaining */}
        <div style={{
          textAlign: 'center', marginBottom: 18,
          background: remaining > 0 ? '#d4af3715' : '#ffffff08',
          border: `1px solid ${remaining > 0 ? '#d4af3788' : '#333'}`,
          borderRadius: 10, padding: '10px 0',
        }}>
          <span style={{ color: '#d4af37', fontWeight: 800, fontSize: 18 }}>{remaining}</span>
          <span style={{ color: '#888', fontSize: 13 }}> stat point{remaining !== 1 ? 's' : ''} remaining</span>
        </div>

        {/* Stat rows */}
        {stats.map(({ key, label, icon, current, color, desc }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid #1a1a2e',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div>
                <div style={{ color, fontWeight: 700, fontSize: 13 }}>{label}</div>
                <div style={{ color: '#555', fontSize: 10 }}>{desc}</div>
              </div>
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, minWidth: 36, textAlign: 'center' }}>
              {current + pending[key]}
              {pending[key] > 0 && <span style={{ color: '#2ecc71', fontSize: 11 }}> +{pending[key]}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => undo(key)} disabled={pending[key] <= 0} style={{
                width: 32, height: 32, borderRadius: 8,
                background: pending[key] > 0 ? '#2a1a1a' : '#111',
                border: `1px solid ${pending[key] > 0 ? '#e74c3c' : '#222'}`,
                color: pending[key] > 0 ? '#e74c3c' : '#333',
                fontSize: 16, cursor: pending[key] > 0 ? 'pointer' : 'default',
              }}>−</button>
              <button onClick={() => allocate(key)} disabled={remaining <= 0} style={{
                width: 32, height: 32, borderRadius: 8,
                background: remaining > 0 ? '#1a2a1a' : '#111',
                border: `1px solid ${remaining > 0 ? '#2ecc71' : '#222'}`,
                color: remaining > 0 ? '#2ecc71' : '#333',
                fontSize: 16, cursor: remaining > 0 ? 'pointer' : 'default',
              }}>+</button>
            </div>
          </div>
        ))}

        {/* Actions */}
        <button onClick={confirm} style={{
          width: '100%', marginTop: 20, padding: '14px 0',
          background: 'linear-gradient(135deg,#d4af37,#f5c842)',
          border: 'none', borderRadius: 12,
          color: '#0d0d1a', fontWeight: 800, fontSize: 15,
          cursor: 'pointer', letterSpacing: 0.5,
        }}>
          {spent > 0 ? `Confirm (+${spent})` : 'Confirm'}
        </button>
        <button onClick={dismissLevelUp} style={{
          width: '100%', marginTop: 8, padding: '10px 0',
          background: 'none', border: '1px solid #333',
          borderRadius: 10, color: '#666',
          fontSize: 13, cursor: 'pointer',
        }}>Skip for now</button>
      </div>
    </div>
  );
}
