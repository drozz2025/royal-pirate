/**
 * WORK 5 — independent, server-rendered QA for dynamic Profile state.
 * Checks save feedback, user-controlled text and personal progress at the
 * boundaries. No claims about browser clicks, mobile hardware, or deployed UI.
 * Only tests are changed; WORK 0/2/4/6/7/8 production sources are untouched.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens} from '../src/app-screens.tsx';
import {initialProfile,parseProfile,type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
function profileHtml(profile:LocalProfile=initialProfile(),backupMessage=''):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen:'profile',profile,backupMessage,onNavigate:noop,onClose:noop,
    onBattle:noop,onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,
    onMission:noop,onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop
  }));
}
function tag(html:string,expression:RegExp,label:string):string {
  const found=html.match(expression);
  assert.ok(found,label+' is missing');
  return found![0];
}

test('WORK5: local restore status is announced, escaped and absent when no result exists',()=>{
  const empty=profileHtml();
  assert.doesNotMatch(empty,/class="app-backup-status"/,
    'Empty backup feedback must not announce a stale restore');
  const unsafe='<script>alert(1)</script>& "restored"';
  const html=profileHtml(initialProfile(),unsafe);
  const status=tag(html,/<p\b[^>]*class="app-backup-status"[^>]*>[\s\S]*?<\/p>/,
    'local backup result status');
  assert.match(status,/role="status"/);
  assert.match(status,/aria-live="polite"/);
  assert.ok(status.includes('&lt;script&gt;alert(1)&lt;/script&gt;'),
    'untrusted save feedback was not escaped');
  assert.ok(!status.includes('<script>'),'untrusted backup feedback became live HTML');
  assert.ok(status.includes('&amp;'),'untrusted ampersand was not escaped');
  assert.equal((html.match(/class="app-backup-status"/g)||[]).length,1,
    'a single backup result must not appear more than once');
  assert.match(html,/>[^<]*SAVE BACKUP<\/button>/);
  assert.match(html,/>[^<]*RESTORE BACKUP<\/button>/);
});

test('WORK5: saved captain input has a real label, 20-char limit and no redundant Save action',()=>{
  const safe=profileHtml();
  const input=tag(safe,/<input\b[^>]*id="app-player-name"[^>]*\/?\s*>/,
    'captain name input');
  assert.match(input,/maxlength="20"/i);
  assert.match(input,/value="Jogador"/);
  assert.match(input,/aria-describedby="app-player-name-help"/);
  assert.match(safe,/<label\b[^>]*for="app-player-name"[^>]*>/);
  const button=tag(safe,/<button\b[^>]*type="submit"[^>]*>/,'captain Save control');
  assert.match(button,/\bdisabled\b/,
    'Save should not be actionable until the captain changes their name');
  const name='<b>X</b>';
  const edited=parseProfile(JSON.stringify({...initialProfile(),playerName:name}));
  assert.equal(edited.playerName,name);
  const loaded=profileHtml(edited);
  const loadedInput=tag(loaded,/<input\b[^>]*id="app-player-name"[^>]*\/?\s*>/,
    'restored captain name input');
  assert.ok(loadedInput.includes('value="&lt;b&gt;X&lt;/b&gt;"'),
    'restored captain name escaped incorrectly');
  assert.ok(!loaded.includes('<b>X</b>'),'captain name was injected as markup');
  assert.match(tag(loaded,/<button\b[^>]*type="submit"[^>]*>/,'restored Save control'),
    /\bdisabled\b/,'restoring the same name must not suggest unsaved edits');
});

test('WORK5: lifetime 1/3/5/10 win milestones keep accessible values and capped fill',()=>{
  const targets=[1,3,5,10];
  for(const wins of [0,1,2,3,4,5,9,10,11,100]){
    const html=profileHtml({...initialProfile(),wins});
    const bar=tag(html,/<div\b[^>]*class="app-captain-route-track"[^>]*>/,
      'captain milestone progressbar');
    assert.match(bar,/role="progressbar"/);
    assert.match(bar,/aria-valuemin="0"/);
    assert.match(bar,/aria-valuemax="10"/);
    assert.ok(bar.includes('aria-valuenow="'+Math.min(wins,10)+'"'),
      'screen reader victory total is wrong at '+wins+' wins');
    assert.ok(html.includes('style="width:'+Math.min(wins,10)*10+'%"'),
      'milestone fill drift at '+wins+' wins');
    const steps=tag(html,/<ol\b[^>]*class="app-captain-route-steps"[^>]*>[\s\S]*?<\/ol>/,
      'captain milestone thresholds');
    assert.equal((steps.match(/<li\b/g)||[]).length,4);
    assert.equal((steps.match(/<li\b[^>]*class="is-earned"/g)||[]).length,
      targets.filter(n=>wins>=n).length,
      'earned milestone mismatch at '+wins+' wins');
    assert.match(html,/Personal milestones use completed battles on this device/,
      'local-only milestone status must not be misrepresented as online ranking');
  }
});
