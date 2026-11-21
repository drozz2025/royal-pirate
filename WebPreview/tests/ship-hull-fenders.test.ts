import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewHullFenders } from '../src/ship-hull-fenders.ts';
import type { ShipClass } from '../src/ship-modules.ts';
import type { PreviewHullModule } from '../src/ship-hull-relief.ts';

const classes:ShipClass[]=['scout','fighter','warship'];
const finishes:PreviewHullModule[]=['hull-oak','hull-ironwood','hull-royal'];

test('nine class/finish variants are two-batch real 3D fenders and no virtual ownership',()=>{
 for(let i=0;i<classes.length;i++)for(const finish of finishes){
  const model=createPreviewHullFenders(classes[i],finish);
  assert.equal(model.children.length,2);
  assert.equal(model.userData.fenderCount,2*(i+1));
  assert.equal(model.userData.lashingsPerFender,i+2);
  assert.equal(model.userData.previewOnly,true);
  assert.equal(model.userData.affectsBattle,false);
  assert.equal(model.userData.grantsOwnership,false);
  assert.equal(model.userData.grantsInventory,false);
  for(const child of model.children){
   assert.ok(child instanceof T.Mesh);
   assert.ok(child.geometry.getAttribute('position').count>80);
   child.geometry.computeBoundingBox();
   assert.ok(child.geometry.boundingBox);
   assert.ok(child.geometry.boundingBox!.max.y<=2.9);
   assert.ok(child.geometry.boundingBox!.min.y>=.95);
   assert.ok(child.geometry.getAttribute('position').count<10000);
   child.geometry.dispose();
   (child.material as T.Material).dispose();
  }
 }
});

test('increasing hull classes produce different geometry and royal finish',()=>{
 const verts:number[]=[];
 for(const cls of classes){
  const ship=createPreviewHullFenders(cls,'hull-oak');
  verts.push((ship.children[0] as T.Mesh).geometry.getAttribute('position').count);
 }
 assert.ok(verts[0]<verts[1]&&verts[1]<verts[2]);
 const plain=createPreviewHullFenders('scout','hull-oak');
 const premium=createPreviewHullFenders('scout','hull-royal');
 assert.notEqual(
  (plain.children[0] as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>).material.color.getHex(),
  (premium.children[0] as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>).material.color.getHex()
 );
});

test('unrecognized classes and module identifiers fail rather than fabricating assets',()=>{
 assert.throws(()=>createPreviewHullFenders('ghost' as ShipClass,'hull-oak'),/Unknown preview class/);
 assert.throws(()=>createPreviewHullFenders('scout','hull-free' as PreviewHullModule),/Unknown preview hull finish/);
});
