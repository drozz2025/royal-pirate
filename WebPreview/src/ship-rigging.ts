import * as T from 'three';
import type { ShipClass } from './ship-modules';

/** Standing rigging for the 3D Shipyard ONLY.
 * Original low-cost shrouds, ratlines and fore/aft stays. This is an isolated
 * visual accessory: it must not modify sails, rig damage, physics or unlocks.
 * Each entire rope network uses one BufferGeometry and one GPU draw call.
 */
export type PreviewMastModule = 'masts-standard' | 'masts-raider' | 'masts-royal';

export function createPreviewStandingRigging(
 shipClass: ShipClass,
 mastModule: PreviewMastModule
): T.LineSegments {
 const elevations: Record<PreviewMastModule,number> = {
  'masts-standard':0,'masts-raider':1.15,'masts-royal':2.35
 };
 const tier=elevations[mastModule];
 if(tier===undefined)throw new Error('Unknown preview mast module');
 const ladderRungs=shipClass==='scout'?3:shipClass==='fighter'?5:7;
 const hullWidth=shipClass==='scout'?1.17:shipClass==='fighter'?1.43:1.65;
 const positions:number[]=[];
 type Vec=readonly [number,number,number];
 const line=(a:Vec,b:Vec)=>{
  positions.push(...a,...b);
 };
 const lerp=(a:Vec,b:Vec,t:number):Vec=>[
  a[0]+(b[0]-a[0])*t,
  a[1]+(b[1]-a[1])*t,
  a[2]+(b[2]-a[2])*t
 ];
 // Two historical-looking mast stations match the procedural ship's rig.
 // Shrouds fan out to port/starboard; each ladder shares the same buffer.
 for(const [z,baseTop] of [[.9,8.06],[-2.1,6.96]] as const){
  const tip:Vec=[0,baseTop+tier,z];
  for(const side of [-1,1]){
   const left:Vec=[side*hullWidth,2.67,z-.72];
   const right:Vec=[side*hullWidth,2.67,z+.72];
   line(tip,left);
   line(tip,right);
   for(let rung=1;rung<=ladderRungs;rung++){
    const t=.22+(rung/(ladderRungs+1))*.7;
    line(lerp(tip,left,t),lerp(tip,right,t));
   }
  }
 }
 // Fore/aft stays add visible diagonals, with a longer light scout bow stay
 // and two extra stays on the heavier flagship.
 const mainTip:Vec=[0,8.06+tier,.9];
 const aftTip:Vec=[0,6.96+tier,-2.1];
 line(mainTip,[0,3.65,5.93]);
 line(aftTip,[0,3.57,-4.10]);
 line(mainTip,aftTip);
 if(shipClass!=='scout'){
  line(mainTip,[-.85,2.89,4.17]);
  line(mainTip,[.85,2.89,4.17]);
 }
 if(shipClass==='warship'){
  line(aftTip,[-1.20,3.49,-3.92]);
  line(aftTip,[1.20,3.49,-3.92]);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 const material=new T.LineBasicMaterial({color:'#d5bd8d',transparent:false,depthWrite:false});
 const ropes=new T.LineSegments(geometry,material);
 ropes.name='shipyard-'+shipClass+'-standing-rigging';
 ropes.frustumCulled=false;
 ropes.userData={previewOnly:true,shipClass,mastModule,rungsPerSide:ladderRungs,segments:positions.length/6};
 return ropes;
}
