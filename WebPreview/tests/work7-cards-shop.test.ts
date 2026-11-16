import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CardsCollection,ShopMarket} from '../src/work7-cards-shop';
import {initialProfile,buyCrew,equipCrew,CREW} from '../src/progression';

const noop=()=>{};
const announce=(_message:string,callback:()=>void)=>callback();
function cards(profile=initialProfile()){
 return renderToStaticMarkup(React.createElement(CardsCollection,{
  profile,onBuyCrew:noop,onEquipCrew:noop,onBattle:noop,announce
 }));
}
function shop(profile=initialProfile()){
 return renderToStaticMarkup(React.createElement(ShopMarket,{
  profile,onBuyCrew:noop,onCards:noop,onBattle:noop,announce
 }));
}

test('Cards screen shows the approved two-tab 4x2 conceptual atlas and preserves real crew management',()=>{
 const html=cards();
 for(const label of ['A MINHA COLEÇÃO','EVOLUIR','FUSÃO'])assert.ok(html.includes(label));
 assert.equal((html.match(/class="w7-approved-slot w7-approved-slot-/g)||[]).length,8);
 assert.equal((html.match(/CONCEITO · EM BREVE/g)||[]).length,8);
 assert.match(html,/GERIR TRIPULAÇÃO REAL/);
 assert.match(html,/ainda sem cartas jogáveis/);
 for(const crew of CREW)assert.ok(html.includes(crew.name));
 assert.equal((html.match(/class="w7-card w7-/g)||[]).length,3);
 assert.equal((html.match(/class="w7-art-svg"/g)||[]).length,3);
 assert.match(html,/aria-label="Escolher carta da tripulação"/);
 assert.match(html,/aria-label="Filter crew collection"/);
 assert.match(html,/role="tablist" aria-label="Cartas"/);
 assert.match(html,/1\/3/);
 assert.match(html,/Raridades visuais sem efeitos de jogo/);
});

test('Shop offers exact real costs and does not activate unavailable in-app purchases',()=>{
 const html=shop();
 for(const label of ['OFERTAS','MOEDAS','GEMAS','ESPECIAIS'])assert.ok(html.includes(label));
 for(const crew of CREW)assert.ok(html.includes(crew.name));
 assert.match(html,/60 ● MOEDAS/);
 assert.match(html,/90 ● MOEDAS/);
 assert.match(html,/No real-money checkout is available/);
 assert.match(html,/aria-label="Need 60 more local coins to recruit Iron Jack"/);
 assert.match(html,/aria-label="Need 90 more local coins to recruit Northwind"/);
 assert.doesNotMatch(html,/€|PAY NOW|STRIPE|APPLE PAY|GOOGLE PAY/);
});

test('Card/shop ownership and coin balances follow the existing canonical progression only',()=>{
 const initial=initialProfile();
 assert.equal(buyCrew(initial,'gunner'),initial);
 const funded={...initial,coins:95};
 const bought=buyCrew(funded,'gunner');
 assert.equal(bought.coins,35);
 assert.deepEqual(bought.ownedCrew,['captain','gunner']);
 assert.equal(buyCrew(bought,'gunner'),bought);
 const equipped=equipCrew(bought,'gunner');
 assert.equal(equipped.equippedCrew,'gunner');
 assert.match(cards(equipped),/2\/3/);
 assert.match(cards(equipped),/Iron Jack/);
 assert.match(shop(equipped),/Iron Jack already collected/);
 assert.match(shop(equipped),/Need 55 more local coins to recruit Northwind/);
});
