import {test,expect,type Page} from '@playwright/test';
async function game(page:Page){await page.goto('/?e2e');await expect(page.getByRole('button',{name:'DEPLOY'})).toBeVisible();await page.evaluate(()=>{(window as any).__steel.frame=()=>{};});}

test('holding fire over the training laser cannot consume the required lesson ammo',async({page})=>{
 await game(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.startTraining(1);const cache=g.world.activities.find((a:any)=>a.kind==='laser');
  g.player.visual.root.position.set(cache.x,0,cache.z);g.input.keys.add('Space');g.updateActivities(.01);g.training.update(g);
  const collected=g.training.collected,weapon=g.weapon,ammo=g.specialAmmo[0];
  for(let i=0;i<40;i++)g.updatePlayer(.2);
  const protectedAmmo=g.specialAmmo[0]===ammo;g.input.reset();g.action('4');
  const selected=g.training.switched&&g.weapon===3;g.reload=0;g.shoot(g.player,true);
  return {collected,weapon,ammo,protectedAmmo,selected,usable:g.specialAmmo[0]===ammo-1};
 });expect(r.collected&&r.protectedAmmo&&r.selected&&r.usable).toBe(true);expect(r.weapon).toBe(0);expect(r.ammo).toBeGreaterThan(0);
});

test('rescue extraction requires a living ally at the exit; all-clear still ends anywhere',async({page})=>{
 await game(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.start(13,1);g.allies.tanks.forEach((a:any)=>a.rescued=true);
  const exit=g.world.layout.points.at(-1),first=g.allies.tanks[0].unit,second=g.allies.tanks[1].unit;
  g.player.visual.root.position.set(exit.x,0,exit.z);first.visual.root.position.set(0,0,0);second.visual.root.position.set(5,0,0);
  const waits=g.objectiveProgress()<1;first.visual.root.position.set(exit.x+2,0,exit.z);const escorted=g.objectiveProgress()===1;
  first.dead=true;const deadDoesNotCount=g.objectiveProgress()<1;
  g.enemies.forEach((e:any)=>e.dead=true);g.player.visual.root.position.set(0,0,0);const allClear=g.objectiveProgress()===1;
  second.dead=true;g.step(.01);return {waits,escorted,deadDoesNotCount,allClear,failed:g.phase==='failed'};
 });expect(r).toEqual({waits:true,escorted:true,deadDoesNotCount:true,allClear:true,failed:true});
});

test('transport target searches are bounded and cached targets still respect new cover',async({page})=>{
 await game(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.start(2,0);g.world.covers=[];g.world.navigationRevision++;g.enemies=[];
  const p=g.convoy.position,e=g.makeUnit(p.x+10,p.z,'raider');e.encounter={active:true,group:0};g.enemies=[e];
  let scans=0;const filter=g.enemies.filter;g.enemies.filter=function(...args:any[]){scans++;return filter.apply(this,args);};
  g.allies.cooldown=0;for(let i=0;i<60;i++){g.elapsed=i/60;g.allies.update(g,1/60);}
  const acquired=g.shots[0]?.homing===e,before=g.shots.length;
  g.world.concreteBarrier({x:p.x+5,z:p.z,w:1.8,d:6});g.allies.cooldown=0;g.elapsed+=.001;g.allies.update(g,.001);
  const blocked=g.shots.length===before;g.start(2,0);return {scans,acquired,blocked,reset:g.allies.target===undefined};
 });expect(r.scans).toBeLessThanOrEqual(6);expect(r.acquired&&r.blocked&&r.reset).toBe(true);
});

test('a dormant enemy detects a rescued ally even when Kestrel is behind cover',async({page})=>{
 await game(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.start(13,1);g.world.covers=[];g.world.navigationRevision++;g.enemies=[];
  const a=g.allies.tanks[0];a.rescued=true;a.unit.visual.root.position.set(12,0,0);g.player.visual.root.position.set(0,0,24);
  const e=g.makeUnit(0,0,'raider');e.encounter={group:0,active:false,anchor:{x:0,z:0},meters:0};g.enemies=[e];
  g.world.concreteBarrier({x:0,z:12,w:10,d:1.8});g.encounters.reset();g.encounters.update(g);
  return {active:e.encounter.active,source:e.lastSeen};
 });expect(r.active).toBe(true);expect(r.source).toEqual({x:12,z:0});
});

test('the touch weapon picker completes the laser lesson and retry names that lesson',async({browser})=>{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const page=await context.newPage();await game(page);
 await page.evaluate(()=>{const g=(window as any).__steel;g.startTraining(1);const a=g.world.activities.find((a:any)=>a.kind==='laser');g.player.visual.root.position.set(a.x,0,a.z);g.updateActivities(.01);g.training.update(g);g.updateHud();});
 await page.locator('#weapon').tap();await page.locator('#weapon-picker [data-weapon="4"]').tap();
 expect(await page.evaluate(()=>(window as any).__steel.training.switched)).toBe(true);
 await page.evaluate(()=>(window as any).__steel.fail());await expect(page.getByRole('button',{name:'RETRY FIRST ARMOR'})).toBeVisible();
 await context.close();
});

test('selecting the laser immediately after pickup counts before the next simulation update',async({page})=>{
 await game(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.startTraining(1);const cache=g.world.activities.find((a:any)=>a.kind==='laser');
  g.player.visual.root.position.set(cache.x,0,cache.z);g.updateActivities(.01);g.action('4');
  return {collected:g.training.collected,switched:g.training.switched,weapon:g.weapon};
 });expect(r).toEqual({collected:true,switched:true,weapon:3});
});

test('the surviving rear ally closes its following gap to reach extraction',async({page})=>{
 await game(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.start(13,1);g.world.covers=[];g.world.navigationRevision++;
  g.world.layout.points=[{x:0,z:20},{x:0,z:0}];g.player.visual.root.position.set(0,0,0);
  g.enemies.forEach((e:any)=>e.visual.root.position.set(50,0,50));g.allies.tanks.forEach((a:any)=>a.rescued=true);
  g.allies.tanks[0].unit.dead=true;const rear=g.allies.tanks[1].unit;rear.visual.root.position.set(0,0,20);
  g.allies.trail=[{x:0,z:20},{x:0,z:10},{x:0,z:0}];const waits=g.objectiveProgress()<1;
  for(let i=0;i<240;i++){g.elapsed+=1/30;g.allies.update(g,1/30);}
  return {waits,arrived:g.objectiveProgress()===1,gap:rear.visual.root.position.distanceTo(g.player.visual.root.position)};
 });expect(r.waits&&r.arrived).toBe(true);expect(r.gap).toBeLessThan(7);
});
