import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
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
    await page.screenshot({path:resolve(root,`battle-shot-${width}x${height}.png`),animations:'disabled'});
    console.log(`WORK6 ${width}x${height}: Porto/Batalha, mobile utility disclosure, sliders and DISPARAR flight confirmed`);
    await ctx.close();
  }
} finally {await browser.close();}
