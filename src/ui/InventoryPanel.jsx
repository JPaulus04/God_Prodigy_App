// GP_INV_FINAL_v4
import React from 'react';
import { useGameStore } from '../store/useGameStore';

const SLOT_SIZE = 76;

function getItemIcon(item) {
  if (!item) return '·';

  if (item.slot === 'armor') return '🛡️';
  if (item.slot === 'accessory') {
    if ((item.name || '').toLowerCase().includes('ring')) return '💍';
    if ((item.name || '').toLowerCase().includes('charm')) return '📦';
    return '✨';
  }

  switch (item.type) {
    case 'sword': return '⚔️';
    case 'hammer': return '🔨';
    case 'bow': return '🏹';
    case 'dagger': return '🗡️';
    case 'staff': return '🔮';
    default: return '⚒️';
  }
}

function getSlotAccent(item) {
  if (!item) return {
    bg: '#101014',
    border: '#282832',
    glow: 'none',
    label: '#5c5f6b',
  };

  if (item.slot === 'weapon') {
    return {
      bg: '#192537',
      border: '#a84343',
      glow: '0 0 0 1px #a8434333 inset',
      label: '#ff8b8b',
    };
  }

  if (item.slot === 'armor') {
    return {
      bg: '#182433',
      border: '#4b7bec',
      glow: '0 0 0 1px #4b7bec33 inset',
      label: '#8db6ff',
    };
  }

  return {
    bg: '#241d33',
    border: '#b08d2f',
    glow: '0 0 0 1px #b08d2f33 inset',
    label: '#e7c86e',
  };
}

function getRarityColor(rarity) {
  switch ((rarity || '').toLowerCase()) {
    case 'common': return '#bdc3c7';
    case 'uncommon': return '#2ecc71';
    case 'rare': return '#3498db';
    case 'epic': return '#9b59b6';
    case 'legendary': return '#f1c40f';
    default: return '#7f8c8d';
  }
}

function getTierLabel(item) {
  if (!item) return '';
  return item.tier ? String(item.tier).toUpperCase() : (item.rarity ? String(item.rarity).toUpperCase() : '');
}

function getPrimaryStatText(item) {
  if (!item) return '';
  if (item.atk) return `+${item.atk} ATK`;
  if (item.def) return `+${item.def} DEF`;
  if (item.spd) return `+${item.spd} SPD`;
  if (item.spdPenalty) return `${item.spdPenalty} SPD`;
  return item.slot ? item.slot.toUpperCase() : '';
}

function getCategoryLabel(item) {
  if (!item) return '';
  if (item.slot === 'weapon') return item.type ? item.type.toUpperCase() : 'WEAPON';
  if (item.slot === 'armor') return 'ARMOR';
  if (item.slot === 'accessory') return 'ACCESSORY';
  return '';
}

function getEquippedItem(slot, gear, inventory) {
  const instanceId = gear?.[slot];
  if (!instanceId) return null;
  return inventory.find(i => i.instanceId === instanceId) || null;
}

function getEmptySlotLabel(label) {
  if (label === 'Armor') return 'No Armor';
  if (label === 'Accessory') return 'No Accessory';
  return 'No Weapon';
}

function GearSlot({ label, item, onUnequip }) {
  const accent = getSlotAccent(item);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 64,
        borderRadius: 12,
        border: `1px solid ${item ? accent.border : '#30303a'}`,
        background: item ? accent.bg : '#101014',
        boxShadow: item ? accent.glow : 'none',
        padding: '7px 9px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div style={{ fontSize: 9, color: item ? accent.label : '#6a6a74', letterSpacing: 0.8 }}>
        {label}
      </div>

      {item ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ fontSize: 20, lineHeight: 1 }}>{getItemIcon(item)}</div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: '#f2f2f2',
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.name || item.id || 'Equipped Item'}
              </div>
              <div style={{ color: accent.label, fontSize: 8, marginTop: 1 }}>
                {getCategoryLabel(item)} {getPrimaryStatText(item) ? `• ${getPrimaryStatText(item)}` : ''}
              </div>
            </div>
          </div>

          <button
            onClick={() => onUnequip(item.slot)}
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              background: '#00000088',
              border: '1px solid #ffffff22',
              color: '#ddd',
              fontSize: 10,
              borderRadius: 8,
              padding: '1px 6px',
              cursor: 'pointer',
            }}
          >
            X
          </button>
        </>
      ) : (
        <div style={{ color: '#4d5160', fontSize: 10, textAlign: 'center', marginTop: 10 }}>
          {getEmptySlotLabel(label)}
        </div>
      )}
    </div>
  );
}

export default function InventoryPanel() {
  const {
    inventory,
    gear,
    equipItem,
    unequipItem,
    playerATK,
    playerDEF,
    playerSPD,
    playerMaxHP,
    toggleInventory,
  } = useGameStore();

  const equippedWeapon = getEquippedItem('weapon', gear, inventory);
  const equippedArmor = getEquippedItem('armor', gear, inventory);
  const equippedAccessory = getEquippedItem('accessory', gear, inventory);

  const maxSlots = Math.max(16, inventory.length);
  const slots = Array.from({ length: maxSlots }, (_, i) => inventory[i] || null);

  const handleItemPress = (item) => {
    if (!item) return;
    if (item.slot) equipItem(item);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 120,
        background: 'linear-gradient(0deg, #050712 86%, #050712f2 95%, #05071266 100%)',
        borderTop: '2px solid #d4af3755',
        padding: '14px 14px 24px',
        maxHeight: '61vh',
        overflowY: 'auto',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div>
          <h3 style={{ color: '#d4af37', margin: 0, fontSize: 22, letterSpacing: 0.3 }}>
            Inventory
          </h3>
          <div style={{ color: '#7f8c8d', fontSize: 10, marginTop: 2 }}>
            Tap gear to equip
          </div>
        </div>

        <button
          onClick={toggleInventory}
          style={{
            background: '#00000088',
            border: '1px solid #ffffff22',
            color: '#ddd',
            fontSize: 15,
            cursor: 'pointer',
            borderRadius: 10,
            padding: '5px 11px',
          }}
        >
          Close
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          padding: 10,
          background: '#ffffff08',
          borderRadius: 12,
          border: '1px solid #ffffff12',
        }}
      >
        <GearSlot label="Weapon" item={equippedWeapon} onUnequip={unequipItem} />
        <GearSlot label="Armor" item={equippedArmor} onUnequip={unequipItem} />
        <GearSlot label="Accessory" item={equippedAccessory} onUnequip={unequipItem} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 12,
          background: '#ffffff08',
          borderRadius: 12,
          border: '1px solid #ffffff12',
          overflow: 'hidden',
        }}
      >
        {[
          { label: 'ATK', val: playerATK, col: '#e74c3c' },
          { label: 'DEF', val: playerDEF, col: '#3498db' },
          { label: 'SPD', val: playerSPD, col: '#2ecc71' },
          { label: 'HP',  val: playerMaxHP, col: '#ff6b6b' },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px 0',
              borderRight: i < 3 ? '1px solid #ffffff12' : 'none',
            }}
          >
            <div style={{ color: s.col, fontSize: 20, fontWeight: 800 }}>{s.val}</div>
            <div style={{ color: '#7a7a7a', fontSize: 9, letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(4, ${SLOT_SIZE}px)`,
          gap: 8,
          justifyContent: 'center',
        }}
      >
        {slots.map((item, i) => {
          const accent = getSlotAccent(item);
          const isEquipped = !!item && (
            gear.weapon === item.instanceId ||
            gear.armor === item.instanceId ||
            gear.accessory === item.instanceId
          );

          return (
            <button
              key={i}
              onClick={() => handleItemPress(item)}
              style={{
                width: SLOT_SIZE,
                minHeight: 80,
                background: item ? accent.bg : '#0c0f18',
                border: `1px solid ${item ? accent.border : '#1c2230'}`,
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: item ? 'pointer' : 'default',
                textAlign: 'center',
                padding: '7px 6px 6px',
                position: 'relative',
                boxShadow: item ? accent.glow : 'none',
              }}
            >
              {item ? (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 5,
                      left: 5,
                      background: '#00000088',
                      color: getRarityColor(item.rarity),
                      border: `1px solid ${getRarityColor(item.rarity)}55`,
                      borderRadius: 999,
                      fontSize: 7,
                      padding: '2px 5px',
                      letterSpacing: 0.6,
                    }}
                  >
                    {getTierLabel(item) || 'GEAR'}
                  </div>

                  {isEquipped && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: '#d4af37',
                        boxShadow: '0 0 8px #d4af37aa',
                      }}
                    />
                  )}

                  <div style={{ fontSize: 22, lineHeight: 1, marginTop: 10, marginBottom: 4 }}>
                    {getItemIcon(item)}
                  </div>

                  <div
                    style={{
                      color: accent.label,
                      fontSize: 7,
                      letterSpacing: 0.7,
                      marginBottom: 2,
                    }}
                  >
                    {getCategoryLabel(item)}
                  </div>

                  <div
                    style={{
                      color: '#f2f2f2',
                      fontSize: 9,
                      fontWeight: 700,
                      lineHeight: 1.05,
                      minHeight: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.name || item.id}
                  </div>

                  <div
                    style={{
                      color: item.atk ? '#ff7b7b' : item.def ? '#66b3ff' : '#7bed9f',
                      fontSize: 9,
                      marginTop: 2,
                      fontWeight: 700,
                    }}
                  >
                    {getPrimaryStatText(item)}
                  </div>
                </>
              ) : (
                <div style={{ color: '#1f2633', fontSize: 22, marginTop: 22 }}>+</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
