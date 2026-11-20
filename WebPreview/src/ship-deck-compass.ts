import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewOrnamentModule } from './ship-heraldry';

/** A wholly original, navigational compass binnacle for the isolated shipyard.
 * Purely ornamental, with no heading, steering, purchase or ownership effects.
 * Both wood and brass fittings are batched into just two disposable meshes. */
export function createPreviewCompassBinnacle(
 shipClass: ShipClass, ornaments: PreviewOrnamentModule
): T.Group {
 const profiles:Record<ShipClass,{radius:number;post:number;beam:number;rim:number}>={
  scout:{radius:.25,post:.44,beam:.36,rim:.034},
  fighter:{radius:.32,post:.60,beam:.46,rim:.043},
  warship:{radius:.39,post:.77,beam:.56,rim:.050}
 };
 if(!Object.prototype.hasOwnProperty.call(profiles,shipClass))
  throw new Error('Unknown preview ship class for compass');
 if(!['ornaments-simple','ornaments-lanterns','ornaments-legendary'].includes(ornaments))
  throw new Error('Unknown preview ornament module for compass');
 const p=profiles[shipClass];
 const upgraded=ornaments!=='ornaments-simple';
 const legendary=ornaments==='ornaments-legendary';
 // Off-centre forequarter position preserves the centre mast, gun lanes and helm.
 const x=.75,z=-.65, top=2.12+p.post;
 const timber:T.BufferGeometry[]=[],brass:T.BufferGeometry[]=[];
 function push(pieces:T.BufferGeometry[],geo:T.BufferGeometry):void {
  geo.deleteAttribute('uv');
  pieces.push(geo);
 }
 function box(pieces:T.BufferGeometry[],cx:number,cy:number,cz:number,w:number,h:number,d:number):void{
  const geo=new T.BoxGeometry(w,h,d);
  geo.translate(cx,cy,cz);
  push(pieces,geo);
 }
 function cylinder(pieces:T.BufferGeometry[],cx:number,cy:number,cz:number,up:number,down:number,height:number):void{
  const geo=new T.CylinderGeometry(up,down,height,12);
  geo.translate(cx,cy,cz);
  push(pieces,geo);
 }
 function sphere(pieces:T.BufferGeometry[],cx:number,cy:number,cz:number,r:number):void{
  const geo=new T.SphereGeometry(r,8,6);
  geo.translate(cx,cy,cz);
  push(pieces,geo);
 }
 function ring(pieces:T.BufferGeometry[],cx:number,cy:number,cz:number,r:number,tube:number):void{
  const geo=new T.TorusGeometry(r,tube,5,20);
  geo.rotateX(Math.PI/2);
  geo.translate(cx,cy,cz);
  push(pieces,geo);
 }
 // The octagonal wooden pedestal and real raised compass housing.
 box(timber,x,2.045,z,p.beam*1.25,.14,p.beam*1.25);
 cylinder(timber,x,2.11+p.post/2,z,p.beam*.31,p.beam*.39,p.post);
 cylinder(timber,x,top-.055,z,p.radius*1.13,p.radius*.90,.13);
 // A horizontal dial, raised bronze bezel, cardinal ticks and two-point needle.
 cylinder(brass,x,top,z,p.radius*.95,p.radius*.95,.055);
 ring(brass,x,top+.052,z,p.radius,p.rim);
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6;
  const radius=p.radius*.76;
  const tick=new T.BoxGeometry(i%3===0?.035:.021,.016,i%3===0?.10:.055);
  tick.rotateY(angle);
  tick.translate(x+Math.sin(angle)*radius,top+.044,z+Math.cos(angle)*radius);
  push(brass,tick);
 }
 // Needle is genuinely raised 3D metal; it does not report game navigation.
 const needle=new T.OctahedronGeometry(1,0);
 needle.scale(.065,.032,p.radius*.73);
 needle.translate(x,top+.080,z);
 push(brass,needle);
 sphere(brass,x,top+.11,z,.050);
 // Class silhouettes are structurally different, not just uniform scaling.
 if(shipClass==='scout'){
  // Fast sloop: one exposed crossbar on a compact timber mounting.
  box(timber,x,2.22,z,p.beam*1.38,.045,.07);
 }else{
  // Frigate: paired braces, a thicker dial frame and a captain's reading ledge.
  for(const side of [-1,1]){
   box(timber,x+side*p.beam*.52,2.25+p.post*.33,z,.065,p.post*.70,.07);
  }
  box(timber,x,top-.16,z+p.radius*.9,p.beam*1.46,.08,.11);
  ring(brass,x,top+.066,z,p.radius*.83,.020);
 }
 if(shipClass==='warship'){
  // Flagship: four raised balusters and a bronze compass-crown finial.
  for(const dx of [-1,1])for(const dz of [-1,1]){
   cylinder(brass,x+dx*p.beam*.57,top-.19,z+dz*p.beam*.57,.033,.033,.23);
  }
  sphere(brass,x,top+.20,z,.086);
 }
 if(upgraded){
  // Lantern finish has actual bronze side plates, not a fake texture tint.
  for(const side of [-1,1]){
   box(brass,x+side*p.beam*.55,2.20,z,.033,.22,.16);
   sphere(brass,x+side*p.beam*.56,2.34,z,.043);
  }
 }
 if(legendary){
  // Legendary ornaments are a tier-gated visual choice, NOT a granted item.
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4;
   sphere(brass,x+Math.cos(angle)*p.radius*.96,top+.08,
    z+Math.sin(angle)*p.radius*.96,.026);
  }
  for(const side of [-1,1])sphere(brass,x+side*p.beam*.59,top-.28,z,.06);
 }
 const result=new T.Group();
 result.name='shipyard-'+shipClass+'-'+ornaments+'-compass-binnacle';
 const batches:readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][]=[
  [timber,'compass-carved-wood',new T.MeshStandardMaterial({
   color:legendary?'#986943':'#765039',metalness:.05,roughness:.70
  })],
  [brass,'compass-brass-housing',new T.MeshStandardMaterial({
   color:legendary?'#f1cf79':upgraded?'#d5ac62':'#b89457',
   metalness:.73,roughness:.34
  })]
 ];
 for(const [pieces,name,material] of batches){
  const geometry=mergeGeometries(pieces,false);
  for(const part of pieces)part.dispose();
  if(!geometry){material.dispose();throw new Error('Unable to batch compass geometry');}
  geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,material);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  result.add(mesh);
 }
 result.userData={
  shipClass,ornaments,previewOnly:true,affectsBattle:false,
  functionalHeading:false,drawCallObjects:result.children.length
 };
 return result;
}
