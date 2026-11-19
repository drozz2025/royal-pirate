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
 if(previous){previous.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.dispose();}});root.remove(previous);}
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
 }else if(config.shipClass==='warship'){
  for(const side of [-1,1]){
   cube(warm,side*1.5,2.1,-1,.32,.9,5.5);
   for(const z of [-2.6,-.2,2.2])cube(brass,side*1.72,2.0,z,.07,.32,.46);
  }
  cube(warm,0,3.75,-3.25,2.6,.72,2.05);cube(brass,0,4.15,-3.25,2.75,.15,2.2);
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
 const head=config.modules.figurehead;
 if(head!=='figurehead-anchor'){
  const crest=part(new T.ConeGeometry(head==='figurehead-crown'?.51:.36,.78,7),brass,0,4.5,5.9);
  crest.rotation.z=Math.PI;
  if(head==='figurehead-crown')for(const x of [-.3,0,.3])tube(brass,x,4.88,5.9,.065,.25);
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
 rig.traverse(child=>{
  if(!(child instanceof T.Mesh) || !(child.geometry instanceof T.PlaneGeometry))return;
  const isSail=child.geometry.parameters.width>2;
  const owned=child.userData.shipyardPreviewMaterial as T.Material|undefined;
  if(owned)owned.dispose();
  const material=paint(isSail?sailColor:flagColor);material.side=T.DoubleSide;
  child.material=material;child.userData.shipyardPreviewMaterial=material;
 });
 additions.userData={shipClass:config.shipClass,level:config.level,tier:progressionTier(config.level),modules:config.modules,previewOnly:true};
 return additions;
}
