import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewDeckRopeCoils } from '../src/ship-deck-rope-coils.ts';
import { applyShipModules, highestUnlockedPreviewModules, mayEquip } from '../src/ship-modules.ts';

const CLASSES=['scout','fighter','warship'] as const;
const MASTS=['masts-standard','masts-raider','masts-royal'] as const;

test('nine class/mast previews create original rope coils and belaying cleats in two draws',()=>{
 const footprints=new Set<string>();
 for(const shipClass of CLASSES){
  const windings:number[]=[];
  for(const masts of MASTS){
   const group=createPreviewDeckRopeCoils(shipClass,masts);
   assert.equal(group.name,'shipyard-'+shipClass+'-'+masts+'-deck-ropes');
   assert.equal(group.children.length,2);
   assert.equal(group.userData.previewOnly,true);
   assert.equal(group.userData.drawCallObjects,2);
   assert.equal(group.userData.ropeStations,shipClass==='scout'?2:shipClass==='fighter'?4:6);
   assert.equal(group.userData.windingsPerStation,masts==='masts-standard'?2:masts==='masts-raider'?3:4);
   let vertices=0,triangles=0,minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity;
   for(const child of group.children){
    assert.ok(child instanceof T.Mesh);
    assert.ok(child.material instanceof T.MeshStandardMaterial);
    const positions=child.geometry.getAttribute('position');
    vertices+=positions.count;
    triangles+=(child.geometry.index?.count??positions.count)/3;
    for(let i=0;i<positions.count;i++){
     const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
     assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
     minX=Math.min(minX,x);maxX=Math.max(maxX,x);
     minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    child.geometry.dispose();child.material.dispose();
   }
   assert.ok(maxY-minY>.20,'real raised cleats and three-dimensional coils');
   assert.ok(maxX-minX>1.3,'coils appear on both sides of the deck');
   assert.ok(vertices>140 && vertices<13000,'bounded mobile vertex budget');
   assert.ok(triangles<8000,'bounded mobile triangle budget');
   windings.push(vertices);
   footprints.add(shipClass+':'+masts+':'+vertices);
  }
  assert.ok(windings[0]<windings[1]);
  assert.ok(windings[1]<windings[2]);
 }
 assert.equal(footprints.size,9);
 assert.throws(()=>createPreviewDeckRopeCoils('unknown' as 'scout','masts-standard'),/Unknown ship class/);
 assert.throws(()=>createPreviewDeckRopeCoils('scout','unknown' as 'masts-standard'),/Unknown mast module/);
});

test('working ropes dispose correctly when the isolated fleet preview is refitted',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 const coils=first.getObjectByName('shipyard-scout-masts-standard-deck-ropes') as T.Group;
 assert.ok(coils);
 let geometriesDisposed=0,materialsDisposed=0;
 for(const child of coils.children){
  const mesh=child as T.Mesh;
  mesh.geometry.addEventListener('dispose',()=>geometriesDisposed++);
  (mesh.material as T.Material).addEventListener('dispose',()=>materialsDisposed++);
 }
 const next=applyShipModules(root,rig,{shipClass:'warship',level:20,
  modules:{masts:'masts-royal'}});
 assert.equal(geometriesDisposed,2);
 assert.equal(materialsDisposed,2);
 assert.ok(next.getObjectByName('shipyard-warship-masts-royal-deck-ropes'));
 assert.equal(root.children.filter(child=>child.name==='modular-ship-accessories').length,1);
 assert.equal(rig.children.length,0,'battle rig is untouched');
});

test('all sixty class/level refits do not create module or hull ownership',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of CLASSES)for(let level=1;level<=20;level++){
  const modules=highestUnlockedPreviewModules(level);
  const preview=applyShipModules(root,rig,{shipClass,level,modules});
  assert.ok(preview.getObjectByName('shipyard-'+shipClass+'-'+modules.masts+'-deck-ropes'));
  assert.equal(preview.userData.previewOnly,true);
  assert.equal(mayEquip(modules.masts,level,new Set()),false);
  assert.equal(root.children.filter(x=>x.name==='modular-ship-accessories').length,1);
  assert.ok(preview.children.length<130,'mobile preview child-object budget');
 }
});
