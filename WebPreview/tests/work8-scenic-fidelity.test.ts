import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppScreens } from '../src/app-screens';
import { initialProfile } from '../src/progression';

const noop=()=>{};
const shared={profile:initialProfile(),onNavigate:noop,onClose:noop,onBattle:noop,
  onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
  onExportBackup:noop,onImportBackup:noop,onSetPlayerName:noop,backupMessage:''};

test('approved missions still use live quests with a purely decorative tropical backdrop',()=>{
  const html=renderToStaticMarkup(React.createElement(AppScreens,{...shared,screen:'missions'}));
  assert.match(html,/w8-approved-scene/);
  assert.match(html,/w8-seascape-missions/);
  assert.match(html,/aria-label="Categorias de missões"/);
  assert.equal((html.match(/class="w8-approved-quest"/g)||[]).length,3);
  assert.equal((html.match(/aria-label="DAY [1-7]"/g)||[]).length,7);
  assert.match(html,/>RECOLHER</);
});

test('ranking resembles five-place composition without pretending offline slots are global players',()=>{
  const html=renderToStaticMarkup(React.createElement(AppScreens,{...shared,screen:'ranking'}));
  assert.match(html,/w8-seascape-ranking/);
  assert.match(html,/TOP JOGADORES/);
  assert.match(html,/O TEU PERFIL LOCAL/);
  for(const slot of [2,3,4,5])assert.ok(html.includes('aria-label="Lugar '+slot+' indisponível"'));
  assert.match(html,/Ranking online indisponível/);
  assert.doesNotMatch(html,/CapitãoNero|LadyCorsária|MaréNegra|ReiDoMar/);
});
