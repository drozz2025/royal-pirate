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
