import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  WEAPON_RECIPES, ARMOR_ITEMS, ACCESSORY_ITEMS,
  UPGRADE_COSTS, RARITY, computeWeaponATK,
} from '../game/config/ItemConfig';

// ── Structures config ────────────────────────────────────────────────────
const STRUCTURES = {
  forge: {
    name: 'Forge', icon: '🔥',
    description: 'Craft weapons and elemental gear.',
    levels: [
      { cost: { wood: 5,  stone: 3        }, benefit: 'Unlock basic weapon crafting' },
      { cost: { wood: 12, stone: 8,  ore: 3 }, benefit: 'Craft steel-tier weapons'    },
      { cost: { wood: 20, stone: 15, ore: 8 }, benefit: 'Craft elemental weapons'     },
    ],
  },
  storage: {
    name: 'Storage House', icon: '📦',
    description: 'Store more resources and gear.',
    levels: [
      { cost: { wood: 8            }, benefit: '+8 inventory slots'      },
      { cost: { wood: 15, stone: 5 }, benefit: '+16 inventory slots total'},
    ],
  },
  trainingGrounds: {
    name: 'Training Grounds', icon: '⚔️',
    description: 'Sharpen your combat stats.',
    levels: [
      { cost: { stone: 5,  ore: 2 }, benefit: '+2 ATK, +1 DEF' },
      { cost: { stone: 10, ore: 6 }, benefit: '+3 ATK, +2 DEF, +1 SPD' },
    ],
  },
};

const TRAINING_BONUSES = [
  { atk: 2, def: 1, spd: 0 },
  { atk: 3, def: 2, spd: 1 },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function ResourceCost({ cost, resources }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
      {Object.entries(cost).map(([res, amt]) => {
        const have = resources[res] ?? 0;
        const ok   = have >= amt;
        return (
          <span key={res} style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 8,
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

function RarityBadge({ rarity }) {
  const r = RARITY[rarity] || RARITY.common;
  return (
    <span style={{
      fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5,
      color: r.color, marginLeft: 6,
    }}>
      {'★'.repeat(r.stars)}
    </span>
  );
}

const WEAPON_TYPE_ICONS = {
  sword: '⚔️', hammer: '🔨', bow: '🏹', dagger: '🔪', staff: '🪄',
};

const WEAPON_TYPE_DESC = {
  sword:  'Balanced · Whirlwind ability',
  hammer: 'Slow, high damage · Ground Slam ability',
  bow:    'Ranged attacks · Power Shot ability',
  dagger: 'Very fast · Flurry ability',
  staff:  'Elemental · Arcane Burst ability',
};

// ── Main component ────────────────────────────────────────────────────────
export default function StrongholdMenu() {
  const {
    stronghold, resources, inventory,
    upgradeStructure, spendResource, addItem, equipItem,
    applyTrainingBonus, setGamePhase,
    playerATK, playerDEF, playerSPD,
  } = useGameStore();

  const [tab,        setTab]        = useState('build');
  const [craftTab,   setCraftTab]   = useState('weapons');
  const [weaponType, setWeaponType] = useState(null); // null = show type picker
  const [upgradeItem, setUpgradeItem] = useState(null); // item selected for upgrade

  const forgeLevel = stronghold.forge ?? 0;

  // ── Build tab handlers ────────────────────────────────────────────────
  const handleUpgrade = (structure) => {
    const level     = stronghold[structure] ?? 0;
    const def       = STRUCTURES[structure];
    if (level >= def.levels.length) return;
    const cost      = def.levels[level].cost;
    const canAfford = Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(cost).forEach(([r, a]) => spendResource(r, a));
    upgradeStructure(structure);
    if (structure === 'trainingGrounds') {
      const bonus = TRAINING_BONUSES[level];
      if (bonus) applyTrainingBonus(bonus.atk, bonus.def, bonus.spd);
    }
  };

  // ── Craft weapon ──────────────────────────────────────────────────────
  const handleCraftWeapon = (recipe) => {
    if (forgeLevel < (recipe.forgeLevel || 0)) return;
    const canAfford = Object.entries(recipe.cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(recipe.cost).forEach(([r, a]) => spendResource(r, a));
    const atk  = computeWeaponATK(recipe.type, recipe.tier, recipe.rarity, 0);
    const ABILITY = { sword: 'whirlwind', hammer: 'ground_slam', bow: 'power_shot', dagger: 'flurry', staff: 'arcane_burst' };
    const item = {
      id:         recipe.id,
      name:       recipe.name,
      slot:       'weapon',
      type:       recipe.type,
      tier:       recipe.tier,
      rarity:     recipe.rarity,
      atk,
      abilityId:  ABILITY[recipe.type],
      instanceId: `item_${Date.now()}_${recipe.type}`,
      upgradeLevel: 0,
    };
    addItem(item);
  };

  // ── Craft armor ───────────────────────────────────────────────────────
  const handleCraftArmor = (armorDef) => {
    if (forgeLevel < (armorDef.forgeLevel || 0)) return;
    const cost      = armorDef.craftCost;
    const canAfford = Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(cost).forEach(([r, a]) => spendResource(r, a));
    const item = {
      id:         armorDef.id,
      name:       armorDef.name,
      slot:       'armor',
      tier:       armorDef.tier,
      rarity:     armorDef.rarity,
      def:        armorDef.def,
      instanceId: `item_${Date.now()}_${armorDef.id}`,
    };
    addItem(item);
  };

  // ── Craft accessory ───────────────────────────────────────────────────
  const handleCraftAccessory = (accDef) => {
    if (forgeLevel < (accDef.forgeLevel || 0)) return;
    const cost      = accDef.craftCost;
    const canAfford = Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(cost).forEach(([r, a]) => spendResource(r, a));
    const item = {
      id:         accDef.id,
      name:       accDef.name,
      slot:       'accessory',
      rarity:     accDef.rarity,
      atk:        accDef.atk,
      def:        accDef.def,
      spd:        accDef.spd,
      instanceId: `item_${Date.now()}_${accDef.id}`,
    };
    addItem(item);
  };

  // ── Upgrade gear ──────────────────────────────────────────────────────
  const getUpgradeLevel = (item) => item.upgradeLevel || 0;
  const getMaxUpgrade   = (item) => (RARITY[item.rarity]?.maxUpgrade || 3);

  const handleUpgradeItem = (item) => {
    const level = getUpgradeLevel(item);
    const max   = getMaxUpgrade(item);
    if (level >= max) return;
    const cost = UPGRADE_COSTS[level + 1];
    if (!cost) return;
    const canAfford = Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    useGameStore.getState().upgradeItem(item.instanceId, cost);
  };

  // ── Styles ────────────────────────────────────────────────────────────
  const tabStyle = (active) => ({
    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 'bold',
    background:   active ? '#d4af37' : '#1a1a2e',
    color:        active ? '#0d0d1a' : '#777',
    borderBottom: active ? '2px solid #d4af37' : '2px solid transparent',
  });

  const subTabStyle = (active) => ({
    flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 'bold',
    background:   active ? '#ffffff15' : 'transparent',
    color:        active ? '#fff' : '#555',
    borderBottom: active ? '1px solid #d4af37' : '1px solid transparent',
  });

  // ── Upgradeable items ─────────────────────────────────────────────────
  const upgradeableItems = inventory.filter(i =>
    i.slot === 'weapon' || i.slot === 'armor'
  );

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 150,
      background: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a3a 100%)',
      display: 'flex', flexDirection: 'column', color: '#fff', overflowY: 'auto',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px 14px', borderBottom: '1px solid #d4af3733',
      }}>
        <div>
          <h2 style={{ color: '#d4af37', fontSize: 20, margin: 0 }}>🏰 Stronghold</h2>
          <p style={{ color: '#666', fontSize: 11, margin: '2px 0 0' }}>Build · Craft · Upgrade</p>
        </div>
        <button onClick={() => setGamePhase('world')} style={{
          background: '#1a1a2e', border: '2px solid #d4af37',
          color: '#d4af37', borderRadius: 10, padding: '10px 20px',
          cursor: 'pointer', fontSize: 15, fontWeight: 'bold',
        }}>← Return</button>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 16, padding: '10px 20px',
        background: '#ffffff08', borderBottom: '1px solid #ffffff11', alignItems: 'center',
      }}>
        {[
          { label: 'ATK', val: playerATK, col: '#e74c3c' },
          { label: 'DEF', val: playerDEF, col: '#3498db' },
          { label: 'SPD', val: playerSPD, col: '#2ecc71' },
        ].map(({ label, val, col }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: 36 }}>
            <div style={{ color: col,    fontSize: 18, fontWeight: 'bold' }}>{val}</div>
            <div style={{ color: '#555', fontSize: 10 }}>{label}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {[{ k: 'wood', icon: '🪵' }, { k: 'stone', icon: '🪨' }, { k: 'ore', icon: '⛏' }].map(({ k, icon }) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: '#ffffff0a', padding: '4px 8px', borderRadius: 8,
            }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{resources[k] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222' }}>
        {['build', 'craft', 'upgrade'].map(t => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, flex: 1 }}>

        {/* ── BUILD TAB ── */}
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
                    <span style={{ color: '#555', fontSize: 12, marginLeft: 8 }}>Lv {level}/{def.levels.length}</span>
                  </div>
                  <div style={{ color: '#777', fontSize: 11, marginTop: 2 }}>{def.description}</div>
                  {!maxed && nextTier && <div style={{ color: '#d4af37', fontSize: 11, marginTop: 4 }}>Next: {nextTier.benefit}</div>}
                  {maxed && <div style={{ color: '#2ecc71', fontSize: 11, marginTop: 4 }}>✓ Fully Upgraded</div>}
                  {!maxed && nextTier && <ResourceCost cost={nextTier.cost} resources={resources} />}
                </div>
                {!maxed && (
                  <button onClick={() => handleUpgrade(key)} disabled={!canAfford} style={{
                    marginLeft: 12, padding: '10px 14px', borderRadius: 8, border: 'none',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    background: canAfford ? '#d4af37' : '#2a2a2a',
                    color:      canAfford ? '#0d0d1a' : '#555',
                    fontSize: 13, fontWeight: 'bold', flexShrink: 0,
                  }}>Upgrade</button>
                )}
              </div>
            </div>
          );
        })}

        {/* ── CRAFT TAB ── */}
        {tab === 'craft' && (
          <div>
            {forgeLevel === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>
                🔥 Build the Forge first to unlock crafting.
              </div>
            )}

            {forgeLevel > 0 && (
              <>
                {/* Sub-tabs */}
                <div style={{ display: 'flex', marginBottom: 16, borderBottom: '1px solid #1a1a2e' }}>
                  {['weapons', 'armor', 'accessories'].map(t => (
                    <button key={t} style={subTabStyle(craftTab === t)} onClick={() => setCraftTab(t)}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Weapons — two-level: pick type first, then tier */}
                {craftTab === 'weapons' && !weaponType && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['sword', 'hammer', 'bow', 'dagger'].map(type => (
                      <button key={type} onClick={() => setWeaponType(type)} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: '#ffffff08', border: '1px solid #ffffff15',
                        borderRadius: 12, padding: '16px 18px',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                        <span style={{ fontSize: 28 }}>{WEAPON_TYPE_ICONS[type]}</span>
                        <div>
                          <div style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', textTransform: 'capitalize', marginBottom: 2 }}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </div>
                          <div style={{ color: '#555', fontSize: 11 }}>{WEAPON_TYPE_DESC[type]}</div>
                        </div>
                        <span style={{ marginLeft: 'auto', color: '#d4af37', fontSize: 18 }}>›</span>
                      </button>
                    ))}
                  </div>
                )}

                {craftTab === 'weapons' && weaponType && (
                  <div>
                    {/* Back button */}
                    <button onClick={() => setWeaponType(null)} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'none', border: 'none',
                      color: '#d4af37', fontSize: 13, cursor: 'pointer',
                      marginBottom: 14, padding: 0,
                    }}>
                      ‹ All Weapons
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>
                        {WEAPON_TYPE_ICONS[weaponType]} {weaponType.charAt(0).toUpperCase() + weaponType.slice(1)}
                      </span>
                    </button>

                    {WEAPON_RECIPES
                      .filter(r => r.type === weaponType && forgeLevel >= (r.forgeLevel || 0))
                      .map(recipe => {
                        const canAfford = Object.entries(recipe.cost).every(([r, a]) => (resources[r] ?? 0) >= a);
                        const atk       = computeWeaponATK(recipe.type, recipe.tier, recipe.rarity, 0);
                        const rarColor  = RARITY[recipe.rarity]?.color || '#aaa';
                        const TIER_LABELS = { wood: 'Wood', iron: 'Iron', steel: 'Steel', elemental: 'Elemental', god: 'God' };
                        return (
                          <div key={recipe.id} style={{
                            background: '#ffffff08',
                            border:     `1px solid ${rarColor}33`,
                            borderLeft: `3px solid ${rarColor}`,
                            borderRadius: 10, padding: 12, marginBottom: 10,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <span style={{ color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>
                                    {TIER_LABELS[recipe.tier]?.toUpperCase()}
                                  </span>
                                  <RarityBadge rarity={recipe.rarity} />
                                  <span style={{ color: '#e74c3c', fontSize: 11 }}>+{atk} ATK</span>
                                </div>
                                <ResourceCost cost={recipe.cost} resources={resources} />
                              </div>
                              <button
                                onClick={() => handleCraftWeapon(recipe)}
                                disabled={!canAfford}
                                style={{
                                  marginLeft: 10, padding: '9px 13px', borderRadius: 8, border: 'none',
                                  cursor: canAfford ? 'pointer' : 'not-allowed',
                                  background: canAfford ? '#d4af37' : '#2a2a2a',
                                  color:      canAfford ? '#0d0d1a' : '#555',
                                  fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                                }}
                              >Craft</button>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                )}

                {/* Armor */}
                {craftTab === 'armor' && Object.values(ARMOR_ITEMS)
                  .filter(a => !a.dropOnly && forgeLevel >= (a.forgeLevel || 0))
                  .map(armorDef => {
                    const canAfford = Object.entries(armorDef.craftCost).every(([r, a]) => (resources[r] ?? 0) >= a);
                    const rarColor  = RARITY[armorDef.rarity]?.color || '#aaa';
                    return (
                      <div key={armorDef.id} style={{
                        background: '#ffffff08',
                        border:     `1px solid ${rarColor}33`,
                        borderLeft: `3px solid ${rarColor}`,
                        borderRadius: 10, padding: 12, marginBottom: 10,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 16 }}>{armorDef.icon}</span>
                              <span style={{ fontWeight: 'bold', fontSize: 14 }}>{armorDef.name}</span>
                              <RarityBadge rarity={armorDef.rarity} />
                              <span style={{ color: '#3498db', fontSize: 11 }}>+{armorDef.def} DEF</span>
                              {armorDef.spdPenalty && <span style={{ color: '#e74c3c', fontSize: 10 }}>{armorDef.spdPenalty} SPD</span>}
                            </div>
                            <div style={{ color: '#555', fontSize: 10, marginBottom: 4 }}>{armorDef.description}</div>
                            <ResourceCost cost={armorDef.craftCost} resources={resources} />
                          </div>
                          <button
                            onClick={() => handleCraftArmor(armorDef)}
                            disabled={!canAfford}
                            style={{
                              marginLeft: 10, padding: '9px 13px', borderRadius: 8, border: 'none',
                              cursor: canAfford ? 'pointer' : 'not-allowed',
                              background: canAfford ? '#d4af37' : '#2a2a2a',
                              color:      canAfford ? '#0d0d1a' : '#555',
                              fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                            }}
                          >Craft</button>
                        </div>
                      </div>
                    );
                  })
                }

                {/* Accessories */}
                {craftTab === 'accessories' && Object.values(ACCESSORY_ITEMS)
                  .filter(a => !a.dropOnly && a.craftCost && forgeLevel >= (a.forgeLevel || 0))
                  .map(accDef => {
                    const canAfford = Object.entries(accDef.craftCost).every(([r, a]) => (resources[r] ?? 0) >= a);
                    const rarColor  = RARITY[accDef.rarity]?.color || '#aaa';
                    const statText  = [
                      accDef.atk ? `+${accDef.atk} ATK` : null,
                      accDef.def ? `+${accDef.def} DEF` : null,
                      accDef.spd ? `+${accDef.spd} SPD` : null,
                    ].filter(Boolean).join(' · ');
                    return (
                      <div key={accDef.id} style={{
                        background: '#ffffff08',
                        border:     `1px solid ${rarColor}33`,
                        borderLeft: `3px solid ${rarColor}`,
                        borderRadius: 10, padding: 12, marginBottom: 10,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 16 }}>{accDef.icon}</span>
                              <span style={{ fontWeight: 'bold', fontSize: 14 }}>{accDef.name}</span>
                              <RarityBadge rarity={accDef.rarity} />
                              <span style={{ color: '#d4af37', fontSize: 11 }}>{statText}</span>
                            </div>
                            <div style={{ color: '#555', fontSize: 10, marginBottom: 4 }}>{accDef.description}</div>
                            <ResourceCost cost={accDef.craftCost} resources={resources} />
                          </div>
                          <button
                            onClick={() => handleCraftAccessory(accDef)}
                            disabled={!canAfford}
                            style={{
                              marginLeft: 10, padding: '9px 13px', borderRadius: 8, border: 'none',
                              cursor: canAfford ? 'pointer' : 'not-allowed',
                              background: canAfford ? '#d4af37' : '#2a2a2a',
                              color:      canAfford ? '#0d0d1a' : '#555',
                              fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                            }}
                          >Craft</button>
                        </div>
                      </div>
                    );
                  })
                }
              </>
            )}
          </div>
        )}

        {/* ── UPGRADE TAB ── */}
        {tab === 'upgrade' && (
          <div>
            {forgeLevel === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>
                🔥 Build the Forge first to upgrade gear.
              </div>
            )}
            {forgeLevel > 0 && upgradeableItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>
                Craft or find weapons and armor to upgrade them here.
              </div>
            )}
            {forgeLevel > 0 && upgradeableItems.map(item => {
              const level      = getUpgradeLevel(item);
              const max        = getMaxUpgrade(item);
              const maxed      = level >= max;
              const cost       = !maxed ? UPGRADE_COSTS[level + 1] : null;
              const canAfford  = cost && Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
              const rarColor   = RARITY[item.rarity]?.color || '#aaa';
              return (
                <div key={item.instanceId} style={{
                  background: '#ffffff08',
                  border:     `1px solid ${rarColor}33`,
                  borderLeft: `3px solid ${rarColor}`,
                  borderRadius: 10, padding: 12, marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 'bold', fontSize: 14 }}>{item.name}</span>
                        <span style={{ color: '#d4af37', fontSize: 11, fontWeight: 'bold' }}>
                          {level > 0 ? `+${level}` : ''}
                        </span>
                        <span style={{ color: '#555', fontSize: 10 }}>{level}/{max}</span>
                      </div>
                      <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
                        {item.atk ? `ATK: ${item.atk}` : ''}{item.def ? `  DEF: ${item.def}` : ''}
                        {!maxed && <span style={{ color: '#2ecc71', marginLeft: 6 }}>
                          → {item.atk ? item.atk + 2 : ''}{item.def ? item.def + 2 : ''} after upgrade
                        </span>}
                      </div>
                      {maxed && <div style={{ color: '#d4af37', fontSize: 11 }}>✦ Max Upgrade Reached</div>}
                      {!maxed && cost && <ResourceCost cost={cost} resources={resources} />}
                    </div>
                    {!maxed && (
                      <button
                        onClick={() => handleUpgradeItem(item)}
                        disabled={!canAfford}
                        style={{
                          marginLeft: 10, padding: '9px 13px', borderRadius: 8, border: 'none',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          background: canAfford ? '#d4af37' : '#2a2a2a',
                          color:      canAfford ? '#0d0d1a' : '#555',
                          fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                        }}
                      >+1 Forge</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
