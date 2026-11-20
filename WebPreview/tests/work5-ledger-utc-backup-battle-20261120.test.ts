/**
 * WORK5 — deterministic financial, backup and battle regression tests.
 * Tests only; no interface, gameplay, deployment or Unity changes.
 * Not a browser / physical iPhone test and not a server-side anti-cheat claim.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  CREW, MISSIONS, canClaimDaily, nextDailyStreak, claimDaily, claimMission,
  buyCrew, equipCrew, improve, upgradeCost, missionProgress,
  finishBattle, initialProfile, importProfileBackup, exportProfileBackup,
  type CrewId, type MissionId, type UpgradeId, type LocalProfile
} from '../src/progression.ts';
import {Battle} from '../src/battle.ts';

const DAY=86_400_000;
const EPOCH=Date.parse('2026-11-01T00:00:00.000Z');
const CREW_IDS: CrewId[]=['captain','gunner','navigator'];
const UPGRADES: UpgradeId[]=['hull','cannons','sails'];
const MISSION_IDS: MissionId[]=['first-win','five-hits','three-battles'];

test('WORK5: UTC rollover, same-day replay and an expired streak never mint duplicate coins',()=>{
  let profile=initialProfile();
  const first=Date.parse('2026-03-29T23:59:59.999Z');
  profile=claimDaily(profile,first);
  assert.equal(profile.coins,20);
  assert.equal(profile.lastDailyDay,'2026-03-29');
  assert.strictEqual(claimDaily(profile,first),profile);
  assert.strictEqual(claimDaily(profile,first-7*DAY),profile,'clock rollback cannot claim an earlier day');
  for(let day=1;day<=7;day++){
    const when=first+day*DAY;
    assert.equal(canClaimDaily(profile,when),true);
    const expectedStreak=Math.min(7,day+1);
    const previousCoins=profile.coins;
    profile=claimDaily(profile,when);
    assert.equal(profile.dailyStreak,expectedStreak);
    assert.equal(profile.coins,previousCoins+15+expectedStreak*5);
    assert.strictEqual(claimDaily(profile,when),profile,'one reward per UTC day');
  }
  const afterGap=first+10*DAY;
  const previous=profile.coins;
  profile=claimDaily(profile,afterGap);
  assert.equal(profile.dailyStreak,1,'missing two UTC days resets streak');
  assert.equal(profile.coins,previous+20);
  assert.equal(canClaimDaily(profile,Number.NaN),false);
  assert.equal(canClaimDaily(profile,-1),false);
});

test('WORK5: 1,200 seeded economy operations reconcile against independent deltas and round-trip saves',()=>{
  let seed=0x5eec1e;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  let profile:LocalProfile=initialProfile();
  let credits=0,debits=0,battles=0;
  for(let i=0;i<1200;i++){
    const op=next()%7,choice=next(),day=Math.floor(i/36);
    const at=EPOCH+day*DAY+(i%36)*1500;
    const before=profile;
    let expectedDelta=0;
    if(op===0){
      const won=(choice%3)!==0;
      const shots=(choice%8)+1,hits=choice%(shots+1);
      profile=finishBattle(profile,won?'victory':'defeat',hits,shots,at);
      expectedDelta=won?35:0;battles++;
    }else if(op===1){
      if(canClaimDaily(before,at))expectedDelta=15+nextDailyStreak(before,at)*5;
      profile=claimDaily(before,at);
    }else if(op===2){
      const id=MISSION_IDS[choice%MISSION_IDS.length];
      const mission=MISSIONS.find(m=>m.id===id)!;
      if(!before.claimedMissions.includes(id)&&missionProgress(before,id)>=mission.target)expectedDelta=mission.reward;
      profile=claimMission(before,id);
    }else if(op===3){
      const id=CREW_IDS[choice%CREW_IDS.length];
      const crew=CREW.find(c=>c.id===id)!;
      if(crew.cost>0&&!before.ownedCrew.includes(id)&&before.coins>=crew.cost)expectedDelta=-crew.cost;
      profile=buyCrew(before,id);
    }else if(op===4){
      const id=CREW_IDS[choice%CREW_IDS.length];
      profile=equipCrew(before,id);
    }else if(op===5){
      const id=UPGRADES[choice%UPGRADES.length],level=before.upgrades[id],price=upgradeCost(id,level);
      if(level<5&&before.coins>=price)expectedDelta=-price;
      profile=improve(before,id);
    }else{
      profile=importProfileBackup(exportProfileBackup(before,at));
    }
    assert.equal(profile.coins,before.coins+expectedDelta,'wallet delta mismatch at operation '+i);
    assert.ok(profile.coins>=0,'negative local wallet at operation '+i);
    assert.ok(profile.battleLog.length<=12,'unbounded battle history at operation '+i);
    assert.equal(new Set(profile.ownedCrew).size,profile.ownedCrew.length,'duplicate owned crew at operation '+i);
    assert.ok(profile.ownedCrew.includes(profile.equippedCrew),'equip without ownership at operation '+i);
    assert.equal(new Set(profile.claimedMissions).size,profile.claimedMissions.length,'duplicate mission claim at operation '+i);
    if(expectedDelta>0)credits+=expectedDelta;else debits-=expectedDelta;
    assert.equal(profile.coins,credits-debits,'wallet ledger drift at operation '+i);
    if(i%80===0)assert.deepEqual(importProfileBackup(exportProfileBackup(profile,at)),profile,'backup mismatch at step '+i);
  }
  assert.ok(battles>100,'simulation missed the battle economy');
  assert.equal(profile.wins+profile.losses,battles,'battle receipts must be counted once');
  assert.equal(profile.xp,profile.wins*50+profile.losses*10,'XP must reconcile to battle outcomes');
});

test('WORK5: corrupt backup rejects without silently accepting forged purchase, win or mission history',()=>{
  let profile=initialProfile();
  profile=finishBattle(profile,'victory',4,5,EPOCH);
  const original=exportProfileBackup(profile,EPOCH);
  assert.deepEqual(importProfileBackup(original),profile);
  const mutate=(fn:(x:any)=>void)=>{
    const data=JSON.parse(original);
    fn(data);
    return JSON.stringify(data);
  };
  const malicious=[
    mutate(x=>{x.profile.coins=-1;}),
    mutate(x=>{x.profile.xp=0.5;}),
    mutate(x=>{x.profile.hits=x.profile.shots+1;}),
    mutate(x=>{x.profile.upgrades.hull=6;}),
    mutate(x=>{x.profile.ownedCrew.push('captain');}),
    mutate(x=>{x.profile.equippedCrew='navigator';}),
    mutate(x=>{x.profile.claimedMissions=['first-win','first-win'];}),
    mutate(x=>{x.profile.battleLog[0].earnedCoins=35000;}),
    mutate(x=>{x.profile.battleLog[0].completedAt='2026-02-30T00:00:00.000Z';}),
    mutate(x=>{x.profile.battleLog.push(...Array(12).fill(x.profile.battleLog[0]));}),
    mutate(x=>{x.version=99;})
  ];
  for(const [index,bad] of malicious.entries())
    assert.throws(()=>importProfileBackup(bad),Error,'backup mutation '+index+' was accepted');
  assert.deepEqual(importProfileBackup(original),profile,'rejected imports must not change the original save');
});

test('WORK5: real Battle state machine only awards completion once after resolved combat',()=>{
  let ledger=initialProfile();
  let completed=0;
  for(const seed of [1,17,61,1261]){
    for(const miss of [false,true]){
      const battle=new Battle(seed);
      for(let turn=0;turn<30&&!['victory','defeat'].includes(battle.phase);turn++){
        const shotsBefore=battle.shotsFired;
        battle.aim(miss?25:0,miss?20:65);
        assert.equal(battle.fire(),true);
        assert.equal(battle.fire(),false,'double-tap must not fire twice');
        assert.equal(battle.shotsFired,shotsBefore+1);
        for(let frame=0;frame<2500&&!['ready','victory','defeat'].includes(battle.phase);frame++){
          battle.tick(1/60);
          battle.drainEvents();
        }
        assert.ok(['ready','victory','defeat'].includes(battle.phase),'battle must settle');
      }
      assert.equal(battle.phase,miss?'defeat':'victory','expected deterministic combat result');
      const previous=ledger;
      const result=battle.phase;
      ledger=finishBattle(ledger,result,battle.hits,battle.shotsFired,EPOCH+completed*1000);
      completed++;
      assert.equal(ledger.battleLog[0].shots,battle.shotsFired);
      assert.equal(ledger.battleLog[0].hits,battle.hits);
      assert.equal(ledger.battleLog[0].outcome,result);
      assert.equal(ledger.coins,previous.coins+(result==='victory'?35:0));
    }
  }
  assert.equal(ledger.wins,4);
  assert.equal(ledger.losses,4);
  assert.equal(ledger.battleLog.length,8);
  assert.deepEqual(importProfileBackup(exportProfileBackup(ledger,EPOCH)),ledger);
});
