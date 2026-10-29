import {test,expect,type Page} from '@playwright/test';

async function battle(page:Page,stage=13){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 await page.evaluate(stage=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty='normal';g.start(stage,0);g.clearOpening?.();g.player.hp=g.player.max=1e9;},stage);
}

test('a collapsing building throws debris and dust, all inside the five particle draws',async({page})=>{
 await battle(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,fx=g.world.fx;fx.clear();
  const block=g.world.covers.find((c:any)=>c.kind==='cityblock'&&c.hp>0);g.hitCover(block,1e6);fx.update(1/60,g.world.camera);
  const kinds=new Set(fx.particles.map((p:any)=>p.kind));
  return {count:fx.particles.length,kinds:[...kinds].sort(),meshes:fx.root.children.length,draws:fx.root.children.filter((m:any)=>m.count>0).length,limit:fx.particles.length<=fx.limit};});
 expect(r.count).toBeGreaterThan(20);expect(r.kinds).toEqual(expect.arrayContaining(['ring','smoke','spark']));expect(r.meshes).toBe(5);expect(r.draws).toBeLessThanOrEqual(5);expect(r.limit).toBe(true);
});

test('nearby blasts shake the camera briefly and far ones do not',async({page})=>{
 await battle(page,1);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world,p=g.player.visual.root.position;
  w.trauma=0;g.explode({x:p.x+60,z:p.z},4,0);const far=w.trauma;
  g.explode({x:p.x+3,z:p.z},6,0);const near=w.trauma;
  w.update(1/60,p);const shaken=w.camera.position.clone();
  for(let i=0;i<90;i++)w.update(1/60,p);const settled=w.trauma;
  return {far,near,settled,shaken:shaken.toArray().every(Number.isFinite)};});
 expect(r.far).toBe(0);expect(r.near).toBeGreaterThan(.2);expect(r.settled).toBe(0);expect(r.shaken).toBe(true);
});

test('reduced motion keeps the camera still',async({browser})=>{
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
 try{await battle(page,1);
  const r=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world,p=g.player.visual.root.position;
   w.update(1/60,p);w.update(1/60,p);const calm=w.camera.position.clone();w.shake(1);w.update(1/60,p);return w.camera.position.distanceTo(calm);});
  expect(r).toBeLessThan(.05);
 }finally{await context.close();}
});

test('track dust takes the colour of the ground, and every moving tank near the player trails it',async({page})=>{
 await battle(page,7);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world;
  const snow=w.dustColor({x:0,z:0});g.start(11,0);const desert=w.dustColor({x:0,z:0});g.start(13,0);const city=w.dustColor({x:0,z:0});
  g.clearOpening?.();const fx=w.fx;fx.clear();const p=g.player.visual.root.position;
  const tank=g.enemies.find((e:any)=>!e.dead&&!g.isInfantry(e)&&e.role!=='boss');tank.visual.root.position.set(p.x+8,0,p.z+4);g.dustClock=0;g.step(1/60);
  tank.visual.root.position.x+=1;g.dustClock=0;g.step(1/60);
  const near=fx.particles.some((q:any)=>q.kind==='smoke'&&Math.hypot(q.mesh.position.x-tank.visual.root.position.x,q.mesh.position.z-tank.visual.root.position.z)<3);
  return {snow,desert,city,near};});
 expect(new Set([r.snow,r.desert,r.city]).size).toBe(3);expect(r.near).toBe(true);
});
