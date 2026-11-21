import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewOrnamentModule } from './ship-heraldry';

/**
 * Original stern lantern silhouettes for the isolated fleet preview:
 * scout: one compact stern lamp; fighter: paired guarded lamps;
 * warship: three tiered ceremonial lamps.
 *
 * Ornamental refits alter metalwork and an emissive glass material, not
 * real scene lights. No PointLight, shadow map, animation loop, texture,
 * inventory, ship heading, combat or player resources are created.
 * Three merged PBR objects regardless of lantern count.
 */
const STATIONS: Readonly<Record<ShipClass, readonly (readonly [number,number,number])[]>> = {
 scout: [[0,3.73,-4.83]],
 fighter: [[-.99,3.76,-4.88],[.99,3.76,-4.88]],
 warship: [[-1.02,4.10,-5.32],[0,4.36,-5.34],[1.02,4.10,-5.32]]
};
const TIERS: Readonly<Record<PreviewOrnamentModule,number>> = {
 'ornaments-simple':0,
 'ornaments-lanterns':1,
 'ornaments-legendary':2
};

export function createPreviewSternLanterns(
 shipClass:ShipClass,ornamentModule:PreviewOrnamentModule
):T.Group {
 if(!Object.prototype.hasOwnProperty.call(STATIONS,shipClass))
  throw new Error('Unknown ship class for stern lanterns');
 if(!Object.prototype.hasOwnProperty.call(TIERS,ornamentModule))
  throw new Error('Unknown ornament module for stern lanterns');

 const tier=TIERS[ornamentModule];
 const stations=STATIONS[shipClass];
 const frame:T.BufferGeometry[]=[],glass:T.BufferGeometry[]=[],fittings:T.BufferGeometry[]=[];
 const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 function cylinder(bin:T.BufferGeometry[],x:number,y:number,z:number,
  top:number,bottom:number,height:number,segments=6){
  const g=new T.CylinderGeometry(top,bottom,height,segments,1);
  g.translate(x,y,z);bin.push(g);
 }
 function sphere(bin:T.BufferGeometry[],x:number,y:number,z:number,radius:number){
  const g=new T.SphereGeometry(radius,7,5);
  g.translate(x,y,z);bin.push(g);
 }
 function box(bin:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number){
  const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);bin.push(g);
 }
 function strut(bin:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,radius:number){
  const delta=b.clone().sub(a);
  if(delta.lengthSq()<.000001)throw new Error('Stern lantern strut has zero length');
  const g=new T.CylinderGeometry(radius,radius,delta.length(),5);
  g.applyMatrix4(new T.Matrix4().compose(
   a.clone().add(b).multiplyScalar(.5),
   new T.Quaternion().setFromUnitVectors(V(0,1,0),delta.normalize()),
   V(1,1,1)
  ));
  bin.push(g);
 }
 let totalFinials=0;
 for(const [x,y,z] of stations){
  const flagship=shipClass==='warship';
  const height=flagship?.62:shipClass==='fighter'?.54:.44;
  const radius=flagship?.24:shipClass==='fighter'?.21:.18;
  const lampY=y+height*.35;
  // The attachment arm returns into the wooden gallery, visibly suspending
  // each glass cage rather than placing a glowing cube on the rear deck.
  strut(frame,V(x,y+.34,z+.39),V(x,y+.34,z),.045);
  strut(frame,V(x,y+.34,z),V(x,lampY+height*.53,z),.038);
  // Opaque low-poly amber prism plus six open metal cage uprights.
  // Its emissive material simulates a flame without adding costly lights.
  cylinder(glass,x,lampY,z,radius*.72,radius*.82,height*.78,6);
  for(const offset of [-1,1]){
   cylinder(frame,x,lampY+offset*height*.43,z,radius*1.15,radius*1.05,.075,6);
  }
  for(let spoke=0;spoke<6;spoke++){
   const angle=2*Math.PI*spoke/6;
   const px=x+Math.cos(angle)*radius*1.03;
   const pz=z+Math.sin(angle)*radius*1.03;
   strut(frame,V(px,lampY-height*.39,pz),V(px,lampY+height*.39,pz),.022);
  }
  cylinder(fittings,x,lampY+height*.59,z,radius*.7,radius*1.04,.22,6);
  sphere(fittings,x,lampY+height*.78,z,.09);
  box(fittings,x,lampY-height*.55,z,radius*.92,.065,radius*.92);
  totalFinials+=1;
  if(tier===2){
   // Original five-tipped ceremonial crowns, batched into the existing
   // metalwork draw object; no cloned premium models or texture atlases.
   for(let crown=0;crown<5;crown++){
    const angle=2*Math.PI*crown/5;
    const cx=x+Math.cos(angle)*radius*.83;
    const cz=z+Math.sin(angle)*radius*.83;
    const a=V(cx,lampY+height*.56,cz);
    const b=V(cx*.0+x*.0+cx,lampY+height*.88,cz);
    strut(fittings,a,b,.027);
    sphere(fittings,b.x,b.y,b.z,.049);
    totalFinials++;
   }
  }
 }

 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+ornamentModule+'-stern-lanterns';
 const metalColor=tier===2?'#f0c979':tier===1?'#b49259':'#52606a';
 const materialSets: readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][]=[
  [frame,'stern-lantern-open-cages',new T.MeshStandardMaterial({
   color:metalColor,metalness:.75,roughness:.42
  })],
  [glass,'stern-lantern-amber-glass',new T.MeshStandardMaterial({
   color:tier===0?'#5e665f':'#ffc777',
   emissive:tier===0?'#000000':'#ff9c2f',
   emissiveIntensity:tier===0?0:tier===1?.55:1.05,
   metalness:0,roughness:.33
  })],
  [fittings,'stern-lantern-finials',new T.MeshStandardMaterial({
   color:tier===2?'#ebc676':tier===1?'#c2a56a':'#866d50',
   metalness:.65,roughness:.45
  })]
 ];
 for(const [pieces,name,material] of materialSets){
  const merged=mergeGeometries(pieces,false);
  pieces.forEach(piece=>piece.dispose());
  if(!merged){material.dispose();throw new Error('Cannot merge original stern lantern geometry');}
  merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,material);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,ornamentModule,
  lanternCount:stations.length,finialCount:totalFinials,
  usesDynamicLights:false,drawCallObjects:group.children.length
 };
 return group;
}
