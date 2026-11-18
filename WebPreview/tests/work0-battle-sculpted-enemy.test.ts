import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {makeShip} from '../src/ships';

function withCanvas<TValue>(fn:()=>TValue):TValue {
  const old=Object.getOwnPropertyDescriptor(globalThis,'document');
  const context=new Proxy({}, {get:()=>()=>{}});
  Object.defineProperty(globalThis,'document',{
    configurable:true,value:{createElement:()=>({width:512,height:512,getContext:()=>context})}
  });
  try{return fn();}
  finally{
    if(old)Object.defineProperty(globalThis,'document',old);
    else Reflect.deleteProperty(globalThis,'document');
  }
}

test('WORK0 #104: red enemy canvas is sculpted, actual 3D, and keeps Royal Porto geometry intact',()=>{
  withCanvas(()=>{
    const enemy=makeShip(true),player=makeShip(false);
    assert.equal(enemy.sails.length,5,'two main sails, two topsails and third foremast');
    assert.equal(player.sails.length,6,'royal model, sails and jib remain intact');
    const red=enemy.sails[1].geometry.getAttribute('position') as T.BufferAttribute;
    const royal=player.sails[1].geometry.getAttribute('position') as T.BufferAttribute;
    assert.equal(red.count,64);
    assert.equal(royal.count,red.count);
    const lastRow=(a:T.BufferAttribute)=>Array.from({length:8},(_,i)=>a.getY(56+i));
    const range=(n:number[])=>Math.max(...n)-Math.min(...n);
    assert.ok(range(lastRow(red))>.14,'red lower hem has genuine asymmetric 3D scallops');
    assert.ok(range(lastRow(royal))<1e-6,'Royal Porto lower hem is unchanged');
    assert.ok(red.getZ(27)-royal.getZ(27)>.10,'enemy wind belly has actual 3D depth');
    for(const positions of [red,royal])
      for(let i=0;i<positions.count;i++)
        assert.ok([positions.getX(i),positions.getY(i),positions.getZ(i)].every(Number.isFinite));
    assert.equal(enemy.guns.length,6,'all live enemy cannon meshes stay intact');
    assert.equal(player.guns.length,6,'all Royal cannon meshes stay intact');
  });
});

test('WORK0 #104: painterly texture layers are enemy-only, not a screenshot or UI overlay',()=>{
  const source=readFileSync(new URL('../src/ships.ts',import.meta.url),'utf8');
  const a=source.indexOf('if(red && !flag){');
  const b=source.indexOf('c.strokeStyle = red ?',a);
  assert.ok(a>0&&b>a);
  const redPaint=source.slice(a,b);
  assert.match(redPaint,/bezierCurveTo/);
  assert.match(redPaint,/quadraticCurveTo/);
  assert.match(source,/if\(red\) p\.setY/);
  assert.match(source,/red \? \.23\*belly/);
  assert.doesNotMatch(redPaint,/\.png|\.webp|drawImage|fetch\(/);
});
