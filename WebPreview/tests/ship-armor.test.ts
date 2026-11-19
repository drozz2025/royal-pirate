import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewArmour } from '../src/ship-armor.ts';
import { applyShipModules, highestUnlockedPreviewModules, resolveLoadout, validateOwnedFleetForPlayer } from '../src/ship-modules.ts';

const classes = ['scout','fighter','warship'] as const;

test('bare hulls receive no forged armour geometry; invalid data is rejected', () => {
 for(const shipClass of classes)
  assert.equal(createPreviewArmour(shipClass,'armor-none'),null);
 assert.throws(() => createPreviewArmour('unknown' as 'scout','armor-iron'),/Unknown preview ship class/);
 assert.throws(() => createPreviewArmour('scout','armor-fake' as 'armor-iron'),/Unknown preview armour module/);
});

test('each original hull silhouette has distinct fused 3D iron and royal shields', () => {
 const fingerprints=new Set<number>();
 for(const shipClass of classes){
  const iron=createPreviewArmour(shipClass,'armor-iron')!;
  const royal=createPreviewArmour(shipClass,'armor-royal')!;
  assert.ok(iron instanceof T.Mesh);
  assert.ok(royal instanceof T.Mesh);
  assert.equal(iron.children.length,0,'all plates use one draw-call mesh');
  assert.equal(royal.children.length,0,'embossing must not add draw calls');
  assert.equal(iron.userData.drawCallObjects,1);
  assert.equal(royal.userData.drawCallObjects,1);
  assert.equal(iron.userData.previewOnly,true);
  assert.equal(iron.userData.shipClass,shipClass);
  assert.equal(iron.userData.panelCount,royal.userData.panelCount);
  assert.equal(iron.userData.primitivesMerged,iron.userData.panelCount);
  assert.equal(royal.userData.primitivesMerged,iron.userData.panelCount*2,
   'royal plating uses raised crests, not only a recolour');
  const ironPositions=iron.geometry.getAttribute('position');
  const royalPositions=royal.geometry.getAttribute('position');
  assert.ok(ironPositions.count>40);
  assert.ok(royalPositions.count>ironPositions.count);
  assert.ok(royalPositions.count<4000,'one preview remains bounded for mobile');
  fingerprints.add(ironPositions.count);
  for(const mesh of [iron,royal]){
   const positions=mesh.geometry.getAttribute('position');
   for(let i=0;i<positions.count;i++){
    assert.ok(Number.isFinite(positions.getX(i)));
    assert.ok(Number.isFinite(positions.getY(i)));
    assert.ok(Number.isFinite(positions.getZ(i)));
   }
   assert.ok(mesh.material instanceof T.MeshStandardMaterial);
   mesh.geometry.dispose();
   (mesh.material as T.Material).dispose();
  }
 }
 assert.equal(fingerprints.size,3,'scout, fighter and warship have distinct plate meshes');
});

test('all 20 demo levels and 3 hulls replace one isolated shield without accumulating meshes', () => {
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 let old:T.Mesh|undefined;
 for(const shipClass of classes)for(let level=1;level<=20;level++){
  const modules=highestUnlockedPreviewModules(level);
  const accessories=applyShipModules(root,rig,{shipClass,level,modules});
  const current=accessories.children.filter(o=>o.name.includes('-plating'));
  assert.equal(current.length,level<7?0:1,'armour is locked until level 7');
  assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
  assert.equal(rig.children.length,0,'preview armour cannot change combat rig');
  assert.ok(accessories.children.length<125,'mobile draw-call accessory budget');
  if(old){
   assert.equal(old.userData.disposalCount(),1,'retired shield is disposed exactly once');
   assert.equal(old.userData.materialDisposeCount(),1);
  }
  old=current[0] as T.Mesh|undefined;
  if(old){
   let geometryDisposals=0,materialDisposals=0;
   old.geometry.addEventListener('dispose',()=>geometryDisposals++);
   (old.material as T.Material).addEventListener('dispose',()=>materialDisposals++);
   old.userData.disposalCount=()=>geometryDisposals;
   old.userData.materialDisposeCount=()=>materialDisposals;
  }
 }
 applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 if(old){
  assert.equal(old.userData.disposalCount(),1);
  assert.equal(old.userData.materialDisposeCount(),1);
 }
});

test('royal visual preview does not supply ownership or ability to equip', () => {
 const loadout=resolveLoadout({
  shipClass:'warship',level:20,modules:{armor:'armor-royal'}
 });
 const ownedIds=new Set(Object.values(loadout.modules));
 assert.throws(
  () => validateOwnedFleetForPlayer(loadout,ownedIds,20,new Set(['scout'])),
  /missing verified fleet ownership/
 );
 assert.throws(
  () => validateOwnedFleetForPlayer(loadout,new Set(['armor-iron']),20,new Set(['warship'])),
  /missing verified ownership/
 );
 assert.equal(validateOwnedFleetForPlayer(loadout,ownedIds,20,new Set(['warship'])).modules.armor,'armor-royal');
});
