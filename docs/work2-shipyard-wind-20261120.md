# WORK 2 — 3D wind animation for shipyard preview

Status: isolated feature branch work2/preview-wind-rig-animation-20261120 stacked on PR #700, review required; not published or merged. Cost €0.

## Implemented
- The three original 3D pennants (scout-swallow-pennant, fighter-forked-pennant, warship-royal-pennant) now move with independently tuned, low-amplitude wind.
- The Scout's original curved jib is hinged at its real mast anchor (same world-space mesh vertices at rest); the fore-and-aft sail gently pivots instead of swinging around the water origin.
- Animation changes object transforms only, using deterministic absolute-time curves and no per-frame geometry, materials, textures or new render objects. Lookup is cached per disposable accessories group via WeakMap.
- Updated only the shipyardArt-visible frame path in scene.ts. The battle ship, cannon groups, physics, camera, purchases, inventory and player progression are not modified.

## Integration contract
WORK 6: retain existing Shipyard lifecycle and syncShipyardPreview; animateShipyardWind(root, elapsedSeconds) is called only while isolated preview is visible. Camera orbit/focus remain untouched. Resting mesh positions are unchanged.
WORK 4: wind is cosmetic, including level 20 and unlocked modules. It confers no entitlements; validateOwnedFleetForPlayer must independently authorize real equipment.

## Review and QA
Run cd WebPreview && npm ci && npm test && npm run build. GitHub Actions must pass before review. Physical iPhone / Android visual and FPS/GPU measurements still required; no frame-rate claim. Preserve approved Porto and Battle layouts in assets/design-approved. Does not touch Unity or main.