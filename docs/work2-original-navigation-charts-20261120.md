# WORK 2 — Original 3D navigation chart tables (2026-11-20)

## Scope and visual references
New fully procedural quarterdeck navigation tables for `Scout`, `Fighter`, `Warship`. The geometry follows `assets/design-approved/README.md`: carved wood, navy/brass luxury styling, readable silhouettes in mobile, original 3D rather than static 2D screens.

- `WebPreview/src/ship-deck-chart.ts`: nine unique class × ornament-tier combinations; four merged mesh batches (wood, parchment, brass, physical archipelago strokes), no external asset downloads.
- Position near `x=-0.78,z=-0.88` on the port side; balances the starboard compass at `x=+0.75,z=-0.65`; stays above the deck and clear of the mast.
- `ornaments-simple` (level 1), `ornaments-lanterns` (level 8), `ornaments-legendary` (level 19) adjust sculptural finishes. These are only **preview unlock thresholds**.
- `applyShipModules` attaches the chart exclusively to the disposable `modular-ship-accessories` group; the existing lifecycle disposes buffers/materials on replacement.

## WORK 4 contract
Keep `verifiedPlayerLevel`, `ownedModuleIds`, `ownedShipClasses` independent from the demo slider. `equipAccess` and `validateOwnedFleetForPlayer` remain the guards; real backend verification remains mandatory. This preview adds **no purchases, currency, ownership or functional navigation**.

## WORK 6 contract
The chart is an original grouped 3D object named `shipyard-<class>-<ornaments>-navigation-chart`, to support optional camera inspection. Do not replace the battle ship, battle camera, collision, or the player ship's persisted state. No UI route change is needed. Leave all PRs draft pending visual approval in mobile Safari/Chrome.

## Checks
`cd WebPreview && npm ci && npm test && npm run build` in GitHub Actions on the feature branch. New automated cases cover nine variations, 60 class/level previews, finite geometry bounds, GPU disposal once and unknown/not-owned entitlements. The tests cannot establish FPS in physical iPhone/Android devices or image fidelity; these remain open checks.

**Branch:** `work2/original-navigation-charts-20261120`, stacked on `work2/original-compass-binnacles-20261120`. No `main` merge or deployment. **Budget:** €0.
