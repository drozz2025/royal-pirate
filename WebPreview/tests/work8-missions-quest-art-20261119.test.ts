import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

test('WORK8 #104: 07 original quest art engraving visibility, native controlled Chromium A/B', {timeout:240000}, async()=>{
  for(const f of ['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp','01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']){
    assert.ok(existsSync(new URL('../../assets/design-approved/'+f,import.meta.url)),'approved reference '+f);
  }
  const chromeBin=process.env.CHROME_BIN || spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).stdout.trim();
  assert.ok(chromeBin,'real native Chromium required');
  const dest='work8-qa';mkdirSync(dest,{recursive:true});
  const built=spawnSync('npm',['run','build','--','--base=/','--outDir=work8-quest-art-dist'],{encoding:'utf8',timeout:120000});
  assert.equal(built.status,0,'TypeScript + production Vite build required: '+built.stderr);
  const profile=mkdtempSync(join(tmpdir(),'rp-w8-quest-art-'));
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4228','--strictPort','--outDir','work8-quest-art-dist'],{stdio:'ignore'});
  let browser:ReturnType<typeof spawn>|undefined,ws:WebSocket|undefined;
  const port=11300+(process.pid%1100);
  try {
    let ready=false;
    for(let n=0;n<130;n++){
      try{if((await fetch('http://127.0.0.1:4228/')).ok){ready=true;break}}catch{}
      if(server.exitCode!==null)break;
      await delay(150);
    }
    assert.ok(ready,'production preview must be reachable locally');
    browser=spawn(chromeBin,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--remote-allow-origins=*','--remote-debugging-port='+port,
      '--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
    let pages:any[];
    for(let n=0;n<130;n++){
      try{const r=await fetch('http://127.0.0.1:'+port+'/json/list');if(r.ok){pages=await r.json();break}}catch{}
      if(browser.exitCode!==null)break;
      await delay(120);
    }
    const p=pages?.find((x:any)=>x.type==='page');
    assert.ok(p,'Chromium CDP page required');
    ws=new WebSocket(p.webSocketDebuggerUrl);
    await new Promise<void>((resolve,reject)=>{ws!.addEventListener('open',()=>resolve(),{once:true});ws!.addEventListener('error',reject,{once:true})});
    let id=0;
    const pending=new Map<number,{resolve:(v:any)=>void,reject:(e:Error)=>void}>();
    ws.addEventListener('message',(ev:any)=>{
      const msg=JSON.parse(ev.data.toString()),o=pending.get(msg.id);
      if(o){pending.delete(msg.id);msg.error?o.reject(new Error(msg.error.message)):o.resolve(msg.result)}
    });
    const cmd=(method:string,params:any={})=>new Promise<any>((resolve,reject)=>{
      const k=++id,t=setTimeout(()=>{pending.delete(k);reject(Error('CDP timeout '+method))},20000);
      pending.set(k,{resolve:v=>{clearTimeout(t);resolve(v)},reject:e=>{clearTimeout(t);reject(e)}});
      ws!.send(JSON.stringify({id:k,method,params}));
    });
    const evalJs=async(src:string)=>{
      const r=await cmd('Runtime.evaluate',{expression:src,returnByValue:true,awaitPromise:true});
      assert.ok(!r.exceptionDetails,'Chromium exception: '+r.exceptionDetails?.text);
      return r.result?.value;
    };
    const wait=async(s:string)=>{
      for(let n=0;n<90;n++){if(await evalJs('!!document.querySelector('+JSON.stringify(s)+')'))return;await delay(110)}
      throw Error('missing '+s);
    };
    const capture=async(file:string)=>{
      const data=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
      writeFileSync(join(dest,file),Buffer.from(data,'base64'));return data;
    };
    await cmd('Page.enable');await cmd('Runtime.enable');
    await cmd('Emulation.setDeviceMetricsOverride',{width:384,height:512,mobile:true,deviceScaleFactor:1,screenWidth:384,screenHeight:512});
    await cmd('Page.navigate',{url:'http://127.0.0.1:4228/'});
    await wait('.harbour-screen .harbour-nav-item');
    assert.ok(await evalJs('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(b=>b.textContent?.includes("MISSÕES"));b?.click();return !!b})()'),'real Porto-to-Missions navigation');
    await wait('.w8-approved-missions .w8-approved-quest-list');
    const decoded=await evalJs('(async()=>{const refs=[...new Set([...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(i=>i.getAttribute("href")).filter(Boolean))];await Promise.all(refs.map(async src=>{const im=new Image();im.src=src;await im.decode()}));await document.fonts.ready;document.querySelectorAll("*").forEach(el=>el.getAnimations?.().forEach(a=>a.pause()));return document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image").length})()');
    assert.ok(decoded>=8,'real approved art and fonts decoded before capture');
    await delay(260);
    const geo=()=>evalJs('(()=>{const rect=e=>{const r=e?.getBoundingClientRect();return r?[r.x,r.y,r.width,r.height]:null};const nav=document.querySelector(".app-sheet > .harbour-nav");const days=[...document.querySelectorAll(".w8-approved-missions .w8-approved-days li")];const quests=[...document.querySelectorAll(".w8-approved-missions .w8-approved-quest")];return {days:days.map(rect),art:days.map(d=>rect(d.querySelector(".w8-approved-chest"))),captions:days.map(d=>rect(d.querySelector("small"))),nav:rect(nav),dockCount:nav?.querySelectorAll(".harbour-nav-item").length,questCount:quests.length,labels:quests.map(q=>q.querySelector(".w8-approved-quest-core strong")?.textContent),rewardText:quests.map(q=>[...q.querySelectorAll(".w8-approved-quest-rewards strong")].map(x=>x.textContent)),dayLabels:days.map(d=>d.textContent),width:document.documentElement.scrollWidth}})()');
    const flag='work8-missions-quest-icons-luma-ab-baseline';
    await evalJs('document.documentElement.classList.add('+JSON.stringify(flag)+');true');await delay(160);
    const beforeGeo=await geo(),before=await capture('missions-quest-art-before-384x512.png');
    await evalJs('document.documentElement.classList.remove('+JSON.stringify(flag)+');true');await delay(160);
    const afterGeo=await geo(),after=await capture('missions-quest-art-render-384x512.png');
    assert.deepEqual(afterGeo,beforeGeo,'pigment-only change must leave mission values and all hitboxes unchanged');
    assert.equal(afterGeo.questCount,3);assert.equal(afterGeo.days.length,7);assert.equal(afterGeo.dockCount,5);
    assert.ok(afterGeo.width<=386,'no horizontal overflow 384');
    assert.ok(afterGeo.days.every((r:number[])=>r[0]>=-1&&r[0]+r[2]<=385),'seven rewards inside 384');
    assert.ok(afterGeo.captions.every((r:number[])=>r&&r[1]+r[3]<=afterGeo.nav[1]+2),'seven captions clear of WORK0 dock');
    const original=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
    const compute=String.raw`(async()=>{
      const load=s=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=s});
      const srcs=__DATA__;const im=await Promise.all(srcs.map(load));const w=384,h=512;
      if(im.some(i=>i.width!==w||i.height!==h))throw Error('384x512 native pixels required');
      const pixels=im.map(i=>{const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);return ctx.getImageData(0,0,w,h).data});
      const regions={full:[0,0,384,512],questArt:[16,164,73,312],chests:[20,356,371,428],daily:[12,325,373,438],quests:[12,155,373,322],header:[0,0,384,70],dock:[0,451,384,512]};
      const mae=(a,b,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let pos=(y*w+x)*4;for(let k=0;k<3;k++){sum+=Math.abs(a[pos+k]-b[pos+k]);n++}}return sum/n};
      const metrics={};for(const [name,rect] of Object.entries(regions)){const baseline=mae(pixels[0],pixels[1],rect),render=mae(pixels[0],pixels[2],rect);metrics[name]={baseline,render,delta:render-baseline}};
      const unchanged={header:mae(pixels[1],pixels[2],regions.header),dock:mae(pixels[1],pixels[2],regions.dock),daily:mae(pixels[1],pixels[2],regions.daily)};
      const c=document.createElement('canvas');c.width=4*w;c.height=h;const t=c.getContext('2d');
      for(let i=0;i<3;i++)t.drawImage(im[i],i*w,0);
      t.drawImage(im[0],3*w,0);t.globalAlpha=.5;t.drawImage(im[2],3*w,0);
      return {metrics,unchanged,comparison:c.toDataURL('image/png').split(',')[1]};
    })()`;
    const prepared=compute.replace('__DATA__',JSON.stringify(['data:image/webp;base64,'+original,'data:image/png;base64,'+before,'data:image/png;base64,'+after]));
    const m=await evalJs(prepared);
    writeFileSync(join(dest,'missions-quest-art-original-before-render-overlay-384x512.png'),Buffer.from(m.comparison,'base64'));
    const report={approved:false,approvedScreens:0,base:'current exact branch HEAD',frame:'same DOM, decoded originals, paused animations, native Chromium 384x512',reference:'assets/design-approved/07-missoes.webp',roi:m.metrics,unchanged:m.unchanged,beforeGeo,afterGeo};
    writeFileSync(join(dest,'missions-quest-art-mae-roi.json'),JSON.stringify(report,null,2));
    console.log('WORK8 #104 native 07 three real quest paintings A/B: '+JSON.stringify({roi:m.metrics,unchanged:m.unchanged}));
    assert.ok(m.metrics.full.delta<0 && m.metrics.questArt.delta<0 && m.metrics.quests.delta<0 && m.metrics.daily.delta<=0,'MAE must strictly improve globally and on original quest-painting ROI');
    assert.ok(m.unchanged.dock<.1 && m.unchanged.header<.1 && m.unchanged.daily<.1,'outside quest art must be pixel unchanged');
    const rect=await evalJs('(()=>{const x=document.querySelector(".w8-approved-tabs button:nth-child(2)").getBoundingClientRect();return [x.left+x.width/2,x.top+x.height/2]})()');
    await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect[0],y:rect[1]}]});
    await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await delay(150);
    assert.ok(await evalJs('document.querySelector(".w8-approved-tabs button:nth-child(2)").getAttribute("aria-pressed")==="true"'),'real weekly tab responds to touch');
    const t=await evalJs('(()=>{const x=document.querySelector(".w8-approved-tabs button:nth-child(1)").getBoundingClientRect();return [x.left+x.width/2,x.top+x.height/2]})()');
    await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:t[0],y:t[1]}]});
    await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await delay(150);
    assert.ok(await evalJs('document.querySelector(".w8-approved-tabs button:nth-child(1)").getAttribute("aria-pressed")==="true"'),'real daily tab responds to touch');
    for(const vp of [{width:320,height:568},{width:390,height:844},{width:430,height:932}]){
      await cmd('Emulation.setDeviceMetricsOverride',{...vp,mobile:true,deviceScaleFactor:1,screenWidth:vp.width,screenHeight:vp.height});
      await delay(220);
      const layout=await evalJs('(()=>{const d=[...document.querySelectorAll(".w8-approved-days li")],nav=document.querySelector(".app-sheet > .harbour-nav"),scroll=document.querySelector(".w8-approved-days");d[6].scrollIntoView({block:"nearest",inline:"end",behavior:"instant"});const r=d[6].getBoundingClientRect(),s=scroll.getBoundingClientRect(),n=nav.getBoundingClientRect();return {days:d.length,quests:document.querySelectorAll(".w8-approved-quest").length,dock:nav.querySelectorAll(".harbour-nav-item").length,width:document.documentElement.scrollWidth,day7Visible:r.left>=s.left-2&&r.right<=s.right+2,day7AboveDock:r.bottom<=n.top+2,scrollLeft:scroll.scrollLeft}})()');
      assert.equal(layout.days,7);assert.equal(layout.quests,3);assert.equal(layout.dock,5);
      assert.ok(layout.width<=vp.width+2,'no horizontal overflow at '+vp.width);
      if(vp.width===320)assert.ok(layout.day7Visible&&layout.day7AboveDock,'320 scroll exposes seventh chest above dock');
      await capture('missions-quest-art-'+vp.width+'x'+vp.height+'.png');
      console.log('WORK8 viewport '+vp.width+'x'+vp.height+': '+JSON.stringify(layout));
    }
  }finally{
    try{ws?.close()}catch{}
    browser?.kill('SIGTERM');server.kill('SIGTERM');await delay(200);
    if(browser?.exitCode===null)browser.kill('SIGKILL');
    if(server.exitCode===null)server.kill('SIGKILL');
    try{rmSync(profile,{recursive:true,force:true,maxRetries:20,retryDelay:200})}catch(e){console.warn('temp profile cleanup deferred '+String(e))}
  }
});