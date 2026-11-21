/**
 * WORK 5 — local save import edge cases at the 64 KiB boundary.
 * Tests only: no UI, gameplay, Unity, WORK 2/4/6, deployment or paid services.
 * Node contract tests, not browser taps, a physical phone or cloud backup QA.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  initialProfile, finishBattle, exportProfileBackup, importProfileBackup,
  BACKUP_FORMAT, type LocalProfile
} from '../src/progression.ts';

const at=Date.parse('2026-11-21T10:00:00.000Z');

test('WORK5: backup accepts at most 65536 UTF-16 code units; rejects 65537 before JSON parse',()=>{
  const original=initialProfile();
  const payload=exportProfileBackup(original,at);
  assert.ok(payload.length<65_536,'Baseline export exceeds declared backup limit');
  const exactlyLimit=payload+' '.repeat(65_536-payload.length);
  assert.equal(exactlyLimit.length,65_536);
  assert.deepEqual(importProfileBackup(exactlyLimit),original,
    'Valid JSON at the documented size limit must remain restorable');
  const tooLarge=exactlyLimit+' ';
  assert.equal(tooLarge.length,65_537);
  assert.throws(()=>importProfileBackup(tooLarge),/64 KB size limit/,
    'One character beyond the cap must be refused before parsing');
});

test('WORK5: broken, primitive and unsupported backup envelopes are refused without partial restore',()=>{
  const backup=JSON.parse(exportProfileBackup(initialProfile(),at));
  const invalid:unknown[]=[
    '', '{unfinished', 'null', '[]', '"ROYAL PIRATE"', '{}',
    JSON.stringify({...backup,format:'unknown-game'}),
    JSON.stringify({...backup,version:2}),
    JSON.stringify({...backup,profile:null}),
    JSON.stringify({...backup,profile:[]}),
    JSON.stringify({...backup,profile:{...backup.profile,version:2}}),
    JSON.stringify({...backup,profile:{...backup.profile,shots:0,hits:1}})
  ];
  for(const [index,entry] of invalid.entries()){
    assert.throws(()=>importProfileBackup(String(entry)),Error,
      'Invalid backup envelope '+index+' must fail completely');
  }
  assert.equal(BACKUP_FORMAT,'royal-pirate-local-backup',
    'Backup format contract should not silently change');
});

test('WORK5: legacy v1 backup without battleLog preserves earned totals but never invents receipts',()=>{
  let active:LocalProfile=initialProfile();
  active=finishBattle(active,'victory',3,5,at);
  active=finishBattle(active,'defeat',1,2,at+60_000);
  const saved=JSON.parse(exportProfileBackup(active,at+120_000));
  delete saved.profile.battleLog;
  const legacy=importProfileBackup(JSON.stringify(saved));
  assert.equal(legacy.battleLog.length,0,'Old saves cannot fabricate battle receipts');
  for(const key of ['coins','xp','wins','losses','hits','shots'] as const){
    assert.equal(legacy[key],active[key],'Lifetime counter lost: '+key);
  }
  assert.deepEqual(legacy.ownedCrew,active.ownedCrew);
  assert.deepEqual(legacy.upgrades,active.upgrades);
  assert.deepEqual(importProfileBackup(exportProfileBackup(legacy,at+180_000)),legacy,
    'Legacy save must remain stable after migration to current export');
});
