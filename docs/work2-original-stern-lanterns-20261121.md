# WORK 2 — Original procedural stern lanterns (21 November 2026)

Feature: `work2/original-stern-lanterns-20261121`. Builds on PR #730 (which builds on #726 and #29). **Draft, not approved for merge/publication.**

## Original 3D naval details
New `WebPreview/src/ship-stern-lanterns.ts` mounts physically modelled six-sided cages, stepped finials, gallery suspension arms and amber glass to the stern of all three ship classes. The Scout receives one compact lantern, the Fighter two guarded lanterns, and the Warship three raised ceremonial lanterns. The three existing ornaments modules provide nine design combinations. Only the level 8+ refit glows; level 19 adds five forged crown finials per lantern. All classes/levels 1–20 remain supported by the established modular loadout rules.

Each active preview uses **three merged static meshes**, no canvas texture, `PointLight`, additional shadow light, external asset, post-processing, frame callback or backend. Emissive PBR surfaces provide the warm appearance without a dynamic lighting cost. The engine's existing editor resource cleanup owns/disposes the three meshes on class/module switches and exit.

## WORK 4 / WORK 6 contract
- WORK 4: lanterns are cosmetic preview geometry derived from `ornaments`; **no module unlock is proof of purchase, ownership or equipped inventory**. Do not persist screenshots or demo loadouts as actual player entitlement. Keep using `validateOwnedFleetForPlayer` and backend checks.
- WORK 6: the isolated shipyard scene displays the models; no battle camera, combat physics, collision, ship ownership, currency or port publishing is modified. Please review the stern view against `assets/design-approved/00-referencia-original-aprovada.webp` and `03-frota.webp`.
- WORK 5: physical iPhone/Android FPS and Safari/Chromium visual QA still required. A passing TypeScript/test/build pipeline is not a device performance measurement.

## Validation
Automated coverage includes nine combinations, physical triangles, all 20 progression levels, invalid inputs, draw-call cap and disposal on refits. Run from `WebPreview`: `npm ci && npm test && npm run build`. Only claim these succeeded after actual GitHub Actions evidence. The main branch and public gameplay are out of scope.

**Budget €0.**
