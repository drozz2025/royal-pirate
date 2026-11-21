import * as T from 'three';

/**
 * Shipyard-only distance culling for tiny decorative meshes.
 * At the default medium orbit, every original module remains visible.
 * On narrow phones, a far zoom hides fine deck props that occupy only
 * a handful of pixels; zooming back in restores their existing GPU meshes.
 * No geometry is built/disposed here, and the battle ship is never touched.
 */
export const FINE_DETAIL_HIDE_DISTANCE = 30;
export const FINE_DETAIL_SHOW_DISTANCE = 26;
export const SHIPYARD_MOBILE_MAX_WIDTH = 820;

const SMALL_DECK_PROPS = [
 '-deck-bell', '-compass-binnacle', '-navigation-chart',
 '-deck-ropes', '-deck-hatches'
] as const;

export function isShipyardFineDetail(object:T.Object3D):boolean{
 return object.userData.previewOnly === true
  && SMALL_DECK_PROPS.some(suffix=>object.name.endsWith(suffix))
  && object.name.startsWith('shipyard-');
}

/**
 * Returns the number of visibility changes (not GPU draw calls).
 * Hysteresis of four world units prevents flicker near the threshold.
 * Only call on an accessories group belonging to an isolated shipyard ship.
 * A missing or invalid viewport/camera measurement leaves the scene alone.
 */
export function updateShipyardDetailLOD(
 accessories:T.Object3D|null|undefined,
 cameraDistance:number,
 viewportWidth:number
):number{
 if(!accessories||accessories.name!=='modular-ship-accessories'
  ||!Number.isFinite(cameraDistance)||cameraDistance<0
  ||!Number.isFinite(viewportWidth)||viewportWidth<=0) return 0;
 const mobile=viewportWidth<=SHIPYARD_MOBILE_MAX_WIDTH;
 let changed=0;
 for(const child of accessories.children){
  if(!isShipyardFineDetail(child))continue;
  const show=!mobile||(
   child.visible
    ? cameraDistance<FINE_DETAIL_HIDE_DISTANCE
    : cameraDistance<=FINE_DETAIL_SHOW_DISTANCE
  );
  if(child.visible!==show){child.visible=show;changed++;}
 }
 return changed;
}
