/**
 * WORK 5: independent battle event/receipt regression tests.
 * Domain simulation in Node only; no mobile browser, physical iPhone,
 * matchmaking, Unity, publication or ten-second/ten-shot rule is asserted.
 * No application, interface, other Work, or deployment source is modified.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Battle, type BattleEvent, type Side} from '../src/battle.ts';

const finished=(b:Battle)=>b.phase==='victory'||b.phase==='defeat';
const target=(side:Side):Side=>side==='player'?'enemy':'player';

function play(seed:number,dt:number){
  const game=new Battle(seed);
  const events:BattleEvent[]=[];
  let playerShots=0;
  let completed=false;
  for(let frame=0;frame<60_000;frame++){
    if(game.phase==='ready'){
      game.aim(0,65);
      assert.equal(game.fire(),true,'ready phase must accept exactly one player shot');
      playerShots++;
      assert.equal(game.fire(),false,'rapid double-tap must not create two player shots');
      assert.equal(game.shotsFired,playerShots);
    }
    events.push(...game.drainEvents());
    if(finished(game)){completed=true;break;}
    game.tick(dt);
    events.push(...game.drainEvents());
    if(finished(game)){completed=true;break;}
  }
  assert.ok(completed,'seed '+seed+' did not finish within the bounded simulation');
  return {game,events,playerShots};
}

function assertReceipts(game:Battle,events:BattleEvent[],playerShots:number){
  let pending:Side|null=null;
  let shotEvents=0,impactEvents=0,results=0,playerHits=0,enemyHits=0;
  for(const event of events){
    assert.ok(Object.values(event.position).every(Number.isFinite),
      'combat event contains non-finite coordinates');
    if(event.type==='fire'){
      assert.equal(pending,null,'new shot emitted before previous impact');
      pending=event.side;
      shotEvents++;
      continue;
    }
    if(event.type==='hit'||event.type==='splash'){
      assert.ok(pending!==null,'impact has no matching fire event');
      assert.equal(event.side,target(pending as Side),
        'impact assigned to incorrect target');
      assert.equal(event.damage,event.type==='splash'?0:event.side==='enemy'?29:22,
        'actual damage differs from battle impact receipt');
      if(event.type==='hit'){
        if(event.side==='enemy')playerHits++;else enemyHits++;
      }
      impactEvents++;
      pending=null;
      continue;
    }
    assert.equal(event.type,'result');
    assert.equal(pending,null,'battle ended while a projectile was in flight');
    results++;
    assert.equal(event.side,game.phase==='victory'?'enemy':'player',
      'result event does not identify the defeated ship');
  }
  assert.equal(pending,null,'final projectile has no impact receipt');
  assert.equal(shotEvents,impactEvents,'shot/impact event totals differ');
  assert.equal(results,1,'one finished battle must emit exactly one result event');
  assert.equal(events.at(-1)?.type,'result','result event must be terminal');
  assert.equal(events.filter(e=>e.type==='fire'&&e.side==='player').length,playerShots);
  assert.equal(game.shotsFired,playerShots);
  assert.equal(game.hits,playerHits,'visible player hit count differs from events');
  assert.equal(game.health.enemy,Math.max(0,100-29*playerHits));
  assert.equal(game.health.player,Math.max(0,100-22*enemyHits));
  assert.ok(game.health.enemy===0||game.health.player===0,
    'terminal result without a sunk ship');
  assert.deepEqual(game.drainEvents(),[],'drained events were delivered twice');
}

test('WORK5: seeded battle shots have one fire, one matching hit/splash and one terminal result',()=>{
  for(const seed of [0,1,1261,2026,99991]){
    const {game,events,playerShots}=play(seed,1/60);
    assertReceipts(game,events,playerShots);
  }
});

test('WORK5: 120 Hz and 60 Hz simulation produce identical combat receipts and damage',()=>{
  for(const seed of [1261,2026]){
    const fast=play(seed,1/120),standard=play(seed,1/60);
    assertReceipts(fast.game,fast.events,fast.playerShots);
    assertReceipts(standard.game,standard.events,standard.playerShots);
    const compact=(x:ReturnType<typeof play>)=>({
      phase:x.game.phase,health:x.game.health,round:x.game.round,
      hits:x.game.hits,shotsFired:x.game.shotsFired,
      events:x.events.map(e=>[e.type,e.side,e.damage??null])
    });
    assert.deepEqual(compact(fast),compact(standard),
      'frame cadence changed payout-relevant battle outcome or event order');
  }
});

test('WORK5: terminal victory/defeat cannot create hidden extra events or receive another fire',()=>{
  for(const seed of [1,1261,2026]){
    const {game,events,playerShots}=play(seed,1/60);
    const before={phase:game.phase,health:{...game.health},
      shotsFired:game.shotsFired,hits:game.hits,round:game.round};
    for(let i=0;i<40;i++){
      game.aim(i-20,100);
      assert.equal(game.fire(),false,'terminal battle accepted post-result shot');
      game.tick(i%2===0?86_400:1/60);
    }
    assert.deepEqual({
      phase:game.phase,health:game.health,shotsFired:game.shotsFired,
      hits:game.hits,round:game.round
    },before,'terminal game state was mutated after completion');
    assert.deepEqual(game.drainEvents(),[],'repeated result or damage emitted after completion');
    assert.equal(events.filter(e=>e.type==='result').length,1);
    assert.equal(game.shotsFired,playerShots);
  }
});
