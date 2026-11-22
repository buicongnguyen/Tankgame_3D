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
  // Absolute addresses only: a relative url() inside a CSS variable resolves against the built stylesheet in
  // /assets/, which 404ed on Pages while dev (inline CSS) looked fine.
  const vars=await page.evaluate(()=>['--cover-art','--cover-logo'].map(v=>document.documentElement.style.getPropertyValue(v)));
  for(const v of [...vars,...worlds])expect(v,v).toMatch(/url\("?https?:\/\//);
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

test('a delayed cover never displays the old tank, and failure restores the fallback',async({page})=>{
 let release!:()=>void;
 const waiting=new Promise<void>(resolve=>release=resolve);
 await page.route('**/cover/key-art-landscape-b.webp',async route=>{await waiting;await route.abort();});
 await page.goto('/?e2e&art',{waitUntil:'domcontentloaded'});
 const tank=page.locator('.tank-showcase');
 try {
   await page.locator('[data-action=deploy]').waitFor();
   await expect(tank).toHaveCSS('visibility','hidden');
   expect(await page.evaluate(()=>document.documentElement.dataset.coverUrl)).toBeUndefined();
 } finally {release();}
 await expect(tank).toHaveCSS('visibility','visible');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.cover)).toBe('ready');
});
test('a repeat visit keeps the painted artwork without generating a fallback',async({page})=>{
 await page.goto('/?e2e&art');
 for(let visit=0;visit<2;visit++){
   if(visit)await page.reload();
   await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.coverArt)).toBe('landscape');
   expect(await page.evaluate(()=>document.documentElement.dataset.coverUrl)).toBeUndefined();
 }
});
