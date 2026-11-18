import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve('work6-qa');
await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try {
  for(const [width,height] of [[320,568],[384,512],[390,844],[430,932]]){
    const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
    const page=await ctx.newPage();
    page.on('pageerror',error=>{throw error;});
    await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
    await page.locator('.harbour-battle-button').waitFor({state:'visible',timeout:20000});
    await page.waitForTimeout(2200);
    await page.screenshot({path:resolve(root,`porto-${width}x${height}.png`),animations:'disabled'});

    await page.locator('.harbour-battle-button').click();
    await page.locator('.battle-approved-banner').waitFor({state:'visible',timeout:15000});
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
    await page.locator('.fire-button:disabled').waitFor({state:'visible',timeout:2500});
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
    await writeFile(resolve(root,`battle-shot-sequence-${width}x${height}.json`),
      JSON.stringify({viewport:{width,height},realCanvas:true,stages:shotSeries,
        approval:false,note:'WebGL timing is not deterministic; inspect each captured muzzle frame'},null,2));
    console.log(`WORK6 ${width}x${height}: real WebGL 4-frame blast/muzzle evidence, five menu actions, sliders and DISPARAR confirmed`);
    await ctx.close();
  }
} finally {await browser.close();}
