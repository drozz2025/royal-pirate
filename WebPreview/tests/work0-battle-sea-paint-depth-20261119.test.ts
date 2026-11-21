import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { OceanScene } from '../src/scene';

// WORK0 / issue #104: these contracts are about live Three.js stage geometry,
// not simply recolouring a captured screenshot. Human Chromium review is still
// required before release.
const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
test('Battle foam material is truly animated/fragmented and gated off for Porto',()=>{
  const vertex=scene.split('vertexShader:`')[1]?.split('`,fragmentShader:')[0]||'';
  const fragment=scene.split('fragmentShader:`')[1]?.split('`});')[0]||'';
  const parts=fragment.split('if(battleMode>.5){');
  assert.equal(parts.length,2,'one battle-only material block');
  assert.match(vertex,/if\(battleMode<\.5\)return harbour/);
  assert.doesNotMatch(parts[0],/edgeBreak|curling|longSwell/);
  assert.match(parts[1],/float edgeBreak=smoothstep\(\.56,\.90,curling\)/);
  assert.match(parts[1],/float foam=crestMask\*\(\.21\+/);
  assert.match(parts[1],/foam=clamp\(foam,0\.,\.64\)/);
  assert.match(parts[1],/vec3 deep=mix\(vec3\(\.005,\.105,\.235\),vec3\(\.019,\.34,\.51\)/, 'navy troughs and restrained blue crests are battle-only');
  assert.match(parts[1],/col=mix\(deep,vec3\(\.91,\.97,\.94\),foam\)/);
  assert.match(scene,/new T\.PlaneGeometry\(210,210,190,190\)/);
  assert.match(scene,/this\.water\.uniforms\.battleMode\.value=0/);
  assert.match(scene,/this\.water\.uniforms\.battleMode\.value=1/);
});

test('Enemy cloth has real additional fold depth and coloured vertices',()=>{
  const rig=new T.Group();
  const scope={ships:{enemy:{rig}}};
  (OceanScene.prototype as unknown as {dressBattleEnemy:(this:typeof scope)=>void})
    .dressBattleEnemy.call(scope);
  const sail=rig.getObjectByName('battle-only-billowed-red-silhouette');
  assert.ok(sail instanceof T.Mesh);
  const vertices=sail.geometry.getAttribute('position') as T.BufferAttribute;
  const colours=sail.geometry.getAttribute('color') as T.BufferAttribute;
  assert.equal(vertices.count,585);
  assert.equal(colours.count,585);
  const row=6, step=9, z:number[]=[];
  for(let u=0;u<step;u++)z.push(vertices.getZ(row*step+u));
  assert.ok(Math.max(...z)-Math.min(...z)>.28,'sail has actual curved depth');
  const values=new Set([...Array(step)].map((_,i)=>colours.getX(row*step+i).toFixed(3)));
  assert.ok(values.size>=5,'sunlit and shadowed canvas panels are not flat blocks');
  assert.equal(rig.children.length,3,'original cloth, seams and one genuinely sculpted enemy-only art group');
  const galleon=rig.getObjectByName('battle-only-crimson-galleon-art');
  assert.ok(galleon instanceof T.Group,'new decoration remains on the same enemy rig');
  assert.equal(galleon.userData.battleOnly,true);
  assert.equal(rig.children.filter(part=>part instanceof T.Group).length,1,'no second ship or duplicated hull');
});

test('Battle-only visual pass does not change shot collision or harbour pipeline',()=>{
  const decoration=scene.split('private dressBattleEnemy(){')[1]?.split('private dressBattleDeck(){')[0]||'';
  assert.doesNotMatch(decoration,/this\.battle\.|this\.camera\.|this\.controls\.|this\.harbourDock\./);
  assert.match(scene,/this\.ships\.player\.root\.visible=false/);
  assert.match(scene,/this\.ships\.enemy\.root\.visible=false/);
  assert.match(scene,/battleDeckMuzzleWorld\(this\.battleBattery,muzzle\)/);
});
