import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Harbour} from '../src/harbour.tsx';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {initialProfile,finishBattle,claimDaily, type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
const allScreens:ReadonlyArray<AppScreenId>=[
  'battle','fleet','forge','cards','shop','missions','profile','ranking',
  'chests','events','rewards','offers'
];
const coreScreens:ReadonlyArray<AppScreenId>=[
  'battle','fleet','forge','cards','shop','missions','profile','ranking'
];
function renderScreen(screen:AppScreenId,profile:LocalProfile=initialProfile()) {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));
}
const attributes=(html:string,attribute:string)=>[
  ...html.matchAll(new RegExp('\\b'+attribute+'="([^"]+)"','g'))
].map(match=>match[1]);

test('every approved app destination and supplementary route renders an accessible dialog',()=>{
  for(const screen of allScreens){
    const html=renderScreen(screen);
    assert.match(html,/role="dialog" aria-modal="true"/,screen);
    assert.match(html,/aria-labelledby="app-screen-title"/,screen);
    assert.match(html,/id="app-screen-title"/,screen);
    assert.match(html,/aria-label="Back to harbour"/,screen);
    assert.match(html,/aria-label="Other screens"/,screen);
    assert.match(html,/<button\b/,screen);
    assert.doesNotMatch(html,/href="#"|href="javascript:|aria-label=""/i,screen);
  }
});

test('all labelled-by ARIA references resolve to real DOM ids on the eight primary screens',()=>{
  for(const screen of coreScreens){
    const html=renderScreen(screen);
    const ids=new Set(attributes(html,'id'));
    for(const value of attributes(html,'aria-labelledby')){
      for(const ref of value.trim().split(/\s+/)){
        assert.ok(ids.has(ref),screen+': missing element id='+ref);
      }
    }
  }
});

test('all rendered progress indicators expose bounded numeric values',()=>{
  const earned=claimDaily(finishBattle(initialProfile(),'victory',3,5),Date.parse('2026-11-15T12:00:00Z'));
  const pages=coreScreens.map(screen=>({screen,html:renderScreen(screen,earned)}));
  for(const {screen,html} of pages){
    const indicators=[...html.matchAll(/<[^>]+role="progressbar"[^>]*>/g)];
    for(const [tag] of indicators){
      const read=(name:string)=>{
        const match=tag.match(new RegExp('\\b'+name+'="([^"]+)"'));
        return match?Number(match[1]):NaN;
      };
      const min=read('aria-valuemin'),max=read('aria-valuemax'),now=read('aria-valuenow');
      assert.ok([min,max,now].every(Number.isFinite),screen+': invalid progress value '+tag);
      assert.ok(min<=now&&now<=max,screen+': progress out of bounds '+tag);
      assert.match(tag,/aria-label="[^"]+"/,screen+': progress needs accessible label');
    }
  }
});

test('real rewards and battle results stay consistent in every screen wallet',()=>{
  const first=finishBattle(initialProfile(),'victory',4,5,Date.parse('2026-11-15T10:00:00Z'));
  const progressed=claimDaily(first,Date.parse('2026-11-15T12:00:00Z'));
  assert.equal(progressed.coins,55);
  assert.equal(progressed.wins,1);
  for(const screen of allScreens){
    const html=renderScreen(screen,progressed);
    assert.ok(html.includes('aria-label="55 locally earned coins"'),screen+': wrong wallet amount');
    assert.doesNotMatch(html,/NaN|undefined|Infinity/,screen);
  }
  const harbour=renderToStaticMarkup(React.createElement(Harbour,{profile:progressed,onBattle:noop,onNavigate:noop}));
  assert.match(harbour,/aria-label="55 locally earned coins"/);
  assert.match(harbour,/aria-label="1 victories from real battles"/);
});

test('navigation and battle callbacks remain wired at the React entrypoint',()=>{
  const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const harbour=readFileSync(new URL('../src/harbour.tsx',import.meta.url),'utf8');
  assert.match(main,/onNavigate=\{navigateTo\}/);
  assert.match(main,/onClose=\{\(\)=>setAppScreen\(null\)\}/);
  assert.match(main,/onBattle=\{enterBattle\}/);
  assert.match(main,/view\.current\?\.showHarbour\(\)/);
  assert.match(main,/view\.current\?\.showBattle\(\)/);
  assert.match(harbour,/onClick=\{onBattle\}/);
  assert.match(harbour,/onClick=\{\(\)=>onAction\(item\.screen\)\}/);
  assert.match(harbour,/onClick=\{item\.screen\?\(\)=>onAction\(item\.screen!\):undefined\}/);
});

test('native gestures remain available on the ship and respect mobile-safe navigation',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const harbour=readFileSync(new URL('../src/harbour.css',import.meta.url),'utf8');
  const screens=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
  assert.match(scene,/enableRotate=true;this\.controls\.enableZoom=true/);
  assert.match(harbour,/\.harbour-central\{[^}]*pointer-events:none/);
  for(const css of [harbour,screens]){
    assert.match(css,/safe-area-inset-top/);
    assert.match(css,/safe-area-inset-bottom/);
    assert.match(css,/focus-visible/);
  }
});
