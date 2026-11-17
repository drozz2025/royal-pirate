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
  assert.match(html,/viewBox="18 146 223 194"/);
  assert.match(html,/03-frota\.webp/);
  assert.equal((html.match(/data-work4-crop="forge"/g)||[]).length,0);
  assert.match(html,/NAVIOS DA FROTA/);
  assert.match(html,/1 navio disponível/);
  assert.doesNotMatch(html,/325700|1250|30000|4860/);
});

test('04: a single pictorial cannon and lit furnace keep real upgrades separate',()=>{
  const html=renderForge();
  assert.equal((html.match(/data-work4-crop="forge"/g)||[]).length,1);
  assert.match(html,/viewBox="9 146 171 161"/);
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
  // This guard applies to the approved painting block, not to later,
  // independently tested WORK4 short-screen layout rules (PR #249).
  const paintingOnly=own.split('WORK4 / #104 — native 384×512 composition pass')[0];
  assert.doesNotMatch(paintingOnly,/\.w4-forge-stage\s*\{/);
});


test('03/04 approved crops keep every source pixel inside the actual art zones',()=>{
  const fleet=renderFleet().match(/data-work4-crop="fleet"[^>]*viewBox="([^"]+)"/)
    ||renderFleet().match(/viewBox="([^"]+)"[^>]*data-work4-crop="fleet"/);
  const forge=renderForge().match(/data-work4-crop="forge"[^>]*viewBox="([^"]+)"/)
    ||renderForge().match(/viewBox="([^"]+)"[^>]*data-work4-crop="forge"/);
  assert.ok(fleet&&forge,'one approved painting per screen');
  const [fx,fy,fw,fh]=fleet[1].split(' ').map(Number);
  const [gx,gy,gw,gh]=forge[1].split(' ').map(Number);
  assert.deepEqual([fx,fy,fw,fh],[18,146,223,194]);
  assert.deepEqual([gx,gy,gw,gh],[9,146,171,161]);
  assert.ok(fx+fw<=242 && fy+fh<=340,'fleet crop must not reproduce reference HUD/roster');
  assert.ok(gx+gw<=180 && gy+gh<=307,'forge crop must not reproduce reference upgrade values/materials');
  const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
  const frame=css.split('WORK4 / issue #104 — native 03/04 pictorial FRAMING, 17 Nov.')[1];
  assert.ok(frame,'native art framing rules are present');
  assert.match(frame,/aspect-ratio:223\/194/);
  assert.match(frame,/aspect-ratio:171\/161/);
  assert.match(frame,/@media \(max-width:359px\)/);
  assert.doesNotMatch(frame,/\.app-dock|\.app-shell|\.porto-|\.harbour-nav|contain:paint|translateZ\(/);
});
