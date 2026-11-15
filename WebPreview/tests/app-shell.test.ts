import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {initialProfile} from '../src/progression.ts';

const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
const harbour=readFileSync(new URL('../src/harbour.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
const noop=()=>{};
const props={profile:initialProfile(),onNavigate:noop,onClose:noop,onBattle:noop,onInspect:noop,
  onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''};
const all:AppScreenId[]=['battle','fleet','forge','cards','shop','missions','profile'];

test('all seven app sheets have actual renderable content and controls',()=>{
 for(const screen of all){
  const html=renderToStaticMarkup(React.createElement(AppScreens,{...props,screen}));
  assert.match(html,/role="dialog"/,screen);
  assert.match(html,/aria-label="Main game screens"/,screen);
  assert.match(html,/Back to harbour/,screen);
  assert.match(html,/ROYAL PIRATE/,screen);
  assert.match(html,/aria-label="Battle"/,screen);
 }
});
test('the eighth approved page is the live 3D harbour, not a static screenshot',()=>{
 assert.match(main,/harbour&&<Harbour/);
 assert.match(main,/view\.current\?\.showHarbour\(\)/);
 assert.match(main,/view\.current\?\.showBattle\(\)/);
 assert.match(harbour,/onClick=\{onBattle\}/);
});
test('harbour navigation is actionable and overlays preserve physical safe areas',()=>{
 assert.match(harbour,/onNavigate\(item\.screen\)/);
 assert.match(harbour,/onNavigate\('forge'\)/);
 assert.match(harbour,/onNavigate\('missions'\)/);
 assert.match(main,/AppScreens screen=\{appScreen\}/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/focus-visible/);
});
test('no claim of online leaderboards, card combat bonuses or real-money checkout',()=>{
 const html=all.map(screen=>renderToStaticMarkup(React.createElement(AppScreens,{...props,screen}))).join('\n');
 assert.match(html,/no account, multiplayer service or connected leaderboard yet/i);
 assert.match(html,/battle damage unchanged/i);
 assert.match(html,/secure payments/i);
 assert.match(html,/saved on this device/i);
});

test('captain profile exposes accessible, confirmed local backup actions',()=>{
 const html=renderToStaticMarkup(React.createElement(AppScreens,{...props,screen:'profile',backupMessage:'Save restored'}));
 assert.match(html,/SAVE BACKUP/);
 assert.match(html,/RESTORE BACKUP/);
 assert.match(html,/not cloud synced|no account, online backup/i);
 assert.match(html,/role="status"/);
 assert.match(main,/onChange=\{restoreBackup\}/);
 assert.match(main,/window\.confirm\(/);
});
