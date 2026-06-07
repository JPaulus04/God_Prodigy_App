import React, { useEffect, useRef, useState } from 'react';
import { useGameStore }  from './store/useGameStore';
import WorldCanvas       from './ui/WorldCanvas';
import DungeonCanvas     from './ui/DungeonCanvas';
import RealmCanvas       from './ui/RealmCanvas';
import HUD               from './ui/HUD';
import NameEntry         from './ui/NameEntry';
import HelpMenu          from './ui/HelpMenu';
import DeathModal        from './ui/DeathModal';
import StrongholdMenu    from './ui/StrongholdMenu';
import InventoryPanel    from './ui/InventoryPanel';
import LevelUpModal      from './ui/LevelUpModal';
import IAPShop           from './ui/IAPShop';
import TutorialOverlay   from './ui/TutorialOverlay';
import AscensionVictory  from './ui/AscensionVictory';
import PrestigeClassSelect from './ui/PrestigeClassSelect';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e.message || String(e) }; }
  render() {
    if (this.state.error) return (
      <div style={{ position:'absolute',inset:0,background:'#0d0d1a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,color:'#fff' }}>
        <div style={{ fontSize:32,marginBottom:16 }}>⚠️</div>
        <h2 style={{ color:'#e74c3c',fontSize:18,marginBottom:12 }}>Something crashed</h2>
        <div style={{ background:'#1a0000',border:'1px solid #e74c3c',borderRadius:10,padding:16,fontSize:11,color:'#ff8888',fontFamily:'monospace',wordBreak:'break-all',maxWidth:'100%',marginBottom:24 }}>{this.state.error}</div>
        <button onClick={() => { this.setState({error:null}); useGameStore.getState().setGamePhase('menu'); }}
          style={{ background:'#d4af37',border:'none',borderRadius:10,padding:'14px 28px',color:'#0d0d1a',fontWeight:'bold',fontSize:15,cursor:'pointer' }}>← Back to Menu</button>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  const { gamePhase, showHelpMenu, showInventory, showDeathModal, showLevelUp, showShop, toggleShop, loadSave, tutorialStep, showVictory, showPrestigeSelect } = useGameStore();
  useEffect(() => { loadSave(); }, []);

  // ── Phase transition fade ──────────────────────────────────────
  const prevPhaseRef = useRef(gamePhase);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (prevPhaseRef.current !== gamePhase) {
      prevPhaseRef.current = gamePhase;
      setFading(true);
      const t = setTimeout(() => setFading(false), 350);
      return () => clearTimeout(t);
    }
  }, [gamePhase]);

  const inWorld = gamePhase === 'world';
  const inDun   = gamePhase === 'dungeon';
  const inRealm = gamePhase === 'realm';
  const inSH    = gamePhase === 'stronghold';
  const inGame  = inWorld || inDun || inRealm || inSH;
  const showTutorial = inWorld && tutorialStep < 4;

  return (
    <div style={{ width:'100%', height:'100%', position:'relative', background:'#0d0d1a', overflow:'hidden' }}>
      {gamePhase === 'menu' && <NameEntry />}
      {inWorld && <ErrorBoundary><WorldCanvas /></ErrorBoundary>}
      {inDun   && <ErrorBoundary><DungeonCanvas /></ErrorBoundary>}
      {inRealm && <ErrorBoundary><RealmCanvas /></ErrorBoundary>}
      {inSH    && <ErrorBoundary><StrongholdMenu /></ErrorBoundary>}
      {(inWorld || inDun || inRealm) && <ErrorBoundary><HUD /></ErrorBoundary>}
      {inGame && showHelpMenu   && <HelpMenu />}
      {inGame && showInventory  && <InventoryPanel />}
      {inGame && showDeathModal && <DeathModal />}
      {inGame && showLevelUp    && <LevelUpModal />}
      {inGame && showShop      && <IAPShop onClose={toggleShop} />}
      {showTutorial && <TutorialOverlay />}
      {showVictory && <AscensionVictory />}
      {showPrestigeSelect && <PrestigeClassSelect />}

      {/* Phase transition fade overlay */}
      {fading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 999,
          background: '#000',
          pointerEvents: 'none',
          animation: 'gpPhaseFade 350ms ease forwards',
        }} />
      )}
    </div>
  );
}

// Inject phase-fade keyframe once
if (typeof document !== 'undefined' && !document.getElementById('gp-phase-fade-style')) {
  const s = document.createElement('style');
  s.id = 'gp-phase-fade-style';
  s.textContent = `@keyframes gpPhaseFade {
    0%   { opacity: 1; }
    40%  { opacity: 0.9; }
    100% { opacity: 0; }
  }`;
  document.head.appendChild(s);
}
