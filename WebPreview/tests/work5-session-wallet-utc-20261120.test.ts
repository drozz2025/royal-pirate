/**
 * WORK 5 QA: session safety, wallet accounting and UTC replay invariants.
 * Tests use the real pure progression module and React SSR. They do not claim
 * that localStorage, gestures or no-scroll were tested in a physical browser.
 * No production code, CSS, assets, Unity or deployment workflow is changed.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Harbour} from '../src/harbour.tsx';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {
  STORAGE_KEY,initialProfile,parseProfile,finishBattle,claimDaily,claimMission,
  buyCrew,equipCrew,improve,upgradeCost,exportProfileBackup,importProfileBackup,
  type CrewId,type LocalProfile
} from '../src/progression.ts';

const noop=()=>{};
const DAY=86_400_000;
const screens:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','profile',
  'ranking','chests','events','rewards','offers'
];
function sheet(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onExportBackup:noop,onImportBackup:noop,onSetPlayerName:noop,backupMessage:''
  }));
}

test('WORK5 #152/#153: unchanged 140-coin captain survives four simulated session rehydrates',()=>{
  let profile:LocalProfile={...initialProfile(),playerName:'Capitã Maré',coins:140};
  const raw=JSON.stringify(profile);
  for(let session=0;session<4;session++){
    profile=parseProfile(JSON.stringify(profile));
    assert.equal(profile.coins,140,'balance changed without a game action in session '+session);
    assert.equal(profile.playerName,'Capitã Maré');
    const harbour=renderToStaticMarkup(React.createElement(Harbour,{profile,onNavigate:noop,onBattle:noop}));
    assert.match(harbour,/aria-label="140 locally earned coins"/);
    assert.match(harbour,/Capitã Maré/);
    for(const id of screens){
      const html=sheet(id,profile);
      assert.match(html,/aria-label="140 moedas de ouro ganhas localmente"/,id);
      assert.match(html,/role="dialog" aria-modal="true"/,id);
    }
  }
  assert.equal(JSON.stringify(profile),raw,'rehydration must not silently rewrite an unchanged valid save');
  // Model and SSR are not proof of persistence between real browser sessions.
});

test('WORK5 financial ledger: 40 completed battles, five daily claims, missions and spending balance exactly',()=>{
  const t=Date.parse('2026-11-01T12:00:00Z');
  let p:LocalProfile={...initialProfile(),playerName:'Corsário'};
  for(let i=0;i<40;i++){
    p=finishBattle(p,i%4===0?'victory':'defeat',3,5,t+i*1000);
  }
  assert.equal(p.wins,10);
  assert.equal(p.losses,30);
  assert.equal(p.coins,350);
  assert.equal(p.xp,800);
  assert.equal(p.battleLog.length,12,'only twelve newest receipts should remain');
  for(let day=0;day<5;day++){
    const now=t+day*DAY;
    p=claimDaily(p,now);
    assert.equal(claimDaily(p,now+1000),p,'duplicate daily reward on day '+day);
  }
  assert.equal(p.coins,500);
  for(const id of ['first-win','five-hits','three-battles'] as const)p=claimMission(p,id);
  assert.equal(p.coins,600);
  p=buyCrew(p,'gunner');
  p=buyCrew(p,'navigator');
  p=equipCrew(p,'navigator');
  p=improve(p,'hull');
  assert.equal(p.coins,405,'400+ operations must not silently lose or mint coins');
  assert.equal(p.equippedCrew,'navigator');
  const backup=exportProfileBackup(p,t+10*DAY);
  assert.deepEqual(importProfileBackup(backup),p,'wallet and name must survive a clean backup restore');
  assert.equal(parseProfile(JSON.stringify(p)).coins,405);
  assert.equal(parseProfile(JSON.stringify(p)).playerName,'Corsário');
});

test('WORK5 deterministic 400-operation state-machine never mutates prior state or invents money',()=>{
  const origin=Date.parse('2026-11-01T12:00:00Z');
  let p:LocalProfile={...initialProfile(),coins:140,playerName:'Capitã Maré'};
  for(let i=0;i<400;i++){
    const before=p;
    const snapshot=JSON.stringify(before);
    let expected=before.coins;
    const turn=Math.floor(i/7);
    switch(i%7){
      case 0:
        p=finishBattle(before,'victory',2,4,origin+i*1000);
        expected+=35;
        break;
      case 1:
        p=finishBattle(before,'defeat',1,4,origin+i*1000);
        break;
      case 2:
        p=claimMission(before,'first-win');
        if(before.wins>=1&&!before.claimedMissions.includes('first-win'))expected+=25;
        break;
      case 3: {
        p=claimDaily(before,origin+turn*DAY);
        if(p!==before)expected+=15+5*p.dailyStreak;
        break;
      }
      case 4: {
        const crew:CrewId=turn%2?'navigator':'gunner';
        const cost=crew==='navigator'?90:60;
        p=buyCrew(before,crew);
        if(!before.ownedCrew.includes(crew)&&before.coins>=cost)expected-=cost;
        break;
      }
      case 5: {
        const cost=upgradeCost('hull',before.upgrades.hull);
        p=improve(before,'hull');
        if(before.upgrades.hull<5&&before.coins>=cost)expected-=cost;
        break;
      }
      default:
        p=equipCrew(before,turn%2?'navigator':'gunner');
    }
    assert.equal(JSON.stringify(before),snapshot,'input profile was mutated at step '+i);
    assert.equal(p.coins,expected,'wallet mismatch at operation '+i);
    assert.ok(Number.isSafeInteger(p.coins)&&p.coins>=0,'invalid local balance '+i);
    const reloaded=parseProfile(JSON.stringify(p));
    assert.equal(reloaded.coins,p.coins,'currency lost on reload at step '+i);
    assert.equal(reloaded.playerName,'Capitã Maré','captain name lost on reload at step '+i);
    assert.equal(reloaded.wins,p.wins,'victories changed on reload at step '+i);
    assert.equal(reloaded.losses,p.losses,'defeats changed on reload at step '+i);
  }
});

test('WORK5 daily reward at UTC midnight is paid once per date, never on rollback',()=>{
  const midnight=Date.parse('2026-11-19T00:00:00Z');
  let p=claimDaily(initialProfile(),midnight-1000);
  assert.equal(p.lastDailyDay,'2026-11-18');
  assert.equal(p.coins,20);
  p=claimDaily(p,midnight);
  assert.equal(p.lastDailyDay,'2026-11-19');
  assert.equal(p.dailyStreak,2);
  assert.equal(p.coins,45);
  assert.equal(claimDaily(p,midnight+DAY-1),p,'same UTC day cannot claim twice');
  assert.equal(claimDaily(p,midnight-DAY*2),p,'device clock rollback cannot duplicate reward');
  assert.equal(claimDaily(p,0),p,'invalid clock cannot grant reward');
  p=claimDaily(p,midnight+3*DAY);
  assert.equal(p.dailyStreak,1,'nonconsecutive day resets streak');
  assert.equal(p.coins,65);
});

test('WORK5 backups reject invalid balances and forged receipts; validated save stays lossless',()=>{
  const now=Date.parse('2026-11-19T12:00:00Z');
  const p=finishBattle({...initialProfile(),playerName:'Capitã Maré',coins:140},'victory',3,5,now);
  const original=exportProfileBackup(p,now);
  assert.deepEqual(importProfileBackup(original),p);
  const mutate=(change:(file:any)=>void)=>{const file=JSON.parse(original);change(file);return JSON.stringify(file);};
  assert.throws(()=>importProfileBackup(mutate(f=>{f.profile.coins=-100;})),/Invalid profile counter/);
  assert.throws(()=>importProfileBackup(mutate(f=>{f.profile.coins=1.5;})),/Invalid profile counter/);
  assert.throws(()=>importProfileBackup(mutate(f=>{f.profile.ownedCrew=['captain','captain'];})),/Invalid owned crew/);
  assert.throws(()=>importProfileBackup(mutate(f=>{f.profile.battleLog[0].earnedCoins=999;})),/Invalid local battle history/);
  assert.throws(()=>importProfileBackup(mutate(f=>{f.profile.upgrades.hull=6;})),/Invalid ship upgrade level/);
  assert.equal(p.coins,175,'invalid import must not mutate in-memory profile');
});

test('WORK5 wiring contract: one storage key, functional profile updates and result payout guard',()=>{
  const code=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  assert.equal(STORAGE_KEY,'royal-pirate:local-profile:v1');
  assert.match(code,/parseProfile\(window\.localStorage\.getItem\(STORAGE_KEY\)\)/);
  assert.match(code,/window\.localStorage\.setItem\(STORAGE_KEY,JSON\.stringify\(profile\)\)/);
  assert.match(code,/onSetPlayerName=\{name=>setProfile\(p=>/);
  assert.match(code,/onBuyCrew=\{\(id:CrewId\)=>setProfile\(p=>buyCrew\(p,id\)\)\}/);
  assert.match(code,/onDaily=\{\(\)=>setProfile\(p=>claimDaily\(p,Date\.now\(\)\)\)\}/);
  assert.match(code,/const recordedResult=useRef\(false\)/);
  assert.match(code,/recordedResult\.current=true;setProfile\(p=>finishBattle\(p,/);
  assert.match(code,/recordedResult\.current=false/);
  // Source checks cannot verify multi-tab storage conflicts or browser lifecycle behavior.
});

test.todo('WORK5 #152/#153: reproduce real two-tab/localStorage race in Chromium and verify profile survives relaunch');
test.todo('WORK5 #54: reject impossible/future lastDailyDay from existing saves and backups');
test.todo('WORK5 #527/#90: fix dead Battle brand link and enforce 10-second/10-shot/abandonment rules in owning Works');
test.todo('WORK5 iPhone: browser touch, pinch, keyboard, safe-area, overflow and viewport evidence across 320/375/390/430 widths');
