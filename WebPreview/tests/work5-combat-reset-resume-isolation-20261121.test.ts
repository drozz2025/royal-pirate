/**
 * WORK 5 — independent combat restart / isolation QA.
 * Exercises the real WebPreview battle domain only (not Unity, matchmaking,
 * device touch, the ten-second rule, or the ten-shot rule). No production edits.
 * A restart must never carry damage, queued events or PRNG history into a
 * fresh round, and background pauses must never fast-forward projectiles.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Battle, type BattleEvent} from '../src/battle.ts';

function complete(seed:number, game=new Battle(seed)) {
  const receipts:BattleEvent[]=[];
  for(let frame=0;frame<15_000;frame++){
    if(game.phase==='ready'){
      game.aim(0,65);
      assert.equal(game.fire(),true,'fresh turn rejected the player shot');
    }
    receipts.push(...game.drainEvents());
    if(game.phase==='victory'||game.phase==='defeat')break;
    game.tick(1/60);
    receipts.push(...game.drainEvents());
  }
  assert.ok(game.phase==='victory'||game.phase==='defeat',
    'seed '+seed+' never reached a terminal state');
  return {
    phase:game.phase,health:{...game.health},shotsFired:game.shotsFired,
    hits:game.hits,round:game.round,receipts
  };
}

test('WORK5: completed match restart restores initial state and produces the exact same seeded receipts',()=>{
  for(const seed of [1,1261,2026]){
    const game=new Battle(seed);
    const first=complete(seed,game);
    assert.equal(first.receipts.filter(e=>e.type==='result').length,1);
    game.reset();
    assert.equal(game.phase,'ready');
    assert.deepEqual(game.health,{player:100,enemy:100});
    assert.equal(game.round,1);
    assert.equal(game.shotsFired,0);
    assert.equal(game.hits,0);
    assert.equal(game.shot,null);
    assert.equal(game.yaw,0);
    assert.equal(game.power,65);
    assert.deepEqual(game.drainEvents(),[],'prior battle event leaked after restart');
    const second=complete(seed,game);
    assert.deepEqual(second,first,'restart changed deterministic damage, turns or battle receipts');
  }
});

test('WORK5: an offscreen or background pause cannot fast-forward a projectile beyond one capped update',()=>{
  const long=new Battle(1261),short=new Battle(1261),invalid=new Battle(1261);
  for(const game of [long,short,invalid]){
    game.aim(10,85);
    assert.equal(game.fire(),true);
    assert.equal(game.drainEvents().length,1);
  }
  const before={
    phase:invalid.phase,position:structuredClone(invalid.shot?.position),
    age:invalid.shot?.age,health:structuredClone(invalid.health)
  };
  for(const dt of [0,-1,NaN,Infinity,-Infinity])invalid.tick(dt);
  assert.deepEqual({
    phase:invalid.phase,position:invalid.shot?.position,
    age:invalid.shot?.age,health:invalid.health
  },before,'malformed background frame advanced the shot');
  long.tick(3_600);
  short.tick(.25);
  invalid.tick(.25);
  const snapshot=(g:Battle)=>({
    phase:g.phase,health:g.health,position:g.shot?.position,
    age:g.shot?.age,events:g.drainEvents()
  });
  assert.deepEqual(snapshot(long),snapshot(short),'long pause bypassed frame cap');
  assert.deepEqual(snapshot(invalid),snapshot(short),'invalid dt changed the next valid tick');
});

test('WORK5: separate local matches never share damage, aim, reset state or event queues',()=>{
  const a=new Battle(17),b=new Battle(17);
  a.aim(25,100);
  b.aim(-25,20);
  assert.equal(a.fire(),true);
  assert.equal(b.fire(),true);
  assert.equal(a.shotsFired,1);
  assert.equal(b.shotsFired,1);
  const bState={
    phase:b.phase,yaw:b.yaw,power:b.power,health:structuredClone(b.health),
    position:structuredClone(b.shot?.position),age:b.shot?.age
  };
  a.tick(.25);
  assert.deepEqual({
    phase:b.phase,yaw:b.yaw,power:b.power,health:b.health,
    position:b.shot?.position,age:b.shot?.age
  },bState,'one match updated another match through shared references');
  a.drainEvents();
  assert.equal(b.drainEvents().length,1,'another match drained this match fire event');
  a.reset();
  assert.deepEqual({
    phase:b.phase,yaw:b.yaw,power:b.power,health:b.health,
    position:b.shot?.position,age:b.shot?.age
  },bState,'reset contaminated a separate match');
  assert.equal(b.fire(),false,'second match accepted an overlapping shot');
  assert.equal(b.shotsFired,1);
});
