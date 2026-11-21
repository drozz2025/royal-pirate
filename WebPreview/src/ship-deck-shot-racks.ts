import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewCannonModule } from './ship-cannons';

/**
 * Original stacked shot racks for the isolated 3D fleet editor.
 * A compact scout rack, paired frigate racks, and three flagship racks give
 * genuinely different working-deck silhouettes. Brass/steel/gold refits are
 * cosmetic only. No ammunition, inventory or combat resource is created.
 *
 * All rack geometry is fused into THREE draw objects, regardless of class.
 */
const STATIONS: Readonly<Record<ShipClass, readonly (readonly [number,number])[]>> = {
 scout: [[.79,-.73]],
 fighter: [[-.82,-.68],[.82,-.68]],
 warship: [[-.82,-.70],[.82,-.70],[.76,2.24]]
};
const TIERS: Readonly<Record<PreviewCannonModule,number>> = {
 'cannons-bronze':0, 'cannons-steel':1, 'cannons-gold':2
};

export function createPreviewDeckShotRacks(
 shipClass:ShipClass,cannonModule:PreviewCannonModule
):T.Group {
 if(!Object.prototype.hasOwnProperty.call(STATIONS,shipClass))
  throw new Error('Unknown preview ship class for shot racks');
 if(!Object.prototype.hasOwnProperty.call(TIERS,cannonModule))
  throw new Error('Unknown preview cannon module for shot racks');

 const tier=TIERS[cannonModule];
 const stations=STATIONS[shipClass];
 const rowCount=shipClass==='scout'?2:shipClass==='fighter'?3:4;
 const deckY=2.58;
 const timber:T.BufferGeometry[]=[],rounds:T.BufferGeometry[]=[],fittings:T.BufferGeometry[]=[];
 function box(bin:T.BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number){
  const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);bin.push(g);
 }
 function round(bin:T.BufferGeometry[],x:number,y:number,z:number,r:number){
  const g=new T.SphereGeometry(r,7,5);g.translate(x,y,z);bin.push(g);
 }
 function rivet(x:number,y:number,z:number){
  const g=new T.CylinderGeometry(.032,.032,.075,6);
  g.rotateZ(Math.PI/2);g.translate(x,y,z);fittings.push(g);
 }
 const shotRadius=shipClass==='warship'?.135:.125;
 const gap=shotRadius*2.02;
 let totalRounds=0;
 for(const [x,z] of stations){
  const length=rowCount*gap+.22;
  // Raised oak cradle; each ball has a physical seating groove/rail.
  for(const dx of [-.19,.19]){
   box(timber,x+dx,deckY,z,.105,.16,length);
   for(const dz of [-length*.46,length*.46]){
    box(timber,x+dx,deckY+.13,z+dz,.16,.31,.12);
    rivet(x+dx,deckY+.23,z+dz);
   }
  }
  box(timber,x,deckY-.06,z,.51,.08,length+.12);
  // Staggered pyramid: scout 3, frigate 6 and flagship 10 iron rounds
  // per rack, individually modelled but drawn in a single merged mesh.
  for(let row=0;row<rowCount;row++){
   const count=rowCount-row;
   for(let ball=0;ball<count;ball++){
    const offset=(ball-(count-1)/2)*gap;
    round(rounds,x,deckY+.16+shotRadius+row*shotRadius*1.60,
     z+offset,shotRadius);
    totalRounds++;
   }
  }
  if(tier>0){
   // Steel guards / ceremonial gilded guards, not additional ammunition.
   for(const dz of [-length*.42,length*.42]){
    box(fittings,x,deckY+.09,z+dz,.52,.075,.045);
   }
  }
  if(tier===2){
   // Admiral's rack receives twin raised decorative corner finials.
   for(const dx of [-.19,.19]){
    round(fittings,x+dx,deckY+.34,z-length*.46,.075);
   }
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+cannonModule+'-deck-shot-racks';
 const batches:readonly [T.BufferGeometry[],string,string,number][]=[
  [timber,'oak-shot-cradles',tier===2?'#bd8750':'#866043',.05],
  [rounds,'forged-shot-display','#303c44',.76],
  [fittings,'rack-metalwork',tier===2?'#e2bd74':tier===1?'#8d9fac':'#847464',.66]
 ];
 for(const [pieces,name,color,metalness] of batches){
  if(pieces.length===0)continue;
  const combined=mergeGeometries(pieces,false);
  pieces.forEach(piece=>piece.dispose());
  if(!combined)throw new Error('Unable to merge original 3D shot racks');
  combined.computeBoundingSphere();
  const mesh=new T.Mesh(combined,new T.MeshStandardMaterial({color,metalness,roughness:.55}));
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true, shipClass, cannonModule,
  rackCount:stations.length, visualRoundCount:totalRounds,
  drawCallObjects:group.children.length
 };
 return group;
}
