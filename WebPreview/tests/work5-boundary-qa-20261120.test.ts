/**
 * WORK 5 — independent QA for release v0.1.113's local model and screen contracts.
 *
 * The tests deliberately exercise real pure-domain functions and React SSR.
 * They do NOT claim browser clicks, physical iPhone input, WebGL pixels, true
 * localStorage races, multiplayer, Apple/Google purchases or Pages deployment.
 * No production, CSS, Unity, asset or workflow file is changed by this PR.
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
  CREW,UPGRADES,initialProfile,parseProfile,finishBattle,claimDaily,canClaimDaily,
  buyCrew,improve,upgradeCost,exportProfileBackup,importProfileBackup,
  type LocalProfile
} from '../src/progression.ts';

const noop=()=>{};
const allScreens:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','profile',
  'ranking','chests','events','rewards','offers'
];
function screenHtml(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop,backupMessage:''
  }));
}

test('WORK5 calendar: UTC midnight, leap day and DST dates do not duplicate a claim',()=>{
  const start=Date.parse('2026-12-31T23:59:59.900Z');
  let profile=claimDaily(initialProfile(),start);
  assert.equal(profile.lastDailyDay,'2026-12-31');
  assert.equal(profile.coins,20);
  assert.equal(claimDaily(profile,start+99),profile);
  profile=claimDaily(profile,start+100);
  assert.equal(profile.lastDailyDay,'2027-01-01');
  assert.equal(profile.dailyStreak,2);
  assert.equal(profile.coins,45);
  assert.equal(claimDaily(profile,start),profile,'clock rollback cannot duplicate coins');

  let leap=initialProfile();
  for(const [date,streak,coins] of [
    ['2028-02-28T12:00:00Z',1,20],
    ['2028-02-29T12:00:00Z',2,45],
    ['2028-03-01T12:00:00Z',3,75],
  ] as const){
    const now=Date.parse(date);
    assert.equal(canClaimDaily(leap,now),true,date);
    leap=claimDaily(leap,now);
    assert.equal(leap.dailyStreak,streak,date);
    assert.equal(leap.coins,coins,date);
    assert.equal(canClaimDaily(leap,now+1000),false,date);
  }
  for(const date of ['2026-03-29T00:30:00Z','2026-10-25T00:30:00Z']){
    const t=Date.parse(date);
    const one=claimDaily(initialProfile(),t);
    assert.equal(claimDaily(one,t+60*60*1000),one,'no second reward on UTC DST-transition date');
  }
});

test('WORK5 economy: exact-cost purchases succeed; one coin short never charges',()=>{
  for(const crew of CREW.filter(c=>c.cost>0)){
    const tooPoor:LocalProfile={...initialProfile(),coins:crew.cost-1};
    assert.equal(buyCrew(tooPoor,crew.id),tooPoor,crew.id+' must require full price');
    const exact:LocalProfile={...initialProfile(),coins:crew.cost};
    const purchased=buyCrew(exact,crew.id);
    assert.equal(purchased.coins,0,crew.id);
    assert.ok(purchased.ownedCrew.includes(crew.id),crew.id);
    assert.equal(buyCrew(purchased,crew.id),purchased,'no duplicate charge '+crew.id);
    assert.equal(exact.coins,crew.cost,'original profile was mutated');
  }
  for(const upgrade of UPGRADES){
    for(let level=0;level<5;level++){
      const cost=upgradeCost(upgrade.id,level);
      const partial:LocalProfile={
        ...initialProfile(),coins:cost-1,
        upgrades:{...initialProfile().upgrades,[upgrade.id]:level}
      };
      assert.equal(improve(partial,upgrade.id),partial,upgrade.id+' L'+level+' insufficient funds');
      const exact:LocalProfile={...partial,coins:cost};
      const updated=improve(exact,upgrade.id);
      assert.equal(updated.coins,0,upgrade.id+' L'+level);
      assert.equal(updated.upgrades[upgrade.id],level+1);
      assert.equal(exact.upgrades[upgrade.id],level,'input must be immutable');
    }
    const maxed:LocalProfile={...initialProfile(),coins:999999,upgrades:{...initialProfile().upgrades,[upgrade.id]:5}};
    assert.equal(improve(maxed,upgrade.id),maxed,'five-level limit '+upgrade.id);
  }
});

test('WORK5 8 approved screens plus 5 side views preserve the same profile wallet',()=>{
  const original:LocalProfile={...initialProfile(),playerName:'Capitã do Norte',coins:140};
  let p=original;
  for(let session=0;session<3;session++){
    p=parseProfile(JSON.stringify(p));
    assert.equal(p.coins,140);
    assert.equal(p.playerName,'Capitã do Norte');
    const port=renderToStaticMarkup(React.createElement(Harbour,{
      profile:p,onBattle:noop,onNavigate:noop
    }));
    assert.match(port,/aria-label="140 locally earned coins"/);
    assert.equal((port.match(/class="harbour-nav-item/g)||[]).length,5);
    for(const id of allScreens){
      const html=screenHtml(id,p);
      assert.match(html,/role="dialog" aria-modal="true"/,id);
      assert.match(html,/aria-label="140 moedas de ouro ganhas localmente"/,id);
      assert.match(html,/aria-label="Main game screens"/,id);
      assert.match(html,/aria-label="Back to harbour/,id);
      assert.equal((html.match(/class="harbour-nav-item/g)||[]).length,5,id);
      assert.doesNotMatch(html,/NaN|>undefined</,id);
    }
  }
  assert.deepEqual(original,{...initialProfile(),playerName:'Capitã do Norte',coins:140});
  // SSR proves rendered state, not a browser reload or real tab synchronization.
});

test('WORK5 battle ledger: 36 deterministic results, capped receipts and clean backup',()=>{
  const clock=Date.parse('2026-11-20T00:00:00Z');
  let p:LocalProfile={...initialProfile(),playerName:'Capitã do Norte',coins:140};
  for(let i=0;i<36;i++){
    const prior=p;
    p=finishBattle(p,i%3===0?'victory':'defeat',2,4,clock+i*1000);
    assert.equal(prior.battleLog.length<=12,true);
    assert.equal(p.battleLog.length,Math.min(i+1,12));
    assert.equal(p.shots,4*(i+1));
    assert.equal(p.hits,2*(i+1));
  }
  assert.equal(p.wins,12);
  assert.equal(p.losses,24);
  assert.equal(p.coins,560);
  assert.equal(p.xp,840);
  assert.equal(p.battleLog[0].outcome,'defeat');
  assert.equal(p.battleLog[0].completedAt,new Date(clock+35_000).toISOString());
  const raw=exportProfileBackup(p,clock+40_000);
  assert.deepEqual(importProfileBackup(raw),p);
  assert.deepEqual(parseProfile(JSON.stringify(p)),p);
});

test('WORK5 invalid backup counters and bogus reward history are rejected',()=>{
  const clock=Date.parse('2026-11-20T00:00:00Z');
  const p=finishBattle({...initialProfile(),coins:140},'victory',2,4,clock);
  const raw=exportProfileBackup(p,clock);
  const modified=(mutate:(f:any)=>void):string=>{
    const f=JSON.parse(raw);
    mutate(f);
    return JSON.stringify(f);
  };
  assert.throws(()=>importProfileBackup(modified(f=>{f.profile.coins=-1;})),/Invalid profile counter/);
  assert.throws(()=>importProfileBackup(modified(f=>{f.profile.wins=1.2;})),/Invalid profile counter/);
  assert.throws(()=>importProfileBackup(modified(f=>{f.profile.equippedCrew='navigator';})),/Equipped captain/);
  assert.throws(()=>importProfileBackup(modified(f=>{f.profile.lastDailyDay='not-a-date';})),/Invalid daily reward history/);
  assert.throws(()=>importProfileBackup(modified(f=>{f.profile.battleLog[0].earnedXp=999;})),/Invalid local battle history/);
  assert.equal(p.coins,175,'invalid import cannot alter the profile');
  const legacy=modified(f=>{delete f.profile.battleLog;});
  assert.deepEqual(importProfileBackup(legacy).battleLog,[],'older v1 saves without battleLog stay importable');
});

test('WORK5 mobile gesture boundaries stay finite across iPhone-width fixtures',()=>{
  for(const width of [320,375,390,430]){
    assert.equal(bearingFromDrag(0,width/2,width/2+width*.2,width),10,width+' positive yaw');
    assert.equal(bearingFromDrag(0,width/2,width/2-width*.2,width),-10,width+' negative yaw');
    assert.equal(bearingFromDrag(20,0,width*10,width),25,width+' yaw max');
    assert.equal(bearingFromDrag(-20,width,width*-10,width),-25,width+' yaw min');
    assert.equal(powerFromClientX(20,20,100),20);
    assert.equal(powerFromClientX(70,20,100),60);
    assert.equal(powerFromClientX(120,20,100),100);
  }
  assert.equal(powerFromClientX(NaN,0,100),20);
  assert.equal(powerFromClientX(50,0,0),20);
  assert.equal(bearingFromDrag(Infinity,0,10,390),0);
  const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  assert.match(main,/event\.isPrimary/,'secondary pointers must not silently become the firing pointer');
  assert.match(main,/onPointerCancelCapture=\{onSceneAimEnd\}/);
  assert.match(main,/setPointerCapture\(event\.pointerId\)/);
  // Mapping and source checks do not certify real pinch-to-zoom on a handset.
});

test('WORK5 battle resets reproducibly and does not accept duplicate in-flight shots',()=>{
  for(const seed of [1,1261,65535]){
    const a=new Battle(seed), b=new Battle(seed);
    a.aim(10,65); b.aim(10,65);
    assert.equal(a.fire(),true);assert.equal(b.fire(),true);
    assert.equal(a.fire(),false);assert.equal(b.fire(),false);
    for(let step=0;step<1500;step++){
      a.tick(1/60);b.tick(1/60);
      if(a.phase==='ready'||a.phase==='victory'||a.phase==='defeat')break;
    }
    assert.equal(a.phase,b.phase);
    assert.deepEqual(a.health,b.health);
    assert.equal(a.shotsFired,1,'no phantom second shot');
    assert.deepEqual(a.drainEvents(),b.drainEvents(),'seeded battle events differ');
    a.reset();
    assert.equal(a.phase,'ready');
    assert.equal(a.shotsFired,0);
    assert.equal(a.hits,0);
    assert.equal(a.health.player,100);
    assert.equal(a.health.enemy,100);
    assert.equal(a.yaw,0);
    assert.equal(a.power,65);
  }
});

test.todo('WORK5 #54: impossible or future dates in existing saves need strict calendar validation');
test.todo('WORK5 #152/#153: browser-level two-tab storage race, hard refresh and relaunch on iOS');
test.todo('WORK5 #90/#527: real 10-second/10-shot battle rules, abandonment and every in-app click');
test.todo('WORK5 device QA: touch/pinch/scroll/safe-area with 320/375/390/430 mobile browser screenshots');
