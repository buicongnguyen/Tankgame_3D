import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {freshSave,parseSave,buyWeapon,upgradeWeapon} from '../src/three/campaign';
import {UPGRADES,purchase,UPGRADE_CAP} from '../src/three/rules';
import {WEAPONS,reloadSeconds,powerMultiplier,barrels} from '../src/three/armory';

async function battle(page:Page){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.world.activities=[];g.world.navigationRevision++;g.enemies=[];g.player.visual.root.position.set(0,0,35);g.player.aim=Math.PI;g.aimPoint.set(0,0,0);g.lootRandom=()=>.99;});
}

test('all systems and owned weapons reach level 20 with prices, limits and old-save migration',()=>{
 const old:any=freshSave();delete old.weaponLevels;delete old.upgrades.engine;delete old.upgrades.shield;old.upgrades.reload=3;old.upgrades.power=2;old.credits=100000;old.weapons=[3,4];old.equippedWeapon=4;
 const s=parseSave(JSON.stringify(old));expect(s.weaponLevels).toEqual(Array(WEAPONS.length).fill(0));expect(s.upgrades).toEqual({armor:0,power:2,reload:3,engine:0,shield:0});expect(s.equippedWeapon).toBe(4);expect(s.credits).toBe(100000);
 expect(upgradeWeapon(s,6)).toBe(false);for(const id of [1,2,5,6,7,8])expect(buyWeapon(s,id)).toBe(true);
 for(const id of UPGRADES){s.credits=100000;for(let n=s.upgrades[id];n<UPGRADE_CAP;n++){const result=purchase(s.credits,n)!;expect(result.level).toBe(n+1);expect(result.credits).toBeLessThan(s.credits);s.credits=result.credits;s.upgrades[id]=result.level;}expect(purchase(s.credits,s.upgrades[id])).toBeNull();}
 for(let id=0;id<WEAPONS.length;id++){s.credits=100000;for(let n=0;n<20;n++){expect(upgradeWeapon(s,id)).toBe(true);expect(s.weaponLevels[id]).toBe(n+1);}const before=s.credits;expect(upgradeWeapon(s,id)).toBe(false);expect(s.credits).toBe(before);expect(reloadSeconds(s,id)).toBeGreaterThanOrEqual(id===8?.08:id===1?.09:id===5?.14:.18);}
 expect(parseSave(JSON.stringify(s))).toEqual(s);expect(powerMultiplier(s)).toBeLessThan(3);expect(barrels(s,5)).toBe(4);
 const poor=freshSave();poor.credits=59;expect(upgradeWeapon(poor,0)).toBe(false);expect(poor.credits).toBe(59);expect(buyWeapon(s,1.5)).toBe(false);expect(upgradeWeapon(s,-1)).toBe(false);
 for(const invalid of [-1,21,1.2,null]){const corrupt=structuredClone(s) as any;corrupt.weaponLevels[5]=invalid;expect(parseSave(JSON.stringify(corrupt))).toEqual(freshSave());}
});

test('machine gun fires simultaneous twin/quad rounds and maximum upgrades keep safe firing intervals',async({page})=>{
 await battle(page);const r=await page.evaluate(()=>{const g=(window as any).__steel;g.save.weapons=[5,6];g.weapon=5;g.shoot(g.player,true);const twin=g.shots.map((s:any)=>({damage:s.damage,x:s.mesh.position.x,dx:s.dx}));g.shots.forEach((s:any)=>s.mesh.removeFromParent());g.shots=[];g.save.weaponLevels[5]=10;g.shoot(g.player,true);const quad=g.shots.map((s:any)=>({damage:s.damage,x:s.mesh.position.x,dx:s.dx}));g.save.upgrades.reload=20;g.save.upgrades.power=20;g.save.weaponLevels.fill(20);const cooldowns=Array.from({length:8},(_,i)=>{g.weapon=i;return g.reloadDuration();});return {twin,quad,cooldowns,shotsFired:g.shotsFired};});
 expect(r.twin).toHaveLength(2);expect(r.quad).toHaveLength(4);expect(new Set(r.quad.map((s:any)=>s.x)).size).toBe(4);expect(new Set(r.quad.map((s:any)=>s.dx)).size).toBe(4);expect(r.twin.every((s:any)=>s.damage===8)).toBe(true);expect(r.quad.every((s:any)=>s.damage===12)).toBe(true);expect(r.cooldowns.every((v:number)=>Number.isFinite(v)&&v>=.09)).toBe(true);expect(r.shotsFired).toBe(2);
});

test('micro missiles are faster and smaller than siege missiles with scaled exhaust',async({page})=>{
 await battle(page);const r=await page.evaluate(()=>{const g=(window as any).__steel;g.save.weapons=[2,6];return [2,6].map(id=>{g.weapon=id;g.shoot(g.player,true);const s=g.shots.at(-1);g.world.rocketTrail(s.mesh);const smoke=g.world.fx.particles.filter((p:any)=>p.kind==='smoke').at(-1);const tail=s.mesh.position.clone();s.mesh.getObjectByName('Exhaust').getWorldPosition(tail);return {damage:s.damage,speed:s.speed,size:s.mesh.scale.x,splash:s.splash,tail:smoke.mesh.position.distanceTo(tail),rocket:s.mesh.userData.rocket,shared:s.mesh.userData.shared};});});
 expect(r[0].damage).toBe(140);expect(r[1].damage).toBe(60);expect(r[1].speed).toBeGreaterThan(r[0].speed);expect(r[1].size).toBeLessThan(r[0].size);expect(r[1].splash).toBeLessThan(r[0].splash);expect(r.every(s=>s.rocket&&s.shared&&s.tail<.001)).toBe(true);
});

test('missile impact splashes nearby units, building edges and local concrete while preserving hard terrain',async({page})=>{
 await battle(page);const r=await page.evaluate(()=>{const g=(window as any).__steel;const unit=(x:number,z:number,role:string)=>{const u=g.makeUnit(x,z,role);u.visual.root.position.set(x,0,z);u.hp=u.max=10000;g.enemies.push(u);return u;};const direct=unit(0,10,'heavy'),near=unit(3,10,'rifleman'),far=unit(20,10,'heavy');
 const cover=(kind:string,x:number,z:number,w:number,d:number,hp:number)=>{const mesh=g.world.clone(kind);mesh.position.set(x,0,z);g.world.arena.add(mesh);const c={kind,x,z,w,d,hp,mesh};g.world.covers.push(c);return c;};const house=cover('house',10,10,10,4,1000),rock=cover('hill',3,13,2,2,Infinity);
 g.world.concreteBarrier({x:-5,z:10,w:2,d:2});g.world.concreteBarrier({x:-15,z:10,w:2,d:2});const concrete=g.world.covers.filter((c:any)=>c.section),nearPanel=concrete.find((c:any)=>Math.abs(c.x+5)<2),farPanel=concrete.find((c:any)=>Math.abs(c.x+15)<2);const beforeFar=farPanel.hp;g.weapon=2;g.shoot(g.player,true);g.updateShots(.8);
 return {direct:direct.hp<10000,near:near.hp<10000,far:far.hp===10000,edge:house.hp<1000,rock:rock.hp===Infinity,nearPanel:nearPanel.hp<176,farPanel:farPanel.hp===beforeFar,impact:g.shots.length===0};});expect(r).toEqual({direct:true,near:true,far:true,edge:true,rock:true,nearPanel:true,farPanel:true,impact:true});
});

test('triple arc has three real airborne rockets per volley, three volleys total, and no normal ammo refill',async({page})=>{
 await battle(page);const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.save.weapons=[4,7];g.specialAmmo=[0,6,3];g.weapon=7;const enemy=g.makeUnit(0,0,'heavy');enemy.visual.root.position.set(0,0,0);enemy.hp=enemy.max=10000;g.enemies=[enemy];g.world.concreteBarrier({x:0,z:18,w:16,d:2});g.shoot(g.player,true);
 const initial=g.special.arcs.map((a:any)=>({x:a.target.x,z:a.target.z,r:a.radius,damage:a.damage,depthWrite:a.marker.material.depthWrite})),ammo=g.specialAmmo[2];g.special.update(g,.75);const airborne=g.special.arcs.every((a:any)=>a.mesh.position.y>15)&&enemy.hp===10000;g.aimPoint.set(35,0,30);g.special.update(g,.76);const hit=enemy.hp<10000&&g.special.arcs.length===0;
 for(let i=0;i<2;i++){g.weapon=7;g.shoot(g.player,true);}const count=g.special.arcs.length,empty=g.specialAmmo[2]===0&&g.weapon===4&&!g.weaponAvailable(7);g.weapon=7;g.shoot(g.player,true);const noExtra=g.special.arcs.length===count;
 const {createActivity}=await import('/src/three/activities.ts');g.specialAmmo[1]=0;const a=createActivity(g.world.arena,'arc',0,35,6);g.world.activities=[a];g.updateActivities(.01);const normalAmmo=g.specialAmmo[1]===6&&g.specialAmmo[2]===0;g.start(0);return {initial,ammo,airborne,hit,count,empty,noExtra,normalAmmo,reset:g.specialAmmo[2]===3&&g.special.arcs.length===0};});
 expect(r.initial).toHaveLength(3);expect(new Set(r.initial.map((a:any)=>a.x)).size).toBe(3);expect(r.initial.every((a:any)=>a.r===5.5&&a.damage===180&&!a.depthWrite)).toBe(true);expect(r.ammo).toBe(2);expect(r.count).toBe(6);for(const key of ['airborne','hit','empty','noExtra','normalAmmo','reset'] as const)expect(r[key],key).toBe(true);
});

test('upgraded engine and shield change live behavior and preserve terrain slowdown and quake stops',async({page})=>{
 await battle(page);const r=await page.evaluate(()=>{const g=(window as any).__steel;g.world.environment.biome='grove';g.input.move={x:1,z:0};g.player.visual.root.position.set(0,0,35);g.updatePlayer(.1);const base=g.player.visual.root.position.x;g.player.visual.root.position.set(0,0,35);g.save.upgrades.engine=20;g.updatePlayer(.1);const fast=g.player.visual.root.position.x;g.world.environment.biome='desert';g.world.firmRoad=()=>false;g.player.visual.root.position.set(-23,0,30);g.updatePlayer(.1);const sand=g.player.visual.root.position.x+23;g.hazards.quakePhase='active';const stop=g.player.visual.root.position.x;g.updatePlayer(.1);const frozen=g.player.visual.root.position.x===stop;g.save.upgrades.shield=20;g.action('shield');const shield=g.shieldTime,cooldown=g.shieldCooldown;g.action('shield');return {base,fast,sand,frozen,shield,cooldown,guard:g.shieldTime===shield&&g.shieldCooldown===cooldown};});
 expect(r.fast).toBeCloseTo(r.base*1.6);expect(r.sand).toBeCloseTo(r.fast*.25);expect(r.frozen&&r.guard).toBe(true);expect(r.shield).toBeCloseTo(5.4);expect(r.cooldown).toBeCloseTo(14/1.5);
});

for(const viewport of [{width:1440,height:900},{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`level-20 shop and eight-weapon controls fit and persist ${viewport.width}`,async({browser})=>{
 const mobile=viewport.width!==1440,c=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile}),p=await c.newPage(),errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));const press=async(s:string)=>mobile?p.locator(s).tap():p.locator(s).click();
 await p.goto('/?e2e');await expect(p.locator('[data-action=shop]')).toBeVisible();await p.evaluate(()=>{(window as any).__steel.save.credits=20000;});await press('[data-action=shop]');
 for(const id of [5,6,7])await press(`[data-action=buy-weapon][data-value="${id}"]`);await press('[data-action=upgrade-weapon][data-value="5"]');await press('[data-action=buy][data-value=engine]');
 await p.locator('[data-weapon-card="7"]').scrollIntoViewIfNeeded();expect(await p.evaluate(()=>{const e=document.querySelector('#overlay')!;return e.scrollWidth<=e.clientWidth;})).toBe(true);await p.screenshot({path:`test-results/expanded-shop-${viewport.width}.png`});
 await p.reload();await press('[data-action=deploy]');await p.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};});await expect(p.locator('#weapon-label')).toContainText('Triple arc launcher · 3 volleys');await press('#weapon');await expect(p.locator('#weapon-picker button')).toHaveCount(9);
 const bounds=(await p.locator('#weapon-picker').boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);expect(bounds.y+bounds.height).toBeLessThan(viewport.height);await p.screenshot({path:`test-results/expanded-picker-${viewport.width}.png`});if(!mobile){const hint=(await p.locator('.desktop-hint').boundingBox())!,hud=(await p.locator('.bottom-hud').boundingBox())!;expect(hint.y+hint.height).toBeLessThanOrEqual(hud.y);}
 await press('[data-weapon="6"]');await expect(p.locator('#weapon-label')).toContainText('Twin machine gun');if(mobile){await press('#weapon');await press('[data-weapon="7"]');}else await p.keyboard.press('Digit7');await expect(p.locator('#weapon-label')).toContainText('Micro missiles');
 expect(await p.evaluate(()=>{const g=(window as any).__steel;return [g.save.weaponLevels[5],g.save.upgrades.engine,g.save.equippedWeapon];})).toEqual([1,1,6]);expect(errors).toEqual([]);await c.close();
});


test('new missile volleys retain exhaust and bounded effects in Detailed and Low graphics',async({page})=>{
 await battle(page);const counts:number[]=[];
 for(const low of [false,true]){
  const r=await page.evaluate(async low=>{const g=(window as any).__steel;g.special.clear();await g.world.load(low);g.world.settings(low);g.specialAmmo[2]=3;g.weapon=7;g.aimPoint.set(0,0,0);g.trailClock=0;g.shoot(g.player,true);g.special.update(g,.65);g.weapon=6;g.shoot(g.player,true);g.updateShots(.1);g.world.fx.update(.1,g.world.camera);g.world.camera.position.set(22,34,58);g.world.camera.lookAt(0,5,14);g.world.camera.updateMatrixWorld();g.world.renderer.render(g.world.scene,g.world.camera);let triangles=0;g.special.arcs[0].mesh.traverse((o:any)=>{if(o.isMesh&&o.geometry.attributes.position)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return {triangles,count:g.special.arcs.length,exhaust:g.special.arcs.every((a:any)=>!!a.mesh.getObjectByName('Exhaust')),particles:g.world.fx.particles.length};},low);
  expect(r.count).toBe(3);expect(r.exhaust).toBe(true);expect(r.particles).toBeLessThanOrEqual(low?85:230);counts.push(r.triangles);await page.screenshot({path:`test-results/new-missiles-${low?'low':'detailed'}.png`});
 }
 expect(counts[1]).toBeLessThan(counts[0]*.4);
});
