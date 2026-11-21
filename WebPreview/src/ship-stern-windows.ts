import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewCabinModule } from './ship-cabin';

/**
 * Original stern-facing window galleries in the isolated fleet editor.
 * Scout uses two narrow corsair lights, Fighter three frigate windows and
 * Warship five admiral windows. The cabin tier changes physical tracery,
 * not only colour. Exactly two opaque merged meshes; no real lights, textures,
 * physics, currency, equipment or battle-state modifications.
 */
const PROFILES: Readonly<Record<ShipClass,{
 xs:readonly number[]; y:number; z:number; width:number; height:number;
}>> = {
 scout:{xs:[-.66,.66],y:2.83,z:-4.52,width:.43,height:.45},
 fighter:{xs:[-.77,0,.77],y:2.88,z:-4.53,width:.46,height:.51},
 warship:{xs:[-1.03,-.52,0,.52,1.03],y:3.08,z:-5.13,width:.37,height:.45}
};
const FINISHES: Readonly<Record<PreviewCabinModule,{
 trim:string;glass:string;emissive:string;
}>> = {
 'cabin-wood':{trim:'#ba9362',glass:'#87bdc7',emissive:'#204d62'},
 'cabin-raised':{trim:'#ccad72',glass:'#c7ddd1',emissive:'#587b69'},
 'cabin-palace':{trim:'#efc86d',glass:'#f3d89b',emissive:'#93652a'}
};

export function createPreviewSternWindows(
 shipClass:ShipClass,cabinModule:PreviewCabinModule
):T.Group {
 if(!Object.prototype.hasOwnProperty.call(PROFILES,shipClass))
  throw new Error('Unknown preview ship class for stern windows');
 if(!Object.prototype.hasOwnProperty.call(FINISHES,cabinModule))
  throw new Error('Unknown preview cabin module for stern windows');

 const profile=PROFILES[shipClass],finish=FINISHES[cabinModule];
 const engraved:T.BufferGeometry[]=[],glass:T.BufferGeometry[]=[];
 const add=(bin:T.BufferGeometry[],g:T.BufferGeometry,x:number,y:number,z:number)=>{
  g.translate(x,y,z);bin.push(g);
 };
 const frame=(x:number,y:number,z:number,w:number,h:number,d:number)=>{
  add(engraved,new T.BoxGeometry(w,h,d),x,y,z);
 };
 const pane=(x:number,y:number,z:number,w:number,h:number)=>{
  add(glass,new T.BoxGeometry(w,h,.026),x,y,z);
 };
 const gold=cabinModule==='cabin-palace';
 const raised=cabinModule!=='cabin-wood';
 const archSegments=shipClass==='scout'?8:shipClass==='fighter'?10:12;
 for(const x of profile.xs){
  const y=profile.y,z=profile.z,w=profile.width,h=profile.height;
  // Three-dimensional muntins sit in front of the old base cabin windows.
  // The opaque glazing needs no transparency sorting on mobile.
  pane(x,y,z-.043,w*.72,h*.68);
  frame(x-w*.49,y,z-.088,.042,h*.96,.063);
  frame(x+w*.49,y,z-.088,.042,h*.96,.063);
  frame(x,y-h*.48,z-.088,w*1.08,.048,.068);
  frame(x,y+h*.39,z-.088,w*1.07,.045,.068);
  // The actual raised half-arch makes the gallery readable from the stern,
  // unlike a flat sprite or rectangular colour change.
  add(engraved,new T.TorusGeometry(w*.49,.029,4,archSegments,Math.PI),
      x,y+h*.39,z-.085);
  frame(x,y,z-.096,.026,h*.66,.060);
  if(raised){
   frame(x,y-h*.17,z-.108,w*.88,.026,.055);
   add(engraved,new T.SphereGeometry(.044,6,4),x,y+h*.91,z-.092);
  }
  if(gold){
   frame(x-w*.26,y+h*.62,z-.089,.038,.20,.058);
   frame(x+w*.26,y+h*.62,z-.089,.038,.20,.058);
   add(engraved,new T.ConeGeometry(.052,.12,5),x,y+h*1.1,z-.096);
  }
 }
 // The three ship classes use unique transom rhythms, not a rescaled copy.
 if(shipClass==='fighter'){
  frame(0,profile.y-profile.height*.74,profile.z-.08,2.34,.07,.12);
 }else if(shipClass==='warship'){
  frame(0,profile.y-profile.height*.86,profile.z-.08,2.62,.095,.14);
  frame(0,profile.y+profile.height*1.08,profile.z-.08,2.72,.082,.14);
  if(gold){
   for(const x of [-1.24,0,1.24])
    add(engraved,new T.SphereGeometry(.078,6,4),x,profile.y+.66,profile.z-.092);
  }
 }

 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+cabinModule+'-stern-windows';
 const batches:readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][]=[
  [engraved,'forged-window-tracery',new T.MeshStandardMaterial({
   color:finish.trim,metalness:gold?.74:.54,roughness:gold?.36:.48,flatShading:true
  })],
  [glass,'stern-glass-panes',new T.MeshStandardMaterial({
   color:finish.glass,emissive:finish.emissive,emissiveIntensity:.36,
   metalness:.10,roughness:.27,flatShading:true
  })]
 ];
 for(const [pieces,name,material] of batches){
  const merged=mergeGeometries(pieces,false);
  pieces.forEach(piece=>piece.dispose());
  if(!merged){material.dispose();throw new Error('Cannot merge original stern gallery');}
  merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,material);
  mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,cabinModule,windowCount:profile.xs.length,
  raisedTracery:raised,royalFinials:gold,drawCallObjects:2,
  usesDynamicLights:false,transparency:false
 };
 return group;
}
