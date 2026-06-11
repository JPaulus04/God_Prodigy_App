import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { LEGACY_WEAPONS, FRAGMENT_TYPES } from '../game/config/FragmentConfig';

const ESSENCE_META = {
  forest_essence: { icon: '🌿', color: '#27ae60', name: 'Forest Essence' },
  wind_essence:   { icon: '💨', color: '#87ceeb', name: 'Wind Essence'   },
  earth_essence:  { icon: '🪨', color: '#95a5a6', name: 'Earth Essence'  },
  fire_essence:   { icon: '🔥', color: '#e74c3c', name: 'Fire Essence'   },
  ice_essence:    { icon: '❄️', color: '#3498db', name: 'Ice Essence'    },
  ocean_essence:  { icon: '🌊', color: '#1abc9c', name: 'Ocean Essence'  },
  storm_essence:  { icon: '⚡', color: '#9b59b6', name: 'Storm Essence'  },
  shadow_essence: { icon: '🌑', color: '#6c3483', name: 'Shadow Essence' },
  lava_essence:   { icon: '🍋', color: '#e67e22', name: 'Lava Essence'   },
  void_essence:   { icon: '✨', color: '#f1c40f', name: 'Void Essence'   },
};

const RARITY_COLOR = { godkiller: '#d4af37' };

export default function LegacyArmory({ onClose }) {
  const { fragments, legacyWeapons, spendFragments, unlockLegacyWeapon, addItem, inventory, resources } = useGameStore();
  const [forging, setForging] = useState(null);
  const [toast, setToast]     = useState(null);

  const canAffordFragments = (cost) =>
    Object.entries(cost).every(([t, n]) => (fragments[t] || 0) >= n);

  const canAffordEssence = (cost) =>
    !cost || Object.entries(cost).every(([k, n]) => (resources[k] || 0) >= n);

  const canAfford = (weapon) =>
    canAffordFragments(weapon.fragmentCost) && canAffordEssence(weapon.essenceCost);

  // Hidden until ALL materials are in hand (discovery mechanic)
  const isVisible = (weapon) =>
    legacyWeapons.includes(weapon.id) || !weapon.hiddenUntilReady || canAfford(weapon);

  const handleForge = (weapon) => {
    if (legacyWeapons.includes(weapon.id)) {
      // Already unlocked — just craft into inventory
      const item = {
        id: weapon.id, name: weapon.name,
        slot: 'weapon', type: weapon.type,
        tier: 'godkiller', rarity: weapon.rarity,
        atk: weapon.atk, abilityId: weapon.abilityId,
        instanceId: `item_${Date.now()}_legacy_${weapon.id}`,
        icon: weapon.icon,
      };
      if (addItem(item)) {
        setToast(`${weapon.icon} ${weapon.name} added to inventory!`);
        setTimeout(() => setToast(null), 3000);
      }
      return;
    }
    if (!canAfford(weapon)) return;
    // Spend essence first
    if (weapon.essenceCost) {
      Object.entries(weapon.essenceCost).forEach(([k, n]) => {
        useGameStore.getState().addResource(k, -n);
      });
    }
    if (spendFragments(weapon.fragmentCost)) {
      unlockLegacyWeapon(weapon.id);
      const item = {
        id: weapon.id, name: weapon.name,
        slot: 'weapon', type: weapon.type,
        tier: 'godkiller', rarity: weapon.rarity,
        atk: weapon.atk, abilityId: weapon.abilityId,
        instanceId: `item_${Date.now()}_legacy_${weapon.id}`,
        icon: weapon.icon,
      };
      if (addItem(item)) {
        setToast(`✨ ${weapon.name} UNLOCKED permanently!`);
        setTimeout(() => setToast(null), 4000);
      }
    }
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: '#000000ee',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#0d0d1a',
        borderRadius: '0 0 20px 20px',
        paddingTop: 'calc(env(safe-area-inset-top) + 22px)',
        paddingBottom: 16, paddingLeft: 20, paddingRight: 20,
        borderBottom: '2px solid #d4af3766',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#d4af37', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 }}>
              🏛 Legacy Armory
            </div>
            <div style={{ color: '#ffffff55', fontSize: 11, marginTop: 2 }}>
              Forge god-tier weapons from dungeon fragments
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#1a1a2e', border: '1px solid #444',
            borderRadius: 10, width: 38, height: 38,
            color: '#aaa', fontSize: 16, cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Fragment inventory */}
        <div style={{
          display: 'flex', gap: 8, marginTop: 14,
          background: '#ffffff08', borderRadius: 10, padding: '10px 12px',
        }}>
          {Object.values(FRAGMENT_TYPES).map(ft => (
            <div key={ft.id} style={{
              flex: 1, textAlign: 'center',
              background: `${ft.color}11`,
              border: `1px solid ${ft.color}44`,
              borderRadius: 8, padding: '6px 4px',
            }}>
              <div style={{ fontSize: 20 }}>{ft.icon}</div>
              <div style={{
                fontSize: 18, fontWeight: 'bold',
                color: (fragments[ft.id] || 0) > 0 ? ft.color : '#555',
                marginTop: 2,
              }}>{fragments[ft.id] || 0}</div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 1 }}>{ft.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weapon list */}
      <div style={{
        flex: 1, overflowY: 'auto', width: '100%', maxWidth: 420,
        padding: '14px 16px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {/* Show count of hidden weapons so player knows they exist */}
        {LEGACY_WEAPONS.some(w => !isVisible(w)) && (
          <div style={{ textAlign:'center', color:'#666', fontSize:12, padding:'8px 0', fontStyle:'italic' }}>
            {LEGACY_WEAPONS.filter(w => !isVisible(w)).length} weapon{LEGACY_WEAPONS.filter(w=>!isVisible(w)).length>1?'s':''} locked — collect the required essences to reveal
          </div>
        )}

        {LEGACY_WEAPONS.filter(isVisible).map(weapon => {
          const unlocked  = legacyWeapons.includes(weapon.id);
          const affordable = canAfford(weapon);
          const canCraft  = unlocked || affordable;

          return (
            <div key={weapon.id} style={{
              background: unlocked
                ? `linear-gradient(135deg, #120f00 60%, ${weapon.color}18 100%)`
                : '#0d0d1a',
              border: `2px solid ${unlocked ? weapon.color : (affordable ? weapon.color + '88' : '#2a2a3e')}`,
              borderRadius: 16, padding: '16px',
              position: 'relative', overflow: 'hidden',
              boxShadow: unlocked
                ? `0 0 24px ${weapon.color}66, 0 0 6px ${weapon.color}33 inset`
                : affordable
                ? `0 0 10px ${weapon.color}33`
                : 'none',
            }}>
              {/* Gold shimmer on unlocked */}
              {unlocked && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `radial-gradient(ellipse at 20% 50%, ${weapon.color}18 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* Icon — glows on unlocked */}
                <div style={{
                  width: 62, height: 62, borderRadius: 14, flexShrink: 0,
                  background: unlocked ? `${weapon.color}33` : `${weapon.color}15`,
                  border: `2px solid ${unlocked ? weapon.color : weapon.color + '44'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 30,
                  boxShadow: unlocked ? `0 0 12px ${weapon.color}88` : 'none',
                }}>{weapon.icon}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: weapon.color, fontSize: 16, fontWeight: 'bold' }}>
                      {weapon.name}
                    </span>
                    {unlocked && (
                      <span style={{
                        background: weapon.color, color: '#000',
                        fontSize: 8, fontWeight: 'bold',
                        padding: '2px 7px', borderRadius: 6,
                      }}>LEGACY UNLOCKED</span>
                    )}
                  </div>
                  <div style={{ color: '#aaa', fontSize: 11, marginTop: 3 }}>{weapon.desc}</div>
                  <div style={{
                    color: weapon.color + 'cc', fontSize: 11, marginTop: 3,
                    fontStyle: 'italic',
                  }}>⚡ {weapon.passiveDesc}</div>
                  <div style={{ color: '#d4af37', fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>
                    ATK {weapon.atk}
                  </div>
                </div>
              </div>

              {/* Fragment + Essence cost */}
              <div style={{
                marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
              }}>
                {Object.entries(weapon.fragmentCost).map(([type, need]) => {
                  const have = fragments[type] || 0;
                  const ok   = have >= need;
                  const ft   = FRAGMENT_TYPES[type];
                  return (
                    <span key={type} style={{
                      fontSize: 11, padding: '3px 9px', borderRadius: 8,
                      background: ok ? '#1a2a1a' : '#2a1a1a',
                      color:      ok ? '#2ecc71' : '#e74c3c',
                      border:     `1px solid ${ok ? '#2ecc7166' : '#e74c3c66'}`,
                    }}>
                      {ft.icon} {have}/{need}
                    </span>
                  );
                })}
                {weapon.essenceCost && Object.entries(weapon.essenceCost).map(([key, need]) => {
                  const have = resources[key] || 0;
                  const ok   = have >= need;
                  const em   = ESSENCE_META[key] || { icon: '✨', color: '#d4af37', name: key };
                  return (
                    <span key={key} style={{
                      fontSize: 11, padding: '3px 9px', borderRadius: 8,
                      background: ok ? '#1a2a1a' : '#2a1a1a',
                      color:      ok ? '#2ecc71' : '#e74c3c',
                      border:     `1px solid ${ok ? '#2ecc7166' : '#e74c3c66'}`,
                    }}>
                      {em.icon} {have}/{need} {em.name}
                    </span>
                  );
                })}

                <button
                  onClick={() => handleForge(weapon)}
                  disabled={!canCraft}
                  style={{
                    marginLeft: 'auto',
                    background: canCraft ? weapon.color : '#1a1a2e',
                    border: 'none', borderRadius: 10,
                    padding: '8px 16px',
                    color: canCraft ? '#000' : '#444',
                    fontWeight: 'bold', fontSize: 12,
                    cursor: canCraft ? 'pointer' : 'default',
                  }}
                >
                  {unlocked ? '⚒ Re-forge' : (affordable ? '⚒ Forge' : 'Need Materials')}
                </button>
              </div>
            </div>
          );
        })}

        <div style={{ color: '#ffffff22', fontSize: 11, textAlign: 'center', padding: '8px 0' }}>
          Fragments drop from dungeon chests and mini-challenge rooms
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'absolute', bottom: 90, left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a1200', border: '2px solid #d4af37',
          color: '#d4af37', padding: '10px 24px',
          borderRadius: 20, fontSize: 13, fontWeight: 'bold',
          whiteSpace: 'nowrap', zIndex: 400,
          boxShadow: '0 0 20px #d4af3744',
        }}>{toast}</div>
      )}
    </div>
  );
}
