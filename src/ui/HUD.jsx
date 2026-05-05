import React from 'react';
import { useGameStore } from '../store/useGameStore';

export default function HUD() {
  const {
    playerName,
    playerHP,
    playerMaxHP,
    playerATK,
    playerDEF,
    resources,
    ascensionProgress,
    toggleHelpMenu,
    toggleInventory,
  } = useGameStore();

  const hpPct = Math.max(0, (playerHP / playerMaxHP) * 100);
  const hpColor = hpPct > 50 ? '#00e676' : hpPct > 25 ? '#ffeb3b' : '#ff1744';

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      fontFamily: 'Georgia, serif',
    }}>

      {/* ── Top Bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '10px 14px 6px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 100%)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>

        {/* Player info */}
        <div>
          <div style={{ color: '#d4af37', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>
            {playerName || 'Wanderer'}
          </div>

          {/* HP Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#ff6b6b', fontSize: 10 }}>HP</span>
            <div style={{
              width: 110, height: 8, background: '#333',
              borderRadius: 4, overflow: 'hidden', border: '1px solid #555',
            }}>
              <div style={{
                width: `${hpPct}%`, height: '100%',
                background: hpColor,
                transition: 'width 0.3s, background 0.3s',
                borderRadius: 4,
              }} />
            </div>
            <span style={{ color: '#fff', fontSize: 9 }}>{playerHP}/{playerMaxHP}</span>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
            <span style={{ color: '#ff7043', fontSize: 9 }}>⚔ {playerATK}</span>
            <span style={{ color: '#42a5f5', fontSize: 9 }}>🛡 {playerDEF}</span>
          </div>
        </div>

        {/* Ascension tracker */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#d4af37', fontSize: 9, marginBottom: 3 }}>ASCENSION</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: 2,
                background: i < ascensionProgress ? '#d4af37' : '#333',
                border: '1px solid #555',
              }} />
            ))}
          </div>
          <div style={{ color: '#888', fontSize: 8, marginTop: 2 }}>
            {ascensionProgress}/10 Gods
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, pointerEvents: 'auto' }}>
          <button onClick={toggleHelpMenu} style={btnStyle('#1a2a4a', '#4488ff')}>
            ? HELP
          </button>
          <button onClick={toggleInventory} style={btnStyle('#2a1a4a', '#8855ff')}>
            🎒 BAG
          </button>
        </div>
      </div>

      {/* ── Resource Bar ── */}
      <div style={{
        position: 'absolute', top: 80, left: 14,
        display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        <ResourcePill icon="🪵" label="Wood"  value={resources.wood}  color="#a5d6a7" />
        <ResourcePill icon="🪨" label="Stone" value={resources.stone} color="#b0bec5" />
        <ResourcePill icon="⛏"  label="Ore"   value={resources.ore}   color="#ff8a65" />
      </div>

    </div>
  );
}

function ResourcePill({ icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(0,0,0,0.6)', borderRadius: 12,
      padding: '2px 8px', border: `1px solid ${color}44`,
    }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{ color, fontSize: 10, fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}

function btnStyle(bg, border) {
  return {
    background: bg,
    border: `1px solid ${border}`,
    color: '#ffffff',
    fontSize: 9,
    padding: '4px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    letterSpacing: 0.5,
  };
}
