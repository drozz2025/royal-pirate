import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(f:string)=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('WORK0 #104 visual integration is reference-native and isolated from Porto/dock',()=>{
 for(const [file,tag,media,expected] of [
  ['work4-fleet-forge.css','/* WORK0 #104 accepted WORK4 #732 forge edge */','@media (width:384px) and (height:512px)','-webkit-mask-image:linear-gradient(to right,transparent 0%,#000 22px'],
  ['work7-cards-shop.css','/* WORK0 #104 accepted WORK7 #723 real cards */','@media (min-width:355px) and (max-width:390px) and (max-height:560px)','hue-rotate(-10deg)'],
  ['work8-panels.css','/* WORK0 #104 accepted WORK8 #734 daily tiles */','@media (min-width:351px) and (max-width:440px) and (max-height:620px)','nth-child(-n+3)']
 ] as const){
  const content=read(file),index=content.lastIndexOf(tag);
  assert.ok(index>=0,'integration recorded in '+file);
  const block=content.slice(index);
  assert.ok(block.includes(media)&&block.includes(expected),'native source rule for '+file);
  assert.doesNotMatch(block,/\\.harbour-nav|\\.harbour-screen|\\.app-approved-hud|\\.app-sheet-content\\s*\\{/,'no shared shell or dock changes');
 }
});
