import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { syncShipyardPreview } from '../src/shipyard-preview-sync.ts';
import { SLOTS, SHIP_CLASSES, progressionTier, type ShipClass } from '../src/ship-modules.ts';

function preview() {
 const root = new T.Group(), rig = new T.Group();
 root.add(rig);
 return {root,rig};
}

test('20 demo levels reuse the exact same preview geometry and update tier labels', () => {
 const {root,rig} = preview();
 const original = syncShipyardPreview(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(original.rebuilt,true);
 const firstMesh = original.accessories.children.find(o => o instanceof T.Mesh) as T.Mesh;
 assert.ok(firstMesh,'the 3D preview has real meshes');
 let disposals=0;
 firstMesh.geometry.addEventListener('dispose',()=>disposals++);

 for(let level=2;level<=20;level++) {
  const next = syncShipyardPreview(root,rig,{shipClass:'scout',level,modules:{}});
  assert.equal(next.rebuilt,false,'level '+level+' must not rebuild the unchanged hull');
  assert.strictEqual(next.accessories,original.accessories);
  assert.strictEqual(firstMesh.geometry,(next.accessories.children.find(o=>o instanceof T.Mesh) as T.Mesh).geometry);
  assert.equal(next.accessories.userData.level,level);
  assert.equal(next.accessories.userData.tier,progressionTier(level));
  assert.equal(next.accessories.userData.previewOnly,true);
 }
 assert.equal(disposals,0,'demo slider cannot dispose the same GPU buffers repeatedly');
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
});

test('a real visual module or ship class change rebuilds only the disposable editor model', () => {
 const {root,rig}=preview();
 const initial = syncShipyardPreview(root,rig,{shipClass:'fighter',level:1,modules:{}});
 const changed = syncShipyardPreview(root,rig,{shipClass:'fighter',level:20,modules:{sails:'sails-night'}});
 assert.equal(changed.rebuilt,true);
 assert.notStrictEqual(changed.accessories,initial.accessories);
 assert.equal(initial.accessories.parent,null);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);

 for(const shipClass of Object.keys(SHIP_CLASSES) as ShipClass[]) {
  const result = syncShipyardPreview(root,rig,{
   shipClass,level:20,modules:{sails:'sails-night',hull:'hull-royal'}
  });
  assert.equal(result.accessories.userData.shipClass,shipClass);
  assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
  assert.equal(SLOTS.every(slot=>typeof result.accessories.userData.modules[slot]==='string'),true);
 }
});

test('invalid or locked parts are rejected before destroying the current 3D preview', () => {
 const {root,rig}=preview();
 const existing=syncShipyardPreview(root,rig,{shipClass:'warship',level:1,modules:{}}).accessories;
 assert.throws(()=>syncShipyardPreview(root,rig,{
  shipClass:'warship',level:1,modules:{figurehead:'figurehead-crown'}
 }),/not unlocked/);
 assert.throws(()=>syncShipyardPreview(root,rig,{
  shipClass:'warship',level:21,modules:{}
 }),RangeError);
 assert.throws(()=>syncShipyardPreview(root,rig,{
  shipClass:'warship',level:1,modules:{hull:'hull-unknown'}
 }),/Unknown module/);
 assert.strictEqual(root.getObjectByName('modular-ship-accessories'),existing);
 assert.equal(existing.parent,root);
 assert.equal(existing.userData.level,1);
});

test('only the isolated shipyard uses the synchronization path, never battle',()=>{
 const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
 assert.match(scene,/showShipyard\(loadout:ShipLoadout\)[\s\S]*?syncShipyardPreview\(this\.shipyardArt\.root,this\.shipyardArt\.rig,loadout\)/);
 assert.match(scene,/this\.ships=\{player:makeShip\(false\),enemy:makeShip\(true\)\}/);
 assert.match(scene,/private releaseShipyardPreview\(\)[\s\S]*?releaseShipyardResources\(this\.scene,this\.shipyardArt\.root\)/);
});
