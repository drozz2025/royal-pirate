import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewSternWindows } from '../src/ship-stern-windows.ts';
import { applyShipModules,resolveLoadout,validateOwnedFleetForPlayer } from '../src/ship-modules.ts';

const classes=['scout','fighter','warship'] as const;
const tiers=['cabin-wood','cabin-raised','cabin-palace'] as const;

test('all nine original stern galleries are genuine bounded 3D with two batches',()=>{
 for(const shipClass of classes)for(const cabinModule of tiers){
  const gallery=createPreviewSternWindows(shipClass,cabinModule);
  assert.equal(gallery.children.length,2);
  assert.equal(gallery.userData.drawCallObjects,2);
  assert.equal(gallery.userData.previewOnly,true);
  assert.equal(gallery.userData.usesDynamicLights,false);
  assert.equal(gallery.userData.transparency,false);
  assert.equal(gallery.userData.windowCount,
   shipClass==='scout'?2:shipClass==='fighter'?3:5);
  for(const object of gallery.children){
   assert.ok(object instanceof T.Mesh);
   assert.ok(object.geometry.getAttribute('position').count>40);
   assert.ok(Number.isFinite(object.geometry.boundingSphere?.radius));
   assert.ok(object.geometry.boundingSphere!.radius<6);
   const position=object.geometry.getAttribute('position');
   for(let i=0;i<position.count;i++){
    assert.ok(position.getZ(i)<-4.35 && position.getZ(i)>-5.4);
    assert.ok(position.getY(i)>2.2 && position.getY(i)<4);
   }
   assert.equal(object.castShadow,false);
   assert.equal((object.material as T.Material).transparent,false);
   object.geometry.dispose();(object.material as T.Material).dispose();
  }
 }
});

test('three ship classes have distinct real window counts and silhouettes',()=>{
 const galleries=classes.map(c=>createPreviewSternWindows(c,'cabin-wood'));
 assert.deepEqual(galleries.map(g=>g.userData.windowCount),[2,3,5]);
 const vertices=galleries.map(g=>(g.getObjectByName('forged-window-tracery') as T.Mesh)
  .geometry.getAttribute('position').count);
 assert.ok(vertices[0]<vertices[1]&&vertices[1]<vertices[2]);
});

test('cabin levels change geometric tracery and finish rather than ownership',()=>{
 const galleries=tiers.map(t=>createPreviewSternWindows('fighter',t));
 assert.deepEqual(galleries.map(g=>g.userData.raisedTracery),[false,true,true]);
 assert.deepEqual(galleries.map(g=>g.userData.royalFinials),[false,false,true]);
 const counts=galleries.map(g=>(g.getObjectByName('forged-window-tracery') as T.Mesh)
  .geometry.getAttribute('position').count);
 assert.ok(counts[0]<counts[1]&&counts[1]<counts[2]);
 const colours=galleries.map(g=>((g.getObjectByName('stern-glass-panes') as T.Mesh)
  .material as T.MeshStandardMaterial).color.getHexString());
 assert.equal(new Set(colours).size,3);
 assert.throws(()=>resolveLoadout({
  shipClass:'scout',level:1,modules:{cabin:'cabin-palace'}
 }),/not unlocked/);
 assert.throws(()=>validateOwnedFleetForPlayer({
  shipClass:'fighter',level:20,modules:{cabin:'cabin-palace'}
 },new Set(),20,new Set(['fighter'])),/missing verified ownership/);
});

test('unknown class and cabin module fail closed before geometry creation',()=>{
 assert.throws(()=>createPreviewSternWindows('xx' as 'scout','cabin-wood'),/Unknown preview ship class/);
 assert.throws(()=>createPreviewSternWindows('scout','bogus' as 'cabin-wood'),/Unknown preview cabin module/);
});

test('all 60 ship-class and demo-level combinations replace windows without stacking',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of classes)for(let level=1;level<=20;level++){
  const cabin=level>=18?'cabin-palace':level>=9?'cabin-raised':'cabin-wood';
  const accessories=applyShipModules(root,rig,{shipClass,level,modules:{cabin}});
  assert.ok(accessories.getObjectByName('shipyard-'+shipClass+'-'+cabin+'-stern-windows'));
  assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
  assert.ok(accessories.children.length<130);
 }
});

test('window gallery geometry and PBR materials release once when refitting',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{cabin:'cabin-palace'}});
 const old=first.getObjectByName('forged-window-tracery') as T.Mesh;
 assert.ok(old);
 let geometries=0,materials=0;
 old.geometry.addEventListener('dispose',()=>geometries++);
 (old.material as T.Material).addEventListener('dispose',()=>materials++);
 const next=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(geometries,1);
 assert.equal(materials,1);
 assert.ok(next.getObjectByName('shipyard-scout-cabin-wood-stern-windows'));
});
