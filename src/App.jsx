import React, { useEffect } from 'react';
import { useGameStore }  from './store/useGameStore';
import NameEntry         from './ui/NameEntry';
import HUD               from './ui/HUD';
import HelpMenu          from './ui/HelpMenu';
import DeathModal        from './ui/DeathModal';
import StrongholdMenu    from './ui/StrongholdMenu';
import InventoryPanel    from './ui/InventoryPanel';
import WorldCanvas       from './ui/WorldCanvas';

export default function App() {
  const {
    gamePhase, showHelpMenu, showDeathModal, showInventory,
    loadSave, setGamePhase, setPlayerName,
  } = useGameStore();

  useEffect(() => { loadSave(); }, []);

  const handleNameConfirmed = (name) => {
    setPlayerName(name);
    setGamePhase('world');
  };

  const inGame = gamePhase === 'world' || gamePhase === 'stronghold';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* Game canvas — always mounted once game starts */}
      {inGame && <WorldCanvas />}

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
