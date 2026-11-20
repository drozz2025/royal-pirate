import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** Bug seen in genuine 384×512 Chromium snapshots of 03–08:
 * the fixed release badge sat on top of the first navigation tab.
 * It must remain available to release tools in HTML, but never cover mobile
 * internal navigation; the approved harbour is expressly excluded. */
const sheet = readFileSync(new URL('../src/app-screens.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');

test('WORK0 #104: mobile internal screens hide only the obstructing version overlay', () => {
  assert.match(sheet, /@media\s*\(max-width:600px\)\s*\{\s*body:has\(\.app\.with-app-sheet\)\s*>\s*\.rp-version\s*\{\s*display:none!important;\s*\}\s*\}/);
  assert.match(app, /harbour&&appScreen\?' with-app-sheet':' '/);
  assert.match(html, /<span class="rp-version" aria-label="Game version">/);
  assert.doesNotMatch(sheet, /\.in-harbour\s+\.rp-version/);
  assert.doesNotMatch(sheet, /\.harbour-screen\s*\{\s*display:none/);
});

test('WORK0 #104: stylesheet keeps responsive internal navigation and scroll container', () => {
  assert.match(sheet, /\.app\.with-app-sheet\s+\.app-sheet\s*\{height:100%;min-height:0;max-height:100%;overflow:hidden\}/);
  assert.match(app, /import '\.\/app-screens\.css'/);
  assert.match(app, /<AppScreens screen=\{appScreen\}/);
});
