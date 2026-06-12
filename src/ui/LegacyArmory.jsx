import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { FRAGMENT_TYPES, LEGACY_WEAPONS } from '../game/config/FragmentConfig';

const ESSENCE_META = {
  forest_essence: { icon: '🌿', color: '#27ae60', name: 'Forest Essence' },
  wind_essence:   { icon: '💨', color: '#87ceeb', name: 'Wind Essence'   },
  earth_essence:  { icon: '🪨', color: '#95a5a6', name: 'Earth Essence'  },
  fire_essence:   { icon: '🔥', color: '#e74c3c', name: 'Fire Essence'   },
  ice_essence:    { icon: '❄️', color: '#3498db', name: 'Ice Essence'    },
  ocean_essence:  { icon: '🌊', color: '#1abc9c', name: 'Ocean Essence'  },
  storm_essence:  { icon: '⚡', color: '#9b59b6', name: 'Storm Essence'  },
  shadow_essence: { icon: '🌑', color: '#6c3483', name: 'Shadow Essence' },
  lava_essence:   { icon: '🌋', color: '#e67e22', name: 'Lava Essence'   },
  void_essence:   { icon: '✨', color: '#f1c40f', name: 'Void Essence'   },
};


function CostPill({ icon, label, have, need, color }) {
  const ok = have >= need;
  return (
    <span style={{
      fontSize: 11,
      padding: '4px 9px',
      borderRadius: 8,
      background: ok ? '#102a17' : '#2a1515',
      color: ok ? '#2ecc71' : '#ff6b6b',
      border: `1px solid ${ok ? '#2ecc7166' : '#e74c3c66'}`,
      whiteSpace: 'nowrap',
    }}>
      {icon} {have}/{need} <span style={{ color: ok ? '#a7f3bd' : '#ffb3b3' }}>{label}</span>
    </span>
  );
}

export default function LegacyArmory({ onClose }) {
  const {
    fragments,
    legacyWeapons,
    unlockLegacyWeapon,
    addItem,
    inventory,
    resources,
    spendResource,
    spendFragments,
    prestigeLevel,
    bossesDefeated,
    fullGodPathCompleted,
    hasPrestigeForgeUnlocked,
  } = useGameStore();

  const [toast, setToast] = useState(null);

  const ascended = (prestigeLevel || 0) >= 1;
  const godsDefeated = (bossesDefeated || []).length;
  const forgeUnlocked = typeof hasPrestigeForgeUnlocked === 'function'
    ? hasPrestigeForgeUnlocked()
    : (ascended && !!fullGodPathCompleted);

  const canAffordFragments = (cost) =>
    Object.entries(cost || {}).every(([t, n]) => (fragments[t] || 0) >= n);

  const canAffordEssence = (cost) =>
    Object.entries(cost || {}).every(([k, n]) => (resources[k] || 0) >= n);

  const canAfford = (weapon) =>
    canAffordFragments(weapon.fragmentCost) && canAffordEssence(weapon.essenceCost);

  const buildWeaponItem = (weapon) => ({
    id: weapon.id,
    name: weapon.name,
    slot: 'weapon',
    type: weapon.type,
    tier: 'godkiller',
    rarity: 'godkiller',
    atk: weapon.atk,
    abilityId: weapon.abilityId,
    passiveId: weapon.passiveId,
    passiveDesc: weapon.passiveDesc,
    instanceId: `item_${Date.now()}_prestige_${weapon.id}`,
    icon: weapon.icon,
    upgradeLevel: 0,
  });

  const showToast = (message, ms = 3000) => {
    setToast(message);
    setTimeout(() => setToast(null), ms);
  };

  const handleForge = (weapon) => {
    if (!forgeUnlocked) return;

    const unlocked = (legacyWeapons || []).includes(weapon.id);
    const alreadyInInventory = (inventory || []).some(item => item.id === weapon.id);

    if (unlocked) {
      if (alreadyInInventory) {
        showToast(`${weapon.name} has already been forged.`);
        return;
      }
      if (addItem(buildWeaponItem(weapon))) {
        showToast(`${weapon.icon} ${weapon.name} reclaimed.`);
      }
      return;
    }

    if (!canAfford(weapon)) return;

    for (const [key, amount] of Object.entries(weapon.essenceCost || {})) {
      if (!spendResource(key, amount)) {
        showToast('Missing required essence.');
        return;
      }
    }

    if (!spendFragments(weapon.fragmentCost || {})) {
      showToast('Missing required fragments.');
      return;
    }

    unlockLegacyWeapon(weapon.id);
    if (addItem(buildWeaponItem(weapon))) {
      showToast(`✨ ${weapon.name} forged!`, 4000);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 300,
      background: '#000000ee',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#0d0d1a',
        borderRadius: '0 0 20px 20px',
        paddingTop: 'calc(env(safe-area-inset-top) + 22px)',
        paddingBottom: 16,
        paddingLeft: 20,
        paddingRight: 20,
        borderBottom: '2px solid #d4af3766',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#d4af37', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 }}>
              🔱 Prestige Forge
            </div>
            <div style={{ color: '#ffffff77', fontSize: 11, marginTop: 2 }}>
              {forgeUnlocked
                ? 'Forge legacy weapons from the complete god essence set'
                : 'Locked until all gods are defeated and you ascend'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#1a1a2e',
            border: '1px solid #444',
            borderRadius: 10,
            width: 38,
            height: 38,
            color: '#aaa',
            fontSize: 16,
            cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{
          marginTop: 14,
          background: forgeUnlocked ? '#102011' : '#241a08',
          border: `1px solid ${forgeUnlocked ? '#2ecc7166' : '#d4af3766'}`,
          borderRadius: 12,
          padding: '10px 12px',
          color: forgeUnlocked ? '#9ff0b5' : '#f5d06f',
          fontSize: 12,
          lineHeight: 1.35,
        }}>
          {forgeUnlocked
            ? `Ascension Rank ${prestigeLevel}. Legacy forging is unlocked.`
            : `Defeat all 10 Elemental Gods (${godsDefeated}/10), ascend, then return here to unlock divine forging.`}
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          background: '#ffffff08',
          borderRadius: 10,
          padding: '10px 12px',
        }}>
          {Object.values(FRAGMENT_TYPES).map(ft => (
            <div key={ft.id} style={{
              flex: 1,
              textAlign: 'center',
              background: `${ft.color}11`,
              border: `1px solid ${ft.color}44`,
              borderRadius: 8,
              padding: '6px 4px',
            }}>
              <div style={{ fontSize: 20 }}>{ft.icon}</div>
              <div style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: (fragments[ft.id] || 0) > 0 ? ft.color : '#555',
                marginTop: 2,
              }}>{fragments[ft.id] || 0}</div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 1 }}>{ft.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        width: '100%',
        maxWidth: 420,
        padding: '14px 16px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        {!forgeUnlocked && (
          <div style={{
            textAlign: 'center',
            color: '#b38b30',
            fontSize: 13,
            padding: '22px 18px',
            background: '#151006',
            border: '1px solid #d4af3744',
            borderRadius: 14,
          }}>
            🔒 Prestige Forge locked
            <div style={{ color: '#ffffff77', fontSize: 11, marginTop: 8 }}>
              This is an end-map reward. Complete all 10 gods, ascend, then return to reveal these weapons.
            </div>
          </div>
        )}

        {forgeUnlocked && LEGACY_WEAPONS.map(weapon => {
          const unlocked = (legacyWeapons || []).includes(weapon.id);
          const alreadyInInventory = (inventory || []).some(item => item.id === weapon.id);
          const affordable = canAfford(weapon);
          const canCraft = unlocked ? !alreadyInInventory : affordable;

          return (
            <div key={weapon.id} style={{
              background: unlocked
                ? `linear-gradient(135deg, #120f00 60%, ${weapon.color}18 100%)`
                : '#0d0d1a',
              border: `2px solid ${unlocked ? weapon.color : (affordable ? weapon.color + '88' : '#2a2a3e')}`,
              borderRadius: 16,
              padding: 16,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: unlocked
                ? `0 0 18px ${weapon.color}55, 0 0 6px ${weapon.color}33 inset`
                : affordable
                ? `0 0 10px ${weapon.color}33`
                : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 62,
                  height: 62,
                  borderRadius: 14,
                  flexShrink: 0,
                  background: unlocked ? `${weapon.color}33` : `${weapon.color}15`,
                  border: `2px solid ${unlocked ? weapon.color : weapon.color + '44'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                        background: weapon.color,
                        color: '#000',
                        fontSize: 8,
                        fontWeight: 'bold',
                        padding: '2px 7px',
                        borderRadius: 6,
                      }}>FORGED</span>
                    )}
                  </div>
                  <div style={{ color: '#aaa', fontSize: 11, marginTop: 3 }}>{weapon.desc}</div>
                  <div style={{
                    color: weapon.color + 'cc',
                    fontSize: 11,
                    marginTop: 4,
                    fontStyle: 'italic',
                  }}>⚡ {weapon.passiveDesc}</div>
                  <div style={{ color: '#d4af37', fontSize: 12, marginTop: 5, fontWeight: 'bold' }}>
                    ATK {weapon.atk}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 12,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                {Object.entries(weapon.fragmentCost).map(([type, need]) => {
                  const ft = FRAGMENT_TYPES[type] || { icon: '◆', name: type, color: '#d4af37' };
                  return (
                    <CostPill
                      key={type}
                      icon={ft.icon}
                      label={ft.name}
                      have={fragments[type] || 0}
                      need={need}
                      color={ft.color}
                    />
                  );
                })}

                {Object.entries(weapon.essenceCost).map(([key, need]) => {
                  const em = ESSENCE_META[key] || { icon: '✨', color: '#d4af37', name: key };
                  return (
                    <CostPill
                      key={key}
                      icon={em.icon}
                      label={em.name}
                      have={resources[key] || 0}
                      need={need}
                      color={em.color}
                    />
                  );
                })}

                <button
                  onClick={() => handleForge(weapon)}
                  disabled={!canCraft}
                  style={{
                    marginLeft: 'auto',
                    background: canCraft ? weapon.color : '#1a1a2e',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 16px',
                    color: canCraft ? '#000' : '#555',
                    fontWeight: 'bold',
                    fontSize: 12,
                    cursor: canCraft ? 'pointer' : 'default',
                  }}
                >
                  {unlocked
                    ? (alreadyInInventory ? 'Already Forged' : 'Reclaim')
                    : (affordable ? '⚒ Forge' : 'Need Materials')}
                </button>
              </div>
            </div>
          );
        })}

        <div style={{ color: '#ffffff33', fontSize: 11, textAlign: 'center', padding: '8px 0' }}>
          Legacy weapons are intentionally stronger than normal gear, but not overpowering.
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'absolute',
          bottom: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a1200',
          border: '2px solid #d4af37',
          color: '#d4af37',
          padding: '10px 24px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          zIndex: 400,
          boxShadow: '0 0 20px #d4af3744',
        }}>{toast}</div>
      )}
    </div>
  );
}
