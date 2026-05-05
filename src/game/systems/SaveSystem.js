const SAVE_KEY = 'gp_save';
const SAVE_VERSION = '0.1.0';

const PERSIST_FIELDS = [
  'playerName', 'tutorialStep',
  'playerHP', 'playerMaxHP', 'playerATK', 'playerDEF', 'playerSPD',
  'position', 'gear', 'inventory', 'resources',
  'checkpoints', 'lastCheckpoint', 'activeZone',
  'stronghold', 'bossesDefeated', 'ascensionProgress',
];

export const SaveSystem = {
  save(state) {
    const payload = { version: SAVE_VERSION, lastSaved: Date.now() };
    PERSIST_FIELDS.forEach((f) => { payload[f] = state[f]; });
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[SaveSystem] Save failed:', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) {
        console.warn('[SaveSystem] Version mismatch, starting fresh.');
        return null;
      }
      return data;
    } catch (e) {
      console.warn('[SaveSystem] Load failed:', e);
      return null;
    }
  },

  clear() { localStorage.removeItem(SAVE_KEY); },
  exists() { return !!localStorage.getItem(SAVE_KEY); },
};
