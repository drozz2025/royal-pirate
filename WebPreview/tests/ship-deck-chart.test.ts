import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewNavigationChart } from '../src/ship-deck-chart.ts';
import { applyShipModules, equipAccess, highestUnlockedPreviewModules } from '../src/ship-modules.ts';
import type { ShipClass } from '../src/ship-modules.ts';
import type { PreviewOrnamentModule } from '../src/ship-heraldry.ts';

const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const ORNAMENTS:readonly PreviewOrnamentModule[]=[
 'ornaments-simple','ornaments-lanterns','ornaments-legendary'
];

test('nine original 3D chart tables: four batched meshes, raised route and distinct silhouettes',()=>{
 const widths:number[]=[],heights:number[]=[];
 for(const shipClass of CLASSES)for(const ornaments of ORNAMENTS){
  const chart=createPreviewNavigationChart(shipClass,ornaments);
  assert.equal(chart.children.length,4);
  assert.equal(chart.userData.drawCallObjects,4);
  assert.equal(chart.userData.previewOnly,true);
  assert.equal(chart.userData.affectsBattle,false);
  assert.equal(chart.userData.grantsInventory,false);
  assert.equal(chart.userData.functionalNavigation,false);
  let vertices=0;
  for(const node of chart.children){
   assert.ok(node instanceof T.Mesh);
   const positions=node.geometry.getAttribute('position');
   assert.ok(positions.count>40,'genuine 3D mesh, not a background image');
   vertices+=positions.count;
   assert.ok(node.geometry.boundingSphere?.radius);
   for(let i=0;i<positions.count;i++)
    assert.ok([positions.getX(i),positions.getY(i),positions.getZ(i)].every(Number.isFinite));
  }
  assert.ok(vertices<7500,'bounded low-poly geometry for mobile preview');
  const ink=chart.getObjectByName('chart-archipelago-route') as T.Mesh;
  assert.ok(ink instanceof T.Mesh);
  const inkBounds=new T.Box3().setFromObject(ink);
  assert.ok(inkBounds.max.y>inkBounds.min.y,'route strokes have real 3D thickness');
  const bounds=new T.Box3().setFromObject(chart);
  assert.ok(bounds.min.y>1.98&&bounds.max.y<3.1,'table stays above the deck');
  assert.ok(bounds.max.x<-.10&&bounds.min.x>-1.5,'port-side table leaves mast and gun lanes clear');
  assert.ok(bounds.max.z<0&&bounds.min.z>-1.6,'chart clears the captain cabin');
  if(ornaments==='ornaments-simple'){
   widths.push(bounds.max.x-bounds.min.x);
   heights.push(bounds.max.y-bounds.min.y);
  }
 }
 assert.ok(widths[0]<widths[1]&&widths[1]<widths[2],'three physical table sizes');
 assert.ok(heights[0]<heights[1]&&heights[1]<heights[2],'three distinct stand heights');
 assert.throws(()=>createPreviewNavigationChart('ghost' as ShipClass,'ornaments-simple'),/Unknown preview ship class/);
 assert.throws(()=>createPreviewNavigationChart('scout','fake' as PreviewOrnamentModule),/Unknown preview ornament module/);
});

test('switching preview modules releases chart geometry and materials exactly once',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{
  shipClass:'warship',level:20,modules:{ornaments:'ornaments-legendary'}
 });
 const original=first.getObjectByName('shipyard-warship-ornaments-legendary-navigation-chart') as T.Group;
 assert.ok(original);
 const mesh=original.children[0] as T.Mesh;
 let geometries=0,materials=0;
 mesh.geometry.addEventListener('dispose',()=>geometries++);
 (mesh.material as T.Material).addEventListener('dispose',()=>materials++);
 const second=applyShipModules(root,rig,{shipClass:'fighter',level:1,modules:{}});
 assert.equal(geometries,1);
 assert.equal(materials,1);
 assert.equal(root.children.filter(x=>x.name==='modular-ship-accessories').length,1);
 assert.equal(second.getObjectByName(original.name),undefined);
 assert.ok(second.getObjectByName('shipyard-fighter-ornaments-simple-navigation-chart'));
});

test('navigation chart appears at every preview level, without granting levels or ownership',()=>{
 for(let level=1;level<=20;level++){
  const ornaments=highestUnlockedPreviewModules(level).ornaments as PreviewOrnamentModule;
  for(const shipClass of CLASSES){
   const root=new T.Group(),rig=new T.Group();root.add(rig);
   const preview=applyShipModules(root,rig,{shipClass,level,modules:{ornaments}});
   assert.ok(preview.getObjectByName('shipyard-'+shipClass+'-'+ornaments+'-navigation-chart'));
   assert.equal(preview.userData.previewOnly,true);
   assert.ok(preview.children.length<145,'bounded nested draw objects');
  }
  assert.equal(equipAccess(ornaments,level),'ownership-unverified');
  assert.equal(equipAccess(ornaments,level,new Set()),'not-owned');
 }
});
