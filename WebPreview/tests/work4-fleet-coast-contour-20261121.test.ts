import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

// WORK4/#104. Single paused scene: evaluate authentic source-photo edge masks.
// This is a study ONLY. It changes no production CSS or other WORKs.
const assets=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
 '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
 '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
const original=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');
const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
 .find(b=>spawnSync('which',[b!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 source coast study requires the ten approved pictorial assets and preserves previous release',()=>{
 for(const name of assets){
   const data=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
   assert.ok(data.length>10000,name);
   assert.equal(data.toString('ascii',0,4),'RIFF',name);
   assert.equal(data.toString('ascii',8,12),'WEBP',name);
 }
 assert.match(css,/radial-gradient\(ellipse 110% 123% at 30% 50%/);
 assert.match(css,/svg\.w4-reference-sea/);
 assert.match(css,/contain:paint/);
 assert.match(css,/transform:translateZ\(0\)/);
});

test('WORK4 384x512 authentic Royal Crown coast contour sweep — controlled ORIGINAL BEFORE TRIAL OVERLAY',{
 skip:process.env.CI==='true'&&chrome?false:'CI native Chromium evidence only',
 timeout:240_000
},async t=>{
 const buildDir=mkdtempSync(join(tmpdir(),'rp-work4-coast-build-'));
 t.after(()=>rmSync(buildDir,{recursive:true,force:true,maxRetries:12,retryDelay:150}));
 const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',buildDir],{
   cwd:process.cwd(),encoding:'utf8',timeout:120000,maxBuffer:12000000
 });
 assert.equal(build.status,0,'isolated production build: '+String(build.stderr||build.stdout).slice(-1200));
 const qa=resolve('porto-qa/work4');mkdirSync(qa,{recursive:true});
 const port=await new Promise<number>((yes,no)=>{
   const s=createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{
     const a=s.address();if(!a||typeof a==='string')return no(Error('port'));
     s.close(()=>yes(a.port));
   });
 });
 const preview=spawn(join(process.cwd(),'node_modules','.bin','vite'),[
   'preview','--outDir',buildDir,'--host','127.0.0.1','--port',String(port),
   '--strictPort','--base=/royal-pirate/'
 ],{stdio:'ignore'});
 const profile=mkdtempSync(join(tmpdir(),'rp-work4-coast-cdp-'));
 let browser:ReturnType<typeof spawn>|undefined;
 let ws:WebSocket|undefined;
 t.after(async()=>{ws?.close();browser?.kill('SIGTERM');preview.kill('SIGTERM');
   await delay(400);rmSync(profile,{recursive:true,force:true,maxRetries:12,retryDelay:150});
 });
 const url='http://127.0.0.1:'+port+'/royal-pirate/';
 let online=false;
 for(let i=0;i<120;i++){try{online=(await fetch(url,{signal:AbortSignal.timeout(700)})).ok;if(online)break;}catch{}await delay(110);}
 assert.ok(online,'Vite production preview must load');
 browser=spawn(chrome!,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
   '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
 ],{stdio:'ignore'});
 let target:any;
 for(let i=0;i<240;i++){
   if(browser.exitCode!==null)throw Error('Chromium terminated');
   try{
     const p=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
     const r=await fetch('http://127.0.0.1:'+p+'/json/list',{signal:AbortSignal.timeout(700)});
     if(r.ok)target=(await r.json() as any[]).find(x=>x.type==='page');
   }catch{}
   if(target?.webSocketDebuggerUrl)break;await delay(100);
 }
 assert.ok(target?.webSocketDebuggerUrl,'Chromium CDP page');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise<void>((yes,no)=>{
   ws!.addEventListener('open',()=>yes(),{once:true});
   ws!.addEventListener('error',()=>no(Error('CDP connection')),{once:true});
 });
 let seq=0;const pending=new Map<number,{yes:(x:any)=>void;no:(e:Error)=>void}>();
 ws.addEventListener('message',e=>{
   const m=JSON.parse(String(e.data)),p=pending.get(m.id);if(!p)return;
   pending.delete(m.id);m.error?p.no(Error(m.error.message)):p.yes(m.result);
 });
 const cmd=(method:string,params:Record<string,unknown>={})=>new Promise<any>((yes,no)=>{
   const id=++seq;const timeout=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout '+method));},30000);
   pending.set(id,{yes:v=>{clearTimeout(timeout);yes(v);},no:e=>{clearTimeout(timeout);no(e);}});
   ws!.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async(script:string)=>{
   const r=await cmd('Runtime.evaluate',{expression:script,returnByValue:true,awaitPromise:true});
   if(r.exceptionDetails)throw Error('JS evaluation error: '+r.exceptionDetails.text);
   return r.result?.value;
 };
 const until=async(expr:string)=>{
   for(let i=0;i<160;i++){if(await evaluate(expr))return;await delay(120);}
   throw Error('Page element absent: '+expr);
 };
 await cmd('Page.enable');await cmd('Runtime.enable');
 await cmd('Emulation.setDeviceMetricsOverride',{
   width:384,height:512,deviceScaleFactor:1,mobile:true,screenWidth:384,screenHeight:512
 });
 await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await cmd('Page.navigate',{url:url+'?work4=coast-contour-study'});
 await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
 const nav=await evaluate("(()=>{const r=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
 await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:11}]});
 await delay(55);await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await until("!!document.querySelector('.w4-fleet svg.w4-reference-ship')");
 const scene=await evaluate("(()=>({ships:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet svg.w4-reference-sea').length,slots:document.querySelectorAll('.w4-fleet .w4-ship-roster>.w4-ship-slot').length,levels:document.querySelectorAll('.w4-fleet .w4-stage-stats>span').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length}))()");
 assert.deepEqual(scene,{ships:1,sea:1,slots:4,levels:3,dock:5},'one ship, real sea, four slots, three levels, five-tab menu');
 await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const n=document.querySelector('svg.w4-reference-ship image');if(!n||!n.getAttribute('href')?.includes('03-frota'))throw Error('real source not mounted');return true;})()");
 const variations=[
  {id:'base',x:0,y:0,cx:0,cy:0},
  {id:'broad-112-126',x:112,y:126,cx:30,cy:50},
  {id:'broad-116-128',x:116,y:128,cx:30,cy:50},
  {id:'broad-120-130',x:120,y:130,cx:30,cy:50},
  {id:'broad-124-133',x:124,y:133,cx:30,cy:50},
  {id:'shift-right-116',x:116,y:128,cx:32,cy:50},
  {id:'shift-left-116',x:116,y:128,cx:28,cy:50},
  {id:'tall-110-133',x:110,y:133,cx:30,cy:50}
 ];
 const selector='.w4-fleet .w4-harbour-stage > svg.w4-ship-art.w4-reference-ship';
 const shots:string[]=[];
 for(const v of variations){
   if(v.id!=='base'){
     const radial='radial-gradient(ellipse '+v.x+'% '+v.y+'% at '+v.cx+'% '+v.cy+'%,#000 0%,#000 84%,transparent 99%)';
     const feather='linear-gradient(to bottom,transparent 0%,#000 2%,#000 97%,transparent 100%)';
     const patch=selector+'{-webkit-mask-image:'+radial+','+feather+'!important;mask-image:'+radial+','+feather+'!important;-webkit-mask-composite:source-in!important;mask-composite:intersect!important;}';
     await evaluate("(()=>{let s=document.getElementById('work4-coast-study');if(!s){s=document.createElement('style');s.id='work4-coast-study';document.head.append(s);}s.textContent="+JSON.stringify(patch)+";return true;})()");
   }
   await delay(130);
   shots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
 }
 await evaluate("document.getElementById('work4-coast-study')?.remove();true");
 const expression="(async()=>{const load=async(src)=>{const i=new Image();i.src=src;await i.decode();return i};"+
  "const ref=await load('data:image/webp;base64,"+original+"');"+
  "const shots=await Promise.all("+JSON.stringify(shots)+".map(s=>load('data:image/png;base64,'+s)));"+
  "if([ref,...shots].some(x=>x.width!==384||x.height!==512))throw Error('native dimensions required');"+
  "const bits=img=>{const cv=document.createElement('canvas');cv.width=384;cv.height=512;const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);return g.getImageData(0,0,384,512).data};"+
  "const b=bits(ref),frames=shots.map(bits),base=frames[0];"+
  "const boxes={global:[0,0,384,512],coast:[190,162,245,310],photoEdge:[228,150,264,339],royalCrown:[65,205,175,307],sea:[188,306,218,338],roster:[18,338,366,432],dock:[0,433,384,512]};"+
  "const roi=(pixels,box)=>{let sum=0,n=0,changed=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){const k=(y*384+x)*4;for(let c=0;c<3;c++){sum+=Math.abs(b[k+c]-pixels[k+c]);n++}if([0,1,2].some(c=>base[k+c]!==pixels[k+c]))changed++}return {mae:sum/n,changedPixels:changed}};"+
  "const measures=frames.map(p=>Object.fromEntries(Object.entries(boxes).map(([name,box])=>[name,roi(p,box)])));"+
  "const eligible=measures.map((m,index)=>({m,index})).filter(({m})=>m.royalCrown.changedPixels===0&&m.roster.changedPixels===0&&m.dock.changedPixels===0&&m.sea.mae<=measures[0].sea.mae+.03&&m.global.mae<=measures[0].global.mae-.02&&m.coast.mae<=measures[0].coast.mae-.1&&m.photoEdge.mae<=measures[0].photoEdge.mae-.1);"+
  "eligible.sort((a,b)=>a.m.photoEdge.mae-b.m.photoEdge.mae||a.m.coast.mae-b.m.coast.mae||a.m.global.mae-b.m.global.mae);"+
  "const winner=eligible.length?eligible[0].index:0;"+
  "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const g=canvas.getContext('2d');"+
  "g.drawImage(ref,0,0);g.drawImage(shots[0],384,0);g.drawImage(shots[winner],768,0);g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(shots[winner],1152,0);g.globalAlpha=1;"+
  "return {measures,winner,boxes,collage:canvas.toDataURL('image/png').split(',')[1]};})()";
 const result=await evaluate(expression);
 assert.equal(result.measures.length,variations.length);
 for(const row of result.measures){
   assert.equal(row.roster.changedPixels,0,'four cards protected');
   assert.equal(row.dock.changedPixels,0,'WORK0 5-item dock protected');
   assert.equal(row.royalCrown.changedPixels,0,'centre of the single Royal Crown protected');
 }
 const report={approved:false,screensApproved:0,source:'assets/design-approved/03-frota.webp',
   frame:'one paused Chromium Fleet page at 384x512, no animation or state changes',
   scene,boxes:result.boxes,winner:variations[result.winner],
   candidates:variations.map((v,i)=>({...v,roi:result.measures[i]})),
   productionChanged:false,thresholds:{globalMAE:.02,coastMAE:.1,photoEdgeMAE:.1},why:'No visual candidate is promoted without a meaningful three-ROI improvement; preserve existing production CSS.'};
 writeFileSync(join(qa,'work4-fleet-coast-contour-384x512.json'),JSON.stringify(report,null,2)+'\n');
 writeFileSync(join(qa,'original-before-trial-overlay-fleet-coast-384x512.png'),Buffer.from(result.collage,'base64'));
 console.log('WORK4_COAST_CONTOUR_AB '+JSON.stringify({winner:report.winner,
   candidates:report.candidates.map(x=>({id:x.id,global:x.roi.global.mae,coast:x.roi.coast.mae,
    edge:x.roi.photoEdge.mae,sea:x.roi.sea.mae,centralChanges:x.roi.royalCrown.changedPixels}))}));
 for(const [width,height] of [[320,568],[390,844],[430,932]]){
   await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
   await delay(170);
   const g=await evaluate("(()=>({scroll:document.documentElement.scrollWidth,ship:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,slots:document.querySelectorAll('.w4-fleet .w4-ship-roster>.w4-ship-slot').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length}))()");
   assert.ok(g.scroll<=width,'no horizontal overflow '+width);
   assert.equal(g.ship,1,'one Royal Crown '+width);
   assert.equal(g.slots,4,'four fleet slots '+width);
   assert.equal(g.dock,5,'menu five items '+width);
   writeFileSync(join(qa,'fleet-coast-unmodified-'+width+'x'+height+'.png'),
     Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
 }
});
