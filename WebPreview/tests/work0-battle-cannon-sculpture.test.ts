import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeBattleDeck} from '../src/battle-deck';
import {battleDeckMuzzleWorld,battleCameraPose} from '../src/battle-framing';
import {projectileFromMuzzle} from '../src/battle-shot-presentation';
import {launch} from '../src/battle';

test('WORK0 #104: mobile battle uses a genuine hollow-profile barrel with cast trunnions',()=>{
  const {group,flashes,muzzles}=makeBattleDeck(true);
  assert.equal(muzzles.length,1,'first person has only one live cannon');
  assert.equal(flashes.length,1);
  const recoil=group.getObjectByName('first-person-central-recoil')!;
  const barrel=recoil.getObjectByName('first-person-central-cannon') as T.Mesh;
  assert.ok(barrel);
  assert.ok(barrel.geometry instanceof T.LatheGeometry,'not a featureless cylinder or flat image');
  barrel.geometry.computeBoundingBox();
  const box=barrel.geometry.boundingBox!;
  assert.ok(box.max.x>1.2&&box.min.x< -1.2,'the real mouth flares beyond shaft width');
  assert.ok(recoil.getObjectByName('first-person-port-trunnion') instanceof T.Mesh);
  assert.ok(recoil.getObjectByName('first-person-starboard-trunnion') instanceof T.Mesh);
  const dark=recoil.getObjectByName('first-person-central-muzzle') as T.Mesh;
  assert.ok(dark);
  const fwd=muzzles[0].clone().sub(new T.Vector3(0,1.80,0)).normalize();
  const recessed=muzzles[0].clone().sub(dark.position).dot(fwd);
  assert.ok(recessed>.35&&recessed<.50,'bore must be inside the physical metal lip');
  assert.ok(recoil.getObjectByName('first-person-central-flash') instanceof T.Mesh);
  assert.equal(group.name,'battle-foreground-cannons');
  assert.ok(group.children.length<60,'do not exceed existing phone draw-object budget');
});

test('WORK0 #104: real shot origin remains coincident with one cannon mouth across portrait crops',()=>{
  const {group,muzzles}=makeBattleDeck(true);
  const barrel=group.getObjectByName('first-person-central-recoil')!;
  for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
    const pose=battleCameraPose(w/h);
    group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
    group.scale.setScalar(pose.batteryScale);
    const world=battleDeckMuzzleWorld(barrel,muzzles[0]);
    const rendered=projectileFromMuzzle(launch('player',0,65),world);
    assert.deepEqual(rendered,{x:world.x,y:world.y,z:world.z});
    const camera=new T.PerspectiveCamera(42,w/h,.1,220);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld();
    const projected=world.clone().project(camera);
    assert.ok(Math.abs(projected.x)<.22,'the real cast bore stays close to the centreline at '+w+'x'+h);
    assert.ok(Number.isFinite(projected.y),'finite projection');
  }
});
