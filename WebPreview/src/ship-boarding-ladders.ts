import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewMastModule } from './ship-rigging';

/**
 * Original suspended boarding ladders, separate from the mast ratlines.
 * Three fleet classes × three rig tiers = nine actual 3D configurations.
 * Preview art only: no ship acquisition, owned equipment, combat or collision.
 *
 * The timber rungs and rope suspension are merged into just two draw objects
 * regardless of the number of boarding stations, to protect mobile GPUs.
 */
export function createPreviewBoardingLadders(
 shipClass: ShipClass, mastModule: PreviewMastModule
): T.Group {
 const stations: Record<ShipClass, readonly number[]> = {
  scout: [0],
  fighter: [-1.55, 1.55],
  warship: [-2.20, 0, 2.10]
 };
 const rigTiers: Record<PreviewMastModule, number> = {
  'masts-standard': 0,
  'masts-raider': 1,
  'masts-royal': 2
 };
 if (!Object.hasOwn(stations, shipClass)) throw new Error('Unknown ship class for boarding ladders');
 if (!Object.hasOwn(rigTiers, mastModule)) throw new Error('Unknown mast module for boarding ladders');
 const tier = rigTiers[mastModule], ladderStops = stations[shipClass];
 const count = (shipClass === 'scout' ? 4 : shipClass === 'fighter' ? 5 : 6) + tier;
 const boards: T.BufferGeometry[] = [], ropes: T.BufferGeometry[] = [];
 const V = (x:number,y:number,z:number) => new T.Vector3(x,y,z);

 function timber(x:number,y:number,z:number,w:number,h:number,d:number) {
  const geometry = new T.BoxGeometry(w,h,d);
  geometry.translate(x,y,z);
  boards.push(geometry);
 }
 function cord(a:T.Vector3,b:T.Vector3,radius:number) {
  const delta = b.clone().sub(a);
  if(delta.lengthSq() < .00001) throw new Error('Zero-length boarding ladder line');
  const orientation = new T.Quaternion().setFromUnitVectors(V(0,1,0),delta.clone().normalize());
  const geometry = new T.CylinderGeometry(radius,radius,delta.length(),5,1);
  geometry.applyMatrix4(new T.Matrix4().compose(
   a.clone().add(b).multiplyScalar(.5),orientation,V(1,1,1)
  ));
  ropes.push(geometry);
 }
 // Side silhouette bends gradually away from the gunwale, never intersecting
 // the existing playable six-gun battery or changing the hull mesh.
 function xAt(side:number,t:number):number {
  return side*(1.68 + t*.34 + .018*Math.sin(t*Math.PI));
 }
 const top=2.75, bottom=.63, boardWidth=tier===2?.66:.58;
 for(const z of ladderStops)for(const side of [-1,1]){
  for(const edge of [-1,1]){
   // The two load-bearing hawsers slope outward; five short pieces produce
   // a readable catenary without skeletal animation or texture uploads.
   for(let segment=0;segment<5;segment++){
    const a=segment/5,b=(segment+1)/5;
    cord(V(xAt(side,a),top+(bottom-top)*a,z+edge*boardWidth*.5),
         V(xAt(side,b),top+(bottom-top)*b,z+edge*boardWidth*.5),tier===2?.028:.022);
   }
   // One short stay ties each rope to its proper shipboard fixing.
   cord(V(side*1.48,2.86,z+edge*boardWidth*.5),
        V(xAt(side,0),top,z+edge*boardWidth*.5),.028);
  }
  for(let step=1;step<=count;step++){
   const t=step/(count+1);
   timber(xAt(side,t),top+(bottom-top)*t,z,
    tier===2?.19:.15,.083,boardWidth+.08);
  }
  // A tangible top boarding saddle connects the ladder to the gunwale.
  timber(side*1.59,2.76,z,.27,.095,boardWidth+.22);
  if(tier>=1){
   // Extra side-stop cleats for the raider/royal rig, still in the timber batch.
   for(const edge of [-1,1])timber(side*1.60,2.88,
    z+edge*boardWidth*.5,.13,.18,.085);
  }
 }
 const group = new T.Group();
 group.name = 'shipyard-'+shipClass+'-'+mastModule+'-boarding-ladders';
 const batches:readonly [T.BufferGeometry[],string,T.MeshStandardMaterial][] = [
  [boards,'carved-boarding-rungs',new T.MeshStandardMaterial({
   color:tier===2?'#dab16d':tier===1?'#a77446':'#8e5b36',
   metalness:tier===2?.25:0,roughness:.74
  })],
  [ropes,'suspended-hemp-lines',new T.MeshStandardMaterial({
   color:tier===2?'#dac39a':'#b5a17d',metalness:0,roughness:1
  })]
 ];
 for(const [parts,name,material] of batches){
  const merged = mergeGeometries(parts,false);
  for(const part of parts)part.dispose();
  if(!merged){material.dispose();throw new Error('Unable to batch original boarding ladders');}
  merged.computeBoundingSphere();
  const mesh = new T.Mesh(merged,material);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData = {
  previewOnly:true, shipClass, mastModule,
  boardingLadderCount:ladderStops.length*2,
  rungCountPerLadder:count,
  drawCallObjects:group.children.length
 };
 return group;
}
