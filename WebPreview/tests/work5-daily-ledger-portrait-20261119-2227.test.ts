/**
 * WORK 5 QA — independent regression contracts only.
 * Node SSR and pure-model checks; NOT a claim of physical iPhone, live touch,
 * browser reload, real HTTP publication or 1:1 visual approval.
 * Owner: WORK 5. No production, design, deployment or Unity changes.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {Battle} from '../src/battle.ts';
import {bearingFromDrag,powerFromClientX} from '../src/battle-touch.ts';
import {CREW,MISSIONS,initialProfile,parseProfile,finishBattle,claimDaily,claimMission,
  buyCrew,improve,exportProfileBackup,importProfileBackup,type LocalProfile,
  type CrewId,type UpgradeId} from '../src/progression.ts';

const read=(relative:string)=>readFileSync(new URL(relative,import.meta.url),'utf8');
const noop=()=>{};
const screens:AppScreenId[]=['battle','fleet','forge','cards','shop','missions','profile',
  'ranking','chests','events','rewards','offers'];
const panel=(screen:AppScreenId,profile:LocalProfile)=>renderToStaticMarkup(
  React.createElement(AppScreens,{screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''})
);

test('WORK5 deterministic 256-operation local wallet ledger never silently loses coins',()=>{
  let s={...initialProfile(),playerName:'Capitão Maré'};
  let expected=0,seed=49721;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const base=Date.parse('2026-11-01T12:00:00.000Z');
  const upgrades:UpgradeId[]=['hull','cannons','sails'];
  for(let i=0;i<256;i++){
    const r=next(),action=r%5;
    if(action===0){
      const outcome=(r&8)?'victory':'defeat';
      s=finishBattle(s,outcome,3,5,base+i*1000);
      expected+=outcome==='victory'?35:0;
    }else if(action===1){
      const date=base+Math.floor(i/3)*86400000;
      const today=new Date(date).toISOString().slice(0,10);
      if(!s.lastDailyDay||today>s.lastDailyDay){
        const yesterday=new Date(date-86400000).toISOString().slice(0,10);
        const streak=s.lastDailyDay===yesterday?Math.min(7,s.dailyStreak+1):1;
        expected+=15+streak*5;
      }
      s=claimDaily(s,date);
    }else if(action===2){
      const mission=MISSIONS[(r>>>4)%MISSIONS.length];
      const progress=mission.measure==='wins'?s.wins:
        mission.measure==='hits'?s.hits:s.wins+s.losses;
      if(progress>=mission.target&&!s.claimedMissions.includes(mission.id))expected+=mission.reward;
      s=claimMission(s,mission.id);
    }else if(action===3){
      const id:CrewId=(r&16)?'gunner':'navigator';
      const crew=CREW.find(c=>c.id===id)!;
      if(!s.ownedCrew.includes(id)&&expected>=crew.cost)expected-=crew.cost;
      s=buyCrew(s,id);
    }else{
      const idx=(r>>>4)%upgrades.length,id=upgrades[idx],level=s.upgrades[id];
      const independentlyCalculatedCost=45+idx*15+level*35;
      if(level<5&&expected>=independentlyCalculatedCost)expected-=independentlyCalculatedCost;
      s=improve(s,id);
    }
    assert.equal(s.coins,expected,'wallet ledger mismatch at action '+i);
    assert.ok(Number.isSafeInteger(s.coins)&&s.coins>=0);
    const loaded=parseProfile(JSON.stringify(s));
    assert.equal(loaded.coins,expected,'reload wallet mismatch at action '+i);
    assert.equal(loaded.playerName,'Capitão Maré','reload name mismatch at action '+i);
    assert.equal(loaded.wins,s.wins);
    assert.equal(loaded.losses,s.losses);
    assert.deepEqual(loaded.upgrades,s.upgrades);
    s=loaded;
  }
});

test('WORK5 12 local page renders retain real wallet and editable captain identity',()=>{
  const profile={...initialProfile(),coins:140,playerName:'Maré Dourada'};
  const unique=new Set<string>();
  for(const screen of screens){
    assert.ok(!unique.has(screen),'duplicate route '+screen);
    unique.add(screen);
    const html=panel(screen,profile);
    assert.match(html,/role="dialog" aria-modal="true"/,screen);
    assert.match(html,/aria-label="140 moedas de ouro ganhas localmente"/,screen);
    assert.match(html,/aria-label="Back to harbour/,screen);
    assert.match(html,/aria-label="Main game screens"/,screen);
    assert.doesNotMatch(html,/href="#"/,screen+' has dead fragment link');
  }
  const captain=panel('profile',profile);
  assert.match(captain,/Maré Dourada/);
  assert.match(captain,/id="app-player-name"/);
  assert.match(captain,/maxLength="20"/);
  assert.match(captain,/SAVE BACKUP/);
  assert.match(captain,/RESTORE BACKUP/);
});

test('WORK5 UTC rollover, DST boundary and streak cap do not duplicate daily credits',()=>{
  const first=Date.parse('2026-03-29T23:59:59.999Z');
  let p=initialProfile(),total=0;
  for(let day=0;day<10;day++){
    const when=first+day*86400000;
    const reward=15+5*Math.min(7,day+1);
    const before=p;
    p=claimDaily(p,when);total+=reward;
    assert.equal(p.coins,total,'wrong daily amount on UTC day '+day);
    assert.equal(p.dailyStreak,Math.min(7,day+1));
    assert.equal(claimDaily(p,when),p,'repeated reward on same instant');
    assert.equal(claimDaily(p,when-1),p,'repeated reward one millisecond earlier');
    if(day>0)assert.notEqual(p.lastDailyDay,before.lastDailyDay);
  }
  const gap=first+13*86400000;
  p=claimDaily(p,gap);total+=20;
  assert.equal(p.coins,total);
  assert.equal(p.dailyStreak,1,'broken streak must restart');
});

test('WORK5 four portrait widths preserve bounded monotone gesture mapping',()=>{
  for(const width of [320,375,390,430]){
    assert.equal(bearingFromDrag(0,width/2,width/2,width),0);
    assert.equal(bearingFromDrag(0,width/2,-10000,width),-25);
    assert.equal(bearingFromDrag(0,width/2,10000,width),25);
    assert.equal(powerFromClientX(-1000,10,width),20);
    assert.equal(powerFromClientX(10000,10,width),100);
    let yaw=-Infinity,power=-Infinity;
    for(let x=0;x<=width;x+=5){
      const y=bearingFromDrag(0,width/2,x,width);
      const p=powerFromClientX(x+10,10,width);
      assert.ok(y>=yaw&&y>=-25&&y<=25,'non-monotone yaw at width '+width);
      assert.ok(p>=power&&p>=20&&p<=100,'non-monotone power at width '+width);
      yaw=y;power=p;
    }
  }
  const scene=read('../src/scene.ts');
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
  assert.match(scene,/this\.shipPointers\.add\(event\.pointerId\)/);
  assert.match(scene,/this\.shipPointers\.delete\(event\.pointerId\)/);
});

test('WORK5 real battle model emits one terminal result, rejects ghost shots after victory and resets',()=>{
  for(const seed of [1,1261,9012,65535]){
    const b=new Battle(seed);
    let resultEvents=0,steps=0;
    while(b.phase!=='victory'&&b.phase!=='defeat'&&steps<12000){
      if(b.phase==='ready'){
        b.aim(0,65);
        assert.equal(b.fire(),true);
        assert.equal(b.fire(),false,'double cannon shot');
      }
      b.tick(1/30);
      resultEvents+=b.drainEvents().filter(e=>e.type==='result').length;
      steps++;
    }
    assert.equal(b.phase,'victory','accurate seeded battle did not finish: '+seed);
    assert.equal(b.shotsFired,4);
    assert.equal(resultEvents,1);
    assert.equal(b.fire(),false,'post-result shot');
    for(let i=0;i<20;i++)b.tick(.1);
    assert.equal(b.drainEvents().filter(e=>e.type==='result').length,0,'duplicate result');
    b.reset();assert.equal(b.phase,'ready');assert.equal(b.shotsFired,0);
  }
});

test('WORK5 save/restore retains lifetime counters beyond truncated 12-row battle history',()=>{
  let p={...initialProfile(),playerName:'Capitã do Norte'};
  const base=Date.parse('2026-11-19T09:00:00.000Z');
  for(let i=0;i<28;i++)p=finishBattle(p,i%2===0?'victory':'defeat',4,5,base+i*1000);
  assert.equal(p.battleLog.length,12);
  assert.equal(p.wins,14);assert.equal(p.losses,14);
  assert.equal(p.coins,490);
  const raw=exportProfileBackup(p,base+3600000);
  const recovered=importProfileBackup(raw);
  assert.equal(recovered.coins,490);
  assert.equal(recovered.playerName,'Capitã do Norte');
  assert.equal(recovered.wins+recovered.losses,28);
  assert.equal(recovered.hits,112);
  assert.equal(recovered.shots,140);
  assert.deepEqual(recovered.battleLog,p.battleLog);
  assert.equal(parseProfile(JSON.stringify(recovered)).coins,490);
});

// These are deliberately unapproved until a REAL browser or product fix proves them.
test.todo('WORK5 #54: invalid/future lastDailyDay cannot permanently lock rewards after restore');
test.todo('WORK5 #152/#153: interactive browser reload/PWA update preserves renamed captain and 140 coins');
test.todo('WORK5 #527/#90: Battle brand has useful destination; ten-second turns, ten shots and abandon apply');
