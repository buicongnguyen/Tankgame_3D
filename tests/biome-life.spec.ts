import {test,expect,type Page} from '@playwright/test';

async function ready(page:Page){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 // Normal difficulty: on Easy the first stage opens on the compact intro arena instead of the grove map.
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty='normal';});
}
const census=(page:Page,stage:number)=>page.evaluate(stage=>{const g=(window as any).__steel;g.start(stage,0);const life=g.world.biomeLife,meshes:any[]=[];
 g.world.arena.traverse((o:any)=>{if(o.userData.biomeLife)meshes.push(o);});
 return {biome:g.world.environment.biome,kind:life.kind,meshes:meshes.length,name:meshes[0]?.name,shadows:meshes.some(m=>m.castShadow||m.receiveShadow),
  count:meshes[0]?.isInstancedMesh?meshes[0].count:meshes[0]?.geometry.instanceCount??0,covers:g.world.covers.length};},stage);

test('every battlefield gets the life that fits it, as one shadowless draw',async({page})=>{
 await ready(page);
 const expected:Record<string,string>={grove:'butterflies',village:'butterflies',ridge:'butterflies',jungle:'butterflies',river:'dragonflies',marsh:'dragonflies',
  volcanic:'embers',wastes:'embers',industrial:'steam',city:'steam',quake:'dust',desert:'tumbleweeds',snow:'glints',glacier:'glints'};
 for(let stage=0;stage<16;stage++){const r=await census(page,stage);
  expect(r.kind,`stage ${stage} ${r.biome}`).toBe(expected[r.biome]);expect(r.meshes,`stage ${stage}`).toBe(1);expect(r.name).toBe(`BiomeLife:${r.kind}`);
  expect(r.shadows).toBe(false);expect(r.count,`stage ${stage}`).toBeGreaterThan(2);}
 // The Easy intro arena opens with butterflies too.
 const intro=await page.evaluate(()=>{const g=(window as any).__steel;g.save.difficulty='easy';g.start(0,0);return g.world.biomeLife.kind;});expect(intro).toBe('butterflies');
});

test('placement is seeded, adds no cover, and the next stage starts clean',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world,life=w.biomeLife;
  const snap=()=>JSON.stringify(life.flyers.map((f:any)=>[f.x,f.z,f.hx,f.hz].map((v:number)=>v.toFixed(3))));
  // Rebuild on the same stage (a stage's cover count can differ between loads, so never compare two loads).
  g.start(0,0);const covers=w.covers.length,first=snap();life.build(w,0);const again=snap();const before=w.covers.length;
  const old=life.mesh;g.start(2,0);const detached=!old.parent;const kind=life.kind;
  return {same:first===again,covers:covers===before,detached,kind};});
 expect(r).toEqual({same:true,covers:true,detached:true,kind:'dragonflies'});
});

test('butterflies scatter from the tank, settle back home and never drift away over minutes',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world,life=w.biomeLife;g.start(0,0);
  const far={x:1e4,y:0,z:1e4},f=life.flyers[0];
  for(let k=0;k<60;k++)life.update(1/60,far,w.target,w);
  // Park the tank right beside one: it takes off away from the tank.
  const tank={x:f.x+2,y:0,z:f.z};const start=Math.hypot(f.x-tank.x,f.z-tank.z);
  for(let k=0;k<90;k++)life.update(1/60,tank,w.target,w);const fled=Math.hypot(f.x-tank.x,f.z-tank.z)-start;
  // Three minutes with nobody near: every one stays around its home.
  for(let k=0;k<180*60;k++)life.update(1/60,far,w.target,w);
  const spread=Math.max(...life.flyers.map((b:any)=>Math.hypot(b.x-b.hx,b.z-b.hz)-b.range)),finite=life.flyers.every((b:any)=>[b.x,b.y,b.z,b.yaw].every(Number.isFinite));
  const heights=life.flyers.map((b:any)=>b.y);return {fled,spread,finite,low:Math.min(...heights),high:Math.max(...heights)};});
 expect(r.fled).toBeGreaterThan(3);expect(r.spread).toBeLessThan(5);expect(r.finite).toBe(true);
 expect(r.low).toBeGreaterThan(.5);expect(r.high).toBeLessThan(5);
});

test('dragonflies hover and dart over their water and keep clear of trees and buildings',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel,w=g.world,life=w.biomeLife;const {circleBox}=await import('/src/three/rules.ts');
  const out:any={};
  for(const stage of [2,15]){g.start(stage,0);const far={x:1e4,y:0,z:1e4};let hovering=0,darting=0,covered=0,samples=0;
   for(let k=0;k<60*60;k++){life.update(1/60,far,w.target,w);if(k%30)continue;
    for(const f of life.flyers){samples++;if(f.hover)hovering++;else darting++;
     if(f.hover&&w.covers.some((c:any)=>c.hp>0&&circleBox({x:f.x,z:f.z},1,c)))covered++;}}
   const water=stage===2?life.flyers.every((f:any)=>Math.abs(f.z-32)<12):true;
   out[stage]={hovering:hovering/samples,darting:darting/samples,covered,water};}
  return out;});
 for(const stage of ['2','15']){expect(r[stage].hovering,stage).toBeGreaterThan(.3);expect(r[stage].darting,stage).toBeGreaterThan(.02);expect(r[stage].covered,stage).toBe(0);expect(r[stage].water).toBe(true);}
});

test('tumbleweeds keep rolling across the desert for minutes, around cover and inside the map',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel,w=g.world,life=w.biomeLife;const {circleBox}=await import('/src/three/rules.ts');g.start(11,0);
  const p={x:1e4,y:0,z:1e4},last=life.weeds.map((x:any)=>({x:x.x,z:x.z})),stall=life.weeds.map(()=>0);let maxStall=0,outside=0,inCover=0,rolled=0;
  for(let k=0;k<180*60;k++){life.update(1/60,p,w.target,w);life.weeds.forEach((x:any,i:number)=>{const d=Math.hypot(x.x-last[i].x,x.z-last[i].z);if(d<5)rolled+=d;
   stall[i]=d<1e-4?stall[i]+1/60:0;maxStall=Math.max(maxStall,stall[i]);last[i]={x:x.x,z:x.z};
   if(Math.abs(x.x)>w.bounds.x-3||Math.abs(x.z)>w.bounds.z-3)outside++;
   if(k%20===0&&w.covers.some((c:any)=>c.hp>0&&!c.boundary&&circleBox({x:x.x,z:x.z},.3,c)))inCover++;});}
  return {count:life.weeds.length,maxStall,outside,inCover,perWeed:rolled/life.weeds.length};});
 expect(r.count).toBeGreaterThanOrEqual(3);expect(r.maxStall).toBeLessThan(.5);expect(r.outside).toBe(0);expect(r.inCover).toBe(0);
 expect(r.perWeed).toBeGreaterThan(250);   // about 2-4 m/s for three minutes, respawns not counted
});

test('particles live on the GPU: vents clear of cover, fields follow the camera, and pausing freezes them',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel,w=g.world,life=w.biomeLife;const {circleBox}=await import('/src/three/rules.ts');
  g.start(13,0);const geo=life.mesh.geometry,seed=geo.getAttribute('aSeed'),base=geo.getAttribute('aBase');let vents=0,blocked=0;
  for(let i=0;i<seed.count;i++)if(base.getY(i)<.5){vents++;if(w.covers.some((c:any)=>c.hp>0&&circleBox({x:seed.getX(i),z:seed.getY(i)},.5,c)))blocked++;}
  const steamDynamic=geo.getAttribute('aSeed').usage;
  g.start(10,0);const p={x:0,y:0,z:0};w.target.set(12,0,-7);life.update(1/60,p,w.target,w);const center=life.uniforms.uCenter.value.toArray();
  const t=life.uniforms.uTime.value;for(let k=0;k<30;k++)life.update(0,p,w.target,w);const paused=life.uniforms.uTime.value===t;
  return {vents,blocked,center,paused,frustum:life.mesh.frustumCulled,instanced:life.mesh.geometry.isInstancedBufferGeometry,static:steamDynamic===35044};});
 expect(r.vents).toBeGreaterThan(5);expect(r.blocked).toBe(0);expect(r.center).toEqual([12,-7-16]);   // centred ahead of the look pointexpect(r.paused).toBe(true);
 expect(r.instanced).toBe(true);expect(r.static).toBe(true);   // StaticDrawUsage: written once, never re-uploaded
});

test('reduced motion shows none of it; phones and Low detail get a smaller share',async({browser})=>{
 const run=async(options:object,low=false)=>{const context=await browser.newContext(options);try{const page=await context.newPage();await ready(page);
  if(low)await page.evaluate(async()=>{const g=(window as any).__steel;await g.world.load(true);g.world.settings(true);});
  return await page.evaluate(()=>{const g=(window as any).__steel;const n=(stage:number)=>{g.start(stage,0);const m=g.world.biomeLife.mesh;return m?(m.isInstancedMesh?m.count:m.geometry.instanceCount):0;};return {meadow:n(0),embers:n(10)};});}finally{await context.close();}};
 const desk=await run({viewport:{width:1440,height:900}}),phone=await run({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),low=await run({viewport:{width:1440,height:900}},true);
 const still=await run({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 expect(phone.meadow).toBeLessThan(desk.meadow);expect(low.meadow).toBeLessThan(desk.meadow);expect(phone.embers).toBeLessThan(desk.embers);
 expect(still).toEqual({meadow:0,embers:0});
});
