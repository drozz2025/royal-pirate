import * as T from 'three';

/** Original modular ship system. All 20 levels are supported by progression gates,
 * not 20 duplicated meshes. Neither currency nor ownership is fabricated here. */
export type ModuleSlot = 'hull'|'sails'|'cannons'|'armor'|'figurehead'|'flag';
export type ShipClass = 'scout'|'fighter'|'warship';
export type ShipModule = { id:string; slot:ModuleSlot; minLevel:number; name:string; description:string };
export type ShipLoadout = { shipClass:ShipClass; level:number; modules:Partial<Record<ModuleSlot,string>> };
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
  {id:'flag-black',slot:'flag',minLevel:11,name:'Black corsair',description:'Black pirate banner'}
];
export const SLOTS: readonly ModuleSlot[]=['hull','sails','cannons','armor','figurehead','flag'];
export const DEFAULT_MODULES:Readonly<Record<ModuleSlot,string>>={
 hull:'hull-oak',sails:'sails-cream',cannons:'cannons-bronze',
 armor:'armor-none',figurehead:'figurehead-anchor',flag:'flag-navy'
};
export function progressionTier(level:number):'deckhand'|'captain'|'admiral'|'legend'{
 if(!Number.isInteger(level)||level<1||level>20)throw new RangeError('Ship level must be 1–20');
 return level<=5?'deckhand':level<=10?'captain':level<=15?'admiral':'legend';
}
export function availableModules(level:number,slot?:ModuleSlot):ShipModule[]{
 progressionTier(level);
 return SHIP_MODULES.filter(m=>m.minLevel<=level&&(!slot||m.slot===slot));
}
export function resolveLoadout(input:ShipLoadout):Required<ShipLoadout>{
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
/** Locally visible preview does not assert paid ownership, currency or persistence.
 * Purchase/ownership enforcement must be implemented by WORK 4's economy backend. */
export function applyShipModules(root:T.Group,rig:T.Group,loadout:ShipLoadout):T.Group{
 const config=resolveLoadout(loadout);
 const additions=new T.Group();additions.name='modular-ship-accessories';
 root.add(additions);
 const paint=(hex:string,metal=.2)=>new T.MeshStandardMaterial({color:hex,metalness:metal,roughness:.45});
 const bronze=paint('#aa7846',.7),steel=paint('#667e8c',.75),royal=paint('#edb84e',.8);
 const material=config.modules.cannons==='cannons-gold'?royal:config.modules.cannons==='cannons-steel'?steel:bronze;
 const armor=config.modules.armor;
 const hull=config.modules.hull;
 const hullMat=paint(hull==='hull-royal'?'#a77432':hull==='hull-ironwood'?'#674331':'#8d5732');
 // Visible and removable modules, independent of core ship combat hitboxes.
 if(armor!=='armor-none')for(const side of [-1,1])for(const y of [.65,1.35]){
  const strip=new T.Mesh(new T.BoxGeometry(.12,.14,6.6),armor==='armor-royal'?royal:steel);
  strip.position.set(side*1.55,y,0);additions.add(strip);
 }
 if(hull!=='hull-oak')for(const side of [-1,1])for(const z of [-2.6,0,2.6]){
  const frame=new T.Mesh(new T.BoxGeometry(.19,1.25,.2),hullMat);
  frame.position.set(side*1.54,1.05,z);additions.add(frame);
 }
 if(config.modules.cannons!=='cannons-bronze')for(const side of [-1,1])for(const z of [-1.8,0,1.8]){
  const ring=new T.Mesh(new T.TorusGeometry(.24,.065,5,10),material);
  ring.rotation.y=Math.PI/2;ring.position.set(side*2.6,1.56,z);additions.add(ring);
 }
 if(config.modules.figurehead!=='figurehead-anchor'){
  const crown=new T.Mesh(new T.ConeGeometry(config.modules.figurehead==='figurehead-crown'?.53:.37,.8,6),royal);
  crown.position.set(0,4.5,5.85);additions.add(crown);
 }
 const cloth=paint(config.modules.sails==='sails-night'?'#182333':config.modules.sails==='sails-crimson'?'#9e2932':'#e8d3a8');
 const flag=paint(config.modules.flag==='flag-black'?'#121820':config.modules.flag==='flag-red'?'#ab3139':'#285074');
 rig.traverse(child=>{
  if(!(child instanceof T.Mesh))return;
  // Avoid modifying the original sail/flag meshes and shared material in place.
  if(child.geometry instanceof T.PlaneGeometry){
   if(child.geometry.parameters.width>2)child.material=cloth.clone();
   else child.material=flag.clone();
   (child.material as T.MeshStandardMaterial).side=T.DoubleSide;
  }
 });
 // Named metadata is for a 3D viewer; ownership and battle stats stay unchanged.
 additions.userData={shipClass:config.shipClass,level:config.level,tier:progressionTier(config.level),modules:config.modules};
 return additions;
}
