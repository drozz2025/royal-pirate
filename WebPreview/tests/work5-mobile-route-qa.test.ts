import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Harbour} from '../src/harbour.tsx';
import {AppScreens, type AppScreenId} from '../src/app-screens.tsx';
import {initialProfile} from '../src/progression.ts';

/** Integration smoke tests without a browser: no screenshot or physical iPhone claim.
 * The Porto component is hook-free, so its actual onClick closures can be invoked.
 * React SSR checks every sheet's markup while the existing GitHub workflow compiles it.
 */
type ButtonProps = {
  'aria-label'?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: string;
  children?: React.ReactNode;
};
function buttonsWithin(root:React.ReactNode):React.ReactElement<ButtonProps>[] {
  const result:React.ReactElement<ButtonProps>[]=[];
  const visit=(node:React.ReactNode):void=>{
    if(Array.isArray(node)){node.forEach(visit);return;}
    if(!React.isValidElement(node))return;
    const el=node as React.ReactElement<ButtonProps>;
    if(el.type==='button')result.push(el);
    visit(el.props.children);
  };
  visit(root);
  return result;
}
const noop=()=>{};
const appProps={profile:initialProfile(),onNavigate:noop,onClose:noop,onBattle:noop,
  onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
  onExportBackup:noop,onImportBackup:noop,backupMessage:''};
const allSheets:AppScreenId[]=[
  'battle','fleet','forge','cards','shop','missions','profile',
  'ranking','chests','events','rewards','offers'
];

test('Porto buttons dispatch each actual destination, not inert decorative taps',()=>{
  const visits:AppScreenId[]=[];
  let battles=0;
  const tree=Harbour({profile:initialProfile(),onNavigate:id=>visits.push(id),
    onBattle:()=>{battles++;}});
  const buttons=buttonsWithin(tree);
  assert.equal(buttons.length,14,'2 header, 6 flank, 1 battle, 5 dock controls');
  for(const button of buttons){
    assert.equal(button.props.type,'button','button must not submit an unrelated form');
    if(!button.props.disabled)assert.equal(typeof button.props.onClick,'function',
      'active Porto is the only non-clickable navigation item');
  }
  const click=(accessibleLabel:string):void=>{
    const match=buttons.find(button=>button.props['aria-label']===accessibleLabel);
    assert.ok(match,'missing control: '+accessibleLabel);
    assert.equal(match.props.disabled,undefined,'route disabled: '+accessibleLabel);
    match.props.onClick?.();
  };
  const destinations:Array<[string,AppScreenId]>=[
    ['Enter the training arena briefing','battle'],
    ['Daily supply ready: claim 20 local coins in Missions','chests'],
    ['View event availability','events'],
    ['View earned local rewards','rewards'],
    ['View local missions','missions'],
    ['View offer availability','offers'],
    ['FROTA','fleet'],['CARTAS','cards'],['LOJA','shop'],['RANKING','ranking'],
    ['Captain profile and local settings','profile']
  ];
  destinations.forEach(([label,screen],index)=>{
    click(label);
    assert.equal(visits[index],screen,'incorrect destination for '+label);
  });
  assert.equal(visits.length,destinations.length);
  const port=buttons.find(button=>button.props['aria-label']==='Porto, current screen');
  assert.equal(port?.props.disabled,true,'active Porto must be labelled, not routed elsewhere');
  assert.equal(port?.props.onClick,undefined);
  click('Batalha: iniciar combate naval jogável');
  assert.equal(battles,1);
  assert.equal(visits.length,destinations.length,'battle bypasses a fake route');
});

test('every reachable screen has a labelled, dismissible, keyboard-friendly sheet',()=>{
  for(const screen of allSheets){
    const html=renderToStaticMarkup(React.createElement(AppScreens,{...appProps,screen}));
    assert.match(html,/role="dialog" aria-modal="true"/,screen);
    assert.match(html,/aria-labelledby="app-screen-title"/,screen);
    assert.match(html,/<h1[^>]*id="app-screen-title"/,screen);
    assert.match(html,/aria-label="Back to harbour"/,screen);
    assert.match(html,/aria-label="Main game screens"/,screen);
    assert.match(html,/class="app-sheet-content"/,screen);
    assert.doesNotMatch(html,/href="#"/,screen+' has a dead placeholder link');
    const dock=html.match(/<nav class="app-dock" aria-label="Main game screens">([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(dock,'missing bottom navigation on '+screen);
    assert.equal((dock.match(/<button\b/g)||[]).length,5,screen+' bottom navigation');
    assert.ok((html.match(/<button\b/g)||[]).length>=7,screen+' needs a return and route controls');
  }
});

test('actual mobile shell preserves safe areas, tap-through ship and escape/back paths',()=>{
  const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
  const main=read('../src/main.tsx'), harbourCss=read('../src/harbour.css');
  const sheetCss=read('../src/app-screens.css'), scene=read('../src/scene.ts');
  const sheet=read('../src/app-screens.tsx');
  assert.match(main,/setAppScreen\(null\)/);
  assert.match(main,/onClose=\{\(\)=>setAppScreen\(null\)\}/);
  assert.match(sheet,/onKeyDown=\{onDialogKeyDown\}/);
  assert.match(sheet,/titleRef\.current\?\.focus\(\)/);
  assert.match(sheet,/if\(event\.key!=='Tab'\)return/);
  assert.match(harbourCss,/safe-area-inset-top/);
  assert.match(harbourCss,/safe-area-inset-bottom/);
  assert.match(sheetCss,/safe-area-inset-top/);
  assert.match(sheetCss,/safe-area-inset-bottom/);
  assert.match(harbourCss,/\.harbour-screen\{[\s\S]*?pointer-events:none/);
  assert.match(scene,/this\.canvas\.addEventListener\('pointerdown',this\.shipPointerDown,true\)/);
  assert.match(scene,/this\.canvas\.addEventListener\('pointermove',this\.shipPointerMove,true\)/);
  assert.match(scene,/this\.controls\.enableRotate=true;this\.controls\.enableZoom=true/);
  assert.match(main,/view\.current\?\.showBattle\(\)/);
  assert.match(main,/view\.current\?\.showHarbour\(\)/);
  assert.match(main,/window\.confirm\(/,'restoring a backup requires confirmation');
  assert.match(main,/onChange=\{restoreBackup\}/);
  assert.match(read('../index.html'),/viewport-fit=cover/);
  assert.match(harbourCss,/prefers-reduced-motion/);
});
