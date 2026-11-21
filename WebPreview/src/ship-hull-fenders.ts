import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewHullModule } from './ship-hull-relief';

/**
 * Original hanging cork-and-rope hull fenders for the temporary 3D shipyard.
 * Their count and mesh profile distinguish Scout, Fighter and Warship.
 * This is harbour outfitting, NOT a cargo item, ship purchase or battle shield.
 * All cork and all rope/fittings merge into exactly two opaque draw meshes.
 */
const STATIONS:Readonly<Record<ShipClass,readonly number[]>>={
 scout:[-2.90], fighter:[-2.90,2.90], warship:[-2.90,-.92,2.90]
};
const CLASS_PROFILE:Readonly<Record<ShipClass,{length:number;radius:number;turns:number;strands:number}>>={
 scout:{length:.76,radius:.205,turns:1.5,strands:2},
 fighter:{length:.94,radius:.245,turns:2,strands:3},
 warship:{length:1.12,radius:.285,turns:2.5,strands:4}
};
const FINISH:Readonly<Record<PreviewHullModule,{body:string;cord:string;royal:boolean}>>={
 'hull-oak':{body:'#ac8758',cord:'#c5ad7f',royal:false},
 'hull-ironwood':{body:'#71523d',cord:'#d3c39b',royal:false},
 'hull-royal':{body:'#3d5a66',cord:'#eed08f',royal:true}
};

/** A local sheer approximation taken from the existing nine-station base hull. */
function hullWidthAt(z:number):number {
 const stations=[[-4.9,.25],[-4.3,1.1],[-3.2,1.55],[-1.6,1.78],[0,1.83],
  [1.8,1.65],[3.2,1.3],[4.3,.75],[5,.08]] as const;
 for(let i=1;i<stations.length;i++){
  const [right,wRight]=stations[i], [left,wLeft]=stations[i-1];
  if(z<=right)return wLeft+(wRight-wLeft)*(z-left)/(right-left);
 }
 return stations[stations.length-1][1];
}
function mergeAndDispose(parts:T.BufferGeometry[]):T.BufferGeometry {
 const result=mergeGeometries(parts,false);
 parts.forEach(geometry=>geometry.dispose());
 if(!result)throw new Error('Cannot batch original hull fenders');
 result.computeBoundingSphere();
 return result;
}

export function createPreviewHullFenders(shipClass:ShipClass,hullModule:PreviewHullModule):T.Group {
 if(!Object.prototype.hasOwnProperty.call(STATIONS,shipClass))
  throw new Error('Unknown preview class for hull fenders');
 if(!Object.prototype.hasOwnProperty.call(FINISH,hullModule))
  throw new Error('Unknown preview hull finish for fenders');
 const profile=CLASS_PROFILE[shipClass],finish=FINISH[hullModule];
 const bodies:T.BufferGeometry[]=[],cords:T.BufferGeometry[]=[];
 let fenderCount=0;
 for(const side of [-1,1])for(const z of STATIONS[shipClass]){
  const radius=profile.radius, length=profile.length;
  const x=side*(hullWidthAt(z)+radius*.80);
  const bottom=1.02;
  // Rounded cork volume catches changing Three.js light without textures.
  const points=[
   new T.Vector2(0,0),new T.Vector2(radius*.68,0),
   new T.Vector2(radius,.12),new T.Vector2(radius*1.08,length*.5),
   new T.Vector2(radius,length-.12),new T.Vector2(radius*.63,length),
   new T.Vector2(0,length)
  ];
  const body=new T.LatheGeometry(points,10);
  body.translate(x,bottom,z);bodies.push(body);
  // Class-scaled braided helix woven around the full, non-flat fender body.
  const helixPoints:T.Vector3[]=[];
  for(let i=0;i<=12;i++){
   const t=i/12,angle=t*profile.turns*2*Math.PI;
   const w=radius*(.75+.28*Math.sin(Math.PI*t));
   helixPoints.push(new T.Vector3(x+Math.cos(angle)*w,
    bottom+.08+t*(length-.16),z+Math.sin(angle)*w));
  }
  // Explicit short cylindrical rope strands avoid curve arc-length tables
  // and retain low-poly woven silhouettes at phone-size viewing distances.
  for(let i=1;i<helixPoints.length;i++){
   const start=helixPoints[i-1],end=helixPoints[i];
   const direction=end.clone().sub(start),length=direction.length();
   const strand=new T.CylinderGeometry(.020,.020,length,5);
   strand.applyQuaternion(new T.Quaternion().setFromUnitVectors(
    new T.Vector3(0,1,0),direction.normalize()));
   strand.translate((start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2);
   cords.push(strand);
  }
  // One horizontal lashing at each end, plus class-specific lashings.
  for(let band=0;band<profile.strands;band++){
   const y=bottom+.11+(length-.22)*band/Math.max(1,profile.strands-1);
   const torus=new T.TorusGeometry(radius*.96,.018,4,12);
   torus.rotateX(Math.PI/2);torus.translate(x,y,z);cords.push(torus);
  }
  // Rope suspension from the existing gunwale; no collision or movement.
  const hookX=side*(hullWidthAt(z)+.035);
  const ropeTop=2.67,ropeBottom=bottom+length;
  const tether=new T.CylinderGeometry(.027,.027,ropeTop-ropeBottom,6);
  tether.translate((x+hookX)*.5,(ropeTop+ropeBottom)*.5,z);
  cords.push(tether);
  const eye=new T.TorusGeometry(.096,.022,4,10);
  eye.rotateY(Math.PI/2);eye.translate(hookX,ropeTop-.02,z);
  cords.push(eye);
  if(finish.royal){
   // Royal livery: raised crest band. Decorative, not an ownership emblem.
   const ribbon=new T.TorusGeometry(radius*1.025,.028,4,12);
   ribbon.rotateX(Math.PI/2);ribbon.translate(x,bottom+length*.5,z);
   cords.push(ribbon);
  }
  fenderCount++;
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+hullModule+'-hull-fenders';
 const cork=new T.Mesh(mergeAndDispose(bodies),new T.MeshStandardMaterial({
  color:finish.body,roughness:.91,metalness:.02,flatShading:true
 }));
 cork.name='sculpted-cork-fenders';
 const rigging=new T.Mesh(mergeAndDispose(cords),new T.MeshStandardMaterial({
  color:finish.cord,roughness:.81,metalness:finish.royal?.32:.03,flatShading:true
 }));
 rigging.name='woven-fender-cordage';
 for(const mesh of [cork,rigging]){
  mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
 }
 group.userData={
  previewOnly:true,affectsBattle:false,grantsOwnership:false,grantsInventory:false,
  shipClass,hullModule,fenderCount,lashingsPerFender:profile.strands,
  drawCallObjects:2,usesDynamicLights:false
 };
 return group;
}
