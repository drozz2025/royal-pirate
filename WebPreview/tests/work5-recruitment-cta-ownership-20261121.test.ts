/**
 * WORK 5 — independent SSR action gating for the real local Shop and Cards.
 * Assertions use production React markup and the canonical progression API.
 * They DO NOT claim a physical phone, a successful browser tap, IAP support,
 * or that a pending design has been released. Tests-only: no UI/WORK edits.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ShopMarket,CardsCollection} from '../src/work7-cards-shop.tsx';
import {
  initialProfile,finishBattle,buyCrew,equipCrew,
  exportProfileBackup,importProfileBackup,
  type CrewId,type LocalProfile
} from '../src/progression.ts';

const noop=()=>{};
const stamp=Date.parse('2026-11-21T05:00:00.000Z');
const htmlShop=(profile:LocalProfile)=>renderToStaticMarkup(
  React.createElement(ShopMarket,{
    profile,onBuyCrew:noop,onCards:noop,onBattle:noop,
    announce:(_message:string,callback:()=>void)=>callback()
  })
);
const htmlCards=(profile:LocalProfile)=>renderToStaticMarkup(
  React.createElement(CardsCollection,{
    profile,onBuyCrew:noop,onEquipCrew:noop,onBattle:noop,
    announce:(_message:string,callback:()=>void)=>callback()
  })
);
function product(html:string,id:CrewId){
  const row=html.match(new RegExp('<article class="w7-product w7-'+id+'">([\\s\\S]*?)<\\/article>'));
  assert.ok(row,'Shop lost the real '+id+' product');
  const button=row![1].match(/<button\\b([^>]*)>([^<]*)<\\/button>/);
  assert.ok(button,'Shop product has no actionable or disabled button for '+id);
  return {attrs:button![1],label:button![2],row:row![1]};
}
function checkState(html:string,id:CrewId,label:string,disabled:boolean){
  const entry=product(html,id);
  assert.equal(entry.label,label,'Unexpected Shop CTA for '+id);
  assert.equal(/\\bdisabled(?:=""|\\s|$)/.test(entry.attrs),disabled,
    'Incorrect real-money/local-coin action gate for '+id);
  assert.match(entry.attrs,/aria-label="[^"]+"/,'Missing accessible Shop CTA: '+id);
}
function victories(count:number){
  let p=initialProfile();
  for(let i=0;i<count;i++)p=finishBattle(p,'victory',2,3,stamp+i*1_000);
  return p;
}

test('WORK5: no-balance Shop disables every recruit CTA and gives no live cash checkout',()=>{
  const html=htmlShop(initialProfile());
  checkState(html,'captain','TEU',true);
  checkState(html,'gunner','SEM SALDO',true);
  checkState(html,'navigator','SEM SALDO',true);
  assert.match(html,/sem pagamentos|SEM PAGAMENTOS REAIS/i);
  assert.match(html,/INDISPONÍVEL/);
  assert.doesNotMatch(html,/<a[^>]+href="[^"]*(?:checkout|payment|paypal|stripe)[^"]*"/i,
    'Unimplemented real-money products must not lead to a checkout');
  const cards=htmlCards(initialProfile());
  assert.match(cards,/3 de 3 cartas|1 de 3 cartas/);
  assert.match(cards,/EQUIPADO<\\/button>/,'Starter captain not marked as equipped');
  assert.match(cards,/ilustrações conceptuais aprovadas, ainda sem cartas jogáveis/,
    'Decorative card previews must not be sold as working game powers');
});

test('WORK5: actual earned coins toggle recruitment affordability without double charge',()=>{
  const earned=victories(3); // 105 local gold
  assert.equal(earned.coins,105);
  const before=htmlShop(earned);
  checkState(before,'gunner','RECRUTAR',false);
  checkState(before,'navigator','RECRUTAR',false);
  const bought=buyCrew(earned,'gunner');
  assert.equal(bought.coins,45);
  assert.ok(bought.ownedCrew.includes('gunner'));
  assert.strictEqual(buyCrew(bought,'gunner'),bought,'Already owned crew charged twice');
  assert.strictEqual(buyCrew(bought,'navigator'),bought,'Unaffordable crew charged coins');
  const after=htmlShop(bought);
  checkState(after,'gunner','TEU',true);
  checkState(after,'navigator','SEM SALDO',true);
  assert.match(after,/45 moedas locais/,'Shop has stale wallet after recruitment');
  const funded=finishBattle(finishBattle(bought,'victory',2,3,stamp+4_000),
    'victory',2,3,stamp+5_000);
  assert.equal(funded.coins,115);
  const complete=buyCrew(funded,'navigator');
  assert.equal(complete.coins,25);
  checkState(htmlShop(complete),'navigator','TEU',true);
  assert.equal(new Set(complete.ownedCrew).size,3,'Purchased crew has duplicates');
  assert.equal(earned.coins,105,'Recruitment mutated original player');
});

test('WORK5: restored local crew ownership matches Shop and Cards without new purchase entitlement',()=>{
  let profile=victories(5);
  profile=buyCrew(buyCrew(profile,'gunner'),'navigator');
  profile=equipCrew(profile,'navigator');
  assert.equal(profile.coins,25);
  const restored=importProfileBackup(exportProfileBackup(profile,stamp+10_000));
  assert.deepEqual(restored,profile);
  assert.deepEqual(restored.ownedCrew,['captain','gunner','navigator']);
  for(const id of ['captain','gunner','navigator'] as CrewId[]){
    checkState(htmlShop(restored),id,'TEU',true);
    assert.strictEqual(buyCrew(restored,id),restored,'Restore made crew purchasable again: '+id);
  }
  const cards=htmlCards(restored);
  assert.match(cards,/3 de 3 cartas/);
  assert.match(cards,/EQUIPADO<\\/button>/,'Equipped navigator not reflected in Cards');
  assert.match(cards,/Northwind/,'Navigator missing from owned collection');
  assert.equal(restored.equippedCrew,'navigator');
  assert.equal(restored.coins,25,'Rendering changed saved gold');
});
