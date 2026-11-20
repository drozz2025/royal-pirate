import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

/* WORK8 / #104 — exact source/native Chromium controlled tab A/B.
   The real three missions and seven rewards remain untouched; the only
   candidate is a root-opt-out-isolated paint filter of the two INACTIVE category tabs. */
test('WORK8 07 source-light inactive navy: real Chromium same-frame A/B and touch', {timeout:240000}, async()=>{
  await delay(55000); // avoid simultaneous expensive Chromium sessions
  const chrome=process.env.CHROME_BIN ||
    spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).stdout.trim();
  assert.ok(chrome,'native Chromium must be available; no simulated visual pass');
  const refs=[
    '00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp',
    '04-melhorias-forja.webp','05-cartas.webp','06-loja.webp',
    '07-missoes.webp','08-ranking-perfil.webp'
  ];
  for(const f of refs)assert.ok(existsSync(new URL('../../assets/design-approved/'+f,import.meta.url)),
    'missing approved image '+f);
  const built=spawnSync('npm',['run','build','--','--base=/'],{encoding:'utf8',timeout:120000});
  assert.equal(built.status,0,'must screenshot production build '+built.stderr);
  const folder='work8-qa';mkdirSync(folder,{recursive:true});
  const profile=mkdtempSync(join(tmpdir(),'rp-work8-tabs-'));
  const port=4193,debugPort=13300+(process.pid%2000);
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
  let browser:any,ws:any;
  try{
    let ready=false;
    for(let i=0;i<110;i++){
      try{const r=await fetch('http://127.0.0.1:'+port+'/');if(r.ok){ready=true;break;}}catch{}
      await delay(125);
    }
    assert.ok(ready,'production Vite preview is required');
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--remote-debugging-port='+debugPort,'--remote-allow-origins=*',
      '--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
    let pages:any;
    for(let i=0;i<125;i++){
      try{const r=await fetch('http://127.0.0.1:'+debugPort+'/json/list');if(r.ok){pages=await r.json();break;}}catch{}
      await delay(130);
    }
    const page=pages?.find((p:any)=>p.type==='page');assert.ok(page,'real native Chromium page required');
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((ok,fail)=>{ws.addEventListener('open',()=>ok(),{once:true});ws.addEventListener('error',fail,{once:true});});
    let seq=0;
    const pending=new Map<number,{ok:(a:any)=>void,fail:(e:Error)=>void}>();
    ws.addEventListener('message',(e:any)=>{
      const data=JSON.parse(e.data.toString()),p=pending.get(data.id);
      if(p){pending.delete(data.id);data.error?p.fail(Error(data.error.message)):p.ok(data.result);}
    });
    const cmd=(method:string,params:any={})=>new Promise<any>((ok,fail)=>{
      const n=++seq,timeout=setTimeout(()=>{pending.delete(n);fail(Error('CDP timeout '+method));},18000);
      pending.set(n,{ok:v=>{clearTimeout(timeout);ok(v)},fail:e=>{clearTimeout(timeout);fail(e)}});
      ws.send(JSON.stringify({id:n,method,params}));
    });
    const evaluate=async(source:string)=>{
      const result=await cmd('Runtime.evaluate',{expression:source,awaitPromise:true,returnByValue:true});
      assert.ok(!result.exceptionDetails,'Chromium JavaScript error '+result.exceptionDetails?.text);
      return result.result?.value;
    };
    const viewport=async(width:number,height:number)=>{
      await cmd('Emulation.setDeviceMetricsOverride',{width,height,mobile:true,deviceScaleFactor:1,screenWidth:width,screenHeight:height});
      await delay(160);
    };
    const screenshot=async()=> (await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
    const layout=()=>evaluate('(()=>{const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height}:null};const q=s=>document.querySelector(s);return {tabs:[...document.querySelectorAll(".w8-approved-tabs button")].map(rect),days:[...document.querySelectorAll(".w8-approved-days li")].map(rect),chests:[...document.querySelectorAll(".w8-approved-days .w8-approved-chest")].map(rect),captions:[...document.querySelectorAll(".w8-approved-days li small")].map(rect),questButtons:[...document.querySelectorAll(".w8-approved-quest button")].map(rect),quests:document.querySelectorAll(".w8-approved-quest").length,rewards:document.querySelectorAll(".w8-approved-days li").length,dockCount:document.querySelectorAll(".app-sheet > .harbour-nav .harbour-nav-item").length,dock:rect(q(".app-sheet > .harbour-nav")),inactiveFilter:getComputedStyle(q(".w8-approved-tabs button[aria-pressed=false]")).filter,scrollWidth:document.documentElement.scrollWidth}})()');
    await cmd('Page.enable');await cmd('Runtime.enable');
    await viewport(384,512);
    await cmd('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});
    for(let i=0;i<70;i++){
      if(await evaluate('!!document.querySelector(".harbour-screen .harbour-nav-item")'))break;
      await delay(120);
    }
    assert.ok(await evaluate('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(x=>x.textContent?.includes("MISSÕES"));b?.click();return !!b})()'),'real Porto→Missões navigation');
    for(let i=0;i<70;i++){
      if(await evaluate('!!document.querySelector(".w8-approved-missions .w8-approved-days")'))break;
      await delay(120);
    }
    assert.ok(await evaluate('!!document.querySelector(".w8-approved-missions .w8-approved-days")'));
    const decoded=await evaluate('(async()=>{const refs=[...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(x=>x.getAttribute("href")).filter(Boolean);await Promise.all([...new Set(refs)].map(src=>{const i=new Image();i.src=src;return i.decode()}));await document.fonts.ready;return refs.length})()');
    assert.ok(decoded>=8,'all source-painted authentic decorations must decode');
    await delay(280);
    await evaluate('(()=>{document.querySelectorAll("*").forEach(e=>e.getAnimations?.().forEach(a=>a.pause()));return true})()');
    const baselineClass='work8-missions-tabs-source-depth-ab-baseline';
    await evaluate('document.documentElement.classList.add('+JSON.stringify(baselineClass)+');true');
    await delay(700); // let the real native CSS filter transition settle fully
    const beforeLayout=await layout(),before=await screenshot();
    await evaluate('document.documentElement.classList.remove('+JSON.stringify(baselineClass)+');true');
    await delay(700); // identical settled frame; no mid-transition MAE samples
    const afterLayout=await layout(),after=await screenshot();
    const original=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
    const compareExpression='(async()=>{'+
      'const urls='+JSON.stringify(['data:image/webp;base64,'+original,'data:image/png;base64,'+before,'data:image/png;base64,'+after])+';'+
      'const pics=await Promise.all(urls.map(s=>new Promise((ok,err)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=err;i.src=s})));'+
      'if(pics.some(p=>p.width!==384||p.height!==512))throw Error("exact native 384x512 reference+captures only");'+
      'const pix=pics.map(p=>{const c=document.createElement("canvas");c.width=384;c.height=512;const x=c.getContext("2d");x.drawImage(p,0,0);return x.getImageData(0,0,384,512).data});'+
      'const regions={full:[0,0,384,512],inactiveTabs:[144,118,370,154],tabs:[16,116,371,155],quests:[12,155,372,321],chests:[20,356,370,427],header:[0,0,384,70],dock:[0,451,384,512]};'+
      'function mae(a,b,r){let s=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const p=4*(384*y+x);for(let z=0;z<3;z++){s+=Math.abs(a[p+z]-b[p+z]);n++}}return s/n}'+
      'const scores=Object.fromEntries(Object.entries(regions).map(([k,r])=>{const base=mae(pix[0],pix[1],r),candidate=mae(pix[0],pix[2],r);return [k,{before:base,after:candidate,delta:candidate-base,pixelDiff:mae(pix[1],pix[2],r)}]}));'+
      'const c=document.createElement("canvas");c.width=1536;c.height=512;const x=c.getContext("2d");pics.forEach((im,n)=>x.drawImage(im,n*384,0));x.drawImage(pics[0],1152,0);x.globalAlpha=.5;x.drawImage(pics[2],1152,0);return {scores,montage:c.toDataURL("image/png").split(",")[1]}})()';
    const result=await evaluate(compareExpression);
    for(const [name,data] of [['BEFORE',before],['RENDER',after],['ORIGINAL-BEFORE-RENDER-OVERLAY',result.montage]]){
      writeFileSync(join(folder,'work8-07-tabs-'+name+'-384x512.png'),Buffer.from(data as string,'base64'));
    }
    const evidence={base:'work6/web-3d-preview',issue:104,screen:'07 Missões ONLY',
      source:'assets/design-approved/07-missoes.webp',allReferences:refs,
      scene:'same genuine Chromium tab/frame and production CSS; DPR1; decoded original art; paused animations',
      viewport:{width:384,height:512,dpr:1},before:beforeLayout,after:afterLayout,roi:result.scores,
      approved:false,approvedScreens:0};
    writeFileSync(join(folder,'work8-07-tabs-native-mae-roi.json'),JSON.stringify(evidence,null,2));
    console.log('WORK8_07_NATIVE_TABS_AB '+JSON.stringify(evidence));
    assert.equal(beforeLayout.quests,3);assert.equal(afterLayout.quests,3);
    assert.equal(beforeLayout.rewards,7);assert.equal(afterLayout.rewards,7);
    assert.equal(beforeLayout.dockCount,5);assert.equal(afterLayout.dockCount,5);
    assert.ok(afterLayout.scrollWidth<=386);
    assert.deepEqual(beforeLayout.tabs,afterLayout.tabs,'three category tab hit targets unchanged');
    assert.deepEqual(beforeLayout.days,afterLayout.days,'seven reward slots unchanged');
    assert.deepEqual(beforeLayout.chests,afterLayout.chests,'seven chest positions unchanged');
    assert.deepEqual(beforeLayout.captions,afterLayout.captions,'all seven captions unchanged');
    assert.deepEqual(beforeLayout.questButtons,afterLayout.questButtons,'mission tap targets unchanged');
    assert.deepEqual(beforeLayout.dock,afterLayout.dock,'WORK0 dock unchanged');
    assert.ok(afterLayout.chests.every((d:any)=>d.bottom<=afterLayout.dock.y+2),'no chest under dock');
    assert.ok(afterLayout.captions.every((d:any)=>d.bottom<=afterLayout.dock.y+2),'no daily label under dock');
    assert.notEqual(beforeLayout.inactiveFilter,afterLayout.inactiveFilter,'production CSS filter really changed');
    assert.ok(result.scores.inactiveTabs.delta < -0.05,'source error MUST fall in true inactive-tabs ROI');
    assert.ok(result.scores.full.delta < -0.002,'full-frame native MAE MUST improve');
    for(const roi of ['quests','chests','header','dock']){
      assert.ok(result.scores[roi].pixelDiff < 0.12,'untouched region '+roi+' must not repaint');
    }
    await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    const clickTab=async(n:number)=>{
      const b=await evaluate('(()=>{const b=document.querySelectorAll(".w8-approved-tabs button")['+n+'];const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
      await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x,y:b.y,id:1}]});
      await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await delay(180);
      assert.equal(await evaluate('document.querySelectorAll(".w8-approved-tabs button")['+n+'].getAttribute("aria-pressed")'),'true','real CDP touch selects tab');
    };
    await clickTab(1);await clickTab(2);await clickTab(0);
    assert.equal(await evaluate('document.querySelectorAll(".w8-approved-quest").length'),3);
    for(const dim of [[320,568],[390,844],[430,932]]){
      await viewport(dim[0],dim[1]);
      if(dim[0]===320){
        const state=await evaluate('(()=>{const d=document.querySelector(".w8-approved-days"),a=document.querySelector(".app-sheet-content");if(a)a.scrollTop=a.scrollHeight;if(d)d.scrollLeft=d.scrollWidth;const last=d.lastElementChild.getBoundingClientRect(),box=d.getBoundingClientRect(),nav=document.querySelector(".app-sheet>.harbour-nav").getBoundingClientRect();return {visible:last.left>=box.left-2&&last.right<=box.right+2,navBottom:nav.bottom}})()');
        assert.ok(state.visible&&Math.abs(state.navBottom-568)<=2,'320px real horizontal scroll to day7 and fixed dock');
      }
      const state=await evaluate('(()=>({width:document.documentElement.scrollWidth,quests:document.querySelectorAll(".w8-approved-quest").length,chests:document.querySelectorAll(".w8-approved-days li").length,nav:document.querySelectorAll(".app-sheet>.harbour-nav .harbour-nav-item").length,hit:[...document.querySelectorAll(".app-sheet>.harbour-nav .harbour-nav-item")].every(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest(".harbour-nav-item")===e})}))()');
      assert.ok(state.width<=dim[0]+2,'no horizontal page overflow '+dim[0]);
      assert.equal(state.quests,3);assert.equal(state.chests,7);assert.equal(state.nav,5);
      assert.ok(state.hit,'all five actual dock touch targets clear '+dim[0]);
      writeFileSync(join(folder,'work8-07-tabs-'+dim[0]+'x'+dim[1]+'.png'),Buffer.from(await screenshot(),'base64'));
    }
  }finally{
    try{ws?.close();}catch{}
    browser?.kill('SIGTERM');vite.kill('SIGTERM');await delay(150);
    if(browser?.exitCode===null)browser.kill('SIGKILL');
    if(vite.exitCode===null)vite.kill('SIGKILL');
    try{rmSync(profile,{recursive:true,force:true,maxRetries:20,retryDelay:100});}catch{}
  }
});
