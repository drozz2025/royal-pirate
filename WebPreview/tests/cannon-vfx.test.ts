import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cannonFxState, CANNON_FX_DURATION } from '../src/cannon-vfx.ts';
import { Battle } from '../src/battle.ts';

test('cannon flash starts immediately, fades out, and gun recoil fully settles', () => {
 const first=cannonFxState(0);
 assert.equal(first.visible,true);
 assert.equal(first.recoil,0);
 assert.ok(first.flashOpacity>0.9);
 const early=cannonFxState(0.08);
 const middle=cannonFxState(0.20);
 assert.ok(early.visible);
 assert.ok(early.recoil>0);
 assert.ok(middle.recoil>0);
 assert.ok(early.flashOpacity>middle.flashOpacity);
 const end=cannonFxState(CANNON_FX_DURATION);
 assert.deepEqual(end,{recoil:0,flashScale:0,flashOpacity:0,visible:false});
 assert.deepEqual(cannonFxState(CANNON_FX_DURATION+3),end);
});

test('cannon VFX safely ignores nonsensical time input and never creates NaNs', () => {
 for (const age of [-1,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.NaN]){
  const frame=cannonFxState(age);
  assert.deepEqual(frame,{recoil:0,flashScale:0,flashOpacity:0,visible:false});
 }
 for(let i=0;i<=100;i++){
  const frame=cannonFxState(CANNON_FX_DURATION*i/100);
  assert.ok(frame.recoil>=0&&frame.recoil<=0.42);
  assert.ok(frame.flashOpacity>=0&&frame.flashOpacity<=0.93);
  assert.ok(Number.isFinite(frame.flashScale));
 }
});

test('actual battle fire event can drive presentation effects without altering damage or aim',()=>{
 const battle=new Battle(1261);
 battle.aim(0,65);
 assert.equal(battle.fire(),true);
 const fire=battle.drainEvents().find(e=>e.type==='fire');
 assert.equal(fire?.side,'player');
 assert.equal(fire?.type,'fire');
 assert.equal(battle.health.enemy,100);
 assert.equal(battle.shotsFired,1);
 assert.equal(battle.yaw,0);
 assert.equal(battle.power,65);
 assert.equal(cannonFxState(0).visible,true);
});

test('WORK0 #104: muzzle flash stays legible at low mobile FPS without changing physics',()=>{
 const at180=cannonFxState(.18),at260=cannonFxState(.26),gone=cannonFxState(.32);
 assert.equal(at180.visible,true,'a frame 180ms after DISPARAR must still show muzzle light');
 assert.ok(at180.flashOpacity>.2,'the late first-frame flash needs visible alpha');
 assert.equal(at260.visible,true,'low-FPS capture can sample the warm light after 250ms');
 assert.equal(gone.visible,false,'blast light must disappear before the recoil ends');
 assert.ok(cannonFxState(.35).recoil>0,'the original cannon still recoils after its light fades');
 const battle=new Battle(1261);
 assert.equal(battle.fire(),true);
 assert.equal(battle.shotsFired,1);
 assert.equal(battle.health.enemy,100);
 assert.ok(battle.shot,'live projectile simulation remains untouched');
});
