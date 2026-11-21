import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const marker='WORK4/#104 — 20 Nov 03h: full-height Fleet 03 live stats inset';
const paint=css.split(marker)[1]?.split('/*')[0]||'';
const selector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label';
const oldGradient='linear-gradient(90deg,#075684ec 0%,#0a4b74ed 12%,#0b3655f6 28%,#06263ff9 44%,#031b30fa 70%,#031729fb 100%)';
const oldCss=selector+'{top:15%!important;bottom:auto!important;right:1.5%!important;width:36%!important;height:auto!important;min-height:0!important;padding:5px 4px 6px 7px!important;justify-content:flex-start!important;gap:3px!important;border:1px solid #35617a!important;border-radius:9px!important;background:'+oldGradient+'!important;box-shadow:inset 0 1px #76a9ba45,0 2px 4px #04132348!important;}'+selector+'::after{content:none!important;}'+selector+'>strong{font-size:clamp(18px,4.65vw,27px)!important;line-height:.93!important;}';
const approved=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');

test('WORK4 continuous live inset is source-scoped, not a second ship or fake water',()=>{
  const refs=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
    '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
  for(const name of refs){
    const img=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
    assert.equal(img.toString('ascii',0,4),'RIFF',name);
    assert.equal(img.toString('ascii',8,12),'WEBP',name);
  }
  assert.ok(paint,'native scoped candidate is present');
  assert.match(paint,/@media \(width:384px\) and \(height:512px\)/);
  assert.match(paint,/height:100%/);
  assert.match(paint,/background:linear-gradient\(90deg,#082c48de/);
  assert.match(paint,/background:linear-gradient\(90deg,transparent 0%,#082c48de/);
  assert.equal((paint.match(/\.w4-stage-label\s*\{/g)||[]).length,1);
  assert.equal((paint.match(/\.w4-stage-label::after/g)||[]).length,1);
  assert.doesNotMatch(paint,/(?:\.app-|\.porto-|\.harbour-nav|\.w4-reference-sea|\.w4-reference-ship|\.w4-cannon-art|\.w4-forge|contain:paint|translateZ|position:fixed|repeating-linear-gradient)/);
  assert.ok(css.includes('radial-gradient(ellipse 110% 123% at 30% 50%'),'merged approved source coast survives');
  assert.ok(css.includes('svg.w4-reference-sea'),'single original water crop survives');
  assert.ok(css.includes('radial-gradient(ellipse 140% 122% at 37% 49%'),'protected Forge cannon survives');
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Fleet continuous inset A/B: ORIGINAL BEFORE RENDER OVERLAY and protected ship/sea/dock ROI',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/'],{
    cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:12000000
  });
  assert.equal(build.status,0,'build must pass before native comparison: '+(build.stderr||build.stdout).slice(-1200));
  const qa=resolve('porto-qa/work4');mkdirSync(qa,{recursive:true});
  const port=await new Promise<number>((yes,no)=>{
    const s=createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{
      const addr=s.address();if(!addr||typeof addr==='string'){s.close();return no(Error('port'));}
      s.close(()=>yes(addr.port));
    });
  });
  const preview=spawn(join(process.cwd(),'node_modules','.bin','vite'),[
    'preview','--host','127.0.0.1','--port',String(port),'--strictPort','--base=/royal-pirate/'
  ],{stdio:'ignore'});
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-live-seam-'));
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
  await cmd('Page.navigate',{url:origin+'?work4=source-inset-live-ab'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  // WORK0 integrated #615's dock viewport fix. This route activation is
  // only A/B setup; real native touch across all four viewports is covered
  // independently by work4-native-pixel-registration.test.ts.
  await evaluate("document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)').click();true");
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const geometry=await evaluate("(()=>{const stage=document.querySelector('.w4-harbour-stage');const label=document.querySelector('.w4-stage-label');const r=stage.getBoundingClientRect(),p=label.getBoundingClientRect();return {stage:{x:r.x,y:r.y,width:r.width,height:r.height},label:{x:p.x,y:p.y,width:p.width,height:p.height},ship:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet svg.w4-reference-sea').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,roster:document.querySelectorAll('.w4-fleet .w4-ship-roster > .w4-ship-slot').length,realLevels:document.querySelectorAll('.w4-fleet .w4-stage-stats > span').length}})()");
  assert.equal(geometry.ship,1,'exactly one Royal Crown source painting');
  assert.equal(geometry.sea,1,'exactly one approved source sea');
  assert.equal(geometry.dock,5,'five dock buttons still present and touchable');
  assert.equal(geometry.realLevels,3,'existing real levels preserved');
  assert.equal(geometry.roster,4,'four real roster slots preserved');
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const node=document.querySelector('svg.w4-reference-ship image');const href=node?.getAttribute('href')||node?.href?.baseVal;if(!href||!href.includes('03-frota')||!node.getBoundingClientRect().width)throw Error('approved ship source not in scene');const style=document.createElement('style');style.id='work4-native-ab-baseline';style.textContent="+JSON.stringify(oldCss)+";document.head.append(style);return true;})()");
  await delay(180);
  const before=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  await evaluate("document.getElementById('work4-native-ab-baseline')?.remove();true");
  await delay(120);
  const after=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  const expression="(async()=>{const open=async(source)=>{const im=new Image();im.src=source;await im.decode();return im;};"+
    "const [original,before,after]=await Promise.all(["+
    "open('data:image/webp;base64,"+approved+"'),"+
    "open('data:image/png;base64,"+before+"'),"+
    "open('data:image/png;base64,"+after+"')]);"+
    "if([original,before,after].some(im=>im.width!==384||im.height!==512))throw Error('native 1:1 frames required');"+
    "const bitmap=im=>{const can=document.createElement('canvas');can.width=384;can.height=512;const ctx=can.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);return ctx.getImageData(0,0,384,512).data;};"+
    "const a=bitmap(original),b=bitmap(before),c=bitmap(after);"+
    "const boxes={full:[0,0,384,512],liveInset:[247,151,373,341],photoJoin:[219,155,258,339],royalCrown:[105,246,155,285],shipComposition:[31,176,216,304],sea:[188,306,218,338],dock:[0,433,384,512]};"+
    "const mae=(x,y,box)=>{let total=0,n=0;for(let yy=box[1];yy<box[3];yy++)for(let xx=box[0];xx<box[2];xx++){let k=(yy*384+xx)*4;for(let j=0;j<3;j++){total+=Math.abs(x[k+j]-y[k+j]);n++;}}return total/n;};"+
    "const changed=(box)=>{let count=0;for(let yy=box[1];yy<box[3];yy++)for(let xx=box[0];xx<box[2];xx++){let k=(yy*384+xx)*4;if(b[k]!==c[k]||b[k+1]!==c[k+1]||b[k+2]!==c[k+2])count++;}return count;};"+
    "let metrics={};for(const [name,box] of Object.entries(boxes))metrics[name]={before:mae(a,b,box),after:mae(a,c,box),changedPixels:changed(box)};"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const ctx=canvas.getContext('2d');"+
    "ctx.drawImage(original,0,0);ctx.drawImage(before,384,0);ctx.drawImage(after,768,0);ctx.drawImage(original,1152,0);ctx.globalAlpha=.5;ctx.drawImage(after,1152,0);ctx.globalAlpha=1;"+
    "return {metrics,roiBoxes:boxes,comparison:canvas.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(expression);
  assert.ok(result?.metrics?.liveInset,'must measure real pixel difference');
  assert.equal(result.metrics.royalCrown.changedPixels,0,'central Royal Crown pixels must remain identical');
  assert.equal(result.metrics.shipComposition.changedPixels,0,'full protected Royal Crown compositional ROI must stay pixel-identical');
  assert.equal(result.metrics.dock.changedPixels,0,'shared five-item dock pixels must remain identical');
  assert.equal(result.metrics.sea.changedPixels,0,'source-sea interior (outside the edited join) must remain pixel-identical');
  assert.ok(result.metrics.full.after < result.metrics.full.before - .1,
    'full native image must materially improve over the preceding label');
  assert.ok(result.metrics.liveInset.after < result.metrics.liveInset.before - 1,
    'real Fleet data inset must improve by at least one RGB MAE point');
  assert.ok(result.metrics.photoJoin.after < result.metrics.photoJoin.before - 1,
    'photographic join must improve by at least one RGB MAE point');
  assert.ok(result.metrics.liveInset.changedPixels>500,'candidate must change meaningful label pixels');
  // Compare a real coastal seam instead of adding synthetic waves. Every candidate
  // uses the SAME 384x512 DOM, artwork, frame, real stats and paused animations.
  // The existing release is a valid baseline; no candidate is published by QA.
  const seams=[
    {id:'release-10',width:10},
    {id:'feather-14',width:14},
    {id:'feather-18',width:18},
    {id:'feather-22',width:22},
    {id:'feather-26',width:26},
    {id:'feather-30',width:30},
    // WORK4/#104 new 21 Nov native colour matching: same original
    // 10px join, SAME live scene/frame; never recolour ship or real sea.
    {id:'seam-ink-source-blue',width:10,tone:'#075684ec'},
    {id:'seam-ink-mid-blue',width:10,tone:'#0a4b74ed'},
    {id:'seam-ink-deep-coast',width:10,tone:'#0b3655f6'},
    {id:'seam-ink-harbour',width:10,tone:'#063a59'},
    {id:'seam-ink-coastal-night',width:10,tone:'#052a44ed'},
    {id:'seam-ink-stone-blue',width:10,tone:'#184158e0'},
    {id:'seam-ink-charcoal',width:10,tone:'#102f46f2'},
    {id:'seam-ink-source-ink',width:10,tone:'#09263cfb'},
    {id:'seam-ink-deep-water',width:10,tone:'#0b3b60ef'}
  ];
  const sourcePhotos=[] as string[];
  for(const seam of seams){
    const cssOverride='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label::after{'+
      'left:-'+seam.width+'px!important;width:'+seam.width+'px!important;'+
      'background:linear-gradient(90deg,transparent 0%,'+(('tone' in seam)?seam.tone:'#082c48de')+' 100%)!important;}';
    await evaluate("(()=>{let e=document.getElementById('work4-coast-seam-study');"+
      "if(!e){e=document.createElement('style');e.id='work4-coast-seam-study';document.head.append(e)}"+
      "e.textContent="+JSON.stringify(cssOverride)+";return true})()");
    await delay(85);
    sourcePhotos.push((await cmd('Page.captureScreenshot',{
      format:'png',captureBeyondViewport:false
    })).data as string);
  }
  await evaluate("(()=>{document.getElementById('work4-coast-seam-study')?.remove();return true})()");
  const photoScan="(async()=>{"+
    "const original=new Image();original.src='data:image/webp;base64,"+approved+"';await original.decode();"+
    "const records="+JSON.stringify(sourcePhotos)+";"+
    "const load=async p=>{const im=new Image();im.src='data:image/png;base64,'+p;await im.decode();return im};"+
    "const frames=await Promise.all(records.map(load));"+
    "if(frames.some(x=>x.width!==384||x.height!==512))throw Error('non-native seam screenshot');"+
    "const pixels=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);return x.getImageData(0,0,384,512).data};"+
    "const ref=pixels(original),all=frames.map(pixels),boxes={full:[0,0,384,512],join:[219,155,258,339],coast:[217,155,248,339],ship:[31,176,216,304],crown:[105,246,155,285],sea:[188,306,218,338],dock:[0,433,384,512]};"+
    "const mae=(a,b,box)=>{let s=0,n=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){let k=(y*384+x)*4;for(let j=0;j<3;j++){s+=Math.abs(a[k+j]-b[k+j]);n++}}return s/n};"+
    "const count=(a,b,box)=>{let n=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){let k=(y*384+x)*4;if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])n++}return n};"+
    "const report=all.map((p,index)=>({index,metrics:Object.fromEntries(Object.entries(boxes).map(([n,r])=>[n,{mae:mae(ref,p,r),changed:count(all[0],p,r)}]))}));"+
    "return {report,boxes}})()";
  const scan=await evaluate(photoScan);
  assert.equal(scan.report.length,seams.length);
  const gate=scan.report.filter((r:any)=>['ship','crown','sea','dock'].every(
    key=>r.metrics[key].changed===0)&&
    // No coast source regression just to win global MAE. Compare both local
    // photo join and the actual shoreline instead of optimizing a flat colour.
    r.metrics.coast.mae<=scan.report[0].metrics.coast.mae+.000001 &&
    r.metrics.join.mae<=scan.report[0].metrics.join.mae+.000001 &&
    r.metrics.full.mae<=scan.report[0].metrics.full.mae+.000001);
  gate.sort((a:any,b:any)=>a.metrics.join.mae-b.metrics.join.mae||
    a.metrics.full.mae-b.metrics.full.mae);
  const winner=gate[0]||scan.report[0];
  // A screenshot of an injected experiment is NOT proof of the compiled
  // release CSS. Verify the promoted candidate is reproduced by the actual
  // stylesheet after the diagnostic injection is completely removed.
  // The diagnostic sweep is allowed to find a different winner when
  // Chromium rasterizes gradients differently. The release is NOT selected
  // from that ranking: insist that the fixed, compiled candidate itself
  // meets every protected/shoreline gate, then compare its exact pixels.
  const promotedIndex=seams.findIndex(s=>s.id==='seam-ink-harbour');
  assert.ok(promotedIndex>=0,'promoted coast candidate must be sampled');
  const promoted=scan.report[promotedIndex];
  for(const key of ['ship','crown','sea','dock'])
    assert.equal(promoted.metrics[key].changed,0,'promoted coast protects '+key);
  for(const key of ['coast','join','full'])
    assert.ok(promoted.metrics[key].mae<=scan.report[0].metrics[key].mae+.000001,
      'compiled source coast must not regress '+key+' relative to release');
  const applied=await evaluate("getComputedStyle(document.querySelector('.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label'),'::after').backgroundImage");
  assert.match(applied,/rgb\(6,\s*58,\s*89\)/,'native CSS must carry the promoted original-coast ink');
  await delay(110);
  const productionPng=(await cmd('Page.captureScreenshot',{
    format:'png',captureBeyondViewport:false
  })).data as string;
  const productionDiff=await evaluate("(async()=>{"+
    "const load=async b=>{const i=new Image();i.src='data:image/png;base64,'+b;await i.decode();"+
    "const c=document.createElement('canvas');c.width=384;c.height=512;"+
    "const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
    "const [a,b]=await Promise.all(["+
      JSON.stringify(sourcePhotos[promotedIndex])+","+JSON.stringify(productionPng)+
    "].map(load));let changed=0;for(let i=0;i<a.length;i+=4)"+
    "{if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;}return changed})()");
  assert.equal(productionDiff,0,'actual compiled RENDER must match promoted A/B candidate pixel for pixel');
  const sealReport={
    approved:false,screensApproved:0,source:'03-frota.webp',viewport:'384x512',
    colourSweep:'nine new source-inspired inks tested at existing 10px width; zero visual release unless manually approved',
    requiredReferences:['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp','01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'],
    comparison:'same paused Chromium scene; 6 seam widths and 9 native coast pigments; actual compiled CSS RENDER cross-checked pixel-by-pixel',productionCandidate:'seam-ink-harbour',promotedMetrics:promoted.metrics,productionChangedPixelsFromCandidate:productionDiff,
    variants:seams.map((seam,i)=>({...seam,...scan.report[i]})),
    safeWinner:seams[winner.index].id,
    decision:winner.index===0?'Keep current 10px feather until meaningful source ROI gain':
      'Diagnostic improvement only; human inspection and WORK0 approval required'
  };
  writeFileSync(join(qa,'work4-fleet-coast-feather-sweep-384x512.json'),
    JSON.stringify(sealReport,null,2)+'\n');
  writeFileSync(join(qa,'work4-fleet-safe-feather-384x512.png'),
    Buffer.from(sourcePhotos[winner.index],'base64'));
  const montageData=await evaluate("(async()=>{"+
    "const load=async(src)=>{const im=new Image();im.src=src;await im.decode();return im};"+
    "const [a,b,c]=await Promise.all(["+
       "'data:image/webp;base64,"+approved+"',"+
       "'data:image/png;base64,"+sourcePhotos[0]+"',"+
       "'data:image/png;base64,"+productionPng+"'"+
    "].map(load));"+
    "const cv=document.createElement('canvas');cv.width=1536;cv.height=512;"+
    "const ctx=cv.getContext('2d');ctx.drawImage(a,0,0);ctx.drawImage(b,384,0);"+
    "ctx.drawImage(c,768,0);ctx.drawImage(a,1152,0);ctx.globalAlpha=.5;"+
    "ctx.drawImage(c,1152,0);return cv.toDataURL('image/png').split(',')[1]})()");
  writeFileSync(join(qa,'work4-fleet-coast-ink-original-before-render-overlay-384x512.png'),
    Buffer.from(montageData,'base64'));
  console.log('WORK4_FLEET_COAST_FEATHER_SWEEP '+JSON.stringify({
    safeWinner:sealReport.safeWinner,decision:sealReport.decision,
    variants:sealReport.variants.map(x=>({id:x.id,...x.metrics}))
  }));


  // WORK4/#104 native top photograph seam: compare the compiled 12px
  // iron/sky transition OFF vs ON, never two different animation frames.
  const railSelector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-fleet-photo-top-shade';
  assert.equal(await evaluate("document.querySelectorAll("+JSON.stringify(railSelector)+").length"),1,
    'exactly one inert top-rail overlay, no duplicate vessel');
  await evaluate("(()=>{const e=document.createElement('style');e.id='work4-rail-ab-off';e.textContent="+
    JSON.stringify(railSelector+'{display:none!important;}')+
    ";document.head.append(e);return true})()");
  await delay(140);
  const railBefore=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  await evaluate("(()=>{document.getElementById('work4-rail-ab-off')?.remove();return true})()");
  await delay(140);
  const railAfter=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  const railStudy=await evaluate("(async()=>{"+
    "const src=['data:image/webp;base64,"+approved+"','data:image/png;base64,"+railBefore+"','data:image/png;base64,"+railAfter+"'];"+
    "const images=await Promise.all(src.map(async s=>{const i=new Image();i.src=s;await i.decode();return i}));"+
    "if(images.some(i=>i.width!==384||i.height!==512))throw Error('strict native 384x512');"+
    "const px=images.map(i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);return x.getImageData(0,0,384,512).data});"+
    "const boxes={full:[0,0,384,512],topPhotoLip:[18,138,241,154],crown:[31,176,216,304],sea:[188,306,218,338],dock:[0,433,384,512]};"+
    "const roi=r=>{let before=0,after=0,changed=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;let ch=false;for(let c=0;c<3;c++){before+=Math.abs(px[0][k+c]-px[1][k+c]);after+=Math.abs(px[0][k+c]-px[2][k+c]);ch ||=px[1][k+c]!==px[2][k+c];n++}if(ch)changed++}return {before:before/n,after:after/n,changedPixels:changed}};"+
    "const metrics=Object.fromEntries(Object.entries(boxes).map(([k,v])=>[k,roi(v)]));"+
    "const cv=document.createElement('canvas');cv.width=1536;cv.height=512;const ctx=cv.getContext('2d');"+
    "ctx.drawImage(images[0],0,0);ctx.drawImage(images[1],384,0);ctx.drawImage(images[2],768,0);"+
    "ctx.drawImage(images[0],1152,0);ctx.globalAlpha=.5;ctx.drawImage(images[2],1152,0);"+
    "return {boxes,metrics,overlay:cv.toDataURL('image/png').split(',')[1]}})()");
  for(const area of ['crown','sea','dock'])
    assert.equal(railStudy.metrics[area].changedPixels,0,'photo upper lip must not change '+area);
  assert.ok(railStudy.metrics.topPhotoLip.changedPixels>=100,
    'measurable real source top-lip pixels change in Chromium');
  assert.ok(railStudy.metrics.topPhotoLip.after<railStudy.metrics.topPhotoLip.before,
    'upper source join must improve against ORIGINAL, never optimize unrelated HUD');
  assert.ok(railStudy.metrics.full.after<railStudy.metrics.full.before,
    'overall native MAE must not regress after the upper lip');
  const railEvidence={
    approved:false,screensApproved:0,viewport:'384x512',
    source:'assets/design-approved/03-frota.webp',
    comparison:'ORIGINAL / BEFORE (shade hidden) / RENDER (compiled source shade) / OVERLAY, same paused Chromium frame',
    geometry:'12px soft top join, no new photo or water',
    roiBoxes:railStudy.boxes,roi:railStudy.metrics,
    protected:['crown','sea','dock']
  };
  writeFileSync(join(qa,'work4-fleet-top-rail-source-ab-384x512.json'),
    JSON.stringify(railEvidence,null,2)+'\n');
  writeFileSync(join(qa,'work4-fleet-top-rail-original-before-render-overlay-384x512.png'),
    Buffer.from(railStudy.overlay,'base64'));
  console.log('WORK4_FLEET_TOP_RAIL_AB '+JSON.stringify(railEvidence));

  // WORK4/#104: prospectively investigate only the approved photo's top lip.
  // This is a genuine same-frame Chromium A/B study, NOT a blind CSS promotion.
  // Keep the compiled 12px treatment in production unless a later review
  // confirms an objectively better local seam without a protected-ROI change.
  const lipOptions=[
    {id:'compiled-12px',height:12,stop:20,ink:'#03192b'},
    {id:'short-9px',height:9,stop:20,ink:'#03192b'},
    {id:'short-10px',height:10,stop:20,ink:'#03192b'},
    {id:'tall-14px',height:14,stop:20,ink:'#03192b'},
    {id:'tall-16px',height:16,stop:20,ink:'#03192b'},
    {id:'soft-stop-10',height:12,stop:10,ink:'#03192b'},
    {id:'soft-stop-30',height:12,stop:30,ink:'#03192b'},
    {id:'dark-coast-ink',height:12,stop:20,ink:'#041e32'},
    {id:'deep-edge-ink',height:12,stop:20,ink:'#021728'}
  ];
  const lipFrames:string[]=[];
  for(const variant of lipOptions){
    await evaluate("(()=>{let s=document.getElementById('work4-top-lip-study');"+
      "if(s)s.remove();return true})()");
    if(variant.id!=='compiled-12px'){
      const paint=railSelector+'{height:'+variant.height+'px!important;'+
        'background:linear-gradient(180deg,'+variant.ink+' 0%,'+variant.ink+' '+
        variant.stop+'%,'+variant.ink+'00 100%)!important}';
      await evaluate("(()=>{const s=document.createElement('style');"+
        "s.id='work4-top-lip-study';s.textContent="+JSON.stringify(paint)+
        ";document.head.append(s);return true})()");
    }
    await delay(100);
    lipFrames.push((await cmd('Page.captureScreenshot',{
      format:'png',captureBeyondViewport:false
    })).data as string);
  }
  await evaluate("(()=>{document.getElementById('work4-top-lip-study')?.remove();return true})()");
  const lipSweep=await evaluate("(async()=>{"+
    "const urls=['data:image/webp;base64,"+approved+"',..."+JSON.stringify(lipFrames)+
      ".map(p=>'data:image/png;base64,'+p)];"+
    "const imgs=await Promise.all(urls.map(async u=>{const i=new Image();i.src=u;await i.decode();return i}));"+
    "if(imgs.some(i=>i.width!==384||i.height!==512))throw Error('native frame required');"+
    "const pix=imgs.map(i=>{const c=document.createElement('canvas');c.width=384;c.height=512;"+
    "const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data});"+
    "const rois={full:[0,0,384,512],topPhotoLip:[18,138,241,154],"+
      "crown:[31,176,216,304],sea:[188,306,218,338],dock:[0,433,384,512],"+
      "rightPanel:[246,165,370,342]};"+
    "const measure=(a,b,rect)=>{let total=0,n=0,changed=0;"+
      "for(let y=rect[1];y<rect[3];y++)for(let x=rect[0];x<rect[2];x++){"+
      "const k=(y*384+x)*4;let different=false;for(let c=0;c<3;c++){"+
      "total+=Math.abs(pix[a][k+c]-pix[b][k+c]);different ||=pix[a][k+c]!==pix[b][k+c];n++}"+
      "if(different)changed++}return {mae:total/n,changedPixels:changed}};"+
    "const results=pix.slice(1).map((_,i)=>({index:i,roi:Object.fromEntries("+
      "Object.entries(rois).map(([k,r])=>[k,{source:measure(0,i+1,r).mae,"+
      "changedPixels:measure(1,i+1,r).changedPixels}]))}));"+
    "return {rois,results}})()");
  assert.equal(lipSweep.results.length,lipOptions.length,'all nine alternatives measured');
  for(const row of lipSweep.results){
    for(const protectedROI of ['crown','sea','dock','rightPanel'])
      assert.equal(row.roi[protectedROI].changedPixels,0,
        'top-lip candidate cannot alter '+protectedROI);
  }
  const sourceBaseline=lipSweep.results[0];
  const qualified=lipSweep.results.filter((r:any)=>
    r.roi.topPhotoLip.source<=sourceBaseline.roi.topPhotoLip.source+.000001 &&
    r.roi.full.source<=sourceBaseline.roi.full.source+.000001);
  qualified.sort((a:any,b:any)=>
    a.roi.topPhotoLip.source-b.roi.topPhotoLip.source ||
    a.roi.full.source-b.roi.full.source);
  const bestLip=qualified[0]||sourceBaseline;
  const sweepReport={
    approved:false,screensApproved:0,viewport:'384x512',
    source:'assets/design-approved/03-frota.webp',
    study:'nine top-photograph candidates in same paused Chromium scene, only WORK4 CSS varied',
    productionOption:lipOptions[0].id,proposedBestOption:lipOptions[bestLip.index].id,
    roiBoxes:lipSweep.rois,variants:lipOptions.map((v,i)=>({...v,...lipSweep.results[i]})),
    note:'Experimental only. No unreviewed style injected into production build; protect original crown, sea, panel, dock.'
  };
  writeFileSync(join(qa,'work4-fleet-top-lip-nine-way-sweep-384x512.json'),
    JSON.stringify(sweepReport,null,2)+'\n');
  console.log('WORK4_FLEET_TOP_RAIL_SWEEP '+JSON.stringify({
    production:sourceBaseline.roi,proposedBest:lipOptions[bestLip.index],
    best:bestLip.roi,variants:sweepReport.variants.map(v=>({
      id:v.id,full:v.roi.full.source,lip:v.roi.topPhotoLip.source
    }))
  }));

  // WORK4 native visibility regression discovered in the real 384x512
  // independent SHA comparison. Hold the same scene, paused frame, fonts
  // and prices; switch only the four locally owned roster cards.
  const restoreRoster = [
    '.w4-fleet #w4-fleet-panel > .w4-ship-roster{padding-bottom:3px!important;}',
    '.w4-fleet #w4-fleet-panel > .w4-ship-roster > .w4-ship-slot{height:auto!important;min-height:104px!important;padding:4px 1px 5px!important;gap:2px!important;}',
    '.w4-fleet #w4-fleet-panel > .w4-ship-roster > .w4-ship-slot > .w4-slot-art{height:62px!important;min-height:0!important;flex:none!important;}'
  ].join('');
  const clipGeometry="(()=>{const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,height:r.height}:null};"+
    "const slots=[...document.querySelectorAll('.w4-fleet .w4-ship-roster > .w4-ship-slot')];"+
    "return {roster:rect('.w4-fleet .w4-ship-roster'),dock:rect('.harbour-nav.app-dock-porto'),"+
    "slots:slots.map(e=>{const r=e.getBoundingClientRect();const label=e.querySelector('strong')?.getBoundingClientRect();"+
    "const status=e.querySelector('small')?.getBoundingClientRect();return {top:r.top,bottom:r.bottom,"+
    "labelBottom:label?.bottom,statusBottom:status?.bottom,clickable:e.tagName==='BUTTON'}}),"+
    "dockCount:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length}})()";
  await evaluate("(()=>{const s=document.createElement('style');s.id='work4-legacy-roster';s.textContent="+
    JSON.stringify(restoreRoster)+";document.head.append(s);return true})()");
  await delay(120);
  const rosterBeforeGeometry=await evaluate(clipGeometry);
  const rosterBefore=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  await evaluate("(()=>{document.getElementById('work4-legacy-roster')?.remove();return true})()");
  await delay(120);
  const rosterAfterGeometry=await evaluate(clipGeometry);
  const rosterAfter=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  assert.equal(rosterAfterGeometry.dockCount,5,'WORK0 dock still has exactly five entries');
  assert.equal(rosterAfterGeometry.slots.length,4,'four real Fleet slots remain');
  assert.equal(rosterAfterGeometry.slots.filter((x:any)=>x.clickable).length,1,'only Royal Crown is selectable');
  assert.ok(rosterBeforeGeometry.roster.bottom>rosterBeforeGeometry.dock.top,
    'same-frame legacy layout must reproduce a genuine dock overlap');
  assert.ok(rosterAfterGeometry.roster.bottom<=rosterAfterGeometry.dock.top-1,
    'all card borders must finish clear of the untouched WORK0 dock');
  for(const item of rosterAfterGeometry.slots){
    assert.ok(item.labelBottom<=rosterAfterGeometry.dock.top-2,'ship name must not be covered');
    assert.ok(item.statusBottom<=rosterAfterGeometry.dock.top-2,'availability must not be covered');
    assert.ok(item.bottom<=rosterAfterGeometry.dock.top-1,'entire card must be visible');
  }
  const rosterPixelStudy="(async()=>{"+
    "const sources=['data:image/webp;base64,"+approved+"','data:image/png;base64,"+rosterBefore+"','data:image/png;base64,"+rosterAfter+"'];"+
    "const images=await Promise.all(sources.map(async src=>{const im=new Image();im.src=src;await im.decode();return im}));"+
    "if(images.some(i=>i.width!==384||i.height!==512))throw Error('must compare native screenshots');"+
    "const data=images.map(im=>{const c=document.createElement('canvas');c.width=384;c.height=512;"+
      "const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);return x.getImageData(0,0,384,512).data});"+
    "const boxes={full:[0,0,384,512],roster:[0,344,384,431],ship:[31,176,216,304],sea:[188,306,218,338],dock:[0,433,384,512]};"+
    "const roi=(box)=>{let sumB=0,sumA=0,changed=0,n=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){"+
      "let k=(y*384+x)*4,v=false;for(let j=0;j<3;j++){sumB+=Math.abs(data[0][k+j]-data[1][k+j]);sumA+=Math.abs(data[0][k+j]-data[2][k+j]);"+
      "v ||=data[1][k+j]!==data[2][k+j];n++}if(v)changed++}return {before:sumB/n,after:sumA/n,changedPixels:changed}};"+
    "const stats=Object.fromEntries(Object.entries(boxes).map(([n,b])=>[n,roi(b)]));"+
    "const c=document.createElement('canvas');c.width=1536;c.height=512;const x=c.getContext('2d');"+
    "images.forEach((im,i)=>x.drawImage(im,i*384,0));x.drawImage(images[0],1152,0);"+
    "x.globalAlpha=.5;x.drawImage(images[2],1152,0);x.globalAlpha=1;"+
    "return {boxes,stats,comparison:c.toDataURL('image/png').split(',')[1]}})()";
  const rosterStudy=await evaluate(rosterPixelStudy);
  for(const area of ['ship','sea','dock']){
    assert.equal(rosterStudy.stats[area].changedPixels,0,
      'compacting WORK4 cards must leave '+area+' pixel-identical');
  }
  assert.ok(rosterStudy.stats.roster.changedPixels>200,'actual roster pixels must change');
  const rosterReport={
    approved:false,screensApproved:0,viewport:'384x512',
    comparison:'same native Chromium scene/frame; before legacy ship cards, after compact WORK4-only cards',
    beforeGeometry:rosterBeforeGeometry,afterGeometry:rosterAfterGeometry,
    roiBoxes:rosterStudy.boxes,roi:rosterStudy.stats,
    note:'Visibility and touch take priority over a purely global RGB MAE; ship, sea and dock pixel invariants are strict.'
  };
  writeFileSync(join(qa,'work4-native-roster-dock-clearance-ab.json'),JSON.stringify(rosterReport,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-fleet-roster-384x512.png'),Buffer.from(rosterStudy.comparison,'base64'));
  console.log('WORK4_FLEET_ROSTER_AB '+JSON.stringify(rosterReport));

  writeFileSync(join(qa,'original-before-render-overlay-fleet-continuous-inset-384x512.png'),Buffer.from(result.comparison,'base64'));
  const report={approved:false,screensApproved:0,viewport:'384x512',source:'03-frota.webp',frame:'same Chromium page; paused animations; same persisted data',geometry,roiBoxes:result.roiBoxes,roi:result.metrics,
    note:'Ship composition ROI x31–216 and sea interior x188–218 must remain unchanged; overlap/feather belongs to the photoJoin x219–258. MAE is evidence, not human artistic approval.'};
  writeFileSync(join(qa,'work4-native-continuous-inset-ab.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_NATIVE_CONTINUOUS_INSET_AB '+JSON.stringify(report));
});
