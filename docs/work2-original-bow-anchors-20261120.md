# WORK 2 — Original 3D bow anchors (20 November 2026)

## Model and class changes

This is a **draft stacked feature** on `work2/original-deck-capstans-20261120` (PR #640). It affects only the separate Three.js fleet editor, not Porto, battle, published pages, Unity, hitboxes or user accounts.

- **Scout**: one compact starboard anchor, three real geometry chain links, thin forged stock and compact hawse ring.
- **Fighter**: matching port/starboard broadside anchors, four links each, broader cross-stock and shank.
- **Warship**: two scaled royal anchors with five links per side, gold hawse plates, ceremonial fittings.
- `hull-oak` (level 1): dark forged anchor and standard hawse fitting; `hull-ironwood` (level 6): added retaining bands; `hull-royal` (level 15): additional gilded tines and bosses.
- Each of the nine class/hull combinations builds **two merged PBR meshes** for the anchors, chains and fittings; all owned resources are disposed with the editor accessory group.
- Implemented in `WebPreview/src/ship-bow-anchors.ts` and connected from `applyShipModules`. The values in `SHIP_MODULES` and the class access contract are unchanged.

## WORK 4 — ownership and equipment contract

These hull tiers are **appearance previews** unlocked by the sandbox level selector. `highestUnlockedPreviewModules(level)`, `resolveLoadout` and these meshes **never** confer ownership or make a purchase. For persistent outfitting, WORK 4 must supply backend-verified level, owned ship classes and entitlements, then call `validateOwnedFleetForPlayer` server-side before saving a loadout. No simulated coins, gems, purchases or player progress are created.

## WORK 6 — integration and UX contract

The sculpted anchor hangs on the lateral bow; inspect its clipping with the railing, ropes, hull curvature, waterline and figurehead at all five editor camera presets. Use `assets/design-approved/03-frota.webp` as the visual reference. The additional meshes are mounted **only** under `modular-ship-accessories` and are not integrated with combat hitboxes. Do not publish or merge solely on green CI. WORK 6 should validate touch rotation and zoom in iPhone portrait, then check whether the ornament remains legible at the default camera distance.

## WORK 5 — QA and release gate

The automatic `WebPreview` tests check all nine combinations, mesh attributes and budgets, 60 consecutive preview changes, cleanup and lack of invented ownership. The feature workflow runs `npm ci`, `npm test`, and `npm run build`. This does **not** measure mobile FPS, real GPU draw calls, visual fidelity, battery impact or performance on a physical device. Device validation, visual approval and an explicit human-controlled integration decision are still required.

**Status:** draft feature only; never merge to `main` or deploy automatically. Budget €0.
