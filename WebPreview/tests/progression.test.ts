import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY,initialProfile,parseProfile,finishBattle,claimDaily,canClaimDaily,
  claimMission,missionProgress,buyCrew,equipCrew,improve,levelFor,upgradeCost,battlesPlayed} from '../src/progression.ts';

test('fresh local state is versioned, non-monetized and owns only starter captain',()=>{
 const s=initialProfile();assert.match(STORAGE_KEY,/v1$/);assert.equal(s.coins,0);assert.equal(s.xp,0);
 assert.deepEqual(s.ownedCrew,['captain']);assert.equal(s.equippedCrew,'captain');assert.equal(s.lastDailyDay,'');
});
test('corrupt JSON or future schema is ignored; local stats never invented',()=>{
 assert.deepEqual(parseProfile('not json'),initialProfile());
 assert.deepEqual(parseProfile('{"version":2,"coins":9900}'),initialProfile());
 const s=parseProfile(JSON.stringify({...initialProfile(),coins:-42,wins:NaN,ownedCrew:['navigator','other'],equippedCrew:'other',upgrades:{hull:888,cannons:2,sails:-1}}));
 assert.equal(s.coins,0);assert.equal(s.wins,0);assert.deepEqual(s.ownedCrew,['captain','navigator']);
 assert.equal(s.equippedCrew,'captain');assert.deepEqual(s.upgrades,{hull:0,cannons:2,sails:0});
});
test('win creates real local progress once per explicit completed battle',()=>{
 const s=finishBattle(initialProfile(),'victory',4,5);
 assert.equal(s.wins,1);assert.equal(s.losses,0);assert.equal(s.coins,35);assert.equal(s.xp,50);
 assert.equal(s.hits,4);assert.equal(s.shots,5);assert.equal(missionProgress(s,'first-win'),1);
 assert.equal(levelFor(s.xp),1);assert.equal(battlesPlayed(s),1);
});
test('defeat grants no coins and cannot claim victory mission',()=>{
 const s=finishBattle(initialProfile(),'defeat',1,3);
 assert.equal(s.losses,1);assert.equal(s.coins,0);assert.equal(s.xp,10);
 assert.equal(claimMission(s,'first-win'),s);
});
test('mission claim is once-only and gated by actual stats',()=>{
 const s=finishBattle(initialProfile(),'victory',4,5);
 const claimed=claimMission(s,'first-win');
 assert.equal(claimed.coins,60);assert.deepEqual(claimed.claimedMissions,['first-win']);
 assert.equal(claimMission(claimed,'first-win'),claimed);
 assert.equal(missionProgress(s,'five-hits'),4);
 assert.equal(claimMission(s,'five-hits'),s);
 const improved=finishBattle(s,'victory',3,5);
 assert.equal(missionProgress(improved,'five-hits'),5);
 assert.equal(claimMission(improved,'five-hits').coins,improved.coins+35);
});
test('crew purchases require earned coins; equipping requires ownership',()=>{
 const first=initialProfile();assert.equal(buyCrew(first,'gunner'),first);assert.equal(equipCrew(first,'navigator'),first);
 const progress=finishBattle(finishBattle(first,'victory',4,4),'victory',4,4);
 const bought=buyCrew(progress,'gunner');assert.equal(bought.coins,10);
 assert.deepEqual(bought.ownedCrew,['captain','gunner']);assert.equal(buyCrew(bought,'gunner'),bought);
 assert.equal(equipCrew(bought,'gunner').equippedCrew,'gunner');
});
test('forge charges correctly, caps levels at five, never creates currency',()=>{
 const p=initialProfile();assert.equal(improve(p,'hull'),p);assert.equal(upgradeCost('hull',0),45);
 const rich={...p,coins:2000};let s=rich;for(let i=0;i<5;i++){s=improve(s,'hull');assert.equal(s.upgrades.hull,i+1)}
 assert.equal(improve(s,'hull'),s);assert.equal(s.coins,2000-[45,80,115,150,185].reduce((a,b)=>a+b,0));
});
test('daily rewards are once per UTC day, streak only on consecutive days',()=>{
 const d1=Date.parse('2026-11-15T11:00:00Z');
 let p=initialProfile();assert.equal(canClaimDaily(p,d1),true);
 p=claimDaily(p,d1);assert.equal(p.coins,20);assert.equal(p.lastDailyDay,'2026-11-15');assert.equal(p.dailyStreak,1);
 assert.equal(canClaimDaily(p,d1+1000),false);assert.equal(claimDaily(p,d1+1000),p);
 assert.equal(claimDaily(p,d1-86400000),p);assert.equal(claimDaily(p,NaN),p);
 p=claimDaily(p,d1+86400000);assert.equal(p.coins,45);assert.equal(p.dailyStreak,2);
 p=claimDaily(p,d1+86400000*4);assert.equal(p.dailyStreak,1);assert.equal(p.coins,65);
 assert.equal(parseProfile(JSON.stringify(p)).lastDailyDay,p.lastDailyDay);
});
