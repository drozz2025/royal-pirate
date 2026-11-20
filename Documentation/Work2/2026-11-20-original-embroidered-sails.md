# WORK 2 — Original cambered sail embroidery (20 November 2026)

## Scope and artwork
Branch: `work2/original-embroidered-sails-20261120`, stacked on the draft hull-relief PR #620. Remains **preview-only**, zero-cost and unmerged. No third-party model or copied sail image; the geometry is original, loosely guided by `assets/design-approved/README.md` and `03-frota.webp` (legible ship silhouette, navy/gold trim, premium 3D detail).

`WebPreview/src/ship-sail-embroidery.ts` creates **one real, curved triangle-mesh overlay for both main sails**, following the actual billow formula and mast positions in `ships.ts`. This deliberately uses triangle strips instead of thin WebGL lines, which otherwise look inconsistently narrow on high-DPI phones. The two mainsails remain part of the original rig. Stitching is grouped into one mesh for **one additional draw object** in the temporary 3D fleet editor.

Distinct original silhouettes:
- Scout: light, asymmetrical diagonal wind stripes.
- Fighter: double broadside chevron and centre seam.
- Warship: diamond emblem, crossed stitching and a crowned silhouette.

Every class is available in all three existing sail dyes (cream at level 1, crimson at level 5, night at level 12), with distinct thread contrast. Nine class/dye combinations are physical geometry. No new 20-level duplicates or separate paid SKU is created.

## WORK 4 — Ownership / purchase contract
The preview calls `createPreviewSailEmbroidery(shipClass, sailModule)` only **after** `resolveLoadout` validates the level gate. Being visible or unlocked does **not** prove ownership, player level, a purchase, currency, hull entitlement or equipped inventory. Keep actual fleet saves behind `validateOwnedFleetForPlayer` and a trusted backend entitlement check. Never derive an account balance or ownership from the preview.

## WORK 6 — Editor/render integration
`applyShipModules` attaches the overlay only under `modular-ship-accessories`. When switching class, level or dye, existing GPU geometry/material is disposed by the accessory lifecycle. Battle, Porto, damage model, rig mechanics and physics are untouched; `makeShip(false)` without a loadout retains its prior appearance.

The new overlay uses one mesh and under 1,000 triangles across both sails. This is a **code-level budget, not a measured device FPS claim**. WORK 6 must visually check readability, fabric depth, sail alignment and clipping at five camera angles, portrait/landscape, low-end Android and a real iPhone. Do not publish without that validation.

## WORK 5 — Tests
`WebPreview/tests/ship-sail-embroidery.test.ts` covers all nine mesh combinations, non-flat mast positions, class-specific geometry, dye contrast, bounded vertices, buffer and material disposal, original rig preservation, and unlock-vs-ownership separation.

Run `cd WebPreview && npm ci && npm test && npm run build` via GitHub Actions. Physical iPhone/Safari validation, draw-call/FPS measurement and Unity import are not claimed.

## Integration and dependency chain
PR #29 remains a separate historical draft with unresolved WORK 6 base-branch conflicts. This branch is stacked on #620; WORK 4 and WORK 6 should review it as a separate incremental patch. Do not merge to `main`, modify the public deployment, or replace battle assets before QA approval.

Budget: **€0**.
