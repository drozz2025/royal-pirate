import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewMastModule } from './ship-rigging';

/**
 * Original mast fighting-tops and crow's nests for the isolated 3D ship editor.
 * The battle masts, rig-damage hierarchy, ship economy and sail physics are
 * deliberately untouched. Each complete pair of masts uses only TWO PBR draws.
 */
export function createPreviewMastLookouts(
 shipClass:ShipClass,
 mastModule:PreviewMastModule
):T.Group{
 const sides={scout:6,fighter:8,warship:10}[shipClass];
 if(!sides)throw new Error('Unknown preview ship class');
 if(!['masts-standard','masts-raider','masts-royal'].includes(mastModule))
  throw new Error('Unknown preview mast module');
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+mastModule+'-lookouts';
 const timber:T.BufferGeometry[]=[],metal:T.BufferGeometry[]=[];
 function add(bin:T.BufferGeometry[],geo:T.BufferGeometry,x:number,y:number,z:number,flat=false){
  if(flat)geo.rotateX(Math.PI/2);
  geo.translate(x,y,z);
  bin.push(geo);
 }
 const masts=[{z:.9,y:7.17},{z:-2.1,y:6.02}];
 const royal=mastModule==='masts-royal';
 const raider=mastModule==='masts-raider';
 const layers=royal?[0,1.02]:[0];
 let platformCount=0;
 for(const mast of masts)for(const upper of layers){
  platformCount++;
  const radius=(shipClass==='scout'?.47:shipClass==='fighter'?.62:.78)
   *(raider?1.04:royal?1.10:1)*(upper?.78:1);
  const y=mast.y+upper,edge=radius*.89;
  const posts=shipClass==='scout'?6:shipClass==='fighter'?8:10;
  // Faceted carved hardwood lookout deck, inset under-ring and bracing.
  add(timber,new T.CylinderGeometry(radius,radius*.93,.18,sides),0,y,mast.z);
  add(timber,new T.CylinderGeometry(radius*.71,radius*.82,.10,sides),0,y-.17,mast.z);
  // One triangular support under every second battlement.
  for(let n=0;n<sides;n+=2){
   const a=Math.PI*2*n/sides;
   const x=Math.cos(a)*radius*.69,z=mast.z+Math.sin(a)*radius*.69;
   const len=.51;
   add(timber,new T.CylinderGeometry(.037,.053,len,6),x,y-.31,z);
  }
  // Gilded weather rail: a physical horizontal torus with low-poly stanchions.
  add(metal,new T.TorusGeometry(radius*.91,.045,4,sides*2),0,y+.12,mast.z,true);
  for(let n=0;n<posts;n++){
   const a=Math.PI*2*n/posts;
   const x=Math.cos(a)*edge,z=mast.z+Math.sin(a)*edge;
   add(metal,new T.CylinderGeometry(.035,.044,.43,6),x,y+.36,z);
  }
  add(metal,new T.TorusGeometry(edge,.045,4,posts*2),0,y+.58,mast.z,true);
  // Class signature: Scout has a light lookout needle, Fighter a crossbar;
  // Warship gets four raised admiral finials per platform.
  if(shipClass==='scout'){
   add(metal,new T.ConeGeometry(.085,.26,5),radius*.83,y+.73,mast.z);
  }else if(shipClass==='fighter'){
   add(metal,new T.BoxGeometry(radius*1.2,.07,.095),0,y+.63,mast.z);
  }else{
   for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    add(metal,new T.ConeGeometry(.083,.29,5),
     Math.cos(a)*edge,y+.81,mast.z+Math.sin(a)*edge);
   }
  }
 }
 const woodMat=new T.MeshStandardMaterial({color:'#6c3b27',roughness:.78,metalness:0});
 const brassMat=new T.MeshStandardMaterial({
  color:royal?'#f0c66c':raider?'#c8a069':'#b89159',roughness:.35,metalness:.67
 });
 for(const [parts,material,name] of [
  [timber,woodMat,'carved-wood'],[metal,brassMat,'gilded-rail']
 ] as const){
  const merged=mergeGeometries(parts,false);
  for(const part of parts)part.dispose();
  if(!merged)throw new Error('Unable to merge lookout geometry');
  const mesh=new T.Mesh(merged,material);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={previewOnly:true,shipClass,mastModule,platformCount,draws:group.children.length};
 return group;
}
