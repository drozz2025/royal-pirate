/**
 * WORK 5 — malformed local save and high-boundary screen resilience.
 * Contract: real production parsers and React server markup on all eight sheets.
 * This is NOT a browser click, physical iPhone, cloud-sync or visual parity test.
 * Only this QA file is added; production, Porto, Unity and other Works untouched.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {
  initialProfile,parseProfile,finishBattle,exportProfileBackup,
  importProfileBackup,type LocalProfile
} from '../src/progression.ts';

const screens:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','ranking','profile'
];
const noop=()=>{};
function render(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop,backupMessage:''
  }));
}
function assertEightSheets(profile:LocalProfile,context:string) {
  for(const screen of screens) {
    const html=render(screen,profile);
    assert.match(html,/<section\b[^>]*role="dialog"[^>]*aria-modal="true"/,
      context+': '+screen+' modal missing');
    assert.match(html,/aria-labelledby="app-screen-title"/,
      context+': '+screen+' modal heading not connected');
    assert.equal((html.match(/id="app-screen-title"/g)||[]).length,1,
      context+': '+screen+' modal heading duplicated');
    assert.ok(html.includes('aria-label="'+profile.coins+' moedas de ouro ganhas localmente"'),
      context+': '+screen+' wallet not in sync with normalized local save');
    assert.equal((html.match(/class="app-wallet app-wallet-gold"/g)||[]).length,1,
      context+': '+screen+' wallet duplicated');
    assert.match(html,/aria-label="Diamantes indisponíveis nesta versão/,
      context+': '+screen+' suggests unsupported gem balance');
  }
}

test('WORK5: corrupt, outdated and partial localStorage saves cannot crash any of eight sheets',()=>{
  const candidates:(string|null)[]=[
    null,'','{broken','[]','null','42','"hello"',
    JSON.stringify({version:2,coins:999999999}),
    JSON.stringify({version:1,coins:-500,xp:-2,ownedCrew:['unknown'],
      equippedCrew:'unknown',claimedMissions:['unknown'],upgrades:null}),
    JSON.stringify({version:1,coins:NaN,upgrades:{hull:-8,cannons:99,sails:0},
      ownedCrew:['captain','captain','invalid'],claimedMissions:['invalid']}),
    JSON.stringify({version:1,playerName:'    ',coins:0,battleLog:[null,false,'invalid']})
  ];
  for(const [index,raw] of candidates.entries()) {
    const p=parseProfile(raw);
    assert.equal(p.version,1,'invalid save did not normalize to v1 at '+index);
    assert.equal(p.coins,0,'invalid save minted local currency at '+index);
    assert.ok(p.ownedCrew.includes(p.equippedCrew),
      'local save equipped crew not owned at '+index);
    assert.ok(p.upgrades.hull>=0&&p.upgrades.hull<=5);
    assert.ok(p.upgrades.cannons>=0&&p.upgrades.cannons<=5);
    assertEightSheets(p,'save variant '+index);
  }
});

test('WORK5: invalid battle receipts are discarded before Profile renders or backup is exported',()=>{
  const now=Date.parse('2026-11-21T04:00:00.000Z');
  let p=finishBattle(initialProfile(),'victory',2,4,now);
  p=finishBattle(p,'defeat',1,2,now+60_000);
  const valid=[...p.battleLog];
  const forged={...valid[0],earnedCoins:500};
  const invalidDate={...valid[1],completedAt:'2026-02-30T00:00:00.000Z'};
  const tampered={...p,battleLog:[valid[0],forged,invalidDate,valid[1]]};
  const repaired=parseProfile(JSON.stringify(tampered));
  assert.deepEqual(repaired.battleLog,valid,
    'invalid battle history was accepted into the visible profile');
  const html=render('profile',repaired);
  assert.equal((html.match(/<li class="app-battle-entry /g)||[]).length,2,
    'invalid historical receipts rendered as genuine battles');
  assert.ok(!html.includes('+500 COINS'),'forged payout appeared in Profile');
  const backedUp=importProfileBackup(exportProfileBackup(repaired,now+120_000));
  assert.deepEqual(backedUp.battleLog,valid,
    'export/import reintroduced invalid or hidden battle receipts');
  assertEightSheets(backedUp,'repaired battle log');
});

test('WORK5: maximum supported local currency and capped excess remain consistent across eight sheets',()=>{
  const now=Date.parse('2026-11-21T04:05:00.000Z');
  const high={...initialProfile(),coins:1_000_000_000,
    xp:250_000,wins:300,losses:20,hits:500,shots:800,
    playerName:'Capitão Extremo'};
  const restored=importProfileBackup(exportProfileBackup(high,now));
  assert.equal(restored.coins,1_000_000_000);
  assertEightSheets(restored,'maximum valid local wallet');
  const malformed={...restored,coins:1_000_000_001};
  const normalized=parseProfile(JSON.stringify(malformed));
  assert.equal(normalized.coins,0,'overflow must not be displayed as valid earnings');
  assertEightSheets(normalized,'out-of-range wallet');
  assert.equal(restored.coins,1_000_000_000,
    'normalizing a second profile modified the existing captain balance');
});
