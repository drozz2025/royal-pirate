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

test('fleet shows the one real Royal Crown with honest pending slots and working actions',()=>{
  const html=fleet(initialProfile());
  assert.match(html,/A MINHA FROTA/);
  assert.match(html,/OBTER NAVIOS/);
  assert.match(html,/PERSONALIZAR/);
  assert.match(html,/ROYAL CROWN/);
  assert.match(html,/ABRIR MELHORIAS/);
  assert.match(html,/VER NAVIO NO PORTO/);
  assert.match(html,/1 navio disponível/);
  assert.match(html,/0 \/ 15/);
  assert.match(html,/EM DESENVOLVIMENTO/);
  assert.match(html,/O navio 3D interativo encontra-se no Porto/);
  const source=readFileSync(new URL('../src/app-screens.tsx',import.meta.url),'utf8');
  assert.match(source,/onForge=\{\(\)=>onNavigate\('forge'\)\}/);
  assert.match(source,/onCrew=\{\(\)=>onNavigate\('cards'\)\}/);
});

test('fleet report updates from real purchased local level data without fictional ship stats',()=>{
  const once=improve({...initialProfile(),coins:200},'hull');
  const twice=improve(once,'hull');
  assert.equal(twice.upgrades.hull,2);
  const html=fleet(twice);
  assert.match(html,/2 \/ 15/);
  assert.match(html,/2 \/ 5/);
  assert.match(html,/0 \/ 5/);
  assert.doesNotMatch(html,/1250|980|820|30000/);
  assert.match(html,/Royal Crown selecionada/);
});

test('shipyard works with narrow mobile safe layout and visible button focus',()=>{
  const css=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
  assert.match(css,/\.app-fleet-modules\{display:grid/);
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(css,/@media\(max-width:335px\)/);
  assert.match(css,/\.app-fleet-actions button:focus-visible/);
  assert.match(css,/\.app-fleet-actions button\{[^}]*min-height:48px/s);
});
