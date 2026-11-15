/** WORK 5 independent QA: cross-screen state consistency after the Work 4/7 UI merges.
 * No UI, game logic or production assets are changed by this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {
  initialProfile,finishBattle,claimMission,claimDaily,buyCrew,equipCrew,
  improve,exportProfileBackup,importProfileBackup,MISSIONS,type LocalProfile
} from '../src/progression.ts';

const noop=()=>{};
const screens:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','profile',
  'ranking','chests','events','rewards','offers'
];
function screenHtml(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));
}

test('all 12 app sheets use the same actual local wallet after progress changes',()=>{
  const empty=initialProfile();
  const funded={...empty,coins:135};
  for(const profile of [empty,funded]){
    for(const screen of screens){
      const html=screenHtml(screen,profile);
      assert.match(html,/role="dialog" aria-modal="true"/,screen);
      assert.ok(html.includes('aria-label="'+profile.coins+' locally earned coins"'),screen+' wallet');
      assert.match(html,/aria-label="Back to harbour"/,screen);
      assert.match(html,/<button\b/,screen+' should provide a control');
      assert.doesNotMatch(html,/href="(?:#|javascript:)/i,screen+' must not use dead links');
    }
  }
});

test('shop recruit affordance changes at exact cost, never enables the unaffordable card',()=>{
  const empty=initialProfile();
  const below=screenHtml('shop',{...empty,coins:59});
  assert.match(below,/aria-label="Need 1 more local coins to recruit Iron Jack"/);
  assert.match(below,/aria-label="Need 31 more local coins to recruit Northwind"/);
  const enoughForGunner=screenHtml('shop',{...empty,coins:60});
  assert.match(enoughForGunner,/aria-label="Recruit Iron Jack for 60 local coins"/);
  assert.match(enoughForGunner,/aria-label="Need 30 more local coins to recruit Northwind"/);
  const enoughForBoth=screenHtml('shop',{...empty,coins:90});
  assert.match(enoughForBoth,/aria-label="Recruit Iron Jack for 60 local coins"/);
  assert.match(enoughForBoth,/aria-label="Recruit Northwind for 90 local coins"/);
});

test('forge displays correct money-shortfall, available action and capped upgrade state',()=>{
  const empty=initialProfile();
  const short=screenHtml('forge',{...empty,coins:44});
  assert.match(short,/aria-label="Moedas insuficientes, faltam 1"/);
  const exact=screenHtml('forge',{...empty,coins:45});
  assert.match(exact,/aria-label="Melhorar Hull por 45 moedas"/);
  const max=screenHtml('forge',{...empty,coins:1000,upgrades:{hull:5,cannons:0,sails:0}});
  assert.match(max,/aria-label="Melhoria no máximo"/);
  assert.match(max,/MELHORIA MÁXIMA/);
});

test('battle -> mission -> daily -> two recruits -> hull -> offline restore remains consistent in all screens',()=>{
  const startedAt=Date.parse('2026-11-15T14:00:00.000Z');
  let p=initialProfile();
  for(let i=0;i<3;i++)p=finishBattle(p,'victory',3,4,startedAt+i*60_000);
  for(const mission of MISSIONS)p=claimMission(p,mission.id);
  p=claimDaily(p,startedAt);
  p=buyCrew(p,'gunner');
  p=buyCrew(p,'navigator');
  p=equipCrew(p,'navigator');
  p=improve(p,'hull');
  assert.equal(p.coins,30);
  assert.equal(p.wins,3);
  assert.equal(p.xp,150);
  assert.equal(p.hits,9);
  assert.equal(p.shots,12);
  assert.deepEqual(p.ownedCrew,['captain','gunner','navigator']);
  assert.equal(p.equippedCrew,'navigator');
  assert.equal(p.upgrades.hull,1);
  assert.equal(p.claimedMissions.length,MISSIONS.length);
  assert.equal(p.battleLog.length,3);

  const restored=importProfileBackup(exportProfileBackup(p,startedAt+600_000));
  assert.deepEqual(restored,p);
  const fleet=screenHtml('fleet',restored);
  assert.match(fleet,/Capitão Northwind/);
  assert.match(fleet,/1 \/ 5/);
  const forge=screenHtml('forge',restored);
  assert.match(forge,/NÍVEL 1/);
  assert.match(forge,/Melhorar Hull por 80 moedas|Moedas insuficientes, faltam 50/);
  const shop=screenHtml('shop',restored);
  assert.match(shop,/Iron Jack already collected/);
  assert.match(shop,/Northwind already collected/);
  const cards=screenHtml('cards',restored);
  assert.match(cards,/3\/3/);
  assert.match(cards,/Northwind/);
  for(const screen of screens){
    const html=screenHtml(screen,restored);
    assert.ok(html.includes('aria-label="30 locally earned coins"'),screen+' restored wallet');
  }
});

test('3D Porto gesture gating includes real ship raycast, pointer cancellation and listener cleanup',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(scene,/ray\.intersectObject\(this\.ships\.player\.root,true\)/);
  assert.match(scene,/if\(!hit&&!this\.shipPointers\.size\)/);
  assert.match(scene,/this\.shipPointers\.add\(event\.pointerId\)/);
  assert.match(scene,/this\.shipPointers\.delete\(event\.pointerId\)/);
  assert.match(scene,/if\(this\.shipPointers\.size===0\)/);
  for(const name of ['pointerdown','pointermove','pointerup','pointercancel']){
    assert.ok(scene.includes("addEventListener('"+name+"'"),name+' must be registered');
    assert.ok(scene.includes("removeEventListener('"+name+"'"),name+' must be removed on dispose');
  }
  assert.match(scene,/showBattle\(\)\{this\.shipPointers\.clear\(\)/);
});
