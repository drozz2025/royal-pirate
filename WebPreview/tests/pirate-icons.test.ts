import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PirateIcon,type PirateIconName} from '../src/app-icons.tsx';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {initialProfile} from '../src/progression.ts';
import {readFileSync} from 'node:fs';

const icons:PirateIconName[]=['battle','fleet','forge','cards','shop','missions','profile'];
const noop=()=>{};

test('seven original nautical SVGs are distinct, scalable and decorative',()=>{
  const drawings=new Set<string>();
  for(const name of icons){
    const html=renderToStaticMarkup(React.createElement(PirateIcon,{name,size:28}));
    assert.match(html,/width="28" height="28"/);
    assert.match(html,/aria-hidden="true"/);
    assert.match(html,/focusable="false"/);
    assert.ok(html.includes('data-pirate-icon="'+name+'"'));
    assert.match(html,/<path\b/);
    drawings.add(html.replace(/data-pirate-icon="[^"]+"/,''));
  }
  assert.equal(drawings.size,7);
});

test('all seven mobile panels use shared icons with visible navigation labels',()=>{
  const props={profile:initialProfile(),onNavigate:noop,onClose:noop,onBattle:noop,onInspect:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,
    onExportBackup:noop,onImportBackup:noop,backupMessage:''};
  for(const screen of icons as AppScreenId[]){
    const html=renderToStaticMarkup(React.createElement(AppScreens,{...props,screen}));
    assert.match(html,/aria-label="Main game screens"/);
    assert.match(html,/aria-label="Other screens"/);
    for(const name of ['fleet','cards','battle','shop','profile'])assert.ok(html.includes('data-pirate-icon="'+name+'"'));
  }
});

test('live harbour navigation and battle controls use the same nautical vectors',()=>{
  const html=renderToStaticMarkup(React.createElement(Harbour,{profile:initialProfile(),onBattle:noop,onInspect:noop,onNavigate:noop}));
  for(const name of icons)assert.ok(html.includes('data-pirate-icon="'+name+'"'));
  assert.match(html,/aria-label="Game screens"/);
  assert.match(html,/aria-label="Battle: enter playable naval combat"/);
});

test('icon styles retain focus contrast, reduced motion and mobile sizing',()=>{
  const a=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
  const h=readFileSync(new URL('../src/harbour.css',import.meta.url),'utf8');
  assert.ok(a.includes('.app-dock button .app-tab-glyph svg'));
  assert.ok(a.includes('.app-sheet button:focus-visible'));
  assert.ok(a.includes('prefers-reduced-motion'));
  assert.ok(h.includes('.harbour-nav-item>span .pirate-icon'));
});
