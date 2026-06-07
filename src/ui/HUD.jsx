import React, { useState, useEffect } from 'react';
import { useGameStore }  from '../store/useGameStore';
import { AbilityConfig } from '../game/config/AbilityConfig';
import VirtualJoystick   from './VirtualJoystick';
import SettingsPanel     from './SettingsPanel';

const CIRCUMFERENCE = 2 * Math.PI * 28; // SVG cooldown ring

const GOD_LIST = [
  { realm: 'forest', name: 'Sylvara',  icon: '🌿', color: '#27ae60', skulls: 1 },
  { realm: 'wind',   name: 'Zephyros', icon: '💨', color: '#87ceeb', skulls: 1 },
  { realm: 'earth',  name: 'Terran',   icon: '🪨', color: '#95a5a6', skulls: 2 },
  { realm: 'fire',   name: 'Ignar',    icon: '🔥', color: '#e74c3c', skulls: 2 },
  { realm: 'ice',    name: 'Glacius',  icon: '❄️', color: '#3498db', skulls: 3 },
  { realm: 'ocean',  name: 'Nepthar',  icon: '🌊', color: '#1abc9c', skulls: 3 },
  { realm: 'storm',  name: 'Vortus',   icon: '⚡', color: '#9b59b6', skulls: 4 },
  { realm: 'shadow', name: 'Umbris',   icon: '🌑', color: '#6c3483', skulls: 4 },
  { realm: 'lava',   name: 'Magmara',  icon: '🌋', color: '#e67e22', skulls: 5 },
  { realm: 'void',   name: 'Nihilus',  icon: '✨', color: '#f1c40f', skulls: 5 },
];

export default function HUD() {
  const {
    playerHP, playerMaxHP,
    playerName, level, xp, xpToNextLevel, statPoints,
    resources, ascensionProgress, bossesDefeated,
    prestigeClass, prestigeLevel, fragments,
    equippedAbilityId, abilityFiredAt, abilityCooldownMs,
    toggleHelpMenu, toggleInventory, showInventory, toggleShop, passActive,
    openLevelUp,
  } = useGameStore();

  const [showAscension, setShowAscension] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [dailyCollected, setDailyCollected] = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [savedToast,     setSavedToast]     = useState(false);

  // Daily reward — fires once per session when pass is active
  useEffect(() => {
    if (!passActive) return;
    const today = new Date().toDateString();
    const lastClaim = localStorage.getItem('gp_daily_claim');
    if (lastClaim !== today) {
      setTimeout(() => setShowDailyReward(true), 1200);
    }
  }, [passActive]);

  const claimDaily = () => {
    const st = useGameStore.getState();
    st.addResource('ore',   8);
    st.addResource('stone', 12);
    st.addResource('wood',  10);
    st.gainXP(300);
    localStorage.setItem('gp_daily_claim', new Date().toDateString());
    setDailyCollected(true);
    setTimeout(() => setShowDailyReward(false), 1800);
  };

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

  const onAttack = () => { window.__gameAttack = true; };
  const onInteract = () => { window.__gameInteract = true; };
  const onAbility = () => { if (onCooldown || !ability) return; window.__gameAbility = true; };

  const defeated        = bossesDefeated || [];
  const bossSkipPending = useGameStore(s => s.bossSkipPending);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

      {/* ── Ascension Progress Modal ─────────────────────────────────── */}
      {showAscension && (
        <div
          onClick={() => setShowAscension(false)}
          style={{
            position: 'absolute', inset: 0,
            background: '#000000cc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'all', zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0d0d1a',
              border: '2px solid #d4af37',
              borderRadius: 16,
              padding: '20px 24px',
              minWidth: 280,
              maxWidth: 340,
            }}
          >
            <div style={{
              color: '#d4af37', fontSize: 18, fontWeight: 'bold',
              textAlign: 'center', letterSpacing: 2, marginBottom: 4,
            }}>✦ ASCENSION ✦</div>
            <div style={{
              color: '#ffffff88', fontSize: 11,
              textAlign: 'center', marginBottom: 16,
            }}>Defeat all 10 Elemental Gods to ascend</div>

            {/* Progress bar */}
            <div style={{
              height: 8, background: '#1a1a2e',
              borderRadius: 4, overflow: 'hidden',
              border: '1px solid #d4af3755',
              marginBottom: 18,
            }}>
              <div style={{
                width: `${(defeated.length / 10) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #d4af37, #f1c40f)',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>

            {/* God list */}
            {GOD_LIST.map(god => {
              const isBeaten = defeated.includes(god.realm);
              const skipable = bossSkipPending && !isBeaten;
              return (
                <div key={god.realm}
                  onClick={() => {
                    if (!skipable) return;
                    useGameStore.getState().consumeBossSkip(god.realm);
                    setShowAscension(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 8px', borderRadius: 8, marginBottom: 4,
                    background: isBeaten ? '#1a2e1a' : (skipable ? '#1a1400' : '#0a0a18'),
                    border: `1px solid ${isBeaten ? '#27ae60' : (skipable ? '#d4af37' : '#333')}`,
                    cursor: skipable ? 'pointer' : 'default',
                    boxShadow: skipable ? '0 0 8px #d4af3733' : 'none',
                  }}>
                  <span style={{ fontSize: 18 }}>{god.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: isBeaten ? '#2ecc71' : god.color,
                      fontSize: 13, fontWeight: 'bold',
                    }}>{god.name}</div>
                    <div style={{ color: '#ffffff44', fontSize: 9 }}>
                      {'💀'.repeat(god.skulls)} · {god.realm.charAt(0).toUpperCase() + god.realm.slice(1)} God
                    </div>
                  </div>
                  <span style={{ fontSize: 16 }}>
                    {isBeaten ? '✅' : skipable ? '⚡' : '🔒'}
                  </span>
                </div>
              );
            })}

            {/* Boss Skip pending — let user pick which boss to skip */}
            {bossSkipPending && (
              <div style={{
                background: '#1a1400', border: '1px solid #d4af37',
                borderRadius: 10, padding: '12px 14px', marginBottom: 12,
              }}>
                <div style={{ color: '#d4af37', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>
                  ⚡ God's Mercy Ready
                </div>
                <div style={{ color: '#ffffff88', fontSize: 11 }}>
                  Tap any undefeated god below to mark them as defeated.
                </div>
              </div>
            )}

            <div style={{
              color: '#d4af37', fontSize: 13, fontWeight: 'bold',
              textAlign: 'center', marginTop: 14,
            }}>
              {defeated.length} / 10 Defeated
            </div>
            <button
              onClick={() => setShowAscension(false)}
              style={{
                marginTop: 14, width: '100%',
                background: '#d4af3722',
                border: '1px solid #d4af37',
                borderRadius: 8, padding: '8px',
                color: '#d4af37', fontSize: 13, cursor: 'pointer', fontWeight: 'bold',
              }}
            >Close</button>
          </div>
        </div>
      )}

      {/* ── Daily Reward Modal (Pass) ─────────────────────── */}
      {showDailyReward && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 110,
          background: '#000000bb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'all',
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #1a1400 0%, #0d0d1a 100%)',
            border: '2px solid #d4af37',
            borderRadius: 20, padding: '30px 28px',
            textAlign: 'center', maxWidth: 300, width: '88%',
            boxShadow: '0 0 40px #d4af3744',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
            <div style={{ color: '#d4af37', fontSize: 18, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 }}>Daily Pass Reward</div>
            <div style={{ color: '#ffffff55', fontSize: 12, marginBottom: 20 }}>God Prodigy Pass — daily drop</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              {[
                { icon: '⛏', label: '8 Ore',   color: '#e67e22' },
                { icon: '🪨', label: '12 Stone', color: '#95a5a6' },
                { icon: '🪵', label: '10 Wood',  color: '#27ae60' },
                { icon: '✦',  label: '300 XP',   color: '#9b59b6' },
              ].map(r => (
                <div key={r.label} style={{ textAlign: 'center' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: r.color+'22', border: `1px solid ${r.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 4 }}>{r.icon}</div>
                  <div style={{ color: r.color, fontSize: 10, fontWeight: 'bold' }}>{r.label}</div>
                </div>
              ))}
            </div>
            <button onClick={claimDaily} disabled={dailyCollected} style={{
              width: '100%', padding: '14px', background: dailyCollected ? '#1a1a2e' : '#d4af37',
              border: 'none', borderRadius: 12, color: dailyCollected ? '#555' : '#000',
              fontSize: 15, fontWeight: 'bold', cursor: dailyCollected ? 'default' : 'pointer',
            }}>{dailyCollected ? '✓ Claimed!' : 'Claim Rewards'}</button>
          </div>
        </div>
      )}

      {/* ── Top-left ──────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 56, left: 14,
        display: 'flex', flexDirection: 'column', gap: 5, maxWidth: '58%',
      }}>
        {/* Name + Level + Pts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: passActive ? '#f1c40f' : '#d4af37', fontSize: 17, fontWeight: 'bold', textShadow: passActive ? '0 0 8px #d4af3766, 0 1px 4px #000' : '0 1px 4px #000' }}>
            {playerName || 'Warrior'}
          </span>
          <span style={{
            color: '#fff', fontSize: 11, fontWeight: 'bold',
            background: '#d4af3733', border: '1px solid #d4af3766',
            borderRadius: 6, padding: '1px 6px',
          }}>Lv.{level}</span>
          {prestigeClass && prestigeClass !== 'warrior' && (
            <span style={{
              background: {warrior:'#e74c3c22',mage:'#3498db22',assassin:'#9b59b622',god:'#d4af3722'}[prestigeClass]||'#22222222',
              border: `1px solid ${{warrior:'#e74c3c',mage:'#3498db',assassin:'#9b59b6',god:'#d4af37'}}[prestigeClass]||'#888'}`,
              color: {warrior:'#e74c3c',mage:'#3498db',assassin:'#9b59b6',god:'#d4af37'}[prestigeClass]||'#aaa',
              borderRadius: 8, padding: '2px 7px',
              fontSize: 9, fontWeight: 'bold',
            }}>
              {{warrior:'⚔️',mage:'🔮',assassin:'🗡️',god:'👑'}}[prestigeClass]
              {' '}{(prestigeClass||'').toUpperCase()}
            </span>
          )}
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

      {/* ── Top-right: Ascension (tappable) + Bag ──────────── */}
      <div style={{
        position: 'absolute', top: 56, right: 14,
        display: 'flex', flexDirection: 'column',
        gap: 10, alignItems: 'flex-end', pointerEvents: 'all',
      }}>
        {/* Ascension widget — tappable */}
        <button
          onClick={() => setShowAscension(true)}
          style={{
            background: '#000000aa', border: `1px solid ${defeated.length >= 10 ? '#d4af37' : '#d4af3766'}`,
            borderRadius: 10, padding: '6px 12px', textAlign: 'center', minWidth: 70,
            cursor: 'pointer',
            boxShadow: passActive ? '0 0 14px #d4af3766, 0 0 4px #d4af37' : (defeated.length > 0 ? '0 0 10px #d4af3733' : 'none'),
          }}
        >
          <div style={{ color: '#d4af37', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>ASCENSION</div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', lineHeight: 1.2 }}>
            {ascensionProgress}<span style={{ color: '#444', fontSize: 13 }}>/10</span>
          </div>
          <div style={{ color: '#d4af3788', fontSize: 8, marginTop: 2 }}>tap to view</div>
        </button>

        {/* Settings button */}
        <button onClick={() => setShowSettings(true)} style={{
          background: '#000000bb', border: '2px solid #55555588',
          borderRadius: 12, padding: '10px 14px', fontSize: 18,
          cursor: 'pointer', color: '#aaa',
          marginBottom: 2,
        }}>⚙️</button>

        {/* Shop button */}
        <button onClick={toggleShop} style={{
          background: '#000000bb', border: '2px solid #d4af3788',
          borderRadius: 12, padding: '10px 14px', fontSize: 20,
          cursor: 'pointer', color: '#d4af37',
          marginBottom: 2,
        }}>🏪</button>

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

      {/* ── Settings panel ────────────────────────────────────── */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {/* Auto-save flash toast */}
      {savedToast && (
        <div style={{
          position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: '#1a2a1a', border: '1px solid #2ecc71',
          borderRadius: 20, padding: '6px 16px',
          color: '#2ecc71', fontSize: 13, fontWeight: 'bold',
          pointerEvents: 'none', zIndex: 120,
          animation: 'gpSavedFade 2s ease forwards',
          whiteSpace: 'nowrap',
        }}>
          Saved ✓
        </div>
      )}
    </div>
  );
}

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('gp-saved-style')) {
  const s = document.createElement('style');
  s.id = 'gp-saved-style';
  s.textContent = `@keyframes gpSavedFade {
    0%   { opacity: 0; transform: translateX(-50%) translateY(8px); }
    15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
    70%  { opacity: 1; }
    100% { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  }`;
  document.head.appendChild(s);
}
