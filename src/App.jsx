import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameConfig } from './game/GameConfig';
import { useGameStore } from './store/useGameStore';
import NameEntry from './ui/NameEntry';
import HUD from './ui/HUD';
import HelpMenu from './ui/HelpMenu';
import DeathModal from './ui/DeathModal';

export default function App() {
  const phaserRef = useRef(null);
  const {
    gamePhase,
    showHelpMenu,
    showDeathModal,
    loadSave,
    setGamePhase,
    setPlayerName,
  } = useGameStore();

  // Attempt to load existing save on mount
  useEffect(() => {
    loadSave();
  }, []);

  // Launch Phaser once player has a name
  useEffect(() => {
    if (gamePhase === 'world' && !phaserRef.current) {
      phaserRef.current = new Phaser.Game({
        ...GameConfig,
        parent: 'game-container',
      });
    }
  }, [gamePhase]);

  // Destroy Phaser on unmount
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

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div id="game-container" style={{ position: 'absolute', inset: 0 }} />

      {gamePhase === 'menu' && (
        <NameEntry onConfirm={handleNameConfirmed} />
      )}

      {gamePhase === 'world' && (
        <>
          <HUD />
          {showHelpMenu && <HelpMenu />}
          {showDeathModal && <DeathModal />}
        </>
      )}
    </div>
  );
}
