/**
 * WORK 5 — independent QA against WebPreview 0.1.115.
 * Unit tests and server-side render checks are NOT iPhone measurements,
 * WebGL gesture verification, or artistic 1:1 approval.
 * This file must not alter another worker's production files.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {Battle} from '../src/battle.ts';
import {bearingFromDrag,powerFromClientX} from '../src/battle-touch.ts';
import {
  STORAGE_KEY,initialProfile,finishBattle,claimDaily,claimMission,buyCrew,
  equipCrew,improve,exportProfileBackup,importProfileBackup,parseProfile,
  type LocalProfile
} from '../src/progression.ts';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const noop=()=>{};
const primary:AppScreenId[]=['battle','fleet','forge','cards','shop','missions','ranking','profile'];
const extra:AppScreenId[]=['chests','events','rewards','offers'];
function screen(id:AppScreenId,profile:LocalProfile){
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen:id,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop,backupMessage:''
  }));
}

test('WORK5: eight main screens and four auxiliary views remain labelled, navigable and wallet-consistent',()=>{
  const captain={...initialProfile(),coins:140,playerName:'QA <nav> & crew'};
  const harbour=renderToStaticMarkup(React.createElement(Harbour,{profile:captain,onBattle:noop,onNavigate:noop}));
  assert.match(harbour,/aria-label="Royal Pirate Porto"/);
  assert.match(harbour,/aria-label="140 locally earned coins"/);
  assert.match(harbour,/QA &lt;nav&gt; &amp; crew/);
  assert.equal((harbour.match(/class="harbour-nav-item/g)||[]).length,5);
  assert.equal((harbour.match(/class="harbour-flank-button/g)||[]).length,6);
  for(const id of [...primary,...extra]){
    const html=screen(id,captain);
    assert.match(html,/role="dialog" aria-modal="true"/,id);
    assert.match(html,/aria-labelledby="app-screen-title"/,id);
    assert.match(html,/id="app-screen-title"/,id);
    assert.match(html,/aria-label="Main game screens"/,id);
    assert.match(html,/aria-label="140 moedas de ouro ganhas localmente"/,id);
    assert.match(html,/aria-label="Back to harbour/,id);
    assert.equal((html.match(/class="harbour-nav-item/g)||[]).length,5,id);
    assert.doesNotMatch(html,/<script[^>]*>QA/,id);
  }
});

test('WORK5: all five permanent dock destinations retain an active real route',()=>{
  const portSource=read('../src/porto-bottom-nav.tsx');
  const screenSource=read('../src/app-screens.tsx');
  for(const route of ['fleet','cards','shop','ranking']){
    assert.ok(portSource.includes("screen:'"+route+"'"),'dock route missing: '+route);
    assert.ok(screenSource.includes("id:'"+route+"'"),'destination missing: '+route);
  }
  assert.match(portSource,/onClick=\{item\.screen===null\?onPorto:/);
  assert.match(screenSource,/onClick=\{onClose\}/);
  assert.match(screenSource,/onClick=\{onBattle\}/);
  assert.match(screenSource,/onClick=\{onExportBackup\}/);
  assert.match(screenSource,/onClick=\{onImportBackup\}/);
  for(const id of ['fleet','cards','shop','ranking'] as const){
    const html=screen(id,initialProfile());
    assert.match(html,/aria-current="page"/,id);
  }
  // Source and SSR contracts do not certify hit-testing. Browser CDP QA is separate.
});

test('WORK5: 120 actual results keep one offline economy ledger through import/export',()=>{
  const now=Date.parse('2026-11-20T00:00:00.000Z');
  let profile=initialProfile();
  let expectedGold=0;
  for(let i=0;i<120;i++){
    const win=i%2===0;
    profile=finishBattle(profile,win?'victory':'defeat',i%5,6,now+i*1000);
    if(win)expectedGold+=35;
    assert.equal(profile.coins,expectedGold,'battle receipt '+i);
    assert.ok(profile.hits<=profile.shots);
    assert.ok(profile.battleLog.length<=12);
  }
  assert.equal(profile.wins,60);
  assert.equal(profile.losses,60);
  for(const id of ['first-win','five-hits','three-battles'] as const){
    const before=profile.coins;
    profile=claimMission(profile,id);
    assert.ok(profile.coins>before,id+' reward must be earned');
    expectedGold=profile.coins;
    assert.strictEqual(claimMission(profile,id),profile,'mission repeated '+id);
  }
  profile=claimDaily(profile,now);
  expectedGold+=20;
  assert.equal(profile.coins,expectedGold);
  assert.strictEqual(claimDaily(profile,now+500),profile,'daily claimed twice');
  profile=claimDaily(profile,now+86400000);
  expectedGold+=25;
  assert.equal(profile.coins,expectedGold);
  profile=buyCrew(profile,'gunner');expectedGold-=60;
  profile=buyCrew(profile,'navigator');expectedGold-=90;
  profile=equipCrew(profile,'navigator');
  profile=improve(profile,'hull');expectedGold-=45;
  assert.equal(profile.coins,expectedGold);
  assert.equal(profile.equippedCrew,'navigator');
  assert.equal(profile.upgrades.hull,1);
  assert.strictEqual(buyCrew(profile,'gunner'),profile,'recruitment not repeatable');
  const restored=importProfileBackup(exportProfileBackup(profile,now));
  assert.deepEqual(restored,profile);
  assert.deepEqual(parseProfile(JSON.stringify(restored)),profile);
  assert.equal(restored.coins,expectedGold);
});

test('WORK5: invalid offline backup cannot replace player identity or mint currencies',()=>{
  const original={...initialProfile(),playerName:'Capitão QA',coins:140};
  const backup=exportProfileBackup(original,Date.parse('2026-11-20T01:00:00Z'));
  const bad=JSON.parse(backup);
  bad.profile.coins=-99;
  assert.throws(()=>importProfileBackup(JSON.stringify(bad)),/Invalid profile counter/);
  bad.profile.coins=140;
  bad.profile.ownedCrew=['captain','captain'];
  assert.throws(()=>importProfileBackup(JSON.stringify(bad)),/owned crew/);
  assert.throws(()=>importProfileBackup(' '.repeat(65537)),/64 KB/);
  assert.equal(importProfileBackup(backup).playerName,'Capitão QA');
  assert.equal(importProfileBackup(backup).coins,140);
  assert.equal(STORAGE_KEY,'royal-pirate:local-profile:v1');
});

test('WORK5: five iPhone-width gesture mappings remain bounded and single-fire is enforced',()=>{
  for(const width of [320,375,384,390,430]){
    assert.equal(bearingFromDrag(0,width/2,width/2+width*.3,width),15);
    assert.equal(bearingFromDrag(0,width/2,width/2-width*.3,width),-15);
    assert.equal(bearingFromDrag(0,0,width*4,width),25);
    assert.equal(powerFromClientX(0,0,width),20);
    assert.equal(powerFromClientX(width,0,width),100);
    assert.equal(powerFromClientX(width*4,0,width),100);
  }
  const battle=new Battle(20261120);
  assert.equal(battle.fire(),true);
  assert.equal(battle.fire(),false,'rapid second touch must not create another shot');
  assert.equal(battle.shotsFired,1);
  battle.aim(23,100);
  assert.equal(battle.shotsFired,1);
  battle.reset();
  assert.equal(battle.shotsFired,0);
  assert.equal(battle.phase,'ready');
});

test('WORK5: release/cache metadata, portrait and safe-area contracts agree',()=>{
  const pkg=JSON.parse(read('../package.json'));
  const lock=JSON.parse(read('../package-lock.json'));
  const html=read('../index.html');
  const sw=read('../public/sw.js');
  const manifest=JSON.parse(read('../public/manifest.webmanifest'));
  assert.equal(pkg.version,'0.1.115','release baseline under QA');
  assert.equal(lock.version,pkg.version);
  assert.ok(html.includes('v'+pkg.version));
  assert.ok(sw.includes('royal-pirate-web-v'+pkg.version));
  assert.equal(manifest.orientation,'portrait-primary');
  assert.match(html,/width=device-width,initial-scale=1,viewport-fit=cover/);
  const css=read('../src/app-screens.css');
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/safe-area-inset-top/);
  assert.match(css,/focus-visible/);
});

test.todo('WORK5 #90: 10-second turn clock and 10-attempt match limit are not implemented');
test.todo('WORK5 #527: header brand href="#" still requires an actionable destination');
test.todo('WORK5 #54: reject impossible calendar days in restored daily-reward history');
test.todo('WORK5 #104: measure actual two-finger ship pinch and short-viewport clipping in mobile browser');
test.todo('WORK5 #152/#153: verify multi-tab profile/economy conflict and reload in physical iOS Safari');
