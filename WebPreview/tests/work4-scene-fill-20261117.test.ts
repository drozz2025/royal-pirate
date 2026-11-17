import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FleetPanel,ForgePanel} from '../src/work4-fleet-forge.tsx';
import {initialProfile} from '../src/progression.ts';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const block=css.split('WORK4 / #104 / 17 Nov — scene-fill correction measured against 03/04.')[1];
const noop=()=>{};

test('WORK4 approved 03/04 are single-crop paintings without duplicated ship or cannon',()=>{
  const profile=initialProfile();
  const fleet=renderToStaticMarkup(React.createElement(FleetPanel,{
    profile,onCrew:noop,onForge:noop,onPorto:noop
  }));
  const forge=renderToStaticMarkup(React.createElement(ForgePanel,{
    profile,onUpgrade:noop,onFleet:noop
  }));
  assert.equal((fleet.match(/data-work4-crop="fleet"/g)||[]).length,1);
  assert.equal((forge.match(/data-work4-crop="forge"/g)||[]).length,1);
  assert.match(fleet,/viewBox="18 146 223 194"/);
  assert.match(forge,/viewBox="9 146 171 161"/);
  assert.match(fleet,/03-frota\.webp/);
  assert.match(forge,/04-melhorias-forja\.webp/);
  assert.match(forge,/w4-forge-live-levels/);
  assert.match(forge,/MATERIAIS E CUSTOS/);
});

test('aspect-driven tall composition is confined to 03/04 at 390 and 430, not 320 or 384x512',()=>{
  assert.ok(block,'scene-fill correction present');
  assert.match(block,/@media \(min-width:360px\) and \(max-width:659px\) and \(min-height:700px\)/);
  assert.match(block,/\.w4-fleet #w4-fleet-panel > \.w4-harbour-stage/);
  assert.match(block,/height:clamp\(280px,75vw,326px\)/);
  assert.match(block,/height:clamp\(235px,64vw,282px\)!important/);
  assert.match(block,/\.w4-forge #w4-forge-panel > \.w4-forge-stage/);
  assert.match(block,/height:clamp\(265px,69vw,306px\)/);
  assert.match(block,/height:clamp\(227px,60vw,265px\)!important/);
  assert.match(block,/native 384×512 crop stays exactly as WORK0 merged it/);
});

test('WORK4 rules cannot move global dock, hide progress or break blue-tile isolation',()=>{
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
  assert.doesNotMatch(block,/(?:\.app-dock|\.app-shell|\.porto-|\.harbour-nav|\.bottom-nav|\.w4-attributes\s*\{|\.w4-materials\s*\{)/);
  assert.doesNotMatch(block,/(?:position:fixed|visibility:hidden|display:none|overflow:hidden|clip-path|filter:drop-shadow)/);
  assert.match(block,/\.w4-forge \.w4-forge-stage > \.w4-forge-description/);
});
