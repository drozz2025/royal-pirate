import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {battleCameraPose,battleDeckMuzzleWorld} from '../src/battle-framing';
import {makeBattleDeck} from '../src/battle-deck';
import {projectileFromMuzzle} from '../src/battle-shot-presentation';
import {launch} from '../src/battle';

function screen(w:number,h:number,p:T.Vector3) {
 const pose=battleCameraPose(w/h);
 const camera=new T.PerspectiveCamera(42,w/h,.1,220);
 camera.position.set(...pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
 const v=p.clone().project(camera);
 return {x:(1+v.x)*w/2,y:(1-v.y)*h/2};
}

test('WORK6 18 Nov: one camera-aligned FIRST PERSON barrel and right-side enemy at 4 mobile sizes',()=>{
 const {group,flashes,muzzles}=makeBattleDeck(true);
 assert.equal(flashes.length,1);
 assert.equal(muzzles.length,1);
 for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
  const pose=battleCameraPose(w/h);
  assert.equal(pose.showBattery,true);
  assert.ok(pose.position[1]<=8,'eye-line is on the deck');
  group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
  group.scale.setScalar(pose.batteryScale);
  const barrel=group.getObjectByName('first-person-central-recoil')!;
  const mouth=battleDeckMuzzleWorld(barrel,muzzles[0]);
  const projected=screen(w,h,mouth);
  const enemy=screen(w,h,new T.Vector3(10,0,-3));
  const mast=screen(w,h,new T.Vector3(10,15,-3));
  assert.ok(projected.x>w*.4 && projected.x<w*.6,`gun mouth centered ${w}x${h}: ${projected.x}`);
  assert.ok(projected.y>h*.49&&projected.y<h*.67,'muzzle above action controls');
  assert.ok(enemy.x>w*.57&&enemy.x<w*.78,'opponent to the right and ahead');
  assert.ok(enemy.y-mast.y>h*.2,'opponent sail is legible');
  const shot=launch('player',0,65);
  assert.deepEqual(projectileFromMuzzle(shot,{x:mouth.x,y:mouth.y,z:mouth.z}),
    {x:mouth.x,y:mouth.y,z:mouth.z});
 }
});

test('deck-level portrait framing and original desktop pose are independently scoped',()=>{
 const mobile=battleCameraPose(384/512);
 assert.deepEqual(mobile.position,[0,7.4,55]);
 assert.deepEqual(mobile.target,[5.15,4.1,-3]);
 assert.equal(mobile.batteryOffsetZ,-30);
 assert.equal(mobile.batteryOffsetX,2);
 assert.equal(mobile.batteryScale,1);
 const compact=battleCameraPose(320/568);
 assert.deepEqual(compact.position,mobile.position);
 assert.deepEqual(compact.target,[6.5,4.1,-3]);
 assert.equal(compact.batteryOffsetX,2.7);
 assert.equal(compact.batteryOffsetZ,mobile.batteryOffsetZ);
 const tall=battleCameraPose(390/844);
 assert.deepEqual(tall.position,mobile.position);
 assert.deepEqual(tall.target,[7.65,4.1,-3]);
 assert.equal(tall.batteryOffsetX,3.6);
 assert.deepEqual(battleCameraPose(430/932),tall);
 assert.equal(battleCameraPose(1.4).showBattery,false);
});

test('battle uses the fixed deck pose, Porto original ship and true barrel matrix',()=>{
 const src=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
 assert.match(src,/this\.controls\.target\.set\(\.\.\.pose\.target\)/);
 assert.match(src,/this\.ships\.player\.root\.visible=false/);
 assert.match(src,/this\.ships\.player\.root\.visible=true/);
 assert.match(src,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/);
 assert.match(src,/battleDeckMuzzleWorld\(central,muzzle\)/);
 assert.match(src,/this\.battleForegroundSail\.visible=!pose\.showBattery/);
});

test('genuine central cannon and old two-gun generator remain finite and battle-only',()=>{
 const central=makeBattleDeck(true);
 const legacy=makeBattleDeck();
 assert.equal(central.group.name,'battle-foreground-cannons');
 assert.equal(central.flashes.length,1);
 assert.equal(legacy.flashes.length,2,'legacy geometry remains isolated from approved Porto');
 assert.ok(central.flashes.every(f=>!f.visible));
 assert.ok(central.group.children.length<60);
});

test('WORK0/#104: ultra-tall mobile keeps one real muzzle centered while clearing enemy broadside from the edge',()=>{
 const {group,muzzles}=makeBattleDeck(true);
 for(const [w,h] of [[390,844],[430,932]]) {
   const pose=battleCameraPose(w/h);
   group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
   group.scale.setScalar(pose.batteryScale);
   const barrel=group.getObjectByName('first-person-central-recoil')!;
   const mouth=battleDeckMuzzleWorld(barrel,muzzles[0]);
   const projectedMuzzle=screen(w,h,mouth);
   const enemy=screen(w,h,new T.Vector3(10,0,-3));
   assert.ok(projectedMuzzle.x>w*.42 && projectedMuzzle.x<w*.58,
     'single cannon stays centred at '+w+'x'+h);
   assert.ok(enemy.x>w*.54 && enemy.x<w*.72,
     'enemy anchor must not sit at right screen edge '+w+'x'+h);
 }
 assert.deepEqual(battleCameraPose(384/512).position,battleCameraPose(320/568).position,
   'native reference and compact portrait camera eyes must stay on the same forward deck');
});

test('WORK0/#104: forward-moving the camera AND single cannon deck enlarges the live enemy silhouette without offscreen cropping',()=>{
 const {group,muzzles}=makeBattleDeck(true);
 for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
  const aspect=w/h;
  const pose=battleCameraPose(aspect);
  const oldCamera=new T.PerspectiveCamera(42,aspect,.1,220);
  oldCamera.position.set(0,7.4,67);
  oldCamera.lookAt(aspect<.5?7.2:4.2,4.1,-3);
  oldCamera.updateMatrixWorld();
  const oldMast=new T.Vector3(10,15,-3).project(oldCamera);
  const oldHull=new T.Vector3(10,0,-3).project(oldCamera);
  const oldSpan=(oldMast.y-oldHull.y)*h/2;

  const newMast=screen(w,h,new T.Vector3(10,15,-3));
  const newHull=screen(w,h,new T.Vector3(10,0,-3));
  const newSpan=newHull.y-newMast.y;
  assert.ok(newSpan>oldSpan*1.12,`enemy actually grows in ${w}x${h}: ${newSpan} vs ${oldSpan}`);
  assert.ok(newHull.x<w*.75,`enemy remains inside right edge in ${w}x${h}`);

  group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
  group.scale.setScalar(pose.batteryScale);
  const barrel=group.getObjectByName('first-person-central-recoil')!;
  const muzzle=battleDeckMuzzleWorld(barrel,muzzles[0]);
  const projected=screen(w,h,muzzle);
  assert.ok(projected.x>w*.40&&projected.x<w*.60,`single live cannon muzzle stays centered in ${w}x${h}`);
  assert.ok(projected.y>h*.44&&projected.y<h*.72,`cannon muzzle stays above touch controls in ${w}x${h}`);
 }
});
