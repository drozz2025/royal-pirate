import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('WORK0: painted sea replaces tight tiled highlights in Batalha only',()=>{
  const scene=source('../src/scene.ts');
  const start=scene.indexOf('if(battleMode>.5){');
  const end=scene.indexOf('gl_FragColor=vec4(col,1.);',start);
  assert.ok(start>=0&&end>start);
  const battle=scene.slice(start,end);
  const harbour=scene.slice(scene.indexOf('float wave(vec2 p){'),scene.indexOf('void main(){vec3 p=position;'));
  assert.match(harbour,/if\(battleMode<\.5\)return harbour/);
  assert.match(battle,/broad, interleaved painted swells/);
  assert.match(battle,/float longSwell=/);
  assert.match(battle,/float hullSurf=/);
  assert.match(battle,/foam=clamp\(foam,0\.,\.64\)/);
  assert.doesNotMatch(battle,/float flecks=|float stipple=|float pattern=/);
  assert.match(scene,/this\.water\.uniforms\.battleMode\.value=0/);
  assert.match(scene,/this\.water\.uniforms\.battleMode\.value=1/);
});

test('WORK0: mobile Batalha is a real central-gun stage with compact status and accessible controls',()=>{
  const css=source('../src/battle-layout-reset.css');
  const begin=css.indexOf('WORK0 / #104 - true gunner stage');
  assert.ok(begin>0);
  const rules=css.slice(begin);
  assert.match(rules,/@media \(max-width:600px\)/);
  assert.match(rules,/\.in-battle \.battle-approved-top\s*\{\s*display:none;/);
  assert.match(rules,/\.in-battle \.battle-hud/);
  assert.match(rules,/\.in-battle \.command-deck \.fire-button/);
  assert.match(rules,/\.in-battle \.command-deck \.sliders/);
  assert.match(rules,/min-height:60px/);
  assert.match(rules,/@media \(max-width:350px\)/);
  assert.match(rules,/@media \(max-width:600px\) and \(max-height:560px\)/);
  assert.doesNotMatch(rules,/\.in-harbour\b|\.harbour-nav\b|\.porto-bottom-nav\b/);
  const app=source('../src/main.tsx');
  for(const control of ['engine.current.fire()','value={yaw}','value={power}',
    'onClick={returnHarbour}','aria-expanded={utilityMenuOpen}'])
    assert.ok(app.includes(control),control);
});
