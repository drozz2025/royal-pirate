import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeBattleDeck} from '../src/battle-deck';
import {battleDeckMuzzleWorld} from '../src/battle-framing';
import {firstPersonShotPosition} from '../src/battle-shot-presentation';
import {launch} from '../src/battle';

test('WORK0 #104: first-person ball starts at the real central muzzle and stays anchored through recoil',()=>{
  const {group,muzzles}=makeBattleDeck(true);
  assert.equal(muzzles.length,1,'portrait fight has ONE cannon');
  group.position.set(1.8,0,-30);
  group.scale.setScalar(.84);
  const recoil=group.getObjectByName('first-person-central-recoil');
  assert.ok(recoil,'actual pivot is present in the live geometry');
  const ignition=battleDeckMuzzleWorld(recoil,muzzles[0]);
  const ball=launch('player',0,65);
  const target={x:8,y:0,z:-6};
  const origin={x:ignition.x,y:ignition.y,z:ignition.z};
  assert.deepEqual(firstPersonShotPosition(ball,origin,target,1.5),origin,
    'shot frame 0 must be exactly at the mouth of the visible 3D gun');

  // Simulate gun's live recoil while the ball is already flying. The launch
  // point is immutable and MUST NOT follow the moving barrel during flight.
  recoil.position.z+=.75;
  const moving=battleDeckMuzzleWorld(recoil,muzzles[0]);
  assert.ok(moving.distanceTo(ignition)>.5,'recoil physically moves the muzzle');
  ball.age=.20;
  const stable=firstPersonShotPosition(ball,origin,target,1.5);
  const incorrect=firstPersonShotPosition(ball,moving,target,1.5);
  assert.ok(Math.hypot(stable.x-incorrect.x,stable.y-incorrect.y,stable.z-incorrect.z)>.2,
    'reusing the live recoiling mouth creates a visible trajectory jump');
  assert.deepEqual(firstPersonShotPosition(ball,origin,target,1.5),stable);
  assert.deepEqual(origin,{x:ignition.x,y:ignition.y,z:ignition.z});
});

test('WORK0 #104: battle renderer caches firing muzzle and never retargets ball from recoil',()=>{
  const code=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.ok(code.includes('private playerShotMuzzle:T.Vector3|null=null'));
  assert.ok(code.includes('this.playerShotMuzzle=this.battleBattery.visible?'));
  assert.ok(code.includes('(this.playerShotMuzzle??this.playerMuzzleWorld())'));
  assert.ok(code.includes('this.playerShotMuzzle=null;this.playerArcTarget=null'));
  assert.ok(code.includes("vfxOrigin=event.type==='fire'"),
    'flash and smoke still originate at the live cannon muzzle');
});
