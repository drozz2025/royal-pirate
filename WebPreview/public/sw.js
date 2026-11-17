/* ROYAL PIRATE static-preview SW: only cache public same-origin files under its own scope.
 * The profile stays in localStorage; never cache user profiles or API requests.
 */
const CACHE='royal-pirate-web-v0.1.60';
const PREFIX='royal-pirate-web-';
const SCOPE=self.registration.scope;
const insideScope=url=>url.origin===self.location.origin&&url.href.startsWith(SCOPE);

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
   const root=new URL('./',SCOPE).href;
   const page=await fetch(root,{cache:'reload'});
   if(!page.ok)throw new Error('App shell could not be fetched');
   const html=await page.clone().text();
   // Read the actual Vite-hashed entrypoint paths from this very deployment.
   const references=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
     .map(match=>new URL(match[1],root)).filter(insideScope)
     .filter(url=>url.pathname.includes('/assets/')||url.pathname.includes('/fonts/'));
   const base=['./','./manifest.webmanifest','./icon-192.png','./icon-512.png','./fonts/fonts.css']
     .map(part=>new URL(part,SCOPE).href);
   const unique=[...new Set([...base,...references.map(u=>u.href)])];
   const cache=await caches.open(CACHE);
   await cache.addAll(unique);
   await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
   for(const name of await caches.keys()){
     if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
   }
   await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||!insideScope(new URL(request.url)))return;
 if(request.mode==='navigate'){
   event.respondWith((async()=>{
     try{
       const response=await fetch(request);
       if(response.ok){const cache=await caches.open(CACHE);await cache.put(new URL('./',SCOPE).href,response.clone());}
       return response;
     }catch{
       const cached=await caches.match(new URL('./',SCOPE).href);
       return cached||Response.error();
     }
   })());
   return;
 }
 event.respondWith((async()=>{
   const cached=await caches.match(request);
   if(cached)return cached;
   const response=await fetch(request);
   if(response.ok&&response.type==='basic'){
     const cache=await caches.open(CACHE);await cache.put(request,response.clone());
   }
   return response;
 })());
});
