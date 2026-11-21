import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewGunwaleRails } from '../src/ship-gunwale-rails.ts';
import { applyShipModules, resolveLoadout, validateOwnedFleetForPlayer } from '../src/ship-modules.ts';

const classes=['scout','fighter','warship'] as const;
const trims=['ornaments-simple','ornaments-lanterns','ornaments-legendary'] as const;

test('all nine class/trim gunwale variants create bounded two-draw 3D railings',()=>{
 for(const shipClass of classes)for(const ornamentModule of trims){
  const group=createPreviewGunwaleRails(shipClass,ornamentModule);
  assert.equal(group.name,'shipyard-'+shipClass+'-'+ornamentModule+'-gunwale-rails');
  assert.equal(group.children.length,2);
  assert.equal(group.userData.drawCallObjects,2);
  assert.equal(group.userData.previewOnly,true);
  assert.equal(group.userData.usesDynamicLights,false);
  assert.ok(group.getObjectByName('gunwale-carved-timber') instanceof T.Mesh);
  assert.ok(group.getObjectByName('gunwale-forged-fittings') instanceof T.Mesh);
  group.traverse(object=>{
   assert.equal(object instanceof T.Light,false);
   if(object instanceof T.Mesh){
    assert.ok(object.geometry.getAttribute('position').count>50);
    assert.ok(Number.isFinite(object.geometry.boundingSphere?.radius));
    assert.ok(object.geometry.boundingSphere!.radius<15);
    object.geometry.dispose();
    (object.material as T.Material).dispose();
   }
  });
 }
});

test('class silhouettes use 3, 5 and 7 raised post pairs',()=>{
 const groups=classes.map(c=>createPreviewGunwaleRails(c,'ornaments-simple'));
 assert.deepEqual(groups.map(g=>g.userData.postPairs),[3,5,7]);
 assert.ok(groups[0].userData.railHeight<groups[1].userData.railHeight);
 assert.ok(groups[1].userData.railHeight<groups[2].userData.railHeight);
 const vertices=(g:T.Group)=>(g.getObjectByName('gunwale-carved-timber') as T.Mesh).geometry.getAttribute('position').count;
 assert.ok(vertices(groups[0])<vertices(groups[1]));
 assert.ok(vertices(groups[1])<vertices(groups[2]));
});

test('ornament refits add metal details but cannot grant purchases or equipment',()=>{
 const groups=trims.map(t=>createPreviewGunwaleRails('fighter',t));
 const fittings=(g:T.Group)=>(g.getObjectByName('gunwale-forged-fittings') as T.Mesh);
 const count=(g:T.Group)=>fittings(g).geometry.getAttribute('position').count;
 assert.ok(count(groups[0])<count(groups[1]));
 assert.ok(count(groups[1])<count(groups[2]));
 assert.notEqual((fittings(groups[0]).material as T.MeshStandardMaterial).color.getHex(),
  (fittings(groups[2]).material as T.MeshStandardMaterial).color.getHex());
 assert.throws(()=>resolveLoadout({shipClass:'fighter',level:1,modules:{ornaments:'ornaments-legendary'}}),/not unlocked/);
 assert.throws(()=>validateOwnedFleetForPlayer(
  {shipClass:'fighter',level:19,modules:{ornaments:'ornaments-legendary'}},
  new Set(),19,new Set(['fighter'])
 ),/missing verified ownership/);
});

test('unknown class and tier fail closed',()=>{
 assert.throws(()=>createPreviewGunwaleRails('x' as 'scout','ornaments-simple'),/Unknown ship class/);
 assert.throws(()=>createPreviewGunwaleRails('scout','x' as 'ornaments-simple'),/Unknown ornament module/);
});

test('60 class/level variations replace rails without leaking preview groups',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of classes)for(let level=1;level<=20;level++){
  const ornaments=level>=19?'ornaments-legendary':level>=8?'ornaments-lanterns':'ornaments-simple';
  const accessories=applyShipModules(root,rig,{shipClass,level,modules:{ornaments}});
  assert.ok(accessories.getObjectByName('shipyard-'+shipClass+'-'+ornaments+'-gunwale-rails'));
  assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
  assert.ok(accessories.children.length<135);
 }
});

test('rebuild disposes old rail GPU geometry and material exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{ornaments:'ornaments-legendary'}});
 const old=first.getObjectByName('gunwale-carved-timber') as T.Mesh;
 assert.ok(old);
 let disposedGeometry=0,disposedMaterial=0;
 old.geometry.addEventListener('dispose',()=>disposedGeometry++);
 (old.material as T.Material).addEventListener('dispose',()=>disposedMaterial++);
 const second=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(disposedGeometry,1);
 assert.equal(disposedMaterial,1);
 assert.ok(second.getObjectByName('shipyard-scout-ornaments-simple-gunwale-rails'));
});
