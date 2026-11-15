import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Harbour} from '../src/harbour.tsx';
import {AppScreens} from '../src/app-screens.tsx';
import {claimDaily, initialProfile, type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
const harbour=(profile:LocalProfile)=>renderToStaticMarkup(React.createElement(Harbour,{
  profile,onBattle:noop,onInspect:noop,onNavigate:noop
}));
const app=(screen:'forge'|'cards',profile:LocalProfile)=>renderToStaticMarkup(React.createElement(AppScreens,{
  screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,onInspect:noop,onBuyCrew:noop,
  onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
}));

test('port daily supply is an honest live navigation control, not fabricated four chests',()=>{
  const html=harbour(initialProfile());
  assert.match(html,/Daily supply ready: claim 20 local coins in Missions/);
  assert.match(html,/DAY 1 · CLAIM/);
  assert.match(html,/harbour-compact-daily/);
  assert.match(html,/DAY 1 · CLAIM/);
  assert.equal((html.match(/harbour-compact-daily/g)||[]).length,1);
  assert.doesNotMatch(html,/Chest [1-4] coming soon/);
  assert.match(html,/0 locally earned coins/);
});
test('UTC claimed state is reflected in the port without creating a second claim',()=>{
  const claimed=claimDaily(initialProfile(),Date.now());
  const html=harbour(claimed);
  assert.match(html,/Daily supply collected today, streak 1 of 7/);
  assert.match(html,/✓ 1\/7/);
  assert.doesNotMatch(html,/DAILY SUPPLY ROUTE/);
  assert.doesNotMatch(html,/DAILY SUPPLY ROUTE/);
  assert.doesNotMatch(html,/DAY 1 · CLAIM/);
});
test('port highlights genuine mission claims and correctly resets an expired daily sequence',()=>{
  const profile={...initialProfile(),wins:1,lastDailyDay:new Date(Date.now()-3*86400000).toISOString().slice(0,10),dailyStreak:5};
  const html=harbour(profile);
  assert.match(html,/1 READY/);
  assert.match(html,/Missions: 1 reward claims ready/);
  assert.match(html,/DAY 1 · CLAIM/);
  assert.match(html,/DAY 1 · CLAIM/);
  assert.doesNotMatch(html,/STREAK 5\/7/);
});
test('shipyard milestones are accessible and crew filters are actionable mobile controls',()=>{
  const forge=app('forge',initialProfile());
  assert.equal((forge.match(/role="progressbar" aria-label="(?:Hull|Cannons|Sails) upgrade level"/g)||[]).length,3);
  assert.match(forge,/Earn 45 more local coins/);
  const crew=app('cards',initialProfile());
  assert.match(crew,/Filter crew collection/);
  assert.match(crew,/aria-pressed="true">ALL/);
  assert.match(crew,/aria-pressed="false">OWNED/);
  assert.match(crew,/CREW COLLECTED/);
  assert.match(crew,/★ ACTIVE CAPTAIN/);
  assert.match(crew,/UNDISCOVERED/);
  assert.match(crew,/aria-modal="true"/);
});
