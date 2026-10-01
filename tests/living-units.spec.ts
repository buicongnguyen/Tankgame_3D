import {test,expect,type Page} from '@playwright/test';

async function battle(page:Page,mission=13,level=2){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 await page.evaluate(({mission,level})=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty='normal';g.start(mission,level);g.clearOpening?.();},{mission,level});
}

test('soldiers stride on their own rhythm, matched to the ground, and stand still at rest',async({page})=>{
 await battle(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,soldiers=g.enemies.filter((e:any)=>!e.dead&&g.isInfantry(e)).slice(0,8);
  const leg=(u:any)=>u.visual.root.getObjectByName('LeftLeg').rotation.x;
  // Walk every soldier the same distance; different birthplaces mean different phases.
  for(let s=0;s<40;s++)for(const u of soldiers){u.visual.root.position.x+=.04;u.visual.root.userData.walking=true;g.syncVisual(u);}
  const walking=soldiers.map(leg),distinct=new Set(walking.map((v:number)=>v.toFixed(2))).size;
  // Standing: the legs ease back to the rest pose.
  for(let s=0;s<60;s++)for(const u of soldiers){u.visual.root.userData.walking=false;g.syncVisual(u);}
  return {distinct,swinging:walking.some((v:number)=>Math.abs(v)>.1),rest:Math.max(...soldiers.map((u:any)=>Math.abs(leg(u))))};});
 expect(r.distinct).toBeGreaterThan(4);expect(r.swinging).toBe(true);expect(r.rest).toBeLessThan(.01);
});

test('idle look-around, a gun kick and a hit stagger play and then settle',async({page})=>{
 await battle(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,u=g.enemies.find((e:any)=>!e.dead&&e.role==='rifleman');
  // Calm for a while: the upper body scans away from the aim.
  u.visual.beam.visible=false;u.searchUntil=-1;u.visual.root.userData.walking=false;let scanned=0;for(let i=0;i<360;i++){g.elapsed+=1/60;g.syncVisual(u);scanned=Math.max(scanned,Math.abs(u.visual.turret.rotation.y-u.aim));}
  // While its warning beam shows, a soldier keeps its gun on the aim: no looking around.
  u.visual.beam.visible=true;for(let i=0;i<240;i++){g.elapsed+=1/60;g.syncVisual(u);}const aiming=Math.abs(u.visual.turret.rotation.y-u.aim);u.visual.beam.visible=false;
  const before=g.shots.length;u.cooldown=0;g.shoot(u,false);const fired=g.shots.length>before;
  // Right after firing the gun kicks, then settles; a hit staggers, then settles.
  g.syncVisual(u);const kick=u.visual.turret.rotation.x;for(let i=0;i<30;i++){g.elapsed+=1/60;g.syncVisual(u);}const settled=u.visual.turret.rotation.x;
  g.damageUnit(u,1,{x:u.visual.root.position.x+5,z:u.visual.root.position.z});g.syncVisual(u);const stagger=u.visual.turret.rotation.x;for(let i=0;i<40;i++){g.elapsed+=1/60;g.syncVisual(u);}
  return {scanned,aiming,fired,kick,settled,staggered:stagger,recovered:u.visual.turret.rotation.x};});
 expect(r.scanned).toBeGreaterThan(.2);expect(r.aiming).toBeLessThan(.01);expect(r.fired).toBe(true);
 expect(r.kick).toBeLessThan(-.05);expect(Math.abs(r.settled)).toBeLessThan(.01);
 expect(r.staggered).toBeLessThan(-.05);expect(Math.abs(r.recovered)).toBeLessThan(.01);
});

test('the shot origin is identical with and without the idle pose',async({page})=>{
 await battle(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,u=g.enemies.find((e:any)=>!e.dead&&e.role==='rifleman');
  const fire=()=>{u.cooldown=0;g.shoot(u,false);const s=g.shots.pop();s.mesh.removeFromParent();return [s.mesh.position.x,s.mesh.position.y,s.mesh.position.z].map((v:number)=>+v.toFixed(4));};
  g.syncVisual(u);const plain=fire();
  // Pose the upper body as far from the aim as the idle life can (scan, lean, bob, kick), then fire again.
  u.visual.turret.rotation.set(-.3,u.aim+.45,.12);u.visual.turret.position.y+=.08;const posed=fire();
  return {plain,posed};});
 expect(r.posed).toEqual(r.plain);
});

test('the rig keeps animating after a detail change and jeep wheels roll with distance, backwards in reverse',async({page})=>{
 await battle(page,0,0);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel,soldier=g.enemies.find((e:any)=>!e.dead&&g.isInfantry(e)),jeep=g.enemies.find((e:any)=>!e.dead&&e.role==='jeep');
  await g.world.load(true);g.world.settings(true);
  const leg=soldier.visual.root.getObjectByName('LeftLeg');let swing=0;
  for(let i=0;i<20;i++){soldier.visual.root.position.x+=.05;soldier.visual.root.userData.walking=true;g.syncVisual(soldier);swing=Math.max(swing,Math.abs(leg.rotation.x));}
  const live=!!leg.parent&&swing>.05;
  const w=jeep.visual.root.getObjectByName('WheelFL'),h=jeep.heading,move=(m:number)=>{const s=w.rotation.x;jeep.visual.root.position.x+=Math.sin(h)*m;jeep.visual.root.position.z+=Math.cos(h)*m;jeep.visual.root.userData.walking=true;g.syncVisual(jeep);return +(s-w.rotation.x).toFixed(3);};
  const forward=move(.84),backward=move(-.84);
  await g.world.load(false);g.world.settings(false);return {live,forward,backward};});
 expect(r.live).toBe(true);
 expect(r.forward).toBeCloseTo(2,1);expect(r.backward).toBeCloseTo(-2,1);   // 0.84 m on a 0.42 m wheel is 2 radians
});

test('drawn positions blend between fixed steps and the exact logic positions come back after the frame',async({page})=>{
 await battle(page,0,0);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,p=g.player.visual.root.position;
  p.set(0,0,0);g.player.heading=0;g.syncVisual(g.player);
  g.smoother.capture(g);p.set(1,0,0);g.player.visual.hull.rotation.y=.4;
  g.smoother.apply(.25);const drawn={x:+p.x.toFixed(3),yaw:+g.player.visual.hull.rotation.y.toFixed(3)};g.smoother.restore();
  const back={x:p.x,yaw:g.player.visual.hull.rotation.y};
  // A jump (respawn, airlift drop) is drawn where it lands.
  g.smoother.capture(g);p.set(30,0,0);g.smoother.apply(.25);const jump=p.x;g.smoother.restore();
  return {drawn,back,jump};});
 expect(r.drawn).toEqual({x:.25,yaw:.1});expect(r.back).toEqual({x:1,yaw:.4});expect(r.jump).toBe(30);
});

test('phones draw the light soldier body in Detailed; desktop keeps the detailed one',async({browser})=>{
 const tris=async(options:object)=>{const context=await browser.newContext(options),page=await context.newPage();await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
  const n=await page.evaluate(()=>{const g=(window as any).__steel;let t=0;g.world.templates.get('rifleman').traverse((o:any)=>{if(o.isMesh)t+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return {t,low:g.world.low};});await context.close();return n;};
 const phone=await tris({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),desk=await tris({viewport:{width:1440,height:900}});
 expect(phone.low).toBe(false);expect(desk.low).toBe(false);
 expect(phone.t).toBeLessThan(700);expect(desk.t).toBeGreaterThan(1000);
});

test('the real frame loop draws the tank halfway between steps and leaves logic positions exact',async({page})=>{
 await battle(page,0,0);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,p=g.player.visual.root.position,raf=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;
  // Each fixed step moves the tank 0.1 m east; record where it is drawn while the world renders.
  const step=g.step.bind(g),update=g.world.update.bind(g.world);let drawn=NaN;
  g.step=(dt:number)=>{step(dt);p.x+=.1;};g.world.update=(...a:any[])=>{drawn=p.x;return update(...a);};
  delete g.frame;g.last=100000;g.accumulator=0;const x0=p.x;
  g.frame(100000+1000/60*1.5);   // one and a half steps of time: one step runs, half a step is left over
  const after=p.x;window.requestAnimationFrame=raf;g.step=step;g.world.update=update;
  return {x0,drawn,after};});
 expect(r.after-r.x0).toBeCloseTo(.1,2);              // the logic took exactly one step
 expect(r.drawn-r.x0).toBeCloseTo(.05,2);             // drawn halfway through it
});
