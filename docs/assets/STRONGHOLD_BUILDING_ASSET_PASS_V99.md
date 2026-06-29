# God Prodigy — Stronghold Real Building Asset Pass

Revision: `V99-REAL-BUILDING-ASSETS-REV-001`

## Included

This package updates:

```text
src/ui/WorldCanvas.jsx
```

and adds:

```text
public/assets/world/buildings/stronghold_forge.png
public/assets/world/buildings/stronghold_crafting_hall.png
public/assets/world/buildings/stronghold_market.png
public/assets/world/buildings/stronghold_shrine.png
public/assets/world/buildings/stronghold_barracks.png
public/assets/world/buildings/building_assets_manifest.json
```

## Purpose

This pass replaces the fake/simple canvas-drawn Stronghold exteriors with real image-based building sprites.

## Gameplay impact

No intended gameplay changes.

Preserved:
- movement
- collision
- combat
- resource collection
- realm entry
- dungeon entry
- Stronghold entry behavior
- IAP
- inventory
- story flow

## Test checklist

1. Build loads without red screen.
2. Stronghold buildings display as real building sprites.
3. Each building still shows its interaction prompt.
4. Pressing E near each building still opens the current Stronghold menu.
5. Player/NPC movement still feels correct around the hub.
6. Assets do not appear with black or checkerboard backgrounds.
