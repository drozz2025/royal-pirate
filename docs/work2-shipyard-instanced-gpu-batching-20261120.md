# WORK 2 — GPU-instanced deck detail batching (20 Nov 2026)

**Stacked draft:** `work2/shipyard-instanced-gpu-batching-20261120` based on `work2/shipyard-undo-redo-20261120`. No production deployment, no main merge, no Unity changes.

## Implementation
- `applyShipModules` keeps all three original class silhouettes, 20 preview levels and nine module categories unchanged.
- Repeated **unnamed** decorative unit boxes and cylinders, already sharing the same geometry/material, are packed into one `THREE.InstancedMesh` per geometry/material pair, reducing draw submissions while keeping every transform. Named interactive detail meshes (helm/tiller), sail rig and custom art remain separate.
- Culling spheres are computed for instance batches and shadows remain enabled.
- On class/level changes, batch-owned `instanceMatrix` GPU buffers are disposed once; on editor exit, `releaseShipyardResources` also releases instance-specific buffers without disposing any geometry or material still referenced by the live battle scene.
- Added Node/Three regression tests for all three classes, all 20 levels (existing tests), instance transforms, repeated teardown, and retained battle resources.

## Work 4 integration
No alterations to ownership or economy. `validateOwnedFleetForPlayer` still requires real hull ownership, all nine module entitlements and matching verified level. No purchases, balances or progress are invented.

## Work 6 integration
`showShipyard`, camera presets, preview callbacks and `onFocusSlot` remain unchanged. Instance batching is transparent to the editor. The base battle ship retains its original non-instanced geometry, physics, cannons and hitboxes.

## Quality gates
Run `cd WebPreview && npm ci && npm test && npm run build` on the draft branch. CI is configured to run these checks but does not deploy. Browser/mobile validation of visual parity, actual draw calls, FPS and GPU memory remains pending; node-only tests do not measure frame rate.
