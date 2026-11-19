/**
 * ROYAL PIRATE — WORK 5 independent session and profile regression tests.
 * Checks serialized local state, SSR contracts and deterministic domain actions.
 * These are NOT proof of actual browser reloads, touch/pinch, or physical iPhone QA.
 * Production code, visual ownership, Unity and deployment configuration untouched.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Harbour} from '../src/harbour.tsx';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {STORAGE_KEY,BACKUP_FORMAT,initialProfile,parseProfile,finishBattle,
  buyCrew,improve,claimMission,claimDaily,canClaimDaily,exportProfileBackup,
  importProfileBackup,type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
const core:AppScreenId[]=['battle','fleet','forge','cards','shop','missions','profile'];
const secondary:AppScreenId[]=['ranking','chests','events','rewards','offers'];
const reload=(profile:LocalProfile)=>parseProfile(JSON.stringify(profile));
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
function port(profile:LocalProfile):string{
  return renderToStaticMarkup(React.createElement(Harbour,{profile,onBattle:noop,onNavigate:noop}));
}
function screen(id:AppScreenId,profile:LocalProfile):string{
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen:id,profile,onNavigate:noop,onClose:noop,onBattle:noop,onBuyCrew:noop,
    onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,onSetPlayerName:noop,
    onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));
}
const player=(coins:number):LocalProfile=>({...initialProfile(),playerName:'Capitão Aurora',coins});

test('reported 140→40 regression: unchanged local snapshot preserves all 140 gold and chosen name',()=>{
  const main=read('../src/main.tsx');
  assert.equal(STORAGE_KEY,'royal-pirate:local-profile:v1');
  assert.ok(main.includes('window.localStorage.getItem(STORAGE_KEY)'),'initial profile must read the same key');
  assert.ok(main.includes('window.localStorage.setItem(STORAGE_KEY,JSON.stringify(profile))'),'updates must write the same key');
  assert.ok(main.includes('onSetPlayerName={name=>setProfile('),'name edit must update the saved profile');
  let p=player(140);
  for(let reloadNumber=0;reloadNumber<40;reloadNumber++){
    p=reload(p);
    assert.equal(p.coins,140,'balance changed without a transaction on reload '+reloadNumber);
    assert.equal(p.playerName,'Capitão Aurora','name reset on reload '+reloadNumber);
  }
  // This verifies the serialization path, NOT reload, PWA/cache or real localStorage in Chromium.
});

test('Porto and every app sheet derive the same saved identity and wallet',()=>{
  const p=player(140);
  const home=port(p);
  assert.match(home,/aria-label="140 locally earned coins"/);
  assert.match(home,/aria-label="Royal Pirate Porto"/);
  for(const id of [...core,...secondary]){
    const html=screen(id,p);
    assert.ok(html.includes('Capitão Aurora'),'saved captain missing from '+id);
    assert.match(html,/aria-label="140 moedas de ouro ganhas localmente"/,id);
    assert.match(html,/role="dialog" aria-modal="true"/,id);
    assert.match(html,/aria-labelledby="app-screen-title"/,id);
    assert.equal((html.match(/id="app-screen-title"/g)||[]).length,1,id+' missing/duplicate heading target');
    assert.match(html,/aria-label="Back to harbour/,id);
    assert.doesNotMatch(html,/<a\b[^>]*href=["']#["']/i,id+' inert local anchor');
  }
});

test('real prices and reward transitions change coins once, then survive serialization',()=>{
  const now=Date.parse('2026-11-19T12:00:00Z');
  let p=reload(player(140));
  p=reload(buyCrew(p,'gunner'));assert.equal(p.coins,80);
  const afterCrew=p;assert.equal(buyCrew(p,'gunner'),afterCrew,'duplicate purchase must not spend');
  p=reload(improve(p,'hull'));assert.equal(p.coins,35);
  const afterUpgrade=p;assert.equal(improve(p,'hull'),afterUpgrade,'insufficient funds must not spend');
  p=reload(finishBattle(p,'victory',4,5,now));assert.equal(p.coins,70);
  p=reload(claimMission(p,'first-win'));assert.equal(p.coins,95);
  const afterMission=p;assert.equal(claimMission(p,'first-win'),afterMission,'mission must pay only once');
  p=reload(buyCrew(p,'navigator'));assert.equal(p.coins,5);
  p=reload(claimDaily(p,now));assert.equal(p.coins,25);
  assert.equal(canClaimDaily(p,now+1000),false);
  assert.equal(claimDaily(p,now+1000),p,'daily reward must not pay twice in the same day');
  assert.equal(p.playerName,'Capitão Aurora');
  assert.equal(p.ownedCrew.includes('navigator'),true);
  assert.equal(p.upgrades.hull,1);
});

test('30 completed encounters and simulated reopens do not reset lifetime earnings or captain name',()=>{
  const first=Date.parse('2026-11-19T01:00:00Z');
  let p=player(140);
  for(let i=0;i<30;i++){
    p=reload(finishBattle(p,i%2===0?'victory':'defeat',i%2===0?4:1,5,first+i*1000));
    assert.equal(p.coins,140+Math.ceil((i+1)/2)*35);
    assert.equal(p.playerName,'Capitão Aurora');
    assert.ok(p.battleLog.length<=12,'stored log must remain bounded');
  }
  assert.equal(p.wins,15);
  assert.equal(p.losses,15);
  assert.equal(p.coins,665);
  assert.equal(p.battleLog.length,12);
  assert.equal(p.battleLog[0].completedAt,new Date(first+29_000).toISOString());
});

test('offline backup round-trip preserves chosen name, wallet, receipts and daily claims',()=>{
  const now=Date.parse('2026-11-19T18:30:00Z');
  let p=player(140);
  p=finishBattle(p,'victory',5,5,now);
  p=claimDaily(p,now);
  const exported=exportProfileBackup(p,now);
  const parsed=JSON.parse(exported) as {format:string;profile:LocalProfile};
  assert.equal(parsed.format,BACKUP_FORMAT);
  assert.equal(parsed.profile.coins,195);
  assert.deepEqual(importProfileBackup(exported),reload(p));
  assert.equal(importProfileBackup(exported).playerName,'Capitão Aurora');
  const tampered=JSON.parse(exported);
  tampered.profile.battleLog[0].earnedCoins=100000;
  assert.throws(()=>importProfileBackup(JSON.stringify(tampered)),/battle history/);
  assert.equal(p.coins,195,'invalid backup must not modify the current input profile');
});

test('profile-name input, keyboard escape and portrait accessibility remain connected',()=>{
  const main=read('../src/main.tsx');
  const screens=read('../src/app-screens.tsx');
  const html=read('../index.html');
  const manifest=JSON.parse(read('../public/manifest.webmanifest')) as {orientation:string};
  const p=player(140);
  assert.match(screen('profile',p),/id="app-player-name"/);
  assert.match(screen('profile',p),/aria-describedby="app-player-name-help"/);
  assert.match(screen('profile',p),/type="submit"/);
  assert.match(screens,/onSubmit=\{event=>\{event\.preventDefault\(\)/);
  assert.match(screens,/onKeyDown=\{onDialogKeyDown\}/);
  assert.ok(main.includes("if(e.key==='Escape')"),'Escape exit must be handled');
  assert.match(html,/width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.equal(manifest.orientation,'portrait-primary');
});

// Known product bugs are separately tracked and intentionally NOT marked passing.
test.todo('issue #527: replace Battle topbar brand href="#" with genuine navigation or inert branding');
test.todo('issue #90: timed 10-second turns, 10-attempt cap and voluntary-abandon loss');
