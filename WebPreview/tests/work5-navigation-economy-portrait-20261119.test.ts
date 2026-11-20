/**
 * WORK 5 — independent, dependency-free QA contracts.
 * SSR proves that the controls and screen content render; it does NOT simulate
 * physical iPhone touch, real WebGL input, a live backend, or visual fidelity.
 * No production component, style, Unity file or deployment workflow is changed.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {BACKUP_FORMAT, claimDaily, claimMission, buyCrew, equipCrew, exportProfileBackup,
  finishBattle, importProfileBackup, improve, initialProfile, type LocalProfile} from '../src/progression.ts';

const read=(relative:string)=>readFileSync(new URL(relative,import.meta.url),'utf8');
const noop=()=>{};
const core:AppScreenId[]=['battle','fleet','forge','cards','shop','missions','profile'];
const secondary:AppScreenId[]=['ranking','chests','events','rewards','offers'];
function panel(screen:AppScreenId,profile:LocalProfile=initialProfile()):string{
 return renderToStaticMarkup(React.createElement(AppScreens,{
  screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
  onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
  onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
 }));
}
function port(profile:LocalProfile=initialProfile()):string{
 return renderToStaticMarkup(React.createElement(Harbour,{
  profile,onBattle:noop,onNavigate:noop
 }));
}

test('eight principal destinations remain reachable through real Porto and dock controls',()=>{
 const html=port();
 assert.match(html,/aria-label="Royal Pirate Porto"/);
 assert.equal((html.match(/class="harbour-nav-item/g)||[]).length,5);
 assert.equal((html.match(/class="harbour-flank-button/g)||[]).length,6);
 assert.equal((html.match(/class="harbour-battle-button/g)||[]).length,1);
 for(const screen of core){
  const page=panel(screen);
  assert.match(page,/role="dialog" aria-modal="true"/,screen);
  assert.match(page,/aria-labelledby="app-screen-title"/,screen);
  assert.match(page,/aria-label="Back to harbour/,screen);
  assert.match(page,/aria-label="Main game screens"/,screen);
  assert.equal((page.match(/class="harbour-nav-item/g)||[]).length,5,screen);
  assert.match(page,/aria-label="Recursos do capitão"/,screen);
 }
});

test('secondary destinations are labelled local views, not fake multiplayer or checkout routes',()=>{
 for(const screen of secondary){
  const html=panel(screen);
  assert.match(html,/role="dialog"/,screen);
  assert.match(html,/aria-label="Main game screens"/,screen);
  assert.match(html,/aria-label="Recursos do capitão"/,screen);
 }
 const source=read('../src/app-screens.tsx');
 for(const id of [...core,...secondary]) assert.ok(source.includes("id:'"+id+"'"),'route missing: '+id);
 assert.match(source,/onClick=\{onClose\}/);
 assert.match(source,/onClick=\{\(\)=>onNavigate\(p\.id\)\}/);
 assert.match(source,/onClick=\{onBattle\}/);
 assert.match(source,/onClick=\{onExportBackup\}/);
 assert.match(source,/onClick=\{onImportBackup\}/);
 // Static source contracts: an actual click still requires browser QA.
 const harbour=read('../src/harbour.tsx');
 assert.match(harbour,/onClick=\{\(\)=>onAction\(item\.screen\)\}/);
 assert.match(harbour,/onClick=\{onBattle\}/);
});

test('earn, claim, purchase, equip, upgrade and restore: wallet remains identical across pages',()=>{
 const clock=Date.parse('2026-11-19T08:15:00Z');
 let profile=initialProfile();
 for(let i=0;i<3;i++)profile=finishBattle(profile,'victory',4,5,clock+i*1000);
 assert.equal(profile.coins,105);
 for(const id of ['first-win','five-hits','three-battles'] as const) profile=claimMission(profile,id);
 assert.equal(profile.coins,205);
 profile=claimDaily(profile,clock);
 assert.equal(profile.coins,225);
 const oneClaim=profile;
 assert.equal(claimDaily(profile,clock+1000),oneClaim,'no same-day daily farming');
 profile=buyCrew(profile,'gunner');
 profile=buyCrew(profile,'navigator');
 assert.equal(profile.coins,75);
 profile=equipCrew(profile,'navigator');
 profile=improve(profile,'hull');
 assert.equal(profile.coins,30);
 assert.equal(profile.equippedCrew,'navigator');
 assert.equal(profile.upgrades.hull,1);
 assert.equal(buyCrew(profile,'gunner'),profile,'no duplicate crew purchase');
 const backup=exportProfileBackup(profile,clock);
 assert.equal(JSON.parse(backup).format,BACKUP_FORMAT);
 const restored=importProfileBackup(backup);
 assert.deepEqual(restored,profile);
 assert.equal(restored.battleLog.length,3);
 assert.match(port(restored),/aria-label="30 locally earned coins"/);
 for(const screen of core){
  assert.match(panel(screen,restored),/aria-label="30 moedas de ouro ganhas localmente"/,screen);
 }
});

test('restoring edited battle receipts cannot mint free winnings or exceed backup limits',()=>{
 const clock=Date.parse('2026-11-19T08:15:00Z');
 const profile=finishBattle(initialProfile(),'victory',4,5,clock);
 const seed=JSON.parse(exportProfileBackup(profile,clock));
 seed.profile.battleLog[0].earnedCoins=900000;
 assert.throws(()=>importProfileBackup(JSON.stringify(seed)),/battle history/);
 seed.profile.battleLog[0].earnedCoins=35;
 seed.profile.battleLog[0].hits=6;
 assert.throws(()=>importProfileBackup(JSON.stringify(seed)),/battle history/);
 seed.profile.battleLog[0].hits=4;
 seed.profile.claimedMissions=['first-win','first-win'];
 assert.throws(()=>importProfileBackup(JSON.stringify(seed)),/mission history/);
 assert.throws(()=>importProfileBackup(' '.repeat(65537)),/64 KB/);
});

test('portrait viewport, safe areas, keyboard focus and real-ship multitouch remain wired',()=>{
 const index=read('../index.html');
 const manifest=JSON.parse(read('../public/manifest.webmanifest'));
 const portCss=read('../src/harbour.css');
 const panelsCss=read('../src/app-screens.css');
 const scene=read('../src/scene.ts');
 assert.match(index,/width=device-width,initial-scale=1,viewport-fit=cover/);
 assert.equal(manifest.orientation,'portrait-primary');
 assert.match(portCss,/safe-area-inset-top/);
 assert.match(portCss,/safe-area-inset-bottom/);
 assert.match(panelsCss,/overflow-y:auto/);
 assert.match(portCss,/focus-visible/);
 assert.match(panelsCss,/focus-visible/);
 assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
 assert.match(scene,/this\.shipPointers\.add\(event\.pointerId\)/);
 assert.match(scene,/this\.shipPointers\.delete\(event\.pointerId\)/);
 assert.match(scene,/this\.controls\.enableRotate=true;this\.controls\.enableZoom=true/);
 assert.match(scene,/this\.controls\.enableRotate=false;this\.controls\.enableZoom=false/);
 for(const eventName of ['pointerdown','pointermove','pointerup','pointercancel']){
  assert.ok(scene.includes("addEventListener('"+eventName+"'"),eventName+' registration missing');
  assert.ok(scene.includes("removeEventListener('"+eventName+"'"),eventName+' cleanup missing');
 }
 // This is a source-level regression gate, not a claim of actual pinch testing.
});

test('release metadata and offline cache use a single matching version',()=>{
 const version=JSON.parse(read('../package.json')).version as string;
 const html=read('../index.html');
 const sw=read('../public/sw.js');
 assert.match(version,/^0\.1\.\d+$/);
 assert.ok(html.includes('v'+version));
 assert.ok(sw.includes('royal-pirate-web-v'+version));
 assert.match(sw,/request\.mode==='navigate'/);
 assert.match(sw,/await caches\.delete\(name\)/);
});
