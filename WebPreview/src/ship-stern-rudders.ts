import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewHullModule } from './ship-hull-relief';

/**
 * Original stern rudders for the isolated fleet editor. The blade is a
 * genuinely three-dimensional tapered solid, not a textured quad. Scout,
 * Fighter and Warship have different proportions, hinge counts and forging.
 * Refits add visual straps only: NEVER modify steering, combat or ownership.
 *
 * Each of the nine class/hull appearances batches into TWO GPU draw objects.
 */
const PROFILES:Record<ShipClass,{
 height:number; reach:number; hinges:number; ribs:number; sweep:number
}>={
 scout: {height:1.55,reach:.65,hinges:2,ribs:1,sweep:.20},
 fighter: {height:1.87,reach:.91,hinges:3,ribs:2,sweep:.27},
 warship: {height:2.13,reach:1.18,hinges:4,ribs:3,sweep:.34}
};

export function createPreviewSternRudder(
 shipClass:ShipClass,hullModule:PreviewHullModule
):T.Group{
 const profile=PROFILES[shipClass];
 if(!profile)throw new Error('Unknown ship class for stern rudder');
 if(!['hull-oak','hull-ironwood','hull-royal'].includes(hullModule))
  throw new Error('Unknown hull module for stern rudder');
 const reinforced=hullModule!=='hull-oak';
 const royal=hullModule==='hull-royal';
 const timber:T.BufferGeometry[]=[];
 const fittings:T.BufferGeometry[]=[];
 const centerY=1.5-profile.height/2;

 function box(bucket:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number){
  const geometry=new T.BoxGeometry(w,h,d);
  geometry.translate(x,y,z);bucket.push(geometry);
 }
 function rod(bucket:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,r:number){
  const delta=b.clone().sub(a);
  const direction=delta.clone().normalize();
  const center=a.clone().add(b).multiplyScalar(.5);
  const geometry=new T.CylinderGeometry(r*.84,r,delta.length(),7);
  const orientation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction);
  geometry.applyMatrix4(new T.Matrix4().compose(center,orientation,new T.Vector3(1,1,1)));
  bucket.push(geometry);
 }
 function boss(bucket:T.BufferGeometry[],x:number,y:number,z:number,r:number){
  const geometry=new T.SphereGeometry(r,7,5);
  geometry.translate(x,y,z);bucket.push(geometry);
 }
 const point=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);

 // Sweep a subdivided box aft as it descends. Its end grain and thickness
 // remain solid when seen from the stern or during a touch-orbit inspection.
 const blade=new T.BoxGeometry(shipClass==='warship'?.22:.16,profile.height,profile.reach,1,6,2);
 const pos=blade.getAttribute('position');
 for(let i=0;i<pos.count;i++){
  const lower=.5-pos.getY(i)/profile.height;
  pos.setZ(i,pos.getZ(i)*(1-.17*lower)-profile.sweep*lower);
 }
 pos.needsUpdate=true;blade.computeVertexNormals();
 blade.translate(0,centerY,-5.19-profile.reach*.19);
 timber.push(blade);

 // A continuous stock couples the visible rudder to the hull at the transom.
 rod(timber,point(0,1.72,-5.02),point(0,1.5-profile.height+.1,-5.02),.095);
 // Distinct sculpted reinforcement rhythm for each class.
 for(let i=0;i<profile.ribs;i++){
  const y=1.15-i*.39;
  rod(timber,point(0,y,-5.09),point(0,y-.23,-5.18-profile.reach*.45),.047);
 }
 // Forged pintle-and-gudgeon hinges, physically raised from the wood.
 for(let i=0;i<profile.hinges;i++){
  const y=1.43-i*(profile.height-.28)/Math.max(1,profile.hinges-1);
  box(fittings,0,y,-5.045,.31,.095,.55);
  for(const side of [-1,1]){
   boss(fittings,side*.155,y,-5.21,.047);
  }
 }
 if(reinforced){
  // Ironwood/royal refits receive diagonal bands and a forged trailing seam.
  for(const side of [-1,1]){
   rod(fittings,
    point(side*.11,1.25,-5.19-profile.reach*.2),
    point(side*.11,.33,-5.27-profile.reach*.45),.035);
  }
  box(fittings,0,1.42,-5.35-profile.reach*.29,.24,.07,.30);
 }
 if(royal){
  // Raised flagship crest; all gilding stays in the existing fittings batch.
  for(const side of [-1,1]){
   rod(fittings,point(side*.12,1.12,-5.60),point(0,.86,-5.73),.033);
   boss(fittings,side*.10,1.16,-5.62,.065);
  }
  boss(fittings,0,1.34,-5.58,.10);
  for(let i=0;i<4;i++){
   boss(fittings,0,1.08-i*.23,-5.34-profile.reach*.3,.04);
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+hullModule+'-stern-rudder';
 const batches:readonly [T.BufferGeometry[],string,string,number][]=[
  [timber,'carved-solid-rudder',royal?'#a87546':reinforced?'#765037':'#6a3d2a',.06],
  [fittings,'rudder-hinges-and-refit',royal?'#e9bf68':reinforced?'#6d7c89':'#846746',royal?.74:.62]
 ];
 for(const [sources,name,color,metalness] of batches){
  const geometry=mergeGeometries(sources,false);
  for(const source of sources)source.dispose();
  if(!geometry)throw new Error('Failed to batch stern rudder geometry');
  geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({
   color,metalness,roughness:royal?.36:.54,flatShading:true
  }));
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={previewOnly:true,shipClass,hullModule,
  hingeCount:profile.hinges,ribCount:profile.ribs,
  drawCallObjects:group.children.length};
 return group;
}
