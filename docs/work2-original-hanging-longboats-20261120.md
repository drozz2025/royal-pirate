# WORK 2 — Original suspended 3D longboats (20 November 2026)

Three vessel classes carry physical lifeboat tenders on forged davits. These fittings are NOT newly acquired or owned ships.

- Scout: one starboard tender with slender hull.
- Fighter: two suspended tenders, port and starboard.
- Warship: four tenders, two on either side.
- Oak (level 1): timber shells, carved thwarts, suspended davits and rope ties.
- Ironwood (level 6): additional metal locking cleats.
- Royal (level 15): gilt gunwale rails and original gilded fore-crest carvings.

The procedural 3D shell has seven tapering stations and an open gunwale, with real seats, davits and rigging; not decals or borrowed models. Geometry is batched into three material draw objects (timber, fittings and rope), independently of station count. Resources are disposed when the editor refits a hull. External spend EUR 0.

Code: WebPreview/src/ship-deck-longboats.ts and WebPreview/src/ship-modules.ts. Tests: WebPreview/tests/ship-deck-longboats.test.ts, covering nine class/hull combinations, finite geometry and budgets, all 60 level/class combinations, GPU cleanup and ownership gating.

WORK 4: Hull-tier unlocks are demo appearance availability, not acquired modules, player progress, purchases, wallets or lifeboat ownership. Actual equip requires separately verified level, module ownership and ship-class entitlement through the existing trusted integration. Do not persist demo changes.

WORK 6: Keep boats visible in the approved navy/gold fleet direction at assets/design-approved/03-frota.webp and preserve five camera presets, FOCUS, orbit and pinch zoom. Inspect possible clipping with cannon ports, standing rigging and railings on narrow portrait devices.

WORK 5: Hardware QA must measure physical FPS and GPU calls on iPhone/Android. CI and source tests are not physical performance validation. Keep draft; do not merge main or publish. Unity is parallel, and battle remains untouched.
