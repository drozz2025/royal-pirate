/**
 * WORK 5 isolated QA: invoke actual route callbacks from React element trees.
 * No DOM/browser, real touch, iPhone, WebGL, or 1:1 visual validation is claimed.
 * Does not import WORK 2 models or modify any component/asset/workflow.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Harbour} from '../src/harbour.tsx';
import {PortoBottomNav} from '../src/porto-bottom-nav.tsx';
import {PortSidePanel,type PortSideId} from '../src/app-port-side.tsx';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {initialProfile,finishBattle,type LocalProfile} from '../src/progression.ts';

type ElementWithProps=React.ReactElement<Record<string,any>>;
const pages:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','profile',
  'ranking','chests','events','rewards','offers'
];
const tabDestinations:ReadonlyArray<AppScreenId|null>=[null,'fleet','cards','shop','ranking'];
const profile:LocalProfile={...initialProfile(),playerName:'Capitão Azul',coins:140};
const noop=()=>{};
function descendants(node:React.ReactNode,type:string):ElementWithProps[]{
  const found:ElementWithProps[]=[];
  const visit=(item:React.ReactNode):void=>{
    if(Array.isArray(item)){item.forEach(visit);return;}
    if(!React.isValidElement(item))return;
    const el=item as ElementWithProps;
    if(el.type===type)found.push(el);
    visit(el.props.children as React.ReactNode);
  };
  visit(node);
  return found;
}
const hasClass=(el:ElementWithProps,value:string)=>
  String(el.props.className??'').split(/\s+/).includes(value);
function click(button:ElementWithProps){
  assert.notEqual(button.props.disabled,true,'must not click disabled control');
  assert.equal(typeof button.props.onClick,'function','visible action without onClick');
  button.props.onClick();
}

test('WORK5 Porto: all six flank buttons, dock routes, battle and account controls invoke real callbacks',()=>{
  const routes:AppScreenId[]=[];
  let battles=0;
  const tree=Harbour({
    profile,onNavigate:next=>{routes.push(next);},onBattle:()=>{battles++;}
  });
  const buttons=descendants(tree,'button');
  const flank=buttons.filter(b=>hasClass(b,'harbour-flank-button'));
  const tabs=buttons.filter(b=>hasClass(b,'harbour-nav-item'));
  assert.equal(flank.length,6);
  assert.equal(tabs.length,5);
  flank.forEach(click);
  assert.deepEqual(routes,['battle','chests','events','rewards','missions','offers']);
  assert.equal(tabs.filter(b=>b.props.disabled).length,1);
  assert.equal(tabs[0].props['aria-current'],'page');
  assert.equal(tabs[0].props.disabled,true,'Porto current tab cannot be a dead clickable link');
  tabs.slice(1).forEach(click);
  assert.deepEqual(routes.slice(6),['fleet','cards','shop','ranking']);
  const battle=buttons.find(b=>hasClass(b,'harbour-battle-button'));
  assert.ok(battle);click(battle);
  assert.equal(battles,1);
  const account=buttons.find(b=>hasClass(b,'harbour-profile'));
  const settings=buttons.find(b=>hasClass(b,'harbour-settings'));
  assert.ok(account);assert.ok(settings);
  click(account);click(settings);
  assert.deepEqual(routes.slice(-2),['profile','profile']);
});

test('WORK5 bottom dock: all twelve pages have five honest actions with correct enabled routes',()=>{
  for(const screen of pages){
    const routes:AppScreenId[]=[];
    let returns=0;
    const tree=PortoBottomNav({
      screen,profile,onNavigate:next=>{routes.push(next);},onPorto:()=>{returns++;}
    });
    const buttons=descendants(tree,'button');
    assert.equal(buttons.length,5,'five approved dock controls: '+screen);
    const active=screen==='forge'?'fleet':screen==='profile'?'ranking':
      tabDestinations.includes(screen)?screen:null;
    const expected:AppScreenId[]=[];
    for(let i=0;i<5;i++){
      const b=buttons[i],target=tabDestinations[i];
      assert.ok(b.props['aria-label'],'unlabelled tab on '+screen);
      if(target===active){
        assert.equal(b.props.disabled,true,'current tab not disabled on '+screen);
        assert.equal(b.props['aria-current'],'page');
        continue;
      }
      assert.notEqual(b.props.disabled,true,'blocked non-current tab '+screen);
      click(b);
      if(target===null)assert.equal(returns,1,'Porto return missing: '+screen);
      else expected.push(target);
    }
    assert.deepEqual(routes,expected,'wrong destination from '+screen);
    assert.equal(returns,1,'every sheet must return directly to Porto');
  }
});

test('WORK5 four Porto side pages have primary CTAs wired to valid destinations',()=>{
  const cases:ReadonlyArray<{id:PortSideId;target:'missions'|'shop'}>=[
    {id:'chests',target:'missions'},{id:'events',target:'missions'},
    {id:'rewards',target:'missions'},{id:'offers',target:'shop'}
  ];
  for(const {id,target} of cases){
    const routes:string[]=[];
    const tree=PortSidePanel({screen:id,profile,onNavigate:screen=>{routes.push(screen);}});
    const buttons=descendants(tree,'button');
    assert.equal(buttons.length,1,id+' unexpected or missing primary CTA');
    assert.ok(hasClass(buttons[0],'app-side-primary'),id);
    assert.ok(String(buttons[0].props.children).trim().length>0,id+' has no accessible text');
    click(buttons[0]);
    assert.deepEqual(routes,[target],id+' CTA does not route');
  }
});

test('WORK5 all twelve sheets render named dialogs, labels, functioning visible dock and no dead fragment anchors',()=>{
  for(const screen of pages){
    const html=renderToStaticMarkup(React.createElement(AppScreens,{
      screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
      onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
      onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
    }));
    assert.match(html,/role="dialog" aria-modal="true"/,screen);
    assert.match(html,/aria-labelledby="app-screen-title"/,screen);
    assert.equal((html.match(/id="app-screen-title"/g)||[]).length,1,screen);
    assert.match(html,/aria-label="Back to harbour/,screen);
    assert.match(html,/aria-label="Main game screens"/,screen);
    assert.match(html,/aria-label="140 moedas de ouro ganhas localmente"/,screen);
    assert.equal((html.match(/class="harbour-nav-item/g)||[]).length,5,screen);
    assert.doesNotMatch(html,/<a\b[^>]*href=["']#["']/i,screen+' dead # link');
  }
});

test('WORK5 Porto/profile wallet and editable name remain consistent after completed battles',()=>{
  const completed=finishBattle(finishBattle(initialProfile(),'victory',4,5,Date.parse('2026-11-19T08:00:00Z')),
    'defeat',1,5,Date.parse('2026-11-19T08:30:00Z'));
  const saved={...completed,playerName:'Capitã Maré'};
  const porto=renderToStaticMarkup(React.createElement(Harbour,{profile:saved,onNavigate:noop,onBattle:noop}));
  const captain=renderToStaticMarkup(React.createElement(AppScreens,{
    screen:'profile',profile:saved,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onSetPlayerName:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
  }));
  assert.match(porto,/aria-label="35 locally earned coins"/);
  assert.match(captain,/aria-label="35 moedas de ouro ganhas localmente"/);
  assert.match(porto,/Capitã Maré/);
  assert.match(captain,/value="Capitã Maré"/);
  assert.match(captain,/id="app-player-name"/);
  assert.match(captain,/aria-describedby="app-player-name-help"/);
  assert.match(captain,/type="submit"/);
  assert.match(captain,/SAVE BACKUP/);
  assert.match(captain,/RESTORE BACKUP/);
});

test('WORK5 source contract: direct ship hit, pointer cancellation and scoped portrait shell remain implemented',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
  assert.match(scene,/this\.shipPointers\.add\(event\.pointerId\)/);
  assert.match(scene,/this\.shipPointers\.delete\(event\.pointerId\)/);
  assert.match(main,/onPointerCancelCapture=\{onSceneAimEnd\}/);
  assert.match(index,/width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.equal(manifest.orientation,'portrait-primary');
  // These structural assertions do NOT establish real pinch, scrolling, touch accuracy or frame rate.
});

test.todo('WORK5 #527: live Battle header brand href="#" must navigate somewhere useful');
test.todo('WORK5 #90: real ten-second/ten-shot and abandonment rules require a functional fix and browser test');
test.todo('WORK5 mobile: real Chromium touch/pinch and no-overflow at 320/375/390/430 px require browser evidence');
