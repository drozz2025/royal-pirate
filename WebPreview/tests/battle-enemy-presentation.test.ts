import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {makeShip} from '../src/ships.ts';
import {battleCameraPose} from '../src/battle-framing';

function withFakeCanvas<TValue>(fn:()=>TValue):TValue {
  const original=Object.getOwnPropertyDescriptor(globalThis,'document');
  const ctx=new Proxy({}, {get:()=>()=>{}});
  Object.defineProperty(globalThis,'document',{
    configurable:true,
    value:{createElement:()=>({width:512,height:512,getContext:()=>ctx})}
  });
  try{return fn();}
  finally{
    if(original)Object.defineProperty(globalThis,'document',original);
    else Reflect.deleteProperty(globalThis,'document');
  }
}

test('enemy galleon is red, three-masted and billowed geometry, not an overlay',()=>{
  withFakeCanvas(()=>{
    const enemy=makeShip(true);
    const player=makeShip(false);
    assert.equal(player.sails.length,6,'royal Porto/player geometry remains untouched');
    assert.equal(enemy.sails.length,5,'two main sails, two topsails and a third foremast');
    const foresail=enemy.root.getObjectByName('enemy-billowed-foresail') as T.Mesh;
    assert.ok(foresail,'enemy has a genuine third red 3D sail');
    const positions=foresail.geometry.getAttribute('position') as T.BufferAttribute;
    assert.ok(positions.count>=60);
    const depths=Array.from({length:positions.count},(_,i)=>positions.getZ(i));
    assert.ok(Math.max(...depths)-Math.min(...depths)>.3,'curved cloth must have real volume');
    assert.ok(depths.every(Number.isFinite));
    assert.equal(enemy.guns.length,6,'original cannon visuals remain');
  });
});

test('enemy battle-only presentation leaves the tested camera and Porto intact',()=>{
  const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(source,/this\.ships\.enemy\.root\.rotation\.y=-\.48/);
  assert.match(source,/this\.ships\.enemy\.root\.scale\.setScalar\(1\.72\)/);
  assert.match(source,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/);
  assert.match(source,/this\.battleForegroundSail\.visible=false;this\.worldScenery\.visible=true/);
  for(const [w,h] of [[320,568],[390,844],[430,932]]){
    const pose=battleCameraPose(w/h);
    const camera=new T.PerspectiveCamera(42,w/h,.1,220);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld();
    const points=[
      new T.Vector3(10,0,-3),
      new T.Vector3(10,1.72*8.4,-3),
      new T.Vector3(10,1.72*6.7,-3+1.72*3.42)
    ];
    for(const point of points){
      const ndc=point.project(camera);
      assert.ok(Number.isFinite(ndc.x)&&Number.isFinite(ndc.y));
      assert.ok(ndc.x>-1&&ndc.x<1,
        `enemy anchor visible at ${w}x${h}: ${ndc.x}`);
    }
  }
});
