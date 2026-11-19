import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const selector='.w4-fleet .w4-harbour-stage > svg.w4-ship-art.w4-reference-ship';
const oldFilter='drop-shadow(0 9px 7px #031926c9)';
const approved=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');

test('WORK4 approved 01–08 images exist, native Fleet removes fake crop shadow only',()=>{
 for(const name of ['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
  '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
  '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']){
  const bytes=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF',name);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',name);
 }
 const block=css.split('WORK4 / #104 — native 384x512: remove the fake raised-rectangle shadow')[1];
 assert.ok(block,'scoped native shadow fix');
 assert.match(block,/@media \(width:384px\) and \(height:512px\)/);
 assert.match(block,/\.w4-fleet \.w4-harbour-stage > svg\.w4-ship-art\.w4-reference-ship/);
 assert.match(block,/filter:none!important/);
 assert.doesNotMatch(block,/\.app-|\.porto-|\.harbour-nav|\.w4-forge|\.w4-reference-sea|transform:|background:|position:|overflow:|pointer-events:/);
 assert.match(css,/radial-gradient\(ellipse 110% 123% at 30% 50%/);
 assert.match(css,/contain:paint/);
 assert.match(css,/transform:translateZ\(0\)/);
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Fleet source-shadow removal: native same-frame MAE, scene and ship ROI, five-item dock',{
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
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-shadow-'));
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
  await cmd('Page.navigate',{url:origin+'?work4=source-ship-shadow-ab'});
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
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-ship image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('approved ship source not loaded');const style=document.createElement('style');style.id='work4-native-ab-baseline';style.textContent="+JSON.stringify(selector+"{filter:"+oldFilter+"!important;}")+";document.head.append(style);return true;})()");
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
    "const boxes={full:[0,0,384,512],upperCoast:[15,151,244,210],join:[15,167,242,339],shipSilhouette:[52,190,242,320],royalCrown:[100,240,150,283],sea:[188,306,236,338],liveStats:[251,173,367,338],dock:[0,433,384,512]};"+
    "const mae=(x,y,box)=>{let total=0,n=0;for(let yy=box[1];yy<box[3];yy++)for(let xx=box[0];xx<box[2];xx++){let k=(yy*384+xx)*4;for(let j=0;j<3;j++){total+=Math.abs(x[k+j]-y[k+j]);n++;}}return total/n;};"+
    "const changed=(box)=>{let count=0;for(let yy=box[1];yy<box[3];yy++)for(let xx=box[0];xx<box[2];xx++){let k=(yy*384+xx)*4;if(b[k]!==c[k]||b[k+1]!==c[k+1]||b[k+2]!==c[k+2])count++;}return count;};"+
    "let metrics={};for(const [name,box] of Object.entries(boxes))metrics[name]={before:mae(a,b,box),after:mae(a,c,box),changedPixels:changed(box)};"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const ctx=canvas.getContext('2d');"+
    "ctx.drawImage(original,0,0);ctx.drawImage(before,384,0);ctx.drawImage(after,768,0);ctx.drawImage(original,1152,0);ctx.globalAlpha=.5;ctx.drawImage(after,1152,0);ctx.globalAlpha=1;"+
    "return {metrics,comparison:canvas.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(expression);
  assert.ok(result?.metrics?.shipSilhouette,'must measure real pixel difference');
  assert.equal(result.metrics.royalCrown.changedPixels,0,'central Royal Crown pixels must remain identical');
  assert.equal(result.metrics.dock.changedPixels,0,'shared five-item dock pixels must remain identical');
  assert.ok(result.metrics.join.changedPixels>0,'the masked source shadow must visibly change the seam');
  writeFileSync(join(qa,'original-before-render-overlay-fleet-shadow-384x512.png'),Buffer.from(result.comparison,'base64'));
  const report={approved:false,screensApproved:0,viewport:'384x512',source:'03-frota.webp',frame:'same Chromium page; paused animations; same persisted data',geometry,roi:result.metrics,
    note:'MEASURED, not human approved: removing a drop-shadow around the cropped photograph, not around the actual hull. Other viewports remain unchanged.'};
  writeFileSync(join(qa,'work4-native-source-shadow-ab.json'),JSON.stringify(report,null,2)+'\n');

  // Test the three untouched responsive viewports on the same app state.
  // A source-filter override exists ONLY for the native reference viewport.
  const responsive=[] as Array<{viewport:string;shipCount:number;dockCount:number;filter:string}>;
  for (const [width,height] of [[320,568],[390,844],[430,932]] as const) {
    await cmd('Emulation.setDeviceMetricsOverride',{
      width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height
    });
    await delay(220);
    const state=await evaluate("(()=>{const ship=document.querySelector('.w4-fleet svg.w4-reference-ship');return {shipCount:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,dockCount:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,filter:ship?getComputedStyle(ship).filter:''}})()");
    assert.equal(state.shipCount,1,'single Royal Crown at '+width);
    assert.equal(state.dockCount,5,'five-item dock at '+width);
    assert.ok(state.filter!=='none','non-native viewport filter must be unchanged at '+width);
    responsive.push({viewport:width+'x'+height,...state});
    const png=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
    writeFileSync(join(qa,'fleet-untouched-'+width+'x'+height+'.png'),Buffer.from(png,'base64'));
  }
  writeFileSync(join(qa,'work4-shadow-responsive.json'),JSON.stringify({approved:false,screensApproved:0,responsive},null,2)+'\n');
  console.log('WORK4_SOURCE_SHADOW_NATIVE_AB '+JSON.stringify(report));
});
