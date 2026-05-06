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
  const phaserRef = useRef(null);
  const {
    gamePhase,
    showHelpMenu,
    showDeathModal,
    showInventory,
    loadSave,
    setGamePhase,
    setPlayerName,
  } = useGameStore();

  useEffect(() => { loadSave(); }, []);

  useEffect(() => {
    if (gamePhase === 'world' && !phaserRef.current) {
      // 150ms delay gives iOS/WKWebView time to fully lay out
      // the game-container before Phaser measures it
      const timer = setTimeout(() => {
        phaserRef.current = new Phaser.Game({
          ...GameConfig,
          parent: 'game-container',
        });
      }, 150);
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
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0d0d1a' }}>
      <div
        id="game-container"
        style={{ position: 'absolute', inset: 0 }}
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
