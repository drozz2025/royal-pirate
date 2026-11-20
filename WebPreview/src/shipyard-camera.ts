/** Pure preview camera positions. No combat or saved ship state is affected. */
export const SHIPYARD_VIEWS = [
  { id: 'quarter', label: '3/4' },
  { id: 'bow', label: 'BOW' },
  { id: 'stern', label: 'STERN' },
  { id: 'port', label: 'PORT' },
  { id: 'starboard', label: 'STARBOARD' }
] as const;
export type ShipyardView = typeof SHIPYARD_VIEWS[number]['id'];

export function shipyardCameraOffset(view: ShipyardView, portrait: boolean): Readonly<{x:number;y:number;z:number}> {
  const distance = portrait ? 24 : 21;
  const height = portrait ? 12 : 10;
  switch(view){
    case 'quarter': return {x:portrait?8:13,y:height,z:distance};
    case 'bow': return {x:0,y:height,z:distance+2};
    case 'stern': return {x:0,y:height,z:-(distance+2)};
    case 'port': return {x:-(distance+2),y:height,z:0};
    case 'starboard': return {x:distance+2,y:height,z:0};
  }
}


/**
 * Where each modular detail is located on the unscaled procedural preview
 * ship (in local coordinates). WORK 2 does not create new colliders or
 * battle aim points. The scene transforms these using the actual hull scale.
 */
import type { ModuleSlot } from './ship-modules';
const PREVIEW_PART_TARGETS: Readonly<Record<ModuleSlot,Readonly<{x:number;y:number;z:number}>>> = {
  hull: {x:0,y:1.2,z:1},
  sails: {x:0,y:6.4,z:0.9},
  cannons: {x:1.7,y:1.6,z:0},
  armor: {x:1.6,y:1.1,z:0},
  figurehead: {x:0,y:4.5,z:5.9},
  flag: {x:0.7,y:9.2,z:0.9},
  masts: {x:0,y:8,z:0.9},
  cabin: {x:0,y:3.6,z:-3.5},
  ornaments: {x:0,y:3.2,z:-4.4}
};
export function shipyardPartTarget(slot:ModuleSlot):Readonly<{x:number;y:number;z:number}>{
  return PREVIEW_PART_TARGETS[slot];
}
/** A closer view that preserves bow/stern/port/starboard orientation. */
export function shipyardPartCameraOffset(view:ShipyardView,portrait:boolean):Readonly<{x:number;y:number;z:number}>{
  const wide=shipyardCameraOffset(view,portrait);
  const factor=portrait?.54:.5;
  return {x:wide.x*factor,y:portrait?5.7:5,z:wide.z*factor};
}
