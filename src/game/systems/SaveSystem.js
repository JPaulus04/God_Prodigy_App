// SaveSystem.js
const SAVE_KEY     = 'gp_save';
const SAVE_VERSION = '0.4.0';

const PERSIST_FIELDS = [
  'playerName',
  'playerHP', 'playerMaxHP',
  'playerBaseATK', 'playerBaseDEF',
  'playerATK', 'playerDEF', 'playerSPD',
  'level', 'xp', 'xpToNextLevel', 'statPoints',
  'trainingATKBonus', 'trainingDEFBonus',
  'equippedAbilityId',
  'position', 'activeZone',
  'checkpoints', 'lastCheckpoint',
  'gear', 'inventory', 'itemUpgrades',
  'resources',
  'stronghold', 'bossesDefeated', 'ascensionProgress',
  'killCount', 'totalDamageDealt',
  'passActive', 'respawnShields', 'ownedSkins', 'ownedTrail', 'ownedTrails',
  'extraInventorySlots', 'bossSkipUsed',
  // Prestige + Legacy — always persisted, survive reset
  'prestigeLevel', 'prestigeClass',
  'fragments', 'legacyWeapons',
  'challengeCleared',
  'tutorialStep',
  'activeSkin',
  'activeTrail',
];

export const SaveSystem = {
  save(state) {
    try {
      const payload = { version: SAVE_VERSION, savedAt: Date.now() };
      PERSIST_FIELDS.forEach(key => {
        if (state[key] !== undefined) payload[key] = state[key];
      });
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('SaveSystem: failed to save', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Accept 0.x saves (migrate forward)
      if (!data.version || !data.version.startsWith('0.')) return null;
      const { version, savedAt, ...fields } = data;
      return fields;
    } catch (e) {
      console.warn('SaveSystem: failed to load', e);
      return null;
    }
  },

  clear() {
    try { localStorage.removeItem(SAVE_KEY); }
    catch (e) { console.warn('SaveSystem: failed to clear', e); }
  },

  hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  },
};
