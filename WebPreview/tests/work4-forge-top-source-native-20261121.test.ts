import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');

test('WORK4 Forja top photo edge validates ten approved WebPs',()=>{
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

test('WORK4 Forja source-photo upper-edge A/B one frozen Chromium frame',{
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
  // Unique source TOP-seam ablation, not the rejected 41%-plaque trial.
  // Keep current cannon crop and live prices; all temporary styles are removed.
  const sel='.w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon';
  const variants=[0,2,4,6,8,10,12,16].map(top=>({id:top?'top-'+top:'baseline',top}));
  const screenshots:string[]=[];
  for(const v of variants){
    const radial='radial-gradient(ellipse 140% 122% at 37% 49%,#000 0%,#000 84%,transparent 99%)';
    const vertical='linear-gradient(to bottom,transparent 0%,#000 '+v.top+'%,#000 99%,transparent 100%)';
    const mask=v.top?'-webkit-mask-image:'+radial+','+vertical+'!important;mask-image:'+radial+','+vertical+'!important;-webkit-mask-composite:source-in!important;mask-composite:intersect!important;':'';
    const rule=v.top?sel+'{'+mask+'}':'';
    await evaluate("(()=>{let e=document.getElementById('work4-forge-edge-ab');if(!e){e=document.createElement('style');e.id='work4-forge-edge-ab';document.head.append(e);}e.textContent="+JSON.stringify(rule)+";return true;})()");
    await delay(155);
    screenshots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  await evaluate("document.getElementById('work4-forge-edge-ab')?.remove();true");
  await delay(130);
  const compiled=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  const expr="(async()=>{"+
    "const load=async(src)=>{const i=new Image();i.src=src;await i.decode();return i};"+
    "const original=await load('data:image/webp;base64,"+reference+"');"+
    "const renders=await Promise.all("+JSON.stringify(screenshots)+".map(s=>load('data:image/png;base64,'+s)));"+
    "const compiled=await load('data:image/png;base64,"+compiled+"');"+
    "if([original,...renders,compiled].some(i=>i.width!==384||i.height!==512))throw Error('must be 384x512');"+
    "const pixels=img=>{const cv=document.createElement('canvas');cv.width=384;cv.height=512;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);return c.getImageData(0,0,384,512).data};"+
    "const approved=pixels(original),imgs=renders.map(pixels),boxes={full:[0,0,384,512],sourceTop:[18,151,205,191],cannon:[24,192,172,309],furnace:[129,177,175,307],plaque:[179,164,373,317],costs:[16,329,375,430],dock:[0,433,384,512]};"+
    "const mae=(a,b,r)=>{let s=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let k=(y*384+x)*4;for(let c=0;c<3;c++){s+=Math.abs(a[k+c]-b[k+c]);n++}}return s/n};"+
    "const changed=(a,b,r)=>{let n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let k=(y*384+x)*4;if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])n++}return n};"+
    "const rows=imgs.map((p,index)=>({index,roi:Object.fromEntries(Object.entries(boxes).map(([name,r])=>[name,{mae:mae(approved,p,r),changedPixels:changed(imgs[0],p,r)}]))}));"+
    "const baseline=rows[0],safe=rows.filter(r=>r.roi.costs.changedPixels===0&&r.roi.dock.changedPixels===0&&r.roi.full.mae<=baseline.roi.full.mae+.001&&r.roi.cannon.mae<=baseline.roi.cannon.mae+.03&&r.roi.furnace.mae<=baseline.roi.furnace.mae+.03);"+
    "safe.sort((a,b)=>(a.roi.sourceTop.mae-b.roi.sourceTop.mae)||(a.roi.full.mae-b.roi.full.mae));"+
    "const best=safe[0]||baseline;const out=document.createElement('canvas');out.width=1536;out.height=512;const ctx=out.getContext('2d');ctx.drawImage(original,0,0);ctx.drawImage(renders[0],384,0);ctx.drawImage(renders[best.index],768,0);ctx.drawImage(original,1152,0);ctx.globalAlpha=.5;ctx.drawImage(renders[best.index],1152,0);"+
    "return {rows,boxes,winner:best.index,compiledDiff:changed(imgs[0],pixels(compiled),boxes.full),overlay:out.toDataURL('image/png').split(',')[1]};})()";
  const data=await evaluate(expr);
  const evidence={approved:false,approvedScreens:0,productionChanged:false,reference:'assets/design-approved/04-melhorias-forja.webp',
    comparison:'ORIGINAL | BEFORE | BEST_SAFE_TRIAL | OVERLAY',viewport:'384x512',
    frame:'same frozen Chromium scene/profile',variants,geometry,boxes:data.boxes,rows:data.rows,
    winner:variants[data.winner].id,compiledDiff:data.compiledDiff,
    note:'Research only, not promoted. One cannon, furnace, three actual prices and five dock buttons protected.'};
  writeFileSync(join(qa,'work4-forge-top-source-native-384x512.json'),JSON.stringify(evidence,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-forge-top-384x512.png'),Buffer.from(data.overlay,'base64'));
  console.log('WORK4_FORGE_SOURCE_TOP_AB '+JSON.stringify({winner:evidence.winner,
    rows:data.rows.map((r:any)=>({id:variants[r.index].id,full:r.roi.full.mae,top:r.roi.sourceTop.mae,cannon:r.roi.cannon.mae,
      furnace:r.roi.furnace.mae,plaque:r.roi.plaque.mae,costsChanged:r.roi.costs.changedPixels,dockChanged:r.roi.dock.changedPixels}))}));
  assert.equal(data.rows.length,variants.length);
  assert.equal(data.compiledDiff,0,'temporary CSS must be fully removed after A/B');
  for(const row of data.rows){assert.equal(row.roi.costs.changedPixels,0,'actual prices protected');assert.equal(row.roi.dock.changedPixels,0,'WORK0 dock protected');}
  assert.equal(geometry.cannon,1);assert.equal(geometry.liveLevels,3);assert.equal(geometry.costs,3);assert.equal(geometry.dock,5);
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
