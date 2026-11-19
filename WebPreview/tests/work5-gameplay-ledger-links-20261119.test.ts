/**
 * WORK 5 — independent QA: battle -> local ledger -> backup -> mobile UI.
 * Node simulation/React SSR only. This does NOT prove physical iPhone gestures,
 * real browser clicks, visual fidelity, server multiplayer, or live publication.
 * No production code, assets, styles, CI workflow or other worker files modified.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Battle, type BattleEvent} from '../src/battle.ts';
import {Harbour} from '../src/harbour.tsx';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {
  initialProfile, finishBattle, exportProfileBackup, importProfileBackup,
  canClaimDaily, claimDaily, buyCrew, equipCrew, improve, claimMission,
  CREW, UPGRADES, upgradeCost, type LocalProfile
} from '../src/progression.ts';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const noop=()=>{};
const done=(phase:string)=>phase==='victory'||phase==='defeat';

function completeBattle(b:Battle,accurate:boolean) {
  const events:BattleEvent[]=[];
  for(let shot=0;shot<25&&!done(b.phase);shot++){
    assert.equal(b.phase,'ready','player must not fire outside own turn');
    b.aim(accurate?0:25,accurate?65:20);
    assert.equal(b.fire(),true,'first fire succeeds');
    assert.equal(b.fire(),false,'second tap during flight must not fire');
    events.push(...b.drainEvents());
    for(let tick=0;tick<2400&&b.phase!=='ready'&&!done(b.phase);tick++){
      b.tick(1/60);
      events.push(...b.drainEvents());
    }
    assert.ok(b.phase==='ready'||done(b.phase),'shot and AI response must settle');
  }
  assert.equal(b.phase,accurate?'victory':'defeat','seeded battle must finish');
  assert.equal(b.drainEvents().length,0,'events must not replay after draining');
  assert.equal(events.filter(e=>e.type==='fire'&&e.side==='player').length,b.shotsFired);
  assert.equal(events.filter(e=>e.type==='hit'&&e.side==='enemy').length,b.hits);
  assert.equal(events.filter(e=>e.type==='result').length,1,'single terminal result event');
  assert.ok(b.hits<=b.shotsFired);
  assert.ok(b.health.player>=0&&b.health.enemy>=0);
  assert.equal(b.fire(),false,'terminal state must reject further shots');
  return events;
}

test('40 complete seeded battles settle with one result and exact local reward receipts',()=>{
  let p=initialProfile(),won=0,lost=0,totalHits=0,totalShots=0;
  const start=Date.parse('2026-11-19T12:00:00Z');
  for(let i=0;i<40;i++){
    const accurate=i%2===0;
    const b=new Battle(1000+i);
    const events=completeBattle(b,accurate);
    assert.ok(events.length>=3);
    assert.equal(b.phase,accurate?'victory':'defeat');
    if(accurate)won++;else lost++;
    totalHits+=b.hits;totalShots+=b.shotsFired;
    const before=p;
    p=finishBattle(p,accurate?'victory':'defeat',b.hits,b.shotsFired,start+i*60_000);
    assert.equal(p.wins,won);
    assert.equal(p.losses,lost);
    assert.equal(p.coins,before.coins+(accurate?35:0));
    assert.equal(p.xp,before.xp+(accurate?50:10));
    assert.equal(p.battleLog[0].shots,b.shotsFired);
    assert.equal(p.battleLog[0].hits,b.hits);
    assert.equal(p.battleLog[0].completedAt,new Date(start+i*60_000).toISOString());
    assert.ok(p.battleLog.length<=12,'history stays capped');
  }
  assert.equal(p.wins,20);
  assert.equal(p.losses,20);
  assert.equal(p.coins,700);
  assert.equal(p.xp,1200);
  assert.equal(p.hits,totalHits);
  assert.equal(p.shots,totalShots);
  assert.equal(p.battleLog.length,12);
  assert.deepEqual(importProfileBackup(exportProfileBackup(p,start+41*60_000)),p);
});

test('reset cancels a pending shot and reproduces same seeded battle events',()=>{
  const b=new Battle(727);
  b.aim(0,65);
  assert.equal(b.fire(),true);
  b.tick(.12);
  b.reset();
  assert.equal(b.phase,'ready');
  assert.equal(b.shotsFired,0);
  assert.equal(b.shot,null);
  assert.equal(b.drainEvents().length,0);
  const first=completeBattle(b,true);
  const health={...b.health};
  for(let i=0;i<300;i++)b.tick(.1);
  assert.deepEqual(b.health,health,'terminal state cannot keep causing damage');
  b.reset();
  const second=completeBattle(b,true);
  assert.deepEqual(second,first,'battle random seed must be reproducible after reset');
});

test('local wallet persists identically through Porto and twelve overlay destinations',()=>{
  let p=initialProfile();
  const now=Date.parse('2026-11-19T06:00:00Z');
  for(let i=0;i<4;i++)p=finishBattle(p,'victory',4,5,now+i*1000);
  p=claimDaily(p,now);
  p=claimMission(p,'first-win');
  const restored=importProfileBackup(exportProfileBackup(p,now));
  const harbour=renderToStaticMarkup(React.createElement(Harbour,{
    profile:restored,onBattle:noop,onNavigate:noop
  }));
  assert.match(harbour,/aria-label="Royal Pirate Porto"/);
  assert.ok(harbour.includes('aria-label="'+restored.coins+' locally earned coins"'));
  assert.doesNotMatch(harbour,/<a\b[^>]*\bhref=["']#["']/i,'no inert links in Porto');
  const screens:AppScreenId[]=[
    'battle','fleet','forge','cards','shop','missions','profile',
    'ranking','chests','events','rewards','offers'
  ];
  for(const screen of screens){
    const html=renderToStaticMarkup(React.createElement(AppScreens,{
      screen,profile:restored,onNavigate:noop,onClose:noop,onBattle:noop,
      onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
      onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
    }));
    assert.match(html,/role="dialog" aria-modal="true"/,screen+' must be a dialog');
    assert.match(html,/aria-label="Back to harbour/,screen+' must have an exit');
    assert.match(html,/aria-label="Recursos do capitão"/,screen+' must show wallet');
    assert.ok(html.includes('aria-label="'+restored.coins+' moedas de ouro ganhas localmente"'),screen+' wallet discrepancy');
    assert.ok((html.match(/<button\b/g)||[]).length>=2,screen+' has insufficient controls');
    assert.doesNotMatch(html,/<a\b[^>]*\bhref=["']#["']/i,screen+' has an inert anchor');
  }
});

test('1000 repeated purchases and upgrades cannot duplicate ownership or mint gold',()=>{
  let p:LocalProfile={...initialProfile(),coins:20_000};
  let random=0x51a73;
  const next=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random;};
  const names=CREW.map(c=>c.id);
  const upgrades=UPGRADES.map(u=>u.id);
  for(let i=0;i<1000;i++){
    const old=p;
    const choice=next()%3;
    if(choice===0)p=buyCrew(p,names[next()%names.length]);
    else if(choice===1)p=equipCrew(p,names[next()%names.length]);
    else p=improve(p,upgrades[next()%upgrades.length]);
    assert.ok(p.coins>=0&&p.coins<=old.coins,'shop/forge cannot increase wallet');
    assert.equal(new Set(p.ownedCrew).size,p.ownedCrew.length);
    assert.ok(p.ownedCrew.includes(p.equippedCrew),'equipped crew must be owned');
    assert.ok(Object.values(p.upgrades).every(v=>v>=0&&v<=5));
  }
  const crewSpent=CREW.filter(c=>p.ownedCrew.includes(c.id)).reduce((sum,c)=>sum+c.cost,0);
  const upgradeSpent=UPGRADES.reduce((sum,u)=>{
    for(let level=0;level<p.upgrades[u.id];level++)sum+=upgradeCost(u.id,level);
    return sum;
  },0);
  assert.equal(p.coins,20_000-crewSpent-upgradeSpent,'wallet equals exactly purchased assets');
  // Import deliberately normalizes crew ordering to the catalogue order.
  // Ownership is a set; ordering is not an economic or save-data invariant.
  const restored=importProfileBackup(exportProfileBackup(p,Date.parse('2026-11-19T17:00:00Z')));
  assert.deepEqual(new Set(restored.ownedCrew),new Set(p.ownedCrew));
  assert.deepEqual(restored.upgrades,p.upgrades);
  assert.equal(restored.coins,p.coins);
  assert.equal(restored.equippedCrew,p.equippedCrew);
});

test('backup adversarial mutations reject forged rewards, roster and battle receipts',()=>{
  const at=Date.parse('2026-11-19T11:00:00Z');
  let p=finishBattle(initialProfile(),'victory',4,5,at);
  p=claimMission(p,'first-win');
  const original=JSON.parse(exportProfileBackup(p,at));
  const changes:Array<[string,(file:any)=>void]>=[
    ['negative gold',f=>{f.profile.coins=-1;}],
    ['hits greater than shots',f=>{f.profile.hits=f.profile.shots+1;}],
    ['unowned equipped crew',f=>{f.profile.equippedCrew='navigator';}],
    ['duplicate owned crew',f=>{f.profile.ownedCrew=['captain','captain'];}],
    ['duplicate claimed mission',f=>{f.profile.claimedMissions=['first-win','first-win'];}],
    ['upgrade above level cap',f=>{f.profile.upgrades.hull=6;}],
    ['forged battle payout',f=>{f.profile.battleLog[0].earnedCoins=999;}],
    ['invalid battle timestamp',f=>{f.profile.battleLog[0].completedAt='not-a-date';}],
    ['invalid daily day syntax',f=>{f.profile.lastDailyDay='wrong';}]
  ];
  for(const [name,mutate] of changes){
    const file=structuredClone(original);
    mutate(file);
    assert.throws(()=>importProfileBackup(JSON.stringify(file)),Error,name);
  }
  assert.deepEqual(importProfileBackup(JSON.stringify(original)),p,'failed imports do not mutate original');
});

test('UTC daily rewards survive DST and leap-day transitions without duplicate claims',()=>{
  const starts=[
    ['2026-03-28T23:59:59Z','2026-03-29T00:00:00Z'],
    ['2026-10-24T23:59:59Z','2026-10-25T00:00:00Z'],
    ['2028-02-28T23:59:59Z','2028-02-29T00:00:00Z']
  ];
  for(const [before,after] of starts){
    const t1=Date.parse(before),t2=Date.parse(after);
    let p=claimDaily(initialProfile(),t1);
    assert.equal(p.coins,20);
    assert.equal(canClaimDaily(p,t1+100),false);
    assert.equal(claimDaily(p,t1+100),p);
    p=claimDaily(p,t2);
    assert.equal(p.dailyStreak,2);
    assert.equal(p.coins,45);
    assert.equal(canClaimDaily(p,t1),false,'clock rollback cannot mint rewards');
    assert.equal(claimDaily(p,t2+100),p);
  }
});

test('portrait and touch wiring have source-level regression gates, not fake phone claims',()=>{
  const index=read('../index.html');
  const manifest=JSON.parse(read('../public/manifest.webmanifest'));
  const main=read('../src/main.tsx');
  const scene=read('../src/scene.ts');
  assert.match(index,/viewport-fit=cover/);
  assert.equal(manifest.orientation,'portrait-primary');
  assert.match(main,/onPointerDownCapture=\{onSceneAimDown\}/);
  assert.match(main,/onPointerMoveCapture=\{onSceneAimMove\}/);
  assert.match(main,/onPointerCancelCapture=\{onSceneAimEnd\}/);
  assert.match(main,/if\(!event\.isPrimary\)\{aimPointer\.current=null;return;\}/);
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
  for(const evt of ['pointerdown','pointermove','pointerup','pointercancel']){
    assert.ok(scene.includes("addEventListener('"+evt+"'"),evt+' handler must exist');
    assert.ok(scene.includes("removeEventListener('"+evt+"'"),evt+' cleanup must exist');
  }
});

test('denied purchases and unavailable upgrades leave the same immutable profile and coins',()=>{
  const empty=initialProfile();
  assert.equal(buyCrew(empty,'gunner'),empty,'insufficient funds');
  assert.equal(buyCrew(empty,'navigator'),empty,'insufficient funds');
  assert.equal(buyCrew(empty,'captain'),empty,'starter cannot be bought');
  assert.equal(equipCrew(empty,'navigator'),empty,'unowned crew cannot be equipped');
  assert.equal(improve(empty,'hull'),empty,'upgrade without funds must be rejected');
  let wealthy:LocalProfile={...empty,coins:20_000};
  for(let i=0;i<5;i++)wealthy=improve(wealthy,'hull');
  assert.equal(wealthy.upgrades.hull,5);
  assert.equal(improve(wealthy,'hull'),wealthy,'level cap rejects sixth upgrade');
  const bought=buyCrew(wealthy,'gunner');
  assert.equal(buyCrew(bought,'gunner'),bought,'purchasing owned crew is idempotent');
  assert.equal(equipCrew(bought,'navigator'),bought,'still no unowned crew equip');
  assert.deepEqual(empty,initialProfile(),'rejected mutations never affect starter state');
});
