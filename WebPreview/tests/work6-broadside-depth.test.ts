import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {OceanScene} from '../src/scene';

// Exercise the actual battle-only builder, without a WebGL canvas, fake
// gameplay instance or side effects on the approved harbour.
test('first-person 3D gunwales converge into the distance without a full-width fence',()=>{
  const fake={battleBattery:new T.Group()};
  const build=OceanScene.prototype as unknown as {
    dressBattleDeck:(this:typeof fake)=>void;
  };
  build.dressBattleDeck.call(fake);
  const dressing=fake.battleBattery.getObjectByName('battle-only-wooden-bulwark');
  assert.ok(dressing instanceof T.Group);
  const port=dressing.getObjectByName('first-person-rail-port');
  const starboard=dressing.getObjectByName('first-person-rail-starboard');
  assert.ok(port instanceof T.Mesh);
  assert.ok(starboard instanceof T.Mesh);
  assert.ok(port.geometry instanceof T.TubeGeometry);
  assert.ok(starboard.geometry instanceof T.TubeGeometry);
  const portBounds=new T.Box3().setFromObject(port);
  const rightBounds=new T.Box3().setFromObject(starboard);
  assert.ok(portBounds.max.x<0 && rightBounds.min.x>0,
    'port and starboard rails leave an open view toward the enemy');
  assert.ok(portBounds.max.z>80 && portBounds.min.z<65,
    'genuine three-dimensional rails must extend from near deck to far bow');
  assert.ok(rightBounds.max.z>80 && rightBounds.min.z<65);
  assert.ok(dressing.children.length<110,'mobile draw calls remain bounded');
  assert.equal(fake.battleBattery.children.length,1,
    'all extra geometry lives ONLY in the hidden-in-Porto cannon group');
});

test('battle-only rails never change physics, HP, cannon flashes or Porto/nav',()=>{
  const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const dressing=source.split('private dressBattleDeck(){')[1]?.split('private environment(){')[0]??'';
  assert.ok(dressing.length>0);
  assert.doesNotMatch(dressing,/this\\.battle\\.|this\\.controls\\.|this\\.ships\\.|this\\.harbourDock/);
  assert.match(dressing,/this\\.battleBattery\\.add\\(dressing\\)/);
  assert.match(source,/this\\.battleBattery\\.visible=false;this\\.battleForegroundSail\\.visible=false/);
  assert.match(source,/this\\.ships\\.player\\.root\\.visible=false/,
    'first-person battle must not reintroduce two exterior ships');
  assert.match(source,/this\\.ships\\.player\\.root\\.visible=true/,
    'approved Porto still displays its live ship');
  assert.match(source,/this\\.battleBattery\\.visible=pose\\.showBattery/);
});
