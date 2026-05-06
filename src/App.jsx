import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useGameStore } from './store/useGameStore';
import NameEntry    from './ui/NameEntry';
import HUD          from './ui/HUD';
import HelpMenu     from './ui/HelpMenu';
import DeathModal   from './ui/DeathModal';

// Plain canvas test — completely bypasses Phaser
// If a blue circle draws and moves, canvas works and Phaser init is the problem
function GameCanvas() {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ x: 200, y: 400, t: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Match canvas to screen
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    let rafId;
    const loop = () => {
      const s = stateRef.current;
      s.t += 0.02;

      // Background
      ctx.fillStyle = '#1a2a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = '#2d6a3f';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Animated player circle
      s.x = canvas.width  / 2 + Math.cos(s.t) * 80;
      s.y = canvas.height / 2 + Math.sin(s.t) * 80;

      ctx.fillStyle = '#4a90e2';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Status text
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('✓ Canvas works!', 16, 120);
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px sans-serif';
      ctx.fillText(`Size: ${canvas.width}x${canvas.height}`, 16, 142);

      rafId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}

export default function App() {
  const {
    gamePhase, showHelpMenu, showDeathModal,
    loadSave, setGamePhase, setPlayerName,
  } = useGameStore();

  useEffect(() => { loadSave(); }, []);

  const handleNameConfirmed = (name) => {
    setPlayerName(name);
    setGamePhase('world');
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* Plain canvas test — replaces Phaser temporarily */}
      {gamePhase === 'world' && <GameCanvas />}

      {gamePhase === 'menu' && (
        <NameEntry onConfirm={handleNameConfirmed} />
      )}

      {gamePhase === 'world' && (
        <>
          <HUD />
          {showHelpMenu   && <HelpMenu />}
          {showDeathModal && <DeathModal />}
        </>
      )}
    </div>
  );
}
