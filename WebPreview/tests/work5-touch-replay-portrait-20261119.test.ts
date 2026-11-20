/**
 * WORK 5 — supplementary mobile QA regression fixtures.
 * Exercises pure domain/input, React SSR, and source-level contracts only.
 * No physical device, Chromium interaction, WebGL pinch or deployment claim.
 * Never changes production UI, workers, release workflows, or Unity.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {bearingFromDrag,powerFromClientX} from '../src/battle-touch.ts';
import {Battle} from '../src/battle.ts';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {
  initialProfile,finishBattle,claimDaily,buyCrew,equipCrew,
  exportProfileBackup,importProfileBackup,type LocalProfile
} from '../src/progression.ts';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const noop=()=>{};
const routes:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions',
  'profile','ranking','chests','events','rewards','offers'
];
function renderScreen(route:AppScreenId,profile:LocalProfile) {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen:route,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));
}

test('touch bearing and power are bounded and monotone on four portrait widths',()=>{
  for(const width of [320,375,390,430]) {
    const left=width/4;
    let previousYaw=-25;
    let previousPower=20;
    for(let i=0;i<=40;i++) {
      const fraction=i/40;
      const yaw=bearingFromDrag(-25,left,left+width*fraction,width);
      const power=powerFromClientX(left+width*fraction,left,width);
      assert.ok(Number.isFinite(yaw)&&yaw>=-25&&yaw<=25,'finite bounded yaw');
      assert.ok(Number.isFinite(power)&&power>=20&&power<=100,'finite bounded power');
      assert.ok(yaw>=previousYaw,'drag should not reverse direction');
      assert.ok(power>=previousPower,'power should not reverse direction');
      previousYaw=yaw; previousPower=power;
    }
    assert.equal(bearingFromDrag(0,left,left,width),0);
    assert.equal(bearingFromDrag(0,left,left+width,width),25);
    assert.equal(bearingFromDrag(0,left,left-width,width),-25);
    assert.equal(powerFromClientX(left,left,width),20);
    assert.equal(powerFromClientX(left+width,left,width),100);
  }
  assert.equal(bearingFromDrag(NaN,30,35,390),0);
  assert.equal(bearingFromDrag(0,NaN,35,390),0);
  assert.equal(powerFromClientX(30,20,0),20);
  assert.equal(powerFromClientX(Infinity,20,100),20);
});

test('same seeded battle replays identically after reset and discards stale events',()=>{
  const battle=new Battle(20261119);
  function replay(){
    const receipt:string[]=[];
    for(let turn=0;turn<10&&battle.phase!=='victory'&&battle.phase!=='defeat';turn++){
      assert.equal(battle.phase,'ready');
      battle.aim(0,65);
      assert.equal(battle.fire(),true);
      assert.equal(battle.fire(),false,'double-tap cannot fire twice');
      for(let i=0;i<1800&&battle.phase!=='ready'&&battle.phase!=='victory'&&battle.phase!=='defeat';i++){
        battle.tick(1/60);
        for(const e of battle.drainEvents())receipt.push([e.type,e.side,e.damage??0].join(':'));
      }
      for(const e of battle.drainEvents())receipt.push([e.type,e.side,e.damage??0].join(':'));
    }
    assert.equal(battle.phase,'victory');
    assert.equal(battle.hits,4);
    assert.equal(receipt.filter(x=>x.startsWith('result:')).length,1);
    assert.equal(battle.drainEvents().length,0);
    return {receipt,round:battle.round,health:{...battle.health},shots:battle.shotsFired};
  }
  const first=replay();
  battle.reset();
  assert.deepEqual(battle.health,{player:100,enemy:100});
  assert.equal(battle.shot,null);
  assert.equal(battle.drainEvents().length,0);
  assert.deepEqual(replay(),first);
});

test('local receipts, saved wallet and rendered wallet cannot diverge across all routes',()=>{
  const when=Date.parse('2026-11-19T19:00:00.000Z');
  let profile=initialProfile();
  for(let i=0;i<3;i++)profile=finishBattle(profile,'victory',4,4,when+i*1000);
  profile=claimDaily(profile,when+3000);
  const afterDaily=profile;
  assert.equal(claimDaily(profile,when+5000),afterDaily,'same-day claim remains single-use');
  profile=buyCrew(profile,'gunner');
  profile=equipCrew(profile,'gunner');
  assert.ok(profile.coins>=0);
  assert.equal(profile.equippedCrew,'gunner');
  const restored=importProfileBackup(exportProfileBackup(profile,when+7000));
  assert.deepEqual(restored,profile);
  const gold=String(profile.coins);
  const port=renderToStaticMarkup(React.createElement(Harbour,{
    profile:restored,onBattle:noop,onNavigate:noop
  }));
  assert.ok(port.includes('aria-label="'+gold+' locally earned coins"'));
  for(const route of routes){
    const markup=renderScreen(route,restored);
    assert.ok(markup.includes('aria-label="'+gold+' moedas de ouro ganhas localmente"'),route);
    assert.match(markup,/role="dialog" aria-modal="true"/,route);
    assert.match(markup,/aria-labelledby="app-screen-title"/,route);
    assert.match(markup,/aria-label="Back to harbour/,route);
    assert.doesNotMatch(markup,/<a\b[^>]*href=["'](?:#|javascript:)[^"']*["']/i,route);
  }
});

test('mobile input and direct ship interaction retain listener cleanup and focus semantics',()=>{
  const scene=read('../src/scene.ts');
  const page=read('../src/main.tsx');
  const panels=read('../src/app-screens.tsx');
  const index=read('../index.html');
  const manifest=JSON.parse(read('../public/manifest.webmanifest'));
  assert.match(index,/width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.equal(manifest.orientation,'portrait-primary');
  assert.match(page,/onPointerCancelCapture=\{onSceneAimEnd\}/);
  assert.match(page,/disabled=\{!ready\} onClick=\{\(\)=>engine\.current\.fire\(\)\}/);
  assert.match(panels,/onDialogKeyDown/);
  assert.match(panels,/event\.key!=='Tab'/);
  assert.match(panels,/aria-live="polite"/);
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
  for(const eventName of ['pointerdown','pointermove','pointerup','pointercancel']) {
    assert.ok(scene.includes("addEventListener('"+eventName+"'"),eventName+' registered');
    assert.ok(scene.includes("removeEventListener('"+eventName+"'"),eventName+' cleaned up');
  }
  assert.match(scene,/this\.shipPointers\.delete\(event\.pointerId\)/);
  assert.match(scene,/this\.controls\.enableRotate=false;this\.controls\.enableZoom=false/);
});

test('version and viewport guards remain consistent without claiming real mobile fit',()=>{
  const pkg=JSON.parse(read('../package.json'));
  const html=read('../index.html');
  const sw=read('../public/sw.js');
  const style=read('../src/style.css');
  const battleCss=read('../src/battle-layout-reset.css');
  assert.ok(html.includes('v'+pkg.version));
  assert.ok(sw.includes('royal-pirate-web-v'+pkg.version));
  assert.match(style,/@media\s*\(max-width:600px\)\s*and\s*\(max-height:567px\)/);
  assert.match(style,/\.app\{min-height:0;height:100dvh\}/);
  assert.match(battleCss,/\.app\.in-battle \{height:100dvh;min-height:0;overflow:hidden\}/);
  assert.match(read('../src/app-screens.css'),/overflow-y:auto/);
});
