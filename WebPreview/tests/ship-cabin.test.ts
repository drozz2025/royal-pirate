import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewCabinGallery } from '../src/ship-cabin.ts';
import { applyShipModules, highestUnlockedPreviewModules, validateOwnedFleetForPlayer } from '../src/ship-modules.ts';

const classes=['scout','fighter','warship'] as const;
const cabins=['cabin-wood','cabin-raised','cabin-palace'] as const;

test('all three classes have original, bounded single-mesh cabin designs',()=>{
 const signatures=new Set<number>();
 for(const cls of classes){
  const gallery=createPreviewCabinGallery(cls,'cabin-wood');
  const pos=gallery.geometry.getAttribute('position');
  assert.equal(gallery.children.length,0);
  assert.equal(gallery.userData.drawCallObjects,1);
  assert.equal(gallery.userData.previewOnly,true);
  assert.equal(gallery.userData.shipClass,cls);
  assert.ok(gallery.userData.primitivesMerged>=4);
  assert.ok(pos.count>50);
  assert.ok(pos.count<5500,'premium details must remain low-poly on mobile');
  signatures.add(pos.count);
  for(let i=0;i<pos.count;i++){
   assert.ok(Number.isFinite(pos.getX(i)));
   assert.ok(Number.isFinite(pos.getY(i)));
   assert.ok(Number.isFinite(pos.getZ(i)));
  }
  gallery.geometry.dispose();
  (gallery.material as T.Material).dispose();
 }
 assert.equal(signatures.size,3,'classes need distinctive geometry, not resized clones');
});

test('raised and palace cabin upgrades change actual 3D geometry',()=>{
 for(const cls of classes){
  const meshCounts=cabins.map(cabin=>{
   const m=createPreviewCabinGallery(cls,cabin);
   assert.equal(m.userData.cabinModule,cabin);
   assert.equal(m.material instanceof T.MeshStandardMaterial,true);
   const count=m.geometry.getAttribute('position').count;
   m.geometry.dispose();
   (m.material as T.Material).dispose();
   return count;
  });
  assert.ok(meshCounts[0]<meshCounts[1]);
  assert.ok(meshCounts[1]<meshCounts[2]);
 }
 assert.throws(()=>createPreviewCabinGallery('unknown' as 'scout','cabin-wood'),/Unknown preview ship class/);
 assert.throws(()=>createPreviewCabinGallery('scout','cabin-fake' as 'cabin-wood'),/Unknown preview cabin module/);
});

test('all 60 class/level changes keep one disposable cabin mesh, not stacked geometry',()=>{
 const root=new T.Group(),rig=new T.Group();
 root.add(rig);
 let last:T.Mesh|undefined;
 for(const cls of classes)for(let level=1;level<=20;level++){
  const modules=highestUnlockedPreviewModules(level);
  const group=applyShipModules(root,rig,{shipClass:cls,level,modules});
  const galleries=group.children.filter(o=>o.name.endsWith('-cabin-gallery'));
  assert.equal(galleries.length,1);
  assert.equal(group.children.length<125,true,'existing mobile mesh budget');
  assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
  assert.equal(rig.children.length,0,'preview must not mutate combat rig');
  if(last)assert.equal(last.userData.disposalCount(),1);
  last=galleries[0] as T.Mesh;
  let disposalCount=0;
  last.geometry.addEventListener('dispose',()=>disposalCount++);
  last.userData.disposalCount=()=>disposalCount;
 }
 applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(last?.userData.disposalCount(),1);
});

test('visual palace unlock does not grant cabin or ship ownership',()=>{
 const loadout={shipClass:'warship' as const,level:20,modules:{cabin:'cabin-palace'}};
 const resolved=highestUnlockedPreviewModules(20);
 assert.equal(resolved.cabin,'cabin-palace');
 const all=new Set(Object.values(resolved));
 assert.throws(()=>validateOwnedFleetForPlayer(loadout,all,20,new Set(['scout' as const])),/missing verified fleet ownership/);
 assert.throws(()=>validateOwnedFleetForPlayer(loadout,new Set(['cabin-palace']),20,new Set(['warship' as const])),/missing verified ownership/);
 assert.throws(()=>validateOwnedFleetForPlayer(loadout,all,1,new Set(['warship' as const])),/does not match verified player level/);
 assert.equal(validateOwnedFleetForPlayer(loadout,new Set(Object.values({
  ...resolved,
  ...{hull:'hull-oak',sails:'sails-cream',cannons:'cannons-bronze',armor:'armor-none',figurehead:'figurehead-anchor',flag:'flag-navy',masts:'masts-standard',ornaments:'ornaments-simple'}
 })),20,new Set(['warship' as const])).modules.cabin,'cabin-palace');
});
