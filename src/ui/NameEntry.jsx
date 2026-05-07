import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

export default function NameEntry() {
  const { setPlayerName, setGamePhase } = useGameStore();
  const [name, setName]   = useState('');
  const [error, setError] = useState('');

  const handleStart = () => {
    try {
      const trimmed = name.trim();
      if (!trimmed) { setError('Please enter a name.'); return; }
      setPlayerName(trimmed);
      setGamePhase('world');
    } catch (e) {
      setError(`Error: ${e.message}`);
      console.error('NameEntry handleStart error:', e);
    }
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #05060f 0%, #0d0d1a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px',
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <h1 style={{
          color: '#d4af37', fontSize: 42, fontWeight: 'bold',
          margin: '0 0 12px', letterSpacing: 2,
          textShadow: '0 0 30px #d4af3744',
        }}>
          GOD PRODIGY
        </h1>
        <p style={{ color: '#666', fontSize: 14, margin: 0, letterSpacing: 1 }}>
          Forge your path. Defeat the 10 elemental gods. Ascend.
        </p>
      </div>

      {/* Name input */}
      <input
        value={name}
        onChange={e => { setName(e.target.value); setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
        placeholder="Enter your name"
        maxLength={20}
        style={{
          width: '100%', padding: '18px 20px',
          background: '#0d0d1a', border: '2px solid #d4af37',
          borderRadius: 12, color: '#fff', fontSize: 18,
          textAlign: 'center', outline: 'none',
          marginBottom: 16, boxSizing: 'border-box',
        }}
      />

      {/* Error */}
      {error ? (
        <p style={{ color: '#e74c3c', fontSize: 12, margin: '0 0 12px', textAlign: 'center' }}>
          {error}
        </p>
      ) : null}

      {/* Begin button */}
      <button
        onClick={handleStart}
        style={{
          width: '100%', padding: '18px 0',
          background: name.trim() ? '#d4af37' : '#2a2a2a',
          border: 'none', borderRadius: 12,
          color: name.trim() ? '#0d0d1a' : '#555',
          fontSize: 17, fontWeight: 'bold',
          cursor: name.trim() ? 'pointer' : 'default',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        Begin Your Path
      </button>

      <p style={{ color: '#333', fontSize: 11, marginTop: 32, textAlign: 'center' }}>
        v0.2.0 — Build 18
      </p>
    </div>
  );
}
