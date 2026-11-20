import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewGunportShutters } from '../src/ship-gunport-shutters.ts';
import {
 applyShipModules, equipAccess, highestUnlockedPreviewModules
} from '../src/ship-modules.ts';

const CLASSES=['scout','fighter','warship'] as const;
const CANNONS=['cannons-bronze','cannons-steel','cannons-gold'] as const;

test('nine original gunport refits are physical, symmetric and bounded at two draws',()=>{
 const distinct=new Set<string>();
 for(const shipClass of CLASSES){
  let previousVertices=0;
  for(const cannonModule of CANNONS){
   const group=createPreviewGunportShutters(shipClass,cannonModule);
   assert.equal(group.name,'shipyard-'+shipClass+'-'+cannonModule+'-gunport-shutters');
   assert.equal(group.userData.previewOnly,true);
   assert.equal(group.userData.shutters,6);
   assert.equal(group.userData.drawCallObjects,2);
   assert.equal(group.children.length,2);
   assert.equal(group.userData.boardsPerShutter,
    {scout:1,fighter:2,warship:3}[shipClass]);
   assert.equal(group.userData.hingesPerShutter,
    {scout:1,fighter:2,warship:3}[shipClass]);
   const bbox=new T.Box3().setFromObject(group);
   assert.ok(bbox.min.x< -1.7 && bbox.max.x>1.7,'both gunwales carry shutters');
   assert.ok(bbox.min.y>1.9 && bbox.max.y<2.8,'raised panels clear battle gun mouths');
   assert.ok(bbox.min.z< -1.8 && bbox.max.z>1.8,'three port stations per side');
   let vertices=0,triangles=0;
   for(const child of group.children){
    assert.ok(child instanceof T.Mesh);
    assert.ok(child.material instanceof T.MeshStandardMaterial);
    const geometry=child.geometry, positions=geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){
     assert.ok(Number.isFinite(positions.getX(i)));
     assert.ok(Number.isFinite(positions.getY(i)));
     assert.ok(Number.isFinite(positions.getZ(i)));
    }
    vertices+=positions.count;
    triangles+=(geometry.index?.count??positions.count)/3;
    geometry.dispose();
    child.material.dispose();
   }
   assert.ok(vertices>300 && vertices<13000,'mobile vertex budget');
   assert.ok(triangles<8000,'mobile triangle budget');
   assert.ok(vertices>previousVertices,'forged details increase with refit tier');
   previousVertices=vertices;
   distinct.add(shipClass+':'+cannonModule+':'+vertices);
  }
 }
 assert.equal(distinct.size,9);
 assert.throws(()=>createPreviewGunportShutters('ghost' as 'scout','cannons-bronze'),
  /Unknown ship class/);
 assert.throws(()=>createPreviewGunportShutters('scout','ghost' as 'cannons-bronze'),
  /Unknown cannon module/);
});

test('refitting cannons releases gunport mesh buffers once and never alters the battle rig',()=>{
 const root=new T.Group(),rig=new T.Group();
 root.add(rig);
 const old=applyShipModules(root,rig,{
  shipClass:'scout',level:1,modules:{}
 }).getObjectByName('shipyard-scout-cannons-bronze-gunport-shutters') as T.Group;
 assert.ok(old);
 let geometries=0,materials=0;
 for(const mesh of old.children){
  (mesh as T.Mesh).geometry.addEventListener('dispose',()=>geometries++);
  ((mesh as T.Mesh).material as T.Material).addEventListener('dispose',()=>materials++);
 }
 const next=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{cannons:'cannons-gold'}
 });
 assert.equal(geometries,2);
 assert.equal(materials,2);
 assert.equal(rig.children.length,0);
 assert.ok(next.getObjectByName('shipyard-warship-cannons-gold-gunport-shutters'));
 assert.equal(next.getObjectByName(old.name),undefined);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
});

test('all 60 class/level shipyard variants retain preview-only gunport shutters',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of CLASSES)for(let level=1;level<=20;level++){
  const modules=highestUnlockedPreviewModules(level);
  const accessories=applyShipModules(root,rig,{shipClass,level,modules});
  assert.ok(accessories.getObjectByName(
   'shipyard-'+shipClass+'-'+modules.cannons+'-gunport-shutters'));
  assert.equal(accessories.userData.previewOnly,true);
  assert.equal(equipAccess(modules.cannons,level),'ownership-unverified');
  assert.equal(equipAccess(modules.cannons,level,new Set()),'not-owned');
  assert.ok(accessories.children.length<130,'bounded draw objects in mobile editor');
 }
});
