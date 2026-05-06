import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameConfig }   from './game/GameConfig';
import { useGameStore } from './store/useGameStore';
import NameEntry        from './ui/NameEntry';
import HUD              from './ui/HUD';
import HelpMenu         from './ui/HelpMenu';
import DeathModal       from './ui/DeathModal';
import StrongholdMenu   from './ui/StrongholdMenu';
import InventoryPanel   from './ui/InventoryPanel';

export default function App() {
  const phaserRef  = useRef(null);
  const canvasRef  = useRef(null);

  const {
    gamePhase, showHelpMenu, showDeathModal, showInventory,
    loadSave, setGamePhase, setPlayerName,
  } = useGameStore();

  useEffect(() => { loadSave(); }, []);

  useEffect(() => {
    if (gamePhase === 'world' && !phaserRef.current && canvasRef.current) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set pixel dimensions to match display size
        canvas.width  = canvas.offsetWidth  || window.innerWidth;
        canvas.height = canvas.offsetHeight || window.innerHeight;

        phaserRef.current = new Phaser.Game({
          ...GameConfig,
          canvas,          // React's canvas — already visible and sized
          width:  canvas.width,
          height: canvas.height,
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [gamePhase]);

  useEffect(() => {
    return () => {
      if (phaserRef.current) {
        phaserRef.current.destroy(true);
        phaserRef.current = null;
      }
    };
  }, []);

  const handleNameConfirmed = (name) => {
    setPlayerName(name);
    setGamePhase('world');
  };

  const inGame = gamePhase === 'world' || gamePhase === 'stronghold' || gamePhase === 'dungeon';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* Canvas always in DOM so ref is ready when Phaser needs it */}
      <canvas
        ref={canvasRef}
        style={{
          position:   'absolute',
          top:        0,
          left:       0,
          width:      '100%',
          height:     '100%',
          display:    inGame ? 'block' : 'none',
        }}
      />

      {gamePhase === 'menu' && (
        <NameEntry onConfirm={handleNameConfirmed} />
      )}

      {inGame && (
        <>
          {gamePhase === 'world' && <HUD />}
          {showHelpMenu   && <HelpMenu />}
          {showDeathModal && <DeathModal />}
          {showInventory  && <InventoryPanel />}
          {gamePhase === 'stronghold' && <StrongholdMenu />}
        </>
      )}
    </div>
  );
}
