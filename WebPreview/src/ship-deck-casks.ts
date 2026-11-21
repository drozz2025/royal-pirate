import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewHullModule } from './ship-hull-relief';

/**
 * Original deck casks for the isolated 3D fleet editor. They are decorative
 * timber barrels, NOT cargo, resources, rewards, inventory or purchases.
 * All timber and metal pieces are merged into TWO disposable opaque meshes.
 */
const STATIONS: Readonly<Record<ShipClass, readonly (readonly [number,number])[]>> = {
 scout: [[-.86,3.60],[.86,3.60]],
 fighter: [[-.87,3.60],[.87,3.60],[-.90,-2.82],[.90,-2.82]],
 warship: [[-.87,3.60],[.87,3.60],[-.91,-2.82],[.91,-2.82],[-.98,.18],[.98,.18]]
};
const FINISH: Readonly<Record<PreviewHullModule,{
 timber:string;hoops:string;gold:boolean
}>> = {
 'hull-oak':{timber:'#956340',hoops:'#69717a',gold:false},
 'hull-ironwood':{timber:'#654832',hoops:'#adb1b1',gold:false},
 'hull-royal':{timber:'#71452d',hoops:'#e9ba64',gold:true}
};

export function createPreviewDeckCasks(
 shipClass:ShipClass,hullModule:PreviewHullModule
):T.Group {
 if(!Object.prototype.hasOwnProperty.call(STATIONS,shipClass))
  throw new Error('Unknown preview ship class for deck casks');
 if(!Object.prototype.hasOwnProperty.call(FINISH,hullModule))
  throw new Error('Unknown preview hull module for deck casks');
 const stations=STATIONS[shipClass],finish=FINISH[hullModule];
 const wood:T.BufferGeometry[]=[],metal:T.BufferGeometry[]=[];
 const deckY=1.99;
 function place(bin:T.BufferGeometry[],g:T.BufferGeometry,x:number,y:number,z:number){
  g.translate(x,y,z);bin.push(g);
 }
 const profile=[
  new T.Vector2(0,0),new T.Vector2(.18,0),
  new T.Vector2(.22,.10),new T.Vector2(.255,.30),
  new T.Vector2(.22,.50),new T.Vector2(.18,.60),
  new T.Vector2(0,.60)
 ];
 for(const [x,z] of stations){
  // A gently bulged lathe profile creates physical volume and catches light.
  place(wood,new T.LatheGeometry(profile,12),x,deckY+.065,z);
  place(wood,new T.BoxGeometry(.53,.065,.53),x,deckY+.030,z);
  // Individual carved staves remain a single GPU draw after merging.
  for(let i=0;i<10;i++){
   const angle=2*Math.PI*i/10;
   const ridge=new T.CylinderGeometry(.007,.007,.49,5);
   place(wood,ridge,x+Math.sin(angle)*.231,deckY+.35,z+Math.cos(angle)*.231);
  }
  // Iron hoops, lid pins and, on the royal refit, a raised brass seal.
  for(const offsetY of [.17,.51]){
   const hoop=new T.TorusGeometry(.220,.020,4,14);
   hoop.rotateX(Math.PI/2);
   place(metal,hoop,x,deckY+offsetY,z);
  }
  for(const azimuth of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
   const pin=new T.SphereGeometry(.026,5,4);
   place(metal,pin,x+Math.cos(azimuth)*.19,deckY+.673,
    z+Math.sin(azimuth)*.19);
  }
  if(finish.gold){
   const seal=new T.CylinderGeometry(.085,.085,.020,10);
   place(metal,seal,x,deckY+.677,z);
   // An original crossed-copper motif on the lid (not an ownership badge).
   for(const sign of [-1,1]){
    const inlay=new T.BoxGeometry(.018,.018,.135);
    inlay.rotateY(sign*Math.PI/4);
    place(metal,inlay,x,deckY+.690,z);
   }
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+hullModule+'-deck-casks';
 const bins:readonly [T.BufferGeometry[],string,string,number][]=[
  [wood,'sculpted-oak-casks',finish.timber,.04],
  [metal,'forged-cask-hoops',finish.hoops,finish.gold?.72:.63]
 ];
 for(const [parts,name,color,metalness] of bins){
  const merged=mergeGeometries(parts,false);
  parts.forEach(g=>g.dispose());
  if(!merged)throw new Error('Cannot merge preview deck casks');
  merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,new T.MeshStandardMaterial({
   color,metalness,roughness:metalness<.1?.77:.45,flatShading:true
  }));
  mesh.name=name;
  mesh.castShadow=false;
  mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,affectsBattle:false,grantsInventory:false,
  shipClass,hullModule,caskCount:stations.length,drawCallObjects:2,
  usesDynamicLights:false
 };
 return group;
}
