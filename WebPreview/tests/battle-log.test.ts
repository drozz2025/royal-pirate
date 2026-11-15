import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens} from '../src/app-screens.tsx';
import {initialProfile,parseProfile,finishBattle,exportProfileBackup,importProfileBackup} from '../src/progression.ts';

const noop=()=>{};
const at=Date.parse('2026-11-15T06:00:00.000Z');
const screen=(profile:ReturnType<typeof initialProfile>)=>renderToStaticMarkup(React.createElement(AppScreens,{
  screen:'profile',profile,onNavigate:noop,onClose:noop,onBattle:noop,onInspect:noop,onBuyCrew:noop,
  onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
}));

test('a new captain has no fictional battles or log entries',()=>{
 const profile=initialProfile();
 assert.deepEqual(profile.battleLog,[]);
 const html=screen(profile);
 assert.match(html,/Recent battles/);
 assert.match(html,/No completed battles recorded yet/);
 assert.doesNotMatch(html,/class="app-battle-entry/);
});

test('completed battles append truthful rewards, time and hit statistics',()=>{
 const first=finishBattle(initialProfile(),'victory',3,5,at);
 const second=finishBattle(first,'defeat',7,4,at+60_000);
 assert.equal(second.wins,1);assert.equal(second.losses,1);
 assert.equal(second.battleLog.length,2);
 assert.deepEqual(second.battleLog[0],{outcome:'defeat',shots:4,hits:4,earnedCoins:0,earnedXp:10,completedAt:'2026-11-15T06:01:00.000Z'});
 assert.deepEqual(second.battleLog[1],{outcome:'victory',shots:5,hits:3,earnedCoins:35,earnedXp:50,completedAt:'2026-11-15T06:00:00.000Z'});
 assert.equal(second.coins,35);assert.equal(second.xp,60);
 const html=screen(second);
 assert.equal((html.match(/class="app-battle-entry/g)||[]).length,2);
 assert.match(html,/2026-11-15 06:01 UTC/);
 assert.match(html,/3 \/ 5 cannon hits/);
 assert.match(html,/\+35 COINS/);
 assert.match(html,/NO COINS/);
 assert.match(html,/datetime="2026-11-15T06:01:00.000Z"/);
});

test('journal is bounded to 12 newest entries while lifetime totals remain',()=>{
 let profile=initialProfile();
 for(let i=0;i<20;i++)profile=finishBattle(profile,i%2===0?'victory':'defeat',2,4,at+i*60_000);
 assert.equal(profile.battleLog.length,12);
 assert.equal(profile.battleLog[0].completedAt,'2026-11-15T06:19:00.000Z');
 assert.equal(profile.battleLog[11].completedAt,'2026-11-15T06:08:00.000Z');
 assert.equal(profile.wins,10);assert.equal(profile.losses,10);
 assert.deepEqual(parseProfile(JSON.stringify(profile)).battleLog,profile.battleLog);
});

test('legacy v1 saves without journal restore with an empty journal; tampered journal is rejected',()=>{
 const legacy=JSON.parse(exportProfileBackup(initialProfile(),at));
 delete legacy.profile.battleLog;
 assert.deepEqual(importProfileBackup(JSON.stringify(legacy)).battleLog,[]);
 const valid=JSON.parse(exportProfileBackup(finishBattle(initialProfile(),'victory',2,3,at),at));
 assert.equal(importProfileBackup(JSON.stringify(valid)).battleLog.length,1);
 valid.profile.battleLog[0].earnedCoins=999;
 assert.throws(()=>importProfileBackup(JSON.stringify(valid)),/Invalid local battle history/);
 assert.deepEqual(parseProfile(JSON.stringify(valid.profile)).battleLog,[]);
});

test('future or malformed log items never show up in local profile',()=>{
 const profile=finishBattle(initialProfile(),'victory',2,3,at);
 const malformed={...profile,battleLog:[{outcome:'victory',hits:9,shots:1,earnedXp:50,earnedCoins:35,completedAt:'bad'},...profile.battleLog]};
 assert.equal(parseProfile(JSON.stringify(malformed)).battleLog.length,1);
 assert.equal(parseProfile(JSON.stringify({...profile,battleLog:'not an array'})).battleLog.length,0);
});
