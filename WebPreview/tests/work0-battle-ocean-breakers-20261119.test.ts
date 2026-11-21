import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/scene.ts'), 'utf8');
test('WORK0 #104: irregular battle ocean breakers remain isolated from Porto', () => {
  const fragment = source.split('fragmentShader:`')[1]?.split('`});')[0] ?? '';
  assert.ok(fragment, 'real shader remains present');
  const battle = fragment.split('if(battleMode>.5){');
  assert.equal(battle.length, 2, 'battle-specific fragment block exists exactly once');
  const harbour = battle[0], combat = battle[1];
  assert.match(harbour, /float oldFoam=/, 'existing Porto foam path remains in place');
  assert.doesNotMatch(harbour, /edgeBreak|curling|irregular/, 'Porto cannot see battle crests');
  assert.match(combat, /float curling=sin\(/);
  assert.match(combat, /float edgeBreak=smoothstep\(/);
  assert.match(combat, /foam=max\(foam,edgeBreak\*irregular\*\.59\)/);
  assert.match(combat, /vec3 deep=mix\(vec3\(\.005,\.105,\.235\),vec3\(\.019,\.34,\.51\)/);
  assert.match(combat, /deep=mix\(deep,vec3\(\.055,\.50,\.64\),clamp\(edgeBreak\*\.26\+ridge\*\.09,0\.,\.38\)\)/,
    'cyan remains bound to broken crests (<= .38), with deep-blue troughs');
  assert.match(combat, /foam=clamp\(foam,0\.,\.64\)/,
    'new crest foam stays below 0.64 and out of Porto');
  assert.match(source, /new T\.PlaneGeometry\(210,210,190,190\)/, 'same animated ocean mesh, no new draw call');
  assert.match(source, /this\.ships=\{player:makeShip\(false\),enemy:makeShip\(true\)\}/,
    'live ships, ballistics and enemy models unchanged');
});
