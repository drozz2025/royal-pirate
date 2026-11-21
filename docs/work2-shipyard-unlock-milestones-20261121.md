# WORK 2 — Browse actual visual unlock milestones (21 November 2026)

Status: isolated **draft feature**, based on `work2/mobile-two-stage-detail-lod-20261121`. No merge, publication, Unity edit or battle modification. Budget: €0.

## Usable fleet editor change

- The editor now shows the **next real visual module unlock** as a single compact row, e.g. at demo level 1, **LV 4 · FLAG**.
- **PREV / NEXT** jump to neighbouring catalogue milestones rather than blindly stepping through empty levels. Each jump uses the same `chooseLevel` action as the preview slider and is undoable/redoable.
- Derived from `SHIP_MODULES`, not a separate tier table, account service or fictitious ship inventory; adding modules automatically updates the milestone list.
- Visual level 20 reports all **27 available visual variants**; both ends of the 1–20 range disable impossible navigation.
- UI is keyboard-addressable, has 42px mobile touch targets, polite live status, safe-area-friendly parent scroll and is disabled while inspecting the pinned, read-only reference A.
- The three class-specific designs, all nine real 3D slots, scene lifecycle, mobile LOD and camera remain exactly as they were.

## Integration boundaries for WORK 4 and WORK 6

- `shipyard-milestones.ts` exports `VISUAL_UNLOCK_LEVELS`, `visualUnlocksAtLevel`, `nextVisualUnlock`, `previousVisualUnlock`. They return **catalogue only**, not server-owned items, assets purchased, gameplay stats or saved progression.
- WORK 4 must continue to supply independently verified `ownedShipClasses`, `ownedModuleIds` and `verifiedPlayerLevel`. Milestones and demo slider must **never** authorize `onEquip`; real equip still requires `validateOwnedFleetForPlayer`.
- WORK 6 may style the row to match the approved navy/gold visual reference but must keep its labels, disabled states and legibility on 320–390px screens.
- WORK 5: compare 1→4, 3→4, 4→5, 19→20, backwards 4→1; test read-only reference A, undo/redo, visual/owned semantics, camera/battle isolation.
- Additional full visual QA, physical iPhone and Android FPS, battery, responsiveness and acceptance by the user remain required before any integration.

## Automated tests

`WebPreview/tests/shipyard-milestones.test.ts` checks every integer level 1–20, all 27 module gate levels, three class catalogue invariants, validation of bad input, no ownership implication, mobile SSR controls and CSS focus states. CI workflow `work2-shipyard-verify.yml` runs `npm ci`, `npm test`, `npm run build` on the feature branch. Do not claim success until the actual GitHub Actions run is checked.
