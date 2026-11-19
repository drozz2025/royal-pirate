# WORK 2 — Procedural class-specific stern heraldry (19 November 2026)

## What ships actually get
The separate 3D **Shipyard preview** now mounts one original gilded stern relief per class, visible by orbiting the ship:
- **Scout:** circular compass rose with four points and small ornamental feet.
- **Fighter:** crossed cutlasses on a command shield.
- **Warship:** tall five-spire admiral's crown, with a curved rail and crest.

These are true 3D geometry, not copied textures, external models, static screenshots, or a change to the battle ship. This follows the navy/gold art direction at `assets/design-approved`; no paid assets.

The `ornaments` module is reflected visibly: plain relief at level 1; two extra brass bosses for `ornaments-lanterns` (unlock level 8); side scrollwork for `ornaments-legendary` (unlock level 19). The selected module goes through `resolveLoadout` before the preview mesh is built; **unlock does not imply ownership**.

## Mobile constraints
`WebPreview/src/ship-heraldry.ts` combines all small geometric primitives into **one indexed BufferGeometry and one MeshStandardMaterial**, so each crest costs **one draw-call object**. Temporary source geometries are disposed immediately after merging. The mesh is owned by the `modular-ship-accessories` group and released exactly once on replacement; it never attaches to the combat damage rig. No new textures or large asset downloads.

## Worker interfaces
**WORK 4:** Continue passing separately verified `ownedModuleIds`, `ownedShipClasses`, `verifiedPlayerLevel`, and `onEquip` through `Shipyard`. Visual-only heraldry introduces no ownership, inventory, currency, purchases, save action, or entitlement.

**WORK 6:** Keep approved Porto UI, battle, `ships.ts` and `main.tsx` unchanged. The isolated call in `applyShipModules` is additive and can be reviewed once #29 has been reconciled. Do not automatically merge the stacked PR into Porto/main.

**WORK 5:** Run `cd WebPreview && npm ci && npm test && npm run build`; inspect class crests at mobile widths while rotating/orbiting; verify visibility behind existing stern cabin/flag at each class. The automated tests validate geometry, trim differences and 60 class/level swaps but **cannot certify physical iPhone visuals, measured FPS or Safari rendering**.

## Release policy
This is a **draft stacked PR** based on the original standing-rigging feature PR #567. No production publishing, main update, battle changes or Unity assumptions. Integration only after green CI and visual/mobile QA. Budget: 0 €.
