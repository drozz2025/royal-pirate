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
    await page.screenshot({path:resolve(root,`battle-${width}x${height}.png`),animations:'disabled'});
    console.log(`WORK6 screenshot ${width}x${height}: Porto/Batalha, HP + FIRE boundaries OK`);
    await ctx.close();
  }
} finally {await browser.close();}
