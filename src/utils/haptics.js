// Capacitor Haptics wrapper — graceful fallback on web / simulator
// Uses dynamic import so the build never hard-fails if the plugin is absent.

let _Haptics = null;
let _ImpactStyle = null;
let _NotificationType = null;

async function loadHaptics() {
  if (_Haptics) return true;
  try {
    const mod = await import('@capacitor/haptics');
    _Haptics          = mod.Haptics;
    _ImpactStyle      = mod.ImpactStyle;
    _NotificationType = mod.NotificationType;
    return true;
  } catch {
    return false;
  }
}

const isNative = () => {
  try { return window.Capacitor?.isNativePlatform?.() ?? false; }
  catch { return false; }
};

async function safeImpact(style) {
  if (!isNative()) return;
  if (!await loadHaptics()) return;
  try { await _Haptics.impact({ style }); } catch {}
}

async function safeVibrate(duration = 100) {
  if (!isNative()) return;
  if (!await loadHaptics()) return;
  try { await _Haptics.vibrate({ duration }); } catch {}
}

// Light tap — player swings weapon
export const hapticAttack = () => safeImpact('LIGHT');

// Medium bump — enemy / boss takes damage
export const hapticHit = () => safeImpact('MEDIUM');

// Heavy thud — boss death
export const hapticBossDeath = () => safeVibrate(300);

// Success notification — level up
export const hapticLevelUp = async () => {
  if (!isNative()) return;
  if (!await loadHaptics()) return;
  try { await _Haptics.notification({ type: 'SUCCESS' }); } catch {}
};

// Light pulse — checkpoint activated
export const hapticCheckpoint = () => safeImpact('LIGHT');

// Soft tick — resource collected
export const hapticCollect = () => safeImpact('LIGHT');
