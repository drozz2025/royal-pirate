# WORK 2 — original 3D boarding ladders (20 November 2026)

**Branch**: `work2/original-boarding-ladders-20261120`, stacked on the draft stern-rudders PR #668. No changes to `main`, Unity, battle or live deployment. Budget €0.

## 3D implementation
- `WebPreview/src/ship-boarding-ladders.ts` produces real THREE.js physical wooden rails, separate horizontal treads, forged anti-slip strips and hull-fixed fittings. All geometry is original and generated in code, aligned with `assets/design-approved/README.md` (premium detailed 3D, navy/gold identity).
- **Scout**: one slender five-step ladder. **Fighter**: two six-step ladders. **Warship**: four seven-step ladders (two per broadside).
- Three hull modules drive appearance: oak/plain fittings (level 1), ironwood/reinforcement (level 6), royal/brass embossing (level 15). **Nine class/hull appearances** with exactly **two merged GPU draw objects** each.
- `applyShipModules()` only attaches geometry within `modular-ship-accessories`; switching preview variants safely releases the ladder geometry and materials with the existing disposal logic.
- The side fittings are deliberately placed between cannon ports at local longitudinal positions ±0.9 and the hull sides. They are purely visual and do not change walkability, steering, ship stats, physics or ownership.

## Handoff WORK 4
`loadout.modules.hull` selects preview appearance. Availability by level does not prove acquisition. Continue to call `validateOwnedFleetForPlayer` against verified level, owned ship class and each of the 9 owned modules before equip; **trusted backend verification remains mandatory** for persistence. Do not award ladders, modules, ships, money or purchases in response to sandbox preview.

## Handoff WORK 6
No extra navigation/UI is required: the existing 3D shipyard hull selector, level 1–20 slider, camera presets and focus controls drive the class-specific ladder meshes. For visual QA, choose hull/broadside and confirm that the steps remain visible above the water while passing between cannon ports, especially on narrow iPhone screens. They are not a replacement for the approved eight screens.

## QA / release gate
`WebPreview/tests/ship-boarding-ladders.test.ts` checks nine variants, physical bounded geometry, GPU batching, resource disposal, 60 class×level preview combinations and non-ownership. Run `npm ci`, `npm test`, `npm run build` via GitHub Actions. These tests do not measure phone FPS, GPU memory or final visual quality. Keep this PR **draft** until visual QA, memory/FPS checks and WORK 4/6 integration review; do not merge to `main` or publish unvalidated work.
