import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewHullFenders } from '../src/ship-hull-fenders.ts';
import { applyShipModules, type ShipClass } from '../src/ship-modules.ts';
import type { PreviewHullModule } from '../src/ship-hull-relief.ts';
import { updateShipyardDetailLOD } from '../src/shipyard-detail-lod.ts';

const classes:ShipClass[]=['scout','fighter','warship'];
const finishes:PreviewHullModule[]=['hull-oak','hull-ironwood','hull-royal'];

test('all nine class/finish pairings provide sculptural batched hull fenders',()=>{
 for(let i=0;i<classes.length;i++)for(const finish of finishes){
  const model=createPreviewHullFenders(classes[i],finish);
  assert.equal(model.children.length,2,'only cork and rope/metal draws');
  assert.equal(model.userData.drawCallObjects,2);
  assert.equal(model.userData.fenderCount,[2,4,6][i]);
  assert.equal(model.userData.lashingsPerFender,[2,3,4][i]);
  assert.equal(model.userData.previewOnly,true);
  assert.equal(model.userData.affectsBattle,false);
  assert.equal(model.userData.grantsOwnership,false);
  assert.equal(model.userData.grantsInventory,false);
  for(const child of model.children){
   assert.ok(child instanceof T.Mesh);
   const g=child.geometry;
   assert.ok(g.getAttribute('position').count>80);
   g.computeBoundingBox();
   assert.ok(g.boundingBox);
   assert.ok([...g.boundingBox!.min.toArray(),...g.boundingBox!.max.toArray()].every(Number.isFinite));
   assert.ok(g.boundingBox!.max.y<=2.9);
   assert.ok(g.boundingBox!.min.y>=.95);
   assert.ok(g.getAttribute('position').count<10000,'mobile vertex budget');
  }
 }
});

test('cork silhouette and rope complexity increase by class, not duplicated assets',()=>{
 const counts=classes.map(cls=>{
  const model=createPreviewHullFenders(cls,'hull-oak');
  return model.children.map(obj=>(obj as T.Mesh).geometry.getAttribute('position').count);
 });
 assert.ok(counts[0][0]<counts[1][0]&&counts[1][0]<counts[2][0]);
 assert.ok(counts[0][1]<counts[1][1]&&counts[1][1]<counts[2][1]);
 const oak=createPreviewHullFenders('warship','hull-oak');
 const royal=createPreviewHullFenders('warship','hull-royal');
 assert.ok((royal.children[1] as T.Mesh).geometry.getAttribute('position').count>
  (oak.children[1] as T.Mesh).geometry.getAttribute('position').count,'royal cordage carries additional trim');
 assert.notEqual((oak.children[0] as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>).material.color.getHex(),
  (royal.children[0] as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>).material.color.getHex());
});

test('invalid hull classes and cosmetic IDs cannot construct fabricated gear',()=>{
 assert.throws(()=>createPreviewHullFenders('ghost' as ShipClass,'hull-oak'),/Unknown preview class/);
 assert.throws(()=>createPreviewHullFenders('scout','hull-free' as PreviewHullModule),/Unknown preview hull finish/);
});

test('editor swap releases previous fender meshes and never alters battle objects',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const old=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{hull:'hull-royal'}
 });
 const original=old.getObjectByName('shipyard-warship-hull-royal-hull-fenders') as T.Group;
 assert.ok(original);
 assert.equal(original.children.length,2);
 const mesh=original.children[0] as T.Mesh;
 let frees=0;mesh.geometry.addEventListener('dispose',()=>frees++);
 const replacement=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(frees,1,'old cork GPU buffer must be released exactly once');
 assert.equal(original.parent,null);
 assert.ok(replacement.getObjectByName('shipyard-scout-hull-oak-hull-fenders'));
 assert.equal(root.children.filter(child=>child.name==='modular-ship-accessories').length,1);
 assert.equal(root.children.includes(rig),true);
 assert.equal(replacement.userData.previewOnly,true);
});

test('mobile far zoom skips the tiny hanging fenders, with desktop restoration',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const accessories=applyShipModules(root,rig,{shipClass:'fighter',level:6,modules:{hull:'hull-ironwood'}});
 const fenders=accessories.getObjectByName('shipyard-fighter-hull-ironwood-hull-fenders');
 assert.ok(fenders);
 assert.equal(fenders!.visible,true);
 updateShipyardDetailLOD(accessories,40,390);
 assert.equal(fenders!.visible,false);
 updateShipyardDetailLOD(accessories,35,390);
 assert.equal(fenders!.visible,false,'distance hysteresis avoids flicker');
 updateShipyardDetailLOD(accessories,33,390);
 assert.equal(fenders!.visible,true);
 updateShipyardDetailLOD(accessories,40,390);
 updateShipyardDetailLOD(accessories,40,1024);
 assert.equal(fenders!.visible,true,'desktop always preserves premium fittings');
});
