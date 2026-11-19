import * as T from 'three';

/** Original modular ship system. All 20 levels are supported by progression gates,
 * not 20 duplicated meshes. Neither currency nor ownership is fabricated here. */
export type ModuleSlot = 'hull'|'sails'|'cannons'|'armor'|'figurehead'|'flag'|'masts'|'cabin'|'ornaments';
export type ShipClass = 'scout'|'fighter'|'warship';
export type ShipModule = { id:string; slot:ModuleSlot; minLevel:number; name:string; description:string };
export type ShipLoadout = { shipClass:ShipClass; level:number; modules:Partial<Record<ModuleSlot,string>> };
/** Once resolved, every one of the nine slots has a concrete module ID. */
export type ResolvedShipLoadout = Omit<ShipLoadout,'modules'> & { modules:Record<ModuleSlot,string> };
export const SHIP_MODULES:readonly ShipModule[] = [
  {id:'hull-oak',slot:'hull',minLevel:1,name:'Oak hull',description:'Light planked hull'},
  {id:'hull-ironwood',slot:'hull',minLevel:6,name:'Ironwood hull',description:'Reinforced timbers'},
  {id:'hull-royal',slot:'hull',minLevel:15,name:'Royal hull',description:'Ceremonial brass fittings'},
  {id:'sails-cream',slot:'sails',minLevel:1,name:'Canvas sails',description:'Classic canvas'},
  {id:'sails-crimson',slot:'sails',minLevel:5,name:'Crimson sails',description:'Red dyed canvas'},
  {id:'sails-night',slot:'sails',minLevel:12,name:'Night sails',description:'Dark corsair canvas'},
  {id:'cannons-bronze',slot:'cannons',minLevel:1,name:'Bronze battery',description:'Standard broadside'},
  {id:'cannons-steel',slot:'cannons',minLevel:8,name:'Steel battery',description:'Reinforced gun barrels'},
  {id:'cannons-gold',slot:'cannons',minLevel:17,name:'Admiral battery',description:'Ornate golden guns'},
  {id:'armor-none',slot:'armor',minLevel:1,name:'Unarmored',description:'Exposed timber'},
  {id:'armor-iron',slot:'armor',minLevel:7,name:'Iron strakes',description:'Protective iron bands'},
  {id:'armor-royal',slot:'armor',minLevel:16,name:'Royal plating',description:'Gold-rimmed navy plating'},
  {id:'figurehead-anchor',slot:'figurehead',minLevel:1,name:'Anchor',description:'Simple carved emblem'},
  {id:'figurehead-lion',slot:'figurehead',minLevel:10,name:'Lion',description:'Gilded lion-inspired crest'},
  {id:'figurehead-crown',slot:'figurehead',minLevel:20,name:'Crown',description:'Crowned bow emblem'},
  {id:'flag-navy',slot:'flag',minLevel:1,name:'Royal navy',description:'Blue pirate banner'},
  {id:'flag-red',slot:'flag',minLevel:4,name:'Crimson',description:'Red pirate banner'},
  {id:'flag-black',slot:'flag',minLevel:11,name:'Black corsair',description:'Black pirate banner'},
  {id:'masts-standard',slot:'masts',minLevel:1,name:'Standard rig',description:'Two-mast sailing plan'},
  {id:'masts-raider',slot:'masts',minLevel:6,name:'Raider rig',description:'Fast lookout topmasts'},
  {id:'masts-royal',slot:'masts',minLevel:15,name:'Royal rig',description:'Three-tier flagship masts'},
  {id:'cabin-wood',slot:'cabin',minLevel:1,name:'Captain cabin',description:'Classic wooden aft cabin'},
  {id:'cabin-raised',slot:'cabin',minLevel:9,name:'Raised quarterdeck',description:'Elevated captain quarters'},
  {id:'cabin-palace',slot:'cabin',minLevel:18,name:'Admiral palace',description:'Gilded two-deck stern'},
  {id:'ornaments-simple',slot:'ornaments',minLevel:1,name:'Standard trim',description:'Classic carved rail'},
  {id:'ornaments-lanterns',slot:'ornaments',minLevel:8,name:'Harbour lights',description:'Warm lantern gallery'},
  {id:'ornaments-legendary',slot:'ornaments',minLevel:19,name:'Legendary crest',description:'Royal golden flourishes'}
];
export const SLOTS: readonly ModuleSlot[]=['hull','sails','cannons','armor','figurehead','flag','masts','cabin','ornaments'];
export const DEFAULT_MODULES:Readonly<Record<ModuleSlot,string>>={
 hull:'hull-oak',sails:'sails-cream',cannons:'cannons-bronze',
 armor:'armor-none',figurehead:'figurehead-anchor',flag:'flag-navy',
 masts:'masts-standard',cabin:'cabin-wood',ornaments:'ornaments-simple'
};
export function progressionTier(level:number):'deckhand'|'captain'|'admiral'|'legend'{
 if(!Number.isInteger(level)||level<1||level>20)throw new RangeError('Ship level must be 1–20');
 return level<=5?'deckhand':level<=10?'captain':level<=15?'admiral':'legend';
}
export function availableModules(level:number,slot?:ModuleSlot):ShipModule[]{
 progressionTier(level);
 return SHIP_MODULES.filter(m=>m.minLevel<=level&&(!slot||m.slot===slot));
}
export function resolveLoadout(input:ShipLoadout):ResolvedShipLoadout{
 progressionTier(input.level);
 if(!['scout','fighter','warship'].includes(input.shipClass))throw new Error('Unknown ship class');
 const modules={...DEFAULT_MODULES};
 for(const [slot,id] of Object.entries(input.modules)){
  if(!SLOTS.includes(slot as ModuleSlot))throw new Error('Unknown module slot');
  const found=SHIP_MODULES.find(m=>m.id===id&&m.slot===slot);
  if(!found)throw new Error('Unknown module');
  if(found.minLevel>input.level)throw new Error('Module not unlocked at this level');
  modules[slot as ModuleSlot]=id!;
 }
 return {shipClass:input.shipClass,level:input.level,modules};
}
/** Work 4 handoff: preview unlocks never confer ownership. An omitted entitlement
 * set means "unverified", NOT that a free item was granted. */
export type EquipAccess = 'unknown-module'|'level-locked'|'ownership-unverified'|'not-owned'|'equippable';
export function equipAccess(id:string,level:number,ownedIds?:ReadonlySet<string>):EquipAccess{
 progressionTier(level);
 const mod=SHIP_MODULES.find(m=>m.id===id);
 if(!mod)return 'unknown-module';
 if(mod.minLevel>level)return 'level-locked';
 if(!ownedIds)return 'ownership-unverified';
 return ownedIds.has(mod.id)?'equippable':'not-owned';
}
export function mayEquip(id:string,level:number,ownedIds:ReadonlySet<string>):boolean{
 return equipAccess(id,level,ownedIds)==='equippable';
}
/** Only accepts a complete, level-eligible loadout with every part truly owned.
 * This is an in-app guard, not a substitute for server-side transaction checks.
 * WORK 4 supplies authenticated ownedIds when real persistence exists. */
export function validateOwnedLoadout(input:ShipLoadout,ownedIds:ReadonlySet<string>):ResolvedShipLoadout{
 const resolved=resolveLoadout(input);
 for(const slot of SLOTS){
  const id=resolved.modules[slot];
  if(equipAccess(id,resolved.level,ownedIds)!=='equippable'){
   throw new Error('Cannot equip '+id+': missing verified ownership for '+slot);
  }
 }
 return resolved;
}
/** A sandbox level slider is not a player's actual progression. Work 4 must
 * inject a separately verified level along with verified module entitlements.
 * Reject preview levels that do not exactly match it, even when every proposed
 * module is owned. Work 4 must ALSO revalidate this on its trusted backend
 * when actual equipping/persistence is implemented; UI data alone is not proof.
 */
export function validateOwnedLoadoutForPlayer(
 input:ShipLoadout,
 ownedIds:ReadonlySet<string>,
 verifiedPlayerLevel:number
):ResolvedShipLoadout{
 progressionTier(verifiedPlayerLevel);
 if(input.level!==verifiedPlayerLevel){
  throw new Error('Preview ship level does not match verified player level');
 }
 return validateOwnedLoadout(input,ownedIds);
}

/** Work 4: fleet hull ownership is a separate entitlement from owning individual
 * modules. No class is granted by a demo slider, a level unlock or default parts.
 * Verify the hull and the nine modules again in a trusted service before save. */
export function validateOwnedFleetForPlayer(
 input:ShipLoadout,
 ownedIds:ReadonlySet<string>,
 verifiedPlayerLevel:number,
 ownedShipClasses:ReadonlySet<ShipClass>
):ResolvedShipLoadout{
 const resolved=validateOwnedLoadoutForPlayer(input,ownedIds,verifiedPlayerLevel);
 if(!ownedShipClasses.has(resolved.shipClass)){
  throw new Error('Cannot equip ship class: missing verified fleet ownership');
 }
 return resolved;
}

export const SHIP_CLASSES={
 scout:{name:'Swift Scout',description:'Lean corsair silhouette',width:.82,length:.92,height:.95},
 fighter:{name:'Sea Fighter',description:'Balanced broadside frigate',width:1,length:1,height:1},
 warship:{name:'Royal Warship',description:'Grand heavy flagship',width:1.16,length:1.13,height:1.07}
} as const;

/** Builds real original 3D accessories in the harbour sandbox; combat
 * weapons, damage and game attributes are intentionally unchanged. */
export function applyShipModules(root:T.Group,rig:T.Group,loadout:ShipLoadout):T.Group{
 const config=resolveLoadout(loadout);
 const previous=root.getObjectByName('modular-ship-accessories');
 if(previous){
  // Multiple ship parts share brass/wood/iron materials. Dispose every GPU
  // resource exactly once when changing class or level, never once per mesh.
  // These assets belong exclusively to the modular accessory group; the base
  // ship and the sails/flags remain owned by the scene.
  const geometries=new Set<T.BufferGeometry>();
  const materials=new Set<T.Material>();
  previous.traverse(o=>{
   if(!(o instanceof T.Mesh))return;
   geometries.add(o.geometry);
   for(const material of Array.isArray(o.material)?o.material:[o.material])materials.add(material);
  });
  root.remove(previous);
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials)material.dispose();
 }
 const cls=SHIP_CLASSES[config.shipClass];
 root.scale.set(cls.width,cls.height,cls.length);
 const additions=new T.Group();additions.name='modular-ship-accessories';root.add(additions);
 const paint=(hex:string,metalness=.25)=>new T.MeshStandardMaterial({color:hex,metalness,roughness:.48});
 const brass=paint('#eabb56',.72),iron=paint('#566775',.68),warm=paint('#a16b39'),dark=paint('#33283a');
 function part(geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){
  const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;additions.add(mesh);return mesh;
 }
 function cube(material:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){return part(new T.BoxGeometry(w,h,d),material,x,y,z);}
 function tube(material:T.Material,x:number,y:number,z:number,r:number,h:number){return part(new T.CylinderGeometry(r,r,h,8),material,x,y,z);}
 if(config.shipClass==='scout'){
  const prow=part(new T.ConeGeometry(.62,2.05,6),warm,0,2.35,5.2);prow.rotation.x=Math.PI/2;
  // A distinctive fast-rig prow and slender bronze aft rails; original low-poly details.
  for(const side of [-1,1]){
   cube(brass,side*.95,2.65,-3.25,.14,.8,1.3);
   cube(iron,side*.68,2.1,3.5,.075,.28,2.0);
  }
  // The scout gets a long, tapered forward spar instead of flagship bulk.
  // This is original silhouette geometry; no hitbox or combat logic changes.
  const spar=part(new T.CylinderGeometry(.045,.12,2.45,7),warm,0,3.8,5.9);
  spar.rotation.x=1.22;spar.name='scout-bowsprit';
  for(const side of [-1,1]){
   const brace=part(new T.CylinderGeometry(.025,.035,2.05,6),brass,side*.39,3.25,5.16);
   brace.rotation.x=.68;brace.rotation.z=side*.34;
  }
 }else if(config.shipClass==='fighter'){
  // Frigate silhouette: raised gunwale shoulders and a broad aft fighting platform.
  // Small separate details keep editing independent from the battle hitboxes.
  for(const side of [-1,1]){
   cube(warm,side*1.48,2.3,1.55,.25,.42,2.65);
   cube(brass,side*1.58,2.54,1.55,.14,.09,2.85);
   for(const z of [.6,1.85,2.8])cube(iron,side*1.62,2.17,z,.065,.22,.30);
  }
  cube(warm,0,3.53,-3.45,2.45,.30,1.85);
  cube(brass,0,3.76,-3.45,2.65,.12,2.05);
  // A frigate's paired framed gunports distinguish it from a scaled scout.
  for(const side of [-1,1])for(const z of [-1.7,.15,1.95]){
   const port=part(new T.TorusGeometry(.23,.048,5,9),brass,side*1.73,1.62,z);
   port.rotation.y=Math.PI/2;port.name='fighter-gunport-frame';
  }
 }else if(config.shipClass==='warship'){
  for(const side of [-1,1]){
   cube(warm,side*1.5,2.1,-1,.32,.9,5.5);
   for(const z of [-2.6,-.2,2.2])cube(brass,side*1.72,2.0,z,.07,.32,.46);
  }
  cube(warm,0,3.75,-3.25,2.6,.72,2.05);cube(brass,0,4.15,-3.25,2.75,.15,2.2);
  // Flagship-only gunport rims accent the extra-long broadside silhouette.
  // Keep the decoration inside the preview accessory group (never collision).
  for(const side of [-1,1])for(const z of [-2.7,-1.1,.5,2.2]){
   const rim=part(new T.TorusGeometry(.16,.042,4,9),brass,side*1.8,2.08,z);
   rim.rotation.y=Math.PI/2;
  }
  // A separate stern gallery with lit windows is unique to the flagship.
  // Low-poly box elements keep its outline readable on narrow phone screens.
  const glass=paint('#89c2ce',.08);glass.emissive.set('#346978');glass.emissiveIntensity=.38;
  cube(warm,0,3.0,-4.82,2.7,.74,.28);
  cube(brass,0,3.46,-4.83,2.93,.11,.37);
  for(const x of [-.83,0,.83]){
   const window=cube(glass,x,3.08,-4.99,.50,.39,.08);
   window.name='warship-stern-window';
   cube(brass,x,3.32,-5.00,.57,.055,.11);
  }
 }
 const hull=config.modules.hull,armor=config.modules.armor;
 if(hull!=='hull-oak')for(const side of [-1,1])for(const z of [-2.6,-1,1,2.6])
  cube(hull==='hull-royal'?brass:warm,side*1.55,1.04,z,.2,1.25,.18);
 if(armor!=='armor-none')for(const side of [-1,1])for(const y of [.66,1.37]){
  cube(armor==='armor-royal'?brass:iron,side*1.58,y,0,.13,.14,7.1);
  for(const z of [-2.6,-1.2,.4,1.9])tube(brass,side*1.68,y,z,.065,.12);
 }
 if(config.modules.cannons!=='cannons-bronze')for(const side of [-1,1])for(const z of [-1.8,0,1.8]){
  const ring=part(new T.TorusGeometry(.24,.07,6,12),config.modules.cannons==='cannons-gold'?brass:iron,side*2.6,1.56,z);
  ring.rotation.y=Math.PI/2;
 }
 // The lion and crown must be genuinely different sculptures, not recoloured cones.
 // All parts are small, original low-poly geometry, built only for the isolated editor.
 const head=config.modules.figurehead;
 if(head==='figurehead-lion'){
  const mane=part(new T.IcosahedronGeometry(.43,0),brass,0,4.49,6.12);
  mane.scale.set(1,.97,.55);
  const face=part(new T.SphereGeometry(.31,8,6),warm,0,4.45,6.39);
  face.scale.set(.86,1,.52);
  const muzzle=part(new T.SphereGeometry(.16,8,5),brass,0,4.33,6.59);
  muzzle.scale.set(1,.64,.48);
  for(const side of [-1,1]){
   const ear=part(new T.ConeGeometry(.13,.3,5),brass,side*.28,4.76,6.32);
   ear.rotation.z=-side*.28;
   part(new T.SphereGeometry(.047,6,4),dark,side*.13,4.49,6.565);
   const whisker=part(new T.CylinderGeometry(.018,.018,.26,5),brass,side*.23,4.28,6.60);
   whisker.rotation.z=side*.9;
  }
  part(new T.SphereGeometry(.07,6,4),dark,0,4.32,6.67);
 }else if(head==='figurehead-crown'){
  // Distinctive heraldic crown: raised base, pointed teeth and inset ruby studs.
  const ruby=paint('#b83037',.18);
  tube(brass,0,4.42,6.2,.40,.23);
  for(const x of [-.28,0,.28]){
   const spike=part(new T.ConeGeometry(.14,x===0?.48:.38,6),brass,x,x===0?4.86:4.81,6.2);
   spike.rotation.y=Math.PI/6;
   part(new T.SphereGeometry(.075,6,5),ruby,x,4.52,6.53);
  }
  cube(brass,0,4.34,6.21,.78,.09,.34);
 }
 if(config.modules.masts!=='masts-standard'){
  const royal=config.modules.masts==='masts-royal';
  for(const z of [-2.1,.9]){
   tube(warm,0,9.4,z,royal?.11:.085,royal?2.6:1.4);
   const yard=tube(dark,0,royal?10.35:9.6,z,.07,royal?2.5:1.8);yard.rotation.z=Math.PI/2;
  }
 }
 if(config.modules.cabin!=='cabin-wood'){
  const palace=config.modules.cabin==='cabin-palace';
  cube(warm,0,3.62,-3.55,2.45,palace?1.25:.7,1.65);cube(brass,0,palace?4.32:4.02,-3.55,2.65,.13,1.8);
  if(palace)for(const x of [-.75,0,.75])cube(brass,x,3.72,-4.42,.4,.28,.12);
 }
 if(config.modules.ornaments!=='ornaments-simple'){
  const glow=paint('#ffe2a0');glow.emissive.set('#ffb444');glow.emissiveIntensity=1.3;
  for(const x of [-1.06,1.06])for(const z of [-4,-2]){cube(iron,x,3.07,z,.2,.42,.2);cube(glow,x,3.07,z,.14,.23,.14);}
  if(config.modules.ornaments==='ornaments-legendary')for(const x of [-1.05,1.05])for(const z of [-3.65,-2.8])
   part(new T.SphereGeometry(.19,8,6),brass,x,3.45,z);
 }
 const sailColor=config.modules.sails==='sails-night'?'#1a2635':config.modules.sails==='sails-crimson'?'#b13f40':'#eadab7';
 const flagColor=config.modules.flag==='flag-black'?'#141b24':config.modules.flag==='flag-red'?'#a63336':'#245774';
 // Scout-only original fore-and-aft jib. Its curved center is a third
 // vertex ridge, producing a recognisable light raider silhouette instead
 // of just recolouring or rescaling the frigate sails. Visual sandbox only.
 if(config.shipClass==='scout'){
  const jibGeometry=new T.BufferGeometry();
  jibGeometry.setAttribute('position',new T.Float32BufferAttribute([
   0,6.6,3.75, -.30,4.8,5.15, 0,4.1,6.25, 0,4.05,3.8
  ],3));
  jibGeometry.setIndex([0,1,3,1,2,3]);
  jibGeometry.computeVertexNormals();
  const jibCloth=paint(sailColor,0);
  jibCloth.roughness=.9;
  jibCloth.side=T.DoubleSide;
  const jib=part(jibGeometry,jibCloth,0,0,0);
  jib.name='scout-fore-and-aft-jib';
 }
 // Previewing 20 levels can change sail colours many times. All sails share
 // one temporary material, as do all flags: fewer GPU material allocations.
 // Retired CanvasTextures from makeShip are released on first conversion, and
 // old temporary materials are disposed once (not once per linked sail).
 const retired=new Set<T.Material>();
 let previewSail:T.MeshStandardMaterial|undefined;
 let previewFlag:T.MeshStandardMaterial|undefined;
 rig.traverse(child=>{
  if(!(child instanceof T.Mesh) || !(child.geometry instanceof T.PlaneGeometry))return;
  const isSail=child.geometry.parameters.width>2;
  let material=isSail?previewSail:previewFlag;
  if(!material){
   material=paint(isSail?sailColor:flagColor);
   material.side=T.DoubleSide;
   if(isSail)previewSail=material;else previewFlag=material;
  }
  const old=child.material;
  if(old!==material){
   for(const previousMaterial of Array.isArray(old)?old:[old])retired.add(previousMaterial);
  }
  child.material=material;
  child.userData.shipyardPreviewMaterial=material;
 });
 for(const old of retired){
  // Original rig textures are unique to its sails/flags, not shared with the
  // game scene. Other hull, cannon and ocean materials are untouched.
  const map=(old as T.MeshStandardMaterial).map;
  if(map)map.dispose();
  old.dispose();
 }
 additions.userData={shipClass:config.shipClass,level:config.level,tier:progressionTier(config.level),modules:config.modules,previewOnly:true};
 return additions;
}
