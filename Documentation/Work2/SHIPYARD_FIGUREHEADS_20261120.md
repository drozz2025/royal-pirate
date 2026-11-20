# WORK 2 — Bow figurehead refit / coordination (2026-11-20)

Source branch: `work2/original-prow-figureheads-20261120`; base: `work2/original-modular-cannon-collars-20261120`. **Draft / preview only / no deploy**. Zero cost.

## Implementation

- `WebPreview/src/ship-figureheads.ts` contains three authored low-poly sculptural families: a swept nautical anchor, a layered lion and a five-spiked crown. The Scout has narrow fins, the Fighter crossing guards and the Warship scrollwork and a broad split pedestal. This produces nine geometrically different combinations (3 classes × 3 figurehead selections).
- A metal relief and dark inlay are fused into **two mesh draw objects per figurehead**, irrespective of complexity. All old GPU buffers and materials are disposed on class/module changes by `applyShipModules`.
- `ship-modules.ts` attaches the sculpture to the temporary editor-only accessory group. The anchor level 1, lion level 10 and crown level 20 gates remain unchanged.
- The rest of the nine slots (hull, sails, cannons, armor, figurehead, flags, masts, cabin, ornaments) remain selectable through the shipyard's existing preview interface.
- Any preview slider value is just a visual sandbox value, not an authoritative level, an acquired ship, a purchased module or a wallet balance.

## WORK 4 contract (real entitlements)

- Never use `highestUnlockedPreviewModules()` to grant equipment, ownership or transactions.
- Equip requests require independently verified player level, independently verified hull/class ownership and all nine module entitlements. Client guards `validateOwnedFleetForPlayer` and `equipAccess` are not an authorization backend.
- No new game economy, store prices, possession flags, real purchases or game inventory were introduced.

## WORK 6 contract (port, camera, rendering)

- Keep the original Porto, editor entrance, battle world and battle guns untouched. This feature uses `applyShipModules` on the temporary ship preview only.
- Focus mode continues to select the `figurehead` slot through existing `onFocusSlot`. There are no new required React props.
- Do not merge the historic PR #29 into Porto while it remains conflicted, nor deploy the feature chain before browser, physical iPhone and regression verification.

## Validation gate

- Workflow `.github/workflows/work2-shipyard-verify.yml` includes this branch and executes `npm ci`, `npm test`, `npm run build` from `WebPreview`.
- Unit coverage: nine unique combinations, finite vertices, bounded mesh complexity, module level/ownership separation, rejection of unknown values and exactly-once GPU disposal.
- CI results must be linked **only after execution**. Automated geometry tests do not establish visual quality or frame-rate performance on iOS.
- Unity is a separate pipeline; none of this is a Unity prefab or a claim of Unity testing.

## Integration state

1. This feature PR targets the previous cannon feature branch for review only.
2. Previous WORK 2 draft PRs remain unmerged and historical PR #29 has Porto integration conflicts.
3. WORK 5 must validate touch/zoom, Safari layout, GPU memory/FPS, repeated class changes and the full ship/battle regressions before any approved integration.
