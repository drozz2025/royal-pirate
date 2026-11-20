# WORK 2 — Detailed 3D inspection of modular ship parts (2026-11-20)

## Delivered interfaces
- Each of the nine shipyard module slots (hull, sails, cannons, armor, figurehead, flag, masts, cabin, ornaments) has a dedicated local 3D focal point.
- The optional **FOCUS [PART]** control changes only the isolated shipyard camera and OrbitControls target, preserving the five existing 3D angles, drag/orbit and pinch zoom. **FULL SHIP** restores the original full-ship camera.
- If the user changes module slot while focused, the close-up follows the newly selected slot. Portrait framing is closer yet keeps the selected camera direction.
- The focal point uses `root.localToWorld` to respect current hull scale. No new geometry, textures, network calls, dependencies or draw calls.
- The focus state is ephemeral UI state, never a resource, upgrade, saved inventory, level, purchase or combat target.

## Coordination contract
- **WORK 6**: `Shipyard.onFocusSlot?: (slot: ModuleSlot | null) => void` is optional. In WebPreview `main.tsx` connects it to `OceanScene.setShipyardFocus(slot)`. It only affects shipyard mode. Keep Porto and battle cameras untouched.
- **WORK 4**: Focus buttons and preview levels never confer ownership. Real equip remains independently guarded by verified ship-class entitlement, module ownership and player level; server revalidation remains mandatory.
- **WORK 5**: Run `npm ci && npm test && npm run build` in `WebPreview`. Check all nine focal points, full/close camera angles and optional accessible button. Human Safari/iPhone testing on narrow screen plus FPS remains outstanding.
- **WORK 0**: Use `assets/design-approved/README.md` as the visual authority; navy and gold, true 3D ships, legibility on narrow phones.

## Integration / release guard
Stacked after draft PR #596, not merged to main or published. Tests prove helper geometry and static accessibility only; physical iPhone gesture testing is not claimed. Keep draft until CI, visual inspection and integration conflict resolution. €0.
