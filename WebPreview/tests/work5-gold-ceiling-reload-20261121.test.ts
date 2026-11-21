/**
 * WORK 5 — independent near-ceiling local-gold persistence checks.
 * Only QA assertions: no UI, gameplay, WORK0/2/4/6/7/8, Unity or deployment changes.
 * Tests the CURRENT local integer envelope, not real currency or an online wallet.
 * No Chromium, mobile-device or visual-fidelity claim is made here.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  initialProfile, finishBattle, buyCrew, improve, claimMission, claimDaily,
  parseProfile, exportProfileBackup, importProfileBackup, type LocalProfile
} from '../src/progression.ts';

const MAX=1_000_000_000;
const NOW=Date.parse('2026-11-21T12:00:00.000Z');
const copy=(p:LocalProfile)=>parseProfile(JSON.stringify(p));
const restore=(p:LocalProfile)=>importProfileBackup(exportProfileBackup(p,NOW+1000));

test('WORK5: an earned victory landing exactly at 1,000,000,000 gold survives save and backup',()=>{
  const before:LocalProfile={...initialProfile(),coins:MAX-35};
  const snapshot=structuredClone(before);
  const after=finishBattle(before,'victory',2,4,NOW);
  assert.equal(after.coins,MAX,'exact legal ceiling must not be rounded or discarded');
  assert.equal(after.wins,1);
  assert.equal(after.battleLog[0].earnedCoins,35);
  assert.deepEqual(before,snapshot,'a battle changed its previous persisted snapshot');
  assert.deepEqual(copy(after),after,'valid ceiling value reset on localStorage read');
  assert.deepEqual(restore(after),after,'valid ceiling value reset by backup import');
});

test('WORK5: near-ceiling purchases and rewards reconcile across JSON reloads without minting money',()=>{
  const rows:Array<[string,number,(p:LocalProfile)=>LocalProfile]>=[
    ['gunner purchase',MAX-160,p=>buyCrew(p,'gunner')],
    ['hull upgrade',MAX-205,p=>improve(p,'hull')],
    ['victory payout',MAX-170,p=>finishBattle(p,'victory',1,2,NOW)],
    ['first mission payout',MAX-145,p=>claimMission(p,'first-win')],
    ['UTC daily reward',MAX-125,p=>claimDaily(p,NOW)],
  ];
  let profile:LocalProfile={...initialProfile(),coins:MAX-100};
  for(const [label,expected,mutate] of rows){
    const previous=structuredClone(profile);
    profile=mutate(profile);
    assert.equal(profile.coins,expected,label+' changed the wallet by the wrong amount');
    assert.ok(profile.coins>=0&&profile.coins<=MAX,label+' breached storage bounds');
    assert.deepEqual(copy(profile),profile,label+' changed on local save/read');
    assert.deepEqual(restore(profile),profile,label+' changed on backup import');
    assert.ok(previous.coins!==profile.coins,label+' was silently skipped');
  }
  assert.equal(profile.ownedCrew.includes('gunner'),true);
  assert.equal(profile.upgrades.hull,1);
  assert.equal(profile.claimedMissions.includes('first-win'),true);
  assert.equal(profile.battleLog.length,1);
});

test('WORK5: forged out-of-range wallet is rejected by backup import and never accepted as spendable gold',()=>{
  const invalid={...initialProfile(),coins:MAX+1};
  const malformed=JSON.stringify(invalid);
  assert.equal(copy(invalid).coins,0,'unsupported value must not be accepted as valid local gold');
  const backup=JSON.parse(exportProfileBackup(initialProfile(),NOW));
  backup.profile.coins=MAX+1;
  assert.throws(()=>importProfileBackup(JSON.stringify(backup)),/Invalid profile counter: coins/);
  assert.equal(JSON.parse(malformed).coins,MAX+1,'QA fixture was accidentally normalized before rejection');
});

// Separate known defect to be fixed by the owning production Work, not WORK5.
// finishBattle(MAX-34, victory) currently produces MAX+1; parseProfile silently
// changes that to zero, while strict backup import rejects it. Keep this
// acceptance test TODO until the owner implements an explicit cap/overflow rule.
// This is a theoretical high-wallet edge, NOT evidence of the reported 140→40 issue.
test.todo('WORK5: winning at the gold ceiling cannot turn a valid saved balance into zero',()=>{
  const before:LocalProfile={...initialProfile(),coins:MAX-34};
  const won=finishBattle(before,'victory',1,2,NOW);
  const reloaded=copy(won);
  assert.ok(reloaded.coins>=before.coins&&reloaded.coins<=MAX,
    'a legitimate victory must not erase earned local gold on reload');
  assert.deepEqual(restore(won),reloaded,
    'backup import and browser reload must agree on the documented cap rule');
});
