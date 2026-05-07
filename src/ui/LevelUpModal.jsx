import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

export default function LevelUpModal() {
  const {
    level, statPoints,
    playerATK, playerDEF, playerSPD,
    spendStatPoint, dismissLevelUp,
  } = useGameStore();

  // Track pending allocations locally so player sees changes before confirming
  const [pending, setPending] = useState({ atk: 0, def: 0, spd: 0 });
  const spent = pending.atk + pending.def + pending.spd;
  const remaining = statPoints - spent;

  const allocate = (stat) => {
    if (remaining <= 0) return;
    setPending(p => ({ ...p, [stat]: p[stat] + 1 }));
  };

  const undo = (stat) => {
    if (pending[stat] <= 0) return;
    setPending(p => ({ ...p, [stat]: p[stat] - 1 }));
  };

  const confirm = () => {
    // Commit all pending allocations to store
    for (let i = 0; i < pending.atk; i++) spendStatPoint('atk');
    for (let i = 0; i < pending.def; i++) spendStatPoint('def');
    for (let i = 0; i < pending.spd; i++) spendStatPoint('spd');
    dismissLevelUp();
  };

  const skipForNow = () => {
    dismissLevelUp();
  };

  const stats = [
    {
      key: 'atk',
      label: 'ATK',
      icon: '⚔️',
      current: playerATK,
      color: '#e74c3c',
      desc: 'Increases damage dealt to enemies',
    },
    {
      key: 'def',
      label: 'DEF',
      icon: '🛡️',
      current: playerDEF,
      color: '#3498db',
      desc: 'Reduces damage taken from enemies',
    },
    {
      key: 'spd',
      label: 'SPD',
      icon: '💨',
      current: playerSPD,
      color: '#2ecc71',
      desc: 'Increases movement speed',
    },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: '#000000cc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #0d0d1a 0%, #1a1a3a 100%)',
        border: '2px solid #d4af37',
        borderRadius: 16, padding: 28,
        width: '88%', maxWidth: 340,
        color: '#fff',
        boxShadow: '0 0 40px #d4af3733',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>⭐</div>
          <h2 style={{ color: '#d4af37', fontSize: 24, margin: '0 0 4px', fontWeight: 'bold' }}>
            LEVEL UP!
          </h2>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
            You reached <strong style={{ color: '#fff' }}>Level {level}</strong>
          </p>
        </div>

        {/* Points remaining */}
        <div style={{
          textAlign: 'center', marginBottom: 20,
          background: remaining > 0 ? '#d4af3722' : '#ffffff11',
          border: `1px solid ${remaining > 0 ? '#d4af37' : '#333'}`,
          borderRadius: 10, padding: '10px 0',
        }}>
          <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: 16 }}>
            {remaining}
          </span>
          <span style={{ color: '#888', fontSize: 13 }}> stat point{remaining !== 1 ? 's' : ''} remaining</span>
        </div>

        {/* Stat rows */}
        {stats.map(({ key, label, icon, current, color, desc }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 12,
            background: pending[key] > 0 ? `${color}11` : '#ffffff08',
            border: `1px solid ${pending[key] > 0 ? color + '44' : '#ffffff11'}`,
            borderRadius: 10, padding: '10px 12px',
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color, fontWeight: 'bold', fontSize: 15 }}>{label}</span>
                <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                  {current + pending[key]}
                </span>
                {pending[key] > 0 && (
                  <span style={{ color, fontSize: 12 }}>+{pending[key]}</span>
                )}
              </div>
              <div style={{ color: '#555', fontSize: 10, marginTop: 1 }}>{desc}</div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {pending[key] > 0 && (
                <button
                  onClick={() => undo(key)}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: '#333', border: '1px solid #555',
                    color: '#aaa', fontSize: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >−</button>
              )}
              <button
                onClick={() => allocate(key)}
                disabled={remaining <= 0}
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: remaining > 0 ? color : '#222',
                  border: 'none',
                  color: remaining > 0 ? '#fff' : '#444',
                  fontSize: 20, fontWeight: 'bold',
                  cursor: remaining > 0 ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          </div>
        ))}

        {/* Buttons */}
        <button
          onClick={confirm}
          style={{
            width: '100%', padding: '14px 0',
            background: '#d4af37', border: 'none',
            borderRadius: 10, color: '#0d0d1a',
            fontWeight: 'bold', fontSize: 16,
            cursor: 'pointer', marginTop: 8,
          }}
        >
          Confirm{spent > 0 ? ` (+${spent} points)` : ''}
        </button>

        {remaining > 0 && (
          <button
            onClick={skipForNow}
            style={{
              width: '100%', padding: '10px 0', marginTop: 8,
              background: 'none', border: '1px solid #333',
              borderRadius: 10, color: '#555',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Decide later ({remaining} point{remaining !== 1 ? 's' : ''} saved)
          </button>
        )}
      </div>
    </div>
  );
}
