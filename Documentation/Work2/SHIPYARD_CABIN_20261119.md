# WORK 2 — Original 3D cabin galleries (2026-11-19)

## Concrete feature

`WebPreview/src/ship-cabin.ts` models **nine genuine procedural 3D cabin silhouettes**: three classes × three tiers. Scout has a swept narrow quarterdeck canopy, Fighter a broad twin-gable fighting cabin, and Warship a crowned admiral transom. The `cabin-wood` (level 1), `cabin-raised` (level 9), and `cabin-palace` (level 18) modules change visible geometry rather than merely colour.

Cabin roof sections, frames, side finials, eaves and upper palace roof are merged into **one Three.js mesh/material/draw call** for each active class and tier. Geometry is low-poly and has no external assets, textures, runtime fetching, paid dependencies or collision/hitbox updates. Resources belong to the disposable `modular-ship-accessories` preview group and are released on a change of hull/module.

Original design follows `assets/design-approved/README.md` (gold on rich navy, detailed 3D ship, premium tropical naval direction), while avoiding a screenshot/background substitute. This is preview art and **not** a visual-fidelity claim against the approved screenshots until human QA.

## Ownership and integrations

**WORK 4:** The cabin module's minimum level is checked by `resolveLoadout` for preview. It is **not** a grant of inventory, currency, hull ownership or a purchase. For real equips, WORK 4 must supply trusted `ownedModuleIds`, `ownedShipClasses`, and `verifiedPlayerLevel`; use `validateOwnedFleetForPlayer` in the UI and revalidate server-side before any persistence. No money, entitlements or balances were generated here.

**WORK 6:** Integration is confined to `ship-modules.ts` and a new `ship-cabin.ts` helper; no changes to `ships.ts`, Porto, battle, navigation, physics, or published files. This branch stacks on PR #582; integrate only after PR #29's historical conflicts have been handled without losing the approved Porto.

**WORK 5:** Run `cd WebPreview && npm ci && npm test && npm run build`. `ship-cabin.test.ts` covers 3 class silhouettes × 3 cabin tiers, 60 class/level switches with replacement and resource disposal, draw-call constraints, and verified ownership. Still required: physical mobile iPhone/Safari 360–430px orbit testing, check roof placement from aft and port/starboard (no occluding flags/helm/guns), record actual FPS and GPU memory, confirm no new vertical scroll.

## Release gate

Feature PR is draft, not published; no merge to `main`, Porto, battle or Unity. Budget **€0**. CI is evaluated against the **exact final commit** before any integration. Automated tests do not certify iPhone rendering or visual quality.
