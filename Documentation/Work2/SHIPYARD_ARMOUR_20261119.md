# WORK 2 — Original low-poly plating for the three ship classes (2026-11-19)

## What is in this PR

`WebPreview/src/ship-armor.ts` produces actual geometry, not an image or new purchase. The Scout receives swept chevron blades, the Fighter has compact tapered shields, and the Warship has a longer stepped hexagonal scale array. These are distinct side-on silhouettes, not only resized/recoloured copies. Both port and starboard are modelled.

The existing nine-slot, 27-part, level 1–20 system remains unchanged. `armor-none` creates no plates. `armor-iron` (level 7) produces graphite shields. `armor-royal` (level 16) adds embossed golden diamond ridges. Availability is resolved by `resolveLoadout` independently of any ownership. Visual preview never grants inventory, money, purchases, equipment rights, player progress or performance bonuses.

`applyShipModules` mounts a single fused plating mesh inside the existing disposable `modular-ship-accessories` sandbox group. Its cleanup reclaims both the merged geometry and the unique material. Both hull sides are combined into **one draw-call mesh**; no textures, requests or paid assets are added. It leaves `ships.ts`, the battle rig, combat physics, Porto, `main` and Unity unchanged.

## Coordination contracts

**WORK 4**: The independent verified `ownedModuleIds`, `ownedShipClasses` and `verifiedPlayerLevel` must still be supplied for a real equip operation. Preview-level eligibility does not imply acquisition. Server-side revalidation remains necessary before future persistence/purchase.

**WORK 6**: No modifications in this feature to Porto, `ships.ts`, `scene.ts`, `harbour.tsx`, or `main.tsx`. The armour helper is attached only in `ship-modules.ts`. Do not merge stacked Work 2 commits until #29 base conflicts are reconciled and Porto 1:1 fidelity is protected.

**WORK 5**: Run `cd WebPreview && npm ci && npm test && npm run build`; visually check plating does not cover guns/hull trim on 360–430px layouts, all three classes, level 1/7/16/20 and side-on orbit. Confirm no visual clipping or new scroll. Tests cover geometric differences, 60 level/class swaps, disposal events, class ownership and unlock separation, but **do not certify real iPhone/Safari or frame-rate**.

## Merge and release gate

Stacked draft feature PR based on #575 (not `main`), budget €0. CI must pass for this exact feature head and QA on a physical phone remains outstanding. This release does not modify published builds.
