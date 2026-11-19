/**
 * WORK 5: regression contracts for the existing WebPreview.
 * React SSR + deterministic Node simulation ONLY. Not proof of live taps,
 * Chromium layout, WebGL pinch, physical iPhone, or deployed website.
 * Production components/styles, other worker code, Unity and workflows untouched.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {Battle} from '../src/battle.ts';
import {
 initialProfile,finishBattle,buyCrew,equipCrew,improve,claimMission,claimDaily,
 canClaimDaily,exportProfileBackup,importProfileBackup,missionProgress,
 CREW,UPGRADES,upgradeCost,type LocalProfile
} from '../src/progression.ts';

const read=(name:string)=>readFileSync(new URL(name,import.meta.url),'utf8');
const noop=()=>{};
const destinations:AppScreenId[]=[
 'battle','fleet','forge','cards','shop','missions','profile',
 'ranking','chests','events','rewards','offers'
];
function screen(id:AppScreenId,p:LocalProfile=initialProfile()){
 return renderToStaticMarkup(React.createElement(AppScreens,{
  screen:id,profile:p,onNavigate:noop,onClose:noop,onBattle:noop,
  onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
  onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
 }));
}
function harbour(p:LocalProfile=initialProfile()){
 return renderToStaticMarkup(React.createElement(Harbour,{profile:p,onBattle:noop,onNavigate:noop}));
}

test('all approved screens and secondary shortcuts have visible, reachable exit + navigation contracts',()=>{
 const dock=harbour();
 assert.match(dock,/aria-label="Royal Pirate Porto"/);
 assert.match(dock,/aria-label="Main game navigation"/);
 assert.match(dock,/class="harbour-battle-button"/);
 assert.doesNotMatch(dock,/<a\b[^>]*href=["']#["']/i);
 const source=read('../src/app-screens.tsx');
 const routes=read('../src/harbour.tsx');
 for(const id of destinations){
  assert.ok(source.includes("id:'"+id+"'"),'missing route '+id);
  const html=screen(id);
  assert.match(html,/role="dialog" aria-modal="true"/,id);
  assert.match(html,/aria-labelledby="app-screen-title"/,id);
  assert.match(html,/aria-label="Back to harbour/,id);
  assert.match(html,/aria-label="Main game screens"/,id);
  assert.match(html,/aria-label="Recursos do capitão"/,id);
  assert.doesNotMatch(html,/<a\b[^>]*href=["']#["']/i,id+' placeholder anchor');
 }
 assert.match(routes,/onClick=\{onBattle\}/);
 assert.match(routes,/onClick=\{\(\)=>onAction\(item\.screen\)\}/);
 assert.match(source,/onClick=\{onClose\}/);
 assert.match(source,/onClick=\{\(\)=>onNavigate\(p\.id\)\}/);
});

test('first-use controls do not claim unavailable currency, cloud progress, or real checkout',()=>{
 const starter=initialProfile();
 const home=harbour(starter);
 assert.match(home,/0 locally earned coins/);
 assert.match(home,/Diamantes indisponíveis/);
 const ranking=screen('ranking',starter);
 assert.match(ranking,/no global leaderboard yet/i);
 const shop=screen('shop',starter);
 assert.match(shop,/aria-label="Recursos do capitão"/);
 assert.doesNotMatch(shop,/<a\b[^>]*href=["']#["']/i);
 const profile=screen('profile',starter);
 assert.match(profile,/SAVE BACKUP/);
 assert.match(profile,/RESTORE BACKUP/);
 assert.match(profile,/app-player-name/);
 assert.match(profile,/maxLength="20"/);
});

test('mission, daily and battle payouts are earned once and remain immutable across route renders',()=>{
 const clock=Date.parse('2026-11-19T12:00:00Z');
 let p=initialProfile();
 for(const id of ['first-win','five-hits','three-battles'] as const){
  assert.equal(missionProgress(p,id),0);
  assert.equal(claimMission(p,id),p,'mission must not pay before progress');
 }
 p=finishBattle(p,'victory',4,5,clock);
 p=finishBattle(p,'victory',3,5,clock+1000);
 p=finishBattle(p,'defeat',0,5,clock+2000);
 assert.equal(p.coins,70);
 for(const id of ['first-win','five-hits','three-battles'] as const){
  const before=p;
  p=claimMission(p,id);
  assert.notEqual(p,before,'earned mission must pay once');
  assert.equal(claimMission(p,id),p,'mission cannot pay twice');
 }
 assert.equal(p.coins,170);
 assert.equal(canClaimDaily(p,clock),true);
 p=claimDaily(p,clock);
 assert.equal(p.coins,190);
 assert.equal(claimDaily(p,clock+15000),p);
 assert.equal(canClaimDaily(p,clock-86400000),false,'clock rollback cannot mint gold');
 const backup=exportProfileBackup(p,clock);
 const restored=importProfileBackup(backup);
 assert.deepEqual(restored,p);
 for(const id of destinations){
  const html=screen(id,restored);
  assert.ok(html.includes('aria-label="190 moedas de ouro ganhas localmente"'),id);
 }
 assert.ok(harbour(restored).includes('aria-label="190 locally earned coins"'));
});

test('repeated purchases/crew switches/forging conserve coins even after an offline backup',()=>{
 let p:LocalProfile={...initialProfile(),coins:3000};
 const initial=3000;
 for(const crew of CREW.filter(c=>c.cost>0)){
  p=buyCrew(p,crew.id);
  assert.equal(buyCrew(p,crew.id),p,'duplicate purchase');
 }
 for(let i=0;i<40;i++){
  const old=p.coins;
  for(const crew of CREW)p=equipCrew(p,crew.id);
  for(const up of UPGRADES)p=improve(p,up.id);
  assert.ok(p.coins>=0&&p.coins<=old);
  assert.equal(new Set(p.ownedCrew).size,p.ownedCrew.length);
  assert.ok(p.ownedCrew.includes(p.equippedCrew));
  assert.ok(Object.values(p.upgrades).every(level=>level<=5));
 }
 const purchaseCost=CREW.filter(c=>c.cost>0).reduce((n,c)=>n+c.cost,0);
 const forgeCost=UPGRADES.reduce((sum,u)=>sum+
  Array.from({length:p.upgrades[u.id]},(_,i)=>upgradeCost(u.id,i)).reduce((a,b)=>a+b,0),0);
 assert.equal(p.coins,initial-purchaseCost-forgeCost);
 const restored=importProfileBackup(exportProfileBackup(p,Date.parse('2026-11-19T14:00:00Z')));
 assert.equal(restored.coins,p.coins);
 assert.deepEqual(restored.upgrades,p.upgrades);
 assert.deepEqual(new Set(restored.ownedCrew),new Set(p.ownedCrew));
 assert.equal(restored.equippedCrew,p.equippedCrew);
});

test('battle restart, double-fire prevention and terminal event accounting stay deterministic',()=>{
 for(const seed of [12,77,901,1261]){
  const b=new Battle(seed);
  for(let shots=0;shots<18&&b.phase!=='victory'&&b.phase!=='defeat';shots++){
   assert.equal(b.phase,'ready');
   b.aim(0,65);
   assert.equal(b.fire(),true);
   assert.equal(b.fire(),false,'second fire must not add a shot');
   let frames=0;
   while(b.phase!=='ready'&&b.phase!=='victory'&&b.phase!=='defeat'&&frames++<900)b.tick(1/60);
   assert.ok(frames<900,'battle must settle');
   b.drainEvents();
  }
  assert.equal(b.phase,'victory','four accurate shots should finish');
  assert.equal(b.hits,4);
  assert.equal(b.shotsFired,4);
  const terminal={...b.health};
  b.tick(2);
  assert.deepEqual(b.health,terminal,'end state cannot continue doing damage');
  assert.equal(b.fire(),false);
  b.reset();
  assert.equal(b.shotsFired,0);
  assert.equal(b.phase,'ready');
  assert.deepEqual(b.health,{player:100,enemy:100});
  assert.equal(b.drainEvents().length,0,'restart must clear stale events');
 }
});

test('mobile/accessibility and release contracts remain in source without claiming a real phone test',()=>{
 const html=read('../index.html');
 const manifest=JSON.parse(read('../public/manifest.webmanifest'));
 const css=read('../src/app-screens.css')+read('../src/harbour.css');
 const scene=read('../src/scene.ts');
 const main=read('../src/main.tsx');
 const version=JSON.parse(read('../package.json')).version as string;
 assert.equal(manifest.orientation,'portrait-primary');
 assert.equal(manifest.display,'standalone');
 assert.match(html,/width=device-width,initial-scale=1,viewport-fit=cover/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/focus-visible/);
 assert.match(css,/overflow-y:auto/);
 assert.match(main,/onPointerCancelCapture=\{onSceneAimEnd\}/);
 assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
 for(const evt of ['pointerdown','pointermove','pointerup','pointercancel']){
  assert.ok(scene.includes("addEventListener('"+evt+"'"),evt+' handler missing');
  assert.ok(scene.includes("removeEventListener('"+evt+"'"),evt+' cleanup missing');
 }
 assert.ok(html.includes('v'+version),'release label drift');
 assert.ok(read('../public/sw.js').includes('royal-pirate-web-v'+version),'cache version drift');
});
