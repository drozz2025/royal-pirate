/**
 * WORK 5 — independent local accuracy/persistence QA. Tests only.
 * No production/UI/Unity/WORK2/WORK4/WORK6/main/Sites changes.
 * Domain + React SSR only, not physical iPhone, online leaderboard or browser touch.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens} from '../src/app-screens.tsx';
import {
  initialProfile,parseProfile,finishBattle,exportProfileBackup,importProfileBackup,
  type LocalProfile,type BattleOutcome
} from '../src/progression.ts';

const T=Date.parse('2026-11-21T15:00:00.000Z');
const noop=()=>{};
const safeCount=(x:number)=>Number.isSafeInteger(x)&&x>=0&&x<=1000?x:0;

function profileMarkup(profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen:'profile',profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop,backupMessage:''
  }));
}

test('WORK5: 162 boundary cases clamp each finished battle hit/shot receipt and survive real backup parsing',()=>{
  const counters=[0,1,3,12,1000,-1,1001,Number.NaN,Number.POSITIVE_INFINITY];
  for(const outcome of ['victory','defeat'] as const){
    for(const shots of counters){
      for(const hits of counters){
        const p=finishBattle(initialProfile(),outcome,hits,shots,T);
        const expectedShots=safeCount(shots);
        const expectedHits=Math.min(expectedShots,safeCount(hits));
        assert.equal(p.shots,expectedShots,'total shots: '+outcome+'/'+shots+'/'+hits);
        assert.equal(p.hits,expectedHits,'total hits: '+outcome+'/'+shots+'/'+hits);
        assert.ok(p.hits<=p.shots,'earned accuracy exceeds 100%');
        assert.equal(p.battleLog.length,1);
        assert.equal(p.battleLog[0].shots,expectedShots);
        assert.equal(p.battleLog[0].hits,expectedHits);
        assert.equal(p.battleLog[0].earnedCoins,outcome==='victory'?35:0);
        assert.equal(p.battleLog[0].earnedXp,outcome==='victory'?50:10);
        assert.deepEqual(parseProfile(JSON.stringify(p)),p,'local reload rejected a valid bounded result');
        assert.deepEqual(importProfileBackup(exportProfileBackup(p,T+1000)),p,
          'backup restore rejected a bounded combat receipt');
      }
    }
  }
});

test('WORK5: Profile accuracy and lifetime totals match twelve legitimate results after save and restore',()=>{
  let p=initialProfile();
  let shots=0,hits=0,wins=0,losses=0;
  for(let i=0;i<12;i++){
    const outcome:BattleOutcome=i%3===0?'defeat':'victory';
    const currentShots=i%4+1,currentHits=i%5;
    p=finishBattle(p,outcome,currentHits,currentShots,T+i*1000);
    shots+=currentShots;
    hits+=Math.min(currentShots,currentHits);
    outcome==='victory'?wins++:losses++;
    if(i%3===0)p=parseProfile(JSON.stringify(p));
  }
  p=importProfileBackup(exportProfileBackup(p,T+20_000));
  assert.equal(p.shots,shots);
  assert.equal(p.hits,hits);
  assert.equal(p.wins,wins);
  assert.equal(p.losses,losses);
  assert.equal(p.battleLog.length,12);
  const html=profileMarkup(p);
  const accuracy=Math.round(100*hits/shots)+'%';
  for(const [label,value] of [
    ['VICTORIES',wins],['DEFEATS',losses],['BATTLES',12],
    ['ACCURACY',accuracy],['XP',wins*50+losses*10]
  ] as const){
    assert.ok(html.includes('<small>'+label+'</small><strong>'+value+'</strong>'),
      'Profile panel displays inconsistent '+label);
  }
  assert.equal((html.match(/class="app-battle-entry /g)||[]).length,12,
    'profile receipts must match the last twelve recorded battles');
  assert.doesNotMatch(html,/\b(?:NaN|Infinity)%\b/);
});

test('WORK5: imported backups reject impossible hit counts without modifying a valid local save',()=>{
  const valid=finishBattle(initialProfile(),'victory',2,3,T);
  const snapshot=structuredClone(valid);
  const data=JSON.parse(exportProfileBackup(valid,T+1000));
  for(const [hits,shots] of [[4,3],[1001,1000],[2,-1],[2,1.5],[Number.MAX_SAFE_INTEGER,3]]){
    data.profile.hits=hits;
    data.profile.shots=shots;
    assert.throws(()=>importProfileBackup(JSON.stringify(data)),/Invalid (shot statistics|profile counter)/,
      'tampered backup accepted impossible accuracy: '+hits+'/'+shots);
    assert.deepEqual(valid,snapshot,'rejected backup mutated the already loaded profile');
  }
});

// Known gap: parseProfile accepts 20 hits / 2 shots from edited localStorage;
// the Profile can therefore display 1000% ACCURACY. Import correctly rejects
// the same corrupted counters. Record separately for the profile owner.
test.todo('WORK5: reject or repair localStorage lifetime hits > shots before displaying Profile accuracy');
