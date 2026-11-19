import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeSingleBattleDeck} from '../src/battle-deck';
import {battleCameraPose,battleDeckMuzzleWorld} from '../src/battle-framing';
import {Battle} from '../src/battle';
import {projectileFromMuzzle} from '../src/battle-shot-presentation';

const sizes:[[number,number],[number,number],[number,number],[number,number]]=[
  [320,568],[384,512],[390,844],[430,932]
];

test('WORK0 #104: reduce the REAL central gun occlusion, not its firing geometry',()=>{
  const {group,muzzles,flashes}=makeSingleBattleDeck();
  assert.equal(muzzles.length,1);
  assert.equal(flashes.length,1);
  const barrel=group.getObjectByName('first-person-central-cannon');
  const bore=group.getObjectByName('first-person-central-muzzle');
  const recoil=group.getObjectByName('first-person-central-recoil');
  const smoke=group.getObjectByName('first-person-central-smoke');
  const blast=group.getObjectByName('first-person-central-blast-ring');
  const jet=group.getObjectByName('first-person-central-fire-jet');
  assert.ok(barrel instanceof T.Mesh && barrel.geometry instanceof T.CylinderGeometry);
  assert.ok(recoil && bore && smoke && blast && jet);
  // Both dimensions shrink substantially while keeping the cannon recognisable.
  assert.ok(barrel.geometry.parameters.height>13 && barrel.geometry.parameters.height<14.5,
    'shorter gun opens more of the opponent and horizon');
  assert.ok(barrel.geometry.parameters.radiusTop<1 && barrel.geometry.parameters.radiusBottom<1.4,
    'slimmer foreground silhouette, not two cannons');
  assert.equal(bore.parent,recoil);
  assert.equal(smoke.parent,recoil);
  assert.equal(blast.parent,recoil);
  assert.equal(jet.parent,recoil);
  assert.ok(muzzles[0].distanceTo(flashes[0].position)<.3);
  assert.ok(smoke.position.distanceTo(muzzles[0])<.65);
});

test('WORK0 #104: first-person muzzle clears centre without falling into mobile controls',()=>{
  const {group,muzzles}=makeSingleBattleDeck();
  const recoil=group.getObjectByName('first-person-central-recoil')!;
  for (const [width,height] of sizes) {
    const pose=battleCameraPose(width/height);
    assert.ok(pose.showBattery,'portrait uses one live gun');
    group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
    group.scale.setScalar(pose.batteryScale);
    const cam=new T.PerspectiveCamera(42,width/height,.1,220);
    cam.position.set(...pose.position);
    cam.lookAt(...pose.target);
    cam.updateMatrixWorld();
    const muzzle=battleDeckMuzzleWorld(recoil,muzzles[0]);
    const projected=muzzle.clone().project(cam);
    const x=(projected.x+1)/2;
    const y=(1-projected.y)/2;
    assert.ok(x>.40 && x<.60,`muzzle centered at ${width}x${height}: ${x}`);
    assert.ok(y>.55 && y<.63,`gun mouth clears enemy and CTA at ${width}x${height}: ${y}`);
    const game=new Battle(1261);
    assert.equal(game.fire(),true);
    const shot=game.shot!;
    assert.deepEqual(projectileFromMuzzle(shot,{x:muzzle.x,y:muzzle.y,z:muzzle.z}),
      {x:muzzle.x,y:muzzle.y,z:muzzle.z},'visible ball begins at the actual muzzle');
    recoil.rotation.y=.12;
    recoil.position.z+=.2;
    const shifted=battleDeckMuzzleWorld(recoil,muzzles[0]);
    assert.ok(shifted.distanceTo(muzzle)>.01,'aim and recoil really move the muzzle');
    recoil.rotation.y=0;recoil.position.z=68;
  }
});

test('WORK0 #104: only battle geometry changed; Porto, dock and deterministic gameplay remain separate',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const deck=readFileSync(new URL('../src/battle-deck.ts',import.meta.url),'utf8');
  assert.match(scene,/const battery=makeBattleDeck\(true\)/);
  assert.match(scene,/this\.ships\.player\.root\.visible=true/);
  assert.match(scene,/this\.battleBattery\.visible=false;this\.battleForegroundSail\.visible=false/);
  assert.match(scene,/firstPersonShotPosition\(s,visibleMuzzle,this\.playerArcTarget,this\.playerArcDuration\)/);
  assert.match(deck,/const mouth=new T\.Vector3\(0,4\.05,-13\.5\)/);
  const game=new Battle(26);game.aim(8,65);
  assert.equal(game.fire(),true);
  assert.equal(game.health.enemy,100);
  assert.equal(game.shotsFired,1);
});
