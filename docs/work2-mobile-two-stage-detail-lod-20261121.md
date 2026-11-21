# WORK 2 — two-stage mobile detail LOD (21 November 2026)

Status: feature branch `work2/mobile-two-stage-detail-lod-20261121`, **draft only**, based on `work2/original-deck-casks-20261121`. No merge, battle change or deployment. Cost: €0.

## Change
- The existing 3D ship editor keeps all 9 configurable slots, all 3 original ship silhouettes, all 20 preview levels, and every real mesh on desktop or normal camera distance.
- At a small-screen viewport (<=820 CSS px) and an orbit distance >=30, **five tiny** deck groups stop drawing: bell, compass, navigation chart, rope coils, hatches.
- Farther out at >=38, **five more** small groups stop drawing: decorative casks, shot racks, capstans, boarding ladders and stern lanterns.
- Both bands have 4 world-unit hysteresis: secondary returns at <=34, tiny details at <=26. Zooming in restores their same meshes without allocating GPU buffers.
- Original hull, sails, cannons, mast silhouettes, planking, figureheads, longboats, windows, balconies and railings are never culled by this logic.
- This reduces at most ten accessory *groups* on distant narrow-screen views (not a measured GPU draw-call reduction). No measured FPS claims. It adds no assets or bundle-heavy geometry.

## WORK 4 integration
No financial, entitlement, ownership or persistence changes. Unlock-by-level still differs from actual equipment rights; all preview-only groups keep `previewOnly:true`. The same server-side player/ship/module verification remains mandatory before equipping.

## WORK 6 / WORK 5 QA gate
The editor uses the existing `updateShipyardDetailLOD` call in `scene.ts`. In manual review check portrait phone close / medium / far zoom for visibility restoration, class and level switches, high-DPR quality, and 360-degree orbit. Verify battle -> port -> shipyard -> port -> battle is unchanged. Measure FPS, triangle count and draw calls **on physical phones** before approving. The new tests only verify JS geometry visibility and preservation, not visual fidelity or physical device performance.

## CI
`cd WebPreview && npm ci && npm test && npm run build` must pass on this branch. Do not publish or merge until visual and mobile QA approval.
