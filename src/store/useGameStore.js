import { create } from 'zustand';
import { SaveSystem } from '../game/systems/SaveSystem';

const DEFAULT_STATE = {
  playerName: '',
  gamePhase: 'menu',
  tutorialStep: 0,
  playerHP: 100,
  playerMaxHP: 100,
  playerBaseATK: 8,   // never changes — used to recalculate on equip
  playerBaseDEF: 4,   // never changes — used to recalculate on equip
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
  respawnAt: null,      // 'stronghold' | 'cp_center' | 'cp_forest' | 'cp_east'
  stronghold: { forge: 0, storage: 0, trainingGrounds: 0 },
  trainingATKBonus: 0,  // tracks training grounds cumulative ATK bonus
  trainingDEFBonus: 0,  // tracks training grounds cumulative DEF bonus
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

  // Fixed: recalculates stats from base + training bonuses + new gear
  // Prevents stacking from clicking the same item multiple times
  equipItem: (item) => {
    const { gear, inventory, playerBaseATK, playerBaseDEF, trainingATKBonus, trainingDEFBonus } = get();
    const newGear = { ...gear, [item.slot]: item.id };
    set({ gear: newGear });

    // Recalculate ATK and DEF from scratch:
    // base stats + training grounds bonuses + equipped gear bonuses
    let atk = (playerBaseATK || 8) + (trainingATKBonus || 0);
    let def = (playerBaseDEF || 4) + (trainingDEFBonus || 0);

    Object.values(newGear).forEach(equippedId => {
      if (!equippedId) return;
      const equippedItem = inventory.find(i => i.id === equippedId)
        || (equippedId === item.id ? item : null);
      if (equippedItem?.atk) atk += equippedItem.atk;
      if (equippedItem?.def) def += equippedItem.def;
    });

    set({ playerATK: atk, playerDEF: def });
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

  // Fixed: stores explicit respawnAt so WorldCanvas knows exactly where to go
  respawn: (location) => {
    const { playerMaxHP, resources, lastCheckpoint } = get();

    const penalized = {};
    Object.entries(resources).forEach(([k, v]) => {
      penalized[k] = Math.floor(v * 0.8);
    });

    const respawnAt = location === 'stronghold' ? 'stronghold' : (lastCheckpoint || 'stronghold');

    set({
      playerHP:       Math.floor(playerMaxHP * 0.5),
      showDeathModal: false,
      resources:      penalized,
      activeZone:     'world',
      respawnAt,
    });
    SaveSystem.save(get());
  },

  upgradeStructure: (structure) => {
    const { stronghold } = get();
    set({ stronghold: { ...stronghold, [structure]: stronghold[structure] + 1 } });
    SaveSystem.save(get());
  },

  // Fixed: training grounds upgrades now track bonuses separately
  applyTrainingBonus: (atkBonus, defBonus, spdBonus = 0) => {
    const { trainingATKBonus, trainingDEFBonus, playerATK, playerDEF, playerSPD } = get();
    set({
      trainingATKBonus: (trainingATKBonus || 0) + atkBonus,
      trainingDEFBonus: (trainingDEFBonus || 0) + defBonus,
      playerATK: playerATK + atkBonus,
      playerDEF: playerDEF + defBonus,
      playerSPD: playerSPD + spdBonus,
    });
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
