import React, { useEffect } from 'react';
import { useGameStore }  from './store/useGameStore';
import WorldCanvas       from './ui/WorldCanvas';
import HUD               from './ui/HUD';
import NameEntry         from './ui/NameEntry';
import HelpMenu          from './ui/HelpMenu';
import DeathModal        from './ui/DeathModal';
import StrongholdMenu    from './ui/StrongholdMenu';
import InventoryPanel    from './ui/InventoryPanel';
import LevelUpModal      from './ui/LevelUpModal';

export default function App() {
  const {
    gamePhase,
    showHelpMenu,
    showInventory,
    showDeathModal,
    showLevelUp,
    loadSave,
  } = useGameStore();

  useEffect(() => { loadSave(); }, []);

  const inGame = gamePhase === 'world' || gamePhase === 'stronghold' || gamePhase === 'dungeon';

  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative',
      background: '#0d0d1a',
      overflow: 'hidden',
    }}>
      {gamePhase === 'menu' && <NameEntry />}

      {inGame && <WorldCanvas />}
      {inGame && gamePhase !== 'stronghold' && <HUD />}
      {inGame && showHelpMenu  && <HelpMenu />}
      {inGame && showInventory && <InventoryPanel />}
      {inGame && showDeathModal && <DeathModal />}
      {inGame && showLevelUp   && <LevelUpModal />}

      {gamePhase === 'stronghold' && <StrongholdMenu />}
    </div>
  );
}
