import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewHelm } from '../src/ship-helm.ts';
import { applyShipModules, resolveLoadout, validateOwnedFleetForPlayer } from '../src/ship-modules.ts';

const classes=['scout','fighter','warship'] as const;
const cabins=['cabin-wood','cabin-raised','cabin-palace'] as const;
function release(meshes:readonly T.Mesh[]){
 for(const mesh of meshes){
  mesh.geometry.dispose();
  for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])mat.dispose();
 }
}

test('all nine original helms use precisely two opaque draw objects',()=>{
 for(const shipClass of classes)for(const cabinModule of cabins){
  const meshes=createPreviewHelm(shipClass,cabinModule);
  assert.equal(meshes.length,2);
  assert.equal(meshes[0].userData.previewOnly,true);
  assert.equal(meshes[1].userData.drawCallObjects,2);
  assert.equal(meshes[0].castShadow,false);
  assert.equal(meshes[1].castShadow,false);
  assert.equal(meshes[0].material instanceof T.MeshStandardMaterial,true);
  assert.equal((meshes[1].material as T.MeshStandardMaterial).vertexColors,true);
  for(const mesh of meshes){
   assert.equal((mesh.material as T.Material).transparent,false);
   assert.ok(mesh.geometry.getAttribute('position').count<4500);
   const a=mesh.geometry.getAttribute('position');
   for(let i=0;i<a.count;i++){
    assert.ok(Number.isFinite(a.getX(i)));
    assert.ok(Number.isFinite(a.getY(i)));
    assert.ok(Number.isFinite(a.getZ(i)));
   }
  }
  assert.ok(Number.isFinite(meshes[1].geometry.boundingSphere?.radius));
  release(meshes);
 }
});

test('the three classes have different physically modelled helm silhouettes',()=>{
 const scout=createPreviewHelm('scout','cabin-wood');
 const fighter=createPreviewHelm('fighter','cabin-wood');
 const warship=createPreviewHelm('warship','cabin-wood');
 assert.equal(scout[0].name,'scout-steering-tiller');
 assert.ok(scout[0].geometry instanceof T.BoxGeometry);
 assert.equal(fighter[0].name,'fighter-broadside-helm');
 assert.equal(warship[0].name,'warship-royal-helm');
 assert.ok(fighter[0].geometry instanceof T.TorusGeometry);
 assert.ok(warship[0].geometry instanceof T.TorusGeometry);
 assert.ok((warship[0].geometry as T.TorusGeometry).parameters.radius >
  (fighter[0].geometry as T.TorusGeometry).parameters.radius);
 assert.deepEqual([scout[0],fighter[0],warship[0]].map(m=>m.userData.spokes),[0,4,8]);
 assert.ok(warship[1].geometry.getAttribute('position').count >
  fighter[1].geometry.getAttribute('position').count);
 release(scout);release(fighter);release(warship);
});

test('cabins upgrade the sculpted fittings without granting ownership',()=>{
 const models=cabins.map(c=>createPreviewHelm('warship',c));
 const counts=models.map(([_,detail])=>detail.geometry.getAttribute('position').count);
 assert.ok(counts[0]<counts[1]&&counts[1]<counts[2]);
 const colours=models.map(([rim])=>(rim.material as T.MeshStandardMaterial).color.getHexString());
 assert.equal(new Set(colours).size,3);
 models.forEach(release);
 assert.throws(()=>resolveLoadout({
  shipClass:'scout',level:1,modules:{cabin:'cabin-palace'}
 }),/not unlocked/);
 assert.throws(()=>validateOwnedFleetForPlayer({
  shipClass:'warship',level:20,modules:{cabin:'cabin-palace'}
 },new Set(),20,new Set(['warship'])),/missing verified ownership/);
});

test('invalid classes and cabin modules never create geometry',()=>{
 assert.throws(()=>createPreviewHelm('fake' as 'scout','cabin-wood'),/Unknown preview helm ship class/);
 assert.throws(()=>createPreviewHelm('scout','fake' as 'cabin-wood'),/Unknown preview helm cabin module/);
});

test('all 60 class/level changes replace old helm parts without stacking',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of classes)for(let level=1;level<=20;level++){
  const cabin=level>=18?'cabin-palace':level>=9?'cabin-raised':'cabin-wood';
  const group=applyShipModules(root,rig,{shipClass,level,modules:{cabin}});
  const named=group.getObjectByName(
   shipClass==='scout'?'scout-steering-tiller':
   shipClass==='fighter'?'fighter-broadside-helm':'warship-royal-helm');
  assert.ok(named instanceof T.Mesh);
  assert.equal(group.children.filter(m=>m.name.includes('helm-fittings')).length,1);
  assert.equal(root.children.filter(g=>g.name==='modular-ship-accessories').length,1);
  assert.ok(group.children.length<125);
 }
});

test('old merged helm GPU buffers and materials dispose once on refit',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const group=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{cabin:'cabin-palace'}
 });
 const helm=group.getObjectByName('shipyard-warship-cabin-palace-helm-fittings') as T.Mesh;
 assert.ok(helm);
 let geometryDisposes=0,materialDisposes=0;
 helm.geometry.addEventListener('dispose',()=>geometryDisposes++);
 (helm.material as T.Material).addEventListener('dispose',()=>materialDisposes++);
 applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(geometryDisposes,1);
 assert.equal(materialDisposes,1);
});
