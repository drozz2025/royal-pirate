/**
 * WORK 5 — corruption/recovery smoke tests on the eight principal WebPreview
 * destinations. Exercises production parsers and React SSR, not a browser,
 * physical iPhone, connected economy, visual parity, or real touch.
 * Scope: WebPreview/tests/ only; no production code or deployment changes.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {
  initialProfile,parseProfile,exportProfileBackup,importProfileBackup,
  type LocalProfile
} from '../src/progression.ts';

const noop=()=>{};
const main:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','ranking','profile'
];
const stamp=Date.parse('2026-11-21T16:30:00.000Z');

function renderPanel(route:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen:route,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,
    backupMessage:''
  }));
}
function renderPort(profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(Harbour,{
    profile,onBattle:noop,onNavigate:noop
  }));
}
function assertAllEightRender(profile:LocalProfile,coins:number,label:string):void {
  assert.equal(profile.coins,coins,label+' wallet');
  const port=renderPort(profile);
  assert.match(port,/aria-label="Royal Pirate Porto"/,label+' Porto');
  assert.match(port,/class="harbour-nav-item/,label+' Porto navigation');
  for(const route of main){
    const html=renderPanel(route,profile);
    assert.match(html,/role="dialog" aria-modal="true"/,label+' '+route+' dialog');
    assert.match(html,/aria-label="Recursos do capitão"/,label+' '+route+' resources');
    assert.match(html,/aria-label="Main game screens"/,label+' '+route+' bottom navigation');
    assert.equal((html.match(/class="harbour-nav-item/g)||[]).length,5,
      label+' '+route+' must retain exactly five dock actions');
    assert.doesNotMatch(html,/\b(?:NaN|Infinity)\b/,label+' '+route+' non-finite UI text');
  }
}

test('WORK5: missing, truncated or unsupported local saves cold-start safely on all eight destinations',()=>{
  const bad:Array<[string,string|null]>=[
    ['missing',null],['empty',''],['truncated','{"version":1'],
    ['array','[]'],['primitive','42'],['null JSON','null'],
    ['future schema','{"version":9,"coins":5000000}'],
    ['unversioned','{"coins":300}']
  ];
  for(const [label,raw] of bad){
    const loaded=parseProfile(raw);
    assert.deepEqual(loaded,initialProfile(),label+' should cold-start cleanly');
    assertAllEightRender(loaded,0,label);
  }
});

test('WORK5: malformed nested v1 values cannot crash Porto or any of the eight principal screens',()=>{
  const corrupt=[
    {version:1,coins:140,upgrades:null,ownedCrew:[],equippedCrew:'navigator',
      claimedMissions:'first-win',battleLog:'invalid',dailyStreak:-1},
    {version:1,coins:140,upgrades:{hull:900,cannons:-2,sails:'bad'},
      ownedCrew:['navigator','navigator','unknown'],equippedCrew:'unknown',
      claimedMissions:['first-win','first-win','no-such-id'],shots:-2,hits:1e15},
    {version:1,coins:140,playerName:'Captain QA',xp:-7,wins:1.5,
      losses:1e20,shots:0,hits:0,lastDailyDay:'not-a-date',
      upgrades:[],claimedMissions:{id:'first-win'},battleLog:[null,{}]}
  ];
  for(const [index,raw] of corrupt.entries()){
    const profile=parseProfile(JSON.stringify(raw));
    assert.equal(profile.coins,140);
    assert.ok(profile.ownedCrew.includes('captain'),'starter captain missing '+index);
    assert.ok(profile.ownedCrew.includes(profile.equippedCrew),'unowned selected crew '+index);
    assert.ok(Object.values(profile.upgrades).every(n=>Number.isInteger(n)&&n>=0&&n<=5));
    assert.ok(profile.hits>=0&&profile.shots>=0);
    assertAllEightRender(profile,140,'corrupt nested save '+index);
  }
});

test('WORK5: untrusted saved name is HTML-escaped and a valid independent 140-gold backup remains recoverable',()=>{
  const untrusted=parseProfile(JSON.stringify({
    ...initialProfile(),coins:140,playerName:'<script>alert(1)</script>'
  }));
  const markup=renderPort(untrusted);
  assert.match(markup,/&lt;script&gt;/,'captain name must be rendered as escaped text');
  assert.doesNotMatch(markup,/<script>alert\(1\)<\/script>/i,
    'local player name must never become executable markup');
  assertAllEightRender(untrusted,140,'untrusted captain name');

  const trusted={...initialProfile(),coins:140,playerName:'Capitao Backup'};
  const backup=exportProfileBackup(trusted,stamp);
  const recovered=importProfileBackup(backup);
  assert.deepEqual(recovered,trusted,'valid backup changed during restoration');
  assert.deepEqual(parseProfile(JSON.stringify(recovered)),trusted,
    'valid recovered profile lost data on the next local reload');
  assertAllEightRender(recovered,140,'recovered 140-gold captain');
});
