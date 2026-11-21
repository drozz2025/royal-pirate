import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewSternLanterns } from '../src/ship-stern-lanterns.ts';
import { applyShipModules } from '../src/ship-modules.ts';

const classes=['scout','fighter','warship'] as const;
const ornamentTiers=['ornaments-simple','ornaments-lanterns','ornaments-legendary'] as const;

test('all nine class/ornament variants are physical three-batch stern lanterns',()=>{
 for(const [index,shipClass] of classes.entries()){
  for(const ornamentModule of ornamentTiers){
   const group=createPreviewSternLanterns(shipClass,ornamentModule);
   assert.equal(group.userData.lanternCount,index+1);
   assert.equal(group.userData.previewOnly,true);
   assert.equal(group.userData.usesDynamicLights,false);
   assert.equal(group.children.length,3);
   assert.equal(group.userData.drawCallObjects,3);
   assert.ok(group.children.every(item=>item instanceof T.Mesh));
   assert.equal(group.getObjectByName('stern-lantern-open-cages') instanceof T.Mesh,true);
   assert.equal(group.getObjectByName('stern-lantern-finials') instanceof T.Mesh,true);
   assert.ok(group.children.every(item=>(item as T.Mesh).geometry.boundingSphere));
   assert.equal(group.getObjectByProperty('type','PointLight'),undefined);
   const glass=group.getObjectByName('stern-lantern-amber-glass') as T.Mesh;
   const material=glass.material as T.MeshStandardMaterial;
   assert.equal(material.emissiveIntensity,ornamentModule==='ornaments-simple'?0:ornamentModule==='ornaments-lanterns'?.55:1.05);
   // A filled glass prism has real triangles, unlike a flat sprite.
   assert.ok(glass.geometry.getAttribute('position').count>=index*24);
  }
 }
});

test('legendary lantern crowns have more true 3D finials, but no extra draw calls',()=>{
 for(const shipClass of classes){
  const simple=createPreviewSternLanterns(shipClass,'ornaments-simple');
  const legendary=createPreviewSternLanterns(shipClass,'ornaments-legendary');
  assert.ok(legendary.userData.finialCount>simple.userData.finialCount);
  assert.equal(legendary.children.length,simple.children.length);
  assert.ok((legendary.getObjectByName('stern-lantern-finials') as T.Mesh)
   .geometry.getAttribute('position').count>
   (simple.getObjectByName('stern-lantern-finials') as T.Mesh)
   .geometry.getAttribute('position').count);
 }
});

test('bad classes and ornament IDs fail closed',()=>{
 assert.throws(()=>createPreviewSternLanterns('ghost' as 'scout','ornaments-simple'),/Unknown ship class/);
 assert.throws(()=>createPreviewSternLanterns('scout','ornaments-unknown' as 'ornaments-simple'),/Unknown ornament module/);
});

test('refitting releases the old lantern GPU geometry exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:20,
  modules:{ornaments:'ornaments-legendary'}});
 const previous=first.getObjectByName('shipyard-warship-ornaments-legendary-stern-lanterns') as T.Group;
 assert.ok(previous);
 let disposed=0;
 const geometry=(previous.getObjectByName('stern-lantern-open-cages') as T.Mesh).geometry;
 geometry.addEventListener('dispose',()=>disposed++);
 const next=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(disposed,1);
 assert.equal(root.children.filter(child=>child.name==='modular-ship-accessories').length,1);
 assert.ok(next.getObjectByName('shipyard-scout-ornaments-simple-stern-lanterns'));
 assert.equal(next.getObjectByName('shipyard-warship-ornaments-legendary-stern-lanterns'),undefined);
 assert.ok(next.children.length<130,'bounded mobile accessory draw budget');
});

test('all 20 levels, three classes, and ornament gates remain visual-only',()=>{
 for(const shipClass of classes){
  const root=new T.Group(),rig=new T.Group();root.add(rig);
  for(let level=1;level<=20;level++){
   const ornamentModule=level>=19?'ornaments-legendary':level>=8?'ornaments-lanterns':'ornaments-simple';
   const next=applyShipModules(root,rig,{shipClass,level,modules:{ornaments:ornamentModule}});
   const lanterns=next.getObjectByName('shipyard-'+shipClass+'-'+ornamentModule+'-stern-lanterns');
   assert.ok(lanterns);
   assert.equal(lanterns.userData.previewOnly,true);
   assert.equal(root.children.filter(child=>child.name==='modular-ship-accessories').length,1);
  }
 }
});
