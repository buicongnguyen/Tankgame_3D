import {test,expect,type Browser,type Page} from '@playwright/test';

const PHONE={viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3};

/** Deploys on a phone (optionally in Low detail) with the real frame loop stopped first, so a test feeds the
 *  frame budget exact frame timings. */
async function battle(browser:Browser,low=false,options:object=PHONE){
 const context=await browser.newContext(options),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 await page.evaluate(async low=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};if(low){await g.world.load(true);g.world.settings(true);g.save.low=true;}},low);
 await page.locator('[data-action=deploy]').click();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
 return {context,page,errors};
}
/** Feeds `seconds` of animation frames. `gap` is the frame time in ms, as a number or as a function of the current
 *  pixel ratio (a GPU-bound device renders faster at a lower ratio); with `every` > 1 only every n-th frame renders. */
function drive(page:Page,seconds:number,gap:number|string,every=1){
 return page.evaluate(({seconds,gap,every})=>{const g=(window as any).__steel,w=window as any,ratio=()=>g.world.renderer.getPixelRatio();
  const time=typeof gap==='number'?()=>gap:new Function('ratio',`return ${gap}`) as (r:number)=>number;
  w.__t??=performance.now();for(let spent=0;spent<seconds*1000;){const step=time(ratio());spent+=step;w.__t+=step;w.__n=(w.__n??0)+1;g.budget.frame(g,w.__t,w.__n%every===0);}
  return ratio();},{seconds,gap,every});
}
const hints=(page:Page)=>page.locator('.perf-hint');

test('a GPU-bound phone gives resolution back step by step, then offers Low detail once',async({browser})=>{
 const {context,page,errors}=await battle(browser);
 // Frame time scales with pixel count: 107 ms at 1.6x, 42 ms at 1x (still under 25 FPS).
 const gpu='42*ratio*ratio';
 expect(await drive(page,1,gpu)).toBe(1.6);
 expect(await drive(page,12,gpu)).toBe(1);                    // each drop sped frames up, so each one stayed
 // A pause keeps the settled resolution; test runs never show the hint on their own.
 await page.evaluate(()=>(window as any).__steel.pause());expect(await drive(page,2,gpu)).toBe(1);
 await page.evaluate(()=>(window as any).__steel.resume());
 await drive(page,8,gpu);await expect(hints(page)).toHaveCount(0);
 await page.evaluate(()=>{(window as any).__steel.budget.hints=true;});
 await drive(page,1,gpu);await expect(hints(page)).toBeVisible();
 await drive(page,10,gpu);await expect(hints(page)).toHaveCount(1);   // offered once
 await page.locator('.perf-hint [data-choice=low]').tap();
 await expect(page.locator('body')).toHaveAttribute('data-phase','paused');await expect(hints(page)).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>{const g=(window as any).__steel;return {low:g.world.low,saved:g.save.low};}),{timeout:30000}).toEqual({low:true,saved:true});
 expect(errors).toEqual([]);await context.close();
});

test('a 30 Hz power-saving cap keeps full resolution and never suggests Low detail',async({browser})=>{
 const {context,page,errors}=await battle(browser);
 await page.evaluate(()=>{(window as any).__steel.budget.hints=true;});
 const seen=new Set<number>();for(let i=0;i<20;i++)seen.add(await drive(page,1,1000/30));
 expect([...seen].some(r=>r<1.6)).toBe(true);                 // one drop was tried...
 expect(await drive(page,1,1000/30)).toBe(1.6);               // ...undone because frames did not speed up
 expect(await drive(page,15,1000/30)).toBe(1.6);              // and not tried again this battle
 await expect(hints(page)).toHaveCount(0);
 expect(errors).toEqual([]);await context.close();
});

test('Low detail sharpens only while the phone keeps up, not back to a rate that ran late, and resets after battle',async({browser})=>{
 const {context,page,errors}=await battle(browser,true);
 expect(await drive(page,1,1000/60,2)).toBeCloseTo(.8,5);      // the old small buffer to start
 expect(await drive(page,30,1000/60,2)).toBeCloseTo(1.2,5);    // 30 FPS with display-rate frames to spare: up to 1.2x
 const dropped=await drive(page,5,'40*ratio*ratio');expect(dropped).toBeLessThan(1.2);
 const recovered=await drive(page,30,1000/60,2);expect(recovered).toBeGreaterThan(dropped);expect(recovered).toBeLessThan(1.19);
 // Leaving the battle while sharpened restores the tier ratio (0.8x, at most 960 px on the long side).
 await page.evaluate(()=>(window as any).__steel.showMenu());expect(await drive(page,.2,1000/60)).toBeCloseTo(.8,5);
 expect(errors).toEqual([]);await context.close();
});

test('desktop keeps its fixed resolution however slow the frames',async({browser})=>{
 const {context,page}=await battle(browser,false,{viewport:{width:1440,height:900},deviceScaleFactor:2});
 expect(await page.evaluate(()=>(window as any).__steel.world.renderer.getPixelRatio())).toBe(1.6);
 expect(await drive(page,12,'42*ratio*ratio')).toBe(1.6);
 await context.close();
});

test('Low detail draws drop shadows under ground units along their heading; High relies on shadow maps',async({browser})=>{
 const {context,page}=await battle(browser,true);
 const shadows=()=>page.evaluate(()=>{const g=(window as any).__steel,units=[g.player,...g.enemies,...g.allies.tanks.map((a:any)=>a.unit)];
  for(const u of units)u.heading=.9;g.budget.beforeRender(g);let mesh:any;g.world.scene.traverse((o:any)=>{if(o.name==='ContactShadows')mesh=o;});
  const ground=units.filter((u:any)=>u&&!u.dead&&!u.pending&&u.visual.root.visible&&!g.airborne(u)).length+(g.convoy?.visible?1:0);
  // Elongated (vehicle) shadows must run along the heading: their long local axis is parallel to (sin h, cos h).
  let vehicles=0,aligned=0;const m=new (g.world.camera.matrixWorld.constructor)();
  for(let i=0;i<(mesh?.count??0);i++){mesh.getMatrixAt(i,m);const e=m.elements,a=Math.hypot(e[0],e[1],e[2]),b=Math.hypot(e[4],e[5],e[6]);if(b<a*1.2)continue;vehicles++;
   if(Math.abs((e[4]*Math.sin(.9)+e[6]*Math.cos(.9))/b)>.99)aligned++;}
  return {visible:!!mesh?.visible,count:mesh?.count??0,ground,vehicles,aligned};});
 const low=await shadows();expect(low.visible).toBe(true);expect(low.count).toBe(low.ground);expect(low.vehicles).toBeGreaterThan(0);expect(low.aligned).toBe(low.vehicles);
 await page.evaluate(()=>{const g=(window as any).__steel;g.world.settings(false);});
 expect((await shadows()).visible).toBe(false);
 await context.close();
});

test('?perf shows a live frame readout',async({browser})=>{
 const context=await browser.newContext(PHONE),page=await context.newPage();
 await page.goto('/?e2e&perf');await page.locator('[data-action=deploy]').click();
 await expect(page.locator('.perf-readout')).toContainText(/\d+ fps/,{timeout:20000});
 await expect(page.locator('.perf-readout')).toContainText(/draws/);
 await context.close();
});
