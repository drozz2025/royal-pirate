import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewCannonRefit } from '../src/ship-cannons.ts';
import { applyShipModules, equipAccess, type ShipClass } from '../src/ship-modules.ts';

test('three original cannon silhouettes contain six physical barrels with two merged draw calls',()=>{
 const classes:ShipClass[]=['scout','fighter','warship'];
 const counts:number[]=[];
 for(const shipClass of classes){
  const group=createPreviewCannonRefit(shipClass,'cannons-steel');
  assert.equal(group.children.length,2,'all six casings and collars must use two meshes');
  const [casings,collars]=group.children as T.Mesh[];
  assert.equal(casings.name,'shipyard-cannon-casings');
  assert.equal(collars.name,'shipyard-cannon-bands');
  assert.ok(casings.geometry instanceof T.BufferGeometry);
  assert.ok(collars.geometry instanceof T.BufferGeometry);
  assert.equal(group.userData.previewOnly,true);
  assert.equal(group.userData.barrelCount,6);
  assert.equal(group.userData.collarsPerBarrel,2);
  assert.equal(group.userData.drawCallObjects,2);
  const bbox=new T.Box3().setFromObject(group);
  assert.ok(bbox.min.x < -2.5 && bbox.max.x > 2.5,'six real outward gun casings');
  assert.ok(bbox.min.z < -1.5 && bbox.max.z > 1.5,'three gun stations per side');
  counts.push(casings.geometry.getAttribute('position').count);
  group.traverse(item=>{
   if(item instanceof T.Mesh){
    item.geometry.dispose();
    (item.material as T.Material).dispose();
   }
  });
 }
 assert.equal(new Set(counts).size,3,'scout/frigate/flagship use separate faceted profiles');
});

test('cannon module tiers produce different shapes and materials, not fake stats',()=>{
 const colors:string[]=[];
 const bandCounts:number[]=[];
 for(const mod of ['cannons-bronze','cannons-steel','cannons-gold'] as const){
  const refit=createPreviewCannonRefit('fighter',mod);
  const [body,bands]=refit.children as T.Mesh[];
  colors.push((body.material as T.MeshStandardMaterial).color.getHexString());
  bandCounts.push(bands.geometry.getAttribute('position').count);
  assert.equal(refit.userData.cannonModule,mod);
  assert.equal(refit.userData.previewOnly,true);
 }
 assert.equal(new Set(colors).size,3,'bronze, steel and admiral colours differ');
 assert.ok(bandCounts[0]<bandCounts[1] && bandCounts[1]<bandCounts[2],
  'admiral tier gains extra original three-dimensional reinforcement hoops');
 assert.equal(equipAccess('cannons-gold',1,new Set(['cannons-gold'])),'level-locked');
 assert.equal(equipAccess('cannons-gold',17),'ownership-unverified');
});

test('replacing preview cannon refits disposes GPU assets once and leaves battle guns untouched',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const originalGun=new T.Group();
 originalGun.name='battle-gun-do-not-edit';
 originalGun.position.set(2.04,1.56,0);
 root.add(originalGun);
 const first=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 const refit=first.getObjectByName('shipyard-scout-cannons-bronze-refit') as T.Group;
 assert.ok(refit);
 const body=refit.getObjectByName('shipyard-cannon-casings') as T.Mesh;
 const bands=refit.getObjectByName('shipyard-cannon-bands') as T.Mesh;
 let bodyGeoDisposed=0,bandGeoDisposed=0,bodyMatDisposed=0,bandMatDisposed=0;
 body.geometry.addEventListener('dispose',()=>bodyGeoDisposed++);
 bands.geometry.addEventListener('dispose',()=>bandGeoDisposed++);
 (body.material as T.Material).addEventListener('dispose',()=>bodyMatDisposed++);
 (bands.material as T.Material).addEventListener('dispose',()=>bandMatDisposed++);
 const upgraded=applyShipModules(root,rig,{
  shipClass:'warship',level:17,modules:{cannons:'cannons-gold'}
 });
 assert.ok(upgraded.getObjectByName('shipyard-warship-cannons-gold-refit'));
 assert.equal(root.getObjectByName('battle-gun-do-not-edit'),originalGun);
 assert.deepEqual(originalGun.position.toArray(),[2.04,1.56,0]);
 assert.equal(bodyGeoDisposed,1);
 assert.equal(bandGeoDisposed,1);
 assert.equal(bodyMatDisposed,1);
 assert.equal(bandMatDisposed,1);
 assert.equal(root.children.filter(x=>x.name==='modular-ship-accessories').length,1);
 assert.equal(upgraded.userData.previewOnly,true);
});
