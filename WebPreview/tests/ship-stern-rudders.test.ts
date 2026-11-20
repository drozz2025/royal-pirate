import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewSternRudder } from '../src/ship-stern-rudders.ts';
import { applyShipModules, equipAccess, highestUnlockedPreviewModules } from '../src/ship-modules.ts';

const CLASSES=['scout','fighter','warship'] as const;
const HULLS=['hull-oak','hull-ironwood','hull-royal'] as const;

test('all nine original rudder sculptures have 3D depth, finite vertices and two batched draws',()=>{
 const seen=new Set<string>();
 for(const shipClass of CLASSES){
  const tierVertexCounts:number[]=[];
  for(const hull of HULLS){
   const group=createPreviewSternRudder(shipClass,hull);
   assert.equal(group.name,'shipyard-'+shipClass+'-'+hull+'-stern-rudder');
   assert.equal(group.userData.previewOnly,true);
   assert.equal(group.children.length,2);
   assert.equal(group.userData.drawCallObjects,2);
   const hingeCount={scout:2,fighter:3,warship:4}[shipClass];
   assert.equal(group.userData.hingeCount,hingeCount);
   const bounds=new T.Box3().setFromObject(group);
   assert.ok(bounds.min.y<0 && bounds.max.y<1.9,'solid rudder extends below the waterline');
   assert.ok(bounds.min.z<-5.4 && bounds.max.z< -4.6,'rudder is at the stern');
   assert.ok(bounds.max.x<.36 && bounds.min.x>-.36,'blade remains on centerline');
   let vertices=0,triangles=0;
   for(const mesh of group.children){
    assert.ok(mesh instanceof T.Mesh);
    assert.ok(mesh.material instanceof T.MeshStandardMaterial);
    const position=mesh.geometry.getAttribute('position');
    assert.ok(position.count>60,'physical 3D blade and hinges, not a decal');
    for(let i=0;i<position.count;i++){
     assert.ok(Number.isFinite(position.getX(i)));
     assert.ok(Number.isFinite(position.getY(i)));
     assert.ok(Number.isFinite(position.getZ(i)));
    }
    vertices+=position.count;
    triangles+=(mesh.geometry.index?.count??position.count)/3;
    mesh.geometry.dispose();mesh.material.dispose();
   }
   assert.ok(vertices>300 && vertices<9000,'bounded vertex count for mobile');
   assert.ok(triangles<6000,'bounded triangle count for mobile');
   tierVertexCounts.push(vertices);
   seen.add(shipClass+':'+hull+':'+vertices);
  }
  assert.ok(tierVertexCounts[0]<tierVertexCounts[1]);
  assert.ok(tierVertexCounts[1]<tierVertexCounts[2]);
 }
 assert.equal(seen.size,9);
 assert.throws(()=>createPreviewSternRudder('ghost' as 'scout','hull-oak'),/Unknown ship class/);
 assert.throws(()=>createPreviewSternRudder('scout','ghost' as 'hull-oak'),/Unknown hull module/);
});

test('changing ship class and hull refit disposes previous preview-only rudder exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 const old=first.getObjectByName('shipyard-scout-hull-oak-stern-rudder') as T.Group;
 assert.ok(old);
 let geometryDisposals=0,materialDisposals=0;
 for(const mesh of old.children){
  (mesh as T.Mesh).geometry.addEventListener('dispose',()=>geometryDisposals++);
  ((mesh as T.Mesh).material as T.Material).addEventListener('dispose',()=>materialDisposals++);
 }
 const next=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{hull:'hull-royal'}
 });
 assert.equal(geometryDisposals,2);
 assert.equal(materialDisposals,2);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
 assert.equal(rig.children.length,0,'battle rig is not modified');
 assert.ok(next.getObjectByName('shipyard-warship-hull-royal-stern-rudder'));
 assert.equal(next.getObjectByName(old.name),undefined);
});

test('all 60 class/level editor previews have a rudder without granting actual inventory',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of CLASSES)for(let level=1;level<=20;level++){
  const modules=highestUnlockedPreviewModules(level);
  const accessories=applyShipModules(root,rig,{shipClass,level,modules});
  assert.ok(accessories.getObjectByName('shipyard-'+shipClass+'-'+modules.hull+'-stern-rudder'));
  assert.equal(accessories.userData.previewOnly,true);
  assert.equal(equipAccess(modules.hull,level),'ownership-unverified');
  assert.equal(equipAccess(modules.hull,level,new Set()),'not-owned');
  assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
  assert.ok(accessories.children.length<130,'bounded accessory objects per ship');
 }
});
