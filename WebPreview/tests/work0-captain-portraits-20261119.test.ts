import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const main=read('../src/main.tsx');
const css=read('../src/battle-layout-reset.css');

test('WORK0 #104: Batalha has two genuine distinct live captain illustrations',()=>{
 assert.match(main,/import \{ PirateIcon \} from '\.\/app-icons';/);
 assert.match(main,/function BattleEnemyPortrait\(\)/);
 assert.match(main,/className="battle-enemy-face"/);
 assert.match(main,/name="profile" size=\{42\}/);
 assert.match(main,/battle-captain-medallion/);
 assert.match(main,/enemy\?<BattleEnemyPortrait\/>:<PirateIcon/);
 assert.match(main,/role="progressbar"/);
 assert.match(main,/aria-valuenow=\{value\}/);
 assert.doesNotMatch(main,/src=.*(?:02-batalha\.webp|referencia-original-aprovada)/);
});

test('WORK0 #104: portraits preserve usable portrait HUD on 320–430 mobile without altering Porto',()=>{
 assert.match(css,/@media \(max-width:600px\) \{[\s\S]*?\.in-battle \.health-card \.battle-captain-medallion/);
 assert.match(css,/\.in-battle \.health-card\.enemy \{padding:/);
 assert.match(css,/\.in-battle \.health-card\.enemy \.battle-captain-medallion/);
 assert.match(css,/@media \(max-width:350px\) \{[\s\S]*?\.in-battle \.battle-captain-medallion svg/);
 assert.match(css,/\.in-battle \.health-card \.health-detail \{[\s\S]*?min-width:0/);
 assert.doesNotMatch(css,/\n\.harbour-(?:nav|screen|profile)\s*\{/);
 for(const control of ['engine.current.fire()','value={yaw}','value={power}','onClick={returnHarbour}'])
   assert.ok(main.includes(control),control+' preserved');
});
