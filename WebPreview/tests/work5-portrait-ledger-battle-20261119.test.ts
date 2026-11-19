/**
 * WORK 5 — autonomous QA only. All checks run in Node/SSR and inspect the
 * checked-out production sources; they do NOT claim physical iPhone, real
 * touch/pinch, live network, or pixel-perfect Porto validation.
 * No changes to UI, game logic, ship art, Unity or deployment.
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
  BACKUP_FORMAT, buyCrew, claimDaily, claimMission, equipCrew, exportProfileBackup,
  finishBattle, importProfileBackup, improve, initialProfile, type LocalProfile
} from '../src/progression.ts';

const read=(relative:string)=>readFileSync(new URL(relative,import.meta.url),'utf8');
const noop=()=>{};
const allScreens:AppScreenId[]=['battle','fleet','forge','cards','shop','missions','profile','ranking','chests','events','rewards','offers'];
const render=(screen:AppScreenId,profile:LocalProfile=initialProfile())=>
  renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));

test('all 8 principal screens + 5 secondary views render usable controls and local wallet',()=>{
  const harbour=renderToStaticMarkup(React.createElement(Harbour,{
    profile:initialProfile(),onBattle:noop,onNavigate:noop
  }));
  assert.match(harbour,/aria-label="Royal Pirate Porto"/);
  assert.match(harbour,/class="harbour-battle-button/);
  for(const id of allScreens){
    const html=render(id);
    assert.match(html,/role="dialog" aria-modal="true"/,id);
    assert.match(html,/aria-label="Back to harbour/,id);
    assert.match(html,/aria-label="Main game screens"/,id);
    assert.match(html,/aria-label="Recursos do capitão"/,id);
    assert.ok((html.match(/<button\b/g)||[]).length>=2,id+' has no action controls');
  }
  // Rendering tests cannot establish whether a simulated click reaches a real browser event.
});

test('battle: deterministic seeded matches settle and never accept double fire',()=>{
  for(let seed=1;seed<=8;seed++){
    for(const miss of [false,true]){
      const battle=new Battle(seed);
      let playerFires=0;
      for(let turn=0;turn<20&&!['victory','defeat'].includes(battle.phase);turn++){
        assert.equal(battle.phase,'ready');
        battle.aim(miss?25:0,miss?20:65);
        assert.equal(battle.fire(),true);
        assert.equal(battle.fire(),false,'double fire must be rejected');
        playerFires++;
        let settled=false;
        for(let tick=0;tick<1400;tick++){
          battle.tick(1/60);
          battle.drainEvents();
          if(['ready','victory','defeat'].includes(battle.phase)){settled=true;break;}
        }
        assert.ok(settled,'turn must never deadlock after throttled frame ticks');
        assert.ok(battle.health.player>=0&&battle.health.player<=100);
        assert.ok(battle.health.enemy>=0&&battle.health.enemy<=100);
      }
      assert.equal(battle.phase,miss?'defeat':'victory');
      assert.equal(battle.shotsFired,playerFires);
      assert.equal(battle.fire(),false,'terminal match cannot fire');
      battle.reset();
      assert.equal(battle.phase,'ready');
      assert.deepEqual(battle.health,{player:100,enemy:100});
      assert.equal(battle.shotsFired,0);
    }
  }
});

test('UTC daily rewards, missions and purchases cannot be claimed twice',()=>{
  const d1=Date.parse('2026-11-18T23:59:59.000Z');
  const d2=Date.parse('2026-11-19T00:00:00.000Z');
  let p=initialProfile();
  p=finishBattle(p,'victory',4,5,d1-3000);
  p=finishBattle(p,'defeat',0,5,d1-2000);
  p=finishBattle(p,'victory',4,5,d1-1000);
  assert.equal(p.coins,70);
  for(const id of ['first-win','five-hits','three-battles'] as const){
    p=claimMission(p,id);
    assert.equal(claimMission(p,id),p,id+' must be one-time');
  }
  assert.equal(p.coins,170);
  p=claimDaily(p,d1);
  assert.equal(p.coins,190);
  assert.equal(claimDaily(p,d1),p,'same UTC day cannot be farmed');
  p=claimDaily(p,d2);
  assert.equal(p.coins,215);
  assert.equal(p.dailyStreak,2);
  assert.equal(claimDaily(p,d2+12*3600000),p);
  p=claimDaily(p,d2+3*86400000);
  assert.equal(p.coins,235);
  assert.equal(p.dailyStreak,1,'broken streak must reset');
  p=buyCrew(p,'gunner');
  p=buyCrew(p,'navigator');
  assert.equal(p.coins,85);
  assert.equal(buyCrew(p,'gunner'),p,'owned crew must not be repurchased');
  p=equipCrew(p,'navigator');
  assert.equal(p.equippedCrew,'navigator');
  p=improve(p,'hull');
  assert.equal(p.coins,40);
  assert.equal(improve(p,'cannons'),p,'insufficient wallet must not go negative');
});

test('40 battle receipts survive backup, keeping only latest 12 while lifetime totals persist',()=>{
  const base=Date.parse('2026-11-19T09:00:00.000Z');
  let p=initialProfile(),credits=0,wins=0,losses=0,hits=0,shots=0;
  for(let i=0;i<40;i++){
    const victory=i%4!==0,landed=victory?3:0;
    p=finishBattle(p,victory?'victory':'defeat',landed,5,base+i*1000);
    if(victory){credits+=35;wins++;}else losses++;
    hits+=landed;shots+=5;
    if(i%8===0){
      const restored=importProfileBackup(exportProfileBackup(p,base+i*1000));
      assert.deepEqual(restored,p,'intermediate save round-trip '+i);
    }
  }
  assert.equal(p.coins,credits);
  assert.deepEqual([p.wins,p.losses,p.hits,p.shots],[wins,losses,hits,shots]);
  assert.equal(p.battleLog.length,12);
  assert.equal(p.battleLog[0].completedAt,new Date(base+39*1000).toISOString());
  assert.equal(p.battleLog[11].completedAt,new Date(base+28*1000).toISOString());
  assert.equal(JSON.parse(exportProfileBackup(p,base+40*1000)).format,BACKUP_FORMAT);
});

test('restoration refuses forged winnings, impossible hit counts and duplicate mission claims',()=>{
  const timestamp=Date.parse('2026-11-19T11:00:00Z');
  const p=finishBattle(initialProfile(),'victory',4,5,timestamp);
  const raw=exportProfileBackup(p,timestamp);
  const edited=(mutate:(value:any)=>void)=>{
    const value=JSON.parse(raw);mutate(value);return JSON.stringify(value);
  };
  assert.throws(()=>importProfileBackup(edited(v=>{v.profile.battleLog[0].earnedCoins=9999;})),/battle history/);
  assert.throws(()=>importProfileBackup(edited(v=>{v.profile.battleLog[0].hits=9;})),/battle history/);
  assert.throws(()=>importProfileBackup(edited(v=>{v.profile.claimedMissions=['first-win','first-win'];})),/mission history/);
  assert.throws(()=>importProfileBackup(edited(v=>{v.profile.ownedCrew=['captain','captain'];})),/owned crew/);
  assert.throws(()=>importProfileBackup(edited(v=>{v.profile.upgrades.hull=6;})),/upgrade/);
  assert.throws(()=>importProfileBackup(' '.repeat(65537)),/64 KB/);
});

test('portrait, 3D ship touch setup/cleanup and release cache metadata remain wired',()=>{
  const index=read('../index.html');
  const manifest=JSON.parse(read('../public/manifest.webmanifest'));
  const harbourCss=read('../src/harbour.css');
  const panelsCss=read('../src/app-screens.css');
  const scene=read('../src/scene.ts');
  const sw=read('../public/sw.js');
  const version=JSON.parse(read('../package.json')).version as string;
  assert.match(index,/viewport-fit=cover/);
  assert.equal(manifest.orientation,'portrait-primary');
  assert.match(harbourCss,/safe-area-inset-bottom/);
  assert.match(panelsCss,/overflow-y:auto/);
  assert.match(panelsCss,/focus-visible/);
  for(const event of ['pointerdown','pointermove','pointerup','pointercancel']){
    assert.ok(scene.includes("addEventListener('"+event+"'"),event+' registered');
    assert.ok(scene.includes("removeEventListener('"+event+"'"),event+' cleaned up');
  }
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
  assert.match(scene,/this\.shipPointers\.add\(event\.pointerId\)/);
  assert.match(scene,/this\.shipPointers\.delete\(event\.pointerId\)/);
  assert.ok(index.includes('v'+version),'displayed version must match package');
  assert.ok(sw.includes('royal-pirate-web-v'+version),'cache revision must match package');
  assert.match(sw,/request\.mode==='navigate'/);
  // These are static integration checks, not proof of pinch gestures or viewport screenshots.
});
