import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const marker='WORK4/#104 — 18 Nov 21h: connect the ONE original Royal Crown';
const paint=css.split(marker)[1]?.split('/*')[0]||'';
const selector='.w4-fleet .w4-harbour-stage::after';
const oldGradient='linear-gradient(155deg,#09263cfb,#031b30fa)';
const approved=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');

test('WORK4: both approved design masters and all eight genuine screen paintings remain present',()=>{
  const names=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
    '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
  for(const name of names){const bytes=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF',name);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',name);
    assert.ok(bytes.length>10000,name);
  }
});

test('WORK4 Fleet source seam uses local native paint, never ship geometry, sea or shared UI',()=>{
  assert.ok(paint,'native source inset must exist');
  assert.match(paint,/@media \(width:384px\) and \(height:512px\)/);
  assert.match(paint,/background:linear-gradient\(90deg,#075684ec/);
  assert.match(paint,/100%\)!important/);
  assert.equal((paint.match(/\.w4-stage-label/g)||[]).length,1);
  assert.doesNotMatch(paint,/(?:\.app-|\.porto-|\.harbour-nav|\.w4-reference-sea|\.w4-reference-ship|\.w4-cannon-art|contain:paint|transform:|position:|pointer-events:)/);
  assert.ok(css.includes('radial-gradient(ellipse 110% 123% at 30% 50%'),'approved Royal Crown source contour must survive');
  assert.ok(css.includes('svg.w4-reference-sea'),'source water must survive');
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Fleet source-sea / native sky-shade A/B, 384x512 Chromium + 3 viewports',{
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
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-ship image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('approved Royal Crown source missing');return true;})()");
  const variants=[
    {id:'released-native',rule:''},
    {id:'remove-sky-shade',rule:'background:none!important;'},
    {id:'quarter-sky-shade',rule:'opacity:.25!important;'},
    {id:'near-invisible-sky-shade',rule:'opacity:.08!important;'}
  ];
  const shots:string[]=[];
  const pseudoBefore=await evaluate("(()=>{const e=document.querySelector('.w4-fleet .w4-harbour-stage');const p=getComputedStyle(e,'::after');return {background:p.backgroundImage,height:p.height,opacity:p.opacity}})()");
  assert.match(pseudoBefore.background,/linear-gradient/,'expected real sky seam on native 384');
  assert.doesNotMatch(pseudoBefore.background,/repeating-linear-gradient/,'no fake-water strip is active at this viewport');
  for(const variant of variants){
    const cssRule=variant.rule ? selector+'{'+variant.rule+'}' : '';
    await evaluate("(()=>{let style=document.getElementById('work4-sky-shade-native-study');if(!style){style=document.createElement('style');style.id='work4-sky-shade-native-study';document.head.append(style)}style.textContent="+JSON.stringify(cssRule)+";return true})()");
    await delay(120);
    shots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  const expression="(async()=>{"+
    "const load=async(bytes,mime)=>{const im=new Image();im.src='data:'+mime+';base64,'+bytes;await im.decode();return im;};"+
    "const original=await load("+JSON.stringify(approved)+",'image/webp');"+
    "const screens=await Promise.all("+JSON.stringify(shots)+".map(s=>load(s,'image/png')));"+
    "if(original.width!==384||original.height!==512||screens.some(im=>im.width!==384||im.height!==512))throw Error('384x512 source+native screenshots required');"+
    "const pixels=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);return x.getImageData(0,0,384,512).data;};"+
    "const ref=pixels(original),img=screens.map(pixels);"+
    "const boxes={full:[0,0,384,512],waterBand:[19,274,365,343],sourceSea:[24,306,237,339],ship:[65,205,175,307],photoJoin:[198,258,266,338],roster:[0,350,384,432],dock:[0,433,384,512]};"+
    "const mae=(a,b,box)=>{let total=0,n=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){const k=(y*384+x)*4;for(let j=0;j<3;j++){total+=Math.abs(a[k+j]-b[k+j]);n++;}}return total/n;};"+
    "const changed=(a,b,box)=>{let n=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){const k=(y*384+x)*4;if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])n++;}return n;};"+
    "const records=img.map((shot,i)=>{const roi={};for(const [name,box] of Object.entries(boxes))roi[name]={mae:mae(ref,shot,box),changedPixels:changed(img[0],shot,box)};return {index:i,roi};});"+
    "const before=records[0];const safe=records.filter(r=>r.roi.ship.changedPixels===0&&r.roi.dock.changedPixels===0&&r.roi.roster.changedPixels===0&&r.roi.full.mae<=before.roi.full.mae&&r.roi.waterBand.mae<=before.roi.waterBand.mae);"+
    "safe.sort((a,b)=>a.roi.waterBand.mae-b.roi.waterBand.mae||a.roi.full.mae-b.roi.full.mae);const best=safe[0]||before;"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const g=canvas.getContext('2d');g.drawImage(original,0,0);g.drawImage(screens[0],384,0);g.drawImage(screens[best.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(screens[best.index],1152,0);"+
    "return {records,bestIndex:best.index,grid:canvas.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(expression);
  assert.equal(result.records.length,variants.length);
  assert.ok(Number.isFinite(result.records[0].roi.waterBand.mae));
  const protectedRegions=['ship','roster','dock'];
  for(const key of protectedRegions)assert.equal(result.records[result.bestIndex].roi[key].changedPixels,0,key+' pixels are protected');
  writeFileSync(join(qa,'fleet-original-before-render-overlay-sky-shade-384x512.png'),Buffer.from(result.grid,'base64'));
  await evaluate("document.getElementById('work4-sky-shade-native-study')?.remove();true");
  const responsive=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
    await delay(180);
    const measure=await evaluate("(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,ship:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet svg.w4-reference-sea').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length}))()");
    assert.equal(measure.width,width);assert.equal(measure.ship,1);assert.equal(measure.sea,1);assert.equal(measure.dock,5);
    assert.ok(measure.scrollWidth<=width+1,'unwanted horizontal scroll at '+width);
    const screen=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
    writeFileSync(join(qa,'fleet-sky-shade-regression-'+width+'x'+height+'.png'),Buffer.from(screen,'base64'));
    responsive.push(measure);
  }
  const report={approved:false,screensApproved:0,baselineCommit:'000342efe2c1c76c5ac1908f2b5f0cbdb062d3df',
    viewport:'384x512',reference:'03-frota.webp',pseudoBefore,geometry,
    frame:'same Chromium DOM/page/frame; all animations paused',variants:variants.map((v,i)=>({...v,roi:result.records[i].roi})),
    safeWinner:variants[result.bestIndex]?.id,changedPixels:result.records[result.bestIndex].roi.waterBand.changedPixels,
    responsive,decision:result.bestIndex===0?'Native pseudo-element is an upper-right sky shade, not synthetic water; removing it regresses global MAE. Keep production unchanged.':'Candidate only; requires separate review and human approval'};
  writeFileSync(join(qa,'work4-sky-shade-native-20261119.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_SKY_SHADE_NATIVE_STUDY '+JSON.stringify({pseudoBefore,safeWinner:report.safeWinner,variants:report.variants.map(v=>({id:v.id,full:v.roi.full.mae,waterBand:v.roi.waterBand.mae,bridge:v.roi.sourceSea.mae,shipChanged:v.roi.ship.changedPixels,rosterChanged:v.roi.roster.changedPixels,dockChanged:v.roi.dock.changedPixels,waveChanged:v.roi.waterBand.changedPixels})),responsive}));
});
