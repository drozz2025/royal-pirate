/**
 * WORK 5 — read-only React SSR QA for real mission actions and the battle log.
 * Uses production components and domain state, without testing browser hits,
 * native iPhone, global multiplayer or visual parity.
 * Only tests; no WORK0/2/4/6, Porto, UI, deployment or Unity changes.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {
  initialProfile, finishBattle, claimMission, claimDaily, missionProgress,
  importProfileBackup, exportProfileBackup, MISSIONS,
  type LocalProfile, type MissionId
} from '../src/progression.ts';

const noop=()=>{};
const epoch=Date.parse('2026-11-21T00:00:00.000Z');
function render(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop,backupMessage:''
  }));
}
const missionOrder:MissionId[]=['three-battles','five-hits','first-win'];
function missionRows(html:string){
  return [...html.matchAll(/<article class="w8-approved-quest" data-state="([^"]+)">([\s\S]*?)<\/article>/g)]
    .map(m=>({state:m[1],inner:m[2]}));
}
function assertMissions(profile:LocalProfile,expected:'active'|'ready'|'claimed'){
  const rows=missionRows(render('missions',profile));
  assert.equal(rows.length,3,'Every real mission must render once');
  for(const [i,id] of missionOrder.entries()){
    const row=rows[i];
    assert.equal(row.state,expected,'Unexpected mission state: '+id);
    const item=MISSIONS.find(m=>m.id===id)!;
    const progress=row.inner.match(/role="progressbar"[^>]*aria-valuemin="(\d+)"[^>]*aria-valuemax="(\d+)"[^>]*aria-valuenow="(\d+)"/);
    assert.ok(progress,'Accessible mission progress missing: '+id);
    assert.deepEqual(progress.slice(1).map(Number),[0,item.target,missionProgress(profile,id)],
      'Mission visual/accessibility progress drift: '+id);
    const button=[...row.inner.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].at(-1);
    assert.ok(button,'No mission action: '+id);
    const label=expected==='active'?'JOGAR':expected==='ready'?'RECOLHER':'FEITO';
    assert.equal(button[2],label,'Mission CTA is stale: '+id);
    assert.equal(/\bdisabled(?:=""|\s|$)/.test(button[1]),expected==='claimed',
      'Completed mission must not offer another payout: '+id);
  }
}

test('WORK5: mission buttons and accessible progress reflect zero, eligible and collected rewards after restore',()=>{
  let profile=initialProfile();
  assertMissions(profile,'active');
  for(let i=0;i<3;i++)profile=finishBattle(profile,'victory',2,3,epoch+i*1000);
  assert.equal(profile.coins,105,'Battle winnings changed unexpectedly');
  assertMissions(profile,'ready');
  for(const id of missionOrder)profile=claimMission(profile,id);
  assert.equal(profile.coins,205,'Mission payouts do not reconcile');
  assertMissions(profile,'claimed');
  const saved=importProfileBackup(exportProfileBackup(profile,epoch+10_000));
  assertMissions(saved,'claimed');
  for(const id of missionOrder)assert.strictEqual(claimMission(saved,id),saved,
    'Completed mission paid twice after backup: '+id);
});

test('WORK5: daily reward CTA is disabled after same-day claim and backup restore',()=>{
  // Same UTC day as the actual rendering clock; avoids mock timers or timezone assumptions.
  const now=Date.now();
  const fresh=render('missions',initialProfile());
  assert.match(fresh,/<button type="button">RECOLHER<\/button>/,
    'Fresh captain cannot claim their first daily reward');
  const collected=claimDaily(initialProfile(),now);
  const saved=importProfileBackup(exportProfileBackup(collected,now));
  for(const profile of [collected,saved]){
    const html=render('missions',profile);
    assert.match(html,/<button type="button" disabled="">RECOLHIDO<\/button>/,
      'Daily CTA allows repeated collection on the same UTC day');
    assert.equal(profile.lastDailyDay,new Date(now).toISOString().slice(0,10));
    assert.strictEqual(claimDaily(profile,now+1000),profile,
      'Same-day daily reward changed the saved wallet');
  }
});

test('WORK5: profile shows exactly the latest 12 real battles with semantic UTC timestamps after restore',()=>{
  const empty=render('profile',initialProfile());
  assert.match(empty,/No completed battles recorded yet/);
  assert.doesNotMatch(empty,/class="app-battle-entry /);
  let profile=initialProfile();
  for(let i=0;i<19;i++){
    const outcome=i%3===0?'defeat':'victory';
    profile=finishBattle(profile,outcome,i%4,5,epoch+i*61_000);
  }
  assert.equal(profile.battleLog.length,12);
  for(const candidate of [profile,importProfileBackup(exportProfileBackup(profile,epoch+20*61_000))]){
    const html=render('profile',candidate);
    assert.match(html,/12 \/ 12 saved/);
    const log=html.match(/<ol class="app-battle-entries">([\s\S]*?)<\/ol>/);
    assert.ok(log,'Battle log is not a semantic ordered list');
    const entries=[...log[1].matchAll(/<li class="app-battle-entry (is-win|is-loss)">([\s\S]*?)<\/li>/g)];
    assert.equal(entries.length,12,'Incorrect recent-battle visual history length');
    for(const [i,row] of entries.entries()){
      const record=candidate.battleLog[i];
      assert.equal(row[1],record.outcome==='victory'?'is-win':'is-loss');
      const time=row[2].match(/<time dateTime="([^"]+)">([^<]+)<\/time>/);
      assert.ok(time,'Battle entry missing a machine-readable time');
      assert.equal(time[1],record.completedAt,'Out-of-order/inaccurate battle timestamp');
      assert.equal(time[2],record.completedAt.slice(0,16).replace('T',' ')+' UTC');
      assert.ok(row[2].includes(record.hits+' / '+record.shots+' cannon hits'));
      assert.ok(row[2].includes('+'+record.earnedXp+' XP'));
      assert.ok(row[2].includes(record.earnedCoins?'+'+record.earnedCoins+' COINS':'NO COINS'));
    }
    assert.match(html,new RegExp('>'+candidate.wins+'<'), 'Lifetime wins disappeared');
    assert.match(html,/Worldwide Ranking[\s\S]*?Not available:/,
      'Offline-only profile falsely claims a real connected world leaderboard');
  }
});
