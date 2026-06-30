# God Prodigy — V104 Stronghold Tile Village

Revision: `V104-STRONGHOLD-TILE-VILLAGE-REV-001`

## Included files

```text
src/ui/WorldCanvas.jsx
src/ui/MainQuestTracker.jsx
public/assets/world/v104_stronghold/
docs/assets/V104_STRONGHOLD_TILE_VILLAGE.md
```

## What changed

This pass uses the Four Seasons tileset direction to rebuild the Stronghold as a composed village scene instead of isolated hut sprites.

Main changes:
- Adds a full Stronghold plaza/base overlay.
- Adds stronger building silhouettes from the Four Seasons pack.
- Replaces the Shrine hut with a custom altar/shrine sprite.
- Replaces Market with a market-stall style sprite.
- Adds district props for Forge, Market, Barracks, Shrine, and Crafting.
- Tightens building placement toward a readable village hub.
- Keeps the quest banner ultra-compact so it blocks less of the village.

## Gameplay impact

No intended gameplay changes.

Preserved:
- movement
- combat
- building E interaction
- current Stronghold menu entry
- resource collection
- realm entry
- dungeon entry
- IAP
- inventory
- death/recovery flow

## Test checklist

1. App builds without red screen.
2. Stronghold plaza/base appears.
3. Crafting, Forge, Market, Barracks, and Shrine look more distinct.
4. Shrine reads more like an altar/sacred place than a hut.
5. Pressing E near each building still opens the Stronghold menu.
6. Player does not get stuck around buildings.
7. Quest banner is smaller and less intrusive.
8. No missing PNG or black/magenta/checkerboard background.
