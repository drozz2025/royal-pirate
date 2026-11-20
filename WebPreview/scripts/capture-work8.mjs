/* WORK8 only: browser screenshots + responsive visual gates for mosaics 07/08.
 * Uses Node 22 + installed Chrome, no browser library, paid API or mock UI. */
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,rm,mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
const origin=process.env.PORTO_PREVIEW_URL || 'http://127.0.0.1:4178/royal-pirate/';
const out=process.env.WORK8_CAPTURE_DIR || 'work8-qa';
const chromeBin=process.env.CHROME_BIN || 'google-chrome';
const profile=await mkdtemp(join(tmpdir(),'royal-work8-'));
const port=9248;
const chrome=spawn(chromeBin,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader',
  '--use-gl=angle','--use-angle=swiftshader','--remote-allow-origins=*',
  '--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'
],{stdio:'ignore'});
let ws;
try {
  await mkdir(out,{recursive:true});
  let pages;
  for(let n=0;n<100;n++){
    try {
      const response=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(1000)});
      if(response.ok){pages=await response.json();break}
    } catch {}
    if(chrome.exitCode!==null)throw Error('Chrome ended before CDP was ready');
    await delay(150);
  }
  const page=pages?.find(p=>p.type==='page');
  if(!page)throw Error('No Chrome CDP page');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  const pending=new Map();
  let seq=0;
  ws.addEventListener('message',event=>{
    const result=JSON.parse(event.data);
    if(!result.id)return;
    const p=pending.get(result.id);
    if(p){pending.delete(result.id);result.error?p.reject(Error(result.error.message)):p.resolve(result.result)}
  });
  const command=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;
    const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timed out: '+method))},18000);
    pending.set(id,{resolve:v=>{clearTimeout(timeout);resolve(v)},reject:e=>{clearTimeout(timeout);reject(e)}});
    ws.send(JSON.stringify({id,method,params}));
  });
  await command('Page.enable');
  await command('Runtime.enable');
  const evaluate=async expression=>{
    const response=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(response.exceptionDetails)throw Error('Browser JS exception: '+response.exceptionDetails.text);
    return response.result?.value;
  };
  const expect=async selector=>{
    for(let n=0;n<60;n++){
      if(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')'))return;
      await delay(125);
    }
    throw Error('Missing interactive component '+selector);
  };
  const capture=async file=>{
    const img=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    await writeFile(join(out,file),Buffer.from(img.data,'base64'));
    return img.data;
  };
  const report=[];
  const originalFiles={missions:'07-missoes.webp',ranking:'08-ranking-perfil.webp'};
  const comparison=async(screen,screenshot,vp)=>{
    const original=await readFile(new URL('../../assets/design-approved/'+originalFiles[screen],import.meta.url));
    const referenceUrl='data:image/webp;base64,'+original.toString('base64');
    const actualUrl='data:image/png;base64,'+screenshot;
    const screenshotCompare=await evaluate('(async()=>{'+
      'const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src});'+
      'const [original,actual]=await Promise.all([load('+JSON.stringify(referenceUrl)+'),load('+JSON.stringify(actualUrl)+')]);'+
      'const w='+vp.width+',h='+vp.height+',canvas=document.createElement("canvas");canvas.width=3*w;canvas.height=h;'+
      'const ctx=canvas.getContext("2d");ctx.fillStyle="#081c34";ctx.fillRect(0,0,3*w,h);'+
      'const contained=(i,col)=>{const scale=Math.min(w/i.width,h/i.height);const x=col*w+(w-i.width*scale)/2,y=(h-i.height*scale)/2;ctx.drawImage(i,x,y,i.width*scale,i.height*scale)};'+
      'contained(original,0);contained(actual,1);contained(original,2);ctx.globalAlpha=.5;contained(actual,2);'+
      'return {data:canvas.toDataURL("image/png").split(",")[1],sourceSize:[original.width,original.height],actualSize:[actual.width,actual.height]}})()');
    if(vp.width===384 && (screenshotCompare.sourceSize[0]!==384 || screenshotCompare.sourceSize[1]!==512 || screenshotCompare.actualSize[0]!==384 || screenshotCompare.actualSize[1]!==512)) throw Error('Native 384x512 comparison cannot be scaled');
    const comparisonFile=(vp.width===384?'compare-exact-':'compare-')+screen+'-'+vp.width+'x'+vp.height+'.png';
    await writeFile(join(out,comparisonFile),Buffer.from(screenshotCompare.data,'base64'));
    return {referenceSize:screenshotCompare.sourceSize,renderSize:screenshotCompare.actualSize,comparisonFile,method:vp.width===384?'unscaled original | unscaled Chromium | overlay':'contained reference | Chromium | overlay'};
  };
  for(const vp of [{width:320,height:568},{width:384,height:512},{width:390,height:844},{width:430,height:932}]){
    await command('Emulation.setDeviceMetricsOverride',{...vp,mobile:true,deviceScaleFactor:1,screenWidth:vp.width,screenHeight:vp.height});
    for(const screen of ['missions','ranking']){
      await command('Page.navigate',{url:origin});
      await expect('.harbour-screen .harbour-nav-item');
      await delay(500);
      const selected=await evaluate('(()=>{const buttons=[...document.querySelectorAll(".harbour-screen button")];'+
        (screen==='missions'
          ?'const button=buttons.find(b=>b.textContent?.includes("MISSÕES"));'
          :'const button=document.querySelector(".harbour-screen .harbour-nav-item:nth-child(5)");')+
        'if(!button)return false;button.click();return true})()');
      if(!selected)throw Error('Cannot reach '+screen+' from real Porto UI');
      await expect(screen==='missions'?'.w8-approved-missions .w8-approved-quest-list':'.w8-approved-ranking .w8-approved-leaderboard');
      await delay(220);
      const layout=await evaluate('(()=>{const q=s=>document.querySelector(s),rect=e=>{const r=e?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom}:null};'+
        'const nav=q(".app-sheet > .harbour-nav"),app=q(".app-sheet-content"),screen=q(".w8-approved");'+
        'return {width:innerWidth,height:innerHeight,docWidth:document.documentElement.scrollWidth,'+
        'appWidth:app?.clientWidth,appScrollWidth:app?.scrollWidth,screenWidth:screen?.clientWidth,'+
        'quests:document.querySelectorAll(".w8-approved-quest").length,days:document.querySelectorAll(".w8-approved-days li").length,'+
        'localPlaces:document.querySelectorAll(".w8-approved-local-row").length,'+
        'emptyPlaces:document.querySelectorAll(".w8-approved-empty-rank").length,'+
        'nav:rect(nav),navItems:nav?.querySelectorAll(".harbour-nav-item").length,'+
        'hasGlobalRanks:!!q("[data-global-ranking-live]")}})()');
      const fits=layout.docWidth<=vp.width+2 && layout.appScrollWidth<=layout.appWidth+2 &&
        layout.nav?.left>=-2 && layout.nav?.right<=vp.width+2 &&
        Math.abs(layout.nav?.bottom-vp.height)<=2 && layout.navItems===5;
      const structure=screen==='missions'?layout.quests===3&&layout.days===7:
        layout.localPlaces===1&&layout.emptyPlaces===4&&!layout.hasGlobalRanks;
      const file=screen+'-mobile-'+vp.width+'x'+vp.height+'.png';
      const shot=await capture(file);
      const detail={screen,viewport:vp,file,fits,structure,layout};
      if(vp.width===390 || (vp.width===384&&vp.height===512))Object.assign(detail,await comparison(screen,shot,vp));
      report.push(detail);
      if(!fits||!structure)throw Error(screen+' responsive gate failed: '+JSON.stringify(detail));
    }
  }
  await writeFile(join(out,'work8-report.json'),JSON.stringify({
    scope:'WORK8 approved 07/08; real responsive screenshots and visual comparisons; human approval still required',
    viewportChecks:report,approved:false
  },null,2));
  console.log('WORK8: 8 screenshots, exact 384x512 references, full nav and visible page checks passed.');
} finally {
  if(ws){try{ws.close()}catch{}}
  chrome.kill('SIGTERM');
  await delay(250);
  if(chrome.exitCode===null)chrome.kill('SIGKILL');
  await rm(profile,{recursive:true,force:true});
}
