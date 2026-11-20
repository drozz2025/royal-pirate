import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');

test('WORK4 #104 Forge source-depth revalidation uses ten mandatory approved reference images',()=>{
 const names=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
   '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
   '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
 for(const filename of names){const data=readFileSync(new URL('../../assets/design-approved/'+filename,import.meta.url));
   assert.equal(data.toString('ascii',0,4),'RIFF',filename);
   assert.equal(data.toString('ascii',8,12),'WEBP',filename);
   assert.ok(data.length>10000,filename);
 }
 assert.match(css,/radial-gradient\(ellipse 140% 122% at 37% 49%/);
 assert.match(css,/linear-gradient\(to bottom,#000 0%,#000 99%,transparent 100%\)/);
 assert.match(css,/contain:paint/);
 assert.match(css,/transform:translateZ\(0\)/);
 assert.match(css,/background-color:#2d2929!important/);
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 #104 Forge original source-depth gradient: native same-frame workshop/cannon/hearth ROI',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  const buildDir=mkdtempSync(join(tmpdir(),'rp-work4-forge-build-'));
  t.after(()=>rmSync(buildDir,{recursive:true,force:true,maxRetries:10,retryDelay:200}));
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',buildDir],{
    cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:12000000
  });
  assert.equal(build.status,0,'isolated Forge build: '+(build.stderr||build.stdout).slice(-1200));
  const qa=resolve('porto-qa/work4');mkdirSync(qa,{recursive:true});
  const port=await new Promise<number>((yes,no)=>{
    const s=createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{
      const addr=s.address();if(!addr||typeof addr==='string'){s.close();return no(Error('port'));}
      s.close(()=>yes(addr.port));
    });
  });
  const preview=spawn(join(process.cwd(),'node_modules','.bin','vite'),[
    'preview','--outDir',buildDir,'--host','127.0.0.1','--port',String(port),'--strictPort','--base=/royal-pirate/'
  ],{stdio:'ignore'});
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-forge-plaque-'));
  let browser:ReturnType<typeof spawn>|undefined;
  let ws:WebSocket|undefined;
  t.after(async()=>{ws?.close();browser?.kill('SIGTERM');preview.kill('SIGTERM');
    await delay(450);rmSync(profile,{recursive:true,force:true,maxRetries:12,retryDelay:250});
  });
  const origin='http://127.0.0.1:'+port+'/royal-pirate/';
  let live=false;
  for(let i=0;i<120;i++){try{live=(await fetch(origin,{signal:AbortSignal.timeout(750)})).ok;if(live)break;}catch{}await delay(120);}
  assert.ok(live,'production preview must be live');
  browser=spawn(chrome!,[
    '--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
  ],{stdio:'ignore'});
  let target:any=null;
  for(let i=0;i<270;i++){
    if(browser.exitCode!==null)throw Error('Chromium exited early');
    try{const p=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      if(p>0){const res=await fetch('http://127.0.0.1:'+p+'/json/list',{signal:AbortSignal.timeout(750)});
        if(res.ok)target=(await res.json() as any[]).find(item=>item.type==='page');}
    }catch{}
    if(target)break;await delay(100);
  }
  assert.ok(target?.webSocketDebuggerUrl,'Chromium debugger target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((yes,no)=>{
    ws!.addEventListener('open',()=>yes(),{once:true});
    ws!.addEventListener('error',()=>no(Error('DevTools WS')), {once:true});
  });
  let next=0;const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  ws.addEventListener('message',e=>{
    const m=JSON.parse(String(e.data)),p=pending.get(m.id);if(!p)return;
    pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);
  });
  const cmd=(method:string,params:Record<string,unknown>={})=>new Promise<any>((yes,no)=>{
    const id=++next;
    const timer=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout: '+method));},30000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);yes(v);},
      reject:e=>{clearTimeout(timer);no(e);}});
    ws!.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async(expression:string)=>{
    const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error('Runtime.evaluate '+r.exceptionDetails.text);
    return r.result?.value;
  };
  const until=async(expr:string)=>{
    for(let i=0;i<170;i++){if(await evaluate(expr))return;await delay(130);}
    throw Error('Missing browser UI '+expr);
  };
  await cmd('Page.enable');await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{
    width:384,height:512,deviceScaleFactor:1,mobile:true,screenWidth:384,screenHeight:512
  });
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await cmd('Page.navigate',{url:origin+'?work4=forge-plaque-rim-sweep'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  const nav=await evaluate("(()=>{const e=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:3}]});
  await delay(60);
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const route=await evaluate("(()=>{const b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true})()");
  assert.equal(route,true,'existing functional Frota-to-Forja button must navigate');
  await until("!!document.querySelector('.w4-forge .w4-reference-cannon')");
  const geometry=await evaluate("(()=>({cannon:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,liveLevels:document.querySelectorAll('.w4-forge .w4-forge-live-level').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,sceneRect:(()=>{const r=document.querySelector('.w4-forge-scene').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()}))()");
  assert.equal(geometry.cannon,1,'one approved source cannon only');
  assert.equal(geometry.liveLevels,3,'three real locally saved levels');
  assert.equal(geometry.costs,3,'three real resource cells');
  assert.equal(geometry.dock,5,'five shared WORK0 dock buttons');
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-cannon image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('source forge image not loaded');return true;})()");
  // One existing REAL right-hand forge plaque. Change ONLY its 2px border pigment,
  // NOT its dimensions, the approved cannon/furnace art, progression or costs.
  // The grey release border is baseline; brass/iron samples come from original 04.
  // Two actual materials: current release background and proposed underpaint.
  // Inject them into one paused Chromium Forge frame, never compare different states.
  // Candidate study only: preserve the shipped WORK4 finish until a same-frame
  // source comparison supports changing it. One cannon, one real flame and all
  // costs/dock remain invariant; samples are temporary injected CSS.
  // 20 Nov 22h: seven further real cannon iron and hearth-light alternatives
  // all in a single native paused Chromium frame; diagnostic only, no gameplay.
  const variants=[
    {
      "id": "before",
      "paint": "none"
    },
    {
      "id": "current",
      "paint": "radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)"
    },
    {
      "id": "embers-timber",
      "paint": "radial-gradient(ellipse 62% 75% at 18% 82%,#62452f 0%,#302522 43%,transparent 86%),linear-gradient(165deg,#202127 0%,#2a2929 55%,#161d29 100%)"
    },
    {
      "id": "warm-cast-iron",
      "paint": "radial-gradient(ellipse 50% 76% at 13% 82%,#543828 0%,#292322 38%,transparent 86%),linear-gradient(165deg,#26252a 0%,#2b2625 51%,#181d21 100%)"
    },
    {
      "id": "smoked-wood",
      "paint": "radial-gradient(ellipse 48% 83% at 11% 87%,#44332b 0%,#2d2524 46%,transparent 90%),linear-gradient(165deg,#221c22 0%,#1b2228 56%,#252228 100%)"
    },
    {
      "id": "blue-slate",
      "paint": "radial-gradient(ellipse 52% 84% at 14% 84%,#383333 0%,#2e2525 42%,transparent 90%),linear-gradient(165deg,#20252d 0%,#24252b 56%,#1c1d29 100%)"
    },
    {
      "id": "forge-charcoal",
      "paint": "radial-gradient(ellipse 45% 80% at 13% 82%,#51352a 0%,#2c2622 37%,transparent 88%),linear-gradient(165deg,#181d23 0%,#242121 51%,#251e1a 100%)"
    },
    {
      "id": "ochre-ash",
      "paint": "radial-gradient(ellipse 55% 86% at 10% 86%,#634128 0%,#3b2922 45%,transparent 92%),linear-gradient(165deg,#20232a 0%,#29282a 50%,#211d25 100%)"
    },
    {
      "id": "iron-black",
      "paint": "radial-gradient(ellipse 46% 80% at 12% 84%,#362927 0%,#222023 43%,transparent 89%),linear-gradient(165deg,#121a22 0%,#212328 57%,#211e21 100%)"
    },
    {
      "id": "hearth-bronze",
      "paint": "radial-gradient(ellipse 57% 93% at 16% 86%,#724125 0%,#3b2825 45%,transparent 91%),linear-gradient(165deg,#272323 0%,#262a2b 51%,#211e22 100%)"
    },
    {
      "id": "neutral-source",
      "paint": "radial-gradient(ellipse 48% 82% at 12% 84%,#43372e 0%,#302b26 39%,transparent 90%),linear-gradient(165deg,#27282a 0%,#282728 56%,#292629 100%)"
    },
    {
      "id": "reference-icon-header44",
      "paint": "radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)",
      "extra": ".w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description{display:grid!important;grid-template-columns:44px minmax(0,1fr)!important;grid-template-rows:11px 23px 20px auto!important;column-gap:7px!important;row-gap:0!important;align-content:start!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > .w4-forge-medallion{grid-column:1!important;grid-row:1 / 4!important;align-self:start!important;width:42px!important;height:42px!important;margin:0!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > .w4-forge-medallion .w4-tab-symbol{width:31px!important;height:31px!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > span{grid-column:2!important;grid-row:1!important;align-self:center!important;white-space:nowrap!important;font-size:7px!important;transform:scaleX(.74)!important;transform-origin:left center!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > h3{grid-column:2!important;grid-row:2!important;margin:0!important;align-self:center!important;font-size:20px!important;line-height:1!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > strong{grid-column:2!important;grid-row:3!important;align-self:center!important;font-size:16px!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > .w4-forge-live-levels{grid-column:1/-1!important;grid-row:4!important;margin-top:5px!important;padding-top:2px!important;}"
    },
    {
      "id": "reference-icon-header48",
      "paint": "radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)",
      "extra": ".w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description{display:grid!important;grid-template-columns:48px minmax(0,1fr)!important;grid-template-rows:11px 23px 20px auto!important;column-gap:7px!important;row-gap:0!important;align-content:start!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > .w4-forge-medallion{grid-column:1!important;grid-row:1 / 4!important;align-self:start!important;width:46px!important;height:46px!important;margin:0!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > .w4-forge-medallion .w4-tab-symbol{width:35px!important;height:35px!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > span{grid-column:2!important;grid-row:1!important;align-self:center!important;white-space:nowrap!important;font-size:7px!important;transform:scaleX(.74)!important;transform-origin:left center!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > h3{grid-column:2!important;grid-row:2!important;margin:0!important;align-self:center!important;font-size:20px!important;line-height:1!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > strong{grid-column:2!important;grid-row:3!important;align-self:center!important;font-size:16px!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > .w4-forge-live-levels{grid-column:1/-1!important;grid-row:4!important;margin-top:5px!important;padding-top:2px!important;}"
    },
    {
      "id": "reference-icon-header40",
      "paint": "radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)",
      "extra": ".w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description{display:grid!important;grid-template-columns:40px minmax(0,1fr)!important;grid-template-rows:11px 23px 20px auto!important;column-gap:7px!important;row-gap:0!important;align-content:start!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > .w4-forge-medallion{grid-column:1!important;grid-row:1 / 4!important;align-self:start!important;width:38px!important;height:38px!important;margin:0!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > .w4-forge-medallion .w4-tab-symbol{width:27px!important;height:27px!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > span{grid-column:2!important;grid-row:1!important;align-self:center!important;white-space:nowrap!important;font-size:7px!important;transform:scaleX(.74)!important;transform-origin:left center!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > h3{grid-column:2!important;grid-row:2!important;margin:0!important;align-self:center!important;font-size:19px!important;line-height:1!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > strong{grid-column:2!important;grid-row:3!important;align-self:center!important;font-size:16px!important;}\n.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description > .w4-forge-live-levels{grid-column:1/-1!important;grid-row:4!important;margin-top:5px!important;padding-top:2px!important;}"
    }
,
    {"id":"iron-barrel-contrast-102","extra":".w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon{filter:contrast(1.02)!important;}","paint":"radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)"},
    {"id":"iron-barrel-saturate-102","extra":".w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon{filter:saturate(1.02)!important;}","paint":"radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)"},
    {"id":"iron-barrel-warm-102","extra":".w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon{filter:brightness(1.015) saturate(1.025)!important;}","paint":"radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)"},
    {"id":"iron-barrel-cool-102","extra":".w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon{filter:contrast(1.015) saturate(.98)!important;}","paint":"radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)"},
    {"id":"ember-depth-8percent","extra":".w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-scene{box-shadow:inset 0 -10px 24px #e77a2514!important;}","paint":"radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)"},
    {"id":"ember-depth-16percent","extra":".w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-scene{box-shadow:inset 0 -12px 26px #e77a2529!important;}","paint":"radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)"},
    {"id":"iron-satin-matte","extra":".w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon{filter:brightness(.99) contrast(1.015)!important;}","paint":"radial-gradient(ellipse 48% 82% at 12% 84%,#493326 0%,#302724 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,#252327 56%,#272324 100%)"}
  ];
  const shots=[];
  for(const shift of variants){
    const rule='.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-scene{background-image:'+shift.paint+'!important;}'+(shift.extra||'');
    const exp="(()=>{let style=document.getElementById('work4-forge-plaque-candidate');if(!style){style=document.createElement('style');style.id='work4-forge-plaque-candidate';document.head.append(style)}style.textContent="+JSON.stringify(rule)+";return true})()";
    await evaluate(exp);
    await delay(120);
    shots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  const script="(async()=>{"+
    "const load=async(bytes,mime)=>{const im=new Image();im.src='data:'+mime+';base64,'+bytes;await im.decode();return im;};"+
    "const original=await load("+JSON.stringify(reference)+",'image/webp');"+
    "const screens=await Promise.all("+JSON.stringify(shots)+".map(s=>load(s,'image/png')));"+
    "if(original.width!==384||original.height!==512||screens.some(im=>im.width!==384||im.height!==512))throw Error('native 384x512 source required');"+
    "const pix=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const a=pix(original),shots=screens.map(pix),boxes={full:[0,0,384,512],workshop:[16,135,375,326],header:[178,150,375,223],liveStats:[178,218,375,316],cannon:[18,153,175,305],furnace:[129,168,171,294],costs:[16,329,375,430],dock:[0,433,384,512]};"+
    "const mae=(x,y,b)=>{let sum=0,n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;for(let j=0;j<3;j++){sum+=Math.abs(x[k+j]-y[k+j]);n++;}}return sum/n;};"+
    "const count=(x,y,b)=>{let n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;if(x[k]!==y[k]||x[k+1]!==y[k+1]||x[k+2]!==y[k+2])n++;}return n;};"+
    "const records=shots.map((shot,i)=>{const roi={};for(const [name,box] of Object.entries(boxes))roi[name]={mae:mae(a,shot,box),changedPixels:count(shots[0],shot,box)};return {index:i,roi};});"+
    "const baseline=records[0];"+
    "const globalWinner=[...records].filter(r=>r.roi.costs.changedPixels===0&&r.roi.dock.changedPixels===0).sort((x,y)=>(x.roi.full.mae-y.roi.full.mae))[0];"+
    "const valid=records.filter(r=>r.roi.costs.changedPixels===0&&r.roi.dock.changedPixels===0&&['full','workshop','cannon','furnace'].every(name=>r.roi[name].mae<=baseline.roi[name].mae));"+
    "valid.sort((x,y)=>(x.roi.full.mae-y.roi.full.mae)||(x.roi.workshop.mae-y.roi.workshop.mae)||(x.roi.furnace.mae-y.roi.furnace.mae));"+
    "const best=valid[0];if(!best)throw Error('baseline must remain an admissible candidate');"+
    "const release=records[1];const changesFromRelease=shots.map(shot=>Object.fromEntries(Object.entries(boxes).map(([name,box])=>[name,count(shots[1],shot,box)])));"+
    "const safeNew=records.filter(r=>r.index>=records.length-7&&[\'costs\',\'dock\'].every(k=>changesFromRelease[r.index][k]===0)&&[\'full\',\'workshop\',\'cannon\',\'furnace\'].every(k=>r.roi[k].mae<=release.roi[k].mae));"+
    "safeNew.sort((a,b)=>(a.roi.full.mae-b.roi.full.mae)||(a.roi.workshop.mae-b.roi.workshop.mae));const bestRelease=safeNew[0]||release;"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const g=canvas.getContext('2d');g.drawImage(original,0,0);g.drawImage(screens[1],384,0);g.drawImage(screens[bestRelease.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(screens[bestRelease.index],1152,0);"+
    "return {records,bestIndex:best.index,bestReleaseIndex:bestRelease.index,changesFromRelease,globalWinnerIndex:globalWinner.index,baseline,geometry:"+JSON.stringify(geometry)+",grid:canvas.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(script);

  assert.equal(result.records.length,variants.length,'all controlled source paint variants measured');
  assert.match(css,/background-color:#2d2929!important/,'baseline retained in scoped CSS');
  assert.match(css,/linear-gradient\(165deg,#181d26/,'native graded workshop material candidate');
  const baseline=result.records[0],proposal=result.records[1];
  for(const region of ['full','workshop','cannon','furnace','costs','dock']){
    assert.ok(Number.isFinite(baseline.roi[region].mae),'valid source RGB MAE '+region);
    assert.ok(Number.isFinite(proposal.roi[region].mae),'valid candidate RGB MAE '+region);
  }
  assert.ok(proposal.roi.workshop.changedPixels>0,'workshop pigment must change visible original pixels');
  assert.equal(proposal.roi.costs.changedPixels,0,'three real material prices must not change');
  assert.equal(proposal.roi.dock.changedPixels,0,'WORK0 global five-item dock must not change');
  const tested=variants.slice(-7).map((variant,j)=>({variant,index:variants.length-7+j}));
  assert.ok(tested.some(x=>result.changesFromRelease[x.index].cannon>0),
    'at least one iron candidate must actually change source cannon pixels');
  for(const x of tested){
    assert.equal(result.changesFromRelease[x.index].costs,0,'real prices cannot change: '+x.variant.id);
    assert.equal(result.changesFromRelease[x.index].dock,0,'WORK0 dock cannot change: '+x.variant.id);
  }
  // The stage source painting, live progression and functional cannon are
  // not restyled. ROI changes are recorded, not misreported as artistic approval.
  // Remove the injected native study override: mobile captures must reflect
  // the real production CSS, not the comparison rule used at 384x512.
  await evaluate("document.getElementById('work4-forge-plaque-candidate')?.remove();true");
  const mobile=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
    await delay(160);
    const info=await evaluate("(()=>({cannon:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length,scrollWidth:document.documentElement.scrollWidth,viewWidth:innerWidth,button:(()=>{const e=document.querySelector('.w4-improve-button');if(!e)return false;const r=e.getBoundingClientRect();return r.width>=40&&r.height>=35})()}))()");
    assert.equal(info.cannon,1,'one source cannon at '+width);
    assert.equal(info.costs,3,'three real material prices at '+width);
    assert.equal(info.dock,5,'five shared nav targets at '+width);
    assert.equal(info.button,true,'upgrade button retains hitbox at '+width);
    assert.ok(info.scrollWidth<=width+2,'no horizontal overflow at '+width);
    mobile.push({width,height,...info});
    const png=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data;
    writeFileSync(join(qa,'work4-forge-gradient-'+width+'x'+height+'.png'),Buffer.from(png,'base64'));
  }
  const rois=Object.fromEntries(Object.keys(baseline.roi).map(k=>[k,{
    before:baseline.roi[k].mae,render:proposal.roi[k].mae,
    delta:proposal.roi[k].mae-baseline.roi[k].mae,
    changedPixels:proposal.roi[k].changedPixels
  }]));
  const report={approved:false,screensApproved:0,viewport:'384x512',
    reference:'04-melhorias-forja.webp',
    comparison:'same real Chromium Forge frame with animations paused; previous no-image underlay vs graduated workshop pigments',
    geometries:geometry,roi:rois,mobile,
    releaseComparison:{
      reference:'same genuine 04 WEBP; HEAD release current underlay as baseline',
      release:variants[1].id,
      measured:tested.map(x=>({id:x.variant.id,
        roi:Object.fromEntries(['full','workshop','cannon','furnace','costs','dock'].map(k=>
          [k,{release:result.records[1].roi[k].mae,candidate:result.records[x.index].roi[k].mae,
            delta:result.records[x.index].roi[k].mae-result.records[1].roi[k].mae,
            changedPixels:result.changesFromRelease[x.index][k]}]))})),
      bestNonRegressing:variants[result.bestReleaseIndex].id,
      qualifiesForArtReview:result.bestReleaseIndex!==1
    },
    study:variants.map((v,i)=>({id:v.id,roi:result.records[i].roi})),
    bestByFull:variants[result.globalWinnerIndex].id,
    bestProtected:variants[result.bestIndex].id,
    decision:rois.full.delta<=0&&rois.workshop.delta<=0&&
      rois.cannon.delta<=0&&rois.furnace.delta<=0
      ? 'Candidate is numerically admissible; needs human approval by WORK0 before merge'
      : 'Candidate worsens a protected ROI: WORK0 should REJECT this Draft'};
  writeFileSync(join(qa,'work4-forge-depth-gradient-ab-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'work4-original-before-render-overlay-forge-gradient-384x512.png'),Buffer.from(result.grid,'base64'));
  console.log('WORK4_FORGE_GRADIENT_NATIVE_AB '+JSON.stringify(report));
  console.log('WORK4_FORGE_IRON_LIGHT_RELEASE_AB '+JSON.stringify(report.releaseComparison));
});
