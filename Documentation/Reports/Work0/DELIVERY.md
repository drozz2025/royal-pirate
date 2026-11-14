# Work 0 — first-battle integration, 2026-11-14

Branch: `work0/first-battle-integration-20261114`. Review target: `work1/unity-foundation-20261114`. No main merge; no paid services; spend **0 €**.

## Verified inputs

All seven coordination issues (#3–7, #10, #11) were OPEN. Existing PRs #1, #2, #8 and #9 were open drafts. GitHub branch heads were checked again before publication. Local snapshots were accepted only after their complete Git tree hashes matched GitHub; other chats' uncommitted work was not imported.

| Area | Source commit | Source tree | Integration state |
| --- | --- | --- | --- |
| Work 1 | `7be4af3dd271018c386a2891b95f067e471dba7e` | `cfe592be52c712ac01061d3795504a81c5417d0e` | Foundation |
| Work 3 | `f49d77ba651926fdb5291cca1852f3a02bb12757` | `fbe77a8d7d154f56bbc130fbe543fd3ea5b7041b` | Combat integrated |
| Work 4 | `039e7028604a886991ba12a94e436d8f1d9f8f7d` | `ad2b7b925b440044ead8b2655adde76d672a0d6b` | Harbour/progression integrated |
| Work 5 | `3dbcb6989cf0cb4498eb2d8d1ebabb6cba367a01` | `886e2a9e8393c1b83f7917efe8528bfec5be8d68` | QA integrated |
| Work 2 | `8448a1dccf4e7764ad23c731e6d30b6bc98e7537` | Same as main | No new published art delivery |

The three feature patches apply without textual conflicts. That alone is not compatibility proof: Work 3 and Work 4 had no HUD adapter, their action regions could overlap, and QA identified two save recovery defects.

## Implemented

- `Integration.unity` now contains one `BattleHudBridge` and the existing `BattleBootstrap`. `CombatHudAdapter` maps the real combat snapshot into the Work 4 presenter. Runtime does not depend on UI; all assemblies remain acyclic.
- UI Toolkit owns fire, power and boost. Work 3 input owns captured aiming only in integrated mode, and excludes UI picks. Diagnostic HUD is disabled. The extra persistent Harbour return overlay is no longer spawned; the battle HUD owns the return button.
- Presenter shows health, turn/time, signed X/Z wind, normalized power, ability armed state, victory/defeat/**draw**, and explicitly no battle reward grant. No duplicate combat model or wallet authority was introduced.
- Bridge disposes subscriptions on disable, clears touch captures and rebuilds once on enable. Hidden diagnostic actions remain disabled when the bridge is disabled.
- Harbour exports the validated loadout through the same store consumed by battle. Wallet, heroes and rewards remain owned by the existing progression aggregate; combat does not write them.
- `LoadoutFileStore` contains production file transactions behind a codec. `LocalLoadoutStore` retains the public Unity API and uses JsonUtility. Missing primary now loads backup; repaired saves never rotate corrupt primary over good backup; corrupt evidence is retained; interrupted initial writes fail visibly.
- Successful shots now emit pooled muzzle flash/smoke, in addition to existing impact effects.
- `Royal Pirate > Prepare First Battle Integration` runs the existing mobile + Harbour setup and includes both scenes, Harbour first. This editor entry point is implemented, **not executed here**.
- Reproducible combined runner and 12 production file-transaction regressions. Added 5 EditMode cases and 3 PlayMode cases for mapping, subscriptions, one HUD, re-enable, real touch fire and rejected duplicate/disposed commands. Native Unity cases remain unexecuted.
- Existing Work 3 touch-region regression is explicitly diagnostic, with Toolkit document disabled during that test. Dedicated integrated tests cover the Toolkit path. No other Works' assets were removed.

## Executed evidence

All logs below were produced against the combined source. `execution.json` hashes Assets, Packages, ProjectSettings and Tools. It distinguishes source checks from Unity.

| Check | Actual result |
| --- | --- |
| Production domain + combat | 58 passed |
| QA domain | 34 passed; includes 1,000 economy sequences / 60,000 operations and 1,000 turn transitions |
| Progression and store | 46 passed; includes 5,000 transaction interleavings |
| Production loadout transactions | 12 passed; includes both Work 5 recovery regressions |
| Tool unit tests | 14 passed |
| Repository structure / assembly graph / reference hashes | 23 passed |
| Integrated scene/control wiring | 16 passed |
| C# 9 syntax | 55 files parsed, zero syntax errors; **not Unity compilation** |
| Source hygiene / whitespace | No blocking patterns / clean |
| Unity preflight | BLOCKED, exit 2; no installed licensed editor path |

Persistence runners use System.Text.Json. They compile the real pure C# production domain, progression and transaction sources; they do not emulate UnityEngine or establish JsonUtility compatibility. Native JsonUtility regressions are retained in the Unity suites.

Reproduce available checks with .NET 8 and Python 3:

```sh
python Tools/IntegrationChecks/run.py --dotnet dotnet
```

On an existing licensed **6000.3.28f1** editor, run the explicit setup above, then:

```sh
python Tools/QA/run_unity.py --editor /path/to/Unity --mode core
```

Only after core tests pass, run the optional physics fixture (`--mode simulation --battles 1000`). That fixture is not a production bot balance test. No workflow was activated.

## Current gates

| Gate | Status |
| --- | --- |
| Source implemented/integrated | Yes, in review branch |
| Pure C# compiled/tests executed | Yes, results above |
| Unity import/API compilation/EditMode/PlayMode | NOT executed |
| First battle played/rendered | NOT executed; zero full battles claimed |
| iOS/Android builds and physical device input/performance | NOT executed |
| Owner gameplay approval | Not obtained |
| Art final / commercial release | Not approved |

## First ship

Both official JPEG references are present in `Referencias_Visuais/01_Imagens_Aprovadas`; their original hashes pass. No Internet substitutes were used. The original `RoyalPirate_Navio01_Modular.glb` also passes hash/header checks (26 meshes). It is an earlier geometry resource outside Assets, not a new Work 2 final delivery or proof of Unity import. `feat/ships-3d` remains identical to main at audit. No new authored model, four approval views, prefab/material/collider integration or visual approval is published there. Battle continues with provisional module geometry.

## Remaining priority

1. Import this exact integration revision in Unity 6000.3.28f1; run explicit setup; commit generated package lock/settings after review.
2. Run all native suites, play Harbour → Battle → Harbour, inspect one HUD, input/safe area, camera, projectile collisions and victory/defeat. Correct observed failures before merge.
3. Integrate Work 2 published prefab with matching module IDs, muzzle sockets and colliders; request owner's four-view art approval.
4. Test real mobile devices and production bot battles before any claim of playable or commercially ready delivery.

Self-review here is not independent approval. The PR stays draft and all coordination issues stay open pending their actual Unity/visual acceptance gates. No background execution or communication with other Work chats is claimed.
