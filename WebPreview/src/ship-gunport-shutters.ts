import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewCannonModule } from './ship-cannons';

/**
 * Original raised gunport shutters for the isolated THREE.js fleet editor.
 * Six port covers remain visibly OPEN above the original battle gun muzzles.
 * Scout: light tapered timber; Fighter: reinforced paired planks;
 * Warship: three-board royal shutters. Bronze/steel/gold refits change only
 * the visible hinge and crest sculpture, never combat stats or inventory.
 *
 * All 6 shutters are GPU-batched into TWO disposable meshes, regardless of
 * class, cannon tier or level. Do not attach these meshes to the battle rig.
 */
const PROFILE: Record<ShipClass, {
 width: number; height: number; boards: number; hinges: number; lip: number
}> = {
 scout: {width:.58,height:.26,boards:1,hinges:1,lip:.07},
 fighter: {width:.72,height:.34,boards:2,hinges:2,lip:.10},
 warship: {width:.82,height:.42,boards:3,hinges:3,lip:.14}
};
const CANNONS: readonly PreviewCannonModule[] = [
 'cannons-bronze','cannons-steel','cannons-gold'
];

export function createPreviewGunportShutters(
 shipClass: ShipClass, cannonModule: PreviewCannonModule
): T.Group {
 const profile=PROFILE[shipClass];
 if(!profile)throw new Error('Unknown ship class for gunport shutters');
 if(!CANNONS.includes(cannonModule))
  throw new Error('Unknown cannon module for gunport shutters');
 const steel=cannonModule!=='cannons-bronze';
 const royal=cannonModule==='cannons-gold';
 const timber:T.BufferGeometry[]=[];
 const fittings:T.BufferGeometry[]=[];
 function box(
  bin:T.BufferGeometry[],x:number,y:number,z:number,
  w:number,h:number,d:number,roll=0
 ):void{
  const geo=new T.BoxGeometry(w,h,d);
  geo.rotateZ(roll);geo.translate(x,y,z);
  bin.push(geo);
 }
 function boss(bin:T.BufferGeometry[],x:number,y:number,z:number,r:number):void{
  const geo=new T.SphereGeometry(r,6,4);
  geo.translate(x,y,z);bin.push(geo);
 }
 const stations=[-1.8,0,1.8] as const;
 for(const side of [-1,1]){
  for(const station of stations){
   // The base broadside has guns centred at y=1.56, so these shutters sit
   // raised ABOVE them. The shutter's z span never covers a neighbour.
   const x=side*1.81,y=2.23;
   const zStart=station-profile.width/2;
   const plankWidth=profile.width/profile.boards;
   for(let board=0;board<profile.boards;board++){
    const z=zStart+(board+.5)*plankWidth;
    const tapered=shipClass==='scout'?.02*Math.abs(z-station):0;
    box(timber,x+side*.035,y-tapered,z,.13,
      profile.height-tapered,plankWidth-.015,-side*.18);
    if(board>0)box(fittings,x+side*.107,y,zStart+board*plankWidth,
      .029,profile.height*.88,.025,-side*.18);
   }
   // Raised timber eave and forged hinges reveal a working cover, even at
   // phone-scale oblique camera angles. Metal straddles the hinge axis.
   box(timber,x,y+profile.height*.57,station,.19,.075,
       profile.width+profile.lip);
   for(let i=0;i<profile.hinges;i++){
    const zz=station+(i-(profile.hinges-1)/2)*profile.width/
      Math.max(profile.hinges,2);
    box(fittings,x+side*.13,y+profile.height*.49,zz,
        .09,.12,.105);
    boss(fittings,x+side*.185,y+profile.height*.48,zz,.041);
   }
   if(shipClass==='fighter'){
    // A heavy frigate shoulder and captive central clamping stud.
    box(timber,x+side*.08,y-profile.height*.49,station,
        .12,.08,profile.width*.94);
    boss(fittings,x+side*.14,y,station,.055);
   }
   if(shipClass==='warship'){
    // Broad royal transom lip, triple plank ribs, decorative finials.
    for(const zz of [station-profile.width*.42,station+profile.width*.42]){
     box(timber,x+side*.075,y,zz,.07,profile.height*.9,.057);
    }
    for(const zz of [station-profile.width*.31,station+profile.width*.31])
     boss(fittings,x+side*.14,y+profile.height*.63,zz,.065);
   }
   if(steel){
    // Additional physical retaining strap, not a colour-only upgrade.
    box(fittings,x+side*.138,y-profile.height*.20,station,
        .054,.087,profile.width*.83);
    for(const zz of [station-profile.width*.30,station+profile.width*.30])
     boss(fittings,x+side*.165,y-profile.height*.19,zz,.033);
   }
   if(royal){
    // Original three-point insignia visible on gold-tier gunnery refits.
    box(fittings,x+side*.15,y+profile.height*.04,station,
        .043,.105,profile.width*.32);
    for(const zz of [station-profile.width*.15,station,station+profile.width*.15]){
     const crestHeight=zz===station?.125:.075;
     box(fittings,x+side*.175,y+crestHeight,zz,.05,.09,.048);
    }
   }
  }
 }
 const group=new T.Group();
 group.name=`shipyard-${shipClass}-${cannonModule}-gunport-shutters`;
 const batches: readonly [T.BufferGeometry[],string,string,number][]=[
  [timber,'raised-wooden-gunport-shutters',
   shipClass==='scout'?'#98623b':shipClass==='fighter'?'#81503a':'#68402c',.06],
  [fittings,'forged-shutter-hinges-and-insignia',
   royal?'#f1c46e':steel?'#9ea9b2':'#b78b56',royal?.76:.63]
 ];
 for(const [parts,name,color,metalness] of batches){
  const merged=mergeGeometries(parts,false);
  for(const part of parts)part.dispose();
  if(!merged)throw new Error('Failed to batch original gunport shutters');
  merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,new T.MeshStandardMaterial({
   color,metalness,roughness:royal?.32:.55,flatShading:true
  }));
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
 group.userData={
  previewOnly:true,shipClass,cannonModule,
  shutters:stations.length*2,boardsPerShutter:profile.boards,
  hingesPerShutter:profile.hinges,drawCallObjects:group.children.length
 };
 return group;
}
