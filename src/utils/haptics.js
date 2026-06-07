import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = () => {
  try { return window.Capacitor?.isNativePlatform?.() ?? false; }
  catch { return false; }
};

async function safeImpact(style) {
  if (!isNative()) return;
  try { await Haptics.impact({ style }); } catch {}
}

async function safeNotify(type) {
  if (!isNative()) return;
  try { await Haptics.notification({ type }); } catch {}
}

async function safeVibrate(duration = 100) {
  if (!isNative()) return;
  try { await Haptics.vibrate({ duration }); } catch {}
}

// Light tap — player swings weapon
export const hapticAttack = () => safeImpact(ImpactStyle.Light);

// Medium bump — enemy / boss takes damage
export const hapticHit = () => safeImpact(ImpactStyle.Medium);

// Heavy thud — boss death
export const hapticBossDeath = () => safeVibrate(300);

// Success notification — level up
export const hapticLevelUp = async () => {
  if (!isNative()) return;
  try { await Haptics.notification({ type: NotificationType.Success }); } catch {}
};

// Light pulse — checkpoint activated
export const hapticCheckpoint = () => safeImpact(ImpactStyle.Light);

// Soft tick — resource collected
export const hapticCollect = () => safeImpact(ImpactStyle.Light);
