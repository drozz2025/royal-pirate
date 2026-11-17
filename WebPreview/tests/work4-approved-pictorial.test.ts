import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FleetPanel, ForgePanel} from '../src/work4-fleet-forge.tsx';
import {initialProfile} from '../src/progression.ts';

const noop=()=>{};
const profile=initialProfile();
const renderFleet=()=>renderToStaticMarkup(React.createElement(FleetPanel,{
  profile,onForge:noop,onCrew:noop,onPorto:noop
}));
const renderForge=()=>renderToStaticMarkup(React.createElement(ForgePanel,{
  profile,onUpgrade:noop,onFleet:noop
}));

test('03: a single pictorial Royal Crown crops ONLY approved art pixels, not the reference HUD',()=>{
  const html=renderFleet();
  assert.equal((html.match(/data-work4-crop="fleet"/g)||[]).length,1);
  assert.match(html,/viewBox="40 151 197 189"/);
  assert.match(html,/03-frota\.webp/);
  assert.equal((html.match(/data-work4-crop="forge"/g)||[]).length,0);
  assert.match(html,/NAVIOS DA FROTA/);
  assert.match(html,/1 navio disponível/);
  assert.doesNotMatch(html,/325700|1250|30000|4860/);
});

test('04: a single pictorial cannon and lit furnace keep real upgrades separate',()=>{
  const html=renderForge();
  assert.equal((html.match(/data-work4-crop="forge"/g)||[]).length,1);
  assert.match(html,/viewBox="24 153 155 154"/);
  assert.match(html,/04-melhorias-forja\.webp/);
  assert.match(html,/class="w4-cannon-art w4-reference-cannon"/);
  assert.match(html,/MATERIAIS E CUSTOS/);
  assert.match(html,/NÍVEL 0/);
  assert.doesNotMatch(html,/120 \/ 120|85 \/ 80|50 000|1250/);
});

test('03/04 painting rules are scoped and do not override #158 paint isolation or Porto/dock',()=>{
  const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
  assert.match(css,/WORK4 approved source painting pass 17 Nov/);
  assert.match(css,/\.w4-fleet \.w4-harbour-stage > svg\.w4-ship-art\.w4-reference-ship/);
  assert.match(css,/\.w4-forge \.w4-forge-scene > svg\.w4-cannon-art\.w4-reference-cannon/);
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
  const own=css.split('WORK4 approved source painting pass 17 Nov')[1];
  assert.ok(own);
  assert.doesNotMatch(own,/\.app-dock|\.harbour-nav|\.porto-|\.app-shell/);
  assert.doesNotMatch(own,/\.w4-forge-stage\s*\{/);
});
