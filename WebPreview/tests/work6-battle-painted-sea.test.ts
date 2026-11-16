import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeBattleDeck} from '../src/battle-deck';

const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');

test('WORK6 #104: rolling 3D battle sea stays gated away from approved Porto',()=>{
  const vertex=scene.split('vertexShader:`')[1]?.split('`,fragmentShader:')[0]??'';
  const fragment=scene.split('fragmentShader:`')[1]?.split('`});')[0]??'';
  assert.ok(vertex&&fragment,'both real WebGL shader stages remain in scene.ts');
  assert.match(vertex,/uniform float battleMode/);
  assert.match(vertex,/if\(battleMode<\.5\)return harbour/);
  assert.match(vertex,/sin\(p\.x\*\.47\+time\*1\.15\)\*\.12/,
    'approved Porto vertex animation remains unchanged');
  assert.match(vertex,/\(rolling\+crossSea\+chop\)\*deckFade/,
    'battle waves have genuine three-dimensional crossing displacements');
  assert.match(vertex,/smoothstep\(44\.,72\.,-p\.y\)/,
    'near-field swells cannot obscure the first-person deck');
  assert.match(fragment,/if\(battleMode>\.5\)/,
    'illustrative foam and deep water are Batalha-only');
  assert.match(fragment,/float paintedSwell=/);
  assert.match(fragment,/float shadowLip=/);
  assert.match(fragment,/deep\*=1\.-shadowLip/);
});

test('WORK6 #104: visual enemy surf follows the enlarged render hull, never physics',()=>{
  assert.match(scene,/vec2 enemyShip=vec2\(10\.,-3\.\)/);
  assert.match(scene,/vec2\(4\.8,10\.2\)/);
  assert.match(scene,/float hullSurf=max/);
  assert.match(scene,/this\.ships\.enemy\.root\.scale\.setScalar\(compactBattle\?1\.88:1\.82\)/);
  assert.match(scene,/this\.ships\.player\.root\.visible=false/);
  assert.match(scene,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/,
    'return to Porto keeps original rendering scale');
  assert.equal((scene.match(/new T\.Mesh\(new T\.PlaneGeometry\(210,210,190,190\)/g)||[]).length,1,
    'do not add a second expensive ocean layer or fake image overlay');
});

test('WORK6 #104: exactly the existing two first-person cannons remain',()=>{
  const {group,flashes}=makeBattleDeck();
  const barrels:T.Mesh[]=[];
  group.traverse(part=>{
    if(part instanceof T.Mesh&&part.name==='first-person-broadside-cannon')barrels.push(part);
  });
  assert.equal(flashes.length,2);
  assert.equal(barrels.length,2);
  assert.match(scene,/this\.battleBattery\.visible=false;this\.battleForegroundSail\.visible=false/,
    'battle deck cannot leak into approved Porto');
});

test('WORK6 #104: native short-phone battle controls float on real deck, with Porto selectors untouched',()=>{
  const css=readFileSync(new URL('../src/battle-approved.css',import.meta.url),'utf8');
  const compact=css.split('/* WORK6 #104 — ORIGINAL 384x512')[1]??'';
  assert.ok(compact,'short reference layout is explicitly scoped');
  assert.match(compact,/@media \(max-height:650px\)/);
  assert.match(compact,/\.in-battle \.command-deck\{[\s\S]*height:180px/);
  assert.match(compact,/\.in-battle \.command-deck \.sliders\{[\s\S]*gap:clamp\(108px,30vw,130px\)/);
  assert.match(compact,/\.in-battle \.command-deck \.fire-button\{/);
  assert.match(compact,/\.in-battle \.view-controls button:not\(:last-child\)/);
  assert.doesNotMatch(compact,/\.in-harbour|bottom-nav|\.porto-|dock-/);
});
