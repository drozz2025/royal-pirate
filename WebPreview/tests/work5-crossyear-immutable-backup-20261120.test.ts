/**
 * WORK 5 — independent calendar, immutability and local-backup regression.
 * Tests only. No production code, UX/CSS, Unity, deployment, paid APIs,
 * cloud accounts or physical iPhone validation are involved.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  initialProfile, parseProfile, finishBattle, claimDaily, canClaimDaily,
  claimMission, buyCrew, equipCrew, improve,
  exportProfileBackup, importProfileBackup,
  type LocalProfile
} from '../src/progression.ts';

const ms=(iso:string)=>Date.parse(iso);

test('WORK5: leap-day and year-end UTC boundaries award exactly one daily reward per day even after backup restore',()=>{
  const dates=[
    '2028-02-28T23:59:59.999Z',
    '2028-02-29T00:00:00.000Z',
    '2028-03-01T00:00:00.000Z',
    '2028-12-31T23:59:59.999Z',
    '2029-01-01T00:00:00.000Z'
  ];
  let profile=initialProfile();
  const expectedStreak=[1,2,3,1,2];
  for(let index=0;index<dates.length;index++){
    const at=ms(dates[index]);
    assert.equal(canClaimDaily(profile,at),true,'valid UTC day '+index+' must be claimable');
    const previous=profile.coins;
    profile=claimDaily(profile,at);
    assert.equal(profile.dailyStreak,expectedStreak[index],'UTC streak drift at '+dates[index]);
    assert.equal(profile.coins,previous+15+expectedStreak[index]*5,'wrong UTC-day reward');
    assert.equal(profile.lastDailyDay,dates[index].slice(0,10));
    assert.strictEqual(claimDaily(profile,at),profile,'same millisecond paid twice');
    const sameDayNoon=ms(dates[index].slice(0,10)+'T12:00:00.000Z');
    assert.strictEqual(claimDaily(profile,sameDayNoon),profile,'same UTC day paid twice');
    const restored=importProfileBackup(exportProfileBackup(profile,at));
    assert.deepEqual(restored,profile,'backup forgot UTC-day claim state');
    assert.strictEqual(claimDaily(restored,at),restored,'backup reopened claimed UTC day');
    profile=restored;
  }
  assert.equal(profile.coins,20+25+30+20+25);
  assert.equal(canClaimDaily(profile,ms('2028-12-31T12:00:00.000Z')),false,
    'clock rollback must not reopen earlier rewards');
});

test('WORK5: frozen profile inputs remain immutable across purchase, battle, upgrade, mission and backup',()=>{
  let original:LocalProfile={...initialProfile(),coins:240};
  original=finishBattle(original,'victory',5,6,ms('2026-11-20T15:00:00.000Z'));
  const reference=structuredClone(original);
  Object.freeze(original.ownedCrew);
  Object.freeze(original.upgrades);
  Object.freeze(original.claimedMissions);
  for(const row of original.battleLog)Object.freeze(row);
  Object.freeze(original.battleLog);
  Object.freeze(original);
  let changed=buyCrew(original,'gunner');
  assert.equal(changed.coins,reference.coins-60);
  changed=equipCrew(changed,'gunner');
  changed=improve(changed,'hull');
  assert.equal(changed.coins,reference.coins-60-45);
  changed=claimMission(changed,'first-win');
  assert.equal(changed.coins,reference.coins-60-45+25);
  changed=claimDaily(changed,ms('2026-11-20T16:00:00.000Z'));
  assert.equal(changed.coins,reference.coins-60-45+25+20);
  const loaded=importProfileBackup(exportProfileBackup(changed,ms('2026-11-20T17:00:00.000Z')));
  assert.deepEqual(loaded,changed);
  assert.deepEqual(original,reference,'economy operation mutated its input profile');
  assert.notStrictEqual(loaded.ownedCrew,changed.ownedCrew,'restored roster aliases current player');
  assert.notStrictEqual(loaded.upgrades,changed.upgrades,'restored upgrades alias current player');
  assert.notStrictEqual(loaded.battleLog,changed.battleLog,'restored battle history aliases current player');
});

test('WORK5: invalid local backup counters, ownership, missions and battle receipts fail closed without mutating the captain',()=>{
  const at=ms('2026-11-20T14:00:00.000Z');
  const active=finishBattle(initialProfile(),'victory',3,5,at);
  const snapshot=structuredClone(active);
  const valid=JSON.parse(exportProfileBackup(active,at));
  const changes:Array<[string,(x:any)=>void]>=[
    ['negative wallet',x=>{x.profile.coins=-1;}],
    ['fractional XP',x=>{x.profile.xp=0.5;}],
    ['impossible hit count',x=>{x.profile.hits=x.profile.shots+1;}],
    ['excess upgrade',x=>{x.profile.upgrades.cannons=6;}],
    ['duplicate roster',x=>{x.profile.ownedCrew.push('captain');}],
    ['unowned equipped crew',x=>{x.profile.equippedCrew='navigator';}],
    ['duplicate mission reward',x=>{x.profile.claimedMissions=['first-win','first-win'];}],
    ['invalid daily streak',x=>{x.profile.dailyStreak=8;}],
    ['forged battle payout',x=>{x.profile.battleLog[0].earnedCoins=4000;}],
    ['invalid battle calendar day',x=>{x.profile.battleLog[0].completedAt='2026-02-30T00:00:00.000Z';}],
    ['invalid battle hit count',x=>{x.profile.battleLog[0].hits=x.profile.battleLog[0].shots+1;}],
    ['unsupported backup schema',x=>{x.version=99;}],
    ['missing backup signature',x=>{x.format='another-game';}]
  ];
  for(const [label,change] of changes){
    const bad=structuredClone(valid);
    change(bad);
    assert.throws(()=>importProfileBackup(JSON.stringify(bad)),Error,
      'untrusted backup accepted: '+label);
    assert.deepEqual(active,snapshot,'failed import changed current profile: '+label);
  }
  assert.deepEqual(parseProfile(JSON.stringify(active)),snapshot,'valid save no longer reloads');
  assert.deepEqual(importProfileBackup(JSON.stringify(valid)),snapshot,'valid backup was rejected');
});
