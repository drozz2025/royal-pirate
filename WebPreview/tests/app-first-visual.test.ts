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

test('port daily supply is a compact side shortcut, with calendar in Missions',()=>{
  const html=harbour(initialProfile());
  assert.match(html,/Daily supply ready: claim 20 local coins in Missions/);
  assert.match(html,/data-pirate-icon="chests"/);
  assert.equal((html.match(/data-pirate-icon="chests"/g)||[]).length,1);
  assert.doesNotMatch(html,/DAILY SUPPLY ROUTE|DAY 1 · CLAIM|harbour-compact-daily/);
  assert.match(html,/0 locally earned coins/);
});
test('claimed daily supply has accurate state in the compact chests shortcut',()=>{
  const claimed=claimDaily(initialProfile(),Date.now());
  const html=harbour(claimed);
  assert.match(html,/Daily supply collected today, streak 1 of 7/);
  assert.doesNotMatch(html,/Daily supply ready: claim/);
  assert.doesNotMatch(html,/DAILY SUPPLY ROUTE/);
});
test('mission badge reflects genuine reward claim and expired daily sequence resets',()=>{
  const profile={...initialProfile(),wins:1,lastDailyDay:new Date(Date.now()-3*86400000).toISOString().slice(0,10),dailyStreak:5};
  const html=harbour(profile);
  assert.match(html,/Missions: 1 reward claims ready/);
  assert.match(html,/Daily supply ready: claim 20 local coins in Missions/);
  assert.doesNotMatch(html,/streak 5 of 7/);
});
test('shipyard milestones are accessible and crew filters are actionable mobile controls',()=>{
  const forge=app('forge',initialProfile());
  assert.equal((forge.match(/shipyard upgrade progress"/g)||[]).length,3);
  assert.match(forge,/aria-label="Níveis locais dos sistemas do navio"/);
  assert.match(forge,/MOEDAS INSUFICIENTES/);
  assert.match(forge,/NAVIO/);
  assert.match(forge,/ARMADURA/);
  const crew=app('cards',initialProfile());
  assert.match(crew,/Filter crew collection/);
  assert.match(crew,/aria-pressed="true">ALL/);
  assert.match(crew,/aria-pressed="false">OWNED/);
  assert.match(crew,/CREW COLLECTED/);
  assert.match(crew,/★ ACTIVE CAPTAIN/);
  assert.match(crew,/UNDISCOVERED/);
  assert.match(crew,/aria-modal="true"/);
});
