import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,existsSync,readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';

// WORK8 issue #104: same real Chromium DOM, paused same frame, source image MAE.
// Only seven genuine daily rewards. No fake game state; WORK0 controls releases.
test('07 native 384x512 seven-reward paint gate and 320 touch/scroll', {timeout:240000}, async()=>{
  const refs=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
    '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
  for(const name of refs)assert.ok(existsSync(new URL('../../assets/design-approved/'+name,import.meta.url)));
  const chromeBin=process.env.CHROME_BIN ||
    spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).stdout.trim();
  assert.ok(chromeBin,'native Chromium required for this test');
  const evidence='work8-qa';mkdirSync(evidence,{recursive:true});
  const build=spawnSync('npm',['run','build','--','--base=/','--outDir=work8-daily-native-dist'],
    {encoding:'utf8',timeout:120000});
  assert.equal(build.status,0,'build failed '+build.stdout+'\n'+build.stderr);
  const profile=mkdtempSync(join(tmpdir(),'royal-work8-daily-'));
  const port=4190+(process.pid%800),debug=9450+(process.pid%800);
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
    '--outDir','work8-daily-native-dist','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
  let chrome:ReturnType<typeof spawn>|undefined,ws:WebSocket|undefined;
  try{
    let ready=false;
    for(let i=0;i<100;i++){
      try{if((await fetch('http://127.0.0.1:'+port+'/')).ok){ready=true;break;}}catch{}
      if(vite.exitCode!==null)break;
      await delay(150);
    }
    assert.ok(ready,'local built app preview unavailable');
    chrome=spawn(chromeBin,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--remote-debugging-port='+debug,'--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
    let page:any;
    for(let i=0;i<100;i++){
      try{const res=await fetch('http://127.0.0.1:'+debug+'/json/list');
        if(res.ok){page=(await res.json()).find((x:any)=>x.type==='page');if(page)break;}}catch{}
      if(chrome.exitCode!==null)break;
      await delay(140);
    }
    assert.ok(page,'native Chrome CDP page');
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((ok,no)=>{
      ws!.addEventListener('open',()=>ok(),{once:true});ws!.addEventListener('error',no,{once:true});
    });
    let seq=0;
    const pending=new Map<number,{ok:(v:any)=>void,no:(e:Error)=>void}>();
    ws.addEventListener('message',(e:any)=>{
      const msg=JSON.parse(e.data.toString()),p=pending.get(msg.id);if(!p)return;
      pending.delete(msg.id);msg.error?p.no(Error(msg.error.message)):p.ok(msg.result);
    });
    const cmd=(method:string,params:any={})=>new Promise<any>((ok,no)=>{
      const id=++seq,t=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout '+method));},25000);
      pending.set(id,{ok:v=>{clearTimeout(t);ok(v)},no:e=>{clearTimeout(t);no(e)}});
      ws!.send(JSON.stringify({id,method,params}));
    });
    const ev=async(expression:string)=>{
      const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      assert.ok(!r.exceptionDetails,'browser eval '+r.exceptionDetails?.text);
      return r.result.value;
    };
    const cap=async()=>(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
    const save=(name:string,base64:string)=>writeFileSync(join(evidence,name),Buffer.from(base64,'base64'));
    const size=async(w:number,h:number)=>cmd('Emulation.setDeviceMetricsOverride',{
      width:w,height:h,screenWidth:w,screenHeight:h,mobile:true,deviceScaleFactor:1});
    const wait=async(selector:string)=>{
      for(let i=0;i<100;i++){if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;await delay(140)}
      throw Error('missing real app element '+selector);
    };
    const geometry=()=>ev('(()=>{const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null};const d=document.querySelector(".w8-approved-days"),nav=document.querySelector(".app-sheet > .harbour-nav"),daily=document.querySelector(".w8-approved-missions .w8-approved-daily");return {quests:document.querySelectorAll(".w8-approved-missions .w8-approved-quest").length,days:d?.children.length,navCount:nav?.querySelectorAll(".harbour-nav-item").length,nav:rect(nav),chests:[...document.querySelectorAll(".w8-approved-days .w8-approved-chest")].map(rect),captions:[...document.querySelectorAll(".w8-approved-days li small")].map(rect),dayText:[...d.querySelectorAll("li")].map(x=>x.textContent),questText:[...document.querySelectorAll(".w8-approved-quest")].map(x=>x.textContent),dailyFilter:getComputedStyle(daily).filter,docWidth:document.documentElement.scrollWidth};})()');
    await cmd('Page.enable');await cmd('Runtime.enable');await size(384,512);
    await cmd('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});
    await wait('.harbour-screen .harbour-nav-item');
    assert.ok(await ev('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(x=>x.textContent?.includes("MISSÕES"));if(!b)return false;b.click();return true;})()'));
    await wait('.w8-approved-missions .w8-approved-daily');
    const art=await ev('(async()=>{const urls=[...new Set([...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(x=>x.getAttribute("href")).filter(Boolean))];await Promise.all(urls.map(async src=>{const i=new Image();i.src=src;await i.decode()}));await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());return urls.length;})()');
    assert.ok(art>=1,'shared source painting must be decoded');
    assert.equal(await ev('document.querySelectorAll(".w8-approved-days .w8-approved-chest").length'),7,'seven true reward artworks must be rendered');
    await delay(110);
    const flag='work8-missions-daily-shadow-20261119-ab-baseline';
    await ev('document.documentElement.classList.add('+JSON.stringify(flag)+');true');
    await delay(180);
    const beforeGeometry=await geometry(),before=await cap();
    await ev('document.documentElement.classList.remove('+JSON.stringify(flag)+');true');
    await delay(180);
    const renderGeometry=await geometry(),render=await cap();
    const original=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url));
    const urls=['data:image/webp;base64,'+original.toString('base64'),
      'data:image/png;base64,'+before,'data:image/png;base64,'+render];
    const compare='(async()=>{const urls=__URLS__,w=384,h=512;const images=await Promise.all(urls.map(src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})));if(images.some(i=>i.width!==w||i.height!==h))throw Error("not native 384x512");const pix=images.map(i=>{const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.drawImage(i,0,0);return x.getImageData(0,0,w,h).data});const regions={full:[0,0,384,512],quests:[12,155,372,321],daily:[13,325,373,436],chests:[20,356,370,427],header:[0,0,384,70],dock:[0,451,384,512]};const mae=(a,b,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const j=4*(y*w+x);for(let k=0;k<3;k++){sum+=Math.abs(a[j+k]-b[j+k]);n++}}return sum/n};const roi={};for(const [name,r] of Object.entries(regions)){let b=mae(pix[0],pix[1],r),a=mae(pix[0],pix[2],r);roi[name]={before:b,render:a,delta:a-b,changed:mae(pix[1],pix[2],r)}}const c=document.createElement("canvas");c.width=w*4;c.height=h;let ctx=c.getContext("2d");images.forEach((i,n)=>ctx.drawImage(i,n*w,0));ctx.drawImage(images[0],3*w,0);ctx.globalAlpha=.5;ctx.drawImage(images[2],3*w,0);return {roi,montage:c.toDataURL("image/png").split(",")[1]}})()'.replace('__URLS__',JSON.stringify(urls));
    const measured=await ev(compare);
    save('work8-20261119-07-ORIGINAL-384x512.webp',original.toString('base64'));
    save('work8-20261119-07-BEFORE-384x512.png',before);
    save('work8-20261119-07-RENDER-384x512.png',render);
    save('work8-20261119-07-ORIGINAL-BEFORE-RENDER-OVERLAY-384x512.png',measured.montage);
    assert.notEqual(beforeGeometry.dailyFilter,renderGeometry.dailyFilter,'candidate CSS must be active');
    const {dailyFilter:one,...baseLayout}=beforeGeometry;
    const {dailyFilter:two,...finalLayout}=renderGeometry;
    assert.deepEqual(finalLayout,baseLayout,'same scene/frame, unchanged real hitboxes and text');
    assert.equal(renderGeometry.quests,3);assert.equal(renderGeometry.days,7);assert.equal(renderGeometry.navCount,5);
    assert.ok(renderGeometry.chests.every((c:any)=>c.bottom<=renderGeometry.nav.y+2),'all seven chests above dock');
    assert.ok(measured.roi.full.delta<0&&measured.roi.daily.delta<0,'global and daily source MAE must improve');
    for(const area of ['quests','header','dock'])assert.ok(measured.roi[area].changed<.08,'protected ROI changed '+area);
    const report:any={base:'6f56708605fa2bf160b9463a6e37c9c3b2a838a6',
      source:'assets/design-approved/07-missoes.webp',requiredReferences:refs.map(x=>'assets/design-approved/'+x),
      scene:'same live Chromium DOM and paused frame, 384x512 DPR1',roi:measured.roi,
      beforeGeometry,renderGeometry,viewports:[],approved:false,approvedScreens:0};
    for(const [w,h] of [[320,568],[390,844],[430,932]]){
      await size(w,h);await delay(200);
      const state=await ev('(()=>{const d=document.querySelector(".w8-approved-days"),area=document.querySelector(".app-sheet-content"),tab=document.querySelector(".w8-approved-missions .w8-approved-tabs button[aria-pressed=true]"),nav=document.querySelector(".app-sheet > .harbour-nav");if(area)area.scrollTop=0;if(d)d.scrollLeft=d.scrollWidth;const last=d.lastElementChild.getBoundingClientRect(),r=d.getBoundingClientRect(),t=tab.getBoundingClientRect();return {docWidth:document.documentElement.scrollWidth,quests:document.querySelectorAll(".w8-approved-quest").length,days:d.children.length,navCount:nav.querySelectorAll(".harbour-nav-item").length,day7Visible:last.left>=r.left-2&&last.right<=r.right+2,pointer:getComputedStyle(tab).pointerEvents,touch:{x:Math.round(t.x+t.width/2),y:Math.round(t.y+t.height/2)}}})()');
      assert.ok(state.docWidth<=w+2&&state.quests===3&&state.days===7&&state.navCount===5,'responsive layout '+w);
      if(w===320)assert.ok(state.day7Visible,'seven days accessible at 320');
      assert.notEqual(state.pointer,'none');
      await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[state.touch]});
      await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await delay(100);
      assert.equal(await ev('document.querySelectorAll(".w8-approved-quest").length'),3);
      save('work8-20261119-07-'+w+'x'+h+'.png',await cap());
      report.viewports.push({width:w,height:h,...state});
    }
    writeFileSync(join(evidence,'work8-20261119-07-native-roi.json'),JSON.stringify(report,null,2));
    console.log('WORK8_DAILY_NATIVE_ROI '+JSON.stringify(measured.roi));
    console.log('WORK8_APPROVAL false / 0 of 8');
  }finally{
    try{ws?.close()}catch{}
    chrome?.kill('SIGTERM');vite.kill('SIGTERM');await delay(170);
    if(chrome?.exitCode===null)chrome.kill('SIGKILL');
    if(vite.exitCode===null)vite.kill('SIGKILL');
    rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
  }
});