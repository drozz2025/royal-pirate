# WORK 2 — Original procedural hanging hull fenders (preview only)

- Branch: `work2/original-hull-fenders-20261121`
- Target: `work2/original-cannon-breeching-20261121` (draft PR #768)
- All changes remain isolated from `main`, battle, Unity, purchases and deployment
- Budget: **€0**

## Implemented

`WebPreview/src/ship-hull-fenders.ts` constructs original low-poly, rope-wrapped cork dock fenders suspended from the gunwale. These are physical Three.js 3D meshes, **not** image sprites. A cambered lathe body, woven rope helix, class-dependent radial lashings, suspension line and forged upper eyelet are combined into exactly **two opaque GPU mesh draws** for each fully assembled preview.

| Preview hull | Pairs | Fenders | Cord wraps per fender |
| --- | ---: | ---: | ---: |
| Scout | 1 | 2 | 2 |
| Fighter | 2 | 4 | 3 |
| Warship | 3 | 6 | 4 |

Existing canonical visual hull modules (`hull-oak`, `hull-ironwood`, `hull-royal`) control three original cork/cordage finishes: **nine class/refit combinations**, retaining their established level gates (1 / 6 / 15). No tenth equipment slot, no ship stat modification, no extra battle objects. The fenders appear only in the disposable `modular-ship-accessories` group and do not grant cargo, armour, hull ownership or any resource.

The original base hull's longitudinal station widths are used to position the fenders close to the curved hull, rather than floating at one fixed beam. Their class-dependent size/rope detail produces genuinely distinct original side profiles. All source geometry is built at runtime without third-party models or paid textures.

## Mobile and lifecycle

At the furthest zoom on narrow mobile viewports, the fenders now join the **secondary** visual LOD tier. They disappear past 38 camera units and reappear at 34, using the same existing hysteresis as other miniature deck props. Desktop close-up keeps all details. Nothing is rebuilt solely for a distance change. Switching model/class disposes the old merged geometries and materials.

## WORK 4 — Verified economy

Keep real, authoritative class ownership, module entitlements and real player level independent of the demonstration slider; `validateOwnedFleetForPlayer` remains the only existing equip gate. Fenders are **not inventory items**. A blueprint import or higher preview level must never allocate equipment or purchases.

## WORK 6 — Porto and responsive editor

The live 3D preview automatically renders fenders when `HULL` is selected. The 3D editor and Porto layout remain unchanged. Preserve camera orbit, mobile touch controls, level 1–20 module navigation and existing full 3D inspection view. Never publish this draft until the approved visual direction, responsive checks and physical-device performance are validated.

## Verification

The added `ship-hull-fenders.test.ts` covers all nine models, class-specific geometry budgets, finish variation, invalid-input failure, cleanup and live editor LOD behavior. The updated `shipyard-detail-lod.test.ts` verifies the full six-item secondary tier in addition to the five tiny props.

Run in CI: `cd WebPreview && npm ci && npm test && npm run build`. CI on GitHub validates static/unit behavior only; performance on real iOS/Android hardware and visual approval remain required. No paid assets, no deployment.
