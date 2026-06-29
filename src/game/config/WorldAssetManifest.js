// V97-ASSET-INTAKE-SAFE-REV-001
// GitHub-ready asset manifest for God Prodigy.
// This file is intentionally not imported yet. It gives us stable paths for the V97 renderer pass.

export const WORLD_ASSET_REVISION = 'V97-ASSET-INTAKE-SAFE-REV-001';

export const PIXEL_CRAWLER_ASSETS = {
  "tilesets": {
    "floors": "/assets/world/pixel_crawler/environment/tilesets/floors_tiles_png",
    "water": "/assets/world/pixel_crawler/environment/tilesets/water_tiles_png",
    "dungeon": "/assets/world/pixel_crawler/environment/tilesets/dungeon_tiles_png",
    "walls": "/assets/world/pixel_crawler/environment/tilesets/wall_tiles_png"
  },
  "props": {
    "rocks": "/assets/world/pixel_crawler/environment/props/static/rocks_png",
    "resources": "/assets/world/pixel_crawler/environment/props/static/resources_png",
    "vegetation": "/assets/world/pixel_crawler/environment/props/static/vegetation_png",
    "dungeonProps": "/assets/world/pixel_crawler/environment/props/static/dungeon_props_png",
    "tools": "/assets/world/pixel_crawler/environment/props/static/tools_png"
  },
  "buildings": {
    "roofs": "/assets/world/pixel_crawler/environment/structures/buildings/roofs_png",
    "walls": "/assets/world/pixel_crawler/environment/structures/buildings/interior/interior_walls_01_png",
    "props": "/assets/world/pixel_crawler/environment/structures/buildings/interior/interior_props_01_png",
    "shadows": "/assets/world/pixel_crawler/environment/structures/buildings/shadows_png"
  },
  "stations": {
    "anvil": null,
    "bonfire": null,
    "furnace": null,
    "workbench": null
  },
  "characters": {
    "playerIdleDown": "/assets/world/pixel_crawler/entities/characters/body_a/animations/idle_base/idle_down_sheet_png",
    "playerWalkDown": "/assets/world/pixel_crawler/entities/characters/body_a/animations/walk_base/walk_down_sheet_png",
    "playerRunDown": "/assets/world/pixel_crawler/entities/characters/body_a/animations/run_base/run_down_sheet_png",
    "playerSliceDown": "/assets/world/pixel_crawler/entities/characters/body_a/animations/slice_base/slice_down_sheet_png"
  },
  "mobs": {
    "orcIdle": "/assets/world/pixel_crawler/entities/mobs/orc_crew/orc/idle/idle_sheet_png",
    "skeletonIdle": "/assets/world/pixel_crawler/entities/mobs/skeleton_crew/skeleton_base/idle/idle_sheet_png"
  }
};

export default PIXEL_CRAWLER_ASSETS;
