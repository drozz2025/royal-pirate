# WORK 2 — temporary 3D shipyard visual A/B reference (2026-11-21)

**Scope:** isolated WebPreview shipyard editor. This feature does not merge to `main`, affect battle/Unity, deploy a website, create purchases or grant fleet ownership. All art expenditure €0.

## Behavior

1. Press **PIN REFERENCE A** to deep-copy the currently selected ship class, level 1–20 and the nine visual module selections for each of the three classes into a memory-only reference.
2. Continue editing the working **B** model: change Scout / Fighter / Warship, preview level and module combinations normally. The existing Undo/Redo stack belongs only to B.
3. Press **VIEW PINNED A** and **VIEW CURRENT B** to alternate the *same live Three.js scene and camera*, allowing direct visual comparison without screenshots, separate renderers or duplicate 3D scenes.
4. While viewing A, class changes, level slider, part selection, maximum preview, reset, Undo, Redo and real equip callbacks are disabled. Camera views, focus inspection and scrolling remain usable. **CLEAR A** discards the temporary reference.
5. A status line reports class changes, preview-level changes and the number of module selections that differ. The count compares default-resolved values, not just raw keys.
6. Closing Shipyard unmounts the React view and discards A and B as before.

## Data/API contracts

- `capturePreviewReference(draft)`: validates all three class configurations with `resolveLoadout`, then deep-copies only `shipClass`, `level` and `selectedByClass`. Unknown or level-locked components are rejected.
- `comparePreviewReference(pinned,working)`: returns `{classChanged,levelChanged,changedSlots}` using the resolved nine-slot module configurations.
- `Shipyard` still calls `onPreview({shipClass,level,modules})`. While showing A it sends reference A; when returning to B, sends working B. The scene's existing `syncShipyardPreview` logic reuses unchanged GPU geometry and rebuilds only when class/module selections differ.
- The reference cannot be equipped: `equipEnabled` is false while A is displayed. On B, existing Work 4 verified player-level, class ownership and module ownership guards remain in force.
- No localStorage, server access, account state, inventory, payment, currency or persistence is introduced.

## Work handoff

**WORK 4:** `PIN REFERENCE A` never means fleet possession or purchase. Retain the original independently validated ownership/level/equip interfaces; do not use a pinned reference as an entitlement source. Server must still authorize any eventual equip/persistence.

**WORK 6:** keep the 3D canvas and camera singleton. All temporary view switching uses the same `onPreview` callback. Verify this editor's extra A/B action row fits mobile portrait with safe areas and does not overlap Port/Battle. No new routes or changes to combat camera are required.

## Verification and release gates

Run `cd WebPreview && npm ci && npm test && npm run build`; check the branch's non-deploy GitHub Actions workflow. New pure tests cover immutable snapshots, default-resolved module differences, invalid/locked modules and accessible disabled controls.

Manual approval still required: class A/B switching, zoom/orbit, narrow phones, iOS Safari/Android Chrome and actual frame-time measurements. Automated build success alone **does not** establish physical mobile FPS or visual approval. Keep this PR in **draft** and do not deploy or merge without those checks.
