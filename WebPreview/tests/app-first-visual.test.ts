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
  assert.match(html,/Seven-day daily supply route/);
  assert.match(html,/READY TO CLAIM/);
  assert.match(html,/Open daily supply, claim 20 local coins/);
  assert.match(html,/DAY 1\/7/);
  assert.equal((html.match(/aria-label="Day [1-7],/g)||[]).length,7);
  assert.doesNotMatch(html,/Chest [1-4] coming soon/);
  assert.match(html,/0 locally earned coins/);
});
test('UTC claimed state is reflected in the port without creating a second claim',()=>{
  const claimed=claimDaily(initialProfile(),Date.now());
  const html=harbour(claimed);
  assert.match(html,/COLLECTED TODAY/);
  assert.match(html,/Daily supply already collected today/);
  assert.match(html,/STREAK 1\/7/);
  assert.match(html,/Day 1, streak earned/);
  assert.doesNotMatch(html,/Open daily supply, claim 20 local coins/);
});
test('port highlights genuine mission claims and correctly resets an expired daily sequence',()=>{
  const profile={...initialProfile(),wins:1,lastDailyDay:new Date(Date.now()-3*86400000).toISOString().slice(0,10),dailyStreak:5};
  const html=harbour(profile);
  assert.match(html,/1 missions ready to claim/);
  assert.match(html,/Missions: 1 reward claims ready/);
  assert.match(html,/DAY 1\/7/);
  assert.match(html,/STREAK|READY TO CLAIM/);
  assert.doesNotMatch(html,/Day 1, streak earned/);
});
test('shipyard milestones are accessible and crew filters are actionable mobile controls',()=>{
  const forge=app('forge',initialProfile());
  assert.equal((forge.match(/role="progressbar" aria-label="(?:Hull|Cannons|Sails) upgrade level"/g)||[]).length,3);
  assert.match(forge,/Earn 45 more local coins/);
  const crew=app('cards',initialProfile());
  assert.match(crew,/Filter crew collection/);
  assert.match(crew,/aria-pressed="true">ALL/);
  assert.match(crew,/aria-pressed="false">OWNED/);
  assert.match(crew,/1 \/ 3/);
  assert.match(crew,/★ ACTIVE CAPTAIN/);
  assert.match(crew,/UNDISCOVERED/);
  assert.match(crew,/aria-modal="true"/);
});
