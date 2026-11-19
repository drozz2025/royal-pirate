import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');

test('WORK4 remaining procedural sea audit: all ten approved references and protected single Crown',()=>{
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

test('WORK4 03 residual depth and live-inset native A/B, source ROIs, touch and four viewports',{
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
  // A/B isolates the remaining procedurally painted sea *behind* the
  // genuine approved 03 WebP. The original ship/source-water art is immutable.
  // No production style is shipped until the measured candidate passes review.
  // HEAD v0.1.112 original border is injected into every candidate so
  // source and candidate are measured on the SAME paused Chromium frame.
  // This makes the regression test independent of shipped winning CSS.
  const beforePaint='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{border-color:#35617a!important;box-shadow:inset 0 1px #76a9ba45,0 2px 4px #04132348!important}';
  const variants=[
    {id:'HEAD',style:''},
    {id:'coastal-0',style:'.w4-fleet .w4-tropical-art .w4-r03-coastal-depth > path[fill]{opacity:0!important}'},
    {id:'coastal-10',style:'.w4-fleet .w4-tropical-art .w4-r03-coastal-depth > path[fill]{opacity:.1!important}'},
    {id:'coastal-25',style:'.w4-fleet .w4-tropical-art .w4-r03-coastal-depth > path[fill]{opacity:.25!important}'},
    {id:'coastal-40',style:'.w4-fleet .w4-tropical-art .w4-r03-coastal-depth > path[fill]{opacity:.4!important}'},
    {id:'coastal-60',style:'.w4-fleet .w4-tropical-art .w4-r03-coastal-depth > path[fill]{opacity:.6!important}'},
    // Right inset is the largest local MAE contributor. Paint-only A/B;
    // source Royal Crown, sea, real levels, touches and dock remain unchanged.
    {id:'inset-sea-ink',style:'.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{background:linear-gradient(90deg,#0b5377ed 0%,#0a3c5af2 35%,#031628f8 100%)!important}'},
    {id:'inset-blue-steel',style:'.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{background:linear-gradient(110deg,#17475ff2 0%,#092b43f4 53%,#031626f8 100%)!important}'},
    {id:'inset-strong-coast',style:'.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{background:linear-gradient(90deg,#08638ac8 0%,#0a4264e5 40%,#04172bf5 100%)!important}'},
    {id:'inset-smoke-glass',style:'.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{background:linear-gradient(90deg,#0f4556d5 0%,#0a3443ed 50%,#061d2df4 100%)!important}'},
    {id:'inset-navy-glass',style:'.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{background:linear-gradient(90deg,#0c3854f0 0%,#05243bf4 65%,#021728f9 100%)!important}'},
    {id:'inset-source-wash',style:'.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{background:linear-gradient(90deg,#155775cc 0%,#0e405ad9 40%,#03182de8 100%)!important}'},
    {id:'inset-remove-shadow',style:'.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{box-shadow:none!important}'},
    {id:'inset-charcoal-outline',style:'.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{border-color:#21465f!important;box-shadow:inset 0 1px #76a9ba45!important}'}
  ];
  const styleEl=await evaluate("(()=>{const e=document.createElement('style');e.id='w4-depth-experiment';document.head.append(e);return !!e})()");
  assert.equal(styleEl,true);
  const shots:string[]=[];
  for(const v of variants){
    const rule='@media (width:384px) and (height:512px){'+beforePaint+v.style+'}';
    await evaluate("(()=>{document.getElementById('w4-depth-experiment').textContent="+JSON.stringify(rule)+";return true})()");
    await delay(170);
    const invariant=await evaluate("(()=>({ship:document.querySelectorAll('[data-work4-crop=fleet]').length,sourceWater:document.querySelectorAll('[data-work4-sea=approved-water-only]').length,roster:document.querySelectorAll('.w4-ship-slot').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,overflow:document.documentElement.scrollWidth>innerWidth+1}))()");
    assert.deepEqual(invariant,{ship:1,sourceWater:1,roster:4,dock:5,overflow:false});
    shots.push((await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string);
  }
  await evaluate("(()=>{document.getElementById('w4-depth-experiment').remove();return true})()");
  const computed=await evaluate("(()=>{const e=document.querySelector('.w4-fleet .w4-stage-label');const c=getComputedStyle(e);return {border:c.borderTopColor,shadow:c.boxShadow}})()");
  assert.equal(computed.border,'rgb(33, 70, 95)','production must use the Chromium winner border');
  assert.ok(computed.shadow.includes('inset'),'production must retain subtle inset relief');
  writeFileSync(join(qa,'work4-fleet-depth-production-384x512.png'),Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  const dataScript="(async()=>{"+
    "const image=async(s,m)=>{const i=new Image();i.src='data:'+m+';base64,'+s;await i.decode();return i};"+
    "const ref=await image("+JSON.stringify(reference)+",'image/webp');"+
    "const imgs=await Promise.all("+JSON.stringify(shots)+".map(s=>image(s,'image/png')));"+
    "if(ref.width!==384||ref.height!==512||imgs.some(i=>i.width!==384||i.height!==512))throw Error('native source size mismatch');"+
    "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
    "const src=pixels(ref),frames=imgs.map(pixels),boxes={full:[0,0,384,512],scene:[19,144,241,345],sea:[21,307,239,355],lowerBackdrop:[18,245,238,350],ship:[65,205,175,290],seam:[18,150,244,340],inset:[247,155,381,316],roster:[18,350,374,429],dock:[0,432,384,512]};"+
    "const mae=(a,b,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let j=0;j<3;j++){sum+=Math.abs(a[k+j]-b[k+j]);n++}}return sum/n};"+
    "const changed=(a,b,r)=>{let count=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])count++}return count};"+
    "const scores=frames.map((f,i)=>{const roi={};for(const [name,r] of Object.entries(boxes))roi[name]={mae:mae(src,f,r),changed:changed(frames[0],f,r)};return {index:i,roi}});"+
    "const base=scores[0];const eligible=scores.filter(s=>s.roi.ship.changed===0&&s.roi.dock.changed===0&&s.roi.roster.changed===0&&s.roi.full.mae<=base.roi.full.mae&&s.roi.lowerBackdrop.mae<=base.roi.lowerBackdrop.mae+0.05&&s.roi.inset.mae<=base.roi.inset.mae&&s.roi.seam.mae<=base.roi.seam.mae+0.05);"+
    "eligible.sort((a,b)=>a.roi.full.mae-b.roi.full.mae);const best=eligible[0]||base;"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const ctx=canvas.getContext('2d');ctx.drawImage(ref,0,0);ctx.drawImage(imgs[0],384,0);ctx.drawImage(imgs[best.index],768,0);ctx.drawImage(ref,1152,0);ctx.globalAlpha=.5;ctx.drawImage(imgs[best.index],1152,0);"+
    "return {scores,boxes,bestIndex:best.index,montage:canvas.toDataURL('image/png').split(',')[1]}})()";
  const scores=await evaluate(dataScript);
  assert.equal(scores.scores.length,variants.length);
  assert.ok(Number.isFinite(scores.scores[0].roi.full.mae));
  assert.equal(scores.scores[scores.bestIndex].roi.ship.changed,0);
  assert.equal(scores.scores[scores.bestIndex].roi.dock.changed,0);
  assert.equal(scores.scores[scores.bestIndex].roi.roster.changed,0);
  const shipped=scores.scores[13];
  assert.equal(scores.bestIndex,13,'shipped local iron-blue border must win protected ROIs');
  assert.ok(shipped.roi.full.mae<scores.scores[0].roi.full.mae-.012,'native whole-screen RGB MAE improves');
  assert.ok(shipped.roi.inset.mae<scores.scores[0].roi.inset.mae-.02,'native live inset improves');
  assert.ok(shipped.roi.seam.mae<scores.scores[0].roi.seam.mae-.02,'native source seam improves');
  for(const protectedROI of ['ship','dock','roster'])assert.equal(shipped.roi[protectedROI].changed,0,'protected '+protectedROI+' pixels remain unchanged');
  writeFileSync(join(qa,'work4-fleet-depth-original-before-render-overlay-384x512.png'),Buffer.from(scores.montage,'base64'));
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
    await delay(150);
    const state=await evaluate("(()=>({w:innerWidth,h:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,ship:document.querySelectorAll('.w4-reference-ship').length,sea:document.querySelectorAll('.w4-reference-sea').length,roster:document.querySelectorAll('.w4-ship-slot').length}))()");
    assert.equal(state.overflow,false,'no horizontal overflow '+width+'x'+height);
    assert.equal(state.dock,5,'five controls at '+width+'x'+height);
    assert.equal(state.ship,1,'one ship at '+width+'x'+height);
    assert.equal(state.sea,1,'single source water at '+width+'x'+height);
    assert.equal(state.roster,4,'four cards at '+width+'x'+height);
    writeFileSync(join(qa,'work4-fleet-depth-'+width+'x'+height+'.png'),Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  }
  const report={approved:false,screensApproved:0,base:'82f0baaa2cbabe18e027700a3e3176c76f3bdaa3',
    source:'assets/design-approved/03-frota.webp',method:'384x512 DPR1 same Chromium frame and paused animations; real touch Porto->Frota; ONLY procedural SVG underpaint or existing live inset paint varied',
    rois:scores.boxes,baseline:scores.scores[0],best:scores.scores[scores.bestIndex],bestVariant:variants[scores.bestIndex],
    variants:variants.map((x,i)=>({...x,...scores.scores[i]})),
    decision:scores.bestIndex===13?'Measured source-inset winner is shipped locally; artistic signoff still requires WORK0/human':'Expected production winner no longer leads; WORK0 must reject PR pending review'};
  writeFileSync(join(qa,'work4-fleet-depth-384x512.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_FLEET_DEPTH_AB '+JSON.stringify({head:report.baseline,best:report.best,bestVariant:report.bestVariant,decision:report.decision,candidates:report.variants.map(x=>({id:x.id,full:x.roi.full.mae,scene:x.roi.scene.mae,sea:x.roi.sea.mae,backdrop:x.roi.lowerBackdrop.mae,inset:x.roi.inset.mae,seam:x.roi.seam.mae,shipChanged:x.roi.ship.changed,dockChanged:x.roi.dock.changed}))}));
});
