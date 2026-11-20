# WORK 2 — Original 3D hull relief (20 Nov 2026)

## Scope
Feature branch: `work2/original-hull-relief-20261120`, branched from the final reviewed head of PR #614. This is a **draft visual preview only**. No merge into `main` or production publication.

The new `WebPreview/src/ship-hull-relief.ts` builds real, original wood sheer-plank and raised fitting geometry that follows the base hull's nine cross-sections in `ships.ts`. It does not rely on screenshots or third-party 3D models. Visual direction: `assets/design-approved/README.md` and `03-frota.webp` — detailed central vessel, legible silhouette, restrained navy/gold accents.

Class profiles:
- **Scout**: one fine hull strake, two rivet stations per side, narrow bronze bow fairleads
- **Fighter**: two thicker strakes, three rivet stations per side, practical broadside reinforcement
- **Warship**: three heavy strakes, five rivet stations per side, extended gilded bow/stern bindings

Hull module finishes are visibly different: **oak** / **ironwood** / **royal**. Their level gates remain **1 / 6 / 15**, matching `SHIP_MODULES`. Every class/module combination is a real mesh, not a new separate ship asset. Each hull refit merges all wood parts into one geometry, all metal fittings into another: **two additional draw objects per preview**, instead of one per plank/stud. Its buffers/materials belong solely to the removable accessory group and are disposed on a preview change.

## WORK 4 — interface and ownership
- `createPreviewHullRelief(shipClass, hullModule)` draws appearance **only**.
- `resolveLoadout` checks module IDs and level unlocks, not ownership.
- Equip and persisted fleets must still go through the actual authenticated, server-authorized hull + module entitlements. `validateOwnedFleetForPlayer` remains a client-side preflight only.
- **No simulated coins, purchases, unlocked player state or saved inventory** are introduced.

## WORK 6 — integration constraints
- `applyShipModules` adds the hull relief only to the temporary `modular-ship-accessories` group used by the 3D Shipyard.
- The battle ship, original `makeShip(false)` call path, collision, damage and navigation are untouched.
- The renderer should measure actual draw calls, triangle count, FPS and GPU memory on low-end Android and a physical iPhone before merging or publishing.
- Retain the approved Porto visuals and 3D fleet composition; do not substitute a static image.

## WORK 5 — automated and manual QA
- New `WebPreview/tests/ship-hull-relief.test.ts` covers 9 combinations, per-class plank complexity, colour tiers, GPU buffer cleanup, unlock vs ownership.
- Run `cd WebPreview && npm ci && npm test && npm run build` in CI.
- Test touch rotation, module changes from levels 1 through 20, camera presets / focus, editor exit and **BATTLE → PORT** in real mobile browsers.

Pending manual visual and performance sign-off; no Unity asset export or physical-device test is claimed.
Budget: **€0**.
