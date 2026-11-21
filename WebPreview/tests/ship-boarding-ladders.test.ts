import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewBoardingLadders } from '../src/ship-boarding-ladders.ts';
import { applyShipModules, equipAccess, highestUnlockedPreviewModules } from '../src/ship-modules.ts';
import type { ShipClass } from '../src/ship-modules.ts';
import type { PreviewMastModule } from '../src/ship-rigging.ts';

const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const MASTS:readonly PreviewMastModule[]=['masts-standard','masts-raider','masts-royal'];

test('nine original 3D boarding-rig configurations have class and tier-specific actual geometry',()=>{
 for(const shipClass of CLASSES)for(const mast of MASTS){
  const ladders=createPreviewBoardingLadders(shipClass,mast);
  const expected={scout:2,fighter:4,warship:6}[shipClass];
  assert.equal(ladders.userData.previewOnly,true);
  assert.equal(ladders.userData.boardingLadderCount,expected);
  assert.equal(ladders.userData.drawCallObjects,2);
  assert.equal(ladders.children.length,2,'two batched GPU draw objects, not one mesh per rung');
  const tier=MASTS.indexOf(mast);
  assert.equal(ladders.userData.rungCountPerLadder,
   (shipClass==='scout'?4:shipClass==='fighter'?5:6)+tier);
  let vertexCount=0;
  for(const child of ladders.children){
   assert.ok(child instanceof T.Mesh,'the rope and wooden components are 3D');
   const geometry=(child as T.Mesh).geometry;
   const positions=geometry.getAttribute('position');
   assert.ok(positions.count>35,'real thickness on ropes, cleats and planks');
   vertexCount+=positions.count;
   for(let i=0;i<positions.count;i++){
    assert.ok(Number.isFinite(positions.getX(i)));
    assert.ok(Number.isFinite(positions.getY(i)));
    assert.ok(Number.isFinite(positions.getZ(i)));
   }
   assert.ok(geometry.boundingSphere?.radius);
  }
  assert.ok(vertexCount<15000,'bounded mobile vertex budget');
  const bounds=new T.Box3().setFromObject(ladders);
  assert.ok(bounds.min.y>0.5&&bounds.max.y<3.1,'ladders clear sails and waterline');
  assert.ok(bounds.min.z>-3&&bounds.max.z<3,'stays clear of bow and aft cabin');
 }
 assert.throws(()=>createPreviewBoardingLadders('ghost' as ShipClass,'masts-standard'),/Unknown ship class/);
 assert.throws(()=>createPreviewBoardingLadders('scout','masts-fake' as PreviewMastModule),/Unknown mast module/);
});

test('replacement retires 3D rope and timber GPU resources once without stacking accessories',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const before=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{masts:'masts-royal'}
 });
 const old=before.getObjectByName('shipyard-warship-masts-royal-boarding-ladders') as T.Group;
 assert.ok(old);
 const plank=old.children[0] as T.Mesh;
 let geometryDisposals=0,materialDisposals=0;
 plank.geometry.addEventListener('dispose',()=>geometryDisposals++);
 (plank.material as T.Material).addEventListener('dispose',()=>materialDisposals++);
 const after=applyShipModules(root,rig,{
  shipClass:'scout',level:1,modules:{masts:'masts-standard'}
 });
 assert.equal(geometryDisposals,1);
 assert.equal(materialDisposals,1);
 assert.equal(root.children.filter(child=>child.name==='modular-ship-accessories').length,1);
 assert.equal(after.getObjectByName('shipyard-warship-masts-royal-boarding-ladders'),undefined);
 assert.ok(after.getObjectByName('shipyard-scout-masts-standard-boarding-ladders'));
});

test('all 20 levels across three classes show preview ladders without earning or buying them',()=>{
 for(let level=1;level<=20;level++){
  const mast=highestUnlockedPreviewModules(level).masts as PreviewMastModule;
  for(const shipClass of CLASSES){
   const root=new T.Group(),rig=new T.Group();root.add(rig);
   const accessories=applyShipModules(root,rig,{shipClass,level,modules:{masts:mast}});
   assert.ok(accessories.getObjectByName('shipyard-'+shipClass+'-'+mast+'-boarding-ladders'));
   assert.ok(accessories.children.length<125,'bounded preview draw budget');
  }
  assert.equal(equipAccess(mast,level),'ownership-unverified');
  assert.equal(equipAccess(mast,level,new Set()),'not-owned');
 }
});
