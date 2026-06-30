import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

// V95-QUEST-BANNER-REV-002
// V100-STRONGHOLD-VILLAGE-REV-001: compact quest banner to keep the Stronghold visible.
const STORY_REVISION = 'V95-QUEST-BANNER-REV-002';

const THRONES = [
  'Sylvara', 'Zephyros', 'Terran', 'Ignar', 'Glacius',
  'Nepthar', 'Vortus', 'Umbris', 'Magmara', 'Nihilus',
];

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function getQuest({ gamePhase, level, bossesDefeated, ascensionProgress, inventory, stronghold }) {
  const defeated = bossesDefeated || [];
  const defeatedCount = Math.max(ascensionProgress || 0, defeated.length || 0);
  const nextGod = THRONES[Math.min(defeatedCount, THRONES.length - 1)] || 'the final god';
  const hasGear = (inventory || []).length > 0;
  const forgeLevel = stronghold?.forge || 0;

  if (defeatedCount >= 10) {
    return {
      stage: 'ascension_begins',
      speaker: 'The Keeper',
      title: 'Ascension Begins',
      shortTitle: 'Ascension Begins',
      objective: 'Return to the Stronghold and claim what no mortal has survived.',
      lore: 'The Ten Thrones have fallen. Now the question remains: what have you become?',
      dialogue: [
        'The tenth throne is silent.',
        'Every god who ruled this world has fallen by your hand. The old prophecy was true: the path to ascension exists.',
        'Return to the Stronghold. The final answer waits there.',
      ],
    };
  }

  if (gamePhase === 'realm') {
    return {
      stage: `realm_${defeatedCount}`,
      speaker: 'The Realm',
      title: `Challenge ${nextGod}`,
      shortTitle: `Defeat ${nextGod}`,
      objective: `Survive the realm and defeat throne ${defeatedCount + 1} of 10.`,
      lore: 'Every fallen god brings you closer to ascension — and closer to the truth.',
      dialogue: [
        `${nextGod}'s realm closes around you.`,
        'This is not only a battle. It is a test of whether mortals can break the order of the gods.',
        `Defeat ${nextGod}. Claim the next throne.`,
      ],
    };
  }

  if (gamePhase === 'stronghold') {
    if (forgeLevel <= 0) {
      return {
        stage: 'stronghold_rebuild',
        speaker: 'The Keeper',
        title: 'Rebuild the Stronghold',
        shortTitle: 'Rebuild Stronghold',
        objective: 'Upgrade the Forge so your weapons can match the gods.',
        lore: 'The Stronghold is the last sanctuary of mortals who dared to climb.',
        dialogue: [
          'This Stronghold was built by the first godslayers.',
          'Most never returned from the realms. The ones who did left behind weapons, warnings, and unfinished work.',
          'Rebuild the Forge. You will need more than courage to climb the Ten Thrones.',
        ],
      };
    }
    return {
      stage: `stronghold_prepare_${defeatedCount}`,
      speaker: 'The Keeper',
      title: 'Prepare for the Next Throne',
      shortTitle: 'Prepare',
      objective: `Upgrade, heal, and return to challenge ${nextGod}.`,
      lore: 'The gods are not waiting. Each victory makes the remaining thrones more dangerous.',
      dialogue: [
        'The Stronghold can still protect you, but it cannot win the war for you.',
        'Upgrade your gear, restore your strength, and return to the realms when you are ready.',
        `${nextGod} still holds the next throne.`,
      ],
    };
  }

  if (defeatedCount === 0 && level < 2) {
    return {
      stage: 'awaken_spark',
      speaker: 'The Keeper',
      title: 'Awaken the Divine Spark',
      shortTitle: 'Awaken Spark',
      objective: 'Defeat enemies, collect resources, and reach Level 2.',
      lore: 'Many have killed a god. None have survived all ten.',
      dialogue: [
        'You are not the first to challenge the gods.',
        'Kings, priests, soldiers, and monsters have all tried. A few killed one god and became legends. None survived all ten.',
        'Start small. Gather strength. The first throne will not wait forever.',
      ],
    };
  }

  if (defeatedCount === 0 && !hasGear) {
    return {
      stage: 'arm_challenger',
      speaker: 'The Keeper',
      title: 'Arm the Challenger',
      shortTitle: 'Find Gear',
      objective: 'Find gear or return to the Stronghold before entering the first realm.',
      lore: 'Warriors reached the first throne before you. Most were forgotten.',
      dialogue: [
        'A god cannot be challenged with empty hands.',
        'Search for gear, gather resources, and prepare yourself before stepping through the first realm gate.',
      ],
    };
  }

  if (defeatedCount === 0) {
    return {
      stage: 'first_throne',
      speaker: 'The Keeper',
      title: 'Find the First Throne',
      shortTitle: 'First Throne',
      objective: `Enter the first realm and challenge ${nextGod}.`,
      lore: 'No prophecy promises you will win. Someone simply has to try.',
      dialogue: [
        'The first throne belongs to Sylvara.',
        'Others have reached her realm. Most became roots beneath her forest. A few escaped and called her merciful.',
        'Enter the first realm when you are ready. The climb begins there.',
      ],
    };
  }

  if (defeatedCount < 3) {
    return {
      stage: `prove_god_can_fall_${defeatedCount}`,
      speaker: 'The Keeper',
      title: 'Prove a God Can Fall',
      shortTitle: 'Next Throne',
      objective: `Seek the next realm and challenge ${nextGod}.`,
      lore: 'You have done what most only prayed for. The path is no longer legend.',
      dialogue: [
        'One throne has fallen.',
        'That alone would make you a legend, but legends are not enough. The gods will now know your name.',
        `Seek ${nextGod}. Prove the first victory was not chance.`,
      ],
    };
  }

  if (defeatedCount < 5) {
    return {
      stage: `surpass_heroes_${defeatedCount}`,
      speaker: 'The Keeper',
      title: 'Surpass the Old Heroes',
      shortTitle: 'Surpass Heroes',
      objective: `Defeat ${nextGod} and climb beyond the stories of past godslayers.`,
      lore: 'A few reached this far. None returned with the truth.',
      dialogue: [
        'You have reached the edge of the old stories.',
        'The strongest godslayers defeated two or three. After that, their names became warnings.',
        `If you defeat ${nextGod}, you climb where history goes silent.`,
      ],
    };
  }

  if (defeatedCount < 9) {
    return {
      stage: `gods_fear_you_${defeatedCount}`,
      speaker: 'The Keeper',
      title: 'The Gods Begin to Fear You',
      shortTitle: 'Gods Fear You',
      objective: `Continue the climb. ${nextGod} holds throne ${defeatedCount + 1}.`,
      lore: 'Each throne you break weakens the order that held the world together.',
      dialogue: [
        'The remaining gods are no longer watching. They are preparing.',
        'Every throne you break gives mankind hope, but it also loosens something ancient beneath the realms.',
        `Continue if you must. ${nextGod} is next.`,
      ],
    };
  }

  return {
    stage: 'last_throne',
    speaker: 'The Keeper',
    title: 'The Last Throne Waits',
    shortTitle: 'Last Throne',
    objective: `Defeat ${nextGod}. Discover what happens when the final god falls.`,
    lore: 'One god remains between mankind and the forbidden answer.',
    dialogue: [
      'Only one throne remains.',
      'If the prophecy is true, defeating the final god will make you one of them.',
      'If the old warriors were right, ascension may be a curse. There is only one way to know.',
    ],
  };
}

function StoryDialogue({ quest, defeatedCount, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 6000,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      pointerEvents: 'all',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 390,
        background: 'linear-gradient(180deg, #11111f 0%, #07070f 100%)',
        border: '1.5px solid #d4af37',
        borderRadius: 22,
        padding: '24px 20px 20px',
        color: '#fff',
        boxShadow: '0 18px 60px rgba(0,0,0,0.8), inset 0 0 34px rgba(212,175,55,0.08)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}>
          <div>
            <div style={{ color: '#d4af37', fontSize: 10, fontWeight: 900, letterSpacing: 2.2 }}>
              THE TEN THRONES
            </div>
            <div style={{ color: '#ffffff66', fontSize: 11, marginTop: 3 }}>
              {quest.speaker}
            </div>
          </div>
          <div style={{
            color: '#d4af37',
            fontSize: 11,
            fontWeight: 900,
            border: '1px solid #d4af3766',
            borderRadius: 999,
            padding: '5px 9px',
            background: '#d4af3714',
            whiteSpace: 'nowrap',
          }}>
            {defeatedCount}/10
          </div>
        </div>

        <h2 style={{
          margin: '0 0 13px',
          color: '#fff',
          fontSize: 25,
          lineHeight: 1.12,
          fontFamily: "'Georgia', serif",
        }}>
          {quest.title}
        </h2>

        <div style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '13px 14px',
          marginBottom: 16,
        }}>
          {(quest.dialogue || []).map((line, idx) => (
            <p key={`${quest.stage}-${idx}`} style={{
              margin: idx === 0 ? '0 0 10px' : idx === quest.dialogue.length - 1 ? 0 : '0 0 10px',
              color: idx === quest.dialogue.length - 1 ? '#d4af37' : '#d4d4d4',
              fontSize: 13.5,
              lineHeight: 1.52,
            }}>
              {line}
            </p>
          ))}
        </div>

        <div style={{
          border: '1px solid #ffffff10',
          borderRadius: 12,
          padding: '10px 12px',
          marginBottom: 16,
          background: '#00000025',
        }}>
          <div style={{ color: '#ffffff66', fontSize: 10, fontWeight: 900, letterSpacing: 1.2, marginBottom: 4 }}>
            CURRENT OBJECTIVE
          </div>
          <div style={{ color: '#fff', fontSize: 13, lineHeight: 1.35 }}>
            {quest.objective}
          </div>
        </div>

        <button onClick={onClose} style={{
          width: '100%',
          padding: '14px 0',
          background: 'linear-gradient(135deg, #b8862a, #d4af37, #f5c842)',
          border: '1.5px solid #d4af37',
          borderRadius: 14,
          color: '#0d0d1a',
          fontSize: 15,
          fontWeight: 900,
          cursor: 'pointer',
          letterSpacing: 0.8,
          boxShadow: '0 0 24px #d4af3744',
        }}>
          Continue
        </button>
      </div>
    </div>
  );
}

function QuestBanner({ quest, defeatedCount, onOpen }) {
  return (
    <button
      onClick={onOpen}
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top) + 154px)',
        left: 12,
        width: 'min(188px, calc(100% - 210px))',
        zIndex: 84,
        pointerEvents: 'all',
        background: 'linear-gradient(135deg, rgba(8,8,18,0.76), rgba(20,18,31,0.70))',
        border: '1px solid rgba(212,175,55,0.42)',
        borderRadius: 999,
        padding: '6px 10px 7px',
        boxShadow: '0 5px 14px rgba(0,0,0,0.42), inset 0 0 14px rgba(212,175,55,0.04)',
        textAlign: 'left',
        cursor: 'pointer',
        color: '#fff',
        backdropFilter: 'blur(2px)',
        minHeight: 42,
      }}
      aria-label="Open main quest"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ color: '#d4af37', fontSize: 8.5, fontWeight: 900, letterSpacing: 1.2, whiteSpace: 'nowrap' }}>
          MAIN QUEST
        </span>
        <span style={{ color: '#ffffff66', fontSize: 8.5, fontWeight: 900, whiteSpace: 'nowrap' }}>
          {defeatedCount}/10
        </span>
      </div>
      <div style={{
        color: '#fff',
        fontSize: 12,
        fontWeight: 900,
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginTop: 2,
      }}>
        {quest.shortTitle || quest.title}
      </div>
    </button>
  );
}

export default function MainQuestTracker() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const level = useGameStore(s => s.level);
  const bossesDefeated = useGameStore(s => s.bossesDefeated);
  const ascensionProgress = useGameStore(s => s.ascensionProgress);
  const inventory = useGameStore(s => s.inventory);
  const stronghold = useGameStore(s => s.stronghold);

  const [dialogueOpen, setDialogueOpen] = useState(false);

  const defeatedCount = Math.max(ascensionProgress || 0, (bossesDefeated || []).length || 0);

  const quest = useMemo(() => getQuest({
    gamePhase,
    level,
    bossesDefeated,
    ascensionProgress,
    inventory,
    stronghold,
  }), [gamePhase, level, bossesDefeated, ascensionProgress, inventory, stronghold]);

  useEffect(() => {
    if (!quest || gamePhase === 'menu') return;

    const key = `gp_story_dialogue_seen_${STORY_REVISION}_${quest.stage}`;
    if (safeGet(key) === 'true') return;

    const timer = setTimeout(() => setDialogueOpen(true), 550);
    return () => clearTimeout(timer);
  }, [quest?.stage, gamePhase]);

  if (gamePhase === 'menu' || !quest) return null;

  const closeDialogue = () => {
    safeSet(`gp_story_dialogue_seen_${STORY_REVISION}_${quest.stage}`, 'true');
    setDialogueOpen(false);
  };

  return (
    <>
      <QuestBanner
        quest={quest}
        defeatedCount={defeatedCount}
        onOpen={() => setDialogueOpen(true)}
      />
      {dialogueOpen && (
        <StoryDialogue
          quest={quest}
          defeatedCount={defeatedCount}
          onClose={closeDialogue}
        />
      )}
    </>
  );
}

export { STORY_REVISION };
