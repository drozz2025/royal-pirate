import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bearingFromDrag,powerFromClientX} from '../src/battle-touch.ts';
import {Battle,launch} from '../src/battle.ts';

test('390x844 finger drag changes yaw only and obeys ±25° limits',()=>{
 const b=new Battle();b.aim(bearingFromDrag(0,190,268,390),b.power);
 assert.equal(b.yaw,10);assert.equal(b.power,65);
 assert.equal(bearingFromDrag(10,190,700,390),25);
 assert.equal(bearingFromDrag(-10,190,-300,390),-25);
});
test('320x568 touch drag is scaled to viewport, not absolute pixels',()=>{
 assert.equal(bearingFromDrag(0,160,192,320),5);
 assert.equal(bearingFromDrag(0,195,163,320),-5);
});
test('power touch begins anywhere on existing bar and clamps to domain',()=>{
 assert.equal(powerFromClientX(20,20,200),20);
 assert.equal(powerFromClientX(120,20,200),60);
 assert.equal(powerFromClientX(220,20,200),100);
 assert.equal(powerFromClientX(-200,20,200),20);
 assert.equal(powerFromClientX(300,20,200),100);
});
test('touch mapping preserves finite aim and actual fire trajectory',()=>{
 const b=new Battle();
 b.aim(bearingFromDrag(0,170,248,390),powerFromClientX(180,20,200));
 assert.equal(b.yaw,10);assert.equal(b.power,84);
 const expected=launch('player',b.yaw,b.power);
 assert.equal(b.fire(),true);
 assert.deepEqual(b.shot?.origin,expected.origin);
 assert.deepEqual(b.shot?.velocity,expected.velocity);
 assert.equal(b.fire(),false);
 b.aim(20,20);assert.equal(b.yaw,10);assert.equal(b.power,84);
});
test('no vertical gesture or imaginary elevation/power coupling',()=>{
 assert.equal(bearingFromDrag(6,100,100,320),6);
 assert.equal(powerFromClientX(120,20,200),60);
});
