import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

export default function DeathModal() {
  const {
    respawn,
    playerName,
    resources,
    respawnShields,
    useRespawnShield,
    gamePhase,
    toggleShop,
    killCount,
    totalDamageDealt,
  } = useGameStore();

  const [actionLocked, setActionLocked] = useState(false);

  const penalties = Object.entries(resources)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: -${v - Math.floor(v * 0.8)}`)
    .join('  ');

  const hasShield = (respawnShields || 0) > 0;
  const inRealm = gamePhase === 'realm';

  const runOnce = (fn) => {
    if (actionLocked) return;
    setActionLocked(true);
    fn();
  };

  const handleShield = () => {
    if (!hasShield) return;
    runOnce(() => {
      useRespawnShield();
      useGameStore.setState({
        showDeathModal: false,
        playerHP: useGameStore.getState().playerMaxHP,
      });
    });
  };

  const handleShop = () => {
    if (actionLocked) return;
    useGameStore.setState({ showDeathModal: false });
    toggleShop();
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
        <div style={{ fontSize: 54, marginBottom: 8, filter: 'drop-shadow(0 0 16px #e74c3c88)' }}>💀</div>

        <h2 style={{ color: '#e74c3c', fontSize: 24, margin: '0 0 8px', letterSpacing: 1 }}>
          You Fell
        </h2>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 10px' }}>
          {playerName || 'Warrior'}, the path to godhood is not over.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
          <div style={{
            flex: 1, background: '#1a0a0a', border: '1px solid #e74c3c44',
            borderRadius: 8, padding: '8px 4px',
          }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#e74c3c' }}>
              {(killCount || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Total Kills</div>
          </div>
          <div style={{
            flex: 1, background: '#0a101a', border: '1px solid #3498db44',
            borderRadius: 8, padding: '8px 4px',
          }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#3498db' }}>
              {(totalDamageDealt || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Damage Dealt</div>
          </div>
        </div>

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

        {inRealm && (
          <>
            {hasShield ? (
              <button
                disabled={actionLocked}
                onClick={handleShield}
                style={{
                  width: '100%', padding: '16px', marginBottom: 10,
                  background: 'linear-gradient(135deg, #0a2040, #0d3060)',
                  border: '2px solid #3498db',
                  borderRadius: 12, color: '#fff', cursor: actionLocked ? 'default' : 'pointer',
                  textAlign: 'left', paddingLeft: 18,
                  boxShadow: '0 0 16px #3498db44', opacity: actionLocked ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 'bold', color: '#3498db' }}>
                  🛡 Use Death Shield
                </div>
                <div style={{ fontSize: 11, color: '#7fb3d3', marginTop: 3 }}>
                  Stay in realm at full HP · no resource loss · {respawnShields} shield{respawnShields !== 1 ? 's' : ''} remaining
                </div>
              </button>
            ) : (
              <button
                disabled={actionLocked}
                onClick={handleShop}
                style={{
                  width: '100%', padding: '14px', marginBottom: 10,
                  background: 'linear-gradient(135deg, #12101a, #1a1530)',
                  border: '2px solid #9b59b688',
                  borderRadius: 12, color: '#fff', cursor: actionLocked ? 'default' : 'pointer',
                  textAlign: 'left', paddingLeft: 18, opacity: actionLocked ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', color: '#9b59b6' }}>
                      🛡 Get a Death Shield
                    </div>
                    <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                      Purchased only · stay in realm with no resource loss
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

        <button
          disabled={actionLocked}
          onClick={() => runOnce(() => respawn('checkpoint'))}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 10,
            background: inRealm ? '#0a1520' : '#0a1a0d',
            border: inRealm ? '2px solid #3498db' : '2px solid #2ecc71',
            borderRadius: 12, color: '#fff', cursor: actionLocked ? 'default' : 'pointer',
            textAlign: 'left', opacity: actionLocked ? 0.6 : 1,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 'bold', color: inRealm ? '#3498db' : '#2ecc71' }}>
            {inRealm ? '⚔️ Retry Boss' : '🚩 Last Checkpoint'}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            {inRealm
              ? 'Restart boss at full health. Minion waves are skipped.'
              : 'Respawn near where you were'}
          </div>
        </button>

        <button
          disabled={actionLocked}
          onClick={() => runOnce(() => respawn('stronghold'))}
          style={{
            width: '100%', padding: '14px 16px',
            background: '#0d0d20', border: '2px solid #d4af37',
            borderRadius: 12, color: '#d4af37', cursor: actionLocked ? 'default' : 'pointer',
            textAlign: 'left', opacity: actionLocked ? 0.6 : 1,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 'bold' }}>
            {inRealm ? '🏃 Flee Realm' : '🏰 Home Stronghold'}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            {inRealm ? 'Return to Stronghold. Boss progress resets.' : 'Safe spawn — further from your progress'}
          </div>
        </button>

        <p style={{ color: '#333', fontSize: 10, marginTop: 14, marginBottom: 0 }}>
          Retry Boss restarts the boss. Flee Realm sends you to Stronghold.
        </p>
      </div>
    </div>
  );
}
