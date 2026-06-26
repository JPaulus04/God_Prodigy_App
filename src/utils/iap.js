/**
 * src/utils/iap.js
 * RevenueCat Capacitor IAP wrapper.
 *
 * Test Store diagnostic version:
 * - Uses RevenueCat DEBUG logs when supported.
 * - Confirms offerings/products are loading.
 * - Purchases by StoreProduct first to avoid package-context issues.
 * - Falls back to package purchase if StoreProduct purchase is unavailable.
 * - Returns clearer failure reasons for the shop UI.
 */

let Purchases = null;
let RevenueCatLogLevel = null;
let _initialized = false;

const RC_API_KEY = 'test_wXpVHNqAorjnxBfDqJirLHvPXtD';
const IAP_DEBUG = true;

function log(...args) {
  if (IAP_DEBUG) console.log('[IAP]', ...args);
}

function warn(...args) {
  console.warn('[IAP]', ...args);
}

function error(...args) {
  console.error('[IAP]', ...args);
}

async function getPlugin() {
  if (Purchases) return Purchases;

  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    Purchases = mod.Purchases;
    RevenueCatLogLevel = mod.LOG_LEVEL || null;
    log('RevenueCat module loaded', {
      hasPurchases: !!Purchases,
      hasLogLevel: !!RevenueCatLogLevel,
    });
  } catch (e) {
    warn('RevenueCat plugin not available. Web/dev mode will simulate purchases.', e);
    Purchases = null;
  }

  return Purchases;
}

function withTimeout(promise, ms, label = 'IAP request') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error(`${label} timed out after ${ms}ms`);
        err.code = 'TIMEOUT';
        err.stage = label;
        reject(err);
      }, ms);
    }),
  ]);
}

function normalizePurchaseResult(success, reason = null, details = null) {
  return { success: !!success, reason, details };
}

function toPlainObject(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return value;
  }
}

function getProductIdFromPackage(pkg) {
  const product = pkg?.product || {};
  return (
    product.productIdentifier ||
    product.identifier ||
    product.id ||
    null
  );
}

function summarizePackage(pkg) {
  const product = pkg?.product || {};
  return {
    packageIdentifier: pkg?.identifier || null,
    productIdentifier: getProductIdFromPackage(pkg),
    productTitle: product.title || product.name || product.identifier || null,
    priceString: product.priceString || product.localizedPriceString || null,
    hasPresentedOfferingContext: !!pkg?.presentedOfferingContext,
  };
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

async function setDebugLogging(P) {
  if (!P?.setLogLevel || !RevenueCatLogLevel?.DEBUG) return;

  try {
    await P.setLogLevel({ level: RevenueCatLogLevel.DEBUG });
    log('RevenueCat DEBUG logging enabled');
  } catch (e) {
    warn('Could not enable RevenueCat DEBUG logging', e);
  }
}

export async function initIAP(userId = null) {
  if (_initialized) return true;

  const P = await getPlugin();
  if (!P) return false;

  try {
    await setDebugLogging(P);

    await withTimeout(
      P.configure({ apiKey: RC_API_KEY, appUserID: userId || null }),
      20000,
      'RevenueCat configure'
    );

    _initialized = true;
    log('RevenueCat initialized', {
      keyPrefix: RC_API_KEY.slice(0, 8),
      userId: userId || 'anonymous',
    });

    if (P.isConfigured) {
      try {
        const configured = await withTimeout(P.isConfigured(), 5000, 'RevenueCat isConfigured');
        log('RevenueCat isConfigured result', configured);
      } catch (e) {
        warn('RevenueCat isConfigured check failed', e);
      }
    }

    return true;
  } catch (e) {
    error('RevenueCat configure failed', e);
    return false;
  }
}

export async function purchaseProduct(productId) {
  const P = await getPlugin();

  if (!P) {
    warn(`Dev mode — simulating purchase of ${productId}`);
    return normalizePurchaseResult(true, 'dev_mode');
  }

  const initialized = await initIAP();
  if (!initialized) {
    return normalizePurchaseResult(false, 'not_configured');
  }

  try {
    if (P.canMakePayments) {
      try {
        const canPay = await withTimeout(P.canMakePayments(), 5000, 'canMakePayments');
        log('canMakePayments', canPay);
      } catch (e) {
        warn('canMakePayments check failed; continuing because Test Store may not require Apple billing sheet.', e);
      }
    }

    log('Fetching offerings for purchase', { requestedProductId: productId });

    const offerings = await withTimeout(P.getOfferings(), 20000, 'Get offerings');
    const current = offerings?.current;

    log('Offerings loaded', {
      currentIdentifier: current?.identifier || null,
      allKeys: offerings?.all ? Object.keys(offerings.all) : [],
      currentPackages: (current?.availablePackages || []).map(summarizePackage),
    });

    if (!current) {
      return normalizePurchaseResult(false, 'no_offering', {
        requestedProductId: productId,
        offerings,
      });
    }

    const availablePackages = current.availablePackages || [];
    const pkg = availablePackages.find((p) => getProductIdFromPackage(p) === productId);

    if (!pkg) {
      return normalizePurchaseResult(false, 'not_in_offering', {
        requestedProductId: productId,
        availablePackages: availablePackages.map(summarizePackage),
      });
    }

    const packageSummary = summarizePackage(pkg);
    log('Matched package for purchase', packageSummary);

    const product = pkg.product;
    if (!product) {
      return normalizePurchaseResult(false, 'missing_product', {
        requestedProductId: productId,
        matchedPackage: packageSummary,
      });
    }

    // Use StoreProduct first. This is simpler for isolating Test Store purchase failures because
    // it only requires the product identifier. If this API is unavailable, fall back to package.
    if (P.purchaseStoreProduct) {
      log('Starting purchaseStoreProduct', {
        requestedProductId: productId,
        productIdentifier: getProductIdFromPackage(pkg),
      });

      const result = await withTimeout(
        P.purchaseStoreProduct({ product: toPlainObject(product) }),
        120000,
        'purchaseStoreProduct'
      );

      log('purchaseStoreProduct completed', {
        productIdentifier: result?.productIdentifier || productId,
        purchasedIds: collectPurchasedIds(result?.customerInfo),
      });

      return normalizePurchaseResult(true, 'purchased', result);
    }

    log('purchaseStoreProduct unavailable; falling back to purchasePackage', packageSummary);

    const result = await withTimeout(
      P.purchasePackage({ aPackage: toPlainObject(pkg) }),
      120000,
      'purchasePackage'
    );

    log('purchasePackage completed', {
      productIdentifier: result?.productIdentifier || productId,
      purchasedIds: collectPurchasedIds(result?.customerInfo),
    });

    return normalizePurchaseResult(true, 'purchased', result);
  } catch (e) {
    if (e?.code === 'USER_CANCELLED' || e?.userCancelled) {
      return normalizePurchaseResult(false, 'cancelled', e);
    }

    if (e?.code === 'TIMEOUT') {
      error('Native purchase flow timed out after product/offering was found', {
        stage: e.stage,
        requestedProductId: productId,
        error: e,
      });
      return normalizePurchaseResult(false, 'timeout', {
        stage: e.stage,
        requestedProductId: productId,
        message: e.message,
      });
    }

    error('Purchase error', {
      requestedProductId: productId,
      code: e?.code,
      message: e?.message,
      userCancelled: e?.userCancelled,
      error: e,
    });

    return normalizePurchaseResult(false, 'error', {
      code: e?.code,
      message: e?.message,
      userCancelled: e?.userCancelled,
      raw: e,
    });
  }
}

export async function restorePurchases() {
  const P = await getPlugin();

  if (!P) {
    warn('Dev mode — no purchases to restore');
    return [];
  }

  const initialized = await initIAP();
  if (!initialized) return [];

  try {
    const result = await withTimeout(P.restorePurchases(), 60000, 'Restore purchases');
    const ids = collectPurchasedIds(result?.customerInfo);
    log('Restored purchase identifiers', ids);
    return ids;
  } catch (e) {
    error('Restore failed', e);
    return [];
  }
}

export async function hasEntitlement(entitlementId) {
  const P = await getPlugin();
  if (!P) return false;

  const initialized = await initIAP();
  if (!initialized) return false;

  try {
    const result = await withTimeout(P.getCustomerInfo(), 20000, 'Get customer info');
    const ids = collectPurchasedIds(result?.customerInfo);
    return ids.includes(entitlementId);
  } catch (e) {
    error('Entitlement check failed', e);
    return false;
  }
}
