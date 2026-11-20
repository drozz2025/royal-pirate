import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewMastModule } from './ship-rigging';

/**
 * Original working ropes and timber belaying cleats for the isolated 3D shipyard.
 * No rope or cleat changes navigation, rig physics, ship ownership or hitboxes.
 * Each fleet refit creates precisely two independently disposable draw meshes.
 */
export function createPreviewDeckRopeCoils(
 shipClass: ShipClass, mastModule: PreviewMastModule
): T.Group {
 const layouts: Record<ShipClass, readonly (readonly [number,number])[]> = {
  scout: [[-.85,1.65],[.85,1.65]],
  fighter: [[-1.08,-1.15],[1.08,-1.15],[-1.05,2.1],[1.05,2.1]],
  warship: [[-1.10,-1.85],[1.10,-1.85],[-1.06,1.1],[1.06,1.1],
            [-1.04,2.43],[1.04,2.43]]
 };
 const stations=layouts[shipClass];
 if (!stations) throw new Error('Unknown ship class for working ropes');
 if (!['masts-standard','masts-raider','masts-royal'].includes(mastModule))
  throw new Error('Unknown mast module for working ropes');

 const wraps=mastModule==='masts-royal'?4:mastModule==='masts-raider'?3:2;
 const ropeParts:T.BufferGeometry[]=[],hardwareParts:T.BufferGeometry[]=[];
 function add(parts:T.BufferGeometry[], geo:T.BufferGeometry,x:number,y:number,z:number):void{
  geo.translate(x,y,z);
  parts.push(geo);
 }
 function rod(parts:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,radius:number):void{
  const delta=b.clone().sub(a), length=delta.length();
  const center=a.clone().add(b).multiplyScalar(.5);
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  const geo=new T.CylinderGeometry(radius,radius*.92,length,6);
  geo.applyMatrix4(new T.Matrix4().compose(center,q,new T.Vector3(1,1,1)));
  parts.push(geo);
 }
 const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 for(const [x,z] of stations){
  const side=Math.sign(x);
  const centreY=2.045;
  // Nested true three-dimensional rope turns, laid horizontally on the deck.
  // The layers rise a little so the coils read clearly at the mobile camera.
  for(let i=0;i<wraps;i++){
   const radius=.13+i*.052;
   const coil=new T.TorusGeometry(radius,.027,4,14);
   coil.rotateX(Math.PI/2);
   add(ropeParts,coil,x,centreY+i*.015,z);
  }
  // A short loose tail connects the rope coil to a separate hardwood belaying
  // cleat. No degenerate cylinders and no wide deck overhangs.
  const cleatX=x-side*.32;
  rod(ropeParts,V(x,centreY+.04,z),V(cleatX,2.13,z-.11),.024);
  add(hardwareParts,new T.CylinderGeometry(.055,.065,.27,6),
      cleatX,2.14,z-.15);
  add(hardwareParts,new T.BoxGeometry(.31,.062,.085),
      cleatX,2.26,z-.15);
  if(mastModule!=='masts-standard'){
   // A forged mounting ring and belay pin mark the first rigging upgrade.
   add(hardwareParts,new T.TorusGeometry(.086,.026,4,8).rotateX(Math.PI/2),
       cleatX,2.045,z-.15);
   add(hardwareParts,new T.SphereGeometry(.065,6,4),
       cleatX,2.32,z-.15);
  }
  if(mastModule==='masts-royal'){
   // A separate gilt eyelet is unique to the royal three-tier rig.
   add(hardwareParts,new T.TorusGeometry(.095,.028,4,8).rotateY(Math.PI/2),
       cleatX+side*.14,2.20,z-.35);
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+mastModule+'-deck-ropes';
 const renderBins:readonly [T.BufferGeometry[],string,string,number][]=[
  [ropeParts,'laid-hemp','#c9ad75',.03],
  [hardwareParts,'belaying-cleats',
   mastModule==='masts-royal'?'#d7b46d':'#755445',
   mastModule==='masts-royal'?.65:.18]
 ];
 for(const [parts,name,color,metalness] of renderBins){
  const combined=mergeGeometries(parts,false);
  parts.forEach(part=>part.dispose());
  if(!combined)throw new Error('Cannot batch working-deck ropes');
  combined.computeBoundingSphere();
  const mesh=new T.Mesh(combined,new T.MeshStandardMaterial({
   color,metalness,roughness:metalness>.5?.38:.83
  }));
  mesh.name=name;
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={previewOnly:true,shipClass,mastModule,
  ropeStations:stations.length,windingsPerStation:wraps,
  drawCallObjects:group.children.length};
 return group;
}
