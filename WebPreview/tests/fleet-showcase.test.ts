import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens} from '../src/app-screens.tsx';
import {improve,initialProfile,type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
function fleet(profile:LocalProfile){
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen:'fleet',profile,onNavigate:noop,onClose:noop,onBattle:noop,onInspect:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));
}

test('fleet shows actual single 3D ship, original schematic and usable shipyard navigation',()=>{
  const html=fleet(initialProfile());
  assert.match(html,/Return to the Porto and touch the ship directly/);
  assert.match(html,/SHIPYARD STATUS/);
  assert.match(html,/Your flagship/);
  assert.match(html,/OPEN SHIPYARD/);
  assert.match(html,/MANAGE CREW/);
  assert.match(html,/0 \/ 15/);
  assert.equal((html.match(/shipyard upgrade progress/g)||[]).length,3);
  assert.match(html,/Equipped captain: <strong>Captain Mara<\/strong>/);
  assert.match(html,/schematic is not a new 3D model/i);
  assert.match(html,/do not yet modify ship appearance, movement or battle damage/i);
  const source=readFileSync(new URL('../src/app-screens.tsx',import.meta.url),'utf8');
  assert.match(source,/onForge=\{\(\)=>onNavigate\('forge'\)\}/);
  assert.match(source,/onCrew=\{\(\)=>onNavigate\('cards'\)\}/);
});

test('fleet report updates automatically from real local upgrade rules',()=>{
  const once=improve({...initialProfile(),coins:200},'hull');
  const twice=improve(once,'hull');
  assert.equal(twice.upgrades.hull,2);
  const html=fleet(twice);
  assert.match(html,/2 \/ 15/);
  assert.match(html,/aria-label="Hull shipyard upgrade progress" aria-valuemin="0" aria-valuemax="5" aria-valuenow="2"/);
  assert.match(html,/Next level: 115 coins/);
  assert.match(html,/LEVEL 2 \/ 5/);
  assert.match(html,/LEVEL 0 \/ 5/);
});

test('shipyard works with narrow mobile safe layout and visible button focus',()=>{
  const css=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
  assert.match(css,/\.app-fleet-modules\{display:grid/);
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(css,/@media\(max-width:335px\)/);
  assert.match(css,/\.app-fleet-actions button:focus-visible/);
  assert.match(css,/\.app-fleet-actions button\{[^}]*min-height:48px/s);
});
