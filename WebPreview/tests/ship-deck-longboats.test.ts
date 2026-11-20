import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewDeckLongboats } from '../src/ship-deck-longboats.ts';
import { applyShipModules, equipAccess, highestUnlockedPreviewModules } from '../src/ship-modules.ts';
import type { ShipClass } from '../src/ship-modules.ts';
import type { PreviewHullModule } from '../src/ship-hull-relief.ts';

const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const HULLS:readonly PreviewHullModule[]=['hull-oak','hull-ironwood','hull-royal'];

test('nine original 3D tender configurations use three fused meshes and class-specific fleets',()=>{
 for(const shipClass of CLASSES)for(const hull of HULLS){
  const group=createPreviewDeckLongboats(shipClass,hull);
  const expected={scout:1,fighter:2,warship:4}[shipClass];
  assert.equal(group.userData.previewOnly,true);
  assert.equal(group.userData.boatCount,expected);
  assert.equal(group.userData.drawCallObjects,3);
  assert.equal(group.children.length,3,'timber, davits and rope are three real batched draws');
  assert.match(group.name,/hanging-longboats$/);
  let vertices=0;
  for(const child of group.children){
   assert.ok(child instanceof T.Mesh,'all three components are actual 3D meshes');
   const mesh=child as T.Mesh;
   const positions=mesh.geometry.getAttribute('position');
   assert.ok(positions.count>50,'physical curved shell, thwarts, railings and ropes');
   vertices+=positions.count;
   for(let i=0;i<positions.count;i++){
    assert.ok(Number.isFinite(positions.getX(i)));
    assert.ok(Number.isFinite(positions.getY(i)));
    assert.ok(Number.isFinite(positions.getZ(i)));
   }
   assert.ok(mesh.geometry.boundingSphere?.radius);
  }
  assert.ok(vertices<12500,'mobile GPU vertex budget per preview fitting');
  const box=new T.Box3().setFromObject(group);
  assert.ok(box.max.y<3.5&&box.min.y>2.1,'boats hang below davits and clear the upper sails');
  assert.ok(box.max.z<3&&box.min.z>-3,'boats do not obstruct bow or stern');
 }
});

test('refitting a royal warship releases every former tender resource exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const before=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{hull:'hull-royal'}
 });
 const boats=before.getObjectByName('shipyard-warship-hull-royal-hanging-longboats') as T.Group;
 assert.ok(boats);
 assert.equal(boats.children.length,3);
 const counts={geometry:0,material:0};
 const hull=boats.children[0] as T.Mesh;
 hull.geometry.addEventListener('dispose',()=>counts.geometry++);
 (hull.material as T.Material).addEventListener('dispose',()=>counts.material++);
 const after=applyShipModules(root,rig,{
  shipClass:'scout',level:1,modules:{hull:'hull-oak'}
 });
 assert.deepEqual(counts,{geometry:1,material:1});
 assert.equal(root.children.filter(child=>child.name==='modular-ship-accessories').length,1);
 assert.equal(after.getObjectByName('shipyard-warship-hull-royal-hanging-longboats'),undefined);
 assert.ok(after.getObjectByName('shipyard-scout-hull-oak-hanging-longboats'));
});

test('all 20 preview levels select hull fittings without granting ownership or ship acquisition',()=>{
 for(let level=1;level<=20;level++){
  const hull=highestUnlockedPreviewModules(level).hull as PreviewHullModule;
  for(const shipClass of CLASSES){
   const root=new T.Group(),rig=new T.Group();root.add(rig);
   const group=applyShipModules(root,rig,{shipClass,level,modules:{hull}});
   assert.ok(group.getObjectByName('shipyard-'+shipClass+'-'+hull+'-hanging-longboats'));
   assert.equal(group.userData.previewOnly,true);
   assert.ok(group.children.length<125,'accessory draw budget remains stable');
  }
  assert.equal(equipAccess(hull,level),'ownership-unverified');
  assert.equal(equipAccess(hull,level,new Set()),'not-owned');
 }
 assert.throws(()=>createPreviewDeckLongboats('scout','not-a-hull' as PreviewHullModule),/Unknown hull module/);
 assert.throws(()=>createPreviewDeckLongboats('ghost' as ShipClass,'hull-oak'),/Unknown class/);
});
