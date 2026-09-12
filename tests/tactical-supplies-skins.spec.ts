import {test,expect} from '@playwright/test';
import {stageLayout,projectRoute,roadDistance,routeSample} from '../src/three/stage-layout';
import {levelMission,freshSave,parseSave} from '../src/three/campaign';
import {distance,segmentBox} from '../src/three/rules';
import {SKINS,buySkin} from '../src/three/skins';
import MARKINGS from '../src/three/skin-markings.json' with {type:'json'};

for(const difficulty of ['easy','normal','hard','crazy'])test(`${difficulty}: road mines occupy one lane and leave safe spawn, objectives and supplies`,()=>{
 for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){
  const l=stageLayout(stage,level,levelMission(stage,level).kind,difficulty),mines=l.supplies.filter(s=>s.kind==='mine'),road=mines.filter(m=>roadDistance(l.points,m)<4),label=`${stage}/${level}/${difficulty}`;
  expect(mines,label).toHaveLength(6);expect(road,label).toHaveLength(level+1);
  for(const mine of road){const projected=projectRoute(l.points,mine),p=routeSample(l.points,projected.progress),dx=mine.x-p.x,dz=mine.z-p.z,dodge={x:p.x-dx/1.8*3,z:p.z-dz/1.8*3};
   expect(projected.distance,label).toBeCloseTo(1.8);expect(distance(mine,l.spawn),label).toBeGreaterThan(15);expect(distance(mine,{x:0,z:-13}),label).toBeGreaterThan(12);
   expect(distance(mine,dodge),label).toBeGreaterThan(2.7+1.25);expect(roadDistance(l.points,dodge),label).toBeCloseTo(3);
   expect([...l.barriers,...l.landforms].some(b=>segmentBox(p,dodge,b,1.25)!==null),label).toBe(false);
   expect(l.supplies.filter(s=>s!==mine).every(s=>distance(s,mine)>10),label).toBe(true);
  }
 }
});

test('five Blender tiers retain paint triangles, bounded cost, bonuses and old-save compatibility',()=>{
 const skins=SKINS.filter(s=>'stars' in s);expect(skins).toHaveLength(5);let price=450;
 for(const skin of skins){const paint=MARKINGS[skin.id as keyof typeof MARKINGS];expect(paint.stars).toBe((skin as any).stars);expect(paint.stripes).toBe(6);expect(paint.positions.length).toBe(paint.colors.length);expect(paint.positions.length%9).toBe(0);expect(paint.positions.length/9).toBeLessThanOrEqual(112);expect(paint.positions.every(Number.isFinite)).toBe(true);expect(skin.price).toBeGreaterThan(price);price=skin.price;
  const save=freshSave();save.credits=skin.price;expect(buySkin(save,skin.id)).toBe(true);expect(save.credits).toBe(0);expect(buySkin(save,skin.id)).toBe(false);expect(parseSave(JSON.stringify(save)).skin).toBe(skin.id);
 }
 const old:any=freshSave();delete old.skins;delete old.skin;expect(parseSave(JSON.stringify(old)).skins).toEqual(['classic','sunburst']);
});

test('empty special ammo steps left, skips unusable slots, keeps cooldown and preferred loadout',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(()=>{
  const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];g.world.activities=[];g.world.navigationRevision++;
  const cases=[{from:7,owned:[6,7],ammo:[0,0,1],to:6},{from:7,owned:[5,7],ammo:[0,0,1],to:5},{from:7,owned:[4,7],ammo:[0,6,1],to:4},{from:7,owned:[3,7],ammo:[12,0,1],to:3},{from:4,owned:[3,4],ammo:[12,1,0],to:3},{from:4,owned:[2,4],ammo:[0,1,0],to:2},{from:3,owned:[1,3],ammo:[1,0,0],to:1},{from:3,owned:[3],ammo:[1,0,0],to:0}];
  const rows=cases.map(c=>{g.save.weapons=c.owned;g.save.equippedWeapon=c.from;g.weapon=c.from;g.specialAmmo=[...c.ammo];g.reload=0;const before=g.shotsFired;g.shoot(g.player,true);return {expected:c.to,actual:g.weapon,ammo:g.specialAmmo[c.from===3?0:c.from===4?1:2],cooldown:g.reload>0,preference:g.save.equippedWeapon===c.from,shot:g.shotsFired===before+1};});
  g.save.weapons=[4,7];g.save.equippedWeapon=7;g.specialAmmo=[0,6,0];g.weapon=7;const before=g.shotsFired;g.shoot(g.player,true);const emptyAttempt=g.weapon===4&&g.shotsFired===before;g.start(0);return {rows,emptyAttempt,refilled:g.weapon===7&&g.specialAmmo[2]===3};
 });for(const r of result.rows){expect(r.actual).toBe(r.expected);expect(r.ammo).toBe(0);expect(r.cooldown&&r.preference&&r.shot).toBe(true);}expect(result.emptyAttempt&&result.refilled).toBe(true);
});

test('desktop weapon buttons, top-row keys and number pad select the same slots',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.weapons=[1,2,3,4,5,6,7];g.specialAmmo=[12,6,3];g.updateHud();});
 await expect(page.locator('#weapon-shortcuts button')).toHaveCount(8);
 for(let i=1;i<=8;i++){await page.keyboard.press(`Digit${i}`);expect(await page.evaluate(()=>(window as any).__steel.weapon)).toBe(i-1);}
 for(let i=8;i>=1;i--){await page.keyboard.press(`Numpad${i}`);await expect(page.locator(`[data-quick-weapon="${i}"]`)).toHaveAttribute('aria-pressed','true');}
 await page.locator('[data-quick-weapon="7"]').click();await expect(page.locator('#weapon-label')).toContainText('Micro missiles');
 // Clicking a numbered weapon is an explicit gun selection, even with the radio menu open.
 await page.keyboard.press('r');await page.locator('[data-quick-weapon="1"]').click();await expect(page.locator('#support-picker')).toBeHidden();expect(await page.evaluate(()=>{const g=(window as any).__steel;return g.weapon===0&&g.strikes.length===0&&g.airSupport.used===0;})).toBe(true);
 await page.locator('[data-quick-weapon="7"]').click();
 // The contextual radio chooser still owns 1/2 while open.
 await page.keyboard.press('r');await page.keyboard.press('Numpad2');expect(await page.evaluate(()=>(window as any).__steel.weapon)).toBe(6);expect(await page.evaluate(()=>(window as any).__steel.airSupport.used)).toBe(1);
 const bar=(await page.locator('#weapon-shortcuts').boundingBox())!,hud=(await page.locator('.bottom-hud').boundingBox())!,hint=(await page.locator('.desktop-hint').boundingBox())!;expect(bar.y+bar.height).toBeLessThan(hud.y);expect(hint.y+hint.height).toBeLessThanOrEqual(bar.y);
 await page.screenshot({path:'test-results/weapon-shortcuts-desktop.png'});
});

test('all difficulties can call and collect bounded air supplies on ordinary assault missions',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const rows=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};return ['easy','normal','hard','crazy'].map(d=>{
  g.save.difficulty=d;g.start(0);g.world.covers=[];g.enemies=[];g.world.activities=[];g.player.visual.root.position.set(0,0,0);g.player.hp=20;
  const limit=g.airSupport.limit(g),accepted=g.airSupport.request(g),drop=g.airSupport.drops[0].activity;g.player.visual.root.position.set(drop.x,0,drop.z);g.updateActivities(3.3);return {d,limit,accepted,healed:g.player.hp>20,remaining:g.airSupport.remaining(g),cooldown:g.artilleryCooldown>0};
 });});for(const r of rows){expect(r.limit).toBe(['easy','crazy'].includes(r.d)?2:1);expect(r.accepted&&r.healed&&r.cooldown).toBe(true);expect(r.remaining).toBe(r.limit-1);}
});

test('solid rock collides on all four edges, survives weapons and shares one instanced mesh',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(9);g.enemies=[];g.world.activities=[];const walls=g.world.covers.filter((c:any)=>c.boundary);g.world.covers=walls;g.world.navigationRevision++;const stops=[];
  for(const [x,z,dx,dz] of [[68,0,8,0],[-68,0,-8,0],[0,56,0,8],[0,-56,0,-8]]){g.player.visual.root.position.set(x,0,z);g.player.velocity={x:0,z:0};g.moveUnit(g.player,dx,dz);stops.push({x:g.player.visual.root.position.x,z:g.player.visual.root.position.z});}
  for(const wall of walls)g.hitCover(wall,1e9);g.explode(new (g.player.visual.root.position.constructor)(70,0,0),30,1e9,true);
  const mesh=g.world.arena.getObjectByName('SolidRockBoundary'),geometry=mesh.geometry;await g.world.load(true);g.world.settings(true);
  g.world.camera.position.set(47,35,32);g.world.camera.lookAt(67,0,57);g.world.camera.updateMatrixWorld();g.world.renderer.render(g.world.scene,g.world.camera);
  return {walls:walls.length,stops,intact:walls.every((c:any)=>c.hp===Infinity),instanced:mesh.isInstancedMesh,count:mesh.count,triangles:geometry.index.count/3,same:mesh.geometry===geometry};
 });expect(r.walls).toBe(4);expect(r.intact&&r.instanced&&r.same).toBe(true);expect(r.triangles).toBe(12);expect(r.count).toBeLessThan(80);for(const p of r.stops){expect(Math.abs(p.x)).toBeLessThan(70.76);expect(Math.abs(p.z)).toBeLessThan(58.76);}await page.screenshot({path:'test-results/solid-rock-perimeter-low.png'});
});

test('new Blender markings survive detail changes and skin swaps with correct live bonuses',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(async()=>{
  const g=(window as any).__steel;g.frame=()=>{};const rows=[];g.save.skins.push('comet','sentinel','talon','nova','prism');
  for(const id of ['comet','sentinel','talon','nova','prism']){g.save.skin=id;g.start(0);g.enemies=[];g.world.covers=[];g.world.activities=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,0);g.input.move={x:1,z:0};g.updatePlayer(.1);g.action('shield');g.shoot(g.player,true);const paint=g.player.visual.root.getObjectByName('SkinMarkings');rows.push({id,distance:g.player.visual.root.position.x,damage:g.shots.at(-1).damage,shield:g.shieldTime,stars:paint.userData.stars});}
  const root=g.player.visual.root,paint=root.getObjectByName('SkinMarkings'),geometry=paint.geometry;await g.world.load(true);g.world.settings(true);const low=root.getObjectByName('SkinMarkings')===paint&&paint.geometry===geometry;
  for(let i=0;i<30;i++)for(const id of ['comet','sentinel','talon','nova','prism'])g.world.applySkin(root,id);let count=0;root.traverse((o:any)=>{if(o.name==='SkinMarkings')count++;});const shared=root.getObjectByName('SkinMarkings').geometry===geometry;
  g.world.camera.position.set(7,8,10);g.world.camera.lookAt(root.position.x,1,root.position.z);g.world.camera.updateMatrixWorld();g.world.renderer.render(g.world.scene,g.world.camera);return {rows,low,count,shared};
 });for(const row of result.rows){const skin=SKINS.find(s=>s.id===row.id)!;expect(row.distance).toBeCloseTo(.9*skin.speed);expect(row.damage).toBeCloseTo(44*skin.damage);expect(row.shield).toBe(skin.shield);expect(row.stars).toBe((skin as any).stars);}expect(result.low&&result.shared).toBe(true);expect(result.count).toBe(1);await page.screenshot({path:'test-results/prism-skin-low.png'});
 await page.evaluate(async()=>{const g=(window as any).__steel;await g.world.load(false);g.world.settings(false);g.world.renderer.render(g.world.scene,g.world.camera);});await page.screenshot({path:'test-results/prism-skin-detailed.png'});
});

for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`new skin cards and numbered touch picker fit ${viewport.width}`,async({browser})=>{
 const ctx=await browser.newContext({viewport,isMobile:true,hasTouch:true}),page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?e2e');await expect(page.locator('[data-action=hangar]')).toBeVisible();await page.evaluate(()=>{(window as any).__steel.save.credits=1900;});await page.locator('[data-action=hangar]').tap();await expect(page.locator('.skin-card')).toHaveCount(10);
 await expect.poll(()=>page.locator('.skin-card img').evaluateAll(imgs=>imgs.every(i=>(i as HTMLImageElement).naturalWidth===512))).toBe(true);await page.locator('[data-value=prism]').tap();await expect(page.locator('[data-value=prism]')).toHaveText('EQUIPPED');await page.locator('[data-value=prism]').scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/new-skin-shop-${viewport.width}.png`});
 expect(await page.locator('#overlay').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.locator('[data-action=shop-back]').tap();await page.locator('[data-action=deploy]').tap();await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.weapons=[6,7];g.specialAmmo=[0,0,1];g.weapon=7;g.save.equippedWeapon=7;g.updateHud();});
 await expect(page.locator('#weapon-shortcuts')).toBeHidden();await page.locator('#weapon').tap();await expect(page.locator('[data-weapon="7"]')).toBeEnabled();await page.locator('[data-weapon="7"]').tap();await expect(page.locator('#weapon-label')).toContainText('Micro missiles');await page.locator('#weapon').tap();await page.locator('[data-weapon="8"]').tap();await page.evaluate(()=>{const g=(window as any).__steel;g.shoot(g.player,true);});await expect(page.locator('#weapon-label')).toContainText('Micro missiles');expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);await ctx.close();
});
