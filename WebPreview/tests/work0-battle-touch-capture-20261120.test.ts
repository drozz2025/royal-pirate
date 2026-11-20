import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bearingFromDrag,powerFromClientX} from '../src/battle-touch.ts';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('WORK0 #104: first-finger capture survives secondary touch on the battle canvas',()=>{
  const source=read('../src/main.tsx');
  assert.match(source,/if\(!event\.isPrimary\)return;/);
  assert.doesNotMatch(source,/if\(!event\.isPrimary\)\{aimPointer\.current=null/);
  assert.match(source,/event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(source,/start\.id!==event\.pointerId/);
  assert.match(source,/event\.currentTarget\.hasPointerCapture\(event\.pointerId\)/);
});

test('WORK0 #104: release commits exact yaw; pointercancel never applies release aim',()=>{
  const source=read('../src/main.tsx');
  assert.match(source,/event\.type==='pointerup'&&engine\.current\.phase==='ready'/);
  assert.match(source,/aim\(bearingFromDrag\(aimPointer\.current\.startYaw,aimPointer\.current\.startX,event\.clientX,event\.currentTarget\.clientWidth\),engine\.current\.power\)/);
  for(const width of [320,384,390,430]){
    assert.equal(bearingFromDrag(0,width/2,width/2+width*.3,width),15);
    assert.equal(bearingFromDrag(0,width/2,width/2-width*.3,width),-15);
    assert.equal(bearingFromDrag(0,width/2,width*2,width),25);
  }
});

test('WORK0 #104: iPhone slider touches block browser scrolling while keyboard remains',()=>{
  const css=read('../src/battle-layout-reset.css');
  const source=read('../src/main.tsx');
  assert.match(css,/\.in-battle \.command-deck \.sliders input \{height:30px;margin:0;touch-action:none\}/);
  assert.match(source,/onPointerDown=\{e=>\{if\(!ready\)return;e\.currentTarget\.focus\(\);e\.currentTarget\.setPointerCapture\(e\.pointerId\);onPowerPointer\(e\);\}\}/);
  assert.ok(source.includes('value={yaw}'));
  assert.ok(source.includes('value={power}'));
  assert.ok(source.includes('onChange={e=>aim(yaw,+e.target.value)}'));
  assert.equal(powerFromClientX(-100,20,200),20);
  assert.equal(powerFromClientX(500,20,200),100);
  assert.doesNotMatch(css,/\.harbour-(?:nav|screen)/);
});
