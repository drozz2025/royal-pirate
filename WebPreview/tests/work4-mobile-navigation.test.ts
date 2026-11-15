import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {initialProfile, upgradeCost, type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
const render=(screen:AppScreenId,profile:LocalProfile=initialProfile())=>
  renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,
    onMission:noop,onDaily:noop,onExportBackup:noop,
    onImportBackup:noop,backupMessage:''
  }));
const dock=(html:string)=>html.match(/<nav class="app-dock"[^>]*>([\s\S]*?)<\/nav>/)?.[1]??'';

test('secondary app screen dock retains the exact five approved Porto destinations',()=>{
  for(const id of ['fleet','cards','forge','shop','missions','profile','ranking'] as AppScreenId[]){
    const nav=dock(render(id));
    assert.ok(nav,'Expected dock on '+id);
    for(const label of ['PORTO','FROTA','CARTAS','LOJA','RANKING'])assert.match(nav,new RegExp('>'+label+'<'));
    assert.equal((nav.match(/<button /g)||[]).length,5,'Five dock buttons on '+id);
    assert.doesNotMatch(nav,/GO TO BATTLE|PROFILE|MISSIONS|FORGE/);
    assert.match(nav,/aria-label="Porto, return to harbour"/);
  }
});

test('real secondary screens identify their selected tab without fake profile/ranking position',()=>{
  assert.match(dock(render('fleet')),/aria-label="FROTA" aria-current="page" data-active="true"/);
  assert.match(dock(render('forge')),/aria-label="FROTA" data-active="true"/);
  assert.match(dock(render('ranking')),/aria-label="RANKING" aria-current="page" data-active="true"/);
  assert.doesNotMatch(dock(render('profile')),/aria-current="page"/);
});

test('forge presents exactly three ship section controls and a single selected upgrade',()=>{
  const profile={...initialProfile(),coins:250,upgrades:{hull:2,cannons:3,sails:1}};
  const html=render('forge',profile);
  const selectors=html.match(/<div class="app-forge-mini-grid"[^>]*>([\s\S]*?)<\/div>/)?.[1]??'';
  assert.match(html,/aria-label="Select ship system to upgrade"/);
  assert.equal((selectors.match(/aria-controls="app-forge-selected-upgrade"/g)||[]).length,3);
  assert.equal((selectors.match(/aria-pressed="true"/g)||[]).length,1);
  assert.match(selectors,/Hull, level 2 of 5/);
  assert.match(selectors,/Cannons, level 3 of 5/);
  assert.match(selectors,/Sails, level 1 of 5/);
  assert.equal((html.match(/class="app-item app-upgrade-item"/g)||[]).length,1);
  assert.match(html,/id="app-forge-selected-upgrade"/);
  assert.match(html,/aria-label="Hull upgrade level"/);
  assert.match(html,new RegExp('Next level costs '+upgradeCost('hull',2)+' local coins'));
  assert.doesNotMatch(html,/aria-label="Cannons upgrade level"/);
});

test('forge cannot spend coins that are not available; local shop has no real money checkout',()=>{
  const fresh=render('forge');assert.match(fresh,/disabled=""[^>]*>45 ●<\/button>/);
  const shop=render('shop');assert.match(shop,/No cash purchases, gems or simulated stock/);
  assert.match(shop,/No real-money checkout is available/);
  assert.match(render('ranking'),/There is no global leaderboard yet/);
});
