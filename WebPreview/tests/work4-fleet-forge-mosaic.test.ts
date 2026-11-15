import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FleetPanel,ForgePanel} from '../src/work4-fleet-forge.tsx';
import {AppScreens} from '../src/app-screens.tsx';
import {initialProfile,improve,upgradeCost} from '../src/progression.ts';

const noop=()=>{};
const initial=()=>initialProfile();
const fleet=(profile=initial())=>renderToStaticMarkup(React.createElement(FleetPanel,{profile,onCrew:noop,onForge:noop,onPorto:noop}));
const forge=(profile=initial())=>renderToStaticMarkup(React.createElement(ForgePanel,{profile,onUpgrade:noop,onFleet:noop}));
function app(screen:'fleet'|'forge'){
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile:initial(),onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));
}

test('frota follows approved three-tab mobile screen and has one real ship, not fictional ownership',()=>{
  const html=fleet();
  for(const title of ['A MINHA FROTA','OBTER NAVIOS','PERSONALIZAR','ROYAL CROWN','NAVIOS DA FROTA']){
    assert.ok(html.includes(title),title);
  }
  assert.equal((html.match(/role="tab"/g)||[]).length,3);
  assert.equal((html.match(/class="w4-ship-slot/g)||[]).length,4);
  assert.match(html,/1 navio disponível/);
  assert.match(html,/ESPAÇO 4/);
  assert.match(html,/EM DESENVOLVIMENTO/);
  assert.match(html,/ABRIR MELHORIAS/);
  assert.match(html,/aria-pressed="true"/);
  assert.doesNotMatch(html,/1250|980|820|30000|325700|4860/);
});

test('forge provides four tabs but never fabricates armour levels, gem inventory or combat effects',()=>{
  const html=forge();
  for(const text of ['NAVIO','CANHÕES','ARMADURA','VELAS','MATERIAIS E CUSTOS','PROGRESSO DO ESTALEIRO']){
    assert.ok(html.includes(text),text);
  }
  assert.equal((html.match(/role="tab"/g)||[]).length,4);
  assert.match(html,/aria-valuemax="5" aria-valuenow="0"/);
  assert.match(html,/MOEDAS INSUFICIENTES/);
  assert.match(html,/moedas locais são usadas/);
  assert.doesNotMatch(html,/120 \/ 120|85 \/ 80|12 \/ 10|50 000/);
  assert.doesNotMatch(html,/Dano.*1250|Alcance.*820/);
});

test('forge renders the real coin cost and next level derived from progression model',()=>{
  const before={...initial(),coins:1000};
  const cost=upgradeCost('hull',0);
  const after=improve(before,'hull');
  assert.equal(before.coins,1000);
  assert.equal(after.coins,1000-cost);
  assert.equal(after.upgrades.hull,1);
  const html=forge(after);
  assert.match(html,/NÍVEL 1/);
  assert.ok(html.includes(String(upgradeCost('hull',1))));
  assert.match(html,/MELHORAR/);
  assert.equal(improve({...after,coins:0},'hull').upgrades.hull,1);
});

test('fleet and forge are wired into live app with Porto/Frota/Cartas/Loja/Ranking dock',()=>{
  for(const screen of ['fleet','forge'] as const){
    const html=app(screen);
    assert.match(html,/app-dock/);
    for(const title of ['PORTO','FROTA','CARTAS','LOJA','RANKING'])assert.ok(html.includes('>'+title+'</strong>'),title);
    assert.equal((html.match(/class="app-tab-glyph"/g)||[]).length,5);
    assert.match(html,/aria-current="page"/);
    assert.match(html,/role="dialog"/);
  }
  assert.match(app('fleet'),/A MINHA FROTA/);
  assert.match(app('forge'),/MATERIAIS E CUSTOS/);
});

test('new components import no CSS directly: safe for Node SSR and test runner',()=>{
  const code=readFileSync(new URL('../src/work4-fleet-forge.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
  assert.doesNotMatch(code,/import\s+['"][^'"]+\.css['"]/);
  assert.match(css,/^@import '\.\/work4-fleet-forge\.css';/);
});
