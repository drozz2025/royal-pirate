import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve('work6-qa');
await mkdir(root,{recursive:true});
// Use the same preinstalled Chrome used by Pages' successful live canvas QA.
// Falls back to Playwright-managed Chromium for developer machines.
const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_BIN||undefined,
  args:[
  '--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try {
  for(const [width,height] of [[320,568],[384,512],[390,844],[430,932]]){
    const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
    const page=await ctx.newPage();
    page.on('pageerror',error=>{throw error;});
    await page.goto('http://127.0.0.1:5173/?work6shots=1',{waitUntil:'domcontentloaded'});
    await page.locator('.harbour-battle-button').waitFor({state:'visible',timeout:20000});
    await page.waitForTimeout(2200);
    await page.screenshot({path:resolve(root,`porto-${width}x${height}.png`),animations:'disabled'});

    // WORK0 #104: capture all eight source-approved screens on the same
    // REAL browser viewport, and reject the legacy 570px floor clipping
    // the shared five-button dock on 384×512 / 320×568. No mock screens.
    const verifySheet=async(name)=>{
      await page.locator('.app-sheet').waitFor({state:'visible',timeout:10000});
      // WORK0 / #104: DOM ready is NOT image ready. Previously this runner
      // clicked through 05/06 and captured blank card/chest artwork because
      // source WebP decoding had not completed. Require the actual approved
      // art to decode before producing evidence, rather than scoring a false
      // empty panel. Fail fast on broken Vite URLs or zero-dimension images.
      const kind=name==='cartas'?'cards':name==='loja'?'shop':null;
      if(kind){
        const expected=kind==='cards'?8:4;
        try{
          await page.waitForFunction(({kind,expected})=>{
            const images=[...document.querySelectorAll('[data-work7-screen="'+kind+'"] .w7-approved-crop img')];
            return images.length===expected&&images.every(img=>img.complete&&img.naturalWidth>0&&img.naturalHeight>0);
          },{kind,expected},{timeout:15000});
        }catch(error){
          const diag=await page.evaluate(kind=>({
            kind,screen:document.querySelector('[data-work7-screen]')?.getAttribute('data-work7-screen'),
            imgs:[...document.querySelectorAll('[data-work7-screen="'+kind+'"] .w7-approved-crop img')].map(img=>({
              complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
              src:img.currentSrc,outer:img.outerHTML.slice(0,120)
            })),
            allImgs:document.images.length,
            screenText:document.querySelector('.app-sheet')?.textContent?.slice(0,150)
          }),kind);
          throw new Error('Artwork decoding timeout: '+JSON.stringify(diag)+'; '+String(error));
        }
        const art=await page.evaluate(async kind=>{
          const images=[...document.querySelectorAll('[data-work7-screen="'+kind+'"] .w7-approved-crop img')];
          await Promise.all(images.map(img=>img.decode()));
          return images.map(img=>({url:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight}));
        },kind);
        if(art.length!==expected||art.some(item=>item.width!==384||item.height!==512))
          throw Error('Approved source artwork missing before '+name+' screenshot: '+JSON.stringify(art));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      }
      const geometry=await page.evaluate(()=>{
        const app=document.querySelector('.app.with-app-sheet');
        const sheet=document.querySelector('.app-sheet');
        const dock=document.querySelector('.app-sheet > .harbour-nav');
        if(!app||!sheet||!dock)return null;
        const a=app.getBoundingClientRect(),s=sheet.getBoundingClientRect(),d=dock.getBoundingClientRect();
        const buttons=Array.from(dock.querySelectorAll('button'));
        return {appBottom:a.bottom,sheetBottom:s.bottom,dockTop:d.top,dockBottom:d.bottom,
          scrollHeight:document.documentElement.scrollHeight,innerHeight,
          fiveButtons:buttons.length,
          hittable:buttons.every(b=>{
            const r=b.getBoundingClientRect();
            const point=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
            return point===b||b.contains(point);
          })};
      });
      if(!geometry||geometry.fiveButtons!==5||!geometry.hittable||
         Math.abs(geometry.appBottom-height)>1||
         Math.abs(geometry.sheetBottom-height)>1||
         geometry.dockTop<0||geometry.dockBottom>height+1||
         geometry.scrollHeight>height+1)
        throw new Error(`App sheet / 5-tab dock clipped on ${name} ${width}x${height}: ${JSON.stringify(geometry)}`);
      await page.screenshot({path:resolve(root,`${name}-${width}x${height}.png`),animations:'disabled'});
    };
    await page.locator('.harbour-nav:not(.app-dock-porto) button').filter({hasText:'FROTA'}).click();
    await verifySheet('frota');
    await page.locator('.w4-action-pair button').filter({hasText:'ABRIR MELHORIAS'}).click();
    await verifySheet('forja');
    await page.locator('.app-dock-porto button').filter({hasText:'CARTAS'}).click();
    await verifySheet('cartas');
    await page.locator('.app-dock-porto button').filter({hasText:'LOJA'}).click();
    await verifySheet('loja');
    // On 320/384px the header shortcuts are deliberately hidden. Exercise
    // the VISIBLE real Porto flank route instead of a hidden button.
    await page.locator('.app-dock-porto button').filter({hasText:'PORTO'}).click();
    await page.locator('.harbour-flank-right button').filter({hasText:'MISSÕES'}).click();
    await verifySheet('missoes');
    await page.locator('.app-dock-porto button').filter({hasText:'RANKING'}).click();
    await verifySheet('ranking');
    await page.locator('.app-dock-porto button').filter({hasText:'PORTO'}).click();
    await page.locator('.harbour-battle-button').waitFor({state:'visible',timeout:10000});

    await page.locator('.harbour-battle-button').click();
    // The approved mobile gunner stage deliberately hides the old redundant
    // BATALHA heading. Wait for the LIVE HP HUD, not an obsolete banner.
    await page.locator('.battle-hud').waitFor({state:'visible',timeout:15000});
    if(await page.locator('.battle-approved-banner').isVisible())
      throw new Error(`Redundant BATALHA heading visible at ${width}x${height}`);
    await page.waitForTimeout(2000);
    const hud=await page.locator('.battle-hud').boundingBox();
    const fire=await page.locator('.fire-button').boundingBox();
    const controls=await page.locator('.command-deck').boundingBox();
    if(!hud||!fire||!controls||fire.y<=(hud.y+hud.height)||fire.y+fire.height>height+1)
      throw new Error(`HUD/Fire clipping at ${width}x${height}: ${JSON.stringify({hud,fire,controls})}`);
    const touch=await page.locator('.fire-button').evaluate(el=>{
      const box=el.getBoundingClientRect();
      const at=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);
      return !!at?.closest('.fire-button');
    });
    if(!touch)throw new Error(`DISPARAR touch target covered at ${width}x${height}`);
    const canvas=page.locator('.ocean canvas');
    if(await canvas.count()!==1)throw new Error('Real battle renderer canvas absent');
    // Systemic Battle QA: the naval stage must dominate while the original
    // five utility actions remain reachable through one compact menu.
    const toggle=page.locator('.battle-utilities-toggle');
    const menu=page.locator('.battle-utilities-actions');
    if(!await toggle.isVisible() || await menu.isVisible())
      throw new Error(`Mobile utilities not correctly collapsed at ${width}x${height}`);
    await toggle.click();
    if(!await menu.isVisible() || await menu.locator('button').count()!==5)
      throw new Error(`Mobile utilities lost existing controls at ${width}x${height}`);
    if(await toggle.getAttribute('aria-expanded')!=='true')
      throw new Error('Utility menu accessibility state did not update');
    await toggle.click();
    if(await menu.isVisible() || await toggle.getAttribute('aria-expanded')!=='false')
      throw new Error('Utility menu did not close');
    const bearing=page.locator('#bearing'), power=page.locator('#power');
    if(!await bearing.isEnabled() || !await power.isEnabled())
      throw new Error('Existing firing sliders not operable');
    const noXOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
    if(!noXOverflow)throw new Error(`Batalha horizontal overflow at ${width}x${height}`);
    await page.screenshot({path:resolve(root,`battle-${width}x${height}.png`),animations:'disabled'});
    await page.locator('.fire-button').click();
    // On SwiftShader the short disabled/flight phase can finish before a DOM
    // polling interval. The proof is the LIVE WebGL firing framebuffer, not
    // an incidental disabled CSS state. Fail if the real gun never fires.
    await page.waitForFunction(()=>(window.__royalShotFrames??[])
      .some(frame=>frame.ageSec<.31),null,{timeout:7000});
    // A screenshot of a random animation frame is NOT evidence of an actual
    // muzzle flash. Capture the same real WebGL viewport through the entire
    // blast/recoil/smoke window, and record observed (not invented) elapsed
    // wall-clock times for human comparison of mouth, ball, flame and smoke.
    const shotStarted=Date.now();
    const shotSeries=[];
    for(const [label,delay] of [['immediate',0],['early',105],['mid',115],['smoke',215]]){
      if(delay)await page.waitForTimeout(delay);
      const file=`battle-shot-${label}-${width}x${height}.png`;
      await page.screenshot({path:resolve(root,file),animations:'disabled'});
      shotSeries.push({stage:label,elapsedWallMs:Date.now()-shotStarted,file});
    }
    // Consume the exact GPU framebuffer pixels recorded synchronously on the
    // live renderer's requestAnimationFrame. Playwright postclick screenshots
    // are often >1s late on SwiftShader and must NOT be treated as flash proof.
    const gpuFrames=await page.evaluate(()=>{
      const stored=window.__royalShotFrames??[];
      return stored.map((f,i)=>{
        const canvas=document.createElement('canvas');
        canvas.width=f.width;canvas.height=f.height;
        const ctx=canvas.getContext('2d');
        if(!ctx)throw new Error('No 2D context for live WebGL framebuffer');
        const image=ctx.createImageData(f.width,f.height),row=f.width*4;
        for(let y=0;y<f.height;y++){
          // WebGL readPixels has bottom-left origin; PNG uses top-left.
          image.data.set(f.rgba.subarray((f.height-y-1)*row,(f.height-y)*row),y*row);
        }
        ctx.putImageData(image,0,0);
        return {ageSec:f.ageSec,width:f.width,height:f.height,
          stage:i,base64:canvas.toDataURL('image/png').split(',')[1]};
      });
    });
    if(gpuFrames.length<1||!gpuFrames.some(f=>f.ageSec<.31))
      throw new Error(`No genuine muzzle flash framebuffer captured at ${width}x${height}`);
    const liveFrames=[];
    for(const frame of gpuFrames){
      const file=`battle-gpu-real-${frame.stage}-${width}x${height}.png`;
      await writeFile(resolve(root,file),Buffer.from(frame.base64,'base64'));
      liveFrames.push({ageSec:frame.ageSec,file,width:frame.width,height:frame.height,
        kind:'actual WebGL framebuffer read on live firing frame'});
    }
    await writeFile(resolve(root,`battle-shot-sequence-${width}x${height}.json`),
      JSON.stringify({viewport:{width,height},realCanvas:true,stages:shotSeries,
        actualGpuFrames:liveFrames,approval:false,
        note:'Image evidence is exact renderer frames; artistic approval still requires review.'},null,2));
    console.log(`WORK6 ${width}x${height}: real WebGL 4-frame blast/muzzle evidence, five menu actions, sliders and DISPARAR confirmed`);
    await ctx.close();
  }

  // WORK0/WORK6 #104: real native Chromium TOUCH interaction, not simulated React callbacks.
  // Keep the original 4-viewport image suite above unchanged; this second
  // context uses mobile touch emulation to audit actual finger movement.
  for (const [width,height] of [[320,568],[390,844]]) {
    const ctx=await browser.newContext({
      viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,
      reducedMotion:'reduce'
    });
    const page=await ctx.newPage();
    await page.goto('http://127.0.0.1:5173/?work6shots=1',{waitUntil:'domcontentloaded'});
    await page.locator('.harbour-battle-button').waitFor({state:'visible',timeout:20000});
    await page.locator('.harbour-battle-button').click();
    await page.locator('.fire-button').waitFor({state:'visible',timeout:15000});
    const canvas=page.locator('.in-battle .ocean canvas');
    await canvas.waitFor({state:'visible'});
    const start=await page.evaluate(()=>{
      const canvas=document.querySelector('.in-battle .ocean canvas');
      const width=innerWidth,height=innerHeight;
      for(let y=Math.round(height*.34);y<height*.59;y+=9){
        for(let x=Math.round(width*.25);x<width*.62;x+=9){
          if(document.elementFromPoint(x,y)===canvas)return {x,y};
        }
      }
      throw new Error('No finger-accessible canvas amid HUD/deck overlays');
    });
    const cdp=await ctx.newCDPSession(page);
    const gesture=async (a,b)=>{
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',
        touchPoints:[{x:Math.round(a.x),y:Math.round(a.y),id:1}]});
      for(let i=1;i<=5;i++){
        const x=a.x+(b.x-a.x)*i/5,y=a.y+(b.y-a.y)*i/5;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',
          touchPoints:[{x:Math.round(x),y:Math.round(y),id:1}]});
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    };
    const initialScroll=await page.evaluate(()=>({x:scrollX,y:scrollY}));
    const beforeYaw=Number(await page.locator('#bearing').inputValue());
    const beforePower=Number(await page.locator('#power').inputValue());
    await gesture(start,{x:Math.min(width-24,start.x+width*.26),y:start.y});
    const yaw=Number(await page.locator('#bearing').inputValue());
    if(!(yaw>beforeYaw+5&&yaw<=25))
      throw Error('Touch drag failed to update live yaw '+JSON.stringify({width,height,beforeYaw,yaw,start}));
    const afterAimPower=Number(await page.locator('#power').inputValue());
    if(afterAimPower!==beforePower)throw Error('Horizontal aiming must NOT adjust power');

    const bar=await page.locator('#power').boundingBox();
    if(!bar||bar.height<43)throw Error('Power touch target below 44px');
    const y=bar.y+bar.height/2;
    await gesture({x:bar.x+bar.width*.1,y},{x:bar.x+bar.width*.8,y});
    const power=Number(await page.locator('#power').inputValue());
    if(power<70||power>100||power<=beforePower+10)throw Error('Direct power touch/drag not reflected '+JSON.stringify({power,beforePower}));
    if(Number(await page.locator('#bearing').inputValue())!==yaw)
      throw Error('Power drag must NOT affect bearing');

    // Keyboard remains functional after touch. Pointer capture never steals FIRE.
    await page.locator('#power').focus();
    await page.keyboard.press('ArrowRight');
    const powerAfterKeyboard=Number(await page.locator('#power').inputValue());
    if(powerAfterKeyboard!==Math.min(100,power+1))
      throw Error('Native slider keyboard interaction regressed');
    const currentScroll=await page.evaluate(()=>({
      x:scrollX,y:scrollY,overflowX:document.documentElement.scrollWidth>innerWidth+1,
      fireAtCenter:(()=>{
        const b=document.querySelector('.fire-button').getBoundingClientRect();
        return !!document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('.fire-button');
      })()
    }));
    if(currentScroll.x!==initialScroll.x||currentScroll.y!==initialScroll.y||
       currentScroll.overflowX||!currentScroll.fireAtCenter)
       throw Error('Touch moved page/obstructed FIRE '+JSON.stringify(currentScroll));
    await page.screenshot({path:resolve(root,`battle-touch-${width}x${height}.png`),animations:'disabled'});
    await page.locator('.fire-button').click();
    await page.waitForFunction(()=>Array.isArray(window.__royalShotFrames)&&
      window.__royalShotFrames.some(f=>f.ageSec<.31),null,{timeout:7000});
    await writeFile(resolve(root,`battle-touch-${width}x${height}.json`),
      JSON.stringify({viewport:{width,height},touchEmulation:'Chromium CDP native touch',
        beforeYaw,yaw,beforePower,power,powerAfterKeyboard,
        scroll:currentScroll,fire:'actual WebGL frame verified',elevation:'fixed (not power)',
        approved:false,safariPhysicalDeviceTested:false},null,2));
    console.log(`WORK0 TOUCH ${width}x${height}: real canvas drag yaw=${yaw}, power=${power}%, keyboard and gun shot confirmed`);
    await ctx.close();
  }
} finally {await browser.close();}
