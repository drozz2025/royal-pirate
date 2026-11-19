import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

/** WORK4-only controlled experiment. The approved painting remains live React
 * UI: only the photo-edge mask is swept. No candidate is shipped automatically. */
const approvedFiles=[
  '00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
  '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
  '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'
];
const art=(name:string)=>readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
const fleetRef=art('03-frota.webp').toString('base64');
const forgeRef=art('04-melhorias-forja.webp').toString('base64');
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);

test('WORK4 approved source inputs and protected visual selectors exist',()=>{
  for(const name of approvedFiles){
    const bytes=art(name);
    assert.equal(bytes.toString('ascii',0,4),'RIFF',name);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',name);
    assert.ok(bytes.length>10000,name);
  }
  const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
  assert.match(css,/radial-gradient\(ellipse 110% 123% at 30% 50%/);
  assert.match(css,/linear-gradient\(to bottom,transparent 0%,#000 2%,#000 97%,transparent 100%\)/);
  assert.match(css,/svg\.w4-reference-sea/);
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
});

test('WORK4 single Royal Crown / single cannon: same-frame native photo-contour ROI comparison',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium evidence only',
  timeout:240_000
},async t=>{
  const buildDir=mkdtempSync(join(tmpdir(),'rp-work4-contour-build-'));
  t.after(()=>rmSync(buildDir,{recursive:true,force:true,maxRetries:10,retryDelay:200}));
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',buildDir],{
    cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:12000000
  });
  assert.equal(build.status,0,'isolated build: '+(build.stderr||build.stdout).slice(-1500));
  const qa=resolve('porto-qa/work4');mkdirSync(qa,{recursive:true});
  const port=await new Promise<number>((yes,no)=>{
    const server=createServer();server.once('error',no);
    server.listen(0,'127.0.0.1',()=>{
      const addr=server.address();
      if(!addr||typeof addr==='string'){server.close();return no(Error('port'));}
      server.close(()=>yes(addr.port));
    });
  });
  const preview=spawn(join(process.cwd(),'node_modules','.bin','vite'),[
    'preview','--outDir',buildDir,'--host','127.0.0.1','--port',String(port),
    '--strictPort','--base=/royal-pirate/'
  ],{stdio:'ignore'});
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-contour-chrome-'));
  let browser:ReturnType<typeof spawn>|undefined;
  let ws:WebSocket|undefined;
  t.after(async()=>{ws?.close();browser?.kill('SIGTERM');preview.kill('SIGTERM');
    await delay(450);rmSync(profile,{recursive:true,force:true,maxRetries:12,retryDelay:250});
  });
  const origin='http://127.0.0.1:'+port+'/royal-pirate/';
  let live=false;
  for(let i=0;i<120;i++){
    try{live=(await fetch(origin,{signal:AbortSignal.timeout(750)})).ok;if(live)break;}
    catch{}await delay(120);
  }
  assert.ok(live,'local production preview must be live');
  browser=spawn(chrome!,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
  ],{stdio:'ignore'});
  let target:any=null;
  for(let i=0;i<270;i++){
    if(browser.exitCode!==null)throw Error('Chromium exited early');
    try{
      const p=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      if(p>0){
        const res=await fetch('http://127.0.0.1:'+p+'/json/list',{signal:AbortSignal.timeout(750)});
        if(res.ok)target=(await res.json() as any[]).find(item=>item.type==='page');
      }
    }catch{}
    if(target)break;await delay(100);
  }
  assert.ok(target?.webSocketDebuggerUrl,'native Chromium debugger endpoint');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((yes,no)=>{
    ws!.addEventListener('open',()=>yes(),{once:true});
    ws!.addEventListener('error',()=>no(Error('CDP WS')), {once:true});
  });
  let next=0;const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  ws.addEventListener('message',event=>{
    const msg=JSON.parse(String(event.data)),entry=pending.get(msg.id);
    if(!entry)return;pending.delete(msg.id);
    msg.error?entry.reject(Error(msg.error.message)):entry.resolve(msg.result);
  });
  const cmd=(method:string,params:Record<string,unknown>={})=>new Promise<any>((yes,no)=>{
    const id=++next;
    const timer=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout: '+method));},30000);
    pending.set(id,{resolve:r=>{clearTimeout(timer);yes(r);},reject:e=>{clearTimeout(timer);no(e);}});
    ws!.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async(expression:string)=>{
    const result=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error('Runtime.evaluate '+result.exceptionDetails.text);
    return result.result?.value;
  };
  const until=async(expr:string)=>{
    for(let i=0;i<170;i++){if(await evaluate(expr))return;await delay(130);}
    throw Error('Missing page element: '+expr);
  };
  const viewport=async(width:number,height:number)=>{
    await cmd('Emulation.setDeviceMetricsOverride',{
      width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height
    });
  };
  const capture=async()=>((await cmd('Page.captureScreenshot',{
    format:'png',captureBeyondViewport:false
  })).data as string);
  await cmd('Page.enable');await cmd('Runtime.enable');
  await viewport(384,512);
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await cmd('Page.navigate',{url:origin+'?work4=contour-source-roi'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  const nav=await evaluate("(()=>{const e=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:4}]});
  await delay(60);
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("!!document.querySelector('.w4-fleet svg.w4-reference-ship')");
  const fleetGeometry=await evaluate("(()=>({ship:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet svg.w4-reference-sea').length,slots:document.querySelectorAll('.w4-fleet .w4-ship-slot').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,levels:document.querySelectorAll('.w4-fleet .w4-stage-stats > span').length}))()");
  assert.deepEqual([fleetGeometry.ship,fleetGeometry.sea,fleetGeometry.slots,fleetGeometry.dock,fleetGeometry.levels],
    [1,1,4,5,3],'one real Royal Crown, one approved sea, 4 slots, 5 dock items, 3 levels');
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const e=document.querySelector('.w4-fleet .w4-reference-ship image');if(!e||!(await fetch(e.getAttribute('href'))).ok)throw Error('source not loaded');return true;})()");
  const masks=[
    {name:'HEAD',radial:null,opaque:0,bottom:0},
    ...[
      [106,120,83,2,97],[108,123,84,2,97],[112,123,84,2,97],
      [115,126,84,2,97],[118,130,84,2,97],[120,130,86,2,97],
      [110,123,84,1,98],[110,123,86,2,98],[112,127,86,3,97],
      [115,132,88,2,98],[125,135,85,2,97]
    ].map(([rx,ry,opaque,top,bottom])=>({
      name:'radial-'+rx+'x'+ry+'-o'+opaque+'-top'+top+'-bottom'+bottom,
      radial:'radial-gradient(ellipse '+rx+'% '+ry+'% at 30% 50%,#000 0%,#000 '+opaque+'%,transparent 99%)',
      opaque:top,bottom
    }))
  ];
  const shots:string[]=[];
  for(const mask of masks){
    const gradient=mask.radial?
      mask.radial+',linear-gradient(to bottom,transparent 0%,#000 '+mask.opaque+'%,#000 '+mask.bottom+'%,transparent 100%)':'';
    const rule=gradient?'.w4-fleet .w4-harbour-stage > svg.w4-ship-art.w4-reference-ship{'+
      '-webkit-mask-image:'+gradient+'!important;mask-image:'+gradient+'!important;}':'';
    await evaluate("(()=>{let el=document.getElementById('work4-contour-variant');if(!el){el=document.createElement('style');el.id='work4-contour-variant';document.head.append(el);}el.textContent="+JSON.stringify(rule)+";return true;})()");
    await delay(100);
    shots.push(await capture());
  }
  const calculate="(async()=>{"+
    "const load=async(s,m)=>{const im=new Image();im.src='data:'+m+';base64,'+s;await im.decode();return im;};"+
    "const original=await load("+JSON.stringify(fleetRef)+",'image/webp');"+
    "const frames=await Promise.all("+JSON.stringify(shots)+".map(s=>load(s,'image/png')));"+
    "if([original,...frames].some(im=>im.width!==384||im.height!==512))throw Error('native 1:1 only');"+
    "const pixels=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const a=pixels(original),p=frames.map(pixels),boxes={full:[0,0,384,512],ship:[65,188,190,309],coast:[177,153,243,320],coastUpper:[185,155,241,234],water:[43,307,239,339],roster:[12,339,375,444],dock:[0,445,384,512]};"+
    "const mae=(x,y,b)=>{let n=0,v=0;for(let j=b[1];j<b[3];j++)for(let i=b[0];i<b[2];i++){const k=(j*384+i)*4;for(let c=0;c<3;c++){v+=Math.abs(x[k+c]-y[k+c]);n++;}}return v/n;};"+
    "const changed=(x,y,b)=>{let n=0;for(let j=b[1];j<b[3];j++)for(let i=b[0];i<b[2];i++){const k=(j*384+i)*4;if(x[k]!==y[k]||x[k+1]!==y[k+1]||x[k+2]!==y[k+2])n++;}return n;};"+
    "const samples=p.map((frame,i)=>({index:i,roi:Object.fromEntries(Object.entries(boxes).map(([name,box])=>[name,{mae:mae(a,frame,box),changedPixels:changed(p[0],frame,box)}]))}));"+
    "const baseline=samples[0];const ranked=[...samples].sort((x,y)=>(x.roi.full.mae-y.roi.full.mae));"+
    "const safe=samples.filter(v=>v.roi.roster.changedPixels===0&&v.roi.dock.changedPixels===0&&v.roi.ship.mae<=baseline.roi.ship.mae+.15&&v.roi.coast.mae<=baseline.roi.coast.mae&&v.roi.full.mae<=baseline.roi.full.mae).sort((x,y)=>x.roi.full.mae-y.roi.full.mae);"+
    "const best=safe[0]||baseline;const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const g=canvas.getContext('2d');g.drawImage(original,0,0);g.drawImage(frames[0],384,0);g.drawImage(frames[best.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(frames[best.index],1152,0);"+
    "return {samples,globalWinnerIndex:ranked[0].index,safeWinnerIndex:best.index,comparison:canvas.toDataURL('image/png').split(',')[1]};})()";
  const fleet=await evaluate(calculate);
  assert.equal(fleet.samples.length,masks.length,'all controlled variants must be measured');
  assert.ok(Number.isFinite(fleet.samples[0].roi.ship.mae));
  assert.equal(fleet.samples[0].roi.dock.changedPixels,0);
  writeFileSync(join(qa,'work4-source-contour-original-before-render-overlay-384x512.png'),Buffer.from(fleet.comparison,'base64'));
  await evaluate("document.getElementById('work4-contour-variant')?.remove();true");
  const linked=await evaluate("(()=>{const e=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!e)return false;e.click();return true})()");
  assert.equal(linked,true,'native working Frota-to-Forja navigation');
  await until("!!document.querySelector('.w4-forge svg.w4-reference-cannon')");
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const e=document.querySelector('.w4-forge svg.w4-reference-cannon image');if(!e||!(await fetch(e.getAttribute('href'))).ok)throw Error('cannon source');return true;})()");
  const forgeGeometry=await evaluate("(()=>({cannon:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,levels:document.querySelectorAll('.w4-forge .w4-forge-live-level').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length}))()");
  assert.deepEqual([forgeGeometry.cannon,forgeGeometry.levels,forgeGeometry.costs,forgeGeometry.dock],[1,3,3,5]);
  const forgeFrame=await capture();
  const calcForge="(async()=>{const load=async(s,m)=>{const i=new Image();i.src='data:'+m+';base64,'+s;await i.decode();return i;};"+
    "const [original,render]=await Promise.all([load("+JSON.stringify(forgeRef)+",'image/webp'),load("+JSON.stringify(forgeFrame)+",'image/png')]);"+
    "if(original.width!==384||render.width!==384)throw Error('native forge');"+
    "const bitmap=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const a=bitmap(original),b=bitmap(render);const boxes={full:[0,0,384,512],cannon:[18,153,175,305],furnace:[129,168,171,294],materials:[16,329,375,430],dock:[0,445,384,512]};"+
    "const out={};for(const [name,rect] of Object.entries(boxes)){let n=0,v=0;for(let y=rect[1];y<rect[3];y++)for(let x=rect[0];x<rect[2];x++){const k=(y*384+x)*4;for(let c=0;c<3;c++){v+=Math.abs(a[k+c]-b[k+c]);n++;}}out[name]={mae:v/n};}"+
    "const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;const g=canvas.getContext('2d');g.drawImage(original,0,0);g.drawImage(render,384,0);return {roi:out,comparison:canvas.toDataURL('image/png').split(',')[1]};})()";
  const forge=await evaluate(calcForge);
  assert.ok(Number.isFinite(forge.roi.cannon.mae));
  writeFileSync(join(qa,'work4-forge-cannon-original-render-384x512.png'),Buffer.from(forge.comparison,'base64'));
  const responsive=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await viewport(width,height);await delay(180);
    const geometry=await evaluate("(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,nav:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,cannon:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length}))()");
    assert.equal(geometry.nav,5,'responsive 5-item dock');
    assert.equal(geometry.cannon,1,'responsive one cannon');
    assert.equal(geometry.costs,3,'responsive real costs');
    writeFileSync(join(qa,'work4-forge-responsive-'+width+'x'+height+'.png'),Buffer.from(await capture(),'base64'));
    responsive.push({viewport:width+'x'+height,...geometry});
  }
  const report={
    approved:false,screensApproved:'0/8',base:'runtime current HEAD',frame:'same Chromium 384x512 scene / paused animation',
    references:approvedFiles,geometry:{fleet:fleetGeometry,forge:forgeGeometry},fleet:{
      masks:masks.map((mask,i)=>({mask,...fleet.samples[i]})),
      globalWinner:masks[fleet.globalWinnerIndex],
      protectedWinner:masks[fleet.safeWinnerIndex]
    },forge:{roi:forge.roi},responsive,
    decision:'Study only. No visual source change is authorized by numerical MAE alone. WORK0 owns merge and publication.'
  };
  writeFileSync(join(qa,'work4-source-contour-roi-20261119.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_SOURCE_CONTOUR_ROI '+JSON.stringify({
    approved:false,screensApproved:'0/8',fleetBaseline:fleet.samples[0],
    protectedWinner:report.fleet.protectedWinner,
    winningROI:fleet.samples[fleet.safeWinnerIndex].roi,
    globalWinner:report.fleet.globalWinner,
    forge:forge.roi,responsive
  }));
});
