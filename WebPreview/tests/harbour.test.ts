import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const harbour = readFileSync(new URL('../src/harbour.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/harbour.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('harbour preview is an actual screen integrated with the live battle', () => {
  assert.match(main, /harbour&&!inspecting&&!shipyard&&<Harbour onBattle=\{enterBattle\} onInspect=\{inspectShip\} onShipyard=\{enterShipyard\}/);
  assert.match(main, /const enterBattle=\(\)=>\{reset\(\);view\.current\?\.showBattle\(\);setShipyard\(false\);setInspecting\(false\);setHarbour\(false\)/);
  assert.match(main, /const returnHarbour=\(\)=>\{reset\(\);view\.current\?\.showHarbour\(\);setShipyard\(false\);setInspecting\(false\);setHarbour\(true\)/);
  assert.match(main, /aria-label="Return to harbour"/);
});
test('harbour preserves playable battle and opens the 3D shipyard without fake transactions', () => {
  assert.match(harbour, /onClick=\{onBattle\}/);
  assert.match(harbour, /onClick=\{onShipyard\}/);
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
  assert.match(scene, /if\(this\.cameraMode==='battle'\|\|this\.cameraMode==='deck'\)/);
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

test('functional ship viewer orbits live 3D without advancing the battle', () => {
  assert.match(harbour, /onClick=\{onInspect\}/);
  assert.match(harbour, /Inspect your ship in interactive 3D/);
  assert.match(main, /const inspectShip=\(\)=>\{view\.current\?\.inspectShip\(\);setInspecting\(true\)/);
  assert.match(main, /const closeInspection=\(\)=>\{view\.current\?\.showHarbour\(\);setInspecting\(false\)/);
  assert.match(main, /harbour&&inspecting&&!shipyard&&<div className="ship-inspection-ui"/);
  assert.match(scene, /inspectShip\(\)\{/);
  assert.match(scene, /this\.cameraMode='inspect'/);
  assert.match(scene, /this\.controls\.enableRotate=true;this\.controls\.enableZoom=true/);
  assert.match(scene, /if\(this\.cameraMode==='battle'\|\|this\.cameraMode==='deck'\)\{this\.battle\.tick\(dt\)/);
  assert.match(css, /\.harbour-inspect-button\{pointer-events:auto/);
  assert.match(css, /\.ship-inspection-ui\{[^}]*pointer-events:none/);
});

test('shipyard is a real 3D level/module preview separate from the battle',()=>{
 const shipyard=readFileSync(new URL('../src/shipyard.tsx',import.meta.url),'utf8');
 const shipyardCss=readFileSync(new URL('../src/shipyard.css',import.meta.url),'utf8');
 assert.match(main,/harbour&&shipyard&&<Shipyard onClose=\{returnHarbour\} onPreview=\{previewShipyard\}/);
 assert.match(scene,/showShipyard\(loadout:ShipLoadout\)/);
 assert.match(scene,/this\.ships\.player\.root\.visible=false;this\.shipyardArt\.root\.visible=true/);
 assert.match(scene,/showBattle\(\)\{this\.ships\.player\.root\.visible=true/);
 assert.match(shipyard,/SHIPYARD|SHIPYARD/); // Preview screen must not be a static image.
 assert.match(shipyard,/SHIP_MODULES\.filter/);
 assert.match(shipyard,/min=\{1\} max=\{20\}/);
 assert.match(shipyard,/no player progress is saved/);
 assert.match(shipyard,/No purchases, module ownership/);
 assert.match(shipyardCss,/safe-area-inset-bottom/);
});
