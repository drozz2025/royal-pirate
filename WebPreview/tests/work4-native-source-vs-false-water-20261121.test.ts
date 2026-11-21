import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';


/** Source references are never replaced by fake art in this diagnostic. */
const approved=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');
const approvedFiles=[
  '00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
  '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
  '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'
];
test('WORK4 required ten approved reference files remain source WebPs',()=>{
  for(const name of approvedFiles){
    const data=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
    assert.equal(data.toString('ascii',0,4),'RIFF',name);
    assert.equal(data.toString('ascii',8,12),'WEBP',name);
  }
});
const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 controlled native false-water underlay diagnostic',{
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
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-water-origin-'));
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

  const stage=await evaluate("(()=>{const f=document.querySelector('.w4-fleet');return {ship:f.querySelectorAll('svg.w4-reference-ship').length,sea:f.querySelectorAll('svg.w4-reference-sea').length,slots:f.querySelectorAll('.w4-ship-roster>.w4-ship-slot').length,levels:f.querySelectorAll('.w4-stage-stats>span').length,dock:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length}})()");
  assert.deepEqual(stage,{ship:1,sea:1,slots:4,levels:3,dock:5});
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const image=document.querySelector('.w4-reference-ship image');if(!image?.getAttribute('href')?.includes('03-frota'))throw Error('authentic fleet image missing');return true})()");
  // Each variation runs against the SAME live DOM, artwork, viewport, state, and paused animation frame.
  // No production CSS is modified. A rejected alternative must never be silently promoted.
  const variants=[
    {id:'current-release',css:''},
    {id:'remove-false-wave',css:'.w4-fleet .w4-harbour-stage::after{background:none!important;}'},
    {id:'remove-false-islands',css:'.w4-fleet .w4-harbour-stage>.w4-island{display:none!important;}'},
    {id:'remove-both-underlays',css:'.w4-fleet .w4-harbour-stage::after{background:none!important;}.w4-fleet .w4-harbour-stage>.w4-island{display:none!important;}'},
    {id:'source-blue-underlay',css:'.w4-fleet .w4-harbour-stage{background:#086187!important;}'},
    {id:'ink-blue-underlay',css:'.w4-fleet .w4-harbour-stage{background:#063a59!important;}'}
  ];
  const frames:string[]=[];
  for(const variant of variants){
    await evaluate("(()=>{let el=document.getElementById('work4-water-origin-variant');if(!el){el=document.createElement('style');el.id='work4-water-origin-variant';document.head.append(el);}el.textContent="+JSON.stringify(variant.css)+";return true})()");
    await delay(110);
    frames.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  await evaluate("(()=>{document.getElementById('work4-water-origin-variant')?.remove();return true})()");
  const scanCode="(async()=>{"+
    "const load=async src=>{const im=new Image();im.src=src;await im.decode();return im};"+
    "const imgs=await Promise.all(['data:image/webp;base64,"+approved+"',..."+JSON.stringify(frames)+".map(p=>'data:image/png;base64,'+p)].map(load));"+
    "if(imgs.some(i=>i.width!==384||i.height!==512))throw Error('must use native 384x512 screenshots');"+
    "const pix=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);return x.getImageData(0,0,384,512).data};"+
    "const [ref,...all]=imgs.map(pix);"+
    "const boxes={full:[0,0,384,512],ship:[31,176,216,304],royalCrown:[105,246,155,285],photoJoin:[219,155,258,339],sea:[188,306,218,338],shore:[15,160,70,309],stage:[10,148,369,341],dock:[0,433,384,512]};"+
    "const mae=(a,b,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let k=(384*y+x)*4;for(let j=0;j<3;j++){sum+=Math.abs(a[k+j]-b[k+j]);n++}}return sum/n};"+
    "const changed=(a,b,r)=>{let n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let k=(384*y+x)*4;if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])n++}return n};"+
    "const metrics=all.map(a=>Object.fromEntries(Object.entries(boxes).map(([key,r])=>[key,{mae:mae(ref,a,r),changedPixels:changed(all[0],a,r)}])));"+
    "return {boxes,metrics}})()";
  const scan=await evaluate(scanCode);
  assert.equal(scan.metrics.length,variants.length);
  assert.equal(scan.metrics[0].full.changedPixels,0);
  const eligible=scan.metrics.map((m:any,i:number)=>({i,m})).filter(({m}:any)=>
    ['ship','royalCrown','sea','dock'].every(key=>m[key].changedPixels===0)&&
    m.full.mae<=scan.metrics[0].full.mae-0.03 &&
    m.photoJoin.mae<=scan.metrics[0].photoJoin.mae+0.01);
  eligible.sort((a:any,b:any)=>a.m.photoJoin.mae-b.m.photoJoin.mae||a.m.full.mae-b.m.full.mae);
  const winner=eligible[0]||{i:0,m:scan.metrics[0]};
  const montageCode="(async()=>{"+
    "const load=async src=>{const i=new Image();i.src=src;await i.decode();return i};"+
    "const a=await load('data:image/webp;base64,"+approved+"');"+
    "const b=await load('data:image/png;base64,"+frames[0]+"');"+
    "const c=await load('data:image/png;base64,"+frames[winner.i]+"');"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const x=canvas.getContext('2d');"+
    "x.drawImage(a,0,0);x.drawImage(b,384,0);x.drawImage(c,768,0);x.drawImage(a,1152,0);x.globalAlpha=.5;x.drawImage(c,1152,0);"+
    "return canvas.toDataURL('image/png').split(',')[1]})()";
  const montage=await evaluate(montageCode);
  const report={approved:false,screensApproved:0,viewport:'384x512',source:'03-frota.webp',
    frame:'same paused native Chromium DOM+font+source image; no production change',
    protection:'Royal Crown, original sea and five-item dock must be unchanged',
    variants:variants.map((v,i)=>({id:v.id,roi:scan.metrics[i]})),
    roiBoxes:scan.boxes,safeWinner:variants[winner.i].id,
    decision:winner.i===0?'Reject underlay experiments; keep release CSS':'Candidate only, requires source/ROI artistic review before CSS promotion'};
  writeFileSync(join(qa,'work4-native-source-vs-false-water-20261121.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-source-water-384x512.png'),Buffer.from(montage,'base64'));
  console.log('WORK4_NATIVE_SOURCE_WATER_AB '+JSON.stringify(report));
  // Independent mobile viewport regression: same source + five real navigation targets.
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
    await delay(130);
    const check=await evaluate("(()=>({ship:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet svg.w4-reference-sea').length,dock:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length,innerWidth:innerWidth}))()");
    assert.equal(check.ship,1,'one Crown at '+width);
    assert.equal(check.sea,1,'one approved sea at '+width);
    assert.equal(check.dock,5,'five dock targets at '+width);
    assert.equal(check.innerWidth,width,'device width '+width);
    const pic=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
    writeFileSync(join(qa,'work4-source-water-fleet-'+width+'x'+height+'.png'),Buffer.from(pic,'base64'));
  }
});
