/**
 * WORK 5: tests-only defensive boundary checks for local progression and battle.
 * No production/UI edits, cloud persistence, physical iPhone or multiplayer claims.
 * This suite does not assert the still-unimplemented 10s/10-shot contract (#90).
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  initialProfile, parseProfile, buyCrew, equipCrew, improve, upgradeCost,
  claimDaily, claimMission, finishBattle, canClaimDaily,
  exportProfileBackup, importProfileBackup,
  type LocalProfile, type UpgradeId
} from '../src/progression.ts';
import {Battle} from '../src/battle.ts';

const WHEN=Date.parse('2026-11-20T12:00:00.000Z');

test('WORK5: startup rejects unsupported/corrupt saves without inventing gold or unlocks',()=>{
  const empty=initialProfile();
  const hostile=[null,'','{','null','[]','42','"string"',
    JSON.stringify({version:2,coins:999_999}),
    JSON.stringify({version:1,coins:-500,xp:Infinity,ownedCrew:['navigator'],equippedCrew:'navigator'}),
  ];
  for(const raw of hostile){
    const p=parseProfile(raw);
    assert.ok(Number.isSafeInteger(p.coins)&&p.coins>=0,'invalid wallet after corrupt save '+raw);
    assert.ok(p.ownedCrew.includes('captain'),'default captain lost');
    assert.ok(p.ownedCrew.includes(p.equippedCrew),'unowned captain equipped');
    assert.ok(p.upgrades.hull>=0&&p.upgrades.hull<=5);
    assert.equal(new Set(p.claimedMissions).size,p.claimedMissions.length);
  }
  assert.deepEqual(parseProfile('not JSON'),empty,'invalid JSON should revert to new profile');
  assert.deepEqual(parseProfile(JSON.stringify({version:2,coins:100})),empty,'unknown save version should not masquerade as v1');
  assert.equal(parseProfile(JSON.stringify({version:1,coins:-1})).coins,0);
});

test('WORK5: three upgrade tracks charge exactly once per level, stop at five, and never go negative',()=>{
  const upgrades:UpgradeId[]=['hull','cannons','sails'];
  let p:LocalProfile={...initialProfile(),coins:20_000};
  let paid=0;
  for(const id of upgrades){
    for(let level=0;level<5;level++){
      const price=upgradeCost(id,level);
      assert.ok(Number.isSafeInteger(price)&&price>0);
      const before=p;
      p=improve(p,id);
      paid+=price;
      assert.equal(p.upgrades[id],level+1,'upgrade level drift: '+id);
      assert.equal(p.coins,before.coins-price,'wrong charge on '+id+' level '+level);
    }
    const maxed=p;
    assert.strictEqual(improve(p,id),maxed,'capped track must not charge again: '+id);
  }
  assert.equal(p.coins,20_000-paid);
  const cashless={...p,coins:0,upgrades:{...p.upgrades,hull:0}};
  assert.strictEqual(improve(cashless,'hull'),cashless,'cannot buy a ship upgrade without coins');
  const noCrew={...initialProfile(),coins:200};
  assert.strictEqual(equipCrew(noCrew,'navigator'),noCrew,'cannot equip unowned navigator');
  const purchased=buyCrew(noCrew,'navigator');
  assert.equal(purchased.coins,110);
  assert.strictEqual(buyCrew(purchased,'navigator'),purchased,'repeated crew purchase must not charge again');
  assert.equal(equipCrew(purchased,'navigator').equippedCrew,'navigator');
});

test('WORK5: simultaneous eligible mission claims and UTC reward remain single-use after backup restore',()=>{
  let p:LocalProfile={...initialProfile(),wins:3,losses:2,hits:8,shots:12,coins:140};
  const missions=['first-win','five-hits','three-battles'] as const;
  const rewards=[25,35,40];
  for(let i=0;i<missions.length;i++){
    const before=p;
    p=claimMission(p,missions[i]);
    assert.equal(p.coins,before.coins+rewards[i],'wrong mission payout: '+missions[i]);
    assert.strictEqual(claimMission(p,missions[i]),p,'mission re-claim paid twice');
  }
  assert.equal(p.coins,240);
  p=claimDaily(p,WHEN);
  assert.equal(p.coins,260);
  assert.equal(canClaimDaily(p,WHEN+1000),false);
  const restored=importProfileBackup(exportProfileBackup(p,WHEN));
  assert.deepEqual(restored,p,'backup dropped reward entitlement markers');
  assert.strictEqual(claimDaily(restored,WHEN+2000),restored,'backup reopened same UTC daily reward');
  for(const id of missions)assert.strictEqual(claimMission(restored,id),restored,'backup reopened mission '+id);
  assert.equal(restored.coins,260);
});

test('WORK5: malformed tick times and post-result inputs cannot replay a battle payout or alter health',()=>{
  const battle=new Battle(1261);
  const baseline={phase:battle.phase,round:battle.round,health:{...battle.health},shots:battle.shotsFired};
  for(const badDt of [0,-1,Number.NaN,Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY]){
    battle.tick(badDt);
    assert.deepEqual({phase:battle.phase,round:battle.round,health:battle.health,shots:battle.shotsFired},baseline,
      'non-finite/negative tick corrupted a new battle');
  }
  for(let turn=0;turn<20&&!['victory','defeat'].includes(battle.phase);turn++){
    battle.aim(0,65);
    assert.equal(battle.fire(),true);
    assert.equal(battle.fire(),false,'double tap fired twice');
    for(let frame=0;frame<2500&&!['ready','victory','defeat'].includes(battle.phase);frame++){
      battle.tick(1/60);
    }
    assert.ok(['ready','victory','defeat'].includes(battle.phase),'turn did not finish');
  }
  assert.equal(battle.phase,'victory','seeded accurate shots should win deterministically');
  const final={phase:battle.phase,round:battle.round,health:{...battle.health},
    shots:battle.shotsFired,hits:battle.hits};
  const terminalEvents=battle.drainEvents();
  assert.equal(terminalEvents.filter(e=>e.type==='result').length,1,'exactly one match result event');
  for(let i=0;i<500;i++)battle.tick(1/30);
  battle.aim(-25,100);
  assert.equal(battle.fire(),false,'completed battle accepted another shot');
  assert.deepEqual({phase:battle.phase,round:battle.round,health:battle.health,
    shots:battle.shotsFired,hits:battle.hits},final,'finished match mutated on extra input');
  assert.deepEqual(battle.drainEvents(),[],'terminal result was duplicated after extra ticks');
  const p=finishBattle(initialProfile(),'victory',battle.hits,battle.shotsFired,WHEN);
  assert.equal(p.coins,35);
  assert.equal(p.battleLog.length,1);
});
