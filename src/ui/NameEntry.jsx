import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';

const VERSION = 'v0.3.0 — Build 69';
const STAR_COUNT = 80;

function useSaveExists() {
  return !!localStorage.getItem('gp_save');
}

export default function NameEntry() {
  const { setPlayerName, setGamePhase, loadSave, playerName } = useGameStore();
  const [name, setName]       = useState('');
  const [error, setError]     = useState('');
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const hasSave   = useSaveExists();

  // Mount animation
  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  // Star field canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.00006 + 0.00002,
      alpha: Math.random() * 0.6 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
    }));
    let t = 0;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const draw = () => {
      t += 0.016;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.y -= s.speed;
        if (s.y < 0) { s.y = 1; s.x = Math.random(); }
        const alpha = s.alpha * (0.6 + Math.sin(t * 1.5 + s.twinkle) * 0.4);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleStart = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter your warrior name.'); return; }
    setPlayerName(trimmed);
    setGamePhase('world');
  };

  const handleContinue = () => {
    loadSave();
    setGamePhase('world');
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #03040e 0%, #0d0d1a 60%, #10101f 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', overflow: 'hidden',
    }}>
      {/* Star field */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 360,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            fontSize: 11, letterSpacing: 5, color: '#d4af3799',
            fontWeight: 600, marginBottom: 10, textTransform: 'uppercase',
          }}>⚡ An Epic Adventure ⚡</div>
          <h1 style={{
            color: '#d4af37',
            fontSize: 48, fontWeight: 900,
            margin: '0 0 10px', letterSpacing: 3,
            textShadow: '0 0 40px #d4af3766, 0 0 80px #d4af3722, 0 2px 0 #8b6914',
            lineHeight: 1,
          }}>GOD PRODIGY</h1>
          <div style={{
            width: 120, height: 2,
            background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
            margin: '12px auto',
          }} />
          <p style={{ color: '#888', fontSize: 13, margin: 0, letterSpacing: 1 }}>
            Defeat the 10 elemental gods. Ascend.
          </p>
        </div>

        {/* Continue button (if save exists) */}
        {hasSave && (
          <button onClick={handleContinue} style={{
            width: '100%', padding: '16px 0',
            background: 'linear-gradient(135deg, #1a4a2e, #27ae60)',
            border: '1.5px solid #2ecc71',
            borderRadius: 14, color: '#fff',
            fontSize: 16, fontWeight: 700,
            cursor: 'pointer', marginBottom: 14,
            boxShadow: '0 0 20px #27ae6044',
            letterSpacing: 0.5,
          }}>▶ Continue</button>
        )}

        {/* New game section */}
        <input
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
          placeholder={hasSave ? 'New game — enter name' : 'Enter your warrior name'}
          maxLength={20}
          style={{
            width: '100%', padding: '16px 20px',
            background: '#0a0a18', border: '2px solid #d4af3766',
            borderRadius: 12, color: '#fff', fontSize: 17,
            textAlign: 'center', outline: 'none',
            marginBottom: 12, boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#d4af37'; }}
          onBlur={e => { e.target.style.borderColor = '#d4af3766'; }}
        />

        {error && (
          <p style={{ color: '#e74c3c', fontSize: 12, margin: '0 0 10px', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button onClick={handleStart} style={{
          width: '100%', padding: '17px 0',
          background: name.trim()
            ? 'linear-gradient(135deg, #b8862a, #d4af37, #f5c842)'
            : '#1a1a2e',
          border: name.trim() ? '1.5px solid #d4af37' : '1.5px solid #2a2a3e',
          borderRadius: 14,
          color: name.trim() ? '#0d0d1a' : '#444',
          fontSize: 17, fontWeight: 800,
          cursor: name.trim() ? 'pointer' : 'default',
          transition: 'all 0.2s',
          letterSpacing: 1,
          boxShadow: name.trim() ? '0 0 24px #d4af3744' : 'none',
        }}>
          {hasSave ? 'New Game' : 'Begin Your Path'}
        </button>

        <p style={{ color: '#333', fontSize: 11, marginTop: 28, letterSpacing: 1 }}>
          {VERSION}
        </p>
      </div>
    </div>
  );
}
