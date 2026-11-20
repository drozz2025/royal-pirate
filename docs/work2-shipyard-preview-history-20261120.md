# WORK 2 — Reversible 3D Shipyard preview editing (2026-11-20)

Feature branch: `work2/shipyard-undo-redo-20261120`.
Stack base: `work2/original-3d-gunport-shutters-20261120` (PR #673).
**Do not merge to main or deploy before human review.**

## What is implemented
- Two usable touch-sized buttons, **UNDO** and **REDO**, in the 3D Shipyard tools.
- Every hull/class switch, module selection, demo level change, MAX LEVEL PREVIEW and RESET CLASS enters an independent short-lived **visual** history entry.
- A single undo restores the class, level and all three class-specific module drafts consistently; redo restores the previous state.
- Repeating an unchanged selection records nothing. A new edit after undo discards only the obsolete redo branch.
- The total history is capped at 30 snapshots to bound memory usage on phones.
- The preview continues to invoke the existing `onPreview(loadout)` on undo/redo, so the isolated 3D model updates without changing combat or battle physics.

## WORK 4 contract — verified fleet only
- This history is React session state, **not saved to an account**.
- `PreviewDraft` deliberately contains NO purchase, balance, inventory, owned class, entitlement, verified level or combat state.
- `onEquip` continues through `validateOwnedFleetForPlayer`: real ship class entitlement, each of nine owned modules and independently verified player level are still required.
- Undo/redo never calls `onEquip` and cannot grant assets, unlock levels or bypass verified rights.
- On close, editor unmounts and the draft history is discarded. WORK 4 handles persistence on a trusted backend if implemented in the future.

## WORK 6 contract — rendering and navigation
- Visual history restores `shipClass`, preview `level` and `modules` through existing `onPreview`; NO scene API or battle state changes.
- Existing touch orbit, pinch zoom, camera presets and focus remain independent of the draft history.
- The two buttons are reachable in the existing scrollable Shipyard tools panel (safe-area and short-screen CSS preserved).
- WORK 6 should review portrait visual layout and verify there are no clipped controls with the editor open.
- Because the original geometry factory remains unchanged, no new Three.js draw calls or model textures were added by this feature.

## WORK 5 QA needed before integration
- Run `cd WebPreview && npm ci && npm test && npm run build` and inspect the non-deploy GitHub Action.
- Verify 1–20 levels, every module slot and all three ship classes through undo/redo.
- Test iOS Safari and Android Chrome (portrait/landscape, touch orbit, pinch zoom, disabled state).
- Confirm invalid/absent entitlements cannot be equipped after history navigation.
- Check memory and FPS on a physical phone. CI alone is not a graphics performance measurement.

Budget **€0**. Unity and published Pages are not modified.
