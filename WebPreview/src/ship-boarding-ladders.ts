import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewHullModule } from './ship-hull-relief';

/** Original, physically raised boarding ladders for the isolated 3D shipyard.
 * Each ladder has inclined solid timber rails, individual treads and forged
 * attachments to the side of the hull. All of a class's ladders are merged
 * into exactly TWO draw-call meshes. No battle collision, entitlements,
 * acquisition, resources, navigation or movement is implemented here.
 */
type LadderStation={ side:-1|1; z:number };
const STATIONS: Record<ShipClass,readonly LadderStation[]> = {
 scout:[{side:1,z:.90}],
 fighter:[{side:-1,z:.90},{side:1,z:.90}],
 warship:[
  {side:-1,z:-.90},{side:1,z:-.90},
  {side:-1,z:.90},{side:1,z:.90}
 ]
};
const STEPS:Record<ShipClass,number>={scout:5,fighter:6,warship:7};

export function createPreviewBoardingLadders(
 shipClass:ShipClass,hullModule:PreviewHullModule
):T.Group{
 if(!Object.hasOwn(STATIONS,shipClass))
  throw new Error('Unknown ship class for boarding ladders');
 if(!['hull-oak','hull-ironwood','hull-royal'].includes(hullModule))
  throw new Error('Unknown hull module for boarding ladders');
 const reinforced=hullModule!=='hull-oak';
 const royal=hullModule==='hull-royal';
 const wood:T.BufferGeometry[]=[];
 const forge:T.BufferGeometry[]=[];
 function box(bin:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number){
  const geo=new T.BoxGeometry(w,h,d);
  geo.translate(x,y,z);bin.push(geo);
 }
 function rod(bin:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,r:number,segments=7){
  const delta=b.clone().sub(a);
  const geo=new T.CylinderGeometry(r*.85,r,delta.length(),segments);
  const q=new T.Quaternion().setFromUnitVectors(
   new T.Vector3(0,1,0),delta.clone().normalize()
  );
  geo.applyMatrix4(new T.Matrix4().compose(
   a.clone().add(b).multiplyScalar(.5),q,new T.Vector3(1,1,1)
  ));
  bin.push(geo);
 }
 function boss(bin:T.BufferGeometry[],x:number,y:number,z:number,r:number){
  const geo=new T.SphereGeometry(r,7,5);
  geo.translate(x,y,z);bin.push(geo);
 }
 const lowY=.36,highY=2.32;
 const width=shipClass==='scout'?.60:shipClass==='fighter'?.72:.78;
 // The 3D plank-built hull widens toward its gunwale. Real sloped ladder
 // cheeks track that taper while remaining outside the battle gunports.
 for(const {side,z} of STATIONS[shipClass]){
  const sideX=(y:number)=>side*(1.43+.38*(y-lowY)/(highY-lowY));
  const a=(y:number,zOffset:number,standOff=0)=>new T.Vector3(
   sideX(y)+side*standOff,y,z+zOffset
  );
  for(const edge of [-1,1]){
   rod(wood,a(lowY,edge*width*.5),a(highY,edge*width*.5),.059);
   // Physically separate forged strap bolts at both rail ends.
   for(const y of [lowY+.10,highY-.10]){
    const pos=a(y,edge*width*.5,.07);
    boss(forge,pos.x,pos.y,pos.z,.078);
   }
  }
  const steps=STEPS[shipClass];
  for(let i=0;i<steps;i++){
   const y=lowY+.20+i*(highY-lowY-.40)/Math.max(1,steps-1);
   const x=sideX(y)+side*.09;
   box(wood,x,y,z,.22,.09,width+.10);
   // Forged anti-slip strip across each raised wooden tread.
   box(forge,x+side*.092,y+.064,z,.055,.03,width*.84);
  }
  for(const y of [lowY+.08,highY-.08]){
   // Three-dimensional brackets that join both ladder cheeks to the hull.
   const x=sideX(y)-side*.10;
   box(forge,x,y,z,.24,.105,width+.17);
  }
  if(reinforced){
   for(const edge of [-1,1]){
    rod(forge,a(lowY+.16,edge*width*.5,.045),
     a(highY-.16,edge*width*.5,.045),.027,6);
   }
  }
  if(royal){
   // Distinct raised royal diamond and flanking brass rivets; not a decal.
   for(const y of [.80,1.58]){
    const x=sideX(y)+side*.15;
    for(const edge of [-1,1])
     boss(forge,x,y,z+edge*width*.38,.056);
   }
   rod(forge,a(highY-.24,0,.17),a(highY+.13,0,.17),.040,7);
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+hullModule+'-boarding-ladders';
 const batches:readonly [T.BufferGeometry[],string,string,number][]=[
  [wood,'carved-boarding-rails-and-treads',
   royal?'#b9834c':reinforced?'#946541':'#865334',.06],
  [forge,'boarding-step-forgings',
   royal?'#efc46f':reinforced?'#687f8b':'#877665',royal?.75:.63]
 ];
 for(const [parts,name,color,metalness] of batches){
  const geometry=mergeGeometries(parts,false);
  for(const part of parts)part.dispose();
  if(!geometry)throw new Error('Failed to batch boarding ladder geometry');
  geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({
   color,metalness,roughness:royal?.37:.53,flatShading:true
  }));
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,hullModule,
  ladderCount:STATIONS[shipClass].length,
  stepsPerLadder:STEPS[shipClass],
  drawCallObjects:group.children.length
 };
 return group;
}
