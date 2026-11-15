import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderIconPng} from '../scripts/generate-icons.mjs';

const get=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('original PNG icons have valid PNG magic and exact mobile manifest sizes',()=>{
 for(const n of [192,512]){
  const png=renderIconPng(n);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),n);
  assert.equal(png.readUInt32BE(20),n);
  assert.ok(png.length>100);
 }
 assert.throws(()=>renderIconPng(16),RangeError);
});
test('install manifest is scoped relative to GitHub project and preview root',()=>{
 const m=JSON.parse(get('../public/manifest.webmanifest'));
 assert.equal(m.start_url,'./');
 assert.equal(m.scope,'./');
 assert.equal(m.display,'standalone');
 assert.equal(m.orientation,'portrait-primary');
 assert.deepEqual(m.icons.map((i:{sizes:string})=>i.sizes),['192x192','512x512']);
 const html=get('../index.html');
 assert.match(html,/href="%BASE_URL%manifest.webmanifest"/);
 assert.match(html,/href="%BASE_URL%icon-192.png"/);
});
test('service worker is scoped, caches a real release shell and cleans old release caches',()=>{
 const sw=get('../public/sw.js');
 const version=JSON.parse(get('../package.json')).version as string;
 assert.ok(sw.includes('royal-pirate-web-v'+version),'cache name must change with release');
 assert.match(sw,/self\.registration\.scope/);
 assert.match(sw,/cache\.addAll\(unique\)/);
 assert.match(sw,/event\.request|request\.method/);
 assert.match(sw,/request\.mode==='navigate'/);
 assert.match(sw,/await caches\.delete\(name\)/);
 assert.doesNotMatch(sw,/localStorage\.(getItem|setItem)|indexedDB\.open|Authorization:/i);
 const app=get('../src/main.tsx');
 assert.match(app,/serviceWorker\.register/);
 assert.match(app,/new URL\('sw\.js',scope\)/);
});
