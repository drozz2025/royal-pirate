import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeSingleBattleDeck} from '../src/battle-deck';
import {battleDeckMuzzleWorld} from '../src/battle-framing';
import {cannonFxState} from '../src/cannon-vfx';

// These are real Three.js geometry assertions, not screenshots or string
// guesses about the collision simulator. No WebGL/browser required here.
test('WORK0: one live central muzzle, blast jet coaxial with its actual bore',()=>{
  const {group,muzzles,flashes}=makeSingleBattleDeck();
  assert.equal(group.userData.firstPersonCentral,true);
  assert.equal(muzzles.length,1);
  assert.equal(flashes.length,1);
  const recoil=group.getObjectByName('first-person-central-recoil');
  const jet=group.getObjectByName('first-person-central-fire-jet') as T.Mesh|undefined;
  const smoke=group.getObjectByName('first-person-central-smoke');
  const ring=group.getObjectByName('first-person-central-blast-ring');
  assert.ok(recoil&&jet&&smoke&&ring);
  assert.equal(jet.parent,recoil);
  assert.equal(smoke.parent,recoil);
  assert.equal(ring.parent,recoil);
  assert.equal(jet.visible,false);
  assert.equal(smoke.visible,false);
  const mouthWorld=battleDeckMuzzleWorld(recoil,muzzles[0]);
  const breechWorld=recoil.localToWorld(new T.Vector3(0,1.80,0));
  const barrelAxis=mouthWorld.clone().sub(breechWorld).normalize();
  const jetOffset=jet.getWorldPosition(new T.Vector3()).sub(mouthWorld);
  assert.ok(jetOffset.dot(barrelAxis)>1.3,'jet must be in FRONT of the muzzle');
  assert.ok(jetOffset.clone().cross(barrelAxis).length()<.001,'jet must sit on barrel axis');

  // Steering and recoil change the true muzzle and its blast together.
  recoil.rotation.y=.16;
  recoil.position.z+=.35;
  const steeredMuzzle=battleDeckMuzzleWorld(recoil,muzzles[0]);
  const steeredBreech=recoil.localToWorld(new T.Vector3(0,1.80,0));
  const steeredAxis=steeredMuzzle.clone().sub(steeredBreech).normalize();
  const steeredJet=jet.getWorldPosition(new T.Vector3()).sub(steeredMuzzle);
  assert.ok(steeredJet.dot(steeredAxis)>1.3);
  assert.ok(steeredJet.clone().cross(steeredAxis).length()<.001);
  assert.ok(steeredMuzzle.distanceTo(mouthWorld)>.01);
});

test('WORK0: muzzle jet and camera-visible ball are only presentation',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const deck=readFileSync(new URL('../src/battle-deck.ts',import.meta.url),'utf8');
  assert.match(deck,/first-person-central-fire-jet/);
  assert.match(scene,/centralJet.visible=this.battleBattery.visible&&batteryFx.visible/);
  assert.match(scene,/this.ballAura.visible=s.side==='player'&&this.battleBattery.visible/);
  assert.match(scene,/this.ballAura.position.copy\(this.ball.position\)/);
  assert.match(scene,/this.ballAura.visible=false;this.trail.visible=false/);
  assert.match(scene,/this.path.visible=false;this.marker.visible=false;this.ball.visible=false;this.ballAura.visible=false/);
  const fx=cannonFxState(.08);
  assert.equal(fx.visible,true);
  assert.ok(fx.flashOpacity>.1);
  assert.equal(cannonFxState(.46).visible,false);
});
