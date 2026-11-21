import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {battleCameraPose,battleDeckMuzzleWorld} from '../src/battle-framing';
import {readFileSync} from 'node:fs';

const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`actual ${a} vs expected ${b}`);

test('WORK0 #104: both real muzzle markers resolve full mobile deck world transform',()=>{
  const deck=new T.Group();
  deck.position.set(-2,0,-26);
  deck.scale.setScalar(battleCameraPose(384/512).batteryScale);
  const left=new T.Vector3(-5.4,4.86,65.35);
  const right=new T.Vector3(5.72,3,66.8);
  const a=battleDeckMuzzleWorld(deck,left);
  const b=battleDeckMuzzleWorld(deck,right);
  close(a.x,-2+left.x*deck.scale.x);close(a.z,-26+left.z*deck.scale.z);
  close(b.x,-2+right.x*deck.scale.x);close(b.z,-26+right.z*deck.scale.z);
  assert.ok(a.distanceTo(b)>7,'left and right mouths never coincide');
  assert.notEqual(a.x,b.x);
  close(left.x,-5.4);close(right.x,5.72); // caller's local data not mutated
  const nested=new T.Group();nested.rotation.y=.12;nested.add(deck);
  const transformed=battleDeckMuzzleWorld(deck,right);
  assert.ok(Math.abs(transformed.x-b.x)>.1,'parent rotation participates in muzzle position');
});

test('WORK0 #104: 4 mobile portraits shrink ONLY the pair of visual guns',()=>{
  for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
    const pose=battleCameraPose(w/h);
    assert.ok(pose.showBattery);
    assert.ok(pose.batteryScale<=1 && pose.batteryScale>=.8,`mobile stage scale ${w}x${h}`);
    if(w===384) assert.equal(pose.batteryScale,.84,'native first-person cannon must reclaim horizon space');
    assert.ok(Number.isFinite(pose.batteryOffsetZ));
  }
  assert.equal(battleCameraPose(1.3).batteryScale,1);
});

test('WORK0 #104: scene binds visual trajectory and both smoke/fire effects to live muzzle point',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(scene,/this\.battleBattery\.scale\.setScalar\(pose\.batteryScale\)/);
  assert.match(scene,/battleDeckMuzzleWorld\(this\.battleBattery,muzzle\)/);
  assert.match(scene,/projectileFromMuzzle\(s,visibleMuzzle\)/);
  assert.match(scene,/this\.activeBatteryMuzzle=\(Math\.max\(0,this\.battle\.shotsFired-1\)\)/);
  assert.match(scene,/vfxOrigin\?\.x\?\?event\.position\.x/);
});
