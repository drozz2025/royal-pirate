import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';

const bounds:Record<string,[number,number,number,number]>={
  global:[0,0,384,512],
  left_cannon:[12,295,195,420],
  right_cannon:[226,297,376,420],
  enemy_galleon:[210,167,375,297],
  water:[7,248,375,360]
};
const sleep=(ms:number)=>new Promise<void>(ok=>setTimeout(ok,ms));
const findBinary=(name:string)=>{
  const result=spawnSync('which',[name],{encoding:'utf8'});
  return result.status===0?result.stdout.trim():'';
};
const port=async()=>{
  const s=createServer();await new Promise<void>(ok=>s.listen(0,'127.0.0.1',ok));
  const address=s.address();assert.ok(address&&typeof address!=='string');
  const n=address.port;await new Promise<void>(ok=>s.close(()=>ok()));return n;
};
async function until<T>(task:()=>Promise<T|undefined>,max=14000):Promise<T>{
  const started=Date.now();
  while(Date.now()-started<max){
    try{const result=await task();if(result!==undefined)return result;}catch{}
    await sleep(130);
  }
  throw Error('Chromium A/B visual capture not ready');
}
async function capture(request:(method:string,params?:Record<string,unknown>)=>Promise<any>,
  variant:'baseline'|'candidate',targetPort:number,ref64:string) {
  await request('Page.navigate',{url:'http://127.0.0.1:'+targetPort+'/?work6ab='+variant});
  await until(async()=>{
    const r=await request('Runtime.evaluate',{expression:'Boolean(document.querySelector(".harbour-battle-button"))',returnByValue:true});
    return r.result.value===true?true:undefined;
  });
  await request('Runtime.evaluate',{expression:'document.querySelector(".harbour-battle-button").click()',returnByValue:true});
  await until(async()=>{
    const r=await request('Runtime.evaluate',{expression:'Boolean(document.querySelector(".battle-approved-banner")&&document.querySelector(".ocean canvas"))',returnByValue:true});
    return r.result.value===true?true:undefined;
  });
  await sleep(1600);
  const shot=(await request('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
  const root=resolve('work6-qa');mkdirSync(root,{recursive:true});
  writeFileSync(join(root,'ab-'+variant+'-384x512.png'),Buffer.from(shot,'base64'));
  const code=[
    '(async()=>{',
    'const load=async(b,m)=>{const i=new Image();i.src="data:"+m+";base64,"+b;await i.decode();return i;};',
    'const a=await load('+JSON.stringify(ref64)+',"image/webp");',
    'const b=await load('+JSON.stringify(shot)+',"image/png");',
    'if(a.width!==384||a.height!==512||b.width!==384||b.height!==512)throw Error("native size mismatch");',
    'const pix=im=>{const c=document.createElement("canvas");c.width=384;c.height=512;',
    'const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(im,0,0);return x.getImageData(0,0,384,512).data;};',
    'const left=pix(a),right=pix(b),regions='+JSON.stringify(bounds)+';',
    'const metrics={};for(const [k,[x0,y0,x1,y1]] of Object.entries(regions)){let sum=0;',
    'for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){let i=(y*384+x)*4;',
    'sum+=Math.abs(left[i]-right[i])+Math.abs(left[i+1]-right[i+1])+Math.abs(left[i+2]-right[i+2]);}',
    'metrics[k]=sum/((x1-x0)*(y1-y0)*3);}',
    'const c=document.createElement("canvas");c.width=1152;c.height=512;const g=c.getContext("2d");',
    'g.drawImage(a,0,0);g.drawImage(b,384,0);const mix=g.createImageData(384,512);',
    'for(let i=0;i<left.length;i+=4){for(let j=0;j<3;j++)mix.data[i+j]=(left[i+j]+right[i+j])/2;mix.data[i+3]=255;}',
    'g.putImageData(mix,768,0);return {metrics,compare:c.toDataURL("image/png").split(",")[1]};',
    '})()'
  ].join('\n');
  const result=await request('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error('Browser image MAE failed '+JSON.stringify(result.exceptionDetails));
  const pair=result.result.value as {metrics:Record<string,number>,compare:string};
  assert.ok(pair?.metrics?.global>0,'real Chromium image MAE');
  writeFileSync(join(root,'ab-'+variant+'-reference-render-overlay.png'),Buffer.from(pair.compare,'base64'));
  return pair.metrics;
}

test('WORK6: controlled genuine Chromium 384x512 A/B with fixed wave and camera', {timeout:100000},async t=>{
  const chrome=process.env.CHROME_BIN||findBinary('google-chrome')||findBinary('chromium');
  if(!chrome){if(process.env.CI)throw Error('Chrome required in CI');t.skip('No Chromium locally');return;}
  const profile=mkdtempSync(join(tmpdir(),'royal-work6-ab-'));
  const p=await port();
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(p),'--strictPort'],{cwd:process.cwd(),stdio:'ignore'});
  const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  let socket:WebSocket|undefined;
  try{
    await until(async()=>{const r=await fetch('http://127.0.0.1:'+p+'/');return r.ok?true:undefined;},20000);
    const chromePort=await until(async()=>{
      try{const value=+readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];return value||undefined;}
      catch{return undefined;}
    });
    const tabs=await (await fetch('http://127.0.0.1:'+chromePort+'/json/list')).json() as any[];
    const tab=tabs.find(x=>x.type==='page');assert.ok(tab?.webSocketDebuggerUrl);
    socket=new WebSocket(tab.webSocketDebuggerUrl);
    const ws=socket;
    await new Promise<void>((ok,fail)=>{ws.onopen=()=>ok();ws.onerror=()=>fail(Error('CDP socket failed'));});
    let index=0;
    const inflight=new Map<number,{ok:(value:any)=>void;fail:(err:Error)=>void}>();
    ws.onmessage=event=>{
      const msg=JSON.parse(event.data as string);if(!msg.id)return;
      const task=inflight.get(msg.id);if(!task)return;inflight.delete(msg.id);
      if(msg.error)task.fail(Error(JSON.stringify(msg.error)));else task.ok(msg.result);
    };
    const send=(method:string,params:Record<string,unknown>={})=>new Promise<any>((ok,fail)=>{
      const id=++index;inflight.set(id,{ok,fail});ws.send(JSON.stringify({id,method,params}));
    });
    await send('Page.enable');await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:384,height:512,deviceScaleFactor:1,mobile:false});
    const reference=readFileSync(new URL('../../assets/design-approved/02-batalha.webp',import.meta.url)).toString('base64');
    const base=await capture(send,'baseline',p,reference);
    const candidate=await capture(send,'candidate',p,reference);
    const delta=Object.fromEntries(Object.keys(bounds).map(key=>[key,+(candidate[key]-base[key]).toFixed(4)]));
    const metrics={reference:'assets/design-approved/02-batalha.webp',viewport:'384x512',
      fixedWaveTime:2.25,sameCamera:true,baseline:base,candidate,delta,approved:false};
    mkdirSync('work6-qa',{recursive:true});
    writeFileSync('work6-qa/ab-same-frame-metrics.json',JSON.stringify(metrics,null,2));
    console.log('WORK6 CONTROLLED A/B MAE:',JSON.stringify(metrics));
    assert.ok(delta.right_cannon<-0.05,'right cannon must improve');
    assert.ok(delta.left_cannon<0.5,'port cannon must not regress');
    assert.ok(delta.global<-0.02,'global reference MAE must improve before merge');
  }finally{
    socket?.close();vite.kill('SIGTERM');browser.kill('SIGTERM');
    await sleep(600);try{rmSync(profile,{force:true,recursive:true,maxRetries:5,retryDelay:80});}catch{}
  }
});
