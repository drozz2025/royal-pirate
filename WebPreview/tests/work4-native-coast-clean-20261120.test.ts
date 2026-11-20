import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const marker='WORK4/#104 · clean native 384x512 source-coast seam, 20 Nov 20h.';
const paint=css.split(marker)[1]?.split('/*')[0]||'';
const selector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label';
const oldGradient='linear-gradient(90deg,#082c48de 0%,#09253ff1 20%,#061d33f8 55%,#031529fc 100%)';
const approved=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');

test('WORK4 Fleet source seam uses local native paint, never ship geometry, sea or shared UI',()=>{
  assert.ok(paint,'native source inset must exist');
  assert.match(paint,/@media \(width:384px\) and \(height:512px\)/);
  assert.match(paint,/background:linear-gradient\(90deg,#07415aee/);
  assert.match(paint,/100%\)!important/);
  assert.equal((paint.match(/\.w4-stage-label\s*\{/g)||[]).length,1);
  assert.match(paint,/box-shadow:none/);
  assert.match(paint,/background:linear-gradient\(90deg,transparent 0%,#07415aee/);
  assert.equal((paint.match(/\.w4-stage-label::after/g)||[]).length,1);
  assert.doesNotMatch(paint,/(?:\.app-|\.porto-|\.harbour-nav|\.w4-reference-sea|\.w4-reference-ship|\.w4-cannon-art|contain:paint|transform:|position:|pointer-events:)/);
  for (const filename of ['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
    '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']) {
    const image=readFileSync(new URL('../../assets/design-approved/'+filename,import.meta.url));
    assert.equal(image.toString('ascii',0,4),'RIFF',filename);
    assert.equal(image.toString('ascii',8,12),'WEBP',filename);
  }
  assert.ok(css.includes('radial-gradient(ellipse 110% 123% at 30% 50%'),'approved Royal Crown source contour must survive');
  assert.ok(css.includes('svg.w4-reference-sea'),'source water must survive');
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Fleet native live-inset controlled A/B: same Chromium frame, per-ROI MAE and all 5 dock controls',{
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
  const nav=await evaluate("(()=>{const e=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:3}]});
  await delay(60);
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const geometry=await evaluate("(()=>{const stage=document.querySelector('.w4-harbour-stage');const label=document.querySelector('.w4-stage-label');const r=stage.getBoundingClientRect(),p=label.getBoundingClientRect();return {stage:{x:r.x,y:r.y,width:r.width,height:r.height},label:{x:p.x,y:p.y,width:p.width,height:p.height},ship:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet svg.w4-reference-sea').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,realLevels:document.querySelectorAll('.w4-fleet .w4-stage-stats > span').length}})()");
  assert.equal(geometry.ship,1,'exactly one Royal Crown source painting');
  assert.equal(geometry.sea,1,'exactly one approved source sea');
  assert.equal(geometry.dock,5,'five dock buttons still present and touchable');
  assert.equal(geometry.realLevels,3,'existing real levels preserved');
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-ship image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('approved ship source not loaded');const style=document.createElement('style');style.id='work4-native-ab-baseline';style.textContent="+JSON.stringify(selector+"{background:"+oldGradient+"!important;box-shadow:inset 1px 0 #bad4cf27!important;}"+selector+"::after{background:linear-gradient(90deg,transparent 0%,#082c48de 100%)!important;}")+";document.head.append(style);return true;})()");
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
    "const boxes={full:[0,0,384,512],inset:[238,166,365,336],join:[232,162,257,340],royalCrown:[65,205,175,307],sea:[188,306,236,338],dock:[0,433,384,512]};"+
    "const mae=(x,y,box)=>{let total=0,n=0;for(let yy=box[1];yy<box[3];yy++)for(let xx=box[0];xx<box[2];xx++){let k=(yy*384+xx)*4;for(let j=0;j<3;j++){total+=Math.abs(x[k+j]-y[k+j]);n++;}}return total/n;};"+
    "const changed=(box)=>{let count=0;for(let yy=box[1];yy<box[3];yy++)for(let xx=box[0];xx<box[2];xx++){let k=(yy*384+xx)*4;if(b[k]!==c[k]||b[k+1]!==c[k+1]||b[k+2]!==c[k+2])count++;}return count;};"+
    "let metrics={};for(const [name,box] of Object.entries(boxes))metrics[name]={before:mae(a,b,box),after:mae(a,c,box),changedPixels:changed(box)};"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const ctx=canvas.getContext('2d');"+
    "ctx.drawImage(original,0,0);ctx.drawImage(before,384,0);ctx.drawImage(after,768,0);ctx.drawImage(original,1152,0);ctx.globalAlpha=.5;ctx.drawImage(after,1152,0);ctx.globalAlpha=1;"+
    "return {metrics,comparison:canvas.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(expression);
  assert.ok(result?.metrics?.inset,'must measure real pixel difference');
  assert.equal(result.metrics.royalCrown.changedPixels,0,'central Royal Crown pixels must remain identical');
  assert.equal(result.metrics.dock.changedPixels,0,'shared five-item dock pixels must remain identical');
  assert.ok(result.metrics.join.changedPixels>0,'coast lip must change actual live pixels');
  assert.ok(result.metrics.join.after < result.metrics.join.before-.1,
    'native coast join RGB MAE must improve in genuine same-frame Chromium');
  assert.ok(result.metrics.full.after <= result.metrics.full.before+.02,
    'new coast pigment cannot materially regress full original 384x512 MAE');
  assert.equal(result.metrics.sea.changedPixels,0,'authentic source sea must be untouched');
  writeFileSync(join(qa,'original-before-render-overlay-fleet-inset-source-384x512.png'),Buffer.from(result.comparison,'base64'));
  const report={approved:false,screensApproved:0,viewport:'384x512',source:'03-frota.webp',frame:'same Chromium page; paused animations; same persisted data',geometry,roi:result.metrics,
    note:'MAE is evidence, not human artistic approval. Only the live inset pigment changes.'};
  writeFileSync(join(qa,'work4-native-live-inset-source-ab.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_CLEAN_COAST_NATIVE_AB '+JSON.stringify(report));
  // Both owned pages, three additional real mobile frames; no local synthetic screenshot.
  // The new rule is native-384-only, so responsive layout and WORK0 dock stay untouched.
  const mobileQA=[];
  for (const [width,height] of [[320,568],[390,844],[430,932]]) {
    await cmd('Emulation.setDeviceMetricsOverride',{
      width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height
    });
    await delay(170);
    const fleet=await evaluate("(()=>({dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,ship:document.querySelectorAll('.w4-fleet .w4-reference-ship').length,cards:document.querySelectorAll('.w4-fleet .w4-ship-slot').length,overflow:document.documentElement.scrollWidth>innerWidth+1}))()");
    assert.equal(fleet.dock,5,'five WORK0 navigation items at '+width);
    assert.equal(fleet.ship,1,'one approved Royal Crown at '+width);
    assert.equal(fleet.cards,4,'four real cards at '+width);
    assert.equal(fleet.overflow,false,'no horizontal overflow at '+width);
    writeFileSync(join(qa,'work4-clean-coast-fleet-'+width+'x'+height+'.png'),
      Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
    const intoForge=await evaluate("(()=>{const b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true})()");
    assert.equal(intoForge,true,'existing real Forge entry works at '+width);
    await until("!!document.querySelector('.w4-forge .w4-reference-cannon')");
    const forge=await evaluate("(()=>({dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,cannon:document.querySelectorAll('.w4-forge .w4-reference-cannon').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid strong').length,button:!!document.querySelector('.w4-forge .w4-improve-button'),overflow:document.documentElement.scrollWidth>innerWidth+1}))()");
    assert.equal(forge.dock,5,'five dock controls in Forge');
    assert.equal(forge.cannon,1,'one approved cannon');
    assert.equal(forge.costs,3,'three real cost figures');
    assert.ok(forge.button,'real Forge upgrade action');
    assert.equal(forge.overflow,false,'no Forge horizontal overflow');
    writeFileSync(join(qa,'work4-clean-coast-forge-'+width+'x'+height+'.png'),
      Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
    mobileQA.push({width,height,fleet,forge});
    const back=await evaluate("(()=>{const b=document.querySelector('.w4-forge #w4-forge-panel > .w4-action-pair button');if(!b)return false;b.click();return true})()");
    assert.equal(back,true,'real Forge return at '+width);
    await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  }
  writeFileSync(join(qa,'work4-clean-coast-responsive-qa.json'),
    JSON.stringify({approved:false,approvedScreens:0,viewport:'native384+3mobile',
      comparisons:report.roi,mobileQA},null,2)+String.fromCharCode(10));

});
