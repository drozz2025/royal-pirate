import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {makeSingleBattleDeck} from '../src/battle-deck';
import {battleDeckMuzzleWorld,battleCameraPose} from '../src/battle-framing';
import {projectileFromMuzzle} from '../src/battle-shot-presentation';
import {launch} from '../src/battle';

test('WORK0 #104: first-person mobile has one richly sculpted deck, never extra guns',()=>{
  const {group,flashes,muzzles}=makeSingleBattleDeck();
  const premium=group.getObjectByName('first-person-premium-gundeck');
  assert.ok(premium instanceof T.Group,'new physical gunner-deck dressing is required');
  assert.equal(group.getObjectByName('first-person-central-cannon') instanceof T.Mesh,true);
  assert.equal(group.getObjectByName('first-person-central-muzzle') instanceof T.Mesh,true);
  assert.equal(flashes.length,1);
  assert.equal(muzzles.length,1);
  assert.ok(group.children.length<60,'bounded root object/draw-call budget');
  for(const side of ['port','starboard']){
    for(const item of ['first-person-gunwale-','first-person-gunwale-gold-',
      'first-person-rubbing-strake-','first-person-breeching-rope-']){
      const mesh=premium.getObjectByName(item+side);
      assert.ok(mesh instanceof T.Mesh,'missing 3D '+item+side);
      // TubeGeometry stores its CatmullRom coordinates in vertex positions:
      // mesh.position.x is zero even when the ENTIRE rail is far outboard.
      if(item.startsWith('first-person-breeching-rope-')){
        assert.ok(Math.abs(mesh.position.x)>3.8,
          'rope cannot occlude the live centre-line bore');
      }else{
        assert.ok(mesh.geometry instanceof T.TubeGeometry,'real shaped rail required');
        const vertices=mesh.geometry.getAttribute('position');
        let nearest=Infinity;
        for(let vertex=0;vertex<vertices.count;vertex++)
          nearest=Math.min(nearest,Math.abs(vertices.getX(vertex)+mesh.position.x));
        assert.ok(nearest>3.8,'entire 3D curved rail must remain outboard');
      }
    }
  }
  const studs=premium.getObjectByName('first-person-deck-nails');
  assert.ok(studs instanceof T.InstancedMesh,'repeated fasteners must be one draw call');
  assert.equal(studs.count,18);
  // Exact same 36 original fittings, now three instanced draws instead of 36.
  const batches=['first-person-deck-oak-batch','first-person-deck-iron-batch',
    'first-person-deck-brass-batch'].map(name=>premium.getObjectByName(name));
  for(const batch of batches)assert.ok(batch instanceof T.InstancedMesh,'real batched deck fitting');
  assert.deepEqual(batches.map(b=>(b as T.InstancedMesh).count),[12,10,14]);
  assert.equal(batches.reduce((sum,b)=>sum+(b as T.InstancedMesh).count,0),36);
  assert.ok(premium.children.length<=16,'mobile deck must fit bounded render draw-call budget');
});

test('WORK0 #104: muzzle-to-projectile 3D alignment and porto isolation hold on four phones',()=>{
  const {group,muzzles,flashes}=makeSingleBattleDeck();
  const recoil=group.getObjectByName('first-person-central-recoil')!;
  assert.equal(flashes[0].parent,recoil);
  for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
    const pose=battleCameraPose(w/h);
    group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
    group.scale.setScalar(pose.batteryScale);
    const liveMuzzle=battleDeckMuzzleWorld(recoil,muzzles[0]);
    const shot=launch('player',0,65);
    assert.deepEqual(projectileFromMuzzle(shot,{x:liveMuzzle.x,y:liveMuzzle.y,z:liveMuzzle.z}),
      {x:liveMuzzle.x,y:liveMuzzle.y,z:liveMuzzle.z},'ball originates at actual bore');
    assert.ok(group.getObjectByName('first-person-premium-gundeck'));
  }
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(scene,/const battery=makeBattleDeck\(true\)/);
  assert.match(scene,/this\.battleBattery\.visible=false;this\.battleForegroundSail\.visible=false/);
  assert.match(scene,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/);
});
