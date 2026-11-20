import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewSailEmbroidery } from '../src/ship-sail-embroidery.ts';
import {
 applyShipModules, resolveLoadout, validateOwnedFleetForPlayer,
 type ShipClass
} from '../src/ship-modules.ts';

const CLASSES=['scout','fighter','warship'] as const;
const DYES=['sails-cream','sails-crimson','sails-night'] as const;

test('nine original 3D sail embroideries generate one batched GPU mesh per ship',()=>{
 for(const shipClass of CLASSES)for(const dye of DYES){
  const mesh=createPreviewSailEmbroidery(shipClass,dye);
  assert.ok(mesh instanceof T.Mesh);
  assert.equal(mesh.userData.previewOnly,true);
  assert.equal(mesh.userData.drawCallObjects,1);
  assert.equal(mesh.userData.shipClass,shipClass);
  assert.equal(mesh.userData.sailModule,dye);
  assert.equal(mesh.name,'shipyard-'+shipClass+'-'+dye+'-embroidery');
  const coordinates=mesh.geometry.getAttribute('position') as T.BufferAttribute;
  assert.ok(coordinates.count>200 && coordinates.count<2500,'bounded cloth stitch triangle mesh');
  assert.equal(mesh.userData.triangles,coordinates.count/3);
  assert.ok(mesh.userData.triangles<1000,'mobile triangle budget for sail ornament');
  assert.ok(mesh.geometry.boundingSphere?.radius);
  for(let i=0;i<coordinates.count;i++){
   assert.ok(Number.isFinite(coordinates.getX(i)));
   assert.ok(Number.isFinite(coordinates.getY(i)));
   assert.ok(Number.isFinite(coordinates.getZ(i)));
  }
  mesh.geometry.dispose();
  (mesh.material as T.Material).dispose();
 }
 assert.throws(()=>createPreviewSailEmbroidery('ghost' as ShipClass,'sails-cream'),/Unknown preview sail class/);
 assert.throws(()=>createPreviewSailEmbroidery('scout','sails-gold' as 'sails-cream'),/Unknown preview sail module/);
});

test('scout diagonal embroidery, frigate chevrons and royal diamond are distinct geometry',()=>{
 const shipShapes=CLASSES.map(shipClass=>createPreviewSailEmbroidery(shipClass,'sails-cream'));
 const runs=shipShapes.map(mesh=>mesh.userData.stitchedRuns as number);
 assert.ok(runs[0]<runs[1] && runs[1]<runs[2]);
 const counts=shipShapes.map(mesh=>mesh.geometry.getAttribute('position').count);
 assert.ok(counts[0]<counts[1] && counts[1]<counts[2]);
 const colours=DYES.map(dye=>(createPreviewSailEmbroidery('scout',dye).material as T.MeshStandardMaterial).color.getHexString());
 assert.equal(new Set(colours).size,3,'dye levels need visibly different stitching contrasts');
 // Curved seams must occupy positive and negative mast Z stations, not a flat UI decal.
 const points=shipShapes[2].geometry.getAttribute('position') as T.BufferAttribute;
 const depths=Array.from({length:points.count},(_,i)=>points.getZ(i));
 assert.ok(Math.min(...depths)<0,'aft mast included');
 assert.ok(Math.max(...depths)>0,'fore mast included');
});

test('changing a shipyard sail refit frees its own buffer without touching the game rig',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const originalRigChild=new T.Group();rig.add(originalRigChild);
 const old=applyShipModules(root,rig,{shipClass:'warship',level:12,modules:{sails:'sails-night'}});
 const previous=old.getObjectByName('shipyard-warship-sails-night-embroidery') as T.Mesh;
 assert.ok(previous);
 let buffersDisposed=0,materialsDisposed=0;
 previous.geometry.addEventListener('dispose',()=>buffersDisposed++);
 (previous.material as T.Material).addEventListener('dispose',()=>materialsDisposed++);
 const current=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(buffersDisposed,1);
 assert.equal(materialsDisposed,1);
 assert.equal(root.children.filter(item=>item.name==='modular-ship-accessories').length,1);
 assert.ok(current.getObjectByName('shipyard-scout-sails-cream-embroidery'));
 assert.equal(current.getObjectByName(previous.name),undefined);
 assert.equal(rig.children[0],originalRigChild,'unrelated rig content is not deleted');
 assert.ok(current.children.length<125,'existing mobile accessory object budget');
});

test('embroidery is a level-gated visual preview; inventory still requires verified ownership',()=>{
 assert.throws(()=>resolveLoadout({shipClass:'scout',level:1,modules:{sails:'sails-night'}}),/not unlocked/);
 assert.throws(()=>resolveLoadout({shipClass:'fighter',level:4,modules:{sails:'sails-crimson'}}),/not unlocked/);
 assert.equal(resolveLoadout({
  shipClass:'warship',level:12,modules:{sails:'sails-night'}
 }).modules.sails,'sails-night');
 assert.throws(()=>validateOwnedFleetForPlayer(
  {shipClass:'warship',level:12,modules:{sails:'sails-night'}},
  new Set(),12,new Set(['warship'])
 ),/missing verified ownership/);
});
