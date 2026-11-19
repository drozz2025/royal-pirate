import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';

/** Original, low-poly quarterdeck roof art for the independent 3D SHIPYARD.
 * Each cabin tier generates real geometry with one mesh/material/draw call.
 * It is not a purchased part, a combat upgrade or a persistence record. */
export type PreviewCabinModule = 'cabin-wood' | 'cabin-raised' | 'cabin-palace';

const PROFILES: Record<ShipClass, {
 width:number; depth:number; eaveY:number; ridge:number; aftZ:number
}> = {
 scout:{width:2.02,depth:1.52,eaveY:3.80,ridge:.25,aftZ:-4.33},
 fighter:{width:2.52,depth:1.72,eaveY:3.87,ridge:.43,aftZ:-4.40},
 warship:{width:2.82,depth:1.98,eaveY:4.43,ridge:.52,aftZ:-4.61}
};

export function createPreviewCabinGallery(
 shipClass:ShipClass,cabinModule:PreviewCabinModule
):T.Mesh {
 if(!Object.prototype.hasOwnProperty.call(PROFILES,shipClass))
  throw new Error('Unknown preview ship class for cabin');
 if(!['cabin-wood','cabin-raised','cabin-palace'].includes(cabinModule))
  throw new Error('Unknown preview cabin module');

 const p=PROFILES[shipClass];
 const raised=cabinModule!=='cabin-wood';
 const palace=cabinModule==='cabin-palace';
 const pieces:T.BufferGeometry[]=[];
 // Convert all generated primitives to non-indexed buffers before merging,
 // so roof ExtrudeGeometry, lantern spheres and trim boxes are compatible.
 function add(source:T.BufferGeometry,x:number,y:number,z:number,
              sx=1,sy=1,sz=1,rz=0):void {
  const g=source.index?source.toNonIndexed():source;
  if(g!==source)source.dispose();
  g.applyMatrix4(new T.Matrix4().compose(
   new T.Vector3(x,y,z),
   new T.Quaternion().setFromEuler(new T.Euler(0,0,rz)),
   new T.Vector3(sx,sy,sz)
  ));
  pieces.push(g);
 }
 function box(x:number,y:number,z:number,w:number,h:number,d:number):void {
  add(new T.BoxGeometry(1,1,1),x,y,z,w,h,d);
 }
 function sphere(x:number,y:number,z:number,r:number):void {
  add(new T.SphereGeometry(r,7,5),x,y,z);
 }
 function roof(width:number,length:number,eaveY:number,height:number,z:number):void {
  const outline=new T.Shape();
  outline.moveTo(-width/2,0);
  outline.lineTo(-width*.45,.05);
  outline.lineTo(0,height);
  outline.lineTo(width*.45,.05);
  outline.lineTo(width/2,0);
  outline.closePath();
  const g=new T.ExtrudeGeometry(outline,{
   depth:length,steps:1,curveSegments:1,bevelEnabled:false
  });
  add(g,0,eaveY,z);
  // Slim eaves and ridge: preserve a strong premium silhouette at mobile scale.
  box(0,eaveY-.025,z+length/2,width+.14,.07,length+.09);
  box(0,eaveY+height,z+length/2,.085,.09,length+.08);
 }

 const lift=palace?.20:raised?.12:0;
 roof(p.width,p.depth,p.eaveY+lift,p.ridge+(raised?.10:0),p.aftZ);
 // Projecting cabin brackets and rear-edge frames are class-specific.
 for(const side of [-1,1]){
  box(side*p.width*.46,p.eaveY-.19+lift,p.aftZ+.17,.09,.31,.13);
  sphere(side*p.width*.43,p.eaveY+.055+lift,p.aftZ+.07,.075);
 }
 if(shipClass==='scout'){
  // Corsair's streamlined rear fin: no extra stories or heavy gallery.
  box(0,p.eaveY+p.ridge+.17+lift,p.aftZ+.25,.10,.30,.20);
  sphere(0,p.eaveY+p.ridge+.35+lift,p.aftZ+.25,.075);
 }else if(shipClass==='fighter'){
  // Wide double aft gable and two projecting decorative battens.
  for(const side of [-1,1]){
   box(side*.79,p.eaveY+.12+lift,p.aftZ-.08,.11,.25,.18);
   box(side*.79,p.eaveY+.27+lift,p.aftZ-.08,.20,.07,.18);
  }
 }else{
  // A tiered admiral transom crown with three elevated royal finials.
  for(const x of [-.88,0,.88]){
   box(x,p.eaveY+.10+lift,p.aftZ-.10,.13,.38,.18);
   sphere(x,p.eaveY+.35+lift,p.aftZ-.10,.10);
  }
 }
 if(raised){
  // Level 9: actual raised gallery trim, not just a colour change.
  box(0,p.eaveY-.29,p.aftZ+.15,p.width*.80,.13,.28);
  for(const side of [-1,1])
   box(side*p.width*.35,p.eaveY-.06+lift,p.aftZ+.p.depth*.84,.09,.35,.10);
 }
 if(palace){
  // Level 18: a second, distinctly smaller royal roof, with pointed
  // pennon finials. These are decorative and never affect hull physics.
  roof(p.width*.56,p.depth*.54,p.eaveY+p.ridge+.44,p.ridge*.65,p.aftZ+.29);
  for(const side of [-1,1]){
   const x=side*p.width*.30;
   box(x,p.eaveY+.36,p.aftZ+.09,.12,.49,.14);
   sphere(x,p.eaveY+.66,p.aftZ+.09,.09);
  }
 }
 const combined=mergeGeometries(pieces);
 for(const piece of pieces)piece.dispose();
 if(!combined)throw new Error('Cannot merge 3D cabin gallery geometry');
 combined.computeBoundingSphere();
 const material=new T.MeshStandardMaterial({
  color:'#d4a65c',metalness:.58,roughness:.40,
  side:T.DoubleSide,flatShading:true
 });
 const mesh=new T.Mesh(combined,material);
 mesh.name=`shipyard-${shipClass}-${cabinModule}-cabin-gallery`;
 mesh.castShadow=true;
 mesh.receiveShadow=true;
 mesh.userData={
  previewOnly:true,shipClass,cabinModule,
  primitivesMerged:pieces.length,drawCallObjects:1,
  tier:palace?'palace':raised?'raised':'wood'
 };
 return mesh;
}
