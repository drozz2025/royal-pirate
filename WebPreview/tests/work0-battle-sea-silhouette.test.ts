import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleEnemyBroadsideYaw, battleEnemyScale, battleCameraPose} from '../src/battle-framing';

const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
const atmosphere=readFileSync(new URL('../src/battle-atmosphere.ts',import.meta.url),'utf8');

test('Batalha 02: mobile red ship shows a broader genuine hull, without changing Porto',()=>{
  for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
    const aspect=w/h, yaw=battleEnemyBroadsideYaw(aspect);
    assert.ok(Number.isFinite(yaw)&&yaw<=-1.15&&yaw>=-1.52,
      'native and tall mobile need a visible opponent broadside '+w+'x'+h);
    assert.ok(battleEnemyScale(aspect)<=1.62,'enemy remains bounded; vertical HUD safety is checked in battle-enemy-presentation');
    assert.equal(battleCameraPose(aspect).showBattery,true);
  }
  assert.equal(battleEnemyBroadsideYaw(1.4),-.95,'desktop silhouette unchanged');
  assert.match(scene,/this\.ships\.enemy\.root\.rotation\.y=battleEnemyBroadsideYaw\(battleAspect\)/);
  assert.match(scene,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/,
    'returning to Porto resets model scale and avoids contaminating approved composition');
  assert.match(scene,/this\.worldScenery\.visible=false/,'battle has no extra island/cloud sphere clutter');
});

test('Batalha 02 ocean restyle remains isolated from original Porto and real ballistics',()=>{
  assert.match(scene,/if\(battleMode<\.5\)return harbour/,'Porto vertex waves must remain untouched');
  assert.match(scene,/if\(battleMode>\.5\)/,'new breaker shader must be battle-only');
  assert.match(scene,/float foam=crestMask\*\(\.21\+/,
    'battle foam must arise from irregular, fragmented long-wave crests');
  assert.match(scene,/foam=clamp\(foam,0\.,\.64\)/,
    'real broken-crest battle foam is capped, not a tiled overlay');
  assert.match(scene,/vec3 deep=mix\(vec3\(\.005,\.105,\.235\)/,
    'deep-water palette must preserve blue troughs beneath white crests');
  assert.match(scene,/battleDeckMuzzleWorld\(this\.battleBattery,muzzle\)/,
    'the 3D cannon mouth, not a guessed offset, remains the projectile origin');
});

test('Batalha 02 sky uses fewer procedurally painted cloud banks, no screenshots',()=>{
  const block=atmosphere.split('const banks: [number, number, number][] = [')[1]?.split('];')[0];
  assert.ok(block,'sky banks must remain procedural art');
  const entries=[...block.matchAll(/\[\s*-?\d+,\s*\d+,\s*\d+\s*\]/g)];
  assert.equal(entries.length,12,'leave readable open sky instead of 21 repeated huge clouds');
  assert.match(atmosphere,/new T\.CanvasTexture|return new T\.CanvasTexture|T\.CanvasTexture/,
    'sky remains live WebGL texture, not screenshot as background');
});
