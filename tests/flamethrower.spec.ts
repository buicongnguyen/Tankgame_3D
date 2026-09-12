import {test,expect,webkit} from '@playwright/test';
import type {Page} from '@playwright/test';
import {freshSave,parseSave,buyWeapon,upgradeWeapon} from '../src/three/campaign';
import {flameExposure} from '../src/three/flamethrower';
import {reloadSeconds} from '../src/three/armory';

async function arena(page:Page){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.world.activities=[];g.enemies=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,0);g.player.aim=0;g.syncVisual(g.player);g.save.weapons=[8];g.weapon=8;g.lootRandom=()=>.99;});
}

test('flame upgrades and old eight-weapon saves preserve purchases and append a ninth slot',()=>{
 const old=freshSave();old.weaponLevels=Array(8).fill(4);old.weapons=[3,7];old.equippedWeapon=7;old.credits=100000;
 const s=parseSave(JSON.stringify(old));expect(s.weaponLevels).toEqual([...Array(8).fill(4),0]);expect(s.equippedWeapon).toBe(7);expect(buyWeapon(s,8)).toBe(true);expect(s.credits).toBe(99520);expect(s.equippedWeapon).toBe(8);
 for(let i=0;i<20;i++)expect(upgradeWeapon(s,8)).toBe(true);expect(upgradeWeapon(s,8)).toBe(false);s.upgrades.reload=20;expect(reloadSeconds(s,8)).toBe(.08);expect(parseSave(JSON.stringify(s))).toEqual(s);
 for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){expect(flameExposure({x:0,z:0},heading,{x:Math.sin(heading)*11.99,z:Math.cos(heading)*11.99})).toBeGreaterThan(0);expect(flameExposure({x:0,z:0},heading,{x:Math.sin(heading)*12.01,z:Math.cos(heading)*12.01})).toBe(0);}
});

test('one flame burst hits several exposed targets inside 70 degrees and never reaches far, behind or airborne targets',async({page})=>{
 await arena(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel,targets=[[0,4],[3,6],[-3,6],[0,12.01],[7,5],[0,-4]].map(([x,z])=>{const e=g.makeUnit(x,z,'rifleman');e.visual.root.position.set(x,0,z);e.hp=e.max=1000;return e;});
  const heli=g.makeUnit(0,8,'boss','helicopter');heli.visual.root.position.set(0,7,8);g.enemies=[...targets,heli];const hp=heli.hp;g.shoot(g.player,true);return {damage:targets.map(e=>1000-e.hp),air:heli.hp===hp,burns:g.flame.burns.size,shots:g.shots.length,ammo:g.specialAmmo};
 });expect(r.damage[0]).toBeCloseTo(19.6);expect(r.damage.slice(1,3).every(n=>n>0&&n<r.damage[0])).toBe(true);expect(r.damage.slice(3)).toEqual([0,0,0]);expect(r.air).toBe(true);expect(r.burns).toBe(3);expect(r.shots).toBe(0);expect(r.ammo).toEqual([0,0,0]);
});

test('solid cover blocks flame, wood burns, and fuel explosions still chain into nearby objects',async({page})=>{
 await arena(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;
  const make=(x:number,z:number,role='rifleman')=>{const e=g.makeUnit(x,z,role);e.visual.root.position.set(x,0,z);e.hp=e.max=1000;return e;};
  const hidden=make(0,8),open=make(4,7);g.enemies=[hidden,open];const mesh=g.world.clone('barricade');mesh.position.set(0,0,5);const wall={x:0,z:5,w:4,d:2,hp:176,kind:'barricade',mesh};g.world.covers=[wall];g.shoot(g.player,true);const blocked=hidden.hp===1000&&open.hp<1000&&wall.hp===176;
  g.flame.clear();const tree={...wall,z:4,w:2,d:2,hp:65,kind:'pine',mesh:g.world.clone('pine')};tree.mesh.position.set(0,0,4);g.world.covers=[tree];g.shoot(g.player,true);const wood=tree.hp<65&&g.flame.burns.has(tree)&&hidden.hp===1000;
  g.flame.clear();g.enemies=[];const fuel={x:0,z:8,w:2,d:2,hp:25,kind:'fuelcrate',mesh:g.world.clone('fuelcrate')},barrel={x:3,z:8,w:1,d:1,hp:25,kind:'barrel',mesh:g.world.clone('barrel')};fuel.mesh.position.set(0,0,8);barrel.mesh.position.set(3,0,8);g.world.covers=[fuel,barrel];const tank=make(2,9,'heavy'),far=make(0,24,'heavy');g.enemies=[tank,far];g.shoot(g.player,true);g.shoot(g.player,true);return {blocked,wood,chain:fuel.hp<=0&&barrel.hp<=0,blast:tank.hp<900,far:far.hp===1000,player:g.player.hp===g.player.max};
 });expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});

test('burn damage refreshes without stacking, ends after two seconds, and matches FPS and quality',async({page})=>{
 await arena(page);const rows=await page.evaluate(()=>{
  const g=(window as any).__steel,rows=[];
  for(const low of [false,true])for(const fps of [30,60]){
   g.flame.clear();g.enemies=[];g.world.settings(low);const e=g.makeUnit(0,4,'rifleman');e.visual.root.position.set(0,0,4);e.hp=e.max=1000;g.enemies=[e];g.shoot(g.player,true);g.shoot(g.player,true);const direct=1000-e.hp;g.weapon=0;
   for(let i=0;i<fps*3;i++){g.flame.update(g,1/fps);g.flame.render(g,1/fps);}rows.push({low,fps,direct,total:1000-e.hp,burns:g.flame.burns.size,particles:g.flame.tongues.length});g.weapon=8;
  }return rows;
 });for(const r of rows){expect(r.direct).toBeCloseTo(39.2);expect(r.total).toBeCloseTo(68.6);expect(r.burns).toBe(0);expect(r.particles).toBe(0);}
});

test('flame obeys tank armor and boss phases while upgrades strengthen a close-range weapon',async({page})=>{
 await arena(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;const e=g.makeUnit(0,4,'heavy');e.visual.root.position.set(0,0,4);e.heading=Math.PI;g.enemies=[e];g.shoot(g.player,true);const front=e.max-e.hp;g.flame.clear();e.hp=e.max;e.heading=0;g.shoot(g.player,true);const rear=e.max-e.hp;
  g.flame.clear();g.enemies=[];const b=g.makeUnit(0,5,'boss','rail');b.visual.root.position.set(0,0,5);b.heading=Math.PI;g.enemies=[b];g.bosses.update(g,b,.001);b.visual.root.position.set(0,0,5);b.heading=Math.PI;const s=g.bosses.states.get(b);s.phase='tracking';g.shoot(g.player,true);const protectedDamage=b.max-b.hp;g.flame.clear();s.phase='exposed';const hp=b.hp;g.shoot(g.player,true);const exposed=hp-b.hp;
  g.flame.clear();g.save.weaponLevels[8]=10;g.save.upgrades.power=3;const before=b.hp;g.shoot(g.player,true);return {front,rear,protectedDamage,exposed,upgraded:before-b.hp};
 });expect(r.front).toBeCloseTo(12.74);expect(r.rear).toBeCloseTo(29.4);expect(r.exposed/r.protectedDamage).toBeCloseTo(1.75/.65);expect(r.upgraded/r.exposed).toBeCloseTo(2.4);
});

test('live flame pool swaps Blender detail, pauses, clears on retry and cannot grow unbounded',async({page})=>{
 await arena(page);const r=await page.evaluate(async()=>{
  const g=(window as any).__steel;const e=g.makeUnit(0,4,'heavy');e.visual.root.position.set(0,0,4);e.hp=e.max=1e6;g.enemies=[e];for(let i=0;i<200;i++)g.shoot(g.player,true);g.flame.render(g,.1);const mesh=g.flame.mesh,high=mesh.geometry.index.count/3,highCount=mesh.count,burn=g.flame.burns.get(e).remaining,hp=e.hp,age=g.flame.tongues[0].age;
  g.pause();g.flame.update(g,5);g.flame.render(g,0);const paused=e.hp===hp&&g.flame.burns.get(e).remaining===burn&&g.flame.tongues[0].age===age;
  await g.changeQuality();g.flame.render(g,0);const low=mesh.geometry.index.count/3,lowCount=mesh.count,preserved=g.flame.mesh===mesh&&e.hp===hp;
  g.resume();g.flame.update(g,.2);const resumed=e.hp<hp;g.start(0);return {high,low,highCount,lowCount,paused,preserved,resumed,cleared:g.flame.burns.size===0&&g.flame.tongues.length===0&&g.flame.mesh===null&&!mesh.parent};
 });expect(r.high).toBe(189);expect(r.low).toBe(25);expect(r.highCount).toBeLessThanOrEqual(96);expect(r.lowCount).toBeLessThanOrEqual(36);expect(r.paused&&r.preserved&&r.resumed&&r.cleared,JSON.stringify(r)).toBe(true);
});

for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}])test(`flame shop, ninth weapon, Easy hull and visible fire fit ${viewport.width}`,async({browser})=>{
 const mobile=viewport.width!==1440,ctx=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile}),page=await ctx.newPage();
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).waitFor();await page.evaluate(()=>{const g=(window as any).__steel;g.save.credits=2000;g.showMenu();});
 await page.locator('[data-action="difficulty"][data-value="easy"]').click();await expect(page.locator('.mode-hint')).toContainText('+200%');await page.locator('[data-action="shop"]').click();await page.locator('[data-action="buy-weapon"][data-value="8"]').click();await expect(page.locator('[data-weapon-card="8"]')).toContainText('OWNED');await page.locator('[data-action="upgrade-weapon"][data-value="8"]').click();await page.locator('[data-action="shop-back"]').click();await page.getByRole('button',{name:'DEPLOY'}).click();await expect(page.locator('#health-label')).toHaveText('720 / 720');await expect(page.locator('#weapon-label')).toContainText('Flamethrower');
 if(!mobile){await page.keyboard.press('Digit1');await page.keyboard.press('Digit9');await expect(page.locator('[data-quick-weapon="9"]')).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Numpad1');await page.keyboard.press('Numpad9');}else{await page.locator('#weapon').tap();await page.locator('[data-weapon="1"]').tap();await page.locator('#weapon').tap();await page.locator('[data-weapon="9"]').tap();}
 await page.locator('#weapon').click();const box=(await page.locator('#weapon-picker').boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);await page.locator('#weapon').click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};for(const e of g.enemies)e.visual.root.visible=false;for(const c of g.world.covers)c.mesh.visible=false;g.world.covers=[];g.world.activities=[];g.enemies=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,10);g.player.aim=Math.PI;g.syncVisual(g.player);for(const [x,z] of [[0,4],[-3,2],[3,2]]){const e=g.makeUnit(x,z,'heavy');e.visual.root.position.set(x,0,z);e.hp=e.max=1000;g.enemies.push(e);}g.aimPoint.set(0,0,-2);g.world.camera.position.set(14,24,36);g.world.camera.lookAt(0,0,4);g.world.camera.updateMatrixWorld();});
 for(const low of [false,true]){const r=await page.evaluate(async low=>{const g=(window as any).__steel;g.flame.clear();if(g.world.low!==low){g.pause();await g.changeQuality();g.resume();}g.world.camera.position.set(14,24,36);g.world.camera.lookAt(0,0,4);g.world.camera.updateMatrixWorld();for(let i=0;i<24;i++){if(i%7===0)g.shoot(g.player,true);g.flame.update(g,1/60);g.flame.render(g,1/60);}g.world.renderer.render(g.world.scene,g.world.camera);return {count:g.flame.mesh.count,overflow:document.documentElement.scrollWidth>innerWidth,hp:g.player.max};},low);expect(r.count).toBeGreaterThan(0);expect(r.overflow).toBe(false);expect(r.hp).toBe(720);await page.screenshot({path:`test-results/flamethrower-${viewport.width}-${low?'low':'detailed'}.png`});}
 await page.reload();await page.getByRole('button',{name:'DEPLOY'}).click();await expect(page.locator('#weapon-label')).toContainText('Flamethrower');await expect(page.locator('#health-label')).toHaveText('720 / 720');await ctx.close();
});


test('a burning last enemy finishes the stage once after the effects delay',async({page})=>{
 await arena(page);const r=await page.evaluate(()=>{const g=(window as any).__steel,e=g.makeUnit(0,4,'rifleman');e.visual.root.position.set(0,0,4);e.hp=e.max=25;e.cooldown=1e6;g.enemies=[e];g.shoot(g.player,true);const alive=!e.dead;g.weapon=0;for(let i=0;i<120&&g.phase==='playing';i++)g.step(1/60);const finishing=g.phase==='finishing',credit=g.save.credits;g.step(.79);const delay=g.phase==='finishing';g.step(.02);const results=g.phase==='depot';g.complete();return {alive,finishing,delay,results,once:g.save.credits===credit&&g.infantryKills===1};});expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});

test('iPhone WebKit renders the Blender flame shader in both detail tiers without graphics errors',async()=>{
 const browser=await webkit.launch();try{
  const ctx=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true}),page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await arena(page);
  for(const low of [false,true]){const r=await page.evaluate(async low=>{const g=(window as any).__steel;if(g.world.low!==low){g.pause();await g.changeQuality();g.resume();}g.flame.clear();g.shoot(g.player,true);g.flame.render(g,.08);g.world.target.copy(g.player.visual.root.position);g.world.update(0,g.player.visual.root.position);const gl=g.world.renderer.getContext();return {count:g.flame.mesh.count,error:gl.getError(),lost:gl.isContextLost()};},low);expect(r.count).toBeGreaterThan(0);expect(r.error).toBe(0);expect(r.lost).toBe(false);}
  expect(errors).toEqual([]);
 }finally{await browser.close();}
});
