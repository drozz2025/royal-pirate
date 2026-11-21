# WORK 2 — Shipyard fine-detail LOD (2026-11-21)

## Scope
This feature limits unnecessary WebGL draw submissions when a ship is zoomed far away on a narrow phone. Only the **isolated** shipyard preview is affected. The main hull, weapons, masts, figures of prow, sails, flag heraldry, armour, cabin, stern and all gameplay geometry stay visible.

The existing original 3D models for bell, binnacle, navigation chart, deck rope coils and deck hatches are hidden beyond **30 world units** on viewports at most **820 CSS px** wide and restored inside **26 world units** (hysteresis). The normal initial orbit still displays them. This is object visibility only: there is no mesh rebuilding, resource disposal, separate renderer, unlock, purchase, saved preference or player data.

## Implementation and ownership
- `WebPreview/src/shipyard-detail-lod.ts` exports `updateShipyardDetailLOD(accessories, distance, viewportWidth)`. It accepts only the `modular-ship-accessories` group and tagged, explicitly named preview-owned props, not arbitrary groups in the Three scene.
- `WebPreview/src/scene.ts` calls the helper before rendering only in `cameraMode==='shipyard'` while the temporary preview is visible. Viewport width and camera distance come from the existing Work 6 scene. No change to its combat camera, physics, state, shot calculation, damage, boat properties or rendering branch.
- The existing nine slots, three classes and progression levels 1–20 are unchanged; **level-unlocked remains separate from actually owned**, as required by WORK 4. No currencies, ships or entitlements were fabricated. The local LOD cannot equip anything.
- WORK 4: no new API, database, inventory or purchase fields. Continue to pass only genuine verified class/module ownership; do not persist the demo preview or LOD visibility.
- WORK 6: no new UI control. Existing orbit/pinch/camera presets and slot focus automatically show details when near. Keep the 3D canvas and shipyard preview root isolated from the battle root. If camera offsets or viewport policies change, re-evaluate the 26/30 thresholds before integration.

## QA checklist
- Automated tests cover Scout / Fighter / Warship, visual preview levels 1, 8, 19 and 20; restore behavior; the viewport switch; hysteresis; invalid inputs; and battle-root isolation.
- Feature-only CI performs locked npm installation, all node tests, TypeScript and Vite build. **Check the actual run result before marking this complete.**
- Pending: visually confirm default and close-up detail fidelity, rotate and pinch on real Safari iPhone / Android Chrome, measure call count and FPS against the previous branch under identical hardware conditions. Tests are *not* proof of real-device speedups.
- Do **not** merge this feature to main, modify Unity, or publish to Pages until visual/mobile QA is approved.

Base: `work2/shipyard-reference-compare-20261121` (PR #707), itself stacked on the original WORK 2 draft PR #29. Feature branch: `work2/shipyard-fine-detail-lod-20261121`. Budget: €0.
