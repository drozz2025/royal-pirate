import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {battleCameraPose,battleDeckMuzzleWorld,battleEnemyScale,battleEnemyBroadsideYaw} from '../src/battle-framing';
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
 assert.deepEqual(mobile.target,[2.65,4.1,-3]);
 assert.equal(mobile.batteryOffsetZ,-30);
 assert.equal(mobile.batteryOffsetX,1.8);
 assert.equal(mobile.batteryScale,.84);
 const compact=battleCameraPose(320/568);
 assert.deepEqual(compact.position,mobile.position);
 assert.deepEqual(compact.target,[4.5,4.1,-3]);
 assert.equal(compact.batteryOffsetX,3.2);
 assert.equal(compact.batteryOffsetZ,mobile.batteryOffsetZ);
 const tall=battleCameraPose(390/844);
 assert.deepEqual(tall.position,mobile.position);
 assert.deepEqual(tall.target,[4.5,4.1,-3]);
 assert.equal(tall.batteryOffsetX,3.2);
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
   assert.ok(enemy.x>w*.69 && enemy.x<w*.81,
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
  assert.ok(newHull.x<w*.82,`enemy remains inside right edge in ${w}x${h}`);

  group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
  group.scale.setScalar(pose.batteryScale);
  const barrel=group.getObjectByName('first-person-central-recoil')!;
  const muzzle=battleDeckMuzzleWorld(barrel,muzzles[0]);
  const projected=screen(w,h,muzzle);
  assert.ok(projected.x>w*.40&&projected.x<w*.60,`single live cannon muzzle stays centered in ${w}x${h}`);
  assert.ok(projected.y>h*.44&&projected.y<h*.72,`cannon muzzle stays above touch controls in ${w}x${h}`);
 }
});

test('WORK0/#104: native 384x512 stage moves the whole live galleon to starboard, keeping ONE real gun centred',()=>{
  const w=384,h=512,aspect=w/h,pose=battleCameraPose(aspect);
  const opponent=screen(w,h,new T.Vector3(10,0,-3));
  assert.ok(opponent.x>w*.69&&opponent.x<w*.74,
    'enemy occupies the right third, not the center: '+opponent.x);
  const old=new T.PerspectiveCamera(42,aspect,.1,220);
  old.position.set(0,7.4,55);old.lookAt(5.15,4.1,-3);old.updateMatrixWorld();
  const oldNdc=new T.Vector3(10,0,-3).project(old);
  assert.ok(opponent.x-(1+oldNdc.x)*w/2>24,
    'actual 3D perspective must shift the enemy at least 24 pixels');
  const scale=battleEnemyScale(aspect),yaw=battleEnemyBroadsideYaw(aspect);
  assert.ok(scale>=1.14&&scale<=1.20,
    'short-screen galleon has room for the complete aftcastle');
  // Project both physical ends and both broadside gunwale edges after the
  // same live root yaw and presentation scale used by OceanScene.home().
  for(const localZ of [-5,5])for(const localX of [-1.8,1.8]){
    const x=10+scale*(Math.cos(yaw)*localX+Math.sin(yaw)*localZ);
    const z=-3+scale*(-Math.sin(yaw)*localX+Math.cos(yaw)*localZ);
    const corner=screen(w,h,new T.Vector3(x,0,z));
    assert.ok(corner.x>w*.43&&corner.x<w*.97,
      'the complete broadside must remain on-screen: '+corner.x);
  }
  const gun=makeBattleDeck(true);
  assert.equal(gun.muzzles.length,1);
  gun.group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
  gun.group.scale.setScalar(pose.batteryScale);
  const barrel=gun.group.getObjectByName('first-person-central-recoil')!;
  const mouth=battleDeckMuzzleWorld(barrel,gun.muzzles[0]);
  const screenMouth=screen(w,h,mouth);
  assert.ok(Math.abs(screenMouth.x-w*.5)<w*.045,
    'the real central muzzle remains on the camera centreline: '+screenMouth.x);
  assert.ok(screenMouth.y>h*.47&&screenMouth.y<h*.67,
    'real cannon muzzle stays above the DISPARAR command');
});

test('WORK0/#104: 320px and tall-phone cannon/ship framing is explicit',()=>{
  for(const [w,h,x,deckX,scale] of [
    [320,568,6.5,3.2,1.10],[390,844,6.5,3.2,1.10],[430,932,6.5,3.2,1.10]
  ]){
    const pose=battleCameraPose(w/h);
    assert.equal(pose.target[0],x);
    assert.equal(pose.batteryOffsetX,deckX);
    assert.equal(battleEnemyScale(w/h),scale);
  }
});


test('WORK0 #104: mobile 3D sightline gains real sky and halves cannon screen occlusion without moving the muzzle off centre',()=>{
 for(const [w,h,oldOffset] of [[320,568,2.7],[384,512,1.3],[390,844,3.6],[430,932,3.6]]){
   const pose=battleCameraPose(w/h), scale=pose.batteryScale;
   const worldLeft=(offset:number,s:number)=>new T.Vector3(offset-1.42*s,1.8*s,pose.batteryOffsetZ+68*s);
   const worldRight=(offset:number,s:number)=>new T.Vector3(offset+1.42*s,1.8*s,pose.batteryOffsetZ+68*s);
   const oldWidth=screen(w,h,worldRight(oldOffset,1)).x-screen(w,h,worldLeft(oldOffset,1)).x;
   const currentWidth=screen(w,h,worldRight(pose.batteryOffsetX,scale)).x-screen(w,h,worldLeft(pose.batteryOffsetX,scale)).x;
   assert.ok(currentWidth<oldWidth*.66,'actual near-gun occlusion shrinks by at least one third at '+w+'x'+h);
   assert.ok(currentWidth>w*.1,'real gun remains clearly visible at '+w+'x'+h);
   const enemyTop=screen(w,h,new T.Vector3(10,8.4*battleEnemyScale(w/h),-3)).y;
   const expectedTop=w/h<.62?[.35,.43]:[.35,.41];
   assert.ok(enemyTop>h*expectedTop[0]&&enemyTop<h*expectedTop[1],
     'portrait-scaled sails leave clear sky at '+w+'x'+h+': '+enemyTop);
   const gun=makeBattleDeck(true);
   gun.group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
   gun.group.scale.setScalar(scale);
   const recoil=gun.group.getObjectByName('first-person-central-recoil')!;
   const muzzle=battleDeckMuzzleWorld(recoil,gun.muzzles[0]);
   const p=screen(w,h,muzzle);
   assert.ok(Math.abs(p.x-w/2)<w*.065,'true barrel muzzle remains aligned with the central touch sightline');
 }
});

test('WORK0/#104: taller phones show a larger but fully framed real 3D starboard broadside',()=>{
  for(const [w,h] of [[390,844],[430,932]]){
    const aspect=w/h,scale=battleEnemyScale(aspect),yaw=battleEnemyBroadsideYaw(aspect);
    assert.ok(scale>=1.08&&scale<=1.12,'the real enemy cannot shrink to a thumbnail at '+w+'x'+h);
    // Project all four physical hull corners after the same live yaw/scale
    // as OceanScene.home(). No fake 2D target and no hull hitbox changes.
    for(const z of [-5,5])for(const x of [-1.8,1.8]){
      const world=new T.Vector3(
        10+scale*(Math.cos(yaw)*x+Math.sin(yaw)*z),
        0,
        -3+scale*(-Math.sin(yaw)*x+Math.cos(yaw)*z));
      const point=screen(w,h,world);
      assert.ok(point.x>6&&point.x<w-6,
        'full real 3D hull (including stern) stays within '+w+'x'+h+': '+point.x);
    }
  }
});
