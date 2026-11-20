# WORK 2 — adaptive mobile rendering budget (preview only)

Base: `work2/shipyard-instanced-gpu-batching-20261120` (PR #681). This is a separate draft feature, not a merge to main.

## Contract with WORK 4 / WORK 6

- The isolated 3D shipyard caps device pixel ratio at **1.15** on viewports up to 820 px, or **1.5** otherwise. It never intentionally falls below 0.9.
- After at least 60 visible frame samples and 8 seconds between adjustments, sustained frame times at or above 30 ms, or CPU render times at or above 24 ms, decrease DPR by 0.15. Smooth samples at or below 19/13 ms recover by 0.10. All values are browser measurements, not claimed mobile benchmarks.
- Every exit from the editor resets the renderer to its original battle/harbour DPR. No mobile-specific quality degradation is carried into combat. Viewport resizing re-applies the shipyard cap.
- Does not modify the battle, controls, progression, wallet, inventories, ownership, transactions, save logic, or Unity.
- Public game remains unchanged. The current module catalog has three distinct classes, all 20 preview levels and nine configurable module slots. Entitlements remain WORK 4's responsibility, validated server-side before real equip.
- QA: exercise portrait/landscape resize, iPhone Safari and Android Chromium physically, monitor FPS and visuals, inspect WebGL fallback. A passing build is **not** measured device performance.
- Rollout: validate `npm ci`, `npm test`, `npm run build` on this branch before considering integration. No deployment or merge without visual/mobile QA.

Orçamento: €0.
