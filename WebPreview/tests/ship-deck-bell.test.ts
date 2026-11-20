import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewShipBell } from '../src/ship-deck-bell.ts';
import { applyShipModules, equipAccess, highestUnlockedPreviewModules } from '../src/ship-modules.ts';
import type { ShipClass } from '../src/ship-modules.ts';
import type { PreviewOrnamentModule } from '../src/ship-heraldry.ts';

const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const FINISHES:readonly PreviewOrnamentModule[]=[
 'ornaments-simple','ornaments-lanterns','ornaments-legendary'
];

test('nine physical ship bells have distinct class silhouettes in two mobile draws',()=>{
 const widths:number[]=[];
 for(const shipClass of CLASSES)for(const ornaments of FINISHES){
  const bell=createPreviewShipBell(shipClass,ornaments);
  assert.equal(bell.userData.previewOnly,true);
  assert.equal(bell.userData.affectsBattle,false);
  assert.equal(bell.userData.functionalSound,false);
  assert.equal(bell.userData.drawCallObjects,2);
  assert.equal(bell.children.length,2);
  let vertexCount=0;
  for(const child of bell.children){
   assert.ok(child instanceof T.Mesh);
   const geometry=child.geometry;
   const positions=geometry.getAttribute('position');
   assert.ok(positions.count>50,'physical yoke, open bell, lip and clapper');
   vertexCount+=positions.count;
   for(let i=0;i<positions.count;i++){
    assert.ok(Number.isFinite(positions.getX(i)));
    assert.ok(Number.isFinite(positions.getY(i)));
    assert.ok(Number.isFinite(positions.getZ(i)));
   }
   assert.ok(geometry.boundingSphere?.radius);
  }
  assert.ok(vertexCount<7500,'ship bell stays inside a lightweight mobile vertex budget');
  const bounds=new T.Box3().setFromObject(bell);
  assert.ok(bounds.min.y>1.95&&bounds.max.y<3.85,'deck bell sits on bow-side planking, below sails');
  assert.ok(bounds.min.z>2.5&&bounds.max.z<3.65,'bell avoids midship hatches and aft cabin');
  assert.ok(bounds.min.x>-1&&bounds.max.x<1,'ship bell clears the gunwale');
  if(ornaments==='ornaments-simple')widths.push(bounds.max.x-bounds.min.x);
 }
 assert.ok(widths[0]<widths[1]&&widths[1]<widths[2],
  'scout, fighter and flagship differ in actual bronze and timber silhouette');
 assert.throws(()=>createPreviewShipBell('phantom' as ShipClass,'ornaments-simple'),/Unknown preview ship class/);
 assert.throws(()=>createPreviewShipBell('scout','not-a-finish' as PreviewOrnamentModule),/Unknown preview ornament module/);
});

test('changing modular decorations disposes the previous ship bell GPU resources once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{ornaments:'ornaments-legendary'}
 });
 const previous=first.getObjectByName('shipyard-warship-ornaments-legendary-deck-bell') as T.Group;
 assert.ok(previous,'class-specific bell is integrated in modular 3D preview');
 const mesh=previous.children[1] as T.Mesh;
 let geometryDisposals=0,materialDisposals=0;
 mesh.geometry.addEventListener('dispose',()=>geometryDisposals++);
 (mesh.material as T.Material).addEventListener('dispose',()=>materialDisposals++);
 const next=applyShipModules(root,rig,{
  shipClass:'scout',level:1,modules:{}
 });
 assert.equal(geometryDisposals,1);
 assert.equal(materialDisposals,1);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
 assert.equal(next.getObjectByName(previous.name),undefined);
 assert.ok(next.getObjectByName('shipyard-scout-ornaments-simple-deck-bell'));
});

test('20 demonstration levels preview bells without unlocking, purchase or ownership grants',()=>{
 for(let level=1;level<=20;level++){
  const ornaments=highestUnlockedPreviewModules(level).ornaments as PreviewOrnamentModule;
  for(const shipClass of CLASSES){
   const root=new T.Group(),rig=new T.Group();root.add(rig);
   const preview=applyShipModules(root,rig,{shipClass,level,modules:{ornaments}});
   const bell=preview.getObjectByName('shipyard-'+shipClass+'-'+ornaments+'-deck-bell');
   assert.ok(bell,'a real bell appears for '+shipClass+' at level '+level);
   assert.equal(preview.userData.previewOnly,true);
   assert.ok(preview.children.length<125,'mobile draw-call budget remains bounded');
  }
  assert.equal(equipAccess(ornaments,level),'ownership-unverified');
  assert.equal(equipAccess(ornaments,level,new Set()),'not-owned');
 }
});
