import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

const CONTROLS = [
  { icon: '🕹',  key: 'Joystick / WASD',  action: 'Move' },
  { icon: '⚔️',  key: '⚔ Attack',          action: 'Melee / ranged swing' },
  { icon: '🟣',  key: 'Q / Ability',        action: 'Special ability (on cooldown)' },
  { icon: '🟢',  key: 'E / Interact',       action: 'Gather · Talk · Enter area' },
  { icon: '🎒',  key: '🎒 Inventory',       action: 'Open bag + equip gear' },
  { icon: '⚙️',  key: '⚙ Settings',         action: 'Audio, haptics, controls' },
  { icon: '❓',  key: '? Help',             action: 'This menu' },
];

const REALM_TIPS = [
  { icon: '🌿', tip: 'Forest — Watch for root spikes in phase 2.' },
  { icon: '🔥', tip: 'Fire — Stay mobile, boss charges fast.' },
  { icon: '❄️', tip: 'Ice — Ice nova at 40% HP — dodge outward.' },
  { icon: '🌑', tip: 'Shadow — Boss blinks to you. Keep distance.' },
  { icon: '✨', tip: 'Void — Void Collapse hits the whole arena. Move!' },
];

export default function HelpMenu() {
  const { toggleHelpMenu, ascensionProgress, bossesDefeated } = useGameStore();
  const [tab, setTab] = useState('controls');

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: '9px 0',
      background: tab === id ? '#d4af37' : 'transparent',
      border: 'none', borderRadius: 8,
      color: tab === id ? '#0d0d1a' : '#888',
      fontWeight: tab === id ? 700 : 400,
      fontSize: 13, cursor: 'pointer',
      transition: 'all 0.15s',
    }}>{label}</button>
  );

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#000000bb', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(160deg,#0d0d1a,#16213e)',
        border: '2px solid #d4af37',
        borderRadius: 16, padding: 22,
        width: '92%', maxWidth: 360, color: '#fff',
        maxHeight: '88vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ color: '#d4af37', fontSize: 17, margin: 0, fontFamily: "'Georgia',serif" }}>Help & Tips</h2>
          <button onClick={toggleHelpMenu} style={{
            background: 'none', border: 'none', color: '#777', fontSize: 22, cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#0a0a18', borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {tabBtn('controls', '🕹 Controls')}
          {tabBtn('tips', '💡 Tips')}
          {tabBtn('progress', '⭐ Progress')}
        </div>

        {/* Controls tab */}
        {tab === 'controls' && (
          <div>
            {CONTROLS.map(({ icon, key, action }) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0', borderBottom: '1px solid #1a1a2e',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{icon}</span>
                  <span style={{ color: '#d4af37', fontSize: 12, fontWeight: 700,
                    background: '#0d0d1a', border: '1px solid #333',
                    borderRadius: 6, padding: '2px 7px', fontFamily: 'monospace' }}>{key}</span>
                </div>
                <span style={{ color: '#bbb', fontSize: 12, textAlign: 'right', paddingLeft: 8, flex: 1, maxWidth: 160 }}>{action}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tips tab */}
        {tab === 'tips' && (
          <div>
            <div style={{ background: '#111', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <p style={{ color: '#d4af37', fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>⚒ General</p>
              <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 5px' }}>• Activate <strong style={{ color: '#f1c40f' }}>checkpoints</strong> — they save your position and respawn you nearby.</p>
              <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 5px' }}>• Golems drop <strong style={{ color: '#c0392b' }}>ore</strong>. Lava Titans drop <strong style={{ color: '#e67e22' }}>fire shards</strong>.</p>
              <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 5px' }}>• Upgrade the <strong style={{ color: '#d4af37' }}>Forge</strong> in the Stronghold before tackling skull 3+ realms.</p>
              <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>• Ore nodes respawn every <strong style={{ color: '#fff' }}>3 minutes</strong>.</p>
            </div>
            <div style={{ background: '#111', borderRadius: 10, padding: 12 }}>
              <p style={{ color: '#d4af37', fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>⚡ Boss Tips</p>
              {REALM_TIPS.map(({ icon, tip }) => (
                <p key={tip} style={{ color: '#aaa', fontSize: 12, margin: '0 0 6px' }}>
                  {icon} {tip}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Progress tab */}
        {tab === 'progress' && (
          <div>
            <div style={{ background: '#111', borderRadius: 10, padding: 14, marginBottom: 10, textAlign: 'center' }}>
              <div style={{ color: '#d4af37', fontSize: 28, fontWeight: 900 }}>
                {ascensionProgress}<span style={{ color: '#444', fontSize: 16 }}>/10</span>
              </div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Gods Defeated</div>
              <div style={{
                height: 6, background: '#222', borderRadius: 3, margin: '10px 0 0',
              }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${(ascensionProgress / 10) * 100}%`,
                  background: 'linear-gradient(90deg,#d4af37,#f5c842)',
                  transition: 'width 0.4s',
                }} />
              </div>
            </div>
            {[
              { realm:'forest',icon:'🌿',name:'Sylvara'},  {realm:'wind',  icon:'💨',name:'Zephyros'},
              { realm:'earth', icon:'🪨',name:'Terran'},   {realm:'fire',  icon:'🔥',name:'Ignar'},
              { realm:'ice',   icon:'❄️',name:'Glacius'},  {realm:'ocean', icon:'🌊',name:'Nepthar'},
              { realm:'storm', icon:'⚡',name:'Vortus'},   {realm:'shadow',icon:'🌑',name:'Umbris'},
              { realm:'lava',  icon:'🌋',name:'Magmara'},  {realm:'void',  icon:'✨',name:'Nihilus'},
            ].map(g => {
              const done = (bossesDefeated || []).includes(g.realm);
              return (
                <div key={g.realm} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '1px solid #1a1a2e',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{g.icon}</span>
                    <span style={{ color: done ? '#fff' : '#555', fontSize: 13 }}>{g.name}</span>
                  </div>
                  <span style={{ fontSize: 14 }}>{done ? '✅' : '🔒'}</span>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={toggleHelpMenu} style={{
          width: '100%', marginTop: 18, padding: '13px 0',
          background: 'linear-gradient(135deg,#d4af37,#f5c842)',
          border: 'none', borderRadius: 12,
          color: '#0d0d1a', fontWeight: 800, fontSize: 15, cursor: 'pointer',
        }}>Back to Game</button>
      </div>
    </div>
  );
}
