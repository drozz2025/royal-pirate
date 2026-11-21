import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewHullModule } from './ship-hull-relief';

/**
 * Original keel and cutwater art for the isolated 3D fleet editor.
 * The longitudinal keel is below the procedural hull, while the stem and
 * carved knees stand in front of the bow. Shape and fittings are genuinely
 * different per class; hull module tiers control finish, not game stats.
 *
 * Two merged, opaque meshes and zero additional lighting or textures.
 * No base ship geometry, cannons, battle hitboxes, purchases or ownership.
 */
const PROFILES:Readonly<Record<ShipClass,{
 tip:number;rise:number;woodRadius:number;knees:number;sternPost:number;
}>>={
 scout:{tip:5.72,rise:2.42,woodRadius:.075,knees:1,sternPost:1.65},
 fighter:{tip:5.56,rise:2.71,woodRadius:.12,knees:2,sternPost:2.03},
 warship:{tip:5.47,rise:3.04,woodRadius:.17,knees:3,sternPost:2.27}
};
const FINISHES:Readonly<Record<PreviewHullModule,{
 timber:string;metal:string;metalness:number;
}>>={
 'hull-oak':{timber:'#9e6638',metal:'#776d5c',metalness:.42},
 'hull-ironwood':{timber:'#544037',metal:'#8b9aa2',metalness:.78},
 'hull-royal':{timber:'#682f2b',metal:'#e8bd68',metalness:.78}
};
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);

/** The class's preview hull geometry is already scaled by applyShipModules. */
export function createPreviewKeelCutwater(
 shipClass:ShipClass,hullModule:PreviewHullModule
):T.Group {
 if(!Object.prototype.hasOwnProperty.call(PROFILES,shipClass))
  throw new Error('Unknown ship class for preview keel');
 if(!Object.prototype.hasOwnProperty.call(FINISHES,hullModule))
  throw new Error('Unknown hull refit for preview keel');
 const profile=PROFILES[shipClass],finish=FINISHES[hullModule];
 const timber:T.BufferGeometry[]=[],metalwork:T.BufferGeometry[]=[];
 const beam=(bin:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,r:number,segments=6)=>{
  const delta=b.clone().sub(a);
  const length=delta.length();
  if(length<1e-6)throw new Error('Degenerate keel beam');
  const geo=new T.CylinderGeometry(r*.85,r,length,segments,1);
  geo.applyMatrix4(new T.Matrix4().compose(
   a.clone().add(b).multiplyScalar(.5),
   new T.Quaternion().setFromUnitVectors(v(0,1,0),delta.divideScalar(length)),
   v(1,1,1)
  ));
  bin.push(geo);
 };
 const stud=(bin:T.BufferGeometry[],x:number,y:number,z:number,r=.05)=>{
  const geo=new T.SphereGeometry(r,6,4);
  geo.translate(x,y,z);bin.push(geo);
 };
 const collar=(bin:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number)=>{
  const geo=new T.BoxGeometry(w,h,d);
  geo.translate(x,y,z);bin.push(geo);
 };
 // Actual, raised centreline of the keel: six scarf joints, not a flat decal.
 // Deliberately low in the hull to remain visible from the editor's front view.
 const stations=[-4.66,-3.50,-2.0,-.35,1.45,3.35,4.80];
 for(let i=0;i<stations.length-1;i++){
  const z0=stations[i],z1=stations[i+1];
  beam(timber,v(0,-.56,z0),v(0,-.56,z1),profile.woodRadius*1.55,7);
  if(i>0)collar(metalwork,0,-.58,z0,profile.woodRadius*2.8,.055,.19);
 }
 // A swept three-part stem / cutwater; no longer a generic scaled box.
 const bow=[v(0,-.56,4.70),v(0,.25,5.03),v(0,1.22,5.27),
  v(0,profile.rise,profile.tip)];
 for(let i=0;i<bow.length-1;i++){
  beam(timber,bow[i],bow[i+1],profile.woodRadius*(1.45-i*.12),7);
  for(const side of [-1,1]){
   beam(metalwork,
    bow[i].clone().add(v(side*profile.woodRadius,.03,.045)),
    bow[i+1].clone().add(v(side*profile.woodRadius,.03,.045)),
    hullModule==='hull-oak'?.022:.038,5);
  }
 }
 // Class silhouettes differ beyond their global preview scale:
 // Scout has a single sharp knee; Fighter has two broad bow braces;
 // Warship carries three tiered heavy knees on both sides.
 for(let i=0;i<profile.knees;i++){
  const y=.76+i*.46;
  const z=5.11+i*.12;
  const width=(shipClass==='warship'?.90:shipClass==='fighter'?.72:.49)-i*.12;
  for(const side of [-1,1]){
   const a=v(side*.06,y+.19,z+.17),b=v(side*width,y-.24,z-.41);
   beam(timber,a,b,profile.woodRadius*.65,6);
   if(hullModule!=='hull-oak'){
    beam(metalwork,v(side*.12,y+.12,z+.19),
     v(side*width*.8,y-.13,z-.31),.025,5);
   }
   stud(metalwork,b.x,b.y,b.z,.045);
  }
 }
 // The transom gets a real stern post and an end fitting.
 beam(timber,v(0,-.54,-4.65),v(0,profile.sternPost,-4.90),
  profile.woodRadius*1.18,7);
 collar(metalwork,0,profile.sternPost,-4.90,profile.woodRadius*3,.14,.18);
 // Higher hull refits visually reinforce the exposed waterline only. These
 // are cosmetic and do not change armour, collisions or ocean behaviour.
 if(hullModule!=='hull-oak'){
  const fittings=hullModule==='hull-royal'?5:3;
  for(let i=0;i<fittings;i++){
   const y=.43+i*.34,z=5.08+i*.12;
   for(const side of [-1,1]){
    stud(metalwork,side*(profile.woodRadius+.055),y,z,.045);
   }
  }
 }
 if(hullModule==='hull-royal'){
  // Five original crown-point cutwater scrolls, kept in the second batch.
  for(let i=-2;i<=2;i++){
   const x=i*.14;
   const peak=v(x,profile.rise+.13+(.28-Math.abs(i)*.06),profile.tip-.14);
   beam(metalwork,v(x,profile.rise,profile.tip-.14),peak,.027,5);
   stud(metalwork,peak.x,peak.y,peak.z,.045);
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+hullModule+'-keel-cutwater';
 const batches:readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][]=[
  [timber,'keel-scarfed-timber',new T.MeshStandardMaterial({
   color:finish.timber,roughness:.72,metalness:.06,flatShading:true
  })],
  [metalwork,'cutwater-forged-edge',new T.MeshStandardMaterial({
   color:finish.metal,roughness:.38,metalness:finish.metalness,flatShading:true
  })]
 ];
 for(const [pieces,name,material] of batches){
  const merged=mergeGeometries(pieces,false);
  pieces.forEach(g=>g.dispose());
  if(!merged){material.dispose();throw new Error('Cannot merge preview keel geometry');}
  merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,material);
  mesh.name=name;
  mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,hullModule,kneePairs:profile.knees,
  raisedBowY:profile.rise,drawCallObjects:2,usesDynamicLights:false
 };
 return group;
}
