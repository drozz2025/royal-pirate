import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewOrnamentModule } from './ship-heraldry';

/**
 * Original raised gunwale balustrades for the isolated 3D fleet editor.
 * Each class has a different silhouette and number of carved timber posts.
 * Two opaque merged GPU draws, no textures/lights/animation, no gameplay state.
 */
const PROFILES:Readonly<Record<ShipClass,{
 postPairs:number;span:number;breadth:number;height:number;lean:number;
}>>={
 scout:{postPairs:3,span:3.10,breadth:1.33,height:.38,lean:.09},
 fighter:{postPairs:5,span:4.12,breadth:1.48,height:.52,lean:.03},
 warship:{postPairs:7,span:4.65,breadth:1.61,height:.66,lean:-.03}
};
const TRIMS:Readonly<Record<PreviewOrnamentModule,{
 wood:string;metal:string;studs:number;
}>>={
 'ornaments-simple':{wood:'#9a673b',metal:'#806b4d',studs:0},
 'ornaments-lanterns':{wood:'#674936',metal:'#b78b55',studs:1},
 'ornaments-legendary':{wood:'#613a2b',metal:'#f0c46b',studs:2}
};
const point=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);

export function createPreviewGunwaleRails(
 shipClass:ShipClass,ornamentModule:PreviewOrnamentModule
):T.Group {
 if(!Object.prototype.hasOwnProperty.call(PROFILES,shipClass))
  throw new Error('Unknown ship class for gunwale rails');
 if(!Object.prototype.hasOwnProperty.call(TRIMS,ornamentModule))
  throw new Error('Unknown ornament module for gunwale rails');
 const profile=PROFILES[shipClass],finish=TRIMS[ornamentModule];
 const timber:T.BufferGeometry[]=[],metal:T.BufferGeometry[]=[];
 const box=(bin:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number)=>{
  const geometry=new T.BoxGeometry(w,h,d);
  geometry.translate(x,y,z);bin.push(geometry);
 };
 const round=(bin:T.BufferGeometry[],x:number,y:number,z:number,r:number)=>{
  const geometry=new T.SphereGeometry(r,6,4);
  geometry.translate(x,y,z);bin.push(geometry);
 };
 const beam=(bin:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,r:number)=>{
  const lengthVector=b.clone().sub(a),length=lengthVector.length();
  if(length<1e-6)throw new Error('Degenerate gunwale rail beam');
  const geometry=new T.CylinderGeometry(r*.92,r,length,6);
  geometry.applyMatrix4(new T.Matrix4().compose(
   a.clone().add(b).multiplyScalar(.5),
   new T.Quaternion().setFromUnitVectors(point(0,1,0),lengthVector.normalize()),
   point(1,1,1)
  ));
  bin.push(geometry);
 };
 // The existing gunwale ends near y=2.82. These raised posts form a true
 // readable railing above it rather than another flat stripe on the hull.
 for(const side of [-1,1]){
  const start=-2.25,end=start+profile.span;
  const top=2.87+profile.height;
  const bases:T.Vector3[]=[],tops:T.Vector3[]=[];
  for(let i=0;i<profile.postPairs;i++){
   const fraction=i/(profile.postPairs-1);
   const z=start+fraction*(end-start);
   const base=point(side*profile.breadth,2.77,z);
   const cap=point(side*(profile.breadth+profile.lean),top,z);
   bases.push(base);tops.push(cap);
   beam(timber,base,cap,shipClass==='warship'?.073:.055);
   round(metal,cap.x,cap.y+.052,cap.z,shipClass==='warship'?.085:.065);
   if(finish.studs>0){
    box(metal,base.x,2.88,z,.16,.07,.14);
    if(finish.studs>1){
     round(metal,cap.x,cap.y-.16,cap.z,.05);
    }
   }
  }
  // A swept continuous handrail joins posts; the Scout's rail is slimmer,
  // and the Warship carries an additional heavy lower crossbeam.
  for(let i=0;i<tops.length-1;i++){
   beam(timber,tops[i],tops[i+1],shipClass==='scout'?.048:.062);
   if(shipClass==='warship'){
    const lowA=point(bases[i].x,2.99,bases[i].z);
    const lowB=point(bases[i+1].x,2.99,bases[i+1].z);
    beam(timber,lowA,lowB,.047);
   }
  }
  if(shipClass!=='scout'){
   // Mid-rail openwork: distinct frigate/flagship silhouettes, clear of guns.
   for(let i=0;i<tops.length-1;i++){
    const middle=bases[i].clone().lerp(bases[i+1],.5);
    const topMiddle=tops[i].clone().lerp(tops[i+1],.5);
    beam(metal,point(middle.x,2.93,middle.z),point(topMiddle.x,top-.09,topMiddle.z),.028);
   }
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+ornamentModule+'-gunwale-rails';
 const batches:readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][]=[
  [timber,'gunwale-carved-timber',new T.MeshStandardMaterial({
   color:finish.wood,metalness:.04,roughness:.75,flatShading:true
  })],
  [metal,'gunwale-forged-fittings',new T.MeshStandardMaterial({
   color:finish.metal,metalness:.68,roughness:.37,flatShading:true
  })]
 ];
 for(const [pieces,name,material] of batches){
  const geometry=mergeGeometries(pieces,false);
  pieces.forEach(piece=>piece.dispose());
  if(!geometry){material.dispose();throw new Error('Cannot merge preview gunwale rails');}
  geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,material);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,ornamentModule,postPairs:profile.postPairs,
  railHeight:profile.height,drawCallObjects:2,usesDynamicLights:false
 };
 return group;
}
