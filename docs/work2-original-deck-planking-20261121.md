# WORK 2 — Original 3D deck planking (21 November 2026)

Feature `work2/original-deck-planking-20261121` descends from [PR #737](https://github.com/drozz2025/royal-pirate/pull/737) and ultimately draft [PR #29](https://github.com/drozz2025/royal-pirate/pull/29). No deployment, merge or modification to `main`.

## Art and integration
`WebPreview/src/ship-deck-planking.ts` overlays the existing flat wooden deck at y≈1.97 with actual low relief dark wood grooves, staggered board-end joints and forged inset fasteners (not a texture/decal). Scout has four long seams and two stagger rows, Fighter six seams and three rows, and Warship eight seams, four rows and a small distinctive herringbone quarterdeck inlay. Existing `hull-oak`, `hull-ironwood`, `hull-royal` preview modules select three finishes. Each of nine combinations uses exactly **two opaque merged 3D mesh draws**, no shader downloads, dynamic lights, textures or animation loop. All 20 levels retain their existing visual gates.

## Safety and ownership
The inlays live inside `modular-ship-accessories`. They never change the playable ship, combat, collision, currency, player progress or fleet ownership. `validateOwnedFleetForPlayer` remains the real equip guard for WORK 4, and WORK 4 must verify purchases/equipment again server-side. The preview level is never the verified level; no module is granted by selecting a preview.

## WORK 4 / WORK 6 / WORK 5
- **WORK 4:** pass only authenticated ship/class/module ownership and player level for real equipment. This art requires no extra inventory item.
- **WORK 6:** inspect top/deck and quarter views against `assets/design-approved/03-frota.webp`. Verify inlays remain aligned with deck, do not obscure hatches, capstans and cannon gear, and contrast in bright/dark mobile conditions. Do not publish without visual approval.
- **WORK 5:** measure physical iPhone/Android FPS, draw calls, memory after repeated refits and any intersections. Passing Node tests is not device QA.

## Automated checks
Six Node/Three tests cover nine variants, distinct three-class physical seam patterns, appropriate levels and no fake ownership, geometry bounds, 60 changes and exactly-once release of both GPU resources. Run `npm ci && npm test && npm run build` in `WebPreview`. Budget €0.
