# God Prodigy — V97 Asset Intake

Revision: `V97-ASSET-INTAKE-SAFE-REV-001`

## What this package is

This package prepares the commercially usable Pixel Crawler assets for GitHub upload and future God Prodigy integration.

Assets are placed under:

```text
public/assets/world/pixel_crawler/
```

License/terms are placed under:

```text
public/assets/licenses/pixel_crawler_terms.txt
```

A machine-readable manifest is available here:

```text
public/assets/world/pixel_crawler/asset_manifest.json
```

A starter JS manifest is available here:

```text
src/game/config/WorldAssetManifest.js
```

## Important source decision

Included:
- Pixel Crawler Free Pack PNG runtime assets
- Pixel Crawler terms file
- Pixel Crawler contact sheet reference

Excluded from this GitHub-ready package:
- Zelda-labeled assets
- ActionRPG RAR assets
- standalone tileset image with unverified license
- Aseprite source files

Reason:
The Pixel Crawler pack includes clear terms allowing commercial project use. The Zelda-labeled and unknown-license assets should be treated as visual reference only until license safety is confirmed.

## Recommended next build

Use these assets in a separate renderer pass:

```text
V97 — Asset Renderer Foundation
```

Do not replace the whole map at once. Start with:
1. player sprite test
2. trees and rocks
3. water/road/grass tile test
4. village station/building props
5. dungeon/ruins props
