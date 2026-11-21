# WORK 2 — Visual blueprint sharing (2026-11-21)

## Scope
Feature branch `work2/shipyard-visual-blueprints-20261121` is stacked on `work2/shipyard-unlock-milestones-20261121` (PR #762), and ultimately WORK 2 PR #29. **Draft only**; do not merge to main, deploy or modify battle logic until reviews/QA.

The live React 3D shipyard now offers a collapsed **VISUAL BLUEPRINT** panel. It exports a versioned `RPV1.` code from the local editor draft (current class, visual demo level 1–20, and selections for all 3 independent hull classes). It accepts the code to reconstruct the complete sandbox preview; the action participates in undo/redo history and can be compared with a pinned A visual reference. It does not equip or persist anything. It never reads or exports user accounts, ownership, balances, payments or rankings.

- Strict decoder refuses unsupported versions, oversized/invalid codes, additional fields, unknown slots or IDs, invalid classes/levels, and any module locked above the preview level.
- The copied code is an aesthetic recipe, not a purchase receipt, progression entitlement, verified level or owned fleet.
- Mobile UI has accessible labels, disabled import while viewing pinned reference A, manual code selection and a best-effort clipboard button; failures display a clear fallback.
- The existing `validateOwnedFleetForPlayer` and WORK 4 server-side entitlement integration remain **mandatory** for any later genuine equip/persistence.
- No changes to battle code, harbour/WORK 6 navigation, money, prices, fleet ownership, native Unity, game physics or publication.

## WORK 4 interface
Treat all imported designs as untrusted visual input. **Never** use the imported level or module IDs as proof of player progress, verified inventory or hull entitlement. If adding a future "Equip" persistence action, verify all three separately on the server: authenticated class ownership, owned module IDs, and actual verified player level, using the canonical catalogue.

## WORK 6 integration
Use `Shipyard`'s existing `onPreview` callback after importing, as for normal editor changes; no new rendering API is required. Preserve the preview-root isolation from the battle ship. This panel is hidden in FULL 3D VIEW, restoring screen space.

## WORK 5 review
Automated unit/SSR tests cover 20 levels × 3 classes × 9 visual slots, round trips, immutable drafts, malformed/untrusted payloads, no ownership fields and the mobile panel markup. Physical iPhone/Android QA, tap targets, keyboard/VoiceOver checks and FPS remain **unverified**, regardless of CI status.

## Validation
The no-deploy GitHub Action `.github/workflows/work2-shipyard-verify.yml` executes `npm ci`, `npm test`, `npm run build` on this feature branch. Confirm the run status before integrating. Budget €0.
