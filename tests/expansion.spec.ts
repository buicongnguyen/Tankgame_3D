import {test,expect} from '@playwright/test';
import {freshSave,parseSave,rewardClear,MISSIONS,levelMission,encounterSize,unlockedLevel} from '../src/three/campaign';
import {DIFFICULTIES,mode} from '../src/three/difficulty';
import {ICE,SAND,MUD,terrainSpeed,terrainAt} from '../src/three/terrain';

test('48 levels preserve mode counts, sequential checkpoints and one-time rewards',()=>{
 expect(MISSIONS.length*3).toBe(48);const save=freshSave();
 for(let mission=0;mission<MISSIONS.length;mission++)for(let level=0;level<3;level++){
  expect(save.mission).toBe(mission);expect(save.level).toBe(level);expect(unlockedLevel(save,mission)).toBe(level);
  const before=save.credits;expect(rewardClear(save,mission,level+1)).toBe(0);expect(save.credits).toBe(before);
  expect(rewardClear(save,mission,level)).toBeGreaterThan(0);const paid=save.credits;expect(rewardClear(save,mission,level)).toBe(0);expect(save.credits).toBe(paid);expect(parseSave(JSON.stringify(save))).toEqual(save);
  for(const difficulty of DIFFICULTIES){const n=encounterSize(mission,level,difficulty),base=encounterSize(mission,level,'normal');expect(n.armor).toBe(base.armor*mode(difficulty).enemies);expect(n.infantry).toBe(base.infantry*mode(difficulty).enemies);expect(n.bosses).toBe(level===2?mode(difficulty).bosses:0);}
 }
 expect(save.cleared.every(Boolean)).toBe(true);expect(mode('easy').health).toBe(1.5);expect(mode('normal').health).toBe(1);expect(mode('hard').health).toBe(1);expect(parseSave(JSON.stringify({...freshSave(),level:3}))).toEqual(freshSave());for(const difficulty of ['__proto__','constructor','unknown'])expect(parseSave(JSON.stringify({...freshSave(),difficulty}))).toEqual(freshSave());
});
test('historical saves retain completed stages and migrate named modes',()=>{
 for(const length of [6,9,14])for(const [old,current] of [['story','easy'],['standard','normal'],['veteran','hard']]){
  const source={...freshSave(),mission:length-1,level:undefined,cleared:Array(length).fill(true),difficulty:old,credits:1700,weapons:[3,4],equippedWeapon:4,skin:'sunburst',low:true};const save=parseSave(JSON.stringify(source));
  expect(save.mission).toBe(length);expect(save.level).toBe(0);expect(save.difficulty).toBe(current);expect(save.credits).toBe(1700);expect(save.equippedWeapon).toBe(4);expect(save.skin).toBe('sunburst');expect(save.low).toBe(true);expect(save.cleared.slice(0,length).every(Boolean)).toBe(true);
 }
 expect(levelMission(13,0).kind).toBe('assault');expect(levelMission(13,2).kind).toBe('boss');expect(levelMission(12,1).duration).toBe(60);
});
test('expanded terrain has visible regions and a firm convoy route',()=>{
 expect(ICE.length).toBeGreaterThanOrEqual(15);expect(SAND.length).toBeGreaterThanOrEqual(12);expect(MUD.length).toBeGreaterThanOrEqual(7);
 for(const r of SAND)expect(terrainSpeed('desert',r.x,r.z)).toBe(.25);for(const r of MUD)expect(terrainAt('marsh',r)).toBe('mud');
 for(let z=-50;z<50;z++)for(const biome of ['desert','marsh'] as const)expect(terrainSpeed(biome,0,z)).toBe(1);
});
for(const mission of [0,9,10,11,12,13,14,15])test(`Crazy finale ${mission+1} has exact counts and safe spawns`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(async mission=>{const g=(window as any).__steel;g.frame=()=>{};g.save.difficulty='crazy';g.start(mission,2);const {circleBox}=await import('/src/three/rules.ts');const enemies=g.enemies;return {armor:enemies.filter((e:any)=>e.role!=='boss'&&!g.isInfantry(e)).length,soldiers:enemies.filter((e:any)=>g.isInfantry(e)).length,bosses:enemies.filter((e:any)=>e.role==='boss').length,hp:g.player.max,overlap:[g.player,...enemies].some((u:any)=>g.world.covers.some((c:any)=>c.hp>0&&circleBox(u.visual.root.position,g.unitRadius(u),c))),pairs:enemies.some((u:any,i:number)=>enemies.some((v:any,j:number)=>i<j&&u.visual.root.position.distanceTo(v.visual.root.position)<g.unitRadius(u)+g.unitRadius(v))),trees:g.world.covers.filter((c:any)=>c.kind==='jungle-tree').length,buildings:g.world.covers.filter((c:any)=>c.kind==='cityblock'||c.kind==='house').length,white:g.world.covers.filter((c:any)=>c.kind==='white-pine').length,fuel:g.world.covers.filter((c:any)=>c.kind==='fuelcrate').length};},mission);
 const count=encounterSize(mission,2,'crazy');expect(result).toMatchObject({armor:count.armor,soldiers:count.infantry,bosses:4,hp:240,overlap:false,pairs:false});
 if(mission===12)expect(result.trees).toBeGreaterThan(58);if(mission===13)expect(result.buildings).toBeGreaterThan(20);if(mission===9)expect(result.white).toBeGreaterThan(10);if(mission>=9)expect(result.fuel).toBeGreaterThan(8);
});
test('each level checkpoints and the finale waits for all four bosses',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};const checkpoints=[];
  for(let level=0;level<2;level++){g.start(0,level);for(const e of g.enemies)g.damageUnit(e,999999,g.player.visual.root.position,true);g.player.visual.root.position.copy(g.world.ring.position);g.step(.02);g.step(.8);checkpoints.push([g.save.mission,g.save.level,g.save.cleared[0],g.phase]);}
  g.save.difficulty='crazy';g.start(0,2);const bosses=g.enemies.filter((e:any)=>e.role==='boss');for(const e of g.enemies)if(!bosses.includes(e))g.damageUnit(e,999999,g.player.visual.root.position,true);for(const e of bosses.slice(0,3))g.damageUnit(e,999999,g.player.visual.root.position,true);g.step(.02);const waits=g.phase==='playing';g.damageUnit(bosses[3],999999,g.player.visual.root.position,true);g.player.visual.root.position.copy(g.world.ring.position);g.step(.02);const delay=g.phase==='finishing';g.step(.79);const still=g.phase==='finishing';g.step(.02);checkpoints.push([g.save.mission,g.save.level,g.save.cleared[0],g.phase]);return {checkpoints,waits,delay,still};
 });expect(result).toEqual({checkpoints:[[0,1,false,'depot'],[0,2,false,'depot'],[1,0,true,'depot']],waits:true,delay:true,still:true});
});
test('earthquake locks ground tanks, respects pause and resets',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(14,0);const h=g.hazards;h.update(g,8);const warning=h.quakeWarning;h.update(g,1.4);const active=h.quaking;g.world.covers=[];for(const u of g.enemies)u.dead=true;const e=g.enemies[0];e.dead=false;e.visual.root.position.set(20,0,0);g.player.visual.root.position.set(0,0,0);g.moveUnit(g.player,1,0,.1);g.moveUnit(e,1,0,.1);const locked=g.player.visual.root.position.x===0&&e.visual.root.position.x===20;g.pause();const remaining=h.quakeRemaining;h.update(g,5);const paused=h.quakeRemaining===remaining;g.resume();h.update(g,1.59);const duration=h.quaking;h.update(g,.02);g.moveUnit(g.player,1,0,.1);const released=!h.quaking&&g.player.visual.root.position.x>0;g.start(0,0);return {warning,active,locked,paused,duration,released,reset:!h.quaking&&!h.quakeWarning};});expect(Object.values(result).every(Boolean),JSON.stringify(result)).toBe(true);
});
test('mud slows and sinks tanks but traction recovery allows escape',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(15,0);g.world.covers=[];for(const e of g.enemies)e.dead=true;g.player.visual.root.position.set(-24,0,30);g.moveUnit(g.player,.9,0,.1);const slow=Math.abs(g.player.visual.root.position.x+24-.162)<.001,sunk=g.player.visual.root.position.y<0;g.player.mudTime=2.8;const x=g.player.visual.root.position.x;g.moveUnit(g.player,.9,0,.1);const recovery=g.player.visual.root.position.x-x>.5;for(let i=0;i<150;i++)g.moveUnit(g.player,.9,0,.1);return {slow,sunk,recovery,escaped:g.player.visual.root.position.x>0&&g.player.visual.root.position.y>-.01};});expect(result).toEqual({slow:true,sunk:true,recovery:true,escaped:true});
});
for(const width of [390,844])test(`four modes and three levels fit mobile ${width}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:width===390?844:390},isMobile:true,hasTouch:true});const page=await context.newPage();await page.goto('http://127.0.0.1:5178/?e2e');
 for(const difficulty of DIFFICULTIES){await page.locator(`[data-action="difficulty"][data-value="${difficulty}"]`).tap();await expect(page.locator(`[data-action="difficulty"][data-value="${difficulty}"]`)).toHaveAttribute('aria-pressed','true');}
 await expect(page.locator('[data-action="level"]')).toHaveCount(3);await expect(page.locator('[data-action="level"][data-value="1"]')).toBeDisabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/expansion-menu-${width}.png`,fullPage:true});await context.close();
});


test('briefing and deployed radio match the selected level and boss phase',async({page})=>{
 expect(levelMission(12,1).radio).toContain('60s');expect(levelMission(9,1).briefing).toContain('26 seconds');
 for(const [mission,name] of [[6,'Tempest'],[8,'Sovereign']] as const){expect(levelMission(mission,0).briefing).not.toContain(name);expect(levelMission(mission,0).radio).not.toContain(name);expect(levelMission(mission,2).briefing).toContain(name);expect(levelMission(mission,2).radio).toContain(name);}
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const cues=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(12,1);const jungle=g.radio.textContent;g.start(13,0);return {jungle,city:g.radio.textContent};});expect(cues.jungle).toContain('60s');expect(cues.city).not.toContain('rail line');expect(cues.city).toContain('Bosses enter on level 3');
});
