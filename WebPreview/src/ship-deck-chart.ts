import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewOrnamentModule } from './ship-heraldry';

/**
 * Original 3D navigation chart tables for the isolated fleet editor.
 * A carved timber stand supports raised parchment, bronze fittings and
 * geometric archipelago routes: never a flat image or a gameplay minimap.
 * Four merged meshes cap draw objects; all GPU assets are preview-owned.
 */
export function createPreviewNavigationChart(
 shipClass:ShipClass, ornaments:PreviewOrnamentModule
):T.Group{
 const profiles:Record<ShipClass,{width:number;depth:number;post:number;legs:number}>={
  scout:{width:.71,depth:.53,post:.34,legs:1},
  fighter:{width:.93,depth:.69,post:.49,legs:2},
  warship:{width:1.13,depth:.78,post:.64,legs:4}
 };
 if(!Object.prototype.hasOwnProperty.call(profiles,shipClass))
  throw new Error('Unknown preview ship class for chart table');
 if(!['ornaments-simple','ornaments-lanterns','ornaments-legendary'].includes(ornaments))
  throw new Error('Unknown preview ornament module for chart table');
 const p=profiles[shipClass];
 const premium=ornaments!=='ornaments-simple';
 const legendary=ornaments==='ornaments-legendary';
 // Port-side map table pairs with the starboard compass, avoiding the mast.
 const cx=-.78,cz=-.88,top=2.07+p.post;
 const wood:T.BufferGeometry[]=[],paper:T.BufferGeometry[]=[],brass:T.BufferGeometry[]=[],ink:T.BufferGeometry[]=[];
 function push(bin:T.BufferGeometry[],geo:T.BufferGeometry):void{
  geo.deleteAttribute('uv');
  bin.push(geo);
 }
 function box(bin:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number):void{
  const geo=new T.BoxGeometry(w,h,d);geo.translate(x,y,z);push(bin,geo);
 }
 function cylinder(bin:T.BufferGeometry[],x:number,y:number,z:number,r:number,h:number,
  rotationZ=0):void{
  const geo=new T.CylinderGeometry(r,r,h,8);
  if(rotationZ)geo.rotateZ(rotationZ);
  geo.translate(x,y,z);push(bin,geo);
 }
 function ball(bin:T.BufferGeometry[],x:number,y:number,z:number,r:number):void{
  const geo=new T.SphereGeometry(r,7,5);geo.translate(x,y,z);push(bin,geo);
 }
 // The entire chart is actual 3D geometry. No canvas, downloaded texture or DOM.
 box(wood,cx,top-.05,cz,p.width,.105,p.depth);
 box(brass,cx,top+.009,cz,p.width*1.015,.021,p.depth*1.02);
 box(paper,cx,top+.025,cz,p.width*.87,.016,p.depth*.82);
 box(wood,cx,2.09+p.post*.46,cz,p.width*.23,p.post*.92,p.depth*.25);
 // Structural profiles deliberately differ; Warship has four cast balusters.
 if(p.legs===1){
  box(wood,cx,2.095,cz,p.width*.59,.10,p.depth*.66);
 }else{
  const offsets=p.legs===2?[-1,1]:[-1,1];
  for(const side of offsets){
   box(wood,cx+side*p.width*.39,2.09+p.post*.44,cz,.055,p.post*.88,.085);
  }
  box(wood,cx,2.12,cz,p.width*.72,.10,p.depth*.70);
  if(p.legs===4)for(const dz of [-1,1])for(const dx of [-1,1]){
   cylinder(brass,cx+dx*p.width*.43,2.17+p.post*.35,
    cz+dz*p.depth*.36,.025,p.post*.65);
   ball(brass,cx+dx*p.width*.43,2.17+p.post*.69,cz+dz*p.depth*.36,.038);
  }
 }
 // Raised bronze paper stops, each held by a three-dimensional timber roller.
 for(const side of [-1,1]){
  cylinder(wood,cx,top+.075,cz+side*p.depth*.39,.028,p.width*.90,Math.PI/2);
  box(brass,cx,top+.010,cz+side*p.depth*.51,p.width*.95,.033,.025);
 }
 // Draw two original archipelago contours plus a dotted navigator's course.
 // Every stroke has depth and merges into one dark ink mesh.
 function stroke(a:[number,number],b:[number,number],thick=.012):void{
  const ax=cx+a[0]*p.width,az=cz+a[1]*p.depth;
  const bx=cx+b[0]*p.width,bz=cz+b[1]*p.depth;
  const dx=bx-ax,dz=bz-az;
  const geo=new T.BoxGeometry(Math.hypot(dx,dz),.008,thick);
  geo.rotateY(-Math.atan2(dz,dx));
  geo.translate((ax+bx)/2,top+.040,(az+bz)/2);
  push(ink,geo);
 }
 const islands:readonly (readonly [number,number][])[]=[
  [[-.34,-.21],[-.23,-.30],[-.12,-.18],[-.16,-.04],[-.31,-.01],[-.34,-.21]],
  [[.04,.05],[.16,-.07],[.33,-.02],[.31,.22],[.18,.28],[.04,.05]],
  [[-.36,.19],[-.27,.13],[-.20,.24],[-.36,.19]]
 ];
 for(const outline of islands)for(let i=1;i<outline.length;i++)
  stroke(outline[i-1] as [number,number],outline[i] as [number,number]);
 for(let i=0;i<6;i++){
  const x=-.20+i*.095,z=.26-i*.075;
  box(ink,cx+x*p.width,top+.043,cz+z*p.depth,.016,.009,.014);
 }
 // Bronze rose and cardinal rays are raised rather than printed.
 cylinder(brass,cx-p.width*.32,top+.051,cz+p.depth*.27,.032,.018);
 for(const [dx,dz] of [[-.07,0],[.07,0],[0,-.07],[0,.07]]){
  box(brass,cx-p.width*.32+dx*p.width*.55,top+.05,
   cz+p.depth*.27+dz*p.depth*.60,.015,.011,.015);
 }
 if(premium){
  // Mid-tier charts gain reinforced square corners and a bolted writing rail.
  for(const dx of [-1,1])for(const dz of [-1,1]){
   ball(brass,cx+dx*p.width*.48,top+.03,cz+dz*p.depth*.47,.027);
  }
  box(brass,cx,top-.11,cz+p.depth*.56,p.width*.75,.04,.025);
 }
 if(legendary){
  // Royal map cases carry an extra cast plaque and eight inset brass studs.
  box(brass,cx,top-.105,cz-p.depth*.55,p.width*.46,.078,.025);
  for(let i=0;i<8;i++){
   const side=i%2?1:-1,along=(Math.floor(i/2)-1.5)/3;
   ball(brass,cx+along*p.width*.73,top+.04,
    cz+side*p.depth*.47,.021);
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+ornaments+'-navigation-chart';
 const batches:readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][]=[
  [wood,'chart-carved-timber',new T.MeshStandardMaterial({color:legendary?'#835131':'#65402b',roughness:.73})],
  [paper,'chart-raised-parchment',new T.MeshStandardMaterial({color:'#e9d1a0',roughness:.95,side:T.DoubleSide})],
  [brass,'chart-brass-inlay',new T.MeshStandardMaterial({color:legendary?'#f3cf73':premium?'#dcb261':'#ad8950',metalness:.72,roughness:.37})],
  [ink,'chart-archipelago-route',new T.MeshStandardMaterial({color:'#31515d',roughness:.93})]
 ];
 for(const [pieces,name,material] of batches){
  const geo=mergeGeometries(pieces,false);
  for(const piece of pieces)piece.dispose();
  if(!geo){material.dispose();throw new Error('Unable to merge 3D navigation chart');}
  geo.computeBoundingSphere();
  const mesh=new T.Mesh(geo,material);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  shipClass,ornaments,previewOnly:true,affectsBattle:false,grantsInventory:false,
  functionalNavigation:false,drawCallObjects:group.children.length
 };
 return group;
}
