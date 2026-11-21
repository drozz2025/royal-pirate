import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');

test('WORK4 Forge expanded approved cannon visibility A/B uses all ten approved WebP references',()=>{
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
 assert.match(css,/width:41%/,'composite keeps narrow plaque');
 assert.match(css,/border-color:#4d4039/,'composite keeps genuine charcoal rim');
 assert.match(css,/linear-gradient\(to right,transparent 0%,#000 22px,#000 100%\)/,'compiled mask is present');
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Forge genuine BASE versus expanded source cannon and narrow live plaque: same frozen Chromium frame and ROI',{
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
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-forge-edge-'));
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
  await cmd('Page.navigate',{url:origin+'?work4=forge-composite-sweep'});
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
  // WORK4/#104: photographic boundary of a single approved cannon/source.
  // Test on the SAME paused native frame: reveal underlying iron/timber very
  // slightly behind the existing real level plaque, without moving controls.
  const sel='.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description';
  const variants=[{px:0,legacy:true},{px:0,legacy:false}, ...[2,4,6,8,10,12,16,22].map(px=>({px,legacy:false}))];
  const screenshots:string[]=[];
  for(const v of variants){
    const paint='width:'+(v.legacy?53:41)+'%!important;border-color:'+(v.legacy?'#725a46':'#4d4039')+'!important;';
    const mask=v.px?'-webkit-mask-image:linear-gradient(to right,transparent 0%,#000 '+v.px+'px,#000 100%)!important;mask-image:linear-gradient(to right,transparent 0%,#000 '+v.px+'px,#000 100%)!important;':'-webkit-mask-image:none!important;mask-image:none!important;';
    const rule=sel+'{'+paint+mask+'}';
    await evaluate("(()=>{let e=document.getElementById('work4-forge-edge-ab');if(!e){e=document.createElement('style');e.id='work4-forge-edge-ab';document.head.append(e);}e.textContent="+JSON.stringify(rule)+";return true;})()");
    await delay(160);
    screenshots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  await evaluate("document.getElementById('work4-forge-edge-ab')?.remove();true");
  await delay(130);
  const compiled=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  const computedMask=await evaluate("getComputedStyle(document.querySelector('.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description')).maskImage");
  assert.ok(String(computedMask).includes('22px'),'compiled CSS must activate 22px Forge feather at native resolution');
  const expr="(async()=>{"+
    "const load=async(src)=>{const i=new Image();i.src=src;await i.decode();return i};"+
    "const original=await load('data:image/webp;base64,"+reference+"');"+
    "const renders=await Promise.all("+JSON.stringify(screenshots)+".map(s=>load('data:image/png;base64,'+s)));"+
    "const compiled=await load('data:image/png;base64,"+compiled+"');"+
    "if([original,...renders].some(i=>i.width!==384||i.height!==512))throw Error('source dimensions must be 384x512');"+
    "const pixels=img=>{const cv=document.createElement('canvas');cv.width=384;cv.height=512;const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);return cx.getImageData(0,0,384,512).data};"+
    "const base=pixels(original),imgs=renders.map(pixels),boxes={full:[0,0,384,512],plaque:[179,145,373,316],plaqueEdge:[176,151,207,312],cannon:[18,153,175,305],barrelOverlap:[162,176,193,267],furnace:[129,168,171,294],costs:[16,329,375,430],dock:[0,433,384,512]};"+
    "const mae=(a,b,r)=>{let x=0,n=0;for(let y=r[1];y<r[3];y++)for(let i=r[0];i<r[2];i++){const k=(y*384+i)*4;for(let c=0;c<3;c++){x+=Math.abs(a[k+c]-b[k+c]);n++;}}return x/n};"+
    "const count=(a,b,r)=>{let n=0;for(let y=r[1];y<r[3];y++)for(let i=r[0];i<r[2];i++){const k=(y*384+i)*4;if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])n++;}return n};"+
    "const rows=imgs.map((p,index)=>({index,roi:Object.fromEntries(Object.entries(boxes).map(([name,r])=>[name,{mae:mae(base,p,r),changedPixels:count(imgs[0],p,r)}]))}));"+
    "const compiledDiff=count(imgs[imgs.length-1],pixels(compiled),boxes.full);"+
    "const initial=rows[0],safe=rows.filter(row=>row.roi.costs.changedPixels===0&&row.roi.dock.changedPixels===0&&"+
    "['full','plaque','cannon','furnace'].every(k=>row.roi[k].mae<=initial.roi[k].mae+.0001));"+
    "safe.sort((a,b)=>(a.roi.barrelOverlap.mae-b.roi.barrelOverlap.mae)||(a.roi.plaqueEdge.mae-b.roi.plaqueEdge.mae)||(a.roi.full.mae-b.roi.full.mae));"+
    "const winner=safe[0]||initial;"+
    "const promoted=renders[renders.length-1];const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const ctx=canvas.getContext('2d');"+
    "ctx.drawImage(original,0,0);ctx.drawImage(renders[0],384,0);ctx.drawImage(promoted,768,0);ctx.drawImage(original,1152,0);ctx.globalAlpha=.5;ctx.drawImage(promoted,1152,0);"+
    "return {rows,winner:winner.index,boxes,compiledDiff,overlay:canvas.toDataURL('image/png').split(',')[1]};})()";
  const data=await evaluate(expr);
  // Always save quantitative evidence BEFORE fidelity gates; a rejected
  // candidate must leave readable data, not an uninformative red check.
  writeFileSync(join(qa,'work4-forge-cannon-reveal-raw-384x512.json'),
    JSON.stringify({approved:false,approvedScreens:0,source:'04-melhorias-forja.webp',
      viewport:'384x512',variants,geometry,boxes:data.boxes,rows:data.rows,
      compiledDiff:data.compiledDiff},null,2)+'\\n');
  console.log('WORK4_FORGE_REVEAL_RAW '+JSON.stringify(data.rows.map((r:any)=>({
    index:r.index,full:r.roi.full.mae,plaque:r.roi.plaque.mae,
    edge:r.roi.plaqueEdge.mae,barrel:r.roi.barrelOverlap.mae,
    cannon:r.roi.cannon.mae,furnace:r.roi.furnace.mae,
    costsChanged:r.roi.costs.changedPixels,dockChanged:r.roi.dock.changedPixels
  }))));
  assert.equal(data.rows.length,variants.length);
  assert.equal(data.compiledDiff,0,'compiled production CSS must match 22px candidate exactly');
  const initial=data.rows[0],chosen=data.rows[data.rows.length-1];
  assert.ok(chosen.roi.full.mae<initial.roi.full.mae,'source-cannon reveal must improve total RGB MAE vs real base');
  assert.ok(chosen.roi.barrelOverlap.mae<initial.roi.barrelOverlap.mae,'cannon/plaque overlap must improve');
  for(const key of ['costs','dock']) assert.equal(chosen.roi[key].changedPixels,0,key+' protected');
  assert.equal(geometry.cannon,1);
  assert.equal(geometry.liveLevels,3);
  assert.equal(geometry.costs,3);
  assert.equal(geometry.dock,5);
  const evidence={
    approved:false,screensApproved:0,reference:'assets/design-approved/04-melhorias-forja.webp',
    viewport:'384x512',frame:'same paused Chromium render, reference image 1:1',
    sourceImageCount:geometry.cannon,realCosts:geometry.costs,dockButtons:geometry.dock,
    proposalOnly:false,verifiedProductionCSS:true,compiledPixelDifference:data.compiledDiff,roi:data.boxes,variants:variants.map((v,i)=>({...v,...data.rows[i]})),
    safeWinner:variants[data.winner].px, promotedVariant:variants[variants.length-1],
    conclusion:'Combined native 384x512 candidate only, pending human review; never automatic approval'
  };
  writeFileSync(join(qa,'work4-forge-composite-384x512.json'),JSON.stringify(evidence,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-forge-composite-384x512.png'),
    Buffer.from(data.overlay,'base64'));
  console.log('WORK4_FORGE_COMPOSITE_AB '+JSON.stringify({
    winner:evidence.safeWinner,promoted:evidence.promotedVariant,conclusion:evidence.conclusion,
    variants:evidence.variants.map(v=>({px:v.px,
      full:v.roi.full.mae,plaque:v.roi.plaque.mae,edge:v.roi.plaqueEdge.mae,
      barrel:v.roi.barrelOverlap.mae,cannon:v.roi.cannon.mae,
      furnace:v.roi.furnace.mae,costChanges:v.roi.costs.changedPixels,
      dockChanges:v.roi.dock.changedPixels}))
  }));
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
    await delay(160);
    const viewport=await evaluate("(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,"+
      "cannons:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,"+
      "costs:document.querySelectorAll('.w4-forge .w4-resource-grid>div').length,"+
      "dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length}))()");
    assert.ok(viewport.scroll<=width,'no horizontal overflow '+width);
    assert.equal(viewport.cannons,1,'one forge cannon '+width);
    assert.equal(viewport.costs,3,'three real costs '+width);
    assert.equal(viewport.dock,5,'five menu items '+width);
    writeFileSync(join(qa,'forge-source-edge-'+width+'x'+height+'.png'),
      Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  }
});
