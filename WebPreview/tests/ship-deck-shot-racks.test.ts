import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewDeckShotRacks } from '../src/ship-deck-shot-racks.ts';
import { applyShipModules } from '../src/ship-modules.ts';

test('nine class and cannon-tier previews render distinct physical shot racks',()=>{
 const classes=['scout','fighter','warship'] as const;
 const modules=['cannons-bronze','cannons-steel','cannons-gold'] as const;
 const racks=[1,2,3],balls=[3,12,30];
 for(const [index,shipClass] of classes.entries()){
  const sizes:number[]=[];
  for(const cannonModule of modules){
   const display=createPreviewDeckShotRacks(shipClass,cannonModule);
   assert.equal(display.userData.previewOnly,true);
   assert.equal(display.userData.rackCount,racks[index]);
   assert.equal(display.userData.visualRoundCount,balls[index]);
   assert.equal(display.children.length,3,'timber, rounds and rivets stay in three batched draws');
   assert.equal(display.userData.drawCallObjects,display.children.length);
   assert.ok(display.children.every(child=>child instanceof T.Mesh));
   const shot=display.getObjectByName('forged-shot-display') as T.Mesh;
   assert.ok(shot);
   const verts=shot.geometry.getAttribute('position').count;
   assert.ok(verts>=balls[index]*20,'each round must be physical 3D geometry');
   assert.ok((display.getObjectByName('oak-shot-cradles') as T.Mesh).geometry.boundingSphere);
   sizes.push(verts);
  }
  assert.equal(new Set(sizes).size,1,'cannon tier must not create imaginary ammunition');
 }
});

test('unknown cannon tier or ship class never creates a 3D asset',()=>{
 assert.throws(()=>createPreviewDeckShotRacks('unknown' as 'scout','cannons-bronze'),/Unknown preview ship class/);
 assert.throws(()=>createPreviewDeckShotRacks('scout','cannons-fake' as 'cannons-bronze'),/Unknown preview cannon module/);
});

test('shot racks are disposed and replaced with the shipyard, never accumulated',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const first=applyShipModules(root,rig,{shipClass:'warship',level:20,modules:{cannons:'cannons-gold'}});
 const rack=first.getObjectByName('shipyard-warship-cannons-gold-deck-shot-racks') as T.Group;
 assert.ok(rack);
 const geometry=(rack.getObjectByName('forged-shot-display') as T.Mesh).geometry;
 let disposed=0;
 geometry.addEventListener('dispose',()=>disposed++);
 const next=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 assert.equal(disposed,1,'refitting must release the previous GPU geometry');
 assert.equal(root.children.filter(node=>node.name==='modular-ship-accessories').length,1);
 assert.ok(next.getObjectByName('shipyard-scout-cannons-bronze-deck-shot-racks'));
 assert.equal(next.getObjectByName('shipyard-warship-cannons-gold-deck-shot-racks'),undefined);
 assert.ok(next.children.length<125,'bounded mobile draw-call accessory budget');
});

test('all 20 levels keep physical racks strictly visual-only',()=>{
 for(const shipClass of ['scout','fighter','warship'] as const){
  const root=new T.Group(),rig=new T.Group();root.add(rig);
  for(let level=1;level<=20;level++){
   const cannonModule=level>=17?'cannons-gold':level>=8?'cannons-steel':'cannons-bronze';
   const preview=applyShipModules(root,rig,{shipClass,level,modules:{cannons:cannonModule}});
   const racks=preview.getObjectByName('shipyard-'+shipClass+'-'+cannonModule+'-deck-shot-racks');
   assert.ok(racks);
   assert.equal(racks.userData.previewOnly,true);
   assert.equal(root.children.filter(node=>node.name==='modular-ship-accessories').length,1);
  }
 }
});
