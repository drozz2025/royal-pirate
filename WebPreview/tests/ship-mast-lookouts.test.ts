import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPreviewMastLookouts} from '../src/ship-mast-lookouts.ts';
import {applyShipModules,highestUnlockedPreviewModules,mayEquip} from '../src/ship-modules.ts';

test('3 original classes × 3 mast modules build distinct 3D crow nests with two merged draws',()=>{
 const geometrySignatures=new Set<string>();
 for(const shipClass of ['scout','fighter','warship'] as const){
  for(const mastModule of ['masts-standard','masts-raider','masts-royal'] as const){
   const lookout=createPreviewMastLookouts(shipClass,mastModule);
   assert.equal(lookout.children.length,2,'wood and rail must be GPU batched');
   assert.equal(lookout.userData.previewOnly,true);
   assert.equal(lookout.userData.platformCount,mastModule==='masts-royal'?4:2);
   assert.equal(lookout.userData.draws,2);
   let allVertices=0,triangles=0;
   for(const child of lookout.children){
    assert.ok(child instanceof T.Mesh);
    const geo=child.geometry;
    const p=geo.getAttribute('position');
    assert.ok(p && p.count>0);
    allVertices+=p.count;triangles+=(geo.index?.count??p.count)/3;
    for(let i=0;i<p.count;i++){
     assert.ok(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));
    }
    assert.ok(child.material instanceof T.MeshStandardMaterial);
   }
   assert.ok(allVertices<7000,'bounded preview-only vertex budget');
   assert.ok(triangles<5000,'bounded low-poly face count');
   geometrySignatures.add(shipClass+':'+mastModule+':'+allVertices);
   lookout.traverse(obj=>{
    if(obj instanceof T.Mesh){obj.geometry.dispose();(obj.material as T.Material).dispose();}
   });
  }
 }
 assert.equal(geometrySignatures.size,9);
 assert.throws(()=>createPreviewMastLookouts('scout','invalid' as 'masts-standard'),/Unknown preview mast/);
});

test('mast lookout refit is isolated from battle rig and disposes both GPU draw resources',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const a=applyShipModules(root,rig,{shipClass:'fighter',level:1,modules:{}});
 const first=a.getObjectByName('shipyard-fighter-masts-standard-lookouts') as T.Group;
 assert.ok(first);
 assert.equal(first.children.length,2);
 assert.equal(rig.children.length,0,'battle rig was not modified');
 const geometries=first.children.map(obj=>(obj as T.Mesh).geometry);
 const materials=first.children.map(obj=>(obj as T.Mesh).material as T.Material);
 let geoDisposed=0,materialDisposed=0;
 for(const g of geometries)g.addEventListener('dispose',()=>geoDisposed++);
 for(const m of materials)m.addEventListener('dispose',()=>materialDisposed++);
 const b=applyShipModules(root,rig,{shipClass:'warship',level:15,modules:{masts:'masts-royal'}});
 assert.equal(geoDisposed,2);assert.equal(materialDisposed,2);
 assert.equal(b.getObjectByName('shipyard-warship-masts-royal-lookouts')?.userData.platformCount,4);
 assert.equal(root.children.filter(obj=>obj.name==='modular-ship-accessories').length,1);
 assert.equal(rig.children.length,0);
});

test('20-level visual mast previews never confer purchased mast or fleet ownership',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const cls of ['scout','fighter','warship'] as const){
  for(let level=1;level<=20;level++){
   const modules=highestUnlockedPreviewModules(level);
   const accessories=applyShipModules(root,rig,{shipClass:cls,level,modules});
   const lookout=accessories.getObjectByName('shipyard-'+cls+'-'+modules.masts+'-lookouts');
   assert.ok(lookout);
   assert.ok(accessories.children.length<125,'mobile accessory object budget');
   assert.equal(accessories.userData.previewOnly,true);
   assert.equal(root.children.filter(obj=>obj.name==='modular-ship-accessories').length,1);
   assert.equal(mayEquip(modules.masts,level,new Set()),false,'unlock alone is never possession');
  }
 }
});
