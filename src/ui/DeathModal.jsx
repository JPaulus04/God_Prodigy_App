import React from 'react';
import { useGameStore } from '../store/useGameStore';

export default function DeathModal() {
  const { respawn, lastCheckpoint, checkpoints } = useGameStore();

  const hasCheckpoint = checkpoints.length > 0;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        background: '#0d0d1a',
        border: '1px solid #ff1744',
        borderRadius: 14,
        padding: 32,
        width: '84%', maxWidth: 320,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💀</div>

        <h2 style={{ color: '#ff1744', fontSize: 22, marginBottom: 6 }}>
          You Fell
        </h2>

        <p style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
          20% of your carried resources were lost.
        </p>
        <p style={{ color: '#666', fontSize: 11, marginBottom: 24 }}>
          Choose where to respawn:
        </p>

        {hasCheckpoint && (
          <button onClick={() => respawn('checkpoint')} style={{
            width: '100%', padding: '12px 0', marginBottom: 10,
            background: '#1a3a1a', border: '1px solid #00e676',
            borderRadius: 8, color: '#00e676',
            fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia, serif',
          }}>
            ⚑ Last Checkpoint
            <div style={{ fontSize: 10, color: '#558855', marginTop: 2 }}>
              {lastCheckpoint.replace('cp_', '').replace(/_/g, ' ').toUpperCase()}
            </div>
          </button>
        )}

        <button onClick={() => respawn('stronghold')} style={{
          width: '100%', padding: '12px 0',
          background: '#1a1a3a', border: '1px solid #4488ff',
          borderRadius: 8, color: '#4488ff',
          fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia, serif',
        }}>
          🏰 Home Stronghold
          <div style={{ fontSize: 10, color: '#446688', marginTop: 2 }}>
            SAFE SPAWN
          </div>
        </button>
      </div>
    </div>
  );
}
