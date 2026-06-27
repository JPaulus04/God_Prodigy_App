import React, { useState, useEffect, useCallback } from 'react';
import { setSFXVolume, getSFXVolume, setSFXEnabled, getSFXEnabled, sfxCheckpoint } from '../utils/sfx';
import { restorePurchases } from '../utils/iap';

// V95-POLISH-STORY-REV-001
const SETTINGS_PANEL_REVISION = 'V95-POLISH-STORY-REV-001';

const LS_HAPTICS = 'gp_haptics_enabled';
const LS_SFX_EN  = 'gp_sfx_enabled';
const LS_SFX_VOL = 'gp_sfx_volume';

function loadBool(key, def) {
  const v = localStorage.getItem(key);
  return v === null ? def : v === 'true';
}

export default function SettingsPanel({ onClose }) {
  const [hapticsOn, setHapticsOn] = useState(() => loadBool(LS_HAPTICS, true));
  const [sfxOn, setSfxOn] = useState(() => loadBool(LS_SFX_EN, getSFXEnabled ? getSFXEnabled() : true));
  const [sfxVol, setSfxVol] = useState(() => {
    const v = localStorage.getItem(LS_SFX_VOL);
    if (v) return parseFloat(v);
    return getSFXVolume ? getSFXVolume() : 0.5;
  });
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');

  const safeClose = useCallback((e) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  useEffect(() => {
    setSFXEnabled(sfxOn);
    setSFXVolume(sfxVol);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') safeClose(e); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [safeClose]);

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

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    setRestoreMsg('');
    const timeout = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 15000));
    try {
      const result = await Promise.race([restorePurchases().then(ids => ({ ids: ids || [] })), timeout]);
      if (result.timeout) {
        setRestoreMsg('Restore is taking longer than expected. You can close settings and try again later.');
      } else {
        const count = result.ids.length;
        setRestoreMsg(count > 0 ? `Restored ${count} purchase${count > 1 ? 's' : ''}.` : 'No restorable purchases found.');
      }
    } catch(e) {
      console.warn('Settings restore failed', SETTINGS_PANEL_REVISION, e);
      setRestoreMsg('Restore failed. Please try again later.');
    } finally {
      setRestoring(false);
      setTimeout(() => setRestoreMsg(''), 4500);
    }
  };

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 10000,
    background:'rgba(0,0,0,0.74)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
    pointerEvents: 'all',
    touchAction: 'manipulation',
  };

  const panel = {
    background: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 100%)',
    border: '1.5px solid #d4af37',
    borderRadius: 20,
    padding: '22px 20px 18px',
    width: '100%',
    maxWidth: 360,
    maxHeight: '88vh',
    overflowY: 'auto',
    color: '#fff',
    boxShadow: '0 12px 48px rgba(0,0,0,0.8)',
    position: 'relative',
    pointerEvents:'all',
  };

  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 };
  const label = { fontSize: 14, fontWeight: 700, color: '#ccc' };
  const sub = { fontSize: 11, color: '#777', marginTop: 2, lineHeight: 1.35 };

  const Toggle = ({ on, onToggle }) => (
    <button onClick={onToggle} style={{
      width: 52, height: 28, borderRadius: 14,
      background: on ? '#d4af37' : '#333',
      border: 'none', cursor: 'pointer',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 26 : 3,
        width: 22, height: 22, background: '#fff', borderRadius: '50%',
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </button>
  );

  const CONTROLS = [
    { key: 'Joystick / WASD', action: 'Move' },
    { key: '⚔ / Space', action: 'Attack' },
    { key: 'Ability / Q', action: 'Special ability' },
    { key: '🎒 / I', action: 'Inventory' },
    { key: '? / H', action: 'Help menu' },
    { key: 'E', action: 'Talk / interact' },
  ];

  return (
    <div style={overlay} onClick={safeClose} onPointerDown={(e) => { if (e.target === e.currentTarget) safeClose(e); }}>
      <div style={panel} onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <div style={{
          position: 'sticky', top: -22, zIndex: 2,
          background: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 100%)',
          padding: '4px 0 12px', display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:12, borderBottom: '1px solid #ffffff12',
        }}>
          <div>
            <h2 style={{ margin:0, fontSize:19, fontFamily:"'Georgia',serif", color:'#d4af37', letterSpacing:0.5 }}>⚙ Settings</h2>
            <div style={{ color: '#ffffff55', fontSize: 10, marginTop: 2 }}>Audio, controls, and purchases</div>
          </div>
          <button onClick={safeClose} onPointerDown={safeClose} aria-label="Close settings" style={{
            background:'#1a1a2e', border:'1px solid #666', color:'#ddd', fontSize:22,
            cursor:'pointer', lineHeight:1, width:44, height:44, borderRadius:12,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
          }}>✕</button>
        </div>

        <div style={{ marginBottom: 20, textAlign: 'center', border: '1px solid #d4af3722', borderRadius: 14, padding: 12, background: '#00000022' }}>
          <button onClick={handleRestore} disabled={restoring} style={{
            background: 'transparent', border: '1px solid #d4af37', color: '#d4af37',
            padding: '10px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 12,
            letterSpacing: '0.08em', cursor: restoring ? 'not-allowed' : 'pointer',
            opacity: restoring ? 0.6 : 1, width: '100%',
          }}>{restoring ? 'Restoring...' : '↩ Restore Purchases'}</button>
          {restoreMsg && <div style={{ color: restoreMsg.includes('failed') ? '#e74c3c' : '#2ecc71', fontSize: 11, marginTop: 8, lineHeight: 1.35 }}>{restoreMsg}</div>}
        </div>

        <div style={row}><div><div style={label}>Haptics</div><div style={sub}>Vibration on hits and events</div></div><Toggle on={hapticsOn} onToggle={toggleHaptics} /></div>
        <div style={row}><div><div style={label}>Sound Effects</div><div style={sub}>Attack, collect, level up</div></div><Toggle on={sfxOn} onToggle={toggleSfx} /></div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ ...row, marginBottom: 8 }}>
            <div style={label}>SFX Volume</div>
            <button onClick={testSound} style={{ background: '#1a1a2e', border: '1px solid #444', borderRadius: 8, color: '#aaa', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Test</button>
          </div>
          <input type="range" min="0" max="1" step="0.05" value={sfxVol} onChange={changeVolume} disabled={!sfxOn} style={{ width: '100%', accentColor: '#d4af37', opacity: sfxOn ? 1 : 0.4 }} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
            <span style={sub}>0%</span><span style={{ ...sub, color:'#d4af37' }}>{Math.round(sfxVol * 100)}%</span><span style={sub}>100%</span>
          </div>
        </div>

        <div style={{ borderTop:'1px solid #2a2a3e', margin:'0 0 20px' }} />
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...label, marginBottom: 12, color:'#d4af37' }}>Controls</div>
          {CONTROLS.map(({ key, action }) => (
            <div key={key} style={{ display:'flex', justifyContent:'space-between', marginBottom: 8, fontSize: 12 }}>
              <span style={{ background: '#0d0d1a', border:'1px solid #333', borderRadius: 6, padding: '2px 8px', color: '#f0c040', fontFamily:'monospace', fontSize:11, flexShrink: 0 }}>{key}</span>
              <span style={{ color:'#bbb', textAlign:'right', paddingLeft:12 }}>{action}</span>
            </div>
          ))}
        </div>

        <button onClick={safeClose} onPointerDown={safeClose} style={{
          width:'100%', padding:'14px', background:'linear-gradient(135deg,#d4af37,#f5c842)',
          border:'none', borderRadius:12, color:'#0d0d1a', fontWeight:800, fontSize:15, cursor:'pointer',
        }}>Close Settings</button>
      </div>
    </div>
  );
}
