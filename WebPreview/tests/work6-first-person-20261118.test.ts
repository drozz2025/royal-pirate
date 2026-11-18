import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {battleCameraPose,battleDeckMuzzleWorld,battleEnemyBroadsideYaw} from '../src/battle-framing';
import {makeBattleDeck} from '../src/battle-deck';
import {Battle} from '../src/battle';
import {projectileFromMuzzle,firstPersonArc,firstPersonShotPosition} from '../src/battle-shot-presentation';

const view=(w:number,h:number,xyz:T.Vector3)=>{
  const pose=battleCameraPose(w/h);
  const camera=new T.PerspectiveCamera(42,w/h,.1,220);
  camera.position.set(...pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
  const p=xyz.clone().project(camera);
  return {x:(p.x+1)*w/2,y:(1-p.y)*h/2};
};

test('WORK6 18 Nov: battle mobile is a deck-level TRUE first-person single-cannon composition',()=>{
  const {group,muzzles,flashes}=makeBattleDeck(true);
  assert.equal(muzzles.length,1,'exactly one playable foreground cannon');
  assert.equal(flashes.length,1);
  assert.equal(group.getObjectByName('first-person-central-cannon') instanceof T.Mesh,true);
  const recoil=group.getObjectByName('first-person-central-recoil')!;
  assert.ok(recoil instanceof T.Group);
  assert.equal(group.getObjectByName('first-person-central-muzzle') instanceof T.Mesh,true);
  assert.ok(group.children.length<60,'bounded mobile render mesh budget');
  assert.ok(muzzles[0].distanceTo(flashes[0].position)<.3,'flash must be on the true mouth');

  for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
    const pose=battleCameraPose(w/h);
    assert.ok(pose.showBattery);
    assert.ok(pose.position[1]<=8,'camera belongs on player deck, not a high external ship view');
    group.position.set(pose.batteryOffsetX,0,pose.batteryOffsetZ);
    group.scale.setScalar(pose.batteryScale);
    recoil.position.z=0;
    const muzzle=battleDeckMuzzleWorld(recoil,muzzles[0]);
    const m=view(w,h,muzzle);
    assert.ok(m.x>w*.40 && m.x<w*.60, `central cannon muzzle at ${w}x${h}: ${m.x}`);
    assert.ok(m.y>h*.45 && m.y<h*.67,`mouth between enemy and bottom controls at ${w}x${h}: ${m.y}`);
    const enemy=view(w,h,new T.Vector3(10,0,-3));
    const mast=view(w,h,new T.Vector3(10,15,-3));
    assert.ok(enemy.x>w*.57&&enemy.x<w*.78,'enemy broadside should be ahead on right');
    assert.ok(enemy.y-mast.y>h*.20,'enemy sail/hull readable on all formats');
    const battle=new Battle();
    battle.fire();
    assert.deepEqual(projectileFromMuzzle(battle.shot!,{x:muzzle.x,y:muzzle.y,z:muzzle.z}),
      {x:muzzle.x,y:muzzle.y,z:muzzle.z},'ball begins exactly at real mouth');
    assert.ok(battleEnemyBroadsideYaw(w/h)<-1.0,'opponent is broadside, not bow-on');
  }
});

test('WORK6 one-cannon rig preserves live firing, recoil, HUD and approved Porto',()=>{
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(scene,/const battery=makeBattleDeck\(true\)/);
  assert.match(scene,/this\.battleForegroundSail\.visible=!pose\.showBattery/);
  assert.match(scene,/if\(this\.batteryMuzzles\.length===1\)return/);
  assert.match(scene,/battleDeckMuzzleWorld\(central,muzzle\)/);
  assert.match(scene,/centralRecoil\.position\.z=68\+batteryFx\.recoil/);
  assert.match(scene,/projectileFromMuzzle\(s,visibleMuzzle\)/);
  assert.match(scene,/this\.ships\.player\.root\.visible=false/);
  assert.match(scene,/this\.ships\.player\.root\.visible=true/);
  assert.match(scene,/this\.battleBattery\.visible=false;this\.battleForegroundSail\.visible=false/);
  const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  assert.match(main,/engine\.current\.fire\(\)/);
  assert.match(main,/value=\{yaw\}/);
  assert.match(main,/value=\{power\}/);
});

test('WORK6: rendered reticle and flying ball follow the SAME mouth-to-impact arc',()=>{
 const battle=new Battle(1261);battle.aim(7,65);assert.equal(battle.fire(),true);
 const shot=battle.shot!;
 const mouth={x:2,y:4.8,z:32};
 const impact={x:10,y:.4,z:-3};
 const flightTime=1.7;
 assert.deepEqual(firstPersonShotPosition(shot,mouth,impact,flightTime),mouth);
 for(const age of [.1,.4,.85,1.2,1.7]){
   const point=firstPersonShotPosition({...shot,age},mouth,impact,flightTime);
   assert.deepEqual(point,firstPersonArc(mouth,impact,age/flightTime));
   assert.ok(point.x>=mouth.x&&point.x<=impact.x);
   assert.ok(point.z>=impact.z&&point.z<=mouth.z);
 }
 const arrived=firstPersonShotPosition({...shot,age:flightTime},mouth,impact,flightTime);
 for(const coordinate of ['x','y','z'] as const)
   assert.ok(Math.abs(arrived[coordinate]-impact[coordinate])<1e-10,'arc lands on exact target');
 assert.deepEqual(firstPersonShotPosition({...shot,side:'enemy'},mouth,impact,flightTime),shot.position,
   'enemy ship keeps its original independent physics renderer');
 const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
 assert.match(scene,/const p=firstPersonArc\(mouth,impact/);
 assert.match(scene,/firstPersonShotPosition\(s,visibleMuzzle,this.playerArcTarget,this.playerArcDuration\)/);
 assert.match(scene,/this.playerArcTarget=end\?new T.Vector3/);
});
