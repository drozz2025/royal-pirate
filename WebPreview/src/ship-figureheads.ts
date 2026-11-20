import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';

/** Original carved bow sculptures for the isolated Three.js shipyard.
 * One material/mesh for the metalwork, one for the dark inlays. These are
 * NOT battle hitboxes, acquired items, ship statistics or owned inventory.
 */
export type PreviewFigureheadModule =
  'figurehead-anchor' | 'figurehead-lion' | 'figurehead-crown';

const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const MODULES:readonly PreviewFigureheadModule[]=[
 'figurehead-anchor','figurehead-lion','figurehead-crown'
];

export function createPreviewFigurehead(
 shipClass:ShipClass, figureheadModule:PreviewFigureheadModule
):T.Group{
 if(!CLASSES.includes(shipClass))throw new Error('Unknown preview figurehead ship class');
 if(!MODULES.includes(figureheadModule))throw new Error('Unknown preview figurehead module');
 const metal:T.BufferGeometry[]=[], inlay:T.BufferGeometry[]=[];
 function add(g:T.BufferGeometry,x:number,y:number,z:number,
  sx=1,sy=1,sz=1,angle=0,dark=false):void{
  g.applyMatrix4(new T.Matrix4().compose(
   new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,0,angle)),
   new T.Vector3(sx,sy,sz)
  ));
  (dark?inlay:metal).push(g);
 }
 function block(w:number,h:number,d:number,x:number,y:number,z:number,angle=0,dark=false){
  add(new T.BoxGeometry(w,h,d),x,y,z,1,1,1,angle,dark);
 }
 function ball(r:number,x:number,y:number,z:number,sx=1,sy=1,sz=1,dark=false){
  add(new T.IcosahedronGeometry(r,1),x,y,z,sx,sy,sz,0,dark);
 }
 function spike(r:number,h:number,x:number,y:number,z:number,angle=0){
  add(new T.ConeGeometry(r,h,6),x,y,z,1,1,1,angle);
 }
 // Physically connected forged mounting bracket. All coordinates below
 // are relative to a forward-pointing stem, facing +Z.
 block(.34,.70,.23,0,-.26,-.17);
 ball(.21,0,-.47,-.06,1,.66,.6);
 if(figureheadModule==='figurehead-anchor'){
  // A nautical anchor with two swept flukes and a faceted iron socket.
  block(.11,.91,.14,0,.10,.10);
  block(.77,.11,.14,0,.40,.10);
  block(.56,.12,.15,0,-.34,.10);
  for(const side of [-1,1]){
   block(.13,.45,.12,side*.28,-.20,.12,side*.56);
   spike(.15,.30,side*.47,-.31,.13,side*.64);
  }
  ball(.12,0,.58,.13,.75,1,.45);
  ball(.065,0,.08,.19,1,1,.5,true);
 }else if(figureheadModule==='figurehead-lion'){
  // Lion bust: layered six-point mane, shaped muzzle and inset eye sockets.
  ball(.43,0,.14,.17,1.10,1.14,.67);
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3;
   spike(.14,.39,Math.sin(a)*.38,.14+Math.cos(a)*.37,.21,-a);
  }
  ball(.27,0,.10,.48,.92,1.08,.74);
  ball(.145,0,-.13,.66,1,.52,.72);
  for(const side of [-1,1]){
   spike(.11,.25,side*.28,.43,.39,-side*.28);
   ball(.047,side*.12,.17,.70,1,.78,.5,true);
   block(.13,.034,.045,side*.11,.26,.69,-side*.18);
  }
  ball(.072,0,-.06,.77,.82,.66,.55,true);
 }else{
  // Heraldic five-point crown with raised arches and three dark-set gems.
  block(.84,.20,.35,0,-.18,.22);
  block(.76,.12,.32,0,.01,.22);
  for(let i=-2;i<=2;i++){
   const h=.42+(2-Math.abs(i))*.11;
   spike(.115,h,i*.18,.18+h*.34,.27);
  }
  for(const i of [-1,0,1])ball(.068,i*.24,-.16,.43,1,.8,.5,true);
  ball(.11,0,.30,.27,.9,.9,.8);
 }
 // Class-specific carvings are real silhouette changes, not uniform scaling.
 // Scout: slender navigator's swept fins; Fighter: two crossed guard blades;
 // Warship: layered royal volutes and a heavy split-beak pedestal.
 if(shipClass==='scout'){
  for(const side of [-1,1])
   block(.10,.65,.12,side*.42,-.11,-.06,side*.70);
 }else if(shipClass==='fighter'){
  for(const side of [-1,1]){
   block(.095,.79,.14,side*.37,-.03,-.04,-side*.53);
   ball(.10,side*.58,-.31,.03,.78,.62,.6);
  }
 }else{
  block(1.35,.10,.20,0,-.55,-.13);
  for(const side of [-1,1]){
   block(.13,.83,.15,side*.48,-.05,-.07,side*.54);
   ball(.16,side*.65,.38,-.05,1.0,.60,.55);
   spike(.10,.32,side*.68,.56,-.01,-side*.17);
  }
 }
 function fuse(list:T.BufferGeometry[]):T.BufferGeometry{
  const merged=mergeGeometries(list);
  for(const g of list)g.dispose();
  if(!merged)throw new Error('Could not merge bow sculpture');
  merged.computeBoundingSphere();
  return merged;
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+figureheadModule+'-sculpture';
 const gilded=new T.Mesh(fuse(metal),new T.MeshStandardMaterial({
  color:shipClass==='scout'?'#c8a46a':shipClass==='fighter'?'#e0b96e':'#f4ce78',
  metalness:.68,roughness:.36,flatShading:true,side:T.DoubleSide
 }));
 gilded.name='shipyard-figurehead-carving';
 const shadows=new T.Mesh(fuse(inlay),new T.MeshStandardMaterial({
  color:'#242c35',metalness:.3,roughness:.5,flatShading:true
 }));
 shadows.name='shipyard-figurehead-inlays';
 gilded.castShadow=true;gilded.receiveShadow=true;
 shadows.castShadow=true;
 group.add(gilded,shadows);
 const scale=shipClass==='scout'?.84:shipClass==='fighter'?1:1.12;
 group.scale.setScalar(scale);
 group.position.set(0,4.45,6.36);
 group.userData={previewOnly:true,shipClass,figureheadModule,
  originalSculpture:true,drawCallObjects:2,metalPrimitives:metal.length};
 return group;
}
