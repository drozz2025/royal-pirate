/**
 * WORK 5: reference-integrity accessibility contracts in all eight game sheets.
 * Server-side React markup only. This does NOT simulate touch, keyboard focus,
 * iPhone hardware or functional navigation; live Chromium coverage is separate.
 * No production/WORK0/WORK2/WORK4/WORK6 files are modified.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {initialProfile} from '../src/progression.ts';

const screens:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','ranking','profile'
];
const noop=()=>{};
const render=(screen:AppScreenId)=>renderToStaticMarkup(
  React.createElement(AppScreens,{
    screen,profile:initialProfile(),onNavigate:noop,onClose:noop,
    onBattle:noop,onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,
    onMission:noop,onDaily:noop,onExportBackup:noop,
    onImportBackup:noop,onSetPlayerName:noop,backupMessage:''
  })
);
const attributes=(markup:string)=>
  [...markup.matchAll(/<([a-z][a-z0-9-]*)\b([^<>]*)>/gi)]
    .map(([_,tag,attrs])=>({tag:tag.toLowerCase(),attrs}));
const get=(attrs:string,key:string)=>{
  const m=attrs.match(new RegExp('(?:^|\\s)'+key+'="([^"]*)"','i'));
  return m?.[1]??null;
};

test('WORK5: eight sheets have unique functional IDs and every ARIA IDREF resolves',t=>{
  const knownSvgCollisions:string[]=[];
  for(const screen of screens){
    const markup=render(screen);
    const elements=attributes(markup);
    const idTags=elements.map(e=>({id:get(e.attrs,'id'),tag:e.tag}))
      .filter((e):e is {id:string;tag:string}=>e.id!==null);
    // Known production SVG paint collisions: PortoArt #711 and WORK7 CardArt
    // #712. Continue failing on duplicate *functional/non-gradient* HTML IDs.
    // Report every pre-existing SVG duplicate in CI diagnostics for its owner.
    const occurrences=new Map<string,string[]>();
    for(const {id,tag} of idTags)
      occurrences.set(id,[...(occurrences.get(id)||[]),tag]);
    for(const [id,tags] of occurrences){
      if(tags.length<=1)continue;
      if(tags.every(tag=>tag==='lineargradient'||tag==='radialgradient')){
        knownSvgCollisions.push(screen+'#'+id+'×'+tags.length);
        continue;
      }
      assert.fail(screen+': duplicate functional HTML ID #'+id+' ('+tags.join(',')+')');
    }
    const declared=new Set(occurrences.keys());
    let checked=0;
    for(const element of elements){
      for(const attr of ['aria-labelledby','aria-describedby','aria-controls','aria-owns','aria-activedescendant']){
        const refs=get(element.attrs,attr);
        if(refs===null)continue;
        for(const ref of refs.split(/\s+/).filter(Boolean)){
          checked++;
          assert.ok(declared.has(ref),
            screen+': '+element.tag+' '+attr+' points to missing #'+ref);
        }
      }
    }
    assert.ok(checked>0,screen+': expected at least one referenced accessible title');
    assert.ok(declared.has('app-screen-title'),screen+': missing modal title target');
  }
  if(knownSvgCollisions.length)
    t.diagnostic('Pre-existing duplicated SVG gradients (#711/#712): '+knownSvgCollisions.join('; '));
});

test('WORK5: labels name existing form inputs, and eight modal headings are focusable programmatically',()=>{
  for(const screen of screens){
    const elements=attributes(render(screen));
    const ids=new Set(elements.map(e=>get(e.attrs,'id')).filter(Boolean));
    for(const element of elements.filter(e=>e.tag==='label')){
      const target=get(element.attrs,'for')??get(element.attrs,'htmlFor');
      if(target!==null)assert.ok(ids.has(target),
        screen+': field label refers to missing control #'+target);
    }
    const dialog=elements.find(e=>get(e.attrs,'role')==='dialog');
    assert.ok(dialog,screen+': missing modal dialog');
    assert.equal(get(dialog!.attrs,'aria-labelledby'),'app-screen-title',
      screen+': dialog not linked to its title');
    const heading=elements.find(e=>get(e.attrs,'id')==='app-screen-title');
    assert.equal(heading?.tag,'h1',screen+': modal title not a heading');
    assert.equal(get(heading!.attrs,'tabindex'),'-1',
      screen+': title cannot receive programmatic focus after navigation');
  }
});

test('WORK5: dynamic local profile controls expose their accessible descriptions',()=>{
  const markup=render('profile');
  const elements=attributes(markup);
  const declared=new Set(elements.map(e=>get(e.attrs,'id')).filter(Boolean));
  const name=elements.find(e=>get(e.attrs,'id')==='app-player-name');
  assert.ok(name,'profile name field missing');
  assert.equal(name?.tag,'input','captain name no longer editable through an input');
  const help=get(name!.attrs,'aria-describedby');
  assert.ok(help&&declared.has(help),'captain name help is not reachable by screen readers');
  assert.ok(elements.some(e=>e.tag==='label'&&get(e.attrs,'for')==='app-player-name'),
    'name field has no visible associated label');
  const progress=elements.find(e=>get(e.attrs,'role')==='progressbar');
  assert.ok(progress,'victory milestones progressbar missing');
  const min=Number(get(progress!.attrs,'aria-valuemin'));
  const value=Number(get(progress!.attrs,'aria-valuenow'));
  const max=Number(get(progress!.attrs,'aria-valuemax'));
  assert.ok(Number.isFinite(value)&&min<=value&&value<=max,
    'captain victory milestones exposed an invalid progress value');
  assert.ok(get(progress!.attrs,'aria-label'),
    'captain victory progressbar has no accessible name');
});

// Existing SVG paint definitions require instance-scoped IDs in PortoArt (#711)
// and WORK7 CardArt (#712). This is tracked but production is owned elsewhere.
test.todo('WORK5: namespace repeated decorative SVG gradient IDs (#711 and #712)');
