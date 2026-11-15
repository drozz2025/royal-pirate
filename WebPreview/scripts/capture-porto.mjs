/**
 * Zero-dependency mobile viewport capture for the real Porto renderer.
 * Uses Chrome DevTools Protocol (Node 22 WebSocket), not a mock screenshot.
 * A failed WebGL context is recorded, never claimed as real-device QA.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const origin = process.env.PORTO_PREVIEW_URL || 'http://127.0.0.1:4173/royal-pirate/';
const out = process.env.PORTO_CAPTURE_DIR || 'porto-qa';
const chromeBinary = process.env.CHROME_BIN || 'google-chrome';
const profile = await mkdtemp(join(tmpdir(), 'royal-porto-chrome-'));
const chromePort=9231;
const chrome = spawn(chromeBinary, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-webgl', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--remote-allow-origins=*', '--remote-debugging-port=' + chromePort,
  '--user-data-dir=' + profile, 'about:blank'
], { stdio: ['ignore','ignore','pipe'] });
let chromeErrors='';
chrome.stderr.on('data', chunk=>{chromeErrors=(chromeErrors+chunk.toString()).slice(-3000);});
const events = [];
let ws;
try {
  let list;
  for (let i=0; i<80; i++) {
    if (chrome.exitCode !== null) throw new Error('Chromium quit: '+chromeErrors);
    try {
      const response=await fetch('http://127.0.0.1:' + chromePort + '/json/list',{signal:AbortSignal.timeout(600)});
      if(response.ok){list=await response.json();break;}
    } catch { /* Chrome is starting */ }
    await delay(150);
  }
  if (!list) throw new Error('Chrome debugging did not open: '+chromeErrors);
    const page = list.find(t=>t.type==='page');
  if (!page) throw new Error('No Chrome page target');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  const pending = new Map();
  let nextId=0;
  ws.addEventListener('message', e=>{
    const msg=JSON.parse(e.data);
    if (msg.method === 'Runtime.exceptionThrown') events.push(msg.params?.exceptionDetails?.text || 'JS exception');
    if(!msg.id)return;
    const callback=pending.get(msg.id);
    if(callback){pending.delete(msg.id);msg.error?callback.reject(new Error(msg.error.message)):callback.resolve(msg.result);}
  });
  const command=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++nextId;
    const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},15000);
    pending.set(id,{
      resolve:v=>{clearTimeout(timeout);resolve(v);},
      reject:e=>{clearTimeout(timeout);reject(e);}
    });
    ws.send(JSON.stringify({id,method,params}));
  });
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride',{
    width:390,height:844,deviceScaleFactor:1,mobile:true,
    screenWidth:390,screenHeight:844
  });
  await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await command('Page.navigate',{url:origin});
  const evaluate=async expression=>{
    const v=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(v.exceptionDetails)throw new Error(v.exceptionDetails.text || 'Runtime evaluation failed');
    return v.result?.value;
  };
  let ready=false;
  for(let i=0;i<40;i++){
    await delay(250);
    ready=await evaluate("!!document.querySelector('.harbour-screen')");
    if(ready)break;
  }
  if(!ready)console.warn('Porto did not mount: capturing browser diagnostics rather than claiming 3D QA');
  await delay(1800);
  const report=await evaluate(`(()=>{
    const harbour=document.querySelector('.harbour-screen');
    const canvas=document.querySelector('canvas');
    const box=el=>{const r=el.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};};
    const targets=[...(harbour?.querySelectorAll('button')||[])].map(el=>({name:el.textContent.trim().replace(/\\s+/g,' ').slice(0,50),...box(el)}));
    const center=document.elementFromPoint(innerWidth*.5,innerHeight*.48);
    const gl=canvas?.getContext('webgl2');
    return {
      url:location.href,readyState:document.readyState,bodyExcerpt:document.body.textContent.slice(0,400),error:document.querySelector('.error-panel')?.textContent||null,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      canvas:canvas?box(canvas):null,webgl2:!!gl,contextLost:gl?.isContextLost()??null,
      harbour:harbour?box(harbour):null,centerTouchTarget:center?.tagName??null,
      navbarItems:harbour?.querySelectorAll('.harbour-nav-item').length??0,
      leftActions:harbour?.querySelectorAll('.harbour-flank-left button').length??0,
      rightActions:harbour?.querySelectorAll('.harbour-flank-right button').length??0,
      touches:targets,bodyOverflow:document.documentElement.scrollWidth>innerWidth
    };
  })()`);
  report.javascriptExceptions=events;
  const screen=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  await mkdir(out,{recursive:true});
  await writeFile(join(out,'porto-mobile-390x844.png'),Buffer.from(screen.data,'base64'));
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(report.navbarItems!==5||report.leftActions!==3||report.rightActions!==3)throw new Error('Porto navigation/layout mismatch');
  if(report.bodyOverflow)throw new Error('Porto viewport scrolls horizontally');
  if(!report.webgl2||report.contextLost)console.warn('No confirmed WebGL2 context: screenshot is not proof of 3D performance');
} finally {
  if(ws){try{ws.close();}catch{}}
  chrome.kill('SIGTERM');
  await delay(250);
  if(chrome.exitCode===null)chrome.kill('SIGKILL');
  await rm(profile,{recursive:true,force:true});
}
