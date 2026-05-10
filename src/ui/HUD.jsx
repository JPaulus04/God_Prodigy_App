import React, { useState, useEffect } from 'react';
import { useGameStore }  from '../store/useGameStore';
import { AbilityConfig } from '../game/config/AbilityConfig';
import VirtualJoystick   from './VirtualJoystick';

const CIRCUMFERENCE = 2 * Math.PI * 28; // SVG cooldown ring

export default function HUD() {
  const {
    playerHP, playerMaxHP,
    playerName, level, xp, xpToNextLevel, statPoints,
    resources, ascensionProgress,
    equippedAbilityId, abilityFiredAt, abilityCooldownMs,
    toggleHelpMenu, toggleInventory, showInventory,
    openLevelUp,
  } = useGameStore();

  // Local timer tick — forces re-render while ability is on cooldown
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!abilityFiredAt) return;
    const interval = setInterval(() => {
      const remaining = abilityCooldownMs - (Date.now() - abilityFiredAt);
      if (remaining <= 0) clearInterval(interval);
      setTick(t => t + 1);
    }, 50);
    return () => clearInterval(interval);
  }, [abilityFiredAt, abilityCooldownMs]);

  const cooldownRemaining = abilityFiredAt
    ? Math.max(0, (abilityCooldownMs - (Date.now() - abilityFiredAt)) / 1000)
    : 0;
  const cooldownPct  = abilityCooldownMs > 0 ? cooldownRemaining / (abilityCooldownMs / 1000) : 0;
  const onCooldown   = cooldownRemaining > 0;
  const ability      = equippedAbilityId ? AbilityConfig[equippedAbilityId] : null;

  const hpPct   = Math.max(0, (playerHP / playerMaxHP) * 100);
  const hpColor = hpPct > 50 ? '#2ecc71' : hpPct > 25 ? '#f39c12' : '#e74c3c';
  const xpPct   = xpToNextLevel > 0 ? Math.min(100, (xp / xpToNextLevel) * 100) : 100;

  const onAttack = () => {
    window.__gameAttack = true;
  };
  const onInteract = () => {
    window.__gameInteract = true;
  };
  const onAbility = () => {
    if (onCooldown || !ability) return;
    window.__gameAbility = true;
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

      {/* ── Top-left ──────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 56, left: 14,
        display: 'flex', flexDirection: 'column', gap: 5, maxWidth: '58%',
      }}>
        {/* Name + Level + Pts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: '#d4af37', fontSize: 17, fontWeight: 'bold', textShadow: '0 1px 4px #000' }}>
            {playerName || 'Warrior'}
          </span>
          <span style={{
            color: '#fff', fontSize: 11, fontWeight: 'bold',
            background: '#d4af3733', border: '1px solid #d4af3766',
            borderRadius: 6, padding: '1px 6px',
          }}>Lv.{level}</span>
          {statPoints > 0 && (
            <button onClick={openLevelUp} style={{
              pointerEvents: 'all', background: '#e74c3c', border: 'none',
              borderRadius: 10, padding: '2px 8px',
              fontSize: 11, fontWeight: 'bold', color: '#fff', cursor: 'pointer',
            }}>+{statPoints} pts ▸</button>
          )}
        </div>

        {/* HP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color: '#e74c3c', fontSize: 16 }}>❤</span>
          <div style={{
            flex: 1, height: 14, background: '#222',
            borderRadius: 7, overflow: 'hidden', border: '1px solid #555', minWidth: 100,
          }}>
            <div style={{
              width: `${hpPct}%`, height: '100%', background: hpColor,
              borderRadius: 7, transition: 'width 0.2s, background 0.3s',
            }} />
          </div>
          <span style={{ color: '#ddd', fontSize: 11, minWidth: 46 }}>{playerHP}/{playerMaxHP}</span>
        </div>

        {/* XP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color: '#9b59b6', fontSize: 12 }}>✦</span>
          <div style={{
            flex: 1, height: 6, background: '#1a1a2e',
            borderRadius: 3, overflow: 'hidden', border: '1px solid #333', minWidth: 100,
          }}>
            <div style={{
              width: `${xpPct}%`, height: '100%',
              background: 'linear-gradient(90deg, #8e44ad, #9b59b6)',
              borderRadius: 3, transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ color: '#666', fontSize: 9, minWidth: 46 }}>{xp}/{xpToNextLevel}</span>
        </div>

        {/* Resources */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { k: 'wood',  icon: '🪵', col: '#27ae60' },
            { k: 'stone', icon: '🪨', col: '#95a5a6' },
            { k: 'ore',   icon: '⛏',  col: '#e67e22' },
          ].map(({ k, icon, col }) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#000000aa', padding: '3px 7px',
              borderRadius: 10, border: `1px solid ${col}44`,
            }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', textShadow: '0 1px 3px #000' }}>
                {resources[k] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top-right: Ascension + Bag ────────────────────── */}
      <div style={{
        position: 'absolute', top: 56, right: 14,
        display: 'flex', flexDirection: 'column',
        gap: 10, alignItems: 'flex-end', pointerEvents: 'all',
      }}>
        <div style={{
          background: '#000000aa', border: '1px solid #d4af3766',
          borderRadius: 10, padding: '6px 12px', textAlign: 'center', minWidth: 70,
        }}>
          <div style={{ color: '#d4af37', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>ASCENSION</div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', lineHeight: 1.2 }}>
            {ascensionProgress}<span style={{ color: '#444', fontSize: 13 }}>/10</span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={toggleInventory} style={{
            background:   showInventory ? '#d4af37' : '#000000bb',
            border:       `2px solid ${showInventory ? '#d4af37' : '#888'}`,
            borderRadius: 12, padding: '10px 16px', fontSize: 22,
            cursor: 'pointer', color: showInventory ? '#0d0d1a' : '#fff',
          }}>🎒</button>
          {statPoints > 0 && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              background: '#e74c3c', borderRadius: '50%',
              width: 18, height: 18, fontSize: 10, fontWeight: 'bold', color: '#fff',
              border: '2px solid #0d0d1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{statPoints}</div>
          )}
        </div>
      </div>

      {/* ── Help ─────────────────────────────────────────── */}
      <button onClick={toggleHelpMenu} style={{
        position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
        background: '#000000aa', border: '1px solid #444',
        color: '#ccc', borderRadius: 18, padding: '8px 18px',
        fontSize: 14, cursor: 'pointer', pointerEvents: 'all', fontWeight: 'bold',
      }}>? Help</button>

      {/* ── Bottom controls ───────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '0 20px 44px', pointerEvents: 'all',
      }}>
        <VirtualJoystick />

        {/* Right side: E + Ability + Attack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>

          {/* Interact E */}
          <button onPointerDown={onInteract} style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#1abc9c33', border: '3px solid #1abc9c',
            color: '#1abc9c', fontSize: 18, fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>E</button>

          {/* Ability button with cooldown ring */}
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            {/* SVG cooldown ring */}
            <svg width="72" height="72" style={{
              position: 'absolute', top: 0, left: 0,
              transform: 'rotate(-90deg)', pointerEvents: 'none',
            }}>
              {/* Track */}
              <circle cx="36" cy="36" r="28" fill="none" stroke="#222" strokeWidth="3.5" />
              {/* Fill — shows how much cooldown is REMAINING */}
              {onCooldown && (
                <circle cx="36" cy="36" r="28" fill="none"
                  stroke="#d4af37" strokeWidth="3.5"
                  strokeDasharray={`${(1 - cooldownPct) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeLinecap="round"
                />
              )}
            </svg>

            <button
              onPointerDown={onAbility}
              disabled={!ability || onCooldown}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 56, height: 56, borderRadius: '50%',
                background: onCooldown ? '#0d0d1a' : (ability ? '#8e44ad33' : '#111'),
                border:    `2px solid ${onCooldown ? '#333' : (ability ? '#8e44ad' : '#333')}`,
                cursor: (ability && !onCooldown) ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 1,
                boxShadow: (!onCooldown && ability) ? '0 0 12px #8e44ad55' : 'none',
              }}
            >
              <span style={{ fontSize: ability ? 22 : 16, lineHeight: 1 }}>
                {ability ? ability.icon : '✦'}
              </span>
              {onCooldown && (
                <span style={{ fontSize: 9, color: '#d4af37', fontWeight: 'bold' }}>
                  {cooldownRemaining.toFixed(1)}s
                </span>
              )}
            </button>
          </div>

          {/* Ability name label */}
          {ability && !onCooldown && (
            <div style={{
              fontSize: 8, color: '#8e44ad', fontWeight: 'bold',
              letterSpacing: 0.5, textAlign: 'center', marginTop: -6,
            }}>
              {ability.name.toUpperCase()}
            </div>
          )}

          {/* Attack */}
          <button onPointerDown={onAttack} style={{
            width: 88, height: 88, borderRadius: '50%',
            background: '#e74c3c33', border: '3px solid #e74c3c',
            color: '#fff', fontSize: 30, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px #e74c3c55',
          }}>⚔️</button>
        </div>
      </div>
    </div>
  );
}
