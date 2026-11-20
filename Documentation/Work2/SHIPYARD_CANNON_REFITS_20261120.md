# WORK 2 — Original procedural cannon upgrades (2026-11-20)

## Visual implementation
- Added `WebPreview/src/ship-cannons.ts`. Each of the Scout, Fighter and Warship now has a separate, genuine 3D cannon-barrel profile with distinct polygon counts and muzzle/breech proportions.
- Bronze, steel and royal-gold cannon module choices now change real 3D sleeves and reinforcement collars, not merely colours on flat icons. Six sleeves and all collars are merged down to **two meshes / two draw calls** per preview. One group owns the geometries, which are disposed when the preview is replaced.
- The original six guns made in `ships.ts` remain present. These cosmetic refits are added **only inside the isolated shipyard accessory group**. The game never changes battle projectiles, physics, aim, damage, cooldowns or cannon ownership because of a preview.
- Original art direction from `assets/design-approved/README.md`: naval silhouettes, restrained brass/gold, readable geometry on portrait mobile.

## WORK 4 — ownership, equipment, purchases
- The preview module IDs remain `cannons-bronze` (level 1), `cannons-steel` (level 8) and `cannons-gold` (level 17).
- `equipAccess` and `validateOwnedFleetForPlayer` remain the only client-side equipment gates; **they do not replace server verification**.
- Previewing any gold/steel design must not purchase or grant it. No fake coins, inventory, fleet ownership, stats or level values were added.

## WORK 6 — Porto/Frota integration
- `applyShipModules(root,rig,loadout)` still owns all sandbox preview art. Its signature has not changed. The new group lives under `modular-ship-accessories`.
- Do not reuse those added materials to change battle gun geometry. Keep camera/focus and harbour navigation separate.
- Keep work6 Porto and battle UI untouched until separately reviewed.

## WORK 5 — validation
- Added `WebPreview/tests/ship-cannons.test.ts` covering six real barrels, class silhouettes, three module tiers, level-vs-ownership distinction and dispose-on-swap.
- Run `cd WebPreview && npm ci && npm test && npm run build`. CI evidence must point to the new head commit; passing a previous branch commit is insufficient.
- Visual QA on real mobile Safari/Android, draw calls and FPS are **still pending**. JavaScript tests do not establish actual mobile performance.
- This PR is stacked on draft #601, itself dependent on #596 and earlier WORK 2 changes; historical #29 may still conflict with the WORK 6 base. Do not merge or publish until this chain is reviewed and the integration conflicts are resolved.

**Scope:** no changes to `main`, release, Unity, battle logic or economic state. €0.
