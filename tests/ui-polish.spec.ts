import {test,expect,type Page,type Browser} from '@playwright/test';

const VIEWS=[{name:'phone',viewport:{width:390,height:844},touch:true},{name:'small',viewport:{width:320,height:568},touch:true},{name:'landscape',viewport:{width:844,height:390},touch:true},{name:'desktop',viewport:{width:1440,height:900},touch:false}] as const;
type View=typeof VIEWS[number];

async function open(browser:Browser,view:View,fresh=false,fallbackFonts=false){
 const context=await browser.newContext({viewport:view.viewport,hasTouch:view.touch,isMobile:view.touch});const page=await context.newPage();
 // Without Barlow the fallback font has other metrics, like a system that renders text differently.
 if(fallbackFonts)await context.route('**/fonts/*.ttf',route=>route.abort());const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 // A mid-campaign pilot: credits, owned and locked weapons, a bought skin. A fresh pilot still has training ahead.
 if(!fresh)await context.addInitScript(()=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('steel-front-3d-v1',JSON.stringify({version:1,training:{completed:[true,true,true],skipped:false},mission:4,level:1,cleared:Array(16).fill(false).map((_,i)=>i<4),credits:2860,weapons:[1,2,3],weaponLevels:[3,2,1,0,0,0,0,0,0],equippedWeapon:1,autoPack:0,strikeCharges:2,strikeBackgrounds:Array(16).fill(false),skins:['classic','sunburst'],skin:'sunburst',flag:'none',upgrades:{armor:3,power:2,reload:1,engine:0,shield:0},difficulty:'normal',sound:false,low:false,graphicsChosen:true}));});
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 // Measure after the web fonts swap in, so nothing moves between a measurement and a tap.
 await page.evaluate(async()=>{await document.fonts.ready;(window as any).__steel.frame=()=>{};});
 return {context,page,errors};
}

/** Touch sizes, the 11 px type floor and horizontal overflow for everything a player can see in the overlay. */
function audit(page:Page){
 return page.evaluate(()=>{
  // Chrome lays out closed <details> content, so skip it unless it is the visible summary.
  const shut=(e:Element)=>{const d=e.closest('details:not([open])');return !!d&&e.closest('summary')?.parentElement!==d;};
  const seen=(e:Element)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&!shut(e);};
  const coarse=matchMedia('(pointer:coarse)').matches,small:string[]=[],tiny:string[]=[];
  for(const e of document.querySelectorAll('#overlay button, #overlay summary, #overlay a, #overlay select, #overlay input')){if(!seen(e))continue;const r=e.getBoundingClientRect();if(coarse&&(r.height<44||r.width<44))small.push(`${(e.textContent||e.id).trim().slice(0,24)} ${Math.round(r.width)}x${Math.round(r.height)}`);}
  for(const e of document.querySelectorAll('#overlay *')){if(!seen(e)||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent!.trim()))continue;const size=parseFloat(getComputedStyle(e).fontSize);if(size<11&&!(size===0&&e.closest('[aria-hidden=true]')))tiny.push(`${(e.textContent||'').trim().slice(0,24)} ${size}px`);}
  const overlay=document.querySelector('#overlay')!;
  return {small,tiny:[...new Set(tiny)],overflow:overlay.scrollWidth>overlay.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1};
 });
}
function expectClean(screens:Record<string,Awaited<ReturnType<typeof audit>>>){
 for(const [name,result] of Object.entries(screens)){expect(result.overflow,name).toBe(false);expect(result.small,name).toEqual([]);expect(result.tiny,name).toEqual([]);}
}

/** Resolves every rendered icon a selector draws (CSS background) and checks the image really loads. */
function iconsLoad(page:Page,selector:string,pseudo=''){
 return page.evaluate(async({selector,pseudo})=>{const out:string[]=[];
  for(const e of document.querySelectorAll(selector)){const url=/url\("?([^")]+)"?\)/.exec(getComputedStyle(e,pseudo||null).backgroundImage)?.[1];
   if(!url){out.push('none');continue;}
   out.push(await new Promise<string>(resolve=>{const img=new Image();img.onload=()=>resolve(`${img.naturalWidth}x${img.naturalHeight}`);img.onerror=()=>resolve('error');img.src=url;}));}
  return out;},{selector,pseudo});
}

for(const view of VIEWS)for(const fallback of view.touch?[false,true]:[false])test(`menu, settings, shop, pause and results keep touch sizes and readable type (${view.name}${fallback?', fallback font':''})`,async({browser})=>{
 const {context,page,errors}=await open(browser,view,false,fallback);
 const tap=async(selector:string)=>{const l=page.locator(selector).first();await l.scrollIntoViewIfNeeded();view.touch?await l.tap():await l.click();};
 const screens:Record<string,Awaited<ReturnType<typeof audit>>>={};
 screens.menu=await audit(page);
 await tap('.menu-settings>summary');await expect(page.locator('[data-action=quality]')).toBeVisible();screens.settings=await audit(page);
 // The settings sheet is a list of full-width rows; the graphics help sits directly under its row.
 const sheet=await page.evaluate(()=>{const box=document.querySelector('.menu-settings .settings')!.getBoundingClientRect(),rows=[...document.querySelectorAll('.menu-settings .settings>button')].map(b=>{const r=b.getBoundingClientRect();return {full:Math.abs(r.width-box.width)<2,tall:r.height>=44};});
  const quality=document.querySelector('.menu-settings [data-action=quality]')!,help=document.querySelector('.menu-settings #graphics-help')!;
  return {rows,helpBelow:Math.abs(help.getBoundingClientRect().top-quality.getBoundingClientRect().bottom)<2,divider:getComputedStyle(quality).borderBottomStyle};});
 expect(sheet.rows.length).toBeGreaterThanOrEqual(4);for(const row of sheet.rows)expect(row).toEqual({full:true,tall:true});expect(sheet).toMatchObject({helpBelow:true,divider:'none'});
 await tap('.menu-settings>summary');
 if(view.name==='phone'||view.name==='small'){
  // Portrait phones: the footer is a 2 x 2 grid of equal tiles.
  const tiles=await page.evaluate(()=>['[data-action=leaderboard]','.mobile-fullscreen>button','footer>[data-action=shop]','.menu-settings>summary'].map(s=>{const r=document.querySelector(s)!.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}));
  expect(new Set(tiles.map(t=>t.w)).size).toBe(1);expect(tiles[0].y).toBe(tiles[1].y);expect(tiles[2].y).toBe(tiles[3].y);expect(tiles[2].y).toBeGreaterThan(tiles[0].y);
 }
 if(view.name==='desktop'){
  // Desktop keeps the larger type of menu.css.
  expect(await page.evaluate(()=>['[data-action=leaderboard]','footer>[data-action=shop]','.menu-settings>summary'].map(s=>getComputedStyle(document.querySelector(s)!).fontSize))).toEqual(['14px','14px','14px']);
 }
 expect(await iconsLoad(page,'footer>button[data-action=leaderboard], footer>button[data-action=shop], .menu-settings>summary','::before')).toEqual(['160x160','160x160','160x160']);
 await tap('[data-action=leaderboard]');await expect(page.locator('#rank-back')).toBeVisible();screens.leaderboard=await audit(page);await tap('#rank-back');
 await tap('footer>[data-action=shop]');await expect(page.getByRole('heading',{name:'Field shop'})).toBeVisible();
 expect(await iconsLoad(page,'.shop-tabs button','::before')).toEqual(Array(4).fill('160x160'));
 expect(await iconsLoad(page,'.credit-total','::before')).toEqual(['160x160']);
 expect((await iconsLoad(page,'[data-weapon-card] .coin-icon')).every(size=>size==='160x160')).toBe(true);
 // Locked weapons read differently from owned ones.
 const cards=await page.evaluate(()=>['0','4'].map(id=>{const card=document.querySelector(`[data-weapon-card="${id}"]`)!;return {owned:card.getAttribute('data-owned'),border:getComputedStyle(card).borderTopStyle,bar:getComputedStyle(card.querySelector('.level-bar')!).display};}));
 expect(cards).toEqual([{owned:'true',border:'solid',bar:'block'},{owned:'false',border:'dashed',bar:'none'}]);
 screens.weapons=await audit(page);
 for(const tab of ['systems','support','skins']){await tap(`[data-action=shop-tab][data-value=${tab}]`);screens[tab]=await audit(page);}
 await tap('[data-action=shop-back]');await tap('[data-action=deploy]');await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
 await page.evaluate(()=>(window as any).__steel.pause());await expect(page.locator('[data-action=resume]')).toBeVisible();screens.pause=await audit(page);
 await page.evaluate(()=>{const g=(window as any).__steel;g.resume();g.fail();});await expect(page.locator('[data-action=retry]')).toBeVisible();screens.failed=await audit(page);
 // Results wait out the 1.5 s finish; a mid-campaign clear opens the depot, a region finale the victory panel.
 await page.evaluate(()=>{const g=(window as any).__steel;g.start(0,1);g.complete();for(let i=0;i<120;i++)g.step(1/60);});await expect(page.getByRole('heading',{name:'Mission accomplished'})).toBeVisible();screens.depot=await audit(page);
 await page.evaluate(()=>{const g=(window as any).__steel;g.save.level=2;g.start(5,2);g.complete();for(let i=0;i<120;i++)g.step(1/60);});await expect(page.getByRole('heading',{name:'Everyone comes home.'})).toBeVisible();screens.victory=await audit(page);
 expectClean(screens);expect(errors.filter(e=>!fallback||!/font/i.test(e))).toEqual([]);await context.close();
});

for(const view of [VIEWS[0],VIEWS[1]])test(`a new pilot's command screen keeps the same floor (${view.name})`,async({browser})=>{
 const {context,page,errors}=await open(browser,view,true);
 // Training is still ahead, so DEPLOY is the quiet link under START TRAINING.
 await expect(page.locator('.primary[data-action=training]')).toBeVisible();await expect(page.locator('.deploy.quiet')).toBeVisible();
 expectClean({fresh:await audit(page)});expect(errors).toEqual([]);await context.close();
});

test('price chips show buy, upgrade, unaffordable and maxed states apart',async({browser})=>{
 const {context,page}=await open(browser,VIEWS[0]);
 await page.locator('footer>[data-action=shop]').tap();await expect(page.getByRole('heading',{name:'Field shop'})).toBeVisible();
 const look=()=>page.evaluate(()=>Object.fromEntries(['0','4'].map(id=>{const b=document.querySelector<HTMLButtonElement>(`[data-weapon-card="${id}"] .price-button`)!,s=getComputedStyle(b);return [id,{disabled:b.disabled,image:s.backgroundImage==='none'?'none':s.backgroundImage.includes('rgb(24, 58, 54)')?'teal':s.backgroundImage.includes('rgb(52, 41, 15)')?'gold':'other',color:s.color}];})));
 // Rich pilot: the owned cannon upgrades in teal, the locked arc rocket buys in gold.
 expect(await look()).toEqual({'0':{disabled:false,image:'teal',color:'rgb(232, 255, 241)'},'4':{disabled:false,image:'gold',color:'rgb(244, 209, 151)'}});
 // Broke pilot: both prices grey out, including the owned weapon.
 await page.evaluate(()=>{const g=(window as any).__steel;g.save.credits=0;g.showShop();});
 expect(await look()).toEqual({'0':{disabled:true,image:'none',color:'rgb(140, 158, 169)'},'4':{disabled:true,image:'none',color:'rgb(140, 158, 169)'}});
 // A maxed weapon shows MAX in mint on the grey chip.
 await page.evaluate(()=>{const g=(window as any).__steel;g.save.weaponLevels[0]=20;g.showShop();});
 expect(await page.evaluate(()=>{const b=document.querySelector<HTMLButtonElement>('[data-weapon-card="0"] .price-button')!,s=getComputedStyle(b);return {text:b.textContent,image:s.backgroundImage,color:s.color};})).toEqual({text:'MAX',image:'none',color:'rgb(181, 240, 203)'});
 await context.close();
});

/** Records every click at the window, so a test can prove where a tap's follow-up click landed and that it was dropped. */
const recordClicks=(page:Page)=>page.evaluate(()=>{const w=window as any;w.__clicks=[];if(!w.__recording){w.__recording=true;addEventListener('click',e=>w.__clicks.push(e),true);}});
const clicks=(page:Page,selector:string)=>page.evaluate(selector=>(window as any).__clicks.map((e:MouseEvent)=>({hit:!!(e.target as Element).closest?.(selector),dropped:e.defaultPrevented})),selector);

test('a tap that closes a panel does not fall through to the HUD underneath',async({browser})=>{
 const {context,page,errors}=await open(browser,VIEWS[2]);
 // Park HUD buttons exactly where the finger lands; the HUD appears as the overlay closes.
 const park=(hud:string,target:string)=>page.evaluate(({hud,target})=>{const r=document.querySelector(target)!.getBoundingClientRect(),b=document.getElementById(hud)!;b.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:5`;},{hud,target});
 await page.locator('[data-action=deploy]').scrollIntoViewIfNeeded();await park('weapon','[data-action=deploy]');await recordClicks(page);
 await page.locator('[data-action=deploy]').tap();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');await page.waitForTimeout(400);
 expect(await clicks(page,'#weapon')).toContainEqual({hit:true,dropped:true});
 expect(await page.evaluate(()=>{const g=(window as any).__steel;g.updateHud();return {open:g.weaponPickerOpen,hidden:document.getElementById('weapon-picker')!.hidden};})).toEqual({open:false,hidden:true});
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.shieldCooldown=0;g.pause();});await park('shield','[data-action=resume]');await recordClicks(page);
 await page.locator('[data-action=resume]').tap();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');await page.waitForTimeout(400);
 expect(await clicks(page,'#shield')).toContainEqual({hit:true,dropped:true});
 expect(await page.evaluate(()=>(window as any).__steel.shieldCooldown)).toBe(0);
 // The same HUD button still answers its own taps.
 await page.locator('#weapon').tap();expect(await page.evaluate(()=>(window as any).__steel.weaponPickerOpen)).toBe(true);
 expect(errors).toEqual([]);await context.close();
});

test('a mission that ends under a held finger does not press the results panel',async({browser})=>{
 const {context,page,errors}=await open(browser,VIEWS[2]);
 await page.locator('[data-action=deploy]').tap();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');await page.waitForTimeout(400);
 const box=(await page.locator('#shield').boundingBox())!,x=box.x+box.width/2,y=box.y+box.height/2,cdp=await context.newCDPSession(page);
 await recordClicks(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 // The tank is lost while the finger still rests on SHIELD, and RETRY ends up right under it.
 expect(await page.evaluate(({x,y})=>{const g=(window as any).__steel;g.fail();const b=document.querySelector<HTMLElement>('[data-action=retry]')!;b.style.cssText=`position:fixed;left:${x-70}px;top:${y-30}px;width:140px;height:60px;z-index:5`;return document.elementFromPoint(x,y)?.closest('[data-action=retry]')!==null;},{x,y})).toBe(true);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
 expect(await clicks(page,'[data-action=retry]')).toContainEqual({hit:true,dropped:true});
 await expect(page.locator('body')).toHaveAttribute('data-phase','failed');
 // RETRY itself still works with a fresh tap.
 await page.locator('[data-action=retry]').tap();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
 expect(errors).toEqual([]);await context.close();
});

test('phones hide the programmatic focus ring until a key is pressed, but not for typing',async({browser})=>{
 const {context,page}=await open(browser,VIEWS[0]);
 const ring=()=>page.evaluate(()=>{const e=document.activeElement as HTMLElement;return {action:e?.dataset.action,visible:e.matches(':focus-visible'),outline:getComputedStyle(e).outlineStyle};});
 await page.evaluate(()=>(document.querySelector('[data-action=deploy]') as HTMLElement).focus());
 // Chrome would draw the ring here (the focus is :focus-visible); the phone layer hides it.
 expect(await ring()).toEqual({action:'deploy',visible:true,outline:'none'});
 // Typing into a text field is not keyboard navigation.
 await page.evaluate(()=>{const input=document.createElement('input');input.id='typing-probe';document.querySelector('#overlay')!.append(input);input.focus();});
 await page.keyboard.type('Kestrel');expect(await page.evaluate(()=>document.documentElement.dataset.input??null)).toBeNull();
 await page.evaluate(()=>{document.getElementById('typing-probe')!.remove();(document.querySelector('[data-action=deploy]') as HTMLElement).focus();});
 expect((await ring()).outline).toBe('none');
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 expect((await ring()).outline).not.toBe('none');
 await context.close();
});
