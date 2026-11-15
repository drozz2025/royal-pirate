import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppScreens } from '../src/app-screens';
import { initialProfile, finishBattle, missionProgress, claimMission, claimDaily, parseProfile, canClaimDaily } from '../src/progression';

const noop=()=>{};
const props={onNavigate:noop,onClose:noop,onBattle:noop,onBuyCrew:noop,onEquipCrew:noop,
  onUpgrade:noop,onMission:noop,onDaily:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''};

test('mosaic missions render Portuguese tabs, real objectives and accessible daily claim',()=>{
  const html=renderToStaticMarkup(React.createElement(AppScreens,{...props,screen:'missions',profile:initialProfile()}));
  for(const tab of ['DIÁRIAS','SEMANAIS','EVENTOS'])assert.ok(html.includes(tab));
  assert.match(html,/Recompensa diária/i);
  assert.match(html,/aria-label="Categorias de missões"/);
  assert.match(html,/role="progressbar"/);
  assert.match(html,/disabled=""/);
  assert.match(html,/IR PARA A BATALHA/);
  assert.doesNotMatch(html,/fake leaderboard|global rank #1/i);
});

test('ranking uses only locally earned battles, real profile and honest leagues',()=>{
  const user=finishBattle(initialProfile(),'victory',4,7,Date.UTC(2026,10,15,9));
  const html=renderToStaticMarkup(React.createElement(AppScreens,{...props,screen:'ranking',profile:user}));
  assert.match(html,/O MEU PERFIL/);
  assert.match(html,/LIGAS/);
  assert.match(html,/There is no global leaderboard yet/);
  assert.match(html,/VITÓRIAS/);
  assert.match(html,/app-cta/);
  assert.doesNotMatch(html,/ranked #[0-9]|Player [0-9]+/i);
  const profile=renderToStaticMarkup(React.createElement(AppScreens,{...props,screen:'profile',profile:user}));
  assert.match(profile,/O MEU PERFIL/);
  assert.match(profile,/SAVE BACKUP/);
  assert.match(profile,/RESTORE BACKUP/);
});

test('missions and daily reward pay only after real progress and once per claim',()=>{
  const p=initialProfile();
  assert.equal(missionProgress(p,'first-win'),0);
  assert.deepEqual(claimMission(p,'first-win'),p);
  const won=finishBattle(p,'victory',5,7,Date.UTC(2026,10,15,10));
  assert.equal(missionProgress(won,'first-win'),1);
  const claimed=claimMission(won,'first-win');
  assert.equal(claimed.coins,won.coins+25);
  assert.deepEqual(claimMission(claimed,'first-win'),claimed);
  const date=Date.UTC(2026,10,15,12);
  const daily=claimDaily(claimed,date);
  const restored=parseProfile(JSON.stringify(daily));
  assert.equal(canClaimDaily(restored,date),false);
  assert.deepEqual(claimDaily(restored,date),restored);
});
