import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {initialProfile} from '../src/progression.ts';
import {MissionsPanel, RankingPanel} from '../src/work8-panels.tsx';

const noop=()=>{};
const profile=initialProfile();
const renderMissions=()=>renderToStaticMarkup(React.createElement(MissionsPanel,{
  profile,onDaily:noop,onMission:noop,onNavigate:noop
}));
const renderRanking=()=>renderToStaticMarkup(React.createElement(RankingPanel,{
  profile,tab:'ranking',onTab:noop,onNavigate:noop
}));

test('07: art crops only three approved mission icons and unclaimed chests 4–7',()=>{
  const html=renderMissions();
  for(const crop of ['quest-swords','quest-ship','quest-target','chest-silver','chest-gold','chest-violet','chest-royal']){
    assert.equal((html.match(new RegExp('data-work8-crop="'+crop+'"','g'))||[]).length,1,crop);
  }
  assert.equal((html.match(/class="w8-approved-quest"/g)||[]).length,3);
  assert.equal((html.match(/class="w8-approved-chest"/g)||[]).length,7);
  assert.equal((html.match(/class="app-week-day/g)||[]).length,7);
  assert.match(html,/viewBox="15 160 51 48"/);
  assert.match(html,/07-missoes\.webp/);
  assert.doesNotMatch(html,/Vence 3 batalhas|50000|325700|4860/);
});

test('08: one live local profile, 4 unavailable places and approved decorative portrait/league art',()=>{
  const html=renderRanking();
  assert.equal((html.match(/data-work8-crop="captain"/g)||[]).length,2);
  assert.equal((html.match(/data-work8-crop="league-badge"/g)||[]).length,1);
  assert.equal((html.match(/class="w8-approved-empty-rank"/g)||[]).length,4);
  assert.match(html,/POSIÇÃO INDISPONÍVEL/);
  assert.match(html,/O TEU PERFIL LOCAL/);
  assert.match(html,/LIGA OFFLINE/);
  assert.match(html,/viewBox="19 155 89 78"/);
  assert.match(html,/08-ranking-perfil\.webp/);
  assert.doesNotMatch(html,/CapitãoNero|LadyCorsária|SilverJack|3920|3760/);
});

test('approved crops cannot replace stateful UI, global dock or other workers',()=>{
  const tsx=readFileSync(new URL('../src/work8-panels.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/work8-panels.css',import.meta.url),'utf8');
  const change=css.split('WORK8 / #104 · approved pictorial details from native 384×512 source.')[1];
  assert.ok(change);
  assert.match(change,/\.w8-approved-missions/);
  assert.match(change,/\.w8-approved-ranking/);
  assert.doesNotMatch(change,/\.app-dock|\.harbour-nav|\.w4-|\.w7-|\.app-sheet/);
  assert.match(tsx,/W8ApprovedPainting art=\{n===4/);
  assert.match(tsx,/n<=visibleStreak&&<b>✓<\/b>/);
  assert.ok(existsSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)));
  assert.ok(existsSync(new URL('../../assets/design-approved/08-ranking-perfil.webp',import.meta.url)));
});

test('07/08: native engraved title overlays retain semantic titles and honest local data',()=>{
  const mission=renderMissions(),rank=renderRanking();
  assert.equal((mission.match(/data-work8-crop="title-missions"/g)||[]).length,1);
  assert.equal((rank.match(/data-work8-crop="title-ranking"/g)||[]).length,1);
  assert.match(mission,/<h2>MISSÕES<\/h2>/);
  assert.match(rank,/<h2>RANKING<\/h2>/);
  assert.match(mission,/viewBox="98 74 189 45"/);
  assert.match(rank,/viewBox="98 74 189 45"/);
  assert.equal((mission.match(/class="w8-approved-quest"/g)||[]).length,3);
  assert.equal((mission.match(/class="w8-approved-chest"/g)||[]).length,7);
  assert.equal((rank.match(/class="w8-approved-empty-rank"/g)||[]).length,4);
  assert.doesNotMatch(rank,/CapitãoNero|LadyCorsária|SilverJack/);
});
