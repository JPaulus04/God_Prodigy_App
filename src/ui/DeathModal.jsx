import React from 'react';
import { useGameStore } from '../store/useGameStore';

export default function DeathModal() {
  const {
    respawn, playerName, resources,
    respawnShields, useRespawnShield,
    gamePhase, setGamePhase,
    toggleShop,
  } = useGameStore();

  // Preview 20% penalty
  const penalties = Object.entries(resources)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: -${v - Math.floor(v * 0.8)}`)
    .join('  ');

  const hasShield = (respawnShields || 0) > 0;
  const inRealm   = gamePhase === 'realm';

  const handleShield = () => {
    if (!hasShield) return;
    useRespawnShield();
    // Heal to full and dismiss — stay exactly where we are
    useGameStore.getState().healPlayer(useGameStore.getState().playerMaxHP);
    useGameStore.getState().set?.({ showDeathModal: false });
    // Fallback direct set
    useGameStore.setState({ showDeathModal: false, playerHP: useGameStore.getState().playerMaxHP });
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: '#000000dd',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0d0d1a', border: '2px solid #e74c3c',
        borderRadius: 18, padding: '28px 24px',
        width: '88%', maxWidth: 340,
        textAlign: 'center', color: '#fff',
      }}>
        {/* Icon */}
        <div style={{ fontSize: 54, marginBottom: 8, filter: 'drop-shadow(0 0 16px #e74c3c88)' }}>💀</div>

        <h2 style={{ color: '#e74c3c', fontSize: 24, margin: '0 0 8px', letterSpacing: 1 }}>
          You Fell
        </h2>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 10px' }}>
          {playerName || 'Warrior'}, the path to godhood is not over.
        </p>

        {/* Resource penalty */}
        {penalties ? (
          <div style={{
            background: '#1a0505', border: '1px solid #e74c3c44',
            borderRadius: 8, padding: '8px 12px', marginBottom: 16,
          }}>
            <div style={{ color: '#e74c3c', fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>
              20% resources lost on respawn:
            </div>
            <div style={{ color: '#c0392b', fontSize: 11 }}>{penalties}</div>
          </div>
        ) : (
          <p style={{ color: '#333', fontSize: 12, marginBottom: 16 }}>No resources to lose.</p>
        )}

        {/* ── Death Shield option (top priority if in realm) ── */}
        {inRealm && (
          <>
            {hasShield ? (
              <button
                onClick={handleShield}
                style={{
                  width: '100%', padding: '16px', marginBottom: 10,
                  background: 'linear-gradient(135deg, #0a2040, #0d3060)',
                  border: '2px solid #3498db',
                  borderRadius: 12, color: '#fff', cursor: 'pointer',
                  textAlign: 'left', paddingLeft: 18,
                  boxShadow: '0 0 16px #3498db44',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 'bold', color: '#3498db' }}>
                  🛡 Use Death Shield
                </div>
                <div style={{ fontSize: 11, color: '#7fb3d3', marginTop: 3 }}>
                  Stay in realm at full HP · {respawnShields} shield{respawnShields !== 1 ? 's' : ''} remaining
                </div>
              </button>
            ) : (
              <button
                onClick={() => { useGameStore.setState({ showDeathModal: false }); toggleShop(); }}
                style={{
                  width: '100%', padding: '14px', marginBottom: 10,
                  background: 'linear-gradient(135deg, #12101a, #1a1530)',
                  border: '2px solid #9b59b688',
                  borderRadius: 12, color: '#fff', cursor: 'pointer',
                  textAlign: 'left', paddingLeft: 18,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', color: '#9b59b6' }}>
                      🛡 Get a Death Shield
                    </div>
                    <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                      Stay in realm, no resource loss — $0.99
                    </div>
                  </div>
                  <div style={{
                    background: '#9b59b6', borderRadius: 8, padding: '4px 10px',
                    fontSize: 11, fontWeight: 'bold', color: '#fff',
                  }}>Shop</div>
                </div>
              </button>
            )}
          </>
        )}

        {/* ── Last Checkpoint ── */}
        <button
          onClick={() => respawn('checkpoint')}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 10,
            background: '#0a1a0d', border: '2px solid #2ecc71',
            borderRadius: 12, color: '#fff', cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#2ecc71' }}>
            🚩 Last Checkpoint
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            Respawn near where you were
          </div>
        </button>

        {/* ── Home Stronghold ── */}
        <button
          onClick={() => respawn('stronghold')}
          style={{
            width: '100%', padding: '14px 16px',
            background: '#0d0d20', border: '2px solid #d4af37',
            borderRadius: 12, color: '#d4af37', cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 'bold' }}>
            🏰 Home Stronghold
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            Safe spawn — further from your progress
          </div>
        </button>

        <p style={{ color: '#333', fontSize: 10, marginTop: 14, marginBottom: 0 }}>
          You respawn at 50% HP. Death Shields prevent all resource loss.
        </p>
      </div>
    </div>
  );
}
