import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
const harbour=source.slice(source.indexOf('  showHarbour(){'),source.indexOf('  /** Harbour only: activate OrbitControls'));
const battle=source.slice(source.indexOf('  home(){'),source.indexOf('  deck(){'));

test('WORK0 Porto candidate is genuinely the existing raycastable 3D ship',()=>{
  assert.match(harbour,/this\.ships\.player\.root\.scale\.setScalar\(nativeFrame&&!portoABBaseline\?1\.34:1\)/);
  assert.match(harbour,/this\.camera\.position\.set\(ship\.x-\(portrait\?26\.4:18\)/);
  assert.match(source,/intersectObject\(this\.ships\.player\.root,true\)/);
  assert.doesNotMatch(harbour,/TextureLoader|new Image\(|data:image|reference\.webp/);
});
test('WORK0 native short-frame gate does not change tall-phone Porto or first-person Batalha',()=>{
  assert.match(harbour,/this\.host\.clientWidth>=355/);
  assert.match(harbour,/this\.host\.clientWidth<=390 && this\.host\.clientHeight<=560/);
  assert.match(harbour,/localhost/);
  assert.match(battle,/this\.ships\.player\.root\.scale\.setScalar\(1\.25\)/);
  assert.match(battle,/this\.ships\.enemy\.root\.scale\.setScalar\(compactBattle\?1\.88:1\.82\)/);
  assert.match(source,/has\('portoShipAB'\)/);
  assert.match(source,/this\.controls\.enableRotate=true;this\.controls\.enableZoom=true/);
});
