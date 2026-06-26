import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { initIAP, purchaseProduct, restorePurchases, getIAPRevision } from '../utils/iap';

const IAP_SHOP_REVISION = 'IAP-R93-STOREKIT-DIAG-REV-002';

// Trimmed App Store catalog.
// Keep this screen simple until the core economy and restore flow are fully stable.
const ITEMS = [
  {
    id: 'death_shield',
    purchaseKey: 'com.godprodigy.app.respawn_shield',
    icon: '🛡',
    name: 'Death Shield',
    desc: 'Revive safely after death and prevent resource loss. Purchased only.',
    price: '$0.99',
    color: '#3498db',
    action: (store) => store.grantRespawnShield(1),
  },
  {
    id: 'gods_mercy',
    purchaseKey: 'com.godprodigy.app.boss_skip_c',
    icon: '⚡',
    name: "God's Mercy",
    desc: 'Instantly defeats the next undefeated Elemental God and grants its essence.',
    price: '$4.99',
    color: '#f1c40f',
    badge: 'Boss Skip',
    action: (store) => store.grantGodMercy ? store.grantGodMercy() : store.grantBossSkip(),
    disabled: (store) => (store.ascensionProgress || 0) >= 10,
    disabledText: 'All Gods Defeated',
  },
  {
    id: 'god_pass',
    purchaseKey: 'com.godprodigy.app.battle_pass',
    restoreAliases: ['god_pass', 'God Pass', 'god_prodigy_pass', 'pass', 'com.godprodigy.app.battle_pass'],
    icon: '👑',
    name: 'God Pass',
    desc: 'One-time unlock: +25% XP, exclusive skin/trail support, and extra inventory space.',
    price: '$9.99 one-time',
    color: '#d4af37',
    badge: 'One-Time',
    action: (store) => {
      store.activatePass();
      if (store.expandInventory && (store.extraInventorySlots || 0) < 8) store.expandInventory(8);
      if (store.unlockSkin) store.unlockSkin('gods_chosen');
      if (store.unlockTrail) store.unlockTrail('ember');
    },
    owned: (store) => !!store.passActive,
  },
];

const RESTORE_KEYS = new Set(
  ITEMS
    .filter(i => i.id === 'god_pass')
    .flatMap(i => [i.purchaseKey, ...(i.restoreAliases || [])])
);

function shortDetail(details) {
  if (!details) return '';
  if (typeof details === 'string') return details;
  return (
    details.message ||
    details.underlyingErrorMessage ||
    details.readableErrorCode ||
    details.code ||
    details.stage ||
    ''
  );
}

function purchaseFailureMessage(purchaseResult) {
  const reason = purchaseResult?.reason || 'error';
  const details = purchaseResult?.details || {};
  const detail = shortDetail(details);

  let message = 'Purchase did not complete.';

  if (reason === 'cancelled') message = 'Purchase canceled.';
  if (reason === 'not_configured') message = 'RevenueCat did not configure. Check SDK key, bundle ID, and iOS capability.';
  if (reason === 'timeout') message = `Purchase timed out at ${details.stage || 'native StoreKit flow'}.`;
  if (reason === 'no_offering') message = 'No current RevenueCat offering found.';
  if (reason === 'not_in_offering') message = 'Product not in current RevenueCat offering.';
  if (reason === 'missing_product') message = 'RevenueCat package is missing StoreProduct.';
  if (reason === 'purchase_api_missing') message = 'RevenueCat purchase API missing in native build.';
  if (reason === 'error') message = detail ? `Purchase failed: ${detail}` : 'Native purchase failed. Check RevenueCat/App Store setup.';

  if (reason !== 'error' && detail && !message.includes(detail)) {
    message = `${message} ${detail}`;
  }

  return `${message} [${IAP_SHOP_REVISION}]`;
}

function PurchaseConfirmModal({ item, onConfirm, onCancel, loading }) {
  return (
    <div
      onClick={loading ? undefined : onCancel}
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
          maxWidth: 340, width: '90%', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 8 }}>{item.icon}</div>
        <div style={{ color: item.color, fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>
          {item.name}
        </div>
        {item.badge && (
          <div style={{
            display: 'inline-block',
            background: item.color,
            color: '#000',
            fontSize: 10,
            fontWeight: 'bold',
            padding: '3px 8px',
            borderRadius: 999,
            marginBottom: 10,
            letterSpacing: 0.5,
          }}>
            {item.badge}
          </div>
        )}
        <div style={{ color: '#aaa', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
          {item.desc}
        </div>
        <div style={{
          color: '#d4af37', fontSize: 26, fontWeight: 'bold', marginBottom: 20,
        }}>{item.price}</div>
        <div style={{ color: '#ffffff44', fontSize: 10, marginBottom: 20, lineHeight: 1.4 }}>
          Payment is processed securely through the App Store.
          {loading && <><br />Waiting for the native App Store response.</>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '14px', borderRadius: 12,
            background: '#1a1a2e', border: '1px solid #444',
            color: '#aaa', fontSize: 14,
            cursor: 'pointer', fontWeight: 'bold',
          }}>{loading ? 'Close' : 'Cancel'}</button>
          <button disabled={loading} onClick={onConfirm} style={{
            flex: 2, padding: '14px', borderRadius: 12,
            background: loading ? '#444' : item.color, border: 'none',
            color: '#000', fontSize: 15,
            cursor: loading ? 'default' : 'pointer', fontWeight: 'bold',
          }}>{loading ? 'Processing...' : `Buy ${item.price}`}</button>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, onBuy, owned, disabled, flashing }) {
  const isBlocked = owned || disabled;
  return (
    <div style={{
      background: flashing ? '#0a200a' : '#0d0d1a',
      border: `1px solid ${flashing ? '#2ecc71' : (isBlocked ? '#333' : item.color + '66')}`,
      borderRadius: 16,
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      opacity: isBlocked ? 0.55 : 1,
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.4s ease, border-color 0.4s ease, opacity 0.4s ease',
    }}>
      {flashing && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16,
          background: 'linear-gradient(90deg, #2ecc7122, #27ae6044, #2ecc7122)',
          animation: 'gpFlash 1.2s ease forwards',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
      )}

      <div style={{
        width: 58,
        height: 58,
        borderRadius: 16,
        background: item.color + '22',
        border: `1px solid ${item.color}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 30,
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        {item.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{item.name}</span>
          {item.badge && (
            <span style={{
              background: item.color,
              color: '#000',
              fontSize: 9,
              fontWeight: 'bold',
              padding: '2px 7px',
              borderRadius: 999,
              letterSpacing: 0.4,
            }}>{item.badge}</span>
          )}
          {owned && (
            <span style={{
              background: '#2ecc71',
              color: '#001b0a',
              fontSize: 9,
              fontWeight: 'bold',
              padding: '2px 7px',
              borderRadius: 999,
            }}>OWNED</span>
          )}
        </div>
        <div style={{ color: '#888', fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
          {disabled ? item.disabledText : item.desc}
        </div>
      </div>

      <button
        disabled={isBlocked}
        onClick={() => !isBlocked && onBuy(item)}
        style={{
          background: isBlocked ? '#1a1a2e' : item.color,
          border: 'none',
          borderRadius: 12,
          padding: '10px 12px',
          minWidth: 76,
          color: isBlocked ? '#555' : '#000',
          fontWeight: 'bold',
          fontSize: 12,
          cursor: isBlocked ? 'default' : 'pointer',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          lineHeight: 1.25,
          textAlign: 'center',
        }}
      >
        {owned ? '✓' : disabled ? 'Done' : item.price}
      </button>
    </div>
  );
}

export default function IAPShop({ onClose }) {
  const store = useGameStore();
  const [confirmItem, setConfirmItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [loading, setLoading] = useState(false);
  const activePurchaseRef = useRef(0);

  useEffect(() => { initIAP(); }, []);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), isError ? 7000 : 2800);
  };

  const isOwned = (item) => {
    if (item.owned) return item.owned(store);
    return false;
  };

  const isDisabled = (item) => {
    if (item.disabled) return item.disabled(store);
    return false;
  };

  const handleRestore = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const ids = await restorePurchases();
      const restoredPass = (ids || []).some(id => RESTORE_KEYS.has(id));

      if (restoredPass) {
        const passItem = ITEMS.find(i => i.id === 'god_pass');
        try { passItem.action(store); } catch (e) { console.warn('Restore action failed', e); }
        showToast(`God Pass restored. [${IAP_SHOP_REVISION}]`);
      } else {
        showToast(`No restorable purchases found. [${IAP_SHOP_REVISION}]`);
      }
    } catch (e) {
      console.warn('Restore failed', e);
      const detail = shortDetail(e?.details) || e?.message || '';
      showToast(`Restore failed: ${detail || 'native restore error'} [${IAP_SHOP_REVISION}]`, true);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (item) => {
    if (loading || isOwned(item) || isDisabled(item)) return;
    setConfirmItem(item);
  };

  const handleConfirm = async () => {
    if (!confirmItem || loading) return;
    const item = confirmItem;
    const purchaseToken = Date.now();
    activePurchaseRef.current = purchaseToken;
    setLoading(true);

    try {
      const purchaseResult = await purchaseProduct(item.purchaseKey);

      // User closed the modal or another purchase started. Ignore stale native result.
      if (activePurchaseRef.current !== purchaseToken) return;

      const purchased = purchaseResult === true || purchaseResult?.success === true;

      if (!purchased) {
        showToast(purchaseFailureMessage(purchaseResult), true);
        setConfirmItem(null);
        return;
      }

      const result = item.action(store);
      let message = `${item.name} unlocked.`;
      if (item.id === 'gods_mercy' && result?.bossName) {
        message = `God's Mercy defeated ${result.bossName}.`;
      } else if (item.id === 'gods_mercy' && result?.reason === 'all_defeated') {
        message = 'All Elemental Gods are already defeated.';
      }

      setFlashId(item.id);
      setTimeout(() => setFlashId(null), 1200);
      showToast(`${message} [${IAP_SHOP_REVISION}]`);
      setConfirmItem(null);
    } catch (e) {
      if (activePurchaseRef.current !== purchaseToken) return;
      console.warn('IAP purchase failed', e);
      const detail = shortDetail(e?.details) || e?.message || '';
      showToast(`Purchase failed: ${detail || 'native purchase error'} [${IAP_SHOP_REVISION}]`, true);
      setConfirmItem(null);
    } finally {
      if (activePurchaseRef.current === purchaseToken) {
        setLoading(false);
      }
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
    }}>
      <div style={{
        padding: '0 20px 14px',
        paddingTop: 'calc(env(safe-area-inset-top) + 22px)',
        background: '#0d0d1a',
        borderBottom: '1px solid #d4af3733',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ color: '#d4af37', fontSize: 23, fontWeight: 'bold', letterSpacing: 1 }}>
              ⚔ GOD'S TREASURY
            </div>
            <div style={{ color: '#ffffff55', fontSize: 12, marginTop: 2 }}>
              Three purchases only. No resource packs. No monthly pass.
            </div>
            <div style={{ color: '#ffffff33', fontSize: 9, marginTop: 2, fontFamily: 'monospace' }}>
              {IAP_SHOP_REVISION} · SDK {getIAPRevision ? getIAPRevision() : 'unknown'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#1a1a2e',
            border: '1px solid #444',
            borderRadius: 10,
            width: 42,
            height: 42,
            color: '#aaa',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>✕</button>
        </div>

        {store.passActive && (
          <div style={{
            background: 'linear-gradient(90deg, #1a1400, #2a2000)',
            border: '1px solid #d4af3766',
            borderRadius: 10,
            padding: '9px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 10,
          }}>
            <span style={{ fontSize: 18 }}>👑</span>
            <div>
              <div style={{ color: '#d4af37', fontSize: 12, fontWeight: 'bold' }}>God Pass Active</div>
              <div style={{ color: '#ffffff55', fontSize: 10 }}>One-time unlock · +25% XP</div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {ITEMS.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            onBuy={handleBuy}
            owned={isOwned(item)}
            disabled={isDisabled(item)}
            flashing={flashId === item.id}
          />
        ))}

        <div style={{
          marginTop: 8,
          padding: 12,
          border: '1px solid #ffffff14',
          borderRadius: 12,
          color: '#ffffff55',
          fontSize: 11,
          lineHeight: 1.45,
          textAlign: 'center',
        }}>
          Consumables like Death Shield and God's Mercy are not restored. God Pass can be restored.
        </div>

        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <button
            disabled={loading}
            onClick={handleRestore}
            style={{
              background: 'none',
              border: 'none',
              color: loading ? '#333' : '#666',
              fontSize: 12,
              cursor: loading ? 'default' : 'pointer',
              textDecoration: 'underline',
            }}
          >
            Restore God Pass
          </button>
        </div>
      </div>

      {confirmItem && (
        <PurchaseConfirmModal
          item={confirmItem}
          onConfirm={handleConfirm}
          onCancel={() => { activePurchaseRef.current += 1; setLoading(false); setConfirmItem(null); }}
          loading={loading}
        />
      )}

      {loading && !confirmItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          <div style={{
            color: '#d4af37',
            background: '#0d0d1a',
            border: '1px solid #d4af3766',
            borderRadius: 14,
            padding: '16px 24px',
            fontFamily: 'monospace',
            fontSize: 16,
            letterSpacing: '0.12em',
          }}>
            PROCESSING...
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.isError ? '#e74c3c' : '#27ae60',
          color: '#fff',
          padding: '10px 22px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 'bold',
          boxShadow: `0 4px 20px ${toast.isError ? '#e74c3c66' : '#27ae6066'}`,
          pointerEvents: 'none',
          zIndex: 400,
          textAlign: 'center',
          maxWidth: '90%',
          whiteSpace: 'normal',
          lineHeight: 1.35,
        }}>
          {toast.isError ? '!' : '✓'} {toast.message}
        </div>
      )}
    </div>
  );
}

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
