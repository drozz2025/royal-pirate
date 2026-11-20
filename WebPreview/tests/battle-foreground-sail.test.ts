import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {makeBattleForegroundSail} from '../src/battle-foreground-sail';
import {battleCameraPose} from '../src/battle-framing';

test('original black sail remains genuine curved geometry, not a fake flat screenshot',()=>{
  const group=makeBattleForegroundSail();
  assert.equal(group.name,'battle-only-black-foreground-sail');
  assert.equal(group.userData.battleOnly,true);
  const sail=group.getObjectByName('curved-foreground-canvas') as T.Mesh;
  assert.ok(sail);
  const vertices=sail.geometry.getAttribute('position') as T.BufferAttribute;
  assert.ok(vertices.count>=100);
  const depths=Array.from({length:vertices.count},(_,i)=>vertices.getZ(i));
  assert.ok(Math.max(...depths)-Math.min(...depths)>.2);
  assert.ok(depths.every(Number.isFinite));
  assert.ok(group.getObjectByName('foreground-jolly-roger'));
});

test('new first-person viewport removes black sail obstruction for ALL portrait mobile sizes',()=>{
 const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
 for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]])
  assert.ok(battleCameraPose(w/h).showBattery,`single cannon at ${w}x${h}`);
 assert.match(scene,/this\.battleForegroundSail\.visible=!pose\.showBattery/);
 assert.match(scene,/this\.ships\.player\.root\.visible=false/);
 assert.match(scene,/const battery=makeBattleDeck\(true\)/);
});

test('Porto still hides every battle-only mesh and keeps the ship/camera intact',()=>{
 const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
 assert.match(scene,/this\.battleForegroundSail\.visible=false;this\.worldScenery\.visible=true/);
 assert.match(scene,/this\.camera\.position\.set\(\.\.\.pose\.position\)/);
 assert.match(scene,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/);
 assert.match(scene,/this\.ships\.enemy\.root\.scale\.setScalar\(battleEnemyScale\(battleAspect\)\)/);
});
