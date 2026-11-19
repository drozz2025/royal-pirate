import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';

const approvedDir=new URL('../../assets/design-approved/',import.meta.url);
const expected=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
  '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
  '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
const reference=readFileSync(new URL('04-melhorias-forja.webp',approvedDir)).toString('base64');
const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const pause=(ms:number)=>new Promise<void>(yes=>setTimeout(yes,ms));

test('WORK4 approved-source Forge edge study guards all 10 mandatory originals',()=>{
 for(const name of expected){const b=readFileSync(new URL(name,approvedDir));
  assert.equal(b.toString('ascii',0,4),'RIFF',name);
  assert.equal(b.toString('ascii',8,12),'WEBP',name);
  assert.ok(b.length>10000,name);
 }
 const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
 assert.match(css,/\.w4-forge #w4-forge-panel > \.w4-forge-stage/);
 assert.match(css,/border-color:#364750/);
 assert.match(css,/svg\.w4-cannon-art\.w4-reference-cannon/);
 assert.match(css,/contain:paint/);
 assert.match(css,/transform:translateZ\(0\)/);
});

test('WORK4 Forge source-stage border, same paused Chromium 384x512, with protected cannon/furnace/materials/dock ROI and responsive touch', {
 skip:process.env.CI==='true'&&chrome?false:'CI Chromium evidence required',
 timeout:240_000
},async t=>{
 const out=mkdtempSync(join(tmpdir(),'royal-work4-rim-'));
 const profile=mkdtempSync(join(tmpdir(),'royal-work4-chrome-'));
 const work=resolve('porto-qa/work4');mkdirSync(work,{recursive:true});
 t.after(()=>{rmSync(out,{force:true,recursive:true,maxRetries:10,retryDelay:150});
  rmSync(profile,{force:true,recursive:true,maxRetries:10,retryDelay:150});});
 const b=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',out],{
  cwd:process.cwd(),encoding:'utf8',timeout:120000,maxBuffer:10000000});
 assert.equal(b.status,0,'isolated build: '+(b.stderr||b.stdout).slice(-900));
 const port=await new Promise<number>((yes,no)=>{
  const server=createServer();server.once('error',no);
  server.listen(0,'127.0.0.1',()=>{const a=server.address();
   if(!a||typeof a==='string'){server.close();return no(Error('port'));}
   server.close(()=>yes(a.port));});
 });
 const preview=spawn(join(process.cwd(),'node_modules','.bin','vite'),
  ['preview','--outDir',out,'--host','127.0.0.1','--port',String(port),'--strictPort','--base=/royal-pirate/'],
  {stdio:'ignore'});
 let browser:ReturnType<typeof spawn>|undefined,ws:WebSocket|undefined;
 t.after(async()=>{ws?.close();browser?.kill('SIGTERM');preview.kill('SIGTERM');await pause(300);});
 const origin='http://127.0.0.1:'+port+'/royal-pirate/';
 let ready=false;
 for(let n=0;n<100;n++){try{ready=(await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok;if(ready)break;}catch{}await pause(120);}
 assert.ok(ready,'Vite preview ready');
 browser=spawn(chrome!,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],
  {stdio:'ignore'});
 let target:any=null;
 for(let n=0;n<250;n++){
  assert.equal(browser.exitCode,null,'Chromium must stay running');
  try{const p=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
    if(p>0){const r=await fetch('http://127.0.0.1:'+p+'/json/list',{signal:AbortSignal.timeout(1000)});
      if(r.ok)target=(await r.json() as any[]).find(x=>x.type==='page');}}catch{}
  if(target)break;await pause(100);
 }
 assert.ok(target?.webSocketDebuggerUrl,'Chromium CDP target');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise<void>((yes,no)=>{ws!.addEventListener('open',()=>yes(),{once:true});
   ws!.addEventListener('error',()=>no(Error('CDP websocket')),{once:true});});
 let n=0;
 const jobs=new Map<number,{yes:(v:any)=>void;no:(e:Error)=>void}>();
 ws.addEventListener('message',e=>{const msg=JSON.parse(String(e.data)),j=jobs.get(msg.id);
  if(j){jobs.delete(msg.id);msg.error?j.no(Error(msg.error.message)):j.yes(msg.result);}});
 const cmd=(method:string,params:Record<string,unknown>={})=>new Promise<any>((yes,no)=>{
  const id=++n;const timer=setTimeout(()=>{jobs.delete(id);no(Error('timeout '+method));},30000);
  jobs.set(id,{yes:v=>{clearTimeout(timer);yes(v);},no:e=>{clearTimeout(timer);no(e);}});
  ws!.send(JSON.stringify({id,method,params}));});
 const js=async(expression:string)=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error('Browser exception: '+r.exceptionDetails.text);return r.result?.value;};
 const wait=async(ex:string)=>{for(let k=0;k<150;k++){if(await js(ex))return;await pause(120);}throw Error('UI missing '+ex);};
 await cmd('Page.enable');await cmd('Runtime.enable');
 const size=async(w:number,h:number)=>cmd('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true,screenWidth:w,screenHeight:h});
 await size(384,512);await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await cmd('Page.navigate',{url:origin+'?work4=forge-source-rim-ab'});
 await wait("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
 const pos=await js("(()=>{const r=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pos.x,y:pos.y,id:1}]});
 await pause(70);await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await wait("!!document.querySelector('.w4-fleet .w4-reference-ship')");
 assert.ok(await js("(()=>{let b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true})()"),'real Frota-to-Forja navigation');
 await wait("!!document.querySelector('.w4-forge .w4-reference-cannon')");
 const geometry=await js("(()=>{const r=document.querySelector('.w4-forge-stage').getBoundingClientRect();return {stage:{x:r.x,y:r.y,width:r.width,height:r.height},cannons:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,levels:document.querySelectorAll('.w4-forge .w4-forge-live-level').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length}})()");
 assert.equal(geometry.cannons,1,'one reference source cannon');
 assert.equal(geometry.levels,3,'three real upgrade levels');
 assert.equal(geometry.costs,3,'three real cost cells');
 assert.equal(geometry.dock,5,'five WORK0 dock controls');
 await js("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-cannon image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('source cannon image missing');return true})()");
 const colors=['#364750','#a1733b','#996c35','#b08344','#bf8b4a','#ad824b','#c29660','#765735',
  '#835d37','#795d43','#b38b5f','#d1a665','#53483c','#705331','#916c4a','#95643f'];
 const cssSelector='.w4-forge #w4-forge-panel > .w4-forge-stage';
 const shots:string[]=[];
 for(const color of colors){
  await js("(()=>{let s=document.getElementById('work4-source-rim-trial');if(!s){s=document.createElement('style');s.id='work4-source-rim-trial';document.head.append(s)}s.textContent="+JSON.stringify(cssSelector+'{border-color:'+color+'!important;}')+";return true})()");
  await pause(130);
  shots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
 }
 const calc="(async()=>{"+
  "const load=async(uri)=>{const im=new Image();im.src=uri;await im.decode();return im;};"+
  "const [original,...screens]=await Promise.all([load('data:image/webp;base64,"+reference+"'),..."+JSON.stringify(shots)+".map(s=>load('data:image/png;base64,'+s))]);"+
  "if([original,...screens].some(im=>im.width!==384||im.height!==512))throw Error('non-native frame');"+
  "const pix=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;let g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,384,512).data;};"+
  "const orig=pix(original),shots=screens.map(pix),s="+JSON.stringify(geometry.stage)+";"+
  "const boxes={full:[0,0,384,512],stage:[12,147,376,324],cannon:[28,183,166,288],hearth:[133,183,169,290],materials:[19,332,371,430],dock:[0,438,384,512]};"+
  "const rim=(x,y)=>{let sum=0,n=0,changed=0;const x1=Math.max(0,Math.floor(s.x)),x2=Math.min(384,Math.ceil(s.x+s.width)),y1=Math.max(0,Math.floor(s.y)),y2=Math.min(512,Math.ceil(s.y+s.height));for(let yy=y1;yy<y2;yy++)for(let xx=x1;xx<x2;xx++){if(xx>x1+5&&xx<x2-6&&yy>y1+5&&yy<y2-6)continue;let k=4*(384*yy+xx);for(let j=0;j<3;j++){sum+=Math.abs(x[k+j]-y[k+j]);n++;}if(x[k]!==y[k]||x[k+1]!==y[k+1]||x[k+2]!==y[k+2])changed++;}return {mae:sum/n,changedPixels:changed};};"+
  "const mae=(a,b,box)=>{let sum=0,n=0,changed=0;for(let yy=box[1];yy<box[3];yy++)for(let xx=box[0];xx<box[2];xx++){let k=4*(yy*384+xx);for(let j=0;j<3;j++){sum+=Math.abs(a[k+j]-b[k+j]);n++;}if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])changed++;}return {mae:sum/n,changedPixels:changed};};"+
  "const records=shots.map((shot,i)=>{const roi={};for(const [key,box] of Object.entries(boxes)){let metric=mae(orig,shot,box),diff=mae(shots[0],shot,box);roi[key]={mae:metric.mae,changedPixels:diff.changedPixels};}roi.rim={mae:rim(orig,shot).mae,changedPixels:rim(shots[0],shot).changedPixels};return {index:i,roi};});"+
  "const base=records[0],valid=records.filter(r=>r.roi.materials.changedPixels===0&&r.roi.dock.changedPixels===0&&r.roi.cannon.changedPixels===0&&r.roi.hearth.changedPixels===0&&r.roi.full.mae<=base.roi.full.mae&&r.roi.rim.mae<=base.roi.rim.mae);valid.sort((a,b)=>a.roi.rim.mae-b.roi.rim.mae||a.roi.full.mae-b.roi.full.mae);const best=valid[0]||base;"+
  "const c=document.createElement('canvas');c.width=1536;c.height=512;let g=c.getContext('2d');g.drawImage(original,0,0);g.drawImage(screens[0],384,0);g.drawImage(screens[best.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(screens[best.index],1152,0);return {records,bestIndex:best.index,overlay:c.toDataURL('image/png').split(',')[1]};})()";
 const result=await js(calc);
 assert.equal(result.records.length,colors.length);
 assert.ok(Number.isFinite(result.records[0].roi.full.mae));
 for(const k of ['materials','dock','cannon','hearth'])assert.equal(result.records[result.bestIndex].roi[k].changedPixels,0,'protected '+k);
 writeFileSync(join(work,'work4-forge-stage-rim-ab-384x512.png'),Buffer.from(result.overlay,'base64'));
 const responsive:Record<string,unknown>={};
 await js("document.getElementById('work4-source-rim-trial')?.remove();true");
 for(const [w,h] of [[320,568],[390,844],[430,932]]){
  await size(w,h);await pause(130);
  const state=await js("(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,nav:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,can:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length}))()");
  assert.equal(state.overflow,false,w+' horizontal overflow');
  assert.equal(state.nav,5,w+' dock controls');
  assert.equal(state.can,1,w+' one cannon');
  responsive[w+'x'+h]=state;
  writeFileSync(join(work,'work4-forge-stage-rim-'+w+'x'+h+'.png'),Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
 }
 const report={approved:false,screensApproved:0,reference:'04-melhorias-forja.webp',comparison:'same original native 384x512 Chromium frame; paused animations; only existing stage border pigment changes',
  baseColor:colors[0],colors,records:result.records,bestIndex:result.bestIndex,bestColor:colors[result.bestIndex],geometry,responsive};
 writeFileSync(join(work,'work4-forge-stage-rim-ab-384x512.json'),JSON.stringify(report,null,2)+'\n');
 console.log('WORK4_FORGE_STAGE_RIM_AB '+JSON.stringify({bestColor:report.bestColor,bestIndex:report.bestIndex,baseline:result.records[0].roi,best:result.records[result.bestIndex].roi,responsive,approved:false,screensApproved:0}));
});
