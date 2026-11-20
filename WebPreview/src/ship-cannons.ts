import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';

/** Visual-only 3D cannon refits. The six battle guns, their projectile
 * origins, damage, collision and reload logic are NEVER modified here. */
export type PreviewCannonModule = 'cannons-bronze' | 'cannons-steel' | 'cannons-gold';

const PROFILES: Readonly<Record<ShipClass, {
  breechRadius:number; muzzleRadius:number; length:number; collarRadius:number;
  facets:number; name:string;
}>> = {
  scout:{breechRadius:.323,muzzleRadius:.238,length:1.10,collarRadius:.263,facets:8,name:'swift'},
  fighter:{breechRadius:.353,muzzleRadius:.265,length:1.10,collarRadius:.288,facets:10,name:'frigate'},
  warship:{breechRadius:.385,muzzleRadius:.296,length:1.10,collarRadius:.319,facets:12,name:'flagship'}
};

function combine(pieces:T.BufferGeometry[]):T.BufferGeometry{
  const merged=mergeGeometries(pieces);
  pieces.forEach(piece=>piece.dispose());
  if(!merged)throw new Error('Failed to merge cannon preview geometry');
  merged.computeBoundingSphere();
  return merged;
}

/** Two merged draw calls for all six visible gun refits (one metal casing and
 * one set of hoops). Real purchase/ownership is decided elsewhere by WORK 4.
 * Geometries and materials are exclusively owned by the shipyard accessory
 * group and are released by applyShipModules when the preview is replaced. */
export function createPreviewCannonRefit(
  shipClass:ShipClass,
  cannonModule:PreviewCannonModule
):T.Group{
  if(!Object.prototype.hasOwnProperty.call(PROFILES,shipClass))
    throw new Error('Unknown preview cannon ship class');
  if(!['cannons-bronze','cannons-steel','cannons-gold'].includes(cannonModule))
    throw new Error('Unknown preview cannon module');
  const profile=PROFILES[shipClass];
  const royal=cannonModule==='cannons-gold';
  const steel=cannonModule==='cannons-steel';
  const color=royal?'#bd9650':steel?'#60788a':'#ac7545';
  const metalness=royal?.74:steel?.67:.57;
  const bodies:T.BufferGeometry[]=[];
  const hoops:T.BufferGeometry[]=[];
  const hoopOffsets=royal?[.16,.36,.52]:steel?[.24,.47]:[.44];
  for(const side of [-1,1])for(const z of [-1.8,0,1.8]){
    // Same location as makeShip's existing battle barrels; purely decorative
    // sleeves. The cylinders are open ended so the original bores remain visible.
    const body=new T.CylinderGeometry(profile.muzzleRadius,profile.breechRadius,
      profile.length,profile.facets,1,true);
    body.rotateZ(-side*Math.PI/2);
    body.translate(side*2.06,1.56,z);
    bodies.push(body);
    for(const distance of hoopOffsets){
      const hoop=new T.TorusGeometry(profile.collarRadius+
        (distance<.30?.025:.006),royal?.045:steel?.038:.03,5,profile.facets+2);
      hoop.rotateY(Math.PI/2);
      hoop.translate(side*(2.06+distance),1.56,z);
      hoops.push(hoop);
    }
  }
  const group=new T.Group();
  group.name='shipyard-'+shipClass+'-'+cannonModule+'-refit';
  const barrelMaterial=new T.MeshStandardMaterial({
    color,metalness,roughness:royal?.32:steel?.43:.55,
    flatShading:true,side:T.DoubleSide
  });
  const casing=new T.Mesh(combine(bodies),barrelMaterial);
  casing.name='shipyard-cannon-casings';
  casing.castShadow=true;casing.receiveShadow=true;
  const bandMaterial=new T.MeshStandardMaterial({
    color:royal?'#f2d185':steel?'#a7b2b8':'#d29d61',
    metalness:.78,roughness:.32,flatShading:true
  });
  const collars=new T.Mesh(combine(hoops),bandMaterial);
  collars.name='shipyard-cannon-bands';
  collars.castShadow=true;collars.receiveShadow=true;
  group.add(casing,collars);
  group.userData={previewOnly:true,shipClass,cannonModule,
    barrelCount:6,collarsPerBarrel:hoopOffsets.length,drawCallObjects:2};
  return group;
}
