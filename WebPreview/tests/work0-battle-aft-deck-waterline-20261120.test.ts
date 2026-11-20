import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeSingleBattleDeck} from '../src/battle-deck';
import {battleCameraPose} from '../src/battle-framing';

/** Regression for the real blue-water gap below the central gun in the
 * 390×844 and 320×568 screenshots. The gunner is standing ON a physical
 * deck; the sea must not replace its nearest half in portrait.
 */
test('WORK0 #104: true 3D teak reaches behind gunner camera on portrait phones',()=>{
  const {group,muzzles,flashes}=makeSingleBattleDeck();
  const aft=['first-person-deck-aft-oak','first-person-deck-aft-warm']
    .map(name=>group.getObjectByName(name));
  assert.ok(aft.every(obj=>obj instanceof T.InstancedMesh),
    'aft decking must be physical instanced timber, never a flat screenshot');
  assert.deepEqual(aft.map(obj=>(obj as T.InstancedMesh).count),[5,4],
    'exactly nine continuous planks, with only two extra draw calls');
  assert.equal(muzzles.length,1);
  assert.equal(flashes.length,1);
  assert.equal(group.getObjectByName('first-person-central-recoil')!==undefined,true);
  const matrix=new T.Matrix4(),center=new T.Vector3(),scale=new T.Vector3();
  let rear=Number.NEGATIVE_INFINITY,front=Number.POSITIVE_INFINITY,bottom=Number.POSITIVE_INFINITY;
  for(const obj of aft){
    const mesh=obj as T.InstancedMesh;
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);
      center.setFromMatrixPosition(matrix);
      scale.setFromMatrixScale(matrix);
      rear=Math.max(rear,center.z+scale.z/2);
      front=Math.min(front,center.z-scale.z/2);
      bottom=Math.min(bottom,center.y-scale.y/2);
    }
  }
  assert.ok(front<76,'new aft planks overlap the old decking rather than leaving a seam');
  assert.ok(bottom>-.05,'physical deck stands ABOVE sea level at all points');
  for(const [width,height] of [[320,568],[384,512],[390,844],[430,932]]){
    const pose=battleCameraPose(width/height);
    assert.equal(pose.showBattery,true);
    const aftWorldZ=pose.batteryOffsetZ+rear*pose.batteryScale;
    assert.ok(aftWorldZ>pose.position[2]+2,
      `teak ends before gunner camera at ${width}×${height}: ${aftWorldZ}`);
  }
  // Never create duplicate exterior ships or a second functional gun.
  assert.equal(group.getObjectByName('first-person-broadside-cannon'),undefined);
});
