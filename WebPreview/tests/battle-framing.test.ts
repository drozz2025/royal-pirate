import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {battleCameraPose} from '../src/battle-framing';
import {makeBattleDeck} from '../src/battle-deck';

function screen(w:number,h:number,point:[number,number,number]) {
  const pose=battleCameraPose(w/h);
  const camera=new T.PerspectiveCamera(42,w/h,.1,220);
  camera.position.set(...pose.position);
  camera.lookAt(...pose.target);
  camera.updateMatrixWorld();
  const p=new T.Vector3(...point).project(camera);
  return {x:(1+p.x)*w/2,y:(1-p.y)*h/2};
}

test('WORK6 native 384 and mobile 320/390/430 show a right-side enemy broadside in FIRST PERSON',()=>{
 const battery=makeBattleDeck();
 assert.equal(battery.group.position.z,-15,'original near-field gun geometry remains');
 for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
  const pose=battleCameraPose(w/h);
  assert.equal(pose.showBattery,true,`deck visible at ${w}x${h}`);
  const enemy=screen(w,h,[10,0,-3]);
  const mast=screen(w,h,[10,1.72*8.4,-3]);
  const portCannon=screen(w,h,[-2.45,1.85,66+pose.batteryOffsetZ]);
  const starboardCannon=screen(w,h,[2.45,1.85,66+pose.batteryOffsetZ]);
  const blackSail=screen(w,h,[-3.6,8.85,42]);

  assert.ok(enemy.x>w*.56 && enemy.x<w*.82,
    `enemy starboard not central or offscreen at ${w}x${h}: ${enemy.x}`);
  assert.ok(enemy.y-mast.y>h*.20,
    `enemy galleon height is legible at ${w}x${h}`);
  assert.ok(mast.y>h*.22 && mast.y<h*.44,
    `enemy top clears the health HUD at ${w}x${h}: ${mast.y}`);
  assert.ok(blackSail.x>=0 && blackSail.x<w*.34,
    `player's own black sail stays on LEFT at ${w}x${h}: ${blackSail.x}`);
  assert.ok(portCannon.x>w*.12 && starboardCannon.x<w*.88,
    `both cannon muzzles stay visible at ${w}x${h}`);
  assert.ok(portCannon.y>h*.52 && portCannon.y<h*.79,
    `first-person cannons remain below opponent at ${w}x${h}`);
  assert.ok(portCannon.y>mast.y+h*.13,
    `real cannons should not overlap opponent's sail/HUD at ${w}x${h}`);
 }
});

test('384x512 is in the compact first-person camera regime, without shifting 390/430 views',()=>{
 const native=battleCameraPose(384/512);
 assert.deepEqual(native.position,[0,10.3,78]);
 assert.deepEqual(native.target,[1,4.2,0]);
 assert.equal(native.batteryOffsetZ,-26);
 assert.equal(battleCameraPose(320/568).batteryOffsetZ,-26);
 assert.deepEqual(battleCameraPose(390/844).target,[5,4.95,0]);
 assert.equal(battleCameraPose(430/932).batteryOffsetZ,-35);
 assert.equal(battleCameraPose(1.4).showBattery,false);
});

test('battle uses ONLY the fixed pose, never a second ship side view or changed Porto camera',()=>{
 const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
 assert.match(source,/this\.controls\.target\.set\(\.\.\.pose\.target\)/,
   'the actual battle camera pose must not add hidden offsets');
 assert.match(source,/this\.ships\.player\.root\.visible=false/,
   'the player sees their own FIRST-PERSON deck, not two exterior hulls');
 assert.match(source,/this\.ships\.player\.root\.visible=true/,
   'Porto still restores the original player ship');
 assert.match(source,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/,
   'Porto restores unmodified ships');
});

test('foreground is live finite geometry and hidden until battle',()=>{
 const {group,flashes}=makeBattleDeck();
 assert.equal(group.name,'battle-foreground-cannons');
 assert.equal(flashes.length,2);
 assert.ok(group.children.length<60);
 assert.ok(flashes.every(f=>f.visible===false));
});
