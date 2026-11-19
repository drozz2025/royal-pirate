import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');

test('WORK4: approved 00 + 01..08 source contract, single pictorial mask and protected WORK0 surface',()=>{
  for(const name of ['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
    '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']){
    const data=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
    assert.equal(data.toString('ascii',0,4),'RIFF',name);
    assert.equal(data.toString('ascii',8,12),'WEBP',name);
    assert.ok(data.length>10000,name);
  }
  assert.match(css,/radial-gradient\(ellipse 110% 123% at 30% 50%/);
  assert.match(css,/linear-gradient\(to bottom,transparent 0%,#000 2%,#000 97%,transparent 100%\)/);
  assert.match(css,/mask-composite:intersect/);
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 03 Coast: one native paused Chromium frame; mask A/B, source ROIs, touch, 4 viewports',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  const buildDir=mkdtempSync(join(tmpdir(),'rp-w4-coast-build-'));
  t.after(()=>rmSync(buildDir,{recursive:true,force:true,maxRetries:10,retryDelay:200}));
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',buildDir],{
    cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:12000000
  });
  assert.equal(build.status,0,'isolated build: '+(build.stderr||build.stdout).slice(-1300));
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
  const profile=mkdtempSync(join(tmpdir(),'rp-w4-coast-chrome-'));
  let browser:ReturnType<typeof spawn>|undefined;
  let ws:WebSocket|undefined;
  t.after(async()=>{ws?.close();browser?.kill('SIGTERM');preview.kill('SIGTERM');
    await delay(450);rmSync(profile,{recursive:true,force:true,maxRetries:12,retryDelay:250});
  });
  const origin='http://127.0.0.1:'+port+'/royal-pirate/';
  let live=false;
  for(let i=0;i<120;i++){try{live=(await fetch(origin,{signal:AbortSignal.timeout(750)})).ok;if(live)break;}catch{}await delay(120);}
  assert.ok(live,'preview must respond');
  browser=spawn(chrome!,[
    '--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
  ],{stdio:'ignore'});
  let target:any=null;
  for(let i=0;i<270;i++){
    if(browser.exitCode!==null)throw Error('Chromium quit');
    try{const p=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      if(p>0){const res=await fetch('http://127.0.0.1:'+p+'/json/list',{signal:AbortSignal.timeout(750)});
        if(res.ok)target=(await res.json() as any[]).find(item=>item.type==='page');}
    }catch{}
    if(target)break;await delay(100);
  }
  assert.ok(target?.webSocketDebuggerUrl,'Chromium target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((yes,no)=>{
    ws!.addEventListener('open',()=>yes(),{once:true});
    ws!.addEventListener('error',()=>no(Error('DevTools WS')),{once:true});
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
    if(r.exceptionDetails)throw Error('Browser JS '+r.exceptionDetails.text);
    return r.result?.value;
  };
  const until=async(expr:string)=>{
    for(let i=0;i<180;i++){if(await evaluate(expr))return;await delay(130);}
    throw Error('Missing real UI '+expr);
  };
  await cmd('Page.enable');await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{
    width:384,height:512,deviceScaleFactor:1,mobile:true,screenWidth:384,screenHeight:512
  });
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await cmd('Page.navigate',{url:origin+'?work4=native-source-coast-20261119'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  const nav=await evaluate("(()=>{const e=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:4}]});
  await delay(65);await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const geom=await evaluate("(()=>{const q=s=>document.querySelector(s);const box=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null};return {royalCrown:q('[data-work4-crop=fleet]')?document.querySelectorAll('[data-work4-crop=fleet]').length:0,sea:document.querySelectorAll('[data-work4-sea]').length,roster:q('.w4-ship-roster')?.children.length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,shipBox:box(q('.w4-reference-ship')),stageBox:box(q('.w4-harbour-stage'))}})()");
  assert.equal(geom.royalCrown,1,'one source Royal Crown');
  assert.equal(geom.sea,1,'one genuine source-water bridge');
  assert.equal(geom.roster,4,'four real roster slots');
  assert.equal(geom.dock,5,'WORK0 five-item dock');
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const imgs=[...document.querySelectorAll('.w4-screen svg image')];await Promise.all(imgs.map(async el=>{const href=el.getAttribute('href');if(href&&!(await fetch(href)).ok)throw Error('approved source unavailable');}));return true;})()");
  const variants=[
    {width:110,height:123,opaque:84,top:2,bottom:97}, // HEAD
    {width:110,height:123,opaque:80,top:2,bottom:97},
    {width:110,height:123,opaque:88,top:2,bottom:97},
    {width:115,height:123,opaque:84,top:2,bottom:97},
    {width:105,height:123,opaque:84,top:2,bottom:97},
    {width:110,height:128,opaque:84,top:2,bottom:97},
    {width:110,height:118,opaque:84,top:2,bottom:97},
    {width:115,height:128,opaque:84,top:2,bottom:97},
    {width:105,height:118,opaque:84,top:2,bottom:97},
    {width:110,height:123,opaque:84,top:1,bottom:98},
    {width:110,height:123,opaque:84,top:3,bottom:96},
    {width:115,height:128,opaque:88,top:2,bottom:97}
  ];
  const shots:string[]=[];
  for(const v of variants){
    const radial='radial-gradient(ellipse '+v.width+'% '+v.height+'% at 30% 50%,#000 0%,#000 '+v.opaque+'%,transparent 99%)';
    const linear='linear-gradient(to bottom,transparent 0%,#000 '+v.top+'%,#000 '+v.bottom+'%,transparent 100%)';
    const rule='.w4-fleet .w4-harbour-stage > svg.w4-ship-art.w4-reference-ship{' +
      '-webkit-mask-image:'+radial+','+linear+'!important;mask-image:'+radial+','+linear+'!important;'+
      '-webkit-mask-composite:source-in!important;mask-composite:intersect!important;}';
    await evaluate("(()=>{let s=document.getElementById('w4-coast-candidate');if(!s){s=document.createElement('style');s.id='w4-coast-candidate';document.head.append(s);}s.textContent="+JSON.stringify(rule)+";return true})()");
    await delay(120);
    shots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  const dataScript="(async()=>{"+
    "const load=async(s,m)=>{const im=new Image();im.src='data:'+m+';base64,'+s;await im.decode();return im};"+
    "const ref=await load("+JSON.stringify(reference)+",'image/webp');"+
    "const ims=await Promise.all("+JSON.stringify(shots)+".map(s=>load(s,'image/png')));"+
    "if(ref.width!==384||ref.height!==512||ims.some(im=>im.width!==384||im.height!==512))throw Error('384x512 source and viewport required');"+
    "const pix=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,384,512).data};"+
    "const a=pix(ref),xs=ims.map(pix);"+
    "const boxes={full:[0,0,384,512],coast:[18,144,244,345],seam:[18,150,244,340],shipCore:[65,205,175,290],sea:[21,307,239,340],stats:[247,155,381,316],dock:[0,432,384,512]};"+
    "const mae=(x,y,b)=>{let s=0,n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;for(let c=0;c<3;c++){s+=Math.abs(x[k+c]-y[k+c]);n++}}return s/n};"+
    "const changed=(x,y,b)=>{let n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;if(x[k]!==y[k]||x[k+1]!==y[k+1]||x[k+2]!==y[k+2])n++}return n};"+
    "const records=xs.map((x,i)=>{const roi={};for(const [key,b] of Object.entries(boxes))roi[key]={mae:mae(a,x,b),changedPixels:changed(xs[0],x,b)};return {index:i,roi}});"+
    "const base=records[0];"+
    "const safe=records.filter(r=>r.roi.stats.changedPixels===0&&r.roi.dock.changedPixels===0&&r.roi.shipCore.mae<=base.roi.shipCore.mae+0.005&&r.roi.full.mae<=base.roi.full.mae&&r.roi.coast.mae<=base.roi.coast.mae&&r.roi.seam.mae<=base.roi.seam.mae).sort((x,y)=>x.roi.full.mae-y.roi.full.mae);"+
    "const winner=safe[0]||base;"+
    "const can=document.createElement('canvas');can.width=1536;can.height=512;const g=can.getContext('2d');g.drawImage(ref,0,0);g.drawImage(ims[0],384,0);g.drawImage(ims[winner.index],768,0);g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(ims[winner.index],1152,0);"+
    "return {records,bestIndex:winner.index,grid:can.toDataURL('image/png').split(',')[1]}})()";
  const results=await evaluate(dataScript);
  assert.equal(results.records.length,variants.length);
  assert.ok(Number.isFinite(results.records[0].roi.full.mae));
  for(const metric of ['stats','dock'])assert.equal(results.records[results.bestIndex].roi[metric].changedPixels,0);
  writeFileSync(join(qa,'work4-coast-ab-original-before-render-overlay-384x512.png'),Buffer.from(results.grid,'base64'));
  const responsive:any[]=[];
  await evaluate("(()=>{document.getElementById('w4-coast-candidate')?.remove();return true})()");
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
    await delay(150);
    const state=await evaluate("(()=>({viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth+1,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,ship:document.querySelectorAll('.w4-reference-ship').length,sea:document.querySelectorAll('.w4-reference-sea').length,slots:document.querySelectorAll('.w4-ship-roster .w4-ship-slot').length}))()");
    assert.equal(state.overflow,false,'no horizontal scroll '+width);
    assert.equal(state.dock,5,'five dock items '+width);
    assert.equal(state.ship,1,'one ship '+width);
    assert.equal(state.sea,1,'one source sea '+width);
    assert.equal(state.slots,4,'four slots '+width);
    responsive.push(state);
    const shot=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
    writeFileSync(join(qa,'work4-coast-fleet-'+width+'x'+height+'.png'),Buffer.from(shot,'base64'));
  }
  const report={approved:false,screensApproved:0,base:'work6/web-3d-preview',reference:'03-frota.webp',
    method:'one paused 384x512 native Chromium frame; injected mask CSS only; original|before|render|overlay',
    roiDefinitions:{full:[0,0,384,512],coast:[18,144,244,345],seam:[18,150,244,340],shipCore:[65,205,175,290],sea:[21,307,239,340],stats:[247,155,381,316],dock:[0,432,384,512]},
    geometry:geom,responsive,baseline:results.records[0],
    winner:results.records[results.bestIndex],winnerMask:variants[results.bestIndex],
    candidates:variants.map((v,i)=>({...v,...results.records[i]})),
    decision:results.bestIndex===0?'HEAD retained; no source-mask improvement meets all ROIs':'Candidate qualifies numerically; not approved artistically, requires human/WORK0 review'};
  writeFileSync(join(qa,'work4-coast-native-ab-384x512.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_COAST_NATIVE_AB '+JSON.stringify({baseline:report.baseline,winner:report.winner,winnerMask:report.winnerMask,
    decision:report.decision,roiSummary:report.candidates.map(c=>({index:c.index,full:c.roi.full.mae,coast:c.roi.coast.mae,seam:c.roi.seam.mae,shipCore:c.roi.shipCore.mae,sea:c.roi.sea.mae,dockPixels:c.roi.dock.changedPixels}))}));
});
