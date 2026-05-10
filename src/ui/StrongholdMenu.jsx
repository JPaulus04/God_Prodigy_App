import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

const STRUCTURES = {
  forge: {
    name: 'Forge',
    icon: '🔥',
    description: 'Craft weapons and elemental gear.',
    levels: [
      { cost: { wood: 5,  stone: 3        }, benefit: 'Unlock basic weapon crafting' },
      { cost: { wood: 12, stone: 8,  ore: 3 }, benefit: 'Craft steel-tier weapons' },
      { cost: { wood: 20, stone: 15, ore: 8 }, benefit: 'Craft elemental weapons' },
    ],
  },
  storage: {
    name: 'Storage House',
    icon: '📦',
    description: 'Store more resources and gear.',
    levels: [
      { cost: { wood: 8              }, benefit: '+8 inventory slots' },
      { cost: { wood: 15, stone: 5   }, benefit: '+16 inventory slots total' },
    ],
  },
  trainingGrounds: {
    name: 'Training Grounds',
    icon: '⚔️',
    description: 'Sharpen your combat stats.',
    levels: [
      { cost: { stone: 5,  ore: 2 }, benefit: '+2 ATK, +1 DEF' },
      { cost: { stone: 10, ore: 6 }, benefit: '+3 ATK, +2 DEF, +1 SPD' },
    ],
  },
};

const FORGE_RECIPES = [
  {
    id:         'iron_sword',
    name:       'Iron Sword',
    icon:       '⚔️',
    cost:       { ore: 3, wood: 1 },
    stat:       '+6 ATK',
    forgeLevel: 1,
  },
];

function ResourceCost({ cost, resources }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
      {Object.entries(cost).map(([res, amt]) => {
        const have = resources[res] ?? 0;
        const ok   = have >= amt;
        return (
          <span key={res} style={{
            fontSize: 12, padding: '3px 9px', borderRadius: 10,
            background: ok ? '#1a3a1a' : '#3a1a1a',
            color:      ok ? '#7ed321' : '#e74c3c',
            border:    `1px solid ${ok ? '#7ed32166' : '#e74c3c66'}`,
          }}>
            {res}: {have}/{amt}
          </span>
        );
      })}
    </div>
  );
}

export default function StrongholdMenu() {
  const {
    stronghold, resources, inventory,
    upgradeStructure, spendResource, addItem, equipItem,
    setGamePhase,
    playerATK, playerDEF, playerSPD,
  } = useGameStore();

  const [tab, setTab] = useState('build');

  const handleUpgrade = (structure) => {
    const level = stronghold[structure];
    const def   = STRUCTURES[structure];
    if (level >= def.levels.length) return;
    const cost      = def.levels[level].cost;
    const canAfford = Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(cost).forEach(([r, a]) => spendResource(r, a));
    upgradeStructure(structure);
    if (structure === 'trainingGrounds') {
      if (level === 0) useGameStore.setState(s => ({ playerATK: s.playerATK + 2, playerDEF: s.playerDEF + 1 }));
      if (level === 1) useGameStore.setState(s => ({ playerATK: s.playerATK + 3, playerDEF: s.playerDEF + 2, playerSPD: s.playerSPD + 1 }));
    }
  };

  const handleCraft = (recipe) => {
    if (stronghold.forge < recipe.forgeLevel) return;
    const canAfford = Object.entries(recipe.cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford || inventory.length >= 16) return;
    Object.entries(recipe.cost).forEach(([r, a]) => spendResource(r, a));
    const item = { id: recipe.id, name: recipe.name, slot: 'weapon', atk: 6 };
    addItem(item);
    equipItem(item);
  };

  const tabStyle = (active) => ({
    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 'bold',
    background:   active ? '#d4af37' : '#1a1a2e',
    color:        active ? '#0d0d1a' : '#777',
    borderBottom: active ? '2px solid #d4af37' : '2px solid transparent',
  });

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 150,
      background: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a3a 100%)',
      display: 'flex', flexDirection: 'column',
      color: '#fff', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 20px 12px', borderBottom: '1px solid #d4af3733',
      }}>
        <div>
          <h2 style={{ color: '#d4af37', fontSize: 20, margin: 0 }}>🏰 Stronghold</h2>
          <p style={{ color: '#666', fontSize: 11, margin: '2px 0 0' }}>Build · Craft · Upgrade</p>
        </div>
        <button
          onClick={() => setGamePhase('world')}
          style={{
            background: '#1a1a2e', border: '1px solid #555',
            color: '#aaa', borderRadius: 8,
            padding: '8px 16px', cursor: 'pointer', fontSize: 13,
          }}
        >
          ← Return
        </button>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 16, padding: '10px 20px',
        background: '#ffffff08', borderBottom: '1px solid #ffffff11',
        alignItems: 'center',
      }}>
        {[
          { label: 'ATK', val: playerATK, col: '#e74c3c' },
          { label: 'DEF', val: playerDEF, col: '#3498db' },
          { label: 'SPD', val: playerSPD, col: '#2ecc71' },
        ].map(({ label, val, col }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: 36 }}>
            <div style={{ color: col,   fontSize: 18, fontWeight: 'bold' }}>{val}</div>
            <div style={{ color: '#555', fontSize: 10 }}>{label}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {[
            { k: 'wood',  icon: '🪵' },
            { k: 'stone', icon: '🪨' },
            { k: 'ore',   icon: '⛏'  },
          ].map(({ k, icon }) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#ffffff0a', padding: '4px 8px', borderRadius: 8,
            }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{resources[k] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222' }}>
        <button style={tabStyle(tab === 'build')} onClick={() => setTab('build')}>Build</button>
        <button style={tabStyle(tab === 'craft')} onClick={() => setTab('craft')}>Craft</button>
      </div>

      {/* Content */}
      <div style={{ padding: 16, flex: 1 }}>

        {/* BUILD TAB */}
        {tab === 'build' && Object.entries(STRUCTURES).map(([key, def]) => {
          const level     = stronghold[key] ?? 0;
          const maxed     = level >= def.levels.length;
          const nextTier  = def.levels[level];
          const canAfford = !maxed && nextTier &&
            Object.entries(nextTier.cost).every(([r, a]) => (resources[r] ?? 0) >= a);

          return (
            <div key={key} style={{
              background: '#ffffff08', border: '1px solid #ffffff11',
              borderRadius: 10, padding: 14, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 'bold' }}>
                    {def.icon} {def.name}
                    <span style={{ color: '#555', fontSize: 12, marginLeft: 8 }}>
                      Lv {level}/{def.levels.length}
                    </span>
                  </div>
                  <div style={{ color: '#777', fontSize: 11, marginTop: 2 }}>{def.description}</div>
                  {!maxed && nextTier && (
                    <div style={{ color: '#d4af37', fontSize: 11, marginTop: 4 }}>
                      Next: {nextTier.benefit}
                    </div>
                  )}
                  {maxed && (
                    <div style={{ color: '#2ecc71', fontSize: 11, marginTop: 4 }}>✓ Fully Upgraded</div>
                  )}
                  {!maxed && nextTier && <ResourceCost cost={nextTier.cost} resources={resources} />}
                </div>
                {!maxed && (
                  <button
                    onClick={() => handleUpgrade(key)}
                    disabled={!canAfford}
                    style={{
                      marginLeft: 12, padding: '8px 14px', borderRadius: 8,
                      border: 'none', cursor: canAfford ? 'pointer' : 'not-allowed',
                      background: canAfford ? '#d4af37' : '#2a2a2a',
                      color:      canAfford ? '#0d0d1a' : '#555',
                      fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                    }}
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* CRAFT TAB */}
        {tab === 'craft' && (
          <div>
            {(stronghold.forge ?? 0) === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>
                🔥 Build the Forge first to unlock crafting.
              </div>
            )}
            {(stronghold.forge ?? 0) > 0 && FORGE_RECIPES
              .filter(r => (stronghold.forge ?? 0) >= r.forgeLevel)
              .map(recipe => {
                const canAfford  = Object.entries(recipe.cost).every(([r, a]) => (resources[r] ?? 0) >= a);
                const alreadyHave = inventory.some(i => i.id === recipe.id);
                const gearEquipped = useGameStore.getState().gear?.weapon === recipe.id;

                return (
                  <div key={recipe.id} style={{
                    background: '#ffffff08', border: `1px solid ${alreadyHave ? '#2ecc7133' : '#ffffff11'}`,
                    borderRadius: 10, padding: 14, marginBottom: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                        {recipe.icon} {recipe.name}
                        <span style={{ color: '#d4af37', fontSize: 11, marginLeft: 8 }}>{recipe.stat}</span>
                      </div>
                      <ResourceCost cost={recipe.cost} resources={resources} />
                      {alreadyHave && (
                        <div style={{ color: '#2ecc71', fontSize: 11, marginTop: 6 }}>
                          ✓ {gearEquipped ? 'Equipped' : 'In inventory'}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => !alreadyHave && handleCraft(recipe)}
                      disabled={!canAfford || alreadyHave}
                      style={{
                        marginLeft: 12, padding: '8px 14px', borderRadius: 8,
                        border: 'none',
                        cursor: (canAfford && !alreadyHave) ? 'pointer' : 'default',
                        background: alreadyHave ? '#1a3a1a' : canAfford ? '#d4af37' : '#2a2a2a',
                        color:      alreadyHave ? '#2ecc71'  : canAfford ? '#0d0d1a' : '#555',
                        fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                      }}
                    >
                      {alreadyHave ? 'Owned ✓' : 'Craft'}
                    </button>
                  </div>
                );
              })
            }
          </div>
        )}
      </div>
    </div>
  );
}
