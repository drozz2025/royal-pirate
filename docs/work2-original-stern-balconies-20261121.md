# WORK 2 — sculpted stern lookout balconies (21 Nov 2026)

Base: draft PR #746, downstream of draft PR #29. Feature: `work2/original-stern-balconies-20261121`. **Not merged or published.**

## Implementation
- `WebPreview/src/ship-stern-balconies.ts` creates original, physical aft cantilevered platforms with diagonal knees, a gently swept railing, wooden stanchions and forged end caps. Two opaque merged PBR meshes per preview; no textures, shadow casting, transparent sorting or additional dynamic lights.
- Scout: narrow raider's lookout, **3 posts**, no wings or lower rail.
- Fighter: broadside frigate aft balcony, **5 posts** and wing extensions.
- Warship: deeper admiral's gallery, **7 posts**, wing guards and an extra lower rail.
- `cabin-wood` (1), `cabin-raised` (9), `cabin-palace` (18) each change the actual geometry and material finishes, producing nine class/cabin combinations through existing, enforced level gates.
- Integrated through `applyShipModules` into temporary `modular-ship-accessories` only. Base hull, battle ships, guns, physics and purchases are unchanged; preview refits release GPU resources.

## Handoffs
- **WORK 4:** The preview level and cabin geometry are *not* evidence of unlock ownership, hull possession, payment or inventory. Continue using `validateOwnedFleetForPlayer` with independently verified player level, owned hull class and all nine owned modules; recheck on a trusted server before persistence.
- **WORK 6:** Keep the existing `Shipyard` 3D callback. Review these physical balconies using the `STERN` and `QUARTER` camera presets and check that the balcony rail does not obscure the lower edge of the separate stern windows or the rudder. No page layout or camera API changes.
- **WORK 5:** Inspect nine visual combinations on real iOS/Android devices, measure FPS/frame time and touch orbit, and check overlap with `ship-stern-windows.ts`, `ship-stern-rudders.ts` and other stern props. An automated 5k-vertex-per-mesh cap is a guardrail, **not** a mobile FPS measurement.

## Validation and release gate
Run from WebPreview: `npm ci`, `npm test`, `npm run build`. Node tests cover nine combinations, class silhouette, level/ownership rejection, invalid parameters, 60 refits, disposal and bounded vertices. Observe GitHub Actions result before reporting success. Draft PR only: do not merge to main, touch combat or deploy until visual approval and real-device testing. Unity remains parallel. **€0.**
