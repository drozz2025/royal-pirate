import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewCabinModule } from './ship-cabin';

/**
 * Original shipyard helm silhouettes: light Scout tiller, four-spoke Fighter
 * wheel and eight-spoke Warship wheel. Each model has exactly TWO opaque
 * draw objects. The brass wheel/tiller remains a named mesh for editor views
 * and regression tests; smaller sculpted fittings share one vertex-coloured
 * GPU buffer. Preview art only: never steering, combat or verified ownership.
 */
const PROFILES:Readonly<Record<ShipClass,{
 radius:number;spokes:number;y:number;z:number;scout:boolean
}>>={
 scout:{radius:0,spokes:0,y:2.97,z:-2.15,scout:true},
 fighter:{radius:.36,spokes:4,y:3.18,z:-2.45,scout:false},
 warship:{radius:.47,spokes:8,y:3.39,z:-2.60,scout:false}
};
const CABIN_FINISH:Readonly<Record<PreviewCabinModule,{
 wood:string;brass:string;iron:string;decor:number
}>>={
 'cabin-wood':{wood:'#92603e',brass:'#b99759',iron:'#465361',decor:0},
 'cabin-raised':{wood:'#73503a',brass:'#d7aa5d',iron:'#526274',decor:1},
 'cabin-palace':{wood:'#57382e',brass:'#f0c66f',iron:'#4b6570',decor:2}
};
const up=new T.Vector3(0,1,0);

export function createPreviewHelm(
 shipClass:ShipClass,cabinModule:PreviewCabinModule
):[T.Mesh,T.Mesh]{
 if(!Object.prototype.hasOwnProperty.call(PROFILES,shipClass))
  throw new Error('Unknown preview helm ship class');
 if(!Object.prototype.hasOwnProperty.call(CABIN_FINISH,cabinModule))
  throw new Error('Unknown preview helm cabin module');
 const p=PROFILES[shipClass],finish=CABIN_FINISH[cabinModule];
 const parts:T.BufferGeometry[]=[];
 const color=(hex:string)=>new T.Color(hex);
 function add(geometry:T.BufferGeometry,hex:string,position:T.Vector3,
  rotation=new T.Quaternion()){
  // All accessories use identical non-indexed vertex channels, so three
  // materials (wood / bronze / iron) collapse to one colour-graded mesh.
  const g=geometry.index?geometry.toNonIndexed():geometry.clone();
  geometry.dispose();
  g.applyMatrix4(new T.Matrix4().compose(position,rotation,new T.Vector3(1,1,1)));
  const c=color(hex),values=new Float32Array(g.getAttribute('position').count*3);
  for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}
  g.setAttribute('color',new T.BufferAttribute(values,3));
  parts.push(g);
 }
 const at=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 function box(x:number,y:number,z:number,w:number,h:number,d:number,hex:string){
  add(new T.BoxGeometry(w,h,d),hex,at(x,y,z));
 }
 function ball(x:number,y:number,z:number,r:number,hex:string){
  add(new T.SphereGeometry(r,6,5),hex,at(x,y,z));
 }
 function beam(a:T.Vector3,b:T.Vector3,r:number,hex:string){
  const delta=b.clone().sub(a),length=delta.length();
  if(!(length>0))throw new Error('Degenerate preview helm beam');
  const q=new T.Quaternion().setFromUnitVectors(up,delta.normalize());
  add(new T.CylinderGeometry(r*.9,r,length,6),hex,a.clone().add(b).multiplyScalar(.5),q);
 }
 let named:T.Mesh;
 if(p.scout){
  // The Scout is a compact tiller-operated cutter, not a scaled wheel.
  named=new T.Mesh(new T.BoxGeometry(.13,.13,1.03),
   new T.MeshStandardMaterial({color:finish.wood,roughness:.7}));
  named.name='scout-steering-tiller';
  named.position.set(0,p.y,p.z);
  box(0,2.51,-2.49,.17,.91,.22,finish.iron);
  box(0,3.01,-1.67,.27,.16,.2,finish.brass);
  box(0,2.98,-2.57,.26,.12,.23,finish.brass);
  for(const x of [-.08,.08])ball(x,2.98,-1.67,.046,finish.brass);
  if(finish.decor){
   // Raised cabins add protective iron cheek plates to the tiller post.
   for(const side of [-1,1])
    box(side*.12,2.61,-2.49,.035,.48,.26,finish.brass);
  }
  if(finish.decor===2)ball(0,3.07,-1.59,.09,finish.brass);
 }else{
  const flagship=shipClass==='warship', r=p.radius;
  named=new T.Mesh(new T.TorusGeometry(r,.047,5,14),
   new T.MeshStandardMaterial({color:finish.brass,metalness:.72,roughness:.34}));
  named.name=flagship?'warship-royal-helm':'fighter-broadside-helm';
  named.position.set(0,p.y,p.z);
  const baseY=2.03,height=p.y-baseY-.1;
  box(0,baseY+height/2,p.z,.15,height,.22,finish.iron);
  box(0,baseY+.06,p.z,.39,.13,.43,finish.wood);
  // Radial spokes, raised wooden hand-grips and a turned wheel hub.
  for(let i=0;i<p.spokes;i++){
   const a=2*Math.PI*i/p.spokes;
   const dx=Math.sin(a),dy=Math.cos(a);
   beam(at(0,p.y,p.z),at(dx*(r+.075),p.y+dy*(r+.075),p.z),.038,finish.wood);
   ball(dx*(r+.085),p.y+dy*(r+.085),p.z,.058,finish.brass);
  }
  add(new T.CylinderGeometry(.12,.12,.18,9),finish.wood,at(0,p.y,p.z),
   new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
  ball(0,p.y,p.z+.105,.11,finish.brass);
  if(finish.decor){
   // Tier 9+ adds separate pedestal collars without requiring any new draw.
   for(const y of [baseY+.35,baseY+.59])
    box(0,y,p.z+.125,.21,.085,.09,finish.brass);
  }
  if(finish.decor===2){
   // Palace-tier geometric compass rose and finial on the admiral's helm.
   for(const x of [-.15,.15])ball(x,baseY+.24,p.z+.135,.075,finish.brass);
   beam(at(0,p.y-r-.22,p.z),at(0,p.y-r-.08,p.z),.048,finish.brass);
   if(flagship){
    for(const x of [-.16,0,.16])ball(x,baseY+.12,p.z+.23,.064,finish.brass);
   }
  }
 }
 const merged=mergeGeometries(parts,false);
 parts.forEach(g=>g.dispose());
 if(!merged){named.geometry.dispose();(named.material as T.Material).dispose();
  throw new Error('Cannot merge original preview helm');}
 merged.computeBoundingSphere();
 const fittings=new T.Mesh(merged,new T.MeshStandardMaterial({
  vertexColors:true,metalness:.32,roughness:.56,flatShading:true
 }));
 fittings.name='shipyard-'+shipClass+'-'+cabinModule+'-helm-fittings';
 for(const mesh of [named,fittings]){
  mesh.userData={previewOnly:true,shipClass,cabinModule,spokes:p.spokes,
   drawCallObjects:2,changesCombat:false};
  mesh.castShadow=false;mesh.receiveShadow=true;
 }
 return [named,fittings];
}
