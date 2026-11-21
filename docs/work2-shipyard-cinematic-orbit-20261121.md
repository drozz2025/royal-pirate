# WORK 2 — 360° isolated shipyard showcase (21 November 2026)

## Scope
Feature branch: `work2/shipyard-cinematic-orbit-20261121`, stacked above
`work2/shipyard-fine-detail-lod-20261121`. No production publication,
`main` changes, changes to Unity, multiplayer, battle rules, or real economy.

A sixth compact `360° TOUR` control appears next to the five 3D camera presets
when WORK 6 supplies `onTourChange`. It smoothly orbits the actual procedural
ship via existing Three.js `OrbitControls`; no new meshes or textures are
allocated and there is no per-frame ship rebuild. The orbit is a camera-only
inspection tool for Scout, Fighter and Warship, using current level 1–20
visual modules. No new ship, inventory, purchase, level or virtual balance is
granted. A/B pinned reference remains a visual comparison only.

The tour is restricted to `cameraMode==='shipyard'`. It is disabled
when the user starts manual orbiting with a mouse/finger, when leaving
the shipyard for Porto/battle, and if `prefers-reduced-motion` is enabled.
Hidden browser tabs suspend it and restore only the requested preview camera
tour when visible again. `OrbitControls.update(dt)` uses frame delta for
consistent speed across devices.

## WORK 4 contract
Do not infer entitlement, equip permission, purchases, experience or currencies
from the 360° button. It does not change `ShipLoadout`, `mayEquip`,
`validateOwnedFleetForPlayer`, `onEquip`, the verified-player-level
gate, or server-side ownership. Only a visual camera command.

## WORK 6 contract
`Shipyard` accepts an **optional** callback:

```ts
onTourChange?: (enabled: boolean, onInterrupted: () => void) => boolean;
```

The callback returns the actual applied camera state; `onInterrupted`
resets the button after pointer orbit or an accessibility preference change.
`OceanScene.setShipyardTour(enabled, onInterrupted)` implements the contract.
`main.tsx` passes it to the 3D sandbox. If omitted, all five existing camera
presets still render exactly as before, without a tour button.

Existing interfaces for WORK 4/6 (`onPreview`, `onViewChange`,
`onFocusSlot`, `onEquip`) remain optional and unchanged.

## Tests and integration gate
CI: `cd WebPreview && npm ci && npm test && npm run build`, using the
non-deployment `work2-shipyard-verify.yml` workflow; evaluate GitHub run
before merging. Unit tests assert no auto-orbit outside the visible editor,
honour reduced motion, and check accessible rendered button plus absence
of false ownership claims. CI cannot prove real FPS, iOS/Android touch
quality or visual fidelity.

Manual QA before integration:
1. In portrait on a physical iPhone and Android device open shipyard; all
   six camera options must be visible and tappable, no overflow.
2. Rotate Scout, Fighter and Warship at low/high preview levels. Inspect
   major parts from bow, stern and both broadsides; no false acquisitions.
3. Activate 360° tour; start dragging on the 3D canvas, observe immediate
   stop and button reset; pinch should still zoom.
4. Enable system **Reduce Motion**: button disabled/no continuous rotation.
   Toggle this accessibility setting during a tour: rotation stops.
5. Switch A/B preview, level and modules during orbit; camera should not
   change live fleet or collision stats; exit to Porto, then enter BATTLE
   and verify controls and original ship behave as before.
6. Compare FPS/draw calls and peak memory against previous PR on low-end
   mobile. No measured improvement or device verification is claimed.

Approved visual references: `assets/design-approved/03-frota.webp`,
`assets/design-approved/04-melhorias-forja.webp`. No images, fonts,
paid models or outside assets introduced.

## Outstanding
Physical touch/reduced-motion QA, frame-rate measurement, visual sign-off,
production integration, server inventory and Unity validation. Keep PR in
draft until those gates are addressed. Cost: €0.
