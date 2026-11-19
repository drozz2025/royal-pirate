/**
 * WORK 5 independent QA: deterministic, runtime assertions on local progression,
 * backup acceptance and visible route shells. No production or visual files touched.
 * SSR/source contracts are NOT a physical mobile test or proof that buttons respond
 * to taps: those require browser automation and actual device QA separately.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Battle} from '../src/battle.ts';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {
  BACKUP_FORMAT, CREW, MISSIONS, UPGRADES,
  buyCrew, claimDaily, claimMission, equipCrew, exportProfileBackup,
  finishBattle, importProfileBackup, improve, initialProfile, parseProfile,
  upgradeCost, type LocalProfile
} from '../src/progression.ts';

const no=()=>{};
const t0=Date.parse('2026-11-19T08:00:00.000Z');
const DAY=86_400_000;
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const routes:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','profile',
  'ranking','chests','events','rewards','offers'
];
function page(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:no,onClose:no,onBattle:no,
    onBuyCrew:no,onEquipCrew:no,onUpgrade:no,onMission:no,onDaily:no,
    onExportBackup:no,onImportBackup:no,onSetPlayerName:no,backupMessage:''
  }));
}
function invariants(p:LocalProfile,expectedCoins:number,context:string){
  assert.equal(p.coins,expectedCoins,context+' wallet mismatch');
  assert.ok(Number.isSafeInteger(p.coins)&&p.coins>=0,context+' negative coins');
  assert.ok(p.hits<=p.shots,context+' impossible hit ratio');
  assert.ok(p.battleLog.length<=12,context+' excessive receipts');
  assert.ok(p.battleLog.length<=p.wins+p.losses,context+' phantom receipts');
  assert.ok(new Set(p.ownedCrew).size===p.ownedCrew.length,context+' repeated crew');
  assert.ok(p.ownedCrew.includes(p.equippedCrew),context+' unowned equipped crew');
  assert.ok(new Set(p.claimedMissions).size===p.claimedMissions.length,context+' duplicate mission');
  assert.ok(Object.values(p.upgrades).every(level=>Number.isInteger(level)&&level>=0&&level<=5),context+' invalid upgrade');
}

test('24 deterministic captains survive 2,400 mixed battles, purchases, rewards and upgrades without wallet drift',()=>{
  for(let seed=1;seed<=24;seed++){
    let p=initialProfile();
    let wallet=0;
    let random=seed*17011;
    for(let step=0;step<100;step++){
      random=(Math.imul(random,1664525)+1013904223)>>>0;
      const action=random%9;
      const at=t0+Math.floor(step/10)*DAY;
      if(action===0||action===1){
        const victory=action===0;
        p=finishBattle(p,victory?'victory':'defeat',victory?4:1,6,at);
        if(victory)wallet+=35;
      }else if(action===2){
        const mission=MISSIONS[(random>>>8)%MISSIONS.length];
        const next=claimMission(p,mission.id);
        if(next!==p)wallet+=mission.reward;
        p=next;
        assert.equal(claimMission(p,mission.id),p,'mission can only be collected once');
      }else if(action===3){
        const next=claimDaily(p,at);
        if(next!==p)wallet+=15+5*next.dailyStreak;
        p=next;
        assert.equal(claimDaily(p,at),p,'daily can only be collected once per UTC day');
      }else if(action===4){
        const crew=CREW[1+((random>>>11)%(CREW.length-1))];
        const next=buyCrew(p,crew.id);
        if(next!==p)wallet-=crew.cost;
        p=next;
        assert.equal(buyCrew(p,crew.id),p,'purchase can only happen once');
      }else if(action===5){
        const crew=CREW[(random>>>11)%CREW.length];
        p=equipCrew(p,crew.id);
      }else if(action===6){
        const upgrade=UPGRADES[(random>>>11)%UPGRADES.length];
        const cost=upgradeCost(upgrade.id,p.upgrades[upgrade.id]);
        const next=improve(p,upgrade.id);
        if(next!==p)wallet-=cost;
        p=next;
      }else if(action===7){
        const restored=importProfileBackup(exportProfileBackup(p,at));
        assert.deepEqual(restored,parseProfile(JSON.stringify(p)),
          'export/import must preserve canonical local state');
        p=restored;
      }else{
        const same=claimDaily(p,at-DAY);
        if(same!==p){
          // Yesterday may be a valid claim only when no later day was claimed.
          wallet+=15+5*same.dailyStreak;
          p=same;
        }
      }
      invariants(p,wallet,'seed '+seed+' step '+step);
    }
  }
});

test('backup import rejects six tampering classes without replacing the original profile',()=>{
  const profile=finishBattle(initialProfile(),'victory',4,5,t0);
  const raw=exportProfileBackup(profile,t0);
  assert.equal(JSON.parse(raw).format,BACKUP_FORMAT);
  const edits:Array<(p:any)=>void>=[
    p=>{p.coins=-1;},
    p=>{p.shots=0;},
    p=>{p.ownedCrew=['captain','captain'];},
    p=>{p.equippedCrew='navigator';},
    p=>{p.claimedMissions=['first-win','first-win'];},
    p=>{p.upgrades.hull=6;},
    p=>{p.battleLog[0].earnedCoins=99;}
  ];
  for(const [i,edit] of edits.entries()){
    const modified=JSON.parse(raw);
    edit(modified.profile);
    assert.throws(()=>importProfileBackup(JSON.stringify(modified)),
      'tampered backup #'+i+' was accepted');
  }
  assert.deepEqual(importProfileBackup(raw),profile,
    'rejected inputs must not mutate the original valid save');
});

test('the Porto and all twelve screen shells render named destinations and working route contracts',()=>{
  const profile=finishBattle(initialProfile(),'victory',4,5,t0);
  const harbour=renderToStaticMarkup(React.createElement(Harbour,{
    profile,onBattle:no,onNavigate:no
  }));
  assert.match(harbour,/aria-label="Royal Pirate Porto"/);
  assert.match(harbour,/aria-label="Batalha: iniciar combate naval jogável"/);
  assert.equal((harbour.match(/class="harbour-nav-item/g)||[]).length,5);
  assert.equal((harbour.match(/class="harbour-flank-button/g)||[]).length,6);
  for(const id of routes){
    const html=page(id,profile);
    assert.match(html,/role="dialog" aria-modal="true"/,id);
    assert.equal((html.match(/id="app-screen-title"/g)||[]).length,1,id+' unique title');
    assert.match(html,/aria-labelledby="app-screen-title"/,id);
    assert.match(html,/aria-label="Main game screens"/,id);
    assert.match(html,/aria-label="Back to harbour/,id);
    assert.match(html,/aria-label="35 moedas de ouro ganhas localmente"/,id);
    assert.doesNotMatch(html,/<a\b[^>]*href=["'](?:#|javascript:)/i,
      id+' contains a placeholder navigation link');
  }
  const main=read('../src/main.tsx');
  assert.match(main,/onNavigate=\{navigateTo\}/);
  assert.match(main,/onBattle=\{enterBattle\}/);
  assert.match(main,/onClose=\{\(\)=>setAppScreen\(null\)\}/);
  assert.match(main,/onImportBackup=\{\(\)=>backupFile\.current\?\.click\(\)\}/);
});

test('battle terminal state blocks extra shots and its single receipt restores coherently',()=>{
  for(const seed of [1,9,27,64]){
    const game=new Battle(seed);
    for(let turn=0;turn<16&&game.phase!=='victory'&&game.phase!=='defeat';turn++){
      assert.equal(game.phase,'ready','player should regain control before next round');
      game.aim(0,65);
      assert.equal(game.fire(),true);
      for(let tick=0;tick<2400&&game.phase!=='ready'&&game.phase!=='victory'&&game.phase!=='defeat';tick++){
        game.tick(1/60);
        game.drainEvents();
      }
      assert.ok(game.phase==='ready'||game.phase==='victory'||game.phase==='defeat',
        'battle must settle without hanging');
    }
    assert.equal(game.phase,'victory');
    assert.equal(game.fire(),false,'terminal state must not accept a second shot');
    const profile=finishBattle(initialProfile(),'victory',game.hits,game.shotsFired,t0);
    assert.equal(profile.wins,1);
    assert.equal(profile.coins,35);
    assert.equal(profile.xp,50);
    assert.equal(profile.battleLog.length,1);
    assert.equal(profile.battleLog[0].shots,game.shotsFired);
    assert.equal(profile.battleLog[0].hits,game.hits);
    assert.deepEqual(importProfileBackup(exportProfileBackup(profile,t0)),profile);
  }
});

test('portrait and direct ship-touch lifecycle have explicit static regression guards',()=>{
  const index=read('../index.html');
  const harbourCss=read('../src/harbour.css');
  const panelsCss=read('../src/app-screens.css');
  const scene=read('../src/scene.ts');
  assert.match(index,/viewport-fit=cover/);
  assert.match(harbourCss,/safe-area-inset-top/);
  assert.match(harbourCss,/safe-area-inset-bottom/);
  assert.match(panelsCss,/overscroll-behavior:contain/);
  assert.match(panelsCss,/focus-visible/);
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
  assert.match(scene,/this\.shipPointers\.add\(event\.pointerId\)/);
  assert.match(scene,/this\.shipPointers\.delete\(event\.pointerId\)/);
  for(const event of ['pointerdown','pointermove','pointerup','pointercancel']){
    assert.ok(scene.includes("addEventListener('"+event+"'"),event+' listener missing');
    assert.ok(scene.includes("removeEventListener('"+event+"'"),event+' cleanup missing');
  }
  // A static contract cannot establish the visible 390x844 layout, real
  // pinch behaviour, or accessibility on an iPhone. Those remain live QA.
});
