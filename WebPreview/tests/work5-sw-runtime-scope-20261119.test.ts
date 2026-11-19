/**
 * WORK 5 — runtime QA of the real PWA service worker in an isolated VM.
 * No production code, UI, ship assets, deployment, or other workers changed.
 * These tests exercise mocked CacheStorage/fetch, NOT a physical iPhone or live HTTP.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const SW = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const SCOPE = 'https://drozz2025.github.io/royal-pirate/';
const CACHE = 'royal-pirate-web-v' + VERSION;
const HTML = [
  '<title>Royal Pirate test shell</title>',
  '<script src="/royal-pirate/assets/main-HASH.js"></script>',
  '<link href="/royal-pirate/assets/main-HASH.css" rel="stylesheet">',
  '<link href="/royal-pirate/fonts/font-0.ttf">',
  '<script src="https://another.example/evil.js"></script>',
  '<script src="/other-project/assets/foreign.js"></script>'
].join('');

function createWorker() {
  const handlers = new Map();
  const stores = new Map();
  const added = [];
  const fetched = [];
  let waiting = 0;
  let claimed = 0;
  let offline = false;
  let rootStatus = 200;
  let assetType = 'basic';
  const key = request => typeof request === 'string' ? request : request.url;
  const storage = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(urls) {
          for (const url of urls) {
            added.push(url);
            store.set(key(url), new Response(key(url) === SCOPE ? HTML : 'precache:' + key(url)));
          }
        },
        async put(request, response) {
          store.set(key(request), response.clone());
        }
      };
    },
    async match(request) {
      for (const store of stores.values()) {
        const result = store.get(key(request));
        if (result) return result.clone();
      }
      return undefined;
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const workerSelf = {
    registration: { scope: SCOPE },
    location: { origin: new URL(SCOPE).origin },
    addEventListener(type, fn) { handlers.set(type, fn); },
    async skipWaiting() { waiting++; },
    clients: { async claim() { claimed++; } }
  };
  async function network(request) {
    const url = key(request);
    fetched.push(url);
    if (offline) throw new Error('Network unavailable');
    if (url === SCOPE || (typeof request !== 'string' && request.mode === 'navigate')) return new Response(HTML, { status: rootStatus });
    const response = new Response('network:' + url);
    Object.defineProperty(response, 'type', { value: assetType });
    return response;
  }
  runInNewContext(SW, {
    self: workerSelf, caches: storage, fetch: network, URL, Response
  }, { filename: 'royal-pirate-sw.js' });

  async function dispatch(type, request) {
    const listener = handlers.get(type);
    assert.ok(listener, 'Missing worker event listener: ' + type);
    const pending = [];
    let response;
    listener({
      request,
      waitUntil(promise) { pending.push(promise); },
      respondWith(promise) { response = Promise.resolve(promise); }
    });
    await Promise.all(pending);
    return response ? await response : undefined;
  }
  return {
    dispatch, storage, stores, added, fetched,
    setOffline(value) { offline = value; },
    setRootStatus(value) { rootStatus = value; },
    setAssetType(value) { assetType = value; },
    stats() { return { waiting, claimed }; }
  };
}

test('runtime install precaches versioned local shell and hashed JS/CSS, never foreign assets', async () => {
  const worker = createWorker();
  await worker.dispatch('install');
  assert.equal(worker.stats().waiting, 1);
  assert.deepEqual(await worker.storage.keys(), [CACHE]);
  for (const path of [
    '', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
    'fonts/fonts.css', 'fonts/font-0.ttf',
    'assets/main-HASH.js', 'assets/main-HASH.css'
  ]) assert.ok(worker.added.includes(SCOPE + path), 'not precached: ' + path);
  assert.equal(new Set(worker.added).size, worker.added.length, 'duplicate cache entries');
  assert.ok(worker.added.every(url => url.startsWith(SCOPE)), 'foreign URL precached');
  assert.equal(worker.added.some(url => url.includes('other-project')), false);
});

test('install refuses to activate an unsuccessful shell download', async () => {
  const worker = createWorker();
  worker.setRootStatus(503);
  await assert.rejects(worker.dispatch('install'), /App shell could not be fetched/);
  assert.equal(worker.stats().waiting, 0);
  assert.equal(worker.added.length, 0);
});

test('activate removes only obsolete Royal Pirate caches, preserving unrelated applications', async () => {
  const worker = createWorker();
  await worker.storage.open('royal-pirate-web-v0.1.1');
  await worker.storage.open('unrelated-app-v3');
  await worker.storage.open(CACHE);
  await worker.dispatch('activate');
  const names = await worker.storage.keys();
  assert.equal(names.includes('royal-pirate-web-v0.1.1'), false);
  assert.equal(names.includes('unrelated-app-v3'), true);
  assert.equal(names.includes(CACHE), true);
  assert.equal(worker.stats().claimed, 1);
});

test('navigation uses network when online and the cached app shell when offline', async () => {
  const worker = createWorker();
  await worker.dispatch('install');
  const request = { method: 'GET', mode: 'navigate', url: SCOPE + 'fleet' };
  const online = await worker.dispatch('fetch', request);
  assert.equal(await online.text(), HTML);
  worker.setOffline(true);
  const offline = await worker.dispatch('fetch', request);
  assert.equal(await offline.text(), HTML);
  assert.ok(worker.fetched.includes(request.url), 'online navigation not attempted');
});

test('offline first launch opens a valid cached shell before any online navigation', async () => {
  const worker = createWorker();
  await worker.dispatch('install');
  worker.setOffline(true);
  const request = { method: 'GET', mode: 'navigate', url: SCOPE + 'rewards?from=porto' };
  const fallback = await worker.dispatch('fetch', request);
  assert.equal(await fallback.text(), HTML);
  assert.ok(worker.fetched.includes(request.url), 'offline navigation must first try network');
});

test('unavailable HTTP navigation is not silently saved as a healthy app shell', async () => {
  const worker = createWorker();
  await worker.dispatch('install');
  worker.setRootStatus(503);
  const request = { method: 'GET', mode: 'navigate', url: SCOPE + 'fleet' };
  const unavailable = await worker.dispatch('fetch', request);
  assert.equal(unavailable.status, 503);
  const cached = await worker.storage.match(SCOPE);
  assert.ok(cached);
  assert.equal(await cached.text(), HTML, 'a 503 response must not replace the valid shell');
});

test('same-origin assets are cache-first offline, while non-basic responses are not stored', async () => {
  const worker = createWorker();
  const asset = SCOPE + 'assets/new-ship.js';
  const request = { method: 'GET', mode: 'same-origin', url: asset };
  assert.equal(await (await worker.dispatch('fetch', request)).text(), 'network:' + asset);
  worker.setOffline(true);
  assert.equal(await (await worker.dispatch('fetch', request)).text(), 'network:' + asset);
  assert.equal(worker.fetched.filter(url => url === asset).length, 1, 'asset unexpectedly re-fetched');

  const second = createWorker();
  second.setAssetType('cors');
  assert.equal(await (await second.dispatch('fetch', request)).text(), 'network:' + asset);
  second.setOffline(true);
  await assert.rejects(second.dispatch('fetch', request), /Network unavailable/,
    'non-basic network response must not be stored');
});

test('foreign origins, sibling GitHub projects and POST requests are never intercepted', async () => {
  const worker = createWorker();
  for (const request of [
    { method: 'POST', mode: 'same-origin', url: SCOPE + 'profile' },
    { method: 'GET', mode: 'navigate', url: 'https://another.example/royal-pirate/' },
    { method: 'GET', mode: 'navigate', url: 'https://drozz2025.github.io/other-game/' },
    { method: 'GET', mode: 'same-origin', url: 'https://drozz2025.github.io/royal-pirate-other/assets/a.js' }
  ]) assert.equal(await worker.dispatch('fetch', request), undefined,
    'worker must not respond outside GET within its own scope');
  assert.equal(worker.fetched.length, 0);
  assert.equal((await worker.storage.keys()).length, 0);
});
