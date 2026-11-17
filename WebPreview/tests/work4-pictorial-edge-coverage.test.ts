import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const painting=css.split('/* WORK4 approved source painting pass 17 Nov / #104.')[1];
assert.ok(painting,'approved paintings #243 must remain installed');

test('03: whole Royal Crown hull survives the pictorial edge feather',()=>{
  const ship=painting.split('.w4-fleet .w4-harbour-stage > svg.w4-ship-art.w4-reference-ship {')[1]?.split('\n}')[0];
  assert.ok(ship,'only the original ship painting is styled');
  assert.match(ship,/height:clamp\(168px,54vw,240px\)!important/);
  assert.equal((ship.match(/#000 97%,transparent 100%/g)||[]).length,2);
  assert.equal((ship.match(/#000 94%,transparent 100%/g)||[]).length,2);
  assert.doesNotMatch(ship,/visibility:hidden|display:none/);
});

test('04: existing cannon wheels and wooden carriage stay opaque near the lower crop',()=>{
  const cannon=painting.split('/* WORK4 / #104: preserve the approved cannon wheel')[1];
  assert.ok(cannon,'lower cannon edge correction exists');
  assert.equal((cannon.match(/#000 92%,transparent 100%/g)||[]).length,2);
  assert.equal((cannon.match(/#000 96%,transparent 100%/g)||[]).length,2);
  assert.match(painting,/svg\.w4-cannon-art\.w4-reference-cannon/);
  assert.doesNotMatch(cannon,/display:none|visibility:hidden/);
});

test('03/04: painted edges cannot alter harbour dock or compositor',()=>{
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
  const edgeOnly=painting.split('/* WORK4 / #104: preserve the approved cannon wheel')[1];
  assert.ok(edgeOnly);
  // A future short-screen layout may legitimately alter the local Forge stage.
  // This guard tests this artwork block only, not later WORK4 additions.
  const artworkOnly=edgeOnly.split('WORK4 / #104 — native 384×512 composition pass')[0];
  assert.doesNotMatch(artworkOnly,/\.app-dock|\.bottom-nav|\.porto-|\.app-shell/);
  assert.doesNotMatch(artworkOnly,/\.w4-forge-stage\s*\{/);
});
