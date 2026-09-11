import MODEL_NAMES from '../src/three/model-catalog.json' with {type:'json'};
import { test, expect, type Page } from '@playwright/test';
import {freshSave, SAVE_KEY} from '../src/three/campaign';

async function deployCheckpoint(page:Page,mission:number){
  const save=freshSave();save.mission=mission;save.cleared=save.cleared.map((_,i)=>i<mission);save.upgrades.armor=1;
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:SAVE_KEY,save});
  await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
}

test('real assets, desktop controls, pause, cover and UI',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const models=new Set<string>();page.on('response',r=>{if(r.url().endsWith('.glb')&&r.status()===200)models.add(r.url());});
  await page.goto('/?e2e');await expect(page.getByRole('button',{name:'DEPLOY'})).toBeVisible();
  expect(models.size).toBe(MODEL_NAMES.length);await page.screenshot({path:'test-results/command-desktop.png'});
  await page.getByRole('button',{name:'DEPLOY'}).click();await expect(page.locator('#hud')).toBeVisible();
  // Wait for simulation frames after shader warm-up before testing held keyboard input.
  await expect.poll(()=>page.evaluate(()=>(window as any).__steel.elapsed),{timeout:30000}).toBeGreaterThan(.05);
  const before=await page.evaluate(()=> (window as any).__steel.player.visual.root.position.z);
  await page.keyboard.down('KeyW');await expect.poll(()=>page.evaluate(()=>(window as any).__steel.player.visual.root.position.z),{timeout:30000}).toBeLessThan(before-1);await page.keyboard.up('KeyW');
  expect(await page.evaluate(()=>(window as any).__steel.player.visual.root.position.z)).toBeLessThan(before-1);
  await page.mouse.move(700,300);await page.mouse.down();await expect.poll(()=>page.evaluate(()=>(window as any).__steel.shotsFired),{timeout:30000}).toBeGreaterThan(0);await page.mouse.up();
  expect(await page.evaluate(()=>(window as any).__steel.shotsFired)).toBeGreaterThan(0);
  await page.keyboard.press('KeyQ');await expect(page.locator('#status-line')).toHaveText('PROTECTIVE FIELD ACTIVE');
  await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'Take a breath.'})).toBeVisible();
  const elapsed=await page.evaluate(()=>(window as any).__steel.elapsed);await page.waitForTimeout(250);expect(await page.evaluate(()=>(window as any).__steel.elapsed)).toBe(elapsed);
  await page.getByRole('button',{name:'RESUME OPERATION'}).click();await page.screenshot({path:'test-results/battle-desktop.png'});
  // Controlled integration fixture: the same swept shot must strike cover before the target behind it.
  const blocked=await page.evaluate(()=>{const g=(window as any).__steel;g.start(0);g.input.active=false;const c=g.world.covers[0],enemy=g.enemies[0];g.player.visual.root.position.set(c.x,0,c.z+6);enemy.visual.root.position.set(c.x,0,c.z-6);g.player.aim=Math.PI;g.syncVisual(g.player);g.shoot(g.player,true);const hp=enemy.hp;for(let i=0;i<30;i++)g.updateShots(1/60);return enemy.hp===hp;});expect(blocked).toBe(true);
  expect(errors).toEqual([]);
});
// Keep each checkpoint within the normal timeout on CI's software GPU.
test('campaign workshop purchase, reload checkpoint and contested capture',async({page})=>{
  await page.goto('/?e2e');await expect(page.getByRole('button',{name:'DEPLOY'})).toBeVisible();await page.getByRole('button',{name:'DEPLOY'}).click();
  await page.evaluate(()=>{const g=(window as any).__steel;for(const e of g.enemies)g.damageUnit(e,9999,g.player.visual.root.position);g.step(1/60);});
  await expect(page.getByRole('heading',{name:'Mission accomplished'})).toBeVisible();await page.locator('[data-action=shop]').click();await page.locator('[data-action=buy][data-value=armor]').click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('steel-front-3d-v1')!).upgrades.armor)).toBe(1);
  await page.screenshot({path:'test-results/depot-desktop.png'});await page.reload();await expect(page.locator('.briefing h2')).toHaveText('Open Frequency');
  await page.getByRole('button',{name:'DEPLOY'}).click();
  const capture=await page.evaluate(()=>{const g=(window as any).__steel;g.player.visual.root.position.set(0,0,-13);g.enemies[0].visual.root.position.set(3,0,-13);g.step(.1);const contested=g.capture===0;for(const e of g.enemies)e.dead=true;g.capture=17.99;g.step(.02);g.step(.8);return {contested,phase:g.phase};});expect(capture).toEqual({contested:true,phase:'depot'});
});
test('campaign escort completion and defense failure, retry and success',async({page})=>{
  await deployCheckpoint(page,2);
  await page.evaluate(()=>{const g=(window as any).__steel;for(const e of g.enemies)e.dead=true;g.player.visual.root.position.set(0,0,-48);g.convoy.position.z=-49.99;g.step(.1);});await expect(page.locator('body')).toHaveAttribute('data-phase','depot');
  await page.evaluate(()=>{const g=(window as any).__steel;g.start(3);g.elapsed=44.99;g.relayHealth=0;g.step(.02);});await expect(page.getByRole('heading',{name:'We go again.'})).toBeVisible();
  await page.getByRole('button',{name:/RETRY LONG NIGHT/}).click();expect(await page.evaluate(()=>(window as any).__steel.relayHealth)).toBe(300);
  await page.evaluate(()=>{const g=(window as any).__steel;g.elapsed=44.99;g.step(.02);});await expect(page.locator('body')).toHaveAttribute('data-phase','depot');
});
test('campaign siege completion and first chapter ending retain cleared stages',async({page})=>{
  await deployCheckpoint(page,4);
  await page.evaluate(()=>{const g=(window as any).__steel;for(const e of g.enemies)g.damageUnit(e,9999,g.player.visual.root.position);g.step(.02);});
  await expect(page.getByRole('heading',{name:'Mission accomplished'})).toBeVisible();
  await page.evaluate(()=>{const g=(window as any).__steel;g.start(5);for(const e of g.enemies)g.damageUnit(e,9999,g.player.visual.root.position);g.step(.02);});
  await expect(page.getByRole('heading',{name:'Everyone comes home.'})).toBeVisible();await page.screenshot({path:'test-results/ending-desktop.png'});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('steel-front-3d-v1')!).cleared.slice(0,6).every(Boolean))).toBe(true);
});
test('phone layout and simultaneous captured touch sticks',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
  await page.goto('http://127.0.0.1:5178/?e2e');await expect(page.getByRole('button',{name:'DEPLOY'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/command-phone.png',fullPage:true});
  await page.getByRole('button',{name:'DEPLOY'}).click();await expect(page.locator('#move-pad')).toBeVisible();
  const left=(await page.locator('#move-pad').boundingBox())!,right=(await page.locator('#aim-pad').boundingBox())!;
  const session=await context.newCDPSession(page);
  const points=[{x:left.x+left.width/2,y:left.y+left.height/2-25,id:1},{x:right.x+right.width/2,y:right.y+right.height/2-30,id:2}];
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await page.waitForTimeout(700);
  const state=await page.evaluate(()=>{const g=(window as any).__steel;return {move:g.input.move.z,fire:g.shotsFired};});expect(state.move).toBeLessThan(0);expect(state.fire).toBeGreaterThan(0);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(await page.evaluate(()=>(window as any).__steel.input.touchFiring)).toBe(false);
  await page.screenshot({path:'test-results/battle-phone.png'});await page.setViewportSize({width:844,height:390});await page.screenshot({path:'test-results/battle-landscape.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await context.close();
});

test('real cannon destroys an exposed enemy; shield, repair and escort rules',async({page})=>{
 await page.goto('/?e2e');await expect(page.getByRole('button',{name:'DEPLOY'})).toBeVisible();
 const combat=await page.evaluate(()=>{const g=(window as any).__steel;g.start(0);g.player.visual.root.position.set(0,0,10);const e=g.enemies[0];e.visual.root.position.set(0,0,-5);e.heading=0;g.player.aim=Math.PI;g.syncVisual(g.player);for(let shot=0;shot<4;shot++){g.shoot(g.player,true);for(let i=0;i<30;i++)g.updateShots(1/60);}const killed=e.dead;const health=g.player.hp;g.action('shield');g.damageUnit(g.player,30,{x:0,z:0});const protectedHull=g.player.hp===health;g.shieldTime=0;g.damageUnit(g.player,80,{x:0,z:0});const damaged=g.player.hp;g.action('repair');return {killed,protectedHull,unchanged:g.player.hp===damaged,located:g.radio.textContent.includes('REPAIR CENTER')};});
 expect(combat).toEqual({killed:true,protectedHull:true,unchanged:true,located:true});
 const escort=await page.evaluate(()=>{const g=(window as any).__steel;g.start(2);g.player.visual.root.position.set(30,0,22);const z=g.convoy.position.z;g.step(.1);const stopped=g.convoy.position.z===z;g.player.visual.root.position.set(5,0,48);g.step(.1);return {stopped,moved:g.convoy.position.z<z};});expect(escort).toEqual({stopped:true,moved:true});
});

test('expanded terrain, field activities, artillery and wreck cleanup',async({page})=>{
 await page.goto('/?e2e');await expect(page.getByRole('button',{name:'DEPLOY'})).toBeVisible();await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{
  const g=(window as any).__steel;g.player.visual.root.position.set(61,0,50);g.moveUnit(g.player,4,0);const expanded=g.player.visual.root.position.x>62;
  const pad=g.world.activities.find((a:any)=>a.kind==='repair');g.player.hp-=70;g.player.visual.root.position.set(pad.x,0,pad.z);const hp=g.player.hp;g.updateActivities(.5);const healed=g.player.hp>hp;
  const supply=g.world.activities.find((a:any)=>a.kind==='supply');g.player.visual.root.position.set(supply.x,0,supply.z);g.updateActivities(.1);const supplied=supply.spent&&g.weapon===2&&g.powerBoost>0;
  const mine=g.world.activities.find((a:any)=>a.kind==='mine');g.player.visual.root.position.set(mine.x,0,mine.z);const before=g.player.hp;g.updateActivities(.1);const mined=mine.spent&&g.player.hp<before;
  g.player.visual.root.position.set(0,0,15);g.aimPoint.set(0,0,0);g.action('artillery');const telegraphed=g.strikes.length===5&&g.artilleryCooldown>0;
  for(let i=0;i<160;i++)g.updateActivities(1/60);const detonated=g.strikes.length===0;
  const enemy=g.enemies[0];enemy.visual.root.position.set(3,0,8);g.damageUnit(enemy,9999,g.player.visual.root.position);const wreck=g.world.wrecks.length===1;
  return {expanded,healed,supplied,mined,telegraphed,detonated,wreck};
 });expect(result).toEqual({expanded:true,healed:true,supplied:true,mined:true,telegraphed:true,detonated:true,wreck:true});
 await page.waitForTimeout(350);await page.screenshot({path:'test-results/expanded-effects.png'});
 const cleanup=await page.evaluate(()=>{const g=(window as any).__steel;for(let i=0;i<500;i++)g.world.fx.smoke(g.player.visual.root.position);const bounded=g.world.fx.particles.length<=230;g.start(0);return {bounded,particles:g.world.fx.particles.length,wrecks:g.world.wrecks.length,strikes:g.strikes.length,activities:g.world.activities.filter((a:any)=>a.spent).length};});expect(cleanup).toEqual({bounded:true,particles:0,wrecks:0,strikes:0,activities:0});
});
