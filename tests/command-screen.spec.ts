import {test,expect,type Page} from '@playwright/test';

const VIEWS=[{width:390,height:844,touch:true},{width:360,height:640,touch:true},{width:844,height:390,touch:true},{width:568,height:320,touch:true},{width:1440,height:900,touch:false}];
async function open(page:Page,veteran=true){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 if(veteran)await page.evaluate(()=>{const g=(window as any).__steel;g.save.training={completed:[true,true,true],skipped:true};g.save.credits=1250;g.showMenu();});
}

for(const v of VIEWS)test(`command screen fits ${v.width}x${v.height} without scrolling: one primary action and a five-tile dock`,async({browser})=>{
 const context=await browser.newContext({viewport:{width:v.width,height:v.height},isMobile:v.touch,hasTouch:v.touch});
 try{const page=await context.newPage();await open(page);
  const r=await page.evaluate(()=>{const o=document.querySelector('#overlay')!,inView=(e:Element)=>{const b=e.getBoundingClientRect();return b.width>0&&b.top>=-1&&b.bottom<=innerHeight+1&&b.left>=-1&&b.right<=innerWidth+1;};
   const deploy=document.querySelector('[data-action=deploy]')!,tiles=[...document.querySelectorAll('.command-dock .dock-tile')];
   return {scroll:o.scrollHeight-o.clientHeight,sideways:document.documentElement.scrollWidth-innerWidth,deploy:inView(deploy),primary:[...document.querySelectorAll('.command-screen .primary')].filter(e=>e.getClientRects().length).length,
    tiles:tiles.length,tilesInView:tiles.every(inView),labels:tiles.map(t=>(t.querySelector('span:last-child')?.firstChild?.textContent||'').trim())};});
  expect(r.scroll).toBeLessThanOrEqual(1);expect(r.sideways).toBeLessThanOrEqual(0);expect(r.deploy).toBe(true);expect(r.primary).toBe(1);
  expect(r.tiles).toBe(5);expect(r.tilesInView).toBe(true);expect(r.labels).toEqual(['SHOP','SKIN','SKIRMISH','RANKS','SETTINGS']);
 }finally{await context.close();}
});

test('a new pilot sees START TRAINING as the one primary action, with Deploy still a full button',async({page})=>{
 await open(page,false);
 await expect(page.locator('.command-screen .primary')).toHaveText(/START TRAINING/);
 const deploy=page.locator('[data-action=deploy]');await expect(deploy).toBeVisible();expect((await deploy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('difficulty, level, stage, ranks and settings are each one tap away; only Settings opens a sheet',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{const page=await context.newPage();await open(page);
  const openSheets=()=>page.locator('details.chip-sheet[open]').count();
  // Nothing on the card is folded away: every choice is a button already on screen.
  expect(await page.locator('.command-screen details.chip-sheet').count()).toBe(1);
  const onScreen=(sel:string)=>page.evaluate(s=>[...document.querySelectorAll(s)].map(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.top>=0&&b.bottom<=innerHeight+1&&b.height>=44;}),sel);
  expect(await onScreen('[data-action=difficulty]')).toEqual([true,true,true,true]);
  expect(await onScreen('[data-action=level]')).toEqual([true,true,true]);
  expect(await onScreen('.route-item.selected')).toEqual([true]);
  await expect(page.locator('.campaign-route [data-action=mission]')).toHaveCount(16);
  await page.locator('[data-action=difficulty][data-value=normal]').tap();
  await expect(page.locator('[data-action=difficulty][data-value=normal]')).toHaveAttribute('aria-pressed','true');expect(await openSheets()).toBe(0);
  // Settings: one tap shows every toggle; a tap outside or Escape closes it.
  await page.locator('.dock-settings>summary').tap();expect(await openSheets()).toBe(1);
  for(const action of ['sound','aim','quality'])await expect(page.locator(`.dock-settings [data-action=${action}]`)).toBeVisible();
  await page.mouse.click(195,200);await expect.poll(openSheets).toBe(0);
  await page.locator('.dock-settings>summary').tap();await page.keyboard.press('Escape');expect(await openSheets()).toBe(0);
  // Ranks is a tile of its own.
  await page.locator('.command-dock [data-action=leaderboard]').tap();await expect(page.locator('#rank-back')).toBeVisible();
 }finally{await context.close();}
});

test('the shop keeps its tabs and DONE on screen on phones; only the list scrolls',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{const page=await context.newPage();await open(page);await page.locator('[data-action=shop]').tap();
  for(const tab of ['equipment','systems','support','skins']){
   await page.locator(`[data-action=shop-tab][data-value=${tab}]`).tap();
   const r=await page.evaluate(()=>{const done=document.querySelector('[data-action=shop-back]')!.getBoundingClientRect(),tabs=document.querySelector('[data-action=shop-tab]')!.getBoundingClientRect();
    return {done:done.bottom<=innerHeight+1&&done.top>=0,tabs:tabs.top>=0,page:document.querySelector('#overlay')!.scrollHeight-innerHeight};});
   expect(r,tab).toEqual({done:true,tabs:true,page:expect.any(Number)});expect(r.page,tab).toBeLessThanOrEqual(1);
  }
  // Locked weapons say LOCKED without a meaningless level.
  await page.locator('[data-action=shop-tab][data-value=equipment]').tap();
  await expect(page.locator('[data-weapon-card="1"] .eyebrow')).toHaveText('LOCKED');
 }finally{await context.close();}
});

test('the dock reads in Vietnamese too',async({page})=>{
 await open(page);await page.locator('[data-action=language][data-value=vi]').click();
 await expect(page.locator('.dock-settings>summary')).toContainText('CÀI ĐẶT');await expect(page.locator('.command-dock [data-action=leaderboard]')).toContainText('XẾP HẠNG');
});

test('a tap on the dimmed backdrop closes the sheet and does not press the dock tile underneath',async({browser})=>{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 try{const page=await context.newPage();await open(page);
  const shop=(await page.locator('.command-dock [data-action=shop]').boundingBox())!;
  await page.locator('.dock-settings>summary').tap();await expect(page.locator('details.chip-sheet[open]')).toHaveCount(1);
  const sheet=(await page.locator('.dock-settings>.sheet').boundingBox())!;expect(shop.x+12).toBeLessThan(sheet.x);   // a spot on SHOP outside the sheet
  await page.touchscreen.tap(shop.x+12,shop.y+shop.height/2);
  await expect(page.locator('details.chip-sheet[open]')).toHaveCount(0);
  await page.waitForTimeout(300);expect(await page.evaluate(()=>(window as any).__steel.phase)).toBe('menu');
  await expect(page.locator('.command-screen')).toBeVisible();await expect(page.locator('.depot-panel')).toHaveCount(0);
 }finally{await context.close();}
});
