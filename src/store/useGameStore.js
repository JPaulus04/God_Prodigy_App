import { create } from 'zustand';
import { SaveSystem } from '../game/systems/SaveSystem';
import { XP_THRESHOLDS } from '../game/config/ItemConfig';

const DEFAULT_STATE = {
  playerName:  '',
  gamePhase:   'menu',
  tutorialStep: 0,

  playerHP:      100,
  playerMaxHP:   100,
  playerBaseATK: 8,
  playerBaseDEF: 4,
  playerBaseSPD: 5,
  playerATK:     8,
  playerDEF:     4,
  playerSPD:     5,

  level:            1,
  xp:               0,
  xpToNextLevel:    100,
  statPoints:       0,
  trainingATKBonus: 0,
  trainingDEFBonus: 0,

  equippedAbilityId:  null,
  // Ability cooldown tracking — read by HUD for the cooldown ring display
  abilityFiredAt:     null,   // timestamp (ms) when ability last fired
  abilityCooldownMs:  0,      // total cooldown duration in ms

  position:      { zone: 'world', x: 800, y: 960 },
  activeZone:    'world',
  respawnAt:     null,

  gear:         { weapon: null, armor: null, accessory: null },
  inventory:    [],
  itemUpgrades: {},

  resources:    { wood: 0, stone: 0, ore: 0, fire_shard: 0 },

  checkpoints:       [],
  lastCheckpoint:    'stronghold',
  stronghold:        { forge: 0, storage: 0, trainingGrounds: 0 },
  bossesDefeated:    [],
  ascensionProgress: 0,

  showInventory:  false,
  showHelpMenu:   false,
  showDeathModal: false,
  showLevelUp:    false,
};

export const useGameStore = create((set, get) => ({
  ...DEFAULT_STATE,

  setPlayerName:   (name)  => set({ playerName: name }),
  setGamePhase:    (phase) => set({ gamePhase: phase }),
  advanceTutorial: ()      => set(s => ({ tutorialStep: s.tutorialStep + 1 })),

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

  gainXP: (amount) => {
    const { xp, level } = get();
    if (level >= 30) return;
    const newXP  = xp + amount;
    const nextTh = XP_THRESHOLDS[level] || Infinity;
    if (newXP >= nextTh && level < 30) {
      const newLevel = level + 1;
      set({
        xp:            newXP,
        level:         newLevel,
        xpToNextLevel: XP_THRESHOLDS[newLevel] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1],
        statPoints:    get().statPoints + 3,
        showLevelUp:   true,
      });
    } else {
      set({ xp: newXP });
    }
    SaveSystem.save(get());
  },

  spendStatPoint: (stat) => {
    const { statPoints } = get();
    if (statPoints <= 0) return;
    const updates = { statPoints: statPoints - 1 };
    if (stat === 'atk') updates.playerATK = get().playerATK + 1;
    if (stat === 'def') updates.playerDEF = get().playerDEF + 1;
    if (stat === 'spd') { updates.playerSPD = get().playerSPD + 1; updates.playerBaseSPD = (get().playerBaseSPD || 5) + 1; }
    set(updates);
    SaveSystem.save(get());
  },

  dismissLevelUp: () => set({ showLevelUp: false }),
  openLevelUp:    () => set({ showLevelUp: true }),

  // Called by WorldCanvas when ability fires — updates HUD cooldown ring
  recordAbilityFired: (cooldownSeconds) => {
    set({ abilityFiredAt: Date.now(), abilityCooldownMs: cooldownSeconds * 1000 });
  },

  addResource: (type, amount) => {
    const { resources } = get();
    set({ resources: { ...resources, [type]: (resources[type] || 0) + amount } });
    SaveSystem.save(get());
  },

  spendResource: (type, amount) => {
    const { resources } = get();
    if ((resources[type] || 0) < amount) return false;
    set({ resources: { ...resources, [type]: resources[type] - amount } });
    SaveSystem.save(get());
    return true;
  },

  addItem: (item) => {
    const { inventory, stronghold } = get();
    const maxSlots = 16 + ((stronghold.storage || 0) * 8);
    if (inventory.length >= maxSlots) return false;
    const newItem = {
      ...item,
      instanceId: item.instanceId || `item_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    };
    set({ inventory: [...inventory, newItem] });
    SaveSystem.save(get());
    return true;
  },

  removeItem: (instanceId) => {
    set(s => ({ inventory: s.inventory.filter(i => i.instanceId !== instanceId) }));
    SaveSystem.save(get());
  },

  recalculateStats: () => {
    const { gear, inventory, playerBaseATK, playerBaseDEF, playerBaseSPD, trainingATKBonus, trainingDEFBonus } = get();
    let atk = (playerBaseATK || 8) + (trainingATKBonus || 0);
    let def = (playerBaseDEF || 4) + (trainingDEFBonus || 0);
    let spd = (get().playerBaseSPD || 5);
    let abilityId = null;

    Object.values(gear).forEach(instanceId => {
      if (!instanceId) return;
      const item = inventory.find(i => i.instanceId === instanceId);
      if (!item) return;
      if (item.atk)        atk += item.atk;
      if (item.def)        def += item.def;
      if (item.spd)        spd += item.spd;
      if (item.spdPenalty) spd += item.spdPenalty;
      if (item.slot === 'weapon' && item.abilityId) abilityId = item.abilityId;
    });

    set({ playerATK: atk, playerDEF: def, playerSPD: spd, equippedAbilityId: abilityId });
  },

  equipItem: (item) => {
    const { gear, inventory } = get();
    const newGear = { ...gear, [item.slot]: item.instanceId };
    set({ gear: newGear });

    const { playerBaseATK, playerBaseDEF, playerBaseSPD, trainingATKBonus, trainingDEFBonus } = get();
    let atk = (playerBaseATK || 8) + (trainingATKBonus || 0);
    let def = (playerBaseDEF || 4) + (trainingDEFBonus || 0);
    let spd = (get().playerBaseSPD || 5);
    let abilityId = null;

    const allItems = [...inventory, item];
    Object.values(newGear).forEach(instanceId => {
      if (!instanceId) return;
      const equipped = allItems.find(i => i.instanceId === instanceId);
      if (!equipped) return;
      if (equipped.atk)        atk += equipped.atk;
      if (equipped.def)        def += equipped.def;
      if (equipped.spd)        spd += equipped.spd;
      if (equipped.spdPenalty) spd += equipped.spdPenalty;
      if (equipped.slot === 'weapon' && equipped.abilityId) abilityId = equipped.abilityId;
    });

    set({ playerATK: atk, playerDEF: def, playerSPD: spd, equippedAbilityId: abilityId });
    SaveSystem.save(get());
  },

  unequipItem: (slot) => {
    const { gear } = get();
    set({ gear: { ...gear, [slot]: null } });
    get().recalculateStats();
    SaveSystem.save(get());
  },

  upgradeItem: (instanceId, costPaid) => {
    const { itemUpgrades, inventory } = get();
    const currentLevel = itemUpgrades[instanceId] || 0;
    const newLevel     = currentLevel + 1;
    Object.entries(costPaid).forEach(([res, amt]) => get().spendResource(res, amt));
    const updatedInventory = inventory.map(item => {
      if (item.instanceId !== instanceId || item.slot !== 'weapon') return item;
      return { ...item, atk: (item.atk || 0) + 2, upgradeLevel: newLevel };
    });
    set({ itemUpgrades: { ...itemUpgrades, [instanceId]: newLevel }, inventory: updatedInventory });
    if (Object.values(get().gear).includes(instanceId)) get().recalculateStats();
    SaveSystem.save(get());
  },

  activateCheckpoint: (checkpointId) => {
    const { checkpoints } = get();
    if (!checkpoints.includes(checkpointId)) set({ checkpoints: [...checkpoints, checkpointId] });
    set({ lastCheckpoint: checkpointId });
    SaveSystem.save(get());
  },

  respawn: (location) => {
    const { playerMaxHP, resources, lastCheckpoint } = get();
    const penalized = {};
    Object.entries(resources).forEach(([k, v]) => { penalized[k] = Math.floor(v * 0.8); });
    set({
      playerHP: Math.floor(playerMaxHP * 0.5), showDeathModal: false,
      resources: penalized, activeZone: 'world',
      respawnAt: location === 'stronghold' ? 'stronghold' : (lastCheckpoint || 'stronghold'),
    });
    SaveSystem.save(get());
  },

  upgradeStructure: (structure) => {
    const { stronghold } = get();
    set({ stronghold: { ...stronghold, [structure]: (stronghold[structure] || 0) + 1 } });
    SaveSystem.save(get());
  },

  applyTrainingBonus: (atkBonus, defBonus, spdBonus = 0) => {
    const { trainingATKBonus, trainingDEFBonus } = get();
    set({ trainingATKBonus: (trainingATKBonus || 0) + atkBonus, trainingDEFBonus: (trainingDEFBonus || 0) + defBonus });
    get().recalculateStats();
    if (spdBonus) set(s => ({ playerSPD: s.playerSPD + spdBonus, playerBaseSPD: (s.playerBaseSPD || 5) + spdBonus }));
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

  toggleInventory: () => set(s => ({ showInventory: !s.showInventory })),
  toggleHelpMenu:  () => set(s => ({ showHelpMenu:  !s.showHelpMenu  })),

  loadSave: () => {
    const saved = SaveSystem.load();
    if (!saved) return;
    if (saved.inventory) {
      saved.inventory = saved.inventory.map((item, i) => ({
        ...item,
        instanceId: item.instanceId || `item_migrated_${i}_${item.id}`,
      }));
    }
    if (saved.gear && saved.inventory) {
      const migrated = { weapon: null, armor: null, accessory: null };
      Object.entries(saved.gear).forEach(([slot, val]) => {
        if (!val) return;
        if (val.startsWith('item_')) { migrated[slot] = val; }
        else {
          const found = saved.inventory.find(i => i.id === val);
          migrated[slot] = found ? found.instanceId : null;
        }
      });
      saved.gear = migrated;
    }
    set(saved);
    if (saved.playerName) set({ gamePhase: 'world' });
    setTimeout(() => get().recalculateStats(), 0);
  },

  resetGame: () => { SaveSystem.clear(); set({ ...DEFAULT_STATE }); },
}));
