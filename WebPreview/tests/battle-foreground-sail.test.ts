import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {battleCameraPose} from '../src/battle-framing';
import {BATTLE_SAIL_BOUNDS, makeBattleForegroundSail} from '../src/battle-foreground-sail';

function project(w:number,h:number,position: T.Vector3) {
  const pose=battleCameraPose(w/h);
  const camera=new T.PerspectiveCamera(42,w/h,.1,220);
  camera.position.set(...pose.position);
  camera.lookAt(...pose.target);
  camera.updateMatrixWorld();
  const ndc=position.clone().project(camera);
  return {x:(ndc.x+1)*w/2,y:(1-ndc.y)*h/2};
}

test('battle art is actual curved 3D canvas with rigging and sculpted emblem',()=>{
  const group=makeBattleForegroundSail();
  assert.equal(group.name,'battle-only-black-foreground-sail');
  assert.equal(group.userData.battleOnly,true);
  const sail=group.getObjectByName('curved-foreground-canvas') as T.Mesh;
  assert.ok(sail);
  const positions=sail.geometry.getAttribute('position') as T.BufferAttribute;
  assert.ok(positions.count>=100);
  const depths=Array.from({length:positions.count},(_,i)=>positions.getZ(i));
  assert.ok(Math.max(...depths)-Math.min(...depths)>.2,'sail must have real volume');
  assert.ok(depths.every(Number.isFinite));
  assert.ok(group.getObjectByName('foreground-jolly-roger'));
  assert.ok(group.children.length>=9,'sail, yard, ropes and insignia are separate live meshes');
});

test('reference left sail is legible yet stays above fire/cannon controls at 320/390/430',()=>{
  const bounds=BATTLE_SAIL_BOUNDS;
  for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
    // scene.ts uses a native-compact left crop without changing the tall-phone
    // position; project the real rig with the correct conditional world offset.
    const sceneShiftX=(w/h)>=.50?.65:2.3;
    const tl=project(w,h,new T.Vector3(bounds.left+sceneShiftX,bounds.top,bounds.depth));
    const br=project(w,h,new T.Vector3(bounds.right+sceneShiftX,bounds.bottom,bounds.depth));
    assert.ok(tl.y>h*.26, `sail clears top title and HP region ${w}x${h}: ${tl.y}`);
    assert.ok(br.y<h*.66, `sail clears fire/cannon row ${w}x${h}: ${br.y}`);
    assert.ok(br.x>w*.18&&br.x<w*.48,`foreground stays left of enemy ${w}x${h}: ${br.x}`);
    assert.ok(tl.x<w*.20,`foreground silhouette starts near the left screen edge ${w}x${h}: ${tl.x}`);
  }
});

test('battle foreground is hidden in Porto, with original camera and controls retained',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(scene,/this\.battleForegroundSail\.visible=false;this\.worldScenery\.visible=true/);
  assert.match(scene,/this\.battleForegroundSail\.visible=true;/);
  assert.match(scene,/this\.camera\.position\.set\(\.\.\.pose\.position\)/);
  assert.match(scene,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/);
  assert.match(scene,/this\.ships\.enemy\.root\.scale\.setScalar\(compactBattle\?1\.88:1\.82\)/);
});
