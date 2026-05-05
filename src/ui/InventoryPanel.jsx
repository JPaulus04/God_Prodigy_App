import React from 'react';
import { useGameStore } from '../store/useGameStore';

const SLOT_SIZE = 60;
const MAX_SLOTS = 16;

export default function InventoryPanel() {
  const {
    inventory, gear, resources,
    equipItem, removeItem,
    playerATK, playerDEF, playerSPD, playerMaxHP,
    toggleInventory,
  } = useGameStore();

  const handleItemPress = (item) => {
    if (item.slot) {
      equipItem(item);
    }
  };

  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => inventory[i] || null);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 120,
      background: 'linear-gradient(0deg, #0d0d1a 80%, #0d0d1a00)',
      borderTop: '2px solid #d4af3755',
      padding: '16px 16px 28px',
      maxHeight: '60vh', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
      }}>
        <h3 style={{ color: '#d4af37', margin: 0, fontSize: 16 }}>🎒 Inventory</h3>
        <button onClick={toggleInventory} style={{
          background: 'none', border: 'none', color: '#666',
          fontSize: 20, cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Equipped gear */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 14,
        padding: '10px 12px', background: '#ffffff08',
        borderRadius: 8, border: '1px solid #ffffff11',
      }}>
        <div style={{ fontSize: 11, color: '#666', width: 40, paddingTop: 4 }}>Gear</div>
        {[
          { slot: 'weapon',    label: '⚔ Weapon'  },
          { slot: 'armor',     label: '🛡 Armor'   },
          { slot: 'accessory', label: '💍 Ring'    },
        ].map(({ slot, label }) => (
          <div key={slot} style={{
            flex: 1, height: 44, borderRadius: 6, border: '1px solid #333',
            background: gear[slot] ? '#1a2535' : '#111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: gear[slot] ? '#d4af37' : '#444',
          }}>
            {gear[slot] ? gear[slot].replace(/_/g, ' ') : label}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 14,
        padding: '8px 12px', background: '#ffffff08',
        borderRadius: 8, border: '1px solid #ffffff11',
      }}>
        {[
          { label: 'ATK', val: playerATK, col: '#e74c3c' },
          { label: 'DEF', val: playerDEF, col: '#3498db' },
          { label: 'SPD', val: playerSPD, col: '#2ecc71' },
          { label: 'HP',  val: playerMaxHP, col: '#e74c3c' },
        ].map(({ label, val, col }) => (
          <div key={label} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: col, fontSize: 15, fontWeight: 'bold' }}>{val}</div>
            <div style={{ color: '#555', fontSize: 10 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Item grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(4, ${SLOT_SIZE}px)`,
        gap: 8, justifyContent: 'center',
      }}>
        {slots.map((item, i) => (
          <div
            key={i}
            onClick={() => item && handleItemPress(item)}
            style={{
              width: SLOT_SIZE, height: SLOT_SIZE,
              background: item ? '#1a2535' : '#111',
              border: `1px solid ${item ? '#d4af3755' : '#222'}`,
              borderRadius: 8,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: item ? 'pointer' : 'default',
              fontSize: 10, color: '#888', textAlign: 'center',
              padding: 4,
            }}
          >
            {item ? (
              <>
                <div style={{ fontSize: 20, marginBottom: 2 }}>
                  {item.slot === 'weapon' ? '⚔️' : item.slot === 'armor' ? '🛡️' : '📦'}
                </div>
                <div style={{ color: '#ccc', fontSize: 9, lineHeight: 1.2 }}>
                  {item.name || item.id}
                </div>
                {item.atk && (
                  <div style={{ color: '#e74c3c', fontSize: 9 }}>+{item.atk} ATK</div>
                )}
              </>
            ) : (
              <div style={{ color: '#333', fontSize: 18 }}>+</div>
            )}
          </div>
        ))}
      </div>

      {/* Resources */}
      <div style={{
        display: 'flex', gap: 12, marginTop: 14,
        justifyContent: 'center',
      }}>
        {[
          { k: 'wood', icon: '🪵', label: 'Wood' },
          { k: 'stone', icon: '🪨', label: 'Stone' },
          { k: 'ore', icon: '⛏', label: 'Ore' },
        ].map(({ k, icon, label }) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#ffffff08', padding: '6px 12px', borderRadius: 10,
          }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{resources[k]}</div>
              <div style={{ color: '#555', fontSize: 9 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', color: '#333', fontSize: 10, marginTop: 12 }}>
        Tap a weapon or armor to equip it. Press I to close.
      </p>
    </div>
  );
}
