/**
 * WORK 5 — independent QA at late-game local progression and legacy-save boundaries.
 * Uses real production domain functions and server-rendered UI; NOT browser taps,
 * physical iPhone validation, global multiplayer, artwork approval or deployment.
 * QA-only file. No production, WORK0/2/4/6, Unity, main or Sites changes.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {
  initialProfile,finishBattle,claimMission,claimDaily,buyCrew,equipCrew,
  improve,exportProfileBackup,importProfileBackup,parseProfile,
  type LocalProfile,type UpgradeId,type MissionId
} from '../src/progression.ts';

const NOW=Date.parse('2026-11-21T07:00:00.000Z');
const SCREENS:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','ranking','profile',
  'chests','events','rewards','offers'
];
const UPGRADES:UpgradeId[]=['hull','cannons','sails'];
const MISSIONS:MissionId[]=['first-win','five-hits','three-battles'];
const noop=()=>{};
const render=(screen:AppScreenId,profile:LocalProfile)=>renderToStaticMarkup(
  React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onSetPlayerName:noop,onExportBackup:noop,
    onImportBackup:noop,backupMessage:''
  })
);
const harbour=(profile:LocalProfile)=>renderToStaticMarkup(
  React.createElement(Harbour,{profile,onBattle:noop,onNavigate:noop})
);
function earnedCaptain():LocalProfile{
  let p=initialProfile();
  for(let i=0;i<80;i++)
    p=finishBattle(p,'victory',2,3,NOW-100_000+i*1_000);
  for(const id of MISSIONS)p=claimMission(p,id);
  p=claimDaily(p,NOW);
  p=buyCrew(p,'gunner');
  p=buyCrew(p,'navigator');
  p=equipCrew(p,'navigator');
  for(const id of UPGRADES)
    for(let level=0;level<5;level++)p=improve(p,id);
  return p;
}
function attributes(attrs:string,name:string):string {
  const found=attrs.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"','i'));
  return found?.[1]??'';
}
function buttonName(attrs:string,inner:string):string {
  return attributes(attrs,'aria-label')||inner
    .replace(/<svg\\b[^>]*>[\\s\\S]*?<\\/svg>/gi,'')
    .replace(/<[^>]+>/g,' ').replace(/&(?:amp|lt|gt|quot|nbsp|#\\d+);/g,' ')
    .replace(/\\s+/g,' ').trim();
}
function freezeDeep<T>(value:T):T {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const child of Object.values(value as object))freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

test('WORK5: eighty earned victories, all purchases, capped upgrades and all claims survive a strict backup',()=>{
  const p=earnedCaptain();
  assert.equal(p.wins,80);
  assert.equal(p.xp,4_000);
  assert.equal(p.coins,820,'80 wins (2800) + 3 missions (100) + daily (20) - crew (150) - upgrades (1950)');
  assert.equal(p.battleLog.length,12);
  assert.deepEqual(p.ownedCrew,['captain','gunner','navigator']);
  assert.equal(p.equippedCrew,'navigator');
  assert.ok(UPGRADES.every(id=>p.upgrades[id]===5));
  assert.equal(p.claimedMissions.length,3);
  assert.equal(p.dailyStreak,1);
  for(const id of UPGRADES)assert.strictEqual(improve(p,id),p,'max upgrade still charges: '+id);
  for(const id of MISSIONS)assert.strictEqual(claimMission(p,id),p,'mission paid twice: '+id);
  assert.strictEqual(claimDaily(p,NOW+1_000),p,'daily reward paid twice on one UTC day');
  assert.strictEqual(buyCrew(p,'gunner'),p);
  assert.strictEqual(buyCrew(p,'navigator'),p);
  const restored=importProfileBackup(exportProfileBackup(p,NOW+2_000));
  assert.deepEqual(restored,p,'late-game save changed while restoring');
  assert.notStrictEqual(restored,p,'restored profile must not alias live memory');
});

test('WORK5: all twelve screens remain named, navigable and read-only after earning everything',()=>{
  const p=freezeDeep(earnedCaptain());
  const before=JSON.stringify(p);
  const formatted=new Intl.NumberFormat('pt-PT').format(p.coins);
  const pages:[string,string][]=[['porto',harbour(p)],...SCREENS.map(id=>[id,render(id,p)] as [string,string])];
  for(const [name,html] of pages){
    assert.ok(html.includes('<strong>'+formatted+'</strong>'),
      name+': earned wallet disappeared');
    const buttons=[...html.matchAll(/<button\\b([^>]*)>([\\s\\S]*?)<\\/button>/g)];
    assert.ok(buttons.length>=5,name+': rendered no real controls');
    for(const [i,match] of buttons.entries())
      assert.ok(buttonName(match[1],match[2]),name+': unlabelled action '+i);
    for(const anchor of html.matchAll(/<a\\b([^>]*)>/g)){
      const href=attributes(anchor[1],'href');
      assert.ok(href&&!/^(?:#|javascript:|data:|about:blank)$/i.test(href),
        name+': dead or dangerous link '+href);
      if(attributes(anchor[1],'target')==='_blank')
        assert.match(attributes(anchor[1],'rel'),/\\b(?:noopener|noreferrer)\\b/,
          name+': unsafe external blank-tab link');
    }
    if(name==='porto'){
      assert.match(html,/aria-label="Royal Pirate Porto"/);
      assert.equal((html.match(/class="harbour-nav-item/g)||[]).length,5);
    }else{
      assert.match(html,/<section\\b[^>]*role="dialog"[^>]*aria-modal="true"/,
        name+': modal lost semantics');
      assert.equal((html.match(/id="app-screen-title"/g)||[]).length,1,
        name+': modal heading missing/duplicated');
      assert.match(html,/aria-labelledby="app-screen-title"/);
      assert.equal((html.match(/class="harbour-nav-item/g)||[]).length,5,
        name+': lost bottom navigation');
      assert.ok(html.includes('aria-label="'+p.coins+' moedas de ouro ganhas localmente"'),
        name+': wallet diverged from local save');
    }
  }
  assert.equal(JSON.stringify(p),before,
    'rendering the late-game profile mutated saved coins, crew or rewards');
});

test('WORK5: older v1 backup without battle receipts keeps rich rewards and escapes a supplied captain name on all routes',()=>{
  const modern=JSON.parse(exportProfileBackup(earnedCaptain(),NOW+4_000));
  delete modern.profile.battleLog; // supported early v1 backup before battle history existed
  modern.profile.playerName='<img src=x>';
  const restored=importProfileBackup(JSON.stringify(modern));
  assert.deepEqual(restored.battleLog,[],'legacy restore invented historical battles');
  assert.equal(restored.wins,80,'legacy restore wiped lifetime totals');
  assert.equal(restored.coins,820,'legacy restore wiped local wallet');
  assert.equal(restored.playerName,'<img src=x>');
  assert.deepEqual(parseProfile(JSON.stringify(restored)),restored,
    'legacy restoration is not stable after local reload');
  for(const [route,html] of [
    ['porto',harbour(restored)] as const,
    ...SCREENS.map(id=>[id,render(id,restored)] as const)
  ]){
    assert.ok(html.includes('&lt;img src=x&gt;'),route+': captain name was not preserved as text');
    assert.ok(!html.includes('<img src=x>'),route+': captain name was injected as executable markup');
  }
  for(const id of MISSIONS)
    assert.strictEqual(claimMission(restored,id),restored,
      'legacy restore reopened a collected mission');
  assert.strictEqual(claimDaily(restored,NOW+5_000),restored,
    'legacy restore reopened an already claimed daily reward');
});
