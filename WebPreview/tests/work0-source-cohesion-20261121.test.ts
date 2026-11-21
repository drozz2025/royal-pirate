import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = (path: string) => readFileSync(new URL('../src/'+path, import.meta.url), 'utf8');

test('WORK0: Forja plaque 51% clears real cannon without modifying dock', () => {
  const css=source('work4-fleet-forge.css');
  const marker=css.indexOf('native Forge 04: align');
  assert.ok(marker>=0);
  const candidate=css.slice(marker,marker+800);
  assert.match(candidate, /@media \(width:384px\) and \(height:512px\)/);
  assert.match(candidate, /\.w4-forge-description\s*\{\s*width:51%;\s*right:1\.5%;/);
  assert.doesNotMatch(candidate, /\.harbour-nav|\.harbour-screen/);
});

test('WORK0: chosen WORK7 original card pigments are limited to native short screens', () => {
  const css=source('work7-cards-shop.css');
  const marker=css.indexOf('from WORK7 #710 native source enamel');
  assert.ok(marker>=0);
  const candidate=css.slice(marker);
  assert.match(candidate, /@media \(min-width:355px\) and \(max-width:390px\) and \(max-height:560px\)/);
  for(const n of [1,3,4,5,6,7,8]) assert.ok(candidate.includes('nth-child('+n+')'), 'card '+n);
  assert.doesNotMatch(candidate, /background-image:|\.harbour-nav|\.app-dock-porto/);
});

test('WORK0: Missions real SVG chests 1-3 treated without touching player progression', () => {
  const css=source('work8-panels.css');
  const marker=css.indexOf('WORK8/#104 — 07 Missões only: calibrate the emerald');
  assert.ok(marker>=0);
  // Restrict the negative-scope assertion to the chest treatment under test.
  // Subsequent, separately owned coastal artwork intentionally uses
  // pointer-events:none on its decorative pseudo-element.
  const nextRule=css.indexOf('\n/*',marker+1);
  const candidate=css.slice(marker,nextRule<0?undefined:nextRule);
  assert.match(candidate, /li:nth-child\(-n\+3\)/);
  assert.match(candidate, /svg\.w8-art-chest/);
  assert.match(candidate, /filter:brightness\(\.78\)/);
  assert.doesNotMatch(candidate, /\.harbour-nav|\.w8-ranking|pointer-events:\s*none/);
});


test('WORK0: real source chests 4–7 retain explicit old-vs-new A/B and no dock edits', () => {
  const css=source('work8-panels.css');
  const marker=css.indexOf('WORK0/#104: candidate from independently tested WORK8 #764');
  assert.ok(marker>=0,'candidate attribution and draft status');
  const live=css.indexOf(':root:not(.work8-missions-chest-art-ink-ab-baseline)');
  assert.ok(live>=0,'production treatment scoped by root class');
  const candidate=css.slice(live,css.indexOf('/*',live));
  assert.match(candidate,/li:nth-child\\(n\\+4\\)/);
  assert.match(candidate,/brightness\\(1\\.50\\)/);
  const baseline=css.slice(marker);
  assert.match(baseline,/:root\\.work8-missions-chest-art-ink-ab-baseline/);
  assert.match(baseline,/brightness\\(1\\.24\\)/);
  assert.doesNotMatch(baseline,/\\.harbour-nav|\\.w8-ranking|pointer-events:\\s*none|position:/);
});
