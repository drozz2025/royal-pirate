# WORK 2 — Original raised 3D deck hatches (20 November 2026)

**Preview only.** Three ship classes have real original timber grilles and metal hatch furniture, not a texture or a new ownership item. The 3D hatches sit immediately above the deck and clear cannon ports / the stern cabin.

- Scout: one slim, four-crossbar hatch.
- Fighter: two wider, five-crossbar cargo hatches.
- Warship: two broad, six-crossbar grilles.
- Cabin wood (unlocked level 1): raised hardwood coamings, longitudinal beams, transverse slats, handles and hinges.
- Cabin raised (unlocked level 9): forged iron straps and protective corner bosses.
- Cabin palace (unlocked level 18): royal metal inlay and an original raised diamond crest.

Hatch geometry changes as the cabin module changes. Every combination uses **two fused render meshes**, with all temporary geometries and materials disposed when changing the class or module. No external 3D models, paid assets or 3D texture requests. Cost: EUR 0.

Implementation: `WebPreview/src/ship-deck-hatches.ts` and `WebPreview/src/ship-modules.ts`.
Tests: `WebPreview/tests/ship-deck-hatches.test.ts`: nine class/cabin combinations, vertex/position limits, 60 level/class previews, complete lifecycle cleanup, and negative cases for unrecognized modules.

WORK 4: Cabin tier unlock does not establish purchase, module inventory, verified player level, or ship class entitlement. Keep `validateOwnedFleetForPlayer` and the secure authenticated backend as the only path to a real equipment write.

WORK 6: The hatches are children of the temporary `modular-ship-accessories` group only. They must not replace approved Porto 3D art (`assets/design-approved/01-porto.webp` and `03-frota.webp`), or change weapon/physics state. Preserve touch orbit, zoom, five presets and slot focus.

WORK 5: CI only checks static code/tests/build. Physical iPhone/Android visual clipping, FPS, and draw calls remain mandatory before any integration. No main, no Pages publishing, no Unity changes.
