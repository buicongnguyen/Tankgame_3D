import {test,expect,type Page} from '@playwright/test';

async function ready(page:Page,difficulty='normal'){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 // Normal difficulty: on Easy the first stage opens on the compact intro arena instead of the grove map.
 await page.evaluate(difficulty=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty=difficulty;},difficulty);
}
const census=(page:Page,stage:number)=>page.evaluate(stage=>{const g=(window as any).__steel;g.start(stage,0);const t=g.world.townLife;
 const meshes:any[]=[];g.world.arena.traverse((o:any)=>{if(['TownFlags','TownSmoke','TownBirds'].includes(o.name))meshes.push(o);});
 return {names:meshes.map(m=>m.name).sort(),instanced:meshes.every(m=>m.isInstancedMesh),shadows:meshes.some(m=>m.castShadow||m.receiveShadow),
  flags:t.flags?.count??0,chimneys:(t as any).chimneys.length,birds:t.birds?.count??0,covers:g.world.covers.length,buildings:g.world.covers.filter((c:any)=>c.kind==='house'||c.kind==='cityblock').length,
  flagSpots:(t as any).flagHosts.map((c:any)=>`${c.x.toFixed(1)},${c.z.toFixed(1)}`).join('|')};},stage);

test('towns get flags, chimney smoke and birds as one shadowless draw each; a stage without buildings gets none',async({page})=>{
 await ready(page);
 const village=await census(page,1),city=await census(page,13);
 expect(village.names).toEqual(['TownBirds','TownFlags','TownSmoke']);expect(village.instanced).toBe(true);expect(village.shadows).toBe(false);
 expect(village.flags).toBeGreaterThan(0);expect(village.chimneys).toBeGreaterThan(0);expect(village.birds).toBeGreaterThanOrEqual(3);
 expect(city.flags).toBeGreaterThan(2);expect(city.birds).toBeGreaterThanOrEqual(3);
 // Dressing follows buildings: every stage with one gets flags, and the compact Easy intro arena (no buildings) gets nothing.
 for(const stage of [0,2,7,12]){const r=await census(page,stage);expect(r.flags>0,`stage ${stage}`).toBe(r.buildings>0);}
 await page.evaluate(()=>{(window as any).__steel.save.difficulty='easy';});const intro=await census(page,0);expect(intro.buildings).toBe(0);expect(intro.names).toEqual([]);
 // Placement is seeded (rebuilding on the same stage dresses the same buildings) and adds no covers.
 const seeded=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world,t=w.townLife as any,spots=()=>t.flagHosts.map((c:any)=>`${c.x},${c.z}`).join('|');
  g.start(1,0);const covers=w.covers.length,first=spots();t.build(w,1);return {same:spots()===first,covers:w.covers.length===covers,flags:t.flagHosts.length};});
 expect(seeded).toEqual({same:true,covers:true,flags:village.flags});
});

test('a destroyed building loses its flag and its smoke, and the next stage starts clean',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.start(1,0);const t=g.world.townLife as any;
  const host=t.flagHosts.find((c:any)=>c.kind==='house'&&t.chimneys.some((ch:any)=>ch.host===c))??t.flagHosts[0];
  const i=t.flagHosts.indexOf(host),before=t.flags.instanceMatrix.array[i*16+13];
  for(let k=0;k<120;k++)t.update(1/60);const puffs=t.smoke?.count??0;
  g.hitCover(host,1e6);t.update(1/60);const after=t.flags.instanceMatrix.array[i*16+13];
  // No new puff may leave that chimney once the house is gone: look after every update for four seconds.
  const chimney=t.chimneys.find((ch:any)=>ch.host===host);let fresh=0;
  if(chimney)for(let k=0;k<240;k++){t.update(1/60);fresh+=t.puffs.filter((p:any)=>p.age<p.life&&p.age<=1/60+1e-6&&Math.hypot(p.x-chimney.x,p.z-chimney.z)<.05).length;}
  const old={flags:t.flags,smoke:t.smoke,birds:t.birds};
  // The Easy intro arena has no buildings: nothing of the last stage may linger.
  g.save.difficulty='easy';g.start(0,0);
  return {chimney:!!chimney,before,after,puffs,fresh,hostDown:host.hp<=0,detached:[old.flags,old.smoke,old.birds].every((m:any)=>!m||!m.parent),stale:!!t.flags||!!t.smoke||!!t.birds};});
 expect(r.chimney).toBe(true);expect(r.hostDown).toBe(true);expect(r.before).toBeGreaterThan(3);expect(r.after).toBeLessThan(-10);
 expect(r.puffs).toBeGreaterThan(0);expect(r.fresh).toBe(0);
 expect(r.detached).toBe(true);expect(r.stale).toBe(false);
});

test('reduced motion keeps still flags only; phones and Low detail get a smaller share',async({browser})=>{
 const run=async(options:object,low=false)=>{const context=await browser.newContext(options),page=await context.newPage();await ready(page);
  if(low)await page.evaluate(async()=>{const g=(window as any).__steel;await g.world.load(true);g.world.settings(true);});
  const r=await census(page,13);await context.close();return r;};
 const desk=await run({viewport:{width:1440,height:900}}),phone=await run({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),low=await run({viewport:{width:1440,height:900}},true);
 const still=await run({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 expect(phone.birds).toBeLessThan(desk.birds);expect(low.birds).toBeLessThan(desk.birds);expect(phone.flags).toBeLessThanOrEqual(desk.flags);
 expect(still.names).toEqual(['TownFlags']);
});

test('gulls keep circling over the town for minutes without drifting away or bunching up',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.start(1,0);const t=g.world.townLife as any,f=t.flock;
  const spread=()=>Array.from(f.x as Float32Array).map((x:number,i:number)=>Math.hypot(x-f.cx,f.z[i]-f.cz));
  for(let k=0;k<90*60;k++)t.update(1/60);const d=spread();return {r:f.r,min:Math.min(...d),max:Math.max(...d)};});
 expect(r.min).toBeGreaterThan(r.r*.4);expect(r.max).toBeLessThan(r.r*1.6);
});
