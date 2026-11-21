/**
 * WORK 5 — independent number-format, accessibility and save/reload QA.
 * Real React server-rendered panels + real progression functions. This does
 * NOT verify physical iPhone hit targets, live browser clicks, remote accounts,
 * real-money balances, publication or visual artwork parity.
 * Only tests; no application, Porto, WORK 0/2/4/6/7/8, Unity or main edits.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {
  initialProfile,parseProfile,finishBattle,claimMission,buyCrew,claimDaily,
  exportProfileBackup,importProfileBackup,type LocalProfile
} from '../src/progression.ts';

const sheets:readonly AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','ranking','profile'
];
const noop=()=>{};
const NOW=Date.parse('2026-11-21T12:00:00.000Z');
const ptGold=new Intl.NumberFormat('pt-PT');

function screenHtml(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop,backupMessage:''
  }));
}
function assertWallets(profile:LocalProfile,context:string):void {
  for(const screen of sheets){
    const html=screenHtml(screen,profile);
    const wallets=[...html.matchAll(
      /<div class="app-wallet app-wallet-gold" aria-label="([^"]+)">[\s\S]*?<strong>([^<]*)<\/strong>/g
    )];
    assert.equal(wallets.length,1,context+': missing/duplicated gold wallet on '+screen);
    assert.equal(wallets[0][1],profile.coins+' moedas de ouro ganhas localmente',
      context+': accessible amount disagrees with saved integer on '+screen);
    assert.equal(wallets[0][2],ptGold.format(profile.coins),
      context+': visible pt-PT amount differs from stored balance on '+screen);
    assert.ok(html.includes('aria-label="Diamantes indisponíveis nesta versão'),
      context+': unavailable premium balance misrepresented on '+screen);
    assert.match(html,/role="dialog"[^>]*aria-modal="true"/,
      context+': inaccessible modal on '+screen);
  }
}

test('WORK5: 0, 999, 1 000, 1 234 567 and 1 billion gold render exactly and accessibly on all eight screens',()=>{
  for(const coins of [0,1,140,999,1000,1001,1234567,1000000000]){
    const raw={...initialProfile(),coins};
    const restored=parseProfile(JSON.stringify(raw));
    assert.equal(restored.coins,coins,'local save unexpectedly changed legal integer '+coins);
    assertWallets(restored,'coin boundary '+coins);
    const backup=importProfileBackup(exportProfileBackup(restored,NOW));
    assert.equal(backup.coins,coins,'backup corrupted legal integer '+coins);
    assertWallets(backup,'backup boundary '+coins);
  }
});

test('WORK5: crossing a 1,000-gold display boundary preserves exact ledger through actions and restore',()=>{
  let profile:LocalProfile={...initialProfile(),coins:980};
  const actions:Array<[string,number,(p:LocalProfile)=>LocalProfile]>=[
    ['victory +35',1015,p=>finishBattle(p,'victory',2,4,NOW)],
    ['first mission +25',1040,p=>claimMission(p,'first-win')],
    ['gunner purchase -60',980,p=>buyCrew(p,'gunner')],
    ['UTC daily +20',1000,p=>claimDaily(p,NOW)]
  ];
  assertWallets(profile,'before boundary crossing');
  for(const [label,coins,act] of actions){
    const previous=structuredClone(profile);
    profile=act(profile);
    assert.equal(profile.coins,coins,label+': incorrect local arithmetic');
    assert.equal(profile.upgrades.hull,0,label+': unrelated ship upgrade changed');
    assert.equal(JSON.stringify(previous),JSON.stringify(parseProfile(JSON.stringify(previous))),
      label+': old saved snapshot was mutated');
    profile=parseProfile(JSON.stringify(profile));
    assertWallets(profile,label+' after localStorage-shaped reload');
    profile=importProfileBackup(exportProfileBackup(profile,NOW+1000));
    assertWallets(profile,label+' after explicit backup');
  }
  assert.deepEqual(profile.ownedCrew,['captain','gunner']);
  assert.deepEqual(profile.claimedMissions,['first-win']);
  assert.equal(profile.battleLog.length,1,'battle receipt lost while reformatting currency');
  assert.equal(profile.coins,1000);
});

test('WORK5: Profile accuracy stays finite and agrees with saved hits/shots alongside grouped coin amount',()=>{
  const cases:Array<[number,number,string]>=[
    [0,0,'—'],[0,10,'0%'],[11,30,'37%'],[13,20,'65%'],[25,25,'100%']
  ];
  for(const [hits,shots,expected] of cases){
    const profile=parseProfile(JSON.stringify({...initialProfile(),coins:1234567,hits,shots}));
    const html=screenHtml('profile',profile);
    assert.ok(html.includes('<small>ACCURACY</small><strong>'+expected+'</strong>'),
      'Profile accuracy does not represent '+hits+'/'+shots+' shots as '+expected);
    assert.doesNotMatch(html,/\b(?:NaN|Infinity)%\b/,'invalid accuracy leaked into UI');
    assertWallets(profile,'accuracy '+hits+'/'+shots);
  }
});
