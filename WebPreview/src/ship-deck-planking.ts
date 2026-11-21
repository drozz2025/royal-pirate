import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewHullModule } from './ship-hull-relief';

/**
 * Original relief seams and fasteners for the existing flat deck, in the
 * disposable 3D fleet editor only. Two merged, opaque draws per ship.
 * No decals, textures, lights, update loop or combat collision geometry.
 */
const PROFILES:Readonly<Record<ShipClass,{
 seams:number;halfWidth:number;length:number;buttRows:number;chevrons:number;
}>>={
 scout:{seams:4,halfWidth:1.08,length:5.35,buttRows:2,chevrons:0},
 fighter:{seams:6,halfWidth:1.30,length:5.55,buttRows:3,chevrons:0},
 warship:{seams:8,halfWidth:1.43,length:5.60,buttRows:4,chevrons:2}
};
const FINISHES:Readonly<Record<PreviewHullModule,{
 grain:string;fastener:string;
}>>={
 'hull-oak':{grain:'#403023',fastener:'#ac8655'},
 'hull-ironwood':{grain:'#25343b',fastener:'#a2a1a0'},
 'hull-royal':{grain:'#322528',fastener:'#eec673'}
};

export function createPreviewDeckPlanking(
 shipClass:ShipClass,hullModule:PreviewHullModule
):T.Group {
 if(!Object.prototype.hasOwnProperty.call(PROFILES,shipClass))
  throw new Error('Unknown ship class for deck planking');
 if(!Object.prototype.hasOwnProperty.call(FINISHES,hullModule))
  throw new Error('Unknown hull module for deck planking');
 const profile=PROFILES[shipClass],finish=FINISHES[hullModule];
 const seams:T.BufferGeometry[]=[],fasteners:T.BufferGeometry[]=[];
 const seam=(x:number,z:number,w:number,length:number)=>{
  // A low dark groove immediately over the existing wooden deck (y=1.97).
  const g=new T.BoxGeometry(w,.012,length);
  g.translate(x,1.982,z);seams.push(g);
 };
 const pin=(x:number,z:number)=>{
  const g=new T.SphereGeometry(.028,6,4);
  g.scale(1,.38,1);g.translate(x,1.997,z);fasteners.push(g);
 };
 const halfLength=profile.length/2;
 // All longitudinal grooves stay inside the narrow central deck. The bow
 // and stern tapers remain clear, as do gunports and the cabin above.
 for(let i=0;i<profile.seams;i++){
  const x=(i-(profile.seams-1)/2)*(2*profile.halfWidth/(profile.seams-1));
  seam(x,0,.018,profile.length);
  for(let row=0;row<profile.buttRows;row++){
   // Staggered transverse butt joints: no unnaturally continuous board ends.
   const offset=(i%2===0?.28:-.28);
   const z=-halfLength+(row+1)*profile.length/(profile.buttRows+1)+offset;
   seam(x+.12,z,.245,.022);
   pin(x-.082,z-.055);
   pin(x+.082,z+.055);
  }
 }
 // Flagship quarterdeck has a small paired herringbone timber inlay.
 // A geometrical difference, not simply a scaled duplicate of the Scout.
 for(let i=0;i<profile.chevrons;i++){
  const z=-1.95+i*.30;
  for(const side of [-1,1]){
   const a=new T.Vector3(0,1.985,z+.11);
   const b=new T.Vector3(side*.60,1.985,z-.11);
   const delta=b.clone().sub(a);
   const g=new T.BoxGeometry(.026,.012,delta.length());
   g.applyMatrix4(new T.Matrix4().compose(
    a.add(b).multiplyScalar(.5),
    new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize()),
    new T.Vector3(1,1,1)
   ));
   seams.push(g);
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+hullModule+'-deck-planking';
 const batches:readonly [T.BufferGeometry[],string,string][]=[
  [seams,'deck-grain-relief',finish.grain],
  [fasteners,'deck-forged-pins',finish.fastener]
 ];
 for(const [pieces,name,colour] of batches){
  const geometry=mergeGeometries(pieces,false);
  pieces.forEach(piece=>piece.dispose());
  if(!geometry)throw new Error('Cannot merge preview deck planking');
  geometry.computeBoundingSphere();
  const material=new T.MeshStandardMaterial({
   color:colour,roughness:name==='deck-grain-relief'?.83:.42,
   metalness:name==='deck-grain-relief'?.04:.66,flatShading:true
  });
  const mesh=new T.Mesh(geometry,material);
  mesh.name=name;mesh.receiveShadow=true;mesh.castShadow=false;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,hullModule,seamCount:profile.seams,
  staggeredButtRows:profile.buttRows,quarterdeckChevrons:profile.chevrons,
  drawCallObjects:2,usesDynamicLights:false
 };
 return group;
}
