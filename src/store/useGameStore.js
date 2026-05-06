import { create } from 'zustand';
import { SaveSystem } from '../game/systems/SaveSystem';

const DEFAULT_STATE = {
  playerName: '',
  gamePhase: 'menu',
  tutorialStep: 0,
  playerHP: 100,
  playerMaxHP: 100,
  playerATK: 8,
  playerDEF: 4,
  playerSPD: 5,
  position: { zone: 'world', x: 800, y: 960 },
  gear: { weapon: null, armor: null, accessory: null },
  inventory: [],
  resources: { wood: 0, stone: 0, ore: 0 },
  checkpoints: [],
  lastCheckpoint: 'stronghold',
  activeZone: 'world',
  stronghold: { forge: 0, storage: 0, trainingGrounds: 0 },
  bossesDefeated: [],
  ascensionProgress: 0,
  showInventory: false,
  showHelpMenu: false,
  showDeathModal: false,
};

export const useGameStore = create((set, get) => ({
  ...DEFAULT_STATE,

  setPlayerName:   (name)  => set({ playerName: name }),
  setGamePhase:    (phase) => set({ gamePhase: phase }),
  advanceTutorial: ()      => set((s) => ({ tutorialStep: s.tutorialStep + 1 })),

  takeDamage: (amount) => {
    const { playerHP } = get();
    const newHP = Math.max(0, playerHP - amount);
    set({ playerHP: newHP });
    if (newHP === 0) set({ showDeathModal: true });
    SaveSystem.save(get());
  },

  healPlayer: (amount) => {
    const { playerHP, playerMaxHP } = get();
    set({ playerHP: Math.min(playerMaxHP, playerHP + amount) });
    SaveSystem.save(get());
  },

  addResource: (type, amount) => {
    const { resources } = get();
    set({ resources: { ...resources, [type]: resources[type] + amount } });
    SaveSystem.save(get());
  },

  spendResource: (type, amount) => {
    const { resources } = get();
    if (resources[type] < amount) return false;
    set({ resources: { ...resources, [type]: resources[type] - amount } });
    SaveSystem.save(get());
    return true;
  },

  addItem: (item) => {
    const { inventory } = get();
    if (inventory.length >= 16) return false;
    set({ inventory: [...inventory, item] });
    SaveSystem.save(get());
    return true;
  },

  removeItem: (itemId) => {
    const { inventory } = get();
    set({ inventory: inventory.filter((i) => i.id !== itemId) });
    SaveSystem.save(get());
  },

  equipItem: (item) => {
    const { gear } = get();
    set({ gear: { ...gear, [item.slot]: item.id } });
    if (item.atk) set((s) => ({ playerATK: s.playerATK + item.atk }));
    if (item.def) set((s) => ({ playerDEF: s.playerDEF + item.def }));
    SaveSystem.save(get());
  },

  activateCheckpoint: (checkpointId) => {
    const { checkpoints } = get();
    if (!checkpoints.includes(checkpointId)) {
      set({ checkpoints: [...checkpoints, checkpointId] });
    }
    set({ lastCheckpoint: checkpointId });
    SaveSystem.save(get());
  },

  respawn: (location) => {
    const { playerMaxHP, resources } = get();

    // Apply 20% resource penalty on death
    const penalized = {};
    Object.entries(resources).forEach(([k, v]) => {
      penalized[k] = Math.floor(v * 0.8);
    });

    set({
      playerHP:      Math.floor(playerMaxHP * 0.5),
      showDeathModal: false,
      resources:     penalized,
      activeZone:    location === 'stronghold' ? 'stronghold' : 'world',
    });
    SaveSystem.save(get());
  },

  upgradeStructure: (structure) => {
    const { stronghold } = get();
    set({ stronghold: { ...stronghold, [structure]: stronghold[structure] + 1 } });
    SaveSystem.save(get());
  },

  defeatBoss: (bossId) => {
    const { bossesDefeated } = get();
    if (!bossesDefeated.includes(bossId)) {
      const updated = [...bossesDefeated, bossId];
      set({ bossesDefeated: updated, ascensionProgress: updated.length });
      SaveSystem.save(get());
    }
  },

  toggleInventory: () => set((s) => ({ showInventory: !s.showInventory })),
  toggleHelpMenu:  () => set((s) => ({ showHelpMenu:  !s.showHelpMenu  })),

  loadSave: () => {
    const saved = SaveSystem.load();
    if (saved) {
      set(saved);
      if (saved.playerName) set({ gamePhase: 'world' });
    }
  },

  resetGame: () => {
    SaveSystem.clear();
    set({ ...DEFAULT_STATE });
  },
}));
