/**
 * src/utils/iap.js
 * RevenueCat Capacitor IAP wrapper
 *
 * Usage:
 *   import { initIAP, purchaseProduct, restorePurchases } from '../utils/iap';
 *
 *   initIAP();                          // call once at app startup
 *   const ok = await purchaseProduct('com.godprodigy.app.ore_small');
 *   const restored = await restorePurchases();
 */

let Purchases = null;
let _initialized = false;

const RC_API_KEY = 'test_wXpVHNqAorjnxBfDqJirLHvPXtD';

/**
 * Lazily import the RevenueCat Capacitor plugin.
 * Falls back gracefully on web/dev so the app never crashes.
 */
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

/**
 * Initialize RevenueCat. Call once when the app mounts.
 * Safe to call multiple times — no-ops after first init.
 */
export async function initIAP(userId = null) {
  if (_initialized) return;
  const P = await getPlugin();
  if (!P) return;
  try {
    await P.configure({
      apiKey: RC_API_KEY,
      appUserID: userId || null,
    });
    _initialized = true;
    console.log('[IAP] RevenueCat initialized');
  } catch (e) {
    console.error('[IAP] configure failed', e);
  }
}

/**
 * Purchase a product by its Apple product ID.
 * Returns true on success, false on cancellation or error.
 *
 * On success the purchase is validated server-side by RevenueCat
 * before this resolves — safe to grant immediately.
 */
export async function purchaseProduct(productId) {
  const P = await getPlugin();
  if (!P) {
    // Dev mode: simulate success
    console.warn(`[IAP] Dev mode — simulating purchase of ${productId}`);
    return true;
  }
  try {
    // Get offerings first to locate the package
    const { current } = await P.getOfferings();
    if (!current) {
      console.error('[IAP] No current offering configured in RevenueCat');
      return false;
    }
    // Find the package matching this product ID
    const pkg = current.availablePackages.find(
      (p) => p.product.identifier === productId
    );
    if (!pkg) {
      console.error(`[IAP] Product not found in offering: ${productId}`);
      return false;
    }
    const result = await P.purchasePackage({ aPackage: pkg });
    console.log('[IAP] Purchase success', result);
    return true;
  } catch (e) {
    // USER_CANCELLED is not an error — just return false silently
    if (e?.code === 'USER_CANCELLED' || e?.userCancelled === true) {
      console.log('[IAP] User cancelled');
      return false;
    }
    console.error('[IAP] Purchase error', e);
    return false;
  }
}

/**
 * Restore previous purchases.
 * Returns an array of restored product IDs (may be empty).
 */
export async function restorePurchases() {
  const P = await getPlugin();
  if (!P) {
    console.warn('[IAP] Dev mode — nothing to restore');
    return [];
  }
  try {
    const info = await P.restorePurchases();
    const ids = Object.keys(info.customerInfo?.entitlements?.active || {});
    console.log('[IAP] Restored:', ids);
    return ids;
  } catch (e) {
    console.error('[IAP] Restore failed', e);
    return [];
  }
}

/**
 * Check if a non-consumable entitlement is active.
 * Pass the entitlement identifier set up in RevenueCat dashboard.
 */
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
