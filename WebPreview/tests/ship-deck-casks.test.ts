import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewDeckCasks } from '../src/ship-deck-casks.ts';
import { applyShipModules, resolveLoadout, validateOwnedFleetForPlayer } from '../src/ship-modules.ts';

const classes=['scout','fighter','warship'] as const;
const hulls=['hull-oak','hull-ironwood','hull-royal'] as const;

test('nine original class/hull combinations use exactly two batched 3D meshes',()=>{
 for(const shipClass of classes)for(const hullModule of hulls){
  const group=createPreviewDeckCasks(shipClass,hullModule);
  assert.equal(group.children.length,2);
  assert.equal(group.userData.previewOnly,true);
  assert.equal(group.userData.affectsBattle,false);
  assert.equal(group.userData.grantsInventory,false);
  assert.equal(group.userData.drawCallObjects,2);
  for(const child of group.children){
   assert.ok(child instanceof T.Mesh);
   assert.equal((child.material as T.Material).transparent,false);
   assert.equal(child.castShadow,false);
   const positions=child.geometry.getAttribute('position');
   assert.ok(positions.count>100&&positions.count<20000,'bounded mobile geometry');
   assert.ok(Number.isFinite(child.geometry.boundingSphere?.radius));
   for(let i=0;i<positions.count;i++){
    assert.ok(Number.isFinite(positions.getX(i)));
    assert.ok(Number.isFinite(positions.getY(i)));
    assert.ok(Number.isFinite(positions.getZ(i)));
   }
   child.geometry.dispose();
   (child.material as T.Material).dispose();
  }
 }
});

test('three ship classes have distinct deck cask geometry and counts',()=>{
 const models=classes.map(shipClass=>createPreviewDeckCasks(shipClass,'hull-oak'));
 assert.deepEqual(models.map(group=>group.userData.caskCount),[2,4,6]);
 const vertices=models.map(group=>(group.children[0] as T.Mesh).geometry.getAttribute('position').count);
 assert.ok(vertices[0]<vertices[1]&&vertices[1]<vertices[2]);
 for(const group of models)for(const mesh of group.children as T.Mesh[]){
  mesh.geometry.dispose();
  (mesh.material as T.Material).dispose();
 }
});

test('royal casks change geometric details without implying an inventory grant',()=>{
 const oak=createPreviewDeckCasks('fighter','hull-oak');
 const royal=createPreviewDeckCasks('fighter','hull-royal');
 assert.ok((royal.children[1] as T.Mesh).geometry.getAttribute('position').count >
  (oak.children[1] as T.Mesh).geometry.getAttribute('position').count);
 assert.notEqual(((oak.children[1] as T.Mesh).material as T.MeshStandardMaterial).color.getHexString(),
  ((royal.children[1] as T.Mesh).material as T.MeshStandardMaterial).color.getHexString());
 assert.throws(()=>resolveLoadout({
  shipClass:'fighter',level:1,modules:{hull:'hull-royal'}
 }),/not unlocked/);
 assert.throws(()=>validateOwnedFleetForPlayer({
  shipClass:'fighter',level:20,modules:{hull:'hull-royal'}
 },new Set(),20,new Set(['fighter'])),/missing verified ownership/);
 for(const group of [oak,royal])for(const mesh of group.children as T.Mesh[]){
  mesh.geometry.dispose();(mesh.material as T.Material).dispose();
 }
});

test('class and level switching dispose old cask meshes once without stacking',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const initial=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{hull:'hull-royal'}});
 const old=initial.getObjectByName('shipyard-warship-hull-royal-deck-casks') as T.Group;
 assert.ok(old);
 assert.equal(old.children.length,2);
 let geometryDisposals=0,materialDisposals=0;
 const metal=old.children[1] as T.Mesh;
 metal.geometry.addEventListener('dispose',()=>geometryDisposals++);
 (metal.material as T.Material).addEventListener('dispose',()=>materialDisposals++);
 for(const shipClass of classes)for(let level=1;level<=20;level++){
  const hull=level>=15?'hull-royal':level>=6?'hull-ironwood':'hull-oak';
  const additions=applyShipModules(root,rig,{shipClass,level,modules:{hull}});
  assert.ok(additions.getObjectByName('shipyard-'+shipClass+'-'+hull+'-deck-casks'));
  assert.equal(root.children.filter(obj=>obj.name==='modular-ship-accessories').length,1);
  assert.ok(additions.children.length<125,'accessory objects stay within mobile budget');
 }
 assert.equal(geometryDisposals,1);
 assert.equal(materialDisposals,1);
});

test('invalid ship class and hull tier do not create cask geometry',()=>{
 assert.throws(()=>createPreviewDeckCasks('fake' as 'scout','hull-oak'),/Unknown preview ship class/);
 assert.throws(()=>createPreviewDeckCasks('scout','fake' as 'hull-oak'),/Unknown preview hull module/);
});
