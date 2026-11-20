import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewBoardingLadders } from '../src/ship-boarding-ladders.ts';
import { applyShipModules, equipAccess, highestUnlockedPreviewModules } from '../src/ship-modules.ts';

const CLASSES=['scout','fighter','warship'] as const;
const HULLS=['hull-oak','hull-ironwood','hull-royal'] as const;

test('nine original physical boarding ladder variants batch into two draw objects',()=>{
 const counts={scout:1,fighter:2,warship:4};
 const steps={scout:5,fighter:6,warship:7};
 for(const shipClass of CLASSES){
  const verticesByTier:number[]=[];
  for(const hull of HULLS){
   const group=createPreviewBoardingLadders(shipClass,hull);
   assert.equal(group.name,'shipyard-'+shipClass+'-'+hull+'-boarding-ladders');
   assert.equal(group.userData.previewOnly,true);
   assert.equal(group.userData.ladderCount,counts[shipClass]);
   assert.equal(group.userData.stepsPerLadder,steps[shipClass]);
   assert.equal(group.userData.drawCallObjects,2);
   assert.equal(group.children.length,2);
   const bounds=new T.Box3().setFromObject(group);
   assert.ok(bounds.min.y>.20&&bounds.max.y<2.65,'ladders follow side planking, not the mast');
   assert.ok(bounds.min.x> -2.15&&bounds.max.x<2.15,'fittings stay close to hull');
   assert.ok(bounds.min.z> -1.7&&bounds.max.z<1.7,'ladder sits between gunports');
   let vertices=0,triangles=0;
   for(const obj of group.children){
    assert.ok(obj instanceof T.Mesh);
    const geo=obj.geometry;
    const pos=geo.getAttribute('position');
    assert.ok(pos.count>24,'solid treads/rails rather than a flat texture');
    assert.ok(geo.boundingSphere && geo.boundingSphere.radius>0);
    for(let i=0;i<pos.count;i++)
     for(const n of [pos.getX(i),pos.getY(i),pos.getZ(i)])
      assert.ok(Number.isFinite(n));
    vertices+=pos.count;
    triangles+=(geo.index?.count??pos.count)/3;
    geo.dispose();(obj.material as T.Material).dispose();
   }
   assert.ok(vertices>200&&vertices<14000,'bounded vertex budget for mobile');
   assert.ok(triangles<10000,'bounded triangle budget for mobile');
   verticesByTier.push(vertices);
  }
  assert.ok(verticesByTier[0]<verticesByTier[1],'reinforced rails add actual forged geometry');
  assert.ok(verticesByTier[1]<verticesByTier[2],'royal hull adds physical rivets and crest');
 }
 assert.throws(()=>createPreviewBoardingLadders('ghost' as 'scout','hull-oak'),/Unknown ship class/);
 assert.throws(()=>createPreviewBoardingLadders('scout','hull-ghost' as 'hull-oak'),/Unknown hull module/);
});

test('replacing shipyard hull disposes boarding ladder GPU assets exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{hull:'hull-royal'}});
 const previous=first.getObjectByName('shipyard-warship-hull-royal-boarding-ladders') as T.Group;
 assert.ok(previous);
 let geometries=0,materials=0;
 for(const obj of previous.children){
  const m=obj as T.Mesh;
  m.geometry.addEventListener('dispose',()=>geometries++);
  (m.material as T.Material).addEventListener('dispose',()=>materials++);
 }
 const replacement=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(geometries,2);
 assert.equal(materials,2);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
 assert.equal(replacement.getObjectByName(previous.name),undefined);
 assert.ok(replacement.getObjectByName('shipyard-scout-hull-oak-boarding-ladders'));
 assert.equal(rig.children.length,0,'no battle rig mutation');
});

test('all 60 class/level previews include correct ladders without inventory grants',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 for(const shipClass of CLASSES)for(let level=1;level<=20;level++){
  const hull=highestUnlockedPreviewModules(level).hull;
  const preview=applyShipModules(root,rig,{
   shipClass,level,modules:{hull}
  });
  assert.ok(preview.getObjectByName('shipyard-'+shipClass+'-'+hull+'-boarding-ladders'));
  assert.equal(preview.userData.previewOnly,true);
  assert.equal(equipAccess(hull,level),'ownership-unverified');
  assert.equal(equipAccess(hull,level,new Set()),'not-owned');
  assert.ok(preview.children.length<130,'mobile accessory object budget');
 }
});
