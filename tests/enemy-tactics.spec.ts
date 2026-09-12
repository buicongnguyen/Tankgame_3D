import {test,expect} from '@playwright/test';

// These tests use real game updates and collision footprints; no mocked sight function.
test('solid cover hides the player, removing it reveals them and starts enemy fire',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const rows=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};return ['house','pine','barrel','steelwall','hill'].map(kind=>{
  g.start(0);g.enemies=[];g.world.covers=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,22);
  const e=g.makeUnit(0,0,'rifleman');e.encounter={group:0,anchor:{x:0,z:0},meters:900,active:false};e.cooldown=0;g.enemies=[e];
  const wall={x:0,z:11,w:8,d:2,hp:100,kind};g.world.covers=[wall];g.world.navigationRevision++;
  g.updateEnemies(.2);const hidden=!e.encounter.active&&g.shots.length===0&&!e.visual.beam.visible;
  wall.hp=0;g.world.navigationRevision++;g.updateEnemies(.2);const spotted=e.encounter.active,shot=g.shots.some((s:any)=>!s.friendly&&s.damage===3),hp=g.player.hp;
  for(let n=0;n<90;n++)g.updateShots(1/60);
  return {kind,hidden,spotted,shot,hit:g.player.hp<hp};
 });});expect(rows.every(r=>r.hidden&&r.spotted&&r.shot&&r.hit),JSON.stringify(rows)).toBe(true);
});

test('ordinary enemies investigate last sighting, stop blind fire and forget hidden movement',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,20);const e=g.makeUnit(0,0,'raider');g.enemies=[e];e.cooldown=0;g.updateEnemies(.1);const seen={...e.lastSeen};g.shots=[];
  g.world.covers=[{x:0,z:10,w:12,d:2,hp:Infinity,kind:'steelwall'}];g.world.navigationRevision++;g.player.visual.root.position.set(5,0,22);g.moveUnit=()=>{};e.cooldown=0;g.updateEnemies(.1);const remembered=e.lastSeen.x===seen.x&&e.lastSeen.z===seen.z,noBlindFire=g.shots.length===0&&!e.visual.beam.visible;
  g.elapsed+=7;g.updateEnemies(.1);const stopped=!e.visual.root.userData.walking&&g.shots.length===0;
  g.player.visual.root.position.set(18,0,15);for(let i=0;i<11;i++)g.updateEnemies(.1);const warned=e.visual.beam.visible&&g.shots.length===0;g.updateEnemies(.2);return {remembered,noBlindFire,stopped,warned,reacquired:e.lastSeen.x===18&&e.lastSeen.z===15,shot:g.shots.length>0};
 });expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});

test('a hit alerts only its route squad; distant patrols remain asleep despite route progress',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,50);
  for(let i=0;i<4;i++){const e=g.makeUnit(i===3?60:i*5,0,'raider');e.encounter={group:i<2||i===3?0:1,anchor:{x:0,z:0},meters:0,active:false};g.enemies.push(e);}
  g.encounters.progress=1000;g.encounters.update(g);const distant=g.enemies.every((e:any)=>!e.encounter.active);g.damageUnit(g.enemies[0],1,g.player.visual.root.position);return {distant,active:g.enemies.map((e:any)=>e.encounter.active),known:g.enemies[1].lastSeen.z===50};
 });expect(r).toEqual({distant:true,active:[true,true,false,false],known:true});
});

test('campaign patrols use nearby landmarks while preserving clear spawn footprints',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};const {circleBox}=await import('/src/three/rules.ts');const {levelMission}=await import('/src/three/campaign.ts');const rows:any[]=[];
  for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){if(levelMission(stage,level).kind==='defense')continue;g.start(stage,level);const row={stage,level,tanks:0,tankPosts:0,infantry:0,treePosts:0};
   for(const e of g.enemies){const p=e.visual.root.position;if(g.world.covers.some((c:any)=>c.hp>0&&circleBox(p,g.unitRadius(e),c)))throw new Error(`Blocked unit ${stage}/${level}/${e.role}`);if(e.role==='boss')continue;const inf=g.isInfantry(e),types=inf?['pine','white-pine','palm','jungle-tree']:['house','cityblock','barrel','fuelcrate'];row[inf?'infantry':'tanks']++;if(g.world.covers.some((c:any)=>types.includes(c.kind)&&Math.hypot(Math.max(0,Math.abs(c.x-p.x)-c.w/2),Math.max(0,Math.abs(c.z-p.z)-c.d/2))<4))row[inf?'treePosts':'tankPosts']++;}
   rows.push(row);
  }return rows;
 });console.log('GUARD_POSTS',JSON.stringify(r));const totals=r.reduce((a,r)=>({tanks:a.tanks+r.tanks,tankPosts:a.tankPosts+r.tankPosts,infantry:a.infantry+r.infantry,treePosts:a.treePosts+r.treePosts}),{tanks:0,tankPosts:0,infantry:0,treePosts:0});expect(totals.tankPosts).toBeGreaterThan(totals.tanks*.75);expect(totals.treePosts).toBeGreaterThan(totals.infantry*.7);
});


test('capture attackers advance on the relay and defense reserves keep their wave schedule',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(1);g.enemies=[];g.world.covers=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,55);const e=g.defenseSpawn(0,'raider');g.enemies=[e];const before=Math.hypot(e.visual.root.position.x,e.visual.root.position.z+13);for(let i=0;i<120;i++){g.elapsed+=1/60;g.updateEnemies(1/60);}const after=Math.hypot(e.visual.root.position.x,e.visual.root.position.z+13),unseen=e.lastSeen===undefined;
  g.start(3);g.world.covers=[];g.world.navigationRevision++;const later=g.enemies.find((e:any)=>e.encounter.wakeAt>0);const pos=later.visual.root.position;g.player.visual.root.position.set(pos.x*.88,0,pos.z*.88);g.updateEnemies(.01);return {advanced:after<before-3,unseen,scheduled:!later.encounter.active&&g.elapsed<later.encounter.wakeAt};
 });expect(r).toEqual({advanced:true,unseen:true,scheduled:true});
});

for(const mobile of [false,true])test(`guard landmarks stay readable and preserve patrol state in Low detail on ${mobile?'mobile':'desktop'}`,async({browser})=>{
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const high=await page.evaluate(mobile=>{const g=(window as any).__steel;g.frame=()=>{};g.start(2,0);const squad=g.enemies.filter((e:any)=>e.encounter.group===1),anchor=squad.reduce((p:any,e:any)=>({x:p.x+e.visual.root.position.x/squad.length,z:p.z+e.visual.root.position.z/squad.length}),{x:0,z:0});g.world.scene.fog=null;g.world.camera.position.set(anchor.x+10,mobile?45:35,anchor.z+30);g.world.camera.lookAt(anchor.x,0,anchor.z);g.updateHud();g.world.renderer.render(g.world.scene,g.world.camera);return {triangles:g.world.renderer.info.render.triangles};},mobile);await page.screenshot({path:`test-results/guard-posts-${mobile?'mobile':'desktop'}-detailed.png`});
 const low=await page.evaluate(async()=>{const g=(window as any).__steel;const units=g.enemies.map((e:any)=>[e,e.visual.root.position.clone(),e.encounter.active]);await g.world.load(true);g.world.settings(true);g.world.renderer.render(g.world.scene,g.world.camera);return {stable:units.every(([e,p,a]:any)=>e.visual.root.position.equals(p)&&e.encounter.active===a),triangles:g.world.renderer.info.render.triangles,overflow:document.documentElement.scrollWidth>innerWidth};});expect(low.stable&&!low.overflow).toBe(true);expect(low.triangles).toBeLessThan(high.triangles*.6);expect(errors).toEqual([]);await page.screenshot({path:`test-results/guard-posts-${mobile?'mobile':'desktop'}-low.png`});await context.close();
});


test('lost-target pursuit reaches the last sighting and capture reinforcements enter an unseen relay',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,25);const e=g.makeUnit(0,0,'raider');g.enemies=[e];g.updateEnemies(.01);g.player.visual.root.position.set(60,0,55);g.shots=[];for(let i=0;i<360;i++){g.elapsed+=1/60;g.updateEnemies(1/60);}const investigated=Math.hypot(e.visual.root.position.x,e.visual.root.position.z-25)<6,notOmniscient=e.lastSeen.x===0&&e.lastSeen.z===25,quiet=g.shots.length===0;
  g.start(1);g.enemies=[];g.world.covers=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,55);const wave=g.makeUnit(-20,-30,'raider');g.enemies=[wave];for(let i=0;i<480;i++){g.elapsed+=1/60;g.updateEnemies(1/60);}const capture=Math.hypot(wave.visual.root.position.x,wave.visual.root.position.z+13)<6.7;return {investigated,notOmniscient,quiet,capture,noPhantomTarget:g.shots.length===0};
 });expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});
