import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CardsCollection,ShopMarket} from '../src/work7-cards-shop';
import {initialProfile,buyCrew,CREW} from '../src/progression';

const noAction=()=>{};
test('Cards provides three accessible tabs with real owned count and no fictional upgrades',()=>{
 const html=renderToStaticMarkup(React.createElement(CardsCollection,{
  profile:initialProfile(),onBuyCrew:noAction,onEquipCrew:noAction,onBattle:noAction,announce:noAction
 }));
 for(const label of ['A MINHA COLEÇÃO','MELHORAR','FUSÃO'])assert.ok(html.includes(label));
 assert.match(html,/role="tablist"/);
 assert.match(html,/1 de 3 tripulantes/);
 assert.ok(!html.includes('FREE GEMS'));
});
test('Shop provides four tabs, canonical prices and disables unaffordable purchases',()=>{
 const html=renderToStaticMarkup(React.createElement(ShopMarket,{
  profile:initialProfile(),onBuyCrew:noAction,onCards:noAction,onBattle:noAction,announce:noAction
 }));
 for(const label of ['OFERTAS','MOEDAS','GEMAS','ESPECIAIS'])assert.ok(html.includes(label));
 for(const crew of CREW)assert.ok(html.includes(crew.name));
 assert.match(html,/disabled=""/);
 assert.match(html,/60 ●/);
 assert.match(html,/90 ●/);
});
test('Canonical shop purchase cannot exceed balance and is persisted via the existing profile format',()=>{
 const first=initialProfile();
 assert.equal(buyCrew(first,'gunner'),first);
 const funded={...first,coins:60};
 const purchased=buyCrew(funded,'gunner');
 assert.equal(purchased.coins,0);
 assert.deepEqual(purchased.ownedCrew,['captain','gunner']);
 assert.equal(buyCrew(purchased,'gunner'),purchased);
});