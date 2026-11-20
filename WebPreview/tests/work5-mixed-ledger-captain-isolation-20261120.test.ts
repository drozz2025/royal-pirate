/**
 * WORK 5 — independent, seeded state-machine QA for offline captain accounts.
 * Tests-only: exercises all public progression mutations through alternating
 * battles, purchases, missions, daily UTC claims, local reloads and backups.
 * Not a mobile browser, physical phone, cloud ledger or anti-cheat audit.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  initialProfile, finishBattle, buyCrew, equipCrew, improve, claimDaily,
  claimMission, parseProfile, exportProfileBackup, importProfileBackup,
  type LocalProfile, type CrewId, type UpgradeId, type MissionId
} from '../src/progression.ts';

const DAY=86_400_000;
const START=Date.parse('2026-11-01T12:00:00.000Z');
const crews:ReadonlyArray<readonly [CrewId,number]>=[['gunner',60],['navigator',90]];
const upgrades:ReadonlyArray<UpgradeId>=['hull','cannons','sails'];
const missions:ReadonlyArray<readonly [MissionId,number]>=[
  ['first-win',25],['five-hits',35],['three-battles',40]
];
function random(seed:number) {
  let value=seed>>>0;
  return () => { value=(Math.imul(value,1664525)+1013904223)>>>0; return value; };
}
function sameCaptain(actual:LocalProfile,expected:{
  wallet:number;xp:number;wins:number;losses:number;hits:number;shots:number;
  owned:Set<CrewId>;equipped:CrewId;levels:Record<UpgradeId,number>;
  claimed:Set<MissionId>;lastDay:string;streak:number;
},label:string){
  assert.equal(actual.coins,expected.wallet,label+' wallet ledger mismatch');
  assert.equal(actual.xp,expected.xp,label+' XP mismatch');
  assert.equal(actual.wins,expected.wins,label+' wins mismatch');
  assert.equal(actual.losses,expected.losses,label+' losses mismatch');
  assert.equal(actual.hits,expected.hits,label+' hit count mismatch');
  assert.equal(actual.shots,expected.shots,label+' shot count mismatch');
  assert.deepEqual(new Set(actual.ownedCrew),expected.owned,label+' crew ownership mismatch');
  assert.equal(actual.equippedCrew,expected.equipped,label+' equipped crew mismatch');
  assert.deepEqual(actual.upgrades,expected.levels,label+' upgrade ledger mismatch');
  assert.deepEqual(new Set(actual.claimedMissions),expected.claimed,label+' duplicate/missing mission');
  assert.equal(actual.lastDailyDay,expected.lastDay,label+' UTC reward day mismatch');
  assert.equal(actual.dailyStreak,expected.streak,label+' UTC streak mismatch');
  assert.ok(Number.isSafeInteger(actual.coins)&&actual.coins>=0,label+' invalid wallet');
  assert.ok(actual.battleLog.length<=12,label+' unlimited battle history');
  assert.ok(actual.battleLog.every((entry,index,rows)=>
    index===0||Date.parse(rows[index-1].completedAt)>=Date.parse(entry.completedAt)),
    label+' battle history is not newest-first');
}

test('WORK5: seeded multi-day account ledger survives 3,600 operations and real local JSON/backup round trips',()=>{
  for(let scenario=1;scenario<=18;scenario++){
    const roll=random(scenario*97+11);
    let p=initialProfile();
    const expected={
      wallet:0,xp:0,wins:0,losses:0,hits:0,shots:0,
      owned:new Set<CrewId>(['captain']),equipped:'captain' as CrewId,
      levels:{hull:0,cannons:0,sails:0},claimed:new Set<MissionId>(),
      lastDay:'',streak:0
    };
    for(let step=0;step<200;step++){
      const action=roll()%12;
      const today=new Date(START+Math.floor(step/6)*DAY).toISOString().slice(0,10);
      const at=START+Math.floor(step/6)*DAY+(step%6)*1000;
      if(action===0||action===1||action===11){
        const win=action!==1,shots=2+(roll()%5),hits=roll()%(shots+1);
        p=finishBattle(p,win?'victory':'defeat',hits,shots,at);
        expected.wins+=Number(win);expected.losses+=Number(!win);
        expected.shots+=shots;expected.hits+=hits;
        expected.xp+=win?50:10;expected.wallet+=win?35:0;
      }else if(action===2){
        const [id,cost]=crews[roll()%crews.length];
        const eligible=!expected.owned.has(id)&&expected.wallet>=cost;
        p=buyCrew(p,id);
        if(eligible){expected.owned.add(id);expected.wallet-=cost;}
      }else if(action===3){
        const id=upgrades[roll()%upgrades.length];
        const level=expected.levels[id];
        const cost=45+upgrades.indexOf(id)*15+level*35;
        p=improve(p,id);
        if(level<5&&expected.wallet>=cost){expected.levels[id]++;expected.wallet-=cost;}
      }else if(action===4||action===9){
        const eligible=!expected.lastDay||today>expected.lastDay;
        p=claimDaily(p,at);
        if(eligible){
          const prior=expected.lastDay;
          const yesterday=new Date(Date.parse(today+'T12:00:00.000Z')-DAY).toISOString().slice(0,10);
          expected.streak=prior===yesterday?Math.min(7,expected.streak+1):1;
          expected.wallet+=15+expected.streak*5;
          expected.lastDay=today;
        }
        const before=p;
        p=claimDaily(p,at);
        assert.strictEqual(p,before,'same-day double payment, seed '+scenario);
      }else if(action===5||action===10){
        const [id,reward]=missions[roll()%missions.length];
        const eligible=!expected.claimed.has(id)&&(
          id==='first-win'?expected.wins>=1:
          id==='five-hits'?expected.hits>=5:
          expected.wins+expected.losses>=3);
        p=claimMission(p,id);
        if(eligible){expected.wallet+=reward;expected.claimed.add(id);}
        const before=p;
        p=claimMission(p,id);
        assert.strictEqual(p,before,'duplicate mission payment, seed '+scenario);
      }else if(action===6){
        p=parseProfile(JSON.stringify(p));
      }else if(action===7){
        p=importProfileBackup(exportProfileBackup(p,at));
      }else if(action===8){
        const [id]=crews[roll()%crews.length];
        p=equipCrew(p,id);
        if(expected.owned.has(id))expected.equipped=id;
      }
      sameCaptain(p,expected,'scenario '+scenario+' step '+step+' action '+action);
    }
    assert.deepEqual(importProfileBackup(exportProfileBackup(p,START+40*DAY)),p,
      'final backup failed after 200 mixed operations, seed '+scenario);
  }
});

test('WORK5: separate captains never share mutable arrays, upgrades or mission rewards across restore',()=>{
  const at=Date.parse('2026-11-20T12:00:00.000Z');
  let alpha=finishBattle(initialProfile(),'victory',3,5,at);
  const beta=initialProfile();
  const betaBefore=structuredClone(beta);
  alpha=claimDaily(alpha,at);
  alpha=claimMission(alpha,'first-win');
  alpha=buyCrew(alpha,'gunner');
  const restored=importProfileBackup(exportProfileBackup(alpha,at));
  const untouched=structuredClone(alpha);
  restored.ownedCrew.push('navigator');
  restored.claimedMissions.push('three-battles');
  restored.upgrades.hull=5;
  restored.battleLog.splice(0,1);
  assert.deepEqual(alpha,untouched,'restoring captain A created shared mutable state');
  assert.deepEqual(beta,betaBefore,'transactions on captain A contaminated new captain B');
  assert.equal(beta.coins,0);
  assert.strictEqual(claimMission(beta,'first-win'),beta,'captain B received A mission entitlement');
  assert.equal(importProfileBackup(exportProfileBackup(alpha,at)).coins,untouched.coins,
    'mutating another restored object changed the original wallet');
});
