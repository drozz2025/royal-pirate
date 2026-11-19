import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');

test('WORK4 Forge workshop underlay sweep checks all 10 approved design reference assets',()=>{
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
 assert.match(css,/background-color:#272324!important/);
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Forge native workshop underlay A/B: same-frame full/scene/cannon/hearth ROI metrics',{
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
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-forge-workshop-'));
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
  await cmd('Page.navigate',{url:origin+'?work4=forge-workshop-underlay-ab'});
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
  // Only source-adjacent workshop underlay pigment, behind the real cannon.
  // This test is a research gate: no unmeasured production CSS change.
  // Colour samples are dark iron, charcoal and oiled timber, not new content.
  const variants=[
    {color:'#2d2929'}, // merged HEAD baseline; never substituted by a mock
    ...['#171b20','#1b2023','#202327','#25282a','#292829','#302b29',
        '#342c28','#3a302b','#342822','#281e1e','#22201e','#272324',
        '#302925','#2d2d2c','#233039','#243039','#1b2a30','#202a2b',
        '#2b2525','#352e2b','#282521'].map(color=>({color}))
  ];
  const shots=[];
  for(const shift of variants){
    const rule='.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-scene{background-color:'+shift.color+'!important;}';
    const exp="(()=>{let style=document.getElementById('work4-forge-workshop-candidate');if(!style){style=document.createElement('style');style.id='work4-forge-plaque-candidate';document.head.append(style)}style.textContent="+JSON.stringify(rule)+";return true})()";
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
    "const a=pix(original),shots=screens.map(pix),boxes={full:[0,0,384,512],workshop:[0,136,384,325],seam:[166,158,207,303],cannon:[18,153,175,305],furnace:[129,168,171,294],costs:[16,329,375,430],dock:[0,433,384,512]};"+
    "const mae=(x,y,b)=>{let sum=0,n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;for(let j=0;j<3;j++){sum+=Math.abs(x[k+j]-y[k+j]);n++;}}return sum/n;};"+
    "const count=(x,y,b)=>{let n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;if(x[k]!==y[k]||x[k+1]!==y[k+1]||x[k+2]!==y[k+2])n++;}return n;};"+
    "const records=shots.map((shot,i)=>{const roi={};for(const [name,box] of Object.entries(boxes))roi[name]={mae:mae(a,shot,box),changedPixels:count(shots[0],shot,box)};return {index:i,roi};});"+
    "const baseline=records[0];"+
    "const globalWinner=[...records].filter(r=>r.roi.costs.changedPixels===0&&r.roi.dock.changedPixels===0).sort((x,y)=>(x.roi.full.mae-y.roi.full.mae))[0];"+
    "const valid=records.filter(r=>r.roi.costs.changedPixels===0&&r.roi.dock.changedPixels===0&&['full','workshop','seam','cannon','furnace'].every(name=>r.roi[name].mae<=baseline.roi[name].mae));"+
    "valid.sort((x,y)=>(x.roi.full.mae-y.roi.full.mae)||(x.roi.workshop.mae-y.roi.workshop.mae)||(x.roi.furnace.mae-y.roi.furnace.mae));"+
    "const best=valid[0];if(!best)throw Error('baseline must remain an admissible candidate');"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const g=canvas.getContext('2d');g.drawImage(original,0,0);g.drawImage(screens[0],384,0);g.drawImage(screens[best.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(screens[best.index],1152,0);"+
    "return {records,bestIndex:best.index,globalWinnerIndex:globalWinner.index,baseline,geometry:"+JSON.stringify(geometry)+",grid:canvas.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(script);
  assert.equal(result.records.length,variants.length);
  assert.ok(Number.isFinite(result.baseline.roi.full.mae));
  // The source art stays untouched; no candidate can alter the live costs or WORK0 dock.
  assert.ok(result.bestIndex>=0,'merged HEAD remains an admissible baseline');
  const candidate=result.records[result.bestIndex];
  assert.ok(candidate.roi.full.mae<=result.baseline.roi.full.mae+0.005);
  assert.equal(candidate.roi.costs.changedPixels,0);
  assert.equal(candidate.roi.dock.changedPixels,0);
  // The actually proposed workshop pigment must beat the merged original
  // in every relevant comparison, not merely win a global-only score.
  const production=result.records[12]; // #272324, merged HEAD is index zero
  assert.equal(variants[12].color,'#272324');
  for(const roi of ['full','workshop','seam']){
    assert.ok(production.roi[roi].mae < result.baseline.roi[roi].mae,
      'production workshop pigment must improve '+roi+' source MAE');
  }
  for(const roi of ['cannon','furnace','costs','dock']){
    assert.equal(production.roi[roi].changedPixels,0,
      'production cannot repaint protected '+roi+' pixels');
  }
  const report={approved:false,screensApproved:0,viewport:'384x512',reference:'04-melhorias-forja.webp',
    frame:'same real Forge screen and paused animation frame; source-approved cannon and furnace preserved; only workshop pigment swept',geometry,
    candidates:variants.map((paint,i)=>({...result.records[i],paint})),
    globalWinner:variants[result.globalWinnerIndex],safeWinner:variants[result.bestIndex],
    productionPigment:'#272324',production:result.records[12],
    decision:'Source-matched underlay #272324 implemented in WORK4 CSS after safe per-ROI A/B; human artistic approval still required'};
  writeFileSync(join(qa,'work4-forge-workshop-underlay-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-best-overlay-forge-workshop-384x512.png'),Buffer.from(result.grid,'base64'));
  console.log('WORK4_FORGE_WORKSHOP_UNDERLAY_SWEEP '+JSON.stringify({globalWinner:report.globalWinner,safeWinner:report.safeWinner,decision:report.decision,baseline:report.candidates[0],winner:report.candidates[result.bestIndex],production:report.candidates[12],geometry,
    roiSummary:report.candidates.map(x=>({paint:x.paint,full:x.roi.full.mae,workshop:x.roi.workshop.mae,seam:x.roi.seam.mae,cannon:x.roi.cannon.mae,furnace:x.roi.furnace.mae}))}));
});
