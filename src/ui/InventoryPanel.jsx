import React from 'react';
import { useGameStore } from '../store/useGameStore';

const SLOT_SIZE = 72;
const MAX_SLOTS = 16;

export default function InventoryPanel() {
  const {
    inventory, gear, resources,
    equipItem, removeItem,
    playerATK, playerDEF, playerSPD, playerMaxHP,
    toggleInventory,
  } = useGameStore();

  const handleItemPress = (item) => {
    if (!item) return;
    if (item.slot) {
      equipItem(item);
    }
  };

  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => inventory[i] || null);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      zIndex: 120,
      background: 'linear-gradient(0deg, #0d0d1a 85%, #0d0d1a00)',
      borderTop: '2px solid #d4af3755',
      padding: '16px 16px 40px',
      maxHeight: '65vh', overflowY: 'auto',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ color: '#d4af37', margin: 0, fontSize: 18 }}>🎒 Inventory</h3>
        <button
          onClick={toggleInventory}
          style={{
            background: 'none', border: '1px solid #444',
            color: '#aaa', fontSize: 16, cursor: 'pointer',
            borderRadius: 8, padding: '4px 10px',
          }}
        >✕ Close</button>
      </div>

      {/* Gear slots */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 12,
        padding: '10px 12px', background: '#ffffff08',
        borderRadius: 10, border: '1px solid #ffffff11',
      }}>
        <div style={{ fontSize: 11, color: '#555', width: 36, paddingTop: 6 }}>Gear</div>
        {[
          { slot: 'weapon', label: '⚔ Weapon' },
          { slot: 'armor',  label: '🛡 Armor'  },
          { slot: 'accessory', label: '💍 Ring' },
        ].map(({ slot, label }) => (
          <div key={slot} style={{
            flex: 1, height: 44, borderRadius: 8,
            border: `1px solid ${gear[slot] ? '#d4af3777' : '#333'}`,
            background: gear[slot] ? '#1a2535' : '#111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11,
            color: gear[slot] ? '#d4af37' : '#444',
          }}>
            {gear[slot] ? gear[slot].replace(/_/g, ' ') : label}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 14,
        background: '#ffffff08', borderRadius: 10,
        border: '1px solid #ffffff11', overflow: 'hidden',
      }}>
        {[
          { label: 'ATK', val: playerATK, col: '#e74c3c' },
          { label: 'DEF', val: playerDEF, col: '#3498db' },
          { label: 'SPD', val: playerSPD, col: '#2ecc71' },
          { label: 'HP',  val: playerMaxHP, col: '#e74c3c' },
        ].map(({ label, val, col }, i) => (
          <div key={label} style={{
            flex: 1, textAlign: 'center', padding: '10px 0',
            borderRight: i < 3 ? '1px solid #ffffff11' : 'none',
          }}>
            <div style={{ color: col,    fontSize: 18, fontWeight: 'bold' }}>{val}</div>
            <div style={{ color: '#555', fontSize: 10 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Item grid — buttons for reliable iOS taps */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(4, ${SLOT_SIZE}px)`,
        gap: 8, justifyContent: 'center', marginBottom: 14,
      }}>
        {slots.map((item, i) => (
          <button
            key={i}
            onClick={() => handleItemPress(item)}
            style={{
              width: SLOT_SIZE, height: SLOT_SIZE,
              background: item ? '#1a2535' : '#111',
              border: `1px solid ${item ? '#d4af3766' : '#222'}`,
              borderRadius: 10,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: item ? 'pointer' : 'default',
              fontSize: 10, color: '#888', textAlign: 'center',
              padding: 6,
            }}
          >
            {item ? (
              <>
                <div style={{ fontSize: 22, marginBottom: 3 }}>
                  {item.slot === 'weapon' ? '⚔️' : item.slot === 'armor' ? '🛡️' : '📦'}
                </div>
                <div style={{ color: '#ccc', fontSize: 9, lineHeight: 1.2 }}>
                  {item.name || item.id}
                </div>
                {item.atk && (
                  <div style={{ color: '#e74c3c', fontSize: 9, marginTop: 2 }}>+{item.atk} ATK</div>
                )}
                {gear.weapon === item.id && (
                  <div style={{ color: '#d4af37', fontSize: 8, marginTop: 1 }}>EQUIPPED</div>
                )}
              </>
            ) : (
              <div style={{ color: '#2a2a2a', fontSize: 22 }}>+</div>
            )}
          </button>
        ))}
      </div>

      {/* Resources */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {[
          { k: 'wood',  icon: '🪵', label: 'Wood'  },
          { k: 'stone', icon: '🪨', label: 'Stone' },
          { k: 'ore',   icon: '⛏',  label: 'Ore'   },
        ].map(({ k, icon, label }) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#ffffff08', padding: '8px 14px', borderRadius: 10,
          }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{resources[k]}</div>
              <div style={{ color: '#555', fontSize: 9 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', color: '#333', fontSize: 10, marginTop: 12, marginBottom: 0 }}>
        Tap a weapon or armor to equip it.
      </p>
    </div>
  );
}
