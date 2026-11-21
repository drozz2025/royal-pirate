# WORK 2 — Original 3D cannon breeching (visual-only)

Branch: `work2/original-cannon-breeching-20261121`
Base: `work2/shipyard-visual-blueprints-20261121`

## Implementation

- `WebPreview/src/ship-cannon-breeching.ts` draws physically curved, low-poly breeching tackles along the **six existing broadside gunports**. `TubeGeometry` follows three anchor points per rope plus a sag; forged side eyebolts and gun collars add depth in close-up. This is original procedural naval art, using no paid models, textures or licenses.
- `scout` has one working line per cannon, `fighter` two and `warship` three. The bronze/steel/gold module changes the fitting metal and rope finish; gold also includes an engraved muzzle ring.
- All ropes are merged into **one** Three.js mesh and all metal parts into **one** other mesh per preview. Exactly 2 new editor draw objects regardless of class/refit. New assets belong to `modular-ship-accessories` and are disposed when switching configs or exiting.
- Reuses the official `cannons` module selection, its 1/8/17 preview level gates and existing three class silhouettes; **does not add a tenth module slot** or new inventory type.
- Coordinates are aligned with `makeShip()`'s six gun origins. Original battle meshes, collision, projectile spawning, damage, sounds, turn controls and stats remain unchanged.

## WORK 4 — economy, ownership and verified loadouts

`createPreviewGunBreeching` **does not equip** a part or grant a purchase. Only authoritative entitlements and `validateOwnedFleetForPlayer` may allow actual saved equipment, after server-side validation. The visual preview slider and blueprint import cannot authorize ownership.

## WORK 6 — Porto / Frota UI integration

- The new ropes appear automatically in the existing 3D shipyard when switching the `CANNONS` category, all classes and permitted visual levels.
- Never use a static screenshot in place of the live Three.js model. Keep the already approved navy-and-gold Porto composition and mobile hit targets.
- No new public route or battle API is required. Do not publish this draft PR until visual approval and real iPhone/Android FPS checks.

## Verification contract

Run `cd WebPreview && npm ci && npm test && npm run build` in a suitable environment. The new `ship-cannon-breeching.test.ts` checks nine geometry combinations, bounded two-draw layout, class progression, invalid ID rejection and class switching. Automated tests alone do **not** establish measured device FPS, visual approval or production readiness.

No modifications to `main`, Unity, balances, purchases or real ownership. Budget: €0.
