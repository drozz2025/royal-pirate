import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewCompassBinnacle } from '../src/ship-deck-compass.ts';
import { applyShipModules, equipAccess, highestUnlockedPreviewModules } from '../src/ship-modules.ts';
import type { ShipClass } from '../src/ship-modules.ts';
import type { PreviewOrnamentModule } from '../src/ship-heraldry.ts';

const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const FINISHES:readonly PreviewOrnamentModule[]=[
 'ornaments-simple','ornaments-lanterns','ornaments-legendary'
];

test('original compass binnacles: 9 3D variants, distinct classes, 2 mobile draw objects',()=>{
 const widths:number[]=[];
 const heights:number[]=[];
 for(const shipClass of CLASSES)for(const ornaments of FINISHES){
  const compass=createPreviewCompassBinnacle(shipClass,ornaments);
  assert.equal(compass.children.length,2);
  assert.equal(compass.userData.drawCallObjects,2);
  assert.equal(compass.userData.previewOnly,true);
  assert.equal(compass.userData.affectsBattle,false);
  assert.equal(compass.userData.functionalHeading,false);
  let vertices=0;
  for(const child of compass.children){
   assert.ok(child instanceof T.Mesh);
   const positions=child.geometry.getAttribute('position');
   assert.ok(positions.count>100,'real bronze rose, ticks and timber fittings');
   vertices+=positions.count;
   assert.ok(child.geometry.boundingSphere?.radius);
   for(let i=0;i<positions.count;i++)
    assert.ok([positions.getX(i),positions.getY(i),positions.getZ(i)].every(Number.isFinite));
  }
  assert.ok(vertices<7500,'mobile-friendly bounded tessellation');
  const bounds=new T.Box3().setFromObject(compass);
  assert.ok(bounds.min.y>=1.96&&bounds.max.y<3.40,'compass mounts on real deck, below sail rig');
  assert.ok(bounds.min.z> -1.30&&bounds.max.z<0,'forequarter position avoids cabin');
  assert.ok(bounds.min.x>0&&bounds.max.x<1.6,'off-centre installation clears mast');
  if(ornaments==='ornaments-simple'){
   widths.push(bounds.max.x-bounds.min.x);
   heights.push(bounds.max.y-bounds.min.y);
  }
 }
 assert.ok(widths[0]<widths[1]&&widths[1]<widths[2],'class widths differ');
 assert.ok(heights[0]<heights[1]&&heights[1]<heights[2],'class heights differ');
 assert.throws(()=>createPreviewCompassBinnacle('ghost' as ShipClass,'ornaments-simple'),/Unknown preview ship class/);
 assert.throws(()=>createPreviewCompassBinnacle('scout','fake' as PreviewOrnamentModule),/Unknown preview ornament module/);
});

test('compass is installed on every isolated 3D preview, and old buffers release once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{ornaments:'ornaments-legendary'}
 });
 const name='shipyard-warship-ornaments-legendary-compass-binnacle';
 const object=first.getObjectByName(name) as T.Group;
 assert.ok(object);
 const mesh=object.children[1] as T.Mesh;
 let disposedGeometry=0,disposedMaterial=0;
 mesh.geometry.addEventListener('dispose',()=>disposedGeometry++);
 (mesh.material as T.Material).addEventListener('dispose',()=>disposedMaterial++);
 const next=applyShipModules(root,rig,{shipClass:'fighter',level:1,modules:{}});
 assert.equal(disposedGeometry,1);
 assert.equal(disposedMaterial,1);
 assert.equal(root.children.filter(o=>o.name==='modular-ship-accessories').length,1);
 assert.equal(next.getObjectByName(name),undefined);
 assert.ok(next.getObjectByName('shipyard-fighter-ornaments-simple-compass-binnacle'));
});

test('compass ornaments preview at 1–20 never claim earned levels or ownership',()=>{
 for(let level=1;level<=20;level++){
  const ornaments=highestUnlockedPreviewModules(level).ornaments as PreviewOrnamentModule;
  for(const shipClass of CLASSES){
   const root=new T.Group(),rig=new T.Group();root.add(rig);
   const model=applyShipModules(root,rig,{shipClass,level,modules:{ornaments}});
   assert.ok(model.getObjectByName('shipyard-'+shipClass+'-'+ornaments+'-compass-binnacle'));
   assert.equal(model.userData.previewOnly,true);
   assert.ok(model.children.length<130,'draw object budget stays bounded');
  }
  assert.equal(equipAccess(ornaments,level),'ownership-unverified');
  assert.equal(equipAccess(ornaments,level,new Set()),'not-owned');
 }
});
