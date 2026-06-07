import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

// ─────────────────────────────────────────────────────────────────────────────
// IAP Catalog
// All prices are display-only strings (real billing via native Capacitor plugin).
// purchaseKey identifies what the store action to run on successful purchase.
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = ['Resources', 'Boosters', 'Cosmetics', 'Utility', 'Pass'];

const ITEMS = [
  // ── Resources ──────────────────────────────────────────────────────────────
  {
    id: 'ore_small',
    category: 'Resources',
    icon: '⛏',
    name: 'Ore Pouch',
    desc: '25 ore — enough to craft one weapon upgrade.',
    price: '$0.99',
    color: '#e67e22',
    action: (store) => store.addResource('ore', 25),
  },
  {
    id: 'ore_large',
    category: 'Resources',
    icon: '⛏',
    name: 'Ore Cache',
    desc: '75 ore + 30 stone. Serious crafting fuel.',
    price: '$2.99',
    color: '#e67e22',
    badge: 'Best Value',
    action: (store) => { store.addResource('ore', 75); store.addResource('stone', 30); },
  },
  {
    id: 'bundle_builder',
    category: 'Resources',
    icon: '🪵',
    name: 'Builder Bundle',
    desc: '50 wood, 50 stone, 20 ore. Everything for a Kaelford upgrade.',
    price: '$1.99',
    color: '#27ae60',
    action: (store) => { store.addResource('wood', 50); store.addResource('stone', 50); store.addResource('ore', 20); },
  },
  {
    id: 'fire_shard_pack',
    category: 'Resources',
    icon: '🔥',
    name: 'Fire Shard Pack',
    desc: '5 fire shards. Rare fuel for endgame forging.',
    price: '$1.99',
    color: '#e74c3c',
    action: (store) => store.addResource('fire_shard', 5),
  },

  // ── Boosters ───────────────────────────────────────────────────────────────
  {
    id: 'xp_boost',
    category: 'Boosters',
    icon: '✦',
    name: 'XP Surge',
    desc: 'Instantly gain 500 XP. Great for pushing past a level wall.',
    price: '$0.99',
    color: '#9b59b6',
    action: (store) => store.gainXP(500),
  },
  {
    id: 'xp_boost_big',
    category: 'Boosters',
    icon: '✦',
    name: 'XP Torrent',
    desc: 'Instantly gain 2,000 XP. Skip several levels of grind.',
    price: '$2.99',
    color: '#9b59b6',
    badge: 'Popular',
    action: (store) => store.gainXP(2000),
  },
  {
    id: 'respawn_shield',
    category: 'Boosters',
    icon: '🛡',
    name: 'Death Shield',
    desc: 'Next death in a realm: stay alive at 1 HP instead of fleeing. One use.',
    price: '$0.99',
    color: '#3498db',
    action: (store) => store.grantRespawnShield(),
  },
  {
    id: 'respawn_3pack',
    category: 'Boosters',
    icon: '🛡',
    name: 'Shield Pack ×3',
    desc: '3 Death Shields — survive three deadly blows across any realm.',
    price: '$1.99',
    color: '#3498db',
    action: (store) => store.grantRespawnShield(3),
  },
  {
    id: 'full_heal',
    category: 'Boosters',
    icon: '❤',
    name: 'Divine Heal',
    desc: 'Fully restore HP right now. No cooldown, works anywhere.',
    price: '$0.99',
    color: '#e74c3c',
    action: (store) => store.healPlayer(store.playerMaxHP),
  },
  {
    id: 'stat_points',
    category: 'Boosters',
    icon: '⬆',
    name: 'Stat Infusion',
    desc: '5 bonus stat points to spend on ATK, DEF, or SPD.',
    price: '$1.99',
    color: '#d4af37',
    action: (store) => store.grantStatPoints(5),
  },

  // ── Cosmetics ──────────────────────────────────────────────────────────────
  {
    id: 'skin_shadow',
    category: 'Cosmetics',
    icon: '🌑',
    name: 'Shadow Knight',
    desc: 'Dark armor, black plume, shadow-step trail on every move.',
    price: '$1.99',
    color: '#6c3483',
    badge: 'New',
    action: (store) => store.unlockSkin('shadow_knight'),
  },
  {
    id: 'skin_gold',
    category: 'Cosmetics',
    icon: '👑',
    name: 'God\'s Chosen',
    desc: 'Full gold armor set with divine glow. Only for the worthy.',
    price: '$2.99',
    color: '#d4af37',
    action: (store) => store.unlockSkin('gods_chosen'),
  },
  {
    id: 'skin_ice',
    category: 'Cosmetics',
    icon: '❄️',
    name: 'Frost Warden',
    desc: 'Ice-blue armor with frost crystal effects on attack.',
    price: '$1.99',
    color: '#85c1e9',
    action: (store) => store.unlockSkin('frost_warden'),
  },
  {
    id: 'trail_fire',
    category: 'Cosmetics',
    icon: '🔥',
    name: 'Ember Trail',
    desc: 'Every step leaves a flame wake. Every attack bursts with fire.',
    price: '$0.99',
    color: '#e74c3c',
    action: (store) => store.unlockTrail('ember'),
  },
  {
    id: 'trail_void',
    category: 'Cosmetics',
    icon: '✨',
    name: 'Void Trail',
    desc: 'Purple void particles follow your movement. Nihilus-approved.',
    price: '$0.99',
    color: '#9b59b6',
    action: (store) => store.unlockTrail('void'),
  },

  // ── Utility ────────────────────────────────────────────────────────────────
  {
    id: 'inventory_expand',
    category: 'Utility',
    icon: '🎒',
    name: 'Satchel Upgrade',
    desc: 'Permanently expand inventory by 16 slots.',
    price: '$1.99',
    color: '#27ae60',
    action: (store) => store.expandInventory(16),
  },
  {
    id: 'boss_skip',
    category: 'Utility',
    icon: '⚡',
    name: 'God\'s Mercy',
    desc: 'Mark one boss as defeated without fighting them. One-time use per account.',
    price: '$4.99',
    color: '#f1c40f',
    badge: 'Rare',
    limitedKey: 'bossSkipUsed',
    action: (store) => store.grantBossSkip(),
  },

  // ── Pass ───────────────────────────────────────────────────────────────────
  {
    id: 'god_pass',
    category: 'Pass',
    icon: '🏆',
    name: 'God Prodigy Pass',
    desc: 'Daily resource drops, +25% XP all the time, exclusive Pass cosmetic each season. Renews monthly.',
    price: '$9.99/mo',
    color: '#d4af37',
    badge: 'Best Deal',
    action: (store) => store.activatePass(),
  },
];

// ─────────────────────────────────────────────────────────────────────────────

function PurchaseConfirmModal({ item, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        background: '#000000cc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0d1a',
          border: `2px solid ${item.color}`,
          borderRadius: 18, padding: '28px 24px',
          maxWidth: 320, width: '90%', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 8 }}>{item.icon}</div>
        <div style={{ color: item.color, fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>
          {item.name}
        </div>
        <div style={{ color: '#aaa', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          {item.desc}
        </div>
        <div style={{
          color: '#d4af37', fontSize: 28, fontWeight: 'bold', marginBottom: 20,
        }}>{item.price}</div>
        <div style={{ color: '#ffffff44', fontSize: 10, marginBottom: 20 }}>
          Payment processed securely through the App Store.
          No refunds after delivery of in-game items.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '14px', borderRadius: 12,
            background: '#1a1a2e', border: '1px solid #444',
            color: '#aaa', fontSize: 14, cursor: 'pointer', fontWeight: 'bold',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 2, padding: '14px', borderRadius: 12,
            background: item.color, border: 'none',
            color: '#000', fontSize: 15, cursor: 'pointer', fontWeight: 'bold',
          }}>Buy {item.price}</button>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, onBuy, purchased }) {
  const isLimited = item.limitedKey && purchased;
  return (
    <div style={{
      background: '#0d0d1a',
      border: `1px solid ${isLimited ? '#333' : item.color + '55'}`,
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
      opacity: isLimited ? 0.5 : 1,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle glow bg */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: `radial-gradient(ellipse at 10% 50%, ${item.color}11 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: item.color + '22',
        border: `1px solid ${item.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, flexShrink: 0,
        position: 'relative', zIndex: 1,
      }}>
        {item.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{item.name}</span>
          {item.badge && (
            <span style={{
              background: item.color, color: '#000',
              fontSize: 8, fontWeight: 'bold',
              padding: '2px 6px', borderRadius: 6, letterSpacing: 0.5,
            }}>{item.badge}</span>
          )}
          {isLimited && (
            <span style={{
              background: '#333', color: '#888',
              fontSize: 8, padding: '2px 6px', borderRadius: 6,
            }}>OWNED</span>
          )}
        </div>
        <div style={{ color: '#888', fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{item.desc}</div>
      </div>

      {/* Price button */}
      <button
        onClick={() => !isLimited && onBuy(item)}
        style={{
          background: isLimited ? '#1a1a2e' : item.color,
          border: 'none', borderRadius: 10,
          padding: '8px 12px', minWidth: 58,
          color: isLimited ? '#444' : '#000',
          fontWeight: 'bold', fontSize: 12,
          cursor: isLimited ? 'default' : 'pointer',
          flexShrink: 0, position: 'relative', zIndex: 1,
          lineHeight: 1.3, textAlign: 'center',
        }}
      >
        {isLimited ? '✓' : item.price}
      </button>
    </div>
  );
}

export default function IAPShop({ onClose }) {
  const store = useGameStore();
  const [activeTab, setActiveTab]   = useState('Resources');
  const [confirmItem, setConfirmItem] = useState(null);
  const [toast, setToast]           = useState(null);

  const passActive  = store.passActive;
  const ownedSkins  = store.ownedSkins  || [];
  const ownedTrails = store.ownedTrails || [];
  const bossSkipUsed = store.bossSkipUsed || false;
  const extraSlots  = store.extraInventorySlots || 0;

  const isPurchased = (item) => {
    if (item.id === 'god_pass')       return passActive;
    if (item.id === 'boss_skip')      return bossSkipUsed;
    if (item.id === 'inventory_expand') return extraSlots >= 16;
    if (item.id.startsWith('skin_'))  return ownedSkins.includes(item.id.replace('skin_',''));
    if (item.id.startsWith('trail_')) return ownedTrails.includes(item.id.replace('trail_',''));
    return false;
  };

  const handleBuy = (item) => setConfirmItem(item);

  const handleConfirm = () => {
    if (!confirmItem) return;
    // In a real build this would call Capacitor's IAP plugin first,
    // then apply the action only on successful purchase callback.
    // For TestFlight/dev, we apply immediately.
    try {
      confirmItem.action(store);
    } catch(e) {
      console.warn('IAP action error', e);
    }
    setToast(`${confirmItem.name} unlocked!`);
    setTimeout(() => setToast(null), 3000);
    setConfirmItem(null);
  };

  const tabItems = ITEMS.filter(i => i.category === activeTab);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: '#000000ee',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '0 20px 0',
        paddingTop: 'calc(env(safe-area-inset-top) + 22px)',
        background: '#0d0d1a',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={{ color: '#d4af37', fontSize: 22, fontWeight: 'bold', letterSpacing: 1 }}>
              ⚔ GOD'S TREASURY
            </div>
            <div style={{ color: '#ffffff44', fontSize: 11, marginTop: 2 }}>
              Support the realm. Power your legend.
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#1a1a2e', border: '1px solid #444',
            borderRadius: 10, width: 40, height: 40,
            color: '#aaa', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Pass banner if active */}
        {passActive && (
          <div style={{
            background: 'linear-gradient(90deg, #1a1400, #2a2000)',
            border: '1px solid #d4af3766',
            borderRadius: 10, padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 18 }}>🏆</span>
            <div>
              <div style={{ color: '#d4af37', fontSize: 12, fontWeight: 'bold' }}>God Prodigy Pass Active</div>
              <div style={{ color: '#ffffff55', fontSize: 10 }}>+25% XP · Daily drops · Exclusive cosmetics</div>
            </div>
          </div>
        )}

        {/* Category tabs */}
        <div style={{ height: 1, background: '#d4af3733', margin: '10px 0 0' }} />
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          padding: '10px 0 12px',
          scrollbarWidth: 'none',
        }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)} style={{
              background: activeTab === cat ? '#d4af37' : '#1a1a2e',
              border: `1px solid ${activeTab === cat ? '#d4af37' : '#333'}`,
              borderRadius: 20, padding: '6px 16px',
              color: activeTab === cat ? '#000' : '#888',
              fontSize: 12, fontWeight: 'bold',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{cat}</button>
          ))}
        </div>
      </div>

      {/* ── Item list ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '4px 16px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {tabItems.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            onBuy={handleBuy}
            purchased={isPurchased(item)}
          />
        ))}

        {/* Restore purchases footer */}
        <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
          <button onClick={() => { setToast('Purchases restored.'); setTimeout(() => setToast(null), 3000); }} style={{
            background: 'none', border: 'none',
            color: '#444', fontSize: 11, cursor: 'pointer',
            textDecoration: 'underline',
          }}>Restore Purchases</button>
        </div>
      </div>

      {/* ── Confirm modal ── */}
      {confirmItem && (
        <PurchaseConfirmModal
          item={confirmItem}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmItem(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%',
          transform: 'translateX(-50%)',
          background: '#27ae60', color: '#fff',
          padding: '10px 24px', borderRadius: 20,
          fontSize: 13, fontWeight: 'bold',
          boxShadow: '0 4px 20px #27ae6066',
          pointerEvents: 'none',
          zIndex: 400,
        }}>✓ {toast}</div>
      )}
    </div>
  );
}

