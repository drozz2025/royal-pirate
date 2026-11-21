import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { applyShipModules, type ShipClass } from '../src/ship-modules.ts';
import {
 updateShipyardDetailLOD, isShipyardFineDetail,
 FINE_DETAIL_HIDE_DISTANCE, FINE_DETAIL_SHOW_DISTANCE
} from '../src/shipyard-detail-lod.ts';

const CLASSES:ShipClass[]=['scout','fighter','warship'];

test('mobile far orbit culls only real preview fine detail, across every ship class and tier',()=>{
 for(const shipClass of CLASSES)for(const level of [1,8,19,20]){
  const root=new T.Group(), rig=new T.Group(); root.add(rig);
  const extras=applyShipModules(root,rig,{shipClass,level,modules:{}});
  const tiny=extras.children.filter(isShipyardFineDetail);
  const major=extras.children.filter(item=>!isShipyardFineDetail(item));
  assert.equal(tiny.length,5,'bell, compass, chart, deck ropes and hatches');
  assert.ok(major.length>0,'primary ship parts must remain');
  const previousCount=extras.children.length;
  const first=updateShipyardDetailLOD(extras,31,390);
  assert.equal(first,5);
  assert.ok(tiny.every(object=>!object.visible));
  assert.ok(major.every(object=>object.visible),'mast, hull, sails and major decoration not culled');
  assert.equal(extras.children.length,previousCount,'no geometry changes');
  assert.equal(extras.userData.previewOnly,true);
  assert.equal(root.getObjectByName('modular-ship-accessories'),extras);
  // Repeated animation frames do not allocate, remove or flip geometry.
  assert.equal(updateShipyardDetailLOD(extras,31,390),0);
  assert.equal(updateShipyardDetailLOD(extras,28,390),0,'hysteresis at medium zoom');
  assert.equal(updateShipyardDetailLOD(extras,25,390),5);
  assert.ok(tiny.every(object=>object.visible),'fine 3D details restored close up');
 }
});

test('a full-width view always preserves premium geometry and mobile threshold is stable',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const extras=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{
  ornaments:'ornaments-legendary',cabin:'cabin-palace',masts:'masts-royal'
 }});
 assert.equal(FINE_DETAIL_HIDE_DISTANCE-FINE_DETAIL_SHOW_DISTANCE,4);
 assert.equal(updateShipyardDetailLOD(extras,50,1024),0);
 assert.equal(updateShipyardDetailLOD(extras,30,820),5);
 assert.equal(updateShipyardDetailLOD(extras,26.01,820),0);
 assert.equal(updateShipyardDetailLOD(extras,26,820),5);
 assert.equal(updateShipyardDetailLOD(extras,50,1024),0,'desktop has nothing hidden');
 assert.equal(updateShipyardDetailLOD(extras,50,390),5);
 assert.equal(updateShipyardDetailLOD(extras,50,821),5,'desktop restores mobile-hidden details');
});

test('does not affect battle roots, unrelated objects or invalid camera/viewport data',()=>{
 const root=new T.Group();root.name='battle-player';
 const falsePositive=new T.Group();falsePositive.name='shipyard-scout-ornaments-simple-deck-bell';
 falsePositive.userData.previewOnly=true;root.add(falsePositive);
 assert.equal(updateShipyardDetailLOD(root,90,390),0);
 assert.equal(falsePositive.visible,true);
 const accessories=new T.Group();accessories.name='modular-ship-accessories';
 const battleProp=new T.Group();battleProp.name='shipyard-scout-ornaments-simple-deck-bell';
 battleProp.userData.previewOnly=false;accessories.add(battleProp);
 assert.equal(isShipyardFineDetail(battleProp),false);
 assert.equal(updateShipyardDetailLOD(accessories,90,390),0);
 assert.equal(battleProp.visible,true);
 const realProp=new T.Group();realProp.name='shipyard-scout-ornaments-simple-deck-bell';
 realProp.userData.previewOnly=true;accessories.add(realProp);
 for(const distance of [Number.NaN,Infinity,-1]){
  assert.equal(updateShipyardDetailLOD(accessories,distance,390),0);
 }
 for(const width of [0,-1,Number.NaN,Infinity]){
  assert.equal(updateShipyardDetailLOD(accessories,100,width),0);
 }
 assert.equal(updateShipyardDetailLOD(null,100,390),0);
 assert.equal(realProp.visible,true);
});
