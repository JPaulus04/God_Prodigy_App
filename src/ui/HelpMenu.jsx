import React from 'react';
import { useGameStore } from '../store/useGameStore';

const CONTROLS = [
  { key: 'WASD / Arrow Keys', action: 'Move' },
  { key: 'Space',             action: 'Attack' },
  { key: 'E',                 action: 'Interact / Gather' },
  { key: 'Joystick (left)',   action: 'Move (mobile)' },
  { key: '⚔ Button (right)',  action: 'Attack (mobile)' },
  { key: 'E Button (right)',  action: 'Interact (mobile)' },
];

const TIPS = [
  'Gather Wood, Stone, and Ore to build your Stronghold.',
  'Approach enemies and press Space or ⚔ to attack.',
  'Press E near NPCs to hear hints and rumours.',
  'Activate Checkpoints — they are your respawn points.',
  'Golems drop Ore and sometimes gear. Fight them when ready.',
  'Upgrade your Forge to craft stronger weapons.',
  'Ten Elemental Gods stand between you and ascension.',
];

export default function HelpMenu() {
  const { toggleHelpMenu } = useGameStore();

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        background: '#0d0d1a',
        border: '1px solid #d4af37',
        borderRadius: 12,
        padding: 24,
        width: '88%', maxWidth: 360,
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ color: '#d4af37', textAlign: 'center', fontSize: 18, marginBottom: 16 }}>
          Controls & Tips
        </h2>

        {/* Controls */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#888', fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>
            CONTROLS
          </div>
          {CONTROLS.map(({ key, action }) => (
            <div key={key} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '5px 0', borderBottom: '1px solid #1a1a2e',
            }}>
              <span style={{ color: '#4488ff', fontSize: 12 }}>{key}</span>
              <span style={{ color: '#cccccc', fontSize: 12 }}>{action}</span>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#888', fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>
            TIPS
          </div>
          {TIPS.map((tip, i) => (
            <div key={i} style={{
              color: '#bbbbbb', fontSize: 11, marginBottom: 6,
              paddingLeft: 10, borderLeft: '2px solid #d4af3744',
            }}>
              {tip}
            </div>
          ))}
        </div>

        <button onClick={toggleHelpMenu} style={{
          width: '100%', padding: '10px 0',
          background: '#d4af37', border: 'none',
          borderRadius: 8, color: '#0d0d1a',
          fontWeight: 'bold', fontSize: 14,
          cursor: 'pointer', fontFamily: 'Georgia, serif',
        }}>
          Close
        </button>
      </div>
    </div>
  );
}
