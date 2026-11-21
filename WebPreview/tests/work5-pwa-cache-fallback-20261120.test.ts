/**
 * WORK 5: independent PWA cache behavior regressions for the mobile WebPreview.
 * Node service-worker simulation only: no physical iPhone, browser, UI changes
 * or proof that the GitHub Pages / ChatGPT Sites deployment serves this build.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
const origin='https://qa.example.test';
const scope=origin+'/royal-pirate/';
type WorkerEvent={request?:{method:string;url:string;mode:string};respondWith?:(promise:Promise<unknown>)=>void};
type Handler=(event:WorkerEvent)=>void;

function setup(network:(request:{url:string;method:string})=>Promise<any>) {
  const handlers=new Map<string,Handler>();
  const stored=new Map<string,unknown>();
  const writes:string[]=[];
  const fetched:string[]=[];
  const failure={offline:true};
  const cache={
    put:async(request:string|{url:string},response:unknown)=>{
      const key=typeof request==='string'?request:request.url;
      stored.set(key,response);writes.push(key);
    },
    addAll:async(_urls:string[])=>{}
  };
  const caches={
    open:async(_name:string)=>cache,
    match:async(request:string|{url:string})=>stored.get(typeof request==='string'?request:request.url),
    keys:async()=>[],
    delete:async(_name:string)=>true
  };
  const self={
    registration:{scope},
    location:{origin},
    addEventListener:(name:string,callback:Handler)=>handlers.set(name,callback),
    clients:{claim:async()=>{}},
    skipWaiting:async()=>{}
  };
  runInNewContext(source,{
    self,caches,URL,Response:{error:()=>failure},
    fetch:async(request:{url:string;method:string})=>{
      fetched.push(request.url);
      return network(request);
    }
  });
  function request(url:string,mode='cors',method='GET') {
    let intercepted=false;
    let promise:Promise<unknown>|undefined;
    const handler=handlers.get('fetch');
    assert.ok(handler,'service worker has no fetch listener');
    handler({
      request:{url,method,mode},
      respondWith:value=>{intercepted=true;promise=value;}
    });
    return {intercepted,response:()=>promise};
  }
  return {stored,writes,fetched,failure,request};
}

test('WORK5: successful mobile navigation refreshes the offline shell; offline revisit recovers the latest clone',async()=>{
  let online=true;
  const cached={kind:'last-successful-shell'};
  const live={ok:true,type:'basic',clone:()=>cached};
  const h=setup(async()=>{if(!online)throw new Error('network unavailable');return live;});
  const first=h.request(scope+'?screen=fleet','navigate');
  assert.equal(first.intercepted,true);
  assert.strictEqual(await first.response(),live);
  assert.deepEqual(h.writes,[scope],'navigation must refresh only the canonical app shell');
  assert.strictEqual(h.stored.get(scope),cached,'cached navigation must be a response clone');
  online=false;
  const second=h.request(scope+'?screen=profile','navigate');
  assert.equal(second.intercepted,true);
  assert.strictEqual(await second.response(),cached,'offline restart did not recover last shell');
  assert.equal(h.fetched.length,2,'navigation must try the network on both visits');
});

test('WORK5: same-scope mobile assets are cache-first; 404s and non-basic responses never enter cache',async()=>{
  const js=scope+'assets/app-123.js';
  const css=scope+'fonts/fonts.css';
  const missing=scope+'assets/not-found.js';
  const opaque=scope+'assets/opaque.js';
  const responses=new Map<string,any>([
    [js,{ok:true,type:'basic',clone:()=>({kind:'saved-js'})}],
    [css,{ok:true,type:'basic',clone:()=>({kind:'saved-css'})}],
    [missing,{ok:false,type:'basic',status:404}],
    [opaque,{ok:true,type:'opaque'}]
  ]);
  const h=setup(async request=>{
    const result=responses.get(request.url);
    assert.ok(result,'unexpected network fetch '+request.url);
    return result;
  });
  for(const url of [js,css,missing,opaque]){
    const event=h.request(url);
    assert.equal(event.intercepted,true,'in-scope resource must be handled: '+url);
    assert.strictEqual(await event.response(),responses.get(url));
  }
  assert.deepEqual(h.writes,[js,css],'only successful readable public assets should be cached');
  const cached=h.request(js);
  assert.deepEqual(await cached.response(),{kind:'saved-js'},'asset did not use its existing cache');
  assert.equal(h.fetched.filter(url=>url===js).length,1,'cache hit still contacted the network');
  for(const url of [missing,opaque])assert.equal(h.stored.has(url),false,'invalid asset was cached: '+url);
});

test('WORK5: offline miss is explicit, and private writes or third-party/off-scope requests bypass the worker',async()=>{
  const h=setup(async()=>{throw new Error('offline');});
  const first=h.request(scope+'?screen=ranking','navigate');
  assert.strictEqual(await first.response(),h.failure,'missing offline shell should not be represented as a valid page');
  const skipped=[
    h.request(scope+'api/save','cors','POST'),
    h.request(origin+'/other-app/index.html','navigate'),
    h.request('https://external.example.test/royal-pirate/assets/bundle.js'),
    h.request(scope+'api/upload','cors','PUT')
  ];
  assert.ok(skipped.every(event=>event.intercepted===false),'unsafe request was intercepted by PWA cache');
  assert.deepEqual(h.writes,[],'offline miss or private write changed the public cache');
  assert.equal(h.fetched.length,1,'out-of-scope requests should bypass PWA fetch handler');
});
