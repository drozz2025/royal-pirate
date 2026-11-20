# WORK 2 — Fleet editor 3D view presets (2026-11-20)

## Real code
- Added five one-tap **3D camera views** to the modular ship editor: 3/4, bow, stern, port and starboard. Players can still drag to orbit and pinch to zoom. Selected view is announced by aria-pressed, and buttons have accessible names.
- `shipyard-camera.ts` is a pure coordinate helper with portrait/landscape-aware distances and tests. The scene's `setShipyardView()` operates **only** while the isolated shipyard preview is open; new entry resets to 3/4. Resize reapplies the current selected preset.
- All camera positions orbit the temporary 3D ship. No screenshot, texture download, new dependency, currencies, purchases, ownership or combat modification.
- Reference: `assets/design-approved/README.md` (mobile legibility, rich original 3D ship, navy + gold).

## Coordination
- **WORK 6**: `main.tsx` wires `Shipyard.onViewChange` to `OceanScene.setShipyardView`; this is optional so other embedding components remain compatible. Keep camera presets within the editor, not the Battle screen or Porto.
- **WORK 4**: all five camera controls are presentation-only and must never grant fleet hulls, entitlements, levels, currency, upgrades or any save. Real equip still uses the independent verified level, module IDs and owned class.
- **WORK 5**: `npm ci`, `npm test`, `npm run build` in `WebPreview`. Tests check the geometry of the five directions, responsive offsets and the editor's accessible labels. Human iPhone/Safari 360–430px visual QA, orbit/zoom and actual FPS remain a required release gate.

## Safety
Stacked on draft PR #587 and all earlier WORK 2 drafts. No edits to `main`, battle logic, Porto layout, deployed game or Unity. €0 budget. Do not merge until checks and physical mobile visual QA pass; PR #29 historical conflicts remain independent.
