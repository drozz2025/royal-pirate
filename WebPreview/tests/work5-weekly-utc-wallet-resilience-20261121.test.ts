/**
 * WORK 5 — independent UTC daily-reward durability and local wallet QA.
 * Node domain tests; no browser/iPhone, payments, Unity, deployment or visual claim.
 * Only QA tests: do not modify production code owned by WORK 0/2/4/6/7/8.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  initialProfile,canClaimDaily,claimDaily,finishBattle,claimMission,
  buyCrew,equipCrew,improve,parseProfile,exportProfileBackup,
  importProfileBackup
} from '../src/progression.ts';

const DAY=86_400_000;
const START=Date.parse('2026-11-21T12:00:00.000Z');
const roundtrip=(p:ReturnType<typeof initialProfile>,now:number)=>
  importProfileBackup(exportProfileBackup(p,now));

test('WORK5: fourteen real UTC daily claims cap at seven-day streak with no replay after each backup',()=>{
  let p=initialProfile(),expectedCoins=0;
  for(let i=0;i<14;i++){
    const at=START+i*DAY,streak=Math.min(7,i+1);
    assert.equal(canClaimDaily(p,at),true,'eligible UTC date '+i);
    const old=p;
    p=claimDaily(p,at);
    expectedCoins+=15+5*streak;
    assert.equal(p.dailyStreak,streak,'day '+i+' streak');
    assert.equal(p.coins,expectedCoins,'day '+i+' wallet');
    assert.equal(p.lastDailyDay,new Date(at).toISOString().slice(0,10));
    assert.strictEqual(claimDaily(p,at+2*3_600_000),p,
      'double reward on same UTC calendar day '+i);
    assert.equal(old.coins,expectedCoins-15-5*streak,
      'daily claim mutated the previous immutable profile');
    p=roundtrip(p,at+1_000);
    assert.equal(p.coins,expectedCoins,'backup reopened daily payout '+i);
    assert.strictEqual(claimDaily(p,at+100_000),p,
      'restored profile granted a second reward '+i);
  }
  assert.equal(p.dailyStreak,7);
  assert.equal(p.coins,[20,25,30,35,40,45,50].reduce((a,b)=>a+b,0)+7*50);
});

test('WORK5: missed UTC dates reset the streak, while clock rollback cannot reclaim old days',()=>{
  let p=claimDaily(initialProfile(),START);
  p=claimDaily(p,START+DAY);
  assert.equal(p.dailyStreak,2);
  assert.equal(p.coins,45);
  const rollback=START-2*DAY;
  assert.equal(canClaimDaily(p,rollback),false);
  assert.strictEqual(claimDaily(p,rollback),p);
  assert.strictEqual(claimDaily(p,START+DAY+100),p);
  const gap=START+6*DAY;
  p=roundtrip(p,START+DAY+2000);
  assert.equal(canClaimDaily(p,gap),true);
  p=claimDaily(p,gap);
  assert.equal(p.dailyStreak,1,'gap must start from day 1, not grant missing days');
  assert.equal(p.coins,65,'missed UTC days must not pay retroactively');
  p=roundtrip(p,gap+2000);
  p=claimDaily(p,gap+DAY);
  assert.equal(p.dailyStreak,2);
  assert.equal(p.coins,90);
  assert.equal(canClaimDaily(p,START+DAY),false,'old timestamp must not unlock rewards');
});

test('WORK5: three battle wins, three missions, crew, ship upgrade and two daily claims survive independent restore',()=>{
  let p=initialProfile();
  for(let i=0;i<3;i++)p=finishBattle(p,'victory',2,3,START+i*1000);
  assert.equal(p.coins,105);
  for(const mission of ['first-win','five-hits','three-battles'] as const)
    p=claimMission(p,mission);
  assert.equal(p.coins,205);
  p=buyCrew(p,'gunner');
  p=equipCrew(p,'gunner');
  p=claimDaily(p,START);
  p=improve(p,'hull');
  p=claimDaily(p,START+DAY);
  assert.equal(p.coins,145);
  const restored=roundtrip(p,START+DAY+3000);
  assert.deepEqual(restored,p);
  assert.equal(restored.wins,3);
  assert.equal(restored.hits,6);
  assert.equal(restored.shots,9);
  assert.equal(restored.upgrades.hull,1);
  assert.equal(restored.equippedCrew,'gunner');
  assert.equal(restored.battleLog.length,3);
  for(const mission of ['first-win','five-hits','three-battles'] as const)
    assert.strictEqual(claimMission(restored,mission),restored,
      'restore paid a mission reward twice');
  assert.strictEqual(buyCrew(restored,'gunner'),restored);
  assert.strictEqual(claimDaily(restored,START+DAY+5000),restored);
  assert.equal(restored.coins,145,'duplicate action silently altered local wallet');
});

// Known open production defect #54: regexp-only date checks permit impossible
// future days, locking daily rewards. WORK 5 must not change WORK 4 logic.
test.todo('WORK5 #54: impossible future local daily dates normalize to recoverable state',()=>{
  const malformed=parseProfile(JSON.stringify({
    ...initialProfile(),lastDailyDay:'9999-99-99',dailyStreak:7
  }));
  assert.equal(malformed.lastDailyDay,'',
    'an impossible date persisted instead of being treated as invalid');
  assert.equal(canClaimDaily(malformed,START),true,
    'invalid future date blocks all genuine daily rewards');
});
