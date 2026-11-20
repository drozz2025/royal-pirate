/**
 * WORK 5 — independent stress/regression QA for the local WebPreview.
 * Domain tests + React SSR only. These do NOT certify a physical iPhone,
 * real clicks, live multi-tab localStorage, WebGL pixels or deployment.
 * No changes to production components, styles, assets or other workers.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {Battle} from '../src/battle.ts';
import {bearingFromDrag,powerFromClientX} from '../src/battle-touch.ts';
import {
  CREW,UPGRADES,MISSIONS,initialProfile,parseProfile,finishBattle,
  canClaimDaily,nextDailyStreak,claimDaily,missionProgress,claimMission,
  buyCrew,equipCrew,improve,upgradeCost,exportProfileBackup,importProfileBackup,
  type LocalProfile
} from '../src/progression.ts';

const noop=()=>{};
const screens:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','profile',
  'ranking','chests','events','rewards','offers'
];
function panel(id:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen:id,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onSetPlayerName:noop,onExportBackup:noop,
    onImportBackup:noop,backupMessage:''
  }));
}

test('WORK5 seeded 1024-action wallet ledger never mints, loses or duplicates local coins',()=>{
  let seed=0x39af8123;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  const base=Date.parse('2026-11-20T00:00:00.000Z');
  let p:LocalProfile={...initialProfile(),playerName:'Capitão Azul'};
  let expected=0;
  for(let i=0;i<1024;i++){
    const action=random()%9,now=base+i*60_000;
    if(action===0){
      const won=random()%3!==0;
      const shots=1+random()%10,hits=random()%(shots+1);
      p=finishBattle(p,won?'victory':'defeat',hits,shots,now);
      if(won)expected+=35;
    } else if(action===1){
      const claimAt=base+Math.floor(i/11)*86_400_000;
      if(canClaimDaily(p,claimAt))expected+=15+nextDailyStreak(p,claimAt)*5;
      p=claimDaily(p,claimAt);
      const once=p;
      assert.equal(claimDaily(p,claimAt),once,'same-day claim repeated');
    } else if(action===2){
      const mission=MISSIONS[random()%MISSIONS.length];
      if(!p.claimedMissions.includes(mission.id)&&missionProgress(p,mission.id)>=mission.target){
        expected+=mission.reward;
      }
      p=claimMission(p,mission.id);
    } else if(action===3){
      const crew=CREW[1+random()%(CREW.length-1)];
      if(!p.ownedCrew.includes(crew.id)&&p.coins>=crew.cost)expected-=crew.cost;
      p=buyCrew(p,crew.id);
    } else if(action===4){
      const upgrade=UPGRADES[random()%UPGRADES.length];
      const level=p.upgrades[upgrade.id],cost=upgradeCost(upgrade.id,level);
      if(level<5&&p.coins>=cost)expected-=cost;
      p=improve(p,upgrade.id);
    } else if(action===5){
      const crew=p.ownedCrew[random()%p.ownedCrew.length];
      p=equipCrew(p,crew);
    } else if(action===6){
      p=parseProfile(JSON.stringify(p));
    } else if(action===7){
      p=importProfileBackup(exportProfileBackup(p,now));
    } else {
      const unchanged=p;
      p=buyCrew(p,'captain');
      assert.equal(p,unchanged,'starter purchase must be inert');
    }
    assert.equal(p.coins,expected,'wallet mismatch at deterministic action '+i);
    assert.ok(p.coins>=0&&Number.isSafeInteger(p.coins));
    assert.equal(p.playerName,'Capitão Azul');
    assert.ok(p.battleLog.length<=12);
    assert.ok(p.hits<=p.shots);
    assert.ok(p.ownedCrew.includes(p.equippedCrew));
    assert.ok(UPGRADES.every(u=>p.upgrades[u.id]>=0&&p.upgrades[u.id]<=5));
  }
  const restored=importProfileBackup(exportProfileBackup(p,base+1024*60_000));
  assert.equal(restored.coins,expected);
  assert.equal(restored.playerName,'Capitão Azul');
  assert.deepEqual(restored.battleLog,p.battleLog);
});

test('WORK5 3-seed battle stress: duplicate tap suppressed, events finite, HP monotone',()=>{
  for(const seed of [1,1261,78511]){
    const battle=new Battle(seed);
    for(let turn=0;turn<8&&battle.phase==='ready';turn++){
      battle.aim((turn%5-2)*7,60+turn*4);
      const beforeShots=battle.shotsFired;
      assert.equal(battle.fire(),true);
      assert.equal(battle.fire(),false,'rapid second fire must be ignored');
      assert.equal(battle.shotsFired,beforeShots+1);
      const startEvents=battle.drainEvents();
      assert.equal(startEvents.filter(e=>e.type==='fire'&&e.side==='player').length,1);
      let ticks=0,playerBefore=battle.health.player,enemyBefore=battle.health.enemy;
      while(battle.phase!=='ready'&&battle.phase!=='victory'&&battle.phase!=='defeat'&&ticks<600){
        battle.tick(.25);
        for(const e of battle.drainEvents()){
          assert.ok(['fire','hit','splash','result'].includes(e.type));
          assert.ok([e.position.x,e.position.y,e.position.z].every(Number.isFinite));
          if(e.damage!==undefined)assert.ok(e.damage>=0&&Number.isFinite(e.damage));
        }
        assert.ok(battle.health.player<=playerBefore&&battle.health.enemy<=enemyBefore);
        assert.ok(battle.health.player>=0&&battle.health.enemy>=0);
        assert.ok(battle.hits<=battle.shotsFired);
        playerBefore=battle.health.player;enemyBefore=battle.health.enemy;
        ticks++;
      }
      assert.ok(ticks<600,'battle failed to return to ready/terminal state');
    }
    battle.reset();
    assert.equal(battle.phase,'ready');
    assert.equal(battle.shotsFired,0);
    assert.equal(battle.hits,0);
    assert.deepEqual(battle.health,{player:100,enemy:100});
  }
});

test('WORK5 320/375/390/430 px horizontal aim and power are finite, clamped and monotone',()=>{
  for(const width of [320,375,390,430]){
    for(let i=0;i<=width;i+=5){
      const yaw=bearingFromDrag(0,width/2,i,width);
      const nextYaw=bearingFromDrag(0,width/2,i+5,width);
      assert.ok(Number.isInteger(yaw)&&yaw>=-25&&yaw<=25);
      assert.ok(nextYaw>=yaw);
      const power=powerFromClientX(i,0,width);
      const nextPower=powerFromClientX(i+5,0,width);
      assert.ok(Number.isInteger(power)&&power>=20&&power<=100);
      assert.ok(nextPower>=power);
    }
    assert.equal(powerFromClientX(-50,0,width),20);
    assert.equal(powerFromClientX(width+50,0,width),100);
    assert.equal(bearingFromDrag(0,0,width,width),25);
    assert.equal(bearingFromDrag(0,width,0,width),-25);
  }
  assert.equal(powerFromClientX(Infinity,0,390),20);
  assert.equal(bearingFromDrag(NaN,0,200,390),0);
});

test('WORK5 all 8 primary screens: untrusted local player name is escaped in SSR',()=>{
  const playerName='<img src=x>';
  const p=parseProfile(JSON.stringify({...initialProfile(),playerName,coins:140}));
  assert.equal(p.playerName,playerName);
  const port=renderToStaticMarkup(React.createElement(Harbour,{
    profile:p,onBattle:noop,onNavigate:noop
  }));
  assert.match(port,/&lt;img src=x&gt;/);
  assert.doesNotMatch(port,/<img src=x>/);
  assert.match(port,/aria-label="140 locally earned coins"/);
  for(const id of screens){
    const html=panel(id,p);
    assert.match(html,/role="dialog" aria-modal="true"/,id);
    assert.match(html,/aria-label="Main game screens"/,id);
    assert.match(html,/aria-label="140 moedas de ouro ganhas localmente"/,id);
    assert.doesNotMatch(html,/<img src=x>/,id);
  }
});

// These are deliberately NOT passing assertions: they require product changes
// or genuine browser/device evidence and must remain visible as open work.
test.todo('WORK5 #54: reject impossible/future UTC daily claim dates on restore');
test.todo('WORK5 #152/#153: two real browser tabs cannot overwrite newer name/coins');
test.todo('WORK5 #90/#527: real UI enforces 10-second/10-shot limits and every battle link acts');
test.todo('WORK5 mobile: physical iPhone pinch/touch, safe-area and no-scroll visual sign-off');
