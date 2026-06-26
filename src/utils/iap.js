/**
 * src/utils/iap.js
 * RevenueCat Capacitor IAP wrapper.
 *
 * IAP-R93-STOREKIT-DIAG-REV-002
 * Created: 2026-06-26 18:08:00 UTC
 *
 * Apple Sandbox / TestFlight diagnostic version:
 * - Uses the RevenueCat Apple App Store public SDK key.
 * - Purchases by RevenueCat Package first, which is the safer StoreKit path.
 * - Does not strip RevenueCat objects through JSON conversion before purchase.
 * - Falls back to StoreProduct only if package purchase is unavailable.
 * - Returns native error details to the shop UI for diagnosis.
 */

let Purchases = null;
let RevenueCatLogLevel = null;
let _initialized = false;

const IAP_REVISION = 'IAP-R93-STOREKIT-DIAG-REV-002';
const RC_API_KEY = 'appl_YlVgOiDIFEPRqWRSoqGfOSKIfZX';
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

function describeError(e) {
  return {
    code: e?.code || e?.errorCode || null,
    message: e?.message || e?.localizedDescription || e?.underlyingErrorMessage || null,
    userCancelled: !!(e?.userCancelled || e?.code === 'USER_CANCELLED'),
    readableErrorCode: e?.readableErrorCode || null,
    underlyingErrorMessage: e?.underlyingErrorMessage || null,
    stage: e?.stage || null,
    rawName: e?.name || null,
  };
}

async function getPlugin() {
  if (Purchases) return Purchases;

  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    Purchases = mod.Purchases;
    RevenueCatLogLevel = mod.LOG_LEVEL || null;
    log('RevenueCat module loaded', {
      revision: IAP_REVISION,
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
  return { success: !!success, reason, details, revision: IAP_REVISION };
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

export function getIAPRevision() {
  return IAP_REVISION;
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
      revision: IAP_REVISION,
      keyPrefix: RC_API_KEY.slice(0, 8),
      userId: userId || 'anonymous',
    });

    if (P.isConfigured) {
      try {
        const configured = await withTimeout(P.isConfigured(), 5000, 'RevenueCat isConfigured');
        log('RevenueCat isConfigured result', configured);
      } catch (e) {
        warn('RevenueCat isConfigured check failed', describeError(e));
      }
    }

    return true;
  } catch (e) {
    error('RevenueCat configure failed', describeError(e));
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
    return normalizePurchaseResult(false, 'not_configured', {
      message: 'RevenueCat did not configure. Check the SDK key, bundle ID, native plugin install, and App Store capability.',
    });
  }

  try {
    if (P.canMakePayments) {
      try {
        const canPay = await withTimeout(P.canMakePayments(), 5000, 'canMakePayments');
        log('canMakePayments', canPay);
      } catch (e) {
        warn('canMakePayments check failed; continuing.', describeError(e));
      }
    }

    log('Fetching offerings for purchase', {
      revision: IAP_REVISION,
      requestedProductId: productId,
    });

    const offerings = await withTimeout(P.getOfferings(), 20000, 'Get offerings');
    const current = offerings?.current;

    log('Offerings loaded', {
      revision: IAP_REVISION,
      currentIdentifier: current?.identifier || null,
      allKeys: offerings?.all ? Object.keys(offerings.all) : [],
      currentPackages: (current?.availablePackages || []).map(summarizePackage),
    });

    if (!current) {
      return normalizePurchaseResult(false, 'no_offering', {
        requestedProductId: productId,
        message: 'RevenueCat returned no current offering. Check Default offering is active.',
        offerings,
      });
    }

    const availablePackages = current.availablePackages || [];
    const pkg = availablePackages.find((p) => getProductIdFromPackage(p) === productId);

    if (!pkg) {
      return normalizePurchaseResult(false, 'not_in_offering', {
        requestedProductId: productId,
        message: 'Requested product ID is not in the current RevenueCat offering.',
        availablePackages: availablePackages.map(summarizePackage),
      });
    }

    const packageSummary = summarizePackage(pkg);
    log('Matched package for purchase', {
      revision: IAP_REVISION,
      ...packageSummary,
    });

    if (P.purchasePackage) {
      log('Starting purchasePackage', packageSummary);

      const result = await withTimeout(
        P.purchasePackage({ aPackage: pkg }),
        180000,
        'purchasePackage'
      );

      log('purchasePackage completed', {
        productIdentifier: result?.productIdentifier || productId,
        purchasedIds: collectPurchasedIds(result?.customerInfo),
      });

      return normalizePurchaseResult(true, 'purchased', result);
    }

    const product = pkg.product;
    if (!product) {
      return normalizePurchaseResult(false, 'missing_product', {
        requestedProductId: productId,
        matchedPackage: packageSummary,
        message: 'Package was found but it did not contain a StoreProduct.',
      });
    }

    if (P.purchaseStoreProduct) {
      log('purchasePackage unavailable; starting purchaseStoreProduct', {
        requestedProductId: productId,
        productIdentifier: getProductIdFromPackage(pkg),
      });

      const result = await withTimeout(
        P.purchaseStoreProduct({ product }),
        180000,
        'purchaseStoreProduct'
      );

      log('purchaseStoreProduct completed', {
        productIdentifier: result?.productIdentifier || productId,
        purchasedIds: collectPurchasedIds(result?.customerInfo),
      });

      return normalizePurchaseResult(true, 'purchased', result);
    }

    return normalizePurchaseResult(false, 'purchase_api_missing', {
      message: 'RevenueCat plugin does not expose purchasePackage or purchaseStoreProduct.',
      requestedProductId: productId,
      matchedPackage: packageSummary,
    });
  } catch (e) {
    const details = describeError(e);

    if (details.userCancelled) {
      return normalizePurchaseResult(false, 'cancelled', details);
    }

    if (e?.code === 'TIMEOUT') {
      error('Native purchase flow timed out', {
        stage: e.stage,
        requestedProductId: productId,
        details,
      });
      return normalizePurchaseResult(false, 'timeout', {
        ...details,
        stage: e.stage,
        requestedProductId: productId,
        message: e.message,
      });
    }

    error('Purchase error', {
      requestedProductId: productId,
      details,
    });

    return normalizePurchaseResult(false, 'error', {
      ...details,
      requestedProductId: productId,
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
  if (!initialized) {
    throw new Error('RevenueCat did not configure before restore.');
  }

  try {
    const result = await withTimeout(P.restorePurchases(), 90000, 'Restore purchases');
    const ids = collectPurchasedIds(result?.customerInfo);
    log('Restored purchase identifiers', {
      revision: IAP_REVISION,
      ids,
    });
    return ids;
  } catch (e) {
    const details = describeError(e);
    error('Restore failed', details);
    const restoreError = new Error(details.message || 'Restore failed');
    restoreError.details = details;
    throw restoreError;
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
    error('Entitlement check failed', describeError(e));
    return false;
  }
}
