import test from 'node:test';
import assert from 'node:assert/strict';
import {PAGE_URL,SITE_URL,versionFromHtml,assetsFromHtml,classifyParity,inspectPublicSite,audit} from '../scripts/audit-sites-parity.mjs';
const html=(v:string,js='/assets/main.js',css='/assets/style.css')=>
  '<title>ROYAL PIRATE — v'+v+'</title><link rel="stylesheet" href="'+css+'">'+
  '<span aria-label="Game version">v'+v+'</span><script type="module" src="'+js+'"></script>';
function stub(sources:Record<string,string|number>){
  return async(url:string)=>{
    const x=sources[url]??404;
    const r=new Response(typeof x==='number'?'':x,{status:typeof x==='number'?x:200});
    Object.defineProperty(r,'url',{value:url});
    return r;
  };
}
test('only real matching HTML markers prove a visible version',()=>{
  assert.equal(versionFromHtml(html('0.1.106')),'0.1.106');
  assert.equal(versionFromHtml(html('0.1.106').replace('Game version">v0.1.106','Game version">v0.1.105')),null);
  assert.equal(versionFromHtml('<script>v0.1.106</script>'),null);
});
test('same-origin JS/CSS only, no third-party scraping',()=>{
  const parsed=assetsFromHtml(html('0.1.106','/royal-pirate/a.js','/royal-pirate/a.css')+
    '<script src="https://bad.invalid/inject.js"></script>',PAGE_URL);
  assert.deepEqual(parsed.map(a=>a.type),['css','js']);
  assert.ok(parsed.every(a=>a.url.startsWith('https://drozz2025.github.io/')));
});
test('HTTP 200 and matching version without asset bytes is NOT parity',()=>{
  const p={http:200,version:'0.1.106',hashes:[]};
  assert.equal(classifyParity([p,p],'0.1.106'),'ASSET_PARITY_UNVERIFIED');
  assert.equal(classifyParity([p,p],null),'NO_VALIDATED_RELEASE');
  assert.equal(classifyParity([p,{...p,http:404}],'0.1.106'),'HTTP_UNVERIFIED');
});
test('byte fingerprints report matching and diverging same-version deployments',async()=>{
  const d:Record<string,string|number>={
    [PAGE_URL]:html('0.1.106','/royal-pirate/index.js','/royal-pirate/index.css'),
    [SITE_URL]:html('0.1.106','/app.js','/app.css'),
    'https://drozz2025.github.io/royal-pirate/index.js':'game bundle',
    'https://drozz2025.github.io/royal-pirate/index.css':'game css',
    'https://royal-pirate.ricardomalheiro.chatgpt.site/app.js':'game bundle',
    'https://royal-pirate.ricardomalheiro.chatgpt.site/app.css':'game css'
  };
  assert.equal((await audit(stub(d),'0.1.106')).status,'ASSET_PARITY_CONFIRMED');
  d['https://royal-pirate.ricardomalheiro.chatgpt.site/app.js']='different bundle';
  assert.equal((await audit(stub(d),'0.1.106')).status,'ASSET_HASH_MISMATCH');
  d[SITE_URL]=404;
  assert.equal((await audit(stub(d),'0.1.106')).status,'HTTP_UNVERIFIED');
});
test('partial assets are never treated as equal',async()=>{
  const d:Record<string,string|number>={[PAGE_URL]:html('0.1.106','/royal-pirate/app.js','/royal-pirate/a.css'),
    'https://drozz2025.github.io/royal-pirate/a.css':'css'};
  const x=await inspectPublicSite(PAGE_URL,stub(d));
  assert.equal(x.http,200);
  assert.equal(x.hashes.length,0);
  assert.equal(x.error,'incomplete public assets');
});