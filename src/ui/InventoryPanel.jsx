// GP_INV_FINAL_v5
import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

const SLOT_SIZE = 76;

function getItemIcon(item) {
  if (!item) return '·';
  if (item.slot === 'armor') return '🛡️';
  if (item.slot === 'accessory') {
    if ((item.name || '').toLowerCase().includes('ring')) return '💍';
    if ((item.name || '').toLowerCase().includes('charm')) return '📦';
    return '✨';
  }
  switch (item.type) {
    case 'sword':  return '⚔️';
    case 'hammer': return '🔨';
    case 'bow':    return '🏹';
    case 'dagger': return '🗡️';
    case 'staff':  return '🔮';
    default:       return '⚒️';
  }
}

function getSlotAccent(item) {
  if (!item) return { bg:'#101014', border:'#282832', glow:'none', label:'#5c5f6b' };
  if (item.tier === 'godkiller' || item.tier === 'prestige') {
    return { bg:'#211804', border:'#d4af37', glow:'0 0 14px #d4af3744, 0 0 0 1px #d4af3744 inset', label:'#f3d66b' };
  }
  if (item.slot === 'weapon')    return { bg:'#192537', border:'#a84343', glow:'0 0 0 1px #a8434333 inset', label:'#ff8b8b' };
  if (item.slot === 'armor')     return { bg:'#182433', border:'#4b7bec', glow:'0 0 0 1px #4b7bec33 inset', label:'#8db6ff' };
  return { bg:'#241d33', border:'#b08d2f', glow:'0 0 0 1px #b08d2f33 inset', label:'#e7c86e' };
}

function getRarityColor(rarity) {
  switch ((rarity || '').toLowerCase()) {
    case 'common':    return '#bdc3c7';
    case 'uncommon':  return '#2ecc71';
    case 'rare':      return '#3498db';
    case 'epic':      return '#9b59b6';
    case 'legendary': return '#f1c40f';
    case 'godkiller': return '#d4af37';
    case 'prestige':  return '#d4af37';
    default:          return '#7f8c8d';
  }
}

function getTierLabel(item) {
  if (!item) return '';
  if (item.tier === 'godkiller' || item.tier === 'prestige') return 'PRESTIGE';
  return item.tier ? String(item.tier).toUpperCase() : (item.rarity ? String(item.rarity).toUpperCase() : '');
}

function getPassiveText(item) {
  if (!item?.passiveDesc) return '';
  return item.passiveDesc.replace(/^([^:]+):\s*/, '');
}

function getPrimaryStatText(item) {
  if (!item) return '';
  if (item.atk)        return `+${item.atk} ATK`;
  if (item.def)        return `+${item.def} DEF`;
  if (item.spd)        return `+${item.spd} SPD`;
  if (item.spdPenalty) return `${item.spdPenalty} SPD`;
  return item.slot ? item.slot.toUpperCase() : '';
}

function getCategoryLabel(item) {
  if (!item) return '';
  if (item.slot === 'weapon')    return item.type ? item.type.toUpperCase() : 'WEAPON';
  if (item.slot === 'armor')     return 'ARMOR';
  if (item.slot === 'accessory') return 'ACCESSORY';
  return '';
}

function getEquippedItem(slot, gear, inventory) {
  const instanceId = gear?.[slot];
  if (!instanceId) return null;
  return inventory.find(i => i.instanceId === instanceId) || null;
}

function GearSlot({ label, item, onUnequip }) {
  const accent = getSlotAccent(item);
  return (
    <div style={{
      flex: 1, minHeight: 64, borderRadius: 12,
      border: `1px solid ${item ? accent.border : '#30303a'}`,
      background: item ? accent.bg : '#101014',
      boxShadow: item ? accent.glow : 'none',
      padding: '7px 9px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative',
    }}>
      <div style={{ fontSize: 9, color: item ? accent.label : '#6a6a74', letterSpacing: 0.8 }}>
        {label}
      </div>
      {item ? (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ fontSize:20, lineHeight:1 }}>{getItemIcon(item)}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ color:'#f2f2f2', fontSize:11, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {item.name || item.id || 'Equipped'}
              </div>
              <div style={{ color:accent.label, fontSize:8, marginTop:1 }}>
                {getCategoryLabel(item)}{getPrimaryStatText(item) ? ` • ${getPrimaryStatText(item)}` : ''}
              </div>
              {getPassiveText(item) && (
                <div style={{ color:'#d4af37', fontSize:7, marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {getPassiveText(item)}
                </div>
              )}
            </div>
          </div>
          <div style={{ position:'absolute', top:7, right:7, width:8, height:8, borderRadius:999, background:'#d4af37', boxShadow:'0 0 8px #d4af37aa' }} />
          <button onClick={() => onUnequip(item.slot)} style={{ marginTop:6, alignSelf:'flex-start', background:'#00000088', border:'1px solid #ffffff22', color:'#ddd', fontSize:10, borderRadius:8, padding:'2px 8px', cursor:'pointer' }}>
            Unequip
          </button>
        </>
      ) : (
        <div style={{ color:'#4d5160', fontSize:10, textAlign:'center', marginTop:10 }}>
          {label === 'Armor' ? 'No Armor' : label === 'Accessory' ? 'No Accessory' : 'No Weapon'}
        </div>
      )}
    </div>
  );
}


function ItemsTab({ respawnShields, resources, fragments }) {
  const resourceLabels = {
    wood: { icon: '🪵', name: 'Wood' },
    stone: { icon: '🪨', name: 'Stone' },
    ore: { icon: '⛏️', name: 'Ore' },
    fire_shard: { icon: '🔥', name: 'Fire Shard' },
    forest_essence: { icon: '🌿', name: 'Forest Essence' },
    wind_essence: { icon: '💨', name: 'Wind Essence' },
    earth_essence: { icon: '🪨', name: 'Earth Essence' },
    fire_essence: { icon: '🔥', name: 'Fire Essence' },
    ice_essence: { icon: '❄️', name: 'Ice Essence' },
    ocean_essence: { icon: '🌊', name: 'Ocean Essence' },
    storm_essence: { icon: '⚡', name: 'Storm Essence' },
    shadow_essence: { icon: '🌑', name: 'Shadow Essence' },
    lava_essence: { icon: '🌋', name: 'Lava Essence' },
    void_essence: { icon: '✨', name: 'Void Essence' },
  };

  const fragmentLabels = {
    rune: { icon: 'ᚱ', name: 'Ancient Rune' },
    shard: { icon: '🔹', name: 'Legacy Shard' },
    seal: { icon: '🔱', name: 'Divine Seal' },
  };

  const cards = [
    {
      id: 'death_shield',
      icon: '🛡',
      name: 'Death Shield',
      count: respawnShields || 0,
      accent: '#3498db',
      desc: 'Purchased item. Prevents resource loss and restores full HP after death.',
    },
    ...Object.entries(resources || {})
      .filter(([, count]) => (count || 0) > 0)
      .map(([id, count]) => ({
        id,
        icon: resourceLabels[id]?.icon || '📦',
        name: resourceLabels[id]?.name || id.replaceAll('_', ' '),
        count,
        accent: id.includes('essence') ? '#d4af37' : '#7f8c8d',
        desc: id.includes('essence') ? 'Boss material used for endgame progression.' : 'Crafting and upgrade resource.',
      })),
    ...Object.entries(fragments || {})
      .filter(([, count]) => (count || 0) > 0)
      .map(([id, count]) => ({
        id: `fragment_${id}`,
        icon: fragmentLabels[id]?.icon || '🔸',
        name: fragmentLabels[id]?.name || id,
        count,
        accent: '#9b59b6',
        desc: 'Legacy / Prestige crafting material.',
      })),
  ];

  const hasVisibleItems = cards.some(c => (c.count || 0) > 0);

  if (!hasVisibleItems) {
    return (
      <div style={{ color:'#555', fontSize:13, textAlign:'center', padding:20 }}>
        No items yet.{`\n`}Death Shields will appear here after purchase.
      </div>
    );
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8, paddingBottom:16 }}>
      {cards.filter(c => (c.count || 0) > 0).map(item => (
        <div key={item.id} style={{
          background:'#ffffff08', border:`1px solid ${item.accent}66`,
          borderRadius:12, padding:'12px 10px', minHeight:92,
          boxShadow:`0 0 0 1px ${item.accent}22 inset`,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <div style={{ fontSize:26 }}>{item.icon}</div>
            <div style={{
              background:item.accent, color:'#050712', borderRadius:999,
              fontSize:12, fontWeight:800, padding:'2px 8px', minWidth:28, textAlign:'center',
            }}>
              x{item.count}
            </div>
          </div>
          <div style={{ color:'#f2f2f2', fontSize:12, fontWeight:800, marginTop:8, lineHeight:1.1 }}>
            {item.name}
          </div>
          <div style={{ color:'#888', fontSize:9, marginTop:4, lineHeight:1.25 }}>
            {item.desc}
          </div>
        </div>
      ))}
    </div>
  );
}

function CosmeticsTab({ ownedSkins, activeSkin, equipSkin, ownedTrails, activeTrail, equipTrail }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, paddingBottom:16 }}>
      <div style={{ color:'#d4af37', fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:4 }}>Skins</div>
      {(ownedSkins||[]).length === 0 && (
        <div style={{ color:'#555', fontSize:13, textAlign:'center', padding:16 }}>
          No skins owned yet.{'\n'}Purchase from the Shop.
        </div>
      )}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {(ownedSkins||[]).map(skinId => {
          const isActive = activeSkin === skinId;
          const labels = { skin_shadow:'Shadow Knight', skin_gold:"God's Chosen", skin_ice:'Frost Warden' };
          const icons  = { skin_shadow:'🖤', skin_gold:'👑', skin_ice:'❄️' };
          return (
            <button key={skinId} onClick={() => equipSkin(isActive ? null : skinId)} style={{
              flex:'0 0 calc(50% - 4px)', padding:'14px 10px',
              background: isActive ? '#d4af3722' : '#ffffff08',
              border: isActive ? '2px solid #d4af37' : '1px solid #ffffff18',
              borderRadius:10, color:'#fff', cursor:'pointer', textAlign:'center',
            }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{icons[skinId]||'🎭'}</div>
              <div style={{ fontSize:12, fontWeight:700, color: isActive?'#d4af37':'#fff' }}>{labels[skinId]||skinId}</div>
              <div style={{ fontSize:10, color: isActive?'#d4af37':'#666', marginTop:2 }}>{isActive?'✓ Equipped':'Tap to equip'}</div>
            </button>
          );
        })}
      </div>

      <div style={{ color:'#d4af37', fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', marginTop:8, marginBottom:4 }}>Trails</div>
      {(ownedTrails||[]).length === 0 && (
        <div style={{ color:'#555', fontSize:13, textAlign:'center', padding:'8px 0' }}>No trails owned yet.</div>
      )}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {(ownedTrails||[]).map(trailId => {
          const isActive = activeTrail === trailId;
          const labels = { trail_ember:'Ember Trail', trail_void:'Void Trail' };
          const icons  = { trail_ember:'🔥', trail_void:'🌀' };
          return (
            <button key={trailId} onClick={() => equipTrail(isActive ? null : trailId)} style={{
              flex:'0 0 calc(50% - 4px)', padding:'14px 10px',
              background: isActive ? '#e99b3822' : '#ffffff08',
              border: isActive ? '2px solid #e99b38' : '1px solid #ffffff18',
              borderRadius:10, color:'#fff', cursor:'pointer', textAlign:'center',
            }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{icons[trailId]||'✨'}</div>
              <div style={{ fontSize:12, fontWeight:700, color: isActive?'#e99b38':'#fff' }}>{labels[trailId]||trailId}</div>
              <div style={{ fontSize:10, color: isActive?'#e99b38':'#666', marginTop:2 }}>{isActive?'✓ Active':'Tap to equip'}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GearGrid({ slots, gear, handleItemPress }) {
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:`repeat(4, ${SLOT_SIZE}px)`,
      gap:8,
      justifyContent:'center',
    }}>
      {slots.map((item, i) => {
        const accent = getSlotAccent(item);
        const isEquipped = !!item && (
          gear.weapon    === item.instanceId ||
          gear.armor     === item.instanceId ||
          gear.accessory === item.instanceId
        );
        return (
          <button key={i} onClick={() => handleItemPress(item)} style={{
            width:SLOT_SIZE, minHeight:70,
            background: item ? accent.bg : '#0c0f18',
            border:`1px solid ${item ? accent.border : '#1c2230'}`,
            borderRadius:12,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
            cursor: item ? 'pointer' : 'default',
            textAlign:'center', padding:'7px 6px 5px',
            position:'relative',
            boxShadow: item ? accent.glow : 'none',
          }}>
            {item ? (
              <>
                <div style={{
                  position:'absolute', top:5, left:5,
                  background:'#00000088', color:getRarityColor(item.rarity),
                  border:`1px solid ${getRarityColor(item.rarity)}55`,
                  borderRadius:999, fontSize:7, padding:'2px 5px', letterSpacing:0.6,
                }}>
                  {getTierLabel(item)||'GEAR'}
                </div>
                {isEquipped && (
                  <div style={{ position:'absolute', top:5, right:5, width:8, height:8, borderRadius:999, background:'#d4af37', boxShadow:'0 0 8px #d4af37aa' }} />
                )}
                <div style={{ fontSize:22, lineHeight:1, marginTop:10, marginBottom:3 }}>{getItemIcon(item)}</div>
                <div style={{ color:accent.label, fontSize:7, letterSpacing:0.7, marginBottom:2 }}>{getCategoryLabel(item)}</div>
                <div style={{ color:'#f2f2f2', fontSize:9, fontWeight:700, lineHeight:1.05, minHeight:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {item.name||item.id}
                </div>
                <div style={{ color: item.atk?'#ff7b7b':item.def?'#66b3ff':'#7bed9f', fontSize:9, marginTop:2, fontWeight:700 }}>
                  {getPrimaryStatText(item)}
                </div>
                {getPassiveText(item) && (
                  <div style={{ color:'#d4af37', fontSize:7, marginTop:1, lineHeight:1.05, maxHeight:15, overflow:'hidden' }}>
                    {getPassiveText(item)}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color:'#1f2633', fontSize:22, marginTop:16 }}>+</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function InventoryPanel() {
  const {
    inventory, gear,
    equipItem, unequipItem,
    playerATK, playerDEF, playerSPD, playerMaxHP,
    resources, fragments, respawnShields,
    toggleInventory,
    ownedSkins, activeSkin, equipSkin,
    ownedTrails, activeTrail, equipTrail,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState('gear');

  const equippedWeapon    = getEquippedItem('weapon',    gear, inventory);
  const equippedArmor     = getEquippedItem('armor',     gear, inventory);
  const equippedAccessory = getEquippedItem('accessory', gear, inventory);

  const maxSlots = Math.max(16, inventory.length);
  const slots    = Array.from({ length: maxSlots }, (_, i) => inventory[i] || null);

  const handleItemPress = (item) => {
    if (!item) return;
    if (item.slot) equipItem(item);
  };

  return (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0, zIndex:120,
      background:'linear-gradient(0deg, #050712 80%, #050712f5 92%, #05071288 97%, #05071200 100%)',
      borderTop:'2px solid #d4af3755',
      padding:'14px 14px 24px',
      maxHeight:'61vh', overflowY:'auto',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
    }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div>
          <h3 style={{ color:'#d4af37', margin:0, fontSize:22, letterSpacing:0.3 }}>Inventory</h3>
          <div style={{ color:'#7f8c8d', fontSize:10, marginTop:2 }}>Tap gear to equip</div>
        </div>
        <button onClick={toggleInventory} style={{ background:'#00000088', border:'1px solid #ffffff22', color:'#ddd', fontSize:15, cursor:'pointer', borderRadius:10, padding:'5px 11px' }}>
          Close
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:12 }}>
        {['gear','items','cosmetics'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex:1, padding:'7px 0',
            background: activeTab===t ? '#d4af37' : '#ffffff0f',
            border: activeTab===t ? '1px solid #d4af37' : '1px solid #ffffff18',
            borderRadius:8, color: activeTab===t ? '#0a0a0a' : '#aaa',
            fontWeight: activeTab===t ? 700 : 400,
            fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer',
          }}>
            {t === 'gear' ? '⚔️ Gear' : t === 'items' ? '🎒 Items' : '✨ Cosmetics'}
          </button>
        ))}
      </div>

      {/* Equipped gear slots */}
      <div style={{ display:'flex', gap:8, marginBottom:12, padding:10, background:'#ffffff08', borderRadius:12, border:'1px solid #ffffff12' }}>
        <GearSlot label="Weapon"    item={equippedWeapon}    onUnequip={unequipItem} />
        <GearSlot label="Armor"     item={equippedArmor}     onUnequip={unequipItem} />
        <GearSlot label="Accessory" item={equippedAccessory} onUnequip={unequipItem} />
      </div>

      {/* Stat summary */}
      <div style={{ display:'flex', marginBottom:12, background:'#ffffff08', borderRadius:12, border:'1px solid #ffffff12', overflow:'hidden' }}>
        {[
          { label:'ATK', val:playerATK,   col:'#e74c3c' },
          { label:'DEF', val:playerDEF,   col:'#3498db' },
          { label:'SPD', val:playerSPD,   col:'#2ecc71' },
          { label:'HP',  val:playerMaxHP, col:'#ff6b6b' },
        ].map((s, i) => (
          <div key={s.label} style={{ flex:1, textAlign:'center', padding:'8px 0', borderRight: i<3 ? '1px solid #ffffff12' : 'none' }}>
            <div style={{ color:s.col, fontSize:20, fontWeight:800 }}>{s.val}</div>
            <div style={{ color:'#7a7a7a', fontSize:9, letterSpacing:1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'cosmetics' ? (
        <CosmeticsTab
          ownedSkins={ownedSkins}   activeSkin={activeSkin}   equipSkin={equipSkin}
          ownedTrails={ownedTrails} activeTrail={activeTrail} equipTrail={equipTrail}
        />
      ) : activeTab === 'items' ? (
        <ItemsTab respawnShields={respawnShields} resources={resources} fragments={fragments} />
      ) : (
        <GearGrid slots={slots} gear={gear} handleItemPress={handleItemPress} />
      )}

    </div>
  );
}
