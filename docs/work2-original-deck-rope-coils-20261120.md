# WORK 2 — Original 3D deck rope coils and belaying cleats (20 November 2026)

## Implementation

Draft stacked on PR #645 (bow anchors), not on main. The original, independent Three.js fleet editor now has working-deck rope sculptures. Each class has a physically different layout:

- Scout: 2 compact rope stations along the forward working deck.
- Fighter: 4 stations on port and starboard fore/aft.
- Warship: 6 stations along the long heavy deck.
- Standard mast rig (level 1) has 2 rope loops at each station; Raider rig (level 6) has 3 plus pin/retaining ring; Royal rig (level 15) has 4 and gilt eyelets.
- The rope turns are horizontal tube geometry, not image decals. Each has a separate cleat, retaining fittings, and short loose tail.
- All rope geometry is batched in one mesh and all cleat geometry in another, limiting the feature to two preview draw objects.
- Resources are owned by and disposed with the temporary modular-ship-accessories group on each refit. There are no new collisions, weapons or combat changes.

Code: WebPreview/src/ship-deck-rope-coils.ts and applyShipModules() in ship-modules.ts. Unit tests cover all nine class/mast variants, finite vertex coordinates and budget, 60 class/level refits, disposals and absence of fabricated ownership. CI workflow runs npm ci, npm test, npm run build on the feature branch.

## WORK 4 contract

The mast variants are **preview appearance unlocks**, not acquisitions. Actual saved equipment requires independent server-verified player level, ship-class ownership, and per-module entitlements. Use the existing validateOwnedFleetForPlayer contract with authenticated data before persistence. There is no player inventory, wallet, purchase history or rank generated here.

## WORK 6 and WORK 5 contract

Preserve the editor's five camera angles, part FOCUS, orbit and pinch-to-zoom. Check rope coils against capstans, railings and deck in the approved fleet direction assets/design-approved/03-frota.webp, at portrait phone size. On hardware, confirm no z-fighting or hidden ornaments and measure FPS/real GPU draw calls. Source and CI tests do **not** constitute approval of visual quality or an iPhone benchmark.

**Release gate:** Draft only; do not merge main, modify the battle or publish until mobile visual QA and interface integration have been reviewed. Unity remains separate. External spend: €0.
