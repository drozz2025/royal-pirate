import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewHullModule } from './ship-hull-relief';

/** Original solid 3D ship's boats suspended from the gunwale in the editor only.
 * Lifeboats are visual fittings of hull tiers, not additional owned vessels,
 * inventory, equipment, combat objects, or player entitlements.
 * All boats share three GPU-batched materials, independent of station count.
 */
export function createPreviewDeckLongboats(
 shipClass: ShipClass, hullModule: PreviewHullModule
): T.Group {
 const layouts: Record<ShipClass, readonly (readonly [number, number])[]> = {
  scout: [[2.08,.45]],
  fighter: [[-2.22,.65],[2.22,.65]],
  warship: [[-2.42,1.25],[2.42,1.25],[-2.42,-1.55],[2.42,-1.55]]
 };
 if (!Object.hasOwn(layouts,shipClass)) throw new Error('Unknown class for ship boats');
 if (!['hull-oak','hull-ironwood','hull-royal'].includes(hullModule))
  throw new Error('Unknown hull module for ship boats');
 const woodParts: T.BufferGeometry[] = [];
 const fittingParts: T.BufferGeometry[] = [];
 const cordParts: T.BufferGeometry[] = [];
 const upgraded = hullModule !== 'hull-oak';
 const royal = hullModule === 'hull-royal';
 const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 function add(parts:T.BufferGeometry[],geometry:T.BufferGeometry,position:T.Vector3):void {
  geometry.translate(position.x,position.y,position.z);
  geometry.deleteAttribute('uv');
  parts.push(geometry);
 }
 function beam(parts:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,radius:number):void {
  const path=b.clone().sub(a);
  if(path.lengthSq()===0)throw new Error('Zero-length ship boat fitting');
  const q=new T.Quaternion().setFromUnitVectors(V(0,1,0),path.clone().normalize());
  const shape=new T.CylinderGeometry(radius,radius,path.length(),6);
  shape.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,V(1,1,1)));
  shape.deleteAttribute('uv');
  parts.push(shape);
 }
 // Bow and transom taper smoothly into a raised, open-topped shell. Unlike a
 // stretched sphere, this hull has real tapered sides and visible gunwale lips.
 function boatHull(cx:number,cz:number):T.BufferGeometry {
  const zStations=[-.64,-.49,-.26,0,.26,.49,.64];
  const widths=[.025,.145,.205,.23,.205,.145,.025];
  const positions:number[]=[],indices:number[]=[];
  for(const sign of [-1,1]){
   const offset=positions.length/3;
   for(let i=0;i<zStations.length;i++){
    const z=cz+zStations[i],w=widths[i];
    positions.push(cx+sign*w,2.55,z); // outside gunwale
    positions.push(cx+sign*w*.28,2.30+Math.abs(zStations[i])*.16,z); // curved keel
    positions.push(cx+sign*w*.83,2.50,z); // inside gunwale
   }
   for(let i=0;i<zStations.length-1;i++){
    const a=offset+3*i,b=a+3;
    if(sign===1)indices.push(a,a+1,b, b,a+1,b+1, a,b,a+2, b,b+2,a+2);
    else indices.push(a,b,a+1, b,b+1,a+1, a,a+2,b, b,a+2,b+2);
   }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
 }
 for(const [cx,cz] of layouts[shipClass]){
  const side=Math.sign(cx);
  woodParts.push(boatHull(cx,cz));
  // Thwarts, keel stiffener and seats sit above the hollow tapered hull.
  for(const zz of [-.25,.22]){
   add(woodParts,new T.BoxGeometry(.35,.045,.115),V(cx,2.49,cz+zz));
  }
  add(woodParts,new T.BoxGeometry(.075,.035,.83),V(cx,2.31,cz));
  // A pair of curved rails makes the rim catch real 3D light.
  for(const sign of [-1,1]){
   const profile=[[-.57,.08],[-.43,.16],[-.22,.205],[0,.23],[.22,.205],[.43,.16],[.57,.08]];
   for(let i=0;i<profile.length-1;i++){
    const [z0,w0]=profile[i], [z1,w1]=profile[i+1];
    beam(fittingParts,V(cx+sign*w0,2.555,cz+z0),
     V(cx+sign*w1,2.555,cz+z1),royal?.025:.018);
   }
  }
  // Davits are tied to the host ship; their appearance cannot create a
  // second fleet vessel or modify the battle physics.
  for(const dz of [-.38,.38]){
   const onboard=V(side*1.62,3.05,cz+dz);
   const outboard=V(cx,3.11,cz+dz);
   beam(fittingParts,onboard,outboard,.043);
   beam(fittingParts,V(side*1.62,2.63,cz+dz),onboard,.043);
   beam(cordParts,outboard,V(cx,2.58,cz+dz),.012);
   beam(cordParts,V(cx,2.60,cz+dz),V(cx-side*.16,2.49,cz+dz),.012);
  }
  if(upgraded){
   // Ironwood adds a locking cleat; ceremonial hulls gild it.
   add(fittingParts,new T.BoxGeometry(.39,.055,.07),V(cx,2.58,cz));
   for(const dz of [-.31,.31]){
    add(fittingParts,new T.SphereGeometry(.045,6,4),V(cx,2.58,cz+dz));
   }
  }
  if(royal){
   // Gilded fore crest is original sculpture, not a borrowed asset.
   beam(fittingParts,V(cx,2.56,cz+.53),V(cx,2.70,cz+.64),.033);
   add(fittingParts,new T.SphereGeometry(.065,6,4),V(cx,2.72,cz+.65));
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+hullModule+'-hanging-longboats';
 const bins:readonly [T.BufferGeometry[],string,string,number,number][]=[
  [woodParts,'carved-longboat-hulls',royal?'#ad7942':'#9b6039',.03,.74],
  [fittingParts,'longboat-rails-and-davits',royal?'#dfb85f':upgraded?'#607886':'#7d6550',royal?.7:.42,.43],
  [cordParts,'longboat-suspension-lines','#d4bb89',0,.96]
 ];
 for(const [parts,name,color,metalness,roughness] of bins){
  const geometry=mergeGeometries(parts,false);
  parts.forEach(part=>part.dispose());
  if(!geometry) throw new Error('Unable to batch original ship boat geometry');
  geometry.computeBoundingSphere();
  const material=new T.MeshStandardMaterial({color,metalness,roughness,side:T.DoubleSide});
  const mesh=new T.Mesh(geometry,material);
  mesh.name=name;
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={previewOnly:true,shipClass,hullModule,
  boatCount:layouts[shipClass].length,drawCallObjects:group.children.length};
 return group;
}
