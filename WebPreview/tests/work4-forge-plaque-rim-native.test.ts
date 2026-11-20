import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');

test('WORK4 Forge plaque-rim study uses the actual 10 mandatory approved reference images',()=>{
 const names=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
   '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
   '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
 for(const filename of names){const data=readFileSync(new URL('../../assets/design-approved/'+filename,import.meta.url));
   assert.equal(data.toString('ascii',0,4),'RIFF',filename);
   assert.equal(data.toString('ascii',8,12),'WEBP',filename);
   assert.ok(data.length>10000,filename);
 }
 assert.match(css,/radial-gradient\(ellipse 140% 122% at 37% 49%/);
 assert.match(css,/linear-gradient\(to bottom,#000 0%,#000 99%,transparent 100%\)/);
 assert.match(css,/contain:paint/);
 assert.match(css,/transform:translateZ\(0\)/);
 assert.match(css,/background-color:#2d2929!important/);
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Forge native genuine-plaque metal rim sweep: same frame, full/plaque/cannon/hearth ROIs',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  const buildDir=mkdtempSync(join(tmpdir(),'rp-work4-forge-build-'));
  t.after(()=>rmSync(buildDir,{recursive:true,force:true,maxRetries:10,retryDelay:200}));
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',buildDir],{
    cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:12000000
  });
  assert.equal(build.status,0,'isolated Forge build: '+(build.stderr||build.stdout).slice(-1200));
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
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-forge-plaque-'));
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
  await cmd('Page.navigate',{url:origin+'?work4=forge-plaque-rim-sweep'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  const nav=await evaluate("(()=>{const e=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:3}]});
  await delay(60);
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const route=await evaluate("(()=>{const b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true})()");
  assert.equal(route,true,'existing functional Frota-to-Forja button must navigate');
  await until("!!document.querySelector('.w4-forge .w4-reference-cannon')");
  const geometry=await evaluate("(()=>({cannon:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,liveLevels:document.querySelectorAll('.w4-forge .w4-forge-live-level').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,sceneRect:(()=>{const r=document.querySelector('.w4-forge-scene').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()}))()");
  assert.equal(geometry.cannon,1,'one approved source cannon only');
  assert.equal(geometry.liveLevels,3,'three real locally saved levels');
  assert.equal(geometry.costs,3,'three real resource cells');
  assert.equal(geometry.dock,5,'five shared WORK0 dock buttons');
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-cannon image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('source forge image not loaded');return true;})()");
  // One existing REAL right-hand forge plaque. Change ONLY its 2px border pigment,
  // NOT its dimensions, the approved cannon/furnace art, progression or costs.
  // The grey release border is baseline; brass/iron samples come from original 04.
  const variants=[
    {color:'#8a9ba1'}, // verified HEAD before this WORK4 patch
    ...['#866846','#95754d','#a67c4e','#b38a58','#c29a61',
        '#d1a76e','#e0b776','#b58e62','#967c64','#725a46',
        '#af986e','#d5b58a','#705d52','#ab8247','#c7a279']
      .map(color=>({color}))
  ];
  const shots=[];
  for(const shift of variants){
    const rule='.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description{border-color:'+shift.color+'!important;}';
    const exp="(()=>{let style=document.getElementById('work4-forge-plaque-candidate');if(!style){style=document.createElement('style');style.id='work4-forge-plaque-candidate';document.head.append(style)}style.textContent="+JSON.stringify(rule)+";return true})()";
    await evaluate(exp);
    await delay(120);
    shots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  const script="(async()=>{"+
    "const load=async(bytes,mime)=>{const im=new Image();im.src='data:'+mime+';base64,'+bytes;await im.decode();return im;};"+
    "const original=await load("+JSON.stringify(reference)+",'image/webp');"+
    "const screens=await Promise.all("+JSON.stringify(shots)+".map(s=>load(s,'image/png')));"+
    "if(original.width!==384||original.height!==512||screens.some(im=>im.width!==384||im.height!==512))throw Error('native 384x512 source required');"+
    "const pix=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const a=pix(original),shots=screens.map(pix),boxes={full:[0,0,384,512],plaque:[179,145,373,316],plaqueBorder:[178,145,373,319],cannon:[18,153,175,305],furnace:[129,168,171,294],costs:[16,329,375,430],dock:[0,433,384,512]};"+
    "const mae=(x,y,b)=>{let sum=0,n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;for(let j=0;j<3;j++){sum+=Math.abs(x[k+j]-y[k+j]);n++;}}return sum/n;};"+
    "const count=(x,y,b)=>{let n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;if(x[k]!==y[k]||x[k+1]!==y[k+1]||x[k+2]!==y[k+2])n++;}return n;};"+
    "const records=shots.map((shot,i)=>{const roi={};for(const [name,box] of Object.entries(boxes))roi[name]={mae:mae(a,shot,box),changedPixels:count(shots[0],shot,box)};return {index:i,roi};});"+
    "const baseline=records[0];"+
    "const globalWinner=[...records].filter(r=>r.roi.costs.changedPixels===0&&r.roi.dock.changedPixels===0).sort((x,y)=>(x.roi.full.mae-y.roi.full.mae))[0];"+
    "const valid=records.filter(r=>r.roi.costs.changedPixels===0&&r.roi.dock.changedPixels===0&&['full','plaque','plaqueBorder','cannon','furnace'].every(name=>r.roi[name].mae<=baseline.roi[name].mae));"+
    "valid.sort((x,y)=>(x.roi.full.mae-y.roi.full.mae)||(x.roi.plaque.mae-y.roi.plaque.mae)||(x.roi.furnace.mae-y.roi.furnace.mae));"+
    "const best=valid[0];if(!best)throw Error('baseline must remain an admissible candidate');"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const g=canvas.getContext('2d');g.drawImage(original,0,0);g.drawImage(screens[0],384,0);g.drawImage(screens[best.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(screens[best.index],1152,0);"+
    "return {records,bestIndex:best.index,globalWinnerIndex:globalWinner.index,baseline,geometry:"+JSON.stringify(geometry)+",grid:canvas.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(script);
  assert.equal(result.records.length,variants.length);
  assert.ok(Number.isFinite(result.baseline.roi.full.mae));
  // This study now protects a measured production visual improvement, not
  // merely a neutral sweep. The warm genuine metal rim must beat grey release
  // paint in BOTH global and local composition with no masked scene changes.
  assert.match(css, /border-color:#725a46/);
  const production=result.records[10];
  assert.ok(production.roi.full.mae < result.baseline.roi.full.mae,'new rim must improve full-frame MAE');
  assert.ok(production.roi.plaque.mae < result.baseline.roi.plaque.mae,'new rim must improve plaque ROI');
  assert.ok(production.roi.plaqueBorder.mae < result.baseline.roi.plaqueBorder.mae,'new rim must improve plaque-border ROI');
  for(const region of ['cannon','furnace','costs','dock']){
    assert.equal(production.roi[region].changedPixels,0,region+' must be pixel-identical to baseline');
  }

  assert.equal(result.bestIndex>=0,true);
  const report={approved:false,screensApproved:0,viewport:'384x512',reference:'04-melhorias-forja.webp',
    frame:'same Chromium 384x512 scene, paused animations; only actual live plaque border color changes',geometry,
    candidates:variants.map((paint,i)=>({...result.records[i],paint})),
    globalWinner:variants[result.globalWinnerIndex],safeWinner:variants[result.bestIndex],
    decision:result.bestIndex===0?'Keep merged plaque metal border: no alternative simultaneously improved full/plaque and protected cannon/furnace ROIs':'Candidate improves gated ROIs; require human artistic approval before WORK0 integration'};
  writeFileSync(join(qa,'work4-forge-plaque-rim-sweep-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-best-overlay-forge-plaque-384x512.png'),Buffer.from(result.grid,'base64'));
  console.log('WORK4_FORGE_PLAQUE_RIM_SWEEP '+JSON.stringify({globalWinner:report.globalWinner,safeWinner:report.safeWinner,decision:report.decision,baseline:report.candidates[0],winner:report.candidates[result.bestIndex],geometry,
    roiSummary:report.candidates.map(x=>({paint:x.paint,full:x.roi.full.mae,plaque:x.roi.plaque.mae,plaqueBorder:x.roi.plaqueBorder.mae,cannon:x.roi.cannon.mae,furnace:x.roi.furnace.mae}))}));

  // WORK4 / #104 20 Nov: controlled prospect for an ORIGINAL-source forge
  // plaque transition. No runtime paint is changed by this diagnostic.
  // All candidates are captured from the SAME paused DOM and browser frame,
  // after restoring the actual release border (not the prior border sweep).
  await evaluate("(()=>{document.getElementById('work4-forge-plaque-candidate')?.remove();return true})()");
  await delay(180);
  const tonalCandidates=[
    {id:'HEAD',paint:null},
    {id:'source-left-08',paint:'linear-gradient(90deg,#172b3600 0%,#172b36e2 8%,#061827f4 70%,#04101ff9 100%)'},
    {id:'source-left-14',paint:'linear-gradient(90deg,#172b3600 0%,#172b36e3 14%,#061827f2 70%,#04101ff9 100%)'},
    {id:'source-left-22',paint:'linear-gradient(90deg,#172b3600 0%,#172b36df 22%,#061827f2 70%,#04101ff9 100%)'},
    {id:'source-left-32',paint:'linear-gradient(90deg,#172b3600 0%,#172b36e5 32%,#061827f4 70%,#04101ff9 100%)'},
    {id:'soft-all',paint:'linear-gradient(170deg,#172b36bd,#061827dc 70%,#04101fe9)'},
    {id:'soft-top',paint:'linear-gradient(170deg,#172b36a9,#061827ed 70%,#04101ff6)'},
    {id:'warm-smoke',paint:'linear-gradient(170deg,#3d3229dc,#15222def 65%,#071723f7)'},
    {id:'warm-metal',paint:'linear-gradient(170deg,#554332dd,#1b2733ef 65%,#071421f8)'},
    {id:'muted-steel',paint:'linear-gradient(165deg,#243c48dc,#091f31f1 65%,#04101ffa)'},
    {id:'bronze-side',paint:'linear-gradient(90deg,#7c594633 0%,#1c303dda 20%,#081a2cf4 65%,#04101ff9)'},
  ];
  const tonals:string[]=[];
  for(const item of tonalCandidates){
    await evaluate("(()=>{let el=document.getElementById('w4-forge-tonal-candidate');"+
      "if(!el){el=document.createElement('style');el.id='w4-forge-tonal-candidate';document.head.append(el);}"+
      "el.textContent="+JSON.stringify(item.paint?
        '.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description { background:'+item.paint+'!important; }':
        '')+";return true})()");
    await delay(125);
    tonals.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  await evaluate("(()=>{document.getElementById('w4-forge-tonal-candidate')?.remove();return true})()");
  const tonalScript="(async()=>{"+
    "const input="+JSON.stringify({ref:reference,shots:tonals})+";"+
    "const im=async(data,type)=>{const i=new Image();i.src='data:image/'+type+';base64,'+data;await i.decode();return i;};"+
    "const source=await im(input.ref,'webp'),imgs=await Promise.all(input.shots.map(b=>im(b,'png')));"+
    "if([source,...imgs].some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 only');"+
    "const pix=i=>{const cv=document.createElement('canvas');cv.width=384;cv.height=512;"+
    "const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const ref=pix(source),frames=imgs.map(pix),rects={full:[0,0,384,512],"+
    "plaque:[179,145,373,316],plaqueJoin:[176,150,206,310],"+
    "cannon:[18,153,175,305],furnace:[129,168,171,294],"+
    "costs:[16,329,375,430],dock:[0,433,384,512]};"+
    "const score=(a,b,box)=>{let abs=0,n=0,diff=0;for(let y=box[1];y<box[3];y++)"+
    "for(let x=box[0];x<box[2];x++){const p=(y*384+x)*4;"+
    "let changed=false;for(let c=0;c<3;c++){abs+=Math.abs(a[p+c]-b[p+c]);n++;"+
    "if(a[p+c]!==b[p+c])changed=true;}if(changed)diff++;}return {mae:abs/n,changedPixels:diff};};"+
    "const rows=frames.map((f,i)=>{const roi={};"+
    "for(const [name,rect] of Object.entries(rects)){roi[name]={"+
    "mae:score(ref,f,rect).mae,changedPixels:score(frames[0],f,rect).changedPixels};}"+
    "return {index:i,roi};});"+
    "const base=rows[0],valid=rows.filter(r=>"+
    "['cannon','furnace','costs','dock'].every(k=>r.roi[k].changedPixels===0)&&"+
    "r.roi.full.mae<=base.roi.full.mae+.1&&"+
    "r.roi.plaque.mae<=base.roi.plaque.mae+.1);"+
    "valid.sort((a,b)=>(a.roi.plaque.mae*.6+a.roi.plaqueJoin.mae*.3+a.roi.full.mae*.1)-"+
    "(b.roi.plaque.mae*.6+b.roi.plaqueJoin.mae*.3+b.roi.full.mae*.1));"+
    "const winner=valid[0]||base;"+
    "const grid=document.createElement('canvas');grid.width=1536;grid.height=512;"+
    "const g=grid.getContext('2d');g.drawImage(source,0,0);"+
    "g.drawImage(imgs[0],384,0);g.drawImage(imgs[winner.index],768,0);"+
    "g.drawImage(source,1152,0);g.globalAlpha=.5;g.drawImage(imgs[winner.index],1152,0);"+
    "return {rows,winner:winner.index,rects,montage:grid.toDataURL('image/png').split(',')[1]};})()";
  const tonalResult=await evaluate(tonalScript);
  assert.equal(tonalResult.rows.length,tonalCandidates.length,'all original-frame pigment variants compared');
  for(const row of tonalResult.rows){
    for(const key of ['cannon','furnace','costs','dock'])
      assert.equal(row.roi[key].changedPixels,0,key+' protected original pixels across all variants');
  }
  const tonalWinner=tonalResult.rows[tonalResult.winner];
  const tonalReport={
    approved:false,screensApproved:0,source:'assets/design-approved/04-melhorias-forja.webp',
    viewport:'384x512',samePausedFrame:true,productionCSSUnchanged:true,
    note:'Research-only. Ship the best original-source painter ONLY after measuring ROI improvement and checking readability.',
    geometry,rects:tonalResult.rects,
    rows:tonalCandidates.map((v,i)=>({...v,...tonalResult.rows[i]})),
    candidate:tonalCandidates[tonalResult.winner],
    improvement:{
      full:tonalResult.rows[0].roi.full.mae-tonalWinner.roi.full.mae,
      plaque:tonalResult.rows[0].roi.plaque.mae-tonalWinner.roi.plaque.mae,
      join:tonalResult.rows[0].roi.plaqueJoin.mae-tonalWinner.roi.plaqueJoin.mae
    }
  };
  writeFileSync(join(qa,'work4-forge-tonal-ab-384x512.json'),JSON.stringify(tonalReport,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-forge-tonal-384x512.png'),
    Buffer.from(tonalResult.montage,'base64'));
  console.log('WORK4_FORGE_TONAL_AB '+JSON.stringify({
    candidate:tonalReport.candidate,improvement:tonalReport.improvement,
    summary:tonalReport.rows.map(x=>({id:x.id,full:x.roi.full.mae,
      plaque:x.roi.plaque.mae,join:x.roi.plaqueJoin.mae,
      cannon:x.roi.cannon.changedPixels,furnace:x.roi.furnace.changedPixels}))
  }));

  // WORK4/#104: reference 04 has the cannon improvement heading beside its
  // actual illustrated medal. Compare local plate composition within ONE
  // paused Chromium 384x512 scene; do not substitute dummy money/levels.
  // These are diagnostic CSS injections; runtime styling is not touched here.
  const headerSel='.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description';
  const gridVariant=(badge:number,titleSize:number)=>[
    headerSel+'{display:grid!important;grid-template-columns:'+ (badge+6) +'px minmax(0,1fr)!important;grid-template-rows:14px 23px 19px auto!important;column-gap:4px!important;row-gap:0!important;align-content:start!important;padding:6px 6px 7px!important;}',
    headerSel+' > .w4-forge-medallion{grid-column:1!important;grid-row:1/4!important;width:'+badge+'px!important;height:'+badge+'px!important;align-self:start!important;margin:0!important;}',
    headerSel+' > span{grid-column:2!important;grid-row:1!important;align-self:end!important;white-space:nowrap!important;font-size:7px!important;line-height:1!important;}',
    headerSel+' > h3{grid-column:2!important;grid-row:2!important;margin:0!important;align-self:center!important;font-size:'+titleSize+'px!important;line-height:1!important;}',
    headerSel+' > strong{grid-column:2!important;grid-row:3!important;align-self:center!important;font-size:15px!important;line-height:1!important;}',
    headerSel+' > .w4-forge-live-levels{grid-column:1/-1!important;grid-row:4!important;margin-top:5px!important;}'
  ].join('');
  const headerCandidates=[
    {id:'release',rules:'',title:null},
    {id:'canhoes-reais',rules:'',title:'Canhões Reais'},
    {id:'grid-reais-40-19',rules:gridVariant(40,19),title:'Canhões Reais'},
    {id:'grid-40-19',rules:gridVariant(40,19)},
    {id:'grid-44-19',rules:gridVariant(44,19)},
    {id:'grid-44-21',rules:gridVariant(44,21)},
    {id:'grid-48-19',rules:gridVariant(48,19)},
    {id:'grid-48-21',rules:gridVariant(48,21)},
    {id:'grid-52-19',rules:gridVariant(52,19)},
    {id:'warm-iron',rules:headerSel+'{background:linear-gradient(165deg,#433322f0,#17242bf5 55%,#081821f9)!important;}'},
    {id:'source-dark',rules:headerSel+'{background:linear-gradient(170deg,#232524f2,#0a1c29f6 70%,#061221fc)!important;}'},
  ];
  const headerShots:string[]=[];
  for(const candidate of headerCandidates){
    const rule=candidate.rules;
    const title=candidate.title??'Canhões';
    await evaluate("(()=>{const t=document.querySelector('.w4-forge-description > h3');if(!t)throw Error('Forge heading missing');t.textContent="+JSON.stringify(title)+";return true})()");
    await evaluate("(()=>{let e=document.getElementById('work4-forge-header-study');"+
      "if(!e){e=document.createElement('style');e.id='work4-forge-header-study';document.head.append(e);}"+
      "e.textContent="+JSON.stringify(rule)+";return true;})()");
    await delay(120);
    headerShots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  await evaluate("(()=>{document.getElementById('work4-forge-header-study')?.remove();document.querySelector('.w4-forge-description > h3').textContent='Canhões';return true})()");
  const headerPixelScript="(async()=>{const shots="+JSON.stringify(headerShots)+
    ";const original='data:image/webp;base64,"+reference+"';"+
    "const load=async(src)=>{const i=new Image();i.src=src;await i.decode();return i};"+
    "const [ref,...images]=await Promise.all([load(original),...shots.map(s=>load('data:image/png;base64,'+s))]);"+
    "if([ref,...images].some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 only');"+
    "const pix=img=>{const cv=document.createElement('canvas');cv.width=384;cv.height=512;"+
    "const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const base=pix(ref),frames=images.map(pix),boxes={full:[0,0,384,512],"+
    "plaque:[179,165,373,333],heading:[183,180,363,267],"+
    "cannon:[18,153,175,305],furnace:[129,168,171,294],"+
    "costs:[16,342,375,430],dock:[0,453,384,512]};"+
    "const calc=(a,b,box)=>{let err=0,n=0,changed=0;for(let y=box[1];y<box[3];y++)"+
    "for(let x=box[0];x<box[2];x++){const p=(y*384+x)*4;let different=false;"+
    "for(let k=0;k<3;k++){err+=Math.abs(a[p+k]-b[p+k]);n++;if(a[p+k]!==b[p+k])different=true;}"+
    "if(different)changed++;}return {mae:err/n,changedPixels:changed}};"+
    "const rows=frames.map((f,i)=>({index:i,metrics:Object.fromEntries(Object.entries(boxes).map(([name,box])=>[name,"+
    "{mae:calc(base,f,box).mae,changedPixels:calc(frames[0],f,box).changedPixels}]))}));"+
    "const b=rows[0],valid=rows.filter(r=>['cannon','furnace','costs','dock'].every(k=>r.metrics[k].changedPixels===0)&&"+
    "r.metrics.full.mae<=b.metrics.full.mae&&r.metrics.plaque.mae<b.metrics.plaque.mae);"+
    "valid.sort((a,b)=>a.metrics.heading.mae-b.metrics.heading.mae||a.metrics.full.mae-b.metrics.full.mae);"+
    "const best=valid[0]||rows[0];"+
    "const cv=document.createElement('canvas');cv.width=1536;cv.height=512;const g=cv.getContext('2d');"+
    "g.drawImage(ref,0,0);g.drawImage(images[0],384,0);g.drawImage(images[best.index],768,0);"+
    "g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(images[best.index],1152,0);"+
    "return {rows,winner:best.index,boxes,montage:cv.toDataURL('image/png').split(',')[1]};})()";
  const headerResult=await evaluate(headerPixelScript);
  assert.equal(headerResult.rows.length,headerCandidates.length);
  // A candidate may extend into the cannon edge. Measure that honestly and
  // reject it from the safe winner gate, rather than failing the entire study.
  for(const key of ['cannon','furnace','costs','dock'])
    assert.equal(headerResult.rows[0].metrics[key].changedPixels,0,
      'release baseline must match itself in '+key);
  const headerReport={approved:false,screensApproved:0,viewport:'384x512',samePausedFrame:true,
    reference:'04-melhorias-forja.webp',safeWinner:headerCandidates[headerResult.winner].id,
    variants:headerCandidates.map((item,i)=>({id:item.id,...headerResult.rows[i]})),boxes:headerResult.boxes};
  writeFileSync(join(qa,'work4-forge-header-study-384x512.json'),JSON.stringify(headerReport,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-forge-header-384x512.png'),
    Buffer.from(headerResult.montage,'base64'));
  console.log('WORK4_FORGE_HEADER_STUDY '+JSON.stringify({safeWinner:headerReport.safeWinner,
    candidates:headerReport.variants.map(x=>({id:x.id,full:x.metrics.full.mae,
      plaque:x.metrics.plaque.mae,heading:x.metrics.heading.mae,
      cannonChanges:x.metrics.cannon.changedPixels,costsChanges:x.metrics.costs.changedPixels}))}));

});
