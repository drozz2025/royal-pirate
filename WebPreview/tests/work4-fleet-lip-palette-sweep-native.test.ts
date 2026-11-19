import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');
const selector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label';
const released='linear-gradient(90deg,#075684ec 0%,#0a4b74ed 12%,#0b3655f6 28%,#06263ff9 44%,#031b30fa 70%,#031729fb 100%)';
test('WORK4 Fleet: original approved 00 and 01–08 references and isolated 384x512 source paint',()=>{
  for(const name of ['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
    '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']){
    const file=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
    assert.equal(file.toString('ascii',0,4),'RIFF',name);
    assert.equal(file.toString('ascii',8,12),'WEBP',name);
  }
  assert.ok(css.includes(released),'test starts from actual merged WORK0 pigment');
  assert.match(css,/radial-gradient\(ellipse 110% 123% at 30% 50%/);
  assert.match(css,/svg\.w4-reference-sea/);
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Fleet source-lip controlled palette sweep: 384x512 original / render / overlay / ROI',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  const isolatedBuild=mkdtempSync(join(tmpdir(),'rp-work4-fleet-build-'));t.after(()=>rmSync(isolatedBuild,{recursive:true,force:true,maxRetries:10,retryDelay:200}));
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',isolatedBuild],{
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
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-ship image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('original source painting missing');return true;})()");
  assert.equal(geometry.ship,1,'one source Royal Crown');
  assert.equal(geometry.sea,1,'one original source sea');
  assert.equal(geometry.dock,5,'WORK0 five-item dock');
  assert.equal(geometry.realLevels,3,'actual progression');
  const lip=['#075684ec','#06547fec','#075079ec','#085f89ec','#064c73ec','#094769ec',
    '#0a3e61ec','#0d4b68ec','#075684e6','#0e658bed','#0c567bed','#072a49ec',
    '#0b4562ec','#094b6fec','#0a5f86ec','#083e5bec','#075880ec','#0f526bec'];
  const shots:string[]=[];
  for(const color of lip){
    const pigment=released.replace('#075684ec',color);
    const rule=selector+'{background:'+pigment+'!important}';
    await evaluate("(()=>{let s=document.getElementById('work4-fleet-lip-sweep');if(!s){s=document.createElement('style');s.id='work4-fleet-lip-sweep';document.head.append(s);}s.textContent="+JSON.stringify(rule)+";return true;})()");
    await delay(90);
    shots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  const expression="(async()=>{"+
    "const load=async(data,mime)=>{const i=new Image();i.src='data:'+mime+';base64,'+data;await i.decode();return i;};"+
    "const original=await load("+JSON.stringify(reference)+",'image/webp');"+
    "const images=await Promise.all("+JSON.stringify(shots)+".map(b=>load(b,'image/png')));"+
    "if(original.width!==384||original.height!==512||images.some(i=>i.width!==384||i.height!==512))throw Error('expected native 384x512 DPR1');"+
    "const px=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const a=px(original),frames=images.map(px),boxes={full:[0,0,384,512],inset:[238,166,365,336],join:[236,170,266,326],royalCrown:[65,205,175,307],sea:[188,306,236,338],roster:[18,346,373,429],dock:[0,433,384,512]};"+
    "const mae=(x,y,b)=>{let sum=0,n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){let k=(yy*384+xx)*4;for(let j=0;j<3;j++){sum+=Math.abs(x[k+j]-y[k+j]);n++;}}return sum/n;};"+
    "const changed=(x,y,b)=>{let n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){let k=(yy*384+xx)*4;if(x[k]!=y[k]||x[k+1]!=y[k+1]||x[k+2]!=y[k+2])n++;}return n;};"+
    "const records=frames.map((fr,i)=>{const roi={};for(const [key,box] of Object.entries(boxes))roi[key]={mae:mae(a,fr,box),changedPixels:changed(frames[0],fr,box)};return {index:i,roi};});"+
    "const base=records[0],safe=records.filter(r=>['royalCrown','sea','roster','dock'].every(k=>r.roi[k].changedPixels===0)&&r.roi.join.mae<=base.roi.join.mae&&r.roi.inset.mae<=base.roi.inset.mae&&r.roi.full.mae<=base.roi.full.mae).sort((x,y)=>(x.roi.full.mae-y.roi.full.mae)||(x.roi.join.mae-y.roi.join.mae));"+
    "const winner=safe[0]||base;"+
    "const c=document.createElement('canvas');c.width=1536;c.height=512;const g=c.getContext('2d');g.drawImage(original,0,0);g.drawImage(images[0],384,0);g.drawImage(images[winner.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(images[winner.index],1152,0);"+
    "return {records,winner:winner.index,grid:c.toDataURL('image/png').split(',')[1]};})()";
  const data=await evaluate(expression);
  assert.equal(data.records.length,lip.length);
  for(const key of ['royalCrown','sea','roster','dock']){
    assert.equal(data.records[data.winner].roi[key].changedPixels,0,key+' must be pixel-identical');
  }
  assert.equal(data.records[0].roi.full.changedPixels,0);
  const report={approved:false,screensApproved:0,viewport:'384x512',reference:'03-frota.webp',frame:'same Chromium native scene + paused animations',
    decision:data.winner===0?'No safe pigment change: preserve merged source inset':'Safe native pigment candidate measured, pending WORK0 & artistic approval',
    winner:lip[data.winner],baseline:lip[0],candidates:lip.map((color,i)=>({color,...data.records[i]})),geometry};
  writeFileSync(join(qa,'work4-fleet-lip-palette-sweep-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-best-overlay-fleet-source-lip-384x512.png'),Buffer.from(data.grid,'base64'));
  console.log('WORK4_FLEET_SOURCE_LIP_SWEEP '+JSON.stringify({winner:report.winner,baseline:report.baseline,
    decision:report.decision,geometry,roi:report.candidates.map(x=>({color:x.color,full:x.roi.full.mae,inset:x.roi.inset.mae,join:x.roi.join.mae,royalCrownChanged:x.roi.royalCrown.changedPixels,seaChanged:x.roi.sea.changedPixels,dockChanged:x.roi.dock.changedPixels}))}));
});
