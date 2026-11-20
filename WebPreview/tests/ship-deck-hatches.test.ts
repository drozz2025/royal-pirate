import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewDeckHatches } from '../src/ship-deck-hatches.ts';
import { applyShipModules, equipAccess, highestUnlockedPreviewModules } from '../src/ship-modules.ts';
import type { ShipClass } from '../src/ship-modules.ts';
import type { PreviewCabinModule } from '../src/ship-cabin.ts';

const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const CABINS:readonly PreviewCabinModule[]=['cabin-wood','cabin-raised','cabin-palace'];

test('nine physical hatch variations retain class profiles in only two batched draws',()=>{
 for(const shipClass of CLASSES)for(const cabin of CABINS){
  const grilles=createPreviewDeckHatches(shipClass,cabin);
  assert.equal(grilles.userData.previewOnly,true);
  assert.equal(grilles.userData.hatchCount,shipClass==='scout'?1:2);
  assert.equal(grilles.userData.drawCallObjects,2);
  assert.equal(grilles.children.length,2);
  let vertices=0;
  for(const child of grilles.children){
   assert.ok(child instanceof T.Mesh);
   const geo=(child as T.Mesh).geometry;
   const positions=geo.getAttribute('position');
   assert.ok(positions.count>40,'real raised coamings, bars, hinges and inlay');
   vertices+=positions.count;
   for(let i=0;i<positions.count;i++){
    assert.ok(Number.isFinite(positions.getX(i)));
    assert.ok(Number.isFinite(positions.getY(i)));
    assert.ok(Number.isFinite(positions.getZ(i)));
   }
   assert.ok(geo.boundingSphere?.radius);
  }
  assert.ok(vertices<8000,'low vertex budget per preview group');
  const bounds=new T.Box3().setFromObject(grilles);
  assert.ok(bounds.min.y>1.9&&bounds.max.y<2.5,'physical grilles remain close to deck');
  assert.ok(bounds.min.x>-1&&bounds.max.x<1,'deck furniture clears gunwale');
  assert.ok(bounds.min.z>-2&&bounds.max.z<2,'avoid stern cabin and bow obstruction');
 }
 assert.throws(()=>createPreviewDeckHatches('ghost' as ShipClass,'cabin-wood'),/Unknown preview ship class/);
 assert.throws(()=>createPreviewDeckHatches('scout','cabin-unknown' as PreviewCabinModule),/Unknown preview cabin module/);
});

test('changing preview cabin tier retires old GPU mesh and materials once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const previous=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{cabin:'cabin-palace'}
 });
 const old=previous.getObjectByName('shipyard-warship-cabin-palace-deck-hatches') as T.Group;
 assert.ok(old);
 const wood=old.children[0] as T.Mesh;
 let geometryDisposals=0,materialDisposals=0;
 wood.geometry.addEventListener('dispose',()=>geometryDisposals++);
 (wood.material as T.Material).addEventListener('dispose',()=>materialDisposals++);
 const replacement=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{cabin:'cabin-wood'}});
 assert.equal(geometryDisposals,1);
 assert.equal(materialDisposals,1);
 assert.equal(root.children.filter(c=>c.name==='modular-ship-accessories').length,1);
 assert.equal(replacement.getObjectByName('shipyard-warship-cabin-palace-deck-hatches'),undefined);
 assert.ok(replacement.getObjectByName('shipyard-scout-cabin-wood-deck-hatches'));
});

test('all 60 level/class previews show a valid cabin hatch without grants or fake inventory',()=>{
 for(let level=1;level<=20;level++){
  const cabin=highestUnlockedPreviewModules(level).cabin as PreviewCabinModule;
  for(const shipClass of CLASSES){
   const root=new T.Group(),rig=new T.Group();root.add(rig);
   const preview=applyShipModules(root,rig,{shipClass,level,modules:{cabin}});
   assert.ok(preview.getObjectByName('shipyard-'+shipClass+'-'+cabin+'-deck-hatches'));
   assert.equal(preview.userData.previewOnly,true);
   assert.ok(preview.children.length<125,'bounded preview draw calls');
  }
  assert.equal(equipAccess(cabin,level),'ownership-unverified');
  assert.equal(equipAccess(cabin,level,new Set<string>()),'not-owned');
 }
});
