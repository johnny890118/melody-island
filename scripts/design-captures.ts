import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
console.log('launch');
const browser = await chromium.launch(); console.log('launched');
const output='/tmp/melody-proposal-captures'; await mkdir(output,{recursive:true});
const notes: Record<string,unknown>[]=[];
for (const size of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]) {
 const context=await browser.newContext({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
 const page=await context.newPage();
 for(const concept of ['a','b','c']) {
  for(const surface of ['home','room']) {
   console.log(concept,surface,size.name);
   await page.goto(`http://127.0.0.1:3100/design-review?concept=${concept}&surface=${surface}`);
   console.log('navigated'); await page.evaluate(()=>document.fonts.ready); console.log('fonts');
   if(surface==='home') { await page.locator('.dr-scene[data-ready=true]').waitFor({timeout:60000}); await page.waitForTimeout(1200); }
   else await page.waitForTimeout(2500);
   await page.screenshot({path:`${output}/${concept}-${surface}-${size.name}.png`,fullPage:true});
   if(surface==='room'){ await page.getByRole('button',{name:'搜尋加歌',exact:true}).click(); await page.getByRole('dialog').waitFor(); await page.waitForTimeout(400); await page.screenshot({path:`${output}/${concept}-search-${size.name}.png`}); await page.keyboard.press('Escape'); } 
   notes.push({concept,surface,size:size.name,...await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyHeight:document.body.scrollHeight}))});
  }
 }
 await context.close();
}
await writeFile(`${output}/checks.json`,JSON.stringify(notes,null,2));await browser.close();console.log(output);
