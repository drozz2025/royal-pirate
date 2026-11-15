import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {Harbour} from '../src/harbour.tsx';
import {initialProfile, type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
const render=(profile:LocalProfile)=>renderToStaticMarkup(React.createElement(Harbour,{
  profile,onBattle:noop,onInspect:noop,onNavigate:noop
}));
const css=readFileSync(new URL('../src/harbour.css',import.meta.url),'utf8');

test('harbour shows only earned local coins and verified battle wins, without fake gems',()=>{
  const html=render({...initialProfile(),coins:175,wins:3});
  assert.match(html,/175 locally earned coins/);
  assert.match(html,/3 victories from real battles/);
  assert.match(html,/>175<\/strong><small>COINS/);
  assert.match(html,/>3<\/strong><small>WINS/);
  assert.doesNotMatch(html,/unimplemented resource counters|<strong>—<\/strong>/);
  assert.match(html,/Local captain statistics/);
});

test('arena milestone reflects real results and caps the visual bar at ten wins',()=>{
  const empty=render(initialProfile());
  assert.match(empty,/aria-label="Victories towards ten-win milestone"[^>]*aria-valuenow="0"/);
  assert.match(empty,/style="width:0%"/);
  const mid=render({...initialProfile(),wins:3});
  assert.match(mid,/aria-valuenow="3"/);
  assert.match(mid,/style="width:30%"/);
  assert.match(mid,/3 VICTORIES · LOCAL 10-WIN MILESTONE/);
  const advanced=render({...initialProfile(),wins:16});
  assert.match(advanced,/aria-valuenow="10"/);
  assert.match(advanced,/style="width:100%"/);
  assert.match(advanced,/16 VICTORIES · LOCAL 10-WIN MILESTONE/);
});

test('port navigation opens distinct forge and fleet screens; no false online ranking',()=>{
  const source=readFileSync(new URL('../src/harbour.tsx',import.meta.url),'utf8');
  assert.match(source,/onNavigate\('forge'\)/);
  assert.match(source,/screen:'fleet'/);
  assert.match(source,/title: 'PROFILE', screen:'profile'/);
  assert.doesNotMatch(source,/title: 'RANKING'/);
  const html=render(initialProfile());
  assert.match(html,/data-pirate-icon="fleet"/);
  assert.match(html,/data-pirate-icon="cards"/);
  assert.match(html,/data-pirate-icon="missions"/);
  assert.match(html,/ONLINE RANKING &amp; IAP NOT LIVE/);
});

test('premium mobile portrait layout retains safe area, contrast, and reduced-motion support',()=>{
  assert.match(css,/harbour-stat\{/);
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(css,/safe-area-inset-top/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/harbour-nav-item:focus-visible/);
});
