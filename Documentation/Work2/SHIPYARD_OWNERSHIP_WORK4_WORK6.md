# WORK 2 — Modular shipyard: verified entitlement contract (19 Nov 2026)

## Scope and status

**Stacked feature branch** `work2/shipyard-ownership-class-polish-20261119` based on `work2/modular-ships-levels-1-20` (draft PR #29); this is a preview-only follow-up. **DO NOT merge into `work6/web-3d-preview` while WORK 6 is finishing the approved 1:1 Porto UI.** Do not publish the draft or touch `main`, Unity, `harbour.tsx`, `harbour.css`, `main.tsx` or `scene.ts`.

- 3 3D class silhouettes: Swift Scout now has slender aft rails, Sea Fighter a distinct frigate gunwale / aft platform, Royal Warship retains reinforced broadside and high stern. All variants are **procedural original art** in the `ship-modules.ts` preview, not Battle physics.
- 9 independent module slots, 27 designs, 20 sandbox levels continue to work.
- `equipAccess(id,level,ownedIds?)` reports exactly one of `unknown-module`, `level-locked`, `ownership-unverified`, `not-owned`, `equippable`. A missing entitlement set does **not** mean free ownership.
- `validateOwnedLoadout(loadout,ownedIds)` resolves all nine module slots and rejects the loadout unless **every** module is both level-eligible and owned. Missing even one default item rejects; `resolveLoadout` alone is **not** an authorization check.
- `ResolvedShipLoadout` has fully populated `modules: Record<ModuleSlot,string>`, while the draft `ShipLoadout` still supports partial preview overrides.
- The 3D Shipyard remains an explicit **VISUAL SANDBOX** with `RESET PREVIEW`; module cards distinguish genuine granted ownership from level-only previews **if** a verified `ownedModuleIds` set is injected.
- `onEquip` is **optional and hidden by default**. When the client integrates a verified entitlement set and callback, the button is disabled until the complete candidate is eligible. The callback receives a validated fully resolved loadout. No ownership, funds, transactions, persistence, upgrades or inventory are invented here. In the current web app the callback and entitlements are absent, so there is no real EQUIP action.

## Verified player-level equip gate — follow-up 19 Nov 2026

The **editor slider remains a visual demo**, never authoritative player progression. A discovered integration hazard was that the original optional equip callback used the slider `level` as its gate: a player could preview level 20 even if the real player level were 1.

- New function `validateOwnedLoadoutForPlayer(loadout, ownedIds, verifiedPlayerLevel)` rejects **any mismatch** between the draft preview level and the independently provided real player level. It also retains all nine ownership checks.
- Work 4 integration must pass **both** `ownedModuleIds` and `verifiedPlayerLevel` from the trusted player state, as well as `onEquip`. If the level is absent, outside 1–20, not an integer or mismatched with the preview slider, the equip UI remains disabled. No permissive fallback.
- Real ownership/level **must be checked again on the backend** at the moment of equipping, even if the UI callback was guarded; never trust client-side sets or levels for payment/ownership decisions. The preview does not change the player's real level.
- The new unit tests verify that a preview at level 20 cannot be equipped by a real level-1 player even when all nine default parts are owned, and that a matching level with only partial ownership also fails.
- Work 6 does not need to change Porto or battle code. This is confined to `ship-modules.ts`, `shipyard.tsx`, tests, and the isolated WORK 2 CI workflow.

## WORK 4 contract
- Source authenticated player level and owned-module IDs from its authoritative ledger. Never infer ownership from progression, preview selection or the default module catalog.
- Pass `ownedModuleIds: ReadonlySet<string>` **and independently verified** `verifiedPlayerLevel: number`, with a real `onEquip(loadout:ResolvedShipLoadout)` only after real inventory/persistence is implemented; validate again against current entitlements and player level on the trusted transaction endpoint.
- Save and restore equipped loadout **only** after server validation, persist via Work 4 data model, and avoid changing the playable battle ship without explicit gameplay approval.

## WORK 6 contract
- Keep focus on Porto 1:1 composition; WORK 2 only owns `ship-modules.ts`, `shipyard.tsx/css`, and module tests in this stacked PR.
- Once Porto is accepted, integrate shipyard as a distinct FROTA submenu (no duplicate ship-viewer buttons or panels over the Porto ship). Keep battle / sea physics unchanged; preserve accessible orbit and pinch in shipyard.
- Resolve PR #29 integration conflicts against the current WORK 6 branch before merge, and apply only the reviewed WORK 2 changes. Do not merge earlier obsolete Porto/HUD code from PR #29.
- QA requires `cd WebPreview && npm ci && npm test && npm run build`, mobile 360/390px vertical screenshots, context-loss recovery, scene cleanup and repeat class/module switching. Do not claim iPhone physical testing or FPS results without actual evidence.

## What this follow-up does **not** deliver
Unity prefabs, purchased items, a playable owned fleet, 20 unique handmade meshes, performance measurements, final premium art approval, online economies, multiplayer, published version. The visual controls are a 3D preview until the independent systems are connected.

**Safe integration order:** finish WORK 6 Porto → validate conflict-free WORK 2 module files only → WORK 5 tests/visual/mobile → WORK 4 ownership service → real equipping behind entitlement validation.


## Visual/lifecycle iteration — 19 Nov 2026 (stack after #530)

**Ship art only; no effect on weapons, damage, combat stats, player state or Porto.**
- Scout: original tapered, angled bowsprit and two side braces; recognisable fast profile, not just hull scaling.
- Fighter: six separate low-poly framed gunport elements alongside its frigate gunwale and raised quarterdeck.
- Warship: extra raised stern gallery with three softly emissive windows and brass rails. Mesh counts remain bounded by the mobile preview accessory test (<125), not a claim about measured mobile FPS.
- The 3D sail/flag preview now shares exactly **two** material instances per refresh, instead of creating one for every individual fabric mesh. Replaced preview materials are disposed once. First conversion also releases old canvas textures that are otherwise abandoned after replacing the starter sails. The current scene ownership contract still requires Work 6 to dispose the scene when unmounted.
- New tests check explicit class-specific geometry, geometry replacement, one-time texture disposal, material sharing and 20 repeated level previews.

**Workflow:** source branch `work2/fabric-lifecycle-class-silhouette-20261119` is stacked on #530, which is stacked on #522 → #29. Isolated CI workflow runs npm ci, unit tests and TypeScript/Vite build with **no deploy**. Follow Work 5 mobile visual QA before integration. No ownership is granted by cosmetic changes.



## Independent ship-class entitlement and one-time GPU cleanup — 19 Nov 2026

New Work 2 implementation (stack after the fabric lifecycle feature):
- A player may own all nine modular parts **without owning the specific Scout, Fighter or Warship hull**. This previously would have been enough for the optional equipment control if verifiedPlayerLevel matched. `validateOwnedFleetForPlayer(loadout, ownedModuleIds, verifiedPlayerLevel, ownedShipClasses)` now requires all three distinct verifications: verified level, each of nine modules, **and the selected ship class**. Missing or different-class entitlements reject the action. The demo slider grants nothing.
- The `Shipyard` accepts an additional **optional** `ownedShipClasses: ReadonlySet<ShipClass>`. Without it the sandbox still previews all three silhouettes, but real EQUIP is disabled even if modules are owned. With it, the selected hull must also be present in the verified class set. Equip UI says why it is blocked, and the selected preview explicitly reads HULL PREVIEW ONLY / VERIFIED FLEET HULL.
- WORK 4 must source class ownership from its authoritative inventory together with the real player level and module IDs. The class can be **previewed at any level**; its acquisition must not be inferred from level 1–20 or catalog defaults. Backend must revalidate the same combination when persisting.
- WORK 6 need not edit Porto or combat. Work 2 touches only the standalone shipyard, the module builder, isolated tests, and CI.
- The module preview now disposes each *shared* accessory GPU material and geometry exactly once when class, tier or equipped preview changes, instead of disposing the same shared material repeatedly for each mesh; base ship, sail/flag and battle resources stay untouched. New tests assert one disposal event for shared accessories and one for geometry.
- This adds no fictional owned fleet, currencies, IAP, server inventory or purchased hulls. The 3D editor remains a visual sandbox until Work 4 passes verified ownership services.
- Isolated workflow `.github/workflows/work2-shipyard-verify.yml` includes the new feature branch for tests, TypeScript and Vite build, with **no deployment**.

Review visually on 360/390px mobile before merging. Do not confuse unit-test success with measured FPS or iPhone-native validation.

- New original Scout-only triangular fore-and-aft jib geometry now matches the selected sail preview colour. It is an explicit low-poly Three.js cloth triangle mesh (not a static PNG), stays inside the modular accessory group, and is removed/disposed on class swaps. Tests assert it is present only on Scout, with two-sided cloth and a bounded mesh count. This is not part of battle hitboxes or combat mechanics.

## Follow-up: shared preview geometry — 19 Nov 2026, 17h UTC

**Branch:** `work2/shared-preview-geometries-20261119`, stacked over `work2/class-ownership-gpu-cleanup-20261119` (draft PR #543).

- In `applyShipModules()`, repeated wood, brass and iron accessory boxes now use **one unit BoxGeometry buffer** with individual nonuniform mesh scales. Repeated rivets, masts and braces generated through `tube()` similarly use **one unit CylinderGeometry buffer**.
- Each size of modular frigate gunport ring, flagship ring and modular cannon ring is created once per preview build and shared by every matching mesh.
- Existing preview cleanup removes the previous `modular-ship-accessories` group and disposes each shared GPU geometry/material exactly once using Sets. Buffers are **not** shared with the Porto ship or battle and **not** cached beyond the life of a preview build.
- Unit regression verifies a fully ornamented level-20 Warship has 14 torus instances with only 2 underlying torus geometries, multiple boxes/cylinders with one geometry each, a bounded number of unique accessory buffers, and exactly one dispose event per buffer on class change.
- This reduces independent geometry uploads and JavaScript object creation when changing levels/classes; it **does not** reduce the number of individual mesh draw calls and is **not** a measured FPS or device-memory claim. Visual iPhone testing is still pending.
- No change to preview progression (1–20), class entitlements, nine owned modules, 27 catalog variants, equip callbacks, gameplay physics, live Porto UI, or published builds.
- WORK 4 remains the only owner of trusted ownership/equipment persistence; WORK 6 retains the Porto 1:1 layout. WORK 5 should check 360/390px mobile UI and GPU resources after repeated class/module swaps.

The current PR stack must remain **draft** until isolated CI is green and WORK 6 / WORK 5 complete visual integration QA. No auto-merge into `work6/web-3d-preview` or `main`.

## Class pennants — 18:00 UTC, 19 Nov 2026 (stack after PR #549)

- New **original 3D folded cloth pennants** for each of the three classes: narrow split-tail Scout streamers above the forward bowsprit, short forked Fighter flags above the stern yardarm, and longer two-tip Warship admiral banners above the mainmast. Geometry is real triangulated Two-Sided Three.js mesh, not a PNG, CSS substitute or class recolour alone.
- The pennant fabric takes the chosen `flag` module colour (navy, crimson or black) as a preview. A subtle gilded seam reuses the shared low-poly box geometry and brass material. Both objects belong only to `modular-ship-accessories` and are disposed upon a preview change. No rig or battle hitbox is modified, and no flag ownership is inferred.
- Added regression tests for original geometry vertices/folds, classes, cloth colour and module ID, gold seam and safe one-time GPU resource cleanup on class change; existing mobile budget tests still apply. This is **a visual enhancement**, not a measured FPS gain.
- **WORK 4:** UI can continue to use `ShipLoadout.modules.flag` and the separate entitlement validator; no schema change and no grants/purchases.
- **WORK 6:** no changes to Porto or battle files. The new class silhouettes are exclusive to the Shipyard preview. Integrate only after resolving historical PR #29 conflicts, QA and CI.
- **WORK 5:** perform screenshot/mobile comparison at 360/390 px, especially occlusion, rear and side ship angles, flag seam clipping and rapid class switching. Static tests cannot establish mobile visual quality or iPhone FPS.
- Stack order: draft PR #29 → #522 → #530 → #536 → #543 → #549 → **class-pennants follow-up**. Branch `work2/class-pennants-20261119`; `main` and live deployment unchanged. No Unity tests; cost €0.

## Per-hull drafts, highest-unlocked visual presets and unique 3D helms — 19 Nov 2026

- Added three **original procedural steering assemblies** inside the disposable Shipyard accessory group: a small Scout tiller, a four-spoke Fighter helm and a larger eight-spoke Royal Warship wheel. Real Three.js geometries, separate silhouettes, no change to battle ship, hitboxes, steering physics, or production navigation. Shared low-poly primitive buffers are cleaned on each preview replacement.
- The editor keeps independent sandbox module choices for **Scout, Fighter and Warship** while the page remains open. Switching class no longer copies another hull's sails, guns, or ornaments; lowering preview level removes now-locked selections across **all** class drafts, so revisiting a class cannot crash `resolveLoadout`.
- **MAX LEVEL PREVIEW** chooses each slot's highest unlocked design for the selected demonstration level (1–20); **RESET CLASS** restores only that class's default preview modules. These are strictly visual selections, never owned parts, player progression, purchases, currencies, saved loadouts, or equipped battle content.
- New pure API: `highestUnlockedPreviewModules(level): Record<ModuleSlot,string>`. WORK 4 must keep using `validateOwnedFleetForPlayer(..., verifiedPlayerLevel, ownedShipClasses)` before any equip/persist operation and server-side authorization for real accounts. WORK 6 can continue using the existing `onPreview(ShipLoadout)` callback without edits to Porto or battle files.
- Tests cover all 20 unlock presets, no fake ownership, per-class helm geometry and replacement cleanup, and visible preview-only editor controls. A narrow-viewport CSS rule keeps the extra buttons operable at 360–390 px.
- **QA still required:** GitHub CI on this PR, screenshot/mobile verification of 3D helm placement from stern and side, small-phone touch targets and actual Safari/WebGL performance. No physical iPhone or Unity test is claimed. No merge, publication, or new costs authorised.
- Proposed stack: #29 → #522 → #530 → #536 → #543 → #549 → #554 → this draft follow-up. WORK 2 owns only Shipyard / ship modules / their tests and docs; WORK 4 owns game economy and WORK 6 owns Porto. Budget 0 €.
