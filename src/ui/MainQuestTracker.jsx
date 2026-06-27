import React from 'react';
import { useGameStore } from '../store/useGameStore';

// V95-POLISH-STORY-REV-001
const STORY_REVISION = 'V95-POLISH-STORY-REV-001';

const THRONES = [
  'Sylvara', 'Zephyros', 'Terran', 'Ignar', 'Glacius',
  'Nepthar', 'Vortus', 'Umbris', 'Magmara', 'Nihilus',
];

function getQuest({ gamePhase, level, bossesDefeated, ascensionProgress, inventory, stronghold }) {
  const defeated = bossesDefeated || [];
  const defeatedCount = Math.max(ascensionProgress || 0, defeated.length || 0);
  const nextGod = THRONES[Math.min(defeatedCount, THRONES.length - 1)] || 'the final god';
  const hasGear = (inventory || []).length > 0;
  const forgeLevel = stronghold?.forge || 0;

  if (defeatedCount >= 10) {
    return {
      title: 'Ascension Begins',
      objective: 'Return to the Stronghold and claim what no mortal has survived.',
      lore: 'The Ten Thrones have fallen. Now the question remains: what have you become?',
    };
  }

  if (gamePhase === 'realm') {
    return {
      title: `Challenge ${nextGod}`,
      objective: `Survive the realm and defeat throne ${defeatedCount + 1} of 10.`,
      lore: 'Every fallen god brings you closer to ascension — and closer to the truth.',
    };
  }

  if (gamePhase === 'stronghold') {
    if (forgeLevel <= 0) {
      return {
        title: 'Rebuild the Stronghold',
        objective: 'Upgrade the Forge so your weapons can match the gods.',
        lore: 'The Stronghold is the last sanctuary of mortals who dared to climb.',
      };
    }
    return {
      title: 'Prepare for the Next Throne',
      objective: `Upgrade, heal, and return to challenge ${nextGod}.`,
      lore: 'The gods are not waiting. Each victory makes the remaining thrones more dangerous.',
    };
  }

  if (defeatedCount === 0 && level < 2) {
    return {
      title: 'Awaken the Divine Spark',
      objective: 'Defeat enemies, collect resources, and reach Level 2.',
      lore: 'Many have killed a god. None have survived all ten.',
    };
  }

  if (defeatedCount === 0 && !hasGear) {
    return {
      title: 'Arm the Challenger',
      objective: 'Find gear or return to the Stronghold before entering the first realm.',
      lore: 'Warriors reached the first throne before you. Most were forgotten.',
    };
  }

  if (defeatedCount === 0) {
    return {
      title: 'Find the First Throne',
      objective: `Enter the first realm and challenge ${nextGod}.`,
      lore: 'No prophecy promises you will win. Someone simply has to try.',
    };
  }

  if (defeatedCount < 3) {
    return {
      title: 'Prove a God Can Fall',
      objective: `Seek the next realm and challenge ${nextGod}.`,
      lore: 'You have done what most only prayed for. The path is no longer legend.',
    };
  }

  if (defeatedCount < 5) {
    return {
      title: 'Surpass the Old Heroes',
      objective: `Defeat ${nextGod} and climb beyond the stories of past godslayers.`,
      lore: 'A few reached this far. None returned with the truth.',
    };
  }

  if (defeatedCount < 9) {
    return {
      title: 'The Gods Begin to Fear You',
      objective: `Continue the climb. ${nextGod} holds throne ${defeatedCount + 1}.`,
      lore: 'Each throne you break weakens the order that held the world together.',
    };
  }

  return {
    title: 'The Last Throne Waits',
    objective: `Defeat ${nextGod}. Discover what happens when the final god falls.`,
    lore: 'One god remains between mankind and the forbidden answer.',
  };
}

export default function MainQuestTracker() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const level = useGameStore(s => s.level);
  const bossesDefeated = useGameStore(s => s.bossesDefeated);
  const ascensionProgress = useGameStore(s => s.ascensionProgress);
  const inventory = useGameStore(s => s.inventory);
  const stronghold = useGameStore(s => s.stronghold);

  if (gamePhase === 'menu') return null;

  const defeatedCount = Math.max(ascensionProgress || 0, (bossesDefeated || []).length || 0);
  const quest = getQuest({ gamePhase, level, bossesDefeated, ascensionProgress, inventory, stronghold });

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(env(safe-area-inset-top) + 104px)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(330px, calc(100% - 28px))',
      zIndex: 84,
      pointerEvents: 'none',
      filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.65))',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(8,8,18,0.88), rgba(22,18,34,0.84))',
        border: '1px solid rgba(212,175,55,0.48)',
        borderRadius: 14,
        padding: '9px 12px 10px',
        boxShadow: 'inset 0 0 18px rgba(212,175,55,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
          <div style={{ color: '#d4af37', fontSize: 10, fontWeight: 900, letterSpacing: 1.4 }}>
            MAIN QUEST
          </div>
          <div style={{ color: '#ffffff55', fontSize: 10, fontWeight: 800 }}>
            Ten Thrones {defeatedCount}/10
          </div>
        </div>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 900, lineHeight: 1.15, marginBottom: 3 }}>
          {quest.title}
        </div>
        <div style={{ color: '#d9d9d9', fontSize: 11.5, lineHeight: 1.3, marginBottom: 5 }}>
          {quest.objective}
        </div>
        <div style={{ color: '#d4af3788', fontSize: 10.5, lineHeight: 1.3, fontStyle: 'italic' }}>
          {quest.lore}
        </div>
      </div>
    </div>
  );
}

export { STORY_REVISION };
