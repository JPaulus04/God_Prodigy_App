/**
 * src/utils/iap.js
 * RevenueCat Capacitor IAP wrapper — compatible with @revenuecat/purchases-capacitor v4
 */

let Purchases = null;
let _initialized = false;

const RC_API_KEY = 'test_wXpVHNqAorjnxBfDqJirLHvPXtD';

async function getPlugin() {
  if (Purchases) return Purchases;
  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    Purchases = mod.Purchases;
  } catch (e) {
    console.warn('[IAP] RevenueCat plugin not available (web/dev mode)', e);
    Purchases = null;
  }
  return Purchases;
}

function withTimeout(promise, ms, label = 'IAP request') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

function collectPurchasedIds(customerInfo) {
  const ids = new Set();

  const activeEntitlements = customerInfo?.entitlements?.active || {};
  Object.keys(activeEntitlements).forEach(id => ids.add(id));

  const allEntitlements = customerInfo?.entitlements?.all || {};
  Object.entries(allEntitlements).forEach(([id, entitlement]) => {
    if (entitlement?.isActive) ids.add(id);
    if (entitlement?.productIdentifier) ids.add(entitlement.productIdentifier);
  });

  (customerInfo?.activeSubscriptions || []).forEach(id => ids.add(id));
  (customerInfo?.allPurchasedProductIdentifiers || []).forEach(id => ids.add(id));
  (customerInfo?.nonSubscriptionTransactions || []).forEach(tx => {
    if (tx?.productIdentifier) ids.add(tx.productIdentifier);
    if (tx?.productId) ids.add(tx.productId);
  });

  return [...ids].filter(Boolean);
}

export async function initIAP(userId = null) {
  if (_initialized) return;
  const P = await getPlugin();
  if (!P) return;
  try {
    await withTimeout(
      P.configure({ apiKey: RC_API_KEY, appUserID: userId || null }),
      12000,
      'RevenueCat configure'
    );
    _initialized = true;
    console.log('[IAP] RevenueCat initialized');
  } catch (e) {
    console.error('[IAP] configure failed', e);
  }
}

export async function purchaseProduct(productId) {
  const P = await getPlugin();
  if (!P) {
    console.warn(`[IAP] Dev mode — simulating purchase of ${productId}`);
    return true;
  }

  try {
    const offerings = await withTimeout(P.getOfferings(), 15000, 'Get offerings');
    const current = offerings?.current;
    if (!current) {
      console.error('[IAP] No current offering in RevenueCat');
      return false;
    }

    const availablePackages = current.availablePackages || [];
    const pkg = availablePackages.find((p) => {
      const product = p.product || {};
      return product.productIdentifier === productId || product.identifier === productId;
    });

    if (!pkg) {
      console.error(`[IAP] Product not in offering: ${productId}`);
      return false;
    }

    await withTimeout(P.purchasePackage({ aPackage: pkg }), 60000, 'Purchase');
    return true;
  } catch (e) {
    if (e?.code === 'USER_CANCELLED' || e?.userCancelled) return false;
    console.error('[IAP] Purchase error', e);
    return false;
  }
}

export async function restorePurchases() {
  const P = await getPlugin();
  if (!P) {
    console.warn('[IAP] Dev mode — no purchases to restore');
    return [];
  }

  try {
    const result = await withTimeout(P.restorePurchases(), 30000, 'Restore purchases');
    const ids = collectPurchasedIds(result?.customerInfo);
    console.log('[IAP] Restored:', ids);
    return ids;
  } catch (e) {
    console.error('[IAP] Restore failed', e);
    return [];
  }
}

export async function hasEntitlement(entitlementId) {
  const P = await getPlugin();
  if (!P) return false;

  try {
    const result = await withTimeout(P.getCustomerInfo(), 15000, 'Get customer info');
    const ids = collectPurchasedIds(result?.customerInfo);
    return ids.includes(entitlementId);
  } catch (e) {
    console.error('[IAP] Entitlement check failed', e);
    return false;
  }
}
