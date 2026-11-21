import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');

test('WORK4 Forge original-light study uses the actual 10 mandatory approved reference images',()=>{
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

test('WORK4 Forge native original-light feather sweep: same frame, full/plaque/cannon/hearth ROIs',{
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
  await cmd('Page.navigate',{url:origin+'?work4=forge-original-light-sweep'});
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
  // WORK4 21 Nov — compare source-lit workshop materials without touching the
  // approved source cannon, its furnace, real prices, interaction, or WORK0 dock.
  // All variants are injected into the SAME paused native scene/frame.
  const sel='.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-scene';
  const variants=[
    {id:'release',shine:'#493326',shade:'#302724',mid:'#252327',foot:'#272324'},
    {id:'warm-bronze',shine:'#61402a',shade:'#382a25',mid:'#292628',foot:'#2e2524'},
    {id:'iron-deep',shine:'#473222',shade:'#2c2525',mid:'#241f23',foot:'#191a20'},
    {id:'amber-foundry',shine:'#72432a',shade:'#38231e',mid:'#2c2525',foot:'#2d211f'},
    {id:'stone-timber',shine:'#4d3b32',shade:'#302926',mid:'#272a2a',foot:'#292726'},
    {id:'fire-recess',shine:'#603d2b',shade:'#422a25',mid:'#29242a',foot:'#34231f'},
    {id:'blue-charcoal',shine:'#352b26',shade:'#24252a',mid:'#1c2832',foot:'#21252b'},
    {id:'old-brass',shine:'#655036',shade:'#40342b',mid:'#2a2927',foot:'#312920'},
    {id:'heat-dusk',shine:'#663522',shade:'#3b2927',mid:'#29232b',foot:'#33231f'}
  ];
  const originalImage=await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(".w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-scene")+");return getComputedStyle(e).backgroundImage})()");
  assert.match(originalImage,/radial-gradient/,'single existing source-lit workshop');
  const paint=v=>sel+'{background-image:radial-gradient(ellipse 48% 82% at 12% 84%,'+v.shine+
    ' 0%,'+v.shade+' 39%,transparent 90%),linear-gradient(165deg,#181d26 0%,'+
    v.mid+' 56%,'+v.foot+' 100%)!important;}';
  const screenshots:string[]=[];
  for(const v of variants){
    await evaluate("(()=>{let e=document.getElementById('work4-forge-original-light-ab');if(!e){e=document.createElement('style');e.id='work4-forge-original-light-ab';document.head.append(e)}e.textContent="+
      JSON.stringify(paint(v))+";return true})()");
    await delay(175);
    screenshots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  await evaluate("document.getElementById('work4-forge-original-light-ab')?.remove();true");
  await delay(175);
  const compiled=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  const expr="(async()=>{"+
    "const load=async src=>{const i=new Image();i.src=src;await i.decode();return i};"+
    "const ref=await load('data:image/webp;base64,"+reference+"');"+
    "const images=await Promise.all("+JSON.stringify(screenshots)+".map(p=>load('data:image/png;base64,'+p)));"+
    "const compiled=await load('data:image/png;base64,"+compiled+"');"+
    "if([ref,...images,compiled].some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 only');"+
    "const pix=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);return x.getImageData(0,0,384,512).data};"+
    "const source=pix(ref),all=images.map(pix),restored=pix(compiled);"+
    "const boxes={full:[0,0,384,512],workshop:[17,149,180,317],cannon:[18,153,175,305],cannonMetal:[36,164,152,278],furnace:[129,168,171,294],levelPlaque:[179,145,373,316],costs:[16,329,375,430],dock:[0,433,384,512]};"+
    "const mae=(a,b,r)=>{let v=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let i=0;i<3;i++){v+=Math.abs(a[k+i]-b[k+i]);n++}}return v/n};"+
    "const changed=(a,b,r)=>{let n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;if(a[k]!=b[k]||a[k+1]!=b[k+1]||a[k+2]!=b[k+2])n++}return n};"+
    "const stats=all.map((p,index)=>({index,metrics:Object.fromEntries(Object.entries(boxes).map(([k,r])=>[k,{mae:mae(source,p,r),changed:changed(all[0],p,r)}]))}));"+
    "const protected=['costs','dock'];const valid=stats.filter(s=>protected.every(k=>s.metrics[k].changed===0)&&"+
    "s.metrics.cannon.mae<=stats[0].metrics.cannon.mae+.00001&&"+
    "s.metrics.furnace.mae<=stats[0].metrics.furnace.mae+.00001&&"+
    "s.metrics.full.mae<=stats[0].metrics.full.mae+.00001);"+
    "valid.sort((a,b)=>a.metrics.workshop.mae-b.metrics.workshop.mae||a.metrics.full.mae-b.metrics.full.mae);"+
    "const winner=valid[0]||stats[0],c=document.createElement('canvas');c.width=1536;c.height=512;const x=c.getContext('2d');"+
    "x.drawImage(ref,0,0);x.drawImage(images[0],384,0);x.drawImage(images[winner.index],768,0);"+
    "x.drawImage(ref,1152,0);x.globalAlpha=.5;x.drawImage(images[winner.index],1152,0);x.globalAlpha=1;"+
    "return {stats,boxes,selected:winner.index,compiledDiff:changed(all[0],restored,boxes.full),"+
    "overlay:c.toDataURL('image/png').split(',')[1]}})()";
  const scan=await evaluate(expr);
  assert.equal(scan.stats.length,variants.length);
  assert.equal(scan.compiledDiff,0,'compiled original CSS must match release trial after removing injected overrides');
  assert.equal(geometry.cannon,1,'only one original cannon');
  assert.equal(geometry.costs,3,'three real cost cells');
  assert.equal(geometry.dock,5,'five WORK0 dock elements');
  for(const k of ['costs','dock'])assert.equal(scan.stats[scan.selected].metrics[k].changed,0,k+' pixel invariant');
  const report={
    approved:false,screensApproved:0,viewport:'384x512',
    frame:'same paused Chromium scene, deterministic account state and font load',
    source:'assets/design-approved/04-melhorias-forja.webp',
    originalReferences:['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp','01-08'],
    feature:'existing single-cannon workshop underlighting only; no fake cannon/glow, functional data or geometry',
    selected:variants[scan.selected].id,baseline:'release',roiBoxes:scan.boxes,
    candidates:variants.map((v,i)=>({...v,...scan.stats[i]})),
    allowedToPromote:scan.selected!==0&&
      scan.stats[scan.selected].metrics.full.mae<scan.stats[0].metrics.full.mae-.005&&
      scan.stats[scan.selected].metrics.workshop.mae<scan.stats[0].metrics.workshop.mae-.03,
    compiledRestoresBaseline:scan.compiledDiff===0,
    note:'Exploratory QA, not production modification; WORK0 exclusively integrates, releases and approves.'
  };
  writeFileSync(join(qa,'work4-forge-original-light-native-ab-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-trial-overlay-forge-light-384x512.png'),Buffer.from(scan.overlay,'base64'));
  console.log('WORK4_FORGE_ORIGINAL_LIGHT_NATIVE_AB '+JSON.stringify({
    approved:false,screensApproved:0,selected:report.selected,allowedToPromote:report.allowedToPromote,
    candidates:report.candidates.map(x=>({id:x.id,
      fullMAE:x.metrics.full.mae,workshopMAE:x.metrics.workshop.mae,
      cannonMAE:x.metrics.cannon.mae,furnaceMAE:x.metrics.furnace.mae,
      metalMAE:x.metrics.cannonMetal.mae,
      costsChanged:x.metrics.costs.changed,dockChanged:x.metrics.dock.changed}))
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
    writeFileSync(join(qa,'forge-original-light-'+width+'x'+height+'.png'),
      Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  }
});
