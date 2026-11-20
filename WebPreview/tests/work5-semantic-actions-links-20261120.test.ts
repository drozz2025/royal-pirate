/**
 * WORK 5 independent HTML accessibility and navigation audit.
 * React SSR contracts only: this DOES NOT claim real browser/phone interaction,
 * WebGL ship selection, actual pinch zoom, or working external destinations.
 * No application, style, Unity, or deployment files are modified.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {initialProfile} from '../src/progression.ts';

const noop=()=>{};
const routes:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','ranking','profile',
  'chests','events','rewards','offers'
];
function htmlFor(screen:AppScreenId):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile:initialProfile(),onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));
}
function attr(attributes:string,name:string):string {
  const match=attributes.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'));
  return match?.[1]??'';
}
function readable(inner:string):string {
  return inner.replace(/<svg\\b[^>]*>[\\s\\S]*?<\\/svg>/gi,'')
    .replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#\\d+);/g,' ')
    .replace(/\\s+/g,' ').trim();
}
const buttons=(html:string)=>[...html.matchAll(/<button\\b([^>]*)>([\\s\\S]*?)<\\/button>/g)]
  .map(m=>({attributes:m[1],body:m[2],name:attr(m[1],'aria-label')||readable(m[2])}));
const anchors=(html:string)=>[...html.matchAll(/<a\\b([^>]*)>([\\s\\S]*?)<\\/a>/g)]
  .map(m=>({attributes:m[1],body:m[2],href:attr(m[1],'href')}));

test('WORK5: all 12 modal destinations and Porto expose non-empty names for rendered buttons',()=>{
  const pages=[
    ['Porto',renderToStaticMarkup(React.createElement(Harbour,{
      profile:initialProfile(),onBattle:noop,onNavigate:noop
    }))] as const,
    ...routes.map(route=>[route,htmlFor(route)] as const)
  ];
  for(const [route,html] of pages){
    const items=buttons(html);
    assert.ok(items.length>=5,'No actionable controls rendered: '+route);
    for(const [index,button] of items.entries()){
      assert.ok(button.name.trim(),
        'Unlabelled button '+index+' in '+route+': '+button.attributes.slice(0,120));
      assert.doesNotMatch(button.attributes,/\\btabIndex="-1"(?=[^>]*disabled)/,
        'Disabled keyboard focus mismatch in '+route);
    }
    if(route!=='Porto'){
      assert.match(html,/<section\\b[^>]*role="dialog"[^>]*aria-modal="true"/,
        'Modal semantics missing in '+route);
      assert.match(html,/aria-labelledby="app-screen-title"/,
        'Dialog is missing its visible heading reference in '+route);
      assert.equal((html.match(/id="app-screen-title"/g)||[]).length,1,
        'Accessible heading id duplicated in '+route);
    }
  }
});

test('WORK5: no empty, placeholder or javascript links in any modal; external links declare safe target relation',()=>{
  for(const route of routes){
    for(const [index,link] of anchors(htmlFor(route)).entries()){
      assert.ok(link.href,'Missing href on '+route+' link '+index);
      assert.ok(!/^\\s*(?:#|javascript:|data:|about:blank)\\s*$/i.test(link.href),
        'Dead/dangerous href in '+route+': '+link.href);
      const target=attr(link.attributes,'target');
      if(target==='_blank'){
        const rel=attr(link.attributes,'rel');
        assert.match(rel,/\\b(?:noopener|noreferrer)\\b/,
          'External blank-target link missing safe relation in '+route+': '+link.href);
      }
      assert.ok(attr(link.attributes,'aria-label')||readable(link.body),
        'Unnamed anchor in '+route+': '+link.href);
    }
  }
});

test('WORK5: all five bottom-route controls remain labelled, local profile save/restore is not a dead placeholder',()=>{
  for(const route of routes){
    const html=htmlFor(route);
    const nav=html.match(/<nav\\b[^>]*aria-label="Main game screens"[^>]*>([\\s\\S]*?)<\\/nav>/);
    assert.ok(nav,'Missing labelled dock on '+route);
    const tabs=buttons(nav![1]);
    assert.equal(tabs.length,5,'Wrong number of dock controls on '+route);
    assert.ok(tabs.every(tab=>tab.name.trim().length>0),'Unnamed dock route in '+route);
    // Secondary sheets do not correspond to a bottom-tab destination.
    // Frota/Forja and Ranking/Perfil share one selected parent tab.
    const expectedCurrent=['fleet','forge','cards','shop','ranking','profile'].includes(route)?1:0;
    assert.equal((html.match(/aria-current="page"/g)||[]).length,expectedCurrent,
      'Wrong current navigation state in '+route);
  }
  const profile=htmlFor('profile');
  assert.match(profile,/SAVE BACKUP/);
  assert.match(profile,/RESTORE BACKUP/);
  assert.match(profile,/OFFLINE|LOCAL ONLY/);
});
