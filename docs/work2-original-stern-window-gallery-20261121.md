# WORK 2 — original stern-window galleries (21 Nov 2026)

Base: PR #742, downstream of PR #29. Feature branch: `work2/original-stern-window-gallery-20261121`.

## Implementation
- `WebPreview/src/ship-stern-windows.ts` adds genuine, original raised 3D transom tracery and opaque emissive glazing (no transparent sorting).
- Scout has **2** lean lights; Fighter **3** framed frigate lights; Warship **5** admiral windows and double transom trim.
- Cabin modules `cabin-wood` (level 1), `cabin-raised` (level 9), `cabin-palace` (level 18) change actual geometry and finishes, yielding nine class/finish combinations.
- Two merged material batches per gallery; no additional lights, textures, animation, collision or physics.
- Decorative additions are inside disposable `modular-ship-accessories`, built by `applyShipModules`. Existing six guns, mast sails, sail wind and battle objects are untouched.

## Integration interface
- **WORK 4:** This does **not** confer a ship, cabin, gold, purchases or progression. Continue verifying `verifiedPlayerLevel`, `ownedShipClasses` and every `ownedModuleIds` through trusted services before any equip/save. Tier gates in `resolveLoadout` are cosmetic preview permissions, not purchase authorisations.
- **WORK 6:** The renderer can use `createPreviewSternWindows(shipClass,cabinModule)` through the existing `applyShipModules` path; no changes to page layout, ocean camera, shipyard focus contract or battle. Inspect the **STERN** camera preset to review the new shapes and avoid occlusion with the base cabin's windows and heraldry.
- **WORK 5:** Test all three classes x three cabin tiers and 1–20 demo levels, refit disposal, CPU/GPU budgets, portrait/landscape gestures and physically measure iOS/Android FPS before approval.

## Validation / safety
Node geometry unit tests cover nine designs, geometry bounds and tier/ownership isolation, invalid parameters, 60 consecutive refits and exactly-once resource cleanup. CI must run `cd WebPreview && npm ci && npm test && npm run build`. CI success is not a substitute for real visual review or device benchmarking. Remain draft; do not merge to `main`, alter battle or publish until approved. Unity is separate. Budget **€0**.
