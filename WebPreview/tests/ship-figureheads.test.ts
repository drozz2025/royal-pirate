import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewFigurehead } from '../src/ship-figureheads.ts';
import { applyShipModules, equipAccess, type ShipClass } from '../src/ship-modules.ts';

const classes:ShipClass[]=['scout','fighter','warship'];
const moduleIds=['figurehead-anchor','figurehead-lion','figurehead-crown'] as const;
function meshes(group:T.Group):T.Mesh[]{return group.children.filter(o=>o instanceof T.Mesh) as T.Mesh[];}
function retire(group:T.Group):void{
 group.traverse(o=>{if(o instanceof T.Mesh){
  o.geometry.dispose();
  for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();
 }});
}

test('nine original bow sculpture combinations use two real merged mesh draws each',()=>{
 const classFingerprints=new Map<string,number[]>();
 for(const shipClass of classes){
  for(const moduleId of moduleIds){
   const group=createPreviewFigurehead(shipClass,moduleId);
   const parts=meshes(group);
   assert.equal(parts.length,2);
   assert.equal(group.userData.drawCallObjects,2);
   assert.equal(group.userData.previewOnly,true);
   assert.equal(group.userData.figureheadModule,moduleId);
   assert.equal(group.userData.shipClass,shipClass);
   const count=parts.reduce((sum,part)=>sum+part.geometry.getAttribute('position').count,0);
   assert.ok(count>150 && count<9000,'sculpture has physical detail but remains mobile bounded');
   const bbox=new T.Box3().setFromObject(group);
   assert.ok(bbox.max.z>bbox.min.z && bbox.max.y>bbox.min.y);
   assert.ok(bbox.max.x>bbox.min.x);
   assert.ok(group.position.z>6);
   const key=moduleId;
   classFingerprints.set(key,[...(classFingerprints.get(key)??[]),count]);
   for(const part of parts){
    const coordinates=part.geometry.getAttribute('position');
    for(let i=0;i<coordinates.count;i++){
     assert.ok(Number.isFinite(coordinates.getX(i)));
     assert.ok(Number.isFinite(coordinates.getY(i)));
     assert.ok(Number.isFinite(coordinates.getZ(i)));
    }
   }
   retire(group);
  }
 }
 for(const ids of classFingerprints.values())
  assert.equal(new Set(ids).size,3,'each class has its own carved silhouette');
});

test('module choices change geometry rather than just tint or claim inventory',()=>{
 const geometryCounts=moduleIds.map(id=>{
  const group=createPreviewFigurehead('fighter',id);
  const vertices=meshes(group).reduce((a,m)=>a+m.geometry.getAttribute('position').count,0);
  retire(group);
  return vertices;
 });
 assert.equal(new Set(geometryCounts).size,3,'anchor, lion and crown are distinct sculptures');
 assert.throws(()=>createPreviewFigurehead('alien' as ShipClass,'figurehead-anchor'),/Unknown preview figurehead ship class/);
 assert.throws(()=>createPreviewFigurehead('scout','fake' as typeof moduleIds[number]),/Unknown preview figurehead module/);
 assert.equal(equipAccess('figurehead-crown',19,new Set(['figurehead-crown'])),'level-locked');
 assert.equal(equipAccess('figurehead-crown',20),'ownership-unverified');
 assert.equal(equipAccess('figurehead-crown',20,new Set()),'not-owned');
});

test('replacing a figurehead releases both old GPU meshes exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const base=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 const head=base.getObjectByName('shipyard-scout-figurehead-anchor-sculpture') as T.Group;
 assert.ok(head);
 const releases:{geometry:number;material:number}[]=[];
 for(const m of meshes(head)){
  const state={geometry:0,material:0};
  m.geometry.addEventListener('dispose',()=>state.geometry++);
  (m.material as T.Material).addEventListener('dispose',()=>state.material++);
  releases.push(state);
 }
 const newPreview=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{figurehead:'figurehead-crown'}
 });
 assert.ok(newPreview.getObjectByName('shipyard-warship-figurehead-crown-sculpture'));
 assert.deepEqual(releases,[{geometry:1,material:1},{geometry:1,material:1}]);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
 assert.equal(rig.children.length,0,'shipyard sculpture must not modify battle rig');
});
