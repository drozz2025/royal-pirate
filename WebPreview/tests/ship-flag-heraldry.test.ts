import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPreviewFlagHeraldry} from '../src/ship-flag-heraldry.ts';
import {applyShipModules, resolveLoadout, validateOwnedFleetForPlayer,
 type ShipClass} from '../src/ship-modules.ts';

const CLASSES=['scout','fighter','warship'] as const;
const FLAGS=['flag-navy','flag-red','flag-black'] as const;

test('nine original double-faced 3D naval flag crests fit both rig flags in one draw mesh',()=>{
 for(const shipClass of CLASSES)for(const flagModule of FLAGS){
  const mesh=createPreviewFlagHeraldry(shipClass,flagModule);
  assert.ok(mesh instanceof T.Mesh);
  assert.equal(mesh.userData.previewOnly,true);
  assert.equal(mesh.userData.drawCallObjects,1);
  assert.equal(mesh.userData.shipClass,shipClass);
  assert.equal(mesh.userData.flagModule,flagModule);
  const position=mesh.geometry.getAttribute('position') as T.BufferAttribute;
  assert.ok(position.count>=200&&position.count<2500);
  assert.equal(mesh.userData.triangles,position.count/3);
  assert.ok(mesh.userData.triangles<850,'mobile artwork triangle budget');
  assert.ok(mesh.geometry.boundingSphere?.radius);
  const x:number[]=[],y:number[]=[],z:number[]=[];
  for(let i=0;i<position.count;i++){
   const px=position.getX(i),py=position.getY(i),pz=position.getZ(i);
   assert.ok(Number.isFinite(px)&&Number.isFinite(py)&&Number.isFinite(pz));
   x.push(px);y.push(py);z.push(pz);
  }
  assert.ok(Math.min(...x)>.05&&Math.max(...x)<1.35,'within 1.4 wide flag');
  assert.ok(Math.min(...y)>7.3&&Math.max(...y)<9.3,'within existing mast flag heights');
  assert.ok(Math.min(...z)<-2.11&&Math.max(...z)>.91,'both mast stations, both cloth faces');
  mesh.geometry.dispose();(mesh.material as T.Material).dispose();
 }
 assert.throws(()=>createPreviewFlagHeraldry('ghost' as ShipClass,'flag-navy'),/Unknown preview flag class/);
 assert.throws(()=>createPreviewFlagHeraldry('scout','flag-unknown' as 'flag-navy'),/Unknown preview flag module/);
});

test('scout compass, fighter cutlasses and warship crown use distinct geometry and visible contrast',()=>{
 const variants=CLASSES.map(cls=>createPreviewFlagHeraldry(cls,'flag-navy'));
 const runs=variants.map(mesh=>mesh.userData.embroideredRuns as number);
 assert.equal(new Set(runs).size,3);
 const coordinates=variants.map(mesh=>(mesh.geometry.getAttribute('position') as T.BufferAttribute).array.join(','));
 assert.equal(new Set(coordinates).size,3);
 const colours=FLAGS.map(flag=>(createPreviewFlagHeraldry('warship',flag).material as T.MeshStandardMaterial).color.getHexString());
 assert.equal(new Set(colours).size,3);
 for(const mesh of variants){mesh.geometry.dispose();(mesh.material as T.Material).dispose();}
});

test('flag refit reclaims the previous insignia GPU buffer and never modifies the battle rig',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const sentinel=new T.Group();rig.add(sentinel);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:11,modules:{flag:'flag-black'}});
 const old=first.getObjectByName('shipyard-warship-flag-black-flag-heraldry') as T.Mesh;
 assert.ok(old);
 let geometryDisposes=0,materialDisposes=0;
 old.geometry.addEventListener('dispose',()=>geometryDisposes++);
 (old.material as T.Material).addEventListener('dispose',()=>materialDisposes++);
 const next=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(geometryDisposes,1);
 assert.equal(materialDisposes,1);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
 assert.ok(next.getObjectByName('shipyard-scout-flag-navy-flag-heraldry'));
 assert.equal(next.getObjectByName(old.name),undefined);
 assert.equal(rig.children[0],sentinel);
 assert.ok(next.children.length<125);
});

test('flag level unlocks never grant inventory, paid entitlement or class ownership',()=>{
 assert.throws(()=>resolveLoadout({
  shipClass:'scout',level:10,modules:{flag:'flag-black'}
 }),/not unlocked/);
 assert.equal(resolveLoadout({
  shipClass:'scout',level:11,modules:{flag:'flag-black'}
 }).modules.flag,'flag-black');
 assert.throws(()=>validateOwnedFleetForPlayer({
  shipClass:'scout',level:11,modules:{flag:'flag-black'}
 },new Set<string>(),11,new Set(['scout'])),/missing verified ownership/);
});
