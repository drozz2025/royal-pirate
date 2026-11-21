import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewCabinModule } from './ship-cabin';

/**
 * Original curved aft lookout balconies in the isolated 3D fleet editor.
 * Each is a physical shelf, carved supports and swept forged railing.
 * Two opaque merged GPU draws; no dynamic lights, textures or battle data.
 * Independent of stern windows so WORK 6 can show both from STERN view.
 */
const PROFILES:Readonly<Record<ShipClass,{
 width:number; stern:number; baseY:number; depth:number; posts:number;
 hasWings:boolean; hasLowerRail:boolean;
}>>={
 scout:{width:1.55,stern:-4.68,baseY:2.22,depth:.44,posts:3,hasWings:false,hasLowerRail:false},
 fighter:{width:2.36,stern:-4.88,baseY:2.24,depth:.51,posts:5,hasWings:true,hasLowerRail:false},
 warship:{width:2.96,stern:-5.43,baseY:2.34,depth:.56,posts:7,hasWings:true,hasLowerRail:true}
};
const FINISHES:Readonly<Record<PreviewCabinModule,{
 wood:string;metal:string;raised:boolean;ceremonial:boolean;
}>>={
 'cabin-wood':{wood:'#8b5938',metal:'#ad8b59',raised:false,ceremonial:false},
 'cabin-raised':{wood:'#6d4933',metal:'#c9a36d',raised:true,ceremonial:false},
 'cabin-palace':{wood:'#59372b',metal:'#eabf62',raised:true,ceremonial:true}
};
const up=new T.Vector3(0,1,0);

export function createPreviewSternBalconies(
 shipClass:ShipClass,cabinModule:PreviewCabinModule
):T.Group {
 if(!Object.prototype.hasOwnProperty.call(PROFILES,shipClass))
  throw new Error('Unknown preview ship class for stern balconies');
 if(!Object.prototype.hasOwnProperty.call(FINISHES,cabinModule))
  throw new Error('Unknown preview cabin module for stern balconies');

 const profile=PROFILES[shipClass],finish=FINISHES[cabinModule];
 const timber:T.BufferGeometry[]=[],metal:T.BufferGeometry[]=[];
 function box(bin:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number){
  const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);bin.push(g);
 }
 function sphere(bin:T.BufferGeometry[],x:number,y:number,z:number,r:number){
  const g=new T.SphereGeometry(r,6,5);g.translate(x,y,z);bin.push(g);
 }
 function beam(bin:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,r:number){
  const delta=b.clone().sub(a),length=delta.length();
  if(length<1e-6)throw new Error('Degenerate stern balcony rail');
  const g=new T.CylinderGeometry(r*.94,r,length,6);
  g.applyMatrix4(new T.Matrix4().compose(
   a.clone().add(b).multiplyScalar(.5),
   new T.Quaternion().setFromUnitVectors(up,delta.normalize()),
   new T.Vector3(1,1,1)
  ));
  bin.push(g);
 }
 const point=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 const half=profile.width*.5, y=profile.baseY,z=profile.stern;
 // The aft-facing edge is swept: centre projects farther astern than the ends.
 // A true 3D camber and open railing reads clearly in the rear camera preset.
 const back=(x:number)=>z-.10*(1-(x/half)**2);
 const topY=y+.51+(finish.raised?.06:0);
 const shelfZ=z+profile.depth*.36;
 box(timber,0,y,shelfZ,profile.width,.14,profile.depth);
 box(timber,0,y-.11,z+.10,profile.width*.94,.11,.10);
 if(profile.hasWings){
  for(const side of [-1,1]){
   box(timber,side*(half-.12),y+.035,z+.23,.29,.18,.32);
   box(metal,side*(half+.015),y-.055,z+.13,.052,.14,.34);
  }
 }
 // Tapered diagonal wooden knees visibly support a cantilevered deck.
 for(const side of [-1,1]){
  const a=point(side*half*.77,y-.06,z+.15);
  const b=point(side*half*.64,y-.41,z+.36);
  beam(timber,a,b,shipClass==='scout'?.071:.091);
  if(finish.raised){
   beam(metal,point(side*half*.78,y-.07,z+.11),
    point(side*half*.70,y-.28,z+.21),.036);
  }
 }
 const positions:T.Vector3[]=[];
 for(let i=0;i<profile.posts;i++){
  const x=-half+(profile.width*i)/(profile.posts-1);
  const edge=back(x),foot=point(x,y+.075,edge),top=point(x,topY,edge);
  positions.push(top);
  beam(timber,foot,top,shipClass==='scout'?.048:.066);
  sphere(metal,top.x,top.y+.035,top.z,.060);
  if(finish.ceremonial){
   // Sculpted gold drops and raised finials are present only in the palace.
   sphere(metal,x,topY-.17,edge,.047);
   const finial=new T.ConeGeometry(.055,.15,5);
   finial.translate(x,topY+.145,edge);
   metal.push(finial);
  }
 }
 for(let i=0;i<positions.length-1;i++){
  beam(metal,positions[i],positions[i+1],.046);
  if(profile.hasLowerRail){
   const a=positions[i],b=positions[i+1];
   beam(timber,point(a.x,y+.27,a.z),point(b.x,y+.27,b.z),.040);
  }
 }
 if(finish.raised){
  // A second physical moulding distinguishes the level 9+ cabin tiers.
  const steps=profile.posts-1;
  for(let i=0;i<steps;i++){
   const a=positions[i],b=positions[i+1];
   beam(metal,point(a.x,y+.13,a.z),point(b.x,y+.13,b.z),.032);
  }
 }
 if(shipClass==='warship'){
  // Unique admiral's double quarter galleries, with additional wing guards.
  for(const side of [-1,1]){
   box(timber,side*(half-.08),y+.24,z+.19,.14,.43,.20);
   box(metal,side*(half-.08),y+.48,z+.19,.19,.055,.26);
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+cabinModule+'-stern-balcony';
 const batches:readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][]=[
  [timber,'carved-stern-balcony',new T.MeshStandardMaterial({
   color:finish.wood,metalness:.02,roughness:.73,flatShading:true
  })],
  [metal,'forged-balcony-rail',new T.MeshStandardMaterial({
   color:finish.metal,metalness:.68,roughness:.39,flatShading:true
  })]
 ];
 for(const [pieces,name,material] of batches){
  const merged=mergeGeometries(pieces,false);
  pieces.forEach(piece=>piece.dispose());
  if(!merged){material.dispose();throw new Error('Cannot merge original stern balcony');}
  merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,material);
  mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,cabinModule,postCount:profile.posts,
  sweptAftEdge:true,raisedMoulding:finish.raised,ceremonialFinials:finish.ceremonial,
  wingGuards:profile.hasWings,lowerRail:profile.hasLowerRail,
  drawCallObjects:2,usesDynamicLights:false,hasTransparency:false
 };
 return group;
}
