import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {BARRAGE,BARRAGE_INNER,barrageTargets} from '../src/three/barrage';
import {BOUNDS} from '../src/three/activities';

async function battle(page:Page){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.world.activities=[];g.world.navigationRevision++;g.enemies=[];g.lootRandom=()=>.99;g.player.visual.root.position.set(0,0,0);});
}

test('ring geometry surrounds every bearing and keeps a central gap at every map edge',()=>{
 const ring=barrageTargets({x:0,z:0});expect(ring).toHaveLength(12);expect(BARRAGE_INNER).toBe(10);
 for(let i=0;i<360;i++){const angle=i*Math.PI/180,p={x:Math.sin(angle)*18,z:Math.cos(angle)*18};expect(ring.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<BARRAGE.blast),`bearing ${i}`).toBe(true);}
 for(const x of [-72,-71,0,71,72])for(const z of [-60,-59,0,59,60]){
  const points=barrageTargets({x,z});expect(points.length).toBeGreaterThanOrEqual(3);
  expect(new Set(points.map(p=>`${p.x},${p.z}`)).size).toBe(points.length);
  for(const p of points){expect(Math.abs(p.x)).toBeLessThanOrEqual(BOUNDS.x);expect(Math.abs(p.z)).toBeLessThanOrEqual(BOUNDS.z);expect(Math.hypot(p.x-x,p.z-z)).toBeCloseTo(18);expect(p.time).toBeGreaterThanOrEqual(1.2);expect(p.time).toBeLessThanOrEqual(2.31);}
 }
});

test('call position is frozen; aim, driving and cooldown cannot move or duplicate the barrage',async({page})=>{
 await battle(page);const r=await page.evaluate(()=>{const g=(window as any).__steel;g.aimPoint.set(65,0,50);g.action('artillery');g.action('1');const before=g.strikes.map((s:any)=>[s.x,s.z]),center=g.barrageZones[1].position.clone();g.player.visual.root.position.set(40,0,40);g.aimPoint.set(-65,0,-50);g.callArtillery();g.updateActivities(.5);const fixed=JSON.stringify(before)===JSON.stringify(g.strikes.map((s:any)=>[s.x,s.z]))&&g.barrageZones[1].position.equals(center),waiting=g.strikes.every((s:any)=>!s.bomb.visible);const delay=g.strikes[0].time;g.pause();g.step(.2);const paused=g.strikes[0].time===delay;g.resume();g.updateActivities(.4);const falling=g.strikes.some((s:any)=>s.bomb.visible&&s.bomb.position.y>1&&s.bomb.position.y<27),markerDepth=g.strikes.every((s:any)=>!s.marker.material.depthWrite);const markers=[...g.barrageZones,...g.strikes.flatMap((s:any)=>[s.marker,s.bomb])];g.start(0);return {count:before.length,fixed,waiting,paused,falling,markerDepth,clean:g.strikes.length===0&&g.barrageZones.length===0&&markers.every(m=>!m.parent)};});expect(r).toEqual({count:12,fixed:true,waiting:true,paused:true,falling:true,markerDepth:true,clean:true});
});

test('bombs hit ring tanks, soldiers and scenery once, with no direct damage inside or beyond the ring',async({page})=>{
 await battle(page);const r=await page.evaluate(()=>{const g=(window as any).__steel;const unit=(x:number,z:number,role:string)=>{const u=g.makeUnit(x,z,role);u.visual.root.position.set(x,0,z);u.hp=u.max=10000;g.enemies.push(u);return u;};const center=unit(0,4,'heavy'),tank=unit(0,18,'heavy'),soldier=unit(18,0,'rifleman'),inner=unit(0,9.9,'rifleman'),edge=unit(0,10.1,'rifleman'),outer=unit(0,26.1,'heavy');
 const mesh=g.world.clone('house');g.world.arena.add(mesh);mesh.position.set(-18,0,0);const house={kind:'house',mesh,x:-18,z:0,w:4,d:4,hp:1000};g.world.covers=[house];const hp=g.player.hp;g.callArtillery();g.updateActivities(1.19);const warned=g.enemies.every((u:any)=>u.hp===10000)&&house.hp===1000;g.updateActivities(1.2);const after=tank.hp;g.updateActivities(5);return {warned,center:center.hp===10000&&g.player.hp===hp,tank:tank.hp<10000,soldier:soldier.hp<10000,inner:inner.hp===10000,edge:edge.hp<10000,outer:outer.hp===10000,house:house.hp<1000,once:tank.hp===after,clean:g.strikes.length===0&&g.barrageZones.length===0};});expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});

test('edge calls preserve the center and phase gates reject dead or paused calls',async({page})=>{
 await battle(page);const r=await page.evaluate(()=>{const g=(window as any).__steel;const corners=[];for(const [x,z] of [[72,60],[-72,60],[72,-60],[-72,-60]]){g.player.visual.root.position.set(x,0,z);g.artilleryCooldown=0;const hp=g.player.hp;g.callArtillery();const count=g.strikes.length;g.updateActivities(3);corners.push(count>=3&&g.player.hp===hp);}g.artilleryCooldown=0;g.pause();g.callArtillery();const paused=g.strikes.length===0&&g.artilleryCooldown===0;g.resume();g.player.dead=true;g.callArtillery();return {corners,paused,dead:g.strikes.length===0&&g.artilleryCooldown===0};});expect(r.corners.every(Boolean)&&r.paused&&r.dead).toBe(true);
});

for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}])test(`ring barrage real controls and graphics ${viewport.width}`,async({browser})=>{
 const mobile=viewport.width!==1440,c=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile}),page=await c.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await battle(page);
 await page.evaluate(()=>{const g=(window as any).__steel;g.world.target.copy(g.player.visual.root.position);g.world.update(0,g.player.visual.root.position);g.world.camera.position.set(8,64,48);g.world.camera.lookAt(0,0,0);g.world.camera.updateMatrixWorld();});
 if(mobile)await page.locator('#artillery').tap();else await page.keyboard.press('r');await expect(page.locator('[data-support="support-strike"]')).toContainText('RING BARRAGE');await expect(page.locator('[data-support="support-strike"]')).toContainText('center clear');if(mobile)await page.locator('[data-support="support-strike"]').tap();else await page.keyboard.press('1');await expect(page.locator('#support-picker')).toBeHidden();
 for(const low of [false,true]){const r=await page.evaluate(async low=>{const g=(window as any).__steel;if(low){g.clearBarrage();g.artilleryCooldown=0;await g.world.load(true);g.world.settings(true);g.callArtillery();}g.updateActivities(.9);g.world.renderer.render(g.world.scene,g.world.camera);return {count:g.strikes.length,visible:g.strikes.filter((s:any)=>s.bomb.visible).length,origin:g.barrageZones[1].position.toArray(),overflow:document.documentElement.scrollWidth>innerWidth};},low);expect(r.count).toBe(12);expect(r.visible).toBeGreaterThan(0);expect(r.origin[0]).toBe(0);expect(r.origin[2]).toBe(0);expect(r.overflow).toBe(false);await page.screenshot({path:`test-results/ring-barrage-${viewport.width}-${low?'low':'detailed'}.png`});}
 await page.evaluate(()=>{const g=(window as any).__steel;g.updateActivities(2);});await expect(page.locator('#artillery-label')).toContainText('SUPPORT');expect(errors).toEqual([]);await c.close();
});
