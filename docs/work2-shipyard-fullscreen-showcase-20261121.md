# WORK 2 — Full-screen 3D ship inspection (21 Nov 2026)

Scope: `work2/shipyard-fullscreen-showcase-20261121`, based on
`work2/shipyard-cinematic-orbit-20261121` (stacked on draft PR #718 / #713 / #29).
**Preview only.** No merge to `main`, no deployment, zero spending.

## What changed
- The SHIPYARD header now has a 44 px minimum-height **FULL 3D VIEW**
  button. It collapses the class selector and parts editor so the *existing live*
  3D scene is not covered by the mobile interface. **EDIT PARTS** immediately
  restores all previous controls and selections.
- Five camera presets and the optional 360-degree tour remain available, as
  does touch drag/pinch zoom, the PORT exit and the ship's class/level/read-only
  A/B reference caption. The model is **not recreated or purchased** by the
  display switch.
- The hidden editing panels use CSS `display:none` and therefore leave the
  keyboard focus order; the toggle is a semantic button with `aria-pressed`,
  text labels, visible focus outline and a >=44 px touch target.
- Safe-area bottom inset and narrow-phone CSS preserve the vessel inspection
  area. The existing procedural 3D vessel, three ship classes, 20 preview levels,
  nine module slots, history, entitlement checks and combat stay unchanged.
- No assumption of an unlocked ship being owned; no client-generated currency,
  persistence, purchase or inventory data.

## WORK 4 integration
The button is presentation-only. Authoritative entitlements, purchased module
IDs, actual equipped hull and player level remain exclusively owned/validated
by WORK 4's backend. The UI's `onEquip` safety checks are unchanged; display
mode must never grant progression, purchases or equipped assets.

## WORK 6 integration
The header toggle requires no new scene API. Keep the current
`onPreview/onViewChange/onTourChange/onFocusSlot` callbacks and 3D scene
mounted throughout; battle and harbour remain outside the isolated shipyard.
Before integration: verify on real iPhone Safari and Android Chrome in portrait
and landscape, including notch, tapping FULL 3D VIEW and EDIT PARTS, dragging
and pinching the ship, 360 toggle, reference A/B, level/lock semantics and
BATTLE -> PORT. Confirm visually that the ship fills more usable viewport,
without hidden buttons receiving keyboard focus.

## Verification
CI on this feature branch runs from
`.github/workflows/work2-shipyard-verify.yml`:
`cd WebPreview && npm ci && npm test && npm run build`.
New browser-free tests check toggle markup/label and CSS presentation contracts.
**Physical device FPS, visual fidelity and Unity validation are not claimed.**
No import/export or deployment. Keep PR draft until reviewed.
