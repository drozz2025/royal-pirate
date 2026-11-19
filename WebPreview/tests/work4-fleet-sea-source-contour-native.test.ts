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
const selector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label';
const oldGradient='linear-gradient(155deg,#09263cfb,#031b30fa)';
const approved=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');

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

test('WORK4 Fleet native source sea and photo seam geometry: source-led multi-ROI sweep',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  const buildDir=mkdtempSync(join(tmpdir(),'rp-work4-sea-build-'));
  t.after(()=>rmSync(buildDir,{recursive:true,force:true,maxRetries:10,retryDelay:200}));
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',buildDir],{
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
    'preview','--outDir',buildDir,'--host','127.0.0.1','--port',String(port),'--strictPort','--base=/royal-pirate/'
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

  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-ship image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('original source image not loaded');return true;})()");
  // The source sea contains ONLY approved x24..237 / y308..339 water:
  // test different feather widths and 1–2px registration, never a fake wave.
  const selector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > svg.w4-reference-sea';
  const variants=[
    {name:'current HEAD',top:8,left:6,bottom:-2,side:0,baseline:true},
    {name:'top4',top:4,left:6,bottom:-2,side:0},
    {name:'top0-hard',top:0,left:6,bottom:-2,side:0},
    {name:'top12',top:12,left:6,bottom:-2,side:0},
    {name:'top16',top:16,left:6,bottom:-2,side:0},
    {name:'top22',top:22,left:6,bottom:-2,side:0},
    {name:'x-1',top:8,left:5,bottom:-2,side:0},
    {name:'x+1',top:8,left:7,bottom:-2,side:0},
    {name:'x-2',top:8,left:4,bottom:-2,side:0},
    {name:'x+2',top:8,left:8,bottom:-2,side:0},
    {name:'y-1',top:8,left:6,bottom:-1,side:0},
    {name:'y+1',top:8,left:6,bottom:-3,side:0},
    {name:'side4',top:8,left:6,bottom:-2,side:4},
    {name:'side8',top:8,left:6,bottom:-2,side:8},
    {name:'side12',top:8,left:6,bottom:-2,side:12},
    {name:'side8-top4',top:4,left:6,bottom:-2,side:8},
    {name:'side8-top12',top:12,left:6,bottom:-2,side:8}
  ];
  const captures:string[]=[];
  for(const v of variants){
    const topMask='linear-gradient(to bottom,transparent 0%,#000 '+v.top+'%,#000 100%)';
    const sideMask='linear-gradient(to right,transparent 0%,#000 '+v.side+'%,#000 '+(100-v.side)+'%,transparent 100%)';
    const mask=v.side?topMask+','+sideMask:topMask;
    const rule=v.baseline?'':selector+'{left:'+v.left+'px!important;bottom:'+v.bottom+'px!important;'+
      'mask-image:'+mask+'!important;-webkit-mask-image:'+mask+'!important;'+
      (v.side?'mask-composite:intersect!important;-webkit-mask-composite:source-in!important;':'')+'}';
    await evaluate("(()=>{let s=document.getElementById('w4-sea-candidate');if(!s){s=document.createElement('style');s.id='w4-sea-candidate';document.head.append(s)}s.textContent="+JSON.stringify(rule)+";return true})()");
    await delay(130);
    captures.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  const expression="(async()=>{"+
    "const load=async(bytes,mime)=>{const im=new Image();im.src='data:'+mime+';base64,'+bytes;await im.decode();return im};"+
    "const original=await load("+JSON.stringify(approved)+",'image/webp');"+
    "const frames=await Promise.all("+JSON.stringify(captures)+".map(s=>load(s,'image/png')));"+
    "if([original,...frames].some(x=>x.width!==384||x.height!==512))throw Error('native 384x512 required');"+
    "const pix=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,384,512).data};"+
    "const a=pix(original),arr=frames.map(pix),boxes={full:[0,0,384,512],bridge:[18,299,241,340],water:[24,308,237,339],leftSeam:[18,306,56,338],rightSeam:[207,306,243,338],royalCrown:[65,202,175,295],roster:[0,341,384,428],dock:[0,433,384,512]};"+
    "const mae=(x,y,b)=>{let sum=0,n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;for(let j=0;j<3;j++){sum+=Math.abs(x[k+j]-y[k+j]);n++}}return sum/n};"+
    "const diff=(x,y,b)=>{let n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;if(x[k]!==y[k]||x[k+1]!==y[k+1]||x[k+2]!==y[k+2])n++}return n};"+
    "const scores=arr.map((frame,i)=>{const roi={};for(const [name,box] of Object.entries(boxes))roi[name]={mae:mae(a,frame,box),changedPixels:diff(arr[0],frame,box)};return {index:i,roi}});"+
    "const base=scores[0],eligible=scores.filter(r=>r.index===0||(r.index!==2&&r.roi.royalCrown.changedPixels===0&&r.roi.roster.changedPixels===0&&r.roi.dock.changedPixels===0&&r.roi.full.mae<=base.roi.full.mae-0.01&&r.roi.bridge.mae<=base.roi.bridge.mae-0.01&&r.roi.rightSeam.mae<=base.roi.rightSeam.mae));"+
    "eligible.sort((x,y)=>(x.roi.bridge.mae-y.roi.bridge.mae)||(x.roi.full.mae-y.roi.full.mae));const winner=eligible[0]||base;"+
    "const c=document.createElement('canvas');c.width=1536;c.height=512;const g=c.getContext('2d');g.drawImage(original,0,0);g.drawImage(frames[0],384,0);g.drawImage(frames[winner.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(frames[winner.index],1152,0);"+
    "return {scores,winnerIndex:winner.index,image:c.toDataURL('image/png').split(',')[1]}})()";
  const result=await evaluate(expression);
  assert.equal(result.scores.length,variants.length);
  assert.ok(result.scores.every((r:any)=>Number.isFinite(r.roi.bridge.mae)));
  for(const roi of ['royalCrown','roster','dock'])assert.equal(result.scores[result.winnerIndex].roi[roi].changedPixels,0,roi+' must remain untouched');
  const report={approved:false,screensApproved:0,reference:'03-frota.webp',viewport:'384x512',
    frame:'one Chromium scene, animations paused, no navigation or economy changes',
    geometry,roiBoxes:{full:[0,0,384,512],bridge:[18,299,241,340],water:[24,308,237,339],
      leftSeam:[18,306,56,338],rightSeam:[207,306,243,338],royalCrown:[65,202,175,295],roster:[0,341,384,428],dock:[0,433,384,512]},
    candidates:variants.map((v,j)=>({...v,...result.scores[j]})),
    winner:variants[result.winnerIndex],safeVisualChangeProposed:result.winnerIndex!==0,
    gate:'Reject zero-width hard photographic edge; require >=0.01 absolute RGB MAE improvement on BOTH full and source bridge while not worsening right seam, protecting ship/roster/dock.'};
  writeFileSync(join(qa,'work4-fleet-sea-source-contour-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-fleet-sea-source-384x512.png'),Buffer.from(result.image,'base64'));
  console.log('WORK4_FLEET_SEA_SOURCE_ROI '+JSON.stringify({winner:report.winner,geometry,candidates:report.candidates.map(c=>({name:c.name,full:c.roi.full.mae,bridge:c.roi.bridge.mae,water:c.roi.water.mae,left:c.roi.leftSeam.mae,right:c.roi.rightSeam.mae,shipChanged:c.roi.royalCrown.changedPixels,rosterChanged:c.roi.roster.changedPixels,dockChanged:c.roi.dock.changedPixels}))}));
});
