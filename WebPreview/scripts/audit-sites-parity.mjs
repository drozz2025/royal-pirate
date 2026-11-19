/** WORK0/#104: public, read-only parity. No ChatGPT Sites deploy or credentials. */
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const PAGE_URL='https://drozz2025.github.io/royal-pirate/';
export const SITE_URL='https://royal-pirate.ricardomalheiro.chatgpt.site/';
export function versionFromHtml(html){
  const title=html.match(/<title\b[^>]*>\s*ROYAL\s+PIRATE\s*[—–-]\s*v(\d+\.\d+\.\d+)\s*<\/title>/i);
  const badge=html.match(/<span\b[^>]*\baria-label=["']Game version["'][^>]*>\s*v(\d+\.\d+\.\d+)\s*<\/span>/i);
  if(title&&badge&&title[1]!==badge[1])return null;
  return title?.[1]??badge?.[1]??null;
}
export function assetsFromHtml(html,pageUrl){
  const page=new URL(pageUrl),assets=[];
  for(const m of html.matchAll(/<(script|link)\b[^>]*>/gi)){
    const tag=m[0],type=m[1].toLowerCase()==='script'?'js':'css';
    if(type==='css'&&!/\brel\s*=\s*["']stylesheet["']/i.test(tag))continue;
    const key=type==='js'?'src':'href';
    const a=tag.match(new RegExp(String.raw`\b${key}\s*=\s*["']([^"']+)["']`,'i'));
    if(!a)continue;
    let url;try{url=new URL(a[1],page)}catch{continue}
    if(url.origin!==page.origin||url.protocol!=='https:')continue;
    if(type==='js'&&!/\.m?js$/.test(url.pathname))continue;
    if(type==='css'&&!/\.css$/.test(url.pathname))continue;
    if(!assets.some(e=>e.url===url.href))assets.push({url:url.href,type});
  }
  return assets.slice(0,20);
}
export function classifyParity(pages,expected){
  const [a,b]=pages;
  if(a.http!==200||b.http!==200)return 'HTTP_UNVERIFIED';
  if(!expected||!/^\d+\.\d+\.\d+$/.test(expected))return 'NO_VALIDATED_RELEASE';
  if(a.version!==expected||b.version!==expected)return 'VERSION_NOT_CONFIRMED';
  if(!a.hashes?.length||!b.hashes?.length)return 'ASSET_PARITY_UNVERIFIED';
  const f=p=>p.hashes.map(x=>x.type+':'+x.digest).sort().join('|');
  return f(a)===f(b)?'ASSET_PARITY_CONFIRMED':'ASSET_HASH_MISMATCH';
}
async function bounded(url,fetcher){
  const r=await fetcher(url,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(12000)});
  if(new URL(r.url).origin!==new URL(url).origin)throw Error('unexpected cross-origin redirect');
  if(!r.ok)return {status:r.status,bytes:null};
  if(Number(r.headers.get('content-length')||0)>12000000)throw Error('size cap');
  const bytes=new Uint8Array(await r.arrayBuffer());
  if(bytes.length>12000000)throw Error('size cap');
  return {status:r.status,bytes};
}
export async function inspectPublicSite(url,fetcher=fetch){
  try{
    const page=await bounded(url,fetcher);
    if(page.status!==200)return {url,http:page.status,version:null,hashes:[]};
    const html=new TextDecoder().decode(page.bytes);
    const version=versionFromHtml(html),assets=assetsFromHtml(html,url),hashes=[];
    for(const a of assets){
      try{
        const r=await bounded(a.url,fetcher);
        if(r.status===200)hashes.push({type:a.type,digest:createHash('sha256').update(r.bytes).digest('hex')});
      }catch{}
    }
    if(assets.length!==hashes.length)return {url,http:200,version,hashes:[],error:'incomplete public assets'};
    return {url,http:200,version,hashes};
  }catch(e){return {url,http:0,version:null,hashes:[],error:String(e).slice(0,100)}}
}
export async function audit(fetcher=fetch,expected=process.env.EXPECTED_RELEASE_VERSION){
  const pages=await Promise.all([inspectPublicSite(PAGE_URL,fetcher),inspectPublicSite(SITE_URL,fetcher)]);
  return {pages,expected:expected||null,status:classifyParity(pages,expected)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const r=await audit(),[a,b]=r.pages;
  console.log('PUBLIC READ-ONLY SITE PARITY:',r.status);
  console.log('Pages:',a.http,'v'+(a.version||'?'),a.hashes.length,'assets; Sites:',b.http,'v'+(b.version||'?'),b.hashes.length,'assets');
  console.log('Expected verified release:',r.expected||'UNVALIDATED');
  console.log('Fingerprint equality is NOT proof of an automatic deployment link; no Sites write access exists in this workflow.');
  if(process.env.GITHUB_STEP_SUMMARY){
    const fs=await import('node:fs');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '\n### ChatGPT Sites read-only parity\nPages HTTP '+a.http+', Sites HTTP '+b.http+
      ', verified release '+(r.expected||'unknown')+', visible Sites version '+(b.version||'unknown')+
      '. **'+r.status+'**. Read-only, not a Sites publish/sync.\n');
  }
}
