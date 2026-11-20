/**
 * WORK 5: real Chromium CDP touch on an isolated production OceanScene.
 * Measures the actual Three.js orbit-camera distance during two-finger pinch.
 * This is headless browser emulation, NOT a physical iPhone or art approval.
 * Fixture and tests only: never modifies production, Porto or battle code.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';
import {createServer} from 'vite';

test('WORK5: real ship selection and measured two-finger zoom in mobile Chromium', {timeout:120_000}, async t=>{
  const detect=spawnSync('sh',['-c','command -v google-chrome || command -v chromium || command -v chromium-browser'],{encoding:'utf8'});
  const chromeBin=process.env.CHROME_BIN||detect.stdout.trim().split('\n')[0];
  if(!chromeBin){t.skip('Chromium unavailable: ship pinch was NOT browser-tested');return;}
  const root=fileURLToPath(new URL('../',import.meta.url));
  const profile=await mkdtemp(join(tmpdir(),'royal-work5-pinch-'));
  let vite:Awaited<ReturnType<typeof createServer>>|null=null;
  let chrome:ReturnType<typeof spawn>|null=null;
  let socket:WebSocket|null=null;
  try{
    vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0,strictPort:false}});
    await vite.listen();
    const address=vite.httpServer.address();
    assert.ok(address&&typeof address==='object','Vite fixture must bind a port');
    chrome=spawn(chromeBin,[
      '--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
    ],{stdio:'ignore'});
    chrome.on('error',()=>{});
    let port=0;
    for(let i=0;i<120;i++){
      if(chrome.exitCode!==null)throw new Error('Chromium exited before DevTools startup');
      try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port>0)break;}catch{}
      await pause(100);
    }
    assert.ok(port>0,'Chromium DevTools port unavailable');
    let page:{webSocketDebuggerUrl?:string}|undefined;
    for(let i=0;i<40;i++){
      try{
        const response=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(1500)});
        if(response.ok){page=(await response.json()).find((x:any)=>x.type==='page');if(page?.webSocketDebuggerUrl)break;}
      }catch{}
      await pause(120);
    }
    assert.ok(page?.webSocketDebuggerUrl,'Chromium page websocket unavailable');
    socket=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((resolve,reject)=>{
      socket!.addEventListener('open',()=>resolve(),{once:true});
      socket!.addEventListener('error',()=>reject(new Error('Cannot connect Chromium CDP')),{once:true});
    });
    let serial=0;
    const pending=new Map<number,{resolve:(value:any)=>void,reject:(error:Error)=>void,timer:ReturnType<typeof setTimeout>}>();
    socket.addEventListener('message',(e:any)=>{
      const data=JSON.parse(e.data);
      const wait=pending.get(data.id);if(!wait)return;
      pending.delete(data.id);clearTimeout(wait.timer);
      data.error?wait.reject(new Error(String(data.error.message))):wait.resolve(data.result);
    });
    const call=(method:string,params:any={}):Promise<any>=>new Promise((resolve,reject)=>{
      const id=++serial;
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},15000);
      pending.set(id,{resolve,reject,timer});
      socket!.send(JSON.stringify({id,method,params}));
    });
    const evaluate=async(expression:string):Promise<any>=>{
      const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||'JS exception');
      return result.result?.value;
    };
    const waitFor=async(expression:string,label:string,timeoutMs=10000)=>{
      const end=Date.now()+timeoutMs;
      while(Date.now()<end){
        if(await evaluate(expression).catch(()=>false))return;
        await pause(110);
      }
      throw new Error('Timed out waiting for '+label+'; '+String(await evaluate('window.__work5Error').catch(()=>'unknown error')));
    };
    const metrics=async(width:number,height:number)=>{
      await call('Emulation.setDeviceMetricsOverride',{
        width,height,screenWidth:width,screenHeight:height,deviceScaleFactor:1,mobile:true
      });
      await pause(250);
    };
    const send=(type:'touchStart'|'touchMove'|'touchEnd',pts:Array<{x:number;y:number;id:number}>)=>
      call('Input.dispatchTouchEvent',{type,touchPoints:pts});
    const hit=async()=>{
      const position=await evaluate('window.__work5.findHit()');
      assert.ok(position,'No raycast-intersectable real ship mesh on portrait canvas');
      const bounds=await evaluate('window.__work5.canvasRect()');
      assert.ok(position.x>bounds.x&&position.x<bounds.x+bounds.width,'touch outside canvas');
      assert.ok(position.y>bounds.y&&position.y<bounds.y+bounds.height,'touch outside canvas');
      return position as {x:number;y:number};
    };
    await call('Page.enable');
    await call('Runtime.enable');
    await metrics(390,844);
    await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:3});
    // Freeze only decorative harbour bob/sails in this LOCAL QA fixture. This keeps
    // the raycast and actual CDP touch on the same ship geometry across frames;
    // gameplay and pointer handlers remain fully live.
    await call('Page.navigate',{url:'http://127.0.0.1:'+address.port+'/tests/work5-ship-gesture-fixture.html?work6ab=1'});
    await waitFor('Boolean(window.__work5||window.__work5Error)','fixture initialization',20000);
    assert.equal(await evaluate('window.__work5Error'),undefined,'production 3D OceanScene fixture errored');

    // A single real touch must select the mesh, not a decorative flat ship image.
    let point=await hit();
    await send('touchStart',[{...point,id:1}]);
    await waitFor('window.__work5.pointerCount()===1','real ship pointerDown');
    await send('touchEnd',[]);
    await waitFor('window.__work5.selected()===true','ship selected by direct tap');
    assert.equal(await evaluate('window.__work5.zoomEnabled()'),false,'release must disable free zoom');

    // Pinch measures live camera-to-target distance, not a CSS transform.
    await evaluate('window.__work5.clearSelected()');
    point=await hit();
    const first={x:point.x,y:point.y,id:1};
    const second={x:point.x+18,y:point.y,id:2};
    await send('touchStart',[first]);
    await send('touchStart',[first,second]);
    await waitFor('window.__work5.pointerCount()===2','two active ship pointers');
    assert.equal(await evaluate('window.__work5.zoomEnabled()'),true,'ship pinch must enable zoom');
    const before=await evaluate('window.__work5.distance()');
    assert.ok(Number.isFinite(before)&&before>0);
    for(const move of [10,20,30,40,50,60]){
      await send('touchMove',[
        {x:first.x-move,y:first.y,id:1},
        {x:second.x+move,y:second.y,id:2}
      ]);
      await pause(35);
    }
    await waitFor('Math.abs(window.__work5.distance()-'+JSON.stringify(before)+')>0.25','measurable Three.js pinch zoom',7000);
    const after=await evaluate('window.__work5.distance()');
    assert.ok(Math.abs(after-before)>0.25,'pinch did not change camera-to-target distance');
    await send('touchEnd',[]);
    await waitFor('window.__work5.pointerCount()===0','all ship touches released');
    assert.equal(await evaluate('window.__work5.zoomEnabled()'),false,'zoom remains unlocked after release');

    // Small viewport: ship must still be raycast-touchable without scrolling.
    for(const [width,height] of [[384,512],[320,568]] as const){
      await metrics(width,height);
      await waitFor('window.__work5.canvasRect().width>0','canvas after resize');
      point=await hit();
      await evaluate('window.__work5.clearSelected()');
      await send('touchStart',[{...point,id:3}]);
      await send('touchEnd',[]);
      await waitFor('window.__work5.selected()===true',width+'px direct ship tap');
    }
  } finally {
    try{socket?.close();}catch{}
    try{chrome?.kill('SIGKILL');}catch{}
    try{await vite?.close();}catch{}
    await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});
  }
});
