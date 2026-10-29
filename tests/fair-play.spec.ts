import {test,expect,type Page} from '@playwright/test';

const PHONE={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
async function battle(page:Page,stage=1,difficulty='normal'){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 await page.evaluate(({stage,difficulty})=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty=difficulty;g.start(stage,0);g.clearOpening?.();},{stage,difficulty});
}

test('touch: a light push aims without firing, a firm push fires only once the turret is on target',async({browser})=>{
 const context=await browser.newContext(PHONE),page=await context.newPage();
 try{await battle(page);
  const pad=(await page.locator('#aim-pad').boundingBox())!,cx=pad.x+pad.width/2,cy=pad.y+pad.height/2;
  const r=await page.evaluate(()=>{const g=(window as any).__steel;g.enemies=[];g.reload=0;return {shots:g.shotsFired};});
  // Light push (about 40% of travel): aims, never fires.
  await page.touchscreen.tap(cx,cy);   // settle focus
  const cdp=await context.newCDPSession(page);
  const touch=(type:string,x:number,y:number)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
  await touch('touchStart',cx,cy);await touch('touchMove',cx-11,cy);
  const light=await page.evaluate(()=>{const g=(window as any).__steel;for(let i=0;i<30;i++)g.step(1/60);return {aiming:g.input.touchAiming,firing:g.input.touchFiring,shots:g.shotsFired};});
  // Firm push to the opposite side: the turret must swing round first, then it fires.
  await touch('touchMove',cx+27,cy);
  const firm=await page.evaluate(()=>{const g=(window as any).__steel,first=g.shotsFired;g.step(1/60);const immediate=g.shotsFired-first;for(let i=0;i<30;i++)g.step(1/60);return {immediate,later:g.shotsFired-first};});
  await touch('touchEnd',0,0);
  expect(light.aiming).toBe(true);expect(light.firing).toBe(false);expect(light.shots).toBe(r.shots);
  expect(firm.immediate).toBe(0);expect(firm.later).toBeGreaterThan(0);
 }finally{await context.close();}
});

test('touch aim assist settles on a nearby enemy and leads a moving one',async({page})=>{
 await battle(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,p=g.player.visual.root.position;
  const e=g.enemies.find((u:any)=>!u.dead&&!g.isInfantry(u)&&u.role!=='boss');g.enemies=[e];g.world.covers=[];g.world.navigationRevision++;
  e.visual.root.position.set(p.x+2,0,p.z-20);e.encounter=undefined;
  // Stick pointed 8 degrees off the enemy, on the side it is about to drive toward.
  const off=Math.atan2(2,-20)-.14;g.input.touchAiming=true;g.input.hasTouchAim=true;g.input.aim={x:Math.sin(off),z:Math.cos(off)};
  g.updatePlayer(1/60);const still={x:g.aimPoint.x-e.visual.root.position.x,z:g.aimPoint.z-e.visual.root.position.z};
  // The enemy drives east at 5 m/s: the aim point moves ahead of it.
  for(let i=0;i<20;i++){e.visual.root.position.x+=5/60;g.elapsed+=1/60;g.updatePlayer(1/60);}
  const lead=g.aimPoint.x-e.visual.root.position.x;
  // Far off the stick direction: no snap.
  g.input.aim={x:-1,z:0};g.updatePlayer(1/60);const free=Math.hypot(g.aimPoint.x-(p.x-28),g.aimPoint.z-p.z);
  return {still:Math.hypot(still.x,still.z),lead,free};});
 expect(r.still).toBeLessThan(.01);expect(r.lead).toBeGreaterThan(1);expect(r.lead).toBeLessThan(4);expect(r.free).toBeLessThan(.01);
});

test('armor faces the gun for the player, bosses take their own phase damage only once, and Normal has a 1.25x hull',async({page})=>{
 await battle(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,u=g.player,p=u.visual.root.position;
  u.hp=u.max=1000;g.shieldTime=0;u.heading=0;u.aim=Math.PI;   // driving away (+z), gun pointing back (-z)
  g.damageUnit(u,100,{x:p.x,z:p.z-20});const facingGun=1000-u.hp;
  u.hp=1000;u.aim=0;g.damageUnit(u,100,{x:p.x,z:p.z-20});const rear=1000-u.hp;
  g.start(5,2);g.clearOpening?.();const boss=g.enemies.find((e:any)=>e.role==='boss'),bp=boss.visual.root.position;boss.hp=boss.max=10000;
  boss.heading=Math.atan2(p.x-bp.x,p.z-bp.z);g.damageUnit(boss,100,{x:p.x,z:p.z});const bossHit=10000-boss.hp;
  g.save.difficulty='normal';g.start(1,0);const normal=g.player.max;g.save.difficulty='hard';g.start(1,0);const hard=g.player.max;
  return {facingGun,rear,bossHit,normal,hard};});
 expect(r.facingGun).toBeCloseTo(65,5);expect(r.rear).toBeCloseTo(150,5);
 expect(r.bossHit).toBeCloseTo(65,1);   // armored phase .65, no second facing multiplier (was ~42)
 expect(r.normal).toBe(Math.round(r.hard*1.25));
});

test('uplink and transport health scale with difficulty, and the transport patches itself up out of contact',async({page})=>{
 await battle(page,2,'easy');
 const r=await page.evaluate(()=>{const g=(window as any).__steel;const max=(d:string,s:number)=>{g.save.difficulty=d;g.start(s,0);return s===2?g.convoyMax:g.relayMax;};
  const convoy={easy:max('easy',2),normal:max('normal',2),hard:max('hard',2),crazy:max('crazy',2)},relay={easy:max('easy',3),normal:max('normal',3),crazy:max('crazy',3)};
  g.save.difficulty='normal';g.start(2,0);g.clearOpening?.();g.enemies.forEach((e:any)=>{e.visual.root.position.x+=500;});g.damageConvoy(400);const hurt=g.convoyHealth;
  for(let i=0;i<60*3;i++)g.step(1/60);const waiting=g.convoyHealth;for(let i=0;i<60*4;i++)g.step(1/60);
  return {convoy,relay,hurt,waiting,healed:g.convoyHealth,max:g.convoyMax};});
 expect(r.convoy).toEqual({easy:2080,normal:1560,hard:1300,crazy:1040});expect(r.relay).toEqual({easy:600,normal:450,crazy:300});
 expect(r.waiting).toBe(r.hurt);expect(r.healed).toBeGreaterThan(r.hurt);expect(r.healed).toBeLessThanOrEqual(r.max);
});

test('defense is won by holding the uplink 45 s after the last wave arrives',async({page})=>{
 await battle(page,3);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.player.hp=g.player.max=1e9;g.relayHealth=g.relayMax=1e9;
  let guard=0;while(g.waves.wave<g.waves.total-1&&guard++<60*600){g.step(1/60);for(const e of g.enemies)if(!e.pending&&!e.dead&&g.waves.wave<g.waves.total-1){e.hp=0;e.dead=true;}}
  const atLast=g.objectiveProgress(),text=g.waves.text(g);for(let i=0;i<60*46&&g.phase==='playing';i++)g.step(1/60);
  return {reached:g.waves.wave===g.waves.total-1,atLast,text,phase:g.phase,alive:g.enemies.some((e:any)=>!e.dead&&!e.pending)};});
 expect(r.reached).toBe(true);expect(r.atLast).toBeLessThan(1);expect(r.text).toMatch(/HOLD \d+s/);
 expect(['finishing','won','results','complete']).toContain(r.phase);
});

test('the deployment shield waits for first contact instead of expiring unseen',async({page})=>{
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty='normal';g.start(1,0);
  for(const e of g.enemies){e.visual.root.position.x+=500;}   // nobody near
  for(let i=0;i<60*12;i++)g.step(1/60);const held=g.shieldTime>0;
  g.reload=0;g.shoot(g.player,true);for(let i=0;i<60*9;i++)g.step(1/60);return {held,after:g.shieldTime};});
 expect(r.held).toBe(true);expect(r.after).toBe(0);
});

test('a portrait phone shows about 22 m to each side in battle (not in menus), and flank fire is pointed out by an edge arrow',async({browser})=>{
 const context=await browser.newContext(PHONE),page=await context.newPage();
 try{await battle(page);
  const r=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world,cam=w.camera,p=g.player.visual.root.position,V=cam.position.constructor;
   w.update(1/60,p);const tank=p.clone().project(cam),ty=(1-tank.y)/2*innerHeight;
   const ground=(sx:number)=>{const v=new V(sx/innerWidth*2-1,-(ty/innerHeight)*2+1,.5).unproject(cam).sub(cam.position).normalize();return cam.position.clone().addScaledVector(v,-cam.position.y/v.y);};
   const side=(ground(innerWidth).x-ground(0).x)/2;
   const e=g.enemies.find((u:any)=>!u.dead&&!g.isInfantry(u));g.enemies=[e];e.pending=false;e.visual.root.position.set(p.x+34,0,p.z);e.aim=Math.atan2(-34,0);e.visual.beam.visible=true;
   g.phase='playing';g.threats.update(g);const arrows=[...document.querySelectorAll('.threat-arrows > div')].filter((a:any)=>a.style.display==='block').map((a:any)=>a.getBoundingClientRect());
   return {fov:cam.fov,side,arrows:arrows.length,right:arrows[0]?arrows[0].right>innerWidth-60:false};});
  expect(r.side).toBeGreaterThan(19);expect(r.side).toBeLessThan(27);expect(r.fov).toBeGreaterThan(55);expect(r.arrows).toBe(1);expect(r.right).toBe(true);
 }finally{await context.close();}
});
