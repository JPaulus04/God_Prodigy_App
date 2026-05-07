import { create } from 'zustand';
import { SaveSystem } from '../game/systems/SaveSystem';
import { XP_THRESHOLDS } from '../game/config/ItemConfig';

const DEFAULT_STATE = {
  // ── Identity ─────────────────────────────────────────
  playerName:  '',
  gamePhase:   'menu',
  tutorialStep: 0,

  // ── Core stats ───────────────────────────────────────
  playerHP:      100,
  playerMaxHP:   100,
  playerBaseATK: 8,     // never modified directly — used for recalculation
  playerBaseDEF: 4,
  playerATK:     8,
  playerDEF:     4,
  playerSPD:     5,

  // ── Leveling ─────────────────────────────────────────
  level:           1,
  xp:              0,
  xpToNextLevel:   100,  // XP_THRESHOLDS[1]
  statPoints:      0,    // unspent stat points from leveling up
  trainingATKBonus: 0,   // cumulative bonus from Training Grounds
  trainingDEFBonus: 0,

  // ── Abilities ────────────────────────────────────────
  equippedAbilityId: null,   // set when a weapon is equipped
  abilityCooldown:   0,      // seconds remaining

  // ── Position & World ─────────────────────────────────
  position:      { zone: 'world', x: 800, y: 960 },
  activeZone:    'world',
  respawnAt:     null,

  // ── Gear & Inventory ─────────────────────────────────
  gear: { weapon: null, armor: null, accessory: null },
  // Each inventory item: { instanceId, id, name, slot, type, tier,
  //   rarity, atk, def, spd, abilityId, upgradeLevel, icon, color, ... }
  inventory:   [],
  // upgradeLevel per item instance: { [instanceId]: level }
  itemUpgrades: {},

  // ── Resources ────────────────────────────────────────
  resources: { wood: 0, stone: 0, ore: 0, fire_shard: 0 },

  // ── World progress ────────────────────────────────────
  checkpoints:   [],
  lastCheckpoint: 'stronghold',
  stronghold:    { forge: 0, storage: 0, trainingGrounds: 0 },
  bossesDefeated: [],
  ascensionProgress: 0,

  // ── UI flags ─────────────────────────────────────────
  showInventory:  false,
  showHelpMenu:   false,
  showDeathModal: false,
  showLevelUp:    false,   // triggers level-up modal
};

export const useGameStore = create((set, get) => ({
  ...DEFAULT_STATE,

  // ── Identity ─────────────────────────────────────────
  setPlayerName:   (name)  => set({ playerName: name }),
  setGamePhase:    (phase) => set({ gamePhase: phase }),
  advanceTutorial: ()      => set(s => ({ tutorialStep: s.tutorialStep + 1 })),

  // ── Combat ───────────────────────────────────────────
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

  // ── XP & Leveling ────────────────────────────────────
  gainXP: (amount) => {
    const { xp, level } = get();
    if (level >= XP_THRESHOLDS.length) return; // at cap

    const newXP = xp + amount;
    const nextThreshold = XP_THRESHOLDS[level] || Infinity;

    if (newXP >= nextThreshold) {
      // Level up!
      const newLevel = level + 1;
      const nextNext = XP_THRESHOLDS[newLevel] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
      set({
        xp:            newXP,
        level:         newLevel,
        xpToNextLevel: nextNext,
        statPoints:    get().statPoints + 3,  // 3 points per level
        showLevelUp:   true,
      });
    } else {
      set({ xp: newXP });
    }
    SaveSystem.save(get());
  },

  spendStatPoint: (stat) => {
    // stat: 'atk' | 'def' | 'spd'
    const { statPoints } = get();
    if (statPoints <= 0) return;
    const updates = { statPoints: statPoints - 1 };
    if (stat === 'atk') updates.playerATK = get().playerATK + 1;
    if (stat === 'def') updates.playerDEF = get().playerDEF + 1;
    if (stat === 'spd') updates.playerSPD = get().playerSPD + 1;
    set(updates);
    SaveSystem.save(get());
  },

  dismissLevelUp: () => set({ showLevelUp: false }),

  // ── Resources ────────────────────────────────────────
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

  // ── Inventory ────────────────────────────────────────
  addItem: (item) => {
    const { inventory } = get();
    const maxSlots = 16 + ((get().stronghold.storage || 0) * 8);
    if (inventory.length >= maxSlots) return false;
    // Ensure every item has an instanceId
    const newItem = { ...item, instanceId: item.instanceId || `item_${Date.now()}_${Math.random().toString(36).slice(2,6)}` };
    set({ inventory: [...inventory, newItem] });
    SaveSystem.save(get());
    return true;
  },

  removeItem: (instanceId) => {
    set(s => ({ inventory: s.inventory.filter(i => i.instanceId !== instanceId) }));
    SaveSystem.save(get());
  },

  // Fixed: recalculates stats from base + training + gear to prevent stacking
  equipItem: (item) => {
    const { gear, inventory, playerBaseATK, playerBaseDEF, trainingATKBonus, trainingDEFBonus, playerSPD } = get();
    const newGear = { ...gear, [item.slot]: item.instanceId };
    set({ gear: newGear });

    // Recalculate from base
    let atk = (playerBaseATK || 8) + (trainingATKBonus || 0);
    let def = (playerBaseDEF || 4) + (trainingDEFBonus || 0);
    let spd = playerSPD;

    // Add stats from ALL currently equipped items (using new gear state)
    const allItems = [...inventory, item]; // include the new item in case it's not in inventory yet
    Object.values(newGear).forEach(instanceId => {
      if (!instanceId) return;
      const equipped = allItems.find(i => i.instanceId === instanceId);
      if (!equipped) return;
      if (equipped.atk) atk += equipped.atk;
      if (equipped.def) def += equipped.def;
      if (equipped.spd) spd += equipped.spd;
      if (equipped.spdPenalty) spd += equipped.spdPenalty;
    });

    // Set ability from weapon type
    const abilityId = item.abilityId || null;

    set({ playerATK: atk, playerDEF: def, playerSPD: spd, equippedAbilityId: abilityId });
    SaveSystem.save(get());
  },

  unequipItem: (slot) => {
    const { gear, inventory, playerBaseATK, playerBaseDEF, trainingATKBonus, trainingDEFBonus } = get();
    const newGear = { ...gear, [slot]: null };
    set({ gear: newGear });

    let atk = (playerBaseATK || 8) + (trainingATKBonus || 0);
    let def = (playerBaseDEF || 4) + (trainingDEFBonus || 0);
    let spd = get().playerSPD;

    Object.values(newGear).forEach(instanceId => {
      if (!instanceId) return;
      const equipped = inventory.find(i => i.instanceId === instanceId);
      if (!equipped) return;
      if (equipped.atk) atk += equipped.atk;
      if (equipped.def) def += equipped.def;
      if (equipped.spd) spd += equipped.spd;
      if (equipped.spdPenalty) spd += equipped.spdPenalty;
    });

    const weaponInstanceId = newGear.weapon;
    const weapon = weaponInstanceId ? inventory.find(i => i.instanceId === weaponInstanceId) : null;
    set({ playerATK: atk, playerDEF: def, playerSPD: spd, equippedAbilityId: weapon?.abilityId || null });
    SaveSystem.save(get());
  },

  // ── Item Upgrading ────────────────────────────────────
  upgradeItem: (instanceId, costPaid) => {
    const { itemUpgrades, inventory } = get();
    const currentLevel = itemUpgrades[instanceId] || 0;
    const newLevel = currentLevel + 1;
    const newUpgrades = { ...itemUpgrades, [instanceId]: newLevel };

    // Deduct resources
    Object.entries(costPaid).forEach(([res, amt]) => {
      get().spendResource(res, amt);
    });

    // Update the item's ATK in inventory if it's a weapon
    const updatedInventory = inventory.map(item => {
      if (item.instanceId !== instanceId) return item;
      if (item.slot !== 'weapon') return { ...item };
      // Recalc ATK with new upgrade level
      const { computeWeaponATK } = require('../game/config/ItemConfig');
      const newATK = computeWeaponATK(item.type, item.tier, item.rarity, newLevel);
      return { ...item, atk: newATK, upgradeLevel: newLevel };
    });

    set({ itemUpgrades: newUpgrades, inventory: updatedInventory });

    // If upgraded item is equipped, recalculate player stats
    const { gear } = get();
    if (Object.values(gear).includes(instanceId)) {
      const item = updatedInventory.find(i => i.instanceId === instanceId);
      if (item) get().equipItem(item);
    }

    SaveSystem.save(get());
  },

  // ── Checkpoints ──────────────────────────────────────
  activateCheckpoint: (checkpointId) => {
    const { checkpoints } = get();
    if (!checkpoints.includes(checkpointId)) {
      set({ checkpoints: [...checkpoints, checkpointId] });
    }
    set({ lastCheckpoint: checkpointId });
    SaveSystem.save(get());
  },

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

  // ── Stronghold ───────────────────────────────────────
  upgradeStructure: (structure) => {
    const { stronghold } = get();
    set({ stronghold: { ...stronghold, [structure]: (stronghold[structure] || 0) + 1 } });
    SaveSystem.save(get());
  },

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

  // ── Progression ──────────────────────────────────────
  defeatBoss: (bossId) => {
    const { bossesDefeated } = get();
    if (!bossesDefeated.includes(bossId)) {
      const updated = [...bossesDefeated, bossId];
      set({ bossesDefeated: updated, ascensionProgress: updated.length });
      SaveSystem.save(get());
    }
  },

  // ── UI ───────────────────────────────────────────────
  toggleInventory: () => set(s => ({ showInventory: !s.showInventory })),
  toggleHelpMenu:  () => set(s => ({ showHelpMenu:  !s.showHelpMenu  })),

  // ── Save / Load ───────────────────────────────────────
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
