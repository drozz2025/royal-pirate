import * as T from 'three';

/**
 * Editor-only two-stage distance LOD. Every premium 3D module is present at
 * normal orbit distance and on desktop. On small screens at far zoom, hide
 * only tiny deck details; at the furthest zoom also hide secondary deck props.
 *
 * Visibility toggling does not allocate/dispose geometry and never alters the
 * gameplay ship, damage, ownership, purchases or equipped loadouts.
 */
export const FINE_DETAIL_HIDE_DISTANCE = 30;
export const FINE_DETAIL_SHOW_DISTANCE = 26;
export const SECONDARY_DETAIL_HIDE_DISTANCE = 38;
export const SECONDARY_DETAIL_SHOW_DISTANCE = 34;
export const SHIPYARD_MOBILE_MAX_WIDTH = 820;

// Tiny meshes have very little screen presence at distant mobile orbits.
const MICRO_PROPS = [
 '-deck-bell', '-compass-binnacle', '-navigation-chart',
 '-deck-ropes', '-deck-hatches'
] as const;

// Newer original accessories are valuable in close-up but need not consume
// draw calls when the full vessel is a small silhouette on a phone.
// Keep hull, rigging, cannons, planking, windows and rails fully visible.
const SECONDARY_PROPS = [
 '-deck-casks', '-deck-shot-racks', '-deck-capstans',
 '-boarding-ladders', '-stern-lanterns'
] as const;

type DetailTier = 'micro' | 'secondary';

function detailTier(object:T.Object3D):DetailTier|null {
 if(object.userData.previewOnly!==true || !object.name.startsWith('shipyard-'))
  return null;
 if(MICRO_PROPS.some(suffix=>object.name.endsWith(suffix)))return 'micro';
 if(SECONDARY_PROPS.some(suffix=>object.name.endsWith(suffix)))return 'secondary';
 return null;
}

export function isShipyardFineDetail(object:T.Object3D):boolean {
 return detailTier(object)!==null;
}

/**
 * Returns the number of group-visibility changes, not draw calls.
 * Two four-unit hysteresis bands avoid flicker on pinch and orbit.
 * No geometry is added or removed. Only an isolated editor accessories group
 * may be passed; invalid inputs do nothing.
 */
export function updateShipyardDetailLOD(
 accessories:T.Object3D|null|undefined,
 cameraDistance:number,
 viewportWidth:number
):number {
 if(!accessories||accessories.name!=='modular-ship-accessories'
  ||!Number.isFinite(cameraDistance)||cameraDistance<0
  ||!Number.isFinite(viewportWidth)||viewportWidth<=0)return 0;
 const mobile=viewportWidth<=SHIPYARD_MOBILE_MAX_WIDTH;
 let changed=0;
 for(const child of accessories.children){
  const tier=detailTier(child);
  if(tier===null)continue;
  const hide=tier==='micro'?FINE_DETAIL_HIDE_DISTANCE:SECONDARY_DETAIL_HIDE_DISTANCE;
  const restore=tier==='micro'?FINE_DETAIL_SHOW_DISTANCE:SECONDARY_DETAIL_SHOW_DISTANCE;
  const show=!mobile||(child.visible?cameraDistance<hide:cameraDistance<=restore);
  if(child.visible!==show){child.visible=show;changed++;}
 }
 return changed;
}
