import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeBattleSeaCrests, makeBattleDeck} from '../src/battle-deck';

test('WORK6 / #104: illustrated breakers are genuinely curved 3D sea geometry',()=>{
  const group=makeBattleSeaCrests();
  assert.equal(group.name,'battle-painted-3d-sea-crests');
  assert.equal(group.visible,false,'Porto must remain identical');
  assert.equal(group.children.length,1,'all whitecaps must fit in one draw call');
  const mesh=group.children[0];
  assert.ok(mesh instanceof T.Mesh);
  assert.equal(mesh.name,'battle-breaker-ribbons');
  assert.ok(mesh.material instanceof T.MeshBasicMaterial);
  assert.equal(mesh.material.vertexColors,true);
  assert.equal(mesh.material.depthWrite,false,'water accents cannot obscure the real ships');
  const vertices=mesh.geometry.getAttribute('position') as T.BufferAttribute;
  assert.equal(vertices.count,720,'40 short curved strokes, two edges per sample');
  assert.equal(mesh.geometry.getIndex()?.count,1920,'640 triangles, bounded mobile budget');
  const box=new T.Box3().setFromBufferAttribute(vertices);
  assert.ok(box.max.x-box.min.x>47,'crest ribbons cover the visible battle sea');
  assert.ok(box.max.z-box.min.z>55,'depth layers cover far and near broadside');
  assert.ok(box.min.y>.45&&box.max.y<1.3,'foam floats near the animated sea, not over HUD');
  assert.ok(mesh.geometry.getAttribute('color'),'painted cool and warm sea-foam edges are real vertex colors');
});

test('WORK6 / #104: battle-only visibility and gentle motion preserve Porto/camera/controls',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const home=scene.split('  home(){')[1]?.split('  deck(){')[0]??'';
  const porto=scene.split('  showHarbour(){')[1]?.split('  /** Harbour only:')[0]??'';
  assert.match(scene,/makeBattleSeaCrests\(\);this\.scene\.add\(this\.battleSeaCrests\)/);
  assert.match(home,/this\.battleSeaCrests\.visible=true/);
  assert.match(porto,/this\.battleSeaCrests\.visible=false/);
  assert.match(scene,/battleSeaCrests\.position\.y=Math\.sin\(this\.elapsed\*\.93\)/);
  assert.match(scene,/battleSeaCrests\.position\.z=Math\.sin\(this\.elapsed\*\.34\)/);
  assert.match(home,/this\.ships\.player\.root\.visible=false/);
  assert.match(porto,/this\.ships\.player\.root\.visible=true/);
  const {flashes}=makeBattleDeck();
  assert.equal(flashes.length,2,'first-person cannons unchanged');
  assert.doesNotMatch(scene,/battleSeaCrests.*(raycast|health|shot|yaw|power)/);
});
