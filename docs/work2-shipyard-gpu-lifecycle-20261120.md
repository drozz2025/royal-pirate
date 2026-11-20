# WORK 2 — release isolated 3D shipyard GPU resources on exit (2026-11-20)

Branch: `work2/release-shipyard-gpu-on-exit-20261120`. Stacked on the draft 3D deck-hatches branch (PR #657), **not main**. No publication or combat edits.

## Problem and fix
Previously, closing the shipyard hid the temporary Three.js ship but kept its original hull, rig, textures, and modular details resident until the whole application unmounted. Re-entering reused the temporary ship, but long-running mobile sessions could hold unused GPU resources while fighting or navigating the Porto.

`releaseShipyardResources(scene, root)` detaches the temporary ship and retires only geometries, textures and materials **not referenced by the surviving scene**. The underlying `ships.ts` art intentionally shares cached buffers/materials with live battle ships: these are retained. No renderer or battle resources are force-disposed. The next shipyard entry creates a new isolated ship again.

`OceanScene.showHarbour`, `showBattle`, and `inspectShip` all call the shared teardown; repeated exits with no preview are harmless.

## WORK 4 and WORK 6 contract
WORK 4: no commerce or inventory behavior changed; preview-only progression remains separate from `validateOwnedFleetForPlayer` and independently verified entitlements. No ownership, balances or purchases are inferred.

WORK 6: use `showShipyard(loadout)` to enter; `showHarbour()`, `showBattle()`, or `inspectShip()` to exit. Do not retain references to temporary `ShipArt` after an exit. Physics and real battle ships are never replaced.

WORK 5: automated Node tests model shared geometry, shared materials, shared textures, unique preview resources, and exit wiring. These test logical disposal calls, **not real GPU memory, FPS, iPhone/Safari or Unity**. Measure mobile WebGL memory/frame time in real devices before integration. Draft until visual and device QA.

Cost: 0 EUR.
