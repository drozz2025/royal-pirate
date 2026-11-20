import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path:string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const main = read('../src/main.tsx');
const css = read('../src/battle-approved.css');
const harbour = read('../src/harbour.tsx');

test('battle reference layout is live React over the playable ocean, not an image mock', () => {
  assert.match(main, /battle-approved-top/);
  assert.match(main, /battle-approved-banner/);
  assert.match(main, /battle-approved-currencies/);
  assert.match(main, /engine\.current\.fire\(\)/);
  assert.match(main, /value=\{yaw\}/);
  assert.match(main, /value=\{power\}/);
  assert.match(main, /<Health name=\{profile\.playerName/);
  assert.match(main, /<Health name="CAPITÃO NERO"/);
  assert.match(main, /Diamantes indisponíveis nesta versão/);
  assert.doesNotMatch(css, /url\([^)]*(?:02-batalha|referencia-original-aprovada)/);
});

test('battle CSS is isolated so the approved Porto and shared bottom menu are unchanged', () => {
  assert.match(main, /import '\.\/battle-approved\.css';/);
  assert.match(css, /\.in-battle \.battle-approved-top/);
  assert.match(css, /\.in-battle \.battle-hud/);
  assert.match(css, /\.in-battle \.command-deck/);
  assert.match(css, /\.in-battle \.view-controls/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.doesNotMatch(css, /\n\.harbour-nav\s*\{/);
  assert.doesNotMatch(css, /\n\.harbour-screen\s*\{/);
  assert.match(harbour, /harbour-nav/);
});
