# WORK 2 — Original 3D deck-shot racks (21 Nov 2026)

Base: `work2/original-boarding-ladders-20261121` (PR #726), continuing the independent modular fleet editor from PR #29. Draft feature only. Do not publish or merge until validated.

## What was implemented

`WebPreview/src/ship-deck-shot-racks.ts` builds **new, original 3D oak cradles, stacked iron cannonballs and metal rivets**. The class-specific layout is:

| Class | Cradles | Visible balls | Silhouette |
| --- | ---: | ---: | --- |
| Scout | 1 | 3 | Small single-sided rack |
| Fighter | 2 | 12 | Paired broadside racks |
| Warship | 3 | 30 | Three larger pyramid racks |

The three cannon modules (`cannons-bronze`, `cannons-steel`, `cannons-gold`) change the cosmetic metalwork, never the number of rounds. Nine class/module configurations. Both timber and shot form tangible 3D shapes, not sprites or fake ownership. Three merged meshes per entire ship: timber, forged rounds and fittings. Low-poly spheres keep vertex cost bounded for phones.

`WebPreview/src/ship-modules.ts` attaches this decoration to the existing disposable `modular-ship-accessories` group, using the selected cannon module. Old GPU geometry and materials are released by the established refit/exit cleanup. No new Three.js dependencies, textures, third-party assets, paid services or backend.

## WORK 4 — persistence / ownership

**Do not persist or award these cannonballs.** The decoration is not ammo inventory, power, a shop item or an entitlement. It derives solely from the three real preview cannon module IDs already validated in `resolveLoadout`. The existing separation remains: level preview != verified player level, module unlock != owned part, and equipped hull class must be separately owned and server-verified.

If WORK 4 later introduces real ammunition counts, do **not** map `visualRoundCount` to balances or use it for spending or attacks; the value is only geometry metadata.

## WORK 6 — harbour/editor and battle isolation

The group attaches only to the temporary preview through `applyShipModules`; no changes to `battle.ts`, `scene.ts`, ports, collision, cannon origins, firing cadence, damage or Unity. The existing orbit/zoom, close-up and 360-degree editor automatically render the racks as a part of the 3D preview. Changes to the cannon module replace the scene decoration without accumulating older meshes.

The dark metal and warm oak/gilt accents follow the approved premium nautical palette in `assets/design-approved`, while avoiding copies of reference artwork. Visual approval still requires a genuine browser/mobile capture.

## Verification plan / acceptance

New `WebPreview/tests/ship-deck-shot-racks.test.ts` covers nine combinations, three class silhouettes, geometry batching, invalid IDs, repeated disposal and all 60 class/level combinations. Run `cd WebPreview && npm ci && npm test && npm run build` through the non-deployment CI. Confirm the Actions run before marking validated. Also check a physical iPhone and Android for frame time, GPU draw calls and visual clipping, and re-check battle navigation after eventual integration. Do not claim physical device FPS from Node tests.

**Status:** isolated draft, not integrated into main, not deployed. **Cost:** €0.
