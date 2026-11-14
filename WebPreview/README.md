# ROYAL PIRATE — 3D PREVIEW (Work 6)

Independent React + TypeScript + Three.js browser demo, isolated in `WebPreview/` in the Unity repository. No Unity source is changed. The definitive game remains Unity 6000.3.28f1 / URP 17.3.0.

## Run

From the repository root:

```sh
cd WebPreview
npm ci
npm run dev
npm test
npm run build
```

The deployed static output is `dist/`. The Sites source repository contains this directory's contents at its root. Its `.openai/hosting.json` identifies the dedicated preview Site; do not reuse it for a different Site.

## Play

- Drag the sea to orbit; pinch or wheel to zoom. Camera button switches to an enemy close-up; crosshair restores the battle view.
- Adjust bearing (−25° to +25°) and power (20–100%). The dotted arc uses the same ballistic equation as the projectile.
- FIRE launches a cannonball. A swept segment/box test determines a real hit or water miss. Enemy AI solves a ballistic launch speed with seeded aim error.
- Four accurate hits win; five enemy hits sink the player. You can lose by missing. No fabricated impacts or predetermined result sequence.
- Restart works during flight, between turns, and after either result. No game login, purchases, ads, online multiplayer, or account storage.
- Progress shows an audited source snapshot with links. It is not an automatic live feed from other Work conversations.

## Rendering and mobile

WebGL2 is preferred. A CPU Canvas triangle renderer automatically draws the same Three.js scene/camera if WebGL2 cannot start. This is genuine navigable 3D, with reduced lighting/water rendering, not a screenshot or video. The active mode is labelled. The cloud QA browser has WebGL disabled, so only the Canvas path was visually executed here. Safari/iPhone, Android, Unity import and native builds remain unvalidated.

Both ships are original procedural preview art: curved hull sections, plank bands, rails, ropes/ladders, two masts, curved skull sails, cannon batteries, cabin windows, lanterns, barrels and small crew silhouettes. Islands/palms and shader waves are provisional. They are not the final Work 2 assets or an approved match to the reference quality.

## Architecture

- `src/battle.ts`: renderer-independent state machine, ballistics, collision, prediction, AI.
- `src/ships.ts`: original procedural geometry and canvas sail emblems.
- `src/scene.ts`: Three.js scene, input camera, bounded 160-particle pool, render lifecycle and diagnostics.
- `src/software-renderer.ts`: CPU compatibility rendering; no graphics permission changes.
- `src/main.tsx`, `src/style.css`: battle HUD, controls, result and progress panel.
- `tests/battle.test.ts`: 20 automatic tests including 200 seeded complete matches.
- `tests/mobile.html`: local-only responsive QA iframe; not included in production output.
- `TEST_REPORT.md`, `evidence/`: executed results and known limits.

## Integration baseline and coordination

Audited Work 0 `06206451f237a0e7f4d56830088253a37ca3446f`, PR #12. Consulted PRs #1, #2, #8, #9, #12, #13, #14 and branch inventory. Existing Work 1–5 functionality is reported, not reimplemented in Unity. Original reference assets/GLB remain untouched. This Work's PR targets `work0/first-battle-integration-20261114`, from `work6/web-3d-preview`. No main merge or paid CI activation.

The web simulation does not execute the C# domain or share saves/progression with Unity. Both layers may evolve independently. Future integration requires explicit data/contracts and Unity verification.

## Cost and assets

Spend: **0 €**. No paid services enabled. React and Three.js use their package licenses; Barlow/Barlow Condensed are self-hosted with SIL OFL text in `public/fonts/`. No external runtime CDN or remote font request is required. See `ASSET_NOTES.md`.

## Soundtrack and effects (pending review)

The `automation/web-audio-original-score-20261114` branch adds an **original procedural four-bar pirate melody** and distinct cannon/fire, hull impact, water splash, and victory/defeat sound cues. Use the sound icon to open separate **MUSIC** and **EFFECTS** switches. Both start OFF, so the game does not autoplay on an iPhone. The audio engine is suspended when the page is hidden and disposes resources when unmounted. This is web-only, separate from Unity.

The sound implementation and new tests have not yet been executed/audibly verified on a real browser or device. See [audio QA evidence](AUDIO_QA_20261114.md). The existing battle controls and outcome rules are unchanged.
