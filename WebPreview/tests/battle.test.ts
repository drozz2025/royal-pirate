import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Battle,launch,positionAt,segmentBox,predict,collision} from '../src/battle.ts';
function settle(b:Battle){for(let i=0;i<2400&&!['ready','victory','defeat'].includes(b.phase);i++){b.tick(1/60);b.drainEvents();}assert.ok(['ready','victory','defeat'].includes(b.phase),'turn must settle');}
function match(miss=false,seed=1261){const b=new Battle(seed);for(let round=0;round<30&&!['victory','defeat'].includes(b.phase);round++){b.aim(miss?25:0,miss?20:65);assert.ok(b.fire());settle(b);}return b;}
test('starts ready at full health',()=>{const b=new Battle();assert.equal(b.phase,'ready');assert.deepEqual(b.health,{player:100,enemy:100});});
test('controls clamp finite values and reject NaN',()=>{const b=new Battle();b.aim(100,1000);assert.equal(b.yaw,25);assert.equal(b.power,100);b.aim(NaN,40);assert.equal(b.power,100);b.aim(-100,-30);assert.equal(b.yaw,-25);assert.equal(b.power,20);});
test('rejects double fire and changing aim in flight',()=>{const b=new Battle();assert.ok(b.fire());assert.equal(b.fire(),false);b.aim(20,30);assert.equal(b.power,65);assert.equal(b.shotsFired,1);});
test('projectile obeys gravity and initial velocity',()=>{const s=launch('player',0,65),p=positionAt(s,1);assert.equal(p.x,s.origin.x+s.velocity.x);assert.equal(p.y,s.origin.y+s.velocity.y-6);});
test('direction changes the actual trajectory',()=>{const a=positionAt(launch('player',-20,65),1),b=positionAt(launch('player',20,65),1);assert.ok(Math.abs(a.z-b.z)>5);});
test('power changes range',()=>{const a=predict(0,20).at(-1)!,b=predict(0,100).at(-1)!;assert.ok(b.x-a.x>10);});
test('swept collision catches high speed tunnelling',()=>{assert.equal(segmentBox({x:-100,y:1,z:0},{x:100,y:1,z:0},{x:0,y:0,z:-1},{x:1,y:2,z:1}),.5);});
test('parallel segment outside box does not collide',()=>{assert.equal(segmentBox({x:0,y:3,z:0},{x:10,y:3,z:0},{x:1,y:0,z:-1},{x:2,y:2,z:1}),null);});
test('default broadside hits and produces damage event',()=>{const b=new Battle();b.fire();let hit=false;for(let i=0;i<600&&b.phase==='player-flight';i++){b.tick(1/60);for(const e of b.drainEvents())if(e.type==='hit'&&e.side==='enemy')hit=true;}assert.ok(hit);assert.equal(b.health.enemy,71);assert.equal(b.phase,'enemy-aim');});
test('deliberate short shot splashes without enemy damage',()=>{const b=new Battle();b.aim(25,20);b.fire();while(b.phase==='player-flight')b.tick(1/60);assert.equal(b.health.enemy,100);assert.ok(b.drainEvents().some(e=>e.type==='splash'));});
test('AI responds with a projectile and returns control',()=>{const b=new Battle();b.fire();let ai=false;for(let i=0;i<900;i++){b.tick(1/60);for(const e of b.drainEvents())if(e.type==='fire'&&e.side==='enemy')ai=true;if(b.phase==='ready')break;}assert.ok(ai);assert.equal(b.phase,'ready');assert.equal(b.round,2);});
test('four accurate broadsides lead to victory',()=>{const b=match();assert.equal(b.phase,'victory');assert.equal(b.health.enemy,0);assert.equal(b.hits,4);assert.ok(b.health.player>0);assert.equal(b.fire(),false);});
test('repeated misses lead to defeat',()=>{const b=match(true);assert.equal(b.phase,'defeat');assert.equal(b.health.player,0);assert.equal(b.health.enemy,100);assert.equal(b.fire(),false);});
test('restart during flight cancels stale projectile and resets stats',()=>{const b=new Battle();b.fire();b.tick(.2);b.reset();b.tick(.2);assert.equal(b.shot,null);assert.equal(b.phase,'ready');assert.equal(b.shotsFired,0);assert.deepEqual(b.health,{player:100,enemy:100});assert.equal(b.events.length,0);});
test('restart while AI waits cancels future enemy shot',()=>{const b=new Battle();b.fire();while(b.phase==='player-flight')b.tick(1/60);b.reset();for(let i=0;i<100;i++)b.tick(.1);assert.equal(b.phase,'ready');assert.equal(b.shot,null);});
test('restart after victory allows a fresh full battle',()=>{const b=match();b.reset();for(let i=0;i<4;i++){b.fire();settle(b);}assert.equal(b.phase,'victory');assert.equal(b.hits,4);});
test('trajectory guide terminates at the same target as simulation',()=>{const p=predict(0,65).at(-1)!;assert.ok(p.x>8&&p.x<12);assert.ok(p.y>.25&&p.y<2.6);});
test('water collision precedes box if segment reaches sea first',()=>{const hit=collision({x:0,y:1,z:-3},{x:20,y:-4,z:-3},'player');assert.equal(hit?.type,'splash');assert.ok(Math.abs(hit!.position.y-.08)<1e-6);});
test('200 seeded accurate and missed matches terminate with bounded health',()=>{for(let seed=1;seed<=100;seed++){for(const miss of [false,true]){const b=match(miss,seed);assert.equal(b.phase,miss?'defeat':'victory');assert.ok(b.health.player>=0&&b.health.enemy>=0);assert.ok(b.round<=30);}}});
test('large frame delta is bounded; no negative/NaN time advances',()=>{const b=new Battle();b.fire();b.tick(10);assert.ok(b.shot!.age<=.251);const age=b.shot!.age;b.tick(NaN);b.tick(-1);assert.equal(b.shot!.age,age);});
