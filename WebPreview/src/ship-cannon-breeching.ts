import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewCannonModule } from './ship-cannons';

/** Original cannon breeching tackles, one geometrically batched installation
 * for all six broadside guns. The ropes and forged eyelets are sculptural
 * editor-only objects, not new weapons, ammunition or combat interactions.
 *
 * Scout: single utilitarian line / gun
 * Fighter: paired working lines / gun
 * Warship: three ceremonial reinforcing lines / gun
 *
 * The cannon refit tier changes the forging finish, never its ownership.
 */
const CLASS_RIG:Readonly<Record<ShipClass,{lines:number;drop:number;radius:number}>>={
 scout:{lines:1,drop:.10,radius:.030},
 fighter:{lines:2,drop:.19,radius:.031},
 warship:{lines:3,drop:.25,radius:.034}
};
const CANNON_MODULES:readonly PreviewCannonModule[]=[
 'cannons-bronze','cannons-steel','cannons-gold'
];

function merged(parts:T.BufferGeometry[]):T.BufferGeometry {
 const result=mergeGeometries(parts,false);
 for(const part of parts)part.dispose();
 if(!result)throw new Error('Could not batch preview gun tackles');
 result.computeBoundingSphere();
 return result;
}

/** Two draw objects, regardless of class or level. Only call inside the
 * disposable modular-ship-accessories group in the live Three.js editor.
 * Ropes are shaped OUTSIDE the hull so the silhouette reads on mobile.
 */
export function createPreviewGunBreeching(
 shipClass:ShipClass,cannonModule:PreviewCannonModule
):T.Group {
 if(!Object.hasOwn(CLASS_RIG,shipClass))
  throw new Error('Unknown preview class for cannon breeching');
 if(!CANNON_MODULES.includes(cannonModule))
  throw new Error('Unknown preview cannon refit for breeching');
 const profile=CLASS_RIG[shipClass];
 const gold=cannonModule==='cannons-gold';
 const steel=cannonModule==='cannons-steel';
 const lines:T.BufferGeometry[]=[];
 const forge:T.BufferGeometry[]=[];
 let ropeCount=0,eyeletCount=0;
 // Keep exactly six decorative broadside stations, aligned with makeShip().
 for(const side of [-1,1])for(const z of [-1.8,0,1.8]){
  for(let lane=0;lane<profile.lines;lane++){
   const spread=profile.lines===1?0:(lane-(profile.lines-1)/2)*.28;
   const start=new T.Vector3(side*2.49,1.62,z+spread*.45);
   const sag=new T.Vector3(side*2.23,1.41-profile.drop,z+spread*.94);
   const rise=new T.Vector3(side*1.95,1.48,z+spread*1.14);
   const hullEye=new T.Vector3(side*1.78,1.76,z+spread*1.15);
   const curve=new T.CatmullRomCurve3([start,sag,rise,hullEye]);
   lines.push(new T.TubeGeometry(curve,9,profile.radius,5,false));
   ropeCount++;
   // Forged side eye and gun-side collar; combined to one metal mesh.
   const eye=new T.TorusGeometry(.071,gold?.029:.023,5,9);
   eye.rotateY(Math.PI/2);
   eye.translate(hullEye.x,hullEye.y,hullEye.z);
   forge.push(eye);eyeletCount++;
   const boss=new T.CylinderGeometry(.072,.09,.075,8);
   boss.rotateZ(Math.PI/2);
   boss.translate(side*1.75,hullEye.y,hullEye.z);
   forge.push(boss);
   if(gold){
    // Admiral-only engraved ring, not a gameplay upgrade.
    const crest=new T.TorusGeometry(.082,.016,4,9);
    crest.rotateY(Math.PI/2);
    crest.translate(side*2.51,1.63,z+spread*.45);
    forge.push(crest);
   }
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+cannonModule+'-breeching';
 const rope=new T.Mesh(merged(lines),new T.MeshStandardMaterial({
  color:gold?'#ddc49b':steel?'#c9bda2':'#b59a76',
  roughness:.95,metalness:0
 }));
 rope.name='shipyard-gun-breeching-ropes';
 const fittings=new T.Mesh(merged(forge),new T.MeshStandardMaterial({
  color:gold?'#edc36d':steel?'#718898':'#ae8451',
  metalness:gold?.75:.64,roughness:gold?.32:.43,flatShading:true
 }));
 fittings.name='shipyard-gun-breeching-forged-eyes';
 for(const mesh of [rope,fittings]){
  mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,cannonModule,gunCount:6,
  ropesPerGun:profile.lines,ropeCount,eyeletCount,drawCallObjects:2,
  affectsBattle:false,grantsOwnership:false
 };
 return group;
}
