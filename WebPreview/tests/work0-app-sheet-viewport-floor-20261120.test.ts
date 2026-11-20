import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/** #104 layout regression: a 384x512 screen must not inherit the legacy
 * 570px harbour floor, otherwise the real five-button dock is cut off.
 * Visual and interaction validation still belongs to Chromium mobile QA. */
test('overlay screens get their own viewport class only while mounted',()=>{
 const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.match(main,/harbour&&appScreen\?' with-app-sheet':' '/);
 assert.match(main,/className=\{'app '/);
});
test('mobile sheets cannot exceed their real phone viewport; Porto unchanged',()=>{
 const css=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
 assert.match(css,/\.app\.with-app-sheet\s*\{[^}]*height:100dvh;min-height:0;max-height:100dvh/);
 assert.match(css,/\.app\.with-app-sheet \.app-sheet\s*\{[^}]*height:100%;min-height:0;max-height:100%;overflow:hidden/);
 assert.doesNotMatch(css,/\.app\.in-harbour\s*\{[^}]*min-height:0/);
});
