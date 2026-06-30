# God Prodigy — V100 Stronghold Village Visual Rebuild

Revision: `V100-STRONGHOLD-VILLAGE-REV-001`

## Included files

```text
src/ui/WorldCanvas.jsx
src/ui/MainQuestTracker.jsx
public/assets/world/buildings/v100_stronghold_forge.png
public/assets/world/buildings/v100_stronghold_crafting_hall.png
public/assets/world/buildings/v100_stronghold_market.png
public/assets/world/buildings/v100_stronghold_barracks.png
public/assets/world/buildings/v100_stronghold_shrine.png
public/assets/world/buildings/v100_stronghold_crates_props.png
public/assets/world/buildings/v100_stronghold_garden_props.png
public/assets/world/buildings/v100_stronghold_fountain_single.png
public/assets/world/buildings/v100_stronghold_training_props.png
public/assets/world/buildings/v100_stronghold_village_manifest.json
```

## What changed

- Rebuilt Stronghold village layout.
- Added stronger real building sprites for Forge, Crafting Hall, Market, Barracks, and Shrine.
- Added environmental dressing: plaza paths, cobblestone flecks, fences, garden, crates, fountain, forge props, training prop, and signposts.
- Moved the Stronghold hub toward a cleaner village layout.
- Reduced the Main Quest banner footprint so it no longer hides as much of the village.

## Gameplay impact

No intended gameplay changes.

Preserved:
- movement
- combat
- building E interaction behavior
- current Stronghold menu entry
- resource collection
- realm entry
- dungeon entry
- IAP
- inventory
- death/recovery flow

## Test checklist

1. App builds without red screen.
2. Stronghold buildings show as image-based sprites.
3. No magenta/black/checkerboard background around the new buildings.
4. Forge, Crafting Hall, Market, Barracks, and Shrine are readable as different places.
5. Pressing E near each building still opens the Stronghold menu.
6. Player does not get stuck around buildings, signs, or fences.
7. Main Quest banner is smaller and does not cover the village as badly.
8. Stronghold still feels playable with HUD, joystick, and action buttons visible.
