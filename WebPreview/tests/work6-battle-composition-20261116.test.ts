import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeBattleDeck} from '../src/battle-deck';
import {battleCameraPose, battleEnemyScale} from '../src/battle-framing';

test('WORK6: painted timber stays on existing battle-only meshes, Node-safe and no extra cannons',()=>{
  const {group,flashes}=makeBattleDeck();
  assert.equal(flashes.length,2);
  const painted:T.Mesh[]=[];
  group.traverse(obj=>{
    if(obj instanceof T.Mesh&&obj.material instanceof T.MeshStandardMaterial&&obj.material.userData.battleTimber)painted.push(obj);
  });
  assert.ok(painted.length>=9,'real plank meshes receive deterministic grain material');
  assert.ok(group.children.length<60,'no new deck mesh flood or interaction surface');
  assert.equal(group.name,'battle-foreground-cannons');
});

test('WORK6: enemy scale and left sail crop are strictly battle-only, Porto restores unchanged ship',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const home=scene.split('  home(){')[1]?.split('  deck(){')[0]??'';
  const porto=scene.split('  showHarbour(){')[1]?.split('  /** Harbour only:')[0]??'';
  assert.match(home,/battleEnemyScale\(battleAspect\)/);
  assert.equal(battleEnemyScale(384/512),1.62);
  assert.equal(battleEnemyScale(390/844),1.48);
  assert.equal(battleEnemyScale(1.4),1.82);
  assert.match(home,/battleForegroundSail\.position\.x=pose\.sailX/);
  assert.match(home,/this\.ships\.player\.root\.visible=false/);
  assert.match(porto,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/);
  assert.match(porto,/this\.battleBattery\.visible=false;this\.battleForegroundSail\.visible=false/);
  assert.equal(battleCameraPose(384/512).showBattery,true);
  assert.equal(battleCameraPose(390/844).showBattery,true);
});
