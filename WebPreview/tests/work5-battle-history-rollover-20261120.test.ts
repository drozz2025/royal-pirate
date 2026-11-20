/**
 * WORK 5 — independent tests-only regression for long-lived captain history.
 * Verifies that the 12-entry UI/history cap does not truncate lifetime statistics,
 * mission eligibility, economy or the backup. Not a browser, phone or cloud test.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens} from '../src/app-screens.tsx';
import {
  initialProfile, finishBattle, parseProfile, exportProfileBackup,
  importProfileBackup, battlesPlayed, missionProgress, claimMission,
  type BattleOutcome, type LocalProfile, type MissionId
} from '../src/progression.ts';

const FIRST=Date.parse('2026-11-20T08:00:00.000Z');
const noop=()=>{};
function runLongCareer():LocalProfile {
  let captain=initialProfile();
  for(let i=0;i<48;i++) {
    const outcome:BattleOutcome=i%2===0?'victory':'defeat';
    captain=finishBattle(captain,outcome,2,3,FIRST+i*1000);
    if(i%7===0)captain=parseProfile(JSON.stringify(captain));
  }
  return captain;
}
function profileScreen(p:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen:'profile',profile:p,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop,backupMessage:''
  }));
}

test('WORK5: 48 battles keep precisely the newest 12 receipts without losing lifetime totals',()=>{
  const p=runLongCareer();
  assert.equal(battlesPlayed(p),48);
  assert.equal(p.wins,24);
  assert.equal(p.losses,24);
  assert.equal(p.shots,144);
  assert.equal(p.hits,96);
  assert.equal(p.xp,1440);
  assert.equal(p.coins,840);
  assert.equal(p.battleLog.length,12);
  for(let index=0;index<12;index++){
    const completed=47-index;
    const record=p.battleLog[index];
    assert.equal(record.completedAt,new Date(FIRST+completed*1000).toISOString(),
      'retained receipt must be newest first, position '+index);
    assert.equal(record.outcome,completed%2===0?'victory':'defeat');
    assert.equal(record.shots,3);
    assert.equal(record.hits,2);
    assert.equal(record.earnedCoins,record.outcome==='victory'?35:0);
    assert.equal(record.earnedXp,record.outcome==='victory'?50:10);
  }
  const reloaded=parseProfile(JSON.stringify(p));
  assert.deepEqual(reloaded,p,'local reload lost lifetime or receipt information');
  assert.deepEqual(importProfileBackup(exportProfileBackup(p,FIRST+49_000)),p,
    'complete local backup silently truncated lifetime totals or history');
});

test('WORK5: profile shows exactly 12 latest battle rows while lifetime statistics and missions use 48 results',()=>{
  const p=runLongCareer();
  const html=profileScreen(p);
  assert.equal((html.match(/class="app-battle-entry\s/g)||[]).length,12,
    'profile must show the twelve retained receipts and no duplicates');
  assert.match(html,/12\s*\/\s*12 saved/,'profile history cap missing');
  const timestamps=[...html.matchAll(/<time\b[^>]*\bdatetime="([^"]+)"/gi)]
    .map(match=>match[1]);
  assert.deepEqual(timestamps,p.battleLog.map(entry=>entry.completedAt),
    'visible profile receipts must be exactly the newest twelve in order');
  assert.equal(missionProgress(p,'first-win'),1);
  assert.equal(missionProgress(p,'five-hits'),5);
  assert.equal(missionProgress(p,'three-battles'),3);
  const missions:MissionId[]=['first-win','five-hits','three-battles'];
  let rewarded=p;
  for(const id of missions){
    rewarded=claimMission(rewarded,id);
    assert.strictEqual(claimMission(rewarded,id),rewarded,
      'a completed mission paid twice after the history rotated: '+id);
  }
  assert.equal(rewarded.coins,940,'lifetime missions must pay exactly 25+35+40 coins');
  const restored=importProfileBackup(exportProfileBackup(rewarded,FIRST+50_000));
  assert.deepEqual(restored,rewarded,'history rollover and claims did not survive restore');
  for(const id of missions)
    assert.strictEqual(claimMission(restored,id),restored,
      'backup restore reopened an old mission: '+id);
});
