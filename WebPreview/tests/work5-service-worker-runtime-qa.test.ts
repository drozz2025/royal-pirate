import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

/**
 * WORK 5: execute the REAL service-worker source with a deterministic CacheStorage
 * and network stand-in. This is not a mobile-browser or physical-device test.
 * No Porto/Work 4 production files are modified.
 */
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const scope = 'https://example.test/royal-pirate/';
const shell = [
  '<!doctype html><html><head>',
  '<link rel="stylesheet" href="/royal-pirate/assets/style.abcd1234.css">',
  '<link rel="stylesheet" href="/outside/style.css">',
  '</head><body><script type="module" src="/royal-pirate/assets/main.abcd1234.js"></script>',
  '<script src="https://outside.invalid/third-party.js"></script></body></html>'
].join('');

type Listener = (event: any) => void;
class FakeResponse {
  ok: boolean;
  type = 'basic';
  constructor(public url: string, public body: string, ok=true) { this.ok=ok; }
  clone() { return new FakeResponse(this.url, this.body, this.ok); }
  async text() { return this.body; }
}
function workerHarness() {
  const listeners = new Map<string,Listener>();
  const cacheState = new Map<string,Map<string,FakeResponse>>();
  const networkCalls: string[] = [];
  let online = true;
  let waiting = 0;
  let claimed = 0;
  const read = (key:string) => {
    for (const cache of cacheState.values()) {
      const result=cache.get(key);
      if (result) return result.clone();
    }
    return undefined;
  };
  const responseFor = async (resource: string | {url:string}) => {
    const url = typeof resource==='string'?resource:resource.url;
    networkCalls.push(url);
    if (!online) throw new Error('Network offline');
    return new FakeResponse(url,url===scope?shell:'response:'+url);
  };
  const caches = {
    open: async (name:string) => {
      if (!cacheState.has(name)) cacheState.set(name,new Map());
      const data = cacheState.get(name)!;
      return {
        addAll: async (urls:string[]) => {
          for (const url of urls) data.set(url,await responseFor(url));
        },
        put: async (resource: string | {url:string}, response:FakeResponse) => {
          data.set(typeof resource==='string'?resource:resource.url,response.clone());
        },
        match: async (resource: string | {url:string}) =>
          data.get(typeof resource==='string'?resource:resource.url)?.clone()
      };
    },
    match: async (resource: string | {url:string}) =>
      read(typeof resource==='string'?resource:resource.url),
    keys: async () => [...cacheState.keys()],
    delete: async (name:string) => cacheState.delete(name)
  };
  const self = {
    location: { origin:'https://example.test' },
    registration: { scope },
    clients: { claim: async () => { claimed++; } },
    skipWaiting: async () => { waiting++; },
    addEventListener: (event:string,handler:Listener) => listeners.set(event,handler)
  };
  runInNewContext(sw,{self,caches,fetch:responseFor,URL,Response:{error:()=>new FakeResponse('error:','',false)}});
  function event(name:string) {
    let pending:Promise<unknown>|undefined;
    listeners.get(name)!({ waitUntil:(promise:Promise<unknown>)=>{ pending=promise; } });
    assert.ok(pending,name+' must await its operations');
    return pending!;
  }
  function request(method:string,url:string,mode='same-origin') {
    let promise:Promise<FakeResponse>|undefined;
    const req = {method,url,mode};
    listeners.get('fetch')!({request:req,respondWith:(answer:Promise<FakeResponse>)=>{promise=answer;}});
    return promise;
  }
  return {
    install:()=>event('install'),activate:()=>event('activate'),request,
    state:cacheState,networkCalls,read,
    setOnline:(value:boolean)=>{online=value;},
    skipWaitingCount:()=>waiting,claimCount:()=>claimed
  };
}

test('runtime install precaches only same-origin scoped assets and versioned shell',async()=>{
  const worker=workerHarness();
  await worker.install();
  const name='royal-pirate-web-v'+pkg.version;
  const entries=worker.state.get(name);
  assert.ok(entries,'the installed cache is tied to the release version');
  const keys=[...entries!.keys()];
  assert.ok(keys.includes(scope));
  assert.ok(keys.includes(scope+'manifest.webmanifest'));
  assert.ok(keys.includes(scope+'icon-192.png'));
  assert.ok(keys.includes(scope+'icon-512.png'));
  assert.ok(keys.includes(scope+'fonts/fonts.css'));
  assert.ok(keys.includes(scope+'assets/main.abcd1234.js'));
  assert.ok(keys.includes(scope+'assets/style.abcd1234.css'));
  assert.ok(keys.every(url=>url.startsWith(scope)),'the worker cannot cache outside its project scope');
  assert.ok(worker.networkCalls.every(url=>url.startsWith(scope)));
  assert.equal(worker.skipWaitingCount(),1);
});

test('runtime activation purges only stale Royal Pirate caches, not unrelated apps',async()=>{
  const worker=workerHarness();
  await worker.install();
  worker.state.set('royal-pirate-web-v0.1.1',new Map());
  worker.state.set('unrelated-app-v99',new Map());
  await worker.activate();
  assert.ok(worker.state.has('royal-pirate-web-v'+pkg.version));
  assert.equal(worker.state.has('royal-pirate-web-v0.1.1'),false);
  assert.equal(worker.state.has('unrelated-app-v99'),true);
  assert.equal(worker.claimCount(),1);
});

test('runtime offline navigation restores installed app shell and cached hashed assets',async()=>{
  const worker=workerHarness();
  await worker.install();
  worker.setOnline(false);
  const page=await worker.request('GET',scope+'fleet','navigate');
  assert.ok(page);
  assert.equal(page!.ok,true);
  assert.equal(await page!.text(),shell,'offline navigation must fall back to cached app shell');
  const requestsBefore=worker.networkCalls.length;
  const asset=await worker.request('GET',scope+'assets/main.abcd1234.js');
  assert.ok(asset?.ok);
  assert.equal(await asset!.text(),'response:'+scope+'assets/main.abcd1234.js');
  assert.equal(worker.networkCalls.length,requestsBefore,'cached scripts must not request the network');
});

test('runtime fetch listener ignores POST and any URL outside deployment scope',async()=>{
  const worker=workerHarness();
  await worker.install();
  const previous=worker.networkCalls.length;
  assert.equal(worker.request('POST',scope+'submit'),undefined);
  assert.equal(worker.request('GET','https://example.test/other-app/assets/main.js'),undefined);
  assert.equal(worker.request('GET','https://outside.invalid/royal-pirate/assets/main.js'),undefined);
  assert.equal(worker.networkCalls.length,previous);
});

test('offline navigation without previously installed shell reports failure, not a fake page',async()=>{
  const worker=workerHarness();
  worker.setOnline(false);
  const response=await worker.request('GET',scope+'fleet','navigate');
  assert.ok(response);
  assert.equal(response!.ok,false);
});
