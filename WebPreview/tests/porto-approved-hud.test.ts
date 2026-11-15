import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Harbour } from '../src/harbour.tsx';
import { initialProfile, type LocalProfile } from '../src/progression.ts';

const render=(profile:LocalProfile)=>renderToStaticMarkup(React.createElement(Harbour,{
  profile,onBattle:()=>{},onNavigate:()=>{}
}));
const css=readFileSync(new URL('../src/harbour.css',import.meta.url),'utf8');

test('Porto shows the approved navigation and clearly identifies unranked training',()=>{
  const html=render(initialProfile());
  for(const name of ['PORTO','FROTA','CARTAS','LOJA','RANKING','ARENA','BAÚS','EVENTOS','RECOMPENSAS','MISSÕES','OFERTAS','BATALHA!']){
    assert.ok(html.includes(name),name);
  }
  assert.match(html,/TREINO LOCAL/);
  assert.match(html,/0 VITÓRIAS/);
  assert.equal((html.match(/class="harbour-nav-item/g)||[]).length,5);
  assert.equal((html.match(/class="harbour-flank-button/g)||[]).length,6);
  assert.equal((html.match(/class="harbour-nav-alert"/g)||[]).length,0);
  assert.doesNotMatch(html,/Liga Ouro|128\.450|2\.860/);
});

test('only affordable local upgrades and crew produce notification dots',()=>{
  const initial=initialProfile();
  const fleetOnly=render({...initial,coins:50});
  assert.equal((fleetOnly.match(/class="harbour-nav-alert"/g)||[]).length,1);
  assert.match(fleetOnly,/aria-label="FROTA, melhoria disponível"/);
  assert.doesNotMatch(fleetOnly,/aria-label="CARTAS, melhoria disponível"/);

  const both=render({...initial,coins:100});
  assert.equal((both.match(/class="harbour-nav-alert"/g)||[]).length,2);
  assert.match(both,/aria-label="FROTA, melhoria disponível"/);
  assert.match(both,/aria-label="CARTAS, melhoria disponível"/);

  const maxed=render({...initial,coins:100,upgrades:{hull:5,cannons:5,sails:5},ownedCrew:['captain','gunner','navigator']});
  assert.equal((maxed.match(/class="harbour-nav-alert"/g)||[]).length,0);
});

test('approved HUD CSS maintains touch-through ship space, mobile controls and gold/navy hierarchy',()=>{
  assert.match(css,/WORK 6 approved Porto HUD polish/);
  assert.match(css,/\.harbour-flank-right\s*\{[\s\S]*?42dvh/);
  assert.match(css,/\.harbour-logo::before\s*\{/);
  assert.match(css,/\.harbour-arena-mode\s*\{/);
  assert.match(css,/\.harbour-nav-alert\s*\{/);
  assert.match(css,/\.harbour-battle-button::before/);
  assert.match(css,/\.harbour-screen\{[\s\S]*?pointer-events:none/);
  assert.match(css,/\.harbour-flank-button\{[^}]*pointer-events:auto/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/@media\(max-height:690px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
