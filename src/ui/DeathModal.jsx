import React from 'react';
import { useGameStore } from '../store/useGameStore';

export default function DeathModal() {
  const { respawn, playerName, resources } = useGameStore();

  // Preview what 20% penalty looks like
  const penalties = Object.entries(resources)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: -${v - Math.floor(v * 0.8)}`)
    .join('  ');

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: '#000000cc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0d0d1a', border: '2px solid #e74c3c',
        borderRadius: 14, padding: 28,
        width: '84%', maxWidth: 320,
        textAlign: 'center', color: '#fff',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>💀</div>

        <h2 style={{ color: '#e74c3c', fontSize: 22, margin: '0 0 8px' }}>
          You Fell
        </h2>

        <p style={{ color: '#888', fontSize: 13, margin: '0 0 6px' }}>
          {playerName || 'Warrior'}, the path to godhood is not over.
        </p>

        {penalties ? (
          <p style={{ color: '#e74c3c', fontSize: 12, margin: '0 0 20px' }}>
            20% resources lost: {penalties}
          </p>
        ) : (
          <p style={{ color: '#555', fontSize: 12, margin: '0 0 20px' }}>
            No resources to lose.
          </p>
        )}

        <p style={{ color: '#777', fontSize: 12, margin: '0 0 20px' }}>
          Choose where to respawn:
        </p>

        {/* Last Checkpoint */}
        <button
          onClick={() => respawn('checkpoint')}
          style={{
            width: '100%', padding: '14px 0', marginBottom: 10,
            background: '#0d2010', border: '2px solid #2ecc71',
            borderRadius: 10, color: '#fff', cursor: 'pointer',
            textAlign: 'left', paddingLeft: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#2ecc71' }}>
            🚩 Last Checkpoint
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            Respawn near where you were
          </div>
        </button>

        {/* Home Stronghold */}
        <button
          onClick={() => respawn('stronghold')}
          style={{
            width: '100%', padding: '14px 0',
            background: '#0d0d20', border: '2px solid #d4af37',
            borderRadius: 10, color: '#d4af37', cursor: 'pointer',
            textAlign: 'left', paddingLeft: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 'bold' }}>
            🏰 Home Stronghold
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            Safe spawn — further from your progress
          </div>
        </button>

        <p style={{ color: '#333', fontSize: 10, marginTop: 14, marginBottom: 0 }}>
          You respawn at 50% HP.
        </p>
      </div>
    </div>
  );
}
