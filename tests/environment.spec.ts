import {test,expect} from '@playwright/test';
import {freshSave,parseSave,rewardClear,MISSIONS} from '../src/three/campaign';
import {terrainSpeed} from '../src/three/environment';
test('old campaign saves migrate and recovery operations unlock once',()=>{
 const old={...freshSave(),mission:5,cleared:Array(6).fill(true),credits:880};const migrated=parseSave(JSON.stringify(old));expect(migrated.mission).toBe(6);expect(migrated.cleared).toEqual([...Array(6).fill(true),false,false,false]);expect(migrated.credits).toBe(880);
 for(let i=6;i<9;i++){expect(rewardClear(migrated,i)).toBe(MISSIONS[i].reward);expect(rewardClear(migrated,i)).toBe(0);}expect(parseSave(JSON.stringify(migrated))).toEqual(migrated);
 expect(terrainSpeed('river',15,32)).toBe(.45);for(const x of [-35,0,35])expect(terrainSpeed('river',x,32)).toBe(1);expect(terrainSpeed('snow',20,0)).toBe(.72);expect(terrainSpeed('snow',0,0)).toBe(1);expect(terrainSpeed('ridge',36,17)).toBe(.6);
});
test('environment cover, salvage, water traction, spawn clearance and new objectives',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(async()=>{const g=(window as any).__steel;const {circleBox}=await import('/src/three/rules.ts');const blocked=[];
 for(let i=0;i<9;i++){g.start(i);for(const u of [g.player,...g.enemies])if(g.world.covers.some((c:any)=>c.hp>0&&circleBox(u.visual.root.position,g.unitRadius(u),c)))blocked.push([i,u.role,u.visual.root.position.x,u.visual.root.position.z]);}
 g.start(6);for(const e of g.enemies)e.dead=true;g.player.visual.root.position.set(15,0,32);g.moveUnit(g.player,1,0);const wet=g.player.visual.root.position.x-15;g.player.visual.root.position.set(0,0,32);g.moveUnit(g.player,1,0);const bridge=g.player.visual.root.position.x;
 const stone=g.world.covers.find((c:any)=>c.kind==='stonewall'),steel=g.world.covers.find((c:any)=>c.kind==='steelwall'),house=g.world.covers.find((c:any)=>c.kind==='house');g.hitCover(stone,999);g.hitCover(steel,999);g.hitCover(house,999);const salvage=g.pickups.length;g.hitCover(house,999);const cover=stone.hp<=0&&!stone.mesh.visible&&steel.hp===Infinity&&salvage===1&&g.pickups.length===1;
 for(const e of g.enemies){e.dead=false;g.damageUnit(e,9999,g.player.visual.root.position);}g.step(.01);const river=g.phase;g.start(7);for(const e of g.enemies)e.dead=true;g.player.visual.root.position.set(0,0,-48);g.convoy.position.z=-49.99;g.step(.1);const snow=g.phase;g.start(8);for(const e of g.enemies)e.dead=true;g.elapsed=44.99;g.step(.02);return {blocked,wet,bridge,cover,river,snow,ridge:g.phase};});
 expect(result.blocked).toEqual([]);expect(result.wet).toBeCloseTo(.45);expect(result.bridge).toBeCloseTo(1);expect(result.cover).toBe(true);expect(result.river).toBe('depot');expect(result.snow).toBe('depot');expect(result.ridge).toBe('victory');
});
test('river and winter scenes render and nine-stage menu fits mobile',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
 for(const [i,name] of [[6,'river'],[7,'snow'],[8,'ridge']] as const){await page.evaluate(i=>{const g=(window as any).__steel;g.start(i);g.player.visual.root.position.set(0,0,i===6?39:22);g.world.target.set(0,0,i===6?47:30);g.world.update(0,g.player.visual.root.position);},i);await page.screenshot({path:`test-results/environment-${name}.png`});}
 await page.evaluate(()=>{const g=(window as any).__steel;g.showMenu();});expect(await page.locator('.route-item').count()).toBe(9);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.route-item').last().scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/environment-menu-mobile.png'});expect(errors).toEqual([]);await context.close();
});
