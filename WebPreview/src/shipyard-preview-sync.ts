import * as T from 'three';
import {
  applyShipModules, progressionTier, resolveLoadout, SLOTS,
  type ShipLoadout
} from './ship-modules';

/** Update the isolated harbour editor without rebuilding expensive GPU buffers
 * when the player only changes the demonstration level.
 *
 * Geometry in applyShipModules depends on class and nine selected module IDs.
 * The demo level affects only eligibility and the tier label; it must never be
 * interpreted as earned progress, ownership, purchases or equipped state.
 */
export function syncShipyardPreview(
 root: T.Group, rig: T.Group, requested: ShipLoadout
): { accessories: T.Group; rebuilt: boolean } {
 // Validate BEFORE touching the last valid preview. A locked or unknown part
 // cannot destroy the model which is currently visible to the user.
 const resolved = resolveLoadout(requested);
 const previous = root.getObjectByName('modular-ship-accessories');
 const metadata = previous?.userData;
 const previousModules = metadata?.modules as Record<string,string> | undefined;
 const sameGeometry = previous instanceof T.Group &&
  metadata?.previewOnly === true &&
  metadata.shipClass === resolved.shipClass &&
  previousModules !== undefined &&
  SLOTS.every(slot => previousModules[slot] === resolved.modules[slot]);

 if (sameGeometry && previous instanceof T.Group) {
  // Preserve the same root, sail materials, instanced meshes and GPU buffers.
  // A level change alone must not allocate or dispose 3D geometry.
  previous.userData = {
   ...previous.userData,
   level: resolved.level,
   tier: progressionTier(resolved.level),
   modules: resolved.modules,
   previewOnly: true
  };
  return { accessories: previous, rebuilt: false };
 }

 // Classes or visual parts changed: the existing disposal path in
 // applyShipModules still runs, and combat ships remain untouched.
 return { accessories: applyShipModules(root,rig,resolved), rebuilt: true };
}
