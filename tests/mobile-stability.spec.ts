import {test,expect} from '@playwright/test';
import {freshSave,parseSave,SAVE_KEY} from '../src/three/campaign';
import {RenderPacer} from '../src/three/render-pacer';

test('new campaigns start Easy; saved difficulty and deliberate graphics selections survive',()=>{
 expect(freshSave().difficulty).toBe('easy');
 for(const difficulty of ['easy','normal','hard','crazy'] as const){const s={...freshSave(),difficulty,graphicsChosen:true,low:false};expect(parseSave(JSON.stringify(s))).toMatchObject(s);}
});

test('render pacing limits submissions across 60/120/144 Hz and resumes without backlog',()=>{
 for(const hz of [60,120,144])for(const fps of [30,60]){const pacer=new RenderPacer();let frames=0;for(let i=0;i<hz*5;i++)if(pacer.due(i*1000/hz,fps))frames++;expect(Math.abs(frames-fps*5)).toBeLessThanOrEqual(1);expect(pacer.due(12000,fps)).toBe(true);expect(pacer.due(1,fps)).toBe(true);}
});

test('Easy halves every enemy type including bosses without changing encounter counts',async({page})=>{
 await page.goto('/?e2e');await page.waitForFunction(()=>(window as any).__steel?.phase==='menu');const rows=await page.evaluate(async()=>{
  const g=(window as any).__steel,{BOSS}=await import('/src/three/bosses.ts');g.frame=()=>{};const result=[];
  for(const difficulty of ['normal','easy']){
   g.save.difficulty=difficulty;g.start(15,2);const counts=g.enemies.length;g.world.covers=[];g.world.activities=[];g.world.navigationRevision++;g.enemies=[];
   const health=[];for(const role of ['rifleman','rocketeer','jeep','raider','sentry','heavy']){const u=g.makeUnit(0,0,role);health.push(u.max);}
   for(const kind of Object.keys(BOSS)){const u=g.makeUnit(0,0,'boss',kind);health.push(u.max);}
   result.push({difficulty,counts,health,player:g.player.max});
  }return result;
 });expect(rows[1].counts).toBe(rows[0].counts);expect(rows[1].health).toEqual(rows[0].health.map(h=>h/2));expect(rows[1].player).toBe(rows[0].player*6);
});

test('phone defaults to High, legacy progress and manual Low choice persist',async({browser})=>{
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:3});const page=await context.newPage();
 await page.goto('/?e2e');await expect.poll(()=>page.evaluate(()=>(window as any).__steel?.save.low)).toBe(false);
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return {easy:g.save.difficulty,shadow:g.world.renderer.shadowMap.enabled,ratio:g.world.renderer.getPixelRatio(),antialias:g.world.renderer.getContext().getContextAttributes().antialias};})).toEqual({easy:'easy',shadow:true,ratio:1.6,antialias:true});
 const legacy={...freshSave(),difficulty:'hard',credits:123,low:false};delete legacy.graphicsChosen;
 await page.evaluate(({key,save})=>{localStorage.removeItem('steel-front-3d-state-v2');localStorage.setItem(key,JSON.stringify(save));},{key:SAVE_KEY,save:legacy});await page.evaluate(()=>(window as any).__steel.storage.flush());await page.reload();await page.waitForFunction(()=>(window as any).__steel?.phase==='menu');
 expect(await page.evaluate(()=>{const s=(window as any).__steel.save;return [s.low,s.difficulty,s.credits];})).toEqual([false,'hard',123]);
 await page.locator('.menu-settings>summary').click();await page.locator('[data-action="quality"]').tap();await expect(page.locator('[data-action="quality"]')).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>(window as any).__steel.storage.flush());await page.reload();await page.waitForFunction(()=>(window as any).__steel?.phase==='menu');expect(await page.evaluate(()=>(window as any).__steel.save.low)).toBe(true);await context.close();
});

test('effect resources are reused and retired enemy graphics leave the scene',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{
  const g=(window as any).__steel,w=g.world;g.frame=()=>{};w.settings(true);w.fx.clear();const first=new Set(),second=new Set();
  for(let round=0;round<50;round++){for(let i=0;i<48;i++)w.fx.smoke(g.player.visual.root.position);for(const p of w.fx.particles)(round===0?first:second).add(p.mesh.material.uuid);w.fx.update(2,w.camera);}
  const reused=first.size===48&&second.size===48&&[...second].every(id=>first.has(id)),bounded=w.fx.particles.length+w.fx.pooled<=48;
  const enemies=g.enemies.slice();for(const e of enemies)g.damageUnit(e,1e9,g.player.visual.root.position,true);const retired=enemies.every(e=>e.visual.root.parent===null&&e.visual.beam.parent===null&&e.visual.bar.parent===null);
  const wrecks=w.wrecks.length;w.update(21,g.player.visual.root.position);const expired=w.wrecks.length===0;g.start(0);return {reused,bounded,retired,wrecks,expired,cleared:w.fx.pooled===0&&w.fx.particles.length===0,live:g.enemies.every(e=>e.visual.root.parent!==null)};
 });expect(r).toMatchObject({reused:true,bounded:true,retired:true,expired:true,cleared:true,live:true});expect(r.wrecks).toBeLessThanOrEqual(6);
});

test('lost graphics stops rendering and offers a saved low-detail restart',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.world.renderer.domElement.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));const frame=g.frame.bind(g);g.frame=()=>{};let renders=0;g.world.update=()=>renders++;frame(performance.now()+100);g.resume();return {renders,low:g.save.low,chosen:g.save.graphicsChosen,active:g.input.active,phase:g.phase,visible:!g.overlay.hidden};});
 expect(r).toEqual({renders:0,low:true,chosen:true,active:false,phase:'paused',visible:true});await expect(page.getByRole('button',{name:'Reload in low detail'})).toBeVisible();
});

test('low-detail pacing preserves 60 Hz combat and bounds overload catch-up',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const rows=await page.evaluate(async()=>{
  const g=(window as any).__steel,{RenderPacer}=await import('/src/three/render-pacer.ts'),frame=g.frame.bind(g);g.frame=()=>{};const rows=[];
  for(const low of [false,true]){let steps=0,renders=0;g.world.low=low;g.renderPacer=new RenderPacer();g.last=0;g.accumulator=0;g.step=()=>steps++;g.world.update=()=>renders++;
   for(let i=0;i<=300;i++)frame(i*1000/60);const before=steps;frame(10000);rows.push({low,steps:before,renders,catchup:steps-before,debt:g.accumulator});
  }return rows;
 });expect(Math.abs(rows[0].steps-rows[1].steps)).toBeLessThanOrEqual(1);expect(rows[1].steps).toBeGreaterThanOrEqual(299);expect(rows[1].renders).toBeLessThan(rows[0].renders*.52);for(const r of rows){expect(r.catchup).toBeLessThanOrEqual(3);expect(r.debt).toBeLessThanOrEqual(1/60);}
});

test('graphics loss during a detail download keeps the low-detail recovery screen',async({page})=>{
 await page.goto('/?e2e');await page.waitForFunction(()=>(window as any).__steel?.phase==='menu');const r=await page.evaluate(async()=>{
  const g=(window as any).__steel;g.frame=()=>{};let release:any;g.world.load=()=>new Promise(resolve=>release=resolve);const changing=g.changeQuality();
  g.world.renderer.domElement.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));release();await changing;return {low:g.save.low,lost:g.graphicsLost,changing:g.qualityChanging};
 });expect(r).toEqual({low:true,lost:true,changing:false});await expect(page.getByRole('button',{name:'Reload in low detail'})).toBeVisible();
});
