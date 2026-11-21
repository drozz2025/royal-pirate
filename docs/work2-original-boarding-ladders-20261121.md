# WORK 2 — Original 3D boarding ladders (21 November 2026)

**Status:** feature branch, draft PR only. Source: `WebPreview/src/ship-boarding-ladders.ts`. The selected source baseline is PR #722 (itself based on the WORK 2 PR chain from #29). The 3D fleet editor is not published.

## Implemented and boundaries

- Original timber-and-rope **boarding ladders along the hull sides**, independent of the existing mast shrouds/ratlines, with real 3D rope thickness, rung geometry and gunwale attachment.
- The three classes receive different numbers of actual boarding stations: Scout **2**, Fighter **4**, Warship **6**. The three rigging modules (`masts-standard`, `masts-raider`, `masts-royal`) change rung density and timber finish: nine procedural 3D variants without duplicating static ship assets.
- Boards and ropes are merged per material, exactly **two mesh draw objects** regardless of the number of stations. No new textures, paid assets or runtime dependencies. Visual palette follows `assets/design-approved/README.md` (naval timber, warm metallic accents).
- Creation is isolated under `modular-ship-accessories`; existing disposal removes it when changing loadouts. The original playable six-gun ship, battle physics and camera are unchanged.
- This art is not fleet acquisition, player level, inventory, real purchase, currency, or an equip entitlement. The existing verification contracts remain mandatory.

## Integration / WORK 4 and WORK 6

WORK 4: do not use `masts` preview tier or the displayed ladder count to decide ownership; continue to validate actual module/hull entitlements and authenticated level separately.

WORK 6: these meshes are visible only in the isolated shipyard. The Porto and Battle entry/exit contract remains unchanged. Inspect on iPhone portrait/Android landscape and orbit around both broadsides, including the base and royal rig configurations. Measure FPS, triangle count and draw calls on real phones before merging.

## Verification

Automated tests: `WebPreview/tests/ship-boarding-ladders.test.ts` checks all nine mesh configurations, disposal on replacement and all 60 level/class combinations with no fictitious ownership. Run from `WebPreview`: `npm ci && npm test && npm run build`. Check actual GitHub Actions result for the feature branch. **No physical phone/Unity test is claimed**.
