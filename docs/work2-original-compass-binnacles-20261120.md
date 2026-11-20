# WORK 2 — Original navigation compass binnacles (20 November 2026)

**Feature branch:** `work2/original-compass-binnacles-20261120`
**Parent:** `work2/original-ship-bells-20261120` (PR #691).
**Scope:** isolated 3D SHIPYARD preview; **not** `main`, battle, Unity or published build.

## Delivered source
- `WebPreview/src/ship-deck-compass.ts`: original procedural 3D compass, twelve real cardinal ticks, needle, raised bezel, hardwood pedestal, bronze fittings.
- Three physically different silhouettes: low exposed Scout compass; braced Fighter pedestal; taller ornate Warship binnacle.
- Three ornament appearances, already gated at levels 1, 8 and 19 via the existing `ornaments` slot. 3 × 3 = 9 models without duplicated purchases or assets.
- Exactly **two merged meshes** per compass, with clean GPU disposal when swapping preview loadouts.
- `ship-modules.ts` adds it only to `modular-ship-accessories`; battle ships, player steering, physics, collisions, cannon damage and combat statistics remain unchanged.

## WORK 4 contract
`createPreviewCompassBinnacle` is decoration only; does **not** introduce an inventory item or grant a compass. Real equip and persistence must still use `validateOwnedFleetForPlayer` and independently verified level, hull and module ownership. Existing ornament IDs are reused; the preview is not proof of possession.

## WORK 6 contract
The new compass lives near **local x = +0.75, z = -0.65**, on the deck above y = 1.97. The editor's camera/orbit and part focus remain unchanged. The preview is installed with `applyShipModules`, which belongs solely to the temporary shipyard group and is disposed on exit.

## QA to complete before merge
- Inspect all three classes and three ornament finishes in a real browser, including narrow phones.
- Record iOS/Android FPS, draw calls, and GPU memory under device conditions.
- Validate no overlapping parts from camera presets and part-focus states.
- Run `npm ci && npm test && npm run build` from `WebPreview` via CI. No test claims without a successful run.

€0 external assets or paid tools. Keep PR draft; do not deploy until visual/mobile approval.
