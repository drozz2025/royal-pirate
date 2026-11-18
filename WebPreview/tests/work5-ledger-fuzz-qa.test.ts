import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  CREW, MISSIONS, UPGRADES, initialProfile, parseProfile, finishBattle,
  claimDaily, canClaimDaily, nextDailyStreak, claimMission, buyCrew, equipCrew,
  improve, upgradeCost, exportProfileBackup, importProfileBackup
} from '../src/progression.ts';

/** WORK 5 independent regression suite. Only the deterministic local data rules
 * are exercised here: this does NOT claim browser, WebGL, touch or iPhone testing.
 * Never edits the source owned by WORK 4 or the Porto owned by WORK 6.
 */
const t0=Date.parse('2026-11-15T10:00:00.000Z');
function nextRandom(seed:number):()=>number {
  let value=seed>>>0;
  return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value;};
}

test('180 deterministic battles conserve coins, XP, purchases, upgrades and imported saves',()=>{
  const rng=nextRandom(0x50a2026);
  let p=initialProfile();
  let expectedCoins=0,expectedXp=0,expectedWins=0,expectedLosses=0;
  let expectedHits=0,expectedShots=0;
  for(let i=0;i<180;i++){
    if(i%9===0){
      const now=t0+(i/9)*86_400_000;
      const eligible=canClaimDaily(p,now);
      const streak=nextDailyStreak(p,now);
      const previous=p;
      p=claimDaily(p,now);
      assert.equal(eligible,true,'one daily claim per simulated UTC day');
      assert.notEqual(p,previous);
      expectedCoins+=15+5*streak;
      assert.equal(claimDaily(p,now),p,'UTC day cannot be claimed twice');
    }

    const outcome=rng()%5===0?'defeat':'victory';
    const shots=3+rng()%6;
    const hits=rng()%(shots+1);
    const now=t0+i*60_000;
    const previous=p;
    p=finishBattle(p,outcome,hits,shots,now);
    assert.notEqual(p,previous);
    expectedXp+=outcome==='victory'?50:10;
    expectedCoins+=outcome==='victory'?35:0;
    expectedWins+=outcome==='victory'?1:0;
    expectedLosses+=outcome==='defeat'?1:0;
    expectedHits+=hits;
    expectedShots+=shots;

    for(const mission of MISSIONS){
      const before=p;
      p=claimMission(p,mission.id);
      if(before!==p){
        expectedCoins+=mission.reward;
        assert.ok(p.claimedMissions.includes(mission.id));
        assert.equal(claimMission(p,mission.id),p,'reward cannot be duplicated');
      }
    }
    for(const crew of CREW.filter(c=>c.id!=='captain')){
      if(i%(crew.id==='gunner'?13:19)!==0)continue;
      const before=p;
      p=buyCrew(p,crew.id);
      if(before!==p){
        expectedCoins-=crew.cost;
        assert.equal(buyCrew(p,crew.id),p,'recruitment cannot be charged twice');
      }
    }
    if(i%11===0){
      const upgrade=UPGRADES[i%UPGRADES.length];
      const before=p;
      const cost=upgradeCost(upgrade.id,p.upgrades[upgrade.id]);
      p=improve(p,upgrade.id);
      if(before!==p)expectedCoins-=cost;
    }
    if(i%17===0){
      const crew=CREW[i%CREW.length];
      const before=p;
      p=equipCrew(p,crew.id);
      if(!before.ownedCrew.includes(crew.id))assert.equal(p,before,'cannot equip unowned crew');
    }

    assert.equal(p.wins,expectedWins);
    assert.equal(p.losses,expectedLosses);
    assert.equal(p.xp,expectedXp);
    assert.equal(p.hits,expectedHits);
    assert.equal(p.shots,expectedShots);
    assert.equal(p.coins,expectedCoins,'all spending must be funded by actual earnings');
    assert.ok(p.coins>=0,'local coins must never go negative');
    assert.ok(p.battleLog.length<=12,'keep memory and backup history bounded');
    assert.ok(p.battleLog.every(b=>b.hits<=b.shots));
    for(let j=1;j<p.battleLog.length;j++){
      assert.ok(p.battleLog[j-1].completedAt>=p.battleLog[j].completedAt,'newest battle first');
    }
    if(i%17===0){
      const backup=exportProfileBackup(p,t0+(i+1)*60_000);
      assert.deepEqual(importProfileBackup(backup),p,'backup retains real in-game progress');
      assert.deepEqual(parseProfile(JSON.stringify(p)),p,'local storage retains real progress');
    }
  }
  assert.equal(p.wins+p.losses,180);
  assert.equal(p.battleLog.length,12);
  assert.deepEqual(importProfileBackup(exportProfileBackup(p,t0+181*60_000)),p);
});

test('backup import refuses injected currency, fake battle records and invalid ownership',()=>{
  let p=initialProfile();
  for(let i=0;i<13;i++)p=finishBattle(p,i%2===0?'victory':'defeat',2,3,t0+i*60_000);
  const original=JSON.parse(exportProfileBackup(p,t0+15*60_000));
  const cases:Array<[string,(x:any)=>void]>=[
    ['negative coins',x=>{x.profile.coins=-1;}],
    ['fractional coins',x=>{x.profile.coins=5.5;}],
    ['unbounded XP',x=>{x.profile.xp=1_000_000_001;}],
    ['impossible lifetime hits',x=>{x.profile.shots=0;}],
    ['duplicate crew',x=>{x.profile.ownedCrew=['captain','captain'];}],
    ['equip non-owned crew',x=>{x.profile.equippedCrew='navigator';}],
    ['forged mission identifier',x=>{x.profile.claimedMissions=['fake-mission'];}],
    ['illegal upgrade level',x=>{x.profile.upgrades.sails=6;}],
    ['illegal daily streak',x=>{x.profile.dailyStreak=8;}],
    ['invalid daily date',x=>{x.profile.lastDailyDay='15/11/2026';}],
    ['fake battle coins',x=>{x.profile.battleLog[0].earnedCoins=999;}],
    ['fake battle hits',x=>{x.profile.battleLog[0].hits=999;}],
    ['invalid battle outcome',x=>{x.profile.battleLog[0].outcome='draw';}],
    ['invalid battle date',x=>{x.profile.battleLog[0].completedAt='next Tuesday';}],
    ['unbounded battle history',x=>{x.profile.battleLog.push(x.profile.battleLog[0]);}]
  ];
  for(const [label,mutate] of cases){
    const tampered=JSON.parse(JSON.stringify(original));
    mutate(tampered);
    assert.throws(()=>importProfileBackup(JSON.stringify(tampered)),Error,label);
  }
  assert.throws(()=>importProfileBackup('{"format":'),/not valid JSON/);
  assert.throws(()=>importProfileBackup('x'.repeat(70_000)),/64 KB/);
  assert.deepEqual(importProfileBackup(JSON.stringify(original)),p,'valid original still restores');
});

test('UTC midnight, streak reset and backwards device clock cannot multiply daily coins',()=>{
  const dec31=Date.parse('2026-12-31T23:59:59.000Z');
  const jan01=Date.parse('2027-01-01T00:00:01.000Z');
  let p=claimDaily(initialProfile(),dec31);
  assert.equal(p.coins,20);
  assert.equal(claimDaily(p,dec31+500),p);
  p=claimDaily(p,jan01);
  assert.equal(p.coins,45);
  assert.equal(p.dailyStreak,2);
  assert.equal(claimDaily(p,dec31),p,'backdating cannot claim again');
  assert.equal(claimDaily(p,jan01+12*60*60*1000),p);
  p=claimDaily(p,Date.parse('2027-01-04T09:00:00Z'));
  assert.equal(p.coins,65);
  assert.equal(p.dailyStreak,1,'missed days reset the daily streak');
  assert.equal(canClaimDaily(p,Number.NaN),false);
  assert.equal(canClaimDaily(p,-1),false);
});
