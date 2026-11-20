import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/ships.ts',import.meta.url),'utf8');

test('WORK0: painterly crimson is applied only to enemy non-flag sail texture',()=>{
  assert.match(source,/if\(red && !flag\)\{/);
  assert.match(source,/const wash=c\.createLinearGradient/);
  assert.match(source,/for\(let i=0;i<13;i\+\+\)/);
  assert.match(source,/for\(let j=0;j<67;j\+\+\)/);
  assert.match(source,/c\.setLineDash\(\[4,9\]\)/);
  // Same textured material goes to both main enemy sails and its one foresail.
  assert.match(source,/const sailMat=new T\.MeshStandardMaterial\(\{map:sealTexture\(red\)/);
  assert.match(source,/const redForesail=new T\.Mesh\(redForeGeometry,sailMat\)/);
});

test('WORK0: skull mark and player/flag branch remain present without extra meshes',()=>{
  const start=source.indexOf('if(red && !flag){');
  const emblem=source.indexOf('// Original skull & crossed cutlasses emblem');
  assert.ok(start>0&&emblem>start,'cloth layers must render BEFORE original insignia');
  const block=source.slice(start,emblem);
  assert.doesNotMatch(block,/new T\.(Mesh|Group|Geometry|Material)/);
  assert.doesNotMatch(block,/requestAnimationFrame|setInterval|fetch\(/);
  assert.match(source,/const flagMat=new T\.MeshStandardMaterial\(\{map:sealTexture\(red,true\)/);
  assert.match(source,/if\(!red && !flag\)\{/);
});
