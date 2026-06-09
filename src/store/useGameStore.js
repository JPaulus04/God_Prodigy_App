import { create } from 'zustand';
import { SaveSystem } from '../game/systems/SaveSystem';
import { XP_THRESHOLDS } from '../game/config/ItemConfig';

const DEFAULT_STATE = {
  playerName:  '',
  gamePhase:   'menu',
  currentRealm: null,
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

  resources:    { wood: 0, stone: 0, ore: 0, fire_shard: 0, forest_essence: 0, wind_essence: 0, earth_essence: 0, fire_essence: 0, ice_essence: 0, ocean_essence: 0, storm_essence: 0, shadow_essence: 0, lava_essence: 0, void_essence: 0 },

  checkpoints:       [],
  lastCheckpoint:    'stronghold',
  stronghold:        { forge: 0, storage: 0, trainingGrounds: 0 },
  bossesDefeated:    [],
  ascensionProgress: 0,

  // IAP state
  passActive:           false,
  respawnShields:       0,
  ownedSkins:           [],   // e.g. ['shadow_knight', 'gods_chosen']
  activeSkin:           null, // currently equipped skin id
  activeTrail:          null, // currently equipped trail id
  ownedTrail:           null, // active trail id
  ownedTrails:          [],
  extraInventorySlots:  0,
  bossSkipPending:      false, // true after God's Mercy purchase — next portal E triggers skip
  bossSkipUsed:         false,

  killCount:      0,
  totalDamageDealt: 0,

  showInventory:  false,
  showHelpMenu:   false,
  showDeathModal: false,
  savedBossHp: null,
  savedBossPhase: 1,
  showLevelUp:    false,
  showShop:       false,
  showVictory:    false,
  showPrestigeSelect: false,

  // ── Prestige / Legacy ──────────────────────────────────────────
  prestigeLevel:  0,
  prestigeClass:  'warrior',   // current class id
  fragments:      { rune: 0, shard: 0, seal: 0 },
  legacyWeapons:  [],          // array of weapon ids permanently unlocked
  challengeCleared: false,     // did the mini-challenge room fire this run?
};

export const useGameStore = create((set, get) => ({
  ...DEFAULT_STATE,

  setPlayerName:   (name)  => set({ playerName: name }),
  setGamePhase:    (phase) => set(s => ({
    gamePhase: phase,
    // Reset challenge room flag each time a new dungeon run begins
    ...(phase === 'dungeon' ? { challengeCleared: false } : {}),
  })),
  setCurrentRealm: (realm) => set({ currentRealm: realm }),
  advanceTutorial: ()      => set(s => ({ tutorialStep: s.tutorialStep + 1 })),

  addKill:         ()      => set(s => ({ killCount: (s.killCount || 0) + 1 })),
  addDamageDealt:  (dmg)   => set(s => ({ totalDamageDealt: (s.totalDamageDealt || 0) + dmg })),

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
    const { xp, level, passActive } = get();
    amount = passActive ? Math.floor(amount * 1.25) : amount;
    // Prestige class XP bonus (inlined)
    const XP_MULTS = { warrior: 1.0, mage: 1.5, assassin: 1.0, god: 1.75 };
    const xpMult = XP_MULTS[get().prestigeClass || 'warrior'] || 1;
    if (xpMult !== 1) amount = Math.floor(amount * xpMult);
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
    if (stat === 'atk') { updates.playerATK = get().playerATK + 1; updates.playerBaseATK = (get().playerBaseATK || 8) + 1; }
    if (stat === 'def') { updates.playerDEF = get().playerDEF + 1; updates.playerBaseDEF = (get().playerBaseDEF || 4) + 1; }
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
    const { gear, inventory, playerBaseATK, playerBaseDEF, playerBaseSPD, prestigeClass, level } = get();
    let atk = (playerBaseATK || 8);
    let def = (playerBaseDEF || 4);
    let spd = (playerBaseSPD || 5);
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

    // Apply prestige class bonuses
    const CLASS_BONUSES = {
      warrior:  { atkMult: 1.0,  defPerLevel: 2,  spdMult: 1.0,  maxHPMult: 1.15 },
      mage:     { atkMult: 1.2,  defPerLevel: 0,  spdMult: 1.0,  maxHPMult: 0.9  },
      assassin: { atkMult: 1.35, defPerLevel: 0,  spdMult: 1.5,  maxHPMult: 0.85 },
      god:      { atkMult: 1.5,  defPerLevel: 1,  spdMult: 1.3,  maxHPMult: 1.25 },
    };
    const cb = CLASS_BONUSES[prestigeClass || 'warrior'] || CLASS_BONUSES.warrior;
    atk = Math.round(atk * cb.atkMult);
    def = Math.round(def + (cb.defPerLevel * (level || 1)));
    spd = Math.round(spd * cb.spdMult);
    // Apply class max HP multiplier (only on prestige — base is always 100+upgrades)
    const baseHP = 100 + ((level || 1) - 1) * 2; // 2 max HP per level
    const newMaxHP = Math.round(baseHP * (cb.maxHPMult || 1.0));
    const curHP = get().playerHP;
    set({ playerATK: atk, playerDEF: def, playerSPD: spd, equippedAbilityId: abilityId,
          playerMaxHP: newMaxHP, playerHP: Math.min(curHP, newMaxHP) });
  },

  equipItem: (item) => {
    const { gear, inventory } = get();
    const newGear = { ...gear, [item.slot]: item.instanceId };
    set({ gear: newGear });

    const { playerBaseATK, playerBaseDEF, playerBaseSPD, trainingATKBonus, trainingDEFBonus } = get();
    let atk = (playerBaseATK || 8); // base already includes training + stat points
    let def = (playerBaseDEF || 4); // base already includes training + stat points
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
      if (item.instanceId !== instanceId) return item;
      // Apply the right stat based on slot
      if (item.slot === 'weapon')    return { ...item, atk: (item.atk || 0) + 2, upgradeLevel: newLevel };
      if (item.slot === 'armor')     return { ...item, def: (item.def || 0) + 2, upgradeLevel: newLevel };
      if (item.slot === 'accessory') {
        // Boost whichever primary stat the accessory provides; spd items get +1 spd, otherwise +1 def
        if ((item.spd || 0) > 0) return { ...item, spd: (item.spd || 0) + 1, upgradeLevel: newLevel };
        return { ...item, def: (item.def || 0) + 1, upgradeLevel: newLevel };
      }
      return { ...item, upgradeLevel: newLevel };
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
    // Dispatch save toast event
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gp:saved'));
  },


  saveBossCheckpoint: (hp, phase) => {
    set({ savedBossHp: hp, savedBossPhase: phase || 1 });
  },
  clearBossCheckpoint: () => {
    set({ savedBossHp: null, savedBossPhase: 1 });
  },

  respawn: (location) => {
    const { playerMaxHP, resources, lastCheckpoint, gamePhase } = get();
    const penalized = {};
    Object.entries(resources).forEach(([k, v]) => { penalized[k] = Math.floor(v * 0.8); });
    // In realm: 'checkpoint' keeps player in arena (boss HP already saved separately)
    if (location === 'checkpoint' && gamePhase === 'realm') {
      set({ playerHP: Math.floor(playerMaxHP * 0.5), showDeathModal: false, resources: penalized });
      SaveSystem.save(get());
      return;
    }
    // Leaving realm: clear boss checkpoint
    get().clearBossCheckpoint();
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

  // ── IAP Actions ────────────────────────────────────────────────────────────
  grantRespawnShield: (count = 1) => {
    set(s => ({ respawnShields: (s.respawnShields || 0) + count }));
    SaveSystem.save(get());
  },

  useRespawnShield: () => {
    const { respawnShields } = get();
    if (!respawnShields) return false;
    set({ respawnShields: respawnShields - 1 });
    SaveSystem.save(get());
    return true;
  },

  grantStatPoints: (n) => {
    set(s => ({ statPoints: (s.statPoints || 0) + n }));
    SaveSystem.save(get());
  },

  unlockSkin: (skinId) => {
    const { ownedSkins } = get();
    if (!ownedSkins.includes(skinId)) set({ ownedSkins: [...ownedSkins, skinId] });
    SaveSystem.save(get());
  },

  unlockTrail: (trailId) => {
    const { ownedTrails } = get();
    const updated = ownedTrails.includes(trailId) ? ownedTrails : [...ownedTrails, trailId];
    set({ ownedTrails: updated, ownedTrail: trailId });
    SaveSystem.save(get());
  },

  equipSkin: (skinId) => {
    set({ activeSkin: skinId });
    SaveSystem.save(get());
  },
  equipTrail: (trailId) => {
    set({ activeTrail: trailId });
    SaveSystem.save(get());
  },

  expandInventory: (slots) => {
    set(s => ({ extraInventorySlots: (s.extraInventorySlots || 0) + slots }));
    SaveSystem.save(get());
  },

  grantBossSkip: () => {
    set({ bossSkipPending: true });
    SaveSystem.save(get());
  },

  consumeBossSkip: (realmId) => {
    if (!realmId) return;
    get().defeatBoss(realmId);
    set({ bossSkipPending: false, bossSkipUsed: true });
    SaveSystem.save(get());
  },

  activatePass: () => {
    set({ passActive: true });
    SaveSystem.save(get());
  },

  showShop:       false,
  toggleShop:    () => set(s => ({ showShop: !s.showShop })),

  defeatBoss: (bossId) => {
    if (!bossId) return;  // guard against undefined/null realmId
    const { bossesDefeated } = get();
    if (!bossesDefeated.includes(bossId)) {
      const updated = [...bossesDefeated, bossId];
      set({ bossesDefeated: updated, ascensionProgress: updated.length });
      if (updated.length >= 10) {
        // All gods defeated — trigger victory screen after a short delay
        setTimeout(() => set({ showVictory: true }), 1500);
      }
      SaveSystem.save(get());
    }
  },

  toggleInventory: () => set(s => ({ showInventory: !s.showInventory })),
  toggleHelpMenu:  () => set(s => ({ showHelpMenu:  !s.showHelpMenu  })),

  // ── Fragment actions ──────────────────────────────────────────
  addFragment: (type, count = 1) => {
    const { fragments } = get();
    const FRAG_MAX = { rune: 3, shard: 3, seal: 3 };
    const cur = fragments[type] || 0;
    const newVal = Math.min(FRAG_MAX[type] || 3, cur + count);
    set({ fragments: { ...fragments, [type]: newVal } });
    SaveSystem.save(get());
  },

  spendFragments: (cost) => {
    const { fragments } = get();
    // Check affordability
    for (const [type, amt] of Object.entries(cost)) {
      if ((fragments[type] || 0) < amt) return false;
    }
    const updated = { ...fragments };
    for (const [type, amt] of Object.entries(cost)) updated[type] -= amt;
    set({ fragments: updated });
    SaveSystem.save(get());
    return true;
  },

  unlockLegacyWeapon: (weaponId) => {
    const { legacyWeapons } = get();
    if (!legacyWeapons.includes(weaponId)) {
      set({ legacyWeapons: [...legacyWeapons, weaponId] });
      SaveSystem.save(get());
    }
  },

  // ── Prestige actions ──────────────────────────────────────────
  openPrestigeSelect: () => set({ showPrestigeSelect: true }),

  doPrestige: (chosenClass) => {
    const { prestigeLevel, legacyWeapons, fragments } = get();
    const newPrestigeLevel = prestigeLevel + 1;
    SaveSystem.clear();
    // Full reset, preserving only legacy fields
    set({
      playerName:         get().playerName,
      gamePhase:          'world',
      currentRealm:       null,
      savedBossHp:        null,
      savedBossPhase:     1,
      tutorialStep:       4,   // skip tutorial on prestige
      playerHP:           100, playerMaxHP: 100,
      playerBaseATK:      8,   playerBaseDEF: 4, playerBaseSPD: 5,
      playerATK:          8,   playerDEF: 4,     playerSPD: 5,
      level:              1,   xp: 0, xpToNextLevel: 100, statPoints: 0,
      trainingATKBonus:   0,   trainingDEFBonus: 0,
      equippedAbilityId:  null,
      position:           { zone: 'world', x: 800, y: 960 },
      activeZone:         'world',
      respawnAt:          null,
      gear:               { weapon: null, armor: null, accessory: null },
      inventory:          [],  itemUpgrades: {},
      resources:          { wood: 0, stone: 0, ore: 0, fire_shard: 0 },
      checkpoints:        [],  lastCheckpoint: 'stronghold',
      stronghold:         { forge: 0, storage: 0, trainingGrounds: 0 },
      bossesDefeated:     [],  ascensionProgress: 0,
      killCount:          0,   totalDamageDealt: 0,
      // Preserved
      prestigeLevel:      newPrestigeLevel,
      prestigeClass:      chosenClass,
      legacyWeapons,
      fragments,
      passActive:         get().passActive,
      ownedSkins:         get().ownedSkins,
      activeSkin:         get().activeSkin,
      activeTrail:        get().activeTrail,
      ownedTrails:        get().ownedTrails,
      ownedTrail:         get().ownedTrail,
      // UI reset
      showInventory: false, showHelpMenu: false, showDeathModal: false,
      showLevelUp:   false, showShop:     false,
      showVictory:   false, showPrestigeSelect: false,
      challengeCleared: false,
    });
    // recalculateStats must run AFTER prestigeClass is committed to state
    get().recalculateStats();
    SaveSystem.save(get());
  },

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

