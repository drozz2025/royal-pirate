import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewSternBalconies } from '../src/ship-stern-balconies.ts';
import { applyShipModules,resolveLoadout,validateOwnedFleetForPlayer } from '../src/ship-modules.ts';

const classes=['scout','fighter','warship'] as const;
const cabins=['cabin-wood','cabin-raised','cabin-palace'] as const;
const dispose=(g:T.Group)=>g.traverse(o=>{
 if(o instanceof T.Mesh){o.geometry.dispose();
  for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();
 }
});

test('nine original stern balconies use exactly two opaque merged meshes',()=>{
 for(const shipClass of classes)for(const cabinModule of cabins){
  const g=createPreviewSternBalconies(shipClass,cabinModule);
  assert.equal(g.children.length,2);
  assert.equal(g.userData.drawCallObjects,2);
  assert.equal(g.userData.previewOnly,true);
  assert.equal(g.userData.usesDynamicLights,false);
  assert.equal(g.userData.hasTransparency,false);
  for(const child of g.children){
   assert.ok(child instanceof T.Mesh);
   assert.ok(child.geometry.getAttribute('position').count>30);
   const p=child.geometry.getAttribute('position');
   assert.ok(p.count<5000,'finite mobile decoration vertex budget');
   for(let i=0;i<p.count;i++){
    assert.ok(Number.isFinite(p.getX(i))&&Math.abs(p.getX(i))<1.8);
    assert.ok(p.getY(i)>1.7&&p.getY(i)<3.2);
    assert.ok(p.getZ(i)>-5.9&&p.getZ(i)<-4.1);
   }
   assert.ok(Number.isFinite(child.geometry.boundingSphere?.radius));
   assert.equal((child.material as T.Material).transparent,false);
   assert.equal(child.castShadow,false);
  }
  dispose(g);
 }
});

test('classes have genuine different aft profiles, not uniform colour swaps',()=>{
 const all=classes.map(c=>createPreviewSternBalconies(c,'cabin-wood'));
 assert.deepEqual(all.map(g=>g.userData.postCount),[3,5,7]);
 assert.deepEqual(all.map(g=>g.userData.wingGuards),[false,true,true]);
 assert.deepEqual(all.map(g=>g.userData.lowerRail),[false,false,true]);
 const v=all.map(g=>(g.getObjectByName('carved-stern-balcony') as T.Mesh).geometry.getAttribute('position').count);
 assert.ok(v[0]<v[1]&&v[1]<v[2]);
 all.forEach(dispose);
});

test('three cabin tiers modify geometry and material, not player ownership',()=>{
 const all=cabins.map(t=>createPreviewSternBalconies('fighter',t));
 assert.deepEqual(all.map(g=>g.userData.raisedMoulding),[false,true,true]);
 assert.deepEqual(all.map(g=>g.userData.ceremonialFinials),[false,false,true]);
 const counts=all.map(g=>(g.getObjectByName('forged-balcony-rail') as T.Mesh).geometry.getAttribute('position').count);
 assert.ok(counts[0]<counts[1]&&counts[1]<counts[2]);
 const colors=all.map(g=>((g.getObjectByName('forged-balcony-rail') as T.Mesh)
  .material as T.MeshStandardMaterial).color.getHexString());
 assert.equal(new Set(colors).size,3);
 all.forEach(dispose);
 assert.throws(()=>resolveLoadout({
  shipClass:'scout',level:1,modules:{cabin:'cabin-palace'}
 }),/not unlocked/);
 assert.throws(()=>validateOwnedFleetForPlayer({
  shipClass:'warship',level:20,modules:{cabin:'cabin-palace'}
 },new Set(),20,new Set(['warship'])),/missing verified ownership/);
});

test('unknown class or cabin tier is rejected before creating meshes',()=>{
 assert.throws(()=>createPreviewSternBalconies('fake' as 'scout','cabin-wood'),/Unknown preview ship class/);
 assert.throws(()=>createPreviewSternBalconies('scout','fake' as 'cabin-wood'),/Unknown preview cabin module/);
});

test('all 60 class and level refits keep one shipyard accessory group',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of classes)for(let level=1;level<=20;level++){
  const cabin=level>=18?'cabin-palace':level>=9?'cabin-raised':'cabin-wood';
  const accessory=applyShipModules(root,rig,{shipClass,level,modules:{cabin}});
  assert.ok(accessory.getObjectByName('shipyard-'+shipClass+'-'+cabin+'-stern-balcony'));
  assert.equal(root.children.filter(c=>c.name==='modular-ship-accessories').length,1);
  assert.ok(accessory.children.length<140);
 }
});

test('refit releases original stern balcony geometry and material exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{cabin:'cabin-palace'}
 });
 const old=first.getObjectByName('carved-stern-balcony') as T.Mesh;
 assert.ok(old);
 let geo=0,mat=0;
 old.geometry.addEventListener('dispose',()=>geo++);
 (old.material as T.Material).addEventListener('dispose',()=>mat++);
 const next=applyShipModules(root,rig,{
  shipClass:'scout',level:1,modules:{}
 });
 assert.equal(geo,1);assert.equal(mat,1);
 assert.ok(next.getObjectByName('shipyard-scout-cabin-wood-stern-balcony'));
});
