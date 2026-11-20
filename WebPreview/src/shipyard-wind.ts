import * as T from 'three';
import type { ShipClass } from './ship-modules';

/** Wind for the isolated editor only. Geometry, cloth buffers and battle
 * physics are never edited. The rates are deliberately modest for mobile. */
const WIND: Record<ShipClass, {rate:number;phase:number;yaw:number;roll:number}> = {
 scout: {rate:1.9,phase:.35,yaw:.24,roll:.095},
 fighter: {rate:1.45,phase:1.1,yaw:.16,roll:.07},
 warship: {rate:1.12,phase:2.05,yaw:.13,roll:.055}
};

export type ShipyardWindPose = { yaw:number; roll:number; jibYaw:number };

export function shipyardWindPose(shipClass:ShipClass, elapsedSeconds:number):ShipyardWindPose {
 if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)
  throw new RangeError('Shipyard wind time must be non-negative and finite');
 const profile=WIND[shipClass];
 if(!profile)throw new Error('Unknown ship class for preview wind');
 const main=Math.sin(elapsedSeconds*profile.rate+profile.phase);
 const flutter=Math.sin(elapsedSeconds*profile.rate*2.5+profile.phase*.7);
 return {
  yaw:profile.yaw*(main*.81+flutter*.19),
  roll:profile.roll*Math.sin(elapsedSeconds*profile.rate*1.4+profile.phase),
  jibYaw:shipClass==='scout'?.028*Math.sin(elapsedSeconds*.86+profile.phase):0
 };
}

type AnimatedParts = {pennant?:T.Object3D;jib?:T.Object3D};
// Weak references prevent removed preview builds from being retained.
const partCache=new WeakMap<T.Group,AnimatedParts>();

/** O(1) per frame after first lookup: animate just the class-specific pennant
 * and Scout jib. The mast anchor is the pivot, so cloth cannot drift off deck.
 * Repeated calls with the same timestamp are idempotent (no accumulated drift).
 * Does nothing for base battle ships or unloaded previews. */
export function animateShipyardWind(root:T.Object3D,elapsedSeconds:number):void {
 const accessories=root.getObjectByName('modular-ship-accessories');
 if(!(accessories instanceof T.Group)||accessories.userData.previewOnly!==true)return;
 const shipClass=accessories.userData.shipClass as ShipClass;
 if(!Object.prototype.hasOwnProperty.call(WIND,shipClass))return;
 let parts=partCache.get(accessories);
 if(!parts){
  parts={
   pennant:accessories.getObjectByName(shipClass+'-'+(shipClass==='scout'?'swallow':shipClass==='fighter'?'forked':'royal')+'-pennant'),
   jib:shipClass==='scout'?accessories.getObjectByName('scout-fore-and-aft-jib'):undefined
  };
  partCache.set(accessories,parts);
 }
 const pose=shipyardWindPose(shipClass,elapsedSeconds);
 if(parts.pennant){
  parts.pennant.rotation.y=pose.yaw;
  parts.pennant.rotation.z=pose.roll;
 }
 if(parts.jib)parts.jib.rotation.y=pose.jibYaw;
}
