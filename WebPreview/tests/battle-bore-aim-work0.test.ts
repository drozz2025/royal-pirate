import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {battleCentralCannonYaw,battleDeckMuzzleWorld} from '../src/battle-framing';

test('single gun muzzle bears toward simulated landing point (not 20% HUD yaw)',()=>{
  const pivot=new T.Vector3(3.6,0,38);
  for(const impact of [
    new T.Vector3(9,1,-3),
    new T.Vector3(-5,1,-10),
    new T.Vector3(3.6,1,-9)
  ]){
    const yaw=battleCentralCannonYaw(pivot,impact);
    const forward=new T.Vector3(0,0,-1).applyAxisAngle(new T.Vector3(0,1,0),yaw);
    const aimed=new T.Vector3(impact.x-pivot.x,0,impact.z-pivot.z).normalize();
    assert.ok(forward.dot(aimed)>.999,'actual barrel looks toward target in XZ');
  }
});
test('aim bearing is bounded and ignores invalid/behind-camera predictions',()=>{
  const pivot=new T.Vector3(0,0,40);
  assert.equal(battleCentralCannonYaw(pivot,new T.Vector3(0,0,41)),0);
  assert.equal(battleCentralCannonYaw(pivot,new T.Vector3(NaN,0,0)),0);
  assert.ok(Math.abs(battleCentralCannonYaw(pivot,new T.Vector3(1e5,0,0)))<=Math.PI/4);
});
test('muzzle world transform follows yaw and recoil parent, without physics changes',()=>{
  const deck=new T.Group(),barrel=new T.Group(),mouth=new T.Vector3(0,4.05,-13.5);
  deck.position.set(3.6,0,-30);barrel.position.z=68;deck.add(barrel);
  const before=battleDeckMuzzleWorld(barrel,mouth);
  barrel.rotation.y=battleCentralCannonYaw(new T.Vector3(3.6,0,38),new T.Vector3(10,1,-3));
  const after=battleDeckMuzzleWorld(barrel,mouth);
  assert.ok(after.x>before.x+1,'mouth visibly rotates right to track opponent');
  assert.equal(after.y,before.y,'horizontal drag never alters elevation');
  assert.ok(after.z!==before.z,'world-space muzzle follows actual orientation');
});
