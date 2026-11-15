import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProfile, finishBattle, missionProgress, claimMission, claimDaily, parseProfile, canClaimDaily, improve } from '../src/progression';

test('mission completion is driven by real battle results and cannot pay twice', () => {
  const start=initialProfile();
  assert.equal(missionProgress(start,'first-win'),0);
  const battle=finishBattle(start,'victory',5,7,Date.UTC(2026,10,15,10));
  assert.equal(missionProgress(battle,'first-win'),1);
  assert.equal(missionProgress(battle,'five-hits'),5);
  const claimed=claimMission(battle,'first-win');
  assert.equal(claimed.coins,battle.coins+25);
  assert.deepEqual(claimMission(claimed,'first-win'),claimed);
  assert.deepEqual(claimMission(start,'first-win'),start);
  assert.equal(parseProfile(JSON.stringify(claimed)).claimedMissions.includes('first-win'),true);
});

test('daily rewards use UTC day and remain single-claim after reload', () => {
  const now=Date.UTC(2026,10,15,12);
  const once=claimDaily(initialProfile(),now);
  const restored=parseProfile(JSON.stringify(once));
  assert.equal(canClaimDaily(restored,now),false);
  assert.deepEqual(claimDaily(restored,now),restored);
  assert.equal(canClaimDaily(restored,now+86_400_000),true);
  const twice=claimDaily(restored,now+86_400_000);
  assert.equal(twice.dailyStreak,2);
  assert.equal(twice.coins,once.coins+25);
});

test('three battles, upgrade spending and wallet use the same local profile', () => {
  let p=initialProfile();
  for(let i=0;i<3;i++)p=finishBattle(p,'victory',1,2,Date.UTC(2026,10,15,10+i));
  assert.equal(missionProgress(p,'three-battles'),3);
  p=claimMission(p,'three-battles');
  assert.equal(p.coins,145);
  const upgraded=improve(p,'hull');
  assert.equal(upgraded.coins,p.coins-45);
  assert.equal(upgraded.upgrades.hull,1);
  assert.deepEqual(parseProfile(JSON.stringify(upgraded)).upgrades,upgraded.upgrades);
});
