# WORK 2 — Original batched shipyard casks (2026-11-21)

Status: feature branch / **draft PR only**. No `main` changes or deployment. Original procedural artwork, zero paid assets. This is an additive visual feature only; the original battle code, weapons, ship stats, physics, wallet, entitlements and persistence must remain untouched.

## Implementation and placement

`WebPreview/src/ship-deck-casks.ts` draws original bulged coopered barrels with stave seams, timber skids, forged hoops and top fasteners, plus a royal-tier seal. It consumes `ShipClass` and the **already resolved** `PreviewHullModule`. There are nine class/finish combinations: Scout has 2 casks, Fighter 4, Warship 6. The stations sit in mirrored pairs along the interior deck. Colour/metal finish follows `hull-oak` / `hull-ironwood` / `hull-royal`, but these ornaments never act as independent inventory modules.

The implementation merges timber into one opaque `Mesh` and metalwork into another. There are exactly **2 accessory draw meshes**, no dynamic lights, no animation loop, no network access, and no externally sourced models/textures. It uses the existing disposal mechanism in `applyShipModules` when switching classes, levels or hull finishes. The authoring reference is `assets/design-approved` (premium legible naval shapes), not an imported third-party mesh.

## Contracts for WORK 4 and WORK 6

- WORK 4: Do **not** infer a purchased/owned resource from a rendered cask. There is no new cargo, ammunition, currency, shopping entitlement, level grant or economic state. The real equip contract remains `validateOwnedFleetForPlayer` with verified level, verified hull ownership, and all independently verified module IDs. `hull-royal` visual gates at level 15; gate alone never gives ownership.
- WORK 6: The added `shipyard-<class>-<hullModule>-deck-casks` object is a child of `modular-ship-accessories`. Keep it exclusive to the 3D editor and do not import it into the battle scene. It has `userData.previewOnly=true`, `affectsBattle=false`, `grantsInventory=false`, `caskCount` and `drawCallObjects=2`. The shipyard remains touch orbit/zoom capable and this fitting adds no event listeners.
- WORK 5: Review cask placement on portrait iPhone/Android and compare all classes and three finish variants against approved visuals. Observe true on-device frame rate, VRAM and GPU draw calls, and check that casks do not intersect cabin/helm or rigging. The two-render-mesh budget is a structural claim, **not a measured FPS guarantee**.

## Verification checklist

`WebPreview/tests/ship-deck-casks.test.ts` adds coverage for: nine class/hull visual combinations, class silhouette counts 2/4/6, finite geometry and bounded vertices, original royal lid engraving, non-ownership and unlock protection, all 60 class/level preview replacements, unique GPU disposal and unknown inputs. Run from `WebPreview`:

```bash
npm ci
npm test
npm run build
```

GitHub Actions may provide independent CI evidence after PR opening. The above commands are **requested checks, not a claim they have run locally**. Approval gates remain visual review and actual mobile-device performance testing. No merge or publication until validated.
