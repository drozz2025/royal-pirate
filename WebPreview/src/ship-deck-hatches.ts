import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewCabinModule } from './ship-cabin';

/** Raised original 3D deck grilles: geometric slats, timber coamings,
 * working hinges and metal corner plates. Editor preview ONLY. A cabin tier
 * unlock changes its LOOK, never its owned status or battle gameplay.
 * All grilles share two batched GPU meshes irrespective of hatch count.
 */
export function createPreviewDeckHatches(
 shipClass: ShipClass, cabinModule: PreviewCabinModule
): T.Group {
 const layouts: Record<ShipClass, readonly {z:number; w:number; d:number}[]> = {
  scout: [{z:1.2,w:1.02,d:.82}],
  fighter: [{z:1.2,w:1.30,d:.89},{z:-1.48,w:1.17,d:.65}],
  warship: [{z:1.2,w:1.51,d:.94},{z:-1.48,w:1.34,d:.76}]
 };
 if (!Object.hasOwn(layouts,shipClass))
  throw new Error('Unknown preview ship class for deck hatches');
 if (!['cabin-wood','cabin-raised','cabin-palace'].includes(cabinModule))
  throw new Error('Unknown preview cabin module for deck hatches');

 const wood:T.BufferGeometry[]=[];
 const metal:T.BufferGeometry[]=[];
 const raised=cabinModule!=='cabin-wood';
 const palace=cabinModule==='cabin-palace';
 function box(parts:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number):void{
  const geometry=new T.BoxGeometry(w,h,d);
  geometry.translate(x,y,z);
  parts.push(geometry);
 }
 function frame(z:number,w:number,d:number):void{
  const y=2.105; // matches deck at y=1.97; never a collision surface
  // Visible timber coaming above an inset shadow well. Physical beams make
  // narrow mobile views read as a working hatch, not a flat painted decal.
  box(wood,0,y-.035,z,w,.075,d);
  box(wood,-w/2,y+.053,z,.11,.105,d+.13);
  box(wood,w/2,y+.053,z,.11,.105,d+.13);
  for(const sign of [-1,1])
   box(wood,0,y+.053,z+sign*d/2,w+.14,.105,.085);
  // Narrow, raised transverse slats reveal the open-grille rhythm.
  const count=shipClass==='scout'?4:shipClass==='fighter'?5:6;
  for(let i=1;i<=count;i++){
   const zz=z-d/2+i*d/(count+1);
   box(wood,0,y+.095,zz,w-.18,.067,.065);
  }
  for(const x of [-w*.30,0,w*.30])
   box(wood,x,y+.055,z,.046,.09,d-.16);
  // Functional-looking forged strap hinges and a recessed pull handle.
  for(const x of [-w*.37,w*.37]){
   box(metal,x,y+.125,z-d*.48,.15,.045,.105);
   box(metal,x,y+.125,z+d*.48,.15,.045,.105);
  }
  box(metal,0,y+.15,z+d*.39,.21,.045,.055);
  if(raised){
   // Iron bound coaming with four distinct protective corner bosses.
   for(const x of [-w*.48,w*.48])for(const zz of [z-d*.47,z+d*.47])
    box(metal,x,y+.135,zz,.135,.055,.13);
   for(const side of [-1,1])
    box(metal,side*w*.43,y+.108,z,.038,.055,d*.68);
  }
  if(palace){
   // Raised royal inlay and embossed diamond: sculptural, not a copied asset.
   for(const side of [-1,1])
    box(metal,side*w*.30,y+.155,z,.036,.048,d*.52);
   for(const side of [-1,1]){
    const bar=new T.BoxGeometry(.045,.055,.22);
    bar.rotateY(side*Math.PI/4);
    bar.translate(side*.13,y+.17,z);
    metal.push(bar);
   }
   box(metal,0,y+.20,z,.10,.05,.10);
  }
 }
 for(const station of layouts[shipClass])frame(station.z,station.w,station.d);

 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+cabinModule+'-deck-hatches';
 const bins:readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][]=[
  [wood,'open-timber-deck-grilles',new T.MeshStandardMaterial({
   color:palace?'#b6854e':'#93603e',metalness:.05,roughness:.77
  })],
  [metal,'hatch-hinges-and-corner-bosses',new T.MeshStandardMaterial({
   color:palace?'#f0ca73':raised?'#738899':'#a58765',
   metalness:palace?.72:.60,roughness:.39
  })]
 ];
 for(const [parts,name,material] of bins){
  const geometry=mergeGeometries(parts,false);
  for(const part of parts)part.dispose();
  if(!geometry){material.dispose();throw new Error('Failed to batch deck hatch geometry');}
  geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,material);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,cabinModule,
  hatchCount:layouts[shipClass].length,
  drawCallObjects:group.children.length
 };
 return group;
}
