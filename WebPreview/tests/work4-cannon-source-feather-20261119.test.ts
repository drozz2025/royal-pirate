import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');

test('WORK4 Forge cannon-source feather study uses the actual 10 mandatory approved reference images',()=>{
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

test('WORK4 Forge native cannon original-edge feather: same frame with four responsive viewports',{
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

  // The exact same native 384x512 frame is reused for every candidate.
  // Only the alpha feather of the approved 04 cannon photograph changes.
  const feather=[99,99.5,100];
  const shots:string[]=[];
  for(const edge of feather){
    const mask='radial-gradient(ellipse 140% 122% at 37% 49%,#000 0%,#000 84%,transparent 99%),linear-gradient(to bottom,#000 0%,#000 '+edge+'%,transparent 100%)';
    const rule='.w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon{-webkit-mask-image:'+mask+'!important;mask-image:'+mask+'!important;-webkit-mask-composite:source-in;mask-composite:intersect;}';
    await evaluate("(()=>{let s=document.getElementById('work4-cannon-feather-ab');if(!s){s=document.createElement('style');s.id='work4-cannon-feather-ab';document.head.append(s);}s.textContent="+JSON.stringify(rule)+";return true})()");
    await delay(180);
    shots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  const expression="(async()=>{"+
    "const decode=async(data,mime)=>{let im=new Image();im.src='data:'+mime+';base64,'+data;await im.decode();return im;};"+
    "const source=await decode("+JSON.stringify(reference)+",'image/webp');"+
    "const images=await Promise.all("+JSON.stringify(shots)+".map(x=>decode(x,'image/png')));"+
    "if([source,...images].some(x=>x.width!==384||x.height!==512))throw Error('Non-native frame');"+
    "const pixels=(img)=>{let canvas=document.createElement('canvas');canvas.width=384;canvas.height=512;let ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);return ctx.getImageData(0,0,384,512).data;};"+
    "const target=pixels(source),s=images.map(pixels);"+
    "const boxes={full:[0,0,384,512],cannon:[18,153,175,305],cannonEdge:[10,284,185,317],furnace:[129,168,171,294],costs:[16,329,375,430],dock:[0,433,384,512]};"+
    "const mae=(a,b,rect)=>{let sum=0,count=0;for(let y=rect[1];y<rect[3];y++)for(let x=rect[0];x<rect[2];x++){let o=(y*384+x)*4;for(let j=0;j<3;j++){sum+=Math.abs(a[o+j]-b[o+j]);count++;}}return sum/count;};"+
    "const changed=(a,b,rect)=>{let count=0;for(let y=rect[1];y<rect[3];y++)for(let x=rect[0];x<rect[2];x++){let o=(y*384+x)*4;if(a[o]!==b[o]||a[o+1]!==b[o+1]||a[o+2]!==b[o+2])count++;}return count;};"+
    "const metrics=images.map((im,index)=>{const roi={};for(const [k,v] of Object.entries(boxes)){roi[k]={mae:mae(target,s[index],v),changedPixels:changed(s[0],s[index],v)};}return {feather:"+JSON.stringify(feather)+"[index],roi};});"+
    "const after=images[1],overlay=document.createElement('canvas');overlay.width=1536;overlay.height=512;const g=overlay.getContext('2d');g.drawImage(source,0,0);g.drawImage(images[0],384,0);g.drawImage(after,768,0);g.drawImage(source,1152,0);g.globalAlpha=.5;g.drawImage(after,1152,0);g.globalAlpha=1;"+
    "return {metrics,comparison:overlay.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(expression);
  assert.equal(result.metrics.length,3);
  assert.ok(Number.isFinite(result.metrics[1].roi.full.mae));
  assert.equal(result.metrics[1].roi.costs.changedPixels,0,'all three real prices must remain pixel-identical');
  assert.equal(result.metrics[1].roi.dock.changedPixels,0,'five WORK0 dock items must remain pixel-identical');
  assert.ok(result.metrics[1].roi.cannonEdge.changedPixels>0,'candidate must create an actual source-edge change');
  // Decision is made from real MAE/ROI; no fabricated score or artistic approval.
  // A worsening score is documented so WORK0 can reject the visual patch.
  const candidate=result.metrics[1],baseline=result.metrics[0];
  const accepted=candidate.roi.full.mae<=baseline.roi.full.mae
    &&candidate.roi.cannon.mae<=baseline.roi.cannon.mae
    &&candidate.roi.cannonEdge.mae<=baseline.roi.cannonEdge.mae
    &&candidate.roi.furnace.mae<=baseline.roi.furnace.mae;
  writeFileSync(join(qa,'original-before-render-overlay-forge-feather-384x512.png'),Buffer.from(result.comparison,'base64'));
  await evaluate("document.getElementById('work4-cannon-feather-ab')?.remove();true");
  const viewports=[{width:320,height:568},{width:390,height:844},{width:430,height:932}];
  const responsive=[];
  for(const viewport of viewports){
    await cmd('Emulation.setDeviceMetricsOverride',{
      ...viewport,deviceScaleFactor:1,mobile:true,screenWidth:viewport.width,screenHeight:viewport.height
    });
    await delay(170);
    const ui=await evaluate("(()=>({width:innerWidth,bodyWidth:document.documentElement.scrollWidth,ship:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,prices:document.querySelectorAll('.w4-forge .w4-resource-grid>div').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,upgrade:!!document.querySelector('.w4-forge .w4-improve-button'),nativeOverride:matchMedia('(width:384px) and (height:512px)').matches}))()");
    assert.equal(ui.width,viewport.width);
    assert.equal(ui.ship,1,'one cannon at '+viewport.width);
    assert.equal(ui.prices,3,'real cost grid at '+viewport.width);
    assert.equal(ui.dock,5,'five functional menu entries at '+viewport.width);
    assert.equal(ui.upgrade,true);
    assert.equal(ui.nativeOverride,false,'native-only paint not applied at '+viewport.width);
    responsive.push({viewport,ui});
    writeFileSync(join(qa,'forge-feather-'+viewport.width+'x'+viewport.height+'.png'),
      Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  }
  const report={approved:false,screensApproved:0,base:'work6/web-3d-preview',reference:'04-melhorias-forja.webp',
    comparison:'same paused Chromium 384x512 scene, only one original source-cannon alpha edge differs',
    geometry,roi:result.metrics,candidateAcceptedByMAEGate:accepted,
    responsive,flags:{oneCannon:true,realCosts:true,fiveItemDock:true,portedCssUntouched:true},
    next:'WORK0 review only. HUMAN approval required; no merge, versioning, HTTP or publication.'};
  writeFileSync(join(qa,'work4-forge-cannon-source-feather-384x512.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_FORGE_SOURCE_FEATHER_AB '+JSON.stringify(report));
  // If the candidate is worse, the change should be removed rather than
  // overriding the empirical source-of-truth with an invented improvement.
  assert.ok(accepted,'source feather 99.5% must improve/nonregress full, cannon, edge and furnace MAE vs 99%');
});
