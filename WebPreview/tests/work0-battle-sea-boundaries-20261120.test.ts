import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Static boundary guard only. Native WebGL screenshots/phone touch QA remain
// separate required gates; this does not certify artistic reference fidelity.
const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
const waterStart=source.indexOf('this.water=new T.ShaderMaterial(');
const oceanStart=source.indexOf('const ocean=new T.Mesh(',waterStart);
assert.ok(waterStart>=0&&oceanStart>waterStart,'live 3D ocean shader exists');
const shader=source.slice(waterStart,oceanStart);

test('battle-only water can change without rewriting Porto sea or ship physics',()=>{
  assert.match(shader,/uniform float battleMode;/);
  assert.match(shader,/if\(battleMode<\.5\)return harbour;/);
  assert.match(shader,/float harbour=sin\(p\.x\*\.47\+time\*1\.15\)\*\.12\s*\+\s*sin\(p\.y\*\.68-time\*1\.3\)\*\.08\s*\+\s*sin\(\(p\.x\+p\.y\)\*1\.3-time\*1\.7\)\*\.035;/);
  assert.match(shader,/if\(battleMode>\.5\)\{/);
  assert.match(source,/showHarbour\(\)[\s\S]*?water\.uniforms\.battleMode\.value=0;/);
  assert.match(source,/showBattle\(\)\{this\.water\.uniforms\.battleMode\.value=1;/);
});

test('battle water has finite colours, capped foam, and no new draw calls',()=>{
  assert.match(shader,/float lateralWarp=/);
  assert.match(shader,/float breakerMask=/);
  assert.match(shader,/foam=clamp\(foam,0\.,\.64\);/);
  assert.match(shader,/vec3 deep=mix\(vec3\(\.005,\.105,\.235\),vec3\(\.019,\.34,\.51\),/);
  assert.match(shader,/gl_FragColor=vec4\(col,1\.\);/);
  assert.match(source,/new T\.PlaneGeometry\(210,210,190,190\),this\.water/);
  assert.doesNotMatch(shader,/texture2D\(|fetch\(|video|screenshot/i);
});
