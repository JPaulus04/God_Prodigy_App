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

export async function initIAP(userId = null) {
  if (_initialized) return;
  const P = await getPlugin();
  if (!P) return;
  try {
    await P.configure({ apiKey: RC_API_KEY, appUserID: userId || null });
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
    const offerings = await P.getOfferings();
    const current = offerings?.current;
    if (!current) {
      console.error('[IAP] No current offering in RevenueCat');
      return false;
    }
    const pkg = current.availablePackages.find(
      (p) => p.product.productIdentifier === productId || p.product.identifier === productId
    );
    if (!pkg) {
      console.error(`[IAP] Product not in offering: ${productId}`);
      return false;
    }
    await P.purchasePackage({ aPackage: pkg });
    return true;
  } catch (e) {
    if (e?.code === 'USER_CANCELLED' || e?.userCancelled) return false;
    console.error('[IAP] Purchase error', e);
    return false;
  }
}

export async function restorePurchases() {
  const P = await getPlugin();
  if (!P) return [];
  try {
    const result = await P.restorePurchases();
    const ids = Object.keys(result?.customerInfo?.entitlements?.active || {});
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
    const { customerInfo } = await P.getCustomerInfo();
    return !!customerInfo?.entitlements?.active?.[entitlementId];
  } catch (e) {
    return false;
  }
}
