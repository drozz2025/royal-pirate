import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {Harbour} from '../src/harbour.tsx';
import {initialProfile, type LocalProfile} from '../src/progression.ts';

const no=()=>{};
const render=(profile:LocalProfile)=>renderToStaticMarkup(React.createElement(Harbour,{profile,onBattle:no,onNavigate:no}));
const css=readFileSync(new URL('../src/harbour.css',import.meta.url),'utf8');

test('top bar has only actual earned coins and local wins; premium balances are not fabricated',()=>{
 const html=render({...initialProfile(),coins:175,wins:3});
 assert.match(html,/175 locally earned coins/);
 assert.match(html,/3 victories from real battles/);
 assert.match(html,/aria-label="Local captain statistics"/);
 assert.doesNotMatch(html,/GEMS|PREMIUM|<strong>—<\/strong>/);
 assert.match(html,/175<\/strong>/);
 assert.match(html,/3<\/strong>/);
});
test('level/experience bar comes directly from saved XP and honours the 20-level limit',()=>{
 const initial=render(initialProfile());
 assert.match(initial,/NV. 1/);
 assert.match(initial,/aria-label="Captain level experience"[^>]*aria-valuenow="0"/);
 const withXp=render({...initialProfile(),xp:40});
 assert.match(withXp,/aria-valuenow="50"/);
 const max=render({...initialProfile(),xp:100000});
 assert.match(max,/NV. 20/);
 assert.match(max,/aria-valuenow="100"/);
});
test('approved 5-tab bar includes Ranking but does not fake a global leaderboard',()=>{
 const src=readFileSync(new URL('../src/harbour.tsx',import.meta.url),'utf8');
 const html=render(initialProfile());
 assert.match(src,/title:'RANKING',icon:'ranking',screen:'ranking'/);
 assert.match(src,/title:'PORTO',icon:'port',screen:null/);
 assert.match(html,/data-pirate-icon="ranking"/);
 assert.match(html,/data-pirate-icon="cards"/);
 assert.match(html,/Local offline preview\. Online rankings and purchases are not available/);
 assert.doesNotMatch(src,/screen:'profile'\s*\}\s*\]/);
});
test('single plaques per side action with no group boxes and native mobile touches',()=>{
 assert.match(css,/harbour-flank-button\{/);
 assert.match(css,/harbour-flank\{/);
 assert.match(css,/pointer-events:auto/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/focus-visible/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
