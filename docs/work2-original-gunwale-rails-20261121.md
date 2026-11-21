# WORK 2 — Class-specific original 3D gunwale balustrades (21 Nov 2026)

Draft feature branch `work2/original-gunwale-rails-20261121`, based on [PR #735](https://github.com/drozz2025/royal-pirate/pull/735), whose dependencies lead back to [PR #29](https://github.com/drozz2025/royal-pirate/pull/29). No merge or public deployment is authorised before visual/mobile QA.

## Implementation
`WebPreview/src/ship-gunwale-rails.ts` builds original carved raised timber handrails and forged post caps over both gunwales, with a real three-dimensional silhouette. Scout has three low, swept post pairs; Fighter has five upright pairs and openwork; Warship has seven taller heavy pairs, openwork and a lower rail. These are geometric distinctions, not rescaled copies. Three existing cosmetic ornament tiers change PBR finishes and physical fittings at levels 1, 8 and 19. All 20 levels remain usable through the existing 27-module preview system. Each combination uses exactly two merged opaque Mesh objects, no new lights, texture assets, update loops or collision objects.

## Ownership, battle and performance
Preview is purely local and disposable. No new inventory, currency, balances, prices, purchases, ship grants or stats. WORK 4 must still enforce true ship ownership, verified level and module entitlements server-side, independently of visual unlock gates. The battle model and controls are untouched. Each complete preview replaces its prior two rail meshes and disposes their GPU buffers/materials; the shared base ship remains separate.

## Handoff
- **WORK 6:** inspect the quarter, broadside and low 3D viewpoints against `assets/design-approved/03-frota.webp` and `00-referencia-original-aprovada.webp`, including possible intersection with existing hull relief, rope shrouds and waves. Do not deploy automatically.
- **WORK 4:** continue using `validateOwnedFleetForPlayer` and backend entitlement checks. Ornament preview does not confer ownership or an equipped item.
- **WORK 5:** verify Safari/Chromium touch controls, physical iPhone and Android FPS, thermal load, memory on repeated refits, and visual collisions. A successful CI build is not evidence of these checks.

Run `npm ci && npm test && npm run build` in `WebPreview`. Six regression tests cover nine variants, 3 distinct silhouettes, true tier locks, 60 refits, exactly-once disposal, draw budget and invalid values. Budget €0.
