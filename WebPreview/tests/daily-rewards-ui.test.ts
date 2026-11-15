import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens} from '../src/app-screens.tsx';
import {claimDaily,canClaimDaily,initialProfile,nextDailyStreak, type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
const common={onNavigate:noop,onClose:noop,onBattle:noop,onInspect:noop,
  onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
  onExportBackup:noop,onImportBackup:noop,backupMessage:''};
const render=(profile:LocalProfile)=>renderToStaticMarkup(React.createElement(AppScreens,{...common,screen:'missions',profile}));

test('next daily reward uses UTC consecutive day, resets after missing day, and never exceeds seventh-day reward',()=>{
 const t=Date.parse('2026-11-15T12:00:00Z'),day=86_400_000;
 const first=claimDaily(initialProfile(),t);
 assert.equal(nextDailyStreak(initialProfile(),t),1);
 assert.equal(nextDailyStreak(first,t),2);
 assert.equal(nextDailyStreak(first,t+day),2);
 assert.equal(nextDailyStreak(first,t+2*day),1);
 assert.equal(canClaimDaily(first,t),false);
 assert.equal(claimDaily(first,t),first);
 let current=first;
 for(let n=2;n<=8;n++)current=claimDaily(current,t+(n-1)*day);
 assert.equal(current.dailyStreak,7);
 assert.equal(nextDailyStreak(current,t+8*day),1); // skipped calendar day
 assert.equal(nextDailyStreak(current,t+7*day),7); // capped at day seven
});

test('missions render seven days with earned and next statuses, accurate local-coins math and accessible progress',()=>{
 const today=Date.now(),yesterday=today-86_400_000;
 const first=claimDaily(initialProfile(),yesterday);
 const html=render(first);
 assert.match(html,/7-day supply route/);
 assert.match(html,/Seven consecutive daily rewards/);
 assert.equal((html.match(/class="app-week-day(?: is-claimed| is-next)?"/g)||[]).length,7);
 assert.match(html,/DAY 1/);
 assert.match(html,/DAY 7/);
 assert.match(html,/Next claim earns 25 coins/);
 assert.match(html,/class="app-week-day is-claimed"/);
 assert.match(html,/class="app-week-day is-next"/);
 assert.match(html,/role="progressbar" aria-label="Win your first battle progress" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"/);
 assert.match(html,/role="status" aria-live="polite" aria-atomic="true"/);
});

test('expired daily streak is not rendered as earned and returns to day one',()=>{
 const today=Date.now();
 const expired={...initialProfile(),lastDailyDay:new Date(today-4*86_400_000).toISOString().slice(0,10),dailyStreak:5};
 const html=render(expired);
 assert.equal((html.match(/class="app-week-day is-claimed"/g)||[]).length,0);
 assert.equal((html.match(/class="app-week-day is-next"/g)||[]).length,1);
 assert.match(html,/Next claim earns 20 coins/);
});

test('crew and forge show local-only contract, screenreader heading and explicit status region',()=>{
 for(const screen of ['forge','cards'] as const){
  const html=renderToStaticMarkup(React.createElement(AppScreens,{...common,screen,profile:initialProfile()}));
  assert.match(html,/id="app-screen-title"/);
  assert.match(html,/tabindex="-1"/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/locally|saved locally|saved on this device/i);
 }
});
