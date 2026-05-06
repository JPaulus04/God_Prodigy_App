import React from 'react';
import { useGameStore }  from '../store/useGameStore';
import { InputState }    from '../game/systems/InputState';
import VirtualJoystick   from './VirtualJoystick';

export default function HUD() {
  const {
    playerHP, playerMaxHP,
    playerName,
    resources,
    ascensionProgress,
    toggleHelpMenu,
  } = useGameStore();

  const hpPct   = Math.max(0, (playerHP / playerMaxHP) * 100);
  const hpColor = hpPct > 50 ? '#2ecc71' : hpPct > 25 ? '#f39c12' : '#e74c3c';

  const onAttack = () => {
    InputState.attack = true;
    setTimeout(() => { InputState.attack = false; }, 80);
  };

  const onInteract = () => {
    InputState.interact = true;
    setTimeout(() => { InputState.interact = false; }, 80);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

      {/* ── Top-left: Name + HP + Resources ─────────────── */}
      <div style={{
        position: 'absolute', top: 52, left: 14,
        display: 'flex', flexDirection: 'column', gap: 8,
        maxWidth: '60%',
      }}>
        {/* Player name */}
        <div style={{
          color: '#d4af37', fontSize: 17, fontWeight: 'bold',
          textShadow: '0 1px 4px #000',
        }}>
          {playerName || 'Warrior'}
        </div>

        {/* HP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#e74c3c', fontSize: 18 }}>❤</span>
          <div style={{
            flex: 1, height: 16, background: '#222',
            borderRadius: 8, overflow: 'hidden',
            border: '1px solid #555', minWidth: 120,
          }}>
            <div style={{
              width: `${hpPct}%`, height: '100%',
              background: hpColor, borderRadius: 8,
              transition: 'width 0.2s, background 0.3s',
            }} />
          </div>
          <span style={{
            color: '#ddd', fontSize: 13, fontWeight: 'bold',
            textShadow: '0 1px 3px #000', minWidth: 52,
          }}>
            {playerHP}/{playerMaxHP}
          </span>
        </div>

        {/* Resources */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { k: 'wood',  icon: '🪵', col: '#27ae60' },
            { k: 'stone', icon: '🪨', col: '#95a5a6' },
            { k: 'ore',   icon: '⛏',  col: '#e67e22' },
          ].map(({ k, icon, col }) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#000000aa', padding: '5px 10px',
              borderRadius: 12, border: `1px solid ${col}55`,
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{
                color: '#fff', fontSize: 16, fontWeight: 'bold',
                textShadow: '0 1px 3px #000',
              }}>
                {resources[k]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top-right: Ascension tracker ─────────────────── */}
      <div style={{
        position: 'absolute', top: 52, right: 14,
        background: '#000000aa', border: '1px solid #d4af3766',
        borderRadius: 10, padding: '8px 14px', textAlign: 'center',
        minWidth: 72,
      }}>
        <div style={{
          color: '#d4af37', fontSize: 11, fontWeight: 'bold',
          letterSpacing: 1, marginBottom: 2,
        }}>
          ASCENSION
        </div>
        <div style={{
          color: '#fff', fontSize: 24, fontWeight: 'bold', lineHeight: 1,
        }}>
          {ascensionProgress}
          <span style={{ color: '#444', fontSize: 15 }}>/10</span>
        </div>
      </div>

      {/* ── Help button ───────────────────────────────────── */}
      <button
        onClick={toggleHelpMenu}
        style={{
          position: 'absolute', top: 52,
          left: '50%', transform: 'translateX(-50%)',
          background: '#000000aa', border: '1px solid #555',
          color: '#ccc', borderRadius: 18,
          padding: '8px 20px', fontSize: 15,
          cursor: 'pointer', pointerEvents: 'all',
          fontWeight: 'bold',
        }}
      >
        ? Help
      </button>

      {/* ── Bottom controls ───────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '0 20px 44px',
        pointerEvents: 'all',
      }}>
        {/* Joystick — bottom left */}
        <VirtualJoystick />

        {/* Action buttons — bottom right */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 14, alignItems: 'center',
        }}>
          {/* Interact / E */}
          <button
            onPointerDown={onInteract}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#1abc9c33',
              border: '3px solid #1abc9c',
              color: '#1abc9c', fontSize: 20, fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px #1abc9c44',
            }}
          >
            E
          </button>

          {/* Attack */}
          <button
            onPointerDown={onAttack}
            style={{
              width: 88, height: 88, borderRadius: '50%',
              background: '#e74c3c33',
              border: '3px solid #e74c3c',
              color: '#fff', fontSize: 30,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px #e74c3c55',
            }}
          >
            ⚔️
          </button>
        </div>
      </div>
    </div>
  );
}
