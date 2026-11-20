/**
 * WORK 5 independent offline/PWA and save-file regression tests.
 * Runs in Node 22; no browser, phone, WebGL, production code or deployment.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  initialProfile, finishBattle, claimDaily, claimMission, buyCrew, equipCrew,
  improve, exportProfileBackup, importProfileBackup, STORAGE_KEY
} from '../src/progression.ts';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const packageData=JSON.parse(read('../package.json')) as {version:string};
const html=read('../index.html');
const swSource=read('../public/sw.js');
const origin='https://example.test';
const scope=origin+'/royal-pirate/';

type EventHandler=(event:any)=>void;
function serviceWorkerHarness(network:(request:any,options?:any)=>Promise<any>){
  const handlers=new Map<string,EventHandler>();
  const precached:string[]=[];
  const deleted:string[]=[];
  const stored=new Map<string,unknown>();
  const cache={
    addAll:async(urls:string[])=>{precached.push(...urls);},
    put:async(url:string|{url:string},response:unknown)=>{stored.set(typeof url==='string'?url:url.url,response);}
  };
  const caches={
    open:async(_name:string)=>cache,
    keys:async()=>['royal-pirate-web-v0.0.1','royal-pirate-web-v'+packageData.version,'other-app-cache'],
    delete:async(name:string)=>{deleted.push(name);return true;},
    match:async(url:string)=>stored.get(url)
  };
  const self={
    location:{origin},
    registration:{scope},
    addEventListener:(type:string,handler:EventHandler)=>{handlers.set(type,handler);},
    skipWaiting:async()=>{},
    clients:{claim:async()=>{}}
  };
  runInNewContext(swSource,{self,caches,fetch:network,URL,Response:{error:()=>({offline:true})}});
  function emit(type:string,event:any){
    const handler=handlers.get(type);
    assert.ok(handler,'missing service worker '+type+' handler');
    handler(event);
  }
  return {emit,precached,deleted,stored};
}

test('WORK5: displayed version, build metadata and offline cache use the same release identity',()=>{
  const version=packageData.version;
  assert.match(version,/^\d+\.\d+\.\d+$/);
  assert.ok(html.includes('<title>ROYAL PIRATE — v'+version+'</title>'),'HTML title release differs from package');
  assert.ok(html.includes('>v'+version+'</span>'),'visible release badge differs from package');
  assert.ok(swSource.includes("const CACHE='royal-pirate-web-v"+version+"';"),'PWA cache is on another release');
  assert.match(html,/name="viewport"[^>]*viewport-fit=cover/,'portrait safe-area viewport must be explicit');
  assert.ok(!swSource.includes(STORAGE_KEY),'service worker must not cache a private save key');
  assert.doesNotMatch(swSource,/\blocalStorage\s*\.\s*(?:getItem|setItem|removeItem|clear)\s*\(/,'service worker must not access local profile storage');
});

test('WORK5: PWA installation only pre-caches same-origin, in-scope public assets',async()=>{
  const h=serviceWorkerHarness(async()=>({
    ok:true,
    clone(){return this;},
    text:async()=>'<script src="/royal-pirate/assets/main-42.js"></script>'+
      '<link href="/royal-pirate/fonts/fonts.css" rel="stylesheet">'+
      '<script src="/out-of-scope/hidden.js"></script>'+
      '<script src="https://other.example/assets/external.js"></script>'
  }));
  let awaited:Promise<unknown>|undefined;
  h.emit('install',{waitUntil:(p:Promise<unknown>)=>{awaited=p;}});
  assert.ok(awaited,'install must wait for precache');
  await awaited;
  assert.ok(h.precached.includes(scope),'offline root shell not cached');
  assert.ok(h.precached.includes(scope+'assets/main-42.js'),'deployed hashed bundle not cached');
  assert.ok(h.precached.includes(scope+'manifest.webmanifest'),'manifest not precached');
  assert.ok(h.precached.every(url=>url.startsWith(scope)),'external or out-of-scope assets reached PWA cache');
  assert.equal(new Set(h.precached).size,h.precached.length,'duplicate precache entries');
  let activation:Promise<unknown>|undefined;
  h.emit('activate',{waitUntil:(p:Promise<unknown>)=>{activation=p;}});
  assert.ok(activation);
  await activation;
  assert.deepEqual(h.deleted,['royal-pirate-web-v0.0.1'],
    'upgrade must remove only older Royal Pirate caches, not other apps');
});

test('WORK5: offline navigation loads the last public app shell, never intercepts POST/cross-origin requests',async()=>{
  let fetches=0;
  const h=serviceWorkerHarness(async()=>{fetches++;throw new Error('offline');});
  const cachedShell={ok:true,origin:'public-shell-only'};
  h.stored.set(scope,cachedShell);
  let responses=0;
  const passthrough=(method:string,url:string)=>h.emit('fetch',{
    request:{method,url,mode:'cors'},
    respondWith:()=>{responses++;}
  });
  passthrough('POST',scope+'api/save');
  passthrough('GET',origin+'/another-project/file.js');
  passthrough('GET','https://third-party.test/royal-pirate/resource.js');
  assert.equal(responses,0,'service worker intercepted a write or data outside its own scope');
  let response:Promise<unknown>|undefined;
  h.emit('fetch',{
    request:{method:'GET',url:scope+'?screen=fleet',mode:'navigate'},
    respondWith:(p:Promise<unknown>)=>{response=p;responses++;}
  });
  assert.ok(response);
  assert.strictEqual(await response,cachedShell,'offline fallback failed to load cached public shell');
  assert.equal(responses,1);
  assert.equal(fetches,1,'offline navigation did not attempt network before fallback');
});

test('WORK5: complete offline progress and 140-coin earnings survive a version-1 backup round-trip',()=>{
  const day=Date.parse('2026-11-10T12:00:00.000Z');
  let profile=initialProfile();
  for(let i=0;i<4;i++)profile=finishBattle(profile,'victory',3,5,day+i*1000);
  assert.equal(profile.coins,140,'four victories should award 140 coins before expenses');
  profile=claimDaily(profile,day);
  profile=claimMission(profile,'first-win');
  profile=buyCrew(profile,'gunner');
  profile=equipCrew(profile,'gunner');
  profile=improve(profile,'hull');
  const before=structuredClone(profile);
  const backup=exportProfileBackup(profile,day+5000);
  const restored=importProfileBackup(backup);
  assert.deepEqual(restored,before,'backup silently lost money, roster, upgrades or battle history');
  assert.deepEqual(profile,before,'backup export/restore mutated the active profile');
  assert.notStrictEqual(restored,profile,'restored profile must not alias the current live object');
  const legacy=JSON.parse(backup);
  delete legacy.profile.battleLog; // v1 backups created before local history existed
  const restoredLegacy=importProfileBackup(JSON.stringify(legacy));
  assert.equal(restoredLegacy.coins,before.coins,'older v1 backup lost balance');
  assert.equal(restoredLegacy.equippedCrew,before.equippedCrew);
  assert.deepEqual(restoredLegacy.battleLog,[]);
});

test('WORK5: rejected oversized/forged backup does not alter the current save',()=>{
  const now=Date.parse('2026-11-10T12:00:00.000Z');
  const current=finishBattle(initialProfile(),'victory',1,2,now);
  const snapshot=structuredClone(current);
  const encoded=exportProfileBackup(current,now);
  assert.throws(()=>importProfileBackup(' '.repeat(65_537)),/64 KB/);
  const forged=JSON.parse(encoded);
  forged.profile.hits=forged.profile.shots+1;
  assert.throws(()=>importProfileBackup(JSON.stringify(forged)),/Invalid shot statistics/);
  assert.throws(()=>importProfileBackup('{bad JSON'),/not valid JSON/);
  assert.deepEqual(current,snapshot,'rejected restore mutated live state');
});
