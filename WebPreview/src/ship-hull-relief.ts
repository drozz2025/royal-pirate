import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';

/** Original procedural wood/plated hull relief for the isolated shipyard.
 * The game ship's hull, hitboxes, speed and stats are never changed.
 * Two merged draw objects rather than an individual draw for every plank.
 */
export type PreviewHullModule = 'hull-oak' | 'hull-ironwood' | 'hull-royal';
const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const HULLS:readonly PreviewHullModule[]=['hull-oak','hull-ironwood','hull-royal'];

// Match the fore/aft stations of the procedural base hull in ships.ts.
const STATIONS= [-4.9,-4.3,-3.2,-1.6,0,1.8,3.2,4.3,5] as const;
const WIDTHS= [.25,1.1,1.55,1.78,1.83,1.65,1.3,.75,.08] as const;
const classRows:Record<ShipClass,readonly number[]>={
 scout:[1.28], fighter:[.96,1.43], warship:[.79,1.17,1.53]
};

export function createPreviewHullRelief(
 shipClass:ShipClass,hullModule:PreviewHullModule
):T.Group{
 if(!CLASSES.includes(shipClass))throw new Error('Unknown preview hull class');
 if(!HULLS.includes(hullModule))throw new Error('Unknown preview hull module');
 const timber:T.BufferGeometry[]=[], fittings:T.BufferGeometry[]=[];
 function beam(
  into:T.BufferGeometry[],x:number,y:number,z:number,
  width:number,height:number,depth:number,angle=0
 ){
  const geometry=new T.BoxGeometry(width,height,depth);
  geometry.applyMatrix4(new T.Matrix4().compose(
   new T.Vector3(x,y,z),
   new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle),
   new T.Vector3(1,1,1)
  ));
  into.push(geometry);
 }
 // Each strake follows the station-by-station sheer of the same base hull:
 // sides are mirrored, and planks taper around the narrow stem and stern.
 const rows=classRows[shipClass];
 for(const y of rows){
  const sideFactor=.53+((y+.5)/.35)*.065;
  for(const side of [-1,1]){
   for(let i=1;i<STATIONS.length-2;i++){
    const z1=STATIONS[i],z2=STATIONS[i+1];
    const x1=side*(WIDTHS[i]*sideFactor+.045);
    const x2=side*(WIDTHS[i+1]*sideFactor+.045);
    const dx=x2-x1,dz=z2-z1;
    const run=Math.hypot(dx,dz);
    beam(timber,(x1+x2)/2,y,(z1+z2)/2,
     shipClass==='scout'?.075:shipClass==='fighter'?.10:.13,
     hullModule==='hull-royal'?.15:.12,run*1.03,
     Math.atan2(dx,dz));
   }
  }
 }
 // Three unmistakably different 3D fittings silhouettes:
 // Scout: two slim forward fairleads; Fighter: studded fighting rails;
 // Warship: five studded posts and an extended gilded bow binding.
 const studs=shipClass==='scout'?[2,6]:shipClass==='fighter'?[2,4,6]:[1,2,4,6,7];
 for(const side of [-1,1]){
  for(const station of studs){
   const y=rows[rows.length-1]+.04;
   const factor=.53+((y+.5)/.35)*.065;
   const x=side*(WIDTHS[station]*factor+.105);
   beam(fittings,x,y,STATIONS[station],.14,.21,
    shipClass==='warship'?.18:.13);
  }
  const front=shipClass==='scout'?4.0:shipClass==='fighter'?4.2:4.4;
  beam(fittings,side*.65,1.72,front,
   shipClass==='warship'?.16:.09,
   shipClass==='warship'?.75:.37,.15);
  if(shipClass==='warship'){
   beam(fittings,side*.98,1.08,-3.65,.19,.61,.24);
   beam(fittings,side*.53,1.84,4.54,.13,.45,.17);
  }
 }
 // Ironwood gets a visible metal seam; Royal adds a second raised gilt rail.
 if(hullModule!=='hull-oak'){
  for(const side of [-1,1]){
   for(let i=2;i<=6;i++){
    const y=.57, factor=.53+((y+.5)/.35)*.065;
    const x=side*(WIDTHS[i]*factor+.095);
    beam(fittings,x,y,STATIONS[i],.13,.22,.18);
   }
   if(hullModule==='hull-royal'){
    beam(fittings,side*1.26,1.76,-1.20,.13,.15,3.6);
   }
  }
 }
 function combine(geometries:T.BufferGeometry[]){
  const merged=mergeGeometries(geometries);
  for(const geo of geometries)geo.dispose();
  if(!merged)throw new Error('Cannot merge preview hull relief');
  merged.computeBoundingSphere();
  return merged;
 }
 const timberColors:Record<PreviewHullModule,string>={
  'hull-oak':'#a16b3d','hull-ironwood':'#5b4138','hull-royal':'#7f352b'
 };
 const fittingColors:Record<PreviewHullModule,string>={
  'hull-oak':'#b58b55','hull-ironwood':'#647480','hull-royal':'#efc66d'
 };
 const group=new T.Group();
 group.name=`shipyard-${shipClass}-${hullModule}-hull-relief`;
 const wood=new T.Mesh(combine(timber),new T.MeshStandardMaterial({
  color:timberColors[hullModule],roughness:.73,metalness:.03,flatShading:true
 }));
 wood.name='shipyard-hull-sheer-strakes';
 const metal=new T.Mesh(combine(fittings),new T.MeshStandardMaterial({
  color:fittingColors[hullModule],roughness:.36,metalness:.75,flatShading:true
 }));
 metal.name='shipyard-hull-ironwork';
 for(const mesh of [wood,metal]){mesh.castShadow=true;mesh.receiveShadow=true;}
 group.add(wood,metal);
 group.userData={previewOnly:true,shipClass,hullModule,drawCallObjects:2,
  strakeRows:rows.length,studsPerSide:studs.length};
 return group;
}
