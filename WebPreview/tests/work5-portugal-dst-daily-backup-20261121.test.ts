/**
 * WORK 5 — independent QA around Portugal DST and leap-day UTC daily rewards.
 * Domain tests only: NOT a native iPhone/browser test, cloud save, multiplayer,
 * UI design review, or release. No production/WORK0/2/4/6/Unity/Sites edits.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  initialProfile, claimDaily, canClaimDaily,
  exportProfileBackup, importProfileBackup, parseProfile
} from '../src/progression.ts';

const at=(iso:string)=>Date.parse(iso);
const lisbonClock=(iso:string)=>new Intl.DateTimeFormat('en-GB',{
  timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
}).format(new Date(iso));

function paidDay(profile:ReturnType<typeof initialProfile>,iso:string,streak:number,coins:number){
  const now=at(iso);
  assert.equal(canClaimDaily(profile,now),true,'UTC day should be eligible: '+iso);
  const previous=structuredClone(profile);
  const paid=claimDaily(profile,now);
  assert.equal(paid.lastDailyDay,iso.slice(0,10),'reward associated with wrong UTC day');
  assert.equal(paid.dailyStreak,streak,'streak drift at '+iso);
  assert.equal(paid.coins,coins,'local wallet drift at '+iso);
  assert.deepEqual(profile,previous,'reward mutated an earlier snapshot');
  const saved=parseProfile(JSON.stringify(paid));
  const restored=importProfileBackup(exportProfileBackup(saved,now+1000));
  assert.deepEqual(restored,paid,'local reload / backup changed reward history');
  assert.strictEqual(claimDaily(restored,now+2000),restored,'same UTC date paid again after restore');
  return restored;
}

test('WORK5: Lisbon spring-forward gap cannot mint an extra daily reward during a 23-hour civil day',()=>{
  assert.equal(lisbonClock('2026-03-29T00:30:00.000Z'),'00:30');
  assert.equal(lisbonClock('2026-03-29T01:30:00.000Z'),'02:30',
    'Portugal DST spring jump is not represented in the test fixture');
  let p=paidDay(initialProfile(),'2026-03-28T23:59:00.000Z',1,20);
  p=paidDay(p,'2026-03-29T00:30:00.000Z',2,45);
  const snapshot=structuredClone(p);
  const afterJump=at('2026-03-29T01:30:00.000Z');
  assert.equal(canClaimDaily(p,afterJump),false,
    'advancing Lisbon clock by 2 local hours reopened a UTC reward');
  assert.strictEqual(claimDaily(p,afterJump),p);
  assert.deepEqual(p,snapshot);
  p=paidDay(p,'2026-03-30T00:05:00.000Z',3,75);
  assert.equal(p.coins,75);
});

test('WORK5: Lisbon repeated autumn hour cannot replay the same local daily reward',()=>{
  assert.equal(lisbonClock('2026-10-25T00:30:00.000Z'),'01:30');
  assert.equal(lisbonClock('2026-10-25T01:30:00.000Z'),'01:30',
    'Portugal DST repeated hour is not represented in the test fixture');
  let p=paidDay(initialProfile(),'2026-10-24T23:45:00.000Z',1,20);
  p=paidDay(p,'2026-10-25T00:30:00.000Z',2,45);
  const repeat=at('2026-10-25T01:30:00.000Z');
  assert.equal(canClaimDaily(p,repeat),false,
    'repeated local 01:30 reopened an already claimed UTC reward');
  assert.strictEqual(claimDaily(p,repeat),p);
  const persisted=importProfileBackup(exportProfileBackup(p,repeat+1000));
  assert.strictEqual(claimDaily(persisted,repeat+2000),persisted);
  p=paidDay(persisted,'2026-10-26T00:05:00.000Z',3,75);
  assert.equal(p.dailyStreak,3);
});

test('WORK5: leap-day 2028 claim stays single-use across local reload and strict backup restore',()=>{
  let p=paidDay(initialProfile(),'2028-02-28T23:55:00.000Z',1,20);
  p=paidDay(p,'2028-02-29T00:05:00.000Z',2,45);
  const lateLeapDay=at('2028-02-29T23:55:00.000Z');
  assert.strictEqual(claimDaily(p,lateLeapDay),p,'leap-day payout duplicated at 23:55 UTC');
  p=paidDay(p,'2028-03-01T00:05:00.000Z',3,75);
  const backup=exportProfileBackup(p,at('2028-03-01T00:06:00.000Z'));
  assert.equal(JSON.parse(backup).profile.lastDailyDay,'2028-03-01');
  assert.deepEqual(importProfileBackup(backup),p);
  assert.strictEqual(claimDaily(p,at('2028-02-29T00:05:00.000Z')),p,
    'rolling clock back to leap day created a duplicate reward');
});
