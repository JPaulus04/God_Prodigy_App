// ItemConfig.js — single source of truth for all items.
// Add new items here; inventory/crafting systems read from this.

export const ItemConfig = {
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'A basic iron sword. Better than your fists.',
    slot: 'weapon',
    atk: 6,
    def: 0,
    texture: 'iron_sword',
    rarity: 'common',
  },

  goblin_tooth: {
    id: 'goblin_tooth',
    name: 'Goblin Tooth',
    description: 'A sharp goblin fang. Useful for early crafting.',
    slot: null,
    texture: 'ore_node',
    rarity: 'common',
  },
};
