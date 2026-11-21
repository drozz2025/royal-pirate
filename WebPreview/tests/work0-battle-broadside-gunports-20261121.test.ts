import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeBattleEnemyOrnaments} from '../src/battle-enemy-ornaments';

// The owner-approved 02 Batalha is a readable enemy BROADSIDE in the live
// first-person view. These are original decorative GPU instances, not eight
// additional simulated weapons, alternative shots or fake hitboxes.
test('WORK0/#104: eight opponent gunports are sculpted on the live enemy hull in four GPU batches',()=>{
  const art=makeBattleEnemyOrnaments();
  assert.equal(art.userData.battleOnly,true);
  const names=[
    'battle-broadside-gunport-bore',
    'battle-broadside-gunport-brass',
    'battle-broadside-gunport-iron',
    'battle-broadside-gunport-mouth'
  ];
  for(const name of names){
    const mesh=art.getObjectByName(name);
    assert.ok(mesh instanceof T.InstancedMesh,name+' must be geometry rather than a screenshot or DOM element');
    assert.equal(mesh.count,8,'four authentic ports on each physical-facing side: '+name);
    const matrix=new T.Matrix4(),point=new T.Vector3();
    const seen=new Set<string>();
    for(let index=0;index<mesh.count;index++){
      mesh.getMatrixAt(index,matrix);
      point.setFromMatrixPosition(matrix);
      assert.ok([point.x,point.y,point.z].every(Number.isFinite),name+' finite position');
      assert.ok(Math.abs(point.x)>1.3&&Math.abs(point.x)<3.0,'ports remain outboard of the hull centre');
      assert.ok(Math.abs(point.y-.59)<.01,'ports remain on existing gun deck');
      assert.ok(point.z>=-3.21&&point.z<=2.86,'ports remain along the sculpted broadside');
      seen.add(Math.sign(point.x)+':'+point.z.toFixed(2));
    }
    assert.equal(seen.size,8,'port geometry must not stack on itself');
  }
  assert.equal(art.getObjectByName('first-person-central-recoil'),undefined,
    'opponent decoration cannot create a second player cannon');
});
