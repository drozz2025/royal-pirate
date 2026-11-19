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

## WORK 4 contract
- Source authenticated player level and owned-module IDs from its authoritative ledger. Never infer ownership from progression, preview selection or the default module catalog.
- Pass `ownedModuleIds: ReadonlySet<string>` with a real `onEquip(loadout:ResolvedShipLoadout)` only after real inventory/persistence is implemented; validate again against current entitlements on the trusted transaction endpoint.
- Save and restore equipped loadout **only** after server validation, persist via Work 4 data model, and avoid changing the playable battle ship without explicit gameplay approval.

## WORK 6 contract
- Keep focus on Porto 1:1 composition; WORK 2 only owns `ship-modules.ts`, `shipyard.tsx/css`, and module tests in this stacked PR.
- Once Porto is accepted, integrate shipyard as a distinct FROTA submenu (no duplicate ship-viewer buttons or panels over the Porto ship). Keep battle / sea physics unchanged; preserve accessible orbit and pinch in shipyard.
- Resolve PR #29 integration conflicts against the current WORK 6 branch before merge, and apply only the reviewed WORK 2 changes. Do not merge earlier obsolete Porto/HUD code from PR #29.
- QA requires `cd WebPreview && npm ci && npm test && npm run build`, mobile 360/390px vertical screenshots, context-loss recovery, scene cleanup and repeat class/module switching. Do not claim iPhone physical testing or FPS results without actual evidence.

## What this follow-up does **not** deliver
Unity prefabs, purchased items, a playable owned fleet, 20 unique handmade meshes, performance measurements, final premium art approval, online economies, multiplayer, published version. The visual controls are a 3D preview until the independent systems are connected.

**Safe integration order:** finish WORK 6 Porto → validate conflict-free WORK 2 module files only → WORK 5 tests/visual/mobile → WORK 4 ownership service → real equipping behind entitlement validation.
