import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FleetShowcase,fleetModuleSummary} from '../src/fleet-showcase.tsx';
import {initialProfile,upgradeCost,UPGRADES} from '../src/progression.ts';

const no=()=>{};
const css=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');

test('fleet inspector uses actual saved levels and never grants currency or fictitious battle bonuses',()=>{
  const profile=initialProfile();
  profile.coins=50;
  let hull=fleetModuleSummary(profile,'hull');
  assert.deepEqual(hull,{id:'hull',name:'Hull',level:0,maximum:false,cost:45,shortfall:0});
  profile.upgrades.hull=2;
  hull=fleetModuleSummary(profile,'hull');
  assert.equal(hull.cost,upgradeCost('hull',2));
  assert.equal(hull.shortfall,hull.cost-50);
  profile.upgrades.hull=5;
  hull=fleetModuleSummary(profile,'hull');
  assert.equal(hull.maximum,true);
  assert.equal(hull.cost,0);
  assert.equal(hull.shortfall,0);
  assert.equal(profile.coins,50);
  assert.equal(profile.upgrades.hull,5);
  for(const u of UPGRADES)assert.equal(fleetModuleSummary(initialProfile(),u.id).level,0);
});
test('mobile fleet module selector has exactly three accessible inspection buttons, plus the existing shipyard/crew links',()=>{
  const profile=initialProfile();
  profile.coins=0;
  const html=renderToStaticMarkup(React.createElement(FleetShowcase,{profile,onForge:no,onCrew:no}));
  for(const label of ['Inspect Hull, level 0 of 5','Inspect Cannons, level 0 of 5','Inspect Sails, level 0 of 5'])
    assert.ok(html.includes(label),label);
  assert.equal((html.match(/class="app-fleet-module-inspect"/g)||[]).length,3);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
  assert.equal((html.match(/aria-pressed="false"/g)||[]).length,2);
  assert.match(html,/role="status" aria-live="polite"/);
  assert.match(html,/need 45 more/);
  assert.match(html,/OPEN SHIPYARD/);
  assert.match(html,/MANAGE CREW/);
  assert.doesNotMatch(html,/BUY NOW|PREMIUM|IN-APP PURCHASE|MULTIPLAYER/);
  assert.match(css,/\.app-fleet-module\.is-selected/);
  assert.match(css,/\.app-fleet-blueprint\.is-cannons/);
  assert.match(css,/@media\(max-width:390px\)/);
});
test('inspector reports persisted captain and maxed upgrades without suggesting another charge',()=>{
  const profile=initialProfile();
  profile.upgrades.hull=5;
  profile.upgrades.cannons=5;
  profile.upgrades.sails=5;
  const html=renderToStaticMarkup(React.createElement(FleetShowcase,{profile,onForge:no,onCrew:no}));
  assert.match(html,/15 \/ 15/);
  assert.match(html,/Max local level reached/);
  assert.match(html,/Equipped captain/);
  assert.equal((html.match(/Maximum local level/g)||[]).length,3);
});
