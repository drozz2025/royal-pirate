import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewOrnamentModule } from './ship-heraldry';

/** Original quarterdeck ship's bell and forged yoke for the isolated 3D editor.
 * Three distinct class silhouettes and three ornament finishes; not a purchased
 * bell, equip right, combat sound, inventory item or gameplay mechanic.
 * All primitives merge into exactly two disposable GPU meshes on mobile. */
export function createPreviewShipBell(
 shipClass: ShipClass, ornaments: PreviewOrnamentModule
): T.Group {
 const profiles:Record<ShipClass,{span:number; bell:number; post:number; rail:number}>={
  scout:{span:.36,bell:.19,post:.063,rail:.065},
  fighter:{span:.46,bell:.25,post:.073,rail:.078},
  warship:{span:.56,bell:.31,post:.088,rail:.10}
 };
 if(!Object.prototype.hasOwnProperty.call(profiles,shipClass))
  throw new Error('Unknown preview ship class for ship bell');
 if(!['ornaments-simple','ornaments-lanterns','ornaments-legendary'].includes(ornaments))
  throw new Error('Unknown preview ornament module for ship bell');
 const p=profiles[shipClass], upgraded=ornaments!=='ornaments-simple';
 const legendary=ornaments==='ornaments-legendary', z=3.16;
 const timber:T.BufferGeometry[]=[], metal:T.BufferGeometry[]=[];
 const V=(x:number,y:number,zz:number)=>new T.Vector3(x,y,zz);
 function add(list:T.BufferGeometry[],geo:T.BufferGeometry):void{
  geo.deleteAttribute('uv');list.push(geo);
 }
 function box(list:T.BufferGeometry[],x:number,y:number,zz:number,w:number,h:number,d:number):void{
  const geo=new T.BoxGeometry(w,h,d);geo.translate(x,y,zz);add(list,geo);
 }
 function sphere(list:T.BufferGeometry[],x:number,y:number,zz:number,r:number):void{
  const geo=new T.SphereGeometry(r,8,6);geo.translate(x,y,zz);add(list,geo);
 }
 function ring(list:T.BufferGeometry[],x:number,y:number,zz:number,r:number,tube:number):void{
  const geo=new T.TorusGeometry(r,tube,5,12);
  geo.rotateX(Math.PI/2);geo.translate(x,y,zz);add(list,geo);
 }
 function beam(list:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,r:number):void{
  const delta=b.clone().sub(a);
  if(delta.lengthSq()===0)throw new Error('Zero-length ship bell fitting');
  const axis=new T.Quaternion().setFromUnitVectors(V(0,1,0),delta.clone().normalize());
  const geo=new T.CylinderGeometry(r,r,delta.length(),7);
  geo.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),axis,V(1,1,1)));
  add(list,geo);
 }
 // Two joined hardwood uprights and an overhanging yoke with a physical sill.
 // The deck is at y=1.97; the bell sits forward of the cabin and mast.
 for(const side of [-1,1]){
  box(timber,side*p.span,2.64,z,p.post,1.25,p.post);
  box(timber,side*p.span,2.05,z,p.post*2,.13,p.post*2.2);
  sphere(metal,side*p.span,3.30,z,p.post*.72);
 }
 box(timber,0,3.29,z,p.span*2+p.post,.10,p.rail);
 box(timber,0,2.03,z,p.span*2.35,.08,.18);
 // Low-poly tapered brass bell is open below, with a true flared lip,
 // crown hanger, collar, clapper and raised bronze bands.
 const body=new T.CylinderGeometry(p.bell*.63,p.bell,.46,12,1,true);
 body.translate(0,2.94,z);add(metal,body);
 ring(metal,0,2.71,z,p.bell,p.bell*.15);
 const cap=new T.SphereGeometry(p.bell*.70,10,6,0,Math.PI*2,0,Math.PI/2);
 cap.translate(0,3.17,z);add(metal,cap);
 sphere(metal,0,2.66,z,p.bell*.28);
 beam(metal,V(0,3.28,z),V(0,3.15,z),p.bell*.17);
 ring(metal,0,3.20,z,p.bell*.57,p.bell*.055);
 if(shipClass!=='scout'){
  for(const side of [-1,1])
   beam(timber,V(side*p.span,2.90,z),V(side*p.span*.58,3.24,z),p.post*.60);
 }
 if(shipClass==='warship'){
  // Gabled admiral's bell frame and pair of original forged finials.
  for(const side of [-1,1]){
   beam(metal,V(0,3.63,z),V(side*p.span,3.34,z),.039);
   sphere(metal,side*p.span,3.43,z,.081);
  }
  sphere(metal,0,3.65,z,.10);
 }
 if(upgraded){
  ring(metal,0,2.84,z,p.bell*.81,p.bell*.075);
  for(const side of [-1,1])
   box(metal,side*p.span,2.93,z+p.post*.72,p.post*.92,.18,.025);
 }
 if(legendary){
  // Royal finish adds real relief rather than merely changing the colour.
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3;
   sphere(metal,Math.cos(a)*p.bell*.86,2.85,z+Math.sin(a)*p.bell*.86,p.bell*.09);
  }
  for(const side of [-1,1])
   sphere(metal,side*p.span,3.50,z,p.post*.85);
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+ornaments+'-deck-bell';
 const bins:readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][]=[
  [timber,'ship-bell-carved-yoke',new T.MeshStandardMaterial({
   color:legendary?'#925e38':'#785039',metalness:.05,roughness:.72
  })],
  [metal,'ship-bell-forged-bronze',new T.MeshStandardMaterial({
   color:legendary?'#efc66a':upgraded?'#d1ab67':'#b69158',
   metalness:legendary?.77:.63,roughness:.34,side:T.DoubleSide
  })]
 ];
 for(const [pieces,name,material] of bins){
  const geometry=mergeGeometries(pieces,false);
  for(const piece of pieces)piece.dispose();
  if(!geometry){material.dispose();throw new Error('Unable to batch ship bell geometry');}
  geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,material);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,ornaments,
  drawCallObjects:group.children.length,
  functionalSound:false,affectsBattle:false
 };
 return group;
}
