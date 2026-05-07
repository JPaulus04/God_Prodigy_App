import React from 'react';
import { useGameStore } from '../store/useGameStore';

const CONTROLS = [
  { icon: '🕹',  key: 'Left Joystick',   action: 'Move'                    },
  { icon: '⚔️',  key: '⚔️ Button',        action: 'Attack enemies'          },
  { icon: '🟢',  key: 'E Button',         action: 'Interact · Gather · Talk' },
  { icon: '🎒',  key: '🎒 Bag Button',    action: 'Open inventory'          },
  { icon: '❓',  key: '? Help Button',    action: 'Open this menu'          },
];

export default function HelpMenu() {
  const { toggleHelpMenu, ascensionProgress } = useGameStore();

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#000000bb', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0d0d1a', border: '2px solid #d4af37',
        borderRadius: 14, padding: 24,
        width: '88%', maxWidth: 340, color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ color: '#d4af37', fontSize: 18, margin: 0 }}>Controls</h2>
          <button onClick={toggleHelpMenu} style={{
            background: 'none', border: 'none',
            color: '#777', fontSize: 22, cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        {CONTROLS.map(({ icon, key, action }) => (
          <div key={key} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid #1a1a2e',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{icon}</span>
              <span style={{ color: '#d4af37', fontSize: 13, fontWeight: 'bold' }}>{key}</span>
            </div>
            <span style={{ color: '#bbb', fontSize: 12 }}>{action}</span>
          </div>
        ))}

        {/* Goal */}
        <div style={{ background: '#111', borderRadius: 10, padding: 12, marginTop: 16 }}>
          <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>
            🎯 <strong style={{ color: '#d4af37' }}>Goal:</strong> Defeat all 10 elemental gods and ascend to godhood.
          </p>
          <p style={{ color: '#555', fontSize: 11, margin: '6px 0 0' }}>
            Progress: <strong style={{ color: '#fff' }}>{ascensionProgress}/10 gods defeated</strong>
          </p>
        </div>

        {/* Tip */}
        <div style={{ background: '#111', borderRadius: 10, padding: 12, marginTop: 8 }}>
          <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>
            💡 Talk to <strong style={{ color: '#1abc9c' }}>Elder Kael</strong> (green dot, center of map) for hints. Find the <strong style={{ color: '#d4af37' }}>gold STRONGHOLD</strong> to the south to upgrade.
          </p>
        </div>

        <button onClick={toggleHelpMenu} style={{
          width: '100%', marginTop: 16, padding: '13px 0',
          background: '#d4af37', border: 'none', borderRadius: 10,
          color: '#0d0d1a', fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
        }}>
          Back to Game
        </button>
      </div>
    </div>
  );
}
