# WORK 2 — original stern rudders / mobile 3D shipyard (20 November 2026)

Branch: `work2/original-3d-stern-rudders-20261120`, stacked on WORK 2's GPU-resource-release draft (#664). **Do not merge to main or deploy without visual/mobile QA.**

## Exact feature
- `WebPreview/src/ship-stern-rudders.ts` generates a real, tapered 3D steering blade, stock, visible reinforcement ribs and forged hinges, all original procedural art.
- Scout (two hinges, one rib, narrow swept blade), Fighter (three hinges, two ribs, broader swept blade), Warship (four hinges, three ribs, oversized aft blade) have genuinely different silhouettes.
- The `hull-oak`, `hull-ironwood`, and `hull-royal` finishes add the original iron/gilt decorative strakes/crests. These nine combinations are merged into exactly two disposable THREE.Mesh objects per preview.
- `applyShipModules` adds the rudder **only** to the isolated `modular-ship-accessories` group. It is never attached to the battle ship or the Unity build. All associated geometry/materials are disposable on a preview refit or exit.
- The visual rudder has no collision, steering, upgrade bonus, damage, camera, payment or inventory meaning. It adds no purchase/ownership state.

## WORK 4 interface
Treat the module selection as a sandbox. A level-eligible `hull-royal` preview does **not** make it owned. Before allowing actual fleet equip/persist, continue to require trusted verified player level, ship class entitlement and all nine module entitlements via existing `validateOwnedFleetForPlayer`, with backend revalidation. The rudder art is selected solely by `loadout.modules.hull`.

## WORK 6 interface
No new UI element or button is required. Existing shipyard hull tabs, class selector, level 1–20 slider and camera presets already drive the correct 3D variant. The previous original camera, battle flow, and draft equipped-state contract remain unchanged. The rudder occupies the aft centreline (near local z=-5.2), so use the **STERN** camera preset for visual acceptance.

## WORK 5 QA and release
Automated tests in `WebPreview/tests/ship-stern-rudders.test.ts` cover nine class/hull variants, finite geometry, mesh/triangle bounds, valid GPU disposal on module changes, all 60 level/class previews, and absence of fabricated possession. Run `npm ci && npm test && npm run build` in `WebPreview` on this branch. Check the related GitHub Actions run; tests are not a substitute for rendering on real devices.

Before merge, visually inspect all 3 hull classes from stern/broadside and phone-sized orbit/zoom, especially possible waterline clipping; record actual GPU draw calls, FPS and memory on Android/iOS Safari. Do not change the battle, main or public GitHub Pages build. **Budget €0.**
