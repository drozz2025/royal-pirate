import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {battleCameraPose,battleEnemyScale,battleEnemyBroadsideYaw,
  battleDeckMuzzleWorld} from '../src/battle-framing';
import {makeSingleBattleDeck} from '../src/battle-deck';
import {SHIPS} from '../src/battle';

/** Real camera projection at exact mobile ratios; not a hard-coded image. */
function projection(width:number,height:number){
  const aspect=width/height,pose=battleCameraPose(aspect);
  const camera=new T.PerspectiveCamera(42,aspect,.1,220);
  camera.position.set(...pose.position);
  camera.lookAt(new T.Vector3(...pose.target));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const deck=makeSingleBattleDeck();
  deck.group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
  deck.group.scale.setScalar(pose.batteryScale);
  const central=deck.group.getObjectByName('first-person-central-recoil');
  assert.ok(central,'one physical recoil group');
  const muzzle=battleDeckMuzzleWorld(central,deck.muzzles[0]).project(camera);
  const enemy=new T.Vector3(SHIPS.enemy.x,4,SHIPS.enemy.z).project(camera);
  return {aspect,pose,muzzle,enemy,scale:battleEnemyScale(aspect)};
}

test('WORK0 #104: one true gun muzzle stays centred as short-phone enemy becomes visually present',()=>{
  for(const [width,height] of [[320,568],[384,512],[390,844],[430,932]]){
    const shot=projection(width,height);
    assert.ok(shot.pose.showBattery,'only the single first-person barrel is visible');
    assert.ok(Math.abs(shot.muzzle.x)<.14,
      width+'x'+height+' must keep actual transformed muzzle on the gunner sightline: '+shot.muzzle.x);
    assert.ok(shot.muzzle.z>-1&&shot.muzzle.z<1,'muzzle in the camera frustum');
    assert.ok(shot.enemy.x>-.20&&shot.enemy.x<.85,
      'real red broadside must be ahead and inside the viewport: '+shot.enemy.x);
    assert.ok(shot.enemy.y>-.80&&shot.enemy.y<.85,
      'enemy must clear both UI and camera frustum');
    assert.ok(shot.scale>=1.45&&shot.scale<=1.70,
      'enemy 3D presentation scale is deliberately bounded on portrait phones');
  }
});

test('WORK0 #104: battle-only scale and yaw preserve the published desktop composition',()=>{
  assert.equal(battleEnemyScale(1.4),1.82);
  assert.equal(battleEnemyBroadsideYaw(1.4),-.95);
  assert.equal(battleCameraPose(1.4).showBattery,false);
  assert.equal(battleEnemyScale(384/512),1.64);
  assert.equal(battleEnemyScale(390/844),1.47);
  assert.equal(battleCameraPose(384/512).target[0],2.3);
  assert.equal(battleCameraPose(390/844).target[0],7.2);
  // SHIPS data drive the real simulated positions independently of art scale.
  assert.ok(Number.isFinite(SHIPS.player.x)&&Number.isFinite(SHIPS.enemy.z));
});
