import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewHullRelief } from '../src/ship-hull-relief.ts';
import {
 applyShipModules, resolveLoadout, validateOwnedFleetForPlayer,
 type ShipClass
} from '../src/ship-modules.ts';

const CLASSES=['scout','fighter','warship'] as const;
const HULLS=['hull-oak','hull-ironwood','hull-royal'] as const;

test('all 9 class/hull combinations create original visible geometry in two merged meshes',()=>{
 for(const shipClass of CLASSES)for(const hull of HULLS){
  const model=createPreviewHullRelief(shipClass,hull);
  assert.equal(model.children.length,2,'mobile preview must batch hull details into two draws');
  assert.equal(model.userData.previewOnly,true);
  assert.equal(model.userData.shipClass,shipClass);
  assert.equal(model.userData.hullModule,hull);
  assert.equal(model.userData.drawCallObjects,2);
  assert.equal(model.name,`shipyard-${shipClass}-${hull}-hull-relief`);
  for(const obj of model.children){
   assert.ok(obj instanceof T.Mesh);
   assert.ok(obj.geometry.getAttribute('position').count>=40);
   assert.ok(obj.geometry.boundingSphere?.radius && Number.isFinite(obj.geometry.boundingSphere.radius));
   assert.ok(obj.castShadow && obj.receiveShadow);
   obj.geometry.dispose();
   (obj.material as T.Material).dispose();
  }
 }
 assert.throws(()=>createPreviewHullRelief('ghost' as ShipClass,'hull-oak'),/Unknown preview hull class/);
 assert.throws(()=>createPreviewHullRelief('scout','hull-gold' as 'hull-oak'),/Unknown preview hull module/);
});

test('scout, fighter and flagship have real progressively heavier curved planking',()=>{
 const positions=CLASSES.map(shipClass=>{
  const item=createPreviewHullRelief(shipClass,'hull-oak');
  const count=(item.children[0] as T.Mesh).geometry.getAttribute('position').count;
  return {count,rows:item.userData.strakeRows,studs:item.userData.studsPerSide};
 });
 assert.deepEqual(positions.map(c=>c.rows),[1,2,3]);
 assert.deepEqual(positions.map(c=>c.studs),[2,3,5]);
 assert.ok(positions[0].count<positions[1].count && positions[1].count<positions[2].count);
 const oak=createPreviewHullRelief('fighter','hull-oak');
 const iron=createPreviewHullRelief('fighter','hull-ironwood');
 const royal=createPreviewHullRelief('fighter','hull-royal');
 const colour=(group:T.Group,index:number)=>((group.children[index] as T.Mesh).material as T.MeshStandardMaterial).color.getHexString();
 assert.notEqual(colour(oak,0),colour(iron,0));
 assert.notEqual(colour(iron,0),colour(royal,0));
 assert.equal(colour(iron,1),'647480');
 assert.equal(colour(royal,1),'efc66d');
});

test('changing preview hull reclaims its two GPU meshes and never grants inventory',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const old=applyShipModules(root,rig,{
  shipClass:'warship',level:15,modules:{hull:'hull-royal'}
 });
 const relief=old.getObjectByName('shipyard-warship-hull-royal-hull-relief') as T.Group;
 assert.ok(relief);
 assert.equal(relief.children.length,2);
 const first=relief.children[0] as T.Mesh;
 let geometryDisposes=0,materialDisposes=0;
 first.geometry.addEventListener('dispose',()=>geometryDisposes++);
 (first.material as T.Material).addEventListener('dispose',()=>materialDisposes++);
 const next=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{hull:'hull-oak'}});
 assert.equal(geometryDisposes,1);
 assert.equal(materialDisposes,1);
 assert.equal(root.children.filter(child=>child.name==='modular-ship-accessories').length,1);
 assert.equal(next.getObjectByName('shipyard-warship-hull-royal-hull-relief'),undefined);
 assert.ok(next.getObjectByName('shipyard-scout-hull-oak-hull-relief'));
 assert.ok(next.children.length<125);
 assert.throws(()=>resolveLoadout({shipClass:'fighter',level:1,modules:{hull:'hull-royal'}}),/not unlocked/);
 assert.throws(()=>validateOwnedFleetForPlayer(
  {shipClass:'warship',level:15,modules:{hull:'hull-royal'}},
  new Set(),15,new Set(['warship'])
 ),/missing verified ownership/);
});
