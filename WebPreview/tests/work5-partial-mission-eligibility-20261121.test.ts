/**
 * WORK 5 — partial mission eligibility / accessible progress regression.
 * Checks real domain functions and React SSR, not browser taps, physical iPhone,
 * online ranking, or the graphical 1:1 approval. Tests only; no production edits.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens} from '../src/app-screens.tsx';
import {
  initialProfile,finishBattle,claimMission,missionProgress,
  exportProfileBackup,importProfileBackup,MISSIONS,
  type LocalProfile,type MissionId
} from '../src/progression.ts';

const EPOCH=Date.parse('2026-11-21T17:00:00.000Z');
const noop=()=>{};
const ids:MissionId[]=['three-battles','five-hits','first-win'];
const markup=(profile:LocalProfile)=>renderToStaticMarkup(React.createElement(AppScreens,{
  screen:'missions',profile,onNavigate:noop,onClose:noop,onBattle:noop,
  onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
  onDaily:noop,onExportBackup:noop,onImportBackup:noop,
  onSetPlayerName:noop,backupMessage:''
}));

function check(profile:LocalProfile,expected:Record<MissionId,'active'|'ready'|'claimed'>){
  const html=markup(profile);
  const rows=[...html.matchAll(/<article class="w8-approved-quest" data-state="([^"]+)">([\s\S]*?)<\/article>/g)];
  assert.equal(rows.length,3,'Mission cards missing or duplicated');
  for(const [index,id] of ids.entries()){
    const mission=MISSIONS.find(item=>item.id===id)!;
    const [_,state,row]=rows[index];
    assert.equal(state,expected[id],'Wrong eligibility for '+id);
    const bar=row.match(/<div class="w8-approved-meter"[^>]*role="progressbar"[^>]*>/);
    assert.ok(bar,'Missing accessible progress for '+id);
    const attr=(name:string)=>bar![0].match(new RegExp(name+'="([^"]*)"'))?.[1];
    assert.equal(attr('aria-valuemin'),'0');
    assert.equal(attr('aria-valuemax'),String(mission.target));
    assert.equal(attr('aria-valuenow'),String(missionProgress(profile,id)));
    assert.ok(attr('aria-label')?.includes('progresso'),'Unnamed mission progress: '+id);
    assert.ok(row.includes(missionProgress(profile,id)+'/'+mission.target),
      'Visible progress disagrees with screen-reader progress: '+id);
    const action=[...row.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].at(-1);
    assert.ok(action,'Mission action is missing: '+id);
    assert.equal(action[2],state==='claimed'?'FEITO':state==='ready'?'RECOLHER':'JOGAR',
      'Action label does not match mission eligibility: '+id);
    assert.equal(/\bdisabled(?:=""|\s|$)/.test(action[1]),state==='claimed',
      'Only collected missions may disable their action: '+id);
  }
}

test('WORK5: partial 2/3 battles and 3/5 hits keep only first-victory reward claimable',()=>{
  let p=finishBattle(initialProfile(),'victory',2,3,EPOCH);
  p=finishBattle(p,'defeat',1,2,EPOCH+1000);
  assert.equal(p.coins,35);
  check(p,{'three-battles':'active','five-hits':'active','first-win':'ready'});
  for(const id of ['three-battles','five-hits'] as MissionId[]){
    assert.strictEqual(claimMission(p,id),p,'Premature mission payment: '+id);
  }
  const paid=claimMission(p,'first-win');
  assert.equal(paid.coins,60,'First victory should award precisely 25 extra local coins');
  check(paid,{'three-battles':'active','five-hits':'active','first-win':'claimed'});
  assert.strictEqual(claimMission(paid,'first-win'),paid,'First-win reward replayed');
  assert.equal(p.coins,35,'Claim mutated the pre-claim profile');
});

test('WORK5: five hits during two defeats unlock only accuracy mission, not victory or battle-count',()=>{
  let p=finishBattle(initialProfile(),'defeat',3,4,EPOCH);
  p=finishBattle(p,'defeat',2,3,EPOCH+1000);
  assert.equal(p.wins,0);
  assert.equal(p.coins,0);
  check(p,{'three-battles':'active','five-hits':'ready','first-win':'active'});
  assert.strictEqual(claimMission(p,'first-win'),p);
  assert.strictEqual(claimMission(p,'three-battles'),p);
  p=claimMission(p,'five-hits');
  assert.equal(p.coins,35,'Five real hits must give one 35-coin mission reward');
  p=importProfileBackup(exportProfileBackup(p,EPOCH+2000));
  check(p,{'three-battles':'active','five-hits':'claimed','first-win':'active'});
  assert.strictEqual(claimMission(p,'five-hits'),p,'Restore must not reopen collected reward');
});

test('WORK5: three misses-only defeats unlock battle-count alone; local backup preserves all independent states',()=>{
  let p=initialProfile();
  for(let i=0;i<3;i++)p=finishBattle(p,'defeat',0,3,EPOCH+i*1000);
  assert.equal(p.coins,0);
  assert.equal(p.losses,3);
  check(p,{'three-battles':'ready','five-hits':'active','first-win':'active'});
  p=claimMission(p,'three-battles');
  assert.equal(p.coins,40,'Three completed losses must still count for participation mission');
  const recovered=importProfileBackup(exportProfileBackup(p,EPOCH+4000));
  assert.deepEqual(recovered,p,'Independent mission eligibility lost on restore');
  check(recovered,{'three-battles':'claimed','five-hits':'active','first-win':'active'});
  for(const id of ids)assert.strictEqual(claimMission(recovered,id),recovered,
    'Restored mission paid again or an ineligible mission was collected: '+id);
});
