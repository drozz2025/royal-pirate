import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shipyard } from '../src/shipyard.tsx';

const css=readFileSync(new URL('../src/shipyard.css',import.meta.url),'utf8');

test('shipyard provides a keyboard-addressable live 3D showcase toggle',()=>{
 const html=renderToStaticMarkup(createElement(Shipyard,{
  onClose:()=>{},onPreview:()=>{}
 }));
 assert.match(html,/aria-label="Expand the 3D ship view without editor panels"/);
 assert.match(html,/class="shipyard-showcase-toggle" aria-pressed="false"/);
 assert.match(html,/FULL 3D VIEW/);
 assert.match(html,/THE SHIPYARD/);
 assert.match(html,/aria-label="Return to harbour"/);
 assert.match(html,/DEMO PREVIEW LEVEL/);
 assert.match(html,/VISUAL SANDBOX ONLY/);
 assert.doesNotMatch(html,/EQUIP VERIFIED FLEET/);
});

test('showcase keeps camera presets accessible while hiding editor panels',()=>{
 assert.match(css,/\.shipyard-showcase \.shipyard-class-panel,\s*\.shipyard-showcase \.shipyard-panel,\s*\.shipyard-showcase \.shipyard-tour-hint\s*\{display:none\}/);
 assert.match(css,/\.shipyard-showcase \.shipyard-camera-presets\s*\{/);
 assert.match(css,/\.shipyard-showcase-toggle:focus-visible/);
 assert.match(css,/\.shipyard-showcase \.shipyard-orbit-hint/);
});

test('showcase does not replace player entitlement, level, inventory or the battle scene',()=>{
 const source=readFileSync(new URL('../src/shipyard.tsx',import.meta.url),'utf8');
 assert.match(source,/const \[showcase,setShowcase\]=useState\(false\)/);
 assert.match(source,/onClick=\{\(\)=>setShowcase\(previous=>!previous\)\}/);
 assert.match(source,/verifiedPlayerLevel/);
 assert.match(source,/validateOwnedFleetForPlayer/);
 assert.match(source,/onPreview\(\{shipClass,level,modules:selected\}\)/);
 assert.doesNotMatch(source,/localStorage|sessionStorage/);
});
