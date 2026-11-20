# WORK 2 — Original naval flag embroidery (20 November 2026)

## Incremental preview-only 3D art
This change sits on top of the approved-art-inspired, still-draft sail refit in PR #625.
The new `WebPreview/src/ship-flag-heraldry.ts` creates original geometric
embroidered insignia for both existing rig banners, without replacing their
mesh, modifying the battle rig, or treating a preview as an inventory grant.

- **Scout**: compass rose, four compass axes and centre diamond
- **Fighter**: crossed cutlasses, guards and a naval shield
- **Warship**: five-point ceremonial crown, base rails and three gems

Each class has the existing navy (level 1), red (level 4) and black (level 11)
flag choices: **nine distinct class-and-dye variants**. Physical raised,
double-faced triangle ribbons stay readable from either camera side, unlike
one-pixel WebGL lines. Both mast flags share **one additional temporary
WebGL draw object** with a finite, bounded triangle count. This is a code
budget and **not** measured iPhone FPS.

## WORK 4 — ownership and progression
`resolveLoadout` enforces the level gate; class and dye are preview
appearance choices only. Unlocked is not acquired, and no flag, ship class,
currency, or player level is granted. The trusted game service must supply
actual owned module IDs, owned fleet hulls and verified player level;
`validateOwnedFleetForPlayer` remains the local guard, not a substitute
for server-side entitlement checks. No shop or save API was altered.

## WORK 6 — interactive editor and rendering
The original harbour ship and rig stay unchanged. `applyShipModules`
attaches the new flag art solely below `modular-ship-accessories`, whose
existing cleanup releases old geometry and material on class/level/dye
changes. The two insignia occupy the precise existing flag stations from
`ships.ts`. Five camera presets and touch orbit remain available, with
no Porto, combat, Unity or publishing change.

## WORK 5 — quality gate
Automated tests cover all nine geometric variants, real 3D coordinates
and both flag faces, class motifs, thread contrast, bounded triangle
budget, lifecycle disposal, rig isolation, and level/ownership separation.
GitHub Actions performs `npm ci`, `npm test`, and `npm run build`
without deploying. A real iPhone/Safari and Android must still be checked
for readability, clipping, material lighting and measured GPU frame time.

Design direction: `assets/design-approved/README.md` and `03-frota.webp`.
Dependencies: stacked draft PR #625; historic PR #29 is still conflicted.
Do not merge or publish until visual/mobile QA. Budget: **€0**.
