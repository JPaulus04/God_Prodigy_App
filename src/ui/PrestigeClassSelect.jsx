import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PRESTIGE_CLASSES, getAvailableClasses } from '../game/config/PrestigeConfig';

export default function PrestigeClassSelect() {
  const { prestigeLevel, prestigeClass, doPrestige } = useGameStore();
  const [selected, setSelected] = useState(prestigeClass || 'warrior');

  const available  = getAvailableClasses(prestigeLevel);
  const locked     = PRESTIGE_CLASSES.filter(c => c.unlockAt > prestigeLevel);
  const chosenCls  = PRESTIGE_CLASSES.find(c => c.id === selected) || PRESTIGE_CLASSES[0];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 600,
      background: '#000010ee',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, padding: '0 20px',
        paddingTop: 'calc(env(safe-area-inset-top) + 40px)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 42, marginBottom: 8, filter: 'drop-shadow(0 0 16px #d4af37)' }}>
            ✨
          </div>
          <h2 style={{
            color: '#d4af37', fontSize: 24, margin: '0 0 6px',
            letterSpacing: 2, textShadow: '0 0 12px #d4af3788',
          }}>
            CHOOSE YOUR PATH
          </h2>
          <p style={{ color: '#ffffff66', fontSize: 13, margin: 0 }}>
            Prestige {prestigeLevel + 1} · Your class defines this run
          </p>
        </div>

        {/* Available classes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {available.map(cls => {
            const isSel = selected === cls.id;
            return (
              <div
                key={cls.id}
                onClick={() => setSelected(cls.id)}
                style={{
                  background: isSel ? `${cls.color}22` : '#0d0d1a',
                  border: `2px solid ${isSel ? cls.color : cls.color + '44'}`,
                  borderRadius: 14, padding: '14px 16px',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSel && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(ellipse at 15% 50%, ${cls.color}18 0%, transparent 65%)`,
                    pointerEvents: 'none',
                  }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 14, flexShrink: 0,
                    background: `${cls.color}22`,
                    border: `2px solid ${isSel ? cls.color : cls.color + '55'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26,
                  }}>{cls.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        color: isSel ? cls.color : '#fff',
                        fontSize: 17, fontWeight: 'bold',
                      }}>{cls.name}</span>
                      {isSel && (
                        <span style={{
                          background: cls.color, color: '#000',
                          fontSize: 8, fontWeight: 'bold',
                          padding: '2px 7px', borderRadius: 6,
                        }}>SELECTED</span>
                      )}
                    </div>
                    <div style={{ color: '#888', fontSize: 11, marginTop: 3 }}>{cls.desc}</div>
                    <div style={{
                      color: cls.color + 'bb', fontSize: 11, marginTop: 4,
                      fontStyle: 'italic',
                    }}>⚡ {cls.passive}</div>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: isSel ? cls.color : 'transparent',
                    border: `2px solid ${isSel ? cls.color : '#555'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#000' }} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Locked classes */}
        {locked.length > 0 && (
          <>
            <div style={{ color: '#555', fontSize: 11, marginBottom: 8, textAlign: 'center' }}>
              — LOCKED CLASSES —
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {locked.map(cls => (
                <div key={cls.id} style={{
                  background: '#0a0a0a', border: '1px solid #222',
                  borderRadius: 14, padding: '12px 16px', opacity: 0.6,
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: '#1a1a1a', border: '1px solid #333',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    filter: 'grayscale(1)',
                  }}>🔒</div>
                  <div>
                    <div style={{ color: '#555', fontSize: 15, fontWeight: 'bold' }}>{cls.name}</div>
                    <div style={{ color: '#444', fontSize: 11, marginTop: 2 }}>
                      Unlocks at Prestige {cls.unlockAt}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Confirm button */}
        <button
          onClick={() => doPrestige(selected)}
          style={{
            width: '100%', padding: '18px',
            background: `linear-gradient(135deg, ${chosenCls.color}33, ${chosenCls.color}55)`,
            border: `2px solid ${chosenCls.color}`,
            borderRadius: 14, color: chosenCls.color,
            fontSize: 16, fontWeight: 'bold',
            cursor: 'pointer', letterSpacing: 1,
            boxShadow: `0 0 20px ${chosenCls.color}44`,
            marginBottom: 8,
          }}
        >
          {chosenCls.icon} Begin as {chosenCls.name}
        </button>
        <p style={{ color: '#ffffff33', fontSize: 10, textAlign: 'center', margin: '0 0 40px' }}>
          All progress resets · Legacy weapons + fragments carry over
        </p>

        <div style={{ height: 'calc(env(safe-area-inset-bottom) + 20px)' }} />
      </div>
    </div>
  );
}
