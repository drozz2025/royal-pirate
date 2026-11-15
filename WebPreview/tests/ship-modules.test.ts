import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { SHIP_MODULES, SLOTS, availableModules, resolveLoadout, progressionTier, applyShipModules, mayEquip, SHIP_CLASSES } from '../src/ship-modules.ts';
import { makeShip } from '../src/ships.ts';

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
