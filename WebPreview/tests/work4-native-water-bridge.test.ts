import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FleetPanel,ForgePanel} from '../src/work4-fleet-forge.tsx';
import {initialProfile} from '../src/progression.ts';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const scope=css.split('WORK4 / #104 — natural approved water bridge and native-size artwork.')[1];
const noOp=()=>{};
const profile=initialProfile();
const fleet=renderToStaticMarkup(React.createElement(FleetPanel,{profile,onForge:noOp,onCrew:noOp,onPorto:noOp}));
const forge=renderToStaticMarkup(React.createElement(ForgePanel,{profile,onUpgrade:noOp,onFleet:noOp}));

test('WORK4: single Royal Crown, source-authentic water only below the hull, no copied economy or second ship',()=>{
  assert.equal((fleet.match(/data-work4-crop="fleet"/g)||[]).length,1);
  assert.equal((fleet.match(/data-work4-sea="approved-water-only"/g)||[]).length,1);
  assert.match(fleet,/viewBox="24 308 213 31"/);
  assert.ok(24+213<=241 && 308+31<=340,'the ocean crop is below artwork and outside source text/roster');
  assert.equal((fleet.match(/data-work4-crop="forge"/g)||[]).length,0);
  assert.match(fleet,/ROYAL CROWN/);
  assert.match(fleet,/w4-stage-stats/);
  assert.doesNotMatch(fleet,/325700|1250|30000|4860/);
});

test('WORK4: exactly one reference cannon, bounded source fire bloom and real cost panel',()=>{
  assert.equal((forge.match(/data-work4-crop="forge"/g)||[]).length,1);
  assert.match(forge,/w4-approved-hearth-20261117/);
  assert.match(forge,/w4-approved-iron-20261117/);
  assert.match(forge,/w4-forge-live-levels/);
  assert.match(forge,/MATERIAIS E CUSTOS/);
  assert.doesNotMatch(forge,/120 \/ 120|85 \/ 80|50 000|1250/);
});

test('WORK4: native 384 only; 320/390-tall/430-tall keep responsive artwork, controls and isolation',()=>{
  assert.ok(scope);
  assert.match(scope,/max-width:399px\) and \(max-height:650px/);
  assert.match(scope,/height:194px!important/);
  assert.match(scope,/height:161px!important/);
  assert.match(scope,/w4-reference-sea/);
  assert.match(scope,/radial-gradient\(ellipse 75% 105%/);
  assert.doesNotMatch(scope,/\.app-dock|\.app-shell|\.porto-|\.harbour-nav|\.bottom-nav|\.w4-materials\s*\{/);
  assert.doesNotMatch(scope,/contain:paint|translateZ\(0\)|position:fixed|visibility:hidden/);
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
  assert.match(fleet,/role="tablist"/);
  assert.match(forge,/role="tablist"/);
});
