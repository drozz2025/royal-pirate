import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const marker='WORK4 / #104 — native 384×512 composition pass';
const compact=css.split(marker)[1];

test('WORK4 native short-screen composition exists without modifying global navigation',()=>{
  assert.ok(compact,'missing native-size composition rules');
  assert.match(compact,/@media \(max-width:659px\) and \(max-height:650px\)/);
  assert.match(compact,/\.w4-forge #w4-forge-panel > \.w4-forge-stage/);
  assert.match(compact,/height:clamp\(184px,34dvh,202px\)/);
  assert.match(compact,/\.w4-fleet \.w4-stage-label/);
  assert.doesNotMatch(compact,/\.(?:app-dock|app-shell|porto-|harbour-nav|bottom-nav)/);
});

test('one existing cannon is framed without changing compositor isolation or hiding levels',()=>{
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
  assert.match(compact,/svg\.w4-cannon-art:not\(\.w4-reference-cannon\)/);
  assert.match(compact,/svg\.w4-reference-cannon/);
  assert.match(compact,/max-height:94%/);
  assert.match(compact,/overflow-y:auto/);
  assert.doesNotMatch(compact,/visibility:hidden|overflow:hidden/);
  assert.doesNotMatch(compact,/\.w4-forge-scene\s*\{[\s\S]*?transform:/);
});

test('materials, real cost and improve control remain in normal document flow',()=>{
  assert.match(compact,/\.w4-forge \.w4-materials \{/);
  assert.match(compact,/\.w4-forge \.w4-resource-grid > div \{/);
  assert.match(compact,/\.w4-forge \.w4-improve-button \{/);
  assert.doesNotMatch(compact,/(?:position:fixed|position:absolute|pointer-events:none)/);
});
