import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewDeckCapstans } from '../src/ship-deck-capstans.ts';
import {
 applyShipModules, highestUnlockedPreviewModules, mayEquip
} from '../src/ship-modules.ts';

const CLASSES = ['scout','fighter','warship'] as const;
const TIERS = ['ornaments-simple','ornaments-lanterns','ornaments-legendary'] as const;

test('three ship classes x three ornament tiers have original real low-poly capstans',()=>{
 const variants=new Set<string>();
 for(const shipClass of CLASSES){
  const tierVertexCounts:number[]=[];
  for(const ornaments of TIERS){
   const group=createPreviewDeckCapstans(shipClass,ornaments);
   assert.equal(group.children.length,2,'timber and metal are each GPU batched');
   assert.equal(group.userData.previewOnly,true);
   assert.equal(group.userData.drawCallObjects,2);
   assert.equal(group.userData.capstans,shipClass==='warship'?2:1);
   assert.equal(group.userData.spokesPerCapstan,
    shipClass==='scout'?4:shipClass==='fighter'?6:8);
   let vertices=0,faces=0;
   for(const child of group.children){
    assert.ok(child instanceof T.Mesh);
    assert.ok(child.material instanceof T.MeshStandardMaterial);
    const pos=child.geometry.getAttribute('position');
    assert.ok(pos && pos.count>0);
    vertices+=pos.count;
    faces+=(child.geometry.index?.count??pos.count)/3;
    for(let i=0;i<pos.count;i++)
     assert.ok(Number.isFinite(pos.getX(i))&&Number.isFinite(pos.getY(i))&&Number.isFinite(pos.getZ(i)));
    child.geometry.dispose();
    (child.material as T.Material).dispose();
   }
   assert.ok(vertices<5000,'two capstans remain inside mobile preview vertex budget');
   assert.ok(faces<3000,'bounded primitive face count');
   tierVertexCounts.push(vertices);
   variants.add(shipClass+'-'+ornaments+'-'+vertices);
  }
  assert.ok(tierVertexCounts[0]<tierVertexCounts[1]);
  assert.ok(tierVertexCounts[1]<tierVertexCounts[2]);
 }
 assert.equal(variants.size,9);
 assert.throws(()=>createPreviewDeckCapstans('invalid' as 'scout','ornaments-simple'),/Unknown preview ship/);
 assert.throws(()=>createPreviewDeckCapstans('scout','invalid' as 'ornaments-simple'),/Unknown preview ornaments/);
});

test('capstans attach only to temporary editor accessories and dispose on refit',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const start=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 const first=start.getObjectByName('shipyard-scout-ornaments-simple-deck-capstans') as T.Group;
 assert.ok(first);
 assert.equal(first.children.length,2);
 assert.equal(rig.children.length,0,'combat rig must remain unchanged');
 const geometries=first.children.map(x=>(x as T.Mesh).geometry);
 const materials=first.children.map(x=>(x as T.Mesh).material as T.Material);
 let geometryDisposals=0,materialDisposals=0;
 geometries.forEach(x=>x.addEventListener('dispose',()=>geometryDisposals++));
 materials.forEach(x=>x.addEventListener('dispose',()=>materialDisposals++));
 const after=applyShipModules(root,rig,{
  shipClass:'warship',level:19,modules:{ornaments:'ornaments-legendary'}
 });
 assert.equal(geometryDisposals,2);
 assert.equal(materialDisposals,2);
 assert.equal(after.getObjectByName('shipyard-warship-ornaments-legendary-deck-capstans')?.userData.capstans,2);
 assert.equal(root.children.filter(x=>x.name==='modular-ship-accessories').length,1);
 assert.equal(rig.children.length,0);
});

test('all 60 preview level/class combinations show capstans but never create ownership',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of CLASSES)for(let level=1;level<=20;level++){
  const modules=highestUnlockedPreviewModules(level);
  const additions=applyShipModules(root,rig,{shipClass,level,modules});
  const capstans=additions.getObjectByName('shipyard-'+shipClass+'-'+modules.ornaments+'-deck-capstans');
  assert.ok(capstans,'ornamental capstan must follow the unlocked preview tier');
  assert.ok(additions.children.length<125,'mobile object budget');
  assert.equal(additions.userData.previewOnly,true);
  assert.equal(mayEquip(modules.ornaments,level,new Set()),false,'level unlock is not actual possession');
  assert.equal(root.children.filter(x=>x.name==='modular-ship-accessories').length,1);
 }
});
