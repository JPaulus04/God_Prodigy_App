import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { setSFXVolume, getSFXVolume, setSFXEnabled, getSFXEnabled, sfxCheckpoint } from '../utils/sfx';
import { restorePurchases } from '../utils/iap';

const LS_HAPTICS = 'gp_haptics_enabled';
const LS_SFX_EN  = 'gp_sfx_enabled';
const LS_SFX_VOL = 'gp_sfx_volume';

function loadBool(key, def) {
  const v = localStorage.getItem(key);
  return v === null ? def : v === 'true';
}

export default function SettingsPanel({ onClose }) {
  const [hapticsOn, setHapticsOn] = useState(() => loadBool(LS_HAPTICS, true));
  const [sfxOn,     setSfxOn]     = useState(() => loadBool(LS_SFX_EN, true));
  const [sfxVol,    setSfxVol]    = useState(() => {
    const v = localStorage.getItem(LS_SFX_VOL);
    return v ? parseFloat(v) : 0.5;
  });

  // Sync to modules on mount
  useEffect(() => {
    setSFXEnabled(sfxOn);
    setSFXVolume(sfxVol);
  }, []);

  const toggleHaptics = () => {
    const next = !hapticsOn;
    setHapticsOn(next);
    localStorage.setItem(LS_HAPTICS, String(next));
  };

  const toggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    setSFXEnabled(next);
    localStorage.setItem(LS_SFX_EN, String(next));
  };

  const changeVolume = (e) => {
    const v = parseFloat(e.target.value);
    setSfxVol(v);
    setSFXVolume(v);
    localStorage.setItem(LS_SFX_VOL, String(v));
  };

  const testSound = () => { sfxCheckpoint(); };

  const overlay = {
    position:  'fixed', inset: 0, zIndex: 8500,
    background:'rgba(0,0,0,0.72)',
    display:   'flex', alignItems: 'center', justifyContent: 'center',
    padding:   16,
  };

  const panel = {
    background:   'linear-gradient(160deg,#1a1a2e 0%,#16213e 100%)',
    border:       '1.5px solid #d4af37',
    borderRadius: 20,
    padding:      '28px 24px 22px',
    width:        '100%',
    maxWidth:     340,
    color:        '#fff',
    boxShadow:    '0 12px 48px rgba(0,0,0,0.8)',
  };

  const row = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   20,
    gap:            12,
  };

  const label = {
    fontSize:   14,
    fontWeight: 600,
    color:      '#ccc',
  };

  const sub = {
    fontSize: 11,
    color:    '#666',
    marginTop: 2,
  };

  const Toggle = ({ on, onToggle }) => (
    <button onClick={onToggle} style={{
      width: 52, height: 28, borderRadius: 14,
      background:  on ? '#d4af37' : '#333',
      border:      'none', cursor: 'pointer',
      position:    'relative', transition: 'background 0.2s',
      flexShrink:  0,
    }}>
      <span style={{
        position:   'absolute',
        top:        3, left: on ? 26 : 3,
        width:      22, height: 22,
        background: '#fff',
        borderRadius: '50%',
        transition: 'left 0.2s',
        boxShadow:  '0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </button>
  );

  const CONTROLS = [
    { key: 'WASD / ↑↓←→', action: 'Move' },
    { key: 'Space / ⚔',    action: 'Attack' },
    { key: 'Q / Ability',  action: 'Special ability' },
    { key: 'I',            action: 'Inventory' },
    { key: 'H',            action: 'Help menu' },
    { key: 'E (near NPC)', action: 'Talk / interact' },
  ];

  const [restoring, setRestoring] = React.useState(false);
  const [restoreMsg, setRestoreMsg] = React.useState('');
  const handleRestore = async () => {
    setRestoring(true); setRestoreMsg('');
    try {
      const ids = await restorePurchases();
      setRestoreMsg(ids.length > 0 ? `Restored ${ids.length} purchase${ids.length>1?'s':''}!` : 'Nothing to restore.');
    } catch(e) {
      setRestoreMsg('Restore failed.');
    } finally {
      setRestoring(false);
      setTimeout(() => setRestoreMsg(''), 3000);
    }
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:18, fontFamily:"'Georgia',serif", color:'#d4af37', letterSpacing:0.5 }}>
            ⚙ Settings
          </h2>
          {/* Restore Purchases */}
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <button
            onClick={handleRestore}
            disabled={restoring}
            style={{
              background: 'transparent', border: '1px solid #d4af37',
              color: '#d4af37', padding: '10px 24px', borderRadius: 8,
              fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.1em',
              cursor: restoring ? 'not-allowed' : 'pointer', opacity: restoring ? 0.6 : 1,
              width: '100%',
            }}
          >
            {restoring ? 'Restoring...' : '↩ Restore Purchases'}
          </button>
          {restoreMsg && (
            <div style={{ color: '#2ecc71', fontSize: 12, marginTop: 6, fontFamily: 'monospace' }}>
              {restoreMsg}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{
            background:'none', border:'none', color:'#888', fontSize:22,
            cursor:'pointer', lineHeight:1, padding:'0 4px',
          }}>✕</button>
        </div>

        {/* Haptics */}
        <div style={row}>
          <div>
            <div style={label}>Haptics</div>
            <div style={sub}>Vibration on hits & events</div>
          </div>
          <Toggle on={hapticsOn} onToggle={toggleHaptics} />
        </div>

        {/* SFX toggle */}
        <div style={row}>
          <div>
            <div style={label}>Sound Effects</div>
            <div style={sub}>Attack, collect, level up</div>
          </div>
          <Toggle on={sfxOn} onToggle={toggleSfx} />
        </div>

        {/* SFX volume */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...row, marginBottom: 8 }}>
            <div style={label}>SFX Volume</div>
            <button onClick={testSound} style={{
              background: '#1a1a2e', border: '1px solid #444',
              borderRadius: 8, color: '#aaa', fontSize: 11,
              padding: '4px 10px', cursor: 'pointer',
            }}>Test</button>
          </div>
          <input type="range" min="0" max="1" step="0.05"
            value={sfxVol}
            onChange={changeVolume}
            disabled={!sfxOn}
            style={{
              width: '100%', accentColor: '#d4af37',
              opacity: sfxOn ? 1 : 0.4,
            }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
            <span style={sub}>0%</span>
            <span style={{ ...sub, color:'#d4af37' }}>{Math.round(sfxVol * 100)}%</span>
            <span style={sub}>100%</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop:'1px solid #2a2a3e', margin:'0 0 20px' }} />

        {/* Controls reference */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...label, marginBottom: 12, color:'#d4af37' }}>Controls</div>
          {CONTROLS.map(({ key, action }) => (
            <div key={key} style={{
              display:'flex', justifyContent:'space-between',
              marginBottom: 8, fontSize: 12,
            }}>
              <span style={{
                background: '#0d0d1a', border:'1px solid #333',
                borderRadius: 6, padding: '2px 8px',
                color: '#f0c040', fontFamily:'monospace', fontSize:11,
                flexShrink: 0,
              }}>{key}</span>
              <span style={{ color:'#bbb', textAlign:'right', paddingLeft:12 }}>{action}</span>
            </div>
          ))}
        </div>

        {/* Close */}
        <button onClick={onClose} style={{
          width:'100%', padding:'12px',
          background:'linear-gradient(135deg,#d4af37,#f5c842)',
          border:'none', borderRadius:12,
          color:'#0d0d1a', fontWeight:700, fontSize:14,
          cursor:'pointer',
        }}>Done</button>
      </div>
    </div>
  );
}
