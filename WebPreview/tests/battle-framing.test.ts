import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
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
test('Batalha mobile portrait composition stays visible across 320, 390 and 430 px',()=>{
 const battery=makeBattleDeck();
 assert.equal(battery.group.position.z,-15,'battle deck offsets from newly closer camera');
 for(const [w,h] of [[320,568],[390,844],[430,932]]){
  const pose=battleCameraPose(w/h);
  assert.equal(pose.showBattery,true);
  const player=screen(w,h,[-10,0,3]),enemy=screen(w,h,[10,0,-3]);
  const mast=screen(w,h,[-10,13,3]),muzzle=screen(w,h,[-2.45,1.85,66]);
  assert.ok(player.x>15 && player.x<w*.45, `player visible ${w}x${h}: ${player.x}`);
  assert.ok(enemy.x>w*.55 && enemy.x<w-15, `enemy visible ${w}x${h}: ${enemy.x}`);
  assert.ok(player.x>w*.15 && enemy.x<w*.85, `both hulls have side clearance ${w}x${h}`);
  assert.ok(mast.y>h*.20 && mast.y<h*.50, `sails clear HUD ${w}x${h}: ${mast.y}`);
  assert.ok(muzzle.y>h*.48 && muzzle.y<h*.82, `cannons below ships ${w}x${h}: ${muzzle.y}`);
  assert.ok(muzzle.y>mast.y+h*.2, `the cannon foreground must remain below the sails ${w}x${h}`);
 }
});
test('Desktop retains previous battle viewpoint and no foreground deck',()=>{
 assert.equal(battleCameraPose(1.4).showBattery,false);
});
test('Foreground is live, finite geometry and hidden until Batalha',()=>{
 const {group,flashes}=makeBattleDeck();
 assert.equal(group.name,'battle-foreground-cannons');
 assert.equal(flashes.length,2);
 assert.ok(group.children.length<60);
 assert.ok(flashes.every(f=>f.visible===false));
});
