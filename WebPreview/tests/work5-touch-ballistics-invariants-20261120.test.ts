/**
 * WORK 5 — isolated regression tests for portrait touch aiming and ballistics.
 * No browser/physical-iPhone assertions. No code, CSS, Unity or deployment edits.
 * These are domain tests; 10-second turns, ten-shot caps and measured ship pinch
 * remain separate, unverified requirements (see #90).
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bearingFromDrag,powerFromClientX} from '../src/battle-touch.ts';
import {Battle,collision,launch,predict,segmentBox,SHIPS} from '../src/battle.ts';

test('WORK5: every portrait phone width maps monotonic finger drag and power with hard bounds',()=>{
  for(const width of [320,375,384,390,430]){
    const start=width/2;
    let lastBearing=-Infinity;
    for(let x=-2*width;x<=3*width;x+=5){
      const yaw=bearingFromDrag(0,start,x,width);
      assert.ok(Number.isInteger(yaw)&&yaw>=-25&&yaw<=25,
        'invalid bearing at '+width+'px, x='+x);
      assert.ok(yaw>=lastBearing,'non-monotonic bearing at '+width+'px');
      lastBearing=yaw;
    }
    assert.equal(bearingFromDrag(0,start,start,width),0,'neutral drag must preserve bearing');
    assert.equal(bearingFromDrag(0,start,start+width,width),25,'positive drag limit');
    assert.equal(bearingFromDrag(0,start,start-width,width),-25,'negative drag limit');
    let lastPower=-Infinity;
    for(let x=-width;x<=2*width;x+=3){
      const power=powerFromClientX(x,0,width);
      assert.ok(Number.isInteger(power)&&power>=20&&power<=100,
        'invalid power at '+width+'px, x='+x);
      assert.ok(power>=lastPower,'non-monotonic power at '+width+'px');
      lastPower=power;
    }
    assert.equal(powerFromClientX(0,0,width),20);
    assert.equal(powerFromClientX(width,0,width),100);
    assert.equal(powerFromClientX(width/2,0,width),60);
  }
});

test('WORK5: malformed touch coordinates are bounded; rejected aiming cannot corrupt a live shot',()=>{
  assert.equal(bearingFromDrag(Number.NaN,20,30,390),0);
  assert.equal(bearingFromDrag(0,Number.POSITIVE_INFINITY,30,390),0);
  assert.equal(powerFromClientX(Number.NaN,0,390),20);
  assert.equal(powerFromClientX(25,0,0),20);
  assert.equal(powerFromClientX(25,0,-5),20);
  const b=new Battle(1261);
  b.aim(1000,1000);
  assert.equal(b.yaw,25);assert.equal(b.power,100);
  b.aim(Number.NaN,25);assert.equal(b.yaw,25);assert.equal(b.power,100);
  b.aim(-1000,-1000);assert.equal(b.yaw,-25);assert.equal(b.power,20);
  const expected=launch('player',-25,20);
  assert.equal(b.fire(),true);
  assert.deepEqual(b.shot?.velocity,expected.velocity,'shot velocity must match committed aim');
  b.aim(0,100);
  assert.equal(b.yaw,-25,'no aim mutation during projectile flight');
  assert.equal(b.power,20,'no power mutation during projectile flight');
  assert.equal(b.fire(),false,'double-tap must not create another projectile');
  assert.equal(b.shotsFired,1);
});

test('WORK5: swept hull collision wins over water and large-frame crossing cannot tunnel through ship',()=>{
  const boxMin={x:-1,y:0,z:-1},boxMax={x:1,y:2,z:1};
  assert.equal(segmentBox({x:-2,y:1,z:0},{x:2,y:1,z:0},boxMin,boxMax),.25);
  assert.equal(segmentBox({x:-2,y:3,z:0},{x:2,y:3,z:0},boxMin,boxMax),null);
  const hull=collision({x:6,y:2,z:SHIPS.enemy.z},{x:14,y:1,z:SHIPS.enemy.z},'player');
  assert.equal(hull?.type,'hit');
  assert.ok(hull!.position.x>=SHIPS.enemy.x-1.65&&hull!.position.x<=SHIPS.enemy.x+1.65);
  const splash=collision({x:0,y:2,z:15},{x:0,y:-2,z:15},'player');
  assert.equal(splash?.type,'splash');
  assert.ok(Math.abs(splash!.position.y-.08)<1e-10);
  assert.equal(collision({x:0,y:2,z:15},{x:1,y:2,z:15},'player'),null);
});

test('WORK5: previewed ballistic path starts at actual muzzle and stops only at a physical impact',()=>{
  for(const yaw of [-25,-10,0,10,25]){
    for(const power of [20,40,65,80,100]){
      const actual=launch('player',yaw,power);
      const preview=predict(yaw,power);
      assert.ok(preview.length>1&&preview.length<100,'unexpected trajectory length');
      assert.deepEqual(preview[0],actual.origin,'preview must use the live muzzle');
      for(const point of preview){
        assert.ok([point.x,point.y,point.z].every(Number.isFinite),'non-finite trajectory');
      }
      const final=preview[preview.length-1],before=preview[preview.length-2];
      assert.ok(collision(before,final,'player')!==null||final.y<=.080001,
        'preview must terminate at a hull/water contact');
    }
  }
});
