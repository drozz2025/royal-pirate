import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewStandingRigging } from '../src/ship-rigging.ts';
import { applyShipModules, highestUnlockedPreviewModules } from '../src/ship-modules.ts';

const cases=[
 {shipClass:'scout' as const,segments:23,rungs:3},
 {shipClass:'fighter' as const,segments:33,rungs:5},
 {shipClass:'warship' as const,segments:43,rungs:7}
];

test('scout, fighter and warship have unique original shroud and ratline 3D networks',()=>{
 for(const entry of cases){
  const ropes=createPreviewStandingRigging(entry.shipClass,'masts-standard');
  assert.ok(ropes instanceof T.LineSegments);
  assert.equal(ropes.name,'shipyard-'+entry.shipClass+'-standing-rigging');
  assert.equal(ropes.userData.previewOnly,true);
  assert.equal(ropes.userData.segments,entry.segments);
  assert.equal(ropes.userData.rungsPerSide,entry.rungs);
  assert.equal(ropes.geometry.getAttribute('position').count,entry.segments*2,
   'one vertex pair per line segment and no per-rope meshes');
  assert.equal(ropes.geometry.index,null);
  assert.ok(ropes.material instanceof T.LineBasicMaterial);
  assert.equal(ropes.children.length,0,'one rope draw call instead of dozens of cylinder meshes');
  assert.ok(ropes.geometry.getAttribute('position').count<=86,'bounded mobile rope vertex budget');
  const coords=ropes.geometry.getAttribute('position');
  for(let i=0;i<coords.count;i++){
   assert.ok(Number.isFinite(coords.getX(i)));
   assert.ok(Number.isFinite(coords.getY(i)));
   assert.ok(Number.isFinite(coords.getZ(i)));
  }
  ropes.geometry.dispose();
  (ropes.material as T.Material).dispose();
 }
});

test('raider and royal mast unlocks physically lengthen their standing rigging',()=>{
 const top=(tier:'masts-standard'|'masts-raider'|'masts-royal')=>{
  const ropes=createPreviewStandingRigging('warship',tier);
  const p=ropes.geometry.getAttribute('position');
  let highest=0;
  for(let i=0;i<p.count;i++)highest=Math.max(highest,p.getY(i));
  return highest;
 };
 assert.ok(Math.abs(top('masts-standard')-8.06)<.0001);
 assert.ok(top('masts-raider')>top('masts-standard'));
 assert.ok(top('masts-royal')>top('masts-raider'));
 assert.throws(()=>createPreviewStandingRigging('scout','invalid-mast' as 'masts-standard'),/Unknown preview mast module/);
});

test('real Shipyard preview includes one removable rigging network, never a battle rig mutation',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'fighter',level:1,modules:{}});
 const oldRopes=first.getObjectByName('shipyard-fighter-standing-rigging') as T.LineSegments;
 assert.ok(oldRopes instanceof T.LineSegments);
 assert.equal(rig.children.length,0,'no visual accessory was added to the gameplay damage rig');
 assert.equal(root.children.length,2,'base rig and one accessories group only');
 let oldGeometryDisposals=0,oldMaterialDisposals=0;
 oldRopes.geometry.addEventListener('dispose',()=>oldGeometryDisposals++);
 (oldRopes.material as T.Material).addEventListener('dispose',()=>oldMaterialDisposals++);
 const next=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{masts:'masts-royal'}});
 assert.ok(next.getObjectByName('shipyard-warship-standing-rigging') instanceof T.LineSegments);
 assert.equal(oldGeometryDisposals,1,'retired rope geometry released once');
 assert.equal(oldMaterialDisposals,1,'retired rope material released once');
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
 assert.equal(rig.children.length,0);
});

test('60 class-and-level swaps keep one mobile-budget rigging draw call and do not grant equipment',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of ['scout','fighter','warship'] as const)for(let level=1;level<=20;level++){
  const modules=highestUnlockedPreviewModules(level);
  const accessories=applyShipModules(root,rig,{shipClass,level,modules});
  const ropes=accessories.children.filter(o=>o instanceof T.LineSegments);
  assert.equal(ropes.length,1);
  assert.ok(ropes[0].geometry.getAttribute('position').count<=86);
  assert.equal(accessories.userData.previewOnly,true);
  assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
  assert.equal(accessories.userData.modules.masts,modules.masts);
  assert.ok(accessories.children.length<125,'ship rigging adds only one draw call');
 }
});
