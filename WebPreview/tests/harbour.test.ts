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
  assert.match(main, /const enterBattle=\(\)=>\{reset\(\);view\.current\?\.showBattle\(\);setHarbour\(false\)/);
  assert.match(main, /const returnHarbour=\(\)=>\{reset\(\);view\.current\?\.showHarbour\(\);setHarbour\(true\)/);
  assert.match(main, /aria-label="Return to harbour"/);
});
test('harbour has one functional battle action and no fake transactions', () => {
  assert.match(harbour, /onClick=\{onBattle\}/);
  assert.match(harbour, /COMING SOON/);
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
  assert.match(scene, /this\.cameraMode!=='harbour'/);
  assert.match(main, /scene\.showHarbour\(\)/);
  assert.match(main, /view\.current\?\.showBattle\(\)/);
});
test('approved navigation is represented without fake in-game economy', () => {
  for(const label of ['SHOP','CARDS','SHIP','MISSIONS','RANKING','UPGRADES','FORGE','REWARDS','DAILY CHESTS','BATTLE!']) {
    assert.ok(harbour.includes(label), label+' must be present');
  }
  assert.match(harbour, /aria-disabled="true"/);
  assert.match(harbour, /LIVE 3D/);
  assert.match(css, /\.in-harbour \.battle-hud/);
  assert.match(css, /\.harbour-central\{[^}]*min-height/);
});
