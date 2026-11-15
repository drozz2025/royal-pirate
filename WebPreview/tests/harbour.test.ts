import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const harbour = readFileSync(new URL('../src/harbour.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/harbour.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('harbour preview is an actual screen integrated with the live battle', () => {
  assert.match(main, /harbour&&<Harbour onBattle=\{enterBattle\}/);
  assert.match(main, /const enterBattle=\(\)=>\{reset\(\);view\.current\?\.showBattle\(\);setShipSelected\(false\);setHarbour\(false\)/);
  assert.match(main, /const returnHarbour=\(\)=>\{reset\(\);view\.current\?\.showHarbour\(\);setShipSelected\(false\);setHarbour\(true\)/);
  assert.match(main, /aria-label="Return to harbour"/);
});
test('harbour has one functional battle action and no fake transactions', () => {
  assert.match(harbour, /onClick=\{onBattle\}/);
  assert.match(harbour, /harbour-compact-daily/);
  assert.match(harbour, /canClaimDaily\(profile,now\)/);
  assert.doesNotMatch(harbour, /Chest \{/);
  assert.doesNotMatch(harbour, /fetch\(|localStorage|payment|purchase\(/i);
});
test('harbour is accessible in portrait and respects safe-area inset', () => {
  assert.match(css, /@media\s*\(max-width:600px\)/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /harbour-battle-button:active/);
});
test('release version is visible and matches the package', () => {
  assert.match(pkg.version, /^0\.1\.\d+$/);
  assert.ok(html.includes('v' + pkg.version));
});

const scene = readFileSync(new URL('../src/scene.ts', import.meta.url), 'utf8');

test('the harbour frames a real Three.js vessel and disables battle simulation', () => {
  assert.match(scene, /showHarbour\(\)/);
  assert.match(scene, /showBattle\(\)/);
  assert.match(scene, /this\.ships\.enemy\.root\.visible=false/);
  assert.match(scene, /this\.harbourDock\.visible=true/);
  assert.match(scene, /this\.harbourDock\.visible=false/);
  assert.match(scene, /if\(this\.cameraMode==='battle'\|\|this\.cameraMode==='deck'\)/);
  assert.match(main, /scene\.showHarbour\(\)/);
  assert.match(main, /view\.current\?\.showBattle\(\)/);
});
test('approved navigation is represented without fake in-game economy', () => {
  for(const label of ['SHOP','CARDS','FLEET','MISSIONS','PROFILE','UPGRADES','FORGE','DAILY','BATTLE!']) {
    assert.ok(harbour.includes(label), label+' must be present');
  }
  assert.match(harbour, /onNavigate\(\x27missions\x27\)/);
  assert.match(harbour, /readyMissions/);
  assert.match(harbour, /TOUCH THE SHIP/);
  assert.match(css, /\.in-harbour \.battle-hud/);
  assert.match(css, /\.harbour-central\{[^}]*min-height/);
});

test('touch and pinch interact with the visible harbour ship; no viewer screen', () => {
  assert.doesNotMatch(harbour,/VIEW SHIP IN 3D|onInspect/);
  assert.match(harbour,/TOUCH THE SHIP/);
  assert.match(main,/setShipSelected/);
  assert.doesNotMatch(main,/ship-inspection-ui|inspectShip/);
  assert.match(scene,/shipPointerDown=/);
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
  assert.match(scene,/this\.controls\.enableRotate=true;this\.controls\.enableZoom=true/);
  assert.match(scene,/this\.controls\.enableRotate=false;this\.controls\.enableZoom=false/);
  assert.match(scene,/if\(this\.cameraMode==='battle'\|\|this\.cameraMode==='deck'\)\{this\.battle\.tick\(dt\)/);
});
