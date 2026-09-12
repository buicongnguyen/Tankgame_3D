import {test,expect} from '@playwright/test';

for(const fps of [30,60])test(`all ten bosses keep bounded machine-gun fire during heavy attacks at ${fps} fps`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const rows=await page.evaluate(fps=>{
  const g=(window as any).__steel;g.frame=()=>{};const rows=[];
  for(const kind of ['rail','missile','walker','helicopter','spider','laser','quad-mech','siege-mech','missile-truck','quadcopter']){
   g.start(0);g.world.covers=[];g.world.activities=[];g.enemies=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,28);g.player.hp=1e6;
   const b=g.makeUnit(0,0,'boss',kind);b.visual.root.position.set(0,0,0);g.enemies=[b];g.bosses.update(g,b,.01);const state=g.bosses.states.get(b),phases=[];
   for(const phase of ['tracking','charging','exposed',...(['laser','quad-mech'].includes(kind)?['firing']:[])]){state.phase=phase;state.time=100;state.auxTime=0;state.targets=[];state.landing={x:0,z:0};g.shots=[];
    let fired=0;const original=g.bossRound.bind(g);g.bossRound=(u:any,a:number,d:number,m:string,...rest:any[])=>{if(m==='LightMuzzle'){fired++;expectDummy(d);}original(u,a,d,m,...rest);};
    function expectDummy(d:number){if(d!==3)throw new Error('Incorrect machine-gun damage');}
    for(let i=0;i<fps*2;i++){g.elapsed+=1/fps;g.bosses.update(g,b,1/fps);g.updateShots(1/fps);g.world.fx.update(1/fps,g.world.camera);}
    g.bossRound=original;phases.push({phase,fired});
   }
   const before=g.shots.length;g.pause();g.bosses.update(g,b,1);const paused=g.shots.length===before;g.resume();g.damageUnit(b,1e9,g.player.visual.root.position,true);const after=g.shots.length;g.bosses.update(g,b,1);rows.push({kind,phases,paused,dead:g.shots.length===after&&!g.bosses.states.has(b),gun:!!b.visual.root.getObjectByName('LightGun'),fx:g.world.fx.particles.length});
  }return rows;
 },fps);for(const r of rows){expect(r.gun&&r.paused&&r.dead,r.kind).toBe(true);expect(r.fx).toBeLessThanOrEqual(230);for(const p of r.phases){expect(p.fired,`${r.kind}/${p.phase}`).toBeGreaterThanOrEqual(5);expect(p.fired).toBeLessThanOrEqual(7);}}
});

test('clearing all hostiles completes from anywhere, waits for reserves, and leaves escort extraction mandatory',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.frame=()=>{};g.start(0);const reserved=g.enemies.at(-1);for(const e of g.enemies)if(e!==reserved)e.dead=true;g.player.visual.root.position.set(g.world.layout.spawn.x,0,g.world.layout.spawn.z);g.step(.01);const waits=g.phase==='playing';reserved.dead=true;const credits=g.save.credits;g.step(.01);const early=g.phase==='finishing'&&g.el('objective').textContent==='AREA SECURED';const award=g.save.credits;g.step(.79);const delay=g.phase==='finishing';g.step(.02);const results=g.phase==='depot';g.complete();const once=g.save.credits===award&&award>=credits;
  g.start(2,0);for(const e of g.enemies)e.dead=true;g.step(.01);const escortWait=g.phase==='playing';const end=g.world.layout.points.at(-1);g.convoyDistance=g.world.layout.length;g.convoy.position.set(end.x,0,end.z);g.player.visual.root.position.set(end.x+5,0,end.z);g.step(.01);const escorted=g.phase==='finishing';
  g.start(3,0);for(const e of g.enemies)e.dead=true;g.relayHealth=0;g.step(.01);return {waits,early,delay,results,once,escortWait,escorted,lossFirst:g.phase==='failed'};
 });expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});

for(const stage of [3,8,12])test(`uplink ${stage}: finite waves move immediately and cannot time out with survivors`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(stage=>{
  const g=(window as any).__steel;g.frame=()=>{};g.start(stage,0);g.player.hp=1e6;g.relayHealth=1e6;const initial=g.enemies.length,starts=g.enemies.map((e:any)=>({e,x:e.visual.root.position.x,z:e.visual.root.position.z,wake:e.encounter.wakeAt}));
  g.updateEnemies(.02);const first=starts.filter((s:any)=>s.wake===0),firstActive=first.every((s:any)=>s.e.encounter.active),laterIdle=starts.filter((s:any)=>s.wake>0).every((s:any)=>!s.e.encounter.active);
  for(let i=0;i<60*10;i++){g.elapsed+=1/60;g.updateEnemies(1/60);}const marching=first.filter((s:any)=>Math.hypot(s.e.visual.root.position.x,s.e.visual.root.position.z+13)<Math.hypot(s.x,s.z+13)-5).length;
  g.elapsed=12;g.encounters.update(g);const released=g.enemies.every((e:any)=>e.encounter.active);
  g.elapsed=1000;g.step(.01);const noTimeout=g.phase==='playing',finite=g.enemies.length===initial;for(const e of g.enemies)e.dead=true;g.step(.01);return {firstActive,laterIdle,marching,first:first.length,released,noTimeout,finite,complete:g.phase==='finishing',times:[...new Set(starts.map((s:any)=>s.wake))].sort((a:any,b:any)=>a-b)};
 },stage);expect(r.firstActive&&r.laterIdle&&r.released&&r.noTimeout&&r.finite&&r.complete,JSON.stringify(r)).toBe(true);expect(r.marching).toBeGreaterThanOrEqual(Math.ceil(r.first*.6));expect(r.times).toEqual([0,4,8,12]);
});

test('all 48 maps remove broad roads, add central cover and preserve sign and convoy paths',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(async()=>{
  const g=(window as any).__steel;g.frame=()=>{};const {segmentBox,circleBox}=await import('/src/three/rules.ts');const issues:any[]=[],counts=[];
  for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){
   g.start(stage,level);const w=g.world,l=w.layout,extras=w.covers.filter((c:any)=>c.scenery),covers=w.covers.filter((c:any)=>c.hp>0);counts.push({stage,level,total:extras.length,near:extras.filter((c:any)=>Math.abs(c.x)<22).length});
   if(w.arena.getObjectByName('StageRoad'))issues.push({stage,level,road:true});
   for(let i=1;i<l.points.length;i++)if(covers.some((c:any)=>segmentBox(l.points[i-1],l.points[i],c,g.convoy?2.3:1.25)!==null))issues.push({stage,level,blocked:true});
   for(const e of [g.player,...g.enemies])if(covers.some((c:any)=>circleBox(e.visual.root.position,g.unitRadius(e),c)))issues.push({stage,level,spawn:e.role});
   if(!g.convoy&&w.firmRoad(l.points[0]))issues.push({stage,level,invisibleRoad:true});
  }return {issues,counts};
 });expect(r.issues).toEqual([]);for(const row of r.counts){expect(row.total,`${row.stage}/${row.level}`).toBeGreaterThanOrEqual(4);expect(row.total).toBeLessThanOrEqual(64);expect(row.near,`${row.stage}/${row.level} center`).toBeGreaterThanOrEqual(2);}
});

test('instanced scenery takes local damage, preserves neighboring objects and stays destroyed after detail changes',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(async()=>{
  const g=(window as any).__steel;g.frame=()=>{};const tree=g.world.covers.find((c:any)=>c.scenery&&['pine','white-pine','jungle-tree','palm'].includes(c.kind)),other=g.world.covers.find((c:any)=>c!==tree&&c.scenery?.parts===tree.scenery.parts);const hp=other.hp;g.hitCover(tree,1e6);const destroyed=tree.hp<=0&&tree.scenery.parts.every((p:any)=>p.instanceMatrix.array[tree.scenery.index*16]===0),neighbor=other.hp===hp;
  await g.world.load(true);g.world.settings(true);return {destroyed,neighbor,stable:tree.scenery.parts.every((p:any)=>p.instanceMatrix.array[tree.scenery.index*16]===0),shared:tree.scenery.parts.every((p:any)=>!!p.userData.modelAsset)};
 });expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});

for(const stage of [3,8,12])test(`uplink finale ${stage}: ground bosses and vehicles navigate into battle without corner deadlocks`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(stage=>{
  const g=(window as any).__steel;g.frame=()=>{};g.save.difficulty='normal';g.start(stage,2);g.player.hp=1e9;g.relayHealth=1e9;
  for(let i=0;i<15*90;i++){g.elapsed+=1/15;g.updateEnemies(1/15);g.updateShots(1/15);g.world.fx.update(1/15,g.world.camera);g.special.update(g,1/15);}
  const live=g.enemies.filter((e:any)=>!e.dead);return {live:live.length,waiting:live.some((e:any)=>!e.encounter.active),stranded:live.filter((e:any)=>Math.hypot(e.visual.root.position.x,e.visual.root.position.z+13)>50).map((e:any)=>({role:e.role,kind:e.bossKind,x:e.visual.root.position.x,z:e.visual.root.position.z}))};
 },stage);expect(r.live).toBeGreaterThan(0);expect(r.waiting).toBe(false);expect(r.stranded).toEqual([]);
});
