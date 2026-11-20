import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { makeBattleEnemyOrnaments } from '../src/battle-enemy-ornaments';

test('battle-only red opponent dressing is genuine 3D, bounded, and reusable',()=>{
  const group=makeBattleEnemyOrnaments();
  assert.equal(group.userData.battleOnly,true);
  assert.equal(group.name,'battle-only-crimson-galleon-art');
  const found:string[]=[];let meshCount=0;
  group.traverse(obj=>{
    if(!(obj instanceof T.Mesh))return;
    meshCount++;found.push(obj.name);
    const geo=obj.geometry as T.BufferGeometry;
    assert.ok(geo.getAttribute('position').count>=3,obj.name);
    geo.computeBoundingBox();
    const bounds=geo.boundingBox!;
    assert.ok(Number.isFinite(bounds.min.x)&&Number.isFinite(bounds.max.z),obj.name);
  });
  assert.equal(found.filter(x=>x==='battle-crimson-sculpted-keel').length,2);
  assert.equal(found.filter(x=>x==='battle-sail-skull-eye').length,4);
  assert.equal(found.filter(x=>x==='battle-sail-crossed-cutlass').length,4);
  assert.equal(found.filter(x=>x==='battle-stern-gallery-gold').length,3);
  assert.ok(meshCount>25&&meshCount<90,'mobile mesh budget');
  assert.equal(group.getObjectByName('first-person-central-cannon'),undefined);
  assert.equal(group.getObjectByName('player'),undefined);
});
