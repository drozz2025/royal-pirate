import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { AppScreens, type AppScreenId } from '../src/app-screens.tsx';
import { initialProfile } from '../src/progression.ts';

const noOp=()=>{};
const props={
  profile:initialProfile(),onNavigate:noOp,onClose:noOp,onBattle:noOp,
  onBuyCrew:noOp,onEquipCrew:noOp,onUpgrade:noOp,onMission:noOp,onDaily:noOp,
  onExportBackup:noOp,onImportBackup:noOp,onSetPlayerName:noOp,backupMessage:''
};
const css=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
const harbour=readFileSync(new URL('../src/harbour.tsx',import.meta.url),'utf8');

test('the eight approved interior destinations distinguish real gold from disabled gems',()=>{
  const screens:AppScreenId[]=['battle','fleet','forge','cards','shop','missions','ranking','profile'];
  for(const screen of screens){
    const html=renderToStaticMarkup(React.createElement(AppScreens,{...props,screen}));
    assert.match(html,/aria-label="Recursos do capitão"/,screen);
    assert.match(html,/app-wallet-gold/,screen);
    assert.match(html,/app-wallet-gems/,screen);
    assert.match(html,/OURO/,screen);
    assert.match(html,/GEMAS/,screen);
    assert.match(html,/Diamantes indisponíveis nesta versão/,screen);
    assert.match(html,/economia de gemas não implementada/,screen);
    assert.doesNotMatch(html,/COMPRAR DIAMANTES|CHECKOUT DIAMANTES/i,screen);
  }
});

test('separate gem indicator does not affect the approved Porto styling or invent balances',()=>{
  assert.match(css,/\.app-sheet-header \.app-resource-counters/);
  assert.doesNotMatch(css,/\.harbour-screen\s*\{/);
  assert.match(harbour,/harbour-resources/);
  assert.doesNotMatch(harbour,/app-resource-counters/);
});
