# WORK 2 — Original standing rigging for mobile ship previews (19 Nov 2026)

## Scope
This stacked feature follows WORK 2's modular-ship PR #29 and the class-presets/helm PR #562. It is a **Shipyard visual sandbox improvement**, not a playable ship feature. It deliberately does not modify `main`, Porto, combat, scene physics, base `ships.ts`, ownership or persistence.

## Implementation
- `WebPreview/src/ship-rigging.ts` builds original procedural 3D shrouds, horizontal ratlines and fore/aft stays for each ship. Uses **one Three.js LineSegments object, one BufferGeometry, one LineBasicMaterial** per current preview. Does not allocate one mesh per rope.
- The **Scout** uses a lean three-rung rig, **Fighter** five rungs, and **Warship** seven, with distinct staying geometry and wider attachment points. Each of the two mast stations has port and starboard rigging.
- The selected mast module changes physical rope height: standard (level 1), raider (level 6) and royal (level 15). `resolveLoadout` must validate unlock level before the accessory is constructed.
- Rope geometry is added to the existing `modular-ship-accessories` group. On class/module change, **LineSegments geometry and material are disposed exactly once** along with shared mesh resources.
- Rope networks do not alter ship stats, collision, damage rig, ownership, prices, UI inventory, or the active battle.
- Colours are original canvas/rope-inspired neutrals, not copies of external asset packs. No paid assets.

## Integration contracts
**WORK 4:** Continue to supply real ship-class ownership, real module entitlements, and the independently verified player level. This feature adds no permissions or inventory data. The Shipyard's MAX LEVEL PREVIEW and class switch remain unowned sandbox features.

**WORK 6:** Keep the approved 1:1 Porto untouched. The new `ship-rigging.ts` and its single call in `applyShipModules` can be integrated only after the conflicting original PR #29 is reconciled without restoring obsolete Porto changes. Work 6 owns the public screen and must approve browser integration.

**WORK 5:** Execute `cd WebPreview && npm ci && npm test && npm run build` and inspect the rigging at narrow mobile widths, with WebGL rotation and repeated 1–20/class switching. Unit tests assert 23, 33, 43 line segments for Scout/Fighter/Warship, tier-dependent height, 60 previews bounded to one rope draw call, and disposal upon switching. The tests **do not** prove measured FPS, real device behavior or final visual approval.

## Delivery guardrails
This branch is a draft stacked PR targeting `work2/shipyard-class-presets-helm-20261119`. No automatic merge or deployment. After CI and real mobile visual review, integrate carefully in order. Unity remains separate.
