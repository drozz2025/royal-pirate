import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens} from '../src/app-screens.tsx';
import {initialProfile,finishBattle,claimDaily,claimMission,buyCrew,equipCrew,improve,
  exportProfileBackup,importProfileBackup,parseProfile,missionProgress,upgradeCost} from '../src/progression.ts';

const date=Date.parse('2026-11-15T10:00:00.000Z');
const noop=()=>{};
const show=(screen:'profile'|'shop'|'forge'|'missions',profile:ReturnType<typeof initialProfile>)=>
  renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,onBuyCrew:noop,
    onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));

test('daily reward, battles, crew purchase, forge and mission claims use conserved local coins',()=>{
  let p=initialProfile();
  p=claimDaily(p,date);
  assert.equal(p.coins,20);
  p=finishBattle(p,'victory',3,5,date+1_000);
  assert.equal(p.coins,55);
  p=claimMission(p,'first-win');
  assert.equal(p.coins,80);
  p=buyCrew(p,'gunner');
  assert.equal(p.coins,20);
  p=equipCrew(p,'gunner');
  assert.equal(p.equippedCrew,'gunner');
  p=finishBattle(p,'victory',4,5,date+2_000);
  assert.equal(p.coins,55);
  assert.equal(missionProgress(p,'five-hits'),5);
  assert.equal(upgradeCost('hull',0),45);
  p=improve(p,'hull');
  assert.equal(p.coins,10);
  p=claimMission(p,'five-hits');
  assert.equal(p.coins,45);
  assert.equal(p.upgrades.hull,1);
  assert.equal(p.wins,2);
  assert.equal(p.hits,7);
  assert.equal(p.shots,10);
  assert.equal(p.xp,100);
  const unchanged=p;
  assert.equal(claimDaily(p,date),unchanged,'same UTC day cannot pay twice');
  assert.equal(claimMission(p,'first-win'),unchanged,'mission cannot be redeemed twice');
  assert.equal(buyCrew(p,'gunner'),unchanged,'owned crew cannot be bought twice');
  assert.equal(buyCrew(p,'navigator'),unchanged,'insufficient currency blocks purchase');
  assert.equal(improve(p,'hull'),unchanged,'unaffordable second upgrade blocked');
  assert.equal(claimMission(p,'three-battles'),unchanged,'unfinished mission cannot pay');
  const backup=exportProfileBackup(p,date+3_000);
  const restored=importProfileBackup(backup);
  assert.deepEqual(restored,p,'all valid progression survives local JSON backup');
  assert.deepEqual(parseProfile(JSON.stringify(restored)),p,'saved browser profile round-trips');

  const shop=show('shop',restored);
  assert.match(shop,/Iron Jack/);
  assert.match(shop,/Northwind/);
  assert.match(shop,/Need 45 more local coins to recruit Northwind/);
  const forge=show('forge',restored);
  assert.match(forge,/Hull/);
  assert.match(forge,/Earn 35 more local coins to upgrade/);
  const profile=show('profile',restored);
  assert.match(profile,/Active crew: Iron Jack/);
  assert.match(profile,/Recent battles/);
  assert.match(profile,/2 \/ 12 saved/);
  const missions=show('missions',restored);
  assert.match(missions,/Captain&#x27;s Orders|Captain's Orders/);
  assert.match(missions,/Seven consecutive daily rewards/);
  assert.match(missions,/Daily Supply Chest/);
  assert.match(missions,/CLAIMED/);
});

test('bounded battle history does not corrupt future saves or lifetime totals',()=>{
  let p=initialProfile();
  for(let i=0;i<16;i++){
    const outcome=i%3===0?'defeat':'victory';
    p=finishBattle(p,outcome,2,3,date+i*60_000);
  }
  assert.equal(p.wins,10);
  assert.equal(p.losses,6);
  assert.equal(p.shots,48);
  assert.equal(p.hits,32);
  assert.equal(p.coins,350);
  assert.equal(p.xp,560);
  assert.equal(p.battleLog.length,12);
  assert.equal(p.battleLog[0].completedAt,new Date(date+15*60_000).toISOString());
  assert.equal(p.battleLog[11].completedAt,new Date(date+4*60_000).toISOString());
  assert.deepEqual(importProfileBackup(exportProfileBackup(p,date+20*60_000)),p);
  assert.match(show('profile',p),/12 \/ 12 saved/);
});

test('import blocks invalid ledger entries even if headline coin totals look plausible',()=>{
  const p=finishBattle(initialProfile(),'victory',2,3,date);
  const file=JSON.parse(exportProfileBackup(p,date+1_000));
  file.profile.battleLog[0].earnedCoins=350;
  assert.throws(()=>importProfileBackup(JSON.stringify(file)),/battle history/);
  file.profile.battleLog[0].earnedCoins=35;
  file.profile.battleLog[0].hits=99;
  assert.throws(()=>importProfileBackup(JSON.stringify(file)),/battle history/);
});
