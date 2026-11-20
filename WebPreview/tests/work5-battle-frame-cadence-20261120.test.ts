/**
 * WORK 5 — independent, tests-only battle cadence/regression contract.
 * Runs deterministic simulation at several update rates; this is NOT
 * multiplayer verification, a physical iPhone test or the unimplemented
 * 10-second / 10-attempt game rule tracked in issue #90.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Battle,type BattleEvent} from '../src/battle.ts';

type Mode='accurate'|'miss';
type Result={
  phase:string;
  health:{player:number;enemy:number};
  shotsFired:number;
  hits:number;
  round:number;
  fired:number;
  resolved:number;
  results:number;
  events:BattleEvent[];
};
function play(seed:number,dt:number,mode:Mode):Result {
  const b=new Battle(seed);
  const events:BattleEvent[]=[];
  let rounds=0;
  while(!['victory','defeat'].includes(b.phase)&&rounds<20){
    const before=b.shotsFired;
    b.aim(mode==='accurate'?0:25,mode==='accurate'?65:20);
    assert.equal(b.fire(),true,'cannot start an ordinary player turn');
    assert.equal(b.fire(),false,'same-turn double fire must be rejected');
    assert.equal(b.shotsFired,before+1,'a player tap must count once');
    events.push(...b.drainEvents());
    let frames=0;
    const maxFrames=Math.ceil(40/dt);
    while(!['ready','victory','defeat'].includes(b.phase)&&frames<maxFrames){
      b.tick(dt);
      events.push(...b.drainEvents());
      frames++;
    }
    assert.ok(frames<maxFrames,'turn did not resolve at '+dt+' s/frame, seed '+seed);
    assert.ok(['ready','victory','defeat'].includes(b.phase),'invalid post-turn phase');
    assert.deepEqual(b.drainEvents(),[],'drained events must not replay');
    rounds++;
  }
  assert.ok(['victory','defeat'].includes(b.phase),'match must terminate');
  assert.equal(b.phase,mode==='accurate'?'victory':'defeat','expected scenario result');
  const fired=events.filter(e=>e.type==='fire').length;
  const resolved=events.filter(e=>e.type==='hit'||e.type==='splash').length;
  const results=events.filter(e=>e.type==='result').length;
  assert.equal(fired,resolved,'each projectile must have exactly one physical resolution');
  assert.equal(results,1,'exactly one match-completion event');
  assert.equal(events.at(-1)?.type,'result','match completion must be final event');
  assert.equal(b.fire(),false,'finished match must reject extra shot');
  assert.ok(b.shotsFired>0&&b.shotsFired<=20);
  assert.ok(b.hits<=b.shotsFired,'hit count cannot exceed fired shots');
  assert.ok([b.health.player,b.health.enemy].every(h=>Number.isInteger(h)&&h>=0&&h<=100));
  return {phase:b.phase,health:{...b.health},shotsFired:b.shotsFired,hits:b.hits,round:b.round,fired,resolved,results,events};
}

test('WORK5: battle outcomes and financial counters stay identical across 30/60/120 Hz',()=>{
  for(const seed of [1,2,7,17,61,1261,65535,987654321]){
    for(const mode of ['accurate','miss'] as const){
      const reference=play(seed,1/60,mode);
      for(const fps of [30,120]){
        const sample=play(seed,1/fps,mode);
        assert.deepEqual({
          phase:sample.phase,health:sample.health,shotsFired:sample.shotsFired,
          hits:sample.hits,round:sample.round,fired:sample.fired,
          resolved:sample.resolved,results:sample.results
        },{
          phase:reference.phase,health:reference.health,shotsFired:reference.shotsFired,
          hits:reference.hits,round:reference.round,fired:reference.fired,
          resolved:reference.resolved,results:reference.results
        },'cadence changed battle result, seed '+seed+', mode '+mode+', fps '+fps);
      }
    }
  }
});

test('WORK5: reset after interrupted projectile or waiting opponent clears ghost events',()=>{
  for(const seed of [1,17,1261]){
    const b=new Battle(seed);
    assert.equal(b.fire(),true);
    b.tick(0.1);
    b.reset();
    assert.equal(b.phase,'ready');
    assert.equal(b.shot,null);
    assert.equal(b.shotsFired,0);
    assert.deepEqual(b.drainEvents(),[]);
    for(let i=0;i<100;i++)b.tick(1/30);
    assert.equal(b.phase,'ready','old projectile or delayed opponent survived reset');
    assert.deepEqual(b.health,{player:100,enemy:100});
    const fresh=new Battle(seed);
    assert.equal(b.fire(),true);
    assert.equal(fresh.fire(),true);
    for(let frame=0;frame<900;frame++){
      b.tick(1/60); fresh.tick(1/60);
      assert.deepEqual(b.drainEvents(),fresh.drainEvents(),'reset changed replay events');
      if(b.phase==='ready'&&fresh.phase==='ready')break;
    }
    assert.deepEqual({
      phase:b.phase,health:b.health,shotsFired:b.shotsFired,hits:b.hits,round:b.round
    },{
      phase:fresh.phase,health:fresh.health,shotsFired:fresh.shotsFired,hits:fresh.hits,round:fresh.round
    },'reset and new game diverge');
  }
});
