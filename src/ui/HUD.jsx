import React from 'react';
import { useGameStore }  from '../store/useGameStore';
import { InputState }    from '../game/systems/InputState';
import VirtualJoystick   from './VirtualJoystick';

export default function HUD() {
  const {
    playerHP, playerMaxHP,
    playerName,
    level, xp, xpToNextLevel, statPoints,
    resources, ascensionProgress,
    toggleHelpMenu, toggleInventory, showInventory,
  } = useGameStore();

  const hpPct  = Math.max(0, (playerHP / playerMaxHP) * 100);
  const hpColor = hpPct > 50 ? '#2ecc71' : hpPct > 25 ? '#f39c12' : '#e74c3c';

  // XP bar — show progress toward next level
  const prevThreshold = xp >= xpToNextLevel ? xpToNextLevel : 0;
  const xpPct = xpToNextLevel > 0
    ? Math.min(100, (xp / xpToNextLevel) * 100)
    : 100;

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

      {/* ── Top-left: Name + Level + HP + XP + Resources ─── */}
      <div style={{
        position: 'absolute', top: 56, left: 14,
        display: 'flex', flexDirection: 'column', gap: 5,
        maxWidth: '58%',
      }}>

        {/* Name + Level */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: '#d4af37', fontSize: 17, fontWeight: 'bold', textShadow: '0 1px 4px #000' }}>
            {playerName || 'Warrior'}
          </span>
          <span style={{
            color: '#fff', fontSize: 11, fontWeight: 'bold',
            background: '#d4af3733', border: '1px solid #d4af3766',
            borderRadius: 6, padding: '1px 6px',
          }}>
            Lv.{level}
          </span>
          {statPoints > 0 && (
            <span style={{
              color: '#0d0d1a', fontSize: 10, fontWeight: 'bold',
              background: '#d4af37', borderRadius: 10,
              padding: '1px 6px', animation: 'pulse 1s infinite',
            }}>
              +{statPoints} pts
            </span>
          )}
        </div>

        {/* HP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color: '#e74c3c', fontSize: 16 }}>❤</span>
          <div style={{
            flex: 1, height: 14, background: '#222',
            borderRadius: 7, overflow: 'hidden',
            border: '1px solid #555', minWidth: 100,
          }}>
            <div style={{
              width: `${hpPct}%`, height: '100%',
              background: hpColor, borderRadius: 7,
              transition: 'width 0.2s, background 0.3s',
            }} />
          </div>
          <span style={{ color: '#ddd', fontSize: 11, minWidth: 46 }}>
            {playerHP}/{playerMaxHP}
          </span>
        </div>

        {/* XP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color: '#9b59b6', fontSize: 12 }}>✦</span>
          <div style={{
            flex: 1, height: 6, background: '#1a1a2e',
            borderRadius: 3, overflow: 'hidden',
            border: '1px solid #333', minWidth: 100,
          }}>
            <div style={{
              width: `${xpPct}%`, height: '100%',
              background: 'linear-gradient(90deg, #8e44ad, #9b59b6)',
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ color: '#666', fontSize: 9, minWidth: 46 }}>
            {xp}/{xpToNextLevel} XP
          </span>
        </div>

        {/* Resources */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { k: 'wood',  icon: '🪵', col: '#27ae60' },
            { k: 'stone', icon: '🪨', col: '#95a5a6' },
            { k: 'ore',   icon: '⛏',  col: '#e67e22' },
          ].map(({ k, icon, col }) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#000000aa', padding: '3px 7px',
              borderRadius: 10, border: `1px solid ${col}44`,
            }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', textShadow: '0 1px 3px #000' }}>
                {resources[k] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top-right: Ascension + Bag ────────────────────── */}
      <div style={{
        position: 'absolute', top: 56, right: 14,
        display: 'flex', flexDirection: 'column',
        gap: 10, alignItems: 'flex-end',
        pointerEvents: 'all',
      }}>
        {/* Ascension */}
        <div style={{
          background: '#000000aa', border: '1px solid #d4af3766',
          borderRadius: 10, padding: '6px 12px', textAlign: 'center', minWidth: 70,
        }}>
          <div style={{ color: '#d4af37', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>ASCENSION</div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', lineHeight: 1.2 }}>
            {ascensionProgress}<span style={{ color: '#444', fontSize: 13 }}>/10</span>
          </div>
        </div>

        {/* Bag button — badge if stat points unspent */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleInventory}
            style={{
              background:   showInventory ? '#d4af37' : '#000000bb',
              border:       `2px solid ${showInventory ? '#d4af37' : '#888'}`,
              borderRadius: 12,
              padding:      '10px 16px',
              fontSize:     22,
              cursor:       'pointer',
              color:        showInventory ? '#0d0d1a' : '#fff',
              boxShadow:    showInventory ? '0 0 12px #d4af3777' : 'none',
            }}
          >🎒</button>
          {statPoints > 0 && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              background: '#e74c3c', borderRadius: '50%',
              width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 'bold', color: '#fff',
              border: '2px solid #0d0d1a',
            }}>
              {statPoints}
            </div>
          )}
        </div>
      </div>

      {/* ── Help button ───────────────────────────────────── */}
      <button
        onClick={toggleHelpMenu}
        style={{
          position: 'absolute', top: 56,
          left: '50%', transform: 'translateX(-50%)',
          background: '#000000aa', border: '1px solid #444',
          color: '#ccc', borderRadius: 18,
          padding: '8px 18px', fontSize: 14,
          cursor: 'pointer', pointerEvents: 'all', fontWeight: 'bold',
        }}
      >
        ? Help
      </button>

      {/* ── Bottom controls ───────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '0 20px 44px',
        pointerEvents: 'all',
      }}>
        <VirtualJoystick />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <button
            onPointerDown={onInteract}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#1abc9c33', border: '3px solid #1abc9c',
              color: '#1abc9c', fontSize: 20, fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px #1abc9c44',
            }}
          >E</button>

          <button
            onPointerDown={onAttack}
            style={{
              width: 88, height: 88, borderRadius: '50%',
              background: '#e74c3c33', border: '3px solid #e74c3c',
              color: '#fff', fontSize: 30, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px #e74c3c55',
            }}
          >⚔️</button>
        </div>
      </div>
    </div>
  );
}
