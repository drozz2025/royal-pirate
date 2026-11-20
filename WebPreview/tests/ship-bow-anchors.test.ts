import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewBowAnchors } from '../src/ship-bow-anchors.ts';
import { applyShipModules, highestUnlockedPreviewModules, mayEquip } from '../src/ship-modules.ts';

const CLASSES=['scout','fighter','warship'] as const;
const HULLS=['hull-oak','hull-ironwood','hull-royal'] as const;

test('9 class/hull permutations have physical low-poly anchors batched into two draws',()=>{
 const variants=new Set<string>();
 for(const shipClass of CLASSES){
  const verticesByHull:number[]=[];
  for(const hull of HULLS){
   const group=createPreviewBowAnchors(shipClass,hull);
   assert.equal(group.name,'shipyard-'+shipClass+'-'+hull+'-bow-anchors');
   assert.equal(group.children.length,2);
   assert.equal(group.userData.previewOnly,true);
   assert.equal(group.userData.drawCallObjects,2);
   assert.equal(group.userData.anchors,shipClass==='scout'?1:2);
   assert.equal(group.userData.chainLinks,(shipClass==='scout'?3:shipClass==='fighter'?4:5)*group.userData.anchors);
   let vertices=0,faces=0,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
   for(const child of group.children){
    assert.ok(child instanceof T.Mesh);
    assert.ok(child.material instanceof T.MeshStandardMaterial);
    const position=child.geometry.getAttribute('position');
    vertices+=position.count;
    faces+=(child.geometry.index?.count??position.count)/3;
    for(let i=0;i<position.count;i++){
     const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
     assert.ok([x,y,z].every(Number.isFinite));
     minY=Math.min(minY,y);maxY=Math.max(maxY,y);
     minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
    }
    child.geometry.dispose();
    child.material.dispose();
   }
   assert.ok(maxY-minY>.75,'real 3D vertical chain and anchor');
   assert.ok(maxZ-minZ>.7,'forged flukes and cross-stock have depth');
   assert.ok(vertices>250 && vertices<10000,'bounded mobile GPU vertex budget');
   assert.ok(faces<7000,'bounded mobile GPU triangle budget');
   verticesByHull.push(vertices);
   variants.add(shipClass+':'+hull+':'+vertices);
  }
  assert.ok(verticesByHull[0]<verticesByHull[1]);
  assert.ok(verticesByHull[1]<verticesByHull[2]);
 }
 assert.equal(variants.size,9);
 assert.throws(()=>createPreviewBowAnchors('invalid' as 'scout','hull-oak'),/Unknown ship class/);
 assert.throws(()=>createPreviewBowAnchors('scout','invalid' as 'hull-oak'),/Unknown hull module/);
});

test('bow anchors remain editor accessories and dispose exactly once on fleet refit',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 const anchors=first.getObjectByName('shipyard-scout-hull-oak-bow-anchors') as T.Group;
 assert.ok(anchors);
 const geometries=anchors.children.map(x=>(x as T.Mesh).geometry);
 const materials=anchors.children.map(x=>(x as T.Mesh).material as T.Material);
 let disposedGeometries=0,disposedMaterials=0;
 geometries.forEach(g=>g.addEventListener('dispose',()=>disposedGeometries++));
 materials.forEach(m=>m.addEventListener('dispose',()=>disposedMaterials++));
 const next=applyShipModules(root,rig,{shipClass:'warship',level:20,
  modules:{hull:'hull-royal'}});
 assert.equal(disposedGeometries,2);
 assert.equal(disposedMaterials,2);
 assert.ok(next.getObjectByName('shipyard-warship-hull-royal-bow-anchors'));
 assert.equal(root.children.filter(x=>x.name==='modular-ship-accessories').length,1);
 assert.equal(rig.children.length,0,'combat rig is not edited');
});

test('60 level/class editor previews never imply ship or module ownership',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of CLASSES)for(let level=1;level<=20;level++){
  const modules=highestUnlockedPreviewModules(level);
  const accessories=applyShipModules(root,rig,{shipClass,level,modules});
  const anchors=accessories.getObjectByName('shipyard-'+shipClass+'-'+modules.hull+'-bow-anchors');
  assert.ok(anchors);
  assert.equal(accessories.userData.previewOnly,true);
  assert.equal(mayEquip(modules.hull,level,new Set()),false);
  assert.equal(root.children.filter(x=>x.name==='modular-ship-accessories').length,1);
  assert.ok(accessories.children.length<130);
 }
});
