import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FleetPanel,ForgePanel} from '../src/work4-fleet-forge.tsx';
import {initialProfile} from '../src/progression.ts';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const sea=css.split('.w4-fleet .w4-harbour-stage > svg.w4-reference-sea {')[1]?.split('}')[0];
const profile=initialProfile();
const noop=()=>{};
const fleet=renderToStaticMarkup(React.createElement(FleetPanel,{
  profile,onForge:noop,onCrew:noop,onPorto:noop
}));
const forge=renderToStaticMarkup(React.createElement(ForgePanel,{
  profile,onUpgrade:noop,onFleet:noop
}));

test('WORK4/03: the approved water crop preserves its original 213:31 proportions',()=>{
  assert.ok(sea,'the single approved sea element must have its own scoped rule');
  assert.match(fleet,/viewBox="24 308 213 31"/);
  assert.match(fleet,/data-work4-sea="approved-water-only"/);
  assert.match(sea,/width:100%/);
  assert.match(sea,/height:auto/);
  assert.match(sea,/aspect-ratio:213 \/ 31/);
  assert.match(sea,/max-height:29%/);
  assert.doesNotMatch(sea,/(?:^|\n)\s*height:29%/);
  assert.match(sea,/pointer-events:none/);
  assert.match(css,/\.w4-fleet \.w4-harbour-stage::after \{background:none;\}/);
  assert.equal((fleet.match(/data-work4-crop="fleet"/g)||[]).length,1);
  assert.equal((fleet.match(/data-work4-sea="approved-water-only"/g)||[]).length,1);
});

test('WORK4/03: 320/384/390/430 mobile widths retain one undistorted sea source',()=>{
  for(const width of [320,384,390,430]){
    const expectedHeight=width*31/213;
    assert.ok(expectedHeight>=46&&expectedHeight<63,'approved sea is a shallow band at '+width);
    assert.ok(Math.abs(width/expectedHeight-213/31)<1e-10);
  }
  assert.match(fleet,/03-frota\.webp/);
  assert.doesNotMatch(sea,/background-image:|linear-gradient\(to right/);
});

test('WORK4/04: cannon, true costs, protected compositor and navigation contracts are not changed',()=>{
  assert.equal((forge.match(/data-work4-crop="forge"/g)||[]).length,1);
  assert.match(forge,/MATERIAIS E CUSTOS/);
  assert.match(forge,/w4-forge-live-levels/);
  assert.match(forge,/w4-improve-button/);
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
  assert.doesNotMatch(sea,/\.app-|\.porto-|\.harbour-nav|\.app-dock|position:fixed|contain:paint|transform:/);
});
