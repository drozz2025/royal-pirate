import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens} from '../src/app-screens.tsx';
import {filterBattleHistory,summarizeBattleHistory} from '../src/battle-history.ts';
import {finishBattle,initialProfile} from '../src/progression.ts';

const no=()=>{};
const saved=finishBattle(
  finishBattle(
    finishBattle(initialProfile(),'victory',3,4,Date.parse('2026-11-12T12:00:00Z')),
    'defeat',0,2,Date.parse('2026-11-13T12:00:00Z')),
  'victory',2,3,Date.parse('2026-11-14T12:00:00Z'));

test('captain ledger never alters original records and filters only saved results',()=>{
  const old=saved.battleLog.map(x=>({...x}));
  const all=filterBattleHistory(saved.battleLog,'all');
  const wins=filterBattleHistory(saved.battleLog,'victory');
  const losses=filterBattleHistory(saved.battleLog,'defeat');
  assert.equal(all.length,3);assert.equal(wins.length,2);assert.equal(losses.length,1);
  assert.ok(wins.every(x=>x.outcome==='victory'));
  assert.ok(losses.every(x=>x.outcome==='defeat'));
  assert.deepEqual(saved.battleLog,old);
  assert.notStrictEqual(all,saved.battleLog);
});

test('recent sums count only the chosen 12-or-fewer saved battles, never full account coins',()=>{
  const all=summarizeBattleHistory(saved.battleLog);
  assert.deepEqual(all,{battles:3,wins:2,defeats:1,hits:5,shots:9,earnedXp:110,earnedCoins:70,accuracy:56});
  const wins=summarizeBattleHistory(filterBattleHistory(saved.battleLog,'victory'));
  assert.deepEqual(wins,{battles:2,wins:2,defeats:0,hits:5,shots:7,earnedXp:100,earnedCoins:70,accuracy:71});
  const losses=summarizeBattleHistory(filterBattleHistory(saved.battleLog,'defeat'));
  assert.deepEqual(losses,{battles:1,wins:0,defeats:1,hits:0,shots:2,earnedXp:10,earnedCoins:0,accuracy:0});
  assert.deepEqual(summarizeBattleHistory([]),{battles:0,wins:0,defeats:0,hits:0,shots:0,earnedXp:0,earnedCoins:0,accuracy:null});
  assert.equal(summarizeBattleHistory([{...saved.battleLog[0],shots:0,hits:0}]).accuracy,null);
});

test('profile exposes 3 accessible touch filters with truthful local-history summary',()=>{
  const html=renderToStaticMarkup(React.createElement(AppScreens,{
    screen:'profile',profile:saved,onNavigate:no,onClose:no,onBattle:no,
    onBuyCrew:no,onEquipCrew:no,onUpgrade:no,onMission:no,onDaily:no,
    onExportBackup:no,onImportBackup:no,backupMessage:''
  }));
  assert.match(html,/Filter recent battles by result/);
  assert.match(html,/app-history-filters/);
  assert.equal((html.match(/class="app-history-totals"/g)||[]).length,1);
  assert.equal((html.match(/class="app-battle-entry /g)||[]).length,3);
  assert.match(html,/RECENT COINS EARNED/);
  assert.match(html,/RECENT XP EARNED/);
  assert.match(html,/SELECTED ACCURACY/);
  assert.match(html,/latest 12 saved battles, not lifetime earnings/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/3 \/ 12 saved/);
  const css=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
  assert.match(css,/\.app-history-filters button\{[^}]*min-height:44px/);
});

test('fresh account never fabricates a battle or recent earnings',()=>{
  const html=renderToStaticMarkup(React.createElement(AppScreens,{
    screen:'profile',profile:initialProfile(),onNavigate:no,onClose:no,onBattle:no,
    onBuyCrew:no,onEquipCrew:no,onUpgrade:no,onMission:no,onDaily:no,
    onExportBackup:no,onImportBackup:no,backupMessage:''
  }));
  assert.match(html,/No completed battles recorded yet/);
  assert.doesNotMatch(html,/RECENT COINS EARNED/);
  assert.doesNotMatch(html,/app-battle-entry is-win|app-battle-entry is-loss/);
});
