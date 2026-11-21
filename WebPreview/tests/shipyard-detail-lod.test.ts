import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { applyShipModules, type ShipClass } from '../src/ship-modules.ts';
import {
 updateShipyardDetailLOD, isShipyardFineDetail,
 FINE_DETAIL_HIDE_DISTANCE, FINE_DETAIL_SHOW_DISTANCE,
 SECONDARY_DETAIL_HIDE_DISTANCE, SECONDARY_DETAIL_SHOW_DISTANCE
} from '../src/shipyard-detail-lod.ts';

const CLASSES:ShipClass[]=['scout','fighter','warship'];
const MICRO=['-deck-bell','-compass-binnacle','-navigation-chart','-deck-ropes','-deck-hatches'];
const SECONDARY=['-deck-casks','-deck-shot-racks','-deck-capstans','-boarding-ladders','-stern-lanterns','-hull-fenders'];

test('all three classes and progression tiers use two-stage mobile LOD without losing premium hull silhouette',()=>{
 for(const shipClass of CLASSES)for(const level of [1,8,19,20]){
  const root=new T.Group(),rig=new T.Group();root.add(rig);
  const extras=applyShipModules(root,rig,{shipClass,level,modules:{}});
  const micro=extras.children.filter(object=>MICRO.some(s=>object.name.endsWith(s)));
  const secondary=extras.children.filter(object=>SECONDARY.some(s=>object.name.endsWith(s)));
  const major=extras.children.filter(item=>!isShipyardFineDetail(item));
  assert.equal(micro.length,5,'five microscopic deck details');
  assert.equal(secondary.length,6,'six secondary original accessories');
  assert.ok(major.length>0,'major silhouette remains visible');
  assert.equal(extras.children.filter(isShipyardFineDetail).length,11);
  const totalChildren=extras.children.length;
  const testedMesh=secondary[0].children[0] as T.Mesh;
  let disposed=0;testedMesh.geometry.addEventListener('dispose',()=>disposed++);
  assert.equal(updateShipyardDetailLOD(extras,31,390),5,'micro-detail group culling');
  assert.ok(micro.every(item=>!item.visible));
  assert.ok(secondary.every(item=>item.visible));
  assert.ok(major.every(item=>item.visible),'silhouette and large decorations retained');
  assert.equal(updateShipyardDetailLOD(extras,39,390),6,'additional far-zoom secondary culling');
  assert.ok(secondary.every(item=>!item.visible));
  assert.equal(updateShipyardDetailLOD(extras,37,390),0,'hysteresis avoids flicker');
  assert.equal(updateShipyardDetailLOD(extras,35,390),0);
  assert.equal(updateShipyardDetailLOD(extras,33,390),6,'secondary details return when zooming in');
  assert.ok(secondary.every(item=>item.visible));
  assert.ok(micro.every(item=>!item.visible));
  assert.equal(updateShipyardDetailLOD(extras,27,390),0);
  assert.equal(updateShipyardDetailLOD(extras,25,390),5,'all tiny details restored in close-up');
  assert.ok(micro.every(item=>item.visible));
  assert.equal(extras.children.length,totalChildren,'no geometry recreated');
  assert.equal(disposed,0,'LOD preserves GPU resources');
  assert.equal(root.getObjectByName('modular-ship-accessories'),extras);
  assert.equal(extras.userData.previewOnly,true);
 }
});

test('desktop and tablet keep all details and mobile thresholds are deterministic',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const extras=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{
  ornaments:'ornaments-legendary',cabin:'cabin-palace',masts:'masts-royal'
 }});
 assert.equal(FINE_DETAIL_HIDE_DISTANCE-FINE_DETAIL_SHOW_DISTANCE,4);
 assert.equal(SECONDARY_DETAIL_HIDE_DISTANCE-SECONDARY_DETAIL_SHOW_DISTANCE,4);
 assert.equal(updateShipyardDetailLOD(extras,50,1024),0);
 assert.equal(updateShipyardDetailLOD(extras,30,820),5);
 assert.equal(updateShipyardDetailLOD(extras,40,820),6);
 assert.equal(updateShipyardDetailLOD(extras,36,820),0);
 assert.equal(updateShipyardDetailLOD(extras,34,820),6);
 assert.equal(updateShipyardDetailLOD(extras,26,820),5);
 assert.equal(updateShipyardDetailLOD(extras,50,1024),0);
 assert.equal(updateShipyardDetailLOD(extras,50,390),11);
 assert.equal(updateShipyardDetailLOD(extras,50,821),11,'desktop restores all hidden props');
 assert.equal(extras.children.filter(child=>!child.visible).length,0);
});

test('battle roots, non-preview props and invalid sensor measurements are unaffected',()=>{
 const root=new T.Group();root.name='battle-player';
 const falsePositive=new T.Group();falsePositive.name='shipyard-scout-hull-oak-deck-casks';
 falsePositive.userData.previewOnly=true;root.add(falsePositive);
 assert.equal(updateShipyardDetailLOD(root,90,390),0);
 assert.equal(falsePositive.visible,true);
 const extras=new T.Group();extras.name='modular-ship-accessories';
 const combatProp=new T.Group();combatProp.name='shipyard-scout-hull-oak-deck-casks';
 combatProp.userData.previewOnly=false;extras.add(combatProp);
 assert.equal(isShipyardFineDetail(combatProp),false);
 const realProp=new T.Group();realProp.name='shipyard-scout-hull-oak-deck-casks';
 realProp.userData.previewOnly=true;extras.add(realProp);
 assert.equal(isShipyardFineDetail(realProp),true);
 const other=new T.Group();other.name='shipyard-scout-hull-oak-deck-planking';
 other.userData.previewOnly=true;extras.add(other);
 for(const distance of [Number.NaN,Infinity,-1]){
  assert.equal(updateShipyardDetailLOD(extras,distance,390),0);
 }
 for(const width of [0,-1,Number.NaN,Infinity]){
  assert.equal(updateShipyardDetailLOD(extras,100,width),0);
 }
 assert.equal(updateShipyardDetailLOD(null,100,390),0);
 assert.equal(realProp.visible,true);
 assert.equal(updateShipyardDetailLOD(extras,40,390),1);
 assert.equal(realProp.visible,false);
 assert.equal(combatProp.visible,true);
 assert.equal(other.visible,true);
 assert.equal(updateShipyardDetailLOD(extras,40,390),0,'stable repeated render');
 assert.equal(updateShipyardDetailLOD(extras,25,390),1);
 assert.equal(realProp.visible,true);
});
