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
  assert.match(main, /const enterBattle=\(\)=>\{reset\(\);setHarbour\(false\)/);
  assert.match(main, /const returnHarbour=\(\)=>\{reset\(\);setHarbour\(true\)/);
  assert.match(main, /aria-label="Return to harbour"/);
});
test('harbour has one functional battle action and no fake transactions', () => {
  assert.match(harbour, /onClick=\{onBattle\}/);
  assert.match(harbour, /COMING SOON/);
  assert.doesNotMatch(harbour, /fetch\(|localStorage|payment|purchase\(/i);
});
test('harbour is accessible in portrait and respects safe-area inset', () => {
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /harbour-battle-button:active/);
});
test('release version is visible and matches the package', () => {
  assert.equal(pkg.version, '0.1.3');
  assert.ok(html.includes('v' + pkg.version));
});
