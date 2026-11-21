# WORK 2 — Original batched helm controls (2026-11-21)

Parent [PR #749](https://github.com/drozz2025/royal-pirate/pull/749), descending from [PR #29](https://github.com/drozz2025/royal-pirate/pull/29). Feature is **draft only**. This branch does not modify main, published Pages, battle, Unity or trusted player data.

## Art and mobile integration

- New WebPreview/src/ship-helm.ts constructs class-specific original steering assemblies: Scout slim wooden tiller; Fighter four-spoke wheel; Warship large eight-spoke admiral wheel.
- Cabin visual tier cabin-wood / cabin-raised / cabin-palace modifies colour, collar relief and sculpted finials. These are nine combinations of class and cabin design, drawn on demand for sandbox display, **not nine purchased items**.
- Original wooden spokes, brass handles, iron supports and raised relief are combined into a **single non-indexed vertex-colour geometry**; the named torus or tiller is the second mesh. Exactly **two opaque draw objects per preview helm**, with no added lights, textures, animation, physics or external assets.
- Preserve named scout-steering-tiller, fighter-broadside-helm, warship-royal-helm objects for existing interaction/tests. Fittings named shipyard-{class}-{cabin}-helm-fittings. Both are inside the disposable modular-ship-accessories group.
- Keep shipyard rotation, touch zoom, 5 presets and full-screen view unchanged. WORK 6 should inspect the **quarter** and **stern** presets for clipping and usability; if overlapping balcony/window geometry, flag before integration.

## Ownership contract to WORK 4

The helm is **not** a 10th purchasable slot or a real ship inventory record. It reacts only to the existing preview class and cabin module in a validated resolveLoadout. No purchase, balance, experience or class ownership is created. Real equip remains gated by independently verified hull entitlement, owned module IDs and player level, with server-side revalidation owned by WORK 4.

## Verification / WORK 5

New WebPreview/tests/ship-helm.test.ts covers 9 combinations, two draw objects, distinct 0/4/8 spoke profiles, 60 class+level refits, GPU disposal, invalid input and denial of unowned modules. Existing ship-modules.test.ts checks old named helms and combat boundaries. GitHub CI must complete npm ci, npm test, and npm run build before design review. Browser visual inspection and **physical iPhone/Android FPS measurements remain pending** and must not be presented as passed.

Budget €0. No deployment or main merge authorized without visual approval and review.