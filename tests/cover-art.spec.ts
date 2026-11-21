import {test,expect} from '@playwright/test';

// The painted cover (public/cover) replaces the procedural sky once it has decoded; the stage strip uses the
// painted planets; the app icons are linked. A missing or renamed file must fail here, not silently fall back.
// Other scripted runs (?e2e) leave the art off; ?e2e&art turns it on.
for(const view of [{name:'desktop',viewport:{width:1366,height:768},art:'landscape'},{name:'phone',viewport:{width:390,height:844},art:'portrait'}])
test(`painted cover, logo and stage planets load (${view.name})`,async({browser})=>{
 const context=await browser.newContext({viewport:view.viewport,isMobile:view.name==='phone',hasTouch:view.name==='phone'});
 try{const page=await context.newPage(),bad:string[]=[];
  page.on('response',r=>{if(r.url().includes('/cover/')&&r.status()>=400)bad.push(`${r.status()} ${r.url()}`);});
  await page.goto('/?e2e&art');await page.locator('[data-action=deploy]').waitFor();
  await expect.poll(()=>page.evaluate(()=>[document.documentElement.dataset.coverArt,document.documentElement.dataset.coverLogo])).toEqual([view.art,'ready']);
  // The painting is the menu's own tank, so the old tank picture steps aside; the words stay for screen readers.
  expect(await page.locator('.tank-showcase').evaluate(e=>getComputedStyle(e).visibility)).toBe('hidden');
  await expect(page.locator('.command-screen h1')).toContainText('STEEL');
  const worlds=await page.locator('.campaign-route .route-item').evaluateAll(items=>items.map(e=>(e as HTMLElement).style.getPropertyValue('--world')));
  expect(worlds).toHaveLength(16);
  const urls=worlds.map(w=>/url\("?([^")]+)"?\)/.exec(w)![1]);
  expect(new Set(urls).size).toBe(16);
  for(const url of urls){const r=await page.request.get(new URL(url,page.url()).href);expect(r.status(),url).toBe(200);expect(r.headers()['content-type']).toContain('image/webp');}
  for(const icon of ['icon-192.png','icon-512.png','apple-touch-icon.png'])expect((await page.request.get(new URL(icon,page.url()).href)).status(),icon).toBe(200);
  expect(bad).toEqual([]);
 }finally{await context.close();}
});

test('scripted runs keep the cover quiet: no painted art, logo or cover animations unless asked',async({page})=>{
 const requested:string[]=[];page.on('request',r=>{if(r.url().includes('/cover/key-art')||r.url().includes('/cover/logo'))requested.push(r.url());});
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();await page.waitForTimeout(500);
 expect(await page.evaluate(()=>{const d=document.documentElement.dataset;return {quiet:'coverQuiet' in d,art:d.coverArt??null,logo:d.coverLogo??null};})).toEqual({quiet:true,art:null,logo:null});
 expect(await page.locator('.cover-fx').evaluate(e=>getComputedStyle(e).display)).toBe('none');
 expect(requested).toEqual([]);
});
