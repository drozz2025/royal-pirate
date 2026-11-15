# WORK 2 — Modular 3D fleet / shipyard handoff

Status: **feature PR #29 (draft)**. Not part of production until verified and merged into `work6/web-3d-preview`; `main` and Unity are untouched. Budget €0.

## Implemented in the web preview
- 3 original procedural visual classes: `scout`, `fighter`, `warship`. Class proportions and geometry have distinct 3D silhouettes, but **do not alter collision geometry or battle stats**.
- Visual progression accepts integer levels **1 through 20** (four tier names); this is a **sandbox level selector**, not a saved player level.
- 9 modular slots and 27 variants: `hull`, `sails`, `cannons`, `armor`, `figurehead`, `flag`, `masts`, `cabin`, `ornaments`.
- `ship-modules.ts`: `SHIP_MODULES`, `DEFAULT_MODULES`, `resolveLoadout(loadout)`, `availableModules(level, slot?)`, `mayEquip(id, level, ownedIds)` and `applyShipModules(root, rig, loadout)`.
- `Shipyard` React controls: 3D class selection, a 1–20 preview slider, category tabs, accessible part buttons, lock requirements, orbit/pinch zoom. No fake currencies or transactions.
- `OceanScene.showShipyard(loadout)` creates a **separate ship art object** to preview; `showHarbour()` and `showBattle()` restore the unchanged playable ship.
- `makeShip(red, loadout?)` accepts loadouts as an optional extension; existing callers using `makeShip(red)` behave as before.

## Work 4 — ownership, economy, persistence
These services **do not exist** in the web demo and must not be inferred from level:
1. Player progression source of truth (server-validated `level`).
2. Entitlements: authoritative set of module IDs **owned** by player.
3. Costs, currencies, purchase ledger and idempotent server-authorized transactions.
4. Save/load the equipped loadout; validate slot uniqueness, existence, unlock and ownership before use.
5. Optionally communicate the accepted canonical `ShipLoadout` to WORK 2 for rendering.

`mayEquip(id, level, ownedIds)` requires **both** level unlock and ownership. `resolveLoadout` validates preview combinations and their level gates only. Never use `resolveLoadout` as an authorization check for buying/equipping.

## Work 6 — web integration
Entry from Porto: active **UPGRADES / 3D SHIPYARD** or **SHIP** navigation. Exit: **PORT**. The existing battle stays intact. The preview scene is generated in Three.js, not a background PNG.

Before integrating to the published website:
- Run `cd WebPreview && npm ci && npm test && npm run build`.
- Test keyboard focus and pointer events, class changes, all 20 slider values, module lock states, repeated module replacement and low-end mobile render performance.
- Verify iPhone portrait/touch and that **BATTLE → PORT** still works.
- Retain the last known good production version and only merge after verification.

## Not yet complete
No GLB export, Unity prefabs or editor, actual naval physics differences, real purchases, account storage, networked inventory, balance of stats, production-quality final art or physical iPhone QA. These must not be reported as implemented.
