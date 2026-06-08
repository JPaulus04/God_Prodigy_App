import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

// ─────────────────────────────────────────────────────────────────────────────
// IAP Catalog
// All prices are display-only strings (real billing via native Capacitor plugin).
import { initIAP, purchaseProduct, restorePurchases } from '../utils/iap';

// purchaseKey identifies what the store action to run on successful purchase.
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = ['Resources', 'Boosters', 'Cosmetics', 'Utility', 'Pass'];

const ITEMS = [
  // ── Resources ──────────────────────────────────────────────────────────────
  {
    id: 'ore_small',
    purchaseKey: 'com.godprodigy.app.ore_small',
    category: 'Resources',
    icon: '⛏',
    name: 'Ore Pouch',
    desc: 'Adds 25 Ore to your inventory. Used to craft and upgrade weapons at the forge. Enough for one mid-tier upgrade.',
    price: '$0.99',
    color: '#e67e22',
    action: (store) => store.addResource('ore', 25),
  },
  {
    id: 'ore_large',
    purchaseKey: 'com.godprodigy.app.ore_large',
    category: 'Resources',
    icon: '⛏',
    name: 'Ore Cache',
    desc: 'Adds 75 Ore + 30 Stone. Covers multiple weapon or armor upgrades. Best value for active crafters.',
    price: '$2.99',
    color: '#e67e22',
    badge: 'Best Value',
    action: (store) => { store.addResource('ore', 75); store.addResource('stone', 30); },
  },
  {
    id: 'bundle_builder',
    purchaseKey: 'com.godprodigy.app.bundle_builder',
    category: 'Resources',
    icon: '🪵',
    name: 'Builder Bundle',
    desc: 'Adds 50 Wood, 50 Stone, and 20 Ore — the exact resources needed for most Kaelford village upgrades.',
    price: '$1.99',
    color: '#27ae60',
    action: (store) => { store.addResource('wood', 50); store.addResource('stone', 50); store.addResource('ore', 20); },
  },
  {
    id: 'fire_shard_pack',
    purchaseKey: 'com.godprodigy.app.fire_shard_pack',
    category: 'Resources',
    icon: '🔥',
    name: 'Fire Shard Pack',
    desc: 'Adds 5 Fire Shards — a rare resource required to forge and upgrade endgame weapons. Difficult to farm naturally.',
    price: '$1.99',
    color: '#e74c3c',
    action: (store) => store.addResource('fire_shard', 5),
  },

  // ── Boosters ───────────────────────────────────────────────────────────────
  {
    id: 'xp_boost',
    purchaseKey: 'com.godprodigy.app.xp_boost',
    category: 'Boosters',
    icon: '✦',
    name: 'XP Surge',
    desc: 'Grants 500 XP immediately. Applied to your current level progress — useful when you are just short of the next level.',
    price: '$0.99',
    color: '#9b59b6',
    action: (store) => store.gainXP(500),
  },
  {
    id: 'xp_boost_big',
    purchaseKey: 'com.godprodigy.app.xp_boost_big',
    category: 'Boosters',
    icon: '✦',
    name: 'XP Torrent',
    desc: 'Grants 2,000 XP immediately. Can push you through multiple levels at once. Best used during a prestige run.',
    price: '$2.99',
    color: '#9b59b6',
    badge: 'Popular',
    action: (store) => store.gainXP(2000),
  },
  {
    id: 'respawn_shield',
    purchaseKey: 'com.godprodigy.app.respawn_shield',
    category: 'Boosters',
    icon: '🛡',
    name: 'Death Shield',
    desc: 'When your HP hits zero inside a realm, this shield activates automatically — leaving you alive at 1 HP instead of dying. Single use.',
    price: '$0.99',
    color: '#3498db',
    action: (store) => store.grantRespawnShield(),
  },
  {
    id: 'respawn_3pack',
    purchaseKey: 'com.godprodigy.app.respawn_shield_3',
    category: 'Boosters',
    icon: '🛡',
    name: 'Shield Pack ×3',
    desc: 'Three Death Shields. Each one activates automatically the next time your HP hits zero in any realm, keeping you alive at 1 HP.',
    price: '$1.99',
    color: '#3498db',
    action: (store) => store.grantRespawnShield(3),
  },
  {
    id: 'full_heal',
    purchaseKey: 'com.godprodigy.app.hp_restore',
    category: 'Boosters',
    icon: '❤',
    name: 'Divine Heal',
    desc: 'Instantly fills your HP bar to maximum. Works in the overworld, dungeons, and realms. No cooldown — usable any time.',
    price: '$0.99',
    color: '#e74c3c',
    action: (store) => store.healPlayer(store.playerMaxHP),
  },
  {
    id: 'stat_points',
    purchaseKey: 'com.godprodigy.app.stat_points',
    category: 'Boosters',
    icon: '⬆',
    name: 'Stat Infusion',
    desc: 'Grants 5 free Stat Points to allocate however you like — Attack, Defense, or Speed. Permanent and stackable.',
    price: '$1.99',
    color: '#d4af37',
    action: (store) => store.grantStatPoints(5),
  },

  // ── Cosmetics ──────────────────────────────────────────────────────────────
  {
    id: 'skin_shadow',
    purchaseKey: 'com.godprodigy.app.skin_shadow',
    category: 'Cosmetics',
    icon: '🌑',
    name: 'Shadow Knight',
    desc: 'Replaces your character with a full dark steel armor set — black plating, deep purple trim, and a dark plume on the helmet. Every movement leaves a brief shadow-step afterimage behind you.',
    price: '$1.99',
    color: '#6c3483',
    badge: 'New',
    action: (store) => store.unlockSkin('shadow_knight'),
  },
  {
    id: 'skin_gold',
    purchaseKey: 'com.godprodigy.app.skin_gods_chosen',
    category: 'Cosmetics',
    icon: '👑',
    name: 'God\'s Chosen',
    desc: 'Replaces your character with a gold and white divine armor set — gleaming plate, winged helmet, and a permanent golden aura around your body. Attack animations emit a radiant light burst.',
    price: '$2.99',
    color: '#d4af37',
    action: (store) => store.unlockSkin('gods_chosen'),
  },
  {
    id: 'skin_ice',
    purchaseKey: 'com.godprodigy.app.skin_frost',
    category: 'Cosmetics',
    icon: '❄️',
    name: 'Frost Warden',
    desc: 'Replaces your character with a frost-blue plate armor set — icy pale blue with silver accents. Every attack spawns a small burst of frost crystals on impact.',
    price: '$1.99',
    color: '#85c1e9',
    action: (store) => store.unlockSkin('frost_warden'),
  },
  {
    id: 'trail_fire',
    purchaseKey: 'com.godprodigy.app.trail_ember',
    category: 'Cosmetics',
    icon: '🔥',
    name: 'Ember Trail',
    desc: 'A visual effect added on top of your current skin. Small flame particles trail behind every step you take, and your melee attacks produce a fire burst on impact. Does not affect gameplay.',
    price: '$0.99',
    color: '#e74c3c',
    action: (store) => store.unlockTrail('ember'),
  },
  {
    id: 'trail_void',
    purchaseKey: 'com.godprodigy.app.trail_void',
    category: 'Cosmetics',
    icon: '✨',
    name: 'Void Trail',
    desc: 'A visual effect added on top of your current skin. Dark purple void particles orbit your character and scatter with every movement. Your attacks leave a brief void-energy streak. Does not affect gameplay.',
    price: '$0.99',
    color: '#9b59b6',
    action: (store) => store.unlockTrail('void'),
  },

  // ── Utility ────────────────────────────────────────────────────────────────
  {
    id: 'inventory_expand',
    purchaseKey: 'com.godprodigy.app.inventory_expand',
    category: 'Utility',
    icon: '🎒',
    name: 'Satchel Upgrade',
    desc: 'Permanently adds 16 slots to your inventory, giving you more space to carry weapons, armor, accessories, and crafting materials. Takes effect immediately.',
    price: '$1.99',
    color: '#27ae60',
    action: (store) => store.expandInventory(16),
  },
  {
    id: 'boss_skip',
    purchaseKey: 'com.godprodigy.app.boss_skip_c',
    category: 'Utility',
    icon: '⚡',
    name: 'God\'s Mercy',
    desc: 'Instantly marks your current realm boss as defeated — no fight required. Counts toward Ascension progress. Can only be purchased and used once per account.',
    price: '$4.99',
    color: '#f1c40f',
    badge: 'Rare',
    limitedKey: 'bossSkipUsed',
    action: (store) => store.grantBossSkip(),
  },

  // ── Pass ───────────────────────────────────────────────────────────────────
  {
    id: 'god_pass',
    purchaseKey: 'com.godprodigy.app.battle_pass',
    category: 'Pass',
    icon: '🏆',
    name: 'God Prodigy Pass',
    desc: 'Unlocks permanent Pass benefits: daily resource drops delivered to your stronghold, +25% bonus XP on all kills, and access to the exclusive Pass cosmetic. One-time purchase — no subscription.',
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

function ItemCard({ item, onBuy, purchased, flashing }) {
  const isLimited = item.limitedKey && purchased;
  return (
    <div style={{
      background: flashing ? '#0a200a' : '#0d0d1a',
      border: `1px solid ${flashing ? '#2ecc71' : (isLimited ? '#333' : item.color + '55')}`,
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
      opacity: isLimited ? 0.45 : 1,
      position: 'relative', overflow: 'hidden',
      transition: 'background 0.4s ease, border-color 0.4s ease, opacity 0.6s ease',
      pointerEvents: isLimited ? 'none' : 'auto',
    }}>
      {/* Purchase flash overlay */}
      {flashing && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14,
          background: 'linear-gradient(90deg, #2ecc7122, #27ae6044, #2ecc7122)',
          animation: 'gpFlash 1.2s ease forwards',
          pointerEvents: 'none', zIndex: 5,
        }} />
      )}
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
  const [flashId,   setFlashId]     = useState(null);  // item id that just got purchased
  const [loading,   setLoading]     = useState(false);

  // Init RevenueCat once on mount
  useEffect(() => { initIAP(); }, []);

  const handleRestore = async () => {
    setLoading(true);
    try {
      const ids = await restorePurchases();
      // Re-grant non-consumables that match our items
      const nonConsumables = ITEMS.filter(i => i.category === 'cosmetics' || i.id === 'inventory_expand' || i.id === 'battle_pass');
      nonConsumables.forEach(item => {
        if (ids.includes(item.purchaseKey)) {
          try { item.action(store); } catch(e) {}
        }
      });
      setToast(ids.length > 0 ? `Restored ${ids.length} purchase${ids.length>1?'s':''}!` : 'Nothing to restore.');
      setTimeout(() => setToast(''), 2500);
    } catch(e) {
      setToast('Restore failed — try again.');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setLoading(false);
    }
  };

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
    setFlashId(confirmItem.id);
    setTimeout(() => setFlashId(null), 1200);
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
            flashing={flashId === item.id}
          />
        ))}

        {/* Restore purchases footer */}
        <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
          <button onClick={handleRestore}} style={{
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
      {loading && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:9999,
        }}>
          <div style={{ color:'#d4af37', fontFamily:'monospace', fontSize:18, letterSpacing:'0.15em' }}>
            PROCESSING...
          </div>
        </div>
      )}
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

// Inject purchase-flash keyframe once
if (typeof document !== 'undefined' && !document.getElementById('gp-iap-flash-style')) {
  const s = document.createElement('style');
  s.id = 'gp-iap-flash-style';
  s.textContent = `@keyframes gpFlash {
    0%   { opacity: 0; }
    20%  { opacity: 1; }
    70%  { opacity: 0.8; }
    100% { opacity: 0; }
  }`;
  document.head.appendChild(s);
}
