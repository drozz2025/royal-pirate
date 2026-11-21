# WORK 2 — Sculpted keel and cutwater for all three classes (21 Nov 2026)

Branch: `work2/original-keel-cutwater-20261121` — based on [PR #733](https://github.com/drozz2025/royal-pirate/pull/733), itself following [PR #29](https://github.com/drozz2025/royal-pirate/pull/29). Draft: do not merge or publish until visual and mobile QA.

## Actual 3D work

`WebPreview/src/ship-keel-cutwater.ts` builds original physical keel scarf joints, a swept bow stem/cutwater, mirrored timber bow knees, a stern post, forged perimeter edges and level-refit fittings. There are nine variants: Scout (1 knee pair, sharp extended stem), Fighter (2 broad brace pairs), Warship (3 tiered heavy knee pairs). Three already-defined hull modules control original PBR finishes and physical embellishment at their existing gates: oak (level 1), ironwood (level 6), royal (level 15). No additional unlock, price, purchase, ownership or inventory state was created.

All parts are *editor-only*. The renderer receives exactly two static merged opaque meshes per active keel model, no separate lights, animations, textures, collision, physics or unbounded loops. The existing Shipyard lifecycle owns their disposal. This visual extension does not replace the battle hull or sailing logic.

## Integration contract

- **WORK 4:** `hull-oak / hull-ironwood / hull-royal` visual tiers still require authenticated ship-class ownership, owned module IDs and an independently verified player level via `validateOwnedFleetForPlayer` plus trusted backend checks. This module contains **no grants, purchases, balances, saves or equipped entitlements**.
- **WORK 6:** the Shipyard uses the temporary `applyShipModules` group; the added `createPreviewKeelCutwater` draws are visible from bow/front and low three-quarter views. Compare ship silhouettes with `assets/design-approved/03-frota.webp` and `00-referencia-original-aprovada.webp`. Do not publish automatically.
- **WORK 5 QA:** review visual overlap with the existing bow anchors, figurehead and waterline and measure actual FPS/heat on physical iPhone and Android. CI success is **not** a real-device FPS result.

## Verification

Run in `WebPreview`: `npm ci && npm test && npm run build`. Tests cover all 9 geometry combinations, level 1–20 across all classes, early unlock rejection, class-specific silhouette, preview ownership isolation, two-draw budget and exact-once GPU resource disposal.

Budget €0. Main, Unity, battle and published site must remain untouched.
