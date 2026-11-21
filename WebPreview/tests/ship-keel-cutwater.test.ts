import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewKeelCutwater } from '../src/ship-keel-cutwater.ts';
import { applyShipModules, resolveLoadout, validateOwnedFleetForPlayer } from '../src/ship-modules.ts';

const classes=['scout','fighter','warship'] as const;
const hulls=['hull-oak','hull-ironwood','hull-royal'] as const;

test('nine class/hull combinations are genuine, bounded, two-draw 3D geometry',()=>{
 for(const shipClass of classes)for(const hullModule of hulls){
  const group=createPreviewKeelCutwater(shipClass,hullModule);
  assert.equal(group.name,'shipyard-'+shipClass+'-'+hullModule+'-keel-cutwater');
  assert.equal(group.userData.previewOnly,true);
  assert.equal(group.userData.usesDynamicLights,false);
  assert.equal(group.children.length,2);
  assert.equal(group.userData.drawCallObjects,2);
  assert.ok(group.getObjectByName('keel-scarfed-timber') instanceof T.Mesh);
  assert.ok(group.getObjectByName('cutwater-forged-edge') instanceof T.Mesh);
  assert.equal(group.getObjectByProperty('type','PointLight'),undefined);
  for(const object of group.children){
   assert.ok(object instanceof T.Mesh);
   assert.ok(object.geometry.getAttribute('position').count>100);
   assert.ok(object.geometry.boundingSphere && Number.isFinite(object.geometry.boundingSphere.radius));
   object.geometry.dispose();
   (object.material as T.Material).dispose();
  }
 }
});

test('Scout, Fighter and Warship use different cutwater silhouettes',()=>{
 const groups=classes.map(shipClass=>createPreviewKeelCutwater(shipClass,'hull-oak'));
 assert.deepEqual(groups.map(g=>g.userData.kneePairs),[1,2,3]);
 assert.ok(groups[0].userData.raisedBowY<groups[1].userData.raisedBowY);
 assert.ok(groups[1].userData.raisedBowY<groups[2].userData.raisedBowY);
 const count=(g:T.Group)=>(g.getObjectByName('keel-scarfed-timber') as T.Mesh).geometry.getAttribute('position').count;
 assert.ok(count(groups[0])<count(groups[1]) && count(groups[1])<count(groups[2]));
});

test('hull refits visibly change PBR forging and physically add details, not inventory',()=>{
 const oak=createPreviewKeelCutwater('fighter','hull-oak');
 const iron=createPreviewKeelCutwater('fighter','hull-ironwood');
 const royal=createPreviewKeelCutwater('fighter','hull-royal');
 const fittings=(g:T.Group)=>(g.getObjectByName('cutwater-forged-edge') as T.Mesh);
 const positions=(g:T.Group)=>fittings(g).geometry.getAttribute('position').count;
 assert.ok(positions(oak)<positions(iron) && positions(iron)<positions(royal));
 assert.notEqual((fittings(oak).material as T.MeshStandardMaterial).color.getHexString(),
  (fittings(royal).material as T.MeshStandardMaterial).color.getHexString());
 assert.throws(()=>resolveLoadout({shipClass:'fighter',level:1,modules:{hull:'hull-royal'}}),/not unlocked/);
 assert.throws(()=>validateOwnedFleetForPlayer(
  {shipClass:'warship',level:15,modules:{hull:'hull-royal'}},
  new Set(),15,new Set(['warship'])
 ),/missing verified ownership/);
});

test('invalid class or hull refit fails closed',()=>{
 assert.throws(()=>createPreviewKeelCutwater('invalid' as 'scout','hull-oak'),/Unknown ship class/);
 assert.throws(()=>createPreviewKeelCutwater('scout','invalid' as 'hull-oak'),/Unknown hull refit/);
});

test('60 class/level previews keep exactly one disposable keel and no battle changes',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of classes)for(let level=1;level<=20;level++){
  const hull=level>=15?'hull-royal':level>=6?'hull-ironwood':'hull-oak';
  const next=applyShipModules(root,rig,{shipClass,level,modules:{hull}});
  assert.ok(next.getObjectByName('shipyard-'+shipClass+'-'+hull+'-keel-cutwater'));
  assert.equal(root.children.filter(c=>c.name==='modular-ship-accessories').length,1);
  assert.ok(next.children.length<130);
 }
});

test('refitting disposes old keel GPU buffers and materials exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{hull:'hull-royal'}});
 const keel=first.getObjectByName('shipyard-warship-hull-royal-keel-cutwater') as T.Group;
 assert.ok(keel);
 const mesh=keel.getObjectByName('keel-scarfed-timber') as T.Mesh;
 let geometries=0,materials=0;
 mesh.geometry.addEventListener('dispose',()=>geometries++);
 (mesh.material as T.Material).addEventListener('dispose',()=>materials++);
 const second=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(geometries,1);
 assert.equal(materials,1);
 assert.equal(second.getObjectByName('shipyard-warship-hull-royal-keel-cutwater'),undefined);
 assert.ok(second.getObjectByName('shipyard-scout-hull-oak-keel-cutwater'));
});
