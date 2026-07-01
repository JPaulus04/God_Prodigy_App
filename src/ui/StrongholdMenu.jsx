// V106-STRONGHOLD-INTERACTION-AND-MENU-SPLIT-REV-001
import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import LegacyArmory from './LegacyArmory';
import {
  WEAPON_RECIPES, ARMOR_ITEMS, ACCESSORY_ITEMS,
  UPGRADE_COSTS, RARITY, computeWeaponATK,
} from '../game/config/ItemConfig';

// ── Structures config ────────────────────────────────────────────────────
const STRUCTURES = {
  forge: {
    name: 'Forge', icon: '🔥',
    description: 'Craft weapons and elemental gear.',
    levels: [
      { cost: { wood: 5,  stone: 3        }, benefit: 'Unlock basic weapon crafting' },
      { cost: { wood: 12, stone: 8,  ore: 3 }, benefit: 'Craft steel-tier weapons'    },
      { cost: { wood: 20, stone: 15, ore: 8 }, benefit: 'Craft elemental weapons'     },
    ],
  },
  storage: {
    name: 'Storage House', icon: '📦',
    description: 'Store more resources and gear.',
    levels: [
      { cost: { wood: 8            }, benefit: '+8 inventory slots'      },
      { cost: { wood: 15, stone: 5 }, benefit: '+16 inventory slots total'},
    ],
  },
  trainingGrounds: {
    name: 'Training Grounds', icon: '⚔️',
    description: 'Sharpen your combat stats.',
    levels: [
      { cost: { stone: 5,  ore: 2 }, benefit: '+2 ATK, +1 DEF' },
      { cost: { stone: 10, ore: 6 }, benefit: '+3 ATK, +2 DEF, +1 SPD' },
    ],
  },
  prestigeForge: {
    name: 'Prestige Forge', icon: '🔱',
    description: 'Unlocked after completing the full god path and ascending. Forge balanced legacy weapons.',
    prestige: true,
    minGods: 10,
    levels: [
      { cost: { ore: 30, stone: 20, fire_shard: 3 }, benefit: 'Unlock God-tier weapon crafting' },
      { cost: { ore: 60, stone: 40, fire_shard: 8 }, benefit: 'Unlock Legendary crafting + Divine armor' },
    ],
  },
};

const PRESTIGE_WEAPON_RECIPES = [
  { id: 'god_sword',    name: 'Godbane Sword',    type: 'sword',  tier: 'god', rarity: 'legendary', icon: '⚔️', cost: { ore: 25, fire_shard: 4 }, forgeLevel: 3, prestigeLevel: 1 },
  { id: 'god_hammer',   name: 'Titan Hammer',      type: 'hammer', tier: 'god', rarity: 'legendary', icon: '🔨', cost: { ore: 30, fire_shard: 5 }, forgeLevel: 3, prestigeLevel: 1 },
  { id: 'god_bow',      name: 'Divine Arc',         type: 'bow',    tier: 'god', rarity: 'legendary', icon: '🏹', cost: { ore: 20, fire_shard: 4 }, forgeLevel: 3, prestigeLevel: 1 },
  { id: 'god_dagger',   name: 'Void Fang',          type: 'dagger', tier: 'god', rarity: 'legendary', icon: '🔪', cost: { ore: 18, fire_shard: 3 }, forgeLevel: 3, prestigeLevel: 1 },
  { id: 'god_staff',    name: 'Staff of Nihilus',   type: 'staff',  tier: 'god', rarity: 'legendary', icon: '🪄', cost: { ore: 22, fire_shard: 5 }, forgeLevel: 3, prestigeLevel: 1 },
];

const PRESTIGE_ARMOR = [
  { id: 'divine_plate', name: 'Divine Plate',  slot: 'armor', tier: 'god', rarity: 'legendary', icon: '🛡', def: 80, craftCost: { ore: 35, stone: 25, fire_shard: 6 }, forgeLevel: 3, prestigeLevel: 2 },
  { id: 'void_cloak',   name: 'Void Cloak',    slot: 'armor', tier: 'god', rarity: 'legendary', icon: '🌑', def: 55, spd: 8, craftCost: { ore: 28, stone: 18, fire_shard: 5 }, forgeLevel: 3, prestigeLevel: 2 },
];

const TRAINING_BONUSES = [
  { atk: 2, def: 1, spd: 0 },
  { atk: 3, def: 2, spd: 1 },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function ResourceCost({ cost, resources }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
      {Object.entries(cost).map(([res, amt]) => {
        const have = resources[res] ?? 0;
        const ok   = have >= amt;
        return (
          <span key={res} style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 8,
            background: ok ? '#1a3a1a' : '#3a1a1a',
            color:      ok ? '#7ed321' : '#e74c3c',
            border:    `1px solid ${ok ? '#7ed32166' : '#e74c3c66'}`,
          }}>
            {res}: {have}/{amt}
          </span>
        );
      })}
    </div>
  );
}

function RarityBadge({ rarity }) {
  const r = RARITY[rarity] || RARITY.common;
  return (
    <span style={{
      fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5,
      color: r.color, marginLeft: 6,
    }}>
      {'★'.repeat(r.stars)}
    </span>
  );
}

const WEAPON_TYPE_ICONS = {
  sword: '⚔️', hammer: '🔨', bow: '🏹', dagger: '🔪', staff: '🪄',
};

const WEAPON_TYPE_DESC = {
  sword:  'Balanced · Whirlwind ability',
  hammer: 'Slow, high damage · Ground Slam ability',
  bow:    'Ranged attacks · Power Shot ability',
  dagger: 'Very fast · Flurry ability',
  staff:  'Elemental · Arcane Burst ability',
};

// ── Main component ────────────────────────────────────────────────────────
export default function StrongholdMenu() {
  const {
    stronghold, resources, inventory,
    upgradeStructure, spendResource, addItem, equipItem,
    applyTrainingBonus, setGamePhase, recoverPlayer,
    playerATK, playerDEF, playerSPD, playerHP, playerMaxHP,
    bossesDefeated, legacyWeapons, prestigeLevel, fullGodPathCompleted, hasPrestigeForgeUnlocked,
    strongholdBuilding,
  } = useGameStore();

  // Which building opened the menu — drives header + tabs
  const activeBuilding = strongholdBuilding || 'hall';

  const [tab,        setTab]        = useState('build');
  const [craftTab,   setCraftTab]   = useState('weapons');
  const [weaponType, setWeaponType] = useState(null); // null = show type picker
  const [upgradeItem, setUpgradeItem] = useState(null); // item selected for upgrade
  const [showArmory,  setShowArmory]  = useState(false);

  const forgeLevel    = stronghold.forge ?? 0;
  const godsDefeated  = (bossesDefeated || []).length;
  const prestigeForgeLevel = stronghold.prestigeForge ?? 0;
  const prestigeForgeUnlocked = typeof hasPrestigeForgeUnlocked === 'function'
    ? hasPrestigeForgeUnlocked()
    : ((prestigeLevel || 0) >= 1 && !!fullGodPathCompleted);

  // ── Build tab handlers ────────────────────────────────────────────────
  const handleUpgrade = (structure) => {
    const level     = stronghold[structure] ?? 0;
    const def       = STRUCTURES[structure];
    if (level >= def.levels.length) return;
    const cost      = def.levels[level].cost;
    const canAfford = Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(cost).forEach(([r, a]) => spendResource(r, a));
    upgradeStructure(structure);
    if (structure === 'trainingGrounds') {
      const bonus = TRAINING_BONUSES[level];
      if (bonus) applyTrainingBonus(bonus.atk, bonus.def, bonus.spd);
    }
  };

  // ── Craft prestige weapon ────────────────────────────────────────────
  const handleCraftPrestigeWeapon = (recipe) => {
    if (prestigeLevel < recipe.prestigeLevel) return;
    const canAfford = Object.entries(recipe.cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(recipe.cost).forEach(([r, a]) => spendResource(r, a));
    const ABILITY = { sword: 'whirlwind', hammer: 'ground_slam', bow: 'power_shot', dagger: 'flurry', staff: 'arcane_burst' };
    const item = {
      id: recipe.id, name: recipe.name, slot: 'weapon',
      type: recipe.type, tier: recipe.tier, rarity: recipe.rarity,
      atk: Math.round({ sword:8, hammer:12, bow:7, dagger:5, staff:8 }[recipe.type] * 6.0 * 3.0),
      abilityId: ABILITY[recipe.type],
      instanceId: `item_${Date.now()}_${recipe.id}`,
      upgradeLevel: 0,
    };
    addItem(item);
  };

  const handleCraftPrestigeArmor = (armorDef) => {
    if (prestigeLevel < armorDef.prestigeLevel) return;
    const canAfford = Object.entries(armorDef.craftCost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(armorDef.craftCost).forEach(([r, a]) => spendResource(r, a));
    addItem({ id: armorDef.id, name: armorDef.name, slot: 'armor', tier: armorDef.tier,
      rarity: armorDef.rarity, def: armorDef.def, spd: armorDef.spd || 0,
      instanceId: `item_${Date.now()}_${armorDef.id}` });
  };

  // ── Craft weapon ──────────────────────────────────────────────────────
  const handleCraftWeapon = (recipe) => {
    if (forgeLevel < (recipe.forgeLevel || 0)) return;
    const canAfford = Object.entries(recipe.cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(recipe.cost).forEach(([r, a]) => spendResource(r, a));
    const atk  = computeWeaponATK(recipe.type, recipe.tier, recipe.rarity, 0);
    const ABILITY = { sword: 'whirlwind', hammer: 'ground_slam', bow: 'power_shot', dagger: 'flurry', staff: 'arcane_burst' };
    const item = {
      id:         recipe.id,
      name:       recipe.name,
      slot:       'weapon',
      type:       recipe.type,
      tier:       recipe.tier,
      rarity:     recipe.rarity,
      atk,
      abilityId:  ABILITY[recipe.type],
      instanceId: `item_${Date.now()}_${recipe.type}`,
      upgradeLevel: 0,
    };
    addItem(item);
  };

  // ── Craft armor ───────────────────────────────────────────────────────
  const handleCraftArmor = (armorDef) => {
    if (forgeLevel < (armorDef.forgeLevel || 0)) return;
    const cost      = armorDef.craftCost;
    const canAfford = Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(cost).forEach(([r, a]) => spendResource(r, a));
    const item = {
      id:         armorDef.id,
      name:       armorDef.name,
      slot:       'armor',
      tier:       armorDef.tier,
      rarity:     armorDef.rarity,
      def:        armorDef.def,
      instanceId: `item_${Date.now()}_${armorDef.id}`,
    };
    addItem(item);
  };

  // ── Craft accessory ───────────────────────────────────────────────────
  const handleCraftAccessory = (accDef) => {
    if (forgeLevel < (accDef.forgeLevel || 0)) return;
    const cost      = accDef.craftCost;
    const canAfford = Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    Object.entries(cost).forEach(([r, a]) => spendResource(r, a));
    const item = {
      id:         accDef.id,
      name:       accDef.name,
      slot:       'accessory',
      rarity:     accDef.rarity,
      atk:        accDef.atk,
      def:        accDef.def,
      spd:        accDef.spd,
      instanceId: `item_${Date.now()}_${accDef.id}`,
    };
    addItem(item);
  };

  // ── Upgrade gear ──────────────────────────────────────────────────────
  const getUpgradeLevel = (item) => item.upgradeLevel || 0;
  const getMaxUpgrade   = (item) => (RARITY[item.rarity]?.maxUpgrade || 3);

  const handleUpgradeItem = (item) => {
    const level = getUpgradeLevel(item);
    const max   = getMaxUpgrade(item);
    if (level >= max) return;
    const cost = UPGRADE_COSTS[level + 1];
    if (!cost) return;
    const canAfford = Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
    if (!canAfford) return;
    useGameStore.getState().upgradeItem(item.instanceId, cost);
  };

  // ── Styles ────────────────────────────────────────────────────────────
  const tabStyle = (active) => ({
    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 'bold',
    background:   active ? '#d4af37' : '#1a1a2e',
    color:        active ? '#0d0d1a' : '#777',
    borderBottom: active ? '2px solid #d4af37' : '2px solid transparent',
  });

  const subTabStyle = (active) => ({
    flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 'bold',
    background:   active ? '#ffffff15' : 'transparent',
    color:        active ? '#fff' : '#555',
    borderBottom: active ? '1px solid #d4af37' : '1px solid transparent',
  });

  // ── Upgradeable items ─────────────────────────────────────────────────
  const upgradeableItems = inventory.filter(i =>
    i.slot === 'weapon' || i.slot === 'armor'
  );

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 150,
      background: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a3a 100%)',
      display: 'flex', flexDirection: 'column', color: '#fff', overflowY: 'auto',
    }}>
      {/* Building identity config */}
      {(() => {
        const BLDG_META = {
          hall:     { icon: '⚒️',  title: 'Crafting Hall', sub: 'Recipes · Materials · Create',              accent: '#d4af37', tabs: ['craft','upgrade'] },
          forge:    { icon: '🔥',  title: 'Forge',         sub: 'Upgrade · Enhance · Refine',                accent: '#e67e22', tabs: ['upgrade','craft'] },
          market:   { icon: '🛒',  title: 'Market',        sub: 'Buy · Sell · Daily Stock · Trader',          accent: '#3498db', tabs: ['market','build']  },
          barracks: { icon: '⚔️',  title: 'Barracks',      sub: 'Train · Combat Mastery · Skills',            accent: '#27ae60', tabs: ['train','build']  },
          shrine:   { icon: '✨',  title: 'Shrine',        sub: 'Ascend · Blessings · Divine Power',          accent: '#9b59b6', tabs: ['ascend','build']  },
        };
        // Store computed meta for use in rest of render
        window.__SM_META = BLDG_META[activeBuilding] || BLDG_META.hall;
        return null;
      })()}
      {/* Header — padded below status bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 'calc(env(safe-area-inset-top) + 52px)',
        paddingBottom: 14, paddingLeft: 20, paddingRight: 20,
        borderBottom: `1px solid ${(window.__SM_META||{accent:'#d4af37'}).accent}33`,
        background: '#0d0d1a',
        flexShrink: 0,
      }}>
        <div>
          <h2 style={{ color: (window.__SM_META||{accent:'#d4af37'}).accent, fontSize: 22, margin: 0, letterSpacing: 1 }}>
            {(window.__SM_META||{icon:'🏰'}).icon} {(window.__SM_META||{title:'Stronghold'}).title}
          </h2>
          <p style={{ color: '#888', fontSize: 11, margin: '3px 0 0' }}>
            {(window.__SM_META||{sub:'Build · Craft · Upgrade · Recover'}).sub}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowArmory(true)} style={{
            background: (prestigeLevel || 0) >= 1 ? '#1a120022' : '#111',
            border: `2px solid ${(prestigeLevel || 0) >= 1 ? '#d4af3766' : '#333'}`,
            color: prestigeForgeUnlocked ? '#d4af37' : '#777',
            borderRadius: 12,
            padding: '10px 14px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            🔱 Forge
            {(legacyWeapons || []).length > 0 && (
              <span style={{
                background: '#d4af37', color: '#000', borderRadius: 8,
                fontSize: 9, padding: '1px 5px', fontWeight: 'bold',
              }}>{(legacyWeapons || []).length}</span>
            )}
          </button>
          <button onClick={() => setGamePhase('world')} style={{
            background: '#d4af3722', border: '2px solid #d4af37',
            color: '#d4af37', borderRadius: 12, padding: '10px 20px',
            cursor: 'pointer', fontSize: 15, fontWeight: 'bold',
          }}>← Return</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 16, padding: '10px 20px',
        background: '#ffffff08', borderBottom: '1px solid #ffffff11', alignItems: 'center',
      }}>
        {[
          { label: 'ATK', val: playerATK, col: '#e74c3c' },
          { label: 'DEF', val: playerDEF, col: '#3498db' },
          { label: 'SPD', val: playerSPD, col: '#2ecc71' },
          { label: 'HP',  val: `${playerHP}/${playerMaxHP}`, col: '#ff6b6b' },
        ].map(({ label, val, col }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: label === 'HP' ? 58 : 36 }}>
            <div style={{ color: col,    fontSize: label === 'HP' ? 15 : 18, fontWeight: 'bold' }}>{val}</div>
            <div style={{ color: '#555', fontSize: 10 }}>{label}</div>
          </div>
        ))}
        <button onClick={recoverPlayer} disabled={playerHP >= playerMaxHP} style={{
          marginLeft: 4,
          background: playerHP >= playerMaxHP ? '#ffffff08' : '#1a3a1a',
          border: playerHP >= playerMaxHP ? '1px solid #ffffff18' : '1px solid #2ecc71',
          color: playerHP >= playerMaxHP ? '#666' : '#2ecc71',
          borderRadius: 10,
          padding: '7px 10px',
          fontSize: 12,
          fontWeight: 'bold',
          cursor: playerHP >= playerMaxHP ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
        }}>
          ❤️ Recover
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {[{ k: 'wood', icon: '🪵' }, { k: 'stone', icon: '🪨' }, { k: 'ore', icon: '⛏' }].map(({ k, icon }) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: '#ffffff0a', padding: '4px 8px', borderRadius: 8,
            }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{resources[k] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Building-specific tabs */}
      {(() => {
        const BLDG_TABS = {
          hall:     [{ id:'craft',   label:'Craft'    }, { id:'upgrade', label:'Upgrade'  }, { id:'build',   label:'Upgrade Bldg' }],
          forge:    [{ id:'upgrade', label:'Upgrade'  }, { id:'craft',   label:'Craft'    }, { id:'build',   label:'Enhance Bldg' }],
          market:   [{ id:'market',  label:'Market'   }, { id:'build',   label:'Upgrade Bldg' }],
          barracks: [{ id:'train',   label:'Train'    }, { id:'build',   label:'Upgrade Bldg' }],
          shrine:   [{ id:'ascend',  label:'Ascend'   }, { id:'build',   label:'Upgrade Bldg' }],
        };
        const tabs = BLDG_TABS[activeBuilding] || BLDG_TABS.hall;
        const accent = (window.__SM_META||{accent:'#d4af37'}).accent;
        const activeFallback = tabs.some(t=>t.id===tab) ? tab : tabs[0].id;
        if (activeFallback !== tab) setTab(activeFallback);
        return (
          <div style={{ display: 'flex', borderBottom: '1px solid #222' }}>
            {tabs.map(t => (
              <button key={t.id} style={{
                flex:1, padding:'10px 0', border:'none', cursor:'pointer',
                fontSize:13, fontWeight:'bold',
                background: tab===t.id ? accent+'22' : '#1a1a2e',
                color: tab===t.id ? accent : '#777',
                borderBottom: `2px solid ${tab===t.id ? accent : 'transparent'}`,
              }} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        );
      })()}

      <div style={{ padding: 16, flex: 1, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>

        {/* ── MARKET TAB (Market building) ── */}
        {tab === 'market' && (
          <div>
            <h3 style={{ color: '#3498db', margin: '0 0 14px' }}>🛒 Market</h3>
            <div style={{ color: '#aaa', fontSize: 12, marginBottom: 14 }}>
              Trade resources, buy consumables, and restock your supplies.
            </div>
            {/* Daily stock — buy health potions with ore */}
            {[
              { id:'potion_hp',  name:'Health Potion',  icon:'❤️', cost:{ ore:2 }, desc:'Restores 40 HP in combat' },
              { id:'potion_str', name:'Strength Elixir', icon:'⚔️', cost:{ ore:4 }, desc:'+3 ATK for next realm run' },
              { id:'wood_bundle',name:'Wood Bundle x5',  icon:'🪵', cost:{ ore:3 }, desc:'5 wood for building upgrades' },
            ].map(item => {
              const canBuy = Object.entries(item.cost).every(([r,a])=>(resources[r]??0)>=a);
              return (
                <div key={item.id} style={{
                  background:'#ffffff08', border:'1px solid #3498db22',
                  borderRadius:10, padding:12, marginBottom:10,
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <div>
                    <div style={{fontWeight:'bold'}}>{item.icon} {item.name}</div>
                    <div style={{color:'#777',fontSize:11,marginTop:2}}>{item.desc}</div>
                    <ResourceCost cost={item.cost} resources={resources} />
                  </div>
                  <button onClick={()=>{
                    if(!canBuy) return;
                    Object.entries(item.cost).forEach(([r,a])=>spendResource(r,a));
                    if(item.id==='wood_bundle') Object.keys(resources).includes('wood') && spendResource('wood',-5);
                  }} disabled={!canBuy} style={{
                    background:canBuy?'#3498db':'#2a2a2a',
                    color:canBuy?'#fff':'#555',
                    border:'none',borderRadius:8,padding:'8px 14px',
                    cursor:canBuy?'pointer':'not-allowed',fontWeight:'bold',fontSize:12,
                  }}>Buy</button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TRAIN TAB (Barracks building) ── */}
        {tab === 'train' && (
          <div>
            <h3 style={{ color: '#27ae60', margin: '0 0 14px' }}>⚔️ Barracks Training</h3>
            <div style={{ color: '#aaa', fontSize: 12, marginBottom: 14 }}>
              Sharpen your combat skills. Training bonuses are permanent.
            </div>
            {Object.entries(STRUCTURES).filter(([k])=>k==='trainingGrounds').map(([key, def]) => {
              const level = stronghold[key] ?? 0;
              const maxed = level >= def.levels.length;
              const nextTier = def.levels[level];
              const canAfford = !maxed && nextTier && Object.entries(nextTier.cost).every(([r,a])=>(resources[r]??0)>=a);
              return (
                <div key={key} style={{
                  background:'#0a2010', border:'1px solid #27ae6033',
                  borderRadius:10, padding:14, marginBottom:12,
                }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:'bold',color:'#27ae60'}}>
                        {def.icon} {def.name}
                        <span style={{color:'#555',fontSize:12,marginLeft:8}}>Lv {level}/{def.levels.length}</span>
                      </div>
                      <div style={{color:'#777',fontSize:11,marginTop:2}}>{def.description}</div>
                      {!maxed && nextTier && <div style={{color:'#27ae60',fontSize:11,marginTop:4}}>Next: {nextTier.benefit}</div>}
                      {maxed && <div style={{color:'#2ecc71',fontSize:11,marginTop:4}}>✓ Fully Trained</div>}
                      {!maxed && nextTier && <ResourceCost cost={nextTier.cost} resources={resources} />}
                    </div>
                    {!maxed && (
                      <button onClick={()=>handleUpgrade(key)} disabled={!canAfford} style={{
                        marginLeft:12, padding:'10px 14px', borderRadius:8, border:'none',
                        cursor:canAfford?'pointer':'not-allowed',
                        background:canAfford?'#27ae60':'#2a2a2a',
                        color:canAfford?'#fff':'#555',
                        fontSize:13, fontWeight:'bold', flexShrink:0,
                      }}>Train</button>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{background:'#ffffff08',border:'1px solid #27ae6022',borderRadius:10,padding:14}}>
              <div style={{color:'#27ae60',fontWeight:'bold',marginBottom:6}}>⚔️ Combat Stats</div>
              <div style={{display:'flex',gap:20}}>
                {[{l:'ATK',v:playerATK,c:'#e74c3c'},{l:'DEF',v:playerDEF,c:'#3498db'},{l:'SPD',v:playerSPD,c:'#2ecc71'}].map(s=>(
                  <div key={s.l} style={{textAlign:'center'}}>
                    <div style={{color:s.c,fontSize:20,fontWeight:'bold'}}>{s.v}</div>
                    <div style={{color:'#555',fontSize:10}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ASCEND TAB (Shrine building) ── */}
        {tab === 'ascend' && (
          <div>
            <h3 style={{ color: '#9b59b6', margin: '0 0 14px' }}>✨ Shrine of Ascension</h3>
            <div style={{ color: '#aaa', fontSize: 12, marginBottom: 14 }}>
              Commune with the divine. Permanent blessings await those who have proven themselves.
            </div>
            <div style={{background:'#120820',border:'1px solid #9b59b633',borderRadius:10,padding:14,marginBottom:12}}>
              <div style={{color:'#9b59b6',fontWeight:'bold',fontSize:14,marginBottom:8}}>✨ Divine Status</div>
              <div style={{display:'flex',gap:20,marginBottom:10}}>
                <div style={{textAlign:'center'}}>
                  <div style={{color:'#d4af37',fontSize:20,fontWeight:'bold'}}>{(bossesDefeated||[]).length}</div>
                  <div style={{color:'#555',fontSize:10}}>Gods Slain</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{color:'#9b59b6',fontSize:20,fontWeight:'bold'}}>{prestigeLevel||0}</div>
                  <div style={{color:'#555',fontSize:10}}>Prestige</div>
                </div>
              </div>
              {(prestigeLevel||0) === 0 && (bossesDefeated||[]).length < 10 && (
                <div style={{color:'#888',fontSize:12}}>
                  Defeat all 10 realm gods to unlock true ascension. ({(bossesDefeated||[]).length}/10 defeated)
                </div>
              )}
              {(bossesDefeated||[]).length >= 10 && (prestigeLevel||0) === 0 && (
                <div style={{color:'#d4af37',fontSize:12}}>
                  ✦ You are ready to ascend. The path to divinity is open.
                </div>
              )}
              {(prestigeLevel||0) >= 1 && (
                <div style={{color:'#d4af37',fontSize:12}}>
                  ✦ Ascended. The Prestige Forge is unlocked.
                </div>
              )}
            </div>
            {showArmory && <LegacyArmory onClose={()=>setShowArmory(false)} />}
            {!showArmory && (bossesDefeated||[]).length >= 10 && (
              <button onClick={()=>setShowArmory(true)} style={{
                width:'100%', padding:'14px 0', background:'linear-gradient(135deg,#1a1000,#2a1500)',
                border:'2px solid #d4af37', borderRadius:12, color:'#d4af37',
                fontSize:15, fontWeight:'bold', cursor:'pointer',
              }}>🔱 Open Legacy Armory</button>
            )}
          </div>
        )}

        {/* ── BUILD TAB ── */}
        {tab === 'build' && (
          <div style={{
            background: '#102015', border: '1px solid #2ecc7155',
            borderRadius: 10, padding: 14, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 'bold', color: '#2ecc71' }}>❤️ Recovery Station</div>
                <div style={{ color: '#888', fontSize: 11, marginTop: 3 }}>
                  Restore health to full before returning to battle.
                </div>
              </div>
              <button onClick={recoverPlayer} disabled={playerHP >= playerMaxHP} style={{
                background: playerHP >= playerMaxHP ? '#ffffff08' : '#2ecc71',
                border: 'none', borderRadius: 10,
                color: playerHP >= playerMaxHP ? '#666' : '#061006',
                padding: '10px 14px', fontSize: 13, fontWeight: 'bold',
                cursor: playerHP >= playerMaxHP ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
              }}>
                {playerHP >= playerMaxHP ? 'Full HP' : 'Recover'}
              </button>
            </div>
          </div>
        )}

        {tab === 'build' && Object.entries(STRUCTURES).filter(([key]) => key !== 'prestigeForge').map(([key, def]) => {
          const level     = stronghold[key] ?? 0;
          const maxed     = level >= def.levels.length;
          const nextTier  = def.levels[level];
          const canAfford = !maxed && nextTier &&
            Object.entries(nextTier.cost).every(([r, a]) => (resources[r] ?? 0) >= a);
          return (
            <div key={key} style={{
              background: '#ffffff08', border: '1px solid #ffffff11',
              borderRadius: 10, padding: 14, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 'bold' }}>
                    {def.icon} {def.name}
                    <span style={{ color: '#555', fontSize: 12, marginLeft: 8 }}>Lv {level}/{def.levels.length}</span>
                  </div>
                  <div style={{ color: '#777', fontSize: 11, marginTop: 2 }}>{def.description}</div>
                  {!maxed && nextTier && <div style={{ color: '#d4af37', fontSize: 11, marginTop: 4 }}>Next: {nextTier.benefit}</div>}
                  {maxed && <div style={{ color: '#2ecc71', fontSize: 11, marginTop: 4 }}>✓ Fully Upgraded</div>}
                  {!maxed && nextTier && <ResourceCost cost={nextTier.cost} resources={resources} />}
                </div>
                {!maxed && (
                  <button onClick={() => handleUpgrade(key)} disabled={!canAfford} style={{
                    marginLeft: 12, padding: '10px 14px', borderRadius: 8, border: 'none',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    background: canAfford ? '#d4af37' : '#2a2a2a',
                    color:      canAfford ? '#0d0d1a' : '#555',
                    fontSize: 13, fontWeight: 'bold', flexShrink: 0,
                  }}>Upgrade</button>
                )}
              </div>
            </div>
          );
        })}

        {/* ── PRESTIGE FORGE ACCESS ── */}
        {tab === 'build' && (
          <div style={{
            background: prestigeForgeUnlocked ? 'linear-gradient(135deg, #1a1000, #0d0d1a)' : '#0d0d1a',
            border: `1px solid ${prestigeForgeUnlocked ? '#d4af3755' : '#2a2a2a'}`,
            borderRadius: 10,
            padding: 14,
            marginTop: 4,
            marginBottom: 12,
            opacity: prestigeForgeUnlocked ? 1 : 0.75,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 15,
                  fontWeight: 'bold',
                  color: prestigeForgeUnlocked ? '#d4af37' : '#777',
                }}>
                  🔱 Prestige Forge
                </div>
                <div style={{ color: '#777', fontSize: 11, marginTop: 3 }}>
                  {prestigeForgeUnlocked
                    ? 'Unlocked. Forge one balanced legacy weapon from the complete god essence set.'
                    : `Locked. Defeat all 10 Elemental Gods (${godsDefeated}/10), ascend, then return here.`}
                </div>
              </div>
              <button onClick={() => setShowArmory(true)} style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: prestigeForgeUnlocked ? '#d4af37' : '#2a2a2a',
                color: prestigeForgeUnlocked ? '#0d0d1a' : '#aaa',
                fontSize: 12,
                fontWeight: 'bold',
                flexShrink: 0,
              }}>
                {prestigeForgeUnlocked ? 'Open' : 'View Lock'}
              </button>
            </div>
          </div>
        )}

        {/* ── CRAFT TAB ── */}
        {tab === 'craft' && (
          <div>
            {forgeLevel === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>
                🔥 Build the Forge first to unlock crafting.
              </div>
            )}

            {forgeLevel > 0 && (
              <>
                {/* Sub-tabs */}
                <div style={{ display: 'flex', marginBottom: 16, borderBottom: '1px solid #1a1a2e' }}>
                  {['weapons', 'armor', 'accessories'].map(t => (
                    <button key={t} style={subTabStyle(craftTab === t)} onClick={() => setCraftTab(t)}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Weapons — two-level: pick type first, then tier */}
                {craftTab === 'weapons' && !weaponType && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['sword', 'hammer', 'bow', 'dagger'].map(type => (
                      <button key={type} onClick={() => setWeaponType(type)} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: '#ffffff08', border: '1px solid #ffffff15',
                        borderRadius: 12, padding: '16px 18px',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                        <span style={{ fontSize: 28 }}>{WEAPON_TYPE_ICONS[type]}</span>
                        <div>
                          <div style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', textTransform: 'capitalize', marginBottom: 2 }}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </div>
                          <div style={{ color: '#555', fontSize: 11 }}>{WEAPON_TYPE_DESC[type]}</div>
                        </div>
                        <span style={{ marginLeft: 'auto', color: '#d4af37', fontSize: 18 }}>›</span>
                      </button>
                    ))}
                  </div>
                )}

                {craftTab === 'weapons' && weaponType && (
                  <div>
                    {/* Back button */}
                    <button onClick={() => setWeaponType(null)} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'none', border: 'none',
                      color: '#d4af37', fontSize: 13, cursor: 'pointer',
                      marginBottom: 14, padding: 0,
                    }}>
                      ‹ All Weapons
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>
                        {WEAPON_TYPE_ICONS[weaponType]} {weaponType.charAt(0).toUpperCase() + weaponType.slice(1)}
                      </span>
                    </button>

                    {WEAPON_RECIPES
                      .filter(r => r.type === weaponType && forgeLevel >= (r.forgeLevel || 0))
                      .map(recipe => {
                        const canAfford = Object.entries(recipe.cost).every(([r, a]) => (resources[r] ?? 0) >= a);
                        const atk       = computeWeaponATK(recipe.type, recipe.tier, recipe.rarity, 0);
                        const rarColor  = RARITY[recipe.rarity]?.color || '#aaa';
                        const TIER_LABELS = { wood: 'Wood', iron: 'Iron', steel: 'Steel', elemental: 'Elemental', god: 'God' };
                        return (
                          <div key={recipe.id} style={{
                            background: '#ffffff08',
                            border:     `1px solid ${rarColor}33`,
                            borderLeft: `3px solid ${rarColor}`,
                            borderRadius: 10, padding: 12, marginBottom: 10,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <span style={{ color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>
                                    {TIER_LABELS[recipe.tier]?.toUpperCase()}
                                  </span>
                                  <RarityBadge rarity={recipe.rarity} />
                                  <span style={{ color: '#e74c3c', fontSize: 11 }}>+{atk} ATK</span>
                                </div>
                                <ResourceCost cost={recipe.cost} resources={resources} />
                              </div>
                              <button
                                onClick={() => handleCraftWeapon(recipe)}
                                disabled={!canAfford}
                                style={{
                                  marginLeft: 10, padding: '9px 13px', borderRadius: 8, border: 'none',
                                  cursor: canAfford ? 'pointer' : 'not-allowed',
                                  background: canAfford ? '#d4af37' : '#2a2a2a',
                                  color:      canAfford ? '#0d0d1a' : '#555',
                                  fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                                }}
                              >Craft</button>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                )}

                {/* Armor */}
                {craftTab === 'armor' && Object.values(ARMOR_ITEMS)
                  .filter(a => !a.dropOnly && forgeLevel >= (a.forgeLevel || 0))
                  .map(armorDef => {
                    const canAfford = Object.entries(armorDef.craftCost).every(([r, a]) => (resources[r] ?? 0) >= a);
                    const rarColor  = RARITY[armorDef.rarity]?.color || '#aaa';
                    return (
                      <div key={armorDef.id} style={{
                        background: '#ffffff08',
                        border:     `1px solid ${rarColor}33`,
                        borderLeft: `3px solid ${rarColor}`,
                        borderRadius: 10, padding: 12, marginBottom: 10,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 16 }}>{armorDef.icon}</span>
                              <span style={{ fontWeight: 'bold', fontSize: 14 }}>{armorDef.name}</span>
                              <RarityBadge rarity={armorDef.rarity} />
                              <span style={{ color: '#3498db', fontSize: 11 }}>+{armorDef.def} DEF</span>
                              {armorDef.spdPenalty && <span style={{ color: '#e74c3c', fontSize: 10 }}>{armorDef.spdPenalty} SPD</span>}
                            </div>
                            <div style={{ color: '#555', fontSize: 10, marginBottom: 4 }}>{armorDef.description}</div>
                            <ResourceCost cost={armorDef.craftCost} resources={resources} />
                          </div>
                          <button
                            onClick={() => handleCraftArmor(armorDef)}
                            disabled={!canAfford}
                            style={{
                              marginLeft: 10, padding: '9px 13px', borderRadius: 8, border: 'none',
                              cursor: canAfford ? 'pointer' : 'not-allowed',
                              background: canAfford ? '#d4af37' : '#2a2a2a',
                              color:      canAfford ? '#0d0d1a' : '#555',
                              fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                            }}
                          >Craft</button>
                        </div>
                      </div>
                    );
                  })
                }

                {/* Accessories */}
                {craftTab === 'accessories' && Object.values(ACCESSORY_ITEMS)
                  .filter(a => !a.dropOnly && a.craftCost && forgeLevel >= (a.forgeLevel || 0))
                  .map(accDef => {
                    const canAfford = Object.entries(accDef.craftCost).every(([r, a]) => (resources[r] ?? 0) >= a);
                    const rarColor  = RARITY[accDef.rarity]?.color || '#aaa';
                    const statText  = [
                      accDef.atk ? `+${accDef.atk} ATK` : null,
                      accDef.def ? `+${accDef.def} DEF` : null,
                      accDef.spd ? `+${accDef.spd} SPD` : null,
                    ].filter(Boolean).join(' · ');
                    return (
                      <div key={accDef.id} style={{
                        background: '#ffffff08',
                        border:     `1px solid ${rarColor}33`,
                        borderLeft: `3px solid ${rarColor}`,
                        borderRadius: 10, padding: 12, marginBottom: 10,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 16 }}>{accDef.icon}</span>
                              <span style={{ fontWeight: 'bold', fontSize: 14 }}>{accDef.name}</span>
                              <RarityBadge rarity={accDef.rarity} />
                              <span style={{ color: '#d4af37', fontSize: 11 }}>{statText}</span>
                            </div>
                            <div style={{ color: '#555', fontSize: 10, marginBottom: 4 }}>{accDef.description}</div>
                            <ResourceCost cost={accDef.craftCost} resources={resources} />
                          </div>
                          <button
                            onClick={() => handleCraftAccessory(accDef)}
                            disabled={!canAfford}
                            style={{
                              marginLeft: 10, padding: '9px 13px', borderRadius: 8, border: 'none',
                              cursor: canAfford ? 'pointer' : 'not-allowed',
                              background: canAfford ? '#d4af37' : '#2a2a2a',
                              color:      canAfford ? '#0d0d1a' : '#555',
                              fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                            }}
                          >Craft</button>
                        </div>
                      </div>
                    );
                  })
                }
              </>
            )}

            {/* ── Prestige Forge note ── */}
            {forgeLevel > 0 && (
              <>
                <div style={{ height: 1, background: '#d4af3333', margin: '16px 0 12px' }} />
                <div style={{
                  background: '#0d0d1a',
                  border: '1px solid #d4af3744',
                  borderRadius: 10,
                  padding: '12px 14px',
                  color: '#d4af37',
                  fontSize: 12,
                  lineHeight: 1.35,
                }}>
                  🔱 Legacy weapons are handled in the Prestige Forge button at the top of the Stronghold.
                  {(prestigeLevel || 0) < 1 && (
                    <div style={{ color: '#777', marginTop: 4 }}>
                      Unlocks after all 10 Elemental Gods are defeated and you ascend.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── UPGRADE TAB ── */}
        {tab === 'upgrade' && (
          <div>
            {forgeLevel === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>
                🔥 Build the Forge first to upgrade gear.
              </div>
            )}
            {forgeLevel > 0 && upgradeableItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>
                Craft or find weapons and armor to upgrade them here.
              </div>
            )}
            {forgeLevel > 0 && upgradeableItems.map(item => {
              const level      = getUpgradeLevel(item);
              const max        = getMaxUpgrade(item);
              const maxed      = level >= max;
              const cost       = !maxed ? UPGRADE_COSTS[level + 1] : null;
              const canAfford  = cost && Object.entries(cost).every(([r, a]) => (resources[r] ?? 0) >= a);
              const rarColor   = RARITY[item.rarity]?.color || '#aaa';
              return (
                <div key={item.instanceId} style={{
                  background: '#ffffff08',
                  border:     `1px solid ${rarColor}33`,
                  borderLeft: `3px solid ${rarColor}`,
                  borderRadius: 10, padding: 12, marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 'bold', fontSize: 14 }}>{item.name}</span>
                        <span style={{ color: '#d4af37', fontSize: 11, fontWeight: 'bold' }}>
                          {level > 0 ? `+${level}` : ''}
                        </span>
                        <span style={{ color: '#555', fontSize: 10 }}>{level}/{max}</span>
                      </div>
                      <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
                        {item.atk ? `ATK: ${item.atk}` : ''}{item.def ? `  DEF: ${item.def}` : ''}
                        {!maxed && <span style={{ color: '#2ecc71', marginLeft: 6 }}>
                          → {item.atk ? item.atk + 2 : ''}{item.def ? item.def + 2 : ''} after upgrade
                        </span>}
                      </div>
                      {maxed && <div style={{ color: '#d4af37', fontSize: 11 }}>✦ Max Upgrade Reached</div>}
                      {!maxed && cost && <ResourceCost cost={cost} resources={resources} />}
                    </div>
                    {!maxed && (
                      <button
                        onClick={() => handleUpgradeItem(item)}
                        disabled={!canAfford}
                        style={{
                          marginLeft: 10, padding: '9px 13px', borderRadius: 8, border: 'none',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          background: canAfford ? '#d4af37' : '#2a2a2a',
                          color:      canAfford ? '#0d0d1a' : '#555',
                          fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                        }}
                      >+1 Forge</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showArmory && <LegacyArmory onClose={() => setShowArmory(false)} />}
    </div>
  );
}

