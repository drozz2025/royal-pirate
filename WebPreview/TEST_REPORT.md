# Work 6 — execution evidence, 2026-11-14

## Executed

| Check | Evidence / observed result |
| --- | --- |
| TypeScript + production build | `evidence/build.log`; static `dist/` generated |
| Automatic simulation tests | **20 passed, 0 failed**, `evidence/domain-tests.tap` |
| Seeded complete matches | 100 accurate + 100 deliberate-miss matches included in the test suite; terminate in expected victory/defeat with bounded health |
| Browser page loading | Cloud Chromium loaded React UI and real 3D Canvas fallback |
| Aim / power | UI bearing set from 0 to +25°, power 65 to 20; trajectory changed and shot missed |
| Projectile / impact / AI | Visible projectile, hit and splash effects; enemy health 100→71; opponent returned fire |
| Victory | Browser: four hits, round 4, player HP 34, enemy HP 0; result displayed. `evidence/victory.jpg` |
| Defeat | Browser: five deliberate misses, round 5, player HP 0, enemy HP 100. `evidence/defeat.jpg` |
| Restart | Verified after result and during flight; full health, default aim and first turn restored |
| Cameras | Orbit gesture, close-up button and home camera inspected |
| Progress | Mobile modal opened/closed; explicit web/native distinction and source links |
| Mobile layout | Chromium iframe viewport at **375×667, 390×844, 430×932**; body scroll width equals viewport width. Not device/Safari emulation |
| Controls | FIRE measured 95×101 CSS px at 375×667; 95×118 at 390×844 |
| Console | No application warning/error entries after latest fixes in captured check. Browser-extension metadata error excluded and not attributed to application |
| Performance | CPU compatibility path, final mobile QA observed 17–19 FPS; example render 20 ms. Initial desktop path 6–8 FPS / ~110–125 ms before small-face culling and sail subdivision reductions |
| Memory | CPU scene after both complete battles: 144 lazily encountered geometries, 4 textures; effects returned to zero. JS heap estimates fluctuated roughly 21–58 MB across scenes/reloads, not a leak-proof benchmark |

Detailed UI observations are in `evidence/browser-qa.json`. Screenshots labelled Canvas compatibility mode are screenshots of the executed browser renderer, not Unity screenshots or generated artwork. Build/source hash inventory is in `evidence/source-sha256.json`.

## Problems found and corrected

- Native WebGL2 context could not start in the cloud browser (`GL_RENDERER = Disabled`). Added automatic Canvas 3D fallback without changing browser/security settings.
- Mixed UV attributes caused mergeGeometries to reject hull/material batches. Removed unused UV attributes consistently from untextured static geometry.
- A variable-length aim line could overrun its initial buffer. Replaced it with a bounded 240-point buffer and explicit draw range.
- Narrow-screen camera framing clipped the player ship. Added diagonal portrait framing and adjusted distance.
- Small-screen progress icon lacked an accessible name. Added explicit label.
- Restored root CSS after replacing the external font import; fonts are now self-hosted.

## Not executed / acceptance gates

- **WebGL rendering/shader compilation in a real GPU context:** blocked by cloud browser configuration. TypeScript/build success does not prove GPU shader execution.
- **Safari, iPhone physical touch, Android, safe-area hardware behaviour, thermal/battery usage:** not tested.
- **Unity import/compilation, EditMode/PlayMode, iOS/Android builds:** not performed by Work 6. The existing Work 0 independent C# results are only cited as its evidence.
- No production load, long-duration memory leak, real-device FPS, native gesture or audio-output benchmark. Optional sound toggle is implemented; audibility not certified.
- The preview art is provisional and does not establish owner art approval or commercial readiness.

## Reproduce

```sh
cd WebPreview
npm ci
npm test
npm run build
npm run dev
```

Open `/tests/mobile.html` on the development server for the three responsive widths. For native WebGL acceptance, open the published preview on Safari/iPhone, ensure it reports `LIVE 3D PREVIEW` rather than compatibility mode, then repeat aim/miss/hit/victory/defeat/restart and inspect console/performance. No build may be described as a validated Unity battle based on these results.
