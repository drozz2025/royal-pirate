/**
 * WORK 5 — wallet/read-only UI regression after local state changes.
 * React server rendering + progression domain only; NOT a physical iPhone,
 * Chromium interaction test, multiplayer or proof of cloud persistence.
 * Adds tests only; does not modify another Work's application files.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {
  initialProfile,finishBattle,buyCrew,improve,claimDaily,
  parseProfile,exportProfileBackup,importProfileBackup,
  type LocalProfile
} from '../src/progression.ts';

const noOp=()=>{};
const screens:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','ranking','profile'
];
const epoch=Date.parse('2026-11-20T09:00:00.000Z');

function render(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noOp,onClose:noOp,onBattle:noOp,
    onBuyCrew:noOp,onEquipCrew:noOp,onUpgrade:noOp,onMission:noOp,
    onDaily:noOp,onExportBackup:noOp,onImportBackup:noOp,
    onSetPlayerName:noOp,backupMessage:''
  }));
}
function verifyAllWallets(profile:LocalProfile,context:string) {
  for(const screen of screens) {
    const html=render(screen,profile);
    const balances=[...html.matchAll(
      /class="app-wallet app-wallet-gold"[^>]*aria-label="(\d+) moedas de ouro ganhas localmente"[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/g
    )];
    assert.equal(balances.length,1,`missing or duplicated accessible wallet on ${screen} (${context})`);
    assert.equal(Number(balances[0][1]),profile.coins,`accessible wallet stale on ${screen} (${context})`);
    assert.equal(Number(balances[0][2]),profile.coins,`visible wallet stale on ${screen} (${context})`);
    assert.match(html,/aria-label="Diamantes indisponíveis nesta versão/,
      `unimplemented gems should be labelled on ${screen} (${context})`);
  }
}

test('WORK5: 140 local coins remain 140 after repeated JSON reload and on all eight screens',()=>{
  let profile=initialProfile();
  for(let n=0;n<4;n++)profile=finishBattle(profile,'victory',3,5,epoch+n*1000);
  assert.equal(profile.coins,140);
  for(let n=0;n<12;n++){
    profile=parseProfile(JSON.stringify(profile));
    assert.equal(profile.coins,140,'JSON save/load changed local wallet at iteration '+n);
    verifyAllWallets(profile,'reload '+n);
  }
});

test('WORK5: purchase, upgrade, daily reward and backup visibly reconcile across every panel',()=>{
  let p=initialProfile();
  for(let n=0;n<4;n++)p=finishBattle(p,'victory',3,5,epoch+n*1000);
  const steps:Array<[string,number,(profile:LocalProfile)=>LocalProfile]>=[
    ['gunner purchase',80,x=>buyCrew(x,'gunner')],
    ['hull improvement',35,x=>improve(x,'hull')],
    ['daily reward',55,x=>claimDaily(x,epoch+6000)],
    ['duplicate daily',55,x=>claimDaily(x,epoch+6001)],
    ['defeat awards no gold',55,x=>finishBattle(x,'defeat',0,2,epoch+7000)],
    ['backup restore',55,x=>importProfileBackup(exportProfileBackup(x,epoch+8000))]
  ];
  verifyAllWallets(p,'before expenses');
  for(const [label,balance,mutate] of steps){
    p=mutate(p);
    assert.equal(p.coins,balance,'unexpected wallet delta: '+label);
    p=parseProfile(JSON.stringify(p));
    verifyAllWallets(p,label);
  }
});

test('WORK5: saved captain display name is escaped in rendered sheets without corrupting wallet',()=>{
  const p={...initialProfile(),playerName:'<svg onload=alert(1)>',coins:140};
  const loaded=parseProfile(JSON.stringify(p));
  assert.equal(loaded.coins,140);
  for(const screen of screens){
    const html=render(screen,loaded);
    assert.ok(!html.includes('<svg onload='),'unescaped stored user name in '+screen);
    assert.ok(html.includes('&lt;svg'),'stored user name not safely encoded in '+screen);
    verifyAllWallets(loaded,'escaped name '+screen);
  }
});
