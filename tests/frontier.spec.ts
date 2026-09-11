import {test,expect} from '@playwright/test';
import {freshSave,parseSave,MISSIONS,levelMission} from '../src/three/campaign';
import {terrainSpeed,tractionMotion,ICE,SAND} from '../src/three/terrain';
import {awardStage} from '../src/three/results';

test('historical campaigns extend without losing purchases or progress',()=>{
 expect(MISSIONS).toHaveLength(16);
 for(const length of [6,9]){
  const old={...freshSave(),mission:length-1,cleared:Array(length).fill(true),credits:1800,weapons:[3,4],equippedWeapon:4,skins:['classic','sunburst','inferno'],skin:'inferno',low:true};
  const save=parseSave(JSON.stringify(old));expect(save.mission).toBe(length);expect(save.cleared).toEqual([...old.cleared,...Array(16-length).fill(false)]);expect(save.credits).toBe(1800);expect(save.weapons).toEqual([3,4]);expect(save.skin).toBe('inferno');expect(save.low).toBe(true);
  const partial={...old,mission:2,cleared:Array.from({length},(_,i)=>i<2)};expect(parseSave(JSON.stringify(partial)).mission).toBe(2);
 }
 const corrupt={...freshSave(),mission:8,cleared:[true,false,...Array(7).fill(true)]};expect(parseSave(JSON.stringify(corrupt))).toEqual(freshSave());
 const save={...freshSave(),mission:9,cleared:[...Array(9).fill(true),...Array(7).fill(false)]};
 for(let stage=9;stage<16;stage++)for(let level=0;level<3;level++){const r=awardStage(save,stage,30,200,240,level);expect(r.target).toBe(levelMission(stage,level).parTime);expect(r.total).toBeGreaterThan(0);expect(awardStage(save,stage,1,240,240,level).total).toBe(0);}
 expect(parseSave(JSON.stringify(save))).toEqual(save);
});

test('sand has exact quarter speed and ice preserves then releases momentum',()=>{
 for(const r of SAND){expect(terrainSpeed('desert',r.x,r.z)).toBe(.25);expect(terrainSpeed('desert',0,r.z)).toBe(1);}
 const velocity={x:9,z:0},ice=ICE[0];const drift=tractionMotion('glacier',ice,velocity,0,0,.1);expect(drift.x).toBeGreaterThan(.5);expect(drift.x).toBeLessThan(.9);
 expect(tractionMotion('glacier',{x:0,z:0},velocity,0,0,.1)).toEqual({x:0,z:0});
 expect(tractionMotion('desert',SAND[0],velocity,.9,0,.1).x).toBeCloseTo(.225);
});

test('all campaign spawns, frontier objectives and service routes remain reachable',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const issues=await page.evaluate(async()=>{
  const g=(window as any).__steel;g.frame=()=>{};const {circleBox}=await import('/src/three/rules.ts');const issues:any[]=[];
  for(let mission=0;mission<16;mission++){
   g.prepare(mission);const covers=g.world.covers.filter((c:any)=>c.hp>0);
   for(const u of [g.player,...g.enemies])if(covers.some((c:any)=>circleBox(u.visual.root.position,g.unitRadius(u),c)))issues.push({mission,overlap:u.role});
   if(mission<9)continue;
   const nx=71,nz=59,free=new Uint8Array(nx*nz),seen=new Uint8Array(nx*nz);const at=(id:number)=>({x:-70+(id%nx)*2,z:-58+Math.floor(id/nx)*2});
   for(let id=0;id<free.length;id++)free[id]=Number(!covers.some((c:any)=>circleBox(at(id),1.25,c)));
   const p=g.player.visual.root.position,start=Math.round((p.z+58)/2)*nx+Math.round((p.x+70)/2),queue=[start];seen[start]=1;
   for(let head=0;head<queue.length;head++){const id=queue[head],x=id%nx,z=Math.floor(id/nx);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,next=zz*nx+xx;if(xx>=0&&xx<nx&&zz>=0&&zz<nz&&free[next]&&!seen[next]){seen[next]=1;queue.push(next);}}}
   const targets=[{x:0,z:-13,kind:'relay'},{...g.world.layout.points.at(-1),kind:'exit'},...g.world.activities.filter((a:any)=>a.kind!=='mine'),...g.enemies.map((u:any)=>({...u.visual.root.position,kind:u.role}))];
   for(const t of targets)if(!queue.some(id=>{const p=at(id);return Math.hypot(p.x-t.x,p.z-t.z)<3;}))issues.push({mission,unreachable:t.kind,x:t.x,z:t.z});
   if(g.convoy)for(let i=1;i<g.world.layout.points.length;i++){const a=g.world.layout.points[i-1],b=g.world.layout.points[i],d=Math.hypot(b.x-a.x,b.z-a.z);for(let step=0;step<=d;step++){const p={x:a.x+(b.x-a.x)*step/d,z:a.z+(b.z-a.z)*step/d};if(covers.some((c:any)=>circleBox(p,2.3,c)))issues.push({mission,convoyBlock:p});}}
  }return issues;
 });expect(issues).toEqual([]);
});

test('rockfalls warn, hit both sides once, respect shields and clean up',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(async()=>{
  const g=(window as any).__steel;g.frame=()=>{};g.start(10);const h=g.hazards;h.update(g,5.9);const graceDelay=h.rocks.length===0;h.update(g,.11);const scheduled=h.rocks.length>0&&h.rocks.length<=3;h.clear();h.clock=999;for(const u of g.enemies)u.dead=true;const e=g.enemies[0];e.dead=false;e.hp=e.max=500;e.visual.root.position.set(11,0,0);g.player.hp=g.player.max=500;g.player.visual.root.position.set(8,0,0);
  h.warn(g,{x:10,z:0});const warning=h.rocks[0];h.update(g,2.5);const warned=g.player.hp===500&&e.hp===500&&h.rocks.length===1;h.update(g,.11);const hit=g.player.hp<500&&e.hp<500,once=g.player.hp;h.update(g,.5);const single=g.player.hp===once;
  h.warn(g,{x:8,z:0});g.shieldTime=10;const hp=g.player.hp;h.update(g,2.7);const shield=g.player.hp===hp;g.shieldTime=0;
  h.warn(g,{x:5,z:5});const age=h.rocks[0].age;g.pause();h.update(g,10);const paused=h.rocks[0].age===age;g.resume();
  await g.world.load(true);g.world.settings(true);const visible=h.rocks[0].marker.visible&&h.rocks[0].rock.parent!==null;
  for(let i=0;i<20;i++)h.warn(g,{x:20,z:20});const bounded=h.rocks.length<=3;g.complete();const complete=h.rocks.length===0&&h.scars.length===0&&!warning.marker.parent;
  g.start(10);const grace=h.clock===6;h.warn(g,{x:0,z:0});g.fail();const failed=h.rocks.length===0;g.start(9);const reset=h.rocks.length===0&&h.scars.length===0;
  return {graceDelay,scheduled,warned,hit,single,shield,paused,visible,bounded,complete,grace,failed,reset};
 });expect(Object.values(result).every(Boolean),JSON.stringify(result)).toBe(true);
});

for(const mission of [8,9,10,11,12,13,14,15])test(`stage ${mission+1} final objective also requires all bosses`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(mission=>{
  const g=(window as any).__steel;g.frame=()=>{};g.save.cleared=Array.from({length:16},(_,i)=>i<mission);g.save.mission=mission;g.save.level=2;g.start(mission,2);
  for(const e of g.enemies)g.damageUnit(e,999999,g.player.visual.root.position,true);
  const m=g.missionData();if(['assault','boss'].includes(m.kind))g.player.visual.root.position.copy(g.world.ring.position);if(m.kind==='capture'){g.capture=m.duration;g.player.visual.root.position.set(0,0,-13);}if(m.kind==='defense')g.elapsed=m.duration;if(g.convoy){const end=g.world.layout.points.at(-1);g.convoy.position.set(end.x,0,end.z);g.player.visual.root.position.set(end.x+4,0,end.z);g.convoyDistance=g.world.layout.length;}
  g.step(.02);g.step(.8);return {phase:g.phase,cleared:g.save.cleared[mission],next:g.save.mission,level:g.save.level};
 },mission);expect(result).toEqual({phase:mission===8||mission===15?'victory':'depot',cleared:true,next:Math.min(15,mission+1),level:mission===15?2:0});
});

for(const mission of [9,10,11,12,13,14,15])test(`frontier ${mission+1} looks distinct and switches detail on phone`,async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
 const counts=await page.evaluate(i=>{const g=(window as any).__steel;g.start(i);g.frame=()=>{};g.hazards.clock=999;if(i===10){g.player.visual.root.position.set(-26,0,-20);g.hazards.warn(g,{x:-20,z:-18});g.hazards.update(g,1.6);}g.world.target.copy(g.player.visual.root.position);g.world.update(1,g.player.visual.root.position);g.updateHud();return {trees:g.world.covers.filter((c:any)=>c.kind==='jungle-tree').length,blocks:g.world.covers.filter((c:any)=>c.kind==='cityblock').length};},mission);
 if(mission===12)expect(counts.trees).toBeGreaterThan(30);if(mission===13)expect(counts.blocks).toBeGreaterThanOrEqual(8);
 await page.screenshot({path:`test-results/frontier-${mission+1}-phone-detailed.png`});
 await page.locator('#pause').tap();await page.locator('[data-action="quality"]').tap();await expect(page.locator('[data-action="quality"]')).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'RESUME OPERATION'}).tap();
 await page.evaluate(()=>{const g=(window as any).__steel;g.world.update(0,g.player.visual.root.position);g.updateHud();});await page.screenshot({path:`test-results/frontier-${mission+1}-phone-low.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await context.close();
});


test('real movement applies sand to both sides and ice stops at cover',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(11);g.world.covers=[];for(const e of g.enemies)e.dead=true;
 g.player.visual.root.position.set(-23,0,30);g.save.skin='volt';g.input.keys.add('KeyD');g.updatePlayer(.1);const player=g.player.visual.root.position.x+23;
 g.player.visual.root.position.set(60,0,55);g.input.reset();const e=g.enemies[0];e.dead=false;e.visual.root.position.set(-23,0,30);g.moveUnit(e,.9,0,.1);const enemy=e.visual.root.position.x+23;e.visual.root.position.set(0,0,0);g.moveUnit(e,.9,0,.1);const road=e.visual.root.position.x;
 g.start(9);for(const u of g.enemies)u.dead=true;g.world.covers=[];g.player.visual.root.position.set(-24,0,30);g.player.velocity={x:9,z:0};g.moveUnit(g.player,0,0,.1);const coast=g.player.visual.root.position.x>-24;
 g.player.visual.root.position.set(-24,0,30);g.player.velocity={x:9,z:0};g.world.covers=[{x:-22,z:30,w:1,d:4,hp:Infinity}];g.moveUnit(g.player,0,0,.1);const blocked=g.player.visual.root.position.x===-24&&g.player.velocity.x===0;
 return {player,enemy,road,coast,blocked};});expect(result.player).toBeCloseTo(.9*1.18*.25);expect(result.enemy).toBeCloseTo(.225);expect(result.road).toBeCloseTo(.9);expect(result.coast&&result.blocked).toBe(true);
});

test('rock targets stay fixed and impacts damage cover with bounded scars',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(10);const h=g.hazards;h.clock=999;g.shieldTime=1000;for(const u of g.enemies)u.dead=true;
 const crate=g.world.covers.find((c:any)=>c.kind==='crate');h.warn(g,crate);const r=h.rocks[0],target={x:r.x,z:r.z};g.player.visual.root.position.set(60,0,55);h.update(g,1);const locked=r.x===target.x&&r.z===target.z;h.update(g,1.61);const destroyed=crate.hp<=0&&!crate.mesh.visible;
 for(let i=0;i<12;i++){h.warn(g,{x:60,z:35});h.update(g,2.61);}const bounded=h.scars.length<=8&&h.rocks.length===0;h.update(g,31);return {locked,destroyed,bounded,expired:h.scars.length===0};});expect(result).toEqual({locked:true,destroyed:true,bounded:true,expired:true});
});

test('jungle attackers leave the corners and approach the relay',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(12);g.shieldTime=1000;g.relayHealth=100000;const initial=g.enemies.map((e:any)=>({u:e,x:e.visual.root.position.x,z:e.visual.root.position.z}));for(let i=0;i<1500;i++)g.step(1/60);return {phase:g.phase,moved:initial.filter((e:any)=>Math.hypot(e.u.visual.root.position.x-e.x,e.u.visual.root.position.z-e.z)>10).length,approached:initial.filter((e:any)=>Math.hypot(e.u.visual.root.position.x,e.u.visual.root.position.z+13)<50).length};});expect(result.phase).toBe('playing');expect(result.moved).toBeGreaterThanOrEqual(6);expect(result.approached).toBeGreaterThanOrEqual(2);
});

for(const mission of [10,13])test(`desktop frontier overview ${mission+1}`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();await page.evaluate(i=>{const g=(window as any).__steel;g.start(i);g.frame=()=>{};g.hud.hidden=true;g.radio.classList.remove('visible');g.world.scene.fog=null;g.world.camera.position.set(65,115,120);g.world.camera.lookAt(0,0,0);if(i===10){g.hazards.clock=999;g.hazards.warn(g,{x:-10,z:-17});g.hazards.update(g,1.4);}g.world.renderer.render(g.world.scene,g.world.camera);},mission);await page.screenshot({path:`test-results/frontier-${mission+1}-desktop-overview.png`});
});
