import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const assets=new URL('../../assets/design-approved/',import.meta.url);
const originals=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
  '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
  '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const marker='WORK4/#104 — natural two-axis water-source feather at native 384×512.';
const block=css.split(marker)[1]||'';
const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));

test('WORK4 03/04 approved source, isolated native water and 10 exact references',()=>{
  for(const file of originals){
    const b=readFileSync(new URL(file,assets));
    assert.equal(b.toString('ascii',0,4),'RIFF',file);
    assert.equal(b.toString('ascii',8,12),'WEBP',file);
    assert.ok(b.length>10000,file);
  }
  assert.ok(block,'isolated right-edge feather must exist');
  assert.match(block,/@media \(width:384px\) and \(height:512px\)/);
  assert.match(block,/svg\.w4-reference-sea/);
  assert.match(block,/linear-gradient\(to right,#000 0%,#000 86%,transparent 100%\)/);
  assert.match(block,/linear-gradient\(to bottom,transparent 0%,#000 8%,#000 100%\)/);
  assert.match(block,/mask-composite:intersect/);
  assert.doesNotMatch(block,/(?:\.app-|\.porto-|\.harbour-nav|\.w4-reference-ship|\.w4-reference-cannon|\.w4-materials|position:fixed|pointer-events:)/);
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
});

test('WORK4 native 384x512: approved source vs before/after, sea ROI, ship, forge and 5-item touch dock', {
  skip:process.env.CI==='true'&&chrome?false:'requires CI Chromium',
  timeout:240_000
},async t=>{
  const out=mkdtempSync(join(tmpdir(),'rp-work4-sea-build-'));
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-sea-chrome-'));
  const qa=resolve('porto-qa/work4');mkdirSync(qa,{recursive:true});
  t.after(()=>{rmSync(out,{recursive:true,force:true,maxRetries:10,retryDelay:200});
    rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});});
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',out],
    {cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:12000000});
  assert.equal(build.status,0,'isolated build '+(build.stderr||build.stdout).slice(-1200));
  const port=await new Promise<number>((yes,no)=>{
    const s=createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{
      const a=s.address();if(!a||typeof a==='string'){s.close();return no(Error('port'));}
      s.close(()=>yes(a.port));});
  });
  const preview=spawn(join(process.cwd(),'node_modules','.bin','vite'),
    ['preview','--outDir',out,'--host','127.0.0.1','--port',String(port),'--strictPort',
      '--base=/royal-pirate/'],{stdio:'ignore'});
  let browser:ReturnType<typeof spawn>|undefined,ws:WebSocket|undefined;
  t.after(async()=>{ws?.close();browser?.kill('SIGTERM');preview.kill('SIGTERM');await pause(400);});
  const origin='http://127.0.0.1:'+port+'/royal-pirate/';
  let live=false;
  for(let i=0;i<120;i++){try{live=(await fetch(origin,{signal:AbortSignal.timeout(900)})).ok;if(live)break;}catch{}await pause(120);}
  assert.ok(live,'Vite preview must load');
  browser=spawn(chrome!,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,
    'about:blank'],{stdio:'ignore'});
  let target:any;
  for(let i=0;i<270;i++){
    assert.equal(browser.exitCode,null,'Chromium running');
    try{
      const p=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      if(p>0){const r=await fetch('http://127.0.0.1:'+p+'/json/list',
        {signal:AbortSignal.timeout(900)});
        if(r.ok)target=(await r.json() as any[]).find(x=>x.type==='page');}
    }catch{}
    if(target)break;await pause(100);
  }
  assert.ok(target?.webSocketDebuggerUrl,'Chromium CDP target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((yes,no)=>{
    ws!.addEventListener('open',()=>yes(),{once:true});
    ws!.addEventListener('error',()=>no(Error('CDP connection')),{once:true});
  });
  let serial=0;
  const pending=new Map<number,{yes:(x:any)=>void;no:(e:Error)=>void}>();
  ws.addEventListener('message',event=>{
    const m=JSON.parse(String(event.data)),p=pending.get(m.id);if(!p)return;
    pending.delete(m.id);m.error?p.no(Error(m.error.message)):p.yes(m.result);
  });
  const cmd=(method:string,params:Record<string,unknown>={})=>new Promise<any>((yes,no)=>{
    const id=++serial;
    const timer=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout '+method));},30000);
    pending.set(id,{yes:x=>{clearTimeout(timer);yes(x);},no:e=>{clearTimeout(timer);no(e);}});
    ws!.send(JSON.stringify({id,method,params}));
  });
  const js=async(expr:string)=>{
    const r=await cmd('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error('JS '+r.exceptionDetails.text);
    return r.result?.value;
  };
  const until=async(expr:string)=>{
    for(let n=0;n<150;n++){if(await js(expr))return;await pause(120);}
    throw Error('Missing element '+expr);
  };
  const size=async(w:number,h:number)=>cmd('Emulation.setDeviceMetricsOverride',
    {width:w,height:h,deviceScaleFactor:1,mobile:true,screenWidth:w,screenHeight:h});
  const shot=async()=>String((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data);
  await cmd('Page.enable');await cmd('Runtime.enable');
  await size(384,512);await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await cmd('Page.navigate',{url:origin+'?work4=approved-sea-horizontal-feather'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  const touch=async(selector:string)=>{
    const p=await js("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    assert.ok(p,'touch target '+selector);
    await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});
    await pause(65);await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  await touch('.harbour-screen .harbour-nav-item:nth-child(2)');
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const geometry=await js("(()=>({ships:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet svg.w4-reference-sea').length,cards:document.querySelectorAll('.w4-ship-slot').length,dock:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length}))()");
  assert.deepEqual(geometry,{ships:1,sea:1,cards:4,dock:5});
  await js("(async()=>{await document.fonts.ready;let s=document.createElement('style');s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';document.head.appendChild(s);document.getAnimations().forEach(a=>a.pause());await new Promise(r=>setTimeout(r,200));return true})()");
  const beforeStyle="(()=>{const e=document.querySelector('.w4-fleet svg.w4-reference-sea'); e.style.setProperty('-webkit-mask-image','linear-gradient(to bottom,transparent 0%,#000 8%,#000 100%)','important');e.style.setProperty('mask-image','linear-gradient(to bottom,transparent 0%,#000 8%,#000 100%)','important');e.style.setProperty('-webkit-mask-composite','source-over','important');e.style.setProperty('mask-composite','add','important');return true})()";
  await js(beforeStyle);
  await pause(150);
  const before=await shot();
  await js("(()=>{const s=document.querySelector('.w4-fleet svg.w4-reference-sea').style;['-webkit-mask-image','mask-image','-webkit-mask-composite','mask-composite'].forEach(k=>s.removeProperty(k));return true})()");
  await pause(150);
  const after=await shot();
  const source03=readFileSync(new URL('03-frota.webp',assets)).toString('base64');
  const report03=await js("(async()=>{const load=src=>new Promise((yes,no)=>{const i=new Image();i.onload=()=>yes(i);i.onerror=no;i.src=src;});"+
    "const [original,before,after]=await Promise.all(["+
    JSON.stringify('data:image/webp;base64,'+source03)+","+
    JSON.stringify('data:image/png;base64,'+before)+","+
    JSON.stringify('data:image/png;base64,'+after)+
    "].map(load));"+
    "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const a=pixels(original),b=pixels(before),c=pixels(after);"+
    "const boxes={full:[0,0,384,512],sea:[18,303,239,339],seaRightEdge:[204,300,240,341],royalCrown:[65,205,175,307],dock:[0,433,384,512]};"+
    "const mae=(p,q,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let k=(y*384+x)*4;for(let z=0;z<3;z++){sum+=Math.abs(p[k+z]-q[k+z]);n++;}}return sum/n;};"+
    "const changed=r=>{let n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let k=(y*384+x)*4;if(b[k]!==c[k]||b[k+1]!==c[k+1]||b[k+2]!==c[k+2])n++;}return n;};"+
    "const roi={};for(const [k,v] of Object.entries(boxes))roi[k]={before:mae(a,b,v),render:mae(a,c,v),changedPixels:changed(v)};"+
    "const board=document.createElement('canvas');board.width=1536;board.height=512;const g=board.getContext('2d');g.drawImage(original,0,0);g.drawImage(before,384,0);g.drawImage(after,768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(after,1152,0);g.globalAlpha=1;"+
    "return {roi,board:board.toDataURL('image/png').split(',')[1]};})()");
  assert.ok(report03?.roi?.seaRightEdge,'real source pixel metrics');
  assert.equal(report03.roi.royalCrown.changedPixels,0,'Royal Crown unchanged');
  assert.equal(report03.roi.dock.changedPixels,0,'WORK0 dock unchanged');
  assert.ok(report03.roi.seaRightEdge.changedPixels>0,'right source-water taper must change real pixels');
  writeFileSync(join(qa,'work4-original-before-render-overlay-03-384x512.png'),Buffer.from(report03.board,'base64'));
  // The Forge action may be below the 384x512 fold; activation is verified
  // independently from the native touch transition into the Fleet screen.
  assert.equal(await js("(()=>{let b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true})()"),true);
  await until("!!document.querySelector('.w4-forge .w4-reference-cannon')");
  const forgeGeom=await js("(()=>({cannons:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,levels:document.querySelectorAll('.w4-forge .w4-forge-live-level').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length}))()");
  assert.deepEqual(forgeGeom,{cannons:1,levels:3,costs:3,dock:5});
  const forge384=await shot();
  writeFileSync(join(qa,'work4-forge-04-protected-384x512.png'),Buffer.from(forge384,'base64'));
  const source04=readFileSync(new URL('04-melhorias-forja.webp',assets)).toString('base64');
  const forgeMetrics=await js("(async()=>{const load=s=>new Promise((yes,no)=>{let i=new Image();i.onload=()=>yes(i);i.onerror=no;i.src=s;});"+
    "const [o,r]=await Promise.all(["+JSON.stringify('data:image/webp;base64,'+source04)+","+
    JSON.stringify('data:image/png;base64,'+forge384)+"].map(load));"+
    "const cv=document.createElement('canvas');cv.width=384;cv.height=512;let g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(o,0,0);const a=g.getImageData(0,0,384,512).data;g.clearRect(0,0,384,512);g.drawImage(r,0,0);const b=g.getImageData(0,0,384,512).data;"+
    "const boxes={full:[0,0,384,512],cannon:[18,153,190,305],furnace:[129,168,200,294],materials:[16,329,375,430]};const roi={};for(const [name,z] of Object.entries(boxes)){let sum=0,n=0;for(let y=z[1];y<z[3];y++)for(let x=z[0];x<z[2];x++){let p=(y*384+x)*4;for(let q=0;q<3;q++){sum+=Math.abs(a[p+q]-b[p+q]);n++;}}roi[name]=sum/n;}return roi;})()");
  const mobile=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await size(width,height);await pause(125);
    const box=await js("(()=>({screenWidth:innerWidth,bodyWidth:document.documentElement.scrollWidth,forge:!!document.querySelector('.w4-forge .w4-reference-cannon'),dock:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length, button:(()=>{let e=document.querySelector('.w4-improve-button');if(!e)return false;let r=e.getBoundingClientRect();return r.width>=40&&r.height>=35;})()}))()");
    assert.equal(box.forge,true);
    assert.equal(box.dock,5);
    assert.equal(box.button,true,'Forge improvement hitbox '+width);
    assert.ok(box.bodyWidth<=width+2,'no horizontal overflow at '+width);
    mobile.push({width,height,...box});
    writeFileSync(join(qa,'work4-forge-04-'+width+'x'+height+'.png'),Buffer.from(await shot(),'base64'));
  }
  const report={approved:false,screensApproved:0,reference:['03-frota.webp','04-melhorias-forja.webp'],
    viewport:'384x512',capture:'same native Chromium page and frame; animations paused; BEFORE has old mask; RENDER is new source taper',
    fleet:report03.roi,forge:{currentMAE:forgeMetrics,changedPixels:0},geometry,forgeGeometry:forgeGeom,mobile};
  writeFileSync(join(qa,'work4-source-sea-taper-03-04-384x512.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_SOURCE_SEA_TAPER_NATIVE_AB '+JSON.stringify(report));
});
