import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewGunBreeching } from '../src/ship-cannon-breeching.ts';
import { applyShipModules, type ShipClass } from '../src/ship-modules.ts';
import type { PreviewCannonModule } from '../src/ship-cannons.ts';

const classes:ShipClass[]=['scout','fighter','warship'];
const refits:PreviewCannonModule[]=['cannons-bronze','cannons-steel','cannons-gold'];

test('all nine class/refit combinations create original real 3D ropes and forgings',()=>{
 const expected=[1,2,3];
 for(let i=0;i<classes.length;i++)for(const refit of refits){
  const part=createPreviewGunBreeching(classes[i],refit);
  assert.equal(part.children.length,2,'all guns and eyelets share two GPU draws');
  assert.equal(part.userData.previewOnly,true);
  assert.equal(part.userData.affectsBattle,false);
  assert.equal(part.userData.grantsOwnership,false);
  assert.equal(part.userData.gunCount,6);
  assert.equal(part.userData.ropesPerGun,expected[i]);
  assert.equal(part.userData.ropeCount,expected[i]*6);
  assert.equal(part.userData.eyeletCount,expected[i]*6);
  for(const child of part.children){
   assert.ok(child instanceof T.Mesh);
   const geom=(child as T.Mesh).geometry;
   assert.ok(geom.getAttribute('position').count>100);
   geom.computeBoundingBox();
   assert.ok(geom.boundingBox);
   assert.ok([...geom.boundingBox!.min.toArray(),...geom.boundingBox!.max.toArray()].every(Number.isFinite));
  }
 }
});

test('scout, frigate and flagship have increasingly sculpted cannon line geometry',()=>{
 const sizes=classes.map(cls=>{
  const part=createPreviewGunBreeching(cls,'cannons-bronze');
  return ((part.children[0] as T.Mesh).geometry.getAttribute('position')).count;
 });
 assert.ok(sizes[0]<sizes[1]&&sizes[1]<sizes[2]);
 const bronze=createPreviewGunBreeching('warship','cannons-bronze');
 const admiral=createPreviewGunBreeching('warship','cannons-gold');
 assert.ok(((admiral.children[1] as T.Mesh).geometry.getAttribute('position')).count>
  ((bronze.children[1] as T.Mesh).geometry.getAttribute('position')).count);
});

test('foreign classes and cannon IDs are rejected instead of silently rendered',()=>{
 assert.throws(()=>createPreviewGunBreeching('ghost' as ShipClass,'cannons-bronze'),/Unknown preview class/);
 assert.throws(()=>createPreviewGunBreeching('scout','free-cannons' as PreviewCannonModule),/Unknown preview cannon refit/);
});

test('module preview incorporates the cannon tackle but never edits the battle ship',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{cannons:'cannons-gold'}
 });
 const tackle=first.getObjectByName('shipyard-warship-cannons-gold-breeching');
 assert.ok(tackle);
 assert.equal(tackle!.children.length,2);
 assert.equal(first.userData.level,20);
 const next=applyShipModules(root,rig,{
  shipClass:'scout',level:1,modules:{}
 });
 assert.ok(next.getObjectByName('shipyard-scout-cannons-bronze-breeching'));
 assert.equal(root.children.filter(child=>child.name==='modular-ship-accessories').length,1);
 assert.equal(first.parent,null);
 assert.equal(root.scale.x,.82);
 assert.equal(next.userData.level,1);
});
