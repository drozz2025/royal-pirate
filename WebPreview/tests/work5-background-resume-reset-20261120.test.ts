/**
 * WORK 5 — independent mobile suspend/resume and battle lifecycle invariants.
 * Tests only: no app logic, UI/CSS, assets, Unity or deployment edits.
 * Simulates time deltas in Node, not a real phone/background browser tab.
 * Does not claim implementation of #90 (ten-second / ten-shot rules).
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Battle,type Phase} from '../src/battle.ts';

const PHASES:Phase[]=['ready','player-flight','enemy-aim','enemy-flight','victory','defeat'];
const ACTIVE:Phase[]=['ready','player-flight','enemy-aim','enemy-flight'];
const ended=(b:Battle)=>b.phase==='victory'||b.phase==='defeat';

function reach(target:Phase):Battle {
  const b=new Battle(1261);
  if(target==='ready')return b;
  const miss=target==='enemy-aim'||target==='enemy-flight'||target==='defeat';
  for(let frame=0;frame<30_000;frame++){
    if(b.phase==='ready'){
      b.aim(miss?25:0,miss?20:65);
      assert.equal(b.fire(),true,'turn must begin while preparing '+target);
    }
    if(b.phase===target)return b;
    assert.equal(ended(b),false,'unexpected terminal phase while reaching '+target);
    b.tick(1/60);
    if(b.phase===target)return b;
  }
  throw new Error('Could not reach battle phase '+target);
}

function snapshot(b:Battle){
  return {phase:b.phase,round:b.round,health:{...b.health},
    yaw:b.yaw,power:b.power,shot:b.shot?structuredClone(b.shot):null,
    shotsFired:b.shotsFired,hits:b.hits,lastMessage:b.lastMessage,
    events:structuredClone(b.events)};
}

test('WORK5: background-tab elapsed time is capped to 250 ms in all active battle phases',()=>{
  for(const phase of ACTIVE){
    const normal=reach(phase),sleep=reach(phase);
    normal.drainEvents();sleep.drainEvents();
    normal.tick(.25);
    sleep.tick(86_400); // simulate one whole day away from a mobile tab
    assert.deepEqual(snapshot(sleep),snapshot(normal),
      'suspended tab skipped damage, opponent turn or shot physics in '+phase);
    assert.ok([sleep.health.player,sleep.health.enemy].every(
      value=>Number.isFinite(value)&&value>=0&&value<=100),
      'invalid health after tab resume in '+phase);
  }
});

test('WORK5: restarting in every battle phase removes ghost shots and reproduces seeded first turn',()=>{
  for(const phase of PHASES){
    const resumed=reach(phase),fresh=new Battle(1261);
    resumed.reset();
    assert.deepEqual(snapshot(resumed),snapshot(fresh),
      'reset left a stale projectile, reward, health or control in '+phase);
    for(let i=0;i<300;i++)resumed.tick(1/60);
    assert.deepEqual(snapshot(resumed),snapshot(fresh),
      'background timer revived a cancelled fight after reset from '+phase);
    resumed.aim(0,65);fresh.aim(0,65);
    assert.equal(resumed.fire(),true);
    assert.equal(fresh.fire(),true);
    for(let i=0;i<4000;i++){
      resumed.tick(1/60);
      fresh.tick(1/60);
      assert.deepEqual(resumed.drainEvents(),fresh.drainEvents(),
        'restarted fight produced a different event sequence after '+phase);
      if(resumed.phase==='ready'&&fresh.phase==='ready')break;
      if(ended(resumed)||ended(fresh))break;
    }
    assert.deepEqual(snapshot(resumed),snapshot(fresh),
      'reset did not restore deterministic game state after '+phase);
  }
});

test('WORK5: enemy turn and finished match reject repeated fire/aim taps without new events',()=>{
  for(const phase of ['player-flight','enemy-aim','enemy-flight','victory','defeat'] as Phase[]){
    const b=reach(phase);
    const before=snapshot(b);
    for(let i=0;i<120;i++){
      b.aim(i%2?25:-25,i%2?100:20);
      assert.equal(b.fire(),false,'extra tap accepted during '+phase);
    }
    assert.deepEqual(snapshot(b),before,
      'input flood changed the pending/finished turn in '+phase);
  }
});
