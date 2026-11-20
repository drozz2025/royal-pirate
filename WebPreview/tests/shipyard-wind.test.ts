import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { applyShipModules } from '../src/ship-modules.ts';
import { animateShipyardWind, shipyardWindPose } from '../src/shipyard-wind.ts';

const pennants={
 scout:'scout-swallow-pennant',
 fighter:'fighter-forked-pennant',
 warship:'warship-royal-pennant'
} as const;

test('three preview classes flutter independently with deterministic, bounded wind',()=>{
 const poses=(Object.keys(pennants) as (keyof typeof pennants)[]).map(shipClass=>{
  const first=shipyardWindPose(shipClass,1.7);
  assert.deepEqual(first,shipyardWindPose(shipClass,1.7));
  for(let t=0;t<=20;t+=.13){
   const pose=shipyardWindPose(shipClass,t);
   assert.ok(Number.isFinite(pose.yaw)&&Number.isFinite(pose.roll));
   assert.ok(Math.abs(pose.yaw)<=.25&&Math.abs(pose.roll)<=.10);
  }
  return first.yaw;
 });
 assert.equal(new Set(poses).size,3,'different ship classes must not look identical in wind');
 assert.equal(shipyardWindPose('fighter',4).jibYaw,0);
 assert.equal(shipyardWindPose('warship',4).jibYaw,0);
 assert.throws(()=>shipyardWindPose('scout',Infinity),RangeError);
 assert.throws(()=>shipyardWindPose('scout',-1),RangeError);
});

test('wind animates real class-specific 3D pennants without geometry rebuilds or drift',()=>{
 for(const shipClass of Object.keys(pennants) as (keyof typeof pennants)[]){
  const root=new T.Group(),rig=new T.Group();root.add(rig);
  const sail=new T.Mesh(new T.PlaneGeometry(3,2),new T.MeshStandardMaterial());
  rig.add(sail);
  const accessories=applyShipModules(root,rig,{shipClass,level:20,modules:{}});
  const pennant=accessories.getObjectByName(pennants[shipClass]) as T.Mesh;
  assert.ok(pennant instanceof T.Mesh);
  const initialGeometry=pennant.geometry,initialMaterial=pennant.material;
  const children=accessories.children.length;
  animateShipyardWind(root,1);
  const a=pennant.rotation.y;
  animateShipyardWind(root,3);
  assert.notEqual(pennant.rotation.y,a,'wind should be visible at a different time');
  const expected=pennant.rotation.y;
  animateShipyardWind(root,3);
  assert.equal(pennant.rotation.y,expected,'no cumulative rotation or drift');
  for(let i=0;i<120;i++)animateShipyardWind(root,i/30);
  assert.equal(pennant.geometry,initialGeometry);
  assert.equal(pennant.material,initialMaterial);
  assert.equal(accessories.children.length,children);
  assert.equal(sail.rotation.y,0,'base rig sail is animated elsewhere, never by this feature');
  assert.equal(root.scale.x,shipClass==='scout'?.82:shipClass==='fighter'?1:1.16);
  assert.equal(accessories.userData.previewOnly,true);
 }
});

test('scout jib pivots at its real mast anchor rather than rotating around the ocean origin',()=>{
 const root=new T.Group(),rig=new T.Group();root.add(rig);
 const accessories=applyShipModules(root,rig,{shipClass:'scout',level:1,modules:{}});
 const jib=accessories.getObjectByName('scout-fore-and-aft-jib') as T.Mesh;
 assert.ok(jib instanceof T.Mesh);
 assert.deepEqual(jib.position.toArray(),[0,6.6,3.75]);
 assert.equal(jib.geometry.getAttribute('position').count,4);
 const position=jib.geometry.getAttribute('position');
 assert.deepEqual([position.getX(0),position.getY(0),position.getZ(0)],[0,0,0]);
 animateShipyardWind(root,2);
 assert.ok(Math.abs(jib.rotation.y)<=.028);
 assert.deepEqual(jib.position.toArray(),[0,6.6,3.75]);
});

test('wind integration is shipyard-visible only; absent on ordinary battle ships',()=>{
 const untouched=new T.Group();untouched.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()));
 animateShipyardWind(untouched,2);
 assert.equal(untouched.children[0].rotation.y,0);
 const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
 assert.match(scene,/if\(this\.shipyardArt\?\.root\.visible\)\s*\{[\s\S]*?animateShipyardWind\(art\.root,this\.elapsed\)/);
 assert.match(scene,/if\(this\.cameraMode==='battle'\|\|this\.cameraMode==='deck'\)/);
});
