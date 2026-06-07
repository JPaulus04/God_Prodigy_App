// Web Audio API sound effects — no external dependencies
// All sounds are synthesized procedurally. Volume 0–1.

let _ctx = null;
let _volume = 0.5; // global SFX volume, 0–1
let _enabled = true;

function getCtx() {
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  return _ctx;
}

// Resume context on first user gesture (iOS requirement)
export function resumeAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setSFXVolume(v) { _volume = Math.max(0, Math.min(1, v)); }
export function getSFXVolume()  { return _volume; }
export function setSFXEnabled(v){ _enabled = !!v; }
export function getSFXEnabled() { return _enabled; }

function gain(ctx, value) {
  const g = ctx.createGain();
  g.gain.value = value * _volume;
  g.connect(ctx.destination);
  return g;
}

function osc(ctx, type, freq, startTime, duration, gainNode, freqEnd) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, startTime);
  if (freqEnd !== undefined) o.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);
  o.connect(gainNode);
  o.start(startTime);
  o.stop(startTime + duration);
}

function env(gainNode, ctx, startTime, attackTime, decayTime, sustainLevel, releaseTime) {
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, startTime + attackTime);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, sustainLevel * gainNode.gain.value), startTime + attackTime + decayTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + attackTime + decayTime + releaseTime);
}

// ── Sword swing (short whoosh) ─────────────────────────────────────────────
export function sfxAttack() {
  if (!_enabled) return;
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  const g = gain(ctx, 0.18);
  env(g, ctx, now, 0.005, 0.04, 0.3, 0.08);
  osc(ctx, 'sawtooth', 320, now, 0.13, g, 80);
}

// ── Hit / damage (sharp thud) ──────────────────────────────────────────────
export function sfxHit() {
  if (!_enabled) return;
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  const g = gain(ctx, 0.28);
  env(g, ctx, now, 0.002, 0.02, 0.1, 0.1);
  osc(ctx, 'square', 180, now, 0.12, g, 60);
}

// ── Collect resource (soft chime) ──────────────────────────────────────────
export function sfxCollect() {
  if (!_enabled) return;
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  const g = gain(ctx, 0.2);
  env(g, ctx, now, 0.005, 0.05, 0.4, 0.15);
  osc(ctx, 'sine', 880, now, 0.2, g);
  const g2 = gain(ctx, 0.12);
  g2.gain.setValueAtTime(0.001, now + 0.05);
  g2.gain.linearRampToValueAtTime(0.12 * _volume, now + 0.07);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc(ctx, 'sine', 1100, now + 0.05, 0.2, g2);
}

// ── Checkpoint saved (triumphant ding) ────────────────────────────────────
export function sfxCheckpoint() {
  if (!_enabled) return;
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  [[0, 660], [0.1, 880], [0.2, 1100]].forEach(([delay, freq]) => {
    const g = gain(ctx, 0.18);
    g.gain.setValueAtTime(0.001, now + delay);
    g.gain.linearRampToValueAtTime(0.18 * _volume, now + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
    osc(ctx, 'sine', freq, now + delay, 0.3, g);
  });
}

// ── Level up (ascending fanfare) ──────────────────────────────────────────
export function sfxLevelUp() {
  if (!_enabled) return;
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  [[0, 523], [0.1, 659], [0.2, 784], [0.3, 1047]].forEach(([delay, freq]) => {
    const g = gain(ctx, 0.22);
    g.gain.setValueAtTime(0.001, now + delay);
    g.gain.linearRampToValueAtTime(0.22 * _volume, now + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);
    osc(ctx, 'triangle', freq, now + delay, 0.35, g);
  });
}

// ── Boss death (deep rumble + descend) ────────────────────────────────────
export function sfxBossDeath() {
  if (!_enabled) return;
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  const g = gain(ctx, 0.5);
  env(g, ctx, now, 0.01, 0.1, 0.4, 0.6);
  osc(ctx, 'sawtooth', 120, now, 0.7, g, 30);
  const g2 = gain(ctx, 0.3);
  env(g2, ctx, now, 0.01, 0.05, 0.2, 0.4);
  osc(ctx, 'square', 200, now, 0.5, g2, 50);
}

// ── Portal enter (shimmer) ────────────────────────────────────────────────
export function sfxPortal() {
  if (!_enabled) return;
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  for (let i = 0; i < 4; i++) {
    const g = gain(ctx, 0.12);
    const delay = i * 0.06;
    g.gain.setValueAtTime(0.001, now + delay);
    g.gain.linearRampToValueAtTime(0.12 * _volume, now + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
    osc(ctx, 'sine', 400 + i * 200, now + delay, 0.2, g);
  }
}
