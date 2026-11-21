import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewDeckPlanking } from '../src/ship-deck-planking.ts';
import {
 applyShipModules,resolveLoadout,validateOwnedFleetForPlayer
} from '../src/ship-modules.ts';

const classes=['scout','fighter','warship'] as const;
const hulls=['hull-oak','hull-ironwood','hull-royal'] as const;

test('all nine deck-planking class/hull designs merge to two mobile draw objects',()=>{
 for(const shipClass of classes)for(const hullModule of hulls){
  const group=createPreviewDeckPlanking(shipClass,hullModule);
  assert.equal(group.children.length,2);
  assert.equal(group.userData.drawCallObjects,2);
  assert.equal(group.userData.previewOnly,true);
  assert.equal(group.userData.usesDynamicLights,false);
  const grain=group.getObjectByName('deck-grain-relief') as T.Mesh;
  const pins=group.getObjectByName('deck-forged-pins') as T.Mesh;
  assert.ok(grain instanceof T.Mesh);
  assert.ok(pins instanceof T.Mesh);
  assert.ok(grain.geometry.getAttribute('position').count>90);
  assert.ok(pins.geometry.getAttribute('position').count>60);
  for(const child of [grain,pins]){
   assert.ok(Number.isFinite(child.geometry.boundingSphere?.radius));
   assert.ok(child.geometry.boundingSphere!.radius<7);
   const positions=child.geometry.getAttribute('position');
   for(let i=0;i<positions.count;i++){
    assert.ok(positions.getY(i)>1.95&&positions.getY(i)<2.02,
     'thin inlays must remain on the existing deck without protruding');
   }
  }
  for(const child of [grain,pins]){
   child.geometry.dispose();(child.material as T.Material).dispose();
  }
 }
});

test('three original deck silhouettes use 4, 6 and 8 distinct board grooves',()=>{
 const groups=classes.map(c=>createPreviewDeckPlanking(c,'hull-oak'));
 assert.deepEqual(groups.map(g=>g.userData.seamCount),[4,6,8]);
 assert.deepEqual(groups.map(g=>g.userData.staggeredButtRows),[2,3,4]);
 assert.deepEqual(groups.map(g=>g.userData.quarterdeckChevrons),[0,0,2]);
 const geometryCount=(group:T.Group)=>(group.getObjectByName('deck-grain-relief') as T.Mesh)
  .geometry.getAttribute('position').count;
 assert.ok(geometryCount(groups[0])<geometryCount(groups[1]));
 assert.ok(geometryCount(groups[1])<geometryCount(groups[2]));
});

test('finish follows hull tier unlocks, not inventory or purchased ownership',()=>{
 const groups=hulls.map(h=>createPreviewDeckPlanking('warship',h));
 const colour=(group:T.Group)=>
  ((group.getObjectByName('deck-forged-pins') as T.Mesh).material as T.MeshStandardMaterial)
   .color.getHexString();
 assert.equal(new Set(groups.map(colour)).size,3);
 assert.throws(()=>resolveLoadout({
  shipClass:'scout',level:1,modules:{hull:'hull-royal'}
 }),/not unlocked/);
 assert.throws(()=>validateOwnedFleetForPlayer({
  shipClass:'scout',level:20,modules:{hull:'hull-royal'}
 },new Set(),20,new Set(['scout'])),/missing verified ownership/);
});

test('invalid class and hull fail closed before generating GPU geometry',()=>{
 assert.throws(()=>createPreviewDeckPlanking('x' as 'scout','hull-oak'),/Unknown ship class/);
 assert.throws(()=>createPreviewDeckPlanking('scout','x' as 'hull-oak'),/Unknown hull module/);
});

test('60 class/level previews replace deck planking without accumulating models',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of classes)for(let level=1;level<=20;level++){
  const hull=level>=15?'hull-royal':level>=6?'hull-ironwood':'hull-oak';
  const accessories=applyShipModules(root,rig,{shipClass,level,modules:{hull}});
  assert.ok(accessories.getObjectByName('shipyard-'+shipClass+'-'+hull+'-deck-planking'));
  assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
  assert.ok(accessories.children.length<140);
 }
});

test('refitting frees old deck groove and pin GPU resources exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{hull:'hull-royal'}});
 const old=first.getObjectByName('deck-grain-relief') as T.Mesh;
 assert.ok(old);
 let geometryDisposes=0,materialDisposes=0;
 old.geometry.addEventListener('dispose',()=>geometryDisposes++);
 (old.material as T.Material).addEventListener('dispose',()=>materialDisposes++);
 const next=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(geometryDisposes,1);
 assert.equal(materialDisposes,1);
 assert.ok(next.getObjectByName('shipyard-scout-hull-oak-deck-planking'));
});
