/**
 * WORK 5 independent deterministic campaign stress tests.
 * Node/local domain only: no browser, physical iPhone, network, multiplayer
 * service, UX approval, production code or deployment changes.
 * Exercises long-running local wallet histories and restart/branch isolation.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  initialProfile, finishBattle, claimMission, claimDaily, canClaimDaily,
  nextDailyStreak, missionProgress, buyCrew, equipCrew, improve, upgradeCost,
  parseProfile, exportProfileBackup, importProfileBackup, CREW, MISSIONS,
  type LocalProfile, type CrewId, type UpgradeId, type MissionId,
  type BattleOutcome
} from '../src/progression.ts';

const BASE=Date.parse('2026-11-20T12:00:00.000Z');
const DAY=86_400_000;
const crew:readonly CrewId[]=['gunner','navigator'];
const upgrades:readonly UpgradeId[]=['hull','cannons','sails'];
const missions:readonly MissionId[]=['first-win','five-hits','three-battles'];

type Action={
  kind:number; crew:CrewId; upgrade:UpgradeId; mission:MissionId;
  outcome:BattleOutcome; shots:number; hits:number; now:number;
};

function campaign(length:number):Action[] {
  let seed=0x51a2c9e7;
  const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  return Array.from({length},(_,i)=>{
    const key=next(),shots=1+(next()%9);
    return {
      kind:key%8,crew:crew[next()%crew.length],
      upgrade:upgrades[next()%upgrades.length],
      mission:missions[next()%missions.length],
      outcome:next()%3===0?'defeat':'victory',
      shots,hits:next()%(shots+1),now:BASE+Math.floor(i/9)*DAY
    };
  });
}

function apply(p:LocalProfile,a:Action):LocalProfile {
  switch(a.kind){
    case 0:return finishBattle(p,a.outcome,a.hits,a.shots,a.now);
    case 1:return claimMission(p,a.mission);
    case 2:return buyCrew(p,a.crew);
    case 3:return improve(p,a.upgrade);
    case 4:return claimDaily(p,a.now);
    case 5:return equipCrew(p,a.crew);
    case 6:return parseProfile(JSON.stringify(p));
    default:return importProfileBackup(exportProfileBackup(p,a.now));
  }
}
function expectedChange(p:LocalProfile,a:Action):number {
  switch(a.kind){
    case 0:return a.outcome==='victory'?35:0;
    case 1:{
      const m=MISSIONS.find(m=>m.id===a.mission)!;
      return !p.claimedMissions.includes(a.mission)&&missionProgress(p,a.mission)>=m.target?m.reward:0;
    }
    case 2:{
      const c=CREW.find(c=>c.id===a.crew)!;
      return !p.ownedCrew.includes(a.crew)&&p.coins>=c.cost?-c.cost:0;
    }
    case 3:{
      const cost=upgradeCost(a.upgrade,p.upgrades[a.upgrade]);
      return p.upgrades[a.upgrade]<5&&p.coins>=cost?-cost:0;
    }
    case 4:return canClaimDaily(p,a.now)?15+5*nextDailyStreak(p,a.now):0;
    default:return 0;
  }
}
function freezeDeep(value:unknown):void {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const child of Object.values(value))freezeDeep(child);
    Object.freeze(value);
  }
}
function invariant(p:LocalProfile,i:number){
  assert.ok(Number.isSafeInteger(p.coins)&&p.coins>=0,'wallet: '+i);
  assert.ok(Number.isSafeInteger(p.xp)&&p.xp>=0,'XP: '+i);
  assert.ok(p.hits<=p.shots,'hit ratio: '+i);
  assert.ok(p.ownedCrew.includes(p.equippedCrew),'equipped crew: '+i);
  assert.ok(p.battleLog.length<=12,'battle history cap: '+i);
  assert.ok(p.battleLog.every(b=>b.hits<=b.shots&&
    b.earnedCoins===(b.outcome==='victory'?35:0)),'battle receipt: '+i);
  assert.equal(new Set(p.claimedMissions).size,p.claimedMissions.length,'double mission: '+i);
  assert.ok(upgrades.every(k=>p.upgrades[k]>=0&&p.upgrades[k]<=5),'upgrade cap: '+i);
  assert.ok(p.dailyStreak>=0&&p.dailyStreak<=7,'daily streak cap: '+i);
}

test('WORK5: 720 seeded local actions reconcile every coin across wins, missions, purchases and UTC rewards',()=>{
  let p=initialProfile(),totalDelta=0;
  const actions=campaign(720);
  for(const [i,a] of actions.entries()){
    const before=JSON.stringify(p),expected=expectedChange(p,a),oldCoins=p.coins;
    freezeDeep(p);
    const next=apply(p,a);
    assert.equal(JSON.stringify(p),before,'previous stored profile mutated by action '+i);
    assert.equal(next.coins-oldCoins,expected,'incorrect single-action coin receipt at '+i);
    totalDelta+=expected;
    p=next;
    invariant(p,i);
  }
  assert.equal(p.coins,totalDelta,'long-running campaign leaked or duplicated coins');
  assert.ok(p.wins>0&&p.losses>0,'campaign did not exercise both battle outcomes');
  assert.ok(p.battleLog.length===12,'history never reached its rollover window');
});

test('WORK5: restart from a mid-campaign backup reproduces the same normalized final wallet, receipts and crew',()=>{
  const actions=campaign(420),split=179;
  let uninterrupted=initialProfile(),backup='';
  for(const [i,a] of actions.entries()){
    uninterrupted=apply(uninterrupted,a);
    if(i===split)backup=exportProfileBackup(uninterrupted,a.now);
  }
  assert.ok(backup,'no persisted checkpoint');
  let restored=importProfileBackup(backup);
  for(let i=split+1;i<actions.length;i++)restored=apply(restored,actions[i]);
  assert.deepEqual(parseProfile(JSON.stringify(restored)),parseProfile(JSON.stringify(uninterrupted)),
    'offline reload changed the eventual coin ledger or local progression');
  invariant(restored,actions.length);
});

test('WORK5: competing actions on one frozen local snapshot do not mutate or silently charge each other',()=>{
  let base=initialProfile();
  for(let i=0;i<10;i++)base=finishBattle(base,'victory',2,4,BASE+i*1000);
  const original=JSON.stringify(base);
  freezeDeep(base);
  const daily=claimDaily(base,BASE);
  const mission=claimMission(base,'first-win');
  const purchase=buyCrew(base,'navigator');
  const forge=improve(base,'cannons');
  const equip= equipCrew(base,'navigator'); // still unowned in original snapshot
  assert.equal(JSON.stringify(base),original,'parallel candidate action changed the source');
  assert.equal(daily.coins,base.coins+20);
  assert.equal(mission.coins,base.coins+25);
  assert.equal(purchase.coins,base.coins-90);
  assert.equal(forge.coins,base.coins-upgradeCost('cannons',0));
  assert.strictEqual(equip,base,'unowned crew equipped through a stale snapshot');
  const first=buyCrew(claimMission(claimDaily(base,BASE),'first-win'),'navigator');
  const second=claimDaily(claimMission(buyCrew(base,'navigator'),'first-win'),BASE);
  assert.deepEqual(first,second,
    'equivalent independent credits and charges gave different local results');
  assert.equal(first.coins,base.coins+20+25-90);
  assert.strictEqual(claimDaily(first,BASE+1000),first,'daily reward duplicated after composition');
  assert.strictEqual(claimMission(first,'first-win'),first,'mission reward duplicated after composition');
});
