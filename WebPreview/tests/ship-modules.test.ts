import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { SHIP_MODULES, SLOTS, availableModules, resolveLoadout, progressionTier, applyShipModules, mayEquip, equipAccess, validateOwnedLoadout, validateOwnedLoadoutForPlayer, validateOwnedFleetForPlayer, SHIP_CLASSES, highestUnlockedPreviewModules } from '../src/ship-modules.ts';
import { makeShip } from '../src/ships.ts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shipyard } from '../src/shipyard.tsx';

test('all ship levels 1–20 and all three ship classes are supported',()=>{
 for(let level=1;level<=20;level++){
  for(const shipClass of ['scout','fighter','warship'] as const){
   const ship=resolveLoadout({level,shipClass,modules:{}});
   assert.equal(ship.level,level);
   assert.equal(ship.shipClass,shipClass);
   for(const slot of SLOTS) assert.ok(ship.modules[slot]);
  }
 }
 assert.equal(progressionTier(1),'deckhand');
 assert.equal(progressionTier(6),'captain');
 assert.equal(progressionTier(11),'admiral');
 assert.equal(progressionTier(20),'legend');
 assert.throws(()=>progressionTier(21),RangeError);
 assert.throws(()=>progressionTier(0),RangeError);
 assert.throws(()=>progressionTier(2.5),RangeError);
});
test('all modules have unique identifiers and every slot has at least one level-one option',()=>{
 const ids=SHIP_MODULES.map(m=>m.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const slot of SLOTS)assert.ok(availableModules(1,slot).length>0);
 assert.equal(availableModules(20).length,SHIP_MODULES.length);
});
test('level restrictions block early use of legendary pieces',()=>{
 assert.throws(()=>resolveLoadout({level:1,shipClass:'scout',modules:{figurehead:'figurehead-crown'}}),/not unlocked/);
 assert.equal(resolveLoadout({level:20,shipClass:'warship',modules:{figurehead:'figurehead-crown'}}).modules.figurehead,'figurehead-crown');
 assert.throws(()=>resolveLoadout({level:20,shipClass:'scout',modules:{sails:'cannons-gold'}}),/Unknown module/);
});
test('a level-20 custom loadout adds original Three.js geometry without modifying battle stats',()=>{
 const rig=new T.Group(),root=new T.Group();root.add(rig);
 const deco=applyShipModules(root,rig,{level:20,shipClass:'warship',modules:{
  hull:'hull-royal',armor:'armor-royal',cannons:'cannons-gold',figurehead:'figurehead-crown',sails:'sails-night',flag:'flag-black'
 }});
 assert.equal(deco.name,'modular-ship-accessories');
 assert.ok(deco.children.length>=15,'actual 3D modular armor, guns and figurehead');
 assert.equal(deco.userData.level,20);
 assert.equal(deco.userData.tier,'legend');
});
test('modular ships preserve the existing cannon and sail interfaces',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 const ctx=new Proxy({}, {get:()=>()=>{}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:512,height:512,getContext:()=>ctx})}});
 try {
  const ship=makeShip(false,{level:12,shipClass:'fighter',modules:{sails:'sails-night',armor:'armor-iron',cannons:'cannons-steel'}});
  assert.equal(ship.guns.length,6);
  assert.equal(ship.sails.length,2);
  assert.equal(ship.health,100);
  assert.ok(ship.root.getObjectByName('modular-ship-accessories'));
 } finally {
  if(previous)Object.defineProperty(globalThis,'document',previous);
  else Reflect.deleteProperty(globalThis,'document');
 }
});

test('shipyard exposes all nine module slots and visually distinct ship classes',()=>{
 assert.equal(SLOTS.length,9);
 assert.equal(SHIP_MODULES.length,27);
 assert.equal(availableModules(1).length,9);
 const scales=(['scout','fighter','warship'] as const).map(shipClass=>{
  const root=new T.Group(),rig=new T.Group();root.add(rig);
  applyShipModules(root,rig,{shipClass,level:1,modules:{}});
  return {x:root.scale.x,z:root.scale.z,geometry:root.getObjectByName('modular-ship-accessories')!.children.length};
 });
 assert.ok(scales[0].x<scales[1].x);
 assert.ok(scales[1].x<scales[2].x);
 assert.ok(scales[0].z<scales[2].z);
 assert.ok(scales[2].geometry>scales[1].geometry);
 assert.equal(Object.keys(SHIP_CLASSES).length,3);
});
test('switching preview modules replaces geometry rather than stacking old accessories',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{masts:'masts-royal',cabin:'cabin-palace',ornaments:'ornaments-legendary'}});
 const second=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.notEqual(first,second);
 assert.equal(root.getObjectByName('modular-ship-accessories'),second);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
 assert.equal(second.userData.level,1);
});
test('unlock progression alone never implies module ownership or a purchase',()=>{
 const noOwnership=new Set<string>();
 assert.equal(mayEquip('hull-oak',1,noOwnership),false);
 assert.equal(mayEquip('figurehead-crown',20,noOwnership),false);
 const actualEntitlements=new Set(['figurehead-crown']);
 assert.equal(mayEquip('figurehead-crown',19,actualEntitlements),false);
 assert.equal(mayEquip('figurehead-crown',20,actualEntitlements),true);
 assert.equal(mayEquip('not-real',20,actualEntitlements),false);
});

test('the ownership interface never grants unlocked but unowned parts',()=>{
 assert.equal(equipAccess('hull-oak',1),'ownership-unverified');
 assert.equal(equipAccess('hull-oak',1,new Set()),'not-owned');
 assert.equal(equipAccess('figurehead-crown',19,new Set(['figurehead-crown'])),'level-locked');
 assert.equal(equipAccess('figurehead-crown',20,new Set(['figurehead-crown'])),'equippable');
 assert.equal(equipAccess('not-a-module',20,new Set()),'unknown-module');
 assert.equal(equipAccess('hull-oak',20,new Set(['hull-oak'])),'equippable');
 assert.equal(mayEquip('hull-oak',20,new Set()),false);
});
test('equipping a fleet requires all nine real entitlements, including default parts',()=>{
 const allDefault=new Set(Object.values(resolveLoadout({shipClass:'scout',level:1,modules:{}}).modules));
 assert.equal(allDefault.size,9);
 assert.equal(validateOwnedLoadout({shipClass:'scout',level:1,modules:{}},allDefault).modules.hull,'hull-oak');
 assert.throws(()=>validateOwnedLoadout({shipClass:'scout',level:1,modules:{}},new Set(['hull-oak'])),/missing verified ownership/);
 assert.throws(()=>validateOwnedLoadout({shipClass:'fighter',level:1,modules:{sails:'sails-night'}},allDefault),/not unlocked/);
 const noNight=new Set([...allDefault,'sails-crimson']);
 assert.throws(()=>validateOwnedLoadout({shipClass:'fighter',level:12,modules:{sails:'sails-night'}},noNight),/missing verified ownership/);
});
test('frigate has its own gunwale silhouettes, neither scout nor flagship scaling only',()=>{
 const fighterRoot=new T.Group(),fighterRig=new T.Group();fighterRoot.add(fighterRig);
 const fighter=applyShipModules(fighterRoot,fighterRig,{shipClass:'fighter',level:1,modules:{}});
 assert.ok(fighter.children.length>=10,'fighter hull should have distinct original geometry');
 const scoutRoot=new T.Group(),scoutRig=new T.Group();scoutRoot.add(scoutRig);
 const scout=applyShipModules(scoutRoot,scoutRig,{shipClass:'scout',level:1,modules:{}});
 assert.notEqual(scout.children.length,fighter.children.length,'different class geometry');
});

test('mobile shipyard preview stays within a bounded mesh budget across all 20 levels',()=>{
 for(const shipClass of ['scout','fighter','warship'] as const){
  const root=new T.Group(),rig=new T.Group();root.add(rig);
  for(let level=1;level<=20;level++){
   const modules=Object.fromEntries(SLOTS.map(slot=>{
    const options=availableModules(level,slot);
    return [slot,options[options.length-1].id];
   }));
   const accessories=applyShipModules(root,rig,{shipClass,level,modules});
   assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1,
    'switching must not pile up old geometry');
   assert.ok(accessories.children.length<125,
    'single editable preview should have a bounded number of accessory draw-call objects');
   assert.ok(Number.isFinite(root.scale.x)&&Number.isFinite(root.scale.z));
  }
 }
});

test('player-verified level is independent from freely adjustable sandbox level',()=>{
 const defaultOwned=new Set(Object.values(resolveLoadout({shipClass:'fighter',level:1,modules:{}}).modules));
 const level20Preview={shipClass:'fighter' as const,level:20,modules:{}};
 assert.throws(()=>validateOwnedLoadoutForPlayer(level20Preview,defaultOwned,1),/does not match verified player level/);
 assert.throws(()=>validateOwnedLoadoutForPlayer({shipClass:'fighter',level:1,modules:{}},defaultOwned,20),/does not match verified player level/);
 assert.throws(()=>validateOwnedLoadoutForPlayer(level20Preview,defaultOwned,21),RangeError);
 assert.equal(validateOwnedLoadoutForPlayer({shipClass:'fighter',level:1,modules:{}},defaultOwned,1).level,1);
 assert.equal(validateOwnedLoadoutForPlayer(level20Preview,defaultOwned,20).level,20);
 assert.throws(()=>validateOwnedLoadoutForPlayer(level20Preview,new Set(['hull-oak']),20),/missing verified ownership/);
});
test('a real fleet hull is a separate entitlement from owned modules and demo level',()=>{
 const ownedParts=new Set(Object.values(resolveLoadout({shipClass:'fighter',level:1,modules:{}}).modules));
 const fighter={shipClass:'fighter' as const,level:1,modules:{}};
 const warship={shipClass:'warship' as const,level:1,modules:{}};
 const hulls=new Set(['fighter' as const]);
 assert.equal(validateOwnedFleetForPlayer(fighter,ownedParts,1,hulls).shipClass,'fighter');
 assert.throws(()=>validateOwnedFleetForPlayer(warship,ownedParts,1,hulls),/missing verified fleet ownership/);
 assert.throws(()=>validateOwnedFleetForPlayer(fighter,ownedParts,1,new Set()),/missing verified fleet ownership/);
 assert.throws(()=>validateOwnedFleetForPlayer(fighter,ownedParts,2,hulls),/does not match verified player level/);
 assert.throws(()=>validateOwnedFleetForPlayer(fighter,new Set(['hull-oak']),1,hulls),/missing verified ownership/);
});

test('disposing repeated ship modules releases shared materials once per preview',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{armor:'armor-royal',ornaments:'ornaments-legendary'}});
 const meshes=first.children.filter((obj):obj is T.Mesh=>obj instanceof T.Mesh);
 const references=new Map<T.Material,number>();
 for(const mesh of meshes)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])
  references.set(material,(references.get(material)??0)+1);
 const shared=[...references].find(([,refs])=>refs>=3)?.[0];
 assert.ok(shared,'several accessories should intentionally share a material');
 let disposals=0;shared.addEventListener('dispose',()=>disposals++);
 const oldGeo=meshes[0].geometry;
 let geoDisposals=0;oldGeo.addEventListener('dispose',()=>geoDisposals++);
 applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(disposals,1,'shared material should be disposed once instead of once per mesh');
 assert.equal(geoDisposals,1);
 assert.equal(root.children.filter(obj=>obj.name==='modular-ship-accessories').length,1);
});

test('real equip button stays locked when only demo progression matches owned parts',()=>{
 const owned=new Set(Object.values(resolveLoadout({shipClass:'fighter',level:1,modules:{}}).modules));
 const render=(verifiedPlayerLevel?:number,ownedShipClasses?:ReadonlySet<'scout'|'fighter'|'warship'>)=>renderToStaticMarkup(createElement(Shipyard,{
  onClose:()=>{},onPreview:()=>{},onEquip:()=>{},ownedModuleIds:owned,ownedShipClasses,verifiedPlayerLevel
 }));
 const equipTag=(html:string)=>html.match(/<button[^>]*class="shipyard-equip"[^>]*>/)?.[0]??'';
 assert.match(equipTag(render()),/disabled/,'no verified level must prevent equipping');
 assert.match(equipTag(render(20)),/disabled/,'player level 20 cannot be substituted for demo level 1');
 assert.match(equipTag(render(0)),/disabled/,'invalid verified level must prevent equipping');
 assert.match(equipTag(render(1)),/disabled/,'parts alone do not grant any ship class');
 assert.match(equipTag(render(1,new Set(['scout' as const]))),/disabled/,'owning a different hull cannot equip this fighter');
 assert.doesNotMatch(equipTag(render(1,new Set(['fighter' as const]))),/disabled/,'verified level, class and all nine owned parts permit UI action');
 const missing=new Set(['hull-oak']);
 const unownedHtml=renderToStaticMarkup(createElement(Shipyard,{
  onClose:()=>{},onPreview:()=>{},onEquip:()=>{},ownedModuleIds:missing,ownedShipClasses:new Set(['fighter' as const]),verifiedPlayerLevel:1
 }));
 assert.match(equipTag(unownedHtml),/disabled/,'any unowned default part must prevent equipping');
});

test('lion and royal crown are distinct original procedural figurehead sculptures',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const lion=applyShipModules(root,rig,{shipClass:'fighter',level:10,modules:{figurehead:'figurehead-lion'}});
 const lionVertices=lion.children.filter(obj=>obj instanceof T.Mesh && obj.geometry.type==='IcosahedronGeometry').length;
 assert.ok(lionVertices>=1,'lion mane must be a dedicated faceted sculpture');
 const lionCount=lion.children.length;
 const crown=applyShipModules(root,rig,{shipClass:'fighter',level:20,modules:{figurehead:'figurehead-crown'}});
 assert.notEqual(lion,crown);
 assert.equal(root.children.filter(obj=>obj.name==='modular-ship-accessories').length,1);
 assert.notEqual(lionCount,crown.children.length,'crest variations must not share identical shapes');
 assert.ok(crown.children.some(obj=>obj instanceof T.Mesh && obj.geometry.type==='ConeGeometry'),'crown points must have real 3D geometry');
 assert.ok(crown.children.length<125,'mobile draw-call accessory budget');
});

test('scout, frigate and flagship gain genuinely different original silhouette details',()=>{
 const make=(shipClass:'scout'|'fighter'|'warship')=>{
  const root=new T.Group(),rig=new T.Group();root.add(rig);
  return applyShipModules(root,rig,{shipClass,level:20,modules:{}});
 };
 const scout=make('scout'),fighter=make('fighter'),warship=make('warship');
 assert.equal(scout.children.filter(part=>part.name==='scout-bowsprit').length,1);
 const jib=scout.children.find(part=>part.name==='scout-fore-and-aft-jib');
 assert.ok(jib instanceof T.Mesh,'scout must carry an original three-dimensional lateen-style jib');
 assert.equal(jib.geometry.getAttribute('position').count,4);
 assert.equal((jib.material as T.MeshStandardMaterial).side,T.DoubleSide);
 assert.equal(fighter.children.some(part=>part.name==='scout-fore-and-aft-jib'),false);
 assert.equal(warship.children.some(part=>part.name==='scout-fore-and-aft-jib'),false);
 assert.equal(fighter.children.filter(part=>part.name==='fighter-gunport-frame').length,6);
 assert.equal(warship.children.filter(part=>part.name==='warship-stern-window').length,3);
 assert.equal(scout.children.some(part=>part.name==='warship-stern-window'),false);
 for(const group of [scout,fighter,warship])assert.ok(group.children.length<125,'mobile accessories remain bounded');
});

test('repeated recolouring shares two fabric materials and disposes replaced textures only once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const sailMap=new T.Texture(),flagMap=new T.Texture();
 const sailOriginal=new T.MeshStandardMaterial({map:sailMap});
 const flagOriginal=new T.MeshStandardMaterial({map:flagMap});
 for(const width of [4.5,3.5,1.4,1.4]){
  const isSail=width>2;
  rig.add(new T.Mesh(new T.PlaneGeometry(width,2),isSail?sailOriginal:flagOriginal));
 }
 let sailTextureDisposals=0,flagTextureDisposals=0,sailMaterialDisposals=0,flagMaterialDisposals=0;
 sailMap.addEventListener('dispose',()=>sailTextureDisposals++);
 flagMap.addEventListener('dispose',()=>flagTextureDisposals++);
 sailOriginal.addEventListener('dispose',()=>sailMaterialDisposals++);
 flagOriginal.addEventListener('dispose',()=>flagMaterialDisposals++);
 applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(sailTextureDisposals,1);
 assert.equal(flagTextureDisposals,1);
 assert.equal(sailMaterialDisposals,1);
 assert.equal(flagMaterialDisposals,1);
 const mesh=rig.children as T.Mesh[];
 const oldSail=mesh[0].material as T.Material;
 const oldFlag=mesh[2].material as T.Material;
 assert.equal(mesh[0].material,mesh[1].material,'both sails use one temporary GPU material');
 assert.equal(mesh[2].material,mesh[3].material,'both flags use one temporary GPU material');
 assert.notEqual(oldSail,oldFlag);
 let sailDisposals=0,flagDisposals=0;
 oldSail.addEventListener('dispose',()=>sailDisposals++);
 oldFlag.addEventListener('dispose',()=>flagDisposals++);
 applyShipModules(root,rig,{shipClass:'fighter',level:12,modules:{sails:'sails-night',flag:'flag-red'}});
 assert.equal(sailDisposals,1,'shared sail material must be disposed only once');
 assert.equal(flagDisposals,1,'shared flag material must be disposed only once');
 for(let level=1;level<=20;level++){
  applyShipModules(root,rig,{shipClass:'warship',level,modules:{}});
  assert.equal(root.children.filter(child=>child.name==='modular-ship-accessories').length,1);
  assert.equal(mesh[0].material,mesh[1].material);
  assert.equal(mesh[2].material,mesh[3].material);
 }
 assert.equal(sailTextureDisposals,1);
 assert.equal(flagTextureDisposals,1);
});

test('mobile modular previews pool repeating box, cylinder and gunport buffers without leaks',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const loadout={shipClass:'warship' as const,level:20,modules:{
  hull:'hull-royal',armor:'armor-royal',cannons:'cannons-gold',
  masts:'masts-royal',cabin:'cabin-palace',ornaments:'ornaments-legendary'
 }};
 const group=applyShipModules(root,rig,loadout);
 const meshes=group.children.filter((o):o is T.Mesh=>o instanceof T.Mesh);
 const boxes=meshes.filter(o=>o.geometry.type==='BoxGeometry');
 const cylinders=meshes.filter(o=>o.geometry.type==='CylinderGeometry' &&
  (o.geometry as T.CylinderGeometry).parameters.radiusTop===1 &&
  (o.geometry as T.CylinderGeometry).parameters.height===1);
 const rings=meshes.filter(o=>o.geometry.type==='TorusGeometry' && o.name!=='warship-royal-helm');
 assert.ok(meshes.some(o=>o.name==='warship-royal-helm'),'royal helm is a distinct wheel, not a cannon rim');
 assert.ok(boxes.length>25,'complex royal hull contains many independently scaled beams and plates');
 assert.equal(new Set(boxes.map(o=>o.geometry)).size,1,'box meshes share one GPU buffer');
 assert.ok(cylinders.length>=12,'mast and armour rivets require multiple cylinders');
 assert.equal(new Set(cylinders.map(o=>o.geometry)).size,1,'cylinders share one GPU buffer');
 assert.equal(rings.length,14,'eight flagship port rims plus six modular cannon rings');
 assert.equal(new Set(rings.map(o=>o.geometry)).size,2,'each ring size has one shared buffer');
 assert.ok(new Set(meshes.map(o=>o.geometry)).size<20,'accessory geometries stay bounded for mobile');
 const sharedBox=boxes[0].geometry,sharedCylinder=cylinders[0].geometry;
 const oldRing=rings[0].geometry;
 let boxDisposes=0,cylinderDisposes=0,ringDisposes=0;
 sharedBox.addEventListener('dispose',()=>boxDisposes++);
 sharedCylinder.addEventListener('dispose',()=>cylinderDisposes++);
 oldRing.addEventListener('dispose',()=>ringDisposes++);
 const next=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(boxDisposes,1,'reused box geometry is released once');
 assert.equal(cylinderDisposes,1,'reused cylinder geometry is released once');
 assert.equal(ringDisposes,1,'reused torus geometry is released once');
 assert.equal(root.getObjectByName('modular-ship-accessories'),next);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
 assert.equal(next.userData.level,1);
});

test('three classes have original lightweight folded pennants, tinted by the selected flag',()=>{
 const cases=[
  {shipClass:'scout' as const,level:1,flag:'flag-navy',name:'scout-swallow-pennant',color:'245774',vertices:5},
  {shipClass:'fighter' as const,level:4,flag:'flag-red',name:'fighter-forked-pennant',color:'a63336',vertices:5},
  {shipClass:'warship' as const,level:11,flag:'flag-black',name:'warship-royal-pennant',color:'141b24',vertices:7}
 ];
 for(const c of cases){
  const root=new T.Group(),rig=new T.Group();root.add(rig);
  const preview=applyShipModules(root,rig,{shipClass:c.shipClass,level:c.level,modules:{flag:c.flag}});
  const pennants=preview.children.filter(obj=>obj.name.endsWith('-pennant'));
  assert.equal(pennants.length,1,'one class-specific pennant mesh per preview');
  const banner=pennants[0] as T.Mesh;
  assert.equal(banner.name,c.name,'scout, fighter and warship have different flag silhouettes');
  assert.equal(banner.geometry.getAttribute('position').count,c.vertices);
  assert.ok(banner.geometry.index && banner.geometry.index.count>=9,'real triangulated fabric');
  const z=banner.geometry.getAttribute('position');
  assert.ok(new Set(Array.from({length:z.count},(_,i)=>z.getZ(i))).size>1,'cloth is folded in 3D');
  const material=banner.material as T.MeshStandardMaterial;
  assert.equal(material.color.getHexString(),c.color,'module selection controls fabric colour');
  assert.equal(material.side,T.DoubleSide,'both sides visible during orbit');
  assert.equal(banner.userData.moduleId,c.flag);
  const seam=preview.children.find(obj=>obj.name===c.shipClass+'-pennant-clasp');
  assert.ok(seam instanceof T.Mesh,'gold-seamed cloth silhouette is a real 3D mesh');
  assert.equal(seam.geometry.type,'BoxGeometry','gilded seam reuses the pooled box buffer');
  assert.equal(rig.children.some(obj=>obj===banner),false,'accessories stay isolated from battle rig');
  assert.ok(preview.children.length<125,'mobile accessory mesh budget remains bounded');
 }
});

test('changing flag or hull retires only the previous class pennant GPU assets',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:11,modules:{flag:'flag-black'}});
 const original=first.children.find(obj=>obj.name==='warship-royal-pennant') as T.Mesh;
 assert.ok(original);
 let geometryDispose=0,materialDispose=0;
 original.geometry.addEventListener('dispose',()=>geometryDispose++);
 (original.material as T.Material).addEventListener('dispose',()=>materialDispose++);
 const next=applyShipModules(root,rig,{shipClass:'scout',level:4,modules:{flag:'flag-red'}});
 assert.equal(geometryDispose,1);
 assert.equal(materialDispose,1);
 assert.equal(root.children.filter(obj=>obj.name==='modular-ship-accessories').length,1);
 assert.equal(next.children.some(obj=>obj.name==='warship-royal-pennant'),false);
 const newBanner=next.children.find(obj=>obj.name==='scout-swallow-pennant') as T.Mesh;
 assert.equal((newBanner.material as T.MeshStandardMaterial).color.getHexString(),'a63336');
});


test('visual max-level presets resolve at every level but never confer ownership',()=>{
 for(let level=1;level<=20;level++){
  const preset=highestUnlockedPreviewModules(level);
  assert.equal(Object.keys(preset).length,9);
  for(const slot of SLOTS){
   const unlocked=availableModules(level,slot);
   assert.equal(preset[slot],unlocked[unlocked.length-1].id);
  }
  for(const shipClass of ['scout','fighter','warship'] as const){
   const resolved=resolveLoadout({shipClass,level,modules:preset});
   assert.equal(resolved.modules.flag,preset.flag);
   assert.throws(()=>validateOwnedFleetForPlayer(
    {shipClass,level,modules:preset},new Set(),level,new Set([shipClass])),/missing verified ownership/);
  }
 }
 assert.throws(()=>highestUnlockedPreviewModules(0),RangeError);
 assert.throws(()=>highestUnlockedPreviewModules(21),RangeError);
});

test('each ship class has distinct original 3D helm geometry with safe replacement',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const scout=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.ok(scout.getObjectByName('scout-steering-tiller'));
 assert.equal(scout.getObjectByName('fighter-broadside-helm'),undefined);
 const fighter=applyShipModules(root,rig,{shipClass:'fighter',level:1,modules:{}});
 const wheel=fighter.getObjectByName('fighter-broadside-helm') as T.Mesh;
 assert.ok(wheel instanceof T.Mesh);
 assert.ok(wheel.geometry instanceof T.TorusGeometry);
 assert.equal(fighter.getObjectByName('scout-steering-tiller'),undefined);
 let wheelDispose=0;
 wheel.geometry.addEventListener('dispose',()=>wheelDispose++);
 const warship=applyShipModules(root,rig,{shipClass:'warship',level:1,modules:{}});
 const royalWheel=warship.getObjectByName('warship-royal-helm') as T.Mesh;
 assert.ok(royalWheel instanceof T.Mesh);
 assert.ok(royalWheel.geometry instanceof T.TorusGeometry);
 assert.ok(royalWheel.geometry.parameters.radius>wheel.geometry.parameters.radius);
 assert.equal(wheelDispose,1);
 assert.equal(root.children.filter(x=>x.name==='modular-ship-accessories').length,1);
 assert.ok(warship.children.length<125,'3D accessory meshes stay within the existing mobile budget');
});

test('mobile shipyard exposes a visual-only max-unlocked preset without fake ownership',()=>{
 const html=renderToStaticMarkup(createElement(Shipyard,{onClose:()=>{},onPreview:()=>{}}));
 assert.match(html,/MAX LEVEL PREVIEW/);
 assert.match(html,/Preview highest unlocked modules at this demo level, without granting ownership/);
 assert.match(html,/RESET CLASS/);
 assert.match(html,/Each hull keeps its own preview parts/);
 assert.doesNotMatch(html,/EQUIP VERIFIED FLEET/);
});
