import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';

// V95-POLISH-STORY-REV-001
const VERSION = 'v0.3.1 — Build 95';
const STAR_COUNT = 80;

function useSaveExists() {
  return !!localStorage.getItem('gp_save');
}

function StoryIntroModal({ playerName, onBegin, onBack }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'rgba(0,0,0,0.86)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 22,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'linear-gradient(180deg, #121225 0%, #080812 100%)',
        border: '1.5px solid #d4af37', borderRadius: 22,
        padding: '26px 22px', color: '#fff',
        boxShadow: '0 18px 60px rgba(0,0,0,0.75), inset 0 0 36px rgba(212,175,55,0.08)',
        textAlign: 'center',
      }}>
        <div style={{ color: '#d4af37', fontSize: 11, letterSpacing: 3, fontWeight: 900, marginBottom: 10 }}>
          THE TEN THRONES
        </div>
        <h2 style={{ margin: '0 0 14px', color: '#fff', fontSize: 25, lineHeight: 1.1, fontFamily: "'Georgia', serif" }}>
          Many have killed a god.<br />None have survived all ten.
        </h2>
        <div style={{
          color: '#cfcfcf', fontSize: 13.5, lineHeight: 1.55, textAlign: 'left',
          background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '14px 15px', marginBottom: 18,
        }}>
          <p style={{ margin: '0 0 10px' }}>
            For generations, mortals have challenged the gods. Most died before reaching the first throne.
            A few defeated one and became legends. Some defeated two or three and vanished.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            No one knows what happens when the tenth god falls. The temples say the victor ascends.
            The old warriors say ascension always demands a price.
          </p>
          <p style={{ margin: 0, color: '#d4af37' }}>
            Now the realms are opening. Someone has to climb the Ten Thrones. {playerName || 'Warrior'}, that someone is you.
          </p>
        </div>
        <button onClick={onBegin} style={{
          width: '100%', padding: '15px 0',
          background: 'linear-gradient(135deg, #b8862a, #d4af37, #f5c842)',
          border: '1.5px solid #d4af37', borderRadius: 14,
          color: '#0d0d1a', fontSize: 16, fontWeight: 900,
          cursor: 'pointer', letterSpacing: 0.8, boxShadow: '0 0 24px #d4af3744', marginBottom: 10,
        }}>
          Begin the Climb
        </button>
        <button onClick={onBack} style={{
          width: '100%', padding: '11px 0', background: 'transparent',
          border: '1px solid #ffffff22', borderRadius: 12,
          color: '#aaa', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          Back
        </button>
      </div>
    </div>
  );
}

export default function NameEntry() {
  const { setPlayerName, setGamePhase, loadSave, playerName } = useGameStore();
  const [name, setName]       = useState('');
  const [error, setError]     = useState('');
  const [mounted, setMounted] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const hasSave   = useSaveExists();

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.00006 + 0.00002,
      alpha: Math.random() * 0.6 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
    }));
    let t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
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
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, []);

  const trimmedName = name.trim();

  const handleStart = () => {
    if (!trimmedName) { setError('Enter your warrior name.'); return; }
    setShowStory(true);
  };

  const beginStory = () => {
    const finalName = trimmedName || playerName || 'Warrior';
    setPlayerName(finalName);
    try { localStorage.setItem('gp_story_intro_seen', 'true'); } catch (e) {}
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
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 360,
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 38 }}>
          <div style={{ fontSize: 11, letterSpacing: 5, color: '#d4af3799', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase' }}>
            ⚡ The Ten Thrones ⚡
          </div>
          <h1 style={{
            color: '#d4af37', fontSize: 48, fontWeight: 900,
            margin: '0 0 10px', letterSpacing: 3,
            textShadow: '0 0 40px #d4af3766, 0 0 80px #d4af3722, 0 2px 0 #8b6914',
            lineHeight: 1,
          }}>GOD PRODIGY</h1>
          <div style={{ width: 120, height: 2, background: 'linear-gradient(90deg, transparent, #d4af37, transparent)', margin: '12px auto' }} />
          <p style={{ color: '#aaa', fontSize: 13, margin: 0, letterSpacing: 0.6, lineHeight: 1.35 }}>
            Many have killed a god.<br />None have survived all ten.
          </p>
        </div>

        {hasSave && (
          <button onClick={handleContinue} style={{
            width: '100%', padding: '16px 0',
            background: 'linear-gradient(135deg, #1a4a2e, #27ae60)',
            border: '1.5px solid #2ecc71', borderRadius: 14, color: '#fff',
            fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 14,
            boxShadow: '0 0 20px #27ae6044', letterSpacing: 0.5,
          }}>▶ Continue</button>
        )}

        <input
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
          placeholder={hasSave ? 'New game — enter name' : 'Enter your warrior name'}
          maxLength={20}
          style={{
            width: '100%', padding: '16px 20px', background: '#0a0a18', border: '2px solid #d4af3766',
            borderRadius: 12, color: '#fff', fontSize: 17, textAlign: 'center', outline: 'none',
            marginBottom: 12, boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#d4af37'; }}
          onBlur={e => { e.target.style.borderColor = '#d4af3766'; }}
        />

        {error && <p style={{ color: '#e74c3c', fontSize: 12, margin: '0 0 10px', textAlign: 'center' }}>{error}</p>}

        <button onClick={handleStart} style={{
          width: '100%', padding: '17px 0',
          background: trimmedName ? 'linear-gradient(135deg, #b8862a, #d4af37, #f5c842)' : '#1a1a2e',
          border: trimmedName ? '1.5px solid #d4af37' : '1.5px solid #2a2a3e',
          borderRadius: 14, color: trimmedName ? '#0d0d1a' : '#444',
          fontSize: 17, fontWeight: 800, cursor: trimmedName ? 'pointer' : 'default',
          transition: 'all 0.2s', letterSpacing: 1,
          boxShadow: trimmedName ? '0 0 24px #d4af3744' : 'none',
        }}>
          {hasSave ? 'New Game' : 'Begin Your Path'}
        </button>

        <p style={{ color: '#333', fontSize: 11, marginTop: 28, letterSpacing: 1 }}>{VERSION}</p>
      </div>

      {showStory && (
        <StoryIntroModal playerName={trimmedName} onBegin={beginStory} onBack={() => setShowStory(false)} />
      )}
    </div>
  );
}
