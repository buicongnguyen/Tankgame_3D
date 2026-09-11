import {test,expect} from '@playwright/test';
import {freshSave,parseSave,rewardClear,MISSIONS} from '../src/three/campaign';
import {terrainSpeed} from '../src/three/environment';
test('old campaign saves migrate and recovery operations unlock once',()=>{
 const old={...freshSave(),mission:5,cleared:Array(6).fill(true),credits:880};const migrated=parseSave(JSON.stringify(old));expect(migrated.mission).toBe(6);expect(migrated.cleared).toEqual([...Array(6).fill(true),...Array(MISSIONS.length-6).fill(false)]);expect(migrated.credits).toBe(880);
 for(let i=6;i<9;i++)for(let level=0;level<3;level++){expect(rewardClear(migrated,i,level)).toBe(Math.round(MISSIONS[i].reward*(level===0?.65:level===1?.8:1)));expect(rewardClear(migrated,i,level)).toBe(0);}expect(parseSave(JSON.stringify(migrated))).toEqual(migrated);
 expect(terrainSpeed('river',15,32)).toBe(.45);for(const x of [-35,0,35])expect(terrainSpeed('river',x,32)).toBe(1);expect(terrainSpeed('snow',20,0)).toBe(.72);expect(terrainSpeed('snow',0,0)).toBe(1);expect(terrainSpeed('ridge',36,17)).toBe(.6);
});
test('environment cover, salvage, water traction, spawn clearance and new objectives',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(async()=>{const g=(window as any).__steel;const {circleBox}=await import('/src/three/rules.ts');const blocked=[];
 for(let i=0;i<9;i++){g.start(i);for(const u of [g.player,...g.enemies])if(g.world.covers.some((c:any)=>c.hp>0&&circleBox(u.visual.root.position,g.unitRadius(u),c)))blocked.push([i,u.role,u.visual.root.position.x,u.visual.root.position.z]);}
 g.start(6);for(const e of g.enemies)e.dead=true;g.player.visual.root.position.set(15,0,32);g.moveUnit(g.player,1,0);const wet=g.player.visual.root.position.x-15;g.player.visual.root.position.set(0,0,32);g.moveUnit(g.player,1,0);const bridge=g.player.visual.root.position.x;
 const stone=g.world.covers.find((c:any)=>c.kind==='stonewall'),steel=g.world.covers.find((c:any)=>c.kind==='steelwall'),house=g.world.covers.find((c:any)=>c.kind==='house');g.hitCover(stone,999);g.hitCover(steel,999);g.hitCover(house,999);const salvage=g.world.activities.length;g.hitCover(house,999);const cover=stone.hp<=0&&!stone.mesh.visible&&steel.hp===Infinity&&salvage===14&&g.world.activities.length===14;
 for(const e of g.enemies){e.dead=false;g.damageUnit(e,9999,g.player.visual.root.position);}g.player.visual.root.position.copy(g.world.ring.position);g.step(.01);g.step(.8);const river=g.phase;g.start(7);for(const e of g.enemies)e.dead=true;const end=g.world.layout.points.at(-1);g.convoyDistance=g.world.layout.length-.01;g.convoy.position.set(end.x,0,end.z-.01*Math.sign(end.z));g.player.visual.root.position.set(end.x+4,0,end.z);g.step(.1);g.step(.8);const snow=g.phase;g.start(8,2);for(const e of g.enemies)e.dead=true;g.elapsed=44.99;g.step(.02);g.step(.8);return {blocked,wet,bridge,cover,river,snow,ridge:g.phase};});
 expect(result.blocked).toEqual([]);expect(result.wet).toBeCloseTo(.45);expect(result.bridge).toBeCloseTo(1);expect(result.cover).toBe(true);expect(result.river).toBe('depot');expect(result.snow).toBe('depot');expect(result.ridge).toBe('victory');
});
test('river and winter scenes render and expanded campaign menu fits mobile',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
 for(const [i,name] of [[6,'river'],[7,'snow'],[8,'ridge']] as const){await page.evaluate(i=>{const g=(window as any).__steel;g.start(i);g.player.visual.root.position.set(0,0,i===6?39:22);g.world.target.set(0,0,i===6?47:30);g.world.update(0,g.player.visual.root.position);},i);await page.screenshot({path:`test-results/environment-${name}.png`});}
 await page.evaluate(()=>{const g=(window as any).__steel;g.showMenu();});expect(await page.locator('.route-item').count()).toBe(MISSIONS.length);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.route-item').last().scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/environment-menu-mobile.png'});expect(errors).toEqual([]);await context.close();
});

for(const viewport of [{width:1440,height:900},{width:390,height:844}])test(`winter surface separation while moving the camera ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{const g=(window as any).__steel;g.start(7);g.frame=()=>{};g.world.arena.updateMatrixWorld(true);const conflicts:number[]=[];
 // Any underlying scenery within 1 cm of the snow can compete for the same depth values.
 for(const mesh of g.world.arena.children){if(!mesh.isMesh||!mesh.userData.owned)continue;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=g.player.visual.root.position.clone().set(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(mesh.matrixWorld);if(Math.abs(v.x)>8.5&&Math.abs(v.x)<71.5&&Math.abs(v.z)<60&&v.y>.015&&v.y<.0249)conflicts.push(v.y);}}
 return {conflicts,weatherDepthWrite:g.world.environment.weather.material.depthWrite};});expect(result.conflicts).toEqual([]);expect(result.weatherDepthWrite).toBe(false);
 for(const low of [false,true]){await page.evaluate(low=>{const g=(window as any).__steel;g.world.settings(low);// Sample the same camera path without queuing 90 full software-GPU frames.
 for(let i=0;i<90;i+=15){g.player.visual.root.position.set(-22+i*.12,0,22-i*.16);g.world.update(.25,g.player.visual.root.position);}},low);await page.screenshot({path:`test-results/snow-stable-${viewport.width}-${low?'low':'high'}.png`});}
});
