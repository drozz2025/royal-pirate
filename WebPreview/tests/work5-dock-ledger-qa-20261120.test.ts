/**
 * WORK 5 — isolated contract tests for the real five-tab dock on all views.
 * SSR verifies the shipped React markup and route wiring, not physical
 * touchscreen operation, native scroll/pinch, actual HTTP or visual approval.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {claimDaily, buyCrew, finishBattle, initialProfile, importProfileBackup,
  exportProfileBackup, improve, parseProfile, type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
const views:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','ranking','profile',
  'chests','events','rewards','offers'
];
const activeTabs:Partial<Record<AppScreenId,string>>={
  fleet:'FROTA',forge:'FROTA',cards:'CARTAS',shop:'LOJA',
  ranking:'RANKING',profile:'RANKING'
};
function render(screen:AppScreenId,profile:LocalProfile=initialProfile()):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));
}
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('every real view has one accessible dock with exactly five named action buttons',()=>{
  for(const view of views){
    const html=render(view);
    assert.match(html,/role="dialog" aria-modal="true"/,view);
    assert.match(html,/aria-labelledby="app-screen-title"/,view);
    assert.match(html,/aria-label="Recursos do capitão"/,view);
    const nav=html.match(/<nav class="harbour-nav app-dock-porto"[^>]*>[\s\S]*?<\/nav>/)?.[0];
    assert.ok(nav,'missing real dock on '+view);
    assert.match(nav,/aria-label="Main game screens"/,view);
    const buttons=[...nav.matchAll(/<button\b[^>]*>/g)].map(m=>m[0]);
    assert.equal(buttons.length,5,view+' lost a dock destination');
    assert.deepEqual(buttons.map(button=>button.match(/aria-label="([^"]+)"/)?.[1]?.split(',')[0]),
      ['Porto','FROTA','CARTAS','LOJA','RANKING'],view);
    for(const button of buttons) assert.match(button,/type="button"/,view);
    const current=buttons.filter(button=>button.includes('aria-current="page"'));
    const expected=activeTabs[view];
    assert.equal(current.length,expected?1:0,view+' has an incorrect selected tab');
    if(expected){
      assert.ok(current[0].includes('aria-label="'+expected),'wrong selected tab on '+view);
      assert.match(current[0],/disabled/,view+' current tab must not re-trigger');
    }
  }
});

test('Porto entry controls and every dock destination are real wired callbacks, not placeholders',()=>{
  const port=renderToStaticMarkup(React.createElement(Harbour,{
    profile:initialProfile(),onBattle:noop,onNavigate:noop
  }));
  assert.match(port,/aria-label="Royal Pirate Porto"/);
  assert.equal((port.match(/class="harbour-nav-item/g)||[]).length,5);
  assert.match(port,/class="harbour-battle-button/);
  const dockSource=read('../src/porto-bottom-nav.tsx');
  assert.ok(dockSource.includes('onClick={item.screen===null?onPorto:()=>onNavigate(item.screen!)}'),
    'navigation must invoke actual callbacks');
  const app=read('../src/main.tsx');
  assert.match(app,/onNavigate=\{navigateTo\}/);
  assert.match(app,/onBattle=\{enterBattle\}/);
  assert.match(app,/onClose=\{\(\)=>setAppScreen\(null\)\}/);
  for(const view of views){
    const html=render(view);
    assert.doesNotMatch(html,/href="(?:#|javascript:[^"]*|)"/i,
      view+' contains a dead or unsafe placeholder link');
  }
});

test('daily rewards respect UTC midnight, same-day replay, and a skipped-day streak reset',()=>{
  const d1=Date.parse('2026-11-19T23:59:59.000Z');
  const d2=Date.parse('2026-11-20T00:00:00.000Z');
  const d4=Date.parse('2026-11-22T00:00:00.000Z');
  const a=claimDaily(initialProfile(),d1);
  assert.equal(a.coins,20);
  assert.equal(a.dailyStreak,1);
  assert.strictEqual(claimDaily(a,d1),a,'the same UTC day cannot earn twice');
  const b=claimDaily(a,d2);
  assert.equal(b.coins,45);
  assert.equal(b.dailyStreak,2);
  assert.strictEqual(claimDaily(b,d2),b,'no zero-second replay');
  const c=claimDaily(b,d4);
  assert.equal(c.coins,65);
  assert.equal(c.dailyStreak,1);
});

test('exact balance purchases never create negative coins and session JSON restores the resulting ledger',()=>{
  let p=initialProfile();
  const base=Date.parse('2026-11-20T00:00:00.000Z');
  p=finishBattle(p,'victory',4,5,base);
  p=finishBattle(p,'victory',4,5,base+1000);
  assert.equal(p.coins,70);
  p=buyCrew(p,'gunner');
  assert.equal(p.coins,10);
  assert.strictEqual(buyCrew(p,'gunner'),p,'duplicated purchase must be a no-op');
  assert.strictEqual(buyCrew(p,'navigator'),p,'insufficient coins must be a no-op');
  assert.strictEqual(improve(p,'hull'),p,'no negative balance through upgrades');
  const stored=JSON.stringify(p);
  assert.deepEqual(parseProfile(stored),p,'local reload should preserve 10 coins');
  assert.deepEqual(importProfileBackup(exportProfileBackup(p,base)),p,'backup should preserve ledger');
});

test('profile text is HTML-escaped in the dock and profile view, including after JSON restore',()=>{
  const malicious='<script>alert(1)</script>';
  const source={...initialProfile(),playerName:malicious};
  const p=parseProfile(JSON.stringify(source));
  for(const view of ['profile','ranking','fleet'] as const){
    const html=render(view,p);
    assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/i,view);
    assert.match(html,/&lt;script&gt;/,view);
  }
});

test('backups reject changes to recorded earnings, even after JSON serialization',()=>{
  const now=Date.parse('2026-11-20T00:00:00.000Z');
  const p=finishBattle(initialProfile(),'victory',4,5,now);
  const data=JSON.parse(exportProfileBackup(p,now));
  data.profile.battleLog[0].earnedCoins=3500;
  assert.throws(()=>importProfileBackup(JSON.stringify(data)),/battle history/);
  data.profile.battleLog[0].earnedCoins=35;
  data.profile.hits=6;
  data.profile.shots=5;
  assert.throws(()=>importProfileBackup(JSON.stringify(data)),/Invalid shot statistics/);
});

// Issue #104 requires native 384x512 and 320x568 browser hit testing.
// SSR is explicitly NOT accepted as evidence that the dock is visible/tappable.
test.todo('WORK0/#104: in real Chromium at 384x512, dock is fully inside 100dvh and hit-testable on all 8 screens');
test.todo('Issue #54: import must reject impossible calendar days such as 2026-02-30');
