# WORK 2 — original 3D gunport shutters (20 November 2026)

**Scope:** WebPreview fleet editor only. Feature branch `work2/original-3d-gunport-shutters-20261120` is stacked on draft PR #668 (`work2/original-3d-stern-rudders-20261120`). No `main` change, deployment, Unity change or battle edit. Cost: **€0**.

## What is implemented
- `WebPreview/src/ship-gunport-shutters.ts` creates six physical **open** wooden gunport shutters: three along each gunwale, above the unchanged six cannon barrels. They are actual raised 3D planks and forged hinges; no flat PNG.
- **Scout**: slim single-board covers with one hinge. **Fighter**: wider paired covers with twin hinges and a clamp. **Warship**: three-board royal covers with triple hinges, outboard ribs and metal finials.
- `cannons-bronze` has basic hinges; `cannons-steel` adds physical retaining straps and studs; `cannons-gold` adds a raised three-point insignia. **9 original geometry combinations** across class and cannon tier. The upgrade levels remain those of the existing 27-piece module catalogue: 1 / 8 / 17 for the cannon options, with preview levels 1–20.
- All wood panels share **one merged mesh**, and every forged fitting shares **one other merged mesh**: two draw objects per ship. GPU geometries and materials are released by the existing preview-resource cleanup.
- `ship-modules.ts` integrates the feature only inside `modular-ship-accessories`. This does not change the battle ship, cannon muzzle geometry, collision, attack damage, reload, saved loadouts or player state.

## Handoff to WORK 4
`resolveLoadout`/module preview does **not** authorize equipping or grant ownership. Never infer a purchase, hull ownership, coins, entitlement or level from the new appearance. The existing `validateOwnedFleetForPlayer` remains the equip gate and must be backed by authoritative server validation when persistence/payments exist.

## Handoff to WORK 6
The existing **CANNONS** tab and level slider already choose the variant. No extra button, screen, image asset or commerce state is required. Inspect from the existing **PORT**, **STARBOARD** and **3/4** cameras to verify that both port covers remain visibly raised above muzzle lines. The three classes should remain clearly differentiated in smartphone portrait.

## WORK 5 QA and release constraints
`WebPreview/tests/ship-gunport-shutters.test.ts` checks all 9 variants, finite 3D geometry, left/right/stern-to-bow coverage, mobile vertex/triangle bounds, strict two-draw batching, 60 class × level previews, duplicate-free disposal and no fabricated inventory. In `WebPreview`, execute `npm ci && npm test && npm run build` and review GitHub Actions results.

Before integration, **still required**: real Safari/Chromium device visual review, FPS/draw-call measurements and GPU memory inspection on iOS/Android; check shutters do not occlude gun muzzles or fight the approved visual references in `assets/design-approved`. These checks are NOT implied by unit tests. Keep the PR in **draft** and do not publish until validated.
