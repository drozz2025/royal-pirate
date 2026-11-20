/**
 * WORK5 — non-invasive QA: WebPreview v0.1.114 baseline.
 * Real node:test domain/SSR checks; NO phone, browser hit testing, pixel
 * comparison, live HTTP, WebGL or publishing is claimed by this suite.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Battle,segmentBox,collision,type Vec} from '../src/battle.ts';
import {bearingFromDrag,powerFromClientX} from '../src/battle-touch.ts';
import {AppScreens,type AppScreenId} from '../src/app-screens.tsx';
import {Harbour} from '../src/harbour.tsx';
import {STORAGE_KEY,initialProfile,finishBattle,claimDaily,
  exportProfileBackup,importProfileBackup,parseProfile,type LocalProfile} from '../src/progression.ts';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const noop=()=>{};
const views:AppScreenId[]=['battle','fleet','forge','cards','shop','missions',
  'ranking','profile','chests','events','rewards','offers'];
function panel(screen:AppScreenId,profile:LocalProfile):string {
  return renderToStaticMarkup(React.createElement(AppScreens,{
    screen,profile,onNavigate:noop,onClose:noop,onBattle:noop,
    onBuyCrew:noop,onEquipCrew:noop,onUpgrade:noop,onMission:noop,
    onDaily:noop,onExportBackup:noop,onImportBackup:noop,
    onSetPlayerName:noop,backupMessage:''
  }));
}

test('swept projectile collision catches frame-skipping without phantom hits',()=>{
  const boxMin:Vec={x:9,y:0,z:-4},boxMax:Vec={x:11,y:2,z:-2};
  const start:Vec={x:0,y:1,z:-3},end:Vec={x:20,y:1,z:-3};
  assert.equal(segmentBox(start,end,boxMin,boxMax),.45);
  assert.equal(segmentBox(end,start,boxMin,boxMax),.45);
  assert.equal(segmentBox({x:0,y:8,z:-3},{x:20,y:8,z:-3},boxMin,boxMax),null);
  assert.equal(segmentBox({x:10,y:1,z:-3},{x:10,y:1,z:-3},boxMin,boxMax),0);
  assert.equal(segmentBox({x:15,y:1,z:-3},{x:15,y:1,z:-3},boxMin,boxMax),null);
  assert.equal(collision(start,end,'player')?.type,'hit');
  assert.equal(collision({x:0,y:1,z:10},{x:20,y:1,z:10},'player'),null);
});

test('seeded battles repeat exactly; invalid time steps and double fire do not advance turns',()=>{
  const simulate=(seed:number)=>{
    const b=new Battle(seed);
    const trace:string[]=[];
    assert.equal(b.phase,'ready');
    b.tick(NaN);b.tick(Infinity);b.tick(0);b.tick(-.2);
    assert.equal(b.phase,'ready');
    b.aim(1_000,-100);
    assert.equal(b.yaw,25);assert.equal(b.power,20);
    b.aim(0,65);
    for(let turn=0;turn<5&&b.phase==='ready';turn++){
      assert.equal(b.fire(),true);
      assert.equal(b.fire(),false,'duplicate fire event must be suppressed');
      assert.equal(b.shotsFired,turn+1);
      for(let step=0;step<360&&b.phase!=='ready'&&b.phase!=='victory'&&b.phase!=='defeat';step++){
        b.tick(.1);
        for(const e of b.drainEvents()){
          assert.ok([e.position.x,e.position.y,e.position.z].every(Number.isFinite));
          trace.push([e.type,e.side,e.damage??0].join(':'));
        }
      }
      assert.ok(b.phase==='ready'||b.phase==='victory'||b.phase==='defeat',
        'simulation must leave the in-flight phase');
      assert.ok(b.health.player>=0&&b.health.enemy>=0);
      assert.ok(b.hits<=b.shotsFired);
    }
    const result={phase:b.phase,shots:b.shotsFired,health:{...b.health},trace};
    b.reset();
    assert.equal(b.phase,'ready');assert.equal(b.shotsFired,0);
    assert.deepEqual(b.health,{player:100,enemy:100});
    return result;
  };
  for(const seed of [1,1261,20261120]){
    assert.deepEqual(simulate(seed),simulate(seed),'same seed must yield same results');
  }
});

test('portrait aim/power mapping stays finite and monotone at iPhone-sized widths',()=>{
  for(const width of [320,375,384,390,430]){
    let yaw=-26,power=19;
    for(let x=-width;x<=2*width;x+=7){
      const y=bearingFromDrag(0,width/2,x,width),p=powerFromClientX(x,0,width);
      assert.ok(Number.isInteger(y)&&y>=-25&&y<=25);
      assert.ok(Number.isInteger(p)&&p>=20&&p<=100);
      assert.ok(y>=yaw&&p>=power,'swipes must not reverse sign across the screen');
      yaw=y;power=p;
    }
    assert.equal(bearingFromDrag(0,0,width,width),25);
    assert.equal(bearingFromDrag(0,width,0,width),-25);
    assert.equal(powerFromClientX(0,0,width),20);
    assert.equal(powerFromClientX(width,0,width),100);
  }
  assert.equal(bearingFromDrag(NaN,0,100,390),0);
  assert.equal(powerFromClientX(Infinity,0,390),20);
});

test('backup parser rejects schema, money, ledger and battle-log tampering',()=>{
  const now=Date.parse('2026-11-20T04:00:00.000Z');
  const played=finishBattle(initialProfile(),'victory',3,5,now);
  const good=exportProfileBackup(played,now);
  assert.deepEqual(importProfileBackup(good),played);
  const corruptions:Array<[string,(x:any)=>void]>=[
    ['format',x=>{x.format='not-royal-pirate';}],
    ['format version',x=>{x.version=2;}],
    ['profile version',x=>{x.profile.version=2;}],
    ['negative gold',x=>{x.profile.coins=-1;}],
    ['fractional gold',x=>{x.profile.coins=3.5;}],
    ['infinite gold',x=>{x.profile.coins=1e50;}],
    ['impossible hits',x=>{x.profile.hits=x.profile.shots+1;}],
    ['duplicate owned crew',x=>{x.profile.ownedCrew.push('captain');}],
    ['unknown crew',x=>{x.profile.ownedCrew.push('pirate-god');}],
    ['unowned equipped crew',x=>{x.profile.equippedCrew='gunner';}],
    ['over-cap upgrade',x=>{x.profile.upgrades.hull=6;}],
    ['unknown mission',x=>{x.profile.claimedMissions=['invalid'];}],
    ['impossible streak',x=>{x.profile.dailyStreak=8;}],
    ['battle payout fraud',x=>{x.profile.battleLog[0].earnedCoins=9000;}],
    ['battle ratio fraud',x=>{x.profile.battleLog[0].hits=6;}]
  ];
  for(const [why,mutate] of corruptions){
    const data=JSON.parse(good);mutate(data);
    assert.throws(()=>importProfileBackup(JSON.stringify(data)),Error,why);
  }
  assert.throws(()=>importProfileBackup('this is not JSON'),/not valid JSON/);
  assert.throws(()=>importProfileBackup('x'.repeat(65_537)),/64 KB/);
  assert.equal(parseProfile('{"version":5000,"coins":9000}').coins,0);
});

test('local save restores a real battle and UTC leap-day claims without duplicate rewards',()=>{
  const day1=Date.parse('2028-02-28T23:59:59Z');
  const day2=Date.parse('2028-02-29T00:00:00Z');
  const day3=Date.parse('2028-03-01T00:00:00Z');
  let p=finishBattle(initialProfile(),'victory',2,4,day1);
  p=claimDaily(p,day1);
  assert.equal(p.coins,55);
  assert.strictEqual(claimDaily(p,day1),p);
  p=claimDaily(p,day2);
  assert.equal(p.coins,80);
  assert.strictEqual(claimDaily(p,day2),p);
  p=claimDaily(p,day3);
  assert.equal(p.coins,110);assert.equal(p.dailyStreak,3);
  const again=importProfileBackup(exportProfileBackup(p,day3));
  assert.deepEqual(again,p);
  assert.equal(again.battleLog[0].earnedCoins,35);
  assert.equal(again.battleLog[0].completedAt,new Date(day1).toISOString());
  assert.match(STORAGE_KEY,/v1$/);
});

test('all eight primary sheets and four utility sheets keep accessible navigation and saved economy',()=>{
  const p={...initialProfile(),playerName:'Navegador & Co',coins:140};
  const harbour=renderToStaticMarkup(React.createElement(Harbour,{
    profile:p,onBattle:noop,onNavigate:noop
  }));
  assert.match(harbour,/aria-label="Royal Pirate Porto"/);
  assert.match(harbour,/aria-label="140 locally earned coins"/);
  for(const view of views){
    const html=panel(view,p);
    assert.match(html,/role="dialog" aria-modal="true"/,view);
    assert.match(html,/aria-labelledby="app-screen-title"/,view);
    assert.match(html,/role="status" aria-live="polite"/,view);
    assert.match(html,/aria-label="140 moedas de ouro ganhas localmente"/,view);
    assert.match(html,/aria-label="Main game screens"/,view);
    const dock=html.match(/<nav class="harbour-nav app-dock-porto"[^>]*>[\s\S]*?<\/nav>/)?.[0];
    assert.ok(dock,'missing 5-way dock in '+view);
    assert.equal((dock.match(/<button\b/g)||[]).length,5,view);
    assert.doesNotMatch(html,/href="(?:#|javascript:[^"]*|)"/i,view+' has a dead placeholder link');
    assert.equal((html.match(/id="app-screen-title"/g)||[]).length,1,view);
  }
});

test('HTML version and mobile viewport metadata follow the real package build',()=>{
  const pkg=JSON.parse(read('../package.json')) as {version:string;scripts:Record<string,string>};
  const index=read('../index.html');
  assert.match(index,/name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/);
  assert.ok(index.includes('v'+pkg.version),'HTML version badge differs from package.json');
  assert.match(index,/name="apple-mobile-web-app-capable"/);
  assert.match(index,/name="theme-color"/);
  assert.match(pkg.scripts.test,/node --import tsx --test/);
  assert.match(pkg.scripts.build,/tsc --noEmit/);
  const css=read('../src/style.css');
  assert.match(css,/@media\s*\(max-width:600px\) and \(max-height:567px\)\s*\{\s*\.app\{min-height:0;height:100dvh\}/,
    'short 384x512 viewport must not inherit the old 570px app floor');
});

// Explicitly NOT green tests. Each needs a different work owner or real-browser evidence.
test.todo('Issue #527: remove the non-navigating brand href="#" from live battle header');
test.todo('Issue #54: reject impossible/future YYYY-MM-DD dates in imported saves');
test.todo('Issue #90: battle UI must enforce 10-second timer and 10-shot limit');
test.todo('Issues #152/#153: real cross-tab localStorage conflict must preserve newer name and coins');
test.todo('Issue #104: real Chromium 320x568/384x512 swipe, pinch, overflow and dock hit tests; physical iPhone not tested');
