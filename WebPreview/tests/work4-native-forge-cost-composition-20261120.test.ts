import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

/** WORK4/#104. Experimental source-measured paint only on the EXISTING three
 * live cost cells. Never applies an unmeasured variant to production.
 * WORK0 alone controls merge, version, publishing and HTTP. approved:false. */
const approved=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
  '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
  '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
const source=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');
const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 composition study uses all ten approved original assets',()=>{
  for(const name of approved){
    const b=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
    assert.ok(b.length>10000,name);
    assert.equal(b.toString('ascii',0,4),'RIFF',name);
    assert.equal(b.toString('ascii',8,12),'WEBP',name);
  }
  const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
  assert.match(css,/\.w4-forge #w4-forge-panel > \.w4-materials/);
  assert.match(css,/\.w4-reference-cannon/);
});

test('WORK4 Forja 04: A/B cost-board relief vs approved source, cannon and dock protected',{
  skip:process.env.CI==='true'&&chrome?false:'CI native Chromium is required',
  timeout:240_000
},async t=>{
  const buildDir=mkdtempSync(join(tmpdir(),'rp-work4-cost-build-'));
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-cost-cdp-'));
  const out=resolve('porto-qa/work4');mkdirSync(out,{recursive:true});
  let browser:ReturnType<typeof spawn>|undefined, preview:ReturnType<typeof spawn>|undefined;
  let ws:WebSocket|undefined;
  t.after(async()=>{
    ws?.close();browser?.kill('SIGTERM');preview?.kill('SIGTERM');
    await delay(350);
    for(const dir of [profile,buildDir])rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:200});
  });
  const built=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',buildDir],{
    cwd:process.cwd(),encoding:'utf8',timeout:120000,maxBuffer:12000000
  });
  assert.equal(built.status,0,'WORK4 isolated build '+(built.stderr||built.stdout).slice(-1200));
  const port=await new Promise<number>((yes,no)=>{
    const srv=createServer();srv.once('error',no);srv.listen(0,'127.0.0.1',()=>{
      const a=srv.address();
      if(!a||typeof a==='string'){srv.close();return no(Error('missing port'));}
      srv.close(()=>yes(a.port));
    });
  });
  preview=spawn(join(process.cwd(),'node_modules','.bin','vite'),
    ['preview','--outDir',buildDir,'--host','127.0.0.1','--port',String(port),
      '--strictPort','--base=/royal-pirate/'],{stdio:'ignore'});
  const origin='http://127.0.0.1:'+port+'/royal-pirate/';
  let live=false;
  for(let i=0;i<130;i++){
    try{live=(await fetch(origin,{signal:AbortSignal.timeout(750)})).ok;if(live)break;}catch{}
    await delay(130);
  }
  assert.ok(live,'actual compiled production app is reachable on local preview');
  browser=spawn(chrome!,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  let target:any;
  for(let i=0;i<260;i++){
    if(browser.exitCode!==null)throw Error('native Chromium exited');
    try{
      const p=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      const result=await fetch('http://127.0.0.1:'+p+'/json/list',{signal:AbortSignal.timeout(750)});
      if(result.ok)target=(await result.json() as any[]).find(v=>v.type==='page');
    }catch{}
    if(target?.webSocketDebuggerUrl)break;
    await delay(110);
  }
  assert.ok(target?.webSocketDebuggerUrl,'live browser debugging socket');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((yes,no)=>{
    ws!.addEventListener('open',()=>yes(),{once:true});
    ws!.addEventListener('error',()=>no(Error('CDP socket failed')),{once:true});
  });
  let id=0;const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  ws.addEventListener('message',event=>{
    const m=JSON.parse(String(event.data)),p=pending.get(m.id);
    if(!p)return;
    pending.delete(m.id);
    m.error?p.reject(Error(m.error.message)):p.resolve(m.result);
  });
  const cmd=(method:string,params:Record<string,unknown>={})=>new Promise<any>((yes,no)=>{
    const seq=++id;
    const timeout=setTimeout(()=>{pending.delete(seq);no(Error('CDP timeout '+method));},30000);
    pending.set(seq,{resolve:v=>{clearTimeout(timeout);yes(v);},
      reject:e=>{clearTimeout(timeout);no(e);}});
    ws!.send(JSON.stringify({id:seq,method,params}));
  });
  const evaluate=async(expression:string)=>{
    const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.text);
    return r.result?.value;
  };
  const until=async(expr:string)=>{
    for(let j=0;j<160;j++){if(await evaluate(expr))return;await delay(130);}
    throw Error('UI absent '+expr);
  };
  await cmd('Page.enable');await cmd('Runtime.enable');
  const setViewport=async(width:number,height:number)=>{
    await cmd('Emulation.setDeviceMetricsOverride',{
      width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height
    });
    await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  };
  const shot=async()=>String((await cmd('Page.captureScreenshot',{
    format:'png',captureBeyondViewport:false})).data);
  await setViewport(384,512);
  await cmd('Page.navigate',{url:origin+'?work4=cost-composition-20261120'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  const nav=await evaluate("(()=>{const r=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:1}]});
  await delay(65);
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const opened=await evaluate("(()=>{document.querySelector('.w4-fleet .w4-action-pair button.w4-primary')?.click();return true})()");
  assert.equal(opened,true);
  await until("!!document.querySelector('.w4-forge .w4-reference-cannon')");
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());return true})()");
  const geometry=await evaluate("(()=>{const q=s=>document.querySelector(s);const r=e=>{const a=e.getBoundingClientRect();return [a.left,a.top,a.right,a.bottom]};return {cannon:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,cells:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,materials:r(q('.w4-forge #w4-forge-panel > .w4-materials')),action:r(q('.w4-forge #w4-forge-panel > .w4-improve-button')),dockRect:r(q('.app-sheet .harbour-nav.app-dock-porto')),values:[...document.querySelectorAll('.w4-forge .w4-resource-grid strong')].map(e=>e.textContent)}})()");
  assert.equal(geometry.cannon,1,'one source-approved cannon');
  assert.equal(geometry.cells,3,'three existing real cost cells');
  assert.equal(geometry.dock,5,'WORK0 owns unchanged 5-item dock');
  assert.ok(geometry.action[3]<=geometry.dockRect[1]+3,'real improvement action must clear dock');
  const paints=[
    {id:'HEAD',css:''},
    {id:'charcoal-iron',css:'linear-gradient(173deg,#242b2b 0%,#192227 50%,#0b1823 100%)'},
    {id:'naval-iron',css:'linear-gradient(173deg,#202c33 0%,#15252e 51%,#091c2c 100%)'},
    {id:'aged-timber',css:'linear-gradient(173deg,#403127 0%,#251f20 52%,#111b23 100%)'},
    {id:'copper-hearth',css:'linear-gradient(173deg,#503326 0%,#2d2524 50%,#0d1b24 100%)'},
    {id:'blue-slate',css:'linear-gradient(173deg,#2a3841 0%,#1c2b37 54%,#101b2c 100%)'},
    {id:'dark-charcoal',css:'linear-gradient(173deg,#262626 0%,#151b20 50%,#07141f 100%)'},
    {id:'warm-steel',css:'linear-gradient(173deg,#33322d 0%,#252627 52%,#111921 100%)'},
    {id:'workshop-oak',css:'linear-gradient(173deg,#332820 0%,#22242a 58%,#0b1524 100%)'},
    {id:'sea-smoke',css:'linear-gradient(173deg,#20353d 0%,#1a252d 50%,#0a1823 100%)'},
    {id:'dark-brass',css:'linear-gradient(173deg,#302d25 0%,#191f23 48%,#0c1720 100%)'},
    {id:'source-black',css:'linear-gradient(173deg,#222727 0%,#161b22 55%,#09151b 100%)'},
    {id:'wood-interior',css:'linear-gradient(173deg,#37302a 0%,#202020 52%,#121a20 100%)'},
    {id:'ash-and-iron',css:'linear-gradient(173deg,#2e302f 0%,#1b242a 48%,#101a24 100%)'},
    // Isolate the suspected remaining Forja regression against the merged HEAD:
    // original live 9px costs versus PR's 11px, on the EXACT same frame.
    {id:'caption-9-release',css:'',caption:{size:9,top:0}},
    {id:'caption-9-clear',css:'',caption:{size:9,top:-3}},
    {id:'caption-10-clear',css:'',caption:{size:10,top:-3}},
    {id:'caption-12-clear',css:'',caption:{size:12,top:-3}},
    {id:'caption-9-flush',css:'',caption:{size:9,top:-0.1}},
    {id:'caption-10-release',css:'',caption:{size:10,top:0}},
    {id:'caption-10-flush',css:'',caption:{size:10,top:-0.1}},
    {id:'caption-11-release',css:'',caption:{size:11,top:0}},
    {id:'caption-11-flush',css:'',caption:{size:11,top:-0.1}},
    {id:'caption-11-safe',css:'',caption:{size:11,top:-1}},
    {id:'caption-12-release',css:'',caption:{size:12,top:0}}
  ];
  const captures:string[]=[];
  const candidateGeometry:Array<{bottom:number,dockTop:number,clearance:number,fontSize:string}>=[];
  const selector='.w4-forge #w4-forge-panel > .w4-materials:where(*)';
  for(const p of paints){
    const injected=(p.css?selector+'{background:'+p.css+'!important;}':'')+
      ('caption' in p&&p.caption?
        '@media (width:384px) and (height:512px){'+
        '.w4-forge #w4-forge-panel [aria-label="Custo e materiais disponíveis"] small'+
        '{font-size:'+p.caption.size+'px!important;line-height:1.05!important;letter-spacing:-.1px!important;}'+
        '.w4-forge #w4-forge-panel > .w4-improve-button{top:'+p.caption.top+'px!important;}}':'');
    const applied=await evaluate("(()=>{let s=document.getElementById('w4-cost-paint-study');if(!s){s=document.createElement('style');s.id='w4-cost-paint-study';document.head.append(s)}s.textContent="+JSON.stringify(injected)+";return getComputedStyle(document.querySelector('.w4-forge #w4-forge-panel > .w4-materials')).backgroundImage})()");
    assert.ok(typeof applied==='string'&&applied.length>8,'CSS candidate actually computed');
    const cg=await evaluate("(()=>{const b=document.querySelector('.w4-forge #w4-forge-panel > .w4-improve-button').getBoundingClientRect();const d=document.querySelector('.app-sheet .harbour-nav.app-dock-porto').getBoundingClientRect();return {bottom:b.bottom,dockTop:d.top,clearance:d.top-b.bottom,fontSize:getComputedStyle(document.querySelector('.w4-forge #w4-forge-panel [aria-label=\\\"Custo e materiais disponíveis\\\"] small')).fontSize}})()");
    candidateGeometry.push(cg);
    captures.push(await shot());
  }
  const calculate="(async()=>{"+
    "const get=async(s,mime)=>{const i=new Image();i.src='data:'+mime+';base64,'+s;await i.decode();return i};"+
    "const ref=await get("+JSON.stringify(source)+",'image/webp');"+
    "const ims=await Promise.all("+JSON.stringify(captures)+".map(x=>get(x,'image/png')));"+
    "if(ref.width!==384||ref.height!==512||ims.some(x=>x.width!==384||x.height!==512))throw Error('not original native 384x512');"+
    "const pix=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
    "const src=pix(ref),samples=ims.map(pix),m="+JSON.stringify(geometry.materials)+";"+
    "const box=a=>[Math.max(0,Math.floor(a[0])),Math.max(0,Math.floor(a[1])),Math.min(384,Math.ceil(a[2])),Math.min(512,Math.ceil(a[3]))];"+
    "const regions={global:[0,0,384,512],materials:box(m),costsAndAction:[16,318,375,430],cannon:[18,153,175,305],furnace:[129,168,171,294],dock:[0,433,384,512]};"+
    "const measure=(a,b,r)=>{let s=0,n=0,c=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=4*(y*384+x);let changed=false;for(let i=0;i<3;i++){s+=Math.abs(a[k+i]-b[k+i]);n++;if(a[k+i]!==b[k+i])changed=true}if(changed)c++}return {mae:s/n,changedPixels:c}};"+
    "const records=samples.map((p,i)=>({index:i,roi:Object.fromEntries(Object.entries(regions).map(([name,b])=>[name,{mae:measure(src,p,b).mae,changedPixels:measure(samples[0],p,b).changedPixels}]))}));"+
    "const clearance="+JSON.stringify(candidateGeometry.map(x=>x.clearance))+";"+
    "const before=records[0];const admitted=records.filter(r=>clearance[r.index]>=-0.1&&r.roi.cannon.changedPixels===0&&r.roi.furnace.changedPixels===0&&r.roi.dock.changedPixels===0&&r.roi.global.mae<=before.roi.global.mae&&r.roi.costsAndAction.mae<=before.roi.costsAndAction.mae);"+
    "admitted.sort((a,b)=>(a.roi.costsAndAction.mae-b.roi.costsAndAction.mae)||(a.roi.global.mae-b.roi.global.mae));"+
    "const best=admitted[0]||before;const grid=document.createElement('canvas');grid.width=1536;grid.height=512;const g=grid.getContext('2d');g.drawImage(ref,0,0);g.drawImage(ims[0],384,0);g.drawImage(ims[best.index],768,0);g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(ims[best.index],1152,0);"+
    "return {records,bestIndex:best.index,regions,grid:grid.toDataURL('image/png').split(',')[1]}})()";
  const pixels=await evaluate(calculate);
  assert.equal(pixels.records.length,paints.length);
  assert.equal(pixels.records[0].roi.cannon.changedPixels,0);
  const report={approved:false,approvedScreens:0,screen:'04 Forja',reference:'04-melhorias-forja.webp',
    viewport:'384x512 DPR1',frame:'same paused Chromium scene; actual live prices unchanged',
    geometry,regions:pixels.regions,candidates:paints.map((p,i)=>({...p,...pixels.records[i],geometry:candidateGeometry[i]})),
    winner:pixels.bestIndex,selected:paints[pixels.bestIndex].id,
    decision:pixels.bestIndex===0?'HEAD retained: no safe material gradient improves source MAE':'Candidate measured: requires isolated production commit and human review'};
  writeFileSync(join(out,'work4-forge-cost-composition-20261120.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(out,'work4-original-before-render-overlay-cost-384x512.png'),Buffer.from(pixels.grid,'base64'));
  console.log('WORK4_FORGE_COST_COMPOSITION '+JSON.stringify({selected:report.selected,winner:report.winner,base:report.candidates[0].roi,winnerROI:report.candidates[report.winner].roi,geometry,
    typographyComparisons:report.candidates.filter(x=>x.id.startsWith('caption')).map(x=>({id:x.id,global:x.roi.global.mae,costsAndAction:x.roi.costsAndAction.mae,material:x.roi.materials.mae,clearance:x.geometry.clearance,fontSize:x.geometry.fontSize}))}));
  await evaluate("(()=>{document.getElementById('w4-cost-paint-study')?.remove();return true})()");
  const responsive=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await setViewport(width,height);await delay(200);
    const g=await evaluate("(()=>{const r=s=>{const a=document.querySelector(s).getBoundingClientRect();return {top:a.top,bottom:a.bottom,width:a.width}};return {cannon:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,materials:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,overflow:document.documentElement.scrollWidth>window.innerWidth+1,action:r('.w4-forge #w4-forge-panel > .w4-improve-button'),dockRect:r('.app-sheet .harbour-nav.app-dock-porto')}})()");
    assert.equal(g.cannon,1,'one source cannon at '+width);
    assert.equal(g.materials,3,'live material costs at '+width);
    assert.equal(g.dock,5,'five dock items at '+width);
    assert.equal(g.overflow,false,'horizontal overflow at '+width);
    writeFileSync(join(out,'work4-forge-cost-qa-'+width+'x'+height+'.png'),Buffer.from(await shot(),'base64'));
    responsive.push({width,height,...g});
  }
  writeFileSync(join(out,'work4-forge-cost-responsive-20261120.json'),JSON.stringify({approved:false,responsive},null,2)+'\n');
});
